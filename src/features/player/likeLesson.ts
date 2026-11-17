import { setLessonLiked } from '../../api/social'
import { useUserStore } from '../../store/useUserStore'

/**
 * Ставить лайк (подвійний дотик по відео; знімати лайк так не можна, як у стрічках коротких відео).
 * Лише для акаунта. Оптимістично, при помилці відкочує й кидає помилку.
 * Повертає true, якщо лайк щойно поставлено, і false, якщо він уже був.
 */
export async function likeLesson(lessonId: string): Promise<boolean> {
  const user = useUserStore.getState()
  if (user.likedLessons.includes(lessonId)) return false
  user.toggleLiked(lessonId)
  try {
    await setLessonLiked(lessonId, true)
    return true
  } catch (err) {
    useUserStore.getState().toggleLiked(lessonId)
    throw err
  }
}
