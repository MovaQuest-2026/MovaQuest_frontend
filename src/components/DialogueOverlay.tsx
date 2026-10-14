import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Story } from 'inkjs'
import { getDialogue, getInkVariableNames } from '../api/getDialogue'
import { getExercises } from '../api/getExercises'
import type { QuizConfig } from '../api/getQuiz'
import { trackLessonStarted, trackQuizAnswered } from '../api/analytics'
import { useGameStore, type FlagValue } from '../store/useGameStore'
import { QuizCard } from './QuizCard'

interface DialogueChoice {
  index: number
  text: string
}

export function DialogueOverlay() {
  const activeDialogue = useGameStore((state) => state.activeDialogue)
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const lang = nativeLanguage ?? 'en'

  if (!activeDialogue) return null

  // key скидає стан сесії при зміні діалогу або мови.
  return (
    <DialogueSession
      key={`${activeDialogue}:${lang}`}
      dialogueId={activeDialogue}
      lang={lang}
    />
  )
}

interface DialogueSessionProps {
  dialogueId: string
  lang: 'en' | 'uk'
}

function parseTag(tag: string): [string, string] {
  const separator = tag.indexOf(':')
  if (separator === -1) return [tag.trim(), '']
  return [tag.slice(0, separator).trim(), tag.slice(separator + 1).trim()]
}

function DialogueSession({ dialogueId, lang }: DialogueSessionProps) {
  const { t } = useTranslation()
  const cityConfig = useGameStore((state) => state.cityConfig)

  const storyRef = useRef<Story | null>(null)
  const hasExercisesRef = useRef(false)
  const keepStateKeyRef = useRef<string | null>(null)
  const afterCloseRef = useRef<{ cutscene: string | null; ending: string | null }>(
    { cutscene: null, ending: null },
  )
  const [line, setLine] = useState('')
  const [speakerId, setSpeakerId] = useState<string | null>(null)
  const [quizId, setQuizId] = useState<string | null>(null)
  const [choices, setChoices] = useState<DialogueChoice[]>([])
  const [canContinue, setCanContinue] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const applyTags = useCallback((tags: string[]) => {
    const store = useGameStore.getState()
    for (const tag of tags) {
      const [name, value] = parseTag(tag)
      switch (name) {
        case 'speaker':
          setSpeakerId(value)
          break
        case 'quiz':
          setQuizId(value)
          break
        case 'give':
          store.addItem(value)
          break
        case 'take':
          store.removeItem(value)
          break
        case 'clock':
          store.setGameClock(value)
          break
        case 'flag':
          store.setFlag(value, true)
          break
        case 'cutscene':
          afterCloseRef.current.cutscene = value
          break
        case 'ending':
          afterCloseRef.current.ending = value
          break
      }
    }
  }, [])

  // Один рядок на виклик. Порожні рядки (після вибору) пропускаємо, але їхні теги обробляємо.
  const advance = useCallback(() => {
    const story = storyRef.current
    if (!story) return
    const tags: string[] = []
    let text = ''
    while (story.canContinue && !text) {
      text = (story.Continue() ?? '').trim()
      tags.push(...(story.currentTags ?? []))
    }
    applyTags(tags)
    if (text) setLine(text)
    setCanContinue(story.canContinue)
    setChoices(
      story.canContinue
        ? []
        : story.currentChoices.map((choice) => ({
            index: choice.index,
            text: choice.text,
          })),
    )
  }, [applyTags])

  useEffect(() => {
    let cancelled = false

    Promise.all([getDialogue(dialogueId), getExercises(dialogueId)])
      .then(([dialogue, exercises]) => {
        if (cancelled) return
        // Після перевірки cancelled: у StrictMode ефект запускається двічі, а подія має бути одна.
        trackLessonStarted(dialogueId)
        const content = dialogue.inkContent[lang]
        const story = new Story(JSON.stringify(content))
        const variableNames = getInkVariableNames(content)

        // keepState: продовжуємо зі збереженого стану (лічильники відвідувань), але з початку діалогу.
        const stateKey = `${dialogueId}:${lang}`
        keepStateKeyRef.current = dialogue.keepState ? stateKey : null
        const savedState = dialogue.keepState
          ? useGameStore.getState().inkStates[stateKey]
          : undefined
        if (savedState) {
          try {
            story.state.LoadJson(savedState)
            story.state.GoToStart()
          } catch {
            story.ResetState()
          }
        }

        // Фронт записує в ink поточні flags, а зміни змінних забирає назад.
        const { flags, setFlag } = useGameStore.getState()
        for (const name of variableNames) {
          if (name in flags) story.variablesState[name] = flags[name]
        }
        for (const name of variableNames) {
          story.ObserveVariable(name, (variableName, value) => {
            setFlag(variableName, value as FlagValue)
          })
        }

        storyRef.current = story
        hasExercisesRef.current = exercises !== null
        setSpeakerId(dialogue.npcId)
        setLoaded(true)
        advance()
      })
      .catch(() => {
        // Немає контенту для цього NPC — закриваємо, а не показуємо порожній оверлей.
        if (!cancelled) useGameStore.getState().setActiveDialogue(null)
      })

    return () => {
      cancelled = true
      storyRef.current?.RemoveVariableObserver()
    }
  }, [dialogueId, lang, advance])

  const handleQuizAnswer = useCallback(
    (correct: boolean, quiz: QuizConfig) => {
      const story = storyRef.current
      if (story) story.variablesState['quiz_ok'] = correct
      trackQuizAnswered(quiz.id, correct)
      if (correct) useGameStore.getState().addLearnedWord(quiz.word)
    },
    [],
  )

  const handleQuizDone = useCallback(() => {
    setQuizId(null)
    advance()
  }, [advance])

  function handleChoice(index: number) {
    const story = storyRef.current
    if (!story) return
    story.ChooseChoiceIndex(index)
    advance()
  }

  function handleFinish() {
    const store = useGameStore.getState()
    if (keepStateKeyRef.current && storyRef.current) {
      store.setInkState(keepStateKeyRef.current, storyRef.current.state.ToJson())
    }
    store.finishDialogue(dialogueId)
    // Вправа відкривається до закриття діалогу, щоб рух гравця не розблокувався між ними.
    if (hasExercisesRef.current) store.setActiveExercise(dialogueId)
    store.setActiveDialogue(null)
    const { cutscene, ending } = afterCloseRef.current
    if (cutscene) store.setPendingCutscene(cutscene)
    if (ending) store.setPendingEnding(ending)
  }

  const speakerName = cityConfig?.zones
    .flatMap((zone) => zone.npcs)
    .find((npc) => npc.id === speakerId)?.name[lang]
  const finished = loaded && !canContinue && choices.length === 0 && !quizId

  return (
    <div className="dialogue-overlay">
      {speakerName && <p className="dialogue-speaker">{speakerName}</p>}
      {line && <p>{line}</p>}

      {quizId ? (
        <QuizCard
          quizId={quizId}
          onAnswer={handleQuizAnswer}
          onDone={handleQuizDone}
        />
      ) : (
        <>
          {canContinue && (
            <button type="button" onClick={advance}>
              {t('dialogue.next')}
            </button>
          )}

          {choices.length > 0 && (
            <div className="dialogue-choices">
              {choices.map((choice) => (
                <button
                  key={choice.index}
                  type="button"
                  onClick={() => handleChoice(choice.index)}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          )}

          {finished && (
            <button type="button" onClick={handleFinish}>
              {t('world.finish')}
            </button>
          )}
        </>
      )}
    </div>
  )
}
