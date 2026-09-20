import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Story } from 'inkjs'
import { getDialogue } from '../api/getDialogue'
import { useGameStore } from '../store/useGameStore'

interface DialogueChoice {
  index: number
  text: string
}

export function DialogueOverlay() {
  const { t } = useTranslation()
  const activeDialogue = useGameStore((state) => state.activeDialogue)
  const setActiveDialogue = useGameStore((state) => state.setActiveDialogue)

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

    getDialogue(activeDialogue).then((dialogue) => {
      if (cancelled) return
      const story = new Story(JSON.stringify(dialogue.inkContent))
      storyRef.current = story
      advance(story)
    })

    return () => {
      cancelled = true
    }
  }, [activeDialogue])

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
    setActiveDialogue(null)
    console.log('go to exercise')
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
