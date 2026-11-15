export interface VideoHandle {
  seek: (time: number) => void
  /** Викликати з обробника дотику: «благословляє» відтворення зі звуком. */
  unlock: () => void
}

export interface VideoSurfaceProps {
  /** Секунда, з якої почати (відновлення уроку). */
  startAt: number
  shouldPlay: boolean
  playbackRate: number
  /** Перший кадр на startAt готовий. */
  onReady: () => void
  /** Поточний час: щокадру під час відтворення і після перемотки. */
  onTime: (currentTime: number, duration: number) => void
  onEnded: () => void
  onError: () => void
  /** Браузер заблокував відтворення зі звуком (не було жесту користувача). */
  onPlayBlocked: () => void
}
