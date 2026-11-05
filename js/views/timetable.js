// Timetable view: one repeating week (Mon–Sun, 06:00–23:00) drawn as a CSS grid.
// Each 15-minute slot is one grid row, so a session is placed with
// grid-row: startSlot / endSlot. No pixel maths needed.

import { validateSession } from '../validation.js';
import {
  DAY_NAMES,
  GRID_SLOTS,
  listCategories,
  sessionMinutes,
  timeSlot,
  todayIndex,
} from '../logic.js';
import { byId, el, fillSelect, showFieldErrors } from './dom.js';

const FIELDS = ['title', 'day', 'start', 'end', 'category', 'note'];
const FIRST_HOUR = 6;
const SLOTS_PER_HOUR = 4;
// Sessions shorter than this are too low for 2 lines, so they use one line
const SHORT_SESSION_MINUTES = 45;
// Only sessions at least this long have room for a third line (the category)
const CATEGORY_LINE_MINUTES = 60;

// Grid row 1 holds the day names, and column 1 the hour labels.
const HEADER_ROWS = 1;
const LABEL_COLUMNS = 1;

export function createTimetableView(app) {
  const form = byId('session-form');
  const formTitle = byId('session-form-title');
  const submitButton = byId('session-submit');
  const cancelButton = byId('session-cancel');
  const deleteButton = byId('session-delete');
  const formStatus = byId('session-form-status');
  const categorySelect = byId('session-category');
  const grid = byId('timetable-grid');

  // id of the session in the form, or null when adding a new session
  let editingId = null;

  function readForm() {
    return Object.fromEntries(FIELDS.map((field) => [field, form.elements[field].value]));
  }

  function renderCategoryOptions(selected = '') {
    fillSelect(
      categorySelect,
      [
        { value: '', label: 'None' },
        ...listCategories(app.data.cards).map((category) => ({ value: category, label: category })),
      ],
      selected
    );
  }

  function resetForm() {
    editingId = null;
    form.reset();
    form.elements.day.value = String(todayIndex());
    renderCategoryOptions();
    showFieldErrors(form, FIELDS, {}, 'session-');
    formTitle.textContent = 'Add a study session';
    submitButton.textContent = 'Add session';
    cancelButton.hidden = true;
    deleteButton.hidden = true;
  }

  function startEdit(session) {
    editingId = session.id;
    form.elements.title.value = session.title;
    form.elements.day.value = String(session.day);
    form.elements.start.value = session.start;
    form.elements.end.value = session.end;
    form.elements.note.value = session.note;
    renderCategoryOptions(session.category ?? '');
    showFieldErrors(form, FIELDS, {}, 'session-');
    formTitle.textContent = `Edit session: ${session.title}`;
    submitButton.textContent = 'Save changes';
    cancelButton.hidden = false;
    deleteButton.hidden = false;
    formStatus.textContent = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.title.focus();
  }

  function onSubmit(event) {
    event.preventDefault();
    const result = validateSession(readForm());
    showFieldErrors(form, FIELDS, result.errors, 'session-');
    if (!result.valid) {
      formStatus.textContent = '';
      return;
    }

    const editingSession = app.data.sessions.find((session) => session.id === editingId);
    if (editingSession) {
      Object.assign(editingSession, result.value);
      formStatus.textContent = `Saved ${editingSession.title}.`;
    } else {
      app.data.sessions.push({ id: crypto.randomUUID(), ...result.value });
      formStatus.textContent = `Added ${result.value.title}.`;
    }
    app.save();
    resetForm();
    renderGrid();
  }

  function onCancel() {
    resetForm();
    formStatus.textContent = 'Edit cancelled.';
  }

  function onDelete() {
    const session = app.data.sessions.find((other) => other.id === editingId);
    if (!session) return;
    if (!confirm(`Remove the session ${session.title} (${DAY_NAMES[session.day]} ${session.start}–${session.end})?`)) return;
    app.data.sessions = app.data.sessions.filter((other) => other.id !== session.id);
    app.save();
    resetForm();
    formStatus.textContent = `Removed ${session.title}.`;
    renderGrid();
  }

  function onGridClick(event) {
    const block = event.target.closest('button[data-id]');
    if (!block) return;
    const session = app.data.sessions.find((other) => other.id === block.dataset.id);
    if (session) startEdit(session);
  }

  function placeAt(node, column, rowStart, rowEnd) {
    node.style.gridColumn = String(column);
    node.style.gridRow = `${rowStart} / ${rowEnd}`;
    return node;
  }

  function renderSession(session) {
    const minutes = sessionMinutes(session);
    const isShort = minutes < SHORT_SESSION_MINUTES;
    const block = el('button', `tt-session${isShort ? ' is-short' : ''}`);
    block.type = 'button';
    block.dataset.id = session.id;
    const label = `${session.title}, ${DAY_NAMES[session.day]} ${session.start}–${session.end}`;
    block.setAttribute('aria-label', `Edit ${label}`);
    block.title = label;
    block.append(
      el('span', 'tt-session-title', session.title),
      el('span', 'tt-session-time', `${session.start}–${session.end}`)
    );
    if (session.category && minutes >= CATEGORY_LINE_MINUTES) {
      block.append(el('span', 'tt-session-category', session.category));
    }
    return placeAt(
      block,
      session.day + LABEL_COLUMNS + 1,
      timeSlot(session.start) + HEADER_ROWS + 1,
      timeSlot(session.end) + HEADER_ROWS + 1
    );
  }

  function renderGrid() {
    const today = todayIndex();
    const nodes = [el('div', 'tt-corner')];

    DAY_NAMES.forEach((name, day) => {
      const header = el('div', `tt-day-header${day === today ? ' is-today' : ''}`, name);
      nodes.push(placeAt(header, day + LABEL_COLUMNS + 1, 1, 2));
      // Background column with hour lines; sessions are drawn on top of it
      const column = el('div', `tt-day-column${day === today ? ' is-today' : ''}`);
      nodes.push(placeAt(column, day + LABEL_COLUMNS + 1, HEADER_ROWS + 1, GRID_SLOTS + HEADER_ROWS + 1));
    });

    for (let slot = 0; slot < GRID_SLOTS; slot += SLOTS_PER_HOUR) {
      const hour = String(FIRST_HOUR + slot / SLOTS_PER_HOUR).padStart(2, '0');
      const label = el('div', 'tt-hour', `${hour}:00`);
      nodes.push(placeAt(label, 1, slot + HEADER_ROWS + 1, slot + HEADER_ROWS + 1 + SLOTS_PER_HOUR));
    }

    app.data.sessions.forEach((session) => nodes.push(renderSession(session)));
    grid.replaceChildren(...nodes);
  }

  form.addEventListener('submit', onSubmit);
  cancelButton.addEventListener('click', onCancel);
  deleteButton.addEventListener('click', onDelete);
  grid.addEventListener('click', onGridClick);
  resetForm();

  return {
    enter() {
      // Categories may have changed on the Flashcards page. Keep whatever
      // the user already typed in the form.
      renderCategoryOptions(categorySelect.value);
      renderGrid();
    },
    leave() {},
  };
}
