// A tiny test harness. No libraries: test() registers a test,
// runAll() runs them and returns the results for tests.html to show.

import {
  normalizeText,
  canonicalCategory,
  toMinutes,
  validateCard,
  validateSession,
  findConflicts,
} from '../js/validation.js';
import { createStore, emptyData, DATA_KEY, BACKUP_PREFIX } from '../js/store.js';
import {
  createCard,
  listCategories,
  filterCards,
  reviewPool,
  shuffle,
  paginate,
  quizAvailability,
  buildQuizQuestion,
  buildQuiz,
  scoreQuiz,
  addQuizResult,
  QUIZ_LENGTH,
  QUIZ_HISTORY_LIMIT,
  todayIndex,
  timeSlot,
  sessionMinutes,
  sortSessions,
  GRID_SLOTS,
} from '../js/logic.js';
import { SEED_CARDS } from '../js/seed.js';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`.trim());
}

export function runAll() {
  return tests.map(({ name, fn }) => {
    try {
      fn();
      return { name, passed: true };
    } catch (error) {
      return { name, passed: false, error: error.message };
    }
  });
}

// ---------- Helpers ----------

// Behaves like localStorage, but lives in memory.
function fakeBackend(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

const validCard = { japanese: '勉強', reading: 'べんきょう', meaning: 'study', category: 'Nouns' };

const validSession = {
  title: 'Kanji drill',
  day: '0',
  start: '19:00',
  end: '20:30',
  category: '',
  note: '',
};

// ---------- normalizeText / canonicalCategory / toMinutes ----------

test('normalizeText trims and collapses spaces', () => {
  assertEqual(normalizeText('  to   go  '), 'to go');
});

test('normalizeText turns half-width katakana into full-width', () => {
  assertEqual(normalizeText('ﾍﾞﾝｷｮｳ'), 'ベンキョウ');
});

test('normalizeText turns a full-width space into a normal space', () => {
  assertEqual(normalizeText('a　b'), 'a b');
});

test('normalizeText handles null and undefined', () => {
  assertEqual(normalizeText(undefined), '');
  assertEqual(normalizeText(null), '');
});

test('canonicalCategory reuses the existing spelling', () => {
  assertEqual(canonicalCategory('verbs', ['Verbs', 'Nouns']), 'Verbs');
});

test('canonicalCategory keeps a new category as typed', () => {
  assertEqual(canonicalCategory(' Kanji ', ['Verbs']), 'Kanji');
});

test('toMinutes parses valid times and rejects invalid ones', () => {
  assertEqual(toMinutes('19:30'), 1170);
  assertEqual(toMinutes('00:00'), 0);
  assert(Number.isNaN(toMinutes('24:00')), '24:00 should be invalid');
  assert(Number.isNaN(toMinutes('7:00')), '7:00 should be invalid');
  assert(Number.isNaN(toMinutes('')), 'empty should be invalid');
});

// ---------- validateCard ----------

test('validateCard accepts a valid card', () => {
  const result = validateCard(validCard, []);
  assert(result.valid, JSON.stringify(result.errors));
});

test('validateCard requires every field', () => {
  const result = validateCard({ japanese: ' ', reading: '', meaning: '', category: '' }, []);
  assertEqual(Object.keys(result.errors).sort(), ['category', 'japanese', 'meaning', 'reading']);
});

test('validateCard rejects romaji and kanji in the reading', () => {
  assert(!validateCard({ ...validCard, reading: 'benkyou' }, []).valid, 'romaji accepted');
  assert(!validateCard({ ...validCard, reading: '勉強' }, []).valid, 'kanji accepted');
});

test('validateCard accepts katakana, ー and ・ in the reading', () => {
  assert(validateCard({ ...validCard, japanese: 'コーヒー', reading: 'コーヒー' }, []).valid);
  assert(validateCard({ ...validCard, japanese: '行', reading: 'い・こう' }, []).valid);
});

test('validateCard accepts a half-width katakana reading and stores it full-width', () => {
  const result = validateCard({ ...validCard, reading: 'ﾍﾞﾝｷｮｳ' }, []);
  assert(result.valid, JSON.stringify(result.errors));
  assertEqual(result.value.reading, 'ベンキョウ');
});

test('validateCard enforces maximum lengths', () => {
  const result = validateCard(
    { ...validCard, japanese: 'あ'.repeat(31), meaning: 'x'.repeat(61), category: 'c'.repeat(21) },
    []
  );
  assert(result.errors.japanese, 'japanese too long not caught');
  assert(result.errors.meaning, 'meaning too long not caught');
  assert(result.errors.category, 'category too long not caught');
});

test('validateCard rejects a duplicate Japanese + reading', () => {
  const existing = [{ id: 'a', ...validCard }];
  const result = validateCard({ ...validCard, meaning: 'learning' }, existing);
  assert(!result.valid);
  assert(result.errors.japanese.includes('already'), result.errors.japanese);
});

test('validateCard does not treat the card being edited as a duplicate', () => {
  const existing = [{ id: 'a', ...validCard }];
  assert(validateCard({ ...validCard, meaning: 'studying' }, existing, 'a').valid);
});

test('validateCard reuses an existing category spelling', () => {
  const existing = [{ id: 'a', ...validCard, japanese: '本', reading: 'ほん', category: 'Nouns' }];
  assertEqual(validateCard({ ...validCard, category: 'nouns' }, existing).value.category, 'Nouns');
});

test('validateCard lets you fix the capitals of your own category', () => {
  const existing = [{ id: 'a', ...validCard, category: 'nouns' }];
  assertEqual(validateCard({ ...validCard, category: 'Nouns' }, existing, 'a').value.category, 'Nouns');
});

// ---------- validateSession ----------

test('validateSession accepts a valid session', () => {
  const result = validateSession(validSession);
  assert(result.valid, JSON.stringify(result.errors));
  assertEqual(result.value.day, 0);
  assertEqual(result.value.category, null);
});

test('validateSession requires a title', () => {
  assert(validateSession({ ...validSession, title: '  ' }).errors.title);
});

test('validateSession requires a day from 0 to 6', () => {
  assert(validateSession({ ...validSession, day: '' }).errors.day, 'empty day accepted');
  assert(validateSession({ ...validSession, day: '7' }).errors.day, 'day 7 accepted');
  assert(validateSession({ ...validSession, day: '1.5' }).errors.day, 'day 1.5 accepted');
});

test('validateSession requires 15-minute steps', () => {
  assert(validateSession({ ...validSession, start: '19:10' }).errors.start);
});

test('validateSession keeps sessions between 06:00 and 23:00', () => {
  assert(validateSession({ ...validSession, start: '05:45' }).errors.start, 'early start accepted');
  assert(validateSession({ ...validSession, start: '22:00', end: '23:15' }).errors.end, 'late end accepted');
  assert(validateSession({ ...validSession, start: '22:45', end: '23:00' }).valid, '22:45–23:00 rejected');
});

test('validateSession requires end after start', () => {
  assert(validateSession({ ...validSession, start: '20:00', end: '20:00' }).errors.end);
  assert(validateSession({ ...validSession, start: '20:00', end: '19:00' }).errors.end);
});

test('validateSession allows at most 4 hours', () => {
  assert(validateSession({ ...validSession, start: '08:00', end: '12:00' }).valid, '4h rejected');
  assert(validateSession({ ...validSession, start: '08:00', end: '12:15' }).errors.end, '4h15 accepted');
});

test('validateSession allows a category with no cards (orphan)', () => {
  const result = validateSession({ ...validSession, category: 'Deleted category' });
  assert(result.valid, JSON.stringify(result.errors));
  assertEqual(result.value.category, 'Deleted category');
});

test('validateSession limits the note to 200 characters', () => {
  assert(validateSession({ ...validSession, note: 'x'.repeat(201) }).errors.note);
});

// ---------- store ----------

test('store seeds on the first visit and saves it', () => {
  const backend = fakeBackend();
  const seedData = { ...emptyData(), cards: [{ id: 's1' }] };
  const result = createStore(backend, { seed: () => seedData }).load();
  assert(result.seeded, 'not seeded');
  assertEqual(result.data.cards.length, 1);
  assert(backend.map.has(DATA_KEY), 'seed not saved');
});

test('store round-trips data', () => {
  const backend = fakeBackend();
  const store = createStore(backend);
  const data = { ...emptyData(), cards: [{ id: 'x', japanese: '本' }] };
  assert(store.save(data).ok);
  assertEqual(store.load().data, data);
});

test('store does not reseed when the user has deleted every card', () => {
  const backend = fakeBackend({ [DATA_KEY]: JSON.stringify(emptyData()) });
  const result = createStore(backend, { seed: () => ({ ...emptyData(), cards: [{ id: 's1' }] }) }).load();
  assert(!result.seeded, 'reseeded');
  assertEqual(result.data.cards.length, 0);
});

test('store backs up corrupted JSON and does NOT seed', () => {
  const backend = fakeBackend({ [DATA_KEY]: '{not json' });
  const fixedNow = new Date('2026-11-05T10:00:00.000Z');
  const result = createStore(backend, {
    seed: () => ({ ...emptyData(), cards: [{ id: 's1' }] }),
    now: () => fixedNow,
  }).load();
  assert(!result.seeded, 'seeded over corrupted data');
  assertEqual(result.data.cards.length, 0);
  assert(result.warning, 'no warning');
  assertEqual(backend.getItem(BACKUP_PREFIX + fixedNow.toISOString()), '{not json');
});

test('store backs up data with the wrong shape or schema version', () => {
  const raw = JSON.stringify({ schemaVersion: 2, cards: [], sessions: [], quizHistory: [] });
  const backend = fakeBackend({ [DATA_KEY]: raw });
  const result = createStore(backend).load();
  assert(result.warning, 'no warning');
  const backupKeys = [...backend.map.keys()].filter((key) => key.startsWith(BACKUP_PREFIX));
  assertEqual(backupKeys.length, 1);
});

test('store.save reports failure instead of throwing when storage is full', () => {
  const backend = fakeBackend();
  backend.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  const result = createStore(backend).save(emptyData());
  assert(!result.ok);
  assert(result.error.includes("Couldn't save"));
});

test('store.load works when storage is blocked', () => {
  const backend = {
    getItem: () => {
      throw new Error('SecurityError');
    },
  };
  const result = createStore(backend).load();
  assert(result.warning, 'no warning');
  assertEqual(result.data, emptyData());
});

// ---------- logic: cards ----------

test('createCard starts as "new" with matching timestamps', () => {
  const card = createCard(validCard, 'id1', '2026-11-05T10:00:00.000Z');
  assertEqual(card.status, 'new');
  assertEqual(card.id, 'id1');
  assertEqual(card.createdAt, card.updatedAt);
  assertEqual(card.japanese, '勉強');
});

test('listCategories returns each category once, sorted', () => {
  const cards = [{ category: 'Verbs' }, { category: 'Adjectives' }, { category: 'Verbs' }];
  assertEqual(listCategories(cards), ['Adjectives', 'Verbs']);
});

// ---------- logic: filterCards ----------

const filterSample = [
  { japanese: '勉強', reading: 'べんきょう', meaning: 'Study', category: 'Nouns' },
  { japanese: '運ぶ', reading: 'はこぶ', meaning: 'to carry', category: 'Verbs' },
  { japanese: '調べる', reading: 'しらべる', meaning: 'to look up', category: 'Verbs' },
];

test('filterCards with no filters returns everything', () => {
  assertEqual(filterCards(filterSample).length, 3);
});

test('filterCards by category', () => {
  assertEqual(filterCards(filterSample, { category: 'Verbs' }).length, 2);
});

test('filterCards searches meaning ignoring case', () => {
  assertEqual(filterCards(filterSample, { search: 'STUDY' }).map((c) => c.japanese), ['勉強']);
});

test('filterCards searches Japanese and reading', () => {
  assertEqual(filterCards(filterSample, { search: '運' }).length, 1);
  assertEqual(filterCards(filterSample, { search: 'しらべ' }).length, 1);
});

test('filterCards combines category and search', () => {
  assertEqual(filterCards(filterSample, { category: 'Nouns', search: 'carry' }).length, 0);
  assertEqual(filterCards(filterSample, { category: 'Verbs', search: 'carry' }).length, 1);
});

test('filterCards ignores a blank search', () => {
  assertEqual(filterCards(filterSample, { search: '   ' }).length, 3);
});

// ---------- seed deck ----------

test('every seed card passes validation and none are duplicates', () => {
  const accepted = [];
  SEED_CARDS.forEach((card, index) => {
    const result = validateCard(card, accepted);
    assert(result.valid, `seed #${index} ${card.japanese}: ${JSON.stringify(result.errors)}`);
    accepted.push({ id: String(index), ...result.value });
  });
});

