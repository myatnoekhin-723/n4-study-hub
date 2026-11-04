// Loading and saving all app data under ONE localStorage key.
// One key means one setItem per save, so a save can never be half done.
//
// createStore takes the storage "backend" as a parameter. The app passes
// window.localStorage; tests pass a fake in-memory object, so tests never
// touch your real data.

export const DATA_KEY = 'n4hub.data';
export const BACKUP_PREFIX = 'n4hub.backup.';
export const SCHEMA_VERSION = 1;

export function emptyData() {
  return { schemaVersion: SCHEMA_VERSION, cards: [], sessions: [], quizHistory: [] };
}

export function hasValidShape(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    data.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(data.cards) &&
    Array.isArray(data.sessions) &&
    Array.isArray(data.quizHistory)
  );
}

// options.seed: function returning the data to use on the very first visit.
// options.now: function returning the current Date (tests can fix the time).
export function createStore(backend, { seed = emptyData, now = () => new Date() } = {}) {
  // Returns { ok, error }. Never throws.
  function save(data) {
    try {
      backend.setItem(DATA_KEY, JSON.stringify(data));
      return { ok: true, error: null };
    } catch {
      return {
        ok: false,
        error: "Couldn't save. Your browser storage may be full or blocked.",
      };
    }
  }

  // Returns { data, warning, seeded }. Never throws.
  function load() {
    let raw;
    try {
      raw = backend.getItem(DATA_KEY);
    } catch {
      return {
        data: seed(),
        warning: 'Your browser is blocking storage, so changes will not be kept after you close this page.',
        seeded: true,
      };
    }

    // First visit: the key does not exist at all. Only now do we seed.
    if (raw === null) {
      const data = seed();
      const result = save(data);
      return { data, warning: result.ok ? null : result.error, seeded: true };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (hasValidShape(parsed)) {
      return { data: parsed, warning: null, seeded: false };
    }

    // The key exists but can't be used. Do NOT seed (that would hide the
    // problem) and do NOT throw the old text away: copy it to a backup key.
    const backupKey = BACKUP_PREFIX + now().toISOString();
    const data = emptyData();
    try {
      backend.setItem(backupKey, raw);
      save(data);
      return {
        data,
        warning: `Your saved data could not be read, so the app started empty. The old data was copied to "${backupKey}" in localStorage.`,
        seeded: false,
      };
    } catch {
      return {
        data,
        warning: 'Your saved data could not be read, and there was no room to back it up. Export anything important before adding new data.',
        seeded: false,
      };
    }
  }

  return { load, save };
}
