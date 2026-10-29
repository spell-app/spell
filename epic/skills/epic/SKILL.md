---
name: epic
description: Run a planning session against a live epic page, `epics/<name>/<name>.plan.html`, in its own worktree. Use for `/epic <name> [what to plan]` (name alone:  the plan comes in the next prompt), or when the person says "make this a plan doc" / "turn this into a plan doc" about the work in the current session.  `/epic review [<name>]`:  open an epic page in the side bar's Review tab, where the person marks items on the page, and listen:  act on their marks (approvals, picks, todos to make), write details and replies in the background, talk revisits over ("review the seo epic", "go through unified-server's todos").  `/epic resume [<name>]`:  pick an epic back up in a new session, in the right worktree and window, where its epic page says it stopped ("resume the seo epic", "carry on with windows-and-review").  `/epic future <name> [idea]`:  write an idea down as a FUTURE epic, not planned yet:  a stub epic page and a review page of its high-level open questions, answered in the Review tab;  no worktree ("save this as a future epic", "an epic for later").  `/epic phase [ids] [name]`:  add a phase to this session's epic, from its items (`/epic phase J1 J5, t3`) or from scratch;  `/epic start <P1 | ids>`:  work a phase, or a block of its items, now.  `/epic request <epic> [<rN>]`:  take up a request the person sent from another session (`/send`), into a phase.  `/epic done`:  the same as `/isolate done`.
argument-hint: <name> [what to plan] | done | review [<name>] | resume [<name>] | future <name> [idea] | phase [ids] [name] | start <P1 | ids> | request <epic> [<rN>] | color <look>
---

# /epic

An EPIC is a planning session and the work it plans;  its live record is the EPIC PAGE.
- It was `/plan-doc` until 2026-10-02.
- Its tool is `epic` (in spell-app, `spell dev plan-doc` until epic `epic-workflow` P9).

Plan, then build, in worktree `<name>`, keeping the EPIC PAGE current the whole time.
- The epic page:  `epics/<name>/<name>.plan.html`.
- It's the user's view of the work:  they read it in the right side bar's REVIEW tab while you work.
  - That's the checkbox icon;  never the "Epic Docs" tab, the book (Owen's rule, 2026-10-07).

- Shared content:  the epic page lives in `epics/`, which the repo doesn't track (epic `shared-content`, 2026-10-04).
  - In every checkout, `epics/` is a link into ONE shared repo, the content folder (`epic config contentFolder`).
  - So there is ONE epic page:  `main` and every worktree see each edit at once;  it never conflicts on merge.
  - Committed for you after every turn
    (the `Stop` hook, [shared-commit.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/shared-commit.mjs)).
  - NEVER commit, stage, `git checkout --` or `git restore` it in the repo.
    Nor the changelog, the docs' home page, or a details page.
- Rules for the doc (sections, ids, markers, prose):  [plan-doc.md](${CLAUDE_PLUGIN_ROOT}/templates/epics/plan-doc.md).
  Read it first.
  - It's spell-epic's, with every template:  `epic pages template epics/plan-doc.md` prints its path.
- Structured edits go through `epic <verb> <name>[#<id>] ...` (cheat sheet below), never by hand.
  - Hand-edit only prose:  the summary, Overview, phase bodies, item details.
  - An epic page is SPLIT (P3 of `claude-design`;  new docs start so):
    - The skeleton, `epics/<name>/<name>.plan.html`, keeps the summary, the kickoff prompt,
      and every section, phase and item line.
    - Each BODY is a part file, `epics/<name>/parts/<id>.html`, `<id>` its section's or item's:
      - `o3.html`:  Overview 1.3
      - `p2.html`:  phase 2's Goal / Done / Files / Verify
      - `q7.html`:  Q7's details
      - `log.html`
    - Edit a body's prose in ITS part file, at its real path:
      - the file:  `<content>/epics/<name>/parts/<id>.html`
      - `<content>`:  what `epic config contentFolder` prints
    - Its relative links are relative to `parts/`:  one `../` more than the skeleton's.
  - A new Overview sub-section:  write it whole into the skeleton, inside `#overview`.
    - The next `epic` command moves its body into `parts/<id>.html`.
    - Nothing is dropped:  content beside a part is kept, after the part's.
  - `plan-doc.md`, "Parts", has the rules.
    `epic split <name>` / `join <name>` switch a doc's shape.
- Reload the epic page whenever the session moves to a new stage:
  name -> worktree -> plan -> fill -> each phase -> doc review.
  - `epic open <name> --review` reloads it in the side bar's Review tab.
  - `epic phase` does it for you.
- Style, in the epic page:  written for the person coming back cold (`plan-doc.md`, "Rules"):
  - a plain lead sentence, then bullets:  never a list run together in a sentence
  - full words, and a concrete example for anything tricky
  - ids explained
  - a **Net effect** list (`<epic-net-effect>`) closing every question, issue, judgement call and decision
  - NOT caveman (Owen, 2026-10-04).
  - Replies:  short, the same plain words.
- Naming a doc in a reply (the epic page, a guide, any docs page):
  paste what `epic pages link` prints, run in the checkout the doc is in.
  - In full:  `epic pages link <ABSOLUTE path> --hash <id> [--text "..."]`.
  - It prints the side bar link, then `• 🌐` (the browser link)
    ([the details skill](../details/SKILL.md), "Links to pages").
  - `--hash`:  the id of what you mean.
    - e.g. `q3`, `t4`;  a phase's stable id, `p-retry-logic` (`p2` still lands on P2)
  - A worktree's doc goes on the MAIN server when that one has the route, else the worktree's own.
- Phase complete:  the LAST line of that reply's text says where we are.
  - Each phase is linked to its heading in the epic page:
    `epic pages link <epic page> --hash p1 --text "P1 · Short Name"`.
  - "<P1 link pair> complete.  Next is <P2 link pair>."
  - After the last phase:  "All done:  <P<N> · Doc Review link pair> complete."

## 1. Name

- Some first words are reserved:  never an epic's name.
  - `review`:  NOT a new epic.
    Go to "7. Review", and skip everything else here.
  - `resume`:  NOT a new epic either.
    Go to "8. Resume".
  - `color`:  `/epic color <look>` recolours the window it's typed in.
    - That's `epic window color <look>`;  no look:  it lists the 12.
    - One line saying so, and nothing else.
  - `future`:  `/epic future <name> [text]` writes an idea down as a FUTURE epic, not planned yet.
    Go to "9. Future".
  - `phase`:  `/epic phase [ids] [name]` adds a phase to THIS session's epic.
    Go to "10. Add a phase".
  - `start`:  `/epic start <P1 | ids>` works a phase, or a block of items in it.
    Go to "11. Start".
  - `phase` and `start`:  epic `skillz` P4.
  - `request`:  `/epic request <epic> [<rN>...]` takes up a request the person sent from another session.
    Go to "12. Request" (epic `epic-workflow`).
  - `done`:  `/epic done` is `/isolate done`, word for word.
    - In an epic's session, every prompt and question names it `/epic done`, never `/isolate done` (Owen,
      2026-10-24):  the close-out modal's "Run `/epic done`", a reply's "`/epic done` when you're ready".
    Follow [the isolate skill](../isolate/SKILL.md)'s "Finish", and skip everything else here.
    - The same steps "6. Doc Review" ends with.
