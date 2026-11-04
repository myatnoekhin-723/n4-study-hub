// A tiny test harness. No libraries: test() registers a test,
// runAll() runs them and returns the results for tests.html to show.

import {
  normalizeText,
  canonicalCategory,
  toMinutes,
  validateCard,
  validateSession,
} from '../js/validation.js';
import { createStore, emptyData, DATA_KEY, BACKUP_PREFIX } from '../js/store.js';

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
