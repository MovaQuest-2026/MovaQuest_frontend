import { useEffect } from 'react'
import {
  clearActiveLesson,
  importProgress,
  markWordsLearned,
  saveActiveLesson,
  saveLessonResult,
} from '../../api/progress'
import { mergeProgress, type Progress } from '../../types/progress'
import { useUserStore } from '../../store/useUserStore'

/** Слова надсилаємо пачкою. */
const WORDS_DELAY_MS = 1_000
/** Знімок уроку змінюється десятки разів за урок: на сервер іде останній за ~2 с. */
const ACTIVE_DELAY_MS = 2_000

const later = (a: string, b: string) => Date.parse(a) > Date.parse(b)

const localProgress = (): Progress => {
  const { completedLessons, learnedWords, activeLessons } = useUserStore.getState()
  return { completedLessons, learnedWords, activeLessons }
}

/**
 * Синхронізація прогресу акаунта з бекендом (docs/backend-requirements.md §6.4).
 * Дії сховища лишаються синхронними, мережа йде фоном:
 * - вхід, запуск із сесією, подія `online`: import усього локального, у сховище — злиття відповіді з тим,
 *   що встигло змінитися локально, поки йшов запит;
 * - зміни в сховищі: результат уроку одразу, нові слова пачкою, знімок уроку з затримкою на кожен урок,
 *   а коли вкладку ховають — негайно з `keepalive`.
 * Мережеві збої ігноруються: локальний стан лишається, наступний import його дошле.
 * Повертає функцію зупинки.
 */
export function startProgressSync(): () => void {
  // Поки true, зміни сховища прийшли з сервера: назад їх не надсилаємо.
  let applying = false
  const apply = (fn: () => void) => {
    applying = true
    try {
      fn()
    } finally {
      applying = false
    }
  }
  const sameAccount = (accountId: string) => useUserStore.getState().account?.id === accountId

  let importedFor: string | null = null
  const importAll = async (accountId: string) => {
    let remote: Progress
    try {
      remote = await importProgress(accountId, localProgress())
    } catch {
      return
    }
    if (!sameAccount(accountId)) return
    apply(() => useUserStore.getState().setProgress(mergeProgress(remote, localProgress())))
  }
  const checkAccount = (accountId: string | null) => {
    if (accountId === importedFor) return
    importedFor = accountId
    if (accountId) void importAll(accountId)
  }

  // --- Слова ---
  let wordsTimer: ReturnType<typeof setTimeout> | undefined
  let wordsQueue: { accountId: string; lessonId: string; gapId: string }[] = []
  const flushWords = (keepalive = false) => {
    clearTimeout(wordsTimer)
    wordsTimer = undefined
    const { account, learnedWords } = useUserStore.getState()
    // Після «Скинути прогрес» чи зміни акаунта чергу відкидаємо.
    const items = wordsQueue
      .filter((w) => w.accountId === account?.id && learnedWords[w.lessonId]?.includes(w.gapId))
      .map(({ lessonId, gapId }) => ({ lessonId, gapId }))
    wordsQueue = []
    if (account && items.length > 0) markWordsLearned(account.id, items, keepalive).catch(() => {})
  }

  // --- Незавершені уроки ---
  const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const cancelActive = (lessonId: string) => {
    clearTimeout(activeTimers.get(lessonId))
    activeTimers.delete(lessonId)
  }
  const sendActive = (accountId: string, lessonId: string, keepalive = false) => {
    cancelActive(lessonId)
    const local = useUserStore.getState().activeLessons[lessonId]
    if (!local || !sameAccount(accountId)) return
    saveActiveLesson(accountId, lessonId, local, keepalive)
      .then((remote) => {
        if (!sameAccount(accountId)) return
        const current = useUserStore.getState().activeLessons[lessonId]
        // З іншого пристрою прийшов новіший знімок: беремо його.
        if (current && later(remote.updatedAt, current.updatedAt)) {
          apply(() =>
            useUserStore.setState((s) => ({ activeLessons: { ...s.activeLessons, [lessonId]: remote } })),
          )
        }
      })
      .catch(() => {})
  }
  // Уроки, щойно завершені на цьому пристрої: PUT /lessons сам прибирає знімок на сервері.
  const justCompleted = new Set<string>()

  const unsubscribe = useUserStore.subscribe((s, prev) => {
    const accountId = s.account?.id ?? null
    if (accountId !== (prev.account?.id ?? null)) {
      // Зміна акаунта: прогрес щойно відновлено з кешу, не з дій користувача.
      for (const id of [...activeTimers.keys()]) cancelActive(id)
      justCompleted.clear()
      checkAccount(accountId)
      return
    }
    if (!accountId || applying) return

    for (const [lessonId, result] of Object.entries(s.completedLessons)) {
      if (result === prev.completedLessons[lessonId]) continue
      cancelActive(lessonId)
      justCompleted.add(lessonId)
      saveLessonResult(accountId, lessonId, result)
        .then((saved) => {
          if (!sameAccount(accountId)) return
          const current = useUserStore.getState().completedLessons[lessonId]
          if (current && saved.correct > current.correct) {
            apply(() =>
              useUserStore.setState((st) => ({ completedLessons: { ...st.completedLessons, [lessonId]: saved } })),
            )
          }
        })
        .catch(() => {})
    }

    if (s.learnedWords !== prev.learnedWords) {
      for (const [lessonId, gaps] of Object.entries(s.learnedWords)) {
        const old = prev.learnedWords[lessonId] ?? []
        for (const gapId of gaps) if (!old.includes(gapId)) wordsQueue.push({ accountId, lessonId, gapId })
      }
      if (wordsQueue.length > 0 && wordsTimer === undefined) wordsTimer = setTimeout(() => flushWords(), WORDS_DELAY_MS)
    }

    if (s.activeLessons !== prev.activeLessons) {
      for (const [lessonId, active] of Object.entries(s.activeLessons)) {
        if (active === prev.activeLessons[lessonId]) continue
        justCompleted.delete(lessonId)
        cancelActive(lessonId)
        activeTimers.set(
          lessonId,
          setTimeout(() => sendActive(accountId, lessonId), ACTIVE_DELAY_MS),
        )
      }
      for (const lessonId of Object.keys(prev.activeLessons)) {
        if (lessonId in s.activeLessons) continue
        cancelActive(lessonId)
        if (justCompleted.delete(lessonId)) continue
        clearActiveLesson(accountId, lessonId).catch(() => {})
      }
    }
  })

  const onHidden = () => {
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return
    const accountId = useUserStore.getState().account?.id
    if (!accountId) return
    for (const lessonId of [...activeTimers.keys()]) sendActive(accountId, lessonId, true)
    if (wordsTimer !== undefined) flushWords(true)
  }
  const onOnline = () => {
    const accountId = useUserStore.getState().account?.id
    if (accountId) void importAll(accountId)
  }
  const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined'
  if (hasDom) {
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('online', onOnline)
  }

  checkAccount(useUserStore.getState().account?.id ?? null)

  return () => {
    unsubscribe()
    clearTimeout(wordsTimer)
    for (const id of [...activeTimers.keys()]) cancelActive(id)
    if (hasDom) {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('online', onOnline)
    }
  }
}

export function useProgressSync() {
  useEffect(() => startProgressSync(), [])
}
