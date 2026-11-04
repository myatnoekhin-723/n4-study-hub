// Flashcards view: add, list and delete cards.

import { validateCard } from '../validation.js';
import { createCard, listCategories, STATUS_LABELS } from '../logic.js';
import { byId, el, showFieldErrors } from './dom.js';

const FIELDS = ['japanese', 'reading', 'meaning', 'category'];

export function createCardsView(app) {
  const form = byId('card-form');
  const formStatus = byId('card-form-status');
  const categoryOptions = byId('category-options');
  const list = byId('card-list');
  const emptyMessage = byId('card-empty');

  function readForm() {
    return Object.fromEntries(FIELDS.map((field) => [field, form.elements[field].value]));
  }

  function resetForm() {
    form.reset();
    showFieldErrors(form, FIELDS, {}, 'card-');
  }

  function onSubmit(event) {
    event.preventDefault();
    const result = validateCard(readForm(), app.data.cards);
    showFieldErrors(form, FIELDS, result.errors, 'card-');
    if (!result.valid) {
      formStatus.textContent = '';
      return;
    }

    const card = createCard(result.value, crypto.randomUUID(), new Date().toISOString());
    app.data.cards.push(card);
    app.save();
    formStatus.textContent = `Added ${card.japanese}.`;

    resetForm();
    form.elements.japanese.focus();
    render();
  }

  function deleteCard(card) {
    if (!confirm(`Delete the card ${card.japanese} (${card.reading})?`)) return;
    app.data.cards = app.data.cards.filter((other) => other.id !== card.id);
    app.save();
    formStatus.textContent = `Deleted ${card.japanese}.`;
    render();
  }

  function onListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = app.data.cards.find((other) => other.id === button.dataset.id);
    if (!card) return;
    if (button.dataset.action === 'delete') deleteCard(card);
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
    const deleteButton = el('button', 'button button-danger', 'Delete');
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.id = card.id;
    deleteButton.setAttribute('aria-label', `Delete ${card.japanese}`);
    actions.append(deleteButton);

    item.append(text, meta, actions);
    return item;
  }

  function render() {
    categoryOptions.replaceChildren(
      ...listCategories(app.data.cards).map((category) => {
        const option = document.createElement('option');
        option.value = category;
        return option;
      })
    );

    const cards = app.data.cards;
    list.replaceChildren(...cards.map(renderItem));
    emptyMessage.hidden = cards.length > 0;
    emptyMessage.textContent = 'No cards yet. Add your first card above.';
  }

  form.addEventListener('submit', onSubmit);
  list.addEventListener('click', onListClick);

  return {
    enter: render,
    leave() {},
  };
}
