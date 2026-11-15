// Протокол вбудованого плеєра TikTok (Embed Player v1).
// Документація: https://developers.tiktok.com/doc/embed-player
// Команди й події ходять через window.postMessage з прапорцем 'x-tiktok-player'.

export const TIKTOK_ORIGIN = 'https://www.tiktok.com'

export function tiktokPlayerUrl(videoId: string): string {
  const params = new URLSearchParams({
    // Власні контроли TikTok ховаємо: паузою й перемоткою керує застосунок.
    controls: '0',
    progress_bar: '0',
    play_button: '0',
    volume_control: '0',
    fullscreen_button: '0',
    timestamp: '0',
    loop: '0',
    autoplay: '0',
    music_info: '0',
    description: '0',
    rel: '0',
    native_context_menu: '0',
    closed_caption: '0',
  })
  return `${TIKTOK_ORIGIN}/player/v1/${encodeURIComponent(videoId)}?${params}`
}

export type TikTokCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seekTo'; value: number }
  | { type: 'mute' }
  | { type: 'unMute' }

export function commandMessage(command: TikTokCommand): Record<string, unknown> {
  return { 'x-tiktok-player': true, ...command }
}

/** Стани з події onStateChange. */
export const TikTokState = { init: -1, ended: 0, playing: 1, paused: 2, buffering: 3 } as const

export type TikTokEvent =
  | { type: 'ready' }
  | { type: 'state'; state: number }
  | { type: 'time'; currentTime: number; duration: number }
  | { type: 'error'; detail: unknown }

/** Розбирає повідомлення від iframe. Невідомі й чужі повідомлення дають null. */
export function parseTikTokMessage(data: unknown): TikTokEvent | null {
  let msg = data
  if (typeof msg === 'string') {
    try {
      msg = JSON.parse(msg)
    } catch {
      return null
    }
  }
  if (!msg || typeof msg !== 'object') return null
  const m = msg as Record<string, unknown>
  if (m['x-tiktok-player'] !== true) return null
  switch (m.type) {
    case 'onPlayerReady':
      return { type: 'ready' }
    case 'onStateChange':
      return typeof m.value === 'number' ? { type: 'state', state: m.value } : null
    case 'onCurrentTime': {
      const v = m.value as { currentTime?: unknown; duration?: unknown } | undefined
      if (typeof v?.currentTime !== 'number') return null
      return { type: 'time', currentTime: v.currentTime, duration: typeof v.duration === 'number' ? v.duration : NaN }
    }
    case 'onError':
      return { type: 'error', detail: m.value }
    default:
      return null
  }
}

/**
 * Плеєр TikTok шле час нечасто (приблизно раз на 250–500 мс). Щоб пауза влучала
 * точніше, між подіями час екстраполюємо за годинником.
 */
export function extrapolateTime(lastTime: number, lastAt: number, now: number, playing: boolean): number {
  return playing ? lastTime + Math.max(0, now - lastAt) / 1000 : lastTime
}
