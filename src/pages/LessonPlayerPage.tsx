import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLesson } from '../api/getLesson'
import { TabBar } from '../components/TabBar'
import { GapPanel } from '../features/player/GapPanel'
import { clampSeek, currentGap, isAnswering, PAUSE_LEAD } from '../features/player/gapMachine'
import { PlayerControls, PlayerTopBar } from '../features/player/PlayerControls'
import { SubtitleLayer } from '../features/player/SubtitleLayer'
import { useFeedGestures } from '../features/player/useFeedGestures'
import { useLessonFeed, type FeedDirection } from '../features/player/useLessonFeed'
import { supportsPlaybackRate } from '../features/player/video/source'
import { VideoSurface } from '../features/player/video/VideoSurface'
import type { VideoHandle } from '../features/player/video/types'
import { DevSpeechPanel } from '../features/speech/DevSpeechPanel'
import { localize } from '../i18n/localize'
import { usePlayerStore } from '../store/usePlayerStore'
import { useUserStore } from '../store/useUserStore'

const SEEK_STEP = 5
/** «Послухати ще раз»: на скільки секунд відмотати від паузи. */
const REPLAY_SEC = 4
const FEED_TRANSITION_MS = 260

// Без жесту користувача браузер не дасть відтворити зі звуком — тоді показуємо «Tap to start».
function hasUserActivation(): boolean {
  return navigator.userActivation?.hasBeenActive ?? false
}

type LoadState = 'loading' | 'ready' | 'notFound' | 'clipError'

