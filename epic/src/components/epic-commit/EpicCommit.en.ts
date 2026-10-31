/**
 * Every name `<epic-commit>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-commit>`
 * One commit:  of a phase or an item, or an entry in the Log (the epic's change log).
 ****************/
export const epicCommitVocabulary = {
  tag: "epic-commit",
  topics: ["documentation", "lists"],
  aka: ["commit", "change", "git"],
  noun: "commit",
  ui: false,
  description:
    "One commit:  under a phase or an item, one that built it or fixed it, hidden until the git toggle shows it;  " +
    'in the Log (`<epic-section kind="log">`), one entry of the epic\'s change log, always shown, newest first.  ' +
    "Its short sha is drawn, linked through its `repo`, else `<epic-page repo>`;  " +
    "with `at`, its time first, and with `refs`, a chip after its sentence for each phase and item it names.  " +
    "Its sentence is its children;  one longer than two lines is clamped to two, ending in an ellipsis, and a " +
    "click on it (or Enter) unfolds it, remembered per page.",
  attributes: [
    {
      name: "sha",
      kind: "string",
      required: true,
      format: "sha",
      description: "The commit's full sha (shown as its first 7)."
    },
    {
      name: "repo",
      kind: "string",
      format: "url",
      description:
        "The GitHub page of the repo it's in, when that isn't the page's `repo`:  a child repo's commit " +
        "(`https://github.com/spell-app/spell-parser`), a peer's (spell-brand)."
    },
    {
      name: "at",
      kind: "string",
      format: "time",
      description:
        "When it went in:  git's commit time, to the minute, with its offset (`2026-10-29T11:46-04:00`);  shown as " +
        "`2026-10-29 11:46`.  The Log's entries carry it (epic `epic-engine` P52)."
    },
    {
      name: "refs",
      kind: "string",
      format: "ids",
      description:
        "The phases (by their lasting id, `p-commit-log`) and items (`q56`) its subject names, space-separated:  " +
        "a chip for each, a phase showing its number today (`P52`), each a link landing there;  one the page no " +
        "longer has is plain text.  The Log's entries carry it."
    }
  ],
  events: [],
  slots: [{ name: "", description: "What it did, one or two sentences." }],
  parts: [
    { name: "base", description: "The commit:  its heading (the first commit only), then its line." },
    { name: "line", description: "Its line:  the time (with `at`), the sha, its sentence, the chips (with `refs`)." },
    {
      name: "sentence",
      description: "Its sentence (its children):  a long one is a button that folds it to two lines or unfolds it."
    },
    { name: "time", description: "With `at`:  its time, to the minute, before the sha." },
    { name: "ref", description: "With `refs`:  a chip per phase or item it names, after its sentence." },
    { name: "heading", description: "`Commits:` with its icon, over the first of a run of commits." },
    { name: "sha", description: "The short sha:  a link when the page has a `repo`." }
  ],
  states: [],
  texts: [
    { key: "heading", text: "Commits:", description: "Over the first commit of a run." },
    { key: "open", text: "Open {sha} on GitHub", description: "The sha link's tooltip." },
    { key: "unfoldTip", text: "Show all of it", description: "A long sentence's tooltip, folded to two lines." },
    { key: "foldTip", text: "Fold to two lines", description: "A long sentence's tooltip, unfolded." },
    { key: "refTip", text: "Go to {ref}:  {title}", description: "A chip's tooltip:  where it lands, and its title." },
    { key: "refGone", text: "{ref} isn't on this page any more", description: "A chip whose phase or item is gone." }
  ],
  children: [{ tag: "flow", description: "What it did, one or two sentences." }]
} as const satisfies EpicVocabulary
