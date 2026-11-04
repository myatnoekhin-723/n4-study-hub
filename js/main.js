// Entry point. This is the ONLY module with side effects on import.
// tests.html must never import this file.

const VIEWS = ['cards', 'review', 'timetable', 'dashboard'];
const DEFAULT_VIEW = 'cards';

// Each view can register { enter(params), leave() }.
// enter() runs when the view is shown, leave() when the user navigates away
// (e.g. to throw away an unfinished quiz). Filled in on later days.
const viewHandlers = {};

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
