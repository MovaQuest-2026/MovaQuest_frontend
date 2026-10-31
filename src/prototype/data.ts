export type Level = 'A0' | 'A1' | 'A2'

export type Word = { uk: string; en: string }

export type DictionaryWord = Word & { topic: string }

export type Review = { better: string; why: string }

export type DialogueStep = { npc: string; translation: string; reply: string; review?: Review }

export type Scenario = {
  id: string
  title: string
  emoji: string
  level: Level
  description: string
  stub?: boolean
  steps: DialogueStep[]
  words: Word[]
}

export type HistoryEntry = { id: string; scenarioId: string; finishedAt: string }

export type Question = { prompt: string; options: string[]; answer: string }

export type Rule = {
  id: string
  title: string
  category: string
  level: Level
  stub?: boolean
  summary: string
  body: string[]
  examples: Word[]
  questions: Question[]
}

export type Topic = {
  id: string
  title: string
  emoji: string
  level: Level
  stub?: boolean
  intro: string
  phrases: Word[]
  questions: Question[]
}

export const PROTO_BASE = '/prototype'

export const scenarios: Scenario[] = [
  {
    id: 'meet',
    title: 'Знайомство',
    emoji: '👋',
    level: 'A0',
    description: 'Привітайся і познайомся з новим другом.',
    steps: [
      { npc: 'Привіт! Як тебе звати?', translation: 'Hi! What is your name?', reply: 'Привіт! Мене звати Алекс.' },
      {
        npc: 'Приємно познайомитись! Звідки ти?',
        translation: 'Nice to meet you! Where are you from?',
        reply: 'Я з Канада.',
        review: { better: 'Я з Канади.', why: 'Після «з» іменник стоїть у родовому відмінку: Канада → з Канади.' },
      },
      {
        npc: 'Круто! Ти давно вчиш українську?',
        translation: 'Cool! Have you been learning Ukrainian for long?',
        reply: 'Ні, я вчу тільки два місяці.',
      },
    ],
    words: [
      { uk: 'звати', en: 'to be called' },
      { uk: 'звідки', en: 'where from' },
      { uk: 'вчити', en: 'to learn' },
    ],
  },
  {
    id: 'cafe',
    title: 'У кафе',
    emoji: '☕',
    level: 'A1',
    description: 'Замов каву та десерт.',
    steps: [
      {
        npc: 'Добрий день! Що будете замовляти?',
        translation: 'Good afternoon! What would you like to order?',
        reply: 'Я хочу кава.',
        review: { better: 'Я хочу каву. / Каву, будь ласка.', why: 'Після «хочу» — знахідний відмінок: кава → каву.' },
      },
      { npc: 'З молоком чи без?', translation: 'With milk or without?', reply: 'З молоком, будь ласка.' },
      {
        npc: 'Щось іще?',
        translation: 'Anything else?',
        reply: 'Ні, дякую. Скільки коштує?',
        review: { better: 'Ні, дякую. Скільки з мене?', why: '«Скільки з мене?» — природніший спосіб попросити рахунок у кафе.' },
      },
    ],
    words: [
      { uk: 'кава', en: 'coffee' },
      { uk: 'молоко', en: 'milk' },
      { uk: 'скільки з мене?', en: 'how much do I owe?' },
    ],
  },
  {
    id: 'station',
    title: 'На вокзалі',
    emoji: '🚉',
    level: 'A1',
    description: 'Купи квиток до Львова.',
    steps: [
      { npc: 'Доброго дня! Куди їдете?', translation: 'Good day! Where are you going?', reply: 'До Львова, будь ласка.' },
      {
        npc: 'На сьогодні чи на завтра?',
        translation: 'For today or tomorrow?',
        reply: 'На завтра, на ранок.',
        review: { better: 'На завтра, зранку.', why: 'Про час доби кажуть «зранку», «вдень», «ввечері».' },
      },
      { npc: 'Купе чи плацкарт?', translation: 'Compartment or open sleeper?', reply: 'Купе, будь ласка.' },
    ],
    words: [
      { uk: 'квиток', en: 'ticket' },
      { uk: 'їхати', en: 'to go (by transport)' },
      { uk: 'зранку', en: 'in the morning' },
    ],
  },
  { id: 'doctor', title: 'У лікаря', emoji: '🩺', level: 'A2', description: 'Опиши, що болить.', stub: true, steps: [], words: [] },
  { id: 'shop', title: 'У магазині', emoji: '🛒', level: 'A1', description: 'Купи продукти на вечерю.', stub: true, steps: [], words: [] },
  { id: 'free', title: 'Вільна тема', emoji: '💬', level: 'A2', description: 'Говори з ШІ про що завгодно.', stub: true, steps: [], words: [] },
]

export const seedHistory: HistoryEntry[] = [
  { id: 'seed-2', scenarioId: 'station', finishedAt: '2026-10-29T18:40:00' },
  { id: 'seed-1', scenarioId: 'meet', finishedAt: '2026-10-27T09:15:00' },
]

