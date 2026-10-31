import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PROTO_BASE, findScenario, scenarios, seedHistory } from './data'
import { Page, ProgressBar, StubBadge, StubBlock, StubButton } from './ProtoUi'
import { MAX_HEARTS, usePrototypeStore } from './usePrototypeStore'

type ChatMessage = { from: 'npc' | 'user'; text: string; translation?: string }

type Phase = 'ready' | 'listening' | 'recognizing' | 'thinking' | 'done'

const phaseLabel: Record<Phase, string> = {
  ready: 'Натисни і говори',
  listening: 'Слухаю… натисни ще раз, щоб завершити',
  recognizing: 'Розпізнаю мову…',
  thinking: 'Співрозмовник відповідає…',
  done: 'Розмову завершено',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function Hearts({ count }: { count: number }) {
  return (
    <span className="proto-hearts" aria-label={`Сердечка: ${count} з ${MAX_HEARTS}`}>
      {Array.from({ length: MAX_HEARTS }, (_, index) => (
        <span key={index} className={index < count ? 'proto-heart' : 'proto-heart proto-heart-empty'}>
          ❤
        </span>
      ))}
    </span>
  )
}

function useAllHistory() {
  const history = usePrototypeStore((state) => state.history)
  return [...history, ...seedHistory]
}

export function TalkListPage() {
  const navigate = useNavigate()
  const hearts = usePrototypeStore((state) => state.hearts)
  const spendHeart = usePrototypeStore((state) => state.spendHeart)
  const refillHearts = usePrototypeStore((state) => state.refillHearts)
  const historyCount = useAllHistory().length

  function start(id: string) {
    spendHeart()
    navigate(`${PROTO_BASE}/talk/${id}`)
  }

  return (
    <Page title="Поговоримо?" eyebrow="Розмова голосом · варіант A" back={`${PROTO_BASE}/home`} wide>
      <div className="proto-grid proto-grid-2">
        <div className="proto-card proto-hearts-card">
          <Hearts count={hearts} />
          <span className="proto-muted">Одна розмова — одне сердечко. Відновлюються щодня.</span>
        </div>
        <Link to={`${PROTO_BASE}/talk/history`} className="proto-card proto-card-link">
          <strong>🕘 Історія розмов</strong>
          <span className="proto-muted">{historyCount} розмов · розшифровки та розбір помилок</span>
        </Link>
      </div>
      {hearts === 0 && (
        <div className="proto-card proto-tone-ochre proto-paywall">
          <strong>Сердечка закінчились</strong>
          <span>Повертайся завтра або переходь на Pro без лімітів.</span>
          <div className="proto-row">
            <Link to={`${PROTO_BASE}/pricing`} className="proto-btn proto-btn-primary">
              Перейти на Pro
            </Link>
            <button type="button" className="proto-btn proto-btn-ghost" onClick={refillHearts}>
              Відновити (для тесту)
            </button>
          </div>
        </div>
      )}
      <h2>Обери ситуацію</h2>
      <div className="proto-grid proto-grid-3">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className={`proto-card proto-scenario${scenario.stub ? ' proto-disabled' : ''}`}>
            <div className="proto-scenario-head">
              <span className="proto-scenario-emoji" aria-hidden="true">
                {scenario.emoji}
              </span>
              <span className="proto-chip">{scenario.level}</span>
            </div>
            <strong className="proto-scenario-title">
              {scenario.title} {scenario.stub && <StubBadge />}
            </strong>
            <span className="proto-muted">{scenario.description}</span>
            {!scenario.stub && (
              <button
                type="button"
                className="proto-btn proto-btn-primary proto-btn-block"
                disabled={hearts === 0}
                onClick={() => start(scenario.id)}
              >
                🎤 Почати · ❤ 1
              </button>
            )}
          </div>
        ))}
      </div>
    </Page>
  )
}

