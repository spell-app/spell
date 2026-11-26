---
name: bedtime
description: Work through an epic's remaining phases unattended overnight -- pick phases and answer questions up-front, then build each in order with a commit per phase, record judgement calls in the epic page, merge each finished phase and agent into main when it merges cleanly, never push.  User-invoked as `/bedtime`, or `/bedtime all` for every running epic at once;  in the morning, `/epic review <name>` goes through the night.
disable-model-invocation: true
---

# /bedtime

In Codex:  Claude Code only (it leans on background agents and the question modal throughout);
in Codex, build the phases one by one with `epic guide build`.

The person is going to sleep.
Ask everything NOW, then get it all done:  run the chosen phases to the end without them.

The EPIC PAGE is the record, as on any day:
- every judgement call, problem and loose end is an item in it (a loose end:  a todo, `#T`)
- each phase gets its Done list and Commits
- the night's judgement calls and issues show RED there, until they review them
- So no morning report (D5 of `review-review`):  in the morning, `/epic review <name>` goes through what's red.

- `<name>`:  the epic id.
- `/bedtime all`:  EVERY running epic at once, from any session:  "All epics", below, then each epic's session runs
  steps 4-6 by itself.
- Bedtime mode:  `epic bedtime <name> start "P<a>-P<b>"` turns it on, `... done "<summary>"` off.
  Both go in the log.
  - While it's on, every item a command touches is marked the night's:  green until reviewed (D2).
    Unless it waits on the person (an open judgement call or issue):  red beats green.
  - And `epic summary <name> --json` has `"bedtime": "P<a>-P<b>"` while it's on:
    that's how a compacted session knows it's still running.
    - `null` when off
- Style:  as in `/epic`:
  the epic page written for the person coming back cold ([plan-doc.md](${CLAUDE_PLUGIN_ROOT}/templates/epics/plan-doc.md), "Rules").

## All epics (`/bedtime all`)

Every running epic goes to bed in one sitting (epic `epic-engine` T85;  the person, 2026-11-16:  "`/bedtime all` to put
everything in bedtime mode").
This session (any) is the HOME:  it gathers, asks once, hands each epic its answers.
Each epic's own session then runs steps 4-6 for itself, as if `/bedtime` had been typed there.

1. Tonight's epics:  `epic bedtime all plan`.
   - The running epics:  a Claude Code session in the epic's worktree, a phase still to do, not in bedtime already.
     A standing epic counts only when it has a phase to do.
   - It lists the idle ones (phases to do, no session) and leaves them out;  `--include <epic,...>` takes them too:
     a session is started for each in step 4.
   - `--json` prints the plan:  each epic's `session` (its address, `SendMessage`'s `to`), phases, open questions.
