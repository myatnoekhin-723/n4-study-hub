# N4 Study Hub

A small study app for JLPT N4 learners. You can:

- keep vocabulary and kanji flashcards, sorted into categories
- review the cards by flipping them, and take a multiple-choice quiz
- plan your weekly study sessions in a timetable that warns you about overlaps
- see your progress on a dashboard

Built with plain HTML, CSS and JavaScript. There is no backend: your data stays in your browser's localStorage.

## How to run

The app uses JavaScript modules, which browsers won't load from `file://`. Serve it locally instead:

1. Open this folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.

To run the automated tests, open `tests.html` the same way.

## Project structure

```
index.html            the app (4 views, switched by the URL hash)
tests.html            runs the automated tests in the browser
css/style.css
js/main.js            entry point: loads data, router (#view?query)
js/store.js           load/save under one localStorage key, backup on corrupt data
js/validation.js      pure validation rules (cards, sessions)
js/logic.js           pure logic (filtering, review pool, shuffle)
js/seed.js            starter N4 deck (30 cards)
js/views/dom.js       small DOM helpers
js/views/cards.js     Flashcards view
js/views/review.js    Review view
tests/tests.js        tiny test harness + tests
```

`validation.js`, `logic.js` and `store.js` never touch the page, so they can be tested directly. `main.js` is the only file that runs code when it loads; the tests never import it.

## Data

Everything is saved under one localStorage key, `n4hub.data`. If that data is ever unreadable, the app copies it to a `n4hub.backup.<time>` key before starting fresh, so nothing is silently lost.

## Status

Work in progress (Day 5 of 10). Done: flashcards (add, edit, delete, filter, search, starter deck) and flip-card review. Next: quiz, timetable, dashboard.
