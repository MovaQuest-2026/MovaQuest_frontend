import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { VideoHandle, VideoSurfaceProps } from './types'

const END_OFFSET = 0.05

interface FileVideoProps extends VideoSurfaceProps {
  src: string
}

// Локальний mp4 в одному <video playsinline>.
export const FileVideo = forwardRef<VideoHandle, FileVideoProps>(function FileVideo(
  { src, startAt, shouldPlay, muted, playbackRate, onReady, onTime, onEnded, onError, onAutoplayMuted },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const callbacks = useRef({ onReady, onTime, onEnded, onError, onAutoplayMuted })
  useLayoutEffect(() => {
    callbacks.current = { onReady, onTime, onEnded, onError, onAutoplayMuted }
  })
  const startAtRef = useRef(startAt)

  useImperativeHandle(ref, () => ({
    seek: (time) => {
      const v = videoRef.current
      if (!v || !Number.isFinite(v.duration)) return
      v.currentTime = Math.min(Math.max(0, time), Math.max(0, v.duration - END_OFFSET))
      callbacks.current.onTime(v.currentTime, v.duration)
    },
  }))

  useEffect(() => {
    const v = videoRef.current!
    let cancelled = false
    const onLoaded = () => {
      if (cancelled) return
      const at = Math.min(startAtRef.current, Math.max(0, v.duration - END_OFFSET))
      const finish = () => {
        if (cancelled) return
        setReady(true)
        callbacks.current.onTime(v.currentTime, v.duration)
        callbacks.current.onReady()
      }
      if (at > 0.01) {
        v.addEventListener('seeked', finish, { once: true })
        v.currentTime = at
      } else finish()
    }
    const onFail = () => !cancelled && callbacks.current.onError()
    v.addEventListener('loadeddata', onLoaded, { once: true })
    v.addEventListener('error', onFail)
    v.src = src
    v.load()
    return () => {
      cancelled = true
      v.removeEventListener('loadeddata', onLoaded)
      v.removeEventListener('error', onFail)
    }
  }, [src])

  useEffect(() => {
    const v = videoRef.current!
    if (!ready) return
    if (shouldPlay) {
      v.play().catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'NotAllowedError') || v.muted) return
        // Автозапуск зі звуком заборонено: граємо без звуку, звук увімкне перший дотик.
        v.muted = true
        callbacks.current.onAutoplayMuted()
        v.play().catch(() => {})
      })
    } else {
      v.pause()
    }
  }, [ready, shouldPlay])

  useEffect(() => {
    videoRef.current!.muted = muted
  }, [muted])

  useEffect(() => {
    const v = videoRef.current!
    v.defaultPlaybackRate = playbackRate
    v.playbackRate = playbackRate
  }, [playbackRate])

  // Час щокадру: від нього залежить, наскільки точно спрацьовує пауза.
  useEffect(() => {
    if (!shouldPlay || !ready) return
    const v = videoRef.current!
    let raf = 0
    const tick = () => {
      if (Number.isFinite(v.duration)) callbacks.current.onTime(v.currentTime, v.duration)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, shouldPlay])

  return (
    <div className="video-stage">
      <video
        ref={videoRef}
        className={`video-stage__video${ready ? ' video-stage__video--active' : ''}`}
        playsInline
        muted={muted}
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        // Після будь-якої перемотки (і нашої, і самого браузера) повідомляємо актуальний час, навіть на паузі.
        onSeeked={() => {
          const v = videoRef.current!
          if (Number.isFinite(v.duration)) callbacks.current.onTime(v.currentTime, v.duration)
        }}
        onEnded={() => {
          const v = videoRef.current!
          callbacks.current.onTime(v.duration, v.duration)
          callbacks.current.onEnded()
        }}
      />
    </div>
  )
})
