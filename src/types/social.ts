/** Лічильники під відео, як у стрічці коротких відео. Без урахування дій поточного користувача. */
export interface LessonStats {
  likes: number
  comments: number
  saves: number
  shares: number
}

export interface LessonComment {
  id: string
  author: string
  text: string
  createdAt: string // ISO
  likes: number
  /** Коментар поточного користувача. */
  own?: boolean
}
