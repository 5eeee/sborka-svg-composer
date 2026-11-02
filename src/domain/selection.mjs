export const OBJECTS = [
  {
    id: "puzzle",
    name: "Пазлы",
    tags: ["решен", "команд", "собра", "вместе", "сложн", "задач", "связ"],
  },
  {
    id: "book",
    name: "Книга",
    tags: ["учеб", "обуч", "знан", "учить", "книг", "образован", "развит"],
  },
  {
    id: "phone",
    name: "Телефон",
    tags: ["связ", "общен", "цифр", "онлайн", "мобил", "информац", "звон"],
  },
  {
    id: "headphones",
    name: "Наушники",
    tags: ["музык", "слуш", "аудио", "фокус", "отвлеч", "тишин", "подкаст"],
  },
  {
    id: "lamp",
    name: "Лампа",
    tags: ["иде", "свет", "творч", "вдохнов", "новое", "найти"],
  },
  {
    id: "wallet",
    name: "Кошелёк",
    tags: ["деньг", "бюджет", "финанс", "покуп", "сбереж", "расход"],
  },
  {
    id: "pen",
    name: "Ручка",
    tags: ["пис", "запис", "план", "договор", "документ", "замет"],
  },
  {
    id: "folder",
    name: "Папка",
    tags: ["работ", "поряд", "организ", "документ", "офис", "проект"],
  },
  {
    id: "coin",
    name: "Монета",
    tags: ["накоп", "прибыл", "деньг", "мечт", "инвест", "оплат", "доход"],
  },
  {
    id: "flowers",
    name: "Цветы",
    tags: ["цвет", "подар", "забот", "рост", "красот", "весн", "праздник"],
  },
];
const METAPHORS = [
  {
    terms: [
      "выбраться из долгов",
      "заначка",
      "черный день",
      "чёрный день",
      "деньги любят счет",
      "денежный поток",
    ],
    ids: ["wallet", "coin"],
  },
  {
    terms: [
      "свести концы с концами",
      "маленькие шаги к мечте",
      "копить на отпуск",
      "коплю на",
    ],
    ids: ["coin", "wallet"],
  },
  {
    terms: [
      "начать с чистого листа",
      "мысли на бумаге",
      "поставить подпись",
      "от слов к делу",
    ],
    ids: ["pen", "folder"],
  },
  {
    terms: [
      "разгрести завалы",
      "хаос в голове",
      "порядок в делах",
      "все по местам",
    ],
    ids: ["folder", "pen"],
  },
  {
    terms: [
      "отключиться от мира",
      "побыть наедине",
      "убрать лишний шум",
      "войти в поток",
    ],
    ids: ["headphones"],
  },
  {
    terms: [
      "найти общий язык",
      "мост между людьми",
      "протянуть руку",
      "соединить усилия",
    ],
    ids: ["puzzle", "phone"],
  },
  {
    terms: [
      "собрать картину",
      "недостающий кусочек",
      "все сложилось",
      "всё сложилось",
    ],
    ids: ["puzzle"],
  },
  {
    terms: [
      "включить голову",
      "зажечь идею",
      "свежий взгляд",
      "прорыв в мышлении",
    ],
    ids: ["lamp", "book"],
  },
  {
    terms: [
      "учиться никогда не поздно",
      "новая глава",
      "прокачать навыки",
      "разобраться в сложном",
    ],
    ids: ["book", "lamp"],
  },
  {
    terms: ["быть ближе", "разговор по душам", "связать мир", "связаться с"],
    ids: ["phone"],
  },
  {
    terms: [
      "дать расцвести",
      "вырастить свое дело",
      "вырастить своё дело",
      "забота о себе",
      "красота в деталях",
    ],
    ids: ["flowers"],
  },

  {
    terms: [
      "свет в конце",
      "озарение",
      "эврика",
      "искр",
      "bright idea",
      "inspiration",
    ],
    ids: ["lamp"],
  },
  {
    terms: [
      "знания сила",
      "открыть новые горизонты",
      "пища для ума",
      "learning",
      "education",
      "knowledge",
    ],
    ids: ["book", "lamp"],
  },
  {
    terms: [
      "плечом к плечу",
      "части целого",
      "одна команда",
      "teamwork",
      "together",
    ],
    ids: ["puzzle"],
  },
  {
    terms: [
      "держать руку на пульсе",
      "на одной волне",
      "быть на связи",
      "communication",
    ],
    ids: ["phone", "headphones"],
  },
  {
    terms: [
      "время деньги",
      "деньги на ветер",
      "финансовая подушка",
      "копейка рубль",
      "money",
      "saving",
      "budget",
    ],
    ids: ["coin", "wallet"],
  },
  {
    terms: [
      "разложить по полочкам",
      "все под контролем",
      "чистый лист",
      "workflow",
      "documents",
      "organize",
    ],
    ids: ["folder", "pen"],
  },
  {
    terms: [
      "расцвести",
      "пустить корни",
      "плоды труда",
      "бизнес растет",
      "growth",
      "care",
      "gift",
    ],
    ids: ["flowers"],
  },
  {
    terms: [
      "услышать себя",
      "не слышать шум",
      "погрузиться в музыку",
      "music",
      "focus",
      "podcast",
    ],
    ids: ["headphones"],
  },
];

