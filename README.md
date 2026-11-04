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
index.html        the app (4 views, switched by the URL hash)
tests.html        automated tests for the logic
css/style.css
js/main.js        entry point and router
```

More files are added as features land. See the plan for the full layout.

## Data

Everything is saved under one localStorage key, `n4hub.data`. If that data is ever unreadable, the app copies it to a `n4hub.backup.<time>` key before starting fresh, so nothing is silently lost.

## Status

Work in progress (Day 1 of 10).
