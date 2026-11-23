import { useCallback, useEffect, useRef, useState } from 'react'
import { classifyMicError, isMicSupported, openMicStream, pickAudioMimeType, stopStream } from './microphone'

export type CaptureState = 'idle' | 'requesting' | 'recording' | 'denied' | 'unsupported' | 'error'

const MAX_RECORD_MS = 8000
/** Тиша після мовлення, після якої запис зупиняється сам. */
const SILENCE_STOP_MS = 1500
/** Якщо користувач так і не заговорив. */
const NO_SPEECH_STOP_MS = 5000
const SPEECH_LEVEL = 0.12
/** Режим «затримати й говорити»: запис іде, поки кнопку тримають, але не довше за це. */
const MAX_HOLD_MS = 15000

export interface CaptureOptions {
  /**
   * true (за замовчуванням): запис зупиняється сам після тиші або якщо користувач так і не заговорив.
   * false: лише stop() / cancel() (кнопку відпустили) або MAX_HOLD_MS.
   */
  autoStop?: boolean
}

interface Session {
  stop: () => void
  abort: () => void
}

/**
 * Запис голосу через MediaRecorder. start() резолвиться Blob-ом, коли запис
 * закінчився (stop(), тиша або 8 с), або null, якщо запис не відбувся.
 * Аудіо лишається тільки в пам'яті; треки мікрофона зупиняються після запису.
 * stop() / cancel(), викликані ще до початку запису (чекаємо дозволу чи мікрофона), скасовують його: start() поверне null.
 */
export function useSpeechCapture() {
  const [state, setState] = useState<CaptureState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const session = useRef<Session | null>(null)
  /** Запис скасували, поки мікрофон ще відкривався. */
  const dropPending = useRef(false)

  useEffect(
    () => () => {
      dropPending.current = true
      session.current?.abort()
    },
    [],
  )

  /** Завершити запис і віддати те, що записано. */
  const stop = useCallback(() => {
    if (session.current) session.current.stop()
    else dropPending.current = true
  }, [])

  /** Обірвати запис без результату (start() поверне null). */
  const cancel = useCallback(() => {
    if (session.current) session.current.abort()
    else dropPending.current = true
  }, [])

  const start = useCallback(async ({ autoStop = true }: CaptureOptions = {}): Promise<Blob | null> => {
    if (session.current) return null
    dropPending.current = false
    if (!isMicSupported() || typeof MediaRecorder === 'undefined') {
      setState('unsupported')
      return null
    }
    setError(null)
    setState('requesting')
    let stream: MediaStream
    try {
      stream = await openMicStream()
    } catch (err) {
      const kind = classifyMicError(err)
      setState(kind === 'denied' || kind === 'unsupported' ? kind : 'error')
      setError(err instanceof Error ? err.name : String(err))
      return null
    }
    if (dropPending.current) {
      stopStream(stream)
      setState('idle')
      return null
    }

    return new Promise<Blob | null>((resolve) => {
      const mimeType = pickAudioMimeType()
      let recorder: MediaRecorder
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      } catch (err) {
        stopStream(stream)
        setState('error')
        setError(err instanceof Error ? err.message : String(err))
        resolve(null)
        return
      }

      const chunks: Blob[] = []
      let aborted = false
      let raf = 0
      const timers: number[] = []

      // Рівень звуку для анімації і детекції тиші.
      let audioCtx: AudioContext | null = null
      let analyser: AnalyserNode | null = null
      try {
        audioCtx = new AudioContext()
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 512
        audioCtx.createMediaStreamSource(stream).connect(analyser)
      } catch {
        analyser = null
      }

      const finish = () => {
        cancelAnimationFrame(raf)
        timers.forEach((id) => window.clearTimeout(id))
        if (recorder.state !== 'inactive') recorder.stop()
        else onStopped()
      }

      const onStopped = () => {
        stopStream(stream)
        void audioCtx?.close().catch(() => {})
        session.current = null
        setLevel(0)
        setState('idle')
        resolve(aborted ? null : new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }))
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.onstop = onStopped
      recorder.onerror = () => {
        setError('recorder error')
        aborted = true
        finish()
      }

      session.current = {
        stop: finish,
        abort: () => {
          aborted = true
          finish()
        },
      }

      recorder.start()
      setState('recording')
      timers.push(window.setTimeout(finish, autoStop ? MAX_RECORD_MS : MAX_HOLD_MS))

      if (analyser) {
        const buf = new Uint8Array(analyser.fftSize)
        const startedAt = performance.now()
        let heardSpeech = false
        let lastLoud = startedAt
        const tick = () => {
          analyser!.getByteTimeDomainData(buf)
          let sum = 0
          for (const v of buf) sum += ((v - 128) / 128) ** 2
          const rms = Math.sqrt(sum / buf.length)
          const value = Math.min(1, rms * 4)
          setLevel(value)
          const now = performance.now()
          if (value > SPEECH_LEVEL) {
            heardSpeech = true
            lastLoud = now
          }
          if (autoStop && heardSpeech && now - lastLoud > SILENCE_STOP_MS) return finish()
          if (autoStop && !heardSpeech && now - startedAt > NO_SPEECH_STOP_MS) return finish()
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      }
    })
  }, [])

  return { start, stop, cancel, level, state, error }
}