test('seed deck has at least 4 different meanings (needed for the quiz)', () => {
  assert(new Set(SEED_CARDS.map((card) => card.meaning)).size >= 4);
});

// ---------- logic: review ----------

const reviewSample = [
  { id: '1', category: 'Verbs', status: 'new' },
  { id: '2', category: 'Verbs', status: 'known' },
  { id: '3', category: 'Nouns', status: 'learning' },
];

test('reviewPool skips known cards by default', () => {
  assertEqual(reviewPool(reviewSample).map((c) => c.id), ['1', '3']);
});

test('reviewPool includes known cards when asked', () => {
  assertEqual(reviewPool(reviewSample, { includeKnown: true }).length, 3);
});

test('reviewPool filters by category', () => {
  assertEqual(reviewPool(reviewSample, { category: 'Verbs' }).map((c) => c.id), ['1']);
  assertEqual(reviewPool(reviewSample, { category: 'Missing' }).length, 0);
});

test('shuffle keeps every item and does not change the original', () => {
  const items = [1, 2, 3, 4, 5];
  const shuffled = shuffle(items);
  assertEqual([...shuffled].sort(), [1, 2, 3, 4, 5]);
  assertEqual(items, [1, 2, 3, 4, 5]);
});

test('shuffle uses the random function it is given', () => {
  // random() always 0 -> every swap is with index 0
  assertEqual(shuffle([1, 2, 3], () => 0), [2, 3, 1]);
});

