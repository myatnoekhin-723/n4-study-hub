# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

N4 Study Hub: a beginner-level JLPT N4 study app (flashcards, review/quiz, weekly timetable, dashboard), built over a 10-day plan with one commit per milestone. Hard constraints from the owner:

- HTML5, CSS3, vanilla JavaScript (ES modules) only. No frameworks, no libraries, no npm packages, no build step.
- No backend. All data lives in browser localStorage.
- No authentication, payments or personal data.
- Keep the code readable for a beginner. Don't overbuild: no SRS algorithm, drag-and-drop, charts, real calendar dates, or merge-on-import.

Status: version 1.0. All 10 days of the plan are done: flashcards (CRUD, filter/search, pagination, seed), flip review, quiz (history capped at 20), timetable (CSS-grid week, overlap blocking, "Study now" → `#review?cat=…`), dashboard, and JSON export/import. `TESTING.md` is the manual checklist; `README.md` describes features and limitations.

## Commands

There is no build or lint step. ES modules don't load from `file://`, so serve the folder over HTTP (VS Code Live Server, as the README describes) and open `index.html`. Open `tests.html` the same way to see the test results in the browser.

Run all tests in Node (Node 22+ detects the ES module syntax automatically):

```sh
node --input-type=module -e "const { runAll } = await import('./tests/tests.js'); const r = runAll(); const f = r.filter(t => !t.passed); f.forEach(t => console.log('FAIL', t.name, '-', t.error)); console.log(r.length - f.length + '/' + r.length + ' passed'); process.exitCode = f.length ? 1 : 0;"
```

The harness has no CLI filter. To run a subset, filter `runAll()` results by name, e.g. replace the body with `runAll().filter(t => t.name.includes('paginate'))`.

## Architecture

**Pure vs. DOM split.** `js/validation.js`, `js/logic.js` and `js/store.js` never touch the DOM, so `tests/tests.js` imports them directly. The views in `js/views/` hold all DOM code. `js/main.js` is the only module with side effects on import (it loads data, builds views and starts the router). Tests must never import it. Put new rules or calculations in the pure modules and test them there. Import direction is one way: `logic.js` → `validation.js` → `store.js` (`logic` uses `normalizeText`, `toMinutes` and the time constants; `validation` uses `SCHEMA_VERSION`). Never import in the other direction. That is why `findConflicts` and `validateImport` live in `validation.js`.

**Data.** Everything is one JSON object under the single key `n4hub.data`: `{ schemaVersion: 1, cards, sessions, quizHistory }`. One key means every save is a single atomic `setItem`. `createStore(backend, { seed, now })` takes the storage object as a parameter, so tests pass an in-memory fake and never touch real localStorage. `load()` and `save()` never throw:
- Seed (`js/seed.js`, 30 cards) only when the key is **absent**. An empty card list must not reseed.
- Corrupt JSON, a wrong shape or a wrong `schemaVersion`: copy the raw string to `n4hub.backup.<ISO time>`, start empty, return a warning. Never seed over it.

**App object and views.** `main.js` creates `app = { data, save(), showBanner() }`. Views change `app.data` in place, then call `app.save()`, which shows the banner if the save fails. Each view factory (`createCardsView`, `createReviewView`, `createTimetableView`, `createDashboardView`, all taking `app`) returns `{ enter(params), leave() }`. Quiz mode (`js/views/quiz.js`) is not a route: `review.js` creates it and switches modes, and `leave()` throws away an unfinished quiz. Import replaces `app.data` as a whole, so views must read `app.data` each time and never cache it. The router calls `enter` with `URLSearchParams` and `leave` on navigation, so views re-render from `app.data` on every `enter`. Register new views in `viewHandlers` in `main.js`.

**Router.** Hashes look like `#view?query`, for example `#review?cat=<encodeURIComponent(category)>`. Only the part before `?` is checked against the `VIEWS` whitelist. Unknown views fall back to `#cards`.

## Domain rules that span files

