import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLesson } from '../api/getLesson'
import { trackLessonLiked } from '../api/analytics'
import { prefetchLessonStats } from '../api/social'
import { TabBar } from '../components/TabBar'
import { ActionRail } from '../features/player/ActionRail'
import { CommentsSheet } from '../features/player/CommentsSheet'
import { GapPanel } from '../features/player/GapPanel'
import { likeLesson } from '../features/player/likeLesson'
import { SignInPrompt } from '../features/player/SignInPrompt'
import { clampSeek, CONTEXT_LEAD_SEC, currentGap, isAnswering, PAUSE_LEAD } from '../features/player/gapMachine'
import { PlayerControls, PlayerTopBar } from '../features/player/PlayerControls'
import { ResultModal } from '../features/player/ResultModal'
import { SubtitleLayer } from '../features/player/SubtitleLayer'
import { useFeedGestures } from '../features/player/useFeedGestures'
import { useLessonFeed, type FeedDirection } from '../features/player/useLessonFeed'
import { supportsPlaybackRate } from '../features/player/video/source'
import { VideoSurface } from '../features/player/video/VideoSurface'
import type { VideoHandle } from '../features/player/video/types'
import { DevSpeechPanel } from '../features/speech/DevSpeechPanel'
import { usePlayerStore } from '../store/usePlayerStore'
import { useUserStore } from '../store/useUserStore'

const SEEK_STEP = 5
const FEED_TRANSITION_MS = 220
/** Два дотики по відео швидше за цей час і ближче за DOUBLE_TAP_DIST: лайк. Одинарний дотик виконується після цього вікна. */
const DOUBLE_TAP_MS = 250
const DOUBLE_TAP_DIST = 48
/** Якщо під час відповіді відео саме опинилось раніше за паузу більш ніж на стільки секунд, повертаємо його на паузу. */
const DRIFT_SEC = 1

