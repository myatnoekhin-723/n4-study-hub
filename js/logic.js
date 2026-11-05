// Pure app logic (no DOM), so tests.html can test it.

import { normalizeText } from './validation.js';

export const STATUS_LABELS = {
  new: 'New',
  learning: 'Still learning',
  known: 'Known',
};

// value: the cleaned fields from validateCard().value
export function createCard(value, id, nowIso) {
  return { id, ...value, status: 'new', createdAt: nowIso, updatedAt: nowIso };
}

// Distinct categories, sorted A–Z.
export function listCategories(cards) {
  return [...new Set(cards.map((card) => card.category))].sort((a, b) => a.localeCompare(b));
}

// category: exact category name, or '' for all.
// search: matched against Japanese, reading and meaning, ignoring case.
export function filterCards(cards, { category = '', search = '' } = {}) {
  const query = normalizeText(search).toLowerCase();
  return cards.filter((card) => {
    if (category && card.category !== category) return false;
    if (!query) return true;
    return [card.japanese, card.reading, card.meaning].some((text) =>
      text.toLowerCase().includes(query)
    );
  });
}

// Cards for a review round. Known cards are skipped unless includeKnown is true.
export function reviewPool(cards, { category = '', includeKnown = false } = {}) {
  return cards.filter(
    (card) =>
      (!category || card.category === category) && (includeKnown || card.status !== 'known')
  );
}

// Returns a shuffled copy (Fisher–Yates). random can be replaced in tests.
export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const CARDS_PER_PAGE = 15;

// Returns one page of items. An out-of-range page is moved into range,
// e.g. after deleting the last card on the last page.
export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, totalPages, start };
}

// ---------- Quiz ----------

export const QUIZ_LENGTH = 10;
export const QUIZ_CHOICES = 4;
export const QUIZ_HISTORY_LIMIT = 20;

// Two meanings count as the same choice if they differ only in case or spacing.
function meaningKey(meaning) {
  return normalizeText(meaning).toLowerCase();
}

function countDistinctMeanings(cards) {
  return new Set(cards.map((card) => meaningKey(card.meaning))).size;
}

// Can a quiz run for this category ('' = all)? Returns { ok, reason, questionCount }.
// Questions come from the category, but wrong answers come from the whole deck,
// so a small category still works.
export function quizAvailability(cards, category = '') {
  const pool = cards.filter((card) => !category || card.category === category);
  if (pool.length === 0) {
    const reason = category
      ? `There are no cards in "${category}" to quiz on.`
      : 'You have no cards yet. Add some on the Flashcards page.';
    return { ok: false, reason, questionCount: 0 };
  }
  if (countDistinctMeanings(cards) < QUIZ_CHOICES) {
    return {
      ok: false,
      reason: `The quiz needs at least ${QUIZ_CHOICES} cards with different meanings.`,
      questionCount: 0,
    };
  }
  return { ok: true, reason: '', questionCount: Math.min(QUIZ_LENGTH, pool.length) };
}

// One multiple-choice question: the card's meaning plus up to 3 wrong meanings
// from the whole deck. Choices never repeat, even when two cards share a meaning.
export function buildQuizQuestion(card, allCards, random = Math.random) {
  const usedKeys = new Set([meaningKey(card.meaning)]);
  const wrongChoices = [];
  for (const other of shuffle(allCards, random)) {
    if (wrongChoices.length === QUIZ_CHOICES - 1) break;
    const key = meaningKey(other.meaning);
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      wrongChoices.push(other.meaning);
    }
  }
  return {
    cardId: card.id,
    prompt: card.japanese,
    reading: card.reading,
    answer: card.meaning,
    choices: shuffle([card.meaning, ...wrongChoices], random),
  };
}

export function buildQuiz(cards, category = '', random = Math.random) {
  const pool = cards.filter((card) => !category || card.category === category);
  return shuffle(pool, random)
    .slice(0, QUIZ_LENGTH)
    .map((card) => buildQuizQuestion(card, cards, random));
}

// pickedChoices[i] is the choice text picked for questions[i].
export function scoreQuiz(questions, pickedChoices) {
  const correct = questions.filter((question, i) => pickedChoices[i] === question.answer).length;
  const total = questions.length;
  return { correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 100) };
}

// Newest first, keeping only the latest QUIZ_HISTORY_LIMIT results.
export function addQuizResult(history, result) {
  return [result, ...history].slice(0, QUIZ_HISTORY_LIMIT);
}
