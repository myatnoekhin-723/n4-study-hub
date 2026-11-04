// Pure app logic (no DOM), so tests.html can test it.

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
