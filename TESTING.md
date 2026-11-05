# Manual test checklist

Run the automated tests first: open `tests.html` with Live Server. Every test should be green.

Then go through this list in Chrome and one other browser (Firefox or Edge). To start from a clean state, open DevTools → Application → Local Storage and delete the `n4hub.data` key, then reload.

## Navigation
- [ ] Each nav link shows only its view, and the active link is highlighted.
- [ ] Refreshing keeps the current view.
- [ ] An unknown hash (e.g. `#nope`) shows Flashcards.

## Storage
- [ ] First visit (no `n4hub.data` key): the 30-card starter deck appears.
- [ ] Delete every card, reload: the starter deck does **not** come back.
- [ ] Change `n4hub.data` to `{broken` in DevTools, reload: a warning banner appears, a `n4hub.backup.<time>` key holds `{broken`, and the starter deck is **not** loaded.
- [ ] The banner closes with its × button.

## Flashcards: add, edit, delete
- [ ] A valid card appears in the list and survives a refresh.
- [ ] Submitting an empty form shows an error under every field, and nothing is saved.
- [ ] A reading with romaji or kanji is rejected.
- [ ] Half-width katakana in the reading (`ﾍﾞﾝｷｮｳ`) is accepted and saved as `ベンキョウ`.
- [ ] A duplicate (same Japanese + reading) is rejected.
- [ ] Adding category "verbs" when "Verbs" exists saves it as "Verbs" (one category in the filter).
- [ ] The edit (pencil) button fills the form. Saving updates the card instead of creating a new one.
- [ ] Cancel discards the changes.
- [ ] The delete (trash) button asks first. Cancelling keeps the card.
- [ ] Text like `<b>x</b>` is shown as plain text, not bold.

## Flashcards: filter, search, pages
- [ ] 15 cards per page, with "Page 1 of 2" and ‹ › buttons.
- [ ] Filtering by category shows only that category and goes back to page 1.
- [ ] Search matches Japanese, reading or meaning, ignoring case.
- [ ] Filter and search work together. No results shows "No cards match."
- [ ] The × button clears both.
- [ ] Adding a card jumps to the page that shows it.

## Review (flip mode)
- [ ] Clicking the card, or pressing Space or Enter, flips it (once).
- [ ] "Known" / "Still learning" updates the status and moves to the next card. The status survives a refresh.
- [ ] Known cards are skipped unless "Include known cards" is ticked.
- [ ] Moving to the next card never shows its answer for a moment.
- [ ] A category with no cards shows a message instead of a card.
- [ ] After the last card, "Done!" shows a summary.

## Quiz
- [ ] "Quiz" switches mode; the start text says how many questions (max 10).
- [ ] Every question has 4 different choices, one of them correct.
- [ ] Picking an answer shows right (mint) / wrong (red) and the correct meaning.
- [ ] The score at the end matches the number of correct answers, and appears on the Dashboard.
- [ ] Leaving the page in the middle of a quiz saves nothing.
- [ ] With fewer than 4 different meanings in the deck, Start is disabled and says why.

## Timetable
- [ ] A session appears in the right day column, at the right height.
- [ ] A 15-minute session (e.g. 22:45–23:00) is still readable.
- [ ] Clicking a session opens it in the form. Save changes and Remove work and survive a refresh.
- [ ] Start 19:10 is rejected (15-minute steps). End before start is rejected. More than 4 hours is rejected.
- [ ] 19:00–20:00 and 19:30–20:30 on the same day: blocked, and the message names the other session.
- [ ] Back-to-back sessions (20:00 end, 20:00 start) are allowed. The same times on different days are allowed.
- [ ] Editing a session without changing its times does not clash with itself.

## Category link
- [ ] The session form lists "None" plus every existing category.
- [ ] Editing a linked session shows "Study now", which opens Review filtered to that category (also for a category with spaces or Japanese).
- [ ] Delete every card in a linked category: the session stays, shows "(no cards)", and can still be edited and saved.

## Dashboard
- [ ] Counts and the "Known" percentage match the cards list.
- [ ] "Today" shows the sessions for the current weekday, sorted by time, with "Study now" for linked ones.
- [ ] Recent quizzes show the newest first.
- [ ] With no data, every panel shows a friendly placeholder.

## Export / import
- [ ] Export downloads `n4-study-hub-export-<date>.json`.
- [ ] Export, delete `n4hub.data`, reload, then import the file: everything comes back exactly.
- [ ] A non-JSON file, a file with `"schemaVersion": 2`, or a file with one bad card is rejected with the reason, and the current data is untouched.
- [ ] Import asks for confirmation. Cancelling changes nothing.

## Layout and keyboard
- [ ] At phone width (DevTools device toolbar, ~390px) no view scrolls sideways. The timetable scrolls inside its own box.
- [ ] Every button and link can be reached with Tab and shows a focus outline.
- [ ] Icon-only buttons show a tooltip on hover.
