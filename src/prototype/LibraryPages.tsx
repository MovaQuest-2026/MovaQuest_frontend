import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  PROTO_BASE,
  dictionary,
  dictionaryTopics,
  findRule,
  findTopic,
  games,
  ruleCategories,
  rules,
  topicWords,
  topics,
  wordsOfTopic,
} from './data'
import type { Question } from './data'
import { Page, ProgressBar, StubBadge, StubBlock, StubButton, Tile } from './ProtoUi'
import { usePrototypeStore } from './usePrototypeStore'

const LIB = `${PROTO_BASE}/library`

function useLearnedWords() {
  const learned = usePrototypeStore((state) => state.learned)
  const learnedTopicNames = topics.filter((topic) => learned.includes(`topic:${topic.id}`)).map((topic) => topicWords[topic.id])
  return new Set(dictionary.filter((word) => learnedTopicNames.includes(word.topic)).map((word) => word.uk))
}

function LearnedMark({ done }: { done: boolean }) {
  return done ? <span className="proto-chip proto-chip-ok">✓ вивчено</span> : null
}

export function LibraryHomePage() {
  const learned = usePrototypeStore((state) => state.learned)
  const learnedWords = useLearnedWords()
  const openTopics = topics.filter((topic) => !topic.stub)
  const openRules = rules.filter((rule) => !rule.stub)
  const learnedTopics = openTopics.filter((topic) => learned.includes(`topic:${topic.id}`)).length
  const learnedRules = openRules.filter((rule) => learned.includes(`rule:${rule.id}`)).length
  const suggestion = openTopics.find((topic) => !learned.includes(`topic:${topic.id}`))

  return (
    <Page title="Бібліотека" eyebrow="Матеріали + мініігри · варіант B" back={`${PROTO_BASE}/home`} wide>
      <p className="proto-lead">Усе відкрито — вчи в будь-якому порядку: ситуації, правила, слова та ігри.</p>
      <div className="proto-grid proto-grid-3">
        <div className="proto-card proto-stat-card">
          <span className="proto-price">
            {learnedTopics}/{openTopics.length}
          </span>
          <span className="proto-muted">тем вивчено</span>
        </div>
        <div className="proto-card proto-stat-card">
          <span className="proto-price">
            {learnedRules}/{openRules.length}
          </span>
          <span className="proto-muted">правил потреновано</span>
        </div>
        <div className="proto-card proto-stat-card">
          <span className="proto-price">{learnedWords.size}</span>
          <span className="proto-muted">слів знаєш</span>
        </div>
      </div>
      {suggestion && (
        <Link to={`${LIB}/topics/${suggestion.id}`} className="proto-card proto-tone-ochre proto-suggest">
          <span className="proto-result-emoji" aria-hidden="true">
            {suggestion.emoji}
          </span>
          <span>
            <span className="proto-muted">Спробуй сьогодні</span>
            <strong className="proto-suggest-title">{suggestion.title}</strong>
          </span>
          <span className="proto-suggest-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      )}
      <div className="proto-grid proto-grid-4">
        <Tile to={`${LIB}/topics`} emoji="🗺" title="Ситуації" description="Фрази й слова для життя" tone="stop" />
        <Tile to={`${LIB}/rules`} emoji="📐" title="Правила" description="Граматика простими словами" tone="tram" />
        <Tile to={`${LIB}/dictionary`} emoji="📖" title="Словник" description={`${dictionary.length} слів за темами`} tone="ochre" />
        <Tile to={`${PROTO_BASE}/games`} emoji="🎮" title="Ігри" description="Закріплюй граючи" />
      </div>
    </Page>
  )
}

export function TopicsPage() {
  const learned = usePrototypeStore((state) => state.learned)

  return (
    <Page title="Ситуації" eyebrow="Бібліотека" back={LIB} wide>
      <div className="proto-grid proto-grid-3">
        {topics.map((topic) =>
          topic.stub ? (
            <Tile key={topic.id} emoji={topic.emoji} title={topic.title} meta={topic.level} stub />
          ) : (
            <Link key={topic.id} to={`${LIB}/topics/${topic.id}`} className="proto-tile">
              <span className="proto-scenario-head">
                <span className="proto-tile-emoji" aria-hidden="true">
                  {topic.emoji}
                </span>
                <span className="proto-chip">{topic.level}</span>
              </span>
              <span className="proto-tile-title">{topic.title}</span>
              <span className="proto-tile-text">
                {topic.phrases.length} фрази · {wordsOfTopic(topic.id).length} слів
              </span>
              <LearnedMark done={learned.includes(`topic:${topic.id}`)} />
            </Link>
          ),
        )}
      </div>
    </Page>
  )
}

export function TopicPage() {
  const { topicId } = useParams()
  const topic = findTopic(topicId)
  const learned = usePrototypeStore((state) => state.learned)

  if (!topic) return <Navigate to={`${LIB}/topics`} replace />

  const words = wordsOfTopic(topic.id)

  return (
    <Page title={`${topic.emoji} ${topic.title}`} eyebrow={`Ситуація · ${topic.level}`} back={`${LIB}/topics`}>
      <LearnedMark done={learned.includes(`topic:${topic.id}`)} />
      <div className="proto-card proto-tone-ochre">
        <h2>Коротко</h2>
        <p>{topic.intro}</p>
      </div>
      <div className="proto-card">
        <div className="proto-card-head">
          <h2>Корисні фрази</h2>
          <StubButton>🔊 Послухати</StubButton>
        </div>
        <ul className="proto-word-list">
          {topic.phrases.map((phrase) => (
            <li key={phrase.uk}>
              <strong>{phrase.uk}</strong>
              <span>{phrase.en}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="proto-card">
        <h2>Слова</h2>
        <div className="proto-word-chips">
          {words.map((word) => (
            <span key={word.uk} className="proto-word-chip">
              {word.uk}
              <small>{word.en}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="proto-grid proto-grid-2">
        <Link to={`${LIB}/practice/topic/${topic.id}`} className="proto-btn proto-btn-primary">
          ✏ Потренуватися
        </Link>
        <Link to={`${PROTO_BASE}/games/cards?topic=${topic.id}`} className="proto-btn proto-btn-ghost">
          🃏 Слова в картках
        </Link>
      </div>
    </Page>
  )
}

export function RulesPage() {
  const learned = usePrototypeStore((state) => state.learned)
  const [category, setCategory] = useState<string | null>(null)
  const visible = ruleCategories.filter((item) => !category || item === category)

  return (
    <Page title="Правила" eyebrow="Бібліотека" back={LIB}>
      <div className="proto-filter" role="group" aria-label="Категорії">
        <button type="button" className={`proto-filter-chip${category === null ? ' proto-filter-active' : ''}`} onClick={() => setCategory(null)}>
          Усі
        </button>
        {ruleCategories.map((item) => (
          <button
            key={item}
            type="button"
            className={`proto-filter-chip${category === item ? ' proto-filter-active' : ''}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {visible.map((group) => (
        <section key={group} className="proto-rule-group">
          <h2>{group}</h2>
          <ul className="proto-rule-list">
            {rules
              .filter((rule) => rule.category === group)
              .map((rule) => (
                <li key={rule.id}>
                  {rule.stub ? (
                    <div className="proto-rule-item proto-disabled">
                      <strong>{rule.title}</strong>
                      <StubBadge />
                    </div>
                  ) : (
                    <Link to={`${LIB}/rules/${rule.id}`} className="proto-rule-item">
                      <span className="proto-rule-text">
                        <strong>{rule.title}</strong>
                        <span className="proto-muted">{rule.summary}</span>
                      </span>
                      <span className="proto-row proto-row-tight">
                        <LearnedMark done={learned.includes(`rule:${rule.id}`)} />
                        <span className="proto-chip">{rule.level}</span>
                      </span>
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Page>
  )
}

export function RulePage() {
  const { ruleId } = useParams()
  const rule = findRule(ruleId)
  const learned = usePrototypeStore((state) => state.learned)

  if (!rule) return <Navigate to={`${LIB}/rules`} replace />

  return (
    <Page title={rule.title} eyebrow={`Правило · ${rule.category} · ${rule.level}`} back={`${LIB}/rules`}>
      <LearnedMark done={learned.includes(`rule:${rule.id}`)} />
      <div className="proto-card">
        {rule.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="proto-card proto-tone-ochre">
        <h2>Приклади</h2>
        <ul className="proto-word-list">
          {rule.examples.map((example) => (
            <li key={example.uk}>
              <strong>{example.uk}</strong>
              <span>{example.en}</span>
            </li>
          ))}
        </ul>
      </div>
      <StubBlock title="Таблиця закінчень і відео-пояснення" />
      <Link to={`${LIB}/practice/rule/${rule.id}`} className="proto-btn proto-btn-primary proto-btn-block">
        ✏ Потренувати правило
      </Link>
    </Page>
  )
}

export function DictionaryPage() {
  const learnedWords = useLearnedWords()
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<string | null>(null)
  const needle = query.trim().toLowerCase()
  const words = dictionary.filter(
    (word) => (!topic || word.topic === topic) && (!needle || word.uk.includes(needle) || word.en.toLowerCase().includes(needle)),
  )

  return (
    <Page title="Словник" eyebrow={`${dictionary.length} слів · знаєш ${learnedWords.size}`} back={LIB}>
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пошук українською або англійською" />
      <div className="proto-filter" role="group" aria-label="Теми">
        <button type="button" className={`proto-filter-chip${topic === null ? ' proto-filter-active' : ''}`} onClick={() => setTopic(null)}>
          Усі
        </button>
        {dictionaryTopics.map((item) => (
          <button
            key={item}
            type="button"
            className={`proto-filter-chip${topic === item ? ' proto-filter-active' : ''}`}
            onClick={() => setTopic(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="proto-card">
        {words.length === 0 ? (
          <p className="proto-muted">Нічого не знайдено.</p>
        ) : (
          <ul className="proto-word-list">
            {words.map((word) => (
              <li key={word.uk}>
                <strong>
                  {learnedWords.has(word.uk) && <span className="proto-ok">✓ </span>}
                  {word.uk}
                </strong>
                <span>
                  {word.en} · <span className="proto-muted">{word.topic}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="proto-row">
        <StubButton>🔁 Повторити слова на сьогодні</StubButton>
        <StubButton>➕ Мої слова</StubButton>
      </div>
    </Page>
  )
}

function OptionButton({ option, question, picked, onPick }: { option: string; question: Question; picked: string | null; onPick: (o: string) => void }) {
  const state = picked ? (option === question.answer ? ' proto-correct' : option === picked ? ' proto-wrong' : ' proto-dimmed') : ''
  return (
    <button type="button" className={`proto-option proto-option-center${state}`} onClick={() => onPick(option)}>
      <strong>{option}</strong>
    </button>
  )
}

export function PracticePage() {
  const { kind, itemId } = useParams()
  const markLearned = usePrototypeStore((state) => state.markLearned)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const item = kind === 'rule' ? findRule(itemId) : kind === 'topic' ? findTopic(itemId) : undefined

  if (!item) return <Navigate to={LIB} replace />

  const backTo = `${LIB}/${kind === 'rule' ? 'rules' : 'topics'}/${item.id}`
  const total = item.questions.length
  const question = item.questions[index]

  function pick(option: string) {
    if (picked || !question) return
    setPicked(option)
    if (option === question.answer) setScore(score + 1)
  }

  function next() {
    if (!item) return
    if (index + 1 >= total) markLearned(`${kind}:${item.id}`)
    setPicked(null)
    setIndex(index + 1)
  }

  if (index >= total) {
    const perfect = score === total
    return (
      <Page title={perfect ? 'Ідеально!' : 'Готово!'} eyebrow="Результат" back={backTo}>
        <div className={`proto-card proto-result ${perfect ? 'proto-tone-stop' : 'proto-tone-ochre'}`}>
          <span className="proto-result-emoji" aria-hidden="true">
            {perfect ? '🏆' : '⭐'}
          </span>
          <div>
            <strong>{item.title}</strong>
            <div className="proto-price">
              {score} / {total}
            </div>
            <span>Позначено як вивчене</span>
          </div>
        </div>
        <div className="proto-row">
          <Link to={LIB} className="proto-btn proto-btn-primary">
            До бібліотеки
          </Link>
          <Link to={backTo} className="proto-btn proto-btn-ghost">
            Повернутися до матеріалу
          </Link>
        </div>
      </Page>
    )
  }

  const correct = picked === question.answer

  return (
    <Page title={question.prompt} eyebrow={`Практика · ${item.title}`} back={backTo}>
      <div className="proto-steps">
        <span className="proto-muted">
          Питання {index + 1} з {total}
        </span>
        <ProgressBar value={index} max={total} label="Прогрес практики" />
      </div>
      <div className="proto-grid proto-grid-3">
        {question.options.map((option) => (
          <OptionButton key={option} option={option} question={question} picked={picked} onPick={pick} />
        ))}
      </div>
      {picked && (
        <div className={`proto-feedback ${correct ? 'proto-tone-stop' : 'proto-tone-tram'}`}>
          <strong>{correct ? 'Правильно!' : `Правильна відповідь: ${question.answer}`}</strong>
          <button type="button" className="proto-btn proto-btn-ochre" onClick={next}>
            Далі →
          </button>
        </div>
      )}
      <StubBlock title="Інші типи вправ">Вписати слово, скласти речення, аудіювання.</StubBlock>
    </Page>
  )
}

const gameTones = ['ochre', 'tram', 'stop', 'paper'] as const

export function GamesPage() {
  return (
    <Page title="Мініігри" eyebrow="Бібліотека · варіант B" back={LIB} wide>
      <div className="proto-grid proto-grid-4">
        {games.map((game, index) => (
          <Tile
            key={game.id}
            to={`${PROTO_BASE}/games/${game.id}`}
            emoji={game.emoji}
            title={game.title}
            description={game.description}
            stub={game.stub}
            tone={gameTones[index % gameTones.length]}
          />
        ))}
      </div>
    </Page>
  )
}

export function CardsGamePage() {
  const [searchParams] = useSearchParams()
  const topicId = searchParams.get('topic')
  const topic = topicId ? findTopic(topicId) : undefined
  const cardWords = topic ? wordsOfTopic(topic.id) : dictionary
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const word = cardWords[index % cardWords.length]

  function go(delta: number) {
    setFlipped(false)
    setIndex((index + delta + cardWords.length) % cardWords.length)
  }

  return (
    <Page title="Картки" eyebrow={topic ? `Мінігра · ${topic.title}` : 'Мінігра · усі слова'} back={topic ? `${LIB}/topics/${topic.id}` : `${PROTO_BASE}/games`}>
      <div className="proto-steps">
        <span className="proto-muted">
          Картка {(index % cardWords.length) + 1} з {cardWords.length} · натисни, щоб перевернути
        </span>
        <ProgressBar value={(index % cardWords.length) + 1} max={cardWords.length} label="Прогрес карток" />
      </div>
      <button
        type="button"
        className={`proto-flashcard${flipped ? ' proto-flashcard-flipped' : ''}`}
        onClick={() => setFlipped(!flipped)}
        aria-label={flipped ? word.en : word.uk}
      >
        <span className="proto-flashcard-inner">
          <span className="proto-flashcard-face proto-flashcard-front">{word.uk}</span>
          <span className="proto-flashcard-face proto-flashcard-back">{word.en}</span>
        </span>
      </button>
      <div className="proto-row proto-row-center">
        <button type="button" className="proto-btn proto-btn-ghost" onClick={() => go(-1)}>
          ← Назад
        </button>
        <button type="button" className="proto-btn proto-btn-primary" onClick={() => go(1)}>
          Далі →
        </button>
      </div>
      <div className="proto-row proto-row-center">
        <StubButton>Знаю</StubButton>
        <StubButton>Ще вчу</StubButton>
      </div>
    </Page>
  )
}
