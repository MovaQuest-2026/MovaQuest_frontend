import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface VideoStageHandle {
  seek: (time: number) => void
  /** Викликати з обробника дотику: «благословляє» обидва <video> на відтворення зі звуком (iOS). */
  unlock: () => void
}

interface VideoStageProps {
  src: string
  /** Змінюється з кожним входом у сцену, навіть якщо кліп той самий. */
  entryId: number
  /** Повернення через '$return': показати останній кадр без відтворення. */
  startAtEnd: boolean
  shouldPlay: boolean
  playbackRate: number
  onReady: () => void
  onEnded: () => void
  onProgress: (currentTime: number, duration: number) => void
  onError: () => void
}

const END_OFFSET = 0.05

function waitForEvent(el: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error(`video error: ${el.currentSrc}`))
    }
    const cleanup = () => {
      el.removeEventListener(event, ok)
      el.removeEventListener('error', fail)
    }
    el.addEventListener(event, ok)
    el.addEventListener('error', fail)
  })
}

// Два <video> у ping-pong: наступний кліп готується в прихованому елементі
// і показується лише після готовності кадру — без чорного екрана між кліпами.
export const VideoStage = forwardRef<VideoStageHandle, VideoStageProps>(function VideoStage(
  { src, entryId, startAtEnd, shouldPlay, playbackRate, onReady, onEnded, onProgress, onError },
  ref,
) {
  const videoA = useRef<HTMLVideoElement>(null)
  const videoB = useRef<HTMLVideoElement>(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  const [readyEntry, setReadyEntry] = useState<number | null>(null)

  const callbacks = useRef({ onReady, onEnded, onProgress, onError })
  callbacks.current = { onReady, onEnded, onProgress, onError }
  const rateRef = useRef(playbackRate)
  rateRef.current = playbackRate

  const videos = () => [videoA.current!, videoB.current!] as const

  useImperativeHandle(ref, () => ({
    seek: (time) => {
      const v = videos()[activeRef.current]
      if (!Number.isFinite(v.duration)) return
      v.currentTime = Math.min(Math.max(0, time), Math.max(0, v.duration - END_OFFSET))
      callbacks.current.onProgress(v.currentTime, v.duration)
    },
    unlock: () => {
      videos().forEach((v, i) => {
        if (i === activeRef.current || !v.getAttribute('src')) return
        v.muted = true
        v.play()
          .then(() => v.pause())
          .catch(() => {})
          .finally(() => {
            v.muted = false
          })
      })
    },
  }))

  // Підготовка кліпу для нового входу в сцену.
  useEffect(() => {
    let cancelled = false
    const [a, b] = videos()
    const els = [a, b]
    const current = activeRef.current
    const other = 1 - current
    const url = new URL(src, window.location.href).href

    let target: number
    if (els[other].src === url) target = other
    else if (!els[current].getAttribute('src') || (startAtEnd && els[current].src === url)) target = current
    else target = other
    const v = els[target]

    const prepare = async () => {
      if (v.src !== url) {
        v.src = url
        v.load()
      }
      if (v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) await waitForEvent(v, 'loadeddata')
      if (cancelled) return
      const at = startAtEnd ? Math.max(0, v.duration - END_OFFSET) : 0
      if (Math.abs(v.currentTime - at) > 0.01) {
        v.currentTime = at
        await waitForEvent(v, 'seeked')
      }
      if (cancelled) return
      v.defaultPlaybackRate = rateRef.current
      v.playbackRate = rateRef.current
      els[1 - target].pause()
      activeRef.current = target
      setActive(target)
      setReadyEntry(entryId)
      callbacks.current.onProgress(v.currentTime, v.duration)
      callbacks.current.onReady()
    }
    prepare().catch(() => !cancelled && callbacks.current.onError())
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, entryId, startAtEnd])

  // Відтворення / пауза активного кліпу.
  useEffect(() => {
    const v = videos()[active]
    if (readyEntry !== entryId) return
    if (shouldPlay) {
      if (v.ended || v.currentTime >= v.duration - END_OFFSET) v.currentTime = 0
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [active, readyEntry, entryId, shouldPlay])

  useEffect(() => {
    for (const v of videos()) {
      v.defaultPlaybackRate = playbackRate
      v.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Плавний прогрес під час відтворення.
  useEffect(() => {
    if (!shouldPlay || readyEntry !== entryId) return
    const v = videos()[active]
    let raf = 0
    const tick = () => {
      if (Number.isFinite(v.duration)) callbacks.current.onProgress(v.currentTime, v.duration)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, readyEntry, entryId, shouldPlay])

  const handleEnded = (index: number) => () => {
    if (index !== activeRef.current) return
    const v = videos()[index]
    callbacks.current.onProgress(v.duration, v.duration)
    callbacks.current.onEnded()
  }

  return (
    <div className="video-stage">
      {[videoA, videoB].map((r, i) => (
        <video
          key={i}
          ref={r}
          className={`video-stage__video${i === active ? ' video-stage__video--active' : ''}`}
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onEnded={handleEnded(i)}
        />
      ))}
    </div>
  )
})
