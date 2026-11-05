// Dashboard view: card counts, progress per category, today's sessions,
// recent quizzes, and JSON export/import of all data.

import { validateImport } from '../validation.js';
import {
  cardStats,
  DAY_NAMES,
  formatMinutes,
  sessionsForDay,
  todayIndex,
  weeklyStudyMinutes,
} from '../logic.js';
import { byId, el } from './dom.js';

const RECENT_QUIZ_COUNT = 5;
const EXPORT_FILE_PREFIX = 'n4-study-hub-export';

// "2026-11-05" in local time, for the export file name
function localDateStamp(date = new Date()) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shortDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

export function createDashboardView(app) {
  const statTotal = byId('stat-total');
  const statNew = byId('stat-new');
  const statLearning = byId('stat-learning');
  const statKnown = byId('stat-known');
  const statWeek = byId('stat-week');
  const knownProgress = byId('known-progress');
  const knownProgressLabel = byId('known-progress-label');
  const categoryRows = byId('category-rows');
  const categoryEmpty = byId('category-empty');
  const todayTitle = byId('today-title');
  const todayList = byId('today-list');
  const todayEmpty = byId('today-empty');
  const quizList = byId('quiz-list');
  const quizEmpty = byId('quiz-empty');
  const exportButton = byId('export-button');
  const importButton = byId('import-button');
  const importFile = byId('import-file');
  const backupStatus = byId('backup-status');

  function renderStats() {
    const stats = cardStats(app.data.cards);
    statTotal.textContent = String(stats.total);
    statNew.textContent = String(stats.new);
    statLearning.textContent = String(stats.learning);
    statKnown.textContent = String(stats.known);
    statWeek.textContent = formatMinutes(weeklyStudyMinutes(app.data.sessions));

    knownProgress.value = stats.knownPercent;
    knownProgressLabel.textContent = `Known cards: ${stats.knownPercent}%`;

    categoryRows.replaceChildren(
      ...stats.byCategory.map(({ category, total, known }) => {
        const row = el('tr');
        row.append(el('td', '', category), el('td', '', String(total)), el('td', '', String(known)));
        return row;
      })
    );
    categoryEmpty.hidden = stats.byCategory.length > 0;
  }

  function renderToday() {
    const today = todayIndex();
    todayTitle.textContent = `Today (${DAY_NAMES[today]})`;
    const sessions = sessionsForDay(app.data.sessions, today);

    todayList.replaceChildren(
      ...sessions.map((session) => {
        const item = el('li', 'dash-list-item');
        const text = el('span', 'dash-list-text');
        text.append(
          el('strong', '', `${session.start}–${session.end}`),
          document.createTextNode(` ${session.title}`)
        );
        if (session.category) text.append(el('span', 'tag', session.category));
        item.append(text);

        if (session.category) {
          const studyLink = el('a', 'button', 'Study now');
          studyLink.href = `#review?cat=${encodeURIComponent(session.category)}`;
          studyLink.setAttribute('aria-label', `Study now: ${session.category}`);
          item.append(studyLink);
        }
        return item;
      })
    );
    todayEmpty.hidden = sessions.length > 0;
  }

  function renderQuizzes() {
    const recent = app.data.quizHistory.slice(0, RECENT_QUIZ_COUNT);
    quizList.replaceChildren(
      ...recent.map((result) => {
        const percent = Math.round((result.correct / result.total) * 100);
        const item = el('li', 'dash-list-item');
        const text = el('span', 'dash-list-text');
        text.append(
          el('strong', '', `${result.correct} / ${result.total} (${percent}%)`),
          document.createTextNode(` ${result.category ?? 'All categories'} · ${shortDate(result.date)}`)
        );
        item.append(text);
        return item;
      })
    );
    quizEmpty.hidden = recent.length > 0;
  }

  function render() {
    renderStats();
    renderToday();
    renderQuizzes();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(app.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${EXPORT_FILE_PREFIX}-${localDateStamp()}.json`;
    link.click();
    // Give the browser a moment to start the download before freeing the file
    setTimeout(() => URL.revokeObjectURL(url), 0);
    backupStatus.textContent = `Exported ${link.download}.`;
  }

  async function importData() {
    const file = importFile.files[0];
    if (!file) return;
    importFile.value = ''; // so choosing the same file again still triggers "change"

    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      backupStatus.textContent = 'This file is not valid JSON. Nothing was changed.';
      return;
    }

    const result = validateImport(parsed);
    if (!result.valid) {
      const more = result.errorCount > result.errors.length
        ? ` (and ${result.errorCount - result.errors.length} more problems)`
        : '';
      backupStatus.textContent =
        `This file can't be imported. Nothing was changed. ${result.errors.join(' ')}${more}`;
      return;
    }

    const { cards, sessions, quizHistory } = result.data;
    const summary = `${cards.length} cards, ${sessions.length} sessions, ${quizHistory.length} quiz results`;
    if (!confirm(`Replace ALL your current data with this file (${summary})? This cannot be undone.`)) {
      backupStatus.textContent = 'Import cancelled. Nothing was changed.';
      return;
    }

    const previousData = app.data;
    app.data = result.data;
    if (!app.save()) {
      app.data = previousData; // keep the old data if the new data could not be saved
      backupStatus.textContent = "Couldn't save the imported data. Nothing was changed.";
      return;
    }
    backupStatus.textContent = `Imported ${summary}.`;
    render();
  }

  exportButton.addEventListener('click', exportData);
  importButton.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importData);

  return {
    enter: render,
    leave() {},
  };
}
