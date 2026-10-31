# Epic pages

How to write and update `epics/<name>/<name>.plan.html`, the live doc behind a `/epic <name>` session.

- The tool: spell-epic's `src/tool/` (`epic`) edits the structured parts, in `<epic-*>` markup
  (epic `epic-components`, switched over 2026-10-08).
- The template `new` copies: spell-epic's `src/tool/templates/plan.html`. NEVER copy it by hand.
- The MARKUP -- every element, attribute and child, where each goes:
  [`src/tool/PLAN-DOC.md`](../../src/tool/PLAN-DOC.md), and the element definitions
  it points to. This file holds what an author still needs: the rules, the prose, the ids, explaining a question,
  the review loop and the commands.

## Rules

- Use `epic <verb>` wherever one exists (below): it keeps ids, statuses, UPDATE markers and the
  "updated" date consistent, checks the markup before writing, and locks the file against parallel agents.
  Hand-edit only prose: the summary, Overview, phase bodies, item details.
  - in a SPLIT doc (see "Parts"; every new doc), a body's prose is in its part file, `parts/<id>.html`: edit it
    there, at its real path (`<epic folder>/epics/<name>/parts/<id>.html`;  `epic config contentFolder`)
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
- Plain text, plain paths (Owen, 2026-10-10, epic `airplane`: "Text is waaaay to dense to parse quickly"; in
  spell-app, WWOD §6 › "Plain text, plain paths", whose before / after is in `agents/wwod/writing.md`):
  - say what it MEANS: a plain lead line saying what it adds up to, then one fact per bullet
  - at most two code spans in a sentence; the exact settings and values go in a folded `<epic-code>`, or a tooltip
  - no file path in the prose: the NAME, its path its tooltip (the browser's own, `title`):
    `<code title="packages/spell/src/node/buildTsx.ts">buildTsx()</code>`. The tool links it to the file, so a
    click still opens it; and it turns `<code>name</code>, <code>path</code>` or `<code>name</code>
    (<code>path</code>)`, handed to it, into that ("The way in", `PLAN-DOC.md`)
  - no insider shorthand: "reads JSX the way app and ui do", not `jsx: "preserve"`
  - `epic pages fuss <page>` finds what's left: `path-in-prose`, `code-dense`, `dense`
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
  - text already lost: recover it from the epic repo's git history, then `restore ... --as-of
"YYYY-MM-DD HH:MM"` (when it was replaced)
- Keep the doc current as you go: a todo, issue or decision found mid-phase goes in NOW, not at the end.

## Page header

`<epic-page>` draws the whole header from its attributes: the h1, the meta lines, the step label (the active phase,
else `DONE` once every phase is, else the next phase, or `FUTURE`), the bedtime label, the gear (Auto Send and
Theme), Send in the middle while reviewed, and the review line ("To review this doc, type `/epic review <name>`").
None of it is written by hand.

- The `<title>` reads `Epic: <Title>`; `<epic-page title>` holds the title alone (`new` writes both). Scripts
  reading the title drop the `Epic: ` (`TITLE_PREFIX`).
- The meta lines end with the guide, once Doc Review has written one (2026-10-04): a `<a slot="durable">`
  in `<epic-page>`. The guide's own meta list (`ui-list.spell-meta`) starts with the epic page, ONE standard
  line:

  ```html
  <ui-item icon="map"
    ><b>Epic page:</b>
    <a href="/templates/epics/epics/unified-server/unified-server.plan.html" target="unified-server">epic unified-server</a></ui-item
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

The page's STAGE (`<epic-page stage>`, epic `epic-engine` P29): how far planning has got, so which sections show.

- `overview`: only the Overview, Questions and Todo; `phases`: the Phases and Issues too; `building`, or none: everything. A
  hidden section is still in the file: it's only a view
- `epic create` starts every new epic (future ones too) in `overview` (Q15); a page made before stages reads as
  `building`; `epic stage <name> overview|phases|building` sets it by hand
- meanwhile the STAGE BUTTON ends it, on the title row of the work it accepts (Q14;  epic `epic-engine` I180):
  "Accept Overview" on the Overview's, then "Accept Phases" on the Phases section's, before its gear (the header's Send
  stays the paper plane;  the button took its place before I180).  A press
  sends what's unsent with an accept mark; `epic inbox apply` moves the page on a stage, and the session then
  writes the phases, or starts building. Its tooltip counts the open questions: a reminder, never a lock
- while `phases`, an open phase's pills are Looks good and Defer (later: after the other phases, still to do)
- no plan mode (P33): the Overview and its questions are written on the page, and each answer rewrites the Overview,
  its changed words in `<epic-change item="qN">`; the phases come after Accept Overview
- BUILDING starts with CLAUDE'S PLANS for every phase still to do, written UP FRONT (P33; all at once since I117):
  `epic update <name>#P3 --plan "<ol>...</ol>"` writes a `plan` field, "Claude's plan:" with an orange rule, and the
  phase's pills become Accept Phase and Revisit (`<epic-phase plan="waiting">`); Owen's Accept plan marks it accepted
  (`plan="accepted"`, the field's `accepted` time). Then the phases are built straight through, no stop between them:
  - each phase's plan is checked as it starts; a small adjustment is an Update block (`epic updated`, the plan stays
    accepted), a big one a new `--plan`, which waits again
  - `--plan ""` removes it
- the doc pass FLOATS (P33): `add-phase` puts a new phase before a last Doc Review, and reopens a done one
- one question, one choice set: `epic lint` says `ASKS:` for an item asking two open `<epic-choices>` at once (I88)

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
| 5. Todo            | `#todos`      | loose ends: work still to do (todos), and limits and risks we accept (`limit`); "Caveats", `#caveats`, from epic `epic-engine` P32 to P44 (old links follow)                                                                                                                                       |
| 6. Issues          | `#issues`     | problems found, open until fixed                                                                                                                                                                                                                                                                                                                          |
| 7. Manual tests    | `#tests`      | what Owen checks by hand before merging, each a Step (what to do) and what it Should do (`add <name>#M --step ... --should ...`, "A manual test" below); Owen answers them in place (Approve, a Revisit note, the ✕), Start testing on its title has Claude prepare them; `close` one by hand once it passes ("To test" before epic `epic-engine` P44)                                     |
| 8. Log             | `#log`        | the epic's change log: one entry per commit (`<epic-commit at refs>`), newest first, its time, sha, sentence and a chip per phase and item it names; the review lines (answered, active ...) are written but not shown: `epic log <name>` prints them                                                                                                     |

- The elements draw each section's title, icon, rule, fold and `open/all` count: write only its contents.
- Everything starts folded; the reader opens what they want, and the page remembers. A link to any id inside
  (`#q3`, `#p2`) unfolds what hides it and lands on it.
- An Overview sub-section is written by hand: `<epic-section id="o3" kind="overview-part" title="...">`, prose
  inside, nested in `<epic-overview>` (`PLAN-DOC.md`, "The page"). Sub-sub-items: `<h4 id>`.
- NEVER change an `id`: the items, the log and other docs link to them.
- A doc still in the old `ui-*` markup (none since the switch, 2026-10-08) is refused: the converter went in epic
  `repo-split`. `migrate` brings a page already in `<epic-*>` markup up to today's ("Migrations", below).

## Saga pages

A SAGA PAGE is a saga's page, built of the same elements as an epic page (epic `epic-workflow` P15):
`sagas/<saga-id>/<saga-id>.saga.html`, an `<epic-page kind="saga" saga="<id>">`.
- What a saga is:  an epic of epics, the larger aim its epics serve.
  The list, in Owen's order:  `sagas/sagas.json5` (`epic saga list`);  an epic names its saga with `<epic-page saga>`.
- Its sections, fixed, in this order:
  - 1. Overview:  the saga's purpose as its summary, then "Done so far" (`#o1`) and "Ideas not done yet" (`#o2`)
  - 2. Epics (`#epics`):  a card per epic naming the saga, grouped as on the Epics page;  drawn from the page
    server (`<epic-cards>`), never written by hand
  - 3. Questions, 4. Log:  as an epic page's
- Made once by `epic saga page <id>` (`--force` remakes it);  then every verb edits it, named by its short address:
  `epic add SAGA:/epics#Q "..."`, `epic close SAGA:/epics#Q1`, `epic lint SAGA:/epics`.
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

- Items: `q1` questions (answered ones are the decisions), `j1` judgement calls, `t1` todos, `i1` issues, `m1`
  manual tests. Shown as `Q1`, `J1`, `T1` ...
  - a todo is work still to do, or (`<epic-item limit>`) a limit to know about:  `add <name>#T`, `--limit`
  - a comment (Owen's thread on a block, in the review inbox) is `C1` ..., never an item
  - epic `epic-engine` P44 (2026-10-25) renamed the letters, every number kept:  Caveats became Todo (`c1` => `t1`),
    tests became Manual tests (`t1` => `m1`), comments `M1` became `C1`.  The migration `item-renames` did it;  each
    page's log has one line for it.  `add <name>#C` and `#V` are refused, naming the new letters.
  - before that, epic `epic-engine` P32:  `t1` todos and `v1` tests;  the migration `caveats-and-tests` (retired at P44)
    made each todo a caveat, numbered after the last one, and each `v` test a `t`, the same number
  - docs from before 2026-10-04 also had `d1` decisions; each lives on as the answer inside its question (old
    `#d7` links still land there, and `close d7` finds the question)
- Phases: a STABLE id, made once from the name when the phase is added (`p-epic-migrate` for "Epic Migrate"), kept
  through renames and inserts (epic `epic-workflow` P15). Shown as `P1 · Short Name`: the number is its place in the
  list, worked out as the page draws, and the name 2-4 words, so "start P2" is unambiguous. Link to it by its id
  (`#p-epic-migrate`); `epic` takes it by number, id or name (`seo#P2`, `seo#epic-migrate`). An older page's `p2`
  ids still read until `epic migrate` turns them stable, and an old `#p2` link still lands on the 2nd phase.
- Overview sub-sections: `o1` ...
- Link to them in prose: `<a href="#i2">I2</a>`. `epic lint` fails on a link to a missing id.
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
    to the page by the docs runtime. Owen types the same in chat, and `epic pages open | link SAGA:/...` opens
    it.
  - `epic lint --links` and `doc-links.js --check` fail on a saga, page or id that isn't there, and on an epic under a
    saga it doesn't name.

## What phases and items say

The markup is in `PLAN-DOC.md` ("Phases", "Items", "Log"). What to write in each part:

- A phase reads Symptom (one line: what's wrong today), Changes (two or three lines: what changes), then the
  details (Owen, 2026-10-06; P3 of `windows-and-review`): `add-phase --symptom ... --changes ...`;
  `update <name>#P<N> --symptom ...` sets them on a phase written before.
- A "(coherence)" item or change mark: what the coherence review found (epic `coherence`): something in the repos
  that already does part of the plan, or two words for one idea. In a plan still being made it's worked into the
  words; in one being built it's a question for the epic's session. The coherence skill says how (`/coherence`).
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
- A MANUAL TEST (`#tests`, `add <name>#M`) is what Owen checks by hand, written so he can do it
  straight off the page
  (epic `epic-engine` P4, P51):  its fields, in this order, each an `<epic-field label>`:
  - Step:  exactly what to do, short;  `--step`.  A page to open is an ACTION link, shown as a button:
    `<a class="epic-test-action" href="...">Open the Epics page</a>` (an `epic pages link` URL)
    - HOW a step is written (epic `epic-engine` r16;  Owen, 2026-10-22:  "You are making me think too much to do this
      stuff ... put them in code blocks with exactly what I need to type"):
      - it names the app, the window and the menu or keys:  "In VS Code's `⎇ repo-split` window, View > Output (⇧⌘U),
        pick `Spell` in its list", never "the Output panel" (his:  "What is the output panel?")
      - everything to type in a code block, `cd` included:  `<pre><code>cd spell-ui</code></pre>`, or in plain text a
        fenced block;  the page shows each with a Copy button
      - a new terminal in a worktree's window asks which folder:  the step says which to pick, or `cd`s first
      - a wait or a look between commands is a step of its own, between their blocks
      - the real names:  the extension's output channel is `Spell`, not "Spell Language Server"
      - nothing Claude can check itself:  CI (`gh run list`), a command's output, a page's markup are Claude's to check
  - Should:  what should happen;  `--should`
  - Example, optional:  a screenshot Claude took (`--example shot.png`, copied to `tests/<id>.png` beside the page)
    and / or a line of text
  - If not, optional:  what to tell Claude;  `--if-not`
  - e.g. `epic add seo#M "The sitemap lists every guide" --step "Open <a class=\"epic-test-action\"
    href=\"/sitemap.xml\">the sitemap</a>" --should "Every guide is in it" --example sitemap.png`
  - an older test has only prose:  the page shows it as the Step.  `details <name>#M3 --step ... --should ...`
    rewrites one in the fields, its prose kept in the Original Discussion
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
  - Following the repo's house style is one case of calm, not the only one.
    `calm <name>#<id> [<id>...] [--loud]` changes one already written, as a click on its id chip does.
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
| red    | needs you (Owen)                            | an open question's chip; an unreviewed judgement call or issue; a phase whose plan waits for your Accept, or with a choice open in it; the toolbar's count; a details question with nothing picked; a details page "waiting for your answer"; an open goals question; an epic with errors (every phase done, items need you) |
| yellow | open, still undecided                       | an open todo or test (a todo a review queued too); a reviewed issue or judgement call; "to do"; a saga "in dialog". DARK text and icons on a yellow fill. NOT a state: a favourite epic's star (Owen, 2026-10-10) |
| blue   | do it now, or Claude is working on it       | Revisit, Send (everywhere: the page header, the agents panel, details pages); the Underway status card; an item Claude is working on (its chip, the spinner); a phase under way or worked on; a phase SCHEDULED, still to do (a DOTTED blue outline); an epic in progress; a goals topic "building" |
| green  | decided or done (however long ago)          | Approve, Make Todo, a todo's "next phase" plane; a pick, the chosen option (a details page's chosen card); a phase done in the last 3 days, the Done status card (filled: the item's work finished), the Noted status card (outlined: a step done, your choice recorded or an answer written, the item not finished); an item decided, done, or approved as it stands, for good; an epic done; a goals topic "agreed", "shipped" |
| orange | ONLY changed since you looked, and warnings; an item Claude answered with options, waiting for your pick (Owen, 2026-10-09) | UPDATE labels, `<epic-update>` blocks, a phase's changed pen, a phase changed since you looked (its chip and circle); "nobody is listening" (inverted, to stand out); a `replied` item's chip (DARK text on it)                                         |
| violet | a person's voice (you, everyone alike): `--epic-voice-person`, `-text`, `-fill`, `-rule` | a person's reply cards (their mark, name, faint fill and rule); the note box; "recommended" (a thumbs-up, no word) |
| terracotta | an agent's voice (Claude's, Codex's ...): `--epic-voice-agent`, `-text` | an agent's reply cards: their round mark, and their name (the card stays white); an agent's comment-thread messages (their light box) and its "thinking…" stub; a page note's Claude replies and its "answered" chip; a comment's quote while it waits for an agent (epic `epic-friend` P10, Q16: violet before) |
| ivory  | the page's own warm ground (the brand's brown tint) | the answer card; a marked note (what you said, once marked); the toolbar; a comment thread's ground, where a person's words sit plain |
| grey   | no longer relevant, inactive, not chosen    | a canceled item (made moot); a todo's "drop it" x; the note box's "skip this" x; buttons at rest, and once Claude has handled them; a phase done longer ago; a future epic; a paused epic (phases left, untouched for 3 days); a goals topic "draft"                                                                                 |

- The voices are theme tokens (epic `epic-friend` T11): tweak them in `<epic-page>`'s theme block (`EpicPage.css`,
  "Voices"), or on a page with `epic-page { --epic-voice-agent: ... }`; the docs pages' copies are `spell-doc.css`'s
  `--spell-voice-*` (change both).
- A colour per person and per agent (epic `epic-friend` P10, Q16): the repo's epic settings, `colors` in
  `.epic/config.json5` (`{ people: { ana: "#2f9e6e" }, agents: { codex: "#0f8b8d" } }`), become each one's own token,
  `--epic-voice-person-ana`, `--epic-voice-agent-codex`; a reply or thread message draws in its speaker's, an agent's
  words in the agent's. Anyone without one keeps the shared voice.
- No light blue, no light green: one shade per meaning.
- Colour-blind readers tell red and green apart least: the chip's id, the icons and the words keep them readable.
- A PHASE takes ONE of these, the first that holds (epic `epic-engine` I170; Owen, 2026-10-29: "The order, one chip
  per phase: red, orange, blue (working), dotted blue, green, grey"): its Phases chip and its status circle alike.
  - red: its plan waits for your Accept, or a choice in it is open
  - orange: changed since you looked (new updates, not Seen, under 3 days old)
  - blue: under way, or Claude at work on it (counted in the blue badge)
  - DOTTED blue: scheduled, still to do
  - green: done in the last 3 days (`done-at`)
  - grey: done longer ago

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
- An item's id chip wears the FILL of Owen's live mark, in its own state's colour (Owen, 2026-10-11): a red question
  marked Approve, not sent, is a dashed red chip. From 2026-10-08 it took the button's colour too, until a red item
  marked Revisit turned blue and its section's red count matched no chip.

### The id chip: where your answer stands

Owen, 2026-10-10: "it's not clear when an answer is queued and being addressed, so I keep filling in answers over and
over ... leaning into outlines in the item chips". The chip's FILL says how far your answer got:

- DASHED: given, not sent
- OUTLINED: sent: Claude has it, is on it, or the work it asked for is still due
- SOLID: done: Claude did it, or noted it and nothing more is due (the item's state colour)

While your own mark is live (dashed, or outlined once sent) the chip keeps its state's colour, and the Colour column
below is the button's. Once Claude has it in hand, the outline takes the column's colour: a pick taken, a todo
queued (green), work underway (blue).

So a dashed or outlined chip is ANSWERED: don't answer it again. A solid red (needs you) or orange (Claude's options,
your pick) chip waits on you, and only those (the toolbar counts them).

| Your answer                                        | Colour | Dashed: not sent | Outlined: sent, Claude has it, or still due                       | Solid: done                                                    |
| -------------------------------------------------- | ------ | ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Approve                                            | green  | pressed          | sent, until `inbox apply`                                         | green: a call accepted, a test passed; an issue / todo settled |
| a pick (Choose pill)                               | green  | picked           | sent; still outlined once applied, until the doc's `chosen` reaches the page | green: a question answered, a call accepted (a Noted card) |
| an open question answered (Approve or a pick)      | green  | as above         | as above                                                          | green, decided                                                 |
| Make Todo                                        | green  | pressed          | sent                                                              | green, settled (the new todo is its own item, yellow until queued) |
| a todo's plane, "do it in the next phase"        | green  | pressed          | sent; then QUEUED: outlined until the todo is done              | green, once done                                               |
| a review's "do it" (`queue <id> "work"`)           | green  | --               | queued: outlined until done                                       | green, once done                                               |
| a todo's x, "drop it"                            | grey   | pressed          | sent                                                              | grey, canceled                                                 |
| Revisit, with a note                               | blue   | pressed          | sent: Claude talking it over                                      | yellow (talked over, still open); orange (Claude answered with options: your pick); green if decided |
| work Claude took (an Underway card)                | blue   | --               | outlined until the card is Done or Noted                          | the state's colour                                             |
| a new todo / question from the page              | its section's new row | not sent | sent                                                     | the new item's own chip (a question red, a todo yellow)      |
| urgent / not urgent (clicking the chip)            | red / yellow | a dashed ring | --                                                        | solid red / yellow                                             |

The Choose pill says it in words too: `Choose`, `Chosen · not sent` (dashed), `Chosen · sent` (outlined), `Chosen`
(solid: applied). An answered question's folded `Choices` heading names the chosen option (`✓ Chosen: B · Bananas`),
so the pick stays in sight.

### The review buttons

On an item's line, ONE group, in this order:

1. Make Todo (list check), green:  a new todo, work to follow it up
2. Revisit (history), blue
3. Approve (check), green

(Owen, 2026-10-25:  "`todo` is first, then `revisit`, then `check`".)  No Do Now (the wand) since that day:  "In
practice, I'm never using the wand";  the inbox still takes an older page's request for now. An item Claude has
answered or done keeps the three-button group, so Owen can still approve it.

A phase still to do has Do this (thumbs up), green, then Revisit:  "yes, build this phase", the same `todo` mark,
which `inbox apply` takes as a go-ahead, never a new todo (epic `epic-engine` I181;  Owen, 2026-10-29:  "it's already a
phase, you wouldn't make it a todo").  Every button that means "accept this" is a thumbs up:  Accept plan, a plan
accepted's state, Accept Overview / Accept Phases, Looks good.

The NOTE BOX (every one but a work todo's:  an item's, an Overview sub-section's, a phase's, the summary's) has two
buttons:  Revisit Later (history), blue, and Skip This (x), grey (Owen, 2026-10-09:  the x replaced the box's Make
Todo, which he never used there;  the line keeps its Make Todo). The x means "nothing to do here":  a `skip` mark,
with the note typed (or none);  no line button wears it, the id chip does, grey. `inbox apply`:  the item reviewed and
nothing else (an open question stays open, no status card), the note kept as Owen's `<epic-reply re="skip">`;  on a
phase, the summary or an Overview sub-section, logged and the note kept;  on a work todo, as `drop`.

A WORK todo's line is different (no `limit`;  Owen, 2026-10-09):  ONE group, no Approve or Make
Todo:

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
| `open`      | yellow | work a review queued (a Make Todo or plane mark), not started                                              |
| `replied`   | orange | open, and Claude's LAST reply holds options nothing is picked in yet: your turn to pick      |
| `attention` | red    | an open question; an open judgement call or issue not reviewed, unless `calm` (not urgent)   |
| `recent`    | green  | open, settled by a review: approved as it stands, or made a todo                           |
| `open`      | yellow | anything else open: still undecided, not urgent (todos, tests; reviewed issues and judgement calls; a revisit or request for now Claude answered) |

- Green across the board for what's decided; grey only for what no longer matters (Owen, 2026-10-08). Neither age
  nor a `/bedtime` run colours a chip any more.
- `replied` (Owen, 2026-10-09; branch `spell-element` until it merges): a pick (`chosen`), a newer reply from you, or
  closing the item ends it; a reply asking without cards (a yes / no in prose) doesn't make it orange.
- The toolbar counts only what needs you: on an epic page, `attention` items in a red badge and `replied` ones in an
  orange one; on other pages, a red badge; none, no badge. The state filter has a chip per state, with how many.
- In CSS: `<epic-page>`'s `--epic-state-*` (`spell-epic`), `spell-doc.css`'s `--spell-state-*` (the other doc
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

- How a part is told from a page: by its folder. Every page walker skips `parts/` folders (spell-epic's `src/tools/
pages.js` `findPages()`, `spell ssr`): the docs' home page, `docs update` and link repairs never take
  a part for a page.
- A part file: a one-line comment saying whose body it is, then the body's markup. Its links are ROOT PATHS, as the
  skeleton's are (`/guides/x.html`, `/ui/src/x.ts`;  epic `epic-engine` P46): the same text in a part and in
  its page, from any folder. Only a part's own `parts/` siblings go by name.
- Edit a body's prose in its part file, at its real path (in the epic repo). Structured edits stay commands.
- Where each body goes is decided by rule on EVERY write: an item that gains details gets a part; a new Overview
  sub-section written whole into the skeleton has its body moved into a part by the next command. Content a host
  holds beside its part (a hand edit) is kept, after the part's: `check` notes it, the next edit moves it in.
- Each write: links and formatting (oxfmt) happen in memory; each file is written once, atomically, and only when
  its text changed: parts first, then the skeleton. A log line rewrites `parts/log.html`; closing an item rewrites
  the skeleton only.
- On the page (served by the page server; bodies don't load from `file://`): a changed part re-fetches its open
  host in place. Find-in-page misses text in bodies not yet opened (T4 of `claude-design`).
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
- an older doc's shapes (an UPDATE note BEFORE its block, `<epic-updated>` lines, a Plan changes box) were migrated
  once, every page (`updates-as-epic-update`, gone since epic `repo-split`)

## Change marks

When an ANSWER rewrites the Overview or a phase (epic `epic-engine` P30;  Q13, B), mark the changed or new WORDS, not
the block:  `<epic-change item="q16">the new words</epic-change>`, the question's id alone.

They need no approval (Owen, 2026-10-25:  "I already answered the question"), and never hold the work up.

- One mark per change, around just the words that changed;  a sentence may hold several.
- Write it in the part file as you rewrite it, or in the HTML you hand a command;  then `epic change <name>` stamps
  it (its id `ch3`, time, the question's answer in short) and lists them.  Any `epic` edit stamps it too;
  `epic lint` fails one not stamped, or naming no item.  `--for q16` names the marks written with no `item`.
- Owen sees the words on an orange ground for 3 days, then quiet, and a folded `Q16` chip (the question and its
  answer) for good.  While it's new, a tooltip on the words offers Reopen;  `epic inbox apply` reopens the question
  (answer it again, then rewrite the words with a new mark).
- In a PHASE's text, the mark also marks its item HANDLED in that phase (epic `epic-engine` P31):  grey, quiet in the
  lists, its line linking the phase.  So rewrite the phase from the item, marking the words, and the item tidies
  itself away;  Reopen on the mark brings it back.
- Not instead of the rest:  a phase's PLAN change is still `updated`'s `<epic-update>`;  the Update blocks written
  before stay as they are.  The rules:  `PLAN-DOC.md`, "Change marks".

## Migrations

- `epic migrate` brings pages up to today's markup: every named, dated step of each page's kind,
  oldest first, each page under its lock, safe to run again (`PLAN-DOC.md`, "Migrations").
- Any change to epic page markup adds its step in the same commit (epics' `AGENTS.md`, "Rules").
- Once it's on `main`: `migrate --all --notify`, and send each `TELL:` line to its session; a session told to run it
  does so at its leisure, and may commit it without asking (the epic skill's "Migrations").

## Review inbox

Owen marks items ON the page (served by the page server): approve, Make Todo, Add Details, revisit (soon / now, with a
note), pick an option. Revisit on a judgement call or a work todo puts `do it` in its EMPTY note box, selected and saved as
his draft (Owen, 2026-10-19:  "I generally want you to just do it"):  he types over it when he means something else,
and a revisit note `do it` means do it, no question back. Picks work wherever option cards are (I8 of `epic-components`): a question's, a judgement
call's text, a reply, More Details; the mark names WHICH card set by position (`{ pick: "B", choices: 1 }`; none:
the item's own). An item may carry a pick AND a revisit note together ("pick B, but ..."): the revisit mark holds
the `pick`. A CLOSED item's cards (an answered question, an accepted call) take Choose pills too, on every option
but the chosen one (its pill solid), only while Owen revisits it (its Revisit box open, or a revisit or pick mark):
"pick B instead, because ..." is a revisit carrying the pick, talked over; a plain pick there, once applied, answers
(or approves) it again with that option. The
marks wait in `<name>.inbox.json5` beside the doc (git-ignored) until "send to Claude"; Add Details and revisit now
go at once (the inbox's `now` queue), and Owen may call one off ("nevermind": `canceled`, handed to the waiting
session to stop that item's agent; `epic details` then refuses its write). A Make Todo may carry Owen's note (from
before 2026-10-09, when the note box had Make Todo), written into the new todo;  a skip (the note box's x) its note,
kept as his reply. Read it with `epic inbox <name>`; shape, routes and helpers:
spell-epic's `src/AGENTS.md`, "Review inbox". NEVER change its data by hand: go through `ReviewInbox`
(spell-epic's `src/tool/ReviewInbox.ts`, its lock). A comment in it is fine: it's JSON5, and every save keeps it
(`DataFile`, epic `epic-workflow` P21), as in every data file the tooling keeps.

The summary and every phase take marks too (epic `airplane` P2), as an Overview sub-section does: Revisit (with a
note), Make Todo, no Approve; the summary is keyed `summary` (it has no id), a phase by its id (`p3`). And
Owen can ask for a NEW todo or question from the page: the `+` in the page header, or New todo / New question at
the end of the Todo and Questions sections, opens a small form (todo or question, title, note, what it's about). It
waits in the inbox as a mark under its own key, `new1`, `new2` ... (`{ action: "new", kind, title, note?, near? }`,
`POST new`), drawn at the end of its section until made (Edit, Remove), and goes with the next send like any mark.
All of it works with no session listening: the marks wait, dashed, until Send wakes the epic
(below).

TESTS, answered on the page (epic `epic-engine` P51, Q53;  the separate test run, its Passed / Failed / Skip /
Not now and its P / F / S / N keys, are gone): Owen answers a manual test where it is, in the Manual tests section,
with the page's own marks, sent with Send like any other:

- Approve: passed;  `inbox apply` closes it.
- A Revisit note, or a comment in its Step or Should (which presses Revisit itself, I158): what he saw, often with a
  picture. Left for the session: it closes the test when his note says it passed, else files an issue
  "M3 failed: <title>" holding his note and picture, linked both ways, the test left open.
- The note box's ✕ (`skip`): `inbox apply` CANCELS it, "no longer applies";  a note says why.
- Left alone: still open;  nothing to press for "not now".
- A test Claude checked itself and saw pass, Claude MAY close, with a Done card saying how and the picture
  (Q58): the one exception to "a manual test is Owen's to close".

A PICTURE in any note box: pasted (⌘V), dropped, or chosen with the box's picture button;  saved beside the page
(`tests/m3-20261029-1432.png`, `POST shot`, any item's id), shown under the words (a click: full size), its ✕ takes it
out. It rides in the note's mark as `shot`;  a picture alone is a revisit. `epic inbox <name>` and `wait` print
`screenshot: tests/...png` under the mark.

START TESTING, the Manual tests section's button (on its title, while reviewed and a test is open):

- "Start testing · 9": a request for now, `{ action: "prepare" }` keyed `tests` (the section's id). The session checks
  every open test it can (commands, CI, a headless screenshot), closes the ones that pass (Q58) and files the ones
  that fail, writes the rest out in the explicit Step form with an Example, orders them so tests in the same window
  come together, stamps each `prepared="<n>"` (`details <name>#M3 --prepared <n>`), then `inbox done <name>#tests`.
  Nobody listening: the page server wakes the epic, as for Add Details.
- "Preparing tests" while it's worked;  a click calls it off.
- Done: the page opens the first open test. Then "Next test · 3 left" opens the next one he hasn't marked;  none
  left: "Go through the tests · N". With every test prepared it never asks Claude again.
- `epic test <name>` opens the page in the Review tab with Start testing pressed (`?test=1`);  `epic test --all` every
  epic's, the section's last line linking the next epic with open tests.
- His order, on the page and in `epic test --list`: prepared tests by place, then page order, deferred last.

An OLD `{ action: "test", result, note?, shot? }` mark (sent from the test run before P51) still applies (the
`test ...` rows below), so nothing sent before is lost.

AUTO SEND (the page header's Send; epic `epic-engine` P20, P53, in place of `windows-and-review` P4's Review Now):
with something unsent, a ring round the paper plane drains while Owen leaves the page alone, and at its end Send goes
by itself, as a press would. A press still sends at once.

- How long:  the header's gear, "Auto Send":  Immediately (each change as it's finished, no ring), 2 minutes (the
  default), 5 minutes, or Off (the plane filled blue until he presses it). Remembered in his browser for every page
  (`spell-epics:auto-send`).
- Every key, click or scroll starts the wait again;  a note box with words in it and the focus holds the ring full.
- It runs whether or not a session listens:  with nobody listening, its send wakes the epic (below).
- That send hands over every mark AND turns each revisit waiting (unsent, or sent and still to talk over) into a
  request for now (`POST send { now: true }`, `ReviewInbox.reviewNow()`), as Review Now did:  the listening session
  answers them all at once, by background agents, into the items.
- It only ever sends the marks, never accepts a stage:  Accept Overview and Accept Phases are their sections' own
  buttons (`<epic-stage-button>`, epic `epic-engine` I180).
- Only an epic page's header counts down:  a details page's or a guide's Send waits for a press.
- The wand that turned the countdown on and off (P20) is gone for good.

Typing in a note box turns its Revisit on at the first key (`ReviewClient.saveTyped()`), the box staying open.

WAKING the epic (epic `epic-workflow` P16): Send while NO session listens makes the page
server wake the epic, inside that request (no process runs while Owen isn't working; `ReviewStart.changeAndWake()`):

- who, first match wins: the ONE running session titled for the epic (`🚧 <epic>`) gets `/epic review <epic>` typed
  in; else the epic's worktree window gets a new session tab with it typed in (opened with `epic window launch`
  when closed); else (no worktree: an epic run in the main checkout, a future epic) a new session in a main window.
  Never a new worktree. Owen presses Enter: the window bridge only types
- the page says what it did, in its notice and in the orange pill under the review line, until a session listens:
  "Typed /epic review seo into 🚧 seo: press Enter there"
- once per epic per 10 minutes, or until a session listens: the inbox's `woken` record, claimed under its lock, so
  two Sends at once (the epic page and one of its guides) wake once; a second press says "Already ... at 17:32"
- no wake when several sessions are titled for the epic, in airplane mode, or for a Send with nothing new; the
  pill's click still types the command on purpose
- a revisit now waiting with nobody listening says "waiting for a session" (its tooltip), the usual spinner once taken

How a `/epic review` session takes the marks (it wakes when a background command it started ends, or when the page
server types `/epic review` into it, above):

1. `epic inbox watch <name>`: the page stops saying nobody is reviewing.
   - a HEARTBEAT keeps it so: `wait` stamps `listening.seen` every 30s, and `apply`, `done`, `clear`, `working`
     each time; silent for 90s (a killed session, no `ignore`), the page says nobody is reviewing again
2. `epic inbox wait <name>` in the BACKGROUND, then end the turn. It exits when there's work, which wakes
   the session; it prints, for each item, its id, kind, status and title, the mark, the note, and a pick's option:

   ```text
   now (1):  start a background agent for each;  `epic inbox done review-review#<id>` after
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
   next:  `epic inbox apply review-review` (approve, pick, Make Todo, a todo's next phase or drop, skip, new, test results, urgency)
   ```

   - `now`: Add Details, revisit now and Start testing (`tests`, "Start testing: check the open tests you can, write
     out the rest"), TAKEN off the queue, each item marked `working` (its spinner); the mark
     stays until `done`, unless Owen changed it meanwhile to one waiting for a send (e.g. chose an option: a revisit
     `soon` with the pick): that one stays for the next send
   - `sent`: every mark the last "send to Claude" covered, once per send (`handedOver` in the inbox); a mark an
     earlier send already handed over (a revisit still being talked over) says "(sent before)"
   - `sent from the pages <name> owns` (epic `epic-workflow` P13): Owen's comments on a docs page the epic owns
     (its guide, its details pages, a guide its See Also claims), sent with that page's own Send, each under
     its page; answered one at a time with `epic comments working` / `answer`, never `epic inbox`
   - timeout (3300s): exit 2, nothing taken; run it again

3. `epic inbox apply <name>`: the mechanical marks, applied and cleared:

   | Mark                | On                                                                 | Does                                                                                                                                                                               |
   | ------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | approve             | an open question                                                   | answered with the option marked recommended (`decide`, that option chosen), reviewed; no recommended option: left, "needs talk"                                                    |
   | approve             | an open judgement call                                             | closed (accepted), reviewed                                                                                                                                                        |
   | approve             | an open test                                                       | closed (passed), reviewed                                                                                                                                                          |
   | test passed         | a test (an old test-run mark)                                          | closed (done), reviewed, a `failed` from an earlier run gone;  logged "M3 passed (Owen's run)";  his comment kept as his reply (read it:  it may still need work)                 |
   | test failed         | a test                                                             | a NEW issue "M3 failed:  <title>", his comment and screenshot (an `<img>`) in it, linking the test (the comment on the test too, as his reply);  the test stays open (a closed one reopens), reviewed, `failed="i42"`, a Noted card linking the issue.  `apply` lists each failure's issue:  tell Owen one line each, with its link |
   | test skip           | a test                                                             | canceled, "no longer applies (Owen's run)" (his comment after it), reviewed;  the comment kept as his reply                                                                       |
   | test notnow         | a test                                                             | stays open, deferred today:  the next run puts it last;  his comment kept as his reply                                                                                             |
   | approve             | anything else (open todo, issue; closed or answered items)       | reviewed                                                                                                                                                                           |
   | pick                | a question                                                         | answered with that option's title, the option chosen (in the card set the mark names), reviewed                                                                                    |
   | pick                | any other item (judgement call, issue, todo)                     | APPROVED with that option: its card set's `chosen` set, then as approve (an open judgement call closed, accepted; reviewed); the option in the log line                            |
   | todo                | any item                                                           | Make Todo:  a new todo "Follow up: <title>" linking back, the item reviewed                                                                                                    |
   | todo                | a phase, the summary, an Overview sub-section                      | a new todo "Follow up: P3 · <title>" (or "the summary", "<title>") linking back (`#p3`, `#overview`, `#o3`); a Noted status card on what was marked                                 |
   | next                | a work todo (its plane)                                          | queued into the first phase still to do (`queued`, work `P10 · <name>`;  none: "the next phase", and the reply says so), a Noted status card "Queued for P10 · <name>", reviewed;  a note kept as Owen's reply |
   | drop                | a work todo (its x)                                              | canceled, "dropped by Owen in review" (struck through, grey), reviewed;  a note kept as Owen's reply                                                                               |
   | skip                | a test (the note box's x)                                       | canceled, "no longer applies" (P51), reviewed;  a note kept as Owen's reply, the reason                                                                                         |
   | skip                | any item but a work todo (the note box's x)                      | reviewed, nothing else ("skipped:  nothing to do"):  its status and state as they were, no status card;  a note kept as Owen's reply (`re="skip"`).  On a work todo:  as drop             |
   | skip                | a phase, the summary, an Overview sub-section                      | logged ("skipped:  nothing to do");  a note kept as for any of their marks                                                                                                         |
   | approve             | a phase, the summary, an Overview sub-section                      | logged only (the page has no Approve for them)                                                                                                                                     |
   | new                 | a new todo or question (`new1`)                                  | made as `add` makes it: Owen's note its details (a question's lead), "About P3." linking `near`; a Noted status card "Made from the page: Owen's new todo, written <time>."         |
   | revisit soon        | any item                                                           | left: answered INTO the item as a reply (`details --append`), the chat only linking it (Q3 of `windows-and-review`), then `inbox clear <name>#<id>`                                |
   | revisit with a pick | any item                                                           | left, NOT answered ("to talk over: picks B · ..., asks: ..."): answer the note about that option; once Owen agrees (a pick, or in words), record it:  `choose <name>#<id> B "<outcome>"` on any item, then `clear` |

   Each applied mark logs one line (`J9 approved:  closed (accepted)`); a mark Owen changed meanwhile stays. Each
   pick, todo made and todo queued also gets a "Claude • Noted" status card (outlined, NOT the green Done:  it only
   records Owen's choice, Owen 2026-10-10) saying what was recorded and what happens next (`Chose B · ...:
   recorded as the answer;  waiting for the next phase, P9 · ...`, `Made todo T23 ...`: Q19 of `epic-components`),
   each new item one saying where it came from; an approval none.  A pick riding on a revisit that Claude
   `clear`s or `done`s without deciding stays chosen, with a Noted card. A revisit on a
   phase or the summary is talked over as on an item; `clear` / `done` keep its note as Owen's `<epic-reply>` (in
   the phase, under its Updated lines; under the summary's lede, `slot="notes"`). `clear new1` drops a new item
   without making it.

4. Requests for now: FIRST `epic update <name>#<id> underway "<reading>"` (a blue "Claude •
   Underway" card under Owen's note: what Claude takes the task to be, one or two sentences, no file names; the
   spinner on); then a background agent per item writes into it with `epic details <name>#<id>
[--more | --append] --file <html>` (Add Details: `--more`, a More Details card under the item's text; revisit
   now: `--append` a reply), then `update <name>#<id> noted "<what was written>"` (the same card turns the calm
   "Claude • Noted": a STEP done, the item not finished) and `inbox done <name>#<id>`. A revisit talked over (step 3)
   the same: `underway` as it's taken up, `noted` once answered. THE THREE CARDS (epic `epic-engine` I148): `underway`
   while Claude is on it; `noted` for a step done that doesn't finish the item (Owen's choice recorded, "noted, B it
   is"; an answer, reply, details or summary written; a request called off); `done ["<summary>"]` ONLY when the
   item's work is FINISHED (an issue fixed, a todo built): the card turns green "Claude • Done", and an open issue
   or todo CLOSES with it, as `epic close` does (a question is decided, never done; a judgement call or manual test
   is Owen's to close, but a test Claude checked itself it closes with `close`, Q58). The card's markup: `PLAN-DOC.md` "Status cards".
5. `wait` again. On leaving: `inbox ignore <name>`.

A reply to Owen's revisit note (`details --append`), dated, quoting the note.
Write `from="Claude"`:  the tool marks it yours on the way in, `agent="claude"`, its `from` whose session wrote it
(epic `epic-friend` P2), so the page draws "Claude (Ana)" to everyone but Ana.

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
- Link todos, issues, decisions and phases wherever prose mentions them;  another epic's or a saga's with
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
- Many values: a `ui-table` (the 19 renamed emoji: name, today, if changed, other names that reach each), always
  `<ui-table celled padding="compact" appearance="striped" unstackable>`: never stacked, at any width (Owen, 2026-10-19: a table drawn in the
  side bar as its header cells, then each row's cells one under another, "I hate it"). Too wide, it scrolls sideways
  in its own box.
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

  Any item's options are picked (Choose;  settled in words:  `choose <name>#<id> <letter>`;  a question's also `decide --option`): a question is answered with the
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
| `add <name>#Q\|J\|T\|I\|M\|D "<title>" [--details "<html>"] [--calm]`                                                                        | append an item, print its id; `#T` a todo, work still to do (`--limit`:  a limit to know about); `#M` a manual test (`#C` and `#V`, the letters before epic-engine P44, refused); a decision (`#D`) is a question born answered (`Q7`); `--calm` (last): a judgement call or issue that wouldn't surprise Owen (the default, "What phases and items say"), yellow (open) rather than red                                                                                                                                                                                                                                                                                                                                              |
| `calm <name>#<id> [<id>...] [--loud]`                                                                                                         | judgement calls / issues already written made not urgent (yellow, open), as a click on the id chip does; logged; `--loud` (last): urgent (red) again                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `change <name> [--for <item id>]`                                                                                                                | stamp the change marks written by hand (`<epic-change item>`:  id, time, answer;  every edit does too) and list them, new first;  `--for`:  the item of the marks that name none (P30) |
| `close <name>#<id>` / `reopen <name>#<id>`                                                                                                    | close an item (`done`) / open it again                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `cancel <name>#<id> ["why"]`                                                                                                                  | an item made moot by another decision: `canceled`, struck through; logs why; `reopen` undoes it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `decide <name>#<Q id> "<answer>" [--details "<html>"] [--option B]`                                                                           | answer a question: the answer goes INTO it (`decided`), its details in the order it happened: the question's text, its options as a folded Choices (`--option`: the chosen one), then the answer; answering again replaces the answer in place, the old one into its Original Discussion; prints its id                                                                                                                                                                                                                                                                           |
| `commit <name>#P<N> \| <name>#<id> <sha> "<sentence>"`                                                                                        | list a commit under a phase or an item (replaces its entry)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `commits <name> --backfill`                                                                                                                   | list every phase and item commit in the doc's git history that isn't yet (subjects `P3:  Name -- summary`, `Fix I3:  ...`), each also an entry in the Log                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `log <name> ["<text>"] [--last <n>]`                                                                                                          | add a timestamped review line to the log (not shown on the page); no text: print the newest 20                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `prompt <name> "<text>"` / `prompt <name> --file <path>`                                                                                      | set (replace) the prompt quoted in the Overview; `""` removes it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `split <name> [--dry-run]` / `split --done [--dry-run]`                                                                                       | store a doc as a skeleton plus part files ("Parts"); `--done`: every finished epic with no worktree of its own; "already split" otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `join <name>`                                                                                                                                 | a split doc back into one file, its `parts/` folder removed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `bedtime <name> start "P3-P6"` / `bedtime <name> done "summary"`                                                                              | a `/bedtime` run: bedtime mode on (every change stays green until reviewed; `summary --json`'s `bedtime`) / off; both logged. No report section: the night's judgement calls and issues show red where they belong (D5 of `review-review`)                                                                                                                                                                                                                                                                                                                                        |
| `review <name>#<id> ["outcome"]`                                                                                                              | mark an item reviewed today; the outcome goes in the log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `defer <name>#<id>`                                                                                                                           | put an item off: dated, still not reviewed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `queue <name>#<id> "work"` / `unqueue <name>#<id>`                                                                                            | work a review decided on, waiting / started or dropped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `items <name> [--section <s>] [--filter unreviewed\|open\|reviewed\|queued\|all] [--json]`                                                    | what a review walks: where reviews stand, the to-do list, each section's counts and items                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `items <name> --section <s> --spec <file>`                                                                                                    | `/epic review`'s item picker as a details page spec (`epic ask create --from`): a checkbox per open item, the not-reviewed ones ticked, each labelled by its id                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `list [--json]`                                                                                                                               | every epic: in progress / future / done, its worktree while it has one (`checkout`), not reviewed / all                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `backfill <name> \| --all [--apply]`                                                                                                          | one-off: items not reviewed that Owen named in a past session of the epic (his message, or a modal he answered); a dry run unless `--apply`, which marks them dated that day (`ReviewBackfill`)                                                                                                                                                                                                                                                                                                                                                                                   |
| `summary <name> [--json]`                                                                                                                     | open questions, judgement calls, issues, todos, tests, and the next phase                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `docs <name> [--json]`                                                                                                                        | the docs the epic wrote besides its epic page:  wrote (guide, its commits), related (name it, its turns swept up), linked;  its changelog entry.  For `/docs-check`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `decisions <name> [--json]`                                                                                                                   | what the epic page settled:  phases' Done lists and Updated notes, items' status, chosen option and answer (`--json`:  their text).  For `/docs-check`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `summaries <file.html> ...`                                                                                                                   | `summary --json` of each doc, by PATH (a worktree's too), as one JSON object `{ <file>: summary \| { error } }`; for `/epics`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `check <name> [--no-browser] [--links]`                                                                                                       | ids unique, every `#id` link resolves, every phase has a status, a split doc's parts there (checked whole); its file links, printed as `LINK:`, failing only with `--links`; then `check-spell.js`                                                                                                                                                                                                                                                                                                                                                                                |
| `open <name> [--review]`                                                                                                                      | show the doc rendered in VS Code's doc preview (the right side bar's "Epic Docs" tab;  `--review`:  its "Review" tab); needs spell-epic's VS Code extension                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `inbox <name> [--json]`                                                                                                                       | the marks Owen left on the page (`<name>.inbox.json5`), by action, with their items' titles, sent or not; the `now` queue, agents at work, the session listening                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `inbox watch <name> [--session <id>]` / `ignore`                                                                                              | this session (`$CLAUDE_CODE_SESSION_ID`) waits on the inbox / stopped: the page tells Owen whether anyone is listening                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `inbox wait <name> [--timeout <s>] [--json]`                                                                                                  | block (polls every 1s, default 3300s) until there's work, print it, exit 0; timeout: exit 2. Work: requests for now (taken off the queue, their items marked working) and a send not yet handed over (its marks by action)                                                                                                                                                                                                                                                                                                                                                        |
| `inbox apply <name> [ids...]`                                                                                                                 | apply the sent approve / pick / Make Todo / new marks, and the sent urgency (an id chip clicked: calm or not), to the doc and clear them; prints a line per item and what it left (revisits)                                                                                                                                                                                                                                                                                                                                                                                               |
| `inbox working <name>#<id> on\|off`                                                                                                           | the page's spinner on an item;  a comment (`C3`, keyed `c3` in the inbox, an older inbox's `m3` or `cm3` read the same;  `M3` before epic-engine P44, a manual test's now):  its thread's "Claude: thinking…", until `<name>#C3 done`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `update <name>#<id> underway "<reading>"` / `done ["<summary>"]` / `noted "<what>"`                                                           | Claude's status card on an item, Overview sub-section, phase or the summary (`summary`): blue "Claude • Underway" with its reading of the task (spinner on), then the same card green "Claude • Done" when the item's WORK is finished, a summary under it when worth saying, an open issue or todo closed with it, as `close` does (spinner off); `noted`: a STEP done, the item not finished (Owen's choice recorded, an answer or details written), an outlined "Claude • Noted" card saying what was done and what happens next (an underway card turns noted; `done --filed`, the older spelling, the same) |
| `inbox done <name>#<id>` / `clear`                                                                                                            | an agent finished the item: its mark and spinner go / drop marks (a revisit talked over); a mark's note is kept in the item first, as Owen's reply                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `details <name>#<id> --file <html> [--append \| --more]`                                                                                      | `--more` (Add Details): the item's text stays on top as "Original Reply", the file's HTML in a "More Details" card under it (a second one replaces the card, the old into the Original Discussion); else replace an item's details with the file's HTML, or add it after them (a reply: after the replies); the answer, Original Discussion and commits stay; on an answered question the new text is the question's, laid out again (Choices, then the answer); replacing moves the old text into the item's Original Discussion; logs "I1 details rewritten" / "I1 reply added" |
| `summarize <name>#<id> --file <html>`                                                                                                         | condense an item after a lot of back and forth: the file's HTML replaces what it shows; its text, every reply, More Details and Choices nobody picked move into its Original Discussion (one version, folded); Owen's picks (`chosen` Choices, copied out of a moved reply too), the answer, status cards, commits and his marks stay; logged |
| `restore <name>#<id> --file <html> [--as-of "YYYY-MM-DD HH:MM"]`                                                                              | put an item's earlier text (recovered from git; old markup welcome) into its Original Discussion: as first written, or dated `--as-of` (when it was replaced), in date order; prints `added` / `unchanged` / `empty`; doesn't stamp the item                                                                                                                                                                                                                                                                                                                                      |
