export type MicAccessResult = 'granted' | 'denied' | 'unsupported' | 'error'

// Мікрофон доступний тільки в secure context (https або localhost).
export function isMicSupported(): boolean {
  return window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/**
 * Чи можна відкрити мікрофон без діалогу браузера: дозвіл уже дано (Permissions API у Chrome)
 * або ми самі отримали його раніше. Якщо браузер ще спитає, повертає false: дозвіл просимо лише після пояснення.
 */
export async function isMicAlreadyAllowed(knownGranted: boolean): Promise<boolean> {
  if (!isMicSupported()) return false
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName })
    if (status) return status.state === 'granted'
  } catch {
    // Firefox і старі браузери не знають 'microphone': покладаємося на збережений стан.
  }
  return knownGranted
}

export function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop()
}

export async function openMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true })
}

export function classifyMicError(err: unknown): MicAccessResult {
  if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
    return 'denied'
  }
  if (err instanceof DOMException && err.name === 'NotFoundError') return 'unsupported'
  return 'error'
}

// Запитує дозвіл і одразу відпускає мікрофон.
export async function requestMicAccess(): Promise<MicAccessResult> {
  if (!isMicSupported()) return 'unsupported'
  try {
    stopStream(await openMicStream())
    return 'granted'
  } catch (err) {
    return classifyMicError(err)
  }
}

export function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const type of ['audio/webm;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return undefined
}