const CONTEXTS = [
  {
    name: "Обучение и концентрация",
    words: [
      "обуч",
      "учеб",
      "экзамен",
      "студент",
      "знан",
      "курс",
      "учить",
      "learning",
      "education",
      "knowledge",
    ],
    main: ["book"],
    support: ["headphones"],
    background: ["lamp", "pen"],
    reason: "Книга передаёт обучение, лампа поддерживает тему знаний",
  },
  {
    name: "Командная работа",
    words: [
      "команд",
      "вместе",
      "сотруднич",
      "партнер",
      "плечом к плечу",
      "части целого",
      "teamwork",
      "together",
    ],
    main: ["puzzle"],
    support: ["phone"],
    background: ["folder", "pen"],
    reason:
      "Пазлы связывают части в целое, папка поддерживает рабочий контекст",
  },
  {
    name: "Финансы и накопления",
    words: [
      "финанс",
      "деньг",
      "накоп",
      "бюджет",
      "сбереж",
      "доход",
      "прибыл",
      "money",
      "saving",
      "budget",
    ],
    main: ["coin", "wallet"],
    support: [],
    background: ["pen", "folder"],
    reason:
      "Монета и кошелёк передают финансы, ручка поддерживает планирование",
  },
  {
    name: "Порядок в работе",
    words: [
      "документ",
      "работ",
      "организ",
      "поряд",
      "договор",
      "офис",
      "проект",
      "по полочкам",
      "workflow",
      "documents",
      "organize",
    ],
    main: ["folder", "pen"],
    support: [],
    background: ["lamp", "phone"],
    reason:
      "Папка и ручка передают работу с документами, лампа задаёт рабочую среду",
  },
  {
    name: "Музыка и фокус",
    words: [
      "музык",
      "тишин",
      "концентрац",
      "фокус",
      "отвлеч",
      "подкаст",
      "аудио",
      "music",
      "focus",
      "podcast",
    ],
    main: ["headphones"],
    support: [],
    background: ["lamp", "book"],
    reason:
      "Наушники передают концентрацию, лампа поддерживает спокойную рабочую среду",
  },
  {
    name: "Идеи и поиск решения",
    words: [
      "иде",
      "вдохнов",
      "эврика",
      "озарен",
      "решен",
      "свет в конце",
      "bright idea",
      "inspiration",
    ],
    main: ["lamp"],
    support: ["puzzle"],
    background: ["pen", "book"],
    reason: "Лампа передаёт идею, ручка связывает её с воплощением",
  },
  {
    name: "Общение и связь",
    words: [
      "общен",
      "связ",
      "звон",
      "коммуникац",
      "на одной волне",
      "communication",
    ],
    main: ["phone"],
    support: ["headphones"],
    background: ["puzzle", "pen"],
    reason: "Телефон передаёт общение, пазлы поддерживают тему связи",
  },
  {
    name: "Рост и забота",
    words: [
      "забот",
      "рост",
      "растет",
      "расцвест",
      "корни",
      "плоды труда",
      "подар",
      "праздник",
      "growth",
      "care",
      "gift",
    ],
    main: ["flowers"],
    support: [],
    background: ["lamp", "book"],
    reason: "Цветы передают рост и заботу, лампа поддерживает тему развития",
  },
];
const ALIASES = {
  puzzle: ["пазл", "puzzle"],
  book: ["книг", "book"],
  phone: ["телефон", "смартфон", "phone"],
  headphones: ["наушник", "headphone"],
  lamp: ["ламп", "lamp"],
  wallet: ["кошел", "wallet"],
  pen: ["ручк", "pen"],
  folder: ["папк", "folder"],
  coin: ["монет", "coin"],
  flowers: ["цветы", "цветок", "букет", "flower"],
};
const normalize = (t) =>
  String(t)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
export function analyzeIdea(text) {
  const t = normalize(text),
    excluded = new Set(),
    explicit = [];
  for (const [id, words] of Object.entries(ALIASES))
    for (const word of words) {
      if (
        new RegExp(
          "(?:^| )(?:без|не добавляй|исключи|without|no) (?:\\S+ ){0,1}" + word,
        ).test(t)
      )
        excluded.add(id);
      else if (t.split(" ").some((token) => token.startsWith(word)))
        explicit.push(id);
    }
  const contexts = CONTEXTS.map((c, index) => ({
    ...c,
    index,
    score: c.words.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0),
  }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const boosts = new Map();
  for (const m of METAPHORS)
    if (m.terms.some((term) => t.includes(term)))
      m.ids.forEach((id, i) => boosts.set(id, (boosts.get(id) || 0) + 5 - i));
  const ranked = OBJECTS.map((o, index) => ({
    ...o,
    index,
    score:
      (boosts.get(o.id) || 0) +
      (explicit.includes(o.id) ? 8 : 0) +
      o.tags.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0),
  }))
    .filter((o) => o.score > 0 && !excluded.has(o.id))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let ids = explicit.length
    ? [...new Set(explicit)].filter((id) => !excluded.has(id))
    : ranked.slice(0, 3).map((o) => o.id);
  const context = contexts[0];
  if (!ids.length && context)
    ids = context.main.filter((id) => !excluded.has(id)).slice(0, 2);
  if (ids.length === 1 && context && explicit.length === 0) {
    const support = [...context.main, ...context.support].find(
      (id) => !ids.includes(id) && !excluded.has(id),
    );
    if (support) ids.push(support);
  }
  if (!ids.length)
    return {
      ids: [],
      matched: false,
      backgroundIds: [],
      reason: "Для этой идеи нет уверенного соответствия в библиотеке",
    };
  const backgroundIds = context
    ? context.background.filter((id) => !ids.includes(id) && !excluded.has(id))
    : [];
  return {
    ids,
    matched: true,
    backgroundIds,
    reason: context
      ? context.reason
      : "Выбраны предметы, прямо названные в идее",
  };
}
export function pickObjects(text) {
  const { ids, matched } = analyzeIdea(text);
  return { ids, matched };
}