export function TalkDialoguePage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const scenario = findScenario(scenarioId)
  const addHistory = usePrototypeStore((state) => state.addHistory)
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    scenario ? [{ from: 'npc', text: scenario.steps[0].npc, translation: scenario.steps[0].translation }] : [],
  )
  const [showTranslation, setShowTranslation] = useState(false)
  const timers = useRef<number[]>([])
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, phase])

  if (!scenario) return <Navigate to={`${PROTO_BASE}/talk`} replace />

  const total = scenario.steps.length

  function later(callback: () => void, delay: number) {
    timers.current.push(window.setTimeout(callback, delay))
  }

  function handleMic() {
    if (!scenario) return
    if (phase === 'ready') {
      setPhase('listening')
      return
    }
    if (phase !== 'listening') return
    const step = scenario.steps[stepIndex]
    const next = scenario.steps[stepIndex + 1]
    setPhase('recognizing')
    later(() => {
      setMessages((current) => [...current, { from: 'user', text: step.reply }])
      setStepIndex(stepIndex + 1)
      if (!next) {
        setPhase('done')
        return
      }
      setPhase('thinking')
      later(() => {
        setMessages((current) => [...current, { from: 'npc', text: next.npc, translation: next.translation }])
        setPhase('ready')
      }, 900)
    }, 700)
  }

  function finish() {
    if (!scenario) return
    const id = addHistory(scenario.id)
    navigate(`${PROTO_BASE}/talk/history/${id}`, { replace: true })
  }

  const busy = phase === 'recognizing' || phase === 'thinking'

  return (
    <Page title={scenario.title} eyebrow={`Розмова голосом · ${scenario.level}`} back={`${PROTO_BASE}/talk`}>
      <div className="proto-steps">
        <span className="proto-muted">
          Відповідей {stepIndex} з {total}
        </span>
        <ProgressBar value={stepIndex} max={total} label="Прогрес розмови" />
      </div>
      <div className="proto-game-window">
        <div className="proto-game-window-bar">
          <span>
            {scenario.emoji} {scenario.title}
          </span>
          <label className="proto-toggle">
            <input type="checkbox" checked={showTranslation} onChange={(event) => setShowTranslation(event.target.checked)} />
            Переклад
          </label>
        </div>
        <div className="proto-chat">
          {messages.map((message, index) => (
            <div key={index} className={`proto-bubble proto-bubble-${message.from}`}>
              <span className="proto-bubble-name">{message.from === 'npc' ? 'Співрозмовник' : 'Ти · розпізнано'}</span>
              <span className="proto-bubble-text">
                {message.text}
                {message.from === 'npc' && (
                  <button type="button" className="proto-bubble-play" disabled title="Озвучка (text-to-speech) — заглушка">
                    🔊
                  </button>
                )}
              </span>
              {message.from === 'npc' && showTranslation && <span className="proto-bubble-translation">{message.translation}</span>}
            </div>
          ))}
          {phase === 'thinking' && <div className="proto-bubble proto-bubble-npc proto-typing">• • •</div>}
          <div ref={chatEnd} />
        </div>
        <div className="proto-voice">
          {phase === 'done' ? (
            <button type="button" className="proto-btn proto-btn-ochre" onClick={finish}>
              Завершити й подивитись розбір →
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`proto-mic proto-mic-${phase}`}
                onClick={handleMic}
                disabled={busy}
                aria-label={phaseLabel[phase]}
              >
                🎤
              </button>
              <div className={`proto-wave${phase === 'listening' ? ' proto-wave-active' : ''}`} aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index} style={{ animationDelay: `${index * 0.08}s` }} />
                ))}
              </div>
              <span className="proto-voice-status">{phaseLabel[phase]}</span>
            </>
          )}
        </div>
        <div className="proto-chat-input">
          <StubButton>⌨ Ввести текстом</StubButton>
          <span className="proto-muted">Підказки та помилки — у розборі після розмови</span>
        </div>
      </div>
      <p className="proto-muted">
        <StubBadge /> Розпізнавання та озвучка — імітація: замість твого голосу підставляється заготовлена фраза.
      </p>
    </Page>
  )
}

