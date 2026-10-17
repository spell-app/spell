# Epic pages

How to write and update `epics/<name>/<name>.plan.html`, the live doc behind a `/epic <name>` session.

- The tool: `packages/epics/src/tool/` (`epic`) edits the structured parts, in `<epic-*>` markup
  (epic `epic-components`, switched over 2026-10-08).
- The template `new` copies: `packages/epics/src/tool/templates/plan.html`. NEVER copy it by hand.
- The MARKUP -- every element, attribute and child, where each goes:
  [`packages/epics/src/tool/PLAN-DOC.md`](../../packages/epics/src/tool/PLAN-DOC.md), and the element definitions
  it points to. This file holds what an author still needs: the rules, the prose, the ids, explaining a question,
  the review loop and the commands.

## Rules

- Use `epic <verb>` wherever one exists (below): it keeps ids, statuses, UPDATE markers and the
  "updated" date consistent, checks the markup before writing, and locks the file against parallel agents.
  Hand-edit only prose: the summary, Overview, phase bodies, item details.
  - in a SPLIT doc (see "Parts"; every new doc), a body's prose is in its part file, `parts/<id>.html`: edit it
    there, at its real path (`/Users/owen/www/spell-app/spell-app-dev/epics/<name>/parts/<id>.html`)
- Write for Owen coming back COLD (2026-10-04; the details skill's "Writing for Owen" is the same rule): he runs
  5+ epics, and reads an item weeks later, from another session. Enough that he can pick up ONE phase or item on
  its own. NOT caveman:
  - a plain lead sentence first: what it is, for whom, how he'd notice it
  - then bullets, one idea each, nested for sub-points; never a list run together inside a sentence ("a, b, c and
    d" is four bullets)
  - full words, the articles back in; short sentences
  - a concrete example for anything tricky: the real code, the command and what it prints, a before / after, a
    table of values
  - ids explained: "the inbox file decision (D1)", never a bare `D1`
  - identifiers, paths and numbers exact, but where the reader can reach them, not in the running text (next rule)
- Plain text, plain paths (Owen, 2026-10-10, epic `airplane`: "Text is waaaay to dense to parse quickly"; WWOD §6
  › "Plain text, plain paths", whose before / after is in `agents/wwod/writing.md`):
  - say what it MEANS: a plain lead line saying what it adds up to, then one fact per bullet
  - at most two code spans in a sentence; the exact settings and values go in a folded `<epic-code>`, or a tooltip
  - no file path in the prose: the NAME, its path its tooltip (the browser's own, `title`):
    `<code title="packages/spell/src/node/buildTsx.ts">buildTsx()</code>`. The tool links it to the file, so a
    click still opens it; and it turns `<code>name</code>, <code>path</code>` or `<code>name</code>
    (<code>path</code>)`, handed to it, into that ("The way in", `PLAN-DOC.md`)
  - no insider shorthand: "reads JSX the way app and ui do", not `jsx: "preserve"`
  - `spell dev docs fuss <page>` finds what's left: `path-in-prose`, `code-dense`, `dense`
- Questions, issues, judgement calls and decisions end with a **Net effect** (Owen, 2026-10-04): what concretely
  changes, one bullet each:

  ```html
  <epic-net-effect>
    <ul>
      <li><code>D7 (Q3)</code> becomes <code>Q3</code>, answered</li>
      <li>rule semantics changed: an answered question is no longer struck</li>
    </ul>
  </epic-net-effect>
  ```

  For a question: the recommended option's net effect, `<epic-net-effect option="A" recommended>` (drawn `Net
  effect (A, recommended):`); each option may carry its own, inside its `<epic-option>`. Worded otherwise ("once
  fixed"): a plain `<p><b>Net effect (once fixed):</b></p>` and its list.

- Lists: bulleted, or numbered when order or reference matters.
- NEVER delete an item: close it (`epic close`), and it stays, closed (not struck). An item another
  decision made moot: `epic cancel`, the one status shown struck through (J16 of `review-review`).
- NEVER drop an item's earlier text (Owen, 2026-10-04, I7 of `review-review`): the question as first asked, its
  explanation, its options, an earlier answer. Add Details doesn't rewrite: it adds a More Details card under the
  text (`details --more`). A rewrite -- an agent's or a phase's (e.g. `review-review`'s P8 "Rewrite The Rest"), or
  one by hand -- MOVES it into the item's folded **Original Discussion** (`PLAN-DOC.md`, "Items"):
  - `details <name>#<id> --file` and `decide` (answering again) do it for you
  - rewriting by hand: write the new text through `details --file`, or put the old text in with `restore <name>#<id>
--file <old.html>`; never just overwrite it
  - text already lost: recover it from the shared content repo's git history, then `restore ... --as-of
"YYYY-MM-DD HH:MM"` (when it was replaced)
- Keep the doc current as you go: a caveat, issue or decision found mid-phase goes in NOW, not at the end.

## Page header

`<epic-page>` draws the whole header from its attributes: the h1, the meta lines, the step label (the active phase,
else `DONE` once every phase is, else the next phase, or `FUTURE`), the bedtime label, and the review line ("To
review this doc, type `/epic review <name>`"). None of it is written by hand.

- The `<title>` reads `Epic: <Title>`; `<epic-page title>` holds the title alone (`new` writes both). Scripts
  reading the title drop the `Epic: ` (`TITLE_PREFIX`).
- The meta lines end with the guide, once Doc Review has written one (2026-10-04): a `<a slot="durable">`
  in `<epic-page>`. The guide's own meta list (`ui-list.spell-meta`) starts with the epic page, ONE standard
  line:

  ```html
  <ui-item icon="map"
    ><b>Epic page:</b>
    <a href="epics/unified-server/unified-server.plan.html" target="unified-server">epic unified-server</a></ui-item
  >
  ```

The SEE ALSO box, above the Overview, is drawn too, never written: the pages the epic made or leans on, gathered by
the page server every time (`SeeAlso`; Owen's Q13 and Q15 of `epic-workflow`).

- its guide (the `<a slot="durable">` above), every page in its `details/` folder, newest first, then every
  `guides/` page its page and parts link to, each with its kind (the epic's guide, details, choices, guide)
- so to list a guide there, link it from the doc; the same links say which epic a guide BELONGS to, where its
  comments go when Owen presses its Send (P13)

A FUTURE epic (`/epic future <name>`, epic `epic-future`, 2026-10-07): an idea written down, not planned yet.

- `new <name> --future`: no branch or worktree yet; the page says so, with a notice in place of "Plan hung?",
  linking its review page, `details/analysis.html` (its high-level open questions, answered in the Review tab; the
  answers land here as decided questions)
- `list` says `future`, between the epics in progress and the done ones; the Epics index gives it a seedling
- PLANNED by `new <name>` again (`/epic <name>`, "Reuse"): promoted where it is, the notice gone, the meta lines
  naming the branch and worktree; its prompt, decisions and review page stay. Its first phase (`add-phase`)
  plans it too

While planning (no phase yet), the page shows a folded "Plan hung?" notice (P3 of `windows-and-review`), drawn, never
written:

- How to restart a hung plan: a new session in the worktree's window, `/epic <name>`, "Reuse". Plus the kickoff
  prompt, with a copy button.
- Why: `/epic` writes this stub doc BEFORE planning, so the prompt survives a hung or lost session.
- It goes when the first phase is added (`add-phase`): the plan exists.

## Sections (ids are fixed)

| Section            | id            | What                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Overview        | `#overview`   | 2-sentence summary, the prompt that started the plan (folded in a "Kickoff prompt" aside), the total estimate (written by the tool), then the substance in numbered sub-sections (`#o1` "1.1 Structure" ...): becomes guides                                                                                                                        |
| 2. Phases          | `#phases`     | progress bar, then one block per phase (`#p1` ...): its estimate as the title's badge; Symptom, Changes, the details (Goal), Done (once done), Commits; Files and Verify hidden until the folder / flask toggle on the Phases title is pressed                                                                                                            |
| 3. Questions       | `#decisions`  | open questions first (waiting on the user; each also asked with AskUserQuestion), then the answered ones, in id order: settled unless new facts arrive. A decision IS an answered question (D13 of `review-review`, 2026-10-04): `decide` writes the answer INTO the question; `add <name>#D` makes a question born answered                              |
| 4. Judgement calls | `#judgements` | choices Claude made WITHOUT the user (a `/bedtime` run, an agent mid-phase): title the choice, details "chose X over Y because Z" + the options; open until the user reviews it, `close` = accepted, disagreement becomes a question. Its phase's "To review" line lists it while it's open and not reviewed (never hand-write a "Judgement calls:" line) |
| 5. Caveats         | `#caveats`    | limits and risks we accept                                                                                                                                                                                                                                                                                                                                |
| 6. Todos           | `#todos`      | later work that isn't a caveat or an issue                                                                                                                                                                                                                                                                                                                |
| 7. Issues          | `#issues`     | problems found, open until fixed                                                                                                                                                                                                                                                                                                                          |
| 8. To test         | `#tests`      | what Owen checks by hand before merging: each a step and what should happen (`add <name>#V`); `close` one once it passes                                                                                                                                                                                                                                  |
| 9. Log             | `#log`        | one-liners of plan changes, stamped with local date and time                                                                                                                                                                                                                                                                                              |

- The elements draw each section's title, icon, rule, fold and `open/all` count: write only its contents.
- Everything starts folded; the reader opens what they want, and the page remembers. A link to any id inside
  (`#q3`, `#p2`) unfolds what hides it and lands on it.
- An Overview sub-section is written by hand: `<epic-section id="o3" kind="overview-part" title="...">`, prose
  inside, nested in `<epic-overview>` (`PLAN-DOC.md`, "The page"). Sub-sub-items: `<h4 id>`.
- NEVER change an `id`: the items, the log and other docs link to them.
- A doc still in the old `ui-*` markup (none since the switch, 2026-10-08): `epic convert <name>`.
  `relayout` is gone: the converter replaced it. `migrate` brings a page already in `<epic-*>` markup up to today's
  ("Migrations", below).

## Saga pages

A SAGA PAGE is a saga's page, built of the same elements as an epic page (epic `epic-workflow` P15):
`sagas/<saga-id>/<saga-id>.saga.html`, an `<epic-page kind="saga" saga="<id>">`.
- What a saga is:  an epic of epics, the larger aim its epics serve.
  The list, in Owen's order:  `sagas/sagas.json5` (`epic saga list`);  an epic names its saga with `<epic-page saga>`.
- Its sections, fixed, in this order:
  - 1. Overview:  the saga's purpose as its summary, then "Done so far" (`#o1`) and "Ideas not done yet" (`#o2`)
  - 2. Epics (`#epics`):  a card per epic naming the saga, grouped as on the Epics page;  drawn from the page
    server (`<epic-cards>`), never written by hand
  - 3. Questions, 4. Todos, 5. Log:  as an epic page's
- Made once by `epic saga page <id>` (`--force` remakes it);  then every verb edits it, named by its short address:
  `epic add SAGA:/epics#T "..."`, `epic close SAGA:/epics#T1`, `epic check SAGA:/epics`.
- Owen comments on it as on an epic page:  a note box on each Overview part and on the summary, the bullhorn on any
  block, Send in the header.  The marks and comments wait in its own inbox, `<id>.inbox.json5` beside it.
  - The session that takes them runs `/epic review SAGA:/<id>` (the epic skill, "Review").
  - Nobody listening:  Send wakes one, as an epic page's does:  a new session typed `/epic review SAGA:/<id>`.
- Filling its Overview, the rules above apply:  a plain lead sentence, then bullets;  each epic linked to its epic
  page, with what it built and whether it's done or merged;  written for Owen coming back cold.
  - "Done so far":  a line per epic, from its summary and changelog entry.
  - "Ideas not done yet":  future epics, open todos, review pages, and the parked goals' topics (`goals/spell/`).
- The parked goal sets (`goals/`) are NOT saga pages:  read only, their story in the goals guide.

## Ids: short, so they're easy to say in chat

- Items: `q1` questions (answered ones are the decisions), `j1` judgement calls, `c1` caveats, `i1` issues, `t1`
  todos, `v1` tests ("verify": `t` is taken). Shown as `Q1`, `J1`, `C1` ...
  - docs from before 2026-10-04 also had `d1` decisions; each lives on as the answer inside its question (old
    `#d7` links still land there, and `close d7` finds the question)
- Phases: a STABLE id, made once from the name when the phase is added (`p-epic-migrate` for "Epic Migrate"), kept
  through renames and inserts (epic `epic-workflow` P15). Shown as `P1 · Short Name`: the number is its place in the
  list, worked out as the page draws, and the name 2-4 words, so "start P2" is unambiguous. Link to it by its id
  (`#p-epic-migrate`); `epic` takes it by number, id or name (`seo#P2`, `seo#epic-migrate`). An older page's `p2`
  ids still read until `epic migrate` turns them stable, and an old `#p2` link still lands on the 2nd phase.
- Overview sub-sections: `o1` ...
- Link to them in prose: `<a href="#i2">I2</a>`. `epic check` fails on a link to a missing id.
- On ANOTHER page (another epic, a saga, a guide): `<epic-link>`, written by what it points at, never a path
  (epic `epic-workflow` P15):

  ```html
  <epic-link epic="seo" item="J3"></epic-link>                 <!-- draws "seo J3", J3's title its tooltip -->
  <epic-link saga="drawable-spell" item="T3"></epic-link>      <!-- an item on a saga page -->
  <epic-link item="T3"></epic-link>                            <!-- this page:  draws "T3" -->
  <epic-link phase="epic-migrate"></epic-link>                 <!-- draws "P7 · Epic Migrate" -->
  <epic-link epic="seo" phase="2">the meta tags phase</epic-link>
  ```

  - With no text it draws the short form; a phase by number (`7`, `P7`) or by name (its title's slug).
  - `saga` isn't needed with an `epic`.
  - A plain link may use the SHORT ADDRESS instead: `<a href="SAGA:/drawable-spell/python-target#T1">`, rewritten
    to the page by the docs runtime. Owen types the same in chat, and `spell dev docs open | link SAGA:/...` opens
    it.
  - `epic check --links` and `doc-links.js --check` fail on a saga, page or id that isn't there, and on an epic under a
    saga it doesn't name.

## What phases and items say

The markup is in `PLAN-DOC.md` ("Phases", "Items", "Log"). What to write in each part:

- A phase reads Symptom (one line: what's wrong today), Changes (two or three lines: what changes), then the
  details (Owen, 2026-10-06; P3 of `windows-and-review`): `add-phase --symptom ... --changes ...`;
  `update <name>#P<N> --symptom ...` sets them on a phase written before.
- Updates: a change to the phase's plan (after Owen's feedback, or found while building) is an `<epic-update>`
  block at the END of the phase's description, after Goal, one per change:
  `updated <name>#<N> "<p>what changed, and why</p>" [--summary "..."]`. It's titled **Update**: <summary> (the
  first sentence, unless given), its date at the right, and Owen can comment on it with its own bullhorn. Never an
  "Updated" word buried in the text, and no box around them (Owen, 2026-10-11: "lose the "Plan changes"
  surround"). It STAYS once the phase is done (the record of how the plan moved); while the phase isn't done, its
  title carries an orange pen and their count, even folded, so a re-review sees what moved.
- Requests (epic `epic-workflow`): what Owen sent the phase from other sessions (`/send`), one block each, under
  Symptom / Changes: his words quoted, what the sender was looking at, his screenshots. Written by
  `epic file <epic>#P<N> <rN>` (the epic skill's "12. Request"), never by hand.
- Goal: the details: a `<ul>`, one bullet per outcome, in Owen's terms (what he'll see or be able to do), not the
  build steps. Optional once the phase has a Symptom or Changes.
- Done: written when the phase is done (`phase <name>#<N> done --done "<ul>..."`), a `<ul>` of what was BUILT,
  ordered by what Owen asks about first: where to see it, what changed in how he works, what's still rough or
  untested by hand, then the rest. Not the commit list: that's Commits.
- Commits: written by the tool, oldest first: `commit <name>#P<N> <sha> "..."` adds one; `commits <name>
--backfill` reads the doc's git history and adds what's missing
  - phase commits by subject: `P3:  Name -- summary` (also `P4 + P5:`, `WIP P3:`, `<epic> P3:`, `P6a:`,
    `P1 follow-up:`); the sentence is what follows `--`, else the colon
  - item fixes: `Fix I3:  ...` (or `<epic> I3:`), listed in the item's details
- To review: written by the tool on every edit, LAST: the items added while this phase was active that are still
  open, not reviewed and not under way; none: no line.
- Files and Verify: still written for every phase; hidden on the page until the folder / flask toggle is pressed.
- Estimate: wall-clock time for Claude to do the phase, agents included, Owen's review not. `30m`, `2h`, `1h30m`,
  or a range, `1-2h`. `update <name>#P<N> --estimate "..."` changes it; the Overview's total follows (every phase's estimate
  added up, and the phases not done; an estimate that won't parse is named as not counted).
- An item's status: `open`; `decided` (an answered question: a decision in force); `done` (closed, never
  removed: fixed, passed, accepted; NOT struck); `canceled` (made moot by another decision: closed like `done`,
  its title struck through; `reopen` undoes it).
- An answered question reads in the order it happened (Owen, 2026-10-04, I9 of `review-review`): the question as
  asked, its options (folded "Choices", the chosen one ticked), then the answer. `decide` writes it; answering
  again replaces the answer, the old one into the Original Discussion. Never hand-write the Choices: write the
  question with its options through `details --file`, then `decide --option`.
- Add Details (`details --more`, P3 of `windows-and-review`): the item's text stays on top ("Original Reply"), the
  new text goes under it in a "More Details" card; a second Add Details replaces the card, the old one into the
  Original Discussion.
- An item's colour (its state), from its status and review marks, rewritten by the tool on every edit: "Colours",
  "Item states", below.
- A judgement call or issue is CALM by default (`--calm`: yellow, open), RED only when it would surprise Owen
  (2026-10-10: "if what you picked was reasonable, and I didn't explicitly state otherwise, [it] should be yellow",
  the principle of least surprise). Red when:
  - it goes against something he said
  - it drops, narrows or changes what he asked for
  - it's a real fork he'd plausibly have picked differently, AND it matters to him (cost, behaviour he'll notice,
    something hard to undo)
  - it needs his answer before work can go on
  - Following WWOD is one case of calm, not the only one. `calm <name>#<id> [<id>...] [--loud]` changes one already
    written, as a click on its id chip does.
- Review marks (`/epic review`, and any session that talks an item through with Owen; `review`, `defer`, `queue`,
  `unqueue` write them):
  - reviewed: gone through with Owen, that day. Deferred: put off for now; still not reviewed. Queued, with
    its work: work a review decided on, not started yet; the next review offers it first.
  - the label shows the strongest: "to do" (yellow: open, not started), else "deferred" (grey, its date on
    hover), else "reviewed 10-03" (green while the item is `recent`, then grey)
  - REVIEWED also counts: closed (`done`, `canceled`), `decided`, or linked (`href="#i4"`) from an answered
    question's details
  - the outcome goes in the log (`I4 reviewed:  accepted`), not on the item

## Colours

ONE meaning per colour, on every doc page: epic pages, details pages, saga pages, the Epics list page (Q20 of
`epic-components`, Owen 2026-10-08, settled on its colour-scheme details page). Read a page at a glance by it; a new
element takes its colour from this table, never a colour that means something else.

| Colour | Means                                       | Examples                                                                                                                                                                                                            |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| red    | needs you (Owen)                            | an open question's chip; an unreviewed judgement call or issue; the toolbar's count; a details question with nothing picked; a details page "waiting for your answer"; an open goals question; an epic with errors (every phase done, items need you) |
| yellow | open, still undecided                       | an open todo, caveat or test (a todo a review queued too); a reviewed issue or judgement call; "to do"; a saga "in dialog". DARK text and icons on a yellow fill. NOT a state: a favourite epic's star (Owen, 2026-10-10) |
| blue   | do it now, or Claude is working on it       | Do Now, Revisit, Send (everywhere: the page header, the agents panel, details pages); the Underway status card; an item Claude is working on (its chip, the spinner); an epic in progress; a goals topic "building" |
| green  | decided or done (however long ago)          | Approve, Make Todo, a todo's "next phase" plane; a pick, the chosen option (a details page's chosen card); a phase done, the Done status card (filled), the Noted status card (outlined: your choice recorded, nothing built yet); an item decided, done, or approved as it stands, for good; an epic done; a goals topic "agreed", "shipped" |
| orange | ONLY changed since you looked, and warnings; an item Claude answered with options, waiting for your pick (Owen, 2026-10-09) | UPDATE labels, `<epic-update>` blocks, a phase's changed pen; "nobody is listening" (inverted, to stand out); a `replied` item's chip (DARK text on it)                                         |
| violet | Claude's voice                              | his reply cards; "recommended" (a thumbs-up, no word)                                                                                                                                                               |
| ivory  | Owen's voice (the brand's brown tint)       | his note box, a marked note, his reply cards, the answer card; the toolbar                                                                                                                  |
| grey   | no longer relevant, inactive, not chosen    | a canceled item (made moot); a todo's "drop it" x; the note box's "skip this" x; buttons at rest, and once Claude has handled them; a phase to do; a future epic; a paused epic (phases left, untouched for 3 days); a goals topic "draft"                                                                                 |

- No light blue, no light green: one shade per meaning.
- Colour-blind readers tell red and green apart least: the chip's id, the icons and the words keep them readable.

### The fill

How far along a button, pill or chip with a lifecycle is (the review buttons, Send, the Choose pill, saga
labels):

| Fill                   | Means                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| grey outline           | available: nothing pressed                                               |
| DASHED, in its colour  | Owen pressed it, not committed (not sent)                                |
| OUTLINE, in its colour | recorded (sent), or in progress (Claude is on it)                        |
| CLEARED                | handled: a review button is a grey outline again, the chip has the result |
| SOLID                  | only on chips, the step label's DONE, and a Choose pill once applied     |

- The review buttons are Owen's INPUT to Claude (Owen, 2026-10-08): dashed pressed, outline sent / in progress,
  then CLEARED once Claude has handled the mark; the id chip carries the result (green decided, yellow still open,
  red needs you). `review-as` stays in the doc as the record, never drawn on the buttons.
- It flips the old rule (solid meant "not sent yet", 2026-10-06).
- Send never goes solid on a details page: the page can't tell when Claude is done with the answer.
- An item's id chip MATCHES its chosen review button while Owen's mark is live (2026-10-08): that button's colour and fill (Approve pressed, not sent: dashed green).

### The id chip: where your answer stands

Owen, 2026-10-10: "it's not clear when an answer is queued and being addressed, so I keep filling in answers over and
over ... leaning into outlines in the item chips". The chip's FILL says how far your answer got:

- DASHED, in the answer's colour: given, not sent
- OUTLINED: sent: Claude has it, is on it, or the work it asked for is still due
- SOLID: done: Claude did it, or noted it and nothing more is due (the item's state colour)

So a dashed or outlined chip is ANSWERED: don't answer it again. A solid red (needs you) or orange (Claude's options,
your pick) chip waits on you, and only those (the toolbar counts them).

| Your answer                                        | Colour | Dashed: not sent | Outlined: sent, Claude has it, or still due                       | Solid: done                                                    |
| -------------------------------------------------- | ------ | ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Approve                                            | green  | pressed          | sent, until `inbox apply`                                         | green: a call accepted, a test passed; an issue / caveat settled |
| a pick (Choose pill)                               | green  | picked           | sent; still outlined once applied, until the doc's `chosen` reaches the page | green: a question answered, a call accepted (a Noted card) |
| an open question answered (Approve or a pick)      | green  | as above         | as above                                                          | green, decided                                                 |
| Make Todo                                          | green  | pressed          | sent                                                              | green, settled (the new todo is its own item, yellow until queued) |
| a todo's plane, "do it in the next phase"          | green  | pressed          | sent; then QUEUED: outlined until the todo is done                | green, once done                                               |
| a review's "do it" (`queue <id> "work"`)           | green  | --               | queued: outlined until done                                       | green, once done                                               |
| a todo's x, "drop it"                              | grey   | pressed          | sent                                                              | grey, canceled                                                 |
| Revisit, with a note                               | blue   | pressed          | sent: Claude talking it over                                      | yellow (talked over, still open); orange (Claude answered with options: your pick); green if decided |
| Do Now (the wand)                                  | blue   | waiting to be taken | Claude's agent on it                                           | the state's colour                                             |
| work Claude took (an Underway card)                | blue   | --               | outlined until the card is Done or Noted                          | the state's colour                                             |
| a new todo / question from the page                | its section's new row | not sent | sent                                                     | the new item's own chip (a question red, a todo yellow)        |
| urgent / not urgent (clicking the chip)            | red / yellow | a dashed ring | --                                                        | solid red / yellow                                             |

The Choose pill says it in words too: `Choose`, `Chosen · not sent` (dashed), `Chosen · sent` (outlined), `Chosen`
(solid: applied). An answered question's folded `Choices` heading names the chosen option (`✓ Chosen: B · Bananas`),
so the pick stays in sight.

### The review buttons

On an item's line, ONE group, in this order:

1. Approve (check), green
2. Revisit (history), blue
3. Make Todo (list check), green

Then, APART from the group, Do Now (the magic wand, as the header's Review Now:  Owen, 2026-10-09;  it was a paper
plane), blue: it replaces Add Details Now on the line, and the note box's "now". An item Claude has answered or done
keeps the three-button group, so Owen can still approve it.

The NOTE BOX (every one but a todo's:  an item's, an Overview sub-section's, a phase's, the summary's) has two
buttons:  Revisit Later (history), blue, and Skip This (x), grey (Owen, 2026-10-09:  the x replaced the box's Make
Todo, which he never used there;  the line keeps its Make Todo). The x means "nothing to do here":  a `skip` mark,
with the note typed (or none);  no line button wears it, the id chip does, grey. `inbox apply`:  the item reviewed and
nothing else (an open question stays open, no status card), the note kept as Owen's `<epic-reply re="skip">`;  on a
phase, the summary or an Overview sub-section, logged and the note kept;  on a todo, as `drop`.

A TODO's line is different (Owen, 2026-10-09):  ONE group, no Approve, Make Todo or Do Now:

1. Do it in the next phase (paper plane), green:  `inbox apply` queues it into the first phase still to do
   (`queue <name>#<id> "P10 · <name>"`, a Noted card "Queued for P10 · ...";  no phase to do:  "the next phase");
   its chip stays outlined green while it's queued
2. Revisit (history), blue:  "I'm adding a note for you"
3. Drop it (x), grey:  `inbox apply` cancels it ("dropped by Owen in review":  struck through, grey)

Its note box matches:  the plane, Revisit Later, the x;  the plane or the x takes the note along (kept as Owen's
reply when applied).

### Item states

An item's chip (and its filter chip) by its `state`, which the tool writes from its status and review marks on every
edit. The FIRST row that applies wins, top to bottom (`PLAN-DOC.md`, "Items", the same table):

| State       | Colour | When                                                                                         |
| ----------- | ------ | -------------------------------------------------------------------------------------------- |
| `progress`  | blue   | Claude is working on it: an Underway status card, or the working spinner (closed or not)     |
| `old`       | grey   | canceled: no longer relevant (made moot, struck through)                                     |
| `recent`    | green  | decided or done (decided, done), however long ago                                            |
| `open`      | yellow | work a review queued (a todo mark), not started                                              |
| `replied`   | orange | open, and Claude's LAST reply holds options nothing is picked in yet: your turn to pick      |
| `attention` | red    | an open question; an open judgement call or issue not reviewed, unless `calm` (not urgent)   |
| `recent`    | green  | open, settled by a review: approved as it stands, or made a todo                             |
| `open`      | yellow | anything else open: still undecided, not urgent (todos, caveats, tests; reviewed issues and judgement calls; a revisit or Do Now Claude answered) |

- Green across the board for what's decided; grey only for what no longer matters (Owen, 2026-10-08). Neither age
  nor a `/bedtime` run colours a chip any more.
- `replied` (Owen, 2026-10-09; branch `spell-element` until it merges): a pick (`chosen`), a newer reply from you, or
  closing the item ends it; a reply asking without cards (a yes / no in prose) doesn't make it orange.
- The toolbar counts only what needs you: on an epic page, `attention` items in a red badge and `replied` ones in an
  orange one; on other pages, a red badge; none, no badge. The state filter has a chip per state, with how many.
- In CSS: `<epic-page>`'s `--epic-state-*` (`packages/epics`), `spell-doc.css`'s `--spell-state-*` (the other doc
  pages): the same values.
- Saga pages colour their items by the same states (an open question `attention`, any other open item `open`, a
  decided or done one `recent`, a canceled one `old`): the kind shows only in the id's letter (G, Q, D, R, W, I).

### Folding

EVERYTHING boxed in a section folds (Owen, 2026-10-08): every card with a heading band folds from it, the chevron
first -- a reply (Owen's and Claude's), the answer, a status card, a note, an update (`<epic-update>`), an open
question's option card; More Details, Choices, asides, code blocks, Original Discussion and Agents running too. They start open (the item around them starts folded); folding is the page's, never written; find-in-page
reveals folded text.

## Parts

An epic page is stored SPLIT (P3 of `claude-design`, 2026-10-05): a SKELETON plus one BODY file per bulky block, which
the page loads the first time it's opened. So the doc preview opens fast, an edit to one item patches that item, and
nothing flickers. The tool's `EpicParts` does it; the markup (`source`, `part-ids`, `commits`): `PLAN-DOC.md`,
"Parts".

- New docs start split (`new`); `split <name>` splits one, `join <name>` puts it back in one file. Every command
  reads and writes either shape: reading assembles a split doc into one document, the write splits it again.
- The skeleton, `epics/<name>/<name>.plan.html`, keeps everything a reader or a script needs without a body: every
  section, every phase (id, title, status, estimate), every item (id, title, status, state, review marks), the page's
  attributes, the Overview's summary and prompt. So `#id` links, counts, filters, review marks, the docs' home page and
  the main server's epic cards all work without a single body.
- The bodies, `epics/<name>/parts/<id>.html`, `<id>` the block's own id (`.htm` before the switch, 2026-10-08):

  | Host                           | Part             | Holds                                                                       |
  | ------------------------------ | ---------------- | --------------------------------------------------------------------------- |
  | an Overview sub-section, `#o3` | `parts/o3.html`  | its prose (not its title)                                                   |
  | a phase, `#p2`                 | `parts/p2.html`  | its fields: Symptom, Changes, Goal, Done, Commits, Files, Verify, To review |
  | an item with details, `#q7`    | `parts/q7.html`  | its details (not its title)                                                 |
  | the log, `#log`                | `parts/log.html` | its events                                                                  |

- How a part is told from a page: by its folder. Every page walker skips `parts/` folders (`packages/epics/tools/
pages.js` `findPages()`, `relocate.js`, `spell static`): the docs' home page, `docs update` and link repairs never take
  a part for a page.
- A part file: a one-line comment saying whose body it is, then the body's markup. Its relative URLs are relative to
  `parts/`: one `../` more than the skeleton's (`../../../guides/x.html`, not `../../guides/x.html`).
- Edit a body's prose in its part file, at its real path (shared content). Structured edits stay commands.
- Where each body goes is decided by rule on EVERY write: an item that gains details gets a part; a new Overview
  sub-section written whole into the skeleton has its body moved into a part by the next command. Content a host
  holds beside its part (a hand edit) is kept, after the part's: `check` notes it, the next edit moves it in.
- Each write: links and formatting (oxfmt) happen in memory; each file is written once, atomically, and only when
  its text changed: parts first, then the skeleton. A log line rewrites `parts/log.html`; closing an item rewrites
  the skeleton only.
- On the page (served by the page server; bodies don't load from `file://`): a changed part re-fetches its open
  host in place. Find-in-page misses text in bodies not yet opened (C4 of `claude-design`).
- `check` checks a split doc whole: ids and links across skeleton and parts; a missing part is a problem, a part
  nothing loads a note.

## UPDATE markers

ONE element for every update, `<epic-update>` (Owen, 2026-10-11;  `PLAN-DOC.md`, "Updates"). While a phase is
active, flag what changed so the user can spot it:

- a new or changed item gets a bare UPDATE label in its title (the tool adds it: `PLAN-DOC.md`, "Items")
- a changed prose block gets, right AFTER it, an update of the active phase, titled and dated:
  `<epic-update at="2026-10-11 14:30" summary="what changed, one line" phase="2"><p>what changed, and
  why</p></epic-update>`;  an update to a whole Overview sub-section goes last inside it
- `epic phase <name>#2 done` removes phase 2's labels and prose updates
- a note that should STAY once the phase is done (an item partly fixed elsewhere, a decision done):
  `<epic-note state="update" title="partly fixed by J9, 2026-10-06"><p>...</p></epic-note>` (orange `UPDATE`), or
  `state="done"` (green `DONE`)
- a change to a PHASE's plan is the same element, written by `updated <name>#<N>` at the end of the phase's
  description ("What phases and items say"), and it stays
- an older doc's shapes (an UPDATE note BEFORE its block, `<epic-updated>` lines, a Plan changes box) are migrated
  on the tool's next write, or by `migrate` (`updates-as-epic-update`)

## Migrations

- `epic migrate` brings pages up to today's markup: every named, dated step of each page's kind,
  oldest first, each page under its lock, safe to run again (`PLAN-DOC.md`, "Migrations").
- Any change to epic page markup adds its step in the same commit (epics' `AGENTS.md`, "Rules").
- Once it's on `main`: `migrate --all --notify`, and send each `TELL:` line to its session; a session told to run it
  does so at its leisure, and may commit it without asking (the epic skill's "Migrations").

## Review inbox

Owen marks items ON the page (served by the page server): approve, todo, Add Details, revisit (soon / now, with a
note), pick an option. Picks work wherever option cards are (I8 of `epic-components`): a question's, a judgement
call's text, a reply, More Details; the mark names WHICH card set by position (`{ pick: "B", choices: 1 }`; none:
the item's own). An item may carry a pick AND a revisit note together ("pick B, but ..."): the revisit mark holds
the `pick`. A CLOSED item's cards (an answered question, an accepted call) take Choose pills too, on every option
but the chosen one (its pill solid), only while Owen revisits it (its Revisit box open, or a revisit or pick mark):
"pick B instead, because ..." is a revisit carrying the pick, talked over; a plain pick there, once applied, answers
(or approves) it again with that option. The
marks wait in `<name>.inbox.json5` beside the doc (git-ignored) until "send to Claude"; Add Details and revisit now
go at once (the inbox's `now` queue), and Owen may call one off ("nevermind": `canceled`, handed to the waiting
session to stop that item's agent; `epic details` then refuses its write). A todo may carry Owen's note (from
before 2026-10-09, when the note box had Make Todo), written into the new todo;  a skip (the note box's x) its note,
kept as his reply. Read it with `epic inbox <name>`; shape, routes and helpers:
`packages/epics/AGENTS.md`, "Review inbox". NEVER change its data by hand: go through `ReviewInbox`
(`packages/epics/src/tool/ReviewInbox.ts`, its lock). A comment in it is fine: it's JSON5, and every save keeps it
(`DataFile`, epic `epic-workflow` P21), as in every data file the tooling keeps.

The summary and every phase take marks too (epic `airplane` P2), as an Overview sub-section does: Revisit (with a
note), Make Todo, Do Now, no Approve; the summary is keyed `summary` (it has no id), a phase by its id (`p3`). And
Owen can ask for a NEW todo or question from the page: the `+` in the page header, or New todo / New question at the
end of the Todos and Questions sections, opens a small form (todo or question, title, note, what it's about). It
waits in the inbox as a mark under its own key, `new1`, `new2` ... (`{ action: "new", kind, title, note?, near? }`,
`POST new`), drawn at the end of its section until made (Edit, Remove), and goes with the next send like any mark.
All of it works with no session listening: the marks wait, dashed, until Send, Review Now or Do Now wakes the epic
(below).

Review Now (the page header's wand, beside Send; epic `windows-and-review` P4): sends every mark AND turns each
revisit waiting (unsent, or sent and still to talk over) into a request for now (`POST send { now: true }`,
`ReviewInbox.reviewNow()`): the listening session answers them all at once, by background agents, into the items.

WAKING the epic (epic `epic-workflow` P16): Send, Review Now or Do Now pressed while NO session listens makes the page
server wake the epic, inside that request (no process runs while Owen isn't working; `ReviewStart.changeAndWake()`):

- who, first match wins: the ONE running session titled for the epic (`🚧 <epic>`) gets `/epic review <epic>` typed
  in; else the epic's worktree window gets a new session tab with it typed in (opened with `spell dev window launch`
  when closed); else (no worktree: an epic run in the main checkout, a future epic) a new session in a main window.
  Never a new worktree. Owen presses Enter: the window bridge only types
- the page says what it did, in its notice and in the orange pill under the review line, until a session listens:
  "Typed /epic review seo into 🚧 seo: press Enter there"
- once per epic per 10 minutes, or until a session listens: the inbox's `woken` record, claimed under its lock, so
  two Sends at once (the epic page and one of its guides) wake once; a second press says "Already ... at 17:32"
- no wake when several sessions are titled for the epic, in airplane mode, or for a Send with nothing new; the
  pill's click still types the command on purpose
- a Do Now waiting with nobody listening says "waiting for a session" (its tooltip), the usual spinner once taken

How a `/epic review` session takes the marks (it wakes when a background command it started ends, or when the page
server types `/epic review` into it, above):

1. `epic inbox <name> listen`: the page stops saying nobody is reviewing.
   - a HEARTBEAT keeps it so: `wait` stamps `listening.seen` every 30s, and `apply`, `done`, `clear`, `working`
     each time; silent for 90s (a killed session, no `unlisten`), the page says nobody is reviewing again
2. `epic inbox <name> wait` in the BACKGROUND, then end the turn. It exits when there's work, which wakes
   the session; it prints, for each item, its id, kind, status and title, the mark, the note, and a pick's option:

   ```text
   now (1):  start a background agent for each;  `epic inbox review-review#<id> done` after
     - I1  issue, open · The phases' progress bar label is cut off at its left end
         Add Details
   sent 2026-10-04T17:32:26.086-04:00 (4 marks):
     approve (1):
       - J9  judgement, open · A reload lands on the remembered section without unfolding it
     pick (1):
       - Q7  question, open · Should a reload land on the remembered section without unfolding it?
           picks B · Land and unfold it
     revisit, to talk over (1):
       - Q3  question, open · Where should the send button sit?
           picks A · In the page header, asks:  "A, but only on epic pages?"
     ...
   next:  `epic inbox review-review apply` (approve, pick, todo, a todo's next phase or drop, skip, new, urgency)
   ```

   - `now`: Add Details and revisit now, TAKEN off the queue, each item marked `working` (its spinner); the mark
     stays until `done`, unless Owen changed it meanwhile to one waiting for a send (e.g. chose an option: a revisit
     `soon` with the pick): that one stays for the next send
   - `sent`: every mark the last "send to Claude" covered, once per send (`handedOver` in the inbox); a mark an
     earlier send already handed over (a revisit still being talked over) says "(sent before)"
   - `sent from the pages <name> owns` (epic `epic-workflow` P13): Owen's comments on a docs page the epic owns
     (its guide, its details pages, a guide its See Also claims), sent with that page's own Send, each under
     its page; answered one at a time with `epic comments working` / `answer`, never `epic inbox`
   - timeout (3300s): exit 2, nothing taken; run it again

3. `epic inbox <name> apply`: the mechanical marks, applied and cleared:

   | Mark                | On                                                                 | Does                                                                                                                                                                               |
   | ------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | approve             | an open question                                                   | answered with the option marked recommended (`decide`, that option chosen), reviewed; no recommended option: left, "needs talk"                                                    |
   | approve             | an open judgement call                                             | closed (accepted), reviewed                                                                                                                                                        |
   | approve             | an open test                                                       | closed (passed), reviewed                                                                                                                                                          |
   | approve             | anything else (open caveat, issue, todo; closed or answered items) | reviewed                                                                                                                                                                           |
   | pick                | a question                                                         | answered with that option's title, the option chosen (in the card set the mark names), reviewed                                                                                    |
   | pick                | any other item (judgement call, issue, todo, caveat)               | APPROVED with that option: its card set's `chosen` set, then as approve (an open judgement call closed, accepted; reviewed); the option in the log line                            |
   | todo                | any item                                                           | a new todo "Follow up: <title>" linking back, the item reviewed                                                                                                                    |
   | todo                | a phase, the summary, an Overview sub-section                      | a new todo "Follow up: P3 · <title>" (or "the summary", "<title>") linking back (`#p3`, `#overview`, `#o3`); a Noted status card on what was marked                                 |
   | next                | a todo (its plane)                                                 | queued into the first phase still to do (`queued`, work `P10 · <name>`;  none: "the next phase", and the reply says so), a Noted status card "Queued for P10 · <name>", reviewed;  a note kept as Owen's reply |
   | drop                | a todo (its x)                                                     | canceled, "dropped by Owen in review" (struck through, grey), reviewed;  a note kept as Owen's reply                                                                               |
   | skip                | any item but a todo (the note box's x)                             | reviewed, nothing else ("skipped:  nothing to do"):  its status and state as they were, no status card;  a note kept as Owen's reply (`re="skip"`).  On a todo:  as drop               |
   | skip                | a phase, the summary, an Overview sub-section                      | logged ("skipped:  nothing to do");  a note kept as for any of their marks                                                                                                         |
   | approve             | a phase, the summary, an Overview sub-section                      | logged only (the page has no Approve for them)                                                                                                                                     |
   | new                 | a new todo or question (`new1`)                                    | made as `add` makes it: Owen's note its details (a question's lead), "About P3." linking `near`; a Noted status card "Made from the page: Owen's new todo, written <time>."         |
   | revisit soon        | any item                                                           | left: answered INTO the item as a reply (`details --append`), the chat only linking it (Q3 of `windows-and-review`), then `inbox <name>#<id> clear`                                |
   | revisit with a pick | any item                                                           | left, NOT answered ("to talk over: picks B · ..., asks: ..."): answer the note about that option; once Owen agrees, he picks it plainly (a question: or `decide ... --option B`), then `clear` |

   Each applied mark logs one line (`J9 approved:  closed (accepted)`); a mark Owen changed meanwhile stays. Each
   pick, todo and queued todo also gets a "Claude • Noted" status card (outlined, NOT the green Done:  it only
   records Owen's choice, Owen 2026-10-10) saying what was recorded and what happens next (`Chose B · ...:
   recorded as the answer;  waiting for the next phase, P9 · ...`, `Made todo T23 ...`: Q19 of `epic-components`),
   each new item one saying where it came from; an approval none.  A pick riding on a revisit that Claude
   `clear`s or `done`s without deciding stays chosen, with a Noted card. A revisit on a
   phase or the summary is talked over as on an item; `clear` / `done` keep its note as Owen's `<epic-reply>` (in
   the phase, under its Updated lines; under the summary's lede, `slot="notes"`). `clear new1` drops a new item
   without making it.

4. Requests for now: FIRST `epic status <name>#<id> underway "<reading>"` (a blue "Claude •
   Underway" card under Owen's note: what Claude takes the task to be, one or two sentences, no file names; the
   spinner on); then a background agent per item writes into it with `epic details <name>#<id>
[--more | --append] --file <html>` (Add Details: `--more`, a More Details card under the item's text; revisit
   now: `--append` a reply), then `status <name>#<id> done ["<summary>"]` (the same card turns green "Claude •
   Done"; a summary only when worth saying) and `inbox <name>#<id> done`. A revisit talked over (step 3) the same:
   `underway` as it's taken up, `done` once answered. DONE ONLY FOR WORK DONE (an answer or reply written, code
   changed): when all you did was record what Owen chose ("noted, B it is"), `status <name>#<id> noted "<what was
   recorded;  what happens next>"` instead, the calm "Claude • Noted" card. The card's markup: `PLAN-DOC.md`
   "Status cards".
5. `wait` again. On leaving: `inbox <name> unlisten`.

A reply to Owen's revisit note (`details --append`), dated, quoting the note:

```html
<epic-reply from="Claude" at="2026-10-04 17:20" re="why not reuse the details route?">
  <p>The answer ...</p>
  <ul>
    <li>bullets, one idea each</li>
  </ul>
  <epic-choices>
    <epic-option letter="A" title="Reuse it" recommended><ul><li>...</li></ul></epic-option>
    <epic-option letter="B" title="A route of its own"><ul><li>...</li></ul></epic-option>
  </epic-choices>
  <epic-net-effect option="A" recommended><ul><li>...</li></ul></epic-net-effect>
</epic-reply>
```

## Prose

The blocks below are ELEMENTS (P14 of `epic-components`): each draws its own label, fold and colours around prose
that stays plain HTML inside it. Never hand-shape them (`<p><b>Net effect:</b></p>`, `ui-accordion.spell-code`): the
tool turns those old shapes into the elements on the way in (`details --file`, `--details`, `updated`), but prose
edited by hand in a part file isn't passed through it. All of them, with an example each: `PLAN-DOC.md`, "Prose
elements".

- Code: ALWAYS folded and coloured, an `<epic-code>` holding ONE `<pre>` of the code as text (`&lt;` for a `<`):

  ```html
  <epic-code title="file.ts · N lines" language="ts"><pre>const a = 1 &lt; 2</pre></epic-code>
  ```

  Folded to start with (no `open`); `language` as `<ui-code>` takes it (`ts`, `html`, `css`, `json`, `spell`).
- Digressions: a folded `<epic-aside title="why not now">` (drawn `Aside:  why not now`), the prose inside.
- The **Net effect**: `<epic-net-effect>` around its list ("Rules").
- Options, on ANY item (a question's own, a judgement call's, the ones a reply weighs): `<epic-choices>`
  ("Explaining a question or issue").
- A labelled block ("Where:", "What should happen:", "Step:"): `<epic-field label="Where"><p>...</p></epic-field>`
  (no colon: drawn).
- A note that stays: `<epic-note state="update|done" title>` ("UPDATE markers").
- A question's text as first asked: the tool wraps it in `<epic-question>` (`add <name>#Q`, `details --file` on a
  question); written by hand, it's the first thing in the item.
- Link caveats, issues, decisions and phases wherever prose mentions them;  another epic's or a saga's with
  `<epic-link>` ("Ids").

## Explaining a question or issue

Anything the user must decide or weigh in on (a question, an issue with options) gets an explanation the user can
decide from WITHOUT asking back: in the item's details, or an Overview sub-section the item links to when it's long.

- Plain words first: what goes wrong (or what's being chosen), for whom, and how they'd notice. Define every
  coined or jargon word on first use: "stacking: things side by side go one under another when there's no room".
- The real thing: the actual code / markup / CSS rule it's about, excerpted from the file (a folded `<epic-code>`),
  never pseudo-code.
- Concrete cases: name the affected components / examples / tests ("breadcrumb `divider-icon`: the divider stays
  empty in Safari").
- Many values: a `ui-table` (the 19 renamed emoji: name, today, if changed, other names that reach each).
- Options: side by side, an `<epic-choices>` of `<epic-option letter="A" title="...">`, after the item's text (a
  question's) or where the prose weighs them (any item, a reply); each says what changes, the cost, and a short
  code sample; mark ONE `recommended` and say why:

  ```html
  <epic-choices>
    <epic-option letter="A" title="Descriptions move, the tool stays" recommended
      ><ul>
        <li>...</li>
      </ul></epic-option
    >
    <epic-option letter="B" title="The whole tool moves"
      ><ul>
        <li>...</li>
      </ul></epic-option
    >
  </epic-choices>
  ```

  Any item's options are picked (Choose; a question's also `decide --option`): a question is answered with the
  option, any other item approved with it (I8). (An old option grid, `ui-grid.spell-pros-cons`, is still turned into `<epic-choices>` on the way in,
  wherever it sits.)

- Live: when the doc's bundle has the components, a working example (a resizable box for layout; real buttons
  for behaviour); click it through in a browser before handing back.
- Keep code in side-by-side boxes short (~40 columns) or it clips; look at the screenshot.
- End with the **Net effect** (see "Rules").
- The AskUserQuestion that asks it uses the same option names and order as the doc.

## Commands (`epic ...`, from anywhere in the repo)

Every checkout's `epics` is a link to ONE shared copy (epic `shared-content`): run from any checkout, a command
edits the same doc. `--here` (this checkout's copy) is no longer needed: accepted and ignored. `epic` with no
command prints the usage.

| Command                                                                                                                                       | Does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new <name> [--title "..."] [--prompt "..." \| --prompt-file <path>] [--future]`                                                              | copy the tool's template to `epics/<name>/<name>.plan.html`, fill it (the prompt that started the plan goes in the Overview), update the docs' home page; `--future`: a future epic ("Page header"); on a future epic's doc: plans it, promoted where it is                                                                                                                                                                                                                                                                                                                            |
| `add-phase <name> "Short Name" --symptom <html> --changes <html> [--goal <html>] [--files ...] [--verify ...] [--estimate 1-2h] [--before N]` | append a phase: Symptom (one line), Changes (two or three), then the details (the goal a `<ul>`); the estimate the title's badge. Neither `--symptom` nor `--changes`: Goal / Files / Verify. `--before N` (epic `skillz`): insert it as PN instead; PN and every later phase move down one, with their ids, part files and every link and `phase` pointing at them (prose without a link isn't changed); refused once any of them has started. `/epic phase` uses it                                                                                                             |
| `update <name>#P<N> [--symptom ...] [--changes ...] [--goal ...] [--files ...] [--verify ...]`                                                | set a phase's body fields, each in its place (`""` removes one)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `updated <name>#<N> "<html>"` / `--file <path>` `[--summary "..."]`                                                                           | a change to phase N's plan: an `<epic-update>` block at the end of its description, **Update**: <summary> and its date; kept once done; a pen + count on N's title while it isn't done                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `phase <name>#<N> todo\|active\|done [--done <html>] [--no-open]`                                                                             | set a phase's status; `done` removes its UPDATE markers, and `--done` writes its Done field; brings the doc forward in VS Code                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `update <name>#P<N> --estimate "1-2h"`                                                                                                        | change a phase's estimate (its title's badge); the Overview's total follows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `add <name>#Q\|J\|C\|I\|T\|V\|D "<title>" [--details "<html>"] [--calm]`                                                                      | append an item, print its id; a decision (`#D`) is a question born answered (`Q7`); `--calm` (last): a judgement call or issue that wouldn't surprise Owen (the default, "What phases and items say"), yellow (open) rather than red                                                                                                                                                                                                                                                                                                                                              |
| `calm <name>#<id> [<id>...] [--loud]`                                                                                                         | judgement calls / issues already written made not urgent (yellow, open), as a click on the id chip does; logged; `--loud` (last): urgent (red) again                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `close <name>#<id>` / `reopen <name>#<id>`                                                                                                    | close an item (`done`) / open it again                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `cancel <name>#<id> ["why"]`                                                                                                                  | an item made moot by another decision: `canceled`, struck through; logs why; `reopen` undoes it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `decide <name>#<Q id> "<answer>" [--details "<html>"] [--option B]`                                                                           | answer a question: the answer goes INTO it (`decided`), its details in the order it happened: the question's text, its options as a folded Choices (`--option`: the chosen one), then the answer; answering again replaces the answer in place, the old one into its Original Discussion; prints its id                                                                                                                                                                                                                                                                           |
| `commit <name>#P<N> \| <name>#<id> <sha> "<sentence>"`                                                                                        | list a commit under a phase or an item (replaces its entry)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `commits <name> --backfill`                                                                                                                   | list every phase and item commit in the doc's git history that isn't yet (subjects `P3:  Name -- summary`, `Fix I3:  ...`)                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `log <name> "<text>"`                                                                                                                         | add a timestamped line to the log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `prompt <name> "<text>"` / `prompt <name> --file <path>`                                                                                      | set (replace) the prompt quoted in the Overview; `""` removes it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `convert <name> ... \| --all [--dry-run] [--out <folder>] [--verbose]`                                                                        | rewrite docs from the old `ui-*` markup into `<epic-*>` markup, and prove nothing was lost (every id, link target and word); writes ONLY under `--out` (copies); replaced `migrate` and `relayout`                                                                                                                                                                                                                                                                                                                                                                                |
| `split <name> [--dry-run]` / `split --done [--dry-run]`                                                                                       | store a doc as a skeleton plus part files ("Parts"); `--done`: every finished epic with no worktree of its own; "already split" otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `join <name>`                                                                                                                                 | a split doc back into one file, its `parts/` folder removed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `bedtime <name> start "P3-P6"` / `bedtime <name> done "summary"`                                                                              | a `/bedtime` run: bedtime mode on (every change stays green until reviewed; `summary --json`'s `bedtime`) / off; both logged. No report section: the night's judgement calls and issues show red where they belong (D5 of `review-review`)                                                                                                                                                                                                                                                                                                                                        |
| `overnight <name> remove`                                                                                                                     | an older doc's Overnight report section (a `/bedtime` run's, before 2026-10-05): remove it once read                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `review <name>#<id> ["outcome"]`                                                                                                              | mark an item reviewed today; the outcome goes in the log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `defer <name>#<id>`                                                                                                                           | put an item off: dated, still not reviewed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `queue <name>#<id> "work"` / `unqueue <name>#<id>`                                                                                            | work a review decided on, waiting / started or dropped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `items <name> [--section <s>] [--filter unreviewed\|open\|reviewed\|queued\|all] [--json]`                                                    | what a review walks: where reviews stand, the to-do list, each section's counts and items                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `items <name> --section <s> --spec <file>`                                                                                                    | `/epic review`'s item picker as a details page spec (`epic ask new --from`): a checkbox per open item, the not-reviewed ones ticked, each labelled by its id                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `list [--json]`                                                                                                                               | every epic: in progress / future / done, its worktree while it has one (`checkout`), not reviewed / all                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `backfill <name> \| --all [--apply]`                                                                                                          | one-off: items not reviewed that Owen named in a past session of the epic (his message, or a modal he answered); a dry run unless `--apply`, which marks them dated that day (`ReviewBackfill`)                                                                                                                                                                                                                                                                                                                                                                                   |
| `summary <name> [--json]`                                                                                                                     | open questions, judgement calls, issues, caveats, todos, tests, and the next phase                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `docs <name> [--json]`                                                                                                                        | the docs the epic wrote besides its epic page:  wrote (guide, its commits), related (name it, its turns swept up), linked;  its changelog entry.  For `/docs-check`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `decisions <name> [--json]`                                                                                                                   | what the epic page settled:  phases' Done lists and Updated notes, items' status, chosen option and answer (`--json`:  their text).  For `/docs-check`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `summaries <file.html> ...`                                                                                                                   | `summary --json` of each doc, by PATH (a worktree's too), as one JSON object `{ <file>: summary \| { error } }`; for `/epics`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `check <name> [--no-browser] [--links]`                                                                                                       | ids unique, every `#id` link resolves, every phase has a status, a split doc's parts there (checked whole); its file links, printed as `LINK:`, failing only with `--links`; then `check-spell.js`                                                                                                                                                                                                                                                                                                                                                                                |
| `open <name> [--review]`                                                                                                                      | show the doc rendered in VS Code's doc preview (the right side bar's "Spell Docs" tab;  `--review`:  its "Review" tab); needs the spell extension (`spell dev vscode`)                                                                                                                                                                                                                                                                                                                                                                                                            |
| `inbox <name> [--json]`                                                                                                                       | the marks Owen left on the page (`<name>.inbox.json5`), by action, with their items' titles, sent or not; the `now` queue, agents at work, the session listening                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `inbox <name> listen [--session <id>]` / `unlisten`                                                                                           | this session (`$CLAUDE_CODE_SESSION_ID`) waits on the inbox / stopped: the page tells Owen whether anyone is listening                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `inbox <name> wait [--timeout <s>] [--json]`                                                                                                  | block (polls every 1s, default 3300s) until there's work, print it, exit 0; timeout: exit 2. Work: requests for now (taken off the queue, their items marked working) and a send not yet handed over (its marks by action)                                                                                                                                                                                                                                                                                                                                                        |
| `inbox <name> apply [ids...]`                                                                                                                 | apply the sent approve / pick / todo / new marks, and the sent urgency (an id chip clicked: calm or not), to the doc and clear them; prints a line per item and what it left (revisits)                                                                                                                                                                                                                                                                                                                                                                                               |
| `inbox <name>#<id> working on\|off`                                                                                                           | the page's spinner on an item;  a comment (`M3`, keyed `m3` in the inbox, an older inbox's `cm3` read the same;  a checkout before epic-workflow P23 types `cm3`):  its thread's "Claude: thinking…", until `<name>#M3 done`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `status <name>#<id> underway "<reading>"` / `done ["<summary>"]` / `noted "<what>"`                                                           | Claude's status card on an item, Overview sub-section, phase or the summary (`summary`): blue "Claude • Underway" with its reading of the task (spinner on), then the same card green "Claude • Done" when WORK was done, a summary under it when worth saying (spinner off); `noted`: Claude only recorded Owen's choice, an outlined "Claude • Noted" card saying what was recorded and what happens next (an underway card turns noted; `done --filed`, the older spelling, the same) |
| `inbox <name>#<id> done` / `clear`                                                                                                            | an agent finished the item: its mark and spinner go / drop marks (a revisit talked over); a mark's note is kept in the item first, as Owen's reply                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `details <name>#<id> --file <html> [--append \| --more]`                                                                                      | `--more` (Add Details): the item's text stays on top as "Original Reply", the file's HTML in a "More Details" card under it (a second one replaces the card, the old into the Original Discussion); else replace an item's details with the file's HTML, or add it after them (a reply: after the replies); the answer, Original Discussion and commits stay; on an answered question the new text is the question's, laid out again (Choices, then the answer); replacing moves the old text into the item's Original Discussion; logs "I1 details rewritten" / "I1 reply added" |
| `restore <name>#<id> --file <html> [--as-of "YYYY-MM-DD HH:MM"]`                                                                              | put an item's earlier text (recovered from git; old markup welcome) into its Original Discussion: as first written, or dated `--as-of` (when it was replaced), in date order; prints `added` / `unchanged` / `empty`; doesn't stamp the item                                                                                                                                                                                                                                                                                                                                      |