2. Ask each running session for its up-front questions, by `SendMessage` to its address:
   "/bedtime all:  read your chosen phases' plans and the code they touch, as /bedtime's step 3 says, and write your
   real up-front questions as `{ "questions": [{ "id", "title", "text", "multiple", "options": [{ "title", "summary",
   "recommended" }] }] }` (the details page's question shape), then run
   `epic bedtime all questions <epic> --file <that file>`.  No questions:  `{ "questions": [] }`.  No reply needed."
3. The ONE page:  `epic bedtime all spec --wait 5m` waits for them, then writes the page's spec and prints its path.
   - A session that sent nothing in time:  its epic's open Q items stand in, answered in their boxes.
   - Then `epic ask create bedtime-all-<YYYY-MM-DD> --from <that path>`, `epic ask show <slug> --wait` in the
     BACKGROUND, and end the turn with the page's link pair (`epic pages link <page>`).
   - The page:  a section per epic, its phases to pick (All ticked and recommended), then its questions.
     Each question's id is `<epic>--<id>`:  the answer splits by epic on the `--`.
4. Woken by the person's Send, for EACH epic in the plan:
   - its answers (its `<epic>--...` lines) and the phases picked, sent to its session by `SendMessage`:
     "/bedtime all:  <the answers>.  Record them (step 3's 'Record the answers'), then `epic bedtime <epic> start
     "<phases>"` and run them unattended, steps 4-6, merging each phase into main as it lands cleanly, and
     `epic bedtime <epic> done "..."` at the end.  Don't reply."
   - an epic with no running session (`--include`):  `epic window launch <epic> --prompt "/bedtime ..."`, the same
     answers written into the prompt.
   - An epic whose phases came back unticked:  left awake;  say so.
5. One line per epic in the reply:  sent, or started, or left awake.  `epic bedtime status` shows every epic in bedtime
   mode and how far it is, any time;  the person's question about the night is answered from it.
6. In the morning:  each epic's "0. While you were out" holds its night;  `/epic review <epic>` per epic, as usual.

## 1. Find the phases

- Epic page (`epics/<name>/`, or the one this session has been keeping):
  `epic summary <name> --json`.
  - To-do phases:  every one whose `status` isn't `done`.
- No epic page (only a plan drafted in this session):
  make one FIRST, as `/epic` does mid-session, which isolates it too.
  - That's [the epic skill](../epic/SKILL.md), "Mid-session":  "make this a plan doc".
  - Its name question goes in step 2's modal or page.
  - The move to the worktree's window ends the turn.
    The session picks up with `continue` in the new window, at step 2.
- No phases:  say so in one line and stop.
- In plan mode:  ask the person to leave it (shift+tab) first,
  as in [the isolate skill](../isolate/SKILL.md), "Start", step 0.

## 2. Pick phases (modal, or one page with step 3)

More than fits ONE modal call:  steps 2 and 3 go on ONE details page instead (2026-10-03),
so they answer everything in one sitting.
- "More than fits":  the phase pick plus step 3's questions, over 4 questions, or over 4 options in one.
- The spec:
  - `where`:  the epic and what it's for
  - just now:  "about to run P<a>-P<b> overnight"
  - decides:  "what I do while you sleep:  anything left open becomes a judgement call"
- Questions:
  - `phases`, `multiple`:  "All" first and `recommended`, then each to-do phase
  - "Isolate first?", when step 3 says so
  - then every real question of step 3, each with its options, one `recommended`
- `--epic <name>`, slug `bedtime-<date>`, so the page stays with the epic page.
- Make it, show it, and END THE TURN with the page's link pair (`epic pages link <page>`):
  - `epic ask create <slug> --from <spec.json>`:  the spec in the scratchpad.
    Its shape:  `DetailsSpec`, in [details.js](https://github.com/spell-app/spell/blob/main/epic/src/tools/details.js).
  - Then `epic ask show <slug> --wait`, with Bash `run_in_background: true`.
  - The person's Send wakes the session with the answers as text.
    See [the details skill](../details/SKILL.md);  write it as "Writing for the person" there says.
- Woken:  record the answers (step 3's "Record the answers"), then step 3's "Then", and on into the night.
  - The session must run unattended from here:  say so in the reply before ending the turn (auto mode or allow-rules).

Else, the modals:

- AskUserQuestion, `multiSelect`, "Which phases tonight?":
  - first option "All", then the to-do phases in order, labelled `P<n> · <Name>`
  - 4 options per question:  "All" + 3 phases in the first, 4 phases per question after (up to 4 questions)
  - more than 15 phases:  the person types a range in "Other" (`P5-P9`)
- "All", or nothing picked:  every to-do phase.
  Run them in plan order, whatever order they were picked in.

## 3. Ask up-front (modal)

Read the chosen phases IN FULL (epic page bodies, items, Overview), and the code they touch.
Enough to find what would otherwise stop you mid-night.

Then ask, in one or more AskUserQuestion calls (4 questions each, recommended option first):
- Not in a worktree (the session's folder isn't a worktree's:  `epic worktree list` marks it):  "Isolate first?".
  - Options:  "Isolate as `<proposed-name>` (Recommended)", "New branch here (`git switch -c`)", "Stop".
  - Never commit to `main`.
- How many agents may the work use:  ONLY if the person said "watch token budget";  otherwise up to 5, unasked.
- Every real question:  ambiguous goals, choices between designs, anything a phase's text leaves open.
  - Ask generously:  this is the LAST chance.
    A question asked now beats a judgement call made at 3am.

Record the answers:
- the doc's questions:  `epic decide <name>#<Q id> ...`
- the rest:  `add <name>#D ...`

Then:
- Isolate if chosen:  [the isolate skill](../isolate/SKILL.md), "Start" (step 0 too).
- `epic bedtime <name> start "P<a>-P<b>"`:  bedtime mode on.
- One line:
  "Bedtime:  P<a>-P<b> in `<name>`, commits on branch `<branch>`.
  Runs unattended only if permission prompts won't stop it (auto mode or allow-rules)."

## 4. Bedtime mode

Until the run ends (step 6), these OVERRIDE the root rules and memory:
- NO AskUserQuestion, no "should I go on?":  the person's asleep, and a question stalls the night.
  Decide, record, go on.
- Commit after each phase without asking:  the `/bedtime` run is the ask.
  Stage the phase's files by name, never `git add -A`.
- Merge each finished phase, and each agent's finished work, into `main` at once when it merges cleanly, as by day
  (the epic skill's "The session answers;  agents build";  the person, 2026-11-15:  "`/bedtime` should merge").
  - Not cleanly:  `add <name>#I "P<n> not merged:  <why>"`, red, and go on.
- Don't stop between phases for review.
- NEVER any of these:
  - push
  - `/isolate done`, or `ExitWorktree`
  - delete anything outside the worktree
  - Something needing those:  `add <name>#T` (a todo:  work still to do), and go on.

The person writing in this session mid-run means they're awake:  bedtime mode ends there.
- Say which phase it was on.
- Run step 6's "At the end" for what's done.
- Go back to the root rules.

Everything else stands:
- each step Bells & Whistles switches (epic `epic-engine` P86) only while `epic settings bells.<key>` says `on`;  off,
  one line saying so (`<its title>:  off in Bells & Whistles`), as in a session
- the repo's own rules (its `AGENTS.md`) and the person's standing ones;  in spell-app, say:
  - its VS Code extension rebuilt after each stage (`bells.editorAddOns`)
  - the parser speed test, only on its hot path (`bells.speedTest`) (the epic skill's three test tiers, "The session answers;  agents
    build")
  - the three logs:
    `agents/PAPERCUTS.md`, `SUSPECTED-BUGS.md`, `CODE-DEBT.md`, in the epic folder (`epic config contentFolder`)
- the epic page's rules

## 5. Each phase, in plan order

1. `epic phase <name>#P<N> active`.
2. Do the work, and run its verify and the touched packages' checks (the repo's `AGENTS.md` says which).
3. JUDGEMENT CALL (a choice the person might have made differently):
   pick the option the plan and code best support, then record it, with the options and why:

   ```sh
   epic add <name>#J "<the call>" --details "<p>chose ... over ... because ...</p><epic-choices>...</epic-choices><epic-net-effect>...</epic-net-effect>"
   ```

   - Its title is read by someone NOT following the work:  effect first, named by what the person sees or types,
     never an internal name;  the rest goes in --details (plan-doc.md's "Rules", TITLES).
   - It prints the id (`J4`).
     The epic page's "Judgement calls" section is where the person finds them, open until they review each.
   - Its details ([plan-doc.md](${CLAUDE_PLUGIN_ROOT}/templates/epics/plan-doc.md), "Prose"):
     - the options it weighed (any item kind takes them):
       an `<epic-choices>` of `<epic-option letter title [recommended]>`
     - the outcome:  an `<epic-net-effect>`
     - code:  an `<epic-code>`
     - a new `<p>` wherever the context changes (its "Rules")
   - CALM by default:  add `--calm` (last), so a call or an issue shows yellow (a call blue while its work isn't on main), rather than red.
   - An issue filed from the person's own words:  add `--requested` too;  fixed or closed, it turns light orange until they've looked.
     - Without it, an issue you fix before they got to it goes grey by itself, `FIXED - <title>`:  nothing for them
       to press, and not in the morning's list (epic `epic-engine` T143).  So never leave it off their words.
     - "if what you picked was reasonable, and I didn't explicitly state otherwise, [it] should be yellow"
       (2026-10-10, "the principle of least surprise").
     - RED (no `--calm`) only when it would surprise them:
       - it goes against something they said
       - it drops, narrows or changes what they asked for
       - a real fork they'd plausibly have picked differently AND that matters to them
         (cost, behaviour they'll notice, something hard to undo)
       - or it needs their answer before work can go on
     - Following the repo's house style is one case of calm, not the only one.
     - The rule in full:  [the epic skill](../epic/SKILL.md), "5. Each phase", step 2.
   - The phase's "To review" line lists it by itself:  the tool writes it on every edit.
     Never hand-write a "Judgement calls:" line.
   - Agents you start record theirs the same way:  put the command in their prompt.
     Their claims, merges and test runs:  the epic skill's "The session answers;  agents build".
4. Checks fail, and you can't fix them:
   - commit what's there as `WIP P<n>:  <name>`
   - `add <name>#I "P<n> WIP:  <what fails>" ...`:  red in the doc until the person reviews it
   - go on only with later phases that don't build on this one
   - skip the rest, saying why in the skipped phase's log line:  `log <name> "P<m> skipped:  builds on WIP P<n> (I<k>)"`
5. `epic phase <name>#P<N> done --done "<ul>...</ul>"`:  what was built, as `/epic` writes it.
   An item's card (`epic update <name>#<id> fixed "..."`):  a short lead sentence, then short paragraphs or `- `
   bullets, one idea each;  code names and numbers only where needed;  the full story in the item's body.
   Not for a WIP phase:  it stays `active`.
6. `epic log <name> "P<n> done|WIP:  <what was built>;  checks:  <results>;  J4, J5"`,
   with the ids of its judgement calls.
7. Commit:  `P<n>:  <Name> -- <one-line summary>`.
   - `WIP P<n>:  ...` for WIP;  an item fix:  `<name> I3:  ...`.
   - The epic page is never in it:  it's in the epic repo (`epics/`, a link into the epic folder),
     committed for you at the turn's end.
8. `epic commit <name>#P<N> <sha> "<what was built>"`:  the commit, under the phase's Commits.

## 6. At the end

- Bedtime mode off:

  ```sh
  epic bedtime <name> done "<done / WIP / skipped counts>;  <n> judgement calls;  branch <branch>"
  ```

- `epic lint <name>`, then `epic open <name> --review`.
  - The person wakes to the doc, the night's calls and issues red;  issues you found and fixed, grey (`FIXED - `).
  - Its FIRST section, "0. While you were out", says what was done and what needs them, a part per kind (epic
    `epic-engine` P62, I277:  waiting on you, under way, what was done, fixed to review, new issues, new tests):  the tool keeps it as every edit lands, from `NightSummary`, so nothing is written by hand;  only their
    Done reading takes it off.  The Epics page's card says it's there.
  - Nothing to commit for the doc (in the epic repo, committed for you).
- Final reply:  a VERY high-level summary, a few lines (what was built, what needs them), then the section's link pair
  (`epic pages link <epic page> --hash away`);  the detail is in the section, never repeated here (the person's C4).
  - Then ONE AskUserQuestion (the person answers in the morning):  "Go through the night?".
  - "Review it now (Recommended)":  runs `/epic review <name>`, judgement calls first.
    That's [the epic skill](../epic/SKILL.md), "7. Review".
  - "Later":  `/epic review <name>` any time.
- Everything that merged cleanly is on `main` already;  the reply names what didn't, and why.

## Cheat sheet (`epic ... <name>`)

```
bedtime <name> start "P3-P6"            bedtime mode on;  logs "Bedtime started"
phase <name>#P<N> active|done           each phase;  done --done "<ul>...</ul>" writes its Done list
add <name>#J|#I|#T ...                  every call, problem, loose end:  an item (--calm unless it'd surprise the person)
commit <name>#P<N> <sha> "..."          the phase's commit, under its Commits
log <name> "P<n> done|WIP|skipped ..."  what happened, timestamped
bedtime <name> done "summary"           bedtime mode off;  logs "Bedtime done"
bedtime all plan [--include a,b]        /bedtime all:  tonight's running epics (--json for their sessions)
bedtime all questions <e> --file <f>    an epic's session drops its up-front questions
bedtime all spec --wait 5m              the one page's spec, once they're in;  prints its path
bedtime status                          every epic in bedtime mode, and how far
```
