/** Обліковий запис після входу. Сесію (поточний запис) тримає useUserStore. */
export interface Account {
  id: string
  email: string
  name: string
  /** Як користувач увійшов. Старі записи без поля — password. */
  provider?: 'password' | 'google'
}
