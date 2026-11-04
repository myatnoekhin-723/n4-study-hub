// Review view: flip through cards and mark each one "Known" or "Still learning".
// Opening #review?cat=Verbs starts a round for that category.

import { listCategories, reviewPool, shuffle, STATUS_LABELS } from '../logic.js';
import { byId, fillSelect } from './dom.js';

export function createReviewView(app) {
  const categorySelect = byId('review-category');
  const includeKnownBox = byId('review-include-known');
  const area = byId('review-area');
  const progress = byId('review-progress');
  const flashcard = byId('flashcard');
  const frontFace = byId('flashcard-front');
  const backFace = byId('flashcard-back');
  const frontText = byId('flashcard-japanese');
  const readingText = byId('flashcard-reading');
  const meaningText = byId('flashcard-meaning');
  const statusText = byId('review-status');
  const prevButton = byId('review-prev');
  const nextButton = byId('review-next');
  const learningButton = byId('review-learning');
  const knownButton = byId('review-known');
  const emptyMessage = byId('review-empty');
  const done = byId('review-done');
  const doneSummary = byId('review-summary');
  const restartButton = byId('review-restart');

  // The current round
  let deck = []; // card objects, shuffled
  let index = 0;
  let marks = {}; // card id -> 'known' | 'learning'

  function renderCategories(preferred) {
    const categories = listCategories(app.data.cards);
    // A linked category may have no cards left; still show it so the
    // empty message can name it.
    if (preferred && !categories.includes(preferred)) categories.push(preferred);
    fillSelect(
      categorySelect,
      [
        { value: '', label: 'All categories' },
        ...categories.map((category) => ({ value: category, label: category })),
      ],
      preferred
    );
  }

  function emptyText() {
    const category = categorySelect.value;
    const inCategory = app.data.cards.filter((card) => !category || card.category === category);
    if (inCategory.length === 0) {
      return category
        ? `There are no cards in "${category}". Add some on the Flashcards page.`
        : 'You have no cards yet. Add some on the Flashcards page.';
    }
    return 'Every card here is marked Known. Tick "Include known cards" to review them again.';
  }

  function startRound() {
    deck = shuffle(
      reviewPool(app.data.cards, {
        category: categorySelect.value,
        includeKnown: includeKnownBox.checked,
      })
    );
    index = 0;
    marks = {};
    done.hidden = true;

    if (deck.length === 0) {
      area.hidden = true;
      emptyMessage.textContent = emptyText();
      emptyMessage.hidden = false;
      return;
    }
    emptyMessage.hidden = true;
    area.hidden = false;
    showCard();
  }

  function setFlipped(flipped) {
    flashcard.classList.toggle('is-flipped', flipped);
    flashcard.setAttribute('aria-pressed', String(flipped));
    // Screen readers only read the visible side
    frontFace.setAttribute('aria-hidden', String(flipped));
    backFace.setAttribute('aria-hidden', String(!flipped));
  }

  function showCard() {
    const card = deck[index];

    // Turn the card back to the front WITHOUT the animation. Otherwise the
    // next card's answer would be visible while the card rotates back.
    flashcard.classList.add('no-animation');
    setFlipped(false);
    void flashcard.offsetWidth; // apply the change before re-enabling animation
    flashcard.classList.remove('no-animation');

    frontText.textContent = card.japanese;
    readingText.textContent = card.reading;
    meaningText.textContent = card.meaning;
    progress.textContent = `Card ${index + 1} of ${deck.length}`;
    statusText.textContent = `Status: ${STATUS_LABELS[card.status]}`;
    prevButton.disabled = index === 0;
    nextButton.textContent = index === deck.length - 1 ? 'Finish' : 'Next';
  }

  function goNext() {
    if (index < deck.length - 1) {
      index += 1;
      showCard();
    } else {
      finishRound();
    }
  }

  function goPrev() {
    if (index > 0) {
      index -= 1;
      showCard();
    }
  }

  function mark(status) {
    const card = deck[index];
    card.status = status;
    card.updatedAt = new Date().toISOString();
    marks[card.id] = status;
    app.save();
    goNext();
  }

  function finishRound() {
    const values = Object.values(marks);
    const known = values.filter((status) => status === 'known').length;
    const learning = values.filter((status) => status === 'learning').length;
    const unmarked = deck.length - values.length;

    area.hidden = true;
    done.hidden = false;
    doneSummary.textContent =
      `You went through ${deck.length} card${deck.length === 1 ? '' : 's'}: ` +
      `${known} known, ${learning} still learning, ${unmarked} not marked.`;
    restartButton.focus();
  }

  // The flashcard is a <button>, so Space and Enter already fire "click".
  // Adding a keydown handler as well would flip it twice.
  flashcard.addEventListener('click', () => {
    setFlipped(!flashcard.classList.contains('is-flipped'));
  });
  prevButton.addEventListener('click', goPrev);
  nextButton.addEventListener('click', goNext);
  knownButton.addEventListener('click', () => mark('known'));
  learningButton.addEventListener('click', () => mark('learning'));
  restartButton.addEventListener('click', startRound);
  categorySelect.addEventListener('change', startRound);
  includeKnownBox.addEventListener('change', startRound);

  return {
    enter(params) {
      renderCategories(params.get('cat') ?? categorySelect.value);
      startRound();
    },
    leave() {
      // Marks are saved as you go, so there is nothing to keep.
      deck = [];
      marks = {};
    },
  };
}