export function LessonPlayerPage() {
  const { lessonId = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const videoRef = useRef<VideoHandle>(null)
  const [loaded, setLoaded] = useState<{ lessonId: string; state: LoadState } | null>(null)
  const load: LoadState = loaded?.lessonId === lessonId ? loaded.state : 'loading'

  const lesson = usePlayerStore((s) => s.lesson)
  const machine = usePlayerStore((s) => s.machine)
  const startAt = usePlayerStore((s) => s.startAt)
  const started = usePlayerStore((s) => s.started)
  const userPaused = usePlayerStore((s) => s.userPaused)
  const { dispatch, start, setUserPaused, setProgress } = usePlayerStore.getState()
  const playbackRate = useUserStore((s) => s.playbackRate)
  const lang = useUserStore((s) => s.interfaceLanguage)
  const location = useLocation()
  // Анімація входу після свайпу грає один раз на навігацію, а не після кожної «пружинки».
  const [enteredKey, setEnteredKey] = useState<string | null>(null)
  const enterFrom =
    enteredKey === location.key ? undefined : (location.state as { enter?: FeedDirection } | null)?.enter

  // Стрічка: свайп угору — наступне відео, вниз — попереднє. На краях стрічки — «пружинка».
  const feed = useLessonFeed(lessonId)
  const [motion, setMotion] = useState<{ kind: 'leave' | 'bounce'; dir: FeedDirection; id: number } | null>(null)
  const motionTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(motionTimer.current), [])
  const goToNeighbour = (dir: FeedDirection) => {
    if (motion?.kind === 'leave') return
    const target = dir === 'next' ? feed.next : feed.prev
    window.clearTimeout(motionTimer.current)
    if (!target) {
      setMotion({ kind: 'bounce', dir, id: Date.now() })
      motionTimer.current = window.setTimeout(() => setMotion(null), 400)
      return
    }
    setMotion({ kind: 'leave', dir, id: Date.now() })
    motionTimer.current = window.setTimeout(() => {
      setMotion(null)
      navigate(`/lesson/${target}`, { state: { enter: dir } })
    }, FEED_TRANSITION_MS)
  }
  const gestures = useFeedGestures(goToNeighbour)

  useEffect(() => {
    let cancelled = false
    getLesson(lessonId)
      .then((l) => {
        if (cancelled) return
        const player = usePlayerStore.getState()
        player.load(l)
        // Як у стрічці: якщо користувач уже торкався сторінки, відео стартує одразу зі звуком.
        if (hasUserActivation()) player.start()
        setLoaded({ lessonId, state: 'ready' })
      })
      .catch(() => {
        if (cancelled) return
        const user = useUserStore.getState()
        if (user.activeLesson?.lessonId === lessonId) user.setActiveLesson(null)
        setLoaded({ lessonId, state: 'notFound' })
      })
    return () => {
      cancelled = true
      usePlayerStore.getState().unload()
    }
  }, [lessonId])

  useEffect(() => {
    if (machine?.status === 'ended') navigate(`/lesson/${lessonId}/result`, { replace: true })
  }, [machine?.status, lessonId, navigate])

  // Відео стало на паузу трохи пізніше за pauseAt (кадр або подія TikTok): повертаємо рівно на межу.
  const status = machine?.status
  useEffect(() => {
    if (status !== 'awaitingAnswer') return
    const s = usePlayerStore.getState()
    const gap = s.lesson && s.machine ? currentGap(s.lesson, s.machine) : null
    if (gap && s.currentTime > gap.pauseAt) videoRef.current?.seek(gap.pauseAt - PAUSE_LEAD)
  }, [status])

  const onReady = useCallback(() => dispatch({ type: 'CLIP_READY' }), [dispatch])
  const onEnded = useCallback(() => dispatch({ type: 'CLIP_ENDED' }), [dispatch])
  const onPlayBlocked = useCallback(() => usePlayerStore.getState().playBlocked(), [])
  const onError = useCallback(() => setLoaded({ lessonId, state: 'clipError' }), [lessonId])

  const seek = (time: number) => {
    const s = usePlayerStore.getState()
    if (!s.lesson || !s.machine) return
    if (s.machine.status === 'feedback') return
    const target = clampSeek(s.lesson, s.machine, time, s.duration)
    if (s.machine.status === 'awaitingAnswer' && target < s.currentTime - 0.1) dispatch({ type: 'REPLAY' })
    videoRef.current?.seek(target)
  }

  const replay = () => {
    const s = usePlayerStore.getState()
    const gap = s.lesson && s.machine ? currentGap(s.lesson, s.machine) : null
    if (!gap) return
    dispatch({ type: 'REPLAY' })
    videoRef.current?.seek(Math.max(0, gap.pauseAt - REPLAY_SEC))
  }

  // Дотик по відео: ліва третина — назад на 5 с, права — вперед на 5 с, середина — пауза.
  const [flash, setFlash] = useState<{ side: 'back' | 'forward'; id: number } | null>(null)
  const flashTimer = useRef(0)
  const onStageTap = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const { currentTime, machine: m } = usePlayerStore.getState()
    if (x < 1 / 3 || x > 2 / 3) {
      const side = x < 1 / 3 ? 'back' : 'forward'
      seek(currentTime + (side === 'back' ? -SEEK_STEP : SEEK_STEP))
      setFlash({ side, id: Date.now() })
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(null), 600)
    } else if (m?.status === 'playing') {
      setUserPaused(!usePlayerStore.getState().userPaused)
    }
  }

  if (load === 'notFound') {
    return (
      <main className="page">
        <p className="notice notice--error">{t('player.notFound')}</p>
        <Link className="btn" to="/lessons">
          {t('result.backToLessons')}
        </Link>
      </main>
    )
  }

  if (load === 'loading' || !lesson || !machine) {
    return <main className="player player--loading">{t('app.loading')}</main>
  }

  const motionClass = motion
    ? ` player--${motion.kind}-${motion.dir}`
    : enterFrom
      ? ` player--enter-${enterFrom}`
      : ''

  const playing = machine.status === 'playing'
  const gap = currentGap(lesson, machine)
  const answering = isAnswering(machine) || machine.status === 'feedback'
  const shouldPlay = started && playing && !userPaused
  const showControls = started && (playing || machine.status === 'awaitingAnswer')

  return (
    <>
      <main
        key={lesson.id}
        className={`player player--with-tabbar${motionClass}`}
        {...gestures}
        onAnimationEnd={(e) => {
          if (e.animationName.startsWith('feed-enter')) setEnteredKey(location.key)
        }}
      >
        <VideoSurface
          ref={videoRef}
          source={lesson.video}
          startAt={startAt}
          shouldPlay={shouldPlay}
          playbackRate={playbackRate}
          onReady={onReady}
          onTime={setProgress}
          onEnded={onEnded}
          onError={onError}
          onPlayBlocked={onPlayBlocked}
        />

        <div className="player__overlay">
          <PlayerTopBar
            lesson={lesson}
            results={machine.results}
            gapIndex={machine.gapIndex}
            canChangeSpeed={supportsPlaybackRate(lesson.video)}
          />
          <DevSpeechPanel />
          <button
            type="button"
            className="player__tap-area"
            aria-label={userPaused ? t('player.play') : t('player.pause')}
            disabled={!showControls}
            onClick={onStageTap}
          >
            {playing && userPaused && <span className="player__paused-icon">▶</span>}
            {flash && (
              <span key={flash.id} className={`player__seek-flash player__seek-flash--${flash.side}`} aria-hidden="true">
                {flash.side === 'back' ? `−${SEEK_STEP}` : `+${SEEK_STEP}`}
              </span>
            )}
          </button>

          {load === 'clipError' && <p className="notice notice--error player__notice">{t('player.clipError')}</p>}

          {!answering && <SubtitleLayer cues={lesson.cues} />}

          {gap && answering && (
            <GapPanel key={gap.id} lessonId={lesson.id} gap={gap} machine={machine} onReplay={replay} />
          )}

          {showControls && !answering && <PlayerControls lesson={lesson} onSeek={seek} />}
        </div>

        {!started && (
          <button
            type="button"
            className="player__start"
            onClick={() => {
              videoRef.current?.unlock()
              start()
            }}
          >
            <span className="player__start-title">{localize(lesson.title, lang)}</span>
            {lesson.video.type === 'tiktok' && lesson.video.author && (
              <span className="player__start-author">@{lesson.video.author}</span>
            )}
            <span className="player__start-cta">▶ {t('player.tapToStart')}</span>
          </button>
        )}
      </main>
      <TabBar />
    </>
  )
}
