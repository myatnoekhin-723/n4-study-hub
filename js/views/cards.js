// Flashcards view: add, edit, delete, filter and search cards.

import { validateCard } from '../validation.js';
import {
  createCard,
  listCategories,
  filterCards,
  paginate,
  CARDS_PER_PAGE,
  STATUS_LABELS,
} from '../logic.js';
import { byId, el, fillSelect, iconButton, showFieldErrors } from './dom.js';

const FIELDS = ['japanese', 'reading', 'meaning', 'category'];

export function createCardsView(app) {
  const form = byId('card-form');
  const formTitle = byId('card-form-title');
  const submitButton = byId('card-submit');
  const cancelButton = byId('card-cancel');
  const formStatus = byId('card-form-status');
  const categoryOptions = byId('category-options');
  const filterCategory = byId('card-filter-category');
  const searchInput = byId('card-search');
  const clearFiltersButton = byId('card-clear-filters');
  const count = byId('card-count');
  const list = byId('card-list');
  const emptyMessage = byId('card-empty');
  const pagination = byId('card-pagination');
  const pagePrevButton = byId('card-page-prev');
  const pageNextButton = byId('card-page-next');
  const pageLabel = byId('card-page-label');

  // id of the card in the form, or null when adding a new card
  let editingId = null;
  let currentPage = 1;

  function currentFilters() {
    return { category: filterCategory.value, search: searchInput.value };
  }

  // Show the page that contains this card (e.g. right after adding it).
  function goToCard(cardId) {
    const position = filterCards(app.data.cards, currentFilters()).findIndex(
      (card) => card.id === cardId
    );
    if (position >= 0) currentPage = Math.floor(position / CARDS_PER_PAGE) + 1;
  }

  function readForm() {
    return Object.fromEntries(FIELDS.map((field) => [field, form.elements[field].value]));
  }

  function resetForm() {
    editingId = null;
    form.reset();
    showFieldErrors(form, FIELDS, {}, 'card-');
    formTitle.textContent = 'Add a card';
    submitButton.textContent = 'Add card';
    cancelButton.hidden = true;
  }

  function startEdit(card) {
    editingId = card.id;
    FIELDS.forEach((field) => {
      form.elements[field].value = card[field];
    });
    showFieldErrors(form, FIELDS, {}, 'card-');
    formTitle.textContent = `Edit card: ${card.japanese}`;
    submitButton.textContent = 'Save changes';
    cancelButton.hidden = false;
    formStatus.textContent = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.japanese.focus();
  }

  function onSubmit(event) {
    event.preventDefault();
    const result = validateCard(readForm(), app.data.cards, editingId);
    showFieldErrors(form, FIELDS, result.errors, 'card-');
    if (!result.valid) {
      formStatus.textContent = '';
      return;
    }

    const now = new Date().toISOString();
    const editingCard = app.data.cards.find((card) => card.id === editingId);
    if (editingCard) {
      Object.assign(editingCard, result.value, { updatedAt: now });
      formStatus.textContent = `Saved ${editingCard.japanese}.`;
    } else {
      const card = createCard(result.value, crypto.randomUUID(), now);
      app.data.cards.push(card);
      formStatus.textContent = `Added ${card.japanese}.`;
      goToCard(card.id);
    }
    app.save();

    resetForm();
    form.elements.japanese.focus();
    render();
  }

  function onCancel() {
    resetForm();
    formStatus.textContent = 'Edit cancelled.';
  }

  function deleteCard(card) {
    if (!confirm(`Delete the card ${card.japanese} (${card.reading})?`)) return;
    app.data.cards = app.data.cards.filter((other) => other.id !== card.id);
    app.save();
    if (editingId === card.id) resetForm();
    formStatus.textContent = `Deleted ${card.japanese}.`;
    render();
  }

  function onListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = app.data.cards.find((other) => other.id === button.dataset.id);
    if (!card) return;
    if (button.dataset.action === 'edit') startEdit(card);
    if (button.dataset.action === 'delete') deleteCard(card);
  }

  // A new filter or search always starts again at page 1
  function onFiltersChanged() {
    currentPage = 1;
    render();
  }

  function clearFilters() {
    filterCategory.value = '';
    searchInput.value = '';
    onFiltersChanged();
  }

  function changePage(step) {
    currentPage += step;
    render();
    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function actionButton(iconName, label, action, card, className = '') {
    const button = iconButton(iconName, `${label} ${card.japanese}`, className);
    button.dataset.action = action;
    button.dataset.id = card.id;
    return button;
  }

  function renderItem(card) {
    const item = el('li', 'card-item');

    const text = el('div', 'card-item-text');
    text.append(
      el('span', 'card-japanese', card.japanese, 'ja'),
      el('span', 'card-reading', card.reading, 'ja'),
      el('span', 'card-meaning', card.meaning)
    );

    const meta = el('div', 'card-item-meta');
    meta.append(
      el('span', 'tag', card.category),
      el('span', `status status-${card.status}`, STATUS_LABELS[card.status])
    );

    const actions = el('div', 'card-item-actions');
    actions.append(
      actionButton('edit', 'Edit', 'edit', card),
      actionButton('trash', 'Delete', 'delete', card, 'button-danger')
    );

    item.append(text, meta, actions);
    return item;
  }

  function render() {
    const categories = listCategories(app.data.cards);

    categoryOptions.replaceChildren(
      ...categories.map((category) => {
        const option = document.createElement('option');
        option.value = category;
        return option;
      })
    );
    fillSelect(filterCategory, [
      { value: '', label: 'All categories' },
      ...categories.map((category) => ({ value: category, label: category })),
    ]);

    const allCards = app.data.cards;
    const matching = filterCards(allCards, currentFilters());
    const page = paginate(matching, currentPage, CARDS_PER_PAGE);
    currentPage = page.page; // may have moved, e.g. after deleting the last card on a page

    list.replaceChildren(...page.items.map(renderItem));

    const filteredNote = matching.length === allCards.length ? '' : ` (${allCards.length} in total)`;
    count.textContent =
      matching.length === 0
        ? `Showing 0 of ${allCards.length} cards`
        : `Showing ${page.start + 1}–${page.start + page.items.length} of ${matching.length} cards${filteredNote}`;

    emptyMessage.hidden = matching.length > 0;
    emptyMessage.textContent =
      allCards.length === 0 ? 'No cards yet. Add your first card above.' : 'No cards match.';

    pagination.hidden = page.totalPages <= 1;
    pageLabel.textContent = `Page ${page.page} of ${page.totalPages}`;
    pagePrevButton.disabled = page.page === 1;
    pageNextButton.disabled = page.page === page.totalPages;
  }

  form.addEventListener('submit', onSubmit);
  cancelButton.addEventListener('click', onCancel);
  list.addEventListener('click', onListClick);
  filterCategory.addEventListener('change', onFiltersChanged);
  searchInput.addEventListener('input', onFiltersChanged);
  clearFiltersButton.addEventListener('click', clearFilters);
  pagePrevButton.addEventListener('click', () => changePage(-1));
  pageNextButton.addEventListener('click', () => changePage(1));

  return {
    enter: render,
    leave() {},
  };
}
