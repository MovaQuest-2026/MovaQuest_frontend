// TODO: замінити на реальний виклик FSRS API (/words/next-review)
export async function getNextReviewWords(
  learnedWords: string[],
): Promise<string[]> {
  return learnedWords.filter((_, index) => index % 2 === 0)
}
