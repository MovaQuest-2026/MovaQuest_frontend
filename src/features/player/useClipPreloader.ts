import { useEffect, useRef } from 'react'

const MAX_CACHED = 6

// Поки грає поточний кліп, підвантажує кліпи можливих наступних сцен
// у приховані <video preload="auto">, щоб браузер прогрів кеш.
export function useClipPreloader(urls: string[]) {
  const cache = useRef(new Map<string, HTMLVideoElement>())
  const key = urls.join('|')

  useEffect(() => {
    const map = cache.current
    for (const url of key ? key.split('|') : []) {
      if (map.has(url)) continue
      const v = document.createElement('video')
      v.preload = 'auto'
      v.muted = true
      v.playsInline = true
      v.src = url
      v.load()
      map.set(url, v)
    }
    while (map.size > MAX_CACHED) {
      const [oldest, v] = map.entries().next().value!
      v.removeAttribute('src')
      v.load()
      map.delete(oldest)
    }
  }, [key])

  useEffect(() => {
    const map = cache.current
    return () => {
      for (const v of map.values()) {
        v.removeAttribute('src')
        v.load()
      }
      map.clear()
    }
  }, [])
}
