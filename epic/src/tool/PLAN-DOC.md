# Epic pages in `<epic-*>` markup

What the `epic` tool (`epic`) writes, and what's still DATA,
once an epic page is in the `<epic-*>` markup (epic `epic-components`, P8).
- The elements -- tags, attributes, which children go where --
  are described ONCE, in [the definitions](../definitions/):  each family's `<Name>.en.ts`, under `components/<family>/`.
- This file holds the rest.

- Since the switch (P12, 2026-10-08), every real doc is in this markup.
- A doc still in the OLD `ui-*` markup is READ, and never edited:
  - read by `summary`, `summaries`, `list`, `items`, `check`, `open`, and the inbox's listings
  - an edit says "convert it first (epic convert)"
- The template `new` copies:  [plan.html](templates/plan.html), beside this file.
  - The shared epics template (`templates/epics/plan.html`) retired at the switch.
- How to WRITE a doc stays in [plan-doc.md](../../templates/epics/plan-doc.md).
  It points here for the markup.
  - "Rules":  write for Owen cold, Net effect, never delete an item, never drop its text
  - "Ids"
  - what phases and items say, "Prose"
  - "Explaining a question or issue"
  - "Review inbox" (the loop)
  - the commands' table

## The page

```html
<ui-root>
  <ui-components source="/_epic/pack/epics.pack.js"></ui-components>
  <spell-site-header></spell-site-header>
  <div class="spell-doc"><main class="spell-doc-main">
    <epic-page epic="seo" title="SEO" branch="seo" worktree="/.../seo" started="2026-10-01" updated="2026-10-07"
      repo="https://github.com/spell-app/spell-app">
      <a slot="durable" href="/guides/seo.html">SEO</a>
      <epic-overview id="overview" estimate="4h-5h in all, 2h left">
        <epic-summary>Two sentences.</epic-summary>
        <epic-prompt><p>the kickoff prompt</p></epic-prompt>
        <epic-section id="o1" kind="overview-part" title="Structure">...prose...</epic-section>
      </epic-overview>
      <epic-section id="overnight" kind="report" title="Overnight · 2026-10-04">...prose...</epic-section>
      <epic-section id="phases" kind="phases">...<epic-phase>s...</epic-section>
      <epic-section id="decisions" kind="questions">...<epic-item>s...</epic-section>
      ... judgements, todos, issues, tests ...
      <epic-section id="log" kind="log">...<epic-event>s...</epic-section>
    </epic-page>
  </main></div>
</ui-root>
```

- The title:  `<title>` reads `Epic: <title>`;  `<epic-page title>` holds the title alone.
- `<epic-page>` draws all of this, so none of it is written:
  - the crumbs (`Docs › Epics › <title>`), the h1, the meta lines
  - the step label:  active phase, DONE, next, FUTURE
  - the bedtime label
  - while reviewed, Send in the header's exact middle, with what the session is doing (a bare spinner) beside it
  - the gear, last in the header:  Auto Send (Immediately, 2 minutes, 5 minutes, Off) and Theme (epic `epic-engine`
    P53, where the git toggle was:  the Log lists every commit)
  - the "Plan hung?" notice (while there's no phase), and a future epic's notice
- The page runs edge to edge by itself.
  It links `spell-doc.css` alone (no `plan-doc.css`:  P14).
- Dates:  WRITTEN one way, DRAWN another.
  - Written as below:  `2026-10-08 14:34`, `2026-10-08`, or ISO with an offset.
  - Drawn `10/8/26 14:34` / `10/8/26`, by every element but the log's `<epic-event>`
    (`PlanDates`, in `spell/epic/dates`).
  - Never write the drawn form.
- The page's data, on `<epic-page>`:
  - `branch`, `worktree`:  none for a future epic (`new --future`).
    - `new` on a future epic's doc, or its first phase, plans it:  `future` goes.
  - `started`, `updated`:  `YYYY-MM-DD`.
    Every edit stamps `updated`.
  - `recent-since`:  the commit time of `HEAD~2` in the doc's checkout (D2).
    - Since 2026-10-08 it colours nothing:  a decided item stays green however old.
    - Kept until it's dropped (`PlanReader.recentSince`).
  - `bedtime="P3-P6"`:  a `/bedtime` run is on (`bedtime <name> start | done`).
  - `repo`:  the GitHub page every `<epic-commit sha>` links through.
    Written by `commit`, and by `commits --backfill`.
- Its `<epic-commit>`s land by themselves (epic `epic-engine` I135), under their phases and items AND in the Log
  (epic `epic-engine` P52, "Log"):
  - `phase <name> <N> done`:  every commit in the history not listed yet, as `commits --backfill`
  - `epic merge <name>`:  the commits it just fast-forwarded onto `main`, every repo's (`commits --backfill --merged`)
  - neither lists one twice, nor fails its command when it can't:  it says so in one line
- Sections are fixed:  each `kind` once, in that order, with its id.
  - `questions` keeps the id `#decisions`.
  - Drawn:  their titles, icons, notes, counts and the progress bar.
  - A REPORT (`kind="report"`, P14) is the one section that isn't fixed:
    - what a run wrote for Owen to read (an overnight `/bedtime` report)
    - its own `id` and `title`
    - right after the Overview, unnumbered, with the page's bands
- The Overview:  `<epic-summary>` (two sentences, drawn as a lede), then `<epic-prompt>`, then its sub-sections.
  - `<epic-prompt>`:  the kickoff prompt, folded under "Kickoff prompt".
    `new --prompt` and `prompt <name>` write it.
  - An older doc's summary and prompt still read the same, until the second conversion pass:
    - `<p slot="summary">`, `<blockquote slot="prompt">`
    - `prompt <name>` turns the old quote into an `<epic-prompt>`, where it stood.

### A saga page

A SAGA PAGE is an epic page of kind "saga" (epic `epic-workflow` P15):
one saga's page, `sagas/<id>/<id>.saga.html`, in the same markup, so the tool edits it as any epic page.

```html
<epic-page kind="saga" saga="epics" title="Epic Tooling" started="2026-10-14" updated="2026-10-14">
  <epic-overview id="overview">
    <epic-summary>The saga's purpose, from sagas/sagas.json5.</epic-summary>
    <epic-section id="o1" kind="overview-part" title="Done so far">...</epic-section>
    <epic-section id="o2" kind="overview-part" title="Ideas not done yet">...</epic-section>
  </epic-overview>
  <epic-section id="epics" kind="epics"><epic-cards saga="epics"></epic-cards></epic-section>
  <epic-section id="decisions" kind="questions">...</epic-section>
  <epic-section id="log" kind="log">...</epic-section>
</epic-page>
```

- `saga` names it;  no `epic`, `branch` or `worktree`, and no phases.
- Made by `epic saga page <id> [--force]`, from the tool's `templates/saga.html`:  one file, not split.
- Named to every verb by its short address:  `epic add SAGA:/epics#Q "..."`, `epic inbox wait SAGA:/epics`,
  `epic lint SAGA:/epics`.
- `<epic-section kind="epics">` is a saga page's alone:  its `<epic-cards>` draws the epics whose
  `<epic-page saga>` names the saga, from the page server.
- Its marks and comments wait in its own inbox, `<id>.inbox.json5` beside it;
  `/epic review SAGA:/<id>` takes them.

## Ids

As `plan-doc.md`, "Ids":
- The letters:
  - `q` question (an answered one is a decision)
  - `j` judgement call, `t` todo (work still to do, or with `limit` a limit to know about)
  - `i` issue, `m` manual test
  - a comment is `c` (`C3`), in the inbox, never an item
  - before epic `epic-engine` P44:  `c` caveat (the todos), `t` test, and comments `m` ("M" for mark);  the migration
    `item-renames` renamed them, every number kept ("Migrations", below)
  - before epic `epic-engine` P32:  `t` todo and `v` test;  the migration `caveats-and-tests` renumbered them (retired)
  - `p` phase;  `o` Overview sub-section
- An item's KIND is its id's letter (Q11):  one `<epic-item>` for all of them, in its kind's section.
- An old decision's `d7` lives on as an `<epic-answer id="d7">` inside its question:
  - old `#d7` links land
  - `close d7` finds the question
- A PHASE's id is STABLE (epic `epic-workflow` P15, I7 and J49):  made once from its name when it's added, and kept
  for good.  Its number is only its place.
  - `p-` and the name's slug:  "Epic Migrate" is `p-epic-migrate` (`PhaseIds`, in `spell/epic/phases`).
    - The slug:  lower case, words joined by `-`, anything else dropped;  an apostrophe joins its word (`owens`).
    - A clash with any id on the page gets `-2`, `-3` ...
  - A rename changes the title, never the id;  an insert changes numbers, never ids.
    So links (`#p-epic-migrate`), comment anchors (`p-epic-migrate#field-1`), inbox marks and drafts, and the part
    file (`parts/p-epic-migrate.html`) stay on their phase.
  - "P7" is what people see and say:  the 7th phase, worked out as the page draws (`<epic-phase>`, the step label, the
    Epics list page) and as the tool prints.
    - Always WHOLE (epic `epic-engine` I126;  Owen, 2026-10-25:  "ditch the 17.1 and just reorder"):  adding or
      moving a phase renumbers the to-do phases after it, and the tool rewrites what names them.
      - bare numbers too (I137):  `P18`, `P17-P20`, `P20's`, `epic-engine P46`, in phases, items and Update blocks,
        mapped all at once, so P18 => P19 never chains on to P20
      - left as said:  another epic's (`ui-gaps P6`), the log, an Original Discussion, commits, quotes (`<q>`,
        `<blockquote>`, the kickoff prompt)
    - P39 wrote DECIMAL phases (`<epic-phase number="11.1">`);  the migration `whole-phase-numbers` makes each one
      whole by its place.  One not migrated yet still reads as its own number, the rest counted without it.
  - The tool takes a phase as people name it, wherever it takes one:  `7`, `P7`, `seo#P7`, `#p7`, its id, its name
    or slug (`"Epic Migrate"`, `epic-migrate`;  a renamed phase by its name today too).
    - So do links (`<epic-link epic="seo" phase="P7">`), items' and updates' `phase` (`phase="7"`) and commit titles
      (`seo P7:  ...`).
    - An old decimal (`P11.1`) still reads, as long as a page holds one.
  - An older page's ids were numbers (`p7`):  the migration `stable-phase-ids` converted every page ("Migrations").
    An old address, `#p7`, still lands on the 7th phase (`PhaseIds.landing()`, the docs runtime's `addressedId()`).

## Phases

```html
<epic-phase id="p-short-name" title="Short Name" status="active" estimate="1-2h" to-see="up1@2026-10-29T10:00">
  <epic-field name="symptom">what's wrong today, one line</epic-field>
  <epic-field name="requests"
    ><epic-field label="r3 · 🚧 python (83d39e12)"><blockquote><p>Owen's words</p></blockquote> ...</epic-field
  ></epic-field>
  <epic-field name="goal"><ul><li>a bullet per outcome</li></ul></epic-field>
  <epic-field name="changes">what changes, two or three lines</epic-field>
  <epic-field name="plan" accepted="2026-10-24 21:40"><ol><li>Claude's build steps</li></ol></epic-field>
  <epic-update at="2026-10-06 14:30" phase="3" summary="Split in two"><p>what changed in the plan, and why</p></epic-update>
  <epic-field name="done"><ul><li>what was built</li></ul></epic-field>
  <epic-commit sha="2c71ac57...">one or two sentences</epic-commit>
  <epic-field name="files">...</epic-field>
  <epic-field name="verify">...</epic-field>
  <epic-field name="to-review"><epic-mark item="j1" link></epic-mark>, <epic-mark item="t3" link></epic-mark></epic-field>
</epic-phase>
```

- `id`:  stable, from the name it was added under ("Ids");  `P2`, its place, is drawn.
- `number`:  an OLD decimal phase's own number (`11.1`, epic `epic-engine` P39);  never written since I126.
  - The migration `whole-phase-numbers` (every edit) removes it, numbering the phase by its place, the phases after
    it moving down one, and what names them following (`PhaseNumbers.makeWhole()`).
- `title`:  2-4 words, WITHOUT `P2 · ` (drawn).
- `status`:  `todo`, `active`, `done`.
- `plan`:  CLAUDE'S BUILD PLAN for it (epic `epic-engine` P33, M1), `waiting` or `accepted`:  in the skeleton, so the
  title row knows with its body not loaded.
  - `update <name>#P3 --plan "<ol>...</ol>"` writes the `plan` field and sets `waiting`, logged
    (`P3 plan written:  waiting for Owen's Accept`);  `--plan ""` removes both.
  - Waiting:  the field "Claude's plan:" with an orange rule;  the phase's review pills Accept Phase and Revisit, ringed 2px #666 while they wait (the header's Send ringed too, its tooltip naming the waiting plans)
    (`<epic-review buttons="plan">`).
  - Accept plan is the inbox mark `approve` on the phase;  `inbox apply` writes the field's `accepted` (now) and
    `plan="accepted"` (`PlanDoc.acceptPlan()`):  "plan accepted:  build it".
  - Accept plan pressed on a phase whose text holds Owen's comments (its auto revisit, I158) KEEPS them (epic
    `epic-engine` I163):  the mark `{ action: "approve", note, comments: ["c4", "c5"] }`;  a comment saved on a phase
    already approved joins it, still approved (`ReviewInbox.noteComment()`).
    - `wait` prints "accepted, with comments to fold in:  C4, C5", each comment under it;  `inbox apply` accepts the
      plan as usual ("plan accepted:  build it, with comments to fold in:  C4, C5") and leaves the comments waiting.
    - Claude folds them in and keeps it accepted:  `update <name>#P3 --plan "..." --accepted` writes the plan
      `accepted` (logged `P3 plan written:  accepted, Owen's comments folded in`), no `waiting`, no spinner;  then
      answers each comment.  Without `--accepted`, `--plan` waits as before.
    - Only a comment against something he decided, or changing the scope a lot, becomes a Q item instead.
