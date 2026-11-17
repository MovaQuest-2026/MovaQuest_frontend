import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Медіа уроків лежать у public/ і копіюються в білд як є. Тут перевіряємо, що кожен шлях
// з моків веде на справжній файл: на Vercel відсутній файл не дає 404 у браузері так помітно,
// як падіння тесту.

const ROOT = resolve(import.meta.dirname, '..')
const LESSONS_DIR = join(ROOT, 'src/mocks/lessons')
const PUBLIC_DIR = join(ROOT, 'public')

interface LessonJson {
  id: string
  cover: string
  video: { type: 'file'; src: string } | { type: 'tiktok'; videoId: string }
}

interface SummaryJson {
  id: string
  cover: string
}

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T

const lessons = readdirSync(LESSONS_DIR)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => readJson<LessonJson>(join(LESSONS_DIR, f)))
const catalog = readJson<SummaryJson[]>(join(LESSONS_DIR, 'index.json'))

/** Шлях з JSON (`/clips/...`) → файл у public/. */
const publicFile = (url: string) => join(PUBLIC_DIR, url.replace(/^\//, ''))

/** Імена верхньорівневих боксів MP4 по порядку (ftyp, moov, mdat, ...). */
function topLevelBoxes(file: string): string[] {
  const buf = readFileSync(file)
  const boxes: string[] = []
  let offset = 0
  while (offset + 8 <= buf.length) {
    let size = buf.readUInt32BE(offset)
    const type = buf.toString('latin1', offset + 4, offset + 8)
    if (size === 1) size = Number(buf.readBigUInt64BE(offset + 8))
    else if (size === 0) size = buf.length - offset
    if (size < 8) break
    boxes.push(type)
    offset += size
  }
  return boxes
}

describe('lesson media in public/', () => {
  it.each(catalog.map((l) => [l.id, l.cover]))('catalog card %s has its cover (%s)', (_id, cover) => {
    expect(cover).toMatch(/^\/clips\//)
    expect(existsSync(publicFile(cover))).toBe(true)
  })

  it.each(lessons.map((l) => [l.id, l]))('lesson %s has its cover and video', (_id, lesson) => {
    expect(existsSync(publicFile(lesson.cover))).toBe(true)
    if (lesson.video.type !== 'file') return
    const video = publicFile(lesson.video.src)
    expect(existsSync(video)).toBe(true)
    // faststart: moov перед mdat, інакше браузер не почне грати й перемотувати, поки не скачає весь файл.
    const boxes = topLevelBoxes(video)
    expect(boxes).toContain('moov')
    expect(boxes.indexOf('moov')).toBeLessThan(boxes.indexOf('mdat'))
  })
})
