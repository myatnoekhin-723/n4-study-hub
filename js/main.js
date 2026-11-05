// Entry point. This is the ONLY module with side effects on import.
// tests.html must never import this file.

import { createStore, emptyData } from './store.js';
import { createCard } from './logic.js';
import { SEED_CARDS } from './seed.js';
import { createCardsView } from './views/cards.js';
import { createReviewView } from './views/review.js';
import { createTimetableView } from './views/timetable.js';
import { createDashboardView } from './views/dashboard.js';

const VIEWS = ['cards', 'review', 'timetable', 'dashboard'];
const DEFAULT_VIEW = 'cards';

// ---------- Banner ----------

const banner = document.getElementById('banner');
const bannerText = document.getElementById('banner-text');

function showBanner(message) {
  bannerText.textContent = message;
  banner.hidden = false;
}

document.getElementById('banner-close').addEventListener('click', () => {
  banner.hidden = true;
});

// ---------- Data ----------

// Even reading window.localStorage can throw when the browser blocks storage.
// store.load() handles a broken backend, so null is fine here.
let backend = null;
try {
  backend = window.localStorage;
} catch {
  backend = null;
}

// Used only on the very first visit (when there is no saved data at all).
function createSeedData() {
  const now = new Date().toISOString();
  return {
    ...emptyData(),
    cards: SEED_CARDS.map((card) => createCard(card, crypto.randomUUID(), now)),
  };
}

const store = createStore(backend, { seed: createSeedData });
const loaded = store.load();
if (loaded.warning) showBanner(loaded.warning);

// Shared by every view. Views change app.data, then call app.save().
const app = {
  data: loaded.data,
  save() {
    const result = store.save(app.data);
    if (!result.ok) showBanner(result.error);
    return result.ok;
  },
  showBanner,
};

// ---------- Router ----------

// Each view registers { enter(params), leave() }.
// enter() runs when the view is shown, leave() when the user navigates away
// (e.g. to throw away an unfinished quiz).
const viewHandlers = {
  cards: createCardsView(app),
  review: createReviewView(app),
  timetable: createTimetableView(app),
  dashboard: createDashboardView(app),
};

let currentView = null;

// "#review?cat=Verbs" -> { view: 'review', params: URLSearchParams('cat=Verbs') }
// Unknown views fall back to the default view.
function parseHash(hash) {
  const [rawView, query = ''] = hash.replace(/^#/, '').split('?');
  const view = VIEWS.includes(rawView) ? rawView : DEFAULT_VIEW;
  return { view, params: new URLSearchParams(query) };
}

function showView() {
  const { view, params } = parseHash(location.hash);

  if (currentView && currentView !== view) {
    viewHandlers[currentView]?.leave?.();
  }

  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });

  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === view) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  currentView = view;
  viewHandlers[view]?.enter?.(params);
}

window.addEventListener('hashchange', showView);
showView();
