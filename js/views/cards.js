// Flashcards view: add, edit, delete, filter and search cards.

import { validateCard } from '../validation.js';
import { createCard, listCategories, filterCards, STATUS_LABELS } from '../logic.js';
import { byId, el, fillSelect, showFieldErrors } from './dom.js';

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

  // id of the card in the form, or null when adding a new card
  let editingId = null;

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

  function clearFilters() {
    filterCategory.value = '';
    searchInput.value = '';
    render();
  }

  function actionButton(label, action, card, className) {
    const button = el('button', className, label);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.id = card.id;
    button.setAttribute('aria-label', `${label} ${card.japanese}`);
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
      actionButton('Edit', 'edit', card, 'button'),
      actionButton('Delete', 'delete', card, 'button button-danger')
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
    const shown = filterCards(allCards, {
      category: filterCategory.value,
      search: searchInput.value,
    });

    list.replaceChildren(...shown.map(renderItem));
    count.textContent = `Showing ${shown.length} of ${allCards.length} cards`;

    emptyMessage.hidden = shown.length > 0;
    emptyMessage.textContent =
      allCards.length === 0 ? 'No cards yet. Add your first card above.' : 'No cards match.';
  }

  form.addEventListener('submit', onSubmit);
  cancelButton.addEventListener('click', onCancel);
  list.addEventListener('click', onListClick);
  filterCategory.addEventListener('change', render);
  searchInput.addEventListener('input', render);
  clearFiltersButton.addEventListener('click', clearFilters);

  return {
    enter: render,
    leave() {},
  };
}
