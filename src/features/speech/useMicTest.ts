import { useCallback, useEffect, useRef, useState } from 'react'
import { classifyMicError, isMicSupported, openMicStream, pickAudioMimeType, stopStream } from './microphone'

export type MicTestState = 'idle' | 'recording' | 'playing' | 'denied' | 'unsupported' | 'error'

const RECORD_MS = 3000

// Записує 3 секунди і відтворює їх. Аудіо лишається в пам'яті сторінки.
export function useMicTest() {
  const [state, setState] = useState<MicTestState>('idle')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const cleanupRef = useRef<() => void>(() => {})

  useEffect(() => () => cleanupRef.current(), [])

  const start = useCallback(async () => {
    if (!isMicSupported() || typeof MediaRecorder === 'undefined') {
      setState('unsupported')
      return
    }
    let stream: MediaStream
    try {
      stream = await openMicStream()
    } catch (err) {
      const kind = classifyMicError(err)
      setState(kind === 'denied' || kind === 'unsupported' ? kind : 'error')
      return
    }

    const mimeType = pickAudioMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    let audio: HTMLAudioElement | null = null
    let url: string | null = null
    let disposed = false

    const timers: number[] = []
    const cleanup = () => {
      disposed = true
      timers.forEach((id) => window.clearTimeout(id))
      if (recorder.state !== 'inactive') recorder.stop()
      stopStream(stream)
      audio?.pause()
      if (url) URL.revokeObjectURL(url)
    }
    cleanupRef.current = cleanup

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      stopStream(stream)
      if (disposed) return
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
      url = URL.createObjectURL(blob)
      audio = new Audio(url)
      audio.onended = () => {
        cleanup()
        setState('idle')
      }
      setState('playing')
      audio.play().catch(() => {
        cleanup()
        setState('error')
      })
    }

    recorder.start()
    setState('recording')
    const total = RECORD_MS / 1000
    setSecondsLeft(total)
    for (let i = 1; i < total; i++) {
      timers.push(window.setTimeout(() => setSecondsLeft(total - i), i * 1000))
    }
    timers.push(window.setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), RECORD_MS))
  }, [])

  return { state, secondsLeft, start }
}