export function TalkHistoryPage() {
  const history = useAllHistory()

  return (
    <Page title="Історія розмов" eyebrow="Розмова голосом" back={`${PROTO_BASE}/talk`}>
      {history.length === 0 ? (
        <div className="proto-card proto-empty">Тут з'являться твої розмови.</div>
      ) : (
        <ul className="proto-history">
          {history.map((entry) => {
            const scenario = findScenario(entry.scenarioId)
            if (!scenario) return null
            const toImprove = scenario.steps.filter((step) => step.review).length
            return (
              <li key={entry.id}>
                <Link to={`${PROTO_BASE}/talk/history/${entry.id}`} className="proto-history-item">
                  <span className="proto-scenario-emoji" aria-hidden="true">
                    {scenario.emoji}
                  </span>
                  <span className="proto-history-text">
                    <strong>{scenario.title}</strong>
                    <span className="proto-muted">
                      {formatDate(entry.finishedAt)} · {scenario.steps.length} відповідей
                    </span>
                  </span>
                  <span className={`proto-chip${toImprove ? ' proto-chip-warn' : ''}`}>
                    {toImprove ? `${toImprove} на покращення` : 'без помилок'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}

export function TalkReviewPage() {
  const { entryId } = useParams()
  const history = useAllHistory()
  const entry = history.find((item) => item.id === entryId)
  const scenario = findScenario(entry?.scenarioId)

  if (!entry || !scenario) return <Navigate to={`${PROTO_BASE}/talk/history`} replace />

  const toImprove = scenario.steps.filter((step) => step.review).length

  return (
    <Page title={`Розбір: ${scenario.title}`} eyebrow={formatDate(entry.finishedAt)} back={`${PROTO_BASE}/talk/history`}>
      <div className={`proto-card proto-result ${toImprove === 0 ? 'proto-tone-stop' : 'proto-tone-ochre'}`}>
        <span className="proto-result-emoji" aria-hidden="true">
          {scenario.emoji}
        </span>
        <div>
          <div className="proto-price">{toImprove === 0 ? 'Без помилок' : `${toImprove} з ${scenario.steps.length} можна краще`}</div>
          <span>Нижче — уся розмова з підказками до кожної твоєї відповіді.</span>
        </div>
      </div>
      <div className="proto-card">
        <h2>Розшифровка</h2>
        <ol className="proto-transcript">
          {scenario.steps.map((step) => (
            <li key={step.npc}>
              <div className="proto-transcript-npc">
                <span className="proto-bubble-name">Співрозмовник</span>
                {step.npc}
                <span className="proto-bubble-translation">{step.translation}</span>
              </div>
              <div className="proto-transcript-user">
                <span className="proto-bubble-name">Ти</span>
                <span className={step.review ? 'proto-strike' : undefined}>{step.reply}</span>
                <button type="button" className="proto-bubble-play" disabled title="Запис твого голосу — заглушка">
                  ▶
                </button>
              </div>
              {step.review ? (
                <div className="proto-review">
                  <strong>💡 Краще: {step.review.better}</strong>
                  <span>{step.review.why}</span>
                </div>
              ) : (
                <div className="proto-review proto-review-ok">✓ Добре сказано</div>
              )}
            </li>
          ))}
        </ol>
      </div>
      <div className="proto-card">
        <h2>Нові слова</h2>
        <ul className="proto-word-list">
          {scenario.words.map((word) => (
            <li key={word.uk}>
              <strong>{word.uk}</strong>
              <span>{word.en}</span>
            </li>
          ))}
        </ul>
      </div>
      <StubBlock title="Оцінка вимови та темпу мовлення">Окремий сервіс розпізнавання голосу дасть бал за кожну репліку.</StubBlock>
      <div className="proto-row">
        <Link to={`${PROTO_BASE}/talk`} className="proto-btn proto-btn-primary">
          Нова розмова
        </Link>
        <Link to={`${PROTO_BASE}/talk/history`} className="proto-btn proto-btn-ghost">
          Уся історія
        </Link>
      </div>
    </Page>
  )
}
