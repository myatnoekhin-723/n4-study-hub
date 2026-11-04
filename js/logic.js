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
