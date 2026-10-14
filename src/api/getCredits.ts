// Титри лежать у public/CREDITS.md, щоб їх можна було редагувати без збірки.
export async function getCredits(): Promise<string> {
  const response = await fetch('/CREDITS.md')
  if (!response.ok) {
    throw new Error(`Failed to load credits: ${response.status}`)
  }
  return response.text()
}
