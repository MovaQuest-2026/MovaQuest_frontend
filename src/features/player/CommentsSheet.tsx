import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trackCommentPosted, trackCommentsOpened } from '../../api/analytics'
import { ApiError } from '../../api/http'
import { COMMENT_MAX_LENGTH, deleteComment, getComments, postComment } from '../../api/social'
import { useUserStore } from '../../store/useUserStore'
import type { LessonComment } from '../../types/social'
import { formatAgo, formatCount } from './socialFormat'

interface CommentsSheetProps {
  lessonId: string
  onClose: () => void
  /** Після нового коментаря: оновити лічильник у колонці дій. */
  onPosted: () => void
}

/** Нижня шторка з коментарями. Відео під нею стоїть на паузі. */
export function CommentsSheet({ lessonId, onClose, onPosted }: CommentsSheetProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const signedIn = useUserStore((s) => s.account !== null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [comments, setComments] = useState<LessonComment[] | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  // Бекенд пускає коментувати лише з акаунта (401 без сесії).
  const [sendError, setSendError] = useState<'signIn' | 'failed' | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    trackCommentsOpened(lessonId)
    getComments(lessonId)
      .then((page) => {
        if (cancelled) return
        setComments(page.items)
        setNextCursor(page.nextCursor)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [lessonId])

  // Фокус на «Закрити» лише при відкритті, щоб не забирати його з поля вводу при перерендерах.
  useEffect(() => closeRef.current?.focus(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      const comment = await postComment(lessonId, draft)
      setComments((c) => [comment, ...(c ?? [])])
      setDraft('')
      setSendError(null)
      trackCommentPosted(lessonId)
      onPosted()
    } catch (err) {
      setSendError(err instanceof ApiError && err.status === 401 ? 'signIn' : 'failed')
    } finally {
      setSending(false)
    }
  }

  const loadMore = () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    getComments(lessonId, nextCursor)
      .then((page) => {
        setComments((c) => [...(c ?? []), ...page.items])
        setNextCursor(page.nextCursor)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoadingMore(false))
  }

  const remove = (commentId: string) => {
    deleteComment(lessonId, commentId)
      .then(() => {
        setComments((c) => (c ?? []).filter((x) => x.id !== commentId))
        onPosted()
      })
      .catch(() => setSendError('failed'))
  }

  return (
    <>
      <button type="button" className="comments-backdrop" aria-label={t('app.close')} tabIndex={-1} onClick={onClose} />
      <section className="comments-sheet" role="dialog" aria-modal="true" aria-labelledby="comments-title">
        <header className="comments-sheet__header">
          <h2 id="comments-title" className="comments-sheet__title">
            {comments && !nextCursor ? t('social.commentsCount', { count: comments.length }) : t('social.comments')}
          </h2>
          <button ref={closeRef} type="button" className="comments-sheet__close" aria-label={t('app.close')} onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="comments-sheet__list">
          {failed && <p className="notice notice--error">{t('social.commentsError')}</p>}
          {!comments && !failed && <p className="comments-sheet__empty">{t('app.loading')}</p>}
          {comments?.length === 0 && <p className="comments-sheet__empty">{t('social.noComments')}</p>}
          {comments && comments.length > 0 && (
            <ul>
              {comments.map((c) => (
                <li key={c.id} className="comment">
                  <span className="comment__avatar" aria-hidden="true">
                    {c.author.charAt(0).toUpperCase()}
                  </span>
                  <div className="comment__body">
                    <p className="comment__author">{c.author}</p>
                    <p className="comment__text">{c.text}</p>
                    <p className="comment__meta">
                      {formatAgo(c.createdAt, lang)}
                      {c.likes > 0 && <> · ♥ {formatCount(c.likes, lang)}</>}
                      {c.own && (
                        <>
                          {' · '}
                          <button type="button" className="comment__delete" onClick={() => remove(c.id)}>
                            {t('social.deleteComment')}
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {nextCursor && (
            <button type="button" className="btn btn--ghost btn--block" disabled={loadingMore} onClick={loadMore}>
              {t('social.loadMore')}
            </button>
          )}
        </div>
        {sendError && (
          <p className="notice notice--error" role="alert">
            {t(sendError === 'signIn' ? 'social.commentSignIn' : 'social.commentSendError')}
          </p>
        )}

        {signedIn ? (
          <form className="comments-sheet__form" onSubmit={(e) => void submit(e)}>
            <input
              className="comments-sheet__input"
              value={draft}
              maxLength={COMMENT_MAX_LENGTH}
              placeholder={t('social.addComment')}
              aria-label={t('social.addComment')}
              enterKeyHint="send"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="comments-sheet__send" disabled={!draft.trim() || sending}>
              {t('social.send')}
            </button>
          </form>
        ) : (
          <div className="comments-sheet__signin">
            <p className="comments-sheet__signin-text">{t('social.commentSignIn')}</p>
            <button
              type="button"
              className="comments-sheet__send comments-sheet__send--wide"
              onClick={() => navigate('/auth', { state: { from: pathname } })}
            >
              {t('auth.signInCta')}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
