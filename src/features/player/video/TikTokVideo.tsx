import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import {
  TIKTOK_ORIGIN,
  TikTokState,
  commandMessage,
  extrapolateTime,
  parseTikTokMessage,
  tiktokPlayerUrl,
  type TikTokCommand,
} from './tiktokProtocol'
import type { VideoHandle, VideoSurfaceProps } from './types'

const READY_TIMEOUT_MS = 15000

interface TikTokVideoProps extends VideoSurfaceProps {
  videoId: string
}

// Відео з TikTok через офіційний Embed Player. Швидкість відтворення плеєр не підтримує.
export const TikTokVideo = forwardRef<VideoHandle, TikTokVideoProps>(function TikTokVideo(
  { videoId, startAt, shouldPlay, muted, onReady, onTime, onEnded, onError },
  ref,
) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const callbacks = useRef({ onReady, onTime, onEnded, onError })
  useLayoutEffect(() => {
    callbacks.current = { onReady, onTime, onEnded, onError }
  })
  const clock = useRef({ time: 0, at: 0, duration: NaN, playing: false })
  const startAtRef = useRef(startAt)

  const send = (command: TikTokCommand) => {
    frameRef.current?.contentWindow?.postMessage(commandMessage(command), TIKTOK_ORIGIN)
  }

  useImperativeHandle(ref, () => ({
    seek: (time) => {
      const c = clock.current
      const t = Math.max(0, Number.isFinite(c.duration) ? Math.min(time, c.duration - 0.05) : time)
      send({ type: 'seekTo', value: t })
      clock.current = { ...c, time: t, at: performance.now() }
      callbacks.current.onTime(t, c.duration)
    },
  }))

  useEffect(() => {
    clock.current = { time: 0, at: 0, duration: NaN, playing: false }
    const timeout = window.setTimeout(() => callbacks.current.onError(), READY_TIMEOUT_MS)

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TIKTOK_ORIGIN || e.source !== frameRef.current?.contentWindow) return
      const event = parseTikTokMessage(e.data)
      if (!event) return
      const c = clock.current
      switch (event.type) {
        case 'ready':
          window.clearTimeout(timeout)
          if (startAtRef.current > 0) {
            send({ type: 'seekTo', value: startAtRef.current })
            clock.current = { ...c, time: startAtRef.current, at: performance.now() }
          }
          setReady(true)
          callbacks.current.onReady()
          break
        case 'time':
          clock.current = {
            ...c,
            time: event.currentTime,
            at: performance.now(),
            duration: Number.isFinite(event.duration) ? event.duration : c.duration,
          }
          break
        case 'state':
          clock.current = { ...c, playing: event.state === TikTokState.playing, at: performance.now() }
          if (event.state === TikTokState.ended) {
            callbacks.current.onTime(c.duration, c.duration)
            callbacks.current.onEnded()
          }
          break
        case 'error':
          callbacks.current.onError()
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
    }
  }, [videoId])

  // Звук окремим ефектом і раніше за play: без жесту користувача автозапуск дозволено лише без звуку.
  useEffect(() => {
    if (ready) send({ type: muted ? 'mute' : 'unMute' })
  }, [ready, muted])

  useEffect(() => {
    if (!ready) return
    if (shouldPlay) {
      send({ type: 'play' })
    } else {
      send({ type: 'pause' })
      clock.current = { ...clock.current, playing: false }
    }
  }, [ready, shouldPlay])

  // Між рідкими onCurrentTime час екстраполюємо щокадру, щоб пауза влучала точніше.
  useEffect(() => {
    if (!ready || !shouldPlay) return
    let raf = 0
    const tick = () => {
      const c = clock.current
      callbacks.current.onTime(extrapolateTime(c.time, c.at, performance.now(), c.playing), c.duration)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, shouldPlay])

  return (
    <div className="video-stage">
      <iframe
        ref={frameRef}
        className={`video-stage__video video-stage__frame${ready ? ' video-stage__video--active' : ''}`}
        src={tiktokPlayerUrl(videoId)}
        title="TikTok"
        allow="autoplay; encrypted-media; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
      />
    </div>
  )
})
