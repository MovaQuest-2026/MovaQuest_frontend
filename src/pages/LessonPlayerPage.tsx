import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLesson } from '../api/getLesson'
import { TabBar } from '../components/TabBar'
import { ChoicePanel } from '../features/player/ChoicePanel'
import { PlayerControls, PlayerTopBar } from '../features/player/PlayerControls'
import { SubtitleLayer } from '../features/player/SubtitleLayer'
import { upcomingClips } from '../features/player/sceneMachine'
import { useClipPreloader } from '../features/player/useClipPreloader'
import { useFeedGestures } from '../features/player/useFeedGestures'
import { useLessonFeed, type FeedDirection } from '../features/player/useLessonFeed'
import { DevSpeechPanel } from '../features/speech/DevSpeechPanel'
import { VideoStage, type VideoStageHandle } from '../features/player/VideoStage'
import { localize } from '../i18n/localize'
import { clipUrl, selectCurrentScene, usePlayerStore } from '../store/usePlayerStore'
import { useUserStore } from '../store/useUserStore'

const SEEK_STEP = 5
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
  const stageRef = useRef<VideoStageHandle>(null)
  const [loaded, setLoaded] = useState<{ lessonId: string; state: LoadState } | null>(null)
  const load: LoadState = loaded?.lessonId === lessonId ? loaded.state : 'loading'

  const lesson = usePlayerStore((s) => s.lesson)
  const machine = usePlayerStore((s) => s.machine)
  const scene = usePlayerStore(selectCurrentScene)
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

  // Стрічка уроків: свайп угору — наступний, вниз — попередній. На краях стрічки — «пружинка».
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

  const preload = lesson && machine ? upcomingClips(lesson, machine).map((c) => clipUrl(lesson.id, c)) : []
  useClipPreloader(started ? preload : [])

  const onReady = useCallback(() => dispatch({ type: 'CLIP_READY' }), [dispatch])
  const onEnded = useCallback(() => dispatch({ type: 'CLIP_ENDED' }), [dispatch])
  const onPlayBlocked = useCallback(() => usePlayerStore.getState().playBlocked(), [])
  const onError = useCallback(() => setLoaded({ lessonId, state: 'clipError' }), [lessonId])

  const seek = (time: number) => {
    const s = usePlayerStore.getState()
    if (s.machine?.status === 'awaitingChoice' && time < s.duration - 0.1) {
      dispatch({ type: 'REPLAY' })
    }
    stageRef.current?.seek(time)
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

  if (load === 'loading' || !lesson || !machine || !scene) {
    return <main className="player player--loading">{t('app.loading')}</main>
  }

  const motionClass = motion
    ? ` player--${motion.kind}-${motion.dir}`
    : enterFrom
      ? ` player--enter-${enterFrom}`
      : ''

  const status = machine.status
  const playing = status === 'playing'
  const shouldPlay = started && playing && !userPaused
  const showControls = started && (playing || status === 'awaitingChoice')

  return (
    <>
      <main key={lesson.id} className={`player player--with-tabbar${motionClass}`}
        {...gestures}
        onAnimationEnd={(e) => {
          if (e.animationName.startsWith('feed-enter')) setEnteredKey(location.key)
        }}
      >
        <VideoStage
          ref={stageRef}
          src={clipUrl(lesson.id, scene.clip)}
          entryId={machine.entryId}
          startAtEnd={machine.entry === 'resume'}
          shouldPlay={shouldPlay}
          playbackRate={playbackRate}
          onReady={onReady}
          onEnded={onEnded}
          onProgress={setProgress}
          onError={onError}
          onPlayBlocked={onPlayBlocked}
        />

        <div className="player__overlay">
          <PlayerTopBar />
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

          <SubtitleLayer subtitles={scene.subtitles} />

          {scene.choice && (status === 'awaitingChoice' || status === 'listening' || status === 'evaluating') && (
            <ChoicePanel lessonId={lesson.id} sceneId={scene.id} choice={scene.choice} machine={machine} />
          )}

          {showControls && <PlayerControls onSeek={seek} />}
        </div>

        {!started && (
          <button
            type="button"
            className="player__start"
            onClick={() => {
              stageRef.current?.unlock()
              start()
            }}
          >
            <span className="player__start-title">{localize(lesson.title, lang)}</span>
            <span className="player__start-cta">▶ {t('player.tapToStart')}</span>
          </button>
        )}
      </main>
      <TabBar />
    </>
  )
}
