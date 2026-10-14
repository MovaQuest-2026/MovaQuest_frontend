// Прогін усіх скомпільованих діалогів з різними виборами і відповідями на вправи.
// Ловить зациклення і порожні діалоги. Запуск: node scripts/playtest-ink.mjs
import fs from 'node:fs'
import { Story } from 'inkjs'

const DIR = 'src/mocks/dialogues'
let problems = 0
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.ink.json'))) {
  const d = JSON.parse(fs.readFileSync(`${DIR}/${file}`, 'utf8'))
  for (const lang of ['uk', 'en']) for (const quizOk of [true, false]) for (const pick of [0, 1, 2]) {
    const s = new Story(JSON.stringify(d.inkContent[lang]))
    s.variablesState.phone_charging = true
    s.variablesState.has_umbrella = quizOk
    let lines = 0, steps = 0
    while (steps++ < 200) {
      while (s.canContinue) {
        s.Continue(); lines++
        if (s.currentTags.some((t) => t.startsWith('quiz:'))) s.variablesState.quiz_ok = quizOk
      }
      if (!s.currentChoices.length) break
      s.ChooseChoiceIndex(Math.min(pick, s.currentChoices.length - 1))
    }
    if (steps >= 200 || lines === 0) { problems++; console.error(`PROBLEM ${d.id} ${lang} quiz=${quizOk} pick=${pick}`) }
  }
}
console.log(problems ? `${problems} problems` : 'all dialogues ok')
process.exit(problems ? 1 : 0)