- `<name>` is the first word of `$ARGUMENTS`, or a quoted phrase (`"Docs Index"`).
  - Lower-kebab-cased:  `Docs Index` -> `docs-index`.
  - The rest, if any, is the plan:  the prompt that kicks it off.
  - No argument:  ask for a name.
  - A look right after the name (`/epic new-thing -purple`, one of `epic window color`'s 12)
    is the window's colour, NOT the plan's.
    - It's `open <name> --color purple` in "2. Session", or `color purple` when staying.
    - The prompt hook leaves it out of the text it saves (epic `windows-and-review` P5).
  - "Make this a plan doc" (invoked mid-session):
    propose a name from the work so far in AskUserQuestion, recommended first.
    The user can type another in "Other".
- Checks and rename, BEFORE anything else:
  as [the isolate skill](../isolate/SKILL.md)'s "Start", step 0.
  - ANOTHER REPO's epic (`epic list --json` gives it a `repo`;  epic `epic-engine` I47):
    NOT this window's, whatever the command (`/epic <name>`, `resume`, `request`).
    - No rename, no `EnterWorktree`, no worktree `<name>` here:  the `WorktreeCreate` hook refuses one.
    - AskUserQuestion "Open `<name>` in its own window?", then `epic window launch <name> --prompt "<the command>"`;
      it finds the epic's repo from here.
    - The prompt hook's note says so for a typed command;  its text is saved, as below.
  - A typed `/epic <name> ...` got them from the repo's `UserPromptSubmit` hook
    ([prompt-gate.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/prompt-gate.mjs)).
  - It renamed the session `<name>`, or blocked the prompt (plan mode) and saved its text.
  - EXCEPT in another worktree (isolate's step 0 test;  the hook's note says so too):
    NOT a failure, and NOT this session's epic.
    Go to "From another worktree", and skip everything else.
  - In `<name>`'s OWN window, its worktree already made:  a session "From another worktree" launched.
    - Its own window:  `epic window which` says `ongoing/<name>.code-workspace` (in `epic config windowsFolder`).
    - See "Launched" there.
- The kickoff prompt, SAFE before anything else:  the text after `<name>`, verbatim.
  - Write it to `~/.spell/prompts/<name>.md` at once, as the hook does when it blocks.
  - An older, different file there:  rename it `<name>.<time>.md` first.
  - No text, but that file exists:  it IS the kickoff prompt (the hook saved it).
    Say so in one line.
  - Delete the file only once the epic page holds it (`epic create --prompt-file`).
- Look for collisions (from the repo root), every time:
  - `epics/<name>/`, `guides/<name>/`, `guides/<name>.html`
  - the worktree and branch checks of the isolate skill's "Start", step 2
  - any hit:  AskUserQuestion, options:
    - "Reuse `<name>`":  continue that doc / worktree
    - "Different name":  the user types it in "Other"
    - Never overwrite an existing epic page.
  - A FUTURE epic's doc ("9. Future";  `epic list --json` says `status` `future`):
    no modal, it's waiting to be planned.
    - Say so in one line, then go on.
    - In "2. Session", step 3, `epic create <name>` PROMOTES it where it is:  no `--prompt-file`.
      Its prompt, decided questions and review page are kept;  the meta lines name the branch and worktree.
    - "3. Plan" starts from its kickoff prompt, its decided questions and its review page.
      The page is `epics/<name>/details/analysis.html`;  its answers, from `epic ask answer <name>/analysis`.
- Name and nothing after it, nothing saved (and not mid-session):
  the user sends the plan in the NEXT prompt, in the new window.
  - Do "2. Session" now anyway:  a stub doc with no prompt, then the move.
    Its last line asks for the plan.
  - That next message is the kickoff prompt:
    `epic prompt <name> --file <file>` first, then "3. Plan".

## Mid-session

When the session already has work under way ("make this a plan doc"), carry it over -- don't start again:
- Plan mode, and edits already made on `main`:  the isolate skill's "Start", step 0.
- Step 3:  start from the plan drafted so far (a harness plan file, the conversation),
  reshaped into the Overview and its questions:  still the Overview stage, agreed on the page ("3. Plan").
  - Explore only to fill gaps.
  - Decisions and questions already settled become `decision` items (questions born answered:  `Q7`).

## From another worktree

`/epic <name> ...`, typed in a session working in ANOTHER worktree (`<other>`),
means "open a window for epic `<name>`" (Owen, 2026-10-07).
- This session stays `<other>`'s:  no rename, no `EnterWorktree`, no plan here.

1. The text after `<name>`:  the hook saved it in `~/.spell/prompts/<name>.md`.
   - A natural-language trigger:  save it yourself, as "1. Name" says.
2. Collisions, as "1. Name".
   Not the future-epic case:  it goes on as usual in the new window.
3. NO question:  typing it is the ask (Owen, 2026-10-21:  "I just create a new session in this window, type
   `/epic name` and you do the right thing").  Straight on to step 4.
   - A multi-repo kit:  the worktree is the kit's, with every repo in it, from ANY repo's window (`EpicConfig.top`).
4. `epic window launch <name> [--color <look>]`, a look after the name as in "1. Name".
   - It makes the worktree, opens its window,
     and starts a NEW session there with `/epic <name>` typed in.
   - Its window already open:  it leaves the window's look alone,
     and types into the epic's session running there (a new one only when none runs).
   - One line:  "`⎇ <name>` is open:  press enter on `/epic <name>` there".
   - Then carry on with `<other>`'s work, if any was waiting.
   - It fails (no window bridge, an old extension:  `unknown op` / `bad session id`):
     say so in one line;  the text stays saved.
5. A FRESH session (the prompt hook's note says so:  a new tab, opened only to type `/epic <name>`) MOVES instead
   (epic `epic-engine` I72;  Owen, 2026-10-22:  the tab stayed in epic-engine's window, beside the new window's
   session).
   - `epic window launch <name> --move`, LAST in its command line:  the worktree and window file made, then this
     session handed off.
   - The hook titled it `🚧 <name>` already:  the move closes this tab by that title.
   - Nothing else here:  no `<other>` work, no question about `<other>` (its worktree behind `main` ...).
   - One line:  "moving to `⎇ <name>`:  press enter on `/epic <name>` there", and end the turn:  the move happens as
     it ends.
   - It says `wake` (one of the epic's sessions is running):  that one got the prompt;  say so, and that this tab
     can be closed.
   - It says "this session can't move" (the end-of-turn hook won't run, epic `epic-engine` P26):  it started a NEW
     session in the epic's window instead.  One line:  that, its `fix:` line, and that this tab can be closed.
   - It names a broken worktree (git no longer knows the one this session is in):  the settings came from the main
     checkout anyway;  pass its fix line on to the person.

**Launched:**  the new session's `/epic <name>`, its worktree made, this window its own:
- The worktree:  `epic worktree path <name>` (`.claude/worktrees/<name>`, or beside the repo).
- "1. Name" as usual, but the worktree and branch `<name>` are THIS epic's:  no "Reuse" modal for them.
  - An epic page or guide already there still asks.
- "2. Session" as "Staying in this window", with no question and no `window stay`:
  the window is already `⎇ <name>`, tinted.
  - `EnterWorktree` with `name: "<name>"` ONLY when `pwd` isn't in the worktree already.
    - An epic's window starts its new tabs IN the worktree (its first folder):  then never enter.
    - ALWAYS by `name`, NEVER by `path` (epic `epic-engine` P16):  the worktree hook finds the existing one by its
      name, and Claude Code lets the call through.
      - With a `path` outside `.claude/worktrees/` it asks the person every time, whatever the permission rules say;  a
        symlink doesn't help (it resolves links).
      - Owen:  "this EnterWorktree thing is intolerable -- it's halting processes and wasting my time."
    - The session-start guard records a session that starts in the worktree, so a reopen from another window still
      comes back to it (epic `epic-eject` I3).
  - Then steps 2, 3 and 5, then "3. Plan".

## 2. Session:  stub doc, then move

All in the FIRST turn, in this order, then the turn ends.
- Why:  the move to the worktree's window waits for the turn to end,
  and the stub doc keeps the kickoff prompt safe whatever happens to this session.

0. Where:  isolate's "Start", step 2b, with `should-stay --epic`:  a new window, or stay in this one.
1. Isolate, with this `<name>`:  `EnterWorktree`.
   - Read [the isolate skill](../isolate/SKILL.md), and follow "Start", step 3 (and step 0 mid-session).
   - A skill can't invoke another, so follow its steps here.
2. The install command in the worktree, a few seconds:  `epic config installCommand` (`yarn install`).
   - Skip it when it's empty (a repo with nothing to install, as `epic init` finds it).
   - Skip it when the worktree hook ran it already (epic `epic-eject` I2):
     `epic config installOnCreate` is `true`, and `node_modules/` is there.
   - The work needs it;  `epic` doesn't, since it runs the MAIN checkout's CLI.
3. The STUB doc:

   ```sh
   epic create <name> --title "<Title>" --saga <saga> --prompt-file ~/.spell/prompts/<name>.md   # no file:  no --prompt-file
   ```

   - Its SAGA (epic `epic-workflow` P15):  `epic saga list --json` gives the sagas, in the person's order.
     - Ask in a modal which saga the epic serves:
       - the likeliest first, "(Recommended)"
       - each option the saga's title and its purpose
       - "No saga" too:  then no `--saga`
     - Later:  `epic saga set <name> <saga>`.

   - It starts in the OVERVIEW STAGE (epic `epic-engine` P33):  the page shows the Overview, Questions and Todo
     until the person's Accept Overview ("3. Plan").
   - The prompt is quoted at the top of the Overview, and in the "Plan hung?" notice above it.
     That notice has a copy button and restart steps;  it goes once P1 starts.
   - Then delete the prompt file.
   - Reusing a doc:
     - its prompt missing:  `epic prompt <name> --file <file>`
     - an older doc (before the `<epic-*>` elements):  the tool refuses it;  start a new doc instead
       (the converter went in epic `repo-split`)
     - No phases yet:  a restart after a hang.
       Plan again from its prompt ("3. Plan");  explore only what the doc doesn't say.
4. Isolate "Start", steps 4-5:  the worktree's own window, then `handoff <name> --prompt continue`.
   - Name alone, no plan yet:  no `--prompt`.
5. `epic open <name> --review`, AFTER the handoff.
   - It shows in the right side bar's Review tab (the checkbox icon) of the window the session moves to,
     once it has:  one tab, reloaded on every later `open`.
   - Needs spell-epic's VS Code extension ([its README](${CLAUDE_PLUGIN_ROOT}/README-vscode.md)).
   - MUST print "... shows in ... once this session moves there".
     Why:  only a PENDING move defers it;  before the handoff, it shows in THIS window's side bar, the one being left.
6. Isolate "Start", step 6:  END THE TURN.
   - Last line:  "moving to `⎇ <name>`:  press enter on `continue` there".
   - No plan yet:  "send the plan there".
7. Next turn, in the new window:  isolate's "Continue" step 1 (old tab), then "3. Plan".

Staying in this window (step 0):  skip steps 4 and 6.
- `epic window stay <name>` instead:  the window titled `⎇ <name>`, tinted (isolate's "Stay", step 0).
- Step 5's `epic open` shows the doc in THIS window's side bar, at once.
- Then go straight on to "3. Plan", in this turn.
  No plan yet:  the last line asks for it, here.

## 3. Plan:  the Overview, on the page

NO plan mode, ever, for an epic (epic `epic-engine` P33;  Owen, 2026-10-24).
- The epic is agreed ON THE PAGE, from its first minute:  `epic create` starts it in the OVERVIEW STAGE, which shows
  only the Overview, Questions and Todo until the person presses Accept Overview.
- Three stages, each ended by the person's button in the page header (`epic stage <name>` prints and sets it):
  1. `overview`:  Claude writes the Overview and its questions;  each answer rewrites it.  Accept Overview ->
  2. `phases`:  Claude writes the phases AND each one's build plan, in one pass ("4b. Build plans");  the person Defers any,
     then ONE Accept Phases accepts the phases and their plans together ->
  3. `building`:  the phases built one after another with no stop between them ("5. Each phase").
  - ONE accept, not two (epic `epic-engine` I125;  Owen, 2026-10-25:  "the mode where I 'accept the phase' twice
    (once for symptom/goals, once for plan) is slowing things down.  Collapse them into one").

1. Explore (read-only):  the code, the docs, the kickoff prompt.
   - Agents:  up to 5, don't ask.
     Unless the user said "watch token budget":  then one question is "How many agents can I use for this?".
   - One of them, always, the COHERENCE review (epic `coherence` P4, its Q3):  a `coherence` agent, named and listed
     `<name>-coherence`, on the kickoff prompt:  "what in the repos already does part of this?"
     ([the coherence skill](../coherence/SKILL.md), its "epic" form, steps 2-4).
     - Its findings go into the Overview as it's written (step 2):  the plan uses the mechanism that exists, said in
       plain words where it's chosen;  a real choice between two good ways is a question (step 3), "(coherence)".
     - Skipped in a repo with no catalog (`agents/coherence/`), in one line.
2. Write the OVERVIEW, by hand, in the skeleton's `#overview` (shape:  "4. Fill the doc"):
   - the summary, `<epic-summary>`:  two sentences
   - numbered sub-sections (structure, code, flows):  what will become guides
   - no phases yet, no estimate
3. Each open question:  `epic add <name>#Q "title" --details "..."`, explained with examples ("5. Each phase", item 7).
   - ONE question, ONE choice set (`<epic-choices>`):  two choices are two questions.
     `epic lint` says `ASKS:` for an item asking two open sets at once (I88):  the person could pick in only one.
   - Loose ends:  `#T` (a todo, work still to do), `#T ... --limit` (a limit to know about).
4. `epic lint <name>`, `epic open <name> --review`, then LISTEN:  `epic inbox listen <name>`, then
   `epic inbox wait <name>` in the background ("7. Review", 7.3:  every Send wakes this session).
5. Each answer REWRITES the Overview (Q13, B;  `plan-doc.md`, "Change marks"):
   - `decide <name>#Q<n> "..."`, then rewrite the Overview's words it changes, wrapping the changed words in
     `<epic-change item="q<n>">...</epic-change>`, in the part file
   - then `epic change <name>`:  it stamps each mark;  the words show orange for 3 days, so the person sees what moved
   - NO approval, and never a wait (Owen, 2026-10-25:  "i shouldn't have to approve those -- I already answered the
     question"):  go straight on, the next answer, the next question, the phases once the Overview is accepted.  They
     Reopen one if they disagree:  it comes back as a mark like any other
   - a new question the answer raises:  `add <name>#Q`, as step 3
6. The person presses Accept Overview:  `inbox apply` moves the page to `phases`.  Then "4. Fill the doc".
   - The person says "go" in chat instead:  `epic stage <name> phases` yourself.

## 4. Fill the doc:  the phases (after Accept Overview)

The phases go to a background agent, `<name>-plan-doc`, as if the person had typed `/bg "plan-doc" ...`
([the bg skill](../bg/SKILL.md);  Owen, 2026-10-07).
- Its prompt has these steps, the Overview's sub-sections to read, and the decided questions.
- The session stays free meanwhile, listening, and relays its report.
- So does every later epic-page edit bigger than one command:
  a phase's Done list and items at its end, a reorder, Doc Review's pruning.

- Per phase, in order, `add-phase`
  (Owen, 2026-10-06:  "Symptom, Changes, then the details";  the page draws Changes after the Goal, next to the plan,
  since epic `epic-engine` P45):

  ```sh
  epic add-phase <name> "Short Name" --symptom "..." --changes "..." --goal "<ul><li>...</li></ul>" \
    --files "..." --verify "..." --estimate "1-2h"
  ```

  - Names:  `P1 · Short Name`, 2-4 words each, so "start P2" is unambiguous.
  - The symptom:  ONE line, what's wrong today.
  - The changes:  two or three, what changes.
  - The goal:  the details, one bullet per outcome, in the person's terms;  each decided question it carries linked.
  - The estimate:  wall-clock for Claude, agents included, review not (`30m`, `2h`, `1-2h`).
    It becomes the title's badge, and the Overview's total (`<epic-overview estimate>`) follows by itself.
  - The LAST phase is always `Doc Review` ("6. Doc Review").
    Its goal names the text pass:  the repo's text-rewriting skill, the epic's guide, the READMEs the epic made untrue,
    `epic pages fuss --branch` and the README checker last.
    - Added last, it STAYS last:  `add-phase` puts a later phase before it by itself (P33), the Doc Review moving
      down a number.
- A decided question a phase carries out:  write it into that phase's text with a change mark,
  `<epic-change item="q<n>">...</epic-change>`, then `epic change <name>`.
  The marks ARE the record:  NO `epic updated` block saying it again (epic `epic-engine` I159).
  The question is then HANDLED in that phase (P31):  grey, out of the lists.
  Prefer this to leaving one more decided item.
- Per item:  `epic add <name>#D|#T|#I|#M|#Q "title" [--details "<p>...</p>"]`.
  - `#T`:  a todo, work still to do;  `#T ... --limit`:  a limit to know about, not work (epic `epic-engine` P32).
  - `#M`:  a manual test ("5. Each phase", below).
  - The letters before epic `epic-engine` P44 (`C` a caveat, `T` a test, `V` before P32):  `#C` and `#V` are refused,
    naming the new ones;  `C` is a comment's now.
- Bring the Overview in line with the phases, nested in `<epic-overview id="overview">`:
  - Each sub-section:  `<epic-section id="o1" kind="overview-part" title="...">`, then `#o2` ...
  - A title with markup:  a `<span slot="title">` first inside, instead of `title`.
  - Sub-sub-items:  `<h4 id>`.
  - A split doc:  the prose goes in `parts/o1.html`.
- The prose blocks are ELEMENTS, never hand-shaped
  (`PLAN-DOC.md`, "Prose elements";  P14 of `epic-components`):
  - code:  in a folded `<epic-code title="file.ts · N lines" language="ts"><pre>...</pre></epic-code>`
  - digressions:  in a folded `<epic-aside title="...">`
  - the Net effect:  in `<epic-net-effect [option="A" recommended]>`
  - options, on any item:  in `<epic-choices>`, one set per question
  - labelled blocks:  in `<epic-field label="Where">`
  - links to items and phases:  `<a href="#d2">D2</a>`
  - NEVER change an existing `id`.
- `epic lint <name>`, then `epic open <name> --review` (new stage:  reload).
- Then, in the SAME pass, before the page is shown:  every phase's build plan ("4b. Build plans").
- The person reviews the phases and their plans on the page together:  Defer (after the others, still to do;  `inbox apply`
  moves it), Revisit, a comment.
  ONE press of Accept Phases accepts the phases AND every plan waiting (`inbox apply`), and moves the page to
  `building`:  then "5. Each phase", straight on.

## 4b. Build plans:  ALL of them, up front, WITH the phases

Claude's build plan for EVERY phase still to do, written in the same pass as the phases ("4. Fill the doc"), before
the person sees them and before any code (Owen, 2026-10-25:  "write the plans
up front, then look into adjusting before starting.  Otherwise, you'll stop after each phase and make me approve rather
than just being able to move on").
- Before epic `epic-engine` I117 each plan was written right before its phase, and the session stopped after every
  phase for the person's Accept.
- Each one:  `epic update <name>#P<N> --plan "<ol><li>...</li></ol>"`:  the steps, the files, how it's checked, what's
  left out;  short, in the person's terms.
  - FIRST, before reading for it:  `epic phase <name>#P<N> planning`, so its page shows a blue spinner on the phase,
    "Claude is writing this phase's plan" (epic `epic-engine` I147;  Owen, 2026-10-26:  "no indication in the phase
    header").  The `--plan` write ends it;  given up, `epic phase <name>#P<N> planning off`.
    - `epic update <name>#P<N> --goal ...` on a phase whose plan isn't accepted turns it on by itself.
  - Agents (up to 5) may draft them in parallel, a few phases each;  the session reads them all before showing them.
  - Each phase shows "Claude's plan:" with an orange rule, and its buttons are Accept Phase and Revisit
    (`<epic-phase plan="waiting">`).
- ONE coherence review over ALL of them (epic `coherence` P4, its Q3):  a `coherence` agent, `<name>-coherence`,
  as in "3. Plan", step 1.
  - Started AS the drafting starts, not after it (Owen, 2026-10-25:  so it overlaps the writing):  it reads the
    accepted phases (their goals and files) while the plans are written, then the plans as they land.
  - Before showing them, its findings are worked into the plans:  the wait is only what's left of it.
  - The build plan is where "write a new X" shows:  each finding changes its plan to use what exists, or becomes a
    question, "(coherence)".
  - A plan that adds nothing new (a rename, docs, a test) is left out of it, in one line.
  - Again whenever a plan is written later:  a phase added, a request filed, a plan rewritten ("5. Each phase", step 1).
- Then listen (`epic inbox wait <name>`) and END THE TURN with the Phases section's link pair:  "The phases and their
  build plans are up, P3-P9:  one Accept Phases takes both".
- The Doc Review phase's plan never waits:  `--plan` on it is accepted as it's written (Owen, 2026-10-25).
- The person accepts them on the page:  the header's Accept Phases (in the `phases` stage:  the phases and every waiting plan,
  ONE press, I125), or Accept Phase on each (once building:  the header's Send is ringed (2px #666) while any waits, its tooltip naming them);  one Send.  Or they say "go"
  in chat:  every waiting plan accepted.
  - Revisit on one:  rewrite that plan (a new `--plan` waits again);  the accepted ones stay accepted.
  - A plan rewritten from an ANSWER (a question decided, a revisit's pick):  the changed words marked
    (`<epic-change item="q<n>">`, then `epic change`), and NO `epic updated` block (epic `epic-engine` I159;  Owen,
    2026-10-29, on P51's orange Update under its Q53 marks:  "Do we still need the orange update section like this?").
  - Defer Phase on one (beside Accept Phase):  `inbox apply` moves it after the other phases, still to do.
- Then "5. Each phase", from the first, straight through.
- A phase ADDED later ("10. Add a phase", a request):  its plan written as it's added, accepted the same way.



## 5. Each phase

1. `epic phase <name>#P<N> active`, then CHECK its accepted build plan ("4b. Build plans") against what's there now.
   - Check the session's name (the isolate skill's "Session name").
   - The toolbar's line (epic `epic-engine` P35):  `epic inbox status <name> "Building P<N>"`;  `--clear` once it's done.
   - Earlier phases, answers and requests may have moved things since it was written.  Adjust, and go on:
     - a SMALL change (a file moved, a step folded into an earlier phase, a name changed):  say what and why with
       `epic updated <name>#P<N> "<p>...</p>" --summary "Plan adjusted:  ..."`;  the plan stays accepted.  NO stop.
       - a change an answer caused:  its change marks alone, no block (step 2, "An ANSWER rewrote ...")
     - a BIG one the person would want a say in (scope, a choice they made, much more work):  write the plan again
       (`--plan`, it waits), with the coherence review over it ("4b. Build plans"), listen, and END THE TURN with the
       phase's link pair:  "P<N>'s plan changed:  ...".  Only then a stop.
   - No accepted plan (a phase from before I117, or added without one):  write it now, as "4b. Build plans", and wait.
   - No plan at all only when the person said to start the phase without one ("just do it"), or in bedtime mode.
2. Do the work.
   Record as you go, not at the end:
   - Found a problem:  `add <name>#I`.
   - A limit we accept:  `add <name>#T ... --limit`.
   - A choice:  `add <name>#D` (a question born answered).
   - The person settles an item's options IN WORDS (a reply, the chat:  "require the parens"), not with the page's pick:
     `choose <name>#<id> <letter> "<outcome>"` right away, before or with building it.
     - It records it as their pick would:  that card set's `chosen`, the item green (a question answered, a call
       closed;  an issue or todo only reviewed), the outcome on the set, shown in its Choices (no Noted card, I153).
     - Skipped, the item stays red with nothing chosen, though the work is built (`outline-spell` J9, 2026-10-19).
   - A choice made WITHOUT the person (they're away, or an agent decided):  `add <name>#J`.
     - Ids `J1` ...;  see `/bedtime`.
     - CALM by default:  `--calm` (last), yellow (open) rather than red.  The same for an issue.
       - Owen:  "if what you picked was reasonable, and I didn't explicitly state otherwise, [it] should be yellow"
         (2026-10-10, "the principle of least surprise").
       - RED (no `--calm`) only when it would surprise them:
         - it goes against something they said
         - it drops, narrows or changes what they asked for
         - a real fork they'd plausibly have picked differently, AND that matters to them
           (cost, behaviour they'll notice, something hard to undo)
         - it needs their answer before work can go on
       - Following the repo's house style is one case of calm, not the only one.
       - Never ask:  decide, and record it.
       - The person flips it from its id chip while reviewing;  `epic calm <name>#<id> [<id>...] [--loud]` from the CLI.
   - Items added while the phase is active carry it.
     - The phase's "To review" line lists the ones the person hasn't reviewed;  the script writes it on every edit.
     - Never hand-write a "Judgement calls:" line.
   - Something only the person can check (a live window, a click, a look):  a manual test, into "Manual tests".
     - First, check it yourself where you can (a test, a script, a browser screenshot):  only what you can't goes to
       the person.
     - Written so their TEST RUN can step them through it on the page, one at a time (epic `epic-engine` P4):

       ```text
       add <name>#M "<what it checks>" --step "<exactly what to do>" --should "<what should happen>"
           [--example <screenshot.png> | "a line"] [--if-not "<what to tell Claude>"]
       ```

       - `--step`:  short, exact;  a page to open is an action link, a button in the run:
         `<a class="epic-test-action" href="<an epic pages link URL>">Open the Epics page</a>`
       - HOW a step is written (epic `epic-engine` r16;  Owen, 2026-10-22:  "You are making me think too much to do this
         stuff ... put them in code blocks with exactly what I need to type"):
         - it names the app, the window and the menu or keys:  "In VS Code's `⎇ repo-split` window, View > Output (⇧⌘U),
           pick `Spell` in its list", never "the Output panel" (Owen's:  "What is the output panel?")
         - everything to type in a code block, `cd` included:  `<pre><code>cd ui</code></pre>`, or in plain text a
           fenced block;  the run shows each with a Copy button
         - a new terminal in a worktree's window asks which folder:  the step says which to pick, or `cd`s first
         - a wait or a look between commands is a step of its own, between their blocks
         - the real names:  the extension's output channel is `Spell`, not "Spell Language Server"
         - nothing Claude can check itself:  CI (`gh run list`), a command's output, a page's markup are Claude's to check
       - `--example`:  a screenshot you took of it working, copied beside the page (`tests/<id>.png`)
       - `details <name>#M3 --step ... --should ...` rewrites an older manual test in these fields
     - They answer it in the run (passed, failed, skip, not now);  `inbox apply` closes it (7.3).
       Told in chat instead:  `close` it once they say it passed.
   - Fixed or done:  `close <name>#<id>`.
     It stays, closed, NOT struck.
   - Made moot by another decision:  `cancel <name>#<id> "why"`.
     It's struck through:  the one struck status (J16 of `review-review`).
   - An item talked through with the person (they answered, accepted, or said leave it):
     `review <name>#<id> "outcome"`, so the next `/epic review` doesn't bring it up again ("7. Review").
   - Changed a phase's PLAN, for a reason NO ITEM is (something found while building, a file moved, a comment):
     - `updated <name>#P<N> "<p>what changed, and why</p>" --summary "..."`:
       an `<epic-update>` block at the end of the phase's description, after Goal:  **Update**: <summary>, dated.
       Never an "Updated" word in the text.
     - NEVER for a change an answer caused:  its change marks say it (next bullet;  epic `epic-engine` I159, Owen,
       2026-10-29:  an Update block "only when no mark says it").
       - `updated` itself writes nothing then:  `--for q53` (or, without it, the item ids its text names, marked in
         the phase this pass) with marks in the phase prints "no Update block, the change marks say it".
       - Something the marks can't say (a file moved, why a step went):  its own block, `--for` left off.
     - ALWAYS pass `--summary`:  5-10 words saying WHAT changed (Owen, 2026-10-11).
       - Never who or when ("From Owen's comment CM2 ...", "Owen, 2026-10-11:"):
         the text says who, the block shows when.
       - E.g. `--summary "Tab labelled App/UI, right after App"`.
     - Then `update <name>#P<N> --changes ...` (or `--goal` ...), to make the fields say the new plan.
   - An ANSWER rewrote the Overview's or a phase's words (epic `epic-engine` P30;  Q13, B):  mark the changed words
     themselves, `<epic-change item="q16">the new words</epic-change>`, as you rewrite them.
     NO `<epic-update>`, and no `epic updated` after `epic change` (I159):  the marks are the whole record.
     - The words, not the block:  one mark per change, the question's id alone.
     - Then `epic change <name>`:  it stamps each (id `ch3`, time, the answer in short) and lists them;
       `epic lint` fails one not stamped, or naming no item.
     - The words a mark replaced (`was`, the popup's "Originally") are found by the tool as it stamps, from the page
       as it was (on disk, else its last commits):  write nothing more (I160).  Run `epic change` in the same turn
       you wrote the marks:  the content repo's turn-end commit is what it compares with.
     - No approval:  orange for 3 days, then quiet, the `Q16` chip for good.  The person reopens its question if they
       disagree;  `inbox apply` reopens it.  Rules:  `plan-doc.md`, "Change marks".
     - In a PHASE's text, the mark marks its item handled in that phase (P31):  grey, out of the lists.
       So settle a question by rewriting the phase it belongs to, marked, rather than leaving it one more decided item.
   - Changed a prose block any other way:  put an `<epic-update>` right AFTER it.

     ```html
     <epic-update at="YYYY-MM-DD HH:MM" summary="what changed, one line" phase="N"><p>why</p></epic-update>
     ```

     - An update to a whole Overview sub-section:  last inside it.
     - The script marks items itself (a bare label in the title);  `phase <name>#P<N> done` drops both.
     - Its plan changes (`updated`) stay.
     - A note that should stay:  `<epic-note state="update" title="...">` (`plan-doc.md`, "UPDATE markers").
3. Subagents:  named and listed, as the root `CLAUDE.md`'s "Delegated work" says.
   - `epic agents add` / `done`
   - Paste the cheat sheet below into their prompts,
     with "record todos, issues and decisions in the epic page as you find them".
4. A phase that changed a page or an element (a docs page, a component, the editor app):  the DESIGNER review first
   ([the designer skill](../designer/SKILL.md);  epic `epic-engine` P24, Q12).
   - It fixes the obvious things itself, and asks about the bigger ones with before / after pictures on a details page.
   - Its fixes go in the phase's Done;  what it asks about waits on the person, as calm issues.
5. Close the phase:  `epic phase <name>#P<N> done --done "<ul><li>...</li></ul>"`.
   - It drops that phase's UPDATE markers, writes its Done field, and brings the doc forward.
   - It writes how long Claude worked on it, `took` (epic `epic-engine` P41):  its own agents' time from their
     transcripts (named `<epic>-p<N>`, or saying `P<N>`), else the epic's sessions' while it was active, never the
     time waiting on the person.  The title row then shows `21m`, the estimate its tooltip.
     A phase done before:  `epic phase <name>#P<N> took`.
   - Then `epic summary <name>`.
   - With the phase's items, this runs in a background `<name>-plan-doc` agent ("4. Fill the doc"),
     while the reply below goes out.
   - Done:  what was BUILT, ordered by what the person asks about first:
     where to see it, what changed in how they work, what's rough or not yet tried by hand.
   - Commit messages, so the doc can list them (its phase's and items' "Commits"):
     - a phase:  `P<n>:  <Name> -- <summary>`
       - `P4 + P5:` for two;  `WIP P3:` for a parked part
       - the phase's NAME right after the colon:  `commits --backfill` files a phase commit by its name, not its
         number alone (epic `epic-engine` r17:  phases get renumbered), and leaves out one naming another phase
       - `<name> P<n>:` once the epic's name leads it;  one naming another epic first is left out
     - an item fix:  `<name> I3:  ...`.
       It MUST carry the epic's name:  `commits --backfill` ignores a bare `Fix I3:`, since it can't tell which epic.
   - A multi-repo top:  one commit in EACH repo the phase changed, all with the same subject, each in the repo's
     folder (`epic worktree repos` lists what's uncommitted where);  the lowest repo first (`repos.json5`'s order).
   - The commits reach the epic page BY THEMSELVES (epic `epic-engine` I135), found by subject, in the kit and every
     child repo (a child repo's commit links to that repo on GitHub):
     - `epic phase <name>#P<n> done` lists the branch's so far
     - `epic merge <name>` lists every commit it just brought onto `main`
     - by hand, any time:  `epic commits <name> --backfill`;  none is listed twice
     - The epic page is never in that commit:
       it's shared content, committed for you (see "Shared content" at the top).
   - A STANDING epic:  the phase goes onto `main` AT ONCE (Q8 of `epic-workflow`),
     once its commit is made and its checks pass.
     - Standing:  `<epic-page standing>`, and `epic summary --json`'s `standing` (epic `epic-workflow`).
     - Its own short doc pass comes first, in place of one Doc Review at the end:
       the repo's text-rewriting skill (spell-app's `/fussbudget`) on the files the phase changed,
       and the guide and the READMEs the phase made untrue brought in line, in the readme voice
       ("6. Doc Review"), before the commit.
     - Then, no asking (the standing epic is the ask):
       1. `main` moved (`git log --oneline HEAD..main` not empty):  `epic worktree merge-main`.
          - A multi-repo top (`epic config repos` prints names;  [the isolate skill](../isolate/SKILL.md), "A
            multi-repo top"):  `epic worktree repos` says which repos are behind;  `merge-main` merges every one.
       2. `epic merge <name>`, from the worktree:  it works on the MAIN checkout, checks it's on `main` and clean,
          then fast-forwards.
          - Never `ExitWorktree` and back for it:  entering asks the person every time (epic `epic-engine` P12, r11).
          - A multi-repo top:  every repo's main checkout;  only the repos whose `<name>` branch has commits move.
          It refuses, saying why (`main` moved again, uncommitted work there):  `add <name>#I`, and go on.
          - STRAY files in a main checkout (epic `epic-engine` I77;  Owen:  "ask if I want to ditch them before merging
            rather than just bailing"):
            - a test's snapshot, a repo's generated output:  it moves them aside by itself, and says so
            - one to three others (a `settings.json5` ...):  it refuses, listing them.  Ask the person in a modal, "Ditch
              these in main?", each file named;  on a yes, `epic merge <name> --ditch`
            - moved aside, never deleted:  into `~/.spell-epic/ditched/<time>/`, which it prints
            - more than three is somebody's work:  `add <name>#I`, as above
       3. The changelog, if the repo keeps one:
          the epic's entry, under "3. Merged into main", gets the phase's bullets.
     - Never `/epic done`:  the worktree, the window and the session stay, for the next request.
     - In bedtime mode, nothing merges:  `add <name>#T "merge P<n>"`, as `/bedtime` says.
     - `epic update <name> --standing [on|off]` makes an epic standing, or not;
       the docs' home page, `/epics` and its step label then never call it done (STANDING, when every phase is).
6. A short note (done, issues, todos, next), the "complete.  Next is" line (see the top), then GO STRAIGHT ON to
   the next phase whose plan is accepted:  no question, no stop (Owen, 2026-10-25, I117:  "rather than just being able to
   move on").
   - Stop, and ask (AskUserQuestion), only when:
     - the next phase has no accepted plan ("4b. Build plans"), or its check needs a new one (step 1)
     - something urgent:  a failing check you can't fix, a hard-to-undo call, an open issue that blocks the next phase
     - it was the last phase, or the person said to stop after this one
   - Then the options, most useful first:
     - "Start P<N+1> · <Name> (Recommended)"
     - the top open issue(s):  "Fix I<n>:  <title>"
     - a todo worth acting on now
     - "Stop here"
   - The person can redirect at any time:  a message mid-phase is read as it comes, and taken in before the next phase.
   - Questions the user must answer also go in the doc (`add <name>#Q`).
   - Once answered:  `decide <name>#Q3 "what was decided"`.
     Never `close`:  `decide` writes the answer INTO the question (D13 of `review-review`).
7. Explain every question and every issue the user must weigh in on WITH EXAMPLES, in the doc,
   so the user can decide from the doc alone (rules:  `plan-doc.md`, "Explaining a question or issue"):
   - define each coined word in plain language ("stacking", "nudge")
   - show the real code / markup it's about
   - compare many values in a table
   - put the options side by side, with one recommended
   - add a LIVE example when the doc's widgets can show it
   - Then ask, with option labels that match the doc's.

## 6. Doc Review (the floating last phase)

- It FLOATS (epic `epic-engine` P33, M4):  docs never trail the code.
  - `add-phase` (no `--before` / `--after`) puts a new phase just before a last Doc Review:  P15 the new one, the
    Doc Review moving down to P16, what names it following.
    - Phase numbers are always WHOLE (epic `epic-engine` I126;  Owen, 2026-10-25:  "ditch the 17.1 and just
      reorder");  P39's decimals (P14.1) are gone, made whole by the migration `whole-phase-numbers`.
    - The Doc Review keeps its name.
    - Under way or done, it is to do again (logged):  it takes in the new phase's docs when it runs again.
      So a phase can be added while the Doc Review runs:  never rename it to get one in after it.
    - New phases on a finished epic bring the doc pass back by themselves.
  - A STANDING epic has no Doc Review:  its short doc pass follows each phase, or each group built together
    ("5. Each phase", step 5).
  - What it writes (the guide, the READMEs) stays as below until Q18 of epic `epic-engine` is taken up.

- Prune:  close stale items;  make the summary and Overview true to what was BUILT.
- "Manual tests":  every hand check the work needs before merging is there, each a step and what should happen.
  - List the open ones in the reply, as bullets.
- The text pass (epic `skillz` P7), in this order:
  1. First, the repo's text-rewriting skill, if it has one (its `AGENTS.md` or `.claude/skills/`;  spell-app's
     `/fussbudget`), both named in full, so nothing asks:
     - `/fussbudget branch`:  the text this branch changed, docstrings and comments
     - `/fussbudget epic <name>`:  the epic page's prose.
       Epic-page work, so the background `<name>-plan-doc` agent runs it ("4. Fill the doc"),
       right after its pruning.
     - Both rewrite in place, uncommitted:
       the branch's diff waits for the person in Source Control, before the phase's commit.
  2. Then the epic's guide (below), written from the CLEANED epic page in the voice the repo gives guides:
     `epic voice --for guide` prints its file (spell-epic's readme voice, unless the repo names its own);
     read it whole first, and its "AN EPIC'S GUIDE" shape.
     The repo's CODE voice (`epic voice code`:  its house style's writing rules;  Spell's, WWOD §6) still holds
     where they differ.
  3. Then the READMEs (below):  every README the epic made untrue, rewritten in the same voice.
  4. Last, the checkers:
     - `epic pages fuss --branch`
     - `epic pages fuss <the epic's guide>`:  it's shared content, not in the branch's diff
     - the repo's README checker, if it has one (Spell's:  `yarn readme:check` at the kit's root)
     - Their misses fixed, or listed for the person in the reply.
- Turn it into the epic's guide:  `epic pages create durable <page> --title "..."` (fixes asset paths for the depth).
  - One page:  `guides/<name>.html`.
  - Several files (pages, experiments):  `guides/<name>/<name>.html`.
    Shared content too:  committed for you, like the epic page.
  - From the epic page, in the voice's guide shape:
    - Overview and the phases' Done lists -> the hook, what it is, how to use it, how it works
    - decisions -> "Why it's built this way", each with the option it beat
    - open limits (todos marked `limit`) -> "Limits"
    - phase and item ids -> nowhere in the body;  one folded "History" note at the end, if any
  - Finish as [epics' AGENTS.md](${CLAUDE_PLUGIN_ROOT}/src/AGENTS.md) says, "Finishing a page".
  - Then `epic pages index`.
    The index is shared too:  `epic` keeps the epic's own card current from any checkout.
- The READMEs:  bring every README the epic made untrue up to date, in the voice the repo gives READMEs
  (`epic voice --for readme`).
  - Which:  in every repo the epic touched (the kit and each child repo it committed to), every `README.md` and
    `README-*.md` that names something the epic added, changed, renamed or removed:
    - the README files its commits changed (`epic docs <name>`, its `wrote` list)
    - and, by grep, every page naming one of its commands, flags, files, folders, settings or elements, old name or new
  - Each one:  the facts first (what's binding:  the `/docs-check` skill's rules), then the voice:
    the sections that changed are written as the voice says (hook, model, edges, real output), and a page index or
    table that lists the changed thing is brought along.
    A section the epic didn't touch is left as it is.
  - A README the epic made necessary (a new major folder) gets a new page in the voice, and a row in its repo's index
    of pages.
  - Big:  more than 6 pages, or several repos:  fan out as `/docs-check` does ("Fanning out"), one agent per repo.
  - Tracked files:  the diff joins the phase's commit, in each repo.
- The epic page stays in `epics/` as the record:  every phase done.
- Changelog, if the repo keeps one (its `AGENTS.md` says):  write the epic's entry straight into it.
  - The shared changelog is the content folder's `guides/changelog.html`:  `epic docs <name>` looks for the entry there.
  - It links the epic page and the guide.
  - Under "3. Merged into main" if "Finish" below merges it, else "2. In worktrees".
  - Nothing to commit on the branch for it, and no merge conflict:  every checkout sees the one file.
- Then leave the worktree:  follow the isolate skill's "Finish".
  - No move back:  the session and its epic page stay in the window they're in.
- Last line of the reply:  "All done ..." (see the top).

## 7. Review:  `/epic review [<name>]`

The person reviews ON THE PAGE:  the epic page in the side bar's Review tab, where they mark items.
- Each item's buttons:  one group, Make Todo, Revisit, Approve (no wand anywhere since 2026-10-25).
- A todo that's WORK (no `limit`) has these instead:
  the plane, "do it in the next phase" (`next`);  Revisit;  the x, "drop it" (`drop`).
  `inbox apply` applies both.
- Every other note box:  Revisit Later;  the x, "skip this" (`skip`:  nothing to do).
  `inbox apply` applies it as reviewed:  the note kept, the status left as it was.
- Choose, on option cards.
- A to-do PHASE dragged by its title to another place (epic `epic-engine` P34):  its move arrives as a mark
  (`{ action: "move", to }`);  `inbox apply` moves it, the numbers and every link and "P5 · Name" following.
- Their colours and fills:  `plan-doc.md`, "Colours".
- They send them with the page header's paper plane,
- A running revisit now clicked again is "nevermind" (`canceled`, 7.3).

This session LISTENS:  it waits on the doc's review inbox, and acts on what arrives.
- EVERY epic session listens on its own while it's open, `/epic review` or not (epic `epic-engine` P18):
  - the session's inbox POLLER holds the inbox for the session whose title, or worktree, names the epic, while it
    runs:  the page says it's listening
    - a small poller (`InboxPoller`), which runs `epic session listen` for a moment as the inbox changes
      (epic `epic-engine` P19:  about 45MB a session, not 170)
    - the plugin's `Stop` hook starts it at each turn's end (`asyncRewake`, epic `epic-engine` I144):  nothing to arm
      - Claude Code starts plugin MONITORS only in a terminal session, never in VS Code's panel
    - `/epic review`'s `epic inbox watch` takes the inbox over;  once that session's `wait` stops for good, the
      monitor takes it back within about 90s
  - it prints NOTHING until the person sends;  then ONE line, `📬 <epic>:  the person sent work ...`, which wakes the session
  - that line:  take the work with `epic inbox wait <epic> --timeout 5`, then go on at 7.3, as if your own `wait` had
    finished
  - `📬 <epic>:  the person pressed "start review" ...`:  they asked for a review from the page;  start one, `/epic review
    <epic>` (this section), as if they'd typed it
  - a `wait` already running in the session takes the work first:  the monitor then says nothing
- Mechanical marks:  at once.
- Add Details and "revisit now":  by background agents.
- "Revisit soon":  answered one at a time.
- EVERY answer goes INTO its item, on the page;  the chat only links them (Q3 of `windows-and-review`).
- No modal walk through items any more (epic `review-review`, 2026-10-04;  its epic page, 1.1-1.2:
  `epics/review-review/review-review.plan.html` in the content folder).

- Runs from ANY window, `main` or a worktree.
  - The prompt hook lets `/epic review` through, and never renames the session.
  - EXCEPT in a session titled for a DIFFERENT epic (`🚧 seo` typing `/epic review airplane`):
    the hook refuses it, with a one-line reason (epic `airplane` P12, Q10 B).
    Untitled and main sessions are allowed.
  - No worktree, no plan mode.
- Started from the PAGE too (epic `airplane` P12):  the person clicks the "No Claude session is reviewing" pill
  (or the review line).
  - The page server finds the ONE running session titled for the epic (`🚧 <name>`, or the name as a word).
    - Its inbox poller runs:  it asks through the inbox, and the poller's `📬` line wakes the session (above).
    - Else it types `/epic review <name>` into its tab through its window's bridge:  the person presses Enter there.
      Its tab open already, VS Code refuses that, so nothing is typed and the page says to paste it.
  - None, or several:  nothing is sent, and the page says which sessions it found.
- And WOKEN by the page (epic `epic-workflow` P16):  Send with NO session listening.
  - The page server, the first of these that applies:
    - types `/epic review <name>` into the epic's running session (`🚧 <name>`)
    - else opens a new session in the epic's worktree window (opening the window if it's closed)
    - else, with no worktree, a new session in a main window
    - The person presses Enter.
  - Once per epic per 10 minutes, or until a session listens.
  - Never with several sessions titled for it, in airplane mode, or for a Send with nothing new.
  - So marks no longer wait for the person to remember `/epic review`:  a session typed into mid-turn reads it after.
- Every `epic` command edits the epic's ONE shared doc, from any checkout.
- The page's controls need a PAGE SERVER with the review routes (`epic server ensure`).
  From `file://`, or a server without them, the page shows no menus.
- The person comes to a review COLD:  never a bare id in chat.
  Always what it is in words ("the highlight.js swap (T2)").

Commands, in the order a review uses them:
```
epic list --json                           every epic:  status, checkout, not reviewed / items
epic items <name> --json                   where reviews stand;  sections, items, states
epic pages link <ABS doc> --hash <id> --review --show   show the doc in the Review tab, at <id>;  prints its links
epic inbox watch <name>  /  ignore <name>  this session is (no longer) reviewing:  the page says so
epic inbox wait <name>                     Bash run_in_background:  exits with work (or 2:  timeout)
epic inbox apply <name> [ids]              approve / pick / Make Todo marks into the doc;  prints what's left
epic inbox working <name>#<id> on|off      the page's spinner on an item, or a phase (P20)
epic inbox status <name> "<text>" [--items q3,c2] | --clear   the toolbar's line:  what you're doing, what you answer
epic update <name>#<id> underway "<reading>"   Claude's blue status card on an item, spinner on
epic update <name>#<id> done ["<summary>"]     the item FINISHED:  that card green (Done);  an open issue / todo closes
epic update <name>#<id> noted "<what>"         a STEP done (choice recorded, answer written):  an outlined Noted card
epic details <name>#<id> --file f --more | --append   a More Details card (Add Details) / a reply appended
epic summarize <name>#<id> --file f        condense an item:  f replaces what it shows, the rest folded away (13.)
epic inbox done <name>#<id>  /  clear      an item's request finished  /  marks dropped after a talk
epic inbox <name> [--json]                 what's waiting, sent or not
```

### 7.1 Pick a doc (no `<name>`)

- `epic list --json`:  `{ name, title, status, checkout, notReviewed, total }` each, in progress first.
  - `repo` too, for an epic worked in ANOTHER repo:  that repo's main checkout;  `checkout` is then that repo's.
- As reply text, every epic in two groups (in progress / done), most not-reviewed first.
  - E.g. `- commands (worktree commands)  5 / 9`.
- Then ONE modal, header `Epic Review`, "Which epic do you want to review?":
  - the epics with anything not reviewed
  - label:  `<name> (in progress)` / `<name> (done)`
  - description:  `5 of 9 items not reviewed`
  - 4 or fewer:  all
  - more:  the next 2, then "More" (the next names), until 4 or fewer
  - any other:  typed in Other
- (The Review tab's own start page, "What would you like to review?", will replace this:
  `review-review`'s todo T1.)

### 7.2 Start

1. `epic items <name> --json`;  the doc's summary for what the epic is.
2. In chat, three lines at most, for someone who remembers nothing:
   - what the epic is
   - what's waiting on them (e.g. "4 judgement calls not reviewed, 2 open questions")
   - when they last reviewed it
3. The FIRST thing worth their time:
   - the first item, in page order, whose state is `attention`
     (red:  an open question, an unreviewed judgement call or issue)
   - none:  the first `open` (yellow) one
   - none:  the top
   - `epic pages link <ABS doc> --hash <that id> --review --show`:  the doc opens in the Review tab, at it.
4. `epic inbox watch <name>`.
   - Then `epic inbox wait <name>`, with Bash `run_in_background: true`.
5. END THE TURN, short:
   "Mark items in the Review tab:  each item's buttons;
   a todo's plane queues it for the next phase, its x drops it;
   a note box's x skips it (nothing to do);
   the header's paper plane sends the rest.  I'm listening."
   - Then the doc's link pair.

### 7.3 Woken:  the `wait` command finished

Read what it printed.
Then, in this order.

Every card you finish says what REALLY happened, one of three
(Owen, 2026-10-10:  "Claude Done entries are confusing ... you haven't apparently done anything";
2026-10-26, epic `epic-engine` I148:  a fixed issue with two Done cards stayed red):
- `status ... underway "<reading>"`:  you're on it.
- `status ... noted "<what;  what happens next>"`:  a STEP done, the item NOT finished.
  - their choice recorded (a todo made;  "do it next phase"):  `"Queued for P9 · Build"`
    - NOT a pick:  `choose` / `apply` record it inside the item's Choices, no card (I153)
  - an answer or reply written, details added, the item condensed:  `"Answered their note:  options A and B"`
  - called off:  `"Called off on the page:  nothing written."`
  - An underway card turns noted.
- `status ... done ["<summary>"]` ONLY when the item's work is FINISHED:  an issue fixed, a todo built.
  - An open issue or todo CLOSES with it (status done, green, its phase stamped, logged), as `epic close` does.
  - A question, judgement call or manual test keeps its status:  a question is decided (`decide`, `choose`), the
    other two are the person's to close.
  - Meant "this step done"?  That's `noted`.

The item's id chip follows too (PLAN-DOC.md "Colours"):
- dashed:  not sent
- OUTLINED:  sent / on it / still due
- solid:  done
- Leave work you queued `queued` until it's built, so their chip stays outlined.

A revisit note that says just `do it` (now or soon) means:  DO it, no question back -- the call as written, the todo
as asked.  Revisit puts it in a judgement call's or todo's empty note box for them (Owen, 2026-10-19:  "I generally
want you to just do it").

0. The toolbar's line (epic `epic-engine` P35), FIRST:  `epic inbox status <name> "Responding" --items <the ids
   taken>`, so the person sees what you're answering;  `epic inbox status <name> --clear` as you arm `wait` again (step 4).
1. Exit 2 (timeout, nothing happened):  arm `wait` again, and end the turn with one line ("still listening").

1b. CANCELED:  The person said "nevermind" on a running request for now (epic `windows-and-review` P2).
   - Stop that item's background agent (`TaskStop`).
   - Then `epic update <name>#<id> noted "Called off on the page:  nothing written."`.
   - And `epic inbox done <name>#<id>`.
   - An agent that finishes anyway is refused (`epic details` errors:  "the person called this request off"):
     nothing lands.
2. NOW requests:  Add Details, revisit now;  after Review Now, every revisit the person had marked.
   - `wait` already marked them `working`:  the page spins.
   - Per item, FIRST its status card:  `epic update <name>#<id> underway "<reading>"`.
     - What you take the task to be:  one or two sentences, plain words, no file names.
     - The person sees it at once, blue, under their note (P13 of `epic-components`).
   - THEN a BACKGROUND `Agent` (`run_in_background: true`).
     Each prompt carries:
   - Which doc, which item (id, title), and the rules:
     - `plan-doc.md` "Rules":  cold reader, bullets, examples, Net effect
     - and "Prose":  the blocks are ELEMENTS
       - `<epic-code>`, `<epic-aside>`, `<epic-net-effect>`, `<epic-choices>`, `<epic-field label>`
     - never `ui-accordion.spell-code`, or a `<p><b>Net effect:</b></p>` by hand
   - Add Details:  read the item, the code and docs it names, then write what its text leaves out, as MORE details.
     - `epic details <name>#<id> --more --file <html>`.
     - The item's text stays on top ("Original Reply").
     - Yours goes under it, in a white "More Details" card (P3 of `windows-and-review`).
       So don't repeat the text:  build on it.
   - Revisit now:  answer the person's note (quote it), in an `<epic-reply from="Claude" at re>`
     (`plan-doc.md`, "Review inbox", its example).
     - What they asked, then the answer with evidence:
       real code in an `<epic-code>`, the command and its output.
     - Option cards when they must choose:  an `<epic-choices>` inside the reply, so they pick on the page.
     - An `<epic-net-effect>`.
     - `epic details <name>#<id> --append --file <html>`.
     - With a pick ("picks B · ..., asks:  ..."):  answer about THAT option.
       Never decide the question:  they confirm with a plain pick.
   - Last:  `epic update <name>#<id> noted "<what was written>"`:  the card turns Noted, a step done.
     - `done ["<summary>"]` instead only when the request FINISHED the item ("do it" on a todo, and it's built):
       the card turns green and the issue or todo closes.
     - Say what was written;  a surprise, a choice made, something left undone when there is one.
     - Then `epic inbox done <name>#<id>`.
   - Up to 5 agents at once (root rules);  more:  the rest after.
3. SENT marks:  `epic inbox apply <name>`.
   - Approvals, picks and todos made or queued land in the doc;  it prints each.
   - TEST RESULTS from the person's test run (epic `epic-engine` P4):  `wait` prints them under
     "test, the person's test run", each test with its result (`passed`, `FAILED`, `skip`, `not now`), their COMMENT and their
     screenshot's path.  `apply` applies them all:
     - passed:  the test closed;  skip:  canceled;  not now:  deferred, last in their next run
     - failed:  a NEW issue, "M3 failed:  <title>", holding their note and screenshot, linked both ways;
       the test stays open, marked failed
     - then `apply` lists the failures, `M3 -> I12`:  tell the person ONE line per failure, with the new issue's link
       (`epic pages link <doc> --hash i12 --review`), e.g. "M3 failed:  the pill stayed grey -> I12";  the passes,
       skips and not-nows in one line of counts
     - fix the issues as any issue:  don't reopen the test by hand;  their next run tries it again
     - their COMMENT, with ANY result, lands on the test as their reply (`<epic-reply from="Owen">`;  a skip's in its
       cancel line too).  READ EVERY ONE:  a passed test with a comment may still need work (Owen, 2026-10-19:  "it
       did part of what you asked, I want to explain how").  A comment that says something is missing or wrong:
       `epic add <name>#I "<what>" --calm --details "<p>From <a href=\"#m3\">M3</a>'s comment:  ...</p>"`, the
       issue linking the test
   - A pick works on ANY item's cards, a reply's too (I8 of `epic-components`):
     a question is answered with it, any other item approved with it.
   - `apply` itself gives each todo made and todo queued its outlined NOTED card;  an approval gets none (Q19):
     - a pick gets none either:  its line ("recorded ...;  waiting for ...") goes inside the item's Choices (I153)
     - "Made todo T23 ..."
     - "Queued for P10 · ..."
   - Then each "to talk over" (revisit soon), one at a time:
     - `status ... underway "<reading>"` as you take it up.
     - Answer their note INTO the item, as a reply:  `details --append`, with the reply markup of "revisit now" above.
       Their note quoted, the answer with evidence, option cards when they must choose, so they pick ON THE PAGE.
     - Then `status ... noted "<what was answered>"`:  an answer is a step, not the item finished.
       `done` only when it finished the item (an issue fixed, a todo built).
     - Then `inbox clear <name>#<id>`, and `review <name>#<id> "<outcome>"`.
     - Their answer in words names an option ("require the parens", "B"):  `choose <name>#<id> <letter> "<outcome>"`
       as soon as they say it (section 5, step 2), not a `review`.
   - In chat:  one line per item, with its link (`epic pages link ... --hash <id>`), never the answer itself.
     (Q3 of `windows-and-review`:  a long review stays readable.)
   - They answer on the page (Revisit again), or say so in chat.
     A quick yes / no:  a modal.
   - A call made name by name (they want each name's context before a rule's renames go in):
     a CHOICE page (the Choice Pages guide, the content folder's `guides/syntax-choices.html`).
     - `epic choices create <slug> --epic <name> --rows <rows.json5>`.
     - Then `show <slug> --wait`, in the background.
   - "picks B · <card>, asks:  <note>" (a pick with a revisit, "B, but ..."):  `apply` leaves it.
     - `status ... underway`, then answer the note about B.
     - Once they agree (in words, a reply or the chat), record it yourself, on any item:
       `epic choose <name>#<id> B "<their name>, <date>:  '<their words>'"`.
     - No Noted card for it:  `choose` writes the pick's line inside the item's Choices (I153).
     - `inbox clear` / `done` KEEP their pick as that set's `chosen` (with its line), unless you decided otherwise.
       Once they picked, the card says Chosen.
   - The page counts this session as gone once its heartbeat is 90s old.
     - `wait` stamps it every 30s.
     - So do `inbox apply`, `done`, `clear`, `working` and `status`.
     - A long talk without them shows "nobody is reviewing", until `wait` runs again.

3b. COMMENTS (epic `airplane` P11):  the person's comments on the doc's blocks, or on text they selected (the bullhorns).
   - Ids `C1` ... (epic `epic-engine` P44), as the page shows them.
     - The inbox keys them `c1` ...;  the old `cm1` reads the same.
     - `M1` ... before P44 ("M" for mark, epic `epic-workflow` P23):  `M3` typed is a manual test now, never a comment.
   - Each is a THREAD on the page:  their comment, your answers, their replies, until they close it
     ("that's good" / "skip it").
   - `epic inbox <name>` lists the ones waiting, under "comments".
     Each with the block's anchor (`p3#field-2`, an item's id) and the quoted text.
     - A REPLY of theirs on a thread is waiting work too, as a new comment is.
       - It's listed under its comment, "<their name> replied:  ...".
       - Answer their latest words, the thread above for context.
   - The person's SEND hands them over, as it does marks (Owen, 2026-10-10:  Send stays the way comments reach you).
     - A new comment, or their reply on a thread, turns Send blue on the page;  pressing it (or Review Now) wakes `wait`.
     - `wait` prints them under the send:  "comments, to answer on their threads", with their latest reply.
     - Each goes over once, until they speak on its thread again.
     - A comment never wakes `wait` by itself, unsent.  Still check `inbox` on every wake:  one may wait unsent.
   - FIRST, as you start on one:  `epic inbox working <name>#C3 on`.
     - Their thread shows "Claude: thinking…" at its end (a turning notch) until your answer lands.
     - `inbox done <name>#C3` turns it off.
     - Dropped without an answer:  `inbox working <name>#C3 off`.
     - What they said before it counts as read:  more words of theirs go after it, as a new reply (waiting again).
   - Answer each like a revisit's note:  INTO the item it's on (`details --append`, their comment quoted).
     On a phase field or Overview prose:  into that phase or part.
   - Then `epic inbox done <name>#C3 --file <answer.html> [--commit <sha>]`.
     - The answer goes on their thread too (a line or two;  the full one is in the doc):  their turn, the thread opens.
     - `--commit`:  the commit it was built in;  their Done line shows it.
     - No `--file`:  the thread says "Answered in the epic page".

3c. GUIDE COMMENTS (epic `epic-workflow` P13):  their comments on the docs pages the epic OWNS, with the page's own Send.
   - Owned:
     - the epic's guide and its `details/` pages
     - every guide its See Also lists that no other epic claims first
       (`SeeAlso.ownerOf()`:  the guide's epic, then an open one, then the one updated last)
   - `wait` prints them under "sent from the pages <name> owns", each under its page;
     `epic inbox <name>` lists the ones waiting, sent or not.
   - One at a time, with the guide commands (not `epic inbox`):
     - `epic comments working <page>#C3 on` as you start:  their thread shows "Claude: thinking…".
     - Work it into the page (or say why not).
     - `epic comments answer <page>#C3 --file <answer.html> [--commit <sha>]`:  their turn, the thread opens.
   - `/epic review feedback`, the STANDING epic for every page NO epic owns (epic `epic-engine` T9):
     those pages' Send wakes it, and `wait` prints their comments the same way.
     - First `epic comments gather`:  a phase per page (an Updated block in its phase while that's open),
       each comment marked taken.
     - Then work each phase as its Overview says, and close it when every comment in it is answered.
4. Arm `wait` again (always, unless they said stop), then reply:
   - what landed:  bullets, items in words, ids after
   - what's being worked on in the background
   - what needs them
   - the doc's link pair last

- A background agent's own completion notice wakes the session too.
  - Nothing to do but check `inbox` shows the item done.
  - Don't re-arm a second `wait` while one runs:  `inbox` would print both.
    Check the background tasks.

### 7.4 Finish

When the person says they're done ("stop reviewing", "that's it"), or the session must stop:
- stop the waiter (`TaskStop`), then `epic inbox ignore <name>`
  - a session whose title or worktree names the epic keeps listening anyway, through its inbox poller (P18, I144):  the next
    Send still reaches it, as a `📬` line
- `epic log <name> "Review:  <n> approved, <n> answered, <n> to todos, <n> details added"`
- reply:  what was decided and done (in words, ids after), and what's still waiting on them;  the link pair
- the doc's changes:  nothing to commit, from any checkout.
  It's shared content, committed for you at the turn's end.

### 7.5 A saga page:  `/epic review SAGA:/<id>` (or "saga <id>")

A SAGA PAGE (`sagas/<id>/<id>.saga.html`, epic `epic-workflow` P15) is reviewed exactly as an epic page is.
- Its name, everywhere above:  its short address, `SAGA:/<id>`.

  ```text
  epic items SAGA:/epics --json
  epic inbox watch SAGA:/epics
  epic inbox wait SAGA:/epics
  epic add SAGA:/epics#T "..."
  ```

  - The person may say "saga epics" or `/epic review saga epics`:  read it as `SAGA:/epics`.
  - Why the prefix:  a saga id may also be an epic's name (`output-targets`).
- Its marks and comments wait in its own inbox, beside the page.
- When nobody listens, its Send wakes a new session in a main window, `/epic review SAGA:/<id>` typed in.
- Show it with `epic pages link <main root>/sagas/<id>/<id>.saga.html --hash <id> --review --show`.
- No phases, branch or worktree:  answer in its items and its Overview, and log as usual.
  - its Overview:  `#o1` Done so far, `#o2` Ideas not done yet
  - the log:  `epic log SAGA:/<id> "..."`
- A session titled for an epic (`🚧 seo`) refuses it (the prompt hook):  run it in a main session.

## 8. Resume:  `/epic resume [<name>]`

A NEW session picks up an epic whose own session is gone (closed, crashed, compacted beyond use).
- It works in the epic's checkout, in a window the person picks, from where the epic page says it stopped.
- The epic page is the memory:  read it, don't redo it.

0. In ANOTHER epic's window (the prompt hook's note says so;  epic `epic-engine` r15:  "this should open the epic in
   a new window!"):  never resumed here.
   - "From another worktree", steps 4-5, with `--prompt "/epic resume <name>"`:  a launch, or a fresh session's move.
   - Then stop:  the epic's own window resumes it.
0. Already home:  this window or this session is ALREADY the epic's own (Owen, 2026-10-10):
   - the window:  `epic window which` says `ongoing/<name>.code-workspace` (in `epic config windowsFolder`)
   - or the session:  its folder is `epic worktree path <name>`'s
   - and `<name>` has an epic page (`epics/<name>/`), and is the `<name>` typed, if one was.
   - Then that's the epic, and nothing is asked:
     no "Which epic?" modal (step 1), no new-window-or-stay modal (step 3).
     - Step 3 is `EnterWorktree` with `name: "<name>"` (if not in it yet), then `epic window stay <name>`.
   - One line says so:  "this window is `⎇ <name>`:  resuming it".
1. Which epic:
   - `<name>` given:  that one.
     No epic page at `epics/<name>/`:  say so, then the list below.
   - none given:  the epics in progress, minus those with a running session.
     - `epic list --json`, status `in progress`
     - the running sessions:  `epic worktree list`
     - One:  use it, naming it in the reply.
     - Several:  AskUserQuestion "Which epic?", label `<name>`,
       description its next phase and checkout (`epic summary`).
   - Rename this session `<name>`, first.
     - A typed `/epic resume <name>` already was, by the prompt hook
       ([prompt-gate.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/prompt-gate.mjs)).
     - Else `epic session title --force "🚧 <name>"`.
2. Its own session still running (not this one):  as [the unpark skill](../unpark/SKILL.md), step 2.
   Tell it, or resume here.
   - Found by `epic worktree status <name>`:  `sessions`, `running: true`.
3. Where:  the epic page's checkout (`list --json`, `checkout`).
   - a `repo` too:  ANOTHER repo's epic (epic `epic-engine` I47).
     Never `EnterWorktree` here, by name or path:  "1. Name"'s check, `epic window launch <name> --prompt
     "/epic resume <name>"`.
   - `main`:  no worktree;  work in the main checkout, this window.
   - a worktree (`.claude/worktrees/<name>`, or beside the repo):  as [the unpark skill](../unpark/SKILL.md), step 3.
     - That's `should-stay --epic`, a new window or stay, and `EnterWorktree` with `name: "<name>"` (never `path`:
       "Launched").
     - A `PARKED-<name>.md` there:  it was parked.
       `/unpark`'s steps instead, and stop here.
   - The worktree is gone but branch `<name>` isn't:
     `EnterWorktree` with `name: "<name>"` re-makes it on that branch (the `WorktreeCreate` hook).
   - Neither:  say so, and ask before starting the epic over.
4. Catch up, in the checkout:
   - What's done, what's half done:
     - `epic summary <name>`
     - the active phase's part file, and the log's last lines
     - `git status --short` and `git log --oneline -5`
   - Behind `main` (`git log --oneline HEAD..main` not empty):
     `epic worktree merge-main`, as [the park skill](../park/SKILL.md)'s "Resume", steps 2-4.
     - Resuming is the go-ahead for its merge commit.
   - No `node_modules/`:  the install command (`epic config installCommand`;  empty:  nothing to install).
   - `epic open <name> --review`.
     In a new window:  after the handoff, as "2. Session", step 5.
5. Reply, for someone who remembers nothing:  three lines at most.
   - What the epic is, where it stopped, and what's waiting on the person (open questions, issues, tests).
   - Uncommitted work in bold.
   - Then:
     - a phase `active` with work under way:
       AskUserQuestion "Carry on with P<N> · <Name> (Recommended)" / "Stop here"
     - else, as "5. Each phase", step 6:  "Start P<N> · <Name> (Recommended)", the top open issue, "Stop here"
     - no phases yet (it hung while planning):  "3. Plan", from the prompt quoted in its Overview
     - a new window:  do all of this THIS turn, then end it (the move happens when it ends).
       The modal waits for the next turn, in the new window.
   - Never start a phase without that pick:  the person reviews each phase before the next.

## 9. Future:  `/epic future <name> [text]`

Write an idea down as a FUTURE epic (epic `epic-future`, 2026-10-07).
- A stub epic page and a review page;  NO plan, worktree, window or phases.
- `/epic <name>` plans it later, from what this leaves.

- Runs from ANY window, `main` or a worktree:  the prompt hook lets it through.
  - It titles the session `📅 <name>`;  not one titled for another epic, which keeps its title (epic-workflow I5).
  - No worktree, no plan mode, no move.
1. Name, collisions, kickoff prompt:  as "1. Name".
   - The rest of the text is the idea, kept verbatim in `~/.spell/prompts/<name>.md` until the doc holds it.
   - An existing epic of that name:  say so and stop.
2. The stub:

   ```sh
   epic create <name> --future --title "<Title>" --prompt-file ~/.spell/prompts/<name>.md
   ```

   - Then delete the prompt file.
   - Hand-write its `<epic-summary>`:  the idea in two sentences, what changes for the person.
   - It's an epic page with `<epic-page future>`:
     - a FUTURE label
     - a "Future epic" notice, in place of "Plan hung?"
     - no branch or worktree
   - `epic list` says `future`.
     The Epics index gives it a seedling, between the open epics and the done ones.
3. Explore, read-only (agents allowed, root rules):  just enough to see the problem, the options and the hard parts.
   - Not a plan:  no phases, no estimates.
4. The REVIEW page:

   ```sh
   epic ask create analysis --epic <name> --title "<Title>:  analysis"
   ```

   Written as [the details skill](../details/SKILL.md) says:
   - "Where we are":  that it's a future epic, from which idea, and that answering shapes the plan, later
   - Context:
     - the problem in plain words
     - what exists today (real code)
     - the shape you'd propose (an example)
     - what goes away
     - the catch (what makes it hard)
     - a rough size
   - one question per HIGH-LEVEL open choice (what, where, how far, when):  options side by side, one recommended.
     Not the small ones:  those are the plan's.
   - Then format it:  `yarn vp fmt <its ABSOLUTE path>`, from the kit's root
     ([epics' AGENTS.md](${CLAUDE_PLUGIN_ROOT}/src/AGENTS.md), "Finishing a page", step 2).
   - Then `epic ask show <name>/analysis --wait`:  Bash, in the background.
     It opens in the side bar's Review tab.
   - End the turn with its link pair (`epic pages link <page> --review`).
5. The answer (the waiter wakes the session):  each question becomes a decision:

   ```sh
   epic add <name>#D "<answer>" --details "<p>the question, the pick, the person's note, a link:  <a href=\"details/analysis.html#q2\">analysis Q2</a></p>"
   ```

   - A note asking something:  answer it in the reply, and in the decision's details.
6. Reply:  what the future epic is, what was decided, and that `/epic <name>` plans it.
   Then the epic page's link pair.

## 10. Add a phase:  `/epic phase [ids] [name]`

The person adds a phase to the epic under way, from items it already has, or from scratch.
- Epic `skillz` P4, Owen 2026-10-07:
  "`/epic phase J1 J5, t3` => take judgement 1+2 and todo #3 and make a new phase".
  - A todo is `t3` again since epic `epic-engine` P44 (a caveat, `c3`, from P32 to P44).

```
/epic phase                      a new phase with no antecedents:  the text on the lines after says what
/epic phase J1 J5, t3            from those items (spaces or commas, any case)
/epic phase add-phases           named "Add Phases"
/epic phase t3 Retry Logic       both:  from T3, named "Retry Logic"
  <text on the lines after>      the person's input:  what the phase is for, how
```

- THIS epic:  the session's own, its worktree's epic page (`epic list --json`, `checkout`).
  - None (the main checkout, no epic in this session):  say so in one line, and stop.
- The first line, after `phase`:
  - each word that's an item id of the doc (`[a-z]\d+`:  `J1`, `t3`, `Q2`, `I4`) is an ANTECEDENT
  - the other words, in order, are the phase's name (`add-phases` -> `Add Phases`)
  - no name:  make one, 2-4 words, from the items and the text
  - an id the doc doesn't have:  say so, and go on without it
- The rest of the prompt (the lines after):  the person's input, word for word, into the phase's goal.
- The work goes to a background `<name>-plan-doc` agent (root `CLAUDE.md`, "Delegated work").
  - Reply one line, `adding:  P<n> · <Name> (from J1, J5, T3)`, and end the turn.
  - Its prompt:
    0. once the phase is added (step 3 prints its number), `epic phase <name>#P<n> planning`:  its page shows the
       plan being written (a blue spinner on its title row, I147), until step 6's `--plan` ends it
    1. read each antecedent whole (`epic items <name> --json`, its part file), and the code it names
    2. draft the phase as "4. Fill the doc" does:
       - symptom (one line), changes (two or three)
       - goal:  a bullet per outcome, the person's input in it, each antecedent linked (`<a href="#j1">J1</a>`)
       - files, verify, estimate
       - an antecedent's answer it carries out:  its words marked (`<epic-change item="q<n>">`, `epic change`), no
         `epic updated` block (I159)
    3. where (it prints the new number):
       - every number is WHOLE (epic `epic-engine` I126):  a new phase renumbers the to-do phases after it, and
         items, links and `P5 · Name` text follow;  never a decimal (P11.1)
       - after a phase the person names ("after P11"):  `--after 11`, the new P12, the old P12 on moving down one
       - `--before <N>` when the person asks for it to TAKE a number:  the new PN
       - else last, before a last Doc Review:  `add-phase` puts it there itself, the Doc Review moving down one, and
         sets an active or done Doc Review back to do ("6. Doc Review")
       - a started phase after the place refuses it:  only to-do phases move

       ```sh
       epic add-phase <name> "<Name>" --symptom ... --changes ... --goal ... --files ... --verify ... --estimate ...
       epic add-phase <name> "<Name>" --after 11 ...
       ```

    4. each antecedent:  `epic queue <name>#<id> "P<n> · <Name>"`.
       It's that phase's work now;  closed when the phase does it.
    5. `epic log <name> "P<n> added from <ids>:  <Name> (<their name>)"`, `check`, `open`
    6. its build plan ("4b. Build plans"):  `epic update <name>#P<n> --plan "<ol>..</ol>"`, which ends the spinner
- When its report comes back:
  - the new phase's link pair (`epic pages link <doc> --hash p<n> --review`)
  - and the next step, as "5. Each phase", step 6's modal ("Start P<n> · <Name>" among them)

## 11. Start:  `/epic start <P1 | ids>`

The person starts work in THIS epic, in one block:  a phase, or a handful of its items together.

```
/epic start P3                   phase 3, as "5. Each phase"
/epic start J3 J4 T6             those three items, worked as one block
  <text on the lines after>      the person's input for the work, word for word
```

- THIS epic:  as "10. Add a phase".
  An id it doesn't have:  say so and stop (nothing half-started).
- A phase (`P<n>`):  "5. Each phase" for it.
  - Not the next one in order:  say so in one line, then go anyway.
  - Done already:  say so and ask (modal) "Reopen P<n>?" before touching it.
- Items (`J3 J4 T6`, spaces or commas, any case):  one block of work in this epic.
  - Read each whole:  together they're the task, the person's text the steer.
  - Mark each in progress:  `epic queue <name>#<id> "started with <the other ids>"`.
  - Do the work, recording as "5. Each phase", step 2 does.
  - Each done:  `close <name>#<id>` (a question:  `decide`).
    Each talked through:  `review <name>#<id> "<outcome>"`.
  - ONE commit for the block:  `<name> J3 + J4 + T6:  <summary>`.
    - The epic's name first, so `commits --backfill` files it under each item.
    - It reaches the page at the next `epic phase ... done` or `epic merge`;  sooner:  `epic commits <name> --backfill`.
  - Reply as a phase's end does:  what was done per item (in words, ids after), checks with numbers, what's next.
- Bedtime mode on:  no modals, as `/bedtime` says.
  - It's on when `epic summary <name> --json` has a `bedtime`.

## 12. Request:  `/epic request <epic> [<rN>...]`

A REQUEST is something the person asked for in another session, sent here instead of done there
(`/send`, [the send skill](../send/SKILL.md);  epic `epic-workflow`).
- It's a folder, `epics/<epic>/requests/r3/`, holding:
  - `request.md`:  their words verbatim, the sender, what it was looking at
  - the screenshots they pasted
- It reaches this session one of three ways:
  - a message from the sender:  "New request r3 for epic `<epic>` ...":  the same steps
  - a NEW session in the epic's window, `/epic request <epic> r3` typed in, when the epic's session wasn't running
    - first `EnterWorktree` with `name: "<epic>"`, as "Launched" does, only when `pwd` isn't in it already
  - the sender IS this epic's session:  it follows these steps itself
- The prompt hook titled the session `🚧 <epic>`, so later requests reach it.
  - It refuses `/epic request` in a session titled for another epic.
- No `<rN>`:  every request still `new` (`epic requests <epic>`).

```
/epic request epic-workflow r3        take up r3
/epic request epic-workflow           every new one
```

1. `epic requests <epic> --json`:  the request(s), status `new`.
   - Read each `request.md`, and look at each screenshot (`Read` on the image).
2. One line, at once:  "taking r3 (from `🚧 python`):  <their first words>".
3. The filing goes to a background `<epic>-plan-doc` agent (root `CLAUDE.md`, "Delegated work"), the session free.
   Its prompt, per request (Q3 of `epic-workflow`:  join a matching phase, else a new one):
   1. read the request, and every to-do phase (`epic summary <epic> --json`, each one's part file)
   2. a phase still TO DO (never active or done) about the SAME thing:  the request JOINS it
      - first `epic phase <epic>#P<N> planning`:  its page shows its plan being rewritten (I147), until the new
        `--plan` (step 4b's) ends it
      - its goal gets a bullet, the person's ask in short, linked:  `<a href="requests/r3/request.md">r3</a>`
        - `update <epic>#P<N> --goal ...`, the old bullets kept
      - `updated <epic>#P<N> "<p>r3 joined:  ...</p>"`:  a request is no item, so its block stays;  words an
        answer changed in the same pass are marked instead, and left out of the block (I159)
   3. else a NEW phase, drafted as "10. Add a phase" drafts one, their words as the person's input, marked `planning` as
      soon as it's added, as there
      - where "10. Add a phase" puts one:  `add-phase` with no place goes before a last Doc Review by itself, the
        Doc Review moving down one
   4. `epic file <epic>#P<N> r3`:  their words, the context and the screenshots go into phase N's Requests field,
      and the request is marked filed (`P<N>`)
   5. `epic lint <epic>`;  report one line per request:
      "r3 joined P6 · Comment Threads", or "r3:  new P8 · Retry Logic"
4. Its report back:
   - one line per request, with the phase's link pair:  `epic pages link <doc> --hash <phase id> --review`
     - its id (`p-retry-logic`) is in `epic summary <name> --json`
   - then, when no phase is under way and bedtime mode is off:  "5. Each phase", step 6's modal,
     "Start P<N> · <Name>" first
   - a phase under way:  no modal;  the new work waits its turn.
- A request that needs no phase (already done, a duplicate):  `epic file <epic> r3 "<why>"`, and say so.

## 13. Summarize:  condense an item after a lot of back and forth

When the person asks to summarize (condense, boil down) an item -- in chat, or a revisit note ("summarize this") --
because its text and replies have grown too long to read (Owen, epic `repo-split` J141):
1. Read the WHOLE item:  `epic items <name> --json` for its id and state, then the item in the page, its part file
   too:  its text, every reply (theirs and Claude's), More Details, option cards, the comment thread on it.
2. Write the condensed text to a scratchpad file, `condensed.html`:
   - what the item is about NOW, in plain words, a short lead, then bullets
   - every decision kept, with its literal values:  numbers, names, paths, who decided and when
   - options still open:  a fresh `<epic-choices>`, so they can still pick on the page
   - the open questions at the END, as a short list
   - not the history of how it got here:  that stays in the Original Discussion
3. `epic summarize <name>#<id> --file condensed.html`.
   - The file replaces what the item shows.
   - Its text, every reply, More Details and Choices nobody picked move into its Original Discussion, folded:
     nothing is lost.
   - Their picks, the answer, status cards, commits and their marks stay.
4. With a mark on it:  `epic update <name>#<id> noted "Condensed:  <what's in it now>"`, then
   `epic inbox done <name>#<id>`.
5. Reply with its link pair (`epic pages link <doc> --hash <id> --review`).

## Migrations:  bringing epic pages up to today's markup

Epic `epic-workflow` P8.  `epic migrate` runs named, dated steps over pages, by page kind
([PLAN-DOC.md](${CLAUDE_PLUGIN_ROOT}/src/tool/PLAN-DOC.md), "Migrations").
- After ANY change to epic page markup (or another page kind's):  its step goes in the same commit.
  - The rule:  epics' `AGENTS.md`, "Rules".
  - Before merging:  `epic migrate --all --dry-run`, its report in the phase's summary.
- Once it's on `main` (a standing epic:  right after the phase merges):
  1. `epic migrate --all --notify`:
     - idle epics are migrated there and then
     - each epic with a RUNNING session is skipped, and printed under `TELL:` with its line
  2. Send each `TELL:` line, as is, to the session it names:  the command can't send them itself.
     - With `SendMessage` (`to 🚧 seo:  ...`), one message each.
     - Never a request (`epic send`):  it's a chore, not a phase.
  3. Report one line:  "migrated N epics;  told seo, docs".
- A session RECEIVING a migrate message ("New epic page migration step ... run `epic migrate <epic>`"):
  - run it on its OWN epic only, at its leisure:
    - now, if idle or between phases
    - else at the end of the phase under way, when running it now would disrupt that work
  - it may commit what changed WITHOUT asking (Owen's standing OK, 2026-10-11), as `<epic> migrate <step>:  ...`
    - epic pages are shared content, committed by the turn-end hook:  usually nothing is left for the branch
    - "commit" means the branch's own changes, when a step touched tracked files
  - what the report leaves for a person ("left for you":  a link to a gone id, a comment whose words changed):
    fix it in the doc, or bring it up at the next review

## Cheat sheet (`epic ...`, from anywhere in the repo)

```
create <name> [--title "Title"] [--prompt "..." | --prompt-file f] [--future] [--stage <stage>]
                                                    create from the template, in the Overview stage (3.), update the
                                                    docs' home page;  --future:  a future epic (9.);  create on a
                                                    future epic's doc plans it (promoted)
stage <name> [overview|phases|building]             the page's stage:  what it shows;  the person's Accept buttons move it
add-phase <name> "Short Name" --symptom .. --changes .. [--goal ..] [--files ..] [--verify ..] [--estimate 2h]
          [--after N | --before N]                  last;  just before a last Doc Review (an active or done one goes
                                                    back to do);  --after 11:  the new P12;  --before N:  the new
                                                    PN;  either way the to-do phases after it move down a number
update <name>#P<N> [--symptom ..] [--changes ..] [--goal ..] [--files ..] [--verify ..]   set ("" removes) fields
update <name>#P<N> --plan "<ol>..</ol>"             Claude's build plan:  waits for the person's Accept plan (5., step 1)
updated <name>#P<N> "<p>what changed</p>" [--summary ".."] [--for <ids>]   phase N's plan changed, no item the
                                                    cause:  <epic-update>, after Goal;  nothing when marks say it
file <name>#P<N> <rN>                               a request into phase N's Requests field, marked filed there
file <name> <rN> "where it went"                    a request with no phase:  only marked, saying where it went
update <name>#P<N> --estimate "1-2h"                change a phase's estimate;  the Overview's total follows
phase <name>#P<N> todo|active|done [--no-open]      done drops UPDATE labels / prose updates;  reloads the tab
phase <name>#P<N> planning [off]                    Claude writing its plan:  a blue spinner on its page, till --plan
inbox working <name>#P<N> on|off                    Claude at work on a phase (or an item, a comment):  the spinner
add <name>#Q|#J|#T|#I|#M|#D "title" [--details "<p>html</p>"] [--calm]   prints the id (T3)
add <name>#T "title" [--limit]                      a todo:  work still to do;  --limit:  a limit to know about
add <name>#M "title" --step .. --should .. [--example <png> | ".."] [--if-not ..]   a manual test, for the person's test run
test <name>[#M3] [--list [--json]]  /  test --all   the person's test run in the Review tab (?test=1);  --list:  open manual tests
calm <name>#<id> [<id>...] [--loud]                 calls / issues not urgent (yellow);  --loud:  red again
decide <name>#<Q id> "answer" [--details html]      answer a question, INTO it:  prints its id (Q3)
choose <name>#<id> <letter> ["outcome"] [--set N]   an option the person settled in words, any item:  as their pick (latest set)
commit <name>#P<N> | <name>#<id>  <sha> "..."       list a commit under a phase or an item
commits <name> --backfill                           every phase / item commit (`P3:`, `<name> I3:`), once
update <name> --standing [on|off]                   a standing epic:  each phase merges on its own, never done
close <name>#<id>  /  reopen <name>#<id>            close (done) / open again, never delete
cancel <name>#<id> ["why"]                          made moot by another decision:  struck;  reopen undoes it
change <name> [--for <item id>]                     stamp the <epic-change item> marks written by hand, list them,
                                                    new first;  --for:  the item of marks naming none
log <name> "text"                                   timestamped line in the doc's log
bedtime <name> start "P3-P6" | done "summary"       bedtime mode on / off:  the run's changes stay green (`/bedtime`)
prompt <name> "text" | --file f                     set the prompt quoted in the Overview
migrate [<kind>] [<name>... | --all] [--file f] [--step s] [--dry-run] [--notify] [--list]
                                                    pages up to today's markup, every step of their kind, oldest
                                                    first, safe to run again;  alone:  every kind, every page;
                                                    --notify:  running epics told (TELL lines), idle ones migrated
summary <name> [--json]                             phases, next phase, open questions/issues/todos/manual tests
lint <name> [--no-browser]                          ids, links, phases, then the browser check
open <name> --review                                show in the side bar's Review tab
review <name>#<id> ["outcome"]                      mark reviewed today (outcome to the log)
defer <name>#<id>                                   deferred:  dated, still not reviewed
queue <name>#<id> "work"  /  unqueue <name>#<id>    work a review decided on, waiting  /  started or dropped
items <name> --section s --spec <file>              a review's item picker, as a details page spec
items <name> [--section s] [--filter unreviewed|open|reviewed|queued|all] [--json]
                                                    where reviews stand, the to-do list, sections and items
list [--json]                                       every epic once:  status, where it runs, not reviewed / all
backfill <name> | --all [--apply]                   one-off:  mark what past sessions show the person went through
```
- Every command edits the epic's ONE shared doc, wherever it's called from ("Shared content" at the top).