export const ruleCategories = ['Відмінки', 'Дієслова', 'Ввічливість', 'Алфавіт і вимова']

export const rules: Rule[] = [
  {
    id: 'accusative',
    title: 'Знахідний відмінок: кава → каву',
    category: 'Відмінки',
    level: 'A1',
    summary: 'Що хочу, що бачу, що купую.',
    body: [
      'Use the accusative case for the direct object — the thing you want, see or buy.',
      'Feminine nouns ending in -а change it to -у, ending in -я change it to -ю. Masculine inanimate and neuter nouns do not change.',
    ],
    examples: [
      { uk: 'Я хочу каву.', en: 'I want a coffee.' },
      { uk: 'Я бачу машину.', en: 'I see a car.' },
      { uk: 'Я купую чай.', en: 'I am buying tea.' },
    ],
    questions: [
      { prompt: 'Я хочу …', options: ['кава', 'каву', 'каві'], answer: 'каву' },
      { prompt: 'Я бачу …', options: ['пісню', 'пісня', 'пісні'], answer: 'пісню' },
      { prompt: 'Я купую …', options: ['хліба', 'хліб', 'хлібу'], answer: 'хліб' },
    ],
  },
  {
    id: 'genitive-from',
    title: 'З + родовий: з Канади',
    category: 'Відмінки',
    level: 'A1',
    summary: 'Звідки ти? Я з …',
    body: ['After «з» (from) nouns take the genitive case.', 'Feminine -а becomes -и: Канада → з Канади, Польща → з Польщі.'],
    examples: [
      { uk: 'Я з Канади.', en: 'I am from Canada.' },
      { uk: 'Вона з Польщі.', en: 'She is from Poland.' },
    ],
    questions: [
      { prompt: 'Я з …', options: ['Канада', 'Канади', 'Канаду'], answer: 'Канади' },
      { prompt: 'Він з …', options: ['Італії', 'Італія', 'Італію'], answer: 'Італії' },
    ],
  },
  {
    id: 'present-tense',
    title: 'Теперішній час: я читаю, ти читаєш',
    category: 'Дієслова',
    level: 'A0',
    summary: 'Як змінюється дієслово за особами.',
    body: ['Most verbs ending in -ати follow one pattern.', 'я читаю · ти читаєш · він читає · ми читаємо · ви читаєте · вони читають'],
    examples: [
      { uk: 'Я читаю книгу.', en: 'I am reading a book.' },
      { uk: 'Ти знаєш українську?', en: 'Do you know Ukrainian?' },
    ],
    questions: [
      { prompt: 'Ти … (читати)', options: ['читаю', 'читаєш', 'читає'], answer: 'читаєш' },
      { prompt: 'Ми … (знати)', options: ['знаємо', 'знають', 'знаєте'], answer: 'знаємо' },
    ],
  },
  {
    id: 'formal-you',
    title: 'Ти чи Ви',
    category: 'Ввічливість',
    level: 'A0',
    summary: 'Коли говорити «ти», а коли «Ви».',
    body: ['«Ти» — with friends, family and children.', '«Ви» — with strangers, older people, at work and in shops.'],
    examples: [
      { uk: 'Як тебе звати?', en: 'What is your name? (informal)' },
      { uk: 'Як Вас звати?', en: 'What is your name? (formal)' },
    ],
    questions: [{ prompt: 'You talk to a shop assistant. Use…', options: ['ти', 'Ви'], answer: 'Ви' }],
  },
  { id: 'past-tense', title: 'Минулий час', category: 'Дієслова', level: 'A2', stub: true, summary: '', body: [], examples: [], questions: [] },
  { id: 'alphabet', title: 'Український алфавіт', category: 'Алфавіт і вимова', level: 'A0', stub: true, summary: '', body: [], examples: [], questions: [] },
  { id: 'soft-sign', title: 'М’який знак і апостроф', category: 'Алфавіт і вимова', level: 'A1', stub: true, summary: '', body: [], examples: [], questions: [] },
]

export const dictionaryTopics = ['Привітання', 'Їжа', 'Транспорт', 'Сім’я']