// ---------- logic: paginate ----------

const thirtyItems = Array.from({ length: 30 }, (_, i) => i + 1);

test('paginate returns the first 15 items on page 1', () => {
  const result = paginate(thirtyItems, 1, 15);
  assertEqual(result.items.length, 15);
  assertEqual(result.items[0], 1);
  assertEqual(result.totalPages, 2);
  assertEqual(result.start, 0);
});

test('paginate returns a partial last page', () => {
  const result = paginate(thirtyItems.slice(0, 16), 2, 15);
  assertEqual(result.items, [16]);
  assertEqual(result.start, 15);
});

test('paginate moves an out-of-range page into range', () => {
  assertEqual(paginate(thirtyItems, 5, 15).page, 2);
  assertEqual(paginate(thirtyItems, 0, 15).page, 1);
  assertEqual(paginate(thirtyItems, NaN, 15).page, 1);
});

test('paginate an empty list gives 1 empty page', () => {
  const result = paginate([], 3, 15);
  assertEqual(result.items, []);
  assertEqual(result.page, 1);
  assertEqual(result.totalPages, 1);
});

// ---------- logic: quiz ----------

function quizCard(id, meaning, category = 'Verbs') {
  return { id, japanese: `語${id}`, reading: 'ご', meaning, category, status: 'new' };
}

