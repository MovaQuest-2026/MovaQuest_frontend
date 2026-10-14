// Колір і прозорість оверлею часу доби (blend MULTIPLY) залежно від gameClock.

export interface DaylightTint {
  color: number
  alpha: number
}

interface DaylightKeyframe extends DaylightTint {
  minutes: number
}

const KEYFRAMES: DaylightKeyframe[] = [
  { minutes: 9 * 60, color: 0xffc58a, alpha: 0.32 }, // ранок, ледь теплий
  { minutes: 13 * 60, color: 0xffffff, alpha: 0 }, // день, нейтральний
  { minutes: 18 * 60 + 30, color: 0xffb04a, alpha: 0.35 }, // золота година
  { minutes: 20 * 60, color: 0x5b4fc4, alpha: 0.5 }, // вечір, синьо-фіолетовий
]

export function clockToMinutes(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return KEYFRAMES[0].minutes
  return hours * 60 + minutes
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

export function mixTint(from: DaylightTint, to: DaylightTint, t: number): DaylightTint {
  const channel = (color: number, shift: number) => (color >> shift) & 0xff
  const mixChannel = (shift: number) =>
    Math.round(lerp(channel(from.color, shift), channel(to.color, shift), t))
  return {
    color: (mixChannel(16) << 16) | (mixChannel(8) << 8) | mixChannel(0),
    alpha: lerp(from.alpha, to.alpha, t),
  }
}

export function daylightForClock(clock: string): DaylightTint {
  const minutes = clockToMinutes(clock)
  const first = KEYFRAMES[0]
  const last = KEYFRAMES[KEYFRAMES.length - 1]
  if (minutes <= first.minutes) return { color: first.color, alpha: first.alpha }
  if (minutes >= last.minutes) return { color: last.color, alpha: last.alpha }

  const nextIndex = KEYFRAMES.findIndex((frame) => frame.minutes > minutes)
  const from = KEYFRAMES[nextIndex - 1]
  const to = KEYFRAMES[nextIndex]
  return mixTint(from, to, (minutes - from.minutes) / (to.minutes - from.minutes))
}
