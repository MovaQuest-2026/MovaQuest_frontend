import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { trackLessonLiked, trackLessonSaved, trackLessonShared } from '../../api/analytics'
import { getLessonStats, recordShare, setLessonLiked, setLessonSaved } from '../../api/social'
import { localize } from '../../i18n/localize'
import { useUserStore } from '../../store/useUserStore'
import type { Lesson } from '../../types/lesson'
import type { LessonStats } from '../../types/social'
import { formatCount } from './socialFormat'

const icons = {
  like: <path d="M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.2Z" />,
  comment: (
    <path d="M12 3C6.5 3 2 6.9 2 11.6c0 2.6 1.4 5 3.6 6.5L5 21.5l4-2.1c1 .3 2 .4 3 .4 5.5 0 10-3.9 10-8.6S17.5 3 12 3Zm-4.5 10a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4.5 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4.5 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" fillRule="evenodd" />
  ),
  save: <path d="M6 2.5h12a1.5 1.5 0 0 1 1.5 1.5v18l-7.5-5-7.5 5V4A1.5 1.5 0 0 1 6 2.5Z" />,
  share: <path d="M13.5 3.5 22 11.2l-8.5 7.8v-4.4c-5.3 0-8.9 1.6-11.5 5.4 1-5.4 4-10.6 11.5-11.7V3.5Z" />,
}

interface RailButtonProps {
  icon: keyof typeof icons
  label: string
  count: string
  active?: boolean
  pressed?: boolean
  onClick: () => void
}

function RailButton({ icon, label, count, active, pressed, onClick }: RailButtonProps): ReactNode {
  return (
    <button
      type="button"
      className={`action-rail__btn action-rail__btn--${icon}${active ? ' is-active' : ''}`}
      aria-label={`${label}: ${count}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <svg className="action-rail__icon" viewBox="0 0 24 24" aria-hidden="true">
        {icons[icon]}
      </svg>
      <span className="action-rail__count" aria-hidden="true">
        {count}
      </span>
    </button>
  )
}

interface ActionRailProps {
  lesson: Lesson
  /** Змінюється, коли треба перечитати лічильники (наприклад, після нового коментаря). */
  statsRevision: number
  onOpenComments: () => void
}

/** Права колонка дій, як у стрічці коротких відео: лайк, коментарі, збереження, поширення. */
export function ActionRail({ lesson, statsRevision, onOpenComments }: ActionRailProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const liked = useUserStore((s) => s.likedLessons.includes(lesson.id))
  const saved = useUserStore((s) => s.savedLessons.includes(lesson.id))
  const [stats, setStats] = useState<LessonStats | null>(null)
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const toastTimer = useRef(0)

  const refreshStats = useCallback(() => {
    getLessonStats(lesson.id)
      .then(setStats)
      .catch(() => setStats(null))
  }, [lesson.id])
  useEffect(refreshStats, [refreshStats, statsRevision])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = (text: string) => {
    window.clearTimeout(toastTimer.current)
    setToast({ text, id: Date.now() })
    toastTimer.current = window.setTimeout(() => setToast(null), 2000)
  }

  // Базові лічильники приходять без дій поточного користувача: свої додаємо тут.
  const base = stats ?? { likes: 0, comments: 0, saves: 0, shares: 0 }
  const count = (n: number) => formatCount(n, lang)

  const toggleLike = () => {
    useUserStore.getState().toggleLiked(lesson.id)
    void setLessonLiked(lesson.id, !liked)
    trackLessonLiked(lesson.id, !liked)
  }

  const toggleSave = () => {
    useUserStore.getState().toggleSaved(lesson.id)
    void setLessonSaved(lesson.id, !saved)
    trackLessonSaved(lesson.id, !saved)
    showToast(t(saved ? 'social.unsaved' : 'social.saved'))
  }

  // Системне меню «Поділитися», якщо є; інакше копіюємо посилання.
  const share = async () => {
    const url = `${window.location.origin}/lesson/${lesson.id}`
    const title = localize(lesson.title, lang)
    let method: 'native' | 'copy'
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text: t('social.shareText', { title }), url })
        method = 'native'
      } else {
        await navigator.clipboard.writeText(url)
        method = 'copy'
        showToast(t('social.linkCopied'))
      }
    } catch (e) {
      // Користувач закрив системне меню: це не помилка.
      if ((e as Error)?.name !== 'AbortError') showToast(t('social.shareFailed'))
      return
    }
    trackLessonShared(lesson.id, method)
    await recordShare(lesson.id)
    refreshStats()
  }

  return (
    <>
      <div className="action-rail" aria-label={t('social.actions')} role="group">
        <RailButton
          icon="like"
          label={t('social.like')}
          count={count(base.likes + (liked ? 1 : 0))}
          active={liked}
          pressed={liked}
          onClick={toggleLike}
        />
        <RailButton
          icon="comment"
          label={t('social.comments')}
          count={count(base.comments)}
          onClick={onOpenComments}
        />
        <RailButton
          icon="save"
          label={t('social.save')}
          count={count(base.saves + (saved ? 1 : 0))}
          active={saved}
          pressed={saved}
          onClick={toggleSave}
        />
        <RailButton icon="share" label={t('social.share')} count={count(base.shares)} onClick={() => void share()} />
      </div>

      {toast && (
        <p key={toast.id} className="action-toast" role="status">
          {toast.text}
        </p>
      )}
    </>
  )
}
