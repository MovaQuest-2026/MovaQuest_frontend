import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Story } from 'inkjs'
import { getDialogue } from '../api/getDialogue'
import { trackLessonStarted } from '../api/analytics'
import { useGameStore } from '../store/useGameStore'

interface DialogueChoice {
  index: number
  text: string
}

export function DialogueOverlay() {
  const { t } = useTranslation()
  const activeDialogue = useGameStore((state) => state.activeDialogue)
  const setActiveDialogue = useGameStore((state) => state.setActiveDialogue)
  const setActiveExercise = useGameStore((state) => state.setActiveExercise)
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const lang = nativeLanguage ?? 'en'

  const storyRef = useRef<Story | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [choices, setChoices] = useState<DialogueChoice[]>([])
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!activeDialogue) {
      storyRef.current = null
      setLines([])
      setChoices([])
      setFinished(false)
      return
    }

    let cancelled = false

    trackLessonStarted(activeDialogue)

    getDialogue(activeDialogue)
      .then((dialogue) => {
        if (cancelled) return
        const story = new Story(JSON.stringify(dialogue.inkContent[lang]))
        storyRef.current = story
        advance(story)
      })
      .catch(() => {
        // No dialogue content for this NPC yet — close instead of showing a stuck empty overlay.
        if (cancelled) return
        setActiveDialogue(null)
      })

    return () => {
      cancelled = true
    }
  }, [activeDialogue, lang])

  function advance(story: Story) {
    const nextLines: string[] = []
    while (story.canContinue) {
      nextLines.push((story.Continue() ?? '').trim())
    }
    setLines(nextLines)
    setChoices(
      story.currentChoices.map((choice) => ({
        index: choice.index,
        text: choice.text,
      })),
    )
    setFinished(!story.canContinue && story.currentChoices.length === 0)
  }

  function handleChoice(index: number) {
    const story = storyRef.current
    if (!story) return
    story.ChooseChoiceIndex(index)
    advance(story)
  }

  function handleFinish() {
    setActiveExercise(activeDialogue)
    setActiveDialogue(null)
  }

  if (!activeDialogue) return null

  return (
    <div className="dialogue-overlay">
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}

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
    </div>
  )
}
