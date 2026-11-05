# N4 Study Hub

A small study app for JLPT N4 learners. You can:

- keep vocabulary and kanji flashcards, sorted into categories (a starter deck of 30 N4 words is included)
- review the cards by flipping them and marking each one "Known" or "Still learning"
- take a 10-question multiple-choice quiz and see your recent scores
- plan your weekly study sessions in a timetable that blocks overlapping sessions
- jump from a session straight to the cards for its category ("Study now")
- see your progress on a dashboard, and back up or restore everything as a JSON file

Built with plain HTML, CSS and JavaScript. There is no backend: your data stays in your browser's localStorage.

## How to run

The app uses JavaScript modules, which browsers won't load from `file://`. Serve it locally instead:

1. Open this folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.

## Tests

- **Automated:** open `tests.html` with Live Server. It runs the tests for the validation rules, the app logic and the storage layer, and shows pass or fail for each.
- **Manual:** [TESTING.md](TESTING.md) is a checklist for each feature, to go through in the browser before a release.

## Project structure

```
index.html              the app (4 views, switched by the URL hash)
tests.html              runs the automated tests in the browser
css/style.css
js/main.js              entry point: loads data, router (#view?query)
js/store.js             load/save under one localStorage key, backup on corrupt data
js/validation.js        pure validation rules (cards, sessions, overlaps, import files)
js/logic.js             pure logic (filtering, pagination, review, quiz, timetable, dashboard stats)
js/seed.js              starter N4 deck (30 cards)
js/views/dom.js         small DOM helpers (icons, selects, form errors)
js/views/cards.js       Flashcards view
js/views/review.js      Review view (flip mode)
js/views/quiz.js        Quiz mode inside the Review view
js/views/timetable.js   Timetable view
js/views/dashboard.js   Dashboard view, export and import
tests/tests.js          tiny test harness + tests
```

`validation.js`, `logic.js` and `store.js` never touch the page, so they can be tested directly. `main.js` is the only file that runs code when it loads; the tests never import it.

## Data

Everything is saved under one localStorage key, `n4hub.data`:

```json
{ "schemaVersion": 1, "cards": [], "sessions": [], "quizHistory": [] }
```

- On your first visit the starter deck is added. Deleting all your cards does not bring it back.
- If the saved data is ever unreadable, the app copies it to a `n4hub.backup.<time>` key before starting fresh, so nothing is silently lost.
- **Export JSON** on the Dashboard downloads all your data. **Import JSON** checks the whole file first; if anything is wrong, nothing is changed. A valid import replaces all your data after you confirm.
- Data lives in one browser on one device. To move it to another browser, export it there and import it here.

## Limitations

- The timetable is one repeating week (Monday to Sunday, 06:00–23:00), not real calendar dates.
- If the app is open in two tabs, the last save wins.
- The interface is in English.

## Status

Version 1.0: all 10 days of the plan are done.
