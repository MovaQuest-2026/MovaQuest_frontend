export interface VideoHandle {
  seek: (time: number) => void
}

export interface VideoSurfaceProps {
  /** Секунда, з якої почати (відновлення уроку). */
  startAt: number
  shouldPlay: boolean
  /** Без звуку: браузер не дає автозапуск зі звуком до першого жесту користувача. */
  muted: boolean
  playbackRate: number
  /** Перший кадр на startAt готовий. */
  onReady: () => void
  /** Поточний час: щокадру під час відтворення і після перемотки. */
  onTime: (currentTime: number, duration: number) => void
  onEnded: () => void
  onError: () => void
  /** Браузер не дав грати зі звуком, відео запущене без звуку. */
  onAutoplayMuted: () => void
}