- Children in that order, always (the vocabulary's `childOrder: "listed"`):
  the tool puts each where it belongs.
  - Owen's kept notes (`<epic-reply>`) after Requests, before Goal;  slotted children (status cards) at the end.
  - Changes after Goal, next to Claude's plan (epic `epic-engine` P45;  Owen, 2026-10-25:  "Move `changes` below
    `goal` so it's next to the plan");  the migration `changes-after-goal` moves an older page's.
  - To review's items are `<epic-mark item link>`s (P45), each drawn in its item's state colour;  the migration
    `to-review-marks` turns an older page's `<a href="#j1">` links into them.
- `add-phase`'s fields:
  - with `--symptom` / `--changes`:  Symptom, then Goal (optional), Changes, Files, Verify
  - without:  Goal, Files, Verify
  - A field not given reads `TBD`;  but the plan, which comes only once written (`--plan`).
- `add-phase ... --after N`:  the new P<N+1>, right after PN;  the phases after it move down a number, as `--before`
  below (epic `epic-engine` I126;  P39 made a decimal, P<N>.1, until then).
- `add-phase` with no `--before` / `--after`, the last phase a `Doc Review` (by its name):  the new phase goes just
  before it, and the Doc Review moves down a number;  one under way or done is to do again, logged, keeping its name
  (P33:  the doc pass floats).
- `add-phase ... --before N`:  inserted as PN (`N` any way the tool takes a phase:  `--before epic-migrate`).
  - Every phase from N on moves down a NUMBER;  ids stay, so links, comments, marks and part files stay on them.
    What says the number follows:
    - the `PN` in the words of links to it (`<a href="#p-docs">P5 · Docs</a>` says `P6`)
    - `phase` on items and `<epic-update>`s (and `of` on an older doc's `<epic-updated>` copies)
    - a request filed into it (epic `epic-engine` I4):  `epic file` keeps the phase's id in its `request.md`
      (`phase: p-docs`), and `epic requests` shows that phase's number today;  `filed:` keeps the one it had then
  - Prose naming a phase without a link isn't changed.
  - Refused while a phase from N on has started (done or active):  its commits and log say its number.
- `update <name>#<P6 | id> --title "New title"` (epic `epic-workflow`):  a phase's or an item's new title.
  - Its `title`, or its `slot="title"` child's words (the UPDATE markers in it stay).
    `--html` (last):  the title has markup, so it's a title slot.
  - Links to it whose words say the old title follow:  `P6 · Old` -> `P6 · New`, `Old` -> `New`.
    Any other words stay (`P6`, "the next phase"), and so do links in an Original Discussion (history).
  - A phase:  each item queued for it (`work="P6 · Old"`) follows too;  its id stays (made from its first name).
  - An item is stamped and flagged UPDATE, as any change to it.
  - Logged:  `P6 renamed:  "Old" -> "New" (2 links)`.
- `<epic-page saga="<id>">` (epic `epic-workflow` P15):  the saga the epic serves, one of `sagas/sagas.json5`'s ids.
  `saga set <name> <saga>` sets it (`--none` clears it), logged;  `new <name> --saga <id>` at birth;  refused for a
  saga not in the list.  The page draws it in its meta lines, a link to the saga's page;  `summary --json` and
  `list --json` carry it.  No migration step:  an epic with none simply names no saga.
- `<epic-page standing>` (epic `epic-workflow`):  a STANDING epic, open for good;  each phase merges into `main` on its
  own, and every phase done is NOT done (STANDING, not DONE).  `update <name> --standing [on|off]` sets it.
- `<epic-page stage="overview | phases | building">` (epic `epic-engine` P29):  how far planning has got, and so
  which sections the page shows (`PageStages`, `spell/epic/phases`).
  - `overview`:  the Overview, Questions and Todo;  `phases`:  the Phases and Issues too;  `building`:  everything.
  - None (every page made before P29):  `building`, so it looks as it did.  No migration step:  an optional attribute.
  - `create` writes `overview` (Q15:  new and future epics;  the default since P33, `--stage` for another);
    `stage <name> <stage>` sets it by hand, logged.
  - The header's stage button (Accept Overview, Accept Phases) leaves the inbox mark `stage`,
    `{ action: "accept", stage }`;  `inbox apply` moves the page on a stage and logs it
    (`STAGE accepted overview:  stage phases, write the phases`).
  - While `phases`, an open phase's Defer pill leaves `{ action: "defer" }`:  `inbox apply` moves it after the other
    phases, still to do (its number changes, its id never);  its Looks good is an approve, noted.
- Requests (epic `epic-workflow`):  what Owen sent the phase from other sessions, one labelled block per request.
  - Written by `epic file <epic>#P<N> <rN>` (the tool's `request <name> <N> <rN> --from "..." --file f`).
  - The block:  his words quoted, what the sender was looking at, when, a link to `requests/<rN>/request.md`, and
    each screenshot.
  - Filing a request again replaces its block.
- Plan changes:  `<epic-update at summary>` blocks, one per change to the phase's plan, oldest first (see "Updates").
  - Written by `updated <name>#<N> "<html>" [--summary "..."] [--for <item ids>]`.
  - Only for a change NO ITEM caused (a plan adjusted while building, a file moved):  an answer's change is its
    change marks alone ("Change marks";  epic `epic-engine` I159).
  - At the END of the phase's description (Owen, 2026-10-11:  "The updated blocks themselves go at the end of the
    phase description"):  after Goal (and Owen's kept notes), before Done, the commits, Files, Verify, To review.
  - `phase`:  the phase active then.
  - They stay once the phase is done.
  - No box around them (Owen, 2026-10-11:  "lose the "Plan changes" surround"):  each is its own block.
  - The phase's `to-see`:  the new ones (not seen, not quiet), written by the tool on every edit, in the skeleton;
    its pen counts them ("Updates", I168).  Its `changes`, the count before I168, goes on the next write.
    While the phase isn't done, its title shows an orange pen and that count, folded too (its part not loaded).
  - Older docs:  `<epic-updated>` lines, in the phase's `changes` slot (P6, 2026-10-11) or in no slot, and COPIES of
    the to-do phases' first in the Phases section (`<epic-updated slot="changes" of="N">`, T14).
    - They still read, and draw:  slotted lines at the end of the phase's body, unboxed.
    - The migration `updates-as-epic-update` turned every page's into `<epic-update>`s ("Migrations").
- `estimate`:  wall-clock time for Claude, agents included, Owen's review not.
  - E.g. `30m`, `2h`, `1h30m`, `1-2h`.
  - The Overview's `estimate` is the total, rewritten on every change:
    `4h-5h 30m in all, 2h-3h left (P5 not estimated)`.
    - then, once done phases are timed:  `;  3 done took 1h 9m, estimated 4h-6h` (only phases with both)
- `took`:  how long Claude REALLY worked on it, written when it's done (epic `epic-engine` P41):  `21m`, `1h 30m`.
  - `epic phase seo#P3 done` writes it (`WorkTime`, `ActiveTime`, in `command/`), and the log says it:
    `P3 done:  took 21m`.
  - `epic phase seo#P3 took [--dry-run]` works it out again for a phase done before:  its log's last `active` to its
    `done`.
  - From Claude Code's transcripts:
    - the phase's own agents, named `<epic>-p3` (`-p3-docs`) or saying `P3`, that ran while it was active
    - else the epic's sessions' turns while it was active
    - side by side, counted once;  never the wait for Owen's next prompt, an answer, a permission, or his notes
  - Its title row shows it in place of the estimate, `~3-4h` its tooltip.
  - Older phases have none, until asked.
- `done-at`:  WHEN it was done, written as it's set done (`isoMinutes`, the log's time;  epic `epic-engine` I170),
  removed when it's set to anything else.
  - A phase done before I170 takes its log's last `P3 done` line's time on the page's next write (`updateDoneAt()`);
    none, no attribute.
  - The page draws it green for 3 days after (`PlanDates.isQuiet()`), then grey:  its Phases chip and status circle.
- `to-review`:  written by the tool on every edit, LAST.
  - It lists items added while this phase was active (`phase="N"`),
    still open, not reviewed, not under way.

## Items

```html
<epic-item id="q3" title="Which browser first?" status="decided" answered state="recent" phase="3"
  changed="2026-10-04T12:46:05-04:00" reviewed="2026-10-06" review-as="approve">
  <epic-question><p>the question as asked ...</p></epic-question>
  <epic-net-effect option="B" recommended><ul><li>...</li></ul></epic-net-effect>
  <epic-choices chosen="B">
    <epic-option letter="A" title="Firefox"><ul><li>pros, cons</li></ul></epic-option>
    <epic-option letter="B" title="Chrome" recommended><ul><li>...</li></ul></epic-option>
  </epic-choices>
  <epic-answer title="Chrome"><p>why ...</p></epic-answer>
  <epic-more><p>More Details:  what the text left out</p></epic-more>
  <epic-reply from="Claude" at="2026-10-04 17:20" re="why not reuse the details route?"><p>...</p></epic-reply>
  <epic-original><epic-version><p>as first written</p></epic-version>
    <epic-version as-of="2026-10-04 20:49"><p>...</p></epic-version></epic-original>
  <epic-commit sha="...">the fix</epic-commit>
</epic-item>
```

- The order is fixed:
  1. a question's `<epic-question>`
  2. the item's text:  prose, the prose elements and its option cards among it ("Prose elements" below)
  3. the answer, More Details, replies, Original Discussion, commits
  - Claude's status cards (`<epic-status slot="status">`, "Status cards" below) are slotted,
    so at the end, out of the order.
  - So are buttons for its line (`<ui-button slot="actions">`, epic `epic-workflow` P25):
    after its title, before its own buttons.
    - Every element with a title row takes them:  sections, the Overview, phases, items, asides, code, updates.
    - The tool never writes one;  the docs runtime puts each block's bullhorn there, never in the file.
  - The element draws:
    - the chip (`Q3`, in its state's colour) and the review label
    - `Question` over the question as asked, "Original reply" over the text
    - every card's heading
- A question's text as first asked is its `<epic-question>`, found by its tag, not its place:
  - `add <name>#Q`, and a rewrite of a question's text (`details --file`), put the lead of the HTML they're given
    in one, unless the HTML has one.
    - The lead:  the prose up to the first element or bold label line (`<p><b>The options:</b></p>`).
  - A rewrite moves the old one into the Original Discussion, with the rest of the old text.
  - `--append` never makes one.
- `title`:  WITHOUT its id;  with markup, a `<span slot="title">` child instead.
  - An UPDATE label rides in the title (a bare `<epic-update>`, "Updates"):
    `<span slot="title">Title <epic-update phase="2"></epic-update></span>`.
  - `phase 2 done` removes it, and a title left plain goes back to `title`.
- Data, all attributes (the definitions check each value):
  - `status`:
    - `open`
    - `decided`:  an answered question.
      Set by `decide`, or by `add <name>#D`, born answered with `answered`.
    - `done`:  closed (fixed, passed, accepted)
    - `canceled`:  made moot (struck through)
  - `state`:  the first row below that applies.
    - The tool rewrites it on every edit;  its colours:  "Colours" below.

    | `state`     | colour | when                                                                               |
    | ----------- | ------ | ---------------------------------------------------------------------------------- |
    | `progress`  | blue   | Claude is working on it:  an underway status card, or `working`                    |
    | `old`       | grey   | canceled:  no longer relevant (made moot, struck through)                          |
    | `recent`    | green  | decided or done (`decided`, `done`, an old `d7`), however long ago                 |
    | `open`      | yellow | work a review queued (`queued`), not started                                       |
    | `replied`   | orange | open, and Claude's LAST reply holds options nothing is picked in yet:  Owen's turn |
    | `attention` | red    | an open question;  an open judgement call or issue not reviewed, unless `calm`     |
    | `recent`    | green  | open, settled by a review:  `review-as` `approve` or `todo` (`SETTLED_AS`)         |
    | `open`      | yellow | anything else open:  still undecided, not urgent;  a revisit or request for now answered |

    - Green across the board for what's decided, grey only for what no longer matters (Owen, 2026-10-08).
      A `/bedtime` run and `recent-since` no longer colour anything.
    - `replied` (Owen, 2026-10-09):
      - The reply is the item's last `<epic-reply>`, `from="Claude"`, holding an `<epic-choices>` without `chosen`.
      - A pick, a newer reply from Owen, or closing the item ends it.
      - A reply that asks without cards (a yes / no in prose) doesn't make it.
      - It counts as needing Owen, as `attention` does:  the rail's count, the "only what needs you" filter.

  - `changed`:  ISO local time with offset.
    - Stamped by every command that changes its status or review marks.
    - `bedtime` while a `/bedtime` run is on, until reviewed.
  - `phase`:  the phase active when it was added.
  - review marks:
    - `reviewed`, `deferred`, `queued` (`YYYY-MM-DD`), `work`, `working`
    - `review-as`:  how Owen's mark was handled
      - `approve`, `todo`, `revisit`
      - `now`:  a request for now (Add Details, a revisit now) done, written by `inbox done`
      - `next`, `drop`:  a todo (work) queued into the next phase, or dropped
      - `skip`:  the note box's x, nothing to do
    - `review-as` is the record (the log, `review` outcomes, the state above), never drawn on the buttons:
      once Claude has handled a mark, they clear, and the chip shows the result.
    - A note's PICTURE (epic `epic-engine` P51):  any note box takes one, pasted (⌘V), dropped, or chosen with its
      picture button.
      - saved beside the page, `tests/<id>-<stamp>.png` (`POST shot`), and shown under the words
      - it rides in the mark as `shot` (revisit, todo, next, drop and skip take one);  a picture alone is a revisit
      - `epic inbox` and `wait` print `screenshot:  tests/...png` under the mark;  `inbox apply` keeps a skip's,
        next's or drop's picture in Owen's kept reply
  - `limit`:  a todo that's a LIMIT to know about, not work (epic `epic-engine` P32, Q16;  a caveat until P44):  drawn
    calmer, never offered for the next phase, with an item's buttons (Approve, Revisit, Make Todo).
    - a todo without it is WORK still to do:  the plane, Revisit, the x (below)
    - `add <name>#T` writes work;  `--limit` (or `#limit`, the old `#caveat`) a limit
  - `failed`:  a test that failed, the issue it was filed as (`i42`;  epic `epic-engine` P4).
    - written by `inbox apply` for an old `test` mark (below), the test left open;  gone once it passes
  - `prepared`:  a manual test Start testing wrote out for Owen, its place in his order (`prepared="2"`, 1 first;
    format `place`;  epic `epic-engine` P51).
    - written by `epic details <name>#M3 --prepared <n>`
- A MANUAL TEST (`m3`, epic `epic-engine` P4;  `t3` before P44, `v3` before P32):
  its text is FIELDS, in this order, so Owen can do it straight off the page, in the Manual tests section:

  ```html
  <epic-item id="m3" title="The sitemap lists every guide" status="open">
    <epic-field label="Step">Open <a class="epic-test-action" href="/sitemap.xml">the sitemap</a></epic-field>
    <epic-field label="Should">Every guide is in it</epic-field>
    <epic-field label="Example"><img src="tests/m3.png" alt="What it should look like"> a line or two</epic-field>
    <epic-field label="If not">Say which guide is missing</epic-field>
  </epic-item>
  ```

  - Step and Should, always;  Example and If not when there's one.
  - `epic add <name>#M "title" --step ... --should ... [--example <png> | "text"] [--if-not ...]` writes them
    (`EpicTests.fieldsHTML()`);  `details <name>#M3 --step ...` rewrites a test in them.
  - A Step's `a.epic-test-action` links are pages to open:  the page shows each as a button.
  - Screenshots live beside the page in `tests/`, their paths from the page's folder:
    Claude's examples `tests/m3.png`, the pictures in Owen's notes `tests/m3-20261019-1432.png` (`POST shot`).
    - An older one keeps its file name (`tests/t3-...`, `v3-...`):  the page names it by path.
  - An older test has only prose, still valid:  the page shows the prose as its Step.
    No migration step:  the fields are new content a test MAY have, nothing an old page must change.
  - Owen answers a test WHERE IT IS, with the page's own marks (epic `epic-engine` P51, Q53:  no separate test run,
    no Passed / Failed / Skip / Not now, no P / F / S / N keys):
    - Approve:  passed;  `inbox apply` closes it.
    - A Revisit note, or a comment in its Step or Should (which presses Revisit itself, I158):  what he saw, often with
      a picture.  Left for the session, which closes the test when his note says it passed, else files an issue,
      "M3 failed:  <title>", holding his note and picture, linked both ways, the test left open.
    - The note box's x (`skip`):  `inbox apply` CANCELS it, "no longer applies";  a note says why.
    - Left alone:  still open.
  - A test Claude checked itself and saw pass, Claude MAY close (Q58):  with a Done card saying how it was checked,
    the picture attached.  The one exception to "a manual test is Owen's to close".
  - START TESTING, the Manual tests section's button (on its title, while reviewed and a test is open):
    - "Start testing · 9":  a request for now, `{ action: "prepare" }` keyed on the section's id, `tests`;
      only `tests` takes `prepare`, and it takes nothing else.
      - the session checks what it can, writes the rest out (the explicit Step, an Example), orders them so tests in
        the same window come together, stamps each `prepared`, then `inbox done <name>#tests`
      - nobody listening:  the page server wakes the epic, as for Add Details
    - "Preparing tests" while it's worked;  a click calls it off.
    - Done:  the page opens the first open test (unless Owen is typing in a field:  "Tests ready").
    - Every open test prepared:  "Next test · 3 left" (open tests with no mark of his yet), the next unanswered one
      after the last it opened, round to the start;  none left, "Go through the tests · N".
      It never asks Claude again.
  - Owen's ORDER, on the page and in `epic test --list`:  prepared tests first by place, then page order,
    deferred last (`inTestOrder()`).
  - An OLD mark from the test run before P51, `{ action: "test", result, note?, shot? }`, still applies
    (`PlanDoc.applyTest()`), so nothing sent before is lost:
    - `passed`:  `done`, reviewed, `failed` gone
    - `failed`:  a new issue, "M3 failed:  <title>", linking the test, with his note and an `<img>` of his
      screenshot;  the test stays open (a closed one reopens), reviewed, `failed="i42"`, a Noted card linking it
    - `skip`:  `canceled` ("no longer applies"), reviewed
    - `notnow`:  `deferred`:  last in his order
- A WORK todo's review buttons (no `limit`;  Owen, 2026-10-09):  the plane, Revisit, the x,
  in one group.  No Approve or Make Todo.
  - The plane (`next`, green):  "Do it in the next phase".
    - `inbox apply` queues it into the first phase whose status is `todo`:
      `queued`, and `work` `P10 · <name>`.
    - No such phase:  `the next phase`, and its line says so.
    - A Noted status card, `Queued for P10 · <name>`;  reviewed.
    - Its chip stays OUTLINED green while queued:  the work is due.
  - Revisit (blue):  "Revisit:  I'm adding a note for you";  answered as any revisit.
  - The x (`drop`, grey):  "Drop it".
    - `inbox apply` cancels it:  struck through, grey;  reviewed.
    - The log:  `T3 canceled:  dropped by Owen in review`.
  - Its note box matches:  the plane, Revisit Later, the x.
    - The plane or the x takes the note in the box along.
    - `inbox apply` keeps it first, as Owen's `<epic-reply re="next phase">` (or `re="drop"`).
  - Every other kind keeps Make Todo, Revisit and Approve, a LIMIT todo (`limit`) too.
- EVERY other note box (an item's, an Overview sub-section's, a phase's, the summary's):  Revisit Later, then the x.
  - The x is `skip`, grey:  "Skip this".
  - It took Make Todo's place in the box (Owen, 2026-10-09);  Make Todo stays on the line.
  - The x means nothing to do here.
    - It takes the note in the box along, or none.
    - It replaces any other mark, a pick too.
    - No line button wears it:  the id chip alone does, dashed, then outlined once sent, in its state's colour
      (every live mark's chip does:  "The FILL" below).
  - `inbox apply`, on an item:  reviewed, and nothing else.
    - Its status stays as it was:  an open question stays open, since `skip` settles nothing.
    - No status card.
    - A note is kept first, as Owen's `<epic-reply re="skip">`.
    - The log:  `J9 skipped:  nothing to do, reviewed`.
  - On a todo that's work, skipping it IS dropping it.
    - Its own box's x is `drop`.
    - A `skip` from a page drawn before is applied as `drop`.
  - On an Overview sub-section, a phase, or the summary:
    logged (`P3 skipped:  nothing to do`), and a note kept as for any mark of theirs.
- Options:  `<epic-choices>` of `<epic-option letter title recommended>`, the same open or answered.
  - `chosen` once answered:  `decide --option B`, or a pick.
  - Mark ONE `recommended`.
  - On ANY item kind (P14):
    - a question's own, after its text
    - or the options a judgement call, a reply or More Details weighs
    - an item may hold several
- Picks work on ANY of them (I8).
  - The mark names the set by its position:  `{ pick: "B", choices: 1 }`.
    - Counted among the item's sets in page order, its Original Discussion's never counted
      (`PlanItem.choiceSets()`).
    - No `choices` (an older mark):  the item's own.
  - `inbox apply` sets THAT set's `chosen`.
  - A question is answered with the option:  no other set stays chosen.
  - Any other item is APPROVED with it:  an open judgement call closed, accepted;  reviewed.
  - Either way:
    - the set records the pick, drawn inside its folded Choices (I153):
      `<epic-choices chosen="B" chosen-on="2026-10-29" chosen-note="recorded as the answer;  waiting for ...">`
      - `chosen-note`:  `<what was recorded>;  <what happens next>`
      - NO Noted card:  it said again what the Choices header says (Owen, 2026-10-29:  "should be part of the
        collapsed 'chosen' section");  only an underway card on the item still turns Noted, `Chose B · ...`
    - and the option in the log line
  - A pick riding on a revisit ("pick B, but ..."):  left for the talk.
    - Claude finishes the mark (`inbox done | clear`) without a `decide --option`:
      the pick is still written as that set's `chosen`, with its line (`keepPick()`):  `recorded after the talk;  ...`.
    - Once Owen picked, the card says Chosen (Owen, 2026-10-10).
- The way in (`IncomingHtml`):  agents may still write the OLD shapes.
  - Every command taking HTML turns them into elements on the way in, so a doc never holds them.
    - Those commands:  `add --details`, `decide --details`, `details --file`, `updated`, a phase's fields.
  - An option grid -> `<epic-choices>`:  `ui-grid.spell-pros-cons`, labels `A · Title (recommended)`, wherever it sits.
  - A `div.plan-reply` -> `<epic-reply>`.
  - These -> the prose elements below
    (`ProseRewrite`, by the converter's own rules, `ProseShapes`):
    - a `Net effect` paragraph and its list
    - a `ui-accordion.spell-code` / `.spell-aside`
    - a `ui-message.plan-update`
    - a labelled block (`<b>Where:</b>`)
  - A name and its file's path -> the name, its path its tooltip
    (`PathTooltips`;  epic `airplane`, WWOD §6 › "Plain text, plain paths").
    The linker links that name to the file:

    ```html
    BEFORE  <code>buildTsx()</code>, <code>packages/spell/src/node/buildTsx.ts:40</code>
    AFTER   <code title="packages/spell/src/node/buildTsx.ts:40">buildTsx()</code>
    ```

    - Read:
      - a path alone in brackets after a name
      - a path after a comma, when the name is the file's or its folder's
      - either as plain text, or linked (the link moves onto the name)
    - Left as they are:  a folder, a file with no folder or line, a list of names, any other wording ("in").
  - Never inside code, or an Original Discussion.
  - A shape those rules can't read for sure stays prose:
    - a Net effect worded otherwise
    - a code accordion holding a `<ui-code>`, or two blocks
    - a note headed `DEFERRED`
- A rewrite never drops text:  `details --file`, `decide` again, `details --more` again, `summarize`.
  - `summarize --file` (Owen, epic `repo-split` J141) condenses the item after a lot of back and forth:
    its text, replies, More Details and unpicked Choices all move, as one version;
    the question as asked, the answer, picked Choices (copied out of a moved reply too), status cards and commits stay.
  - What it replaces moves into `<epic-original>`, one `<epic-version>` per version.
    The first is undated;  the rest `as-of` when replaced.
  - Cards become the prose they said:  `Answer · Chrome`, `B · Chrome (recommended), chosen`.
  - The prose elements stay, an `<epic-question>` too.
  - Ids inside become `data-original-id`.
  - `restore <name>#<id> --file` puts text recovered from git there (old markup welcome).
- `--append`:
  - an `<epic-reply>` goes after the replies
  - other prose at the end of the item's text, after its option cards (they're prose too)
- A details page has no `<epic-*>` elements:  an item's text goes there as the prose each element draws.
  - E.g. `Net effect (A):` over its list, a code block's title over its `<pre>` ...
  - `PlanItem.asProse({ plain })` does it.
- Owen's note, once Claude clears its mark:  `<epic-reply from="Owen" at="..." re="revisit soon">`.
- An Overview sub-section takes review marks too (Q14):
  - approve and skip are logged
  - Make Todo makes a todo linking `#o3`
  - a kept note is a paragraph at its end
- So do a phase and the summary (epic `airplane` P2):  Make Todo and Revisit on the page;  no Approve.
  - A phase (keyed by its id, `p-epic-migrate`;  a mark keyed `p3` from before `stable-phase-ids`:  the 3rd phase):
    - Make Todo makes `Follow up:  P3 · <title>`, linking `#p-epic-migrate`, and a Noted status card on the phase
    - a kept note is Owen's `<epic-reply>` in the phase, after Requests (its plan changes come after Goal)
  - The summary, keyed `summary` in the inbox (it has no id):
    - Make Todo makes `Follow up:  the summary`, linking `#overview`, and a Noted status card under the lede
    - a kept note is `<epic-reply slot="notes">` in `<epic-summary>`
- NEW items from the page (epic `airplane` P2).
  - Asked for with a small form:  todo or question, title, note, what it's about.
  - Opened by the page toolbar's new-item button:  comment dots (Owen, 2026-10-10).
  - Or by a New todo / New question button, at the end of the Todo and Questions sections.
  - It waits in the inbox as a mark under a key of its own, `new1`, `new2` ...:
    `{ action: "new", kind, title, note?, near? }`.
  - Drawn at the end of its section:  dashed until sent, then outlined.
    Editable and removable until Claude makes it.
  - `inbox apply` makes each sent one as `add` does:
    - the note its details (a question's lead)
    - `About <a href="#p-epic-migrate">P3</a>.` for `near` (a phase by its id, or as typed:  `p3`)
    - a Noted status card, `Made from the page:  Owen's new todo, written <time>.`
    - one log line
  - `inbox clear new1` drops one;  its note is never kept as a reply.

## Prose elements

The blocks prose used to shape by hand, now each an element (epic `epic-components` P14).
- The element draws its chrome around prose that stays the page's own children,
  so find-in-page, `#id` links and the live update keep working.
- Each is `flow`:  it goes wherever prose goes.
  - an item's text, a reply, an option card, a phase field, an Overview sub-section
  - but `<epic-question>`, `<epic-summary>` and `<epic-prompt>`, which have one place each

| element                       | example                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `<epic-net-effect>`           | `<epic-net-effect option="A" recommended><ul><li>...</li></ul></epic-net-effect>`:  `Net effect (A, recommended):` over its list (or a `<p>`);  no `option`:  `Net effect:` |
| `<epic-question>`             | `<epic-question><p>Which browser first?</p></epic-question>`:  a question's text as first asked, under `Question`;  FIRST in its item (or a version) |
| `<epic-summary>`              | `<epic-summary>Two sentences.</epic-summary>`:  the Overview's lede, once                 |
| `<epic-prompt>`               | `<epic-prompt><p>the prompt, as typed</p></epic-prompt>`:  folded under `Kickoff prompt`, once in the Overview |
| `<epic-code>`                 | `<epic-code title="design.ts · 12 lines" language="ts"><pre>...</pre></epic-code>`:  folded, highlighted, ONE `<pre>` of text (`&lt;` for a `<`);  `open` to start open |
| `<epic-aside>`                | `<epic-aside title="why not now"><p>...</p></epic-aside>`:  folded, headed `Aside:  why not now` |
| `<epic-note>`                 | `<epic-note state="update" title="partly fixed by J9"><p>...</p></epic-note>`:  a small orange `UPDATE` (or green `DONE`, `state="done"`) note that stays, folding by its heading;  not `<epic-update>` ("Updates") |
| `<epic-update>`               | `<epic-update at="2026-10-11 14:30" summary="Q3's answer moved to B" phase="6"><p>...</p></epic-update>`:  an update, right AFTER the block it changed ("Updates") |
| `<epic-choices>`              | as in "Items":  option cards, on any item kind                                            |
| `<epic-link>`                 | `<epic-link saga="drawable-spell" epic="python-target" item="T1"></epic-link>`:  a link to a saga page (`saga` alone), an epic page (`epic`), or an item or phase on one (`item="T1"`, `phase="7"` or `phase="epic-migrate"`);  none of `saga` / `epic`:  the page it's in.  No text:  draws the short form (`python-target T1`, `T1` here, `P7 · Epic Migrate`), the target's title its tooltip ("Links") |
| `<epic-field label>`          | `<epic-field label="Where"><p>the inbox file</p></epic-field>`:  a labelled block, `Where:` before its prose (`What should happen`, `Step`);  a phase's fields have `name` instead |
| `<epic-section kind="report">` | `<epic-section id="overnight" kind="report" title="Overnight · 2026-10-04">...</epic-section>`:  a run's report, after the Overview (`The page`) |
| a table                       | `<ui-table celled padding="compact" appearance="striped" unstackable><table>...</table></ui-table>`:  Spell UI's, not an element of ours;  ALWAYS `unstackable` (epic `epic-engine` I36;  Owen, 2026-10-19:  a table drawn at the side bar's width as its header cells, then each row's cells one under another, "I hate it"):  too wide, it scrolls sideways in its own box.  The tool's way in adds `unstackable` to one without (`IncomingHtml`) |
| the crumbs                    | none written:  `<epic-page>` draws `Docs › Epics › <title>` from its `title` (an older doc's `.spell-crumbs` before it:  it draws none) |

## Status cards

What Claude took each of Owen's review marks to mean, and that it's done or noted (P13).
- A card per mark, on what the mark is on:  the item, the Overview sub-section, the phase, the summary.

Two kinds of finished card, so a card for one STEP never reads as the item finished.
- Owen, 2026-10-10:  "Claude Done entries are confusing ... you haven't apparently done anything".
- Owen, 2026-10-26 (epic `epic-engine` I148), on repo-split's I65, two Done cards and still red:
  "why is this showing as red if it is fixed?"  So Done FINISHES the item;  every other step is Noted.

| card             | when                                                                  | says, in one line                                   |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `Claude • Underway` | Claude is on it                                                     | what Claude took the task to be                     |
| `Claude • Noted` | a STEP done, the item not finished:  Owen's choice RECORDED (a todo made or queued, a new item made, a choice talked over;  a pick goes in its Choices, I153), an answer or reply written, details added, the item condensed, a request called off | what was done, and what happens next:  `Made todo T23 to follow this up.` |
| `Claude • Done`  | the item's WORK is finished:  an issue fixed, a todo built;  an open issue or todo CLOSES with it | the reading kept, a summary when worth saying     |

```html
<epic-status slot="status" state="underway" at="2026-10-08 14:20">
  <p>Weigh one JSON file for the pack templates against a file each, and answer here.</p>
</epic-status>
<epic-status slot="status" state="done" at="2026-10-08 14:20" done-at="2026-10-08 14:34">
  <p>Weigh one JSON file for the pack templates against a file each, and answer here.</p>
  <p slot="summary">Recommended a file each:  JSON would need every template escaped.</p>
</epic-status>
<epic-status slot="status" state="noted" at="2026-10-08 15:02">
  <p>Queued for P9 · Build</p>
</epic-status>
```

- Drawn, a band:
  - on its left, the kind:
    - `Claude • Underway`:  blue fill
    - `Claude • Done`:  green fill
    - `Claude • Noted`:  no fill, a green outline (the fill rule's "recorded")
  - on its right, the date:  `done-at` once finished, else `at`
  - then the reading;  then the summary, if any
- An underway card makes its item `progress` (blue:  Claude is working on it) until it's done.
- `slot="status"`:  never ordered.
  - Written last in the item, or the section.
  - Drawn last in the details:  UNDER Owen's marked note, and above the note box
    ("under my input", Owen, 2026-10-08).
  - A part file never holds them:  they stay in the skeleton with the title.
- The reading:  one or two sentences, plain words, no file names.
- The summary (`slot="summary"`, one or more blocks):  only when there's something worth saying.
  A surprise, a choice made, something left undone.
- A later mark on the same item:  a new card after the old ones, which stay, as the record.
- Written by the tool only:
  - `update <name>#<id> underway "<reading>"`:  a new underway card, stamped now;  the page's spinner on.
  - `update <name>#<id> done ["<summary>"]`:  the item's WORK is finished.
    - The LATEST underway card turns done (`done-at`), the reading kept;  spinner off.
    - An open ISSUE or TODO (not a `limit`) closes in the same write, as `close` does (`PlanDoc.finishWork()`):
      `done`, green, `taken-in` its phase, the log's `I3 closed:  <title>`.
    - Only the card on the rest:  a question is decided, never done;  a judgement call or manual test is Owen's to
      close (Approve;  a test Claude checked itself it closes with `close`, Q58);  a `limit` has nothing to do.
    - Refused with no underway card.
    - Before I148 it wrote only the card, and the item stayed open:  the migration `done-cards-close` closes those.
  - `update <name>#<id> noted "<what>"`:  a STEP done, the item not finished:
    Owen's choice recorded, an answer, details or a summary written, a request called off.
    - The latest underway card turns noted, `what` its summary.
    - None:  a card born noted (`at` alone).
    - Spinner off.
    - `done --filed "<what>"`, the older spelling, writes the same Noted card.
  - `inbox apply`:  a card born NOTED for each of these (none for an approval):
    - each todo it files (Q19):  `Made todo T23 to follow this up.`
      - a pick has none since I153:  its set's `chosen-on` and `chosen-note`, drawn in its Choices
    - each todo it queues:  `Queued for P10 · <name>`
    - each new item it makes:  `Made from the page:  Owen's new todo, ...`
  - `inbox done | clear` of a mark carrying a pick:  the pick kept on its set, `chosen-note` `recorded after the
    talk;  ...`.  Unless a `decide --option` already chose in that set.
  - The reading and summary are HTML, as `updated` takes:
    - inline runs go in a `<p>`;  blocks stay
    - plain text works as it is (`&lt;` for a `<`)
- A rewrite of the item's text (`details --file`) leaves its cards where they are:
  they never reach its Original Discussion.

## Colours

Drawn, never written:  one meaning per colour on every element (decision Q20, Owen, 2026-10-08).

| colour | means                                    | where                                                                  |
| ------ | ---------------------------------------- | ---------------------------------------------------------------------- |
| red    | needs Owen                               | `attention` chips;  the rail's count (only what needs him)             |
| yellow | open, still undecided (DARK text on it)  | `open` chips;  a `to do` review label                                  |
| blue   | do it now, or Claude is working on it    | `progress` chips (outlined);  Revisit, Send;  Underway cards;  the active phase |
| green  | decided or done (however long ago)       | `recent` chips;  Approve, Make Todo, a todo's plane (next phase), a pick, the chosen option;  Done cards (filled), Noted cards (outlined);  DONE |
| orange | changed since Owen looked, or a warning;  an item Claude answered with options, waiting for Owen's pick (Owen, 2026-10-09) | UPDATE labels, `<epic-update>` blocks, a phase's changed pen;  "nobody is listening";  a blocked agent;  `replied` chips (DARK text on them), counted on the rail as needing Owen |
| violet | Claude's voice                           | his reply cards;  the bedtime label                                    |
| ivory  | Owen's voice                             | his note box, marked note, reply cards, the answer card                |
| grey   | no longer relevant, inactive, not chosen | `old` chips (canceled);  a todo's x (drop it);  the note box's x (skip this);  a phase to do;  FUTURE;  buttons at rest |

The FILL, on every button, pill and chip with a lifecycle.
- Those are:  the review buttons, the note box's, the pick's letter, the Choose pill and its card, Send.
- The review buttons are Owen's INPUT (Owen, 2026-10-08).

The fills, in the order they come:
- a grey outline:  available
- DASHED in its colour:  Owen pressed it, not committed (not sent;  a revisit now not taken yet)
- OUTLINED in its colour:  recorded (sent), or in progress (a revisit now taken, its icon turning while Claude is on it)
- then CLEARED, once Claude has handled the mark (`inbox apply` / `done`, the inbox's mark gone):
  - every review button is a grey outline again
  - the id chip carries the result:  green decided, yellow still open, red needs Owen
- SOLID only on:
  - chips (an item's state)
  - the step label's DONE
  - a Choose pill on its set's `chosen` option (applied, wherever the cards are)

An item's id chip says WHERE OWEN'S ANSWER STANDS, by its fill.
In Owen's words (2026-10-10):
"it's not clear when an answer is queued and being addressed, so I keep filling in answers over and over".
- DASHED:  his answer given, not sent.
- OUTLINED:  sent.  Claude has it, is on it, or the work it asked for is still due.
- SOLID:  done.  Claude did it, or noted it, and nothing more is due from anyone.
- While his OWN mark is live (dashed, or outlined once sent), the chip keeps its STATE's colour:  only the fill shows
  the mark, and the colour below is the button's (Owen, 2026-10-11, epic `epic-workflow` I6:  a red item marked
  Revisit turned blue, and its section's red count matched no chip).
  - Once Claude has it in hand, the outline is the colour below:  a pick taken (green), a todo queued (green),
    work underway (blue).
- So at a glance:
  - a dashed or outlined chip is ANSWERED (don't answer again)
  - solid red or orange WAITS ON OWEN

| Owen's answer                          | colour | dashed:  not sent | outlined:  sent, Claude has it, or still due | solid:  done (the item's state) |
| -------------------------------------- | ------ | ----------------- | -------------------------------------------- | ------------------------------- |
| Approve                                | green  | pressed           | sent, until `inbox apply`                    | green:  a call accepted, a test passed;  an issue / todo settled |
| a pick (the Choose pill)               | green  | picked            | sent;  still outlined once `apply` takes it, until the doc's `chosen` reaches the page | green:  a question answered, a call accepted (a Noted card) |
| an open question answered (Approve:  its recommended option;  or a pick) | green | as above | as above                  | green `decided` |
| Make Todo                            | green  | pressed           | sent                                         | green:  settled;  the new todo is its own item (yellow until queued) |
| a todo's plane:  "do it in the next phase" | green | pressed      | sent;  then QUEUED (`queued`):  outlined until the todo is closed | green, once done |
| a review's "do it" (`queue <id> "work"`) | green | --              | queued:  outlined until started and done     | green, once done                |
| a todo's x:  "drop it"               | grey   | pressed           | sent                                         | grey `old` (canceled)           |
| the note box's x:  "skip this" (no line button wears it:  the chip alone does) | grey | pressed | sent              | its status as it was (`skip` settles nothing) |
| Revisit, with a note                   | blue   | pressed           | sent:  Claude talking it over                | yellow (talked over, still open);  orange if Claude answered with options (Owen's turn);  green if it got decided |
| any work Claude took (an underway status card) | blue | --          | `progress`:  outlined until the card is Done or Noted | the state's colour      |
| a new todo or question from the page | its section's new row | not sent | sent                              | the new item's own chip (a question red, a todo yellow) |
| urgent / not urgent (the id chip itself) | red / yellow | a dashed ring | --                                    | solid red / yellow              |

- The chip of an item waiting on Owen is never outlined:
  - `attention` (red) and `replied` (orange) stay solid
  - the toolbar counts them (`state`, as the script writes it, unchanged)
- Outlined is drawn from the item's own marks, never written:
  - Owen's live mark (the inbox)
  - a pick Claude took (`ReviewClient.takenPickOf()`)
  - `queued` on an open item
  - `progress`

## Folding

EVERYTHING boxed in a section folds (Owen, 2026-10-08):  every card with a heading band folds from it, chevron first.
- Newly folding:  a reply (Owen's and Claude's), the answer, a status card, an `<epic-note>`, an `<epic-update>` block,
  an older doc's `<epic-updated>` fence, an open question's option card.
- As these already did:
  More Details, Choices, an aside, a code block, Original Discussion, Agents running.
- Open to start with:  the text being read.
  - An item and an aside start folded.
  - Page state, never written.
- Folded content is `hidden="until-found"`, so find-in-page reveals it.
- A click anywhere on the band folds, but on a link or a control in it (`Fold.heading`, `fold.button()`).

The review buttons, at every step:  Make Todo, Revisit, Approve in one group.
- No Do Now (the wand) since Owen, 2026-10-25:  "In practice, I'm never using the wand";  nor the header's wand, the
  same day.
  - The header's Send counts down by itself instead (Auto Send, epic `epic-engine` P53):  a ring round the plane,
    2 minutes by default, chosen in the header's gear;  a press still sends at once.
  - The inbox still takes a `details` request (an old mark, an older page):  only the button went.
- The note box's:  Revisit Later, then the x (skip this).

## Updates

ONE element for every update (Owen, 2026-10-11:  "Make these a new `<epic-update>` web component so we can restyle
easily"), `components/epic-update/`:

```html
<epic-update at="2026-10-11 14:30" summary="Split in two" phase="6"><p>what changed, and why</p></epic-update>
<span slot="title">Title <epic-update phase="6"></epic-update></span>
```

- A BLOCK:  it has a `summary`, an `at` or children.
  - Drawn titled `**Update**: <summary>`, its date (`at`) at the right of the title row, as a comment thread's
    message shows its time;  what changed under it.  Orange:  changed since Owen looked.
  - It folds by its title row, open to start with.
  - Owen comments on it with its own bullhorn (`BlockAnchors.js`, kind `update`), even inside an item or a field.
  - `at`:  `YYYY-MM-DD HH:MM` (any form `PlanDates` reads).  `summary`:  one line, plain text.
    The tool's `updated` without `--summary`:  the first sentence of what changed (`UpdateSummary`).
  - Where it goes:
    - a PLAN CHANGE no item caused:  at the end of its phase's description (`updated`;  "Phases")
    - an update to PROSE (an agent's, by hand):  right AFTER the block it changed (Owen, 2026-10-11:  "or after the
      section which they updated"):  after the paragraph, list or code block, inside its item, field or Overview
      sub-section;  an update to a whole Overview sub-section goes last inside it
    - Before 2026-10-11 a prose update was a NOTE placed BEFORE the block (`<epic-update phase>` with children, no
      `at`):  migrated (below).
- A bare LABEL:  no summary, no date, no children.  An orange `UPDATE` inline:  an item changed while a phase is active
  (the tool puts it in the item's title), or a changed line of prose.
- `phase`:  the phase active when it was written.
  - `phase N done` removes phase N's bare labels and its updates OUTSIDE a phase (prose updates):  once the phase is
    finished, those changes are just the plan.
  - A phase's own plan changes (`epic-phase > epic-update`) stay for good:  the record of how the plan moved.
- NEW, then QUIET (epic `epic-engine` I168;  Owen, 2026-10-29:  "How do I clear these 'update' marks?"):
  - New:  orange, open, counted on its phase's pen.
  - Quiet:  grey, folded to its title row (its date and summary), out of the pen;  kept, as the record.
    - seen:  `seen="<time>"` on the block, written by `epic inbox apply` from its Seen mark (below), for everyone
    - or old:  3 days after `at`, the change marks' rule (`PlanDates.isQuiet()`, one copy for both)
  - NEVER NEW:  a block carrying out OWEN'S OWN ANSWER is no news for him (epic `epic-engine` I179;  Owen, 2026-10-29,
    on debut's P21 and P22 orange for his own picks on Q39 and Q41:  "If its 'accepting the update' I shouldn't have to
    do that if you are doing what I said")
    - written `seen="<its at>"`, never in `to-see`:  no orange, no pen count, no Seen to press
    - Owen's:  every item it names (its words, summary or `#q39` links) is one he answered (`answered`, `decided`, a
      `chosen` set, `taken-in`, `handled`) or a comment of his (`C3`);  and it names no file (a move) and no estimate
      (a scope change)
      - or `updated --for <ids>`:  every item it's for is his, whatever the words name
    - the rule:  `UpdateMarks.owensAnswer()`;  the write:  `PlanDoc.seenAsOwens()`, from `addPhaseUpdate()` (`updated`
      prints "P21:  Update block is Owen's own answer (Q39):  no Seen needed", logged too) and from every write's
      `updateUpdates()` (a block written by hand)
    - a change Claude made on its own (a plan adjusted while building, a file moved, a scope change) stays new
    - the pages nothing has written since:  the migration `owens-answers-seen` (below)
  - `id`:  each block's `up3`, given by the tool on every write (`updateUpdates()`), after the highest in the doc;
    its Seen mark's inbox key.  A bare label never has one.
  - SEEN, a review mark (`{ action: "seen" }` under the block's id):
    - a ✓ before a new block's date while the page is reviewed (`<epic-review buttons="update">`), and a ✓ after
      its phase's pen for all of them at once
    - the block folds to a grey line at once (its mark in the inbox), for Owen;  Send carries it, as a change mark's
      Reopen;  `inbox apply` stamps `seen`, logged (`UP3 seen:  Split in two`)
    - only an update takes it, and an update takes nothing else (`ReviewInbox`)
  - Each body host (an Overview sub-section, a phase, an item, the log) lists the new blocks inside it in `to-see`,
    the skeleton's, as `to-accept` lists change marks:  `up3@2026-10-27T10:00 up5@...`, each id and its `at`, not
    seen and not quiet as of that write.
    - a phase's pen counts its entries less the ones gone quiet since, or marked Seen in the inbox;  none, no pen
    - the review routes take a Seen mark on an id it lists (`ReviewInbox.itemIds()`), the body not loaded
    - it replaces a phase's `changes` (every plan change, before I168), which the tool drops on its next write;
      until then the pen shows `changes`
  - No migration step:  `seen` is new and optional, an older block goes quiet by age, and every write stamps the ids
    and `to-see`.
    - Except Owen's own answers (I179):  `owens-answers-seen` stamps the new ones seen and takes them out of `to-see`.
  - Why a review mark, not a write at once:  the review routes never write the page (only `inbox apply` does, under
    its lock), and Reopen, the other button that changes a mark's look, already goes this way.

## Change marks

A CHANGE MARK (epic `epic-engine` P30;  Q13, B), `components/epic-change/`:  the words an answer changed, marked in the
text itself, where an `<epic-update>` only said a block changed.

```html
<p>Now there is <epic-change item="q16">one list, Caveats, and todos fold into it</epic-change>.</p>
```

- Claude writes it by hand, with `item` alone, around the changed or new words, as it rewrites the Overview or a phase
  from an answer:  in a part file, or in the HTML a command takes (`update ... --changes`, `details --file`).
  - the words, not the paragraph (Q13's option C lost):  one mark per change
  - `item`:  the question (or any item) whose answer made it, any case;  `check` fails one naming no item
- The tool STAMPS it on every edit (`PlanDoc.updateChanges()`, from `updateStates()`):
  - `id`:  the next free `ch<N>`, never reused;  its inbox key, and a link's target (`#ch3`)
  - `at`:  now;  `answer`:  the item's answer in short (its `<epic-answer title>`, 160 characters at most), once it
    has one, so the chip still says why months later
  - `was`:  the words it REPLACED, plain text, 300 characters at most (epic `epic-engine` I160;  Owen, 2026-10-29:
    "Should say original text for comparison"), when first stamped (`ChangeOriginals`):
    - found by the tool, never written by hand:  the mark's block (its nearest ancestor with an id) lined up word by
      word with the same block in the doc as it was, and what lay between the words around the mark
    - as it was:  the files on disk before this edit (a command handed the new markup), else the epic folder's last 3
      commits in the content repo (a mark written by hand into a part file);  git only reads there
    - none:  new words, words the mark only wrapped, or no version tells;  a `was` written by hand is kept
    - marks from before I160 have none, and keep none:  no migration step, the attribute is optional
  - `change <name> [--for q16]`:  an edit that does only that, after a hand edit of a part, then lists the marks;
    `--for`:  the marks with no `item` take that one.  `check` fails one not stamped yet.
- Each body host (an Overview sub-section, a phase, an item, the log) lists the marks inside it not `accepted`, in the
  skeleton:  `to-accept="ch1 ch3"` (the name from when marks waited for an Accept).  The page counts and finds them with the body not loaded;  the review routes take
  their marks from it (`ReviewInbox.itemIds()`).
- On the page:  the words on an orange ground, a folded chip naming the item (`Q16`;  unfolded, its title and the
  answer).  NO approval (Owen, 2026-10-25:  "i shouldn't have to approve those -- I already answered the question"):
  orange for 3 days after `at`, then quiet (`isNewChange()`;  `<epic-change>`'s `isQuiet`).
  - a click on the words (or Enter / Space) opens a popup under them (I160;  never a hover):  "Changed by Q16
    (10/24/26 15:10)", then "Originally:" and `was`, when it has one;  a click elsewhere or Escape closes it
  - while new and reviewed:  Reopen, in that popup (`<epic-review buttons="change">`):
    `{ action: "reopen" }`;  `inbox apply` reopens the item (an answered question back to open, red;  its answer
    kept):  answered again, Claude rewrites the words with a new mark
  - an Accept mark from before (`{ action: "accept" }`) still applies:  `accepted="2026-10-24 19:02"`, quiet
- The marks are the WHOLE record of an answer's change:  no `<epic-update>` block beside them (epic `epic-engine`
  I159;  Owen, 2026-10-29, on P51's orange "Update:  No answer buttons ..." under its Q53 marks:  "Do we still need
  the orange update section like this?", then picked "only when no mark says it").
  - `updated` writes nothing when the marks say it (`PlanDoc.marksSay()`, `UpdateMarks`), printing
    `P51:  no Update block, the change marks say it (Q53)`:
    - `--for q53,j3`:  every item given has a mark in the phase
    - without it:  every item id its text names has a mark in the phase stamped this pass (within 15 minutes, or not
      stamped yet), and it names no file
  - a change no item caused still gets its block:  a plan adjusted while building, a file moved
  - the blocks written before beside their marks:  the migration `updates-said-by-marks` drops those the marks say
    ("Migrations")

### Handled in a phase

An item whose answer a PHASE's text took is HANDLED there (epic `epic-engine` P31;  Q17, A):  out of the way, since its
answer lives in the phase now.

- No step of its own:  a change mark inside a phase (its Goal, Changes ...) naming the item does it, when first stamped
  (`PlanDoc.markHandled()`):  `<epic-item handled="p-retry-logic">`, the item stamped, the log saying
  `Q13 handled in P4`.
  - a mark in the Overview, an item or the log:  not handled;  only a phase takes an answer into its work
- Its state is `handled` (`itemState()`, before `recent`):  grey, as quiet as canceled, a chip of its own in the
  section's filter, never in "what needs you";  its line says `in P4`, linking the phase.
- Reopen on the mark takes `handled` off (`applyChange()`):  the item is back in the lists, red;  rewritten after its next
  answer, the new mark marks it handled again.

### Taken up in a phase

An item a PHASE fixed or did names it, `<epic-item taken-in="p-fix-open-issues">` (epic `epic-engine` I128;  Owen,
2026-10-25:  "issues should say "in P14" like questions do"):  its line says `in P1`, linking the phase, as a handled
question's does.

- NOT `handled`:  that's a state too (grey), and its change mark's Reopen takes it off;  a fixed issue stays green.
- Written two ways (`PhaseTakes`):
  - an issue or todo closed while a phase is active is taken in it (`setItem()`)
  - a closed item (done, decided) a done or active phase's text links (`<a href="#i1">`, `<epic-link item>`) is taken
    in the LATEST done one linking it, else the active one:  every edit (`updateStates()`), and the migration
    `taken-in-phase` for pages nobody edits
- Left alone:  an item taken in a phase already, one `handled`, a test, an open or canceled one;  a phase's "To review"
  field (open items added during it) and items nested in a phase don't count.
- Reopened or canceled (`setItem()`):  `taken-in` goes.

## Option sets

An option set (`<epic-choices>`) works anywhere on the page (epic `epic-engine` P50):
on a question, inside a phase, or as a standing set.
The code:  `OptionSets` (the changes) and `OptionCommands` (the commands), beside this file.

- Where a choice goes:
  - a fork that belongs to ONE phase:  inside that phase, its Choices field, not a separate question
  - a cross-cutting one:  a question, as before
  - an open-ended list Owen picks from round after round:  a standing set, in the Choices section
- Its settings, any mix:
  - `multiple`:  pick any;  `chosen` may name several letters, `chosen="A C"`
  - `fixed`:  Owen may NOT add options (every other open set takes his)
  - `closed`:  done;  no picks, adds or edits, and a mark on it is left, not applied
  - `standing`, `title`:  a standing set, in the Choices section
- Where they sit, and what keys their marks (`choices`, a set's position, counts as written):
  - an item's:  any of its sets, never one in its Original Discussion (`PlanItem.choiceSets()`)
  - a phase's:  `<epic-field name="choices">`, after Changes, before its Update blocks and Plan;  every set in its
    body counts, keyed by the phase's id
    - `epic update <epic>#P3 --choices "<epic-choices>...</epic-choices>"` writes or replaces it
    - the skeleton's `<epic-phase choices-open="1">`:  its sets neither `chosen` nor `closed` (every edit)
    - Accept plan takes an open set's recommended option, as an approval does on a question
  - a standing set:  `<epic-section id="choices" kind="choices">`, between the Overview and the Phases, only on a page
    that has one;  in the skeleton, never a part
    - each set `<epic-choices id="s-<slug>" title="..." standing [multiple]>`, keyed by its id
    - `epic add <epic>#choices "Title" [--multiple] [--note "..."]` makes the section the first time, then the set
- ONE mark per set carries its whole change (`ReviewInbox`'s `PickFields`):

  ```text
  { action: "pick", pick: "A C +1", choices: 0, multiple: true,
    added: [{ key: "+1", title, note?, shot? }], edited: [{ letter, title, note? }], removed: ["E"] }
  ```

  - `pick` the whole pick list after the change;  `+1` names the first added option;  absent when only the set changes
  - an old mark, `{ pick: "B" }`, reads as before
- What `epic inbox apply` does with it, in order:
  - the flip (`multiple` set or taken away), removals, edits, then each added option with the next free letter,
    `by="owen"`, its note as `<p>`s, its picture an `<img>`
  - an edit keeps the earlier text:  `<div slot="was" data-title="<old title>">` holding the old body, one per edit,
    oldest first;  `edited` its day
  - a removal stays:  `removed` its day, `slot="removed"`, out of `chosen`
  - the picks:  an item's into `chosen` (a pick-one set keeps the newest), a question answered with their titles;  a
    phase's into `chosen` too, the phase NOT approved, its line asking the session to adjust its plan;  a standing
    set's stamped `picked-on`, `slot="picked"`, never `chosen`, the set staying open
  - its line names it all:  `picked A · Keep folds, D · Faster builds;  added D · Faster builds;  edited B;  removed C`
- From the tool, the same changes:

  ```sh
  epic choose seo#Q4 A C ["outcome"] [--set N]       # several letters:  a pick-any set
  epic option add seo#Q4 "Title" ["note"] [--image <png>] [--set N]
  epic option edit seo#Q4 B [--title "..."] [--note "..."]
  epic option remove seo#Q4 B
  epic option close seo#s-upgrades
  ```

- Lint (`Markup.validate()`):  a standing set's id `s-<slug>` and its title;  `slot="removed"` needs `removed`,
  `slot="picked"` needs `picked-on`;  several letters in `chosen` only in a `multiple` set.
- No migration:  an existing set stays pick-one, and takes Owen's options by the new default.

## Migrations

Named, dated, idempotent steps that bring an older page's markup up to today's, by page KIND
(`migrations/`, `Migrations`;  epic `epic-workflow` P8, J44).
- Each step names its kind (`epic` for every step here), the day it was added, and a one-line why.
  - The epic page's steps:  `Migrations.all`, here.
  - The other kinds' (guide, cheatsheet, commands page ...):  the docs tools' `src/tools/migrate.js`.
  - The kinds:  `PAGE_KINDS` (`migrations.types.ts`), the names P14 proposes;  the docs tool's `KINDS` is the same list.
- `epic migrate` runs them on command (`MigrateCommands`):

  ```text
  migrate [<kind>] [<epic>... | --all] [--file <page>] [--step <name>] [--dry-run] [--notify] [--list]
  ```

  - alone:  every kind, every page;  `<kind>`:  one kind;  `--file`:  one page (its kind found unless given)
  - `<epic>...` or `--all`:  epic pages:  those, or every one `list` lists
  - every step, oldest first (`--step`:  one), each page under its lock (`PlanDocFiles.migrate()`):
    it waits for a writer, and works on the page as the writer left it
  - a report per page:  `seo:  up to date`, or the steps that changed it and what each fixed or found;  then a total
    by step.  The docs tool lists only the pages that changed, then a total per kind.
  - `--dry-run`:  the same report, nothing written
  - a migrated epic page is logged (`migrated:  links-agree`) and recoloured, but NOT stamped `updated`:
    nobody worked on the epic
  - a migration that would break the doc refuses that page, writing nothing, as any edit does
  - `--notify` (J39):  an epic whose session is RUNNING (titled for it, found as `epic send` finds its receivers)
    is only dry-run, and printed under `TELL:` with the one line to send it;  the idle ones are migrated there and then.
    The command can't send a `SendMessage`:  the session that ran it sends each line (the epic skill's "Migrations").
- Every edit also runs the cheap markup steps (`everyEdit`), first (`PlanDocFiles.edit()` -> `PlanDoc.migrate()`),
  logged:  `migrated:  <step>`.  A step that reports, or rewrites more than markup, runs only on command.
  - None today:  the two there were went with the other old steps (below).
- The older steps went once every page had run them (epic `repo-split` Q45):  `updates-as-epic-update`,
  `owen-types-to-you-type`, `stable-phase-ids`, `json5-data-files`, `engine-asset-routes`, `unstackable-tables`;
  the docs tool's `ui-section`, `answer-elements`, `engine-asset-routes` and its data files' pass.
  - Their code, and what each did, is in git history:  for a page restored from an old backup.
- The epic page's steps:
  - `links-agree` (2026-10-11, on command;  Owen on I7):  every `#id` link and comment anchor against today's ids and
    titles (`LinksAgree`)
    - fixes:  a link's words naming a title its target had before (the log's `renamed` lines say which), a phase link
      naming another phase's title (`#p-docs P10 · Doc Review` -> `#p-doc-review P11 · Doc Review`), a phase link
      saying an old number (an insert moved it down:  `#p-doc-review P10 · Doc Review` -> `P11 · Doc Review`), a comment
      whose block only moved (found by its excerpt, `PlanAnchors`:  BlockAnchors.js's rules, copied), moved in the
      inbox after the page
    - reports, for Claude or Owen:  a link to an id that's gone, a comment or mark on one, a comment whose block's words
      changed
    - never the log, nor an Original Discussion:  history
    - also run by `update --title` and `add-phase --before`, right after their change (what it says goes to stderr)
    - a phase's number in its words is its place (`PhaseIds.labelOf()`);  a phase's `renamed` line names the phase
      titled with its new name, else the one at that number
  - `caveats-and-tests` (2026-10-24, on command;  epic `epic-engine` P32, Q16), RETIRED by `item-renames` (P44):  one
    list of loose ends, Caveats, the todos folded in;  tests took `T` (`CaveatsAndTests`, in git history)
    - the page's caveats keep their ids, marked `limit`;  its todos become caveats numbered after the last one, in page
      order, at the end of the Caveats section;  the Todos section goes;  its tests `v3` become `t3`
    - every reference on the page follows, all at once:  ids, `#t3` links and words that only say `T3`, a change mark's
      `item`, a part's `source`, `part-ids`;  the inbox is re-keyed after the page
    - the log says what each became, `Caveats hold the todos now, tests are T:  T1 → C12, V1 → T1`, so "T4" in old
      chat and commits can be looked up
    - then the links on OTHER pages follow, in the same run (`ContentRelink`):  URLs to the page with an id, a link's
      words that only say the old id, `<epic-link epic item>`, short addresses;  never the page itself or its parts
    - idempotent:  a migrated page has no Todos section and no `v` test;  the content pass only follows THIS run's
      renames
  - `took-as-minutes` (2026-10-25, every edit;  epic `epic-engine` P41):  every phase's `took` in the tool's form
    (`21m`, `1h 30m`:  `TookAsMinutes`)
    - fixes one written by hand (`21 min`, `1.5h`, `took 45m`);  one that won't read is reported, left;  an empty one
      goes
    - a page without one is left as it is:  older phases get a time only when asked (`epic phase … took`)
  - `to-review-marks` (2026-10-25, every edit;  epic `epic-engine` P45):  a phase's To review links as
    `<epic-mark item link>`s (`ToReviewMarks`), the commas kept;  a link whose words aren't its item's id is left,
    reported
  - `changes-after-goal` (2026-10-25, every edit;  P45):  a phase's Changes field after its Goal, where the content
    model lists it now (`ChangesAfterGoal`, by `Markup.place()`)
  - `item-renames` (2026-10-25, on command;  epic `epic-engine` P44):  the item letters say what they are, every
    number kept, all at once (`ItemRenames`)
    - Caveats become Todo:  `c3` => `t3`, the section `kind="todos"`, `id="todos"` (a limit stays a todo marked `limit`)
    - Tests become Manual tests:  `t3` => `m3`
    - comments become C:  the review inbox's `m3` (and the older `cm3`) => `c3`, by `CommentList.migrate()`
    - every reference on the page follows:  ids, `#t3` links (and words that only say `T3`), `#caveats` links, a change
      mark's `item`, an `<epic-mark item>`, a part's `source` (its file written fresh under the new name),
      `part-ids`, a note box's `for`, an `<epic-link item>` naming this page
    - the page's review inbox follows:  its marks by item, its comments to `c`, a comment anchored on a renamed item
      with it
    - ONE log line:  `The item letters moved, every number kept:  Caveats are Todo (C3 -> T3), Tests are Manual tests
      (T3 -> M3), ...`
    - then the content folder's pass, in the same run (`ContentRelink`):  links on OTHER pages (`#caveats` -> `#todos`
      too), and the comment keys of EVERY inbox in the content folder, guides' included, open and closed
      (`ContentRelink.respellComments()`)
    - test screenshots keep their file names:  pages name them by path
    - idempotent:  a migrated page has no Caveats section and no `t` ids in its Manual tests
  - `root-links` (2026-10-25, on command;  epic `epic-engine` P46):  every local link a ROOT PATH, as the page server
    serves it (`RootLinks`;  the rules:  spell-epic's `src/AGENTS.md`, "Links")
    - the page's step only finds what's left (its `context.rootLinks`, the page's linker);  the write it triggers makes
      them root paths (`SRV.Linker.link()`), a broken one at its one new home
    - then the CONTENT FOLDER's pass, in the same run (`RootLinks.run()`):  every HTML and Markdown file of `epics`,
      `guides`, `pages`, `sagas`, `goals` and `brand` (never `ui`), parts and details pages included, as plain text,
      every other byte kept;  each under its page's lock;  the census printed (by folder, by target, every link mended
      or still broken)
      - `epic migrate <epic>`:  that epic's folder only;  `--notify`:  a running epic's folder left to its session
    - the other kinds' pages:  the docs tools' own `root-links` step, a TEXT step (`migrate.js`)
    - a link that climbs above the root is left, and listed;  a second run writes nothing
    - it retired `caveats-and-tests`:  no page needed it any more, and it would read the new Todo section's `t` ids
      as old todos
  - `done-cards-close` (2026-10-26, on command;  epic `epic-engine` I148):  an open issue or todo (not a `limit`)
    whose work a Done card said was finished is closed (`DoneCardsClose`), as `update ... done` closes one since
    - which:  a Done card NEWER than its last reopening (the log's `I3 reopened:  ...`), and no underway card
    - closed as `close` does:  `done`, a log line each (`I3 closed:  its Done card (2026-10-24 10:00) said the work was
      finished`);  the write recolours it and stamps its phase (`updateStates()`)
    - each one a note in the report, with its card's time and title:  an older page's Done card may have meant only
      "this step done" (an answer written), Noted today, so read the dry run's list before running it
    - idempotent:  a closed item is left
  - `picks-in-choices` (2026-10-29, on command;  epic `epic-engine` I153):  each pick's Noted card moves into its
    item's Choices (`PicksInChoices`), where a pick is recorded since
    - which:  an item's Noted card whose whole text is `Chose B · ...`, the item having a set with `chosen="B"`;
      a card with a summary (underway first) says more:  left
    - the set takes the card's day (`chosen-on`) and what it recorded, from `recorded ...` on (`chosen-note`);  the card
      goes;  ONE log line names the items (`Picks' Noted cards moved into their Choices:  J3, Q5`)
    - idempotent:  a moved card is gone
  - `updates-said-by-marks` (2026-10-29, on command;  epic `epic-engine` I159):  a phase's Update block written in
    the same pass as its change marks goes (`UpdatesSaidByMarks`):  the marks say it ("Change marks")
    - which:  a phase's own dated `<epic-update>`, stamped within 15 minutes of a change mark in that phase
      (`UpdateMarks.SAME_PASS_MINUTES`), naming an item one of those marks names
    - kept:  a block holding marks itself, naming a file or folder, or an estimate;  a phase whose marks are from
      another time (the backfill's);  ONE log line names the phases
    - its first dry run (2026-10-29):  only epic-engine's P51 · Tests Inline, Owen's case;  epic-friend's three hold
      their marks, debut's P23 and epic-engine's P48 say an estimate
    - idempotent:  a dropped block is gone
  - `engine-links` (2026-10-19, epic `epic-engine` I27) went in epic `repo-split` P14, once the content rewrite left
    no epic page linking the engine's old places in spell-app;  its code is in git history
  - `log-commits` (2026-10-29, on command;  epic `epic-engine` P52, J151):  the Log gets an entry per commit of the
    epic's history (`LogCommits`), as the backfill writes them;  the Log ONLY (`logOnly`):  an older page's phase and
    item lists hold their commits by the shas from before epic `repo-split` P20 merged the repos, so they'd list each
    twice
    - the history handed in by the runner (`MigrationContext.history`, `PlanDocFiles.epicHistory()`):  git, so never
      on an edit
    - idempotent:  a commit already in the Log is skipped
- A new step:  a class implementing `Migration` in `migrations/`, its instance added LAST to `Migrations.all`, in the
  SAME commit as the markup change it follows (epics' `AGENTS.md`, "Rules").  Another kind's:  an entry in the docs
  tool's `STEPS`, last.  Either way:  idempotent, every word kept, and a test (a before page becomes the after page,
  and a second run changes nothing).

## Log

The epic's CHANGE LOG (epic `epic-engine` P52;  Owen, 2026-10-29:  "a log of what changes went in when, not when I
answered a question"):  one entry per commit, drawn newest first.

```html
<epic-commit sha="e75a0e081..." at="2026-10-29T11:46-04:00" refs="p-tests-inline q53">the sentence</epic-commit>
<epic-event at="2026-10-06T08:12-04:00">P2 active</epic-event>
```

- A COMMIT entry, `<epic-commit>`, the element a phase's Commits list uses (Owen's comment C5):
  - `sha`, the full sha;  `repo` when it isn't the page's (a peer's, spell-brand;  the kit's, on an older page whose
    `repo` is an old child repo's)
  - `at`:  git's commit time, to the minute, with its offset
  - `refs`:  the phases (by their lasting id) and items its subject names, space-separated;  the page draws a chip
    per ref, a phase's showing its number today (`P52`), one the page no longer has as plain text
  - its text:  the subject's sentence (after ` -- `, else after the colon)
  - written by the backfill (`PlanDoc.backfillCommits()`, `logCommit()`;  Q57 A), never read from git as the page is
    served:  `phase <name> <N> done`, `epic merge`, `commits <name> --backfill`
  - which commits:  the history's (`PlanDocFiles.epicHistory()`:  the kit, its child repos and its peers;  merge commits
    left out;  none another epic's page lists) naming a phase or item here, or naming the epic first with none
    (`epic-engine:  ...`:  no chips)
  - placed among the lines by its time, so the file stays oldest first;  one already there (same sha) is skipped
- A REVIEW LINE, `<epic-event>`:  "Q53 answered", "P49 active" ... (`PlanDoc.log()`, `epic log <name> "text"`)
  - `at`:  local time with offset, to the minute;  `icon` only when it isn't `pen to square`
  - written, NEVER drawn (Q56 C):  Actual Time (`activeWindow()`), `done-at` and "last worked on" read them;
    `epic log <name> [--last <n>]` prints the newest (20), newest last
- "Last worked on" (`eventTimesIn()`) takes the newest time of either kind.

## Parts

As `plan-doc.md`, "Parts", with the elements as hosts (`EpicParts`, beside this file).
- The hosts:  an Overview sub-section, a phase, an item with details, the log.
- A host's body is every child but its slotted ones:  the title stays in the skeleton.
- In the skeleton, a host carries `source="parts/<id>.html"`, `part-ids` and `commits`.
- No placeholder line:  the element loads its own body.
- Every link in a part is a ROOT PATH, as in the page (epic `epic-engine` P46):  `/spell-ui/x.ts`, `/guides/x.html`,
  `/epics/seo/details/q.html`, the same text in the skeleton and its parts, from any checkout.
  - The tool writes them so on every write (`SRV.Linker.link()`, in `PlanDocFiles.writeDoc()`):  a relative link
    handed over is made the root path of what it reaches from the page.
  - A link to a file in the page's OWN folder stays relative in the skeleton (Owen's Q1), and is that folder's root
    path in a part, as it's split (`PlanParts.toPartFrom()`):  from `parts/` it would climb.
  - A part written before P46 holds links relative to `parts/` (`../../../ui/x.ts`):  read, they're rebased to
    the page (`PlanParts.toPage()`), and the next write makes them root paths.
  - A link copied out of such a part (one `../` too many for the page) is taken as the part's when only that one is
    there (`PlanDocFiles.rootPartLinks()`, epic `epic-engine` I134).
- `.html`, not `.htm` (Q12).
  - A part is told from a page by its folder, and every page walker skips `parts/`.
  - The tool reads and writes `.html` only.
    An old doc's `.htm` parts were read until every doc was converted;  no more since P15.

## Links

Pointing at a saga, an epic, a phase or an item, the same way everywhere (epic `epic-workflow` P15, J32).
- In markup:  `<epic-link>` ("Prose elements"), written by what it points at, never by a path.
  - On the page it points into, a `#id` link;  elsewhere, the page from the checkout's root and its `#id`,
    the page server giving it the target's title and short form (`GET /api/epics/target`, [linkRoutes.ts](linkRoutes.ts)).
  - `saga` with an `epic` isn't needed;  one the epic doesn't name still links (the check flags it).
- A SHORT ADDRESS means the same, for a plain link or for Owen in chat:
  - `SAGA:/drawable-spell` -- the saga page;  `SAGA:/drawable-spell#Q3` -- item Q3 on it
  - `SAGA:/drawable-spell/python-target` -- the epic page;  `...#T1` -- item T1 on it
  - the colon form, `SAGA:/drawable-spell:python-target#T1`, is read too;  the tools write the slash form
  - ids in any case:  `#T1` lands on `t1`
- Who reads them:
  - the docs runtime:  `<a href="SAGA:/...">` becomes the page and its `#id`
  - the page server:  a typed `/saga/<saga>[/<epic>]` redirects to the page, the `#id` kept
  - the openers:  `epic pages open SAGA:/...`, `epic pages link SAGA:/...`
  - the check:  below
- The code:  `spell/epic/links` (`EpicAddress`, `PageTargets`:  pure, browser and node), `EpicTargets` here (what's on
  disk).
- NOT a migration:  a new element, so no older page holds anything to change.

## Checking

Every edit is checked against the definitions before it's written (`Markup.validate()`).
- An edit that would break the markup is refused, and nothing is written.
- `check` reports the same, plus ids, links and parts.
  - Its links include short addresses and `<epic-link>`s (`EpicTargets.problemsIn()`):  a saga not in
    `sagas/sagas.json5`, a page that isn't there, an id not on its page, and an epic under a saga it doesn't name
    (its `<epic-page saga>`) are broken links, failing with `--links`.
