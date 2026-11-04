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