- **Normalization:** all text goes through `normalizeText` (NFKC, collapse whitespace, trim) before it is validated and saved. NFKC turns half-width katakana into full-width.
- **Readings:** `READING_PATTERN` uses `\u` escapes (`぀-ゟ゠-ヿ`). Keep them as escapes, not literal kana.
- **Categories:** there is no category list. Categories are the distinct `card.category` values (`listCategories`). `canonicalCategory` reuses an existing spelling regardless of case. When editing, compare against the *other* cards so the owner can fix the capitals of their own category.
- **Orphan categories:** a session's `category` may name a category that no longer has cards. That is valid, not an error, and Review shows it with an empty-state message. Don't make validation require that it exists, because that breaks editing and export → import.
- **Duplicates:** same `japanese` + `reading`, excluding the card being edited (`editingId`).
- **Sessions:** times are in 15-minute steps, inside 06:00–23:00, `start < end`, 4 hours at most. Overlap means the same day and `aStart < bEnd && bStart < aEnd`. Back-to-back sessions are allowed.

## UI conventions

- Render user text with `textContent` or the `el()` helper in `js/views/dom.js`, never `innerHTML`.
- Forms use `novalidate`. Errors go into `<p id="<prefix><field>-error">`, using `showFieldErrors(form, fields, errors, prefix)`, which sets `aria-invalid` and focuses the first invalid field.
- Icons come from the `<symbol id="icon-*">` sprite at the top of `index.html`. Use `iconButton(name, label)` and `setIconButton()` from `dom.js`. Icon-only buttons need `aria-label` and `title`. The sprite is hidden with the `.icon-sprite` CSS class because the `hidden` attribute does not hide an inline `<svg>` in Chrome.
- The flashcard is a `<button>` with a `click` handler only. Space/Enter already fire `click`, so a keydown handler would flip it twice. When moving to the next card, add `.no-animation` before un-flipping, so the next card's answer is not visible during the rotation.
- Colors are CSS custom properties in `:root` of `css/style.css` (sky-blue/mint theme). `--danger` is reserved for errors and Delete. Add new colors as tokens, not hard-coded hex values.
- The card list is paginated (`paginate`, `CARDS_PER_PAGE = 15`). Changing a filter resets to page 1, and adding a card jumps to the page that shows it.
- A global `[hidden] { display: none !important; }` rule makes the `hidden` attribute work on elements whose class sets `display`. Use `hidden` for show/hide, not CSS classes.
- Timetable: grid row = `timeSlot(time) + 2` (1 header row, then one row per 15 minutes). The 68 rows are defined twice, in `.timetable-grid` (`repeat(68, …)`) and in `GRID_SLOTS`, so change them together.

## Git

Commit messages follow the plan's style: `feat(cards): …`, `feat(review): …`, `chore: …`, `style: …`. The remote is `origin` (GitHub), and the branch is `main`.

## Coding Standards

**Naming**
- Use descriptive names (`cardList`, `findConflicts`, `selectedCategory`). No single letters or `tmp`, except simple loop counters.
- camelCase for variables and functions, UPPER_SNAKE_CASE for constants, kebab-case for CSS classes (`card-item`, `session-block`).
- Start function names with a verb (`renderCards`, `saveSession`, `validateCard`).

**Code format**
- JavaScript: 2-space indentation, semicolons, single quotes.
- `const` by default, `let` only when reassigning, never `var`.
- Keep each function short and focused on one job.
- Comment only where the logic is not obvious.
- Keep HTML, CSS and JS in separate files. No inline styles or inline event handlers.

**Reusable code**
- Before writing new code, check for an existing function or CSS class that already does the job, and reuse it.
- Move repeated logic into shared helpers instead of copying it.
- Keep logic in pure functions, separate from DOM code, so it can be tested.
- Put magic numbers and repeated strings in named constants.

**Protect existing code and style**
- Don't rewrite, rename or reorganize working code unless the task requires it. Make the smallest change that solves the task.
- If a change would touch many files, rename things widely or restructure code, STOP, explain why, and ask the owner first.
- Match the existing style: naming, spacing and comment style.

**Fonts, text and writing style**
- Keep the existing fonts, colors and CSS variables. Change them only when the owner asks.
- Keep the same tone, capitalization and sentence style in UI text, labels, error messages and comments.
- Don't add font families or external font links without asking.
