export interface DialogueVocabularyEntry {
  word: string
  translation: string
  example: string
}

export interface DialogueConfig {
  id: string
  cityId: string
  npcId: string
  inkContent: { en: object; uk: object }
  vocabulary: DialogueVocabularyEntry[]
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