// Без жесту користувача браузер дозволяє автозапуск лише без звуку.
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
  const muted = usePlayerStore((s) => s.muted)
  const userPaused = usePlayerStore((s) => s.userPaused)
  const { dispatch, setUserPaused, setProgress, setMuted } = usePlayerStore.getState()
  const playbackRate = useUserStore((s) => s.playbackRate)
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
  // Шари, що їдуть за пальцем: відео й оверлей (TabBar лишається на місці).
  const mainRef = useRef<HTMLElement>(null)
  const moveLayers = (offsetPx: number, transition = 'none') => {
    mainRef.current?.querySelectorAll<HTMLElement>('.video-stage, .player__overlay').forEach((el) => {
      el.style.transition = transition
      el.style.transform = offsetPx === 0 && transition === 'none' ? '' : `translate3d(0, ${offsetPx}px, 0)`
    })
  }
  const settleTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(settleTimer.current), [])
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
    // Догортуємо від поточного зсуву (палець, клавіша чи коліщатко) до краю екрана.
    const height = mainRef.current?.clientHeight ?? window.innerHeight
    moveLayers(dir === 'next' ? -height : height, `transform ${FEED_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.9, 0.6)`)
    motionTimer.current = window.setTimeout(() => {
      setMotion(null)
      navigate(`/lesson/${target}`, { state: { enter: dir } })
    }, FEED_TRANSITION_MS)
  }
  const gestures = useFeedGestures({
    canGo: (dir) => Boolean(dir === 'next' ? feed.next : feed.prev),
    onDrag: (offset) => {
      if (motion?.kind === 'leave') return
      window.clearTimeout(settleTimer.current)
      moveLayers(offset)
    },
    onCommit: (dir) => goToNeighbour(dir),
    onCancel: () => {
      if (motion?.kind === 'leave') return
      moveLayers(0, 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)')
      window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(() => moveLayers(0), 300)
    },
  })

  // Лічильники лайків і коментарів сусідніх відео завантажуємо наперед, щоб після свайпу там не було нулів.
  useEffect(() => {
    prefetchLessonStats(lessonId)
    prefetchLessonStats(feed.next)
    prefetchLessonStats(feed.prev)
    // Сам урок і обкладинку сусідів теж: після свайпу нічого не чекаємо.
    for (const id of [feed.next, feed.prev]) {
      if (id) getLesson(id).then((l) => { new Image().src = l.cover }).catch(() => {})
    }
  }, [lessonId, feed.next, feed.prev])
  // Поки відкриті коментарі, відео стоїть (інакше пауза для відповіді сховається під шторкою).
  // Прив'язано до уроку: після свайпу на інший урок шторка закрита.
  const [commentsFor, setCommentsFor] = useState<string | null>(null)
  const commentsOpen = commentsFor === lessonId
  const closeComments = useCallback(() => setCommentsFor(null), [])
  const [statsRevision, setStatsRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    getLesson(lessonId)
      .then((l) => {
        if (cancelled) return
        const player = usePlayerStore.getState()
        player.load(l)
        // Як у стрічці: відео стартує одразу. Якщо користувач ще не торкався сторінки, без звуку.
        player.setMuted(!hasUserActivation())
        player.start()
        setLoaded({ lessonId, state: 'ready' })
      })
      .catch(() => {
        if (cancelled) return
        const user = useUserStore.getState()
        user.setActiveLesson(lessonId, null)
        setLoaded({ lessonId, state: 'notFound' })
      })
    return () => {
      cancelled = true
      usePlayerStore.getState().unload()
    }
  }, [lessonId])

  // Відео стало на паузу трохи пізніше за pauseAt (кадр або подія TikTok): повертаємо рівно на межу.
  const status = machine?.status
  useEffect(() => {
    if (status !== 'awaitingAnswer') return
    const s = usePlayerStore.getState()
    const gap = s.lesson && s.machine ? currentGap(s.lesson, s.machine) : null
    if (gap && s.currentTime > gap.pauseAt) videoRef.current?.seek(gap.pauseAt - PAUSE_LEAD)
  }, [status])

  // Захист: поки користувач думає над відповіддю, відео стоїть на межі паузи. Навмисна перемотка (повзунок, ±5,
  // «Ще раз», кружечки) спершу виводить автомат зі стану відповіді, тож сюди потрапляє лише мимовільний зсув назад.
  useEffect(
    () =>
      usePlayerStore.subscribe((s, prev) => {
        if (s.currentTime === prev.currentTime || !s.lesson || !s.machine || !isAnswering(s.machine)) return
        const gap = currentGap(s.lesson, s.machine)
        if (gap && s.currentTime < gap.pauseAt - DRIFT_SEC) videoRef.current?.seek(gap.pauseAt - PAUSE_LEAD)
      }),
    [],
  )

  const onReady = useCallback(() => dispatch({ type: 'CLIP_READY' }), [dispatch])
  const onEnded = useCallback(() => dispatch({ type: 'CLIP_ENDED' }), [dispatch])
  const onAutoplayMuted = useCallback(() => usePlayerStore.getState().setMuted(true), [])

  // Перший дотик будь-де вмикає звук. Дотик по самому відео при цьому не ставить його на паузу.
  useEffect(() => {
    if (!muted) return
    const unmute = (e: Event) => {
      setMuted(false)
      if ((e.target as Element | null)?.closest?.('.player__tap-area')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('click', unmute, { capture: true })
    window.addEventListener('keydown', unmute, { capture: true })
    return () => {
      window.removeEventListener('click', unmute, { capture: true })
      window.removeEventListener('keydown', unmute, { capture: true })
    }
  }, [muted, setMuted])
  const onError = useCallback(() => setLoaded({ lessonId, state: 'clipError' }), [lessonId])

  const seek = (time: number) => {
    const s = usePlayerStore.getState()
    if (!s.lesson || !s.machine) return
    // Під час запису й на екрані результату паузи перемотка вимкнена.
    if (s.machine.status !== 'playing' && s.machine.status !== 'awaitingAnswer') return
    const target = clampSeek(time, s.duration)
    // Вперед за паузу: вона стає «перемотаною» (окремий колір кружечка), відео грає далі.
    dispatch({ type: 'SEEK', time: target })
    videoRef.current?.seek(target)
  }

  // «Спробувати ще раз» у підсумку: той самий урок спочатку, без переходу між сторінками.
  const restartLesson = () => {
    const s = usePlayerStore.getState()
    if (!s.lesson) return
    const wasMuted = s.muted
    s.load(s.lesson)
    const player = usePlayerStore.getState()
    player.setMuted(wasMuted)
    player.start()
    videoRef.current?.seek(0)
    player.dispatch({ type: 'CLIP_READY' })
  }

  const replay = () => {
    const s = usePlayerStore.getState()
    const gap = s.lesson && s.machine ? currentGap(s.lesson, s.machine) : null
    if (!gap) return
    dispatch({ type: 'REPLAY' })
    videoRef.current?.seek(Math.max(0, gap.pauseAt - CONTEXT_LEAD_SEC))
  }

  // Повтор слова: заново для червоної/жовтої паузи, для практики для зеленої (її результат лишається).
  const retryGap = (gapId: string) => {
    const s = usePlayerStore.getState()
    const target = s.lesson?.gaps.find((g) => g.id === gapId)
    if (!target) return
    dispatch({ type: 'RETRY_GAP', gapId })
    setUserPaused(false)
    videoRef.current?.seek(Math.max(0, target.pauseAt - CONTEXT_LEAD_SEC))
  }

  // Дотик по відео: ліва третина — назад на 5 с, права — вперед на 5 с, середина — пауза.
  const [flash, setFlash] = useState<{ side: 'back' | 'forward'; id: number } | null>(null)
  const flashTimer = useRef(0)
  // Середина відео: пауза спрацьовує одразу (без чекання на другий дотик); «undo» повертає її, якщо це був подвійний дотик.
  // Краї (±5 с) чекають DOUBLE_TAP_MS, бо перемотку вперед не скасуєш.
  const seekTap = (x: number) => {
    const { currentTime } = usePlayerStore.getState()
    const side = x < 1 / 3 ? 'back' : 'forward'
    seek(currentTime + (side === 'back' ? -SEEK_STEP : SEEK_STEP))
    setFlash({ side, id: Date.now() })
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 600)
  }
  const togglePause = (): (() => void) | null => {
    const { machine: m, userPaused: was } = usePlayerStore.getState()
    if (m?.status !== 'playing') return null
    setUserPaused(!was)
    return () => setUserPaused(was)
  }

  // Подвійний дотик по відео ставить лайк (гостя відправляє на вхід), з серцем у місці дотику.
  const [burst, setBurst] = useState<{ x: number; y: number; id: number } | null>(null)
  const burstTimer = useRef(0)
  const pendingTap = useRef<{ at: number; x: number; y: number; timer: number; run: () => void; undo?: () => void } | null>(null)
  useEffect(
    () => () => {
      window.clearTimeout(burstTimer.current)
      window.clearTimeout(pendingTap.current?.timer)
    },
    [],
  )
  const doubleTapLike = (x: number, y: number) => {
    if (!useUserStore.getState().account) {
      navigate('/auth', { state: { from: location.pathname } })
      return
    }
    setBurst({ x, y, id: Date.now() })
    window.clearTimeout(burstTimer.current)
    burstTimer.current = window.setTimeout(() => setBurst(null), 800)
    likeLesson(lessonId)
      .then((added) => {
        if (!added) return
        trackLessonLiked(lessonId, true)
        setStatsRevision((r) => r + 1)
      })
      .catch(() => {})
  }

  const onStageTap = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const now = Date.now()
    const prev = pendingTap.current
    pendingTap.current = null
    if (prev) {
      window.clearTimeout(prev.timer)
      if (now - prev.at < DOUBLE_TAP_MS && Math.hypot(px - prev.x, py - prev.y) < DOUBLE_TAP_DIST) {
        prev.undo?.() // перший дотик уже поставив паузу: повертаємо
        doubleTapLike(px, py)
        return
      }
      prev.run() // перший дотик був окремим: виконуємо його зараз
    }
    const x = px / rect.width
    if (x >= 1 / 3 && x <= 2 / 3) {
      const undo = togglePause() ?? undefined
      pendingTap.current = { at: now, x: px, y: py, timer: window.setTimeout(() => (pendingTap.current = null), DOUBLE_TAP_MS), run: () => {}, undo }
      return
    }
    const run = () => {
      pendingTap.current = null
      seekTap(x)
    }
    pendingTap.current = { at: now, x: px, y: py, timer: window.setTimeout(run, DOUBLE_TAP_MS), run }
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
    return (
      <main className="player player--loading">
        <span className="player__loading-text">{t('app.loading')}</span>
      </main>
    )
  }

  // Вихід (leave) робить moveLayers; класи лишаються для «пружинки» на краях і для появи нового уроку.
  const motionClass = motion?.kind === 'bounce'
    ? ` player--bounce-${motion.dir}`
    : enterFrom
      ? ` player--enter-${enterFrom}`
      : ''

  const playing = machine.status === 'playing'
  const gap = currentGap(lesson, machine)
  const answering = isAnswering(machine) || machine.status === 'feedback'
  const shouldPlay = started && playing && !userPaused && !commentsOpen
  const showControls = started && (playing || machine.status === 'awaitingAnswer')

  return (
    <>
      <main
        key={lesson.id}
        ref={mainRef}
        style={{ '--cover': `url("${lesson.cover}")` } as CSSProperties}
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
          muted={muted}
          playbackRate={playbackRate}
          onReady={onReady}
          onTime={setProgress}
          onEnded={onEnded}
          onError={onError}
          onAutoplayMuted={onAutoplayMuted}
        />

        <div className="player__overlay">
          <PlayerTopBar
            lesson={lesson}
            results={machine.results}
            gapIndex={machine.gapIndex}
            canChangeSpeed={supportsPlaybackRate(lesson.video)}
            canReview={started && (playing || machine.status === 'awaitingAnswer')}
            onRetryGap={retryGap}
          />
          {muted && (
            <button type="button" className="player__unmute" onClick={() => setMuted(false)}>
              <span aria-hidden="true">🔇</span> {t('player.unmute')}
            </button>
          )}
          <SignInPrompt allowed={started && !muted && !answering && !commentsOpen} />
          <DevSpeechPanel />
          <div className="player__stage">
            <button
              type="button"
              className="player__tap-area"
              aria-label={userPaused ? t('player.play') : t('player.pause')}
              disabled={!showControls}
              onClick={onStageTap}
            >
              {playing && userPaused && <span className="player__paused-icon">▶</span>}
              {burst && (
                <svg
                  key={burst.id}
                  className="player__like-burst"
                  style={{ left: burst.x, top: burst.y }}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.2Z" />
                </svg>
              )}
              {flash && (
                <span key={flash.id} className={`player__seek-flash player__seek-flash--${flash.side}`} aria-hidden="true">
                  {flash.side === 'back' ? `−${SEEK_STEP}` : `+${SEEK_STEP}`}
                </span>
              )}
            </button>
            {/* Під час відповіді колонку ховаємо: увага на паузі. */}
            {!answering && (
              <ActionRail
                lesson={lesson}
                statsRevision={statsRevision}
                onOpenComments={() => setCommentsFor(lessonId)}
              />
            )}
          </div>

          {load === 'clipError' && <p className="notice notice--error player__notice">{t('player.clipError')}</p>}

          {!answering && <SubtitleLayer cues={lesson.cues} />}

          {gap && answering && (
            <GapPanel key={gap.id} lessonId={lesson.id} gap={gap} machine={machine} onReplay={replay} onRetry={() => retryGap(gap.id)} />
          )}

          {showControls && !answering && <PlayerControls lesson={lesson} results={machine.results} onSeek={seek} />}
        </div>

        {machine.status === 'ended' && machine.outcome && (
          <ResultModal
            lesson={lesson}
            results={machine.results}
            outcome={machine.outcome}
            hasNext={Boolean(feed.next)}
            onTryAgain={restartLesson}
            onNext={() => goToNeighbour('next')}
          />
        )}

        {commentsOpen && (
          <CommentsSheet lessonId={lesson.id} onClose={closeComments} onPosted={() => setStatsRevision((r) => r + 1)} />
        )}
      </main>
      <TabBar />
    </>
  )
}
