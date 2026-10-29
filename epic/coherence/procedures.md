# The coherence reviewer's procedures

How the coherence agent finds, words and ranks a finding (epic `coherence`).
Its steps are the coherence skill's;  the repo's facts are its own `agents/coherence/` (the catalog, the words).

## What a finding is

One of three kinds:

1. **Twice:**  one mechanism written more than once, each its own way.
   - e.g. six folds, each with its own open state, event names and `aria-expanded`
   - The bar:  the copies do the SAME job, and one mechanism, handed what differs (an argument, a callback, a
     subclass), would serve all of them.  Two things that only look alike are not a finding.
2. **Rebuilt:**  new code, or a plan, building what a mechanism already does.
   - e.g. a plan to "write a reader for `.spellml`" when the parser's tokenizer is meant to be subclassed
   - In a plan review, the main kind:  name the mechanism, where it is, and who already uses it (`spell map uses`).
3. **Two words:**  one idea named two ways:  `fold` beside `open`, `dismiss` beside `close`.
   - The word list says which word wins;  an idea it doesn't list yet is a question, not a finding.

## Its shape

Each finding, in this order:

- **Title:**  the one mechanism, in plain words:  "One disclosure for every fold".
- **Kind:**  twice, rebuilt or two words.
- **Where:**  every place, a file and line each (`src/server/runs/CommandRun.ts:510`);  for a plan, the item or
  phase and its words, quoted.
- **Shared:**  what the places do alike.
- **Differs:**  what each does its own way:  what the one mechanism must take as an argument.
- **The one:**  what replaces them:  an existing mechanism (catalog entry, its file) or one to make (a name, its
  home:  WWOD §8's promotion path).
- **Saves:**  roughly how many lines go, and how many copies.
- **Evidence:**  the command you ran and the lines that matter (`spell map uses Tokenizer` ...).

## Ranking

- First, a plan's finding:  it's cheapest now, before the code exists.
- Then by what it saves:  lines and copies.
- Then by how likely it's copied AGAIN:  a mechanism every new feature needs (state, timing, files) before a one-off.
- At most 15.  One root cause, one finding, every place listed.  No padding to the cap.
- Last, one line:  "Considered, left out:" each look-alike you weighed and why it isn't one (different jobs, a
  deliberate copy the catalog's "Fine as it is" names, generated code).

## The score

`spell coherence score` counts what the catalog's **Score:** lines find (epic `coherence` P15;  the kit's
README/cli.md, "Scoring coherence"):  each mechanism's copies left and its users, scored 0-100.

- **A sweep** ends with `spell coherence score --compare last --save`:
  its report says the score's change since the last snapshot, and names the new copies it lists.
- **A plan review** counts the copies a plan would add, where its words say how it would do something:
  "this plan adds 3 copies of Timing (raw `setTimeout()`)".
  - Where it can't tell, it says nothing:  no guessing a number.
- **A change in words** is an improvement, never a signed percent (Owen, 2026-10-25):
  "29% better (fewer copies)", "12% worse (score down)";  a table's column is "Improvement", its cells the bare
  percent (`17%`, a worse one `−12%`).
- **Code only:**  the score never counts tests;  tests are a count per repo beside it.

## Leave alone

- Generated or bundled files:  a header saying so, `__pack/`, `_assets/` bundles, `*.min.js`, `dist/`.
- Tests repeating setup:  WWOD §20 wants them readable on their own.
- What the catalog lists under "Fine as it is".
- Two repos that must not import each other (a lower repo can't use a higher one's helper):  a finding only when the
  one mechanism could live in the lower repo, or the kit.
