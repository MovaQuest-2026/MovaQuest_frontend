// Хелпер для тестів: проганяє скомпільований ink-діалог так, як DialogueOverlay.
import { Story } from 'inkjs'
import type { QuestFlags } from './questEngine'

export interface DialogueRun {
  flags: QuestFlags
  lines: string[]
  tags: string[]
}

/**
 * Проганяє ink-діалог так, як DialogueOverlay: flags записуються в змінні перед стартом,
 * на quiz: ставиться quiz_ok, вибори — за індексом або за частиною тексту.
 */
export function runDialogue(
  dialogue: { inkContent: { uk: object } },
  flags: QuestFlags,
  {
    choices = [],
    quizOk = true,
    savedState,
  }: { choices?: (number | string)[]; quizOk?: boolean; savedState?: string } = {},
): DialogueRun & { state: string } {
  const story = new Story(JSON.stringify(dialogue.inkContent.uk))
  if (savedState) {
    story.state.LoadJson(savedState)
    story.state.GoToStart()
  }
  const result: DialogueRun = { flags: { ...flags }, lines: [], tags: [] }
  for (const [name, value] of Object.entries(flags)) {
    if (story.variablesState.GetVariableWithName(name) !== null) {
      story.variablesState[name] = value
    }
  }
  story.variablesState.ObserveVariableChange((name: string) => {
    result.flags[name] = story.variablesState[name] as QuestFlags[string]
  })

  const pending = [...choices]
  for (let guard = 0; guard < 100; guard++) {
    if (story.canContinue) {
      const line = (story.Continue() ?? '').trim()
      if (line) result.lines.push(line)
      const tags = story.currentTags ?? []
      result.tags.push(...tags)
      for (const tag of tags) {
        if (tag.startsWith('flag:')) result.flags[tag.slice(5)] = true
        if (tag.startsWith('quiz:')) story.variablesState.quiz_ok = quizOk
      }
      continue
    }
    if (story.currentChoices.length === 0) break
    const next = pending.shift() ?? 0
    const index =
      typeof next === 'number'
        ? next
        : story.currentChoices.findIndex((choice) => choice.text.includes(next))
    if (index < 0) throw new Error(`Немає вибору "${next}"`)
    story.ChooseChoiceIndex(index)
  }
  return { ...result, state: story.state.ToJson() }
}