export const dictionary: DictionaryWord[] = [
  { uk: 'привіт', en: 'hi', topic: 'Привітання' },
  { uk: 'добрий день', en: 'good afternoon', topic: 'Привітання' },
  { uk: 'до побачення', en: 'goodbye', topic: 'Привітання' },
  { uk: 'дякую', en: 'thank you', topic: 'Привітання' },
  { uk: 'будь ласка', en: 'please', topic: 'Привітання' },
  { uk: 'кава', en: 'coffee', topic: 'Їжа' },
  { uk: 'чай', en: 'tea', topic: 'Їжа' },
  { uk: 'молоко', en: 'milk', topic: 'Їжа' },
  { uk: 'хліб', en: 'bread', topic: 'Їжа' },
  { uk: 'рахунок', en: 'bill', topic: 'Їжа' },
  { uk: 'квиток', en: 'ticket', topic: 'Транспорт' },
  { uk: 'потяг', en: 'train', topic: 'Транспорт' },
  { uk: 'вокзал', en: 'train station', topic: 'Транспорт' },
  { uk: 'автобус', en: 'bus', topic: 'Транспорт' },
  { uk: 'мама', en: 'mom', topic: 'Сім’я' },
  { uk: 'тато', en: 'dad', topic: 'Сім’я' },
  { uk: 'брат', en: 'brother', topic: 'Сім’я' },
  { uk: 'сестра', en: 'sister', topic: 'Сім’я' },
]

export const topics: Topic[] = [
  {
    id: 'greetings',
    title: 'Привітання',
    emoji: '👋',
    level: 'A0',
    intro: 'Say «Привіт» to friends and «Добрий день» to strangers or older people.',
    phrases: [
      { uk: 'Привіт! Як справи?', en: 'Hi! How are you?' },
      { uk: 'Добрий день!', en: 'Good afternoon!' },
      { uk: 'До побачення!', en: 'Goodbye!' },
    ],
    questions: [
      { prompt: 'How do you greet a stranger?', options: ['Привіт', 'Добрий день', 'Па-па'], answer: 'Добрий день' },
      { prompt: '«Дякую» means…', options: ['Sorry', 'Please', 'Thank you'], answer: 'Thank you' },
    ],
  },
  {
    id: 'food',
    title: 'У кафе',
    emoji: '☕',
    level: 'A1',
    intro: 'Order politely with «…, будь ласка». Ask for the bill with «Скільки з мене?».',
    phrases: [
      { uk: 'Каву, будь ласка.', en: 'A coffee, please.' },
      { uk: 'Чай з лимоном.', en: 'Tea with lemon.' },
      { uk: 'Скільки з мене?', en: 'How much do I owe?' },
    ],
    questions: [
      { prompt: '«Coffee with milk»', options: ['Кава молоко', 'Кава з молоком', 'Молоко кава'], answer: 'Кава з молоком' },
      { prompt: '«Рахунок» means…', options: ['Bill', 'Menu', 'Table'], answer: 'Bill' },
    ],
  },
  {
    id: 'transport',
    title: 'Транспорт',
    emoji: '🚉',
    level: 'A1',
    intro: 'Use «їхати» for going by transport and «до» + genitive for the destination: до Львова.',
    phrases: [
      { uk: 'Один квиток до Києва.', en: 'One ticket to Kyiv.' },
      { uk: 'Коли потяг?', en: 'When is the train?' },
    ],
    questions: [
      { prompt: '«Ticket»', options: ['квиток', 'вокзал', 'потяг'], answer: 'квиток' },
      { prompt: 'Я їду до …', options: ['Львів', 'Львова', 'Львову'], answer: 'Львова' },
    ],
  },
  { id: 'family', title: 'Сім’я', emoji: '👪', level: 'A1', stub: true, intro: '', phrases: [], questions: [] },
  { id: 'doctor', title: 'У лікаря', emoji: '🩺', level: 'A2', stub: true, intro: '', phrases: [], questions: [] },
  { id: 'work', title: 'Робота', emoji: '💼', level: 'A2', stub: true, intro: '', phrases: [], questions: [] },
]

export const topicWords: Record<string, string> = { greetings: 'Привітання', food: 'Їжа', transport: 'Транспорт', family: 'Сім’я' }

export const games = [
  { id: 'cards', title: 'Картки', emoji: '🃏', description: 'Перевертай картки: слово — переклад.', stub: false },
  { id: 'match', title: 'Знайди пару', emoji: '🧩', description: 'З’єднай слово з перекладом на час.', stub: true },
  { id: 'audio', title: 'Почуй слово', emoji: '🎧', description: 'Послухай і обери правильне слово.', stub: true },
  { id: 'sentence', title: 'Склади речення', emoji: '🧱', description: 'Розстав слова в правильному порядку.', stub: true },
]

export const plans = [
  { id: 'free', title: 'Free', price: '$0', features: ['Уся бібліотека', '3 розмови на день', 'Картки'] },
  { id: 'pro', title: 'Pro', price: '$13 / міс', features: ['Безліміт розмов з ШІ', 'Розбір вимови', 'Усі мініігри', 'Повторення слів'] },
]

export function findScenario(id: string | undefined) {
  return scenarios.find((s) => s.id === id && !s.stub)
}

export function findRule(id: string | undefined) {
  return rules.find((r) => r.id === id && !r.stub)
}

export function findTopic(id: string | undefined) {
  return topics.find((t) => t.id === id && !t.stub)
}

export function wordsOfTopic(topicId: string) {
  return dictionary.filter((word) => word.topic === topicWords[topicId])
}
