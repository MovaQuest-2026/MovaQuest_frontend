// Мок бази даних для src/api/*: «таблиці» в localStorage цього браузера.
// Коли з'явиться бекенд, функції в src/api перестануть ним користуватися, а файл можна буде видалити.
// localStorage є не завжди (тести в Node, приватний режим): тоді пам'ять процесу.

const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string) {
  memory.set(key, value)
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // Сховище недоступне: лишається копія в пам'яті.
  }
}

export function readTable<T>(table: string): T[] {
  try {
    return JSON.parse(read(`movaquest-mock-${table}`) ?? '[]') as T[]
  } catch {
    return []
  }
}

export function writeTable<T>(table: string, rows: T[]) {
  write(`movaquest-mock-${table}`, JSON.stringify(rows))
}
