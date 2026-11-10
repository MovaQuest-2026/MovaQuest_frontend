export type Lang = 'en' | 'uk'
export type Localized = Record<Lang, string>
export type BranchKind = 'correct' | 'wrong' | 'unclear'
export interface ChoicePhrase { branch: BranchKind; es: string; translation: Localized; accept?: string[] }
export interface Choice { task: Localized; phrases: ChoicePhrase[]; maxRetries: number; next: Record<BranchKind, string> }
export interface Scene { id: string; kind: 'prompt' | 'reaction' | 'end'; clip: string; subtitles: { es: string } & Localized; choice?: Choice; next?: string; outcome?: 'perfect' | 'partial' | 'missed' }
export interface Lesson { id: string; title: Localized; description: Localized; targetLanguage: 'es'; level: 'A1'|'A2'|'B1'|'B2'; durationSec: number; cover: string; startSceneId: string; scenes: Scene[] }
