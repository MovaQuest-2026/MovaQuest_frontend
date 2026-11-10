import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLesson } from '../api/getLesson'
import { ChoicePanel } from '../features/player/ChoicePanel'
import { PlayerControls, PlayerTopBar } from '../features/player/PlayerControls'
import { SubtitleLayer } from '../features/player/SubtitleLayer'
import { upcomingClips } from '../features/player/sceneMachine'
import { useClipPreloader } from '../features/player/useClipPreloader'
import { DevSpeechPanel } from '../features/speech/DevSpeechPanel'
import { VideoStage, type VideoStageHandle } from '../features/player/VideoStage'
import { localize } from '../i18n/localize'
import { clipUrl, selectCurrentScene, usePlayerStore } from '../store/usePlayerStore'
import { useUserStore } from '../store/useUserStore'

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

  useEffect(() => {
    let cancelled = false
    getLesson(lessonId)
      .then((l) => {
        if (cancelled) return
        usePlayerStore.getState().load(l)
        setLoaded({ lessonId, state: 'ready' })
      })
      .catch(() => !cancelled && setLoaded({ lessonId, state: 'notFound' }))
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
  const onError = useCallback(() => setLoaded({ lessonId, state: 'clipError' }), [lessonId])

  const seek = (time: number) => {
    const s = usePlayerStore.getState()
    if (s.machine?.status === 'awaitingChoice' && time < s.duration - 0.1) {
      dispatch({ type: 'REPLAY' })
    }
    stageRef.current?.seek(time)
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

  const status = machine.status
  const playing = status === 'playing'
  const shouldPlay = started && playing && !userPaused
  const showControls = started && (playing || status === 'awaitingChoice')

  return (
    <main className="player">
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
      />

      <div className="player__overlay">
        <PlayerTopBar />
        <DevSpeechPanel />
        <button
          type="button"
          className="player__tap-area"
          aria-label={userPaused ? t('player.play') : t('player.pause')}
          disabled={!playing}
          onClick={() => setUserPaused(!userPaused)}
        >
          {playing && userPaused && <span className="player__paused-icon">▶</span>}
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
  )
}
