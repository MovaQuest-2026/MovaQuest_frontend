import { useUserStore } from '../store/useUserStore'

export interface AnonymousUser {
  userId: string
  isAnonymous: true
}

// Зараз мок: локальний id з useUserStore. Пізніше тут буде anonymous sign-in
// у Firebase або Supabase, а id прийде від провайдера.
export async function getAnonymousUser(): Promise<AnonymousUser> {
  return { userId: useUserStore.getState().userId, isAnonymous: true }
}
