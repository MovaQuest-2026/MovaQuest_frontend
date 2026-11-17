#!/usr/bin/env node
// Переводить секунди оригіналу в секунди вирізаного кліпу (після encode-clip.sh --cut).
// Використання: node scripts/shift-times.mjs --cut 1.55-5.95 --cut 10.05-13.45 6.25 13.75 21.45
// Друкує «оригінал → кліп» для кожного часу. Час усередині вирізаного переходить на межу.
const cuts = []
const times = []
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cut') {
    const [a, b] = (args[++i] ?? '').split('-').map(Number)
    if (!(b > a)) throw new Error(`--cut очікує A-B: ${args[i]}`)
    cuts.push([a, b])
  } else times.push(Number(args[i]))
}
if (times.length === 0 || times.some(Number.isNaN)) {
  console.error('Використання: node scripts/shift-times.mjs [--cut A-B ...] <секунди...>')
  process.exit(1)
}
cuts.sort((x, y) => x[0] - y[0])

export function shift(t) {
  let removed = 0
  for (const [a, b] of cuts) {
    if (t >= b) removed += b - a
    else if (t > a) removed += t - a
  }
  return Math.round((t - removed) * 100) / 100
}

for (const t of times) console.log(`${t} → ${shift(t)}`)
