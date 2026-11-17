import type { Lang } from './lesson'

export type Level = 'A1' | 'A2' | 'B1' | 'B2'

/**
 * Профіль користувача з онбордингу. Майбутня таблиця `profiles` (один рядок на акаунт):
 *   account_id     text primary key references accounts(id)
 *   interface_lang text  ('en' | 'uk' | 'es')
 *   level          text  ('A1' | 'A2' | 'B1' | 'B2')
 *   goal           text  (може бути порожнім)
 *   onboarded_at   timestamptz
 *   updated_at     timestamptz
 * Дозвіл на мікрофон сюди не входить: він свій на кожному пристрої.
 */
export interface UserProfile {
  accountId: string
  interfaceLanguage: Lang
  level: Level
  goal: string
  onboardedAt: string // ISO
  updatedAt: string // ISO
}

/** Те, що користувач заповнює в онбордингу й може змінити в профілі. */
export type ProfileFields = Pick<UserProfile, 'interfaceLanguage' | 'level' | 'goal'>
