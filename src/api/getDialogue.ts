export interface DialogueVocabularyEntry {
  word: string
  translation: string
  example: string
}

export interface DialogueConfig {
  id: string
  cityId: string
  npcId: string
  zone: string
  inkContent: { en: object; uk: object }
  vocabulary: DialogueVocabularyEntry[]
  keepState?: boolean
}

const dialogueModules = import.meta.glob<{ default: DialogueConfig }>(
  '../mocks/dialogues/*.ink.json',
)

export async function getDialogue(dialogueId: string): Promise<DialogueConfig> {
  const loadDialogue =
    dialogueModules[`../mocks/dialogues/${dialogueId}.ink.json`]
  if (!loadDialogue) {
    throw new Error(`Unknown dialogue: ${dialogueId}`)
  }
  const module = await loadDialogue()
  return module.default
}

// Імена глобальних змінних (VAR з _variables.ink) зі скомпільованого ink JSON:
// останній елемент root містить блок "global decl" з записами { "VAR=": name }.
export function getInkVariableNames(inkContent: object): string[] {
  const root = (inkContent as { root?: unknown[] }).root ?? []
  const last = root[root.length - 1] as { 'global decl'?: unknown[] } | null
  const declarations = last?.['global decl'] ?? []
  return declarations.flatMap((entry) =>
    entry && typeof entry === 'object' && 'VAR=' in entry
      ? [String((entry as { 'VAR=': string })['VAR='])]
      : [],
  )
}

// Словник усіх діалогів: слово → переклад (для щоденника дня).
export async function getAllVocabulary(): Promise<Record<string, string>> {
  const dialogues = await Promise.all(
    Object.values(dialogueModules).map((load) => load()),
  )
  const vocabulary: Record<string, string> = {}
  for (const { default: dialogue } of dialogues) {
    for (const entry of dialogue.vocabulary) {
      vocabulary[entry.word] ??= entry.translation
    }
  }
  return vocabulary
}