const quizDeck = [
  quizCard('1', 'to go'),
  quizCard('2', 'to come'),
  quizCard('3', 'to eat', 'Nouns'),
  quizCard('4', 'to drink', 'Nouns'),
  quizCard('5', 'to see', 'Nouns'),
];

test('quizAvailability: ok when the deck has 4+ different meanings', () => {
  const result = quizAvailability(quizDeck, 'Verbs');
  assert(result.ok, result.reason);
  assertEqual(result.questionCount, 2);
});

test('quizAvailability: empty category is not ok', () => {
  const result = quizAvailability(quizDeck, 'Missing');
  assert(!result.ok);
  assert(result.reason.includes('Missing'), result.reason);
});

test('quizAvailability: fewer than 4 different meanings is not ok', () => {
  const deck = [quizCard('1', 'to go'), quizCard('2', 'To Go'), quizCard('3', 'to come'), quizCard('4', 'to eat')];
  assert(!quizAvailability(deck).ok);
});

test('quizAvailability: at most QUIZ_LENGTH questions', () => {
  const deck = Array.from({ length: 25 }, (_, i) => quizCard(String(i), `meaning ${i}`));
  assertEqual(quizAvailability(deck).questionCount, QUIZ_LENGTH);
});

test('buildQuizQuestion: 4 different choices including the answer', () => {
  const question = buildQuizQuestion(quizDeck[0], quizDeck);
  assertEqual(question.choices.length, 4);
  assert(question.choices.includes('to go'), 'answer missing');
  assertEqual(new Set(question.choices).size, 4);
});

