// Pure validation helpers. Nothing in this file touches the DOM,
// so tests.html can test every rule directly.

// Hiragana (U+3040–309F), katakana (U+30A0–30FF, includes ー and ・) and spaces.
export const READING_PATTERN = /^[぀-ゟ゠-ヿ\s]+$/;

export const LIMITS = {
  japanese: 30,
  reading: 40,
  meaning: 60,
  category: 20,
  title: 40,
  note: 200,
};

// Timetable rules, in minutes since midnight
export const DAY_START = 6 * 60; // 06:00
export const DAY_END = 23 * 60; // 23:00
export const SLOT_MINUTES = 15;
export const MAX_SESSION_MINUTES = 4 * 60;

// NFKC turns half-width katakana (ｶ) into full-width (カ) and full-width
// spaces/letters into normal ones. Then collapse runs of spaces and trim.
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

// Count characters, not UTF-16 code units, so rare kanji count as 1.
function charCount(text) {
  return Array.from(text).length;
}

function checkText(errors, field, label, value, { required = true } = {}) {
  const max = LIMITS[field];
  if (required && value === '') {
    errors[field] = `${label} is required.`;
  } else if (charCount(value) > max) {
    errors[field] = `${label} must be ${max} characters or fewer.`;
  }
}

// If a category already exists with different capitals ("verbs" vs "Verbs"),
// reuse the existing spelling so we never end up with two categories.
export function canonicalCategory(name, existingCategories) {
  const clean = normalizeText(name);
  const match = existingCategories.find(
    (existing) => existing.toLowerCase() === clean.toLowerCase()
  );
  return match ?? clean;
}

// "19:30" -> 1170. Returns NaN for anything that isn't a valid HH:MM time.
export function toMinutes(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time ?? '').trim());
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Returns { valid, errors, value }.
// errors: { fieldName: message }. value: the cleaned-up card fields to save.
// editingId: the id of the card being edited, so it isn't a duplicate of itself.
export function validateCard(input, cards = [], editingId = null) {
  const otherCards = cards.filter((card) => card.id !== editingId);
  const otherCategories = [...new Set(otherCards.map((card) => card.category))];

  const value = {
    japanese: normalizeText(input.japanese),
    reading: normalizeText(input.reading),
    meaning: normalizeText(input.meaning),
    category: canonicalCategory(input.category, otherCategories),
  };
  const errors = {};

  checkText(errors, 'japanese', 'Japanese', value.japanese);
  checkText(errors, 'reading', 'Reading', value.reading);
  checkText(errors, 'meaning', 'Meaning', value.meaning);
  checkText(errors, 'category', 'Category', value.category);

  if (!errors.reading && !READING_PATTERN.test(value.reading)) {
    errors.reading = 'Reading must be hiragana or katakana only.';
  }

  if (!errors.japanese && !errors.reading) {
    const duplicate = otherCards.find(
      (card) => card.japanese === value.japanese && card.reading === value.reading
    );
    if (duplicate) {
      errors.japanese = `You already have a card for ${value.japanese} (${value.reading}).`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, value };
}

// Returns { valid, errors, value } like validateCard.
// Overlap with other sessions is checked separately (findConflicts, Day 8).
export function validateSession(input) {
  const rawDay = input.day;
  const value = {
    title: normalizeText(input.title),
    day: rawDay === '' || rawDay == null ? NaN : Number(rawDay),
    start: String(input.start ?? '').trim(),
    end: String(input.end ?? '').trim(),
    // An empty category means "not linked". A category with no cards left
    // is still allowed, so a session never gets stuck after cards are deleted.
    category: normalizeText(input.category) || null,
    note: normalizeText(input.note),
  };
  const errors = {};

  checkText(errors, 'title', 'Title', value.title);
  checkText(errors, 'note', 'Note', value.note, { required: false });
  if (value.category !== null) {
    checkText(errors, 'category', 'Category', value.category);
  }

  if (!Number.isInteger(value.day) || value.day < 0 || value.day > 6) {
    errors.day = 'Choose a day.';
  }

  const start = toMinutes(value.start);
  const end = toMinutes(value.end);

  if (Number.isNaN(start)) {
    errors.start = 'Enter a start time (HH:MM).';
  } else if (start % SLOT_MINUTES !== 0) {
    errors.start = 'Use 15-minute steps, e.g. 19:00 or 19:15.';
  } else if (start < DAY_START || start >= DAY_END) {
    errors.start = 'Start must be between 06:00 and 22:45.';
  }

  if (Number.isNaN(end)) {
    errors.end = 'Enter an end time (HH:MM).';
  } else if (end % SLOT_MINUTES !== 0) {
    errors.end = 'Use 15-minute steps, e.g. 20:00 or 20:15.';
  } else if (end <= DAY_START || end > DAY_END) {
    errors.end = 'End must be between 06:15 and 23:00.';
  }

  if (!errors.start && !errors.end) {
    if (end <= start) {
      errors.end = 'End must be after start.';
    } else if (end - start > MAX_SESSION_MINUTES) {
      errors.end = 'A session can be at most 4 hours.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, value };
}
