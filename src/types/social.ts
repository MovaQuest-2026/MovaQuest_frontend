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

/** Сторінка коментарів: нові першими, `nextCursor` для наступної сторінки (null: це кінець). */
export interface CommentsPage {
  items: LessonComment[]
  nextCursor: string | null
}

/** Лайки й збереження поточного користувача (`lessonId` уроків). */
export interface MyReactions {
  liked: string[]
  saved: string[]
}