test('buildQuizQuestion: never repeats a meaning shared by two cards', () => {
  const deck = [
    quizCard('1', 'to go'),
    quizCard('2', 'to go'),
    quizCard('3', ' TO GO '),
    quizCard('4', 'to come'),
    quizCard('5', 'to eat'),
    quizCard('6', 'to see'),
  ];
  for (let round = 0; round < 20; round++) {
    const keys = buildQuizQuestion(deck[0], deck).choices.map((choice) => choice.trim().toLowerCase());
    assertEqual(new Set(keys).size, keys.length, `round ${round}:`);
    assertEqual(keys.length, 4);
  }
});

test('buildQuiz: questions only from the chosen category', () => {
  const quiz = buildQuiz(quizDeck, 'Nouns');
  assertEqual(quiz.length, 3);
  assert(quiz.every((question) => ['3', '4', '5'].includes(question.cardId)));
});

test('scoreQuiz counts correct answers', () => {
  const questions = [{ answer: 'a' }, { answer: 'b' }, { answer: 'c' }, { answer: 'd' }];
  assertEqual(scoreQuiz(questions, ['a', 'x', 'c', undefined]), { correct: 2, total: 4, percent: 50 });
  assertEqual(scoreQuiz([], []), { correct: 0, total: 0, percent: 0 });
});

test('addQuizResult keeps the newest QUIZ_HISTORY_LIMIT results, newest first', () => {
  let history = [];
  for (let i = 1; i <= QUIZ_HISTORY_LIMIT + 5; i++) history = addQuizResult(history, { id: String(i) });
  assertEqual(history.length, QUIZ_HISTORY_LIMIT);
  assertEqual(history[0].id, String(QUIZ_HISTORY_LIMIT + 5));
});

// ---------- logic: timetable ----------

test('todayIndex maps Monday to 0 and Sunday to 6', () => {
  assertEqual(todayIndex(new Date(2026, 10, 2)), 0); // Mon 2 Nov 2026
  assertEqual(todayIndex(new Date(2026, 10, 7)), 5); // Sat
  assertEqual(todayIndex(new Date(2026, 10, 8)), 6); // Sun
});

test('timeSlot counts 15-minute rows from 06:00', () => {
  assertEqual(timeSlot('06:00'), 0);
  assertEqual(timeSlot('06:15'), 1);
  assertEqual(timeSlot('19:30'), 54);
  assertEqual(timeSlot('23:00'), GRID_SLOTS);
  assertEqual(GRID_SLOTS, 68);
});

test('sessionMinutes gives the length', () => {
  assertEqual(sessionMinutes({ start: '19:00', end: '20:30' }), 90);
});

test('sortSessions orders by day then start time', () => {
  const sorted = sortSessions([
    { id: 'c', day: 2, start: '08:00' },
    { id: 'b', day: 0, start: '19:00' },
    { id: 'a', day: 0, start: '07:00' },
  ]);
  assertEqual(sorted.map((s) => s.id), ['a', 'b', 'c']);
});

// ---------- findConflicts ----------

const mondayDrill = { id: 'a', day: 0, start: '19:00', end: '20:00', title: 'Drill' };

test('findConflicts: overlapping times on the same day clash', () => {
  const clashes = findConflicts([mondayDrill], { day: 0, start: '19:30', end: '20:30' });
  assertEqual(clashes.map((s) => s.id), ['a']);
});

test('findConflicts: a session inside another clashes', () => {
  assertEqual(findConflicts([mondayDrill], { day: 0, start: '19:15', end: '19:45' }).length, 1);
  assertEqual(findConflicts([mondayDrill], { day: 0, start: '18:00', end: '21:00' }).length, 1);
});

test('findConflicts: back-to-back sessions do not clash', () => {
  assertEqual(findConflicts([mondayDrill], { day: 0, start: '20:00', end: '21:00' }).length, 0);
  assertEqual(findConflicts([mondayDrill], { day: 0, start: '18:00', end: '19:00' }).length, 0);
});

test('findConflicts: same times on another day do not clash', () => {
  assertEqual(findConflicts([mondayDrill], { day: 1, start: '19:00', end: '20:00' }).length, 0);
});

test('findConflicts: a session never clashes with itself when edited', () => {
  assertEqual(findConflicts([mondayDrill], { day: 0, start: '19:00', end: '20:00' }, 'a').length, 0);
});
