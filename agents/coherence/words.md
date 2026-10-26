# The words:  one for each idea

What we call a thing in code, events, attributes and docs:  one word for one idea, the platform's word first.
The coherence agent reads it too, and flags a second word for the same idea (epic `coherence`).

- One entry per idea:
  - **Say:**  the word, and its forms (events, attributes, states)
  - **Not:**  the words it replaces
  - **Decided:**  where, and by whom
  - **Score:**  the replaced words as a search, for `spell coherence score`'s count of them still in the code
    (the catalog's header says how a **Score:** line reads);  an entry about prose has none
- Only words already decided.  A word still open is a question under "Open", for Owen.
- The rules WWOD already has about words are linked, not copied:  §3 "Naming", §6 "Writing for people".
- The mechanisms:  [catalog.md](catalog.md).

## Showing and hiding

### open / close

- **Say:**  open, close, for anything that shows and hides:  a fold, a section, an accordion's panel, an overlay
  (modal, flyout, sidebar, popup, dimmer, toast, nag), a tab's pane, a transition, the site's edit panel.
  - The attribute:  `open`, as `<details open>` and `<dialog open>` say it;  never its opposite (`collapsed`).
  - The events, a pair each way:  `ui-opening` (before, cancelable) and `ui-opened` (after);  `ui-closing` and
    `ui-closed`.
  - A message dismissed for good closes too:  `closing` / `closed`.
- **Not:**  fold, unfold, expand, collapse, toggle, reveal, show, hide, dismiss.
  - `toggle()` stays as a METHOD that opens or closes, as `<details>` has a `toggle` event:  never an event name of
    ours.
- **Score:**  `"ui-(folded|unfolded|fold|unfold|expand(ed|ing)?|collapse[ds]?|collapsing|show(n|ing)?|hid(e|den|ing)|dismiss(ed|ing)?)"|\bcollapsed=|\[collapsed\]|"collapsed"`
  · not `spell-ui/src/jsx.ts`
- **Decided:**  epic `elemental-spell`, 2026-10-24, its event-name rounds:  Q65 (A:  an `open` attribute opens and
  closes) and Q68 (A:  overlays open and close too;  Owen:  "Use for tabs, transitions, edit panel as well").
  - Owen, round 2:  "folding is a programmer concept, showing and hiding are people concepts ... better to reuse
    terms for analogous things."
  - Its P9 makes the renames;  until it's merged, the old words are still in the code.
- **In code:**  the kit's `Disclosure` (`spell/element`;  epic `coherence` P8) holds the state, sends the pairs and
  writes `aria-expanded`, its methods `open()`, `close()`, `toggle()`;  each element maps its own public names onto it
  (`collapsed`, `visible`), so P9's renames change one mapping each.

## People and things

### people

- **Say:**  people, in what people read:  docs, pages, UI text.
- **Not:**  users.
- **Decided:**  WWOD §3, "Naming":  its rule on people.

### viewer

- **Say:**  viewer, for the person reading a page (a docs page, an epic page, a components page).
- **Not:**  reader, person.
- **Score:**  `\b(reader|person)\b` · in `spell-ui/src/docs-components/`
- **Decided:**  Owen, 2026-10-25, epic `coherence` Q9.
  - Sweep 1 found Spell UI's docs code saying "viewer" 51 times, "reader" 18, "person" 10;
    P14 made them "viewer" (Spell UI's docs components).
- **Not the same word:**  WWOD §6's "reader", the person reading any text we write (a docstring, a README, a page):
  it's about writing, not the code's name for who looks at a page, so it stays.

### Booleans on an element

- **Say:**  bare, as the platform's are, on a custom element's public side:  `open`, `disabled`, `readOnly`.
  `is` / `has` / `can` for our own members (`isOpen`).
- **Decided:**  WWOD §3 › "Boolean getters prefixed `is` / `has` / `can`" (Owen, 2026-10-06).

## Pages

### Each kind of page has one name

- **Say:**  epic page, saga page, details page, review page, choice page, run page, guide, cheatsheet, commands
  page, components page, components guide, brand page, home page, list page, changelog, template.
- **Not:**  plan doc, epic doc (the epic page);  durable doc (the guide);  docs index (the home page);  goal (a saga).
- **Score:**  `(?i)\b(plan doc|epic doc|durable doc|docs index)\b`
- **Decided:**  the kit's `AGENTS.md`, "Words" (Owen, 2026-10-14, epic `epic-workflow` P14).

## Open

Words a sweep found more than one of, still to decide.

- **show / hide:**  with open / close for every fold and overlay, is anything left that shows and hides?
  The brand pages' `shows` / `shown` states, and Spell UI's `ui-show` / `ui-hide` today, would move.

## See also

- [catalog.md](catalog.md):  the mechanisms Spell already has
- [WWOD](../wwod/WWOD.md), §3 › "Naming"
