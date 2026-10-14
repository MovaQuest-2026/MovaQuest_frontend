// Компілює content/ink/<id>.uk.ink + <id>.en.ink у src/mocks/dialogues/<id>.ink.json
// і перевіряє, що обидві мови мають однакові змінні та теги quiz:.
// Запуск з кореня фронтенд-репозиторію: node scripts/build-ink.mjs
import fs from 'node:fs'
import path from 'node:path'
import { Compiler, CompilerOptions } from 'inkjs/full'
import { PosixFileHandler } from 'inkjs/compiler/FileHandler/PosixFileHandler'

const INK_DIR = path.resolve('content/ink')
const OUT_DIR = path.resolve('src/mocks/dialogues')
const CITY_ID = 'vinnytsia'
const meta = JSON.parse(fs.readFileSync(path.join(INK_DIR, 'dialogues.meta.json'), 'utf8'))

function compile(file) {
  const errors = []
  const options = new CompilerOptions(
    file, [], false,
    (message, type) => { if (type !== 1) errors.push(message) },
    new PosixFileHandler(INK_DIR + '/'),
  )
  const source = fs.readFileSync(path.join(INK_DIR, file), 'utf8')
  const story = new Compiler(source, options).Compile()
  if (!story || errors.length) throw new Error(`${file}:\n  ${errors.join('\n  ')}`)
  return JSON.parse(story.ToJson())
}

const quizTags = (file) =>
  [...fs.readFileSync(path.join(INK_DIR, file), 'utf8').matchAll(/#\s*quiz:([\w-]+)/g)].map((m) => m[1]).sort().join(',')

fs.mkdirSync(OUT_DIR, { recursive: true })
let failed = false
for (const [id, info] of Object.entries(meta)) {
  try {
    const uk = `${id}.uk.ink`, en = `${id}.en.ink`
    if (quizTags(uk) !== quizTags(en)) throw new Error(`quiz-теги різняться: uk=[${quizTags(uk)}] en=[${quizTags(en)}]`)
    const out = {
      id,
      cityId: CITY_ID,
      npcId: info.npcId,
      zone: info.zone,
      inkContent: { en: compile(en), uk: compile(uk) },
      vocabulary: info.vocabulary.map(([word, translation]) => ({ word, translation, example: '' })),
    }
    fs.writeFileSync(path.join(OUT_DIR, `${id}.ink.json`), JSON.stringify(out, null, 2))
    console.log(`ok   ${id}`)
  } catch (e) {
    failed = true
    console.error(`FAIL ${id}: ${e.message}`)
  }
}
process.exit(failed ? 1 : 0)
