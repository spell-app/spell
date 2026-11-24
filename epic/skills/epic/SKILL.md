---
name: epic
description: Run an epic -- a piece of work planned and built against its live epic page, `epics/<name>/<name>.plan.html`, in its own worktree.  `/epic <name> [what to plan]` plans one (or "make this a plan doc" about this session's work);  `/epic review [<name>]` takes the person's marks, comments and Sends from the page ("review the seo epic", "go through its todos");  `/epic resume [<name>]` picks one back up where its page says it stopped;  `/epic future <name> [idea]` saves an idea as a future epic;  `/epic phase [ids] [name]` adds a phase;  `/epic start <P1 | ids>` works a phase or items now;  `/epic request <epic> [<rN>]` takes up a `/send` request;  `/epic tidy [<epic>]` closes items other work made obsolete;  `/epic hush` greys settled ones;  `/epic fresh` hands this epic to a new session in this window (`all [--pause]`:  every running epic session, at a clear moment);  `/epic done` is `/isolate done`.
argument-hint: <name> [what to plan] | demo [pasted text] | done | review [<name>] | resume [<name>] | future <name> [idea] | phase [ids] [name] | start <P1 | ids> | request <epic> [<rN>] | tidy [<epic>] | hush [<epic> | all] | fresh [all | --force] | color <look>
---

# /epic

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`;  the plain workflow:  `epic guide`).
`${CLAUDE_PLUGIN_ROOT}` is the epic plugin's folder, `epic guide --root`.
Skill calls are `$epic ...` in Codex:  `/epic review` is `$epic review`, `/details` is `$details`.

An EPIC is a planning session and the work it plans;  its live record is the EPIC PAGE.
- It was `/plan-doc` until 2026-10-02.
- Its tool is `epic` (in spell-app, `spell dev plan-doc` until epic `epic-workflow` P9).

Plan, then build, in worktree `<name>`, keeping the EPIC PAGE current the whole time.
- The epic page:  `epics/<name>/<name>.plan.html`.
- It's the user's view of the work:  they read it in the right side bar's REVIEW tab while you work.
  - That's the checkbox icon (rule, 2026-10-07);  guides open there too (epic `epic-engine` Q73).
  - The extension sends every epic page there by itself, whatever the command asked (epic `epic-engine` P59);
    details, review and choice pages go to the other tab, "Details" (the speech bubble), so a question never
    replaces the epic page, and one still waiting for an answer is never replaced either.
  - In Cursor:  the same Review view, wherever the person put it (Cursor keeps its right side bar for its own agent:
    **View: Open View...** › Review finds it;  epic `epic-friend` P16).

- The epic repo:  the epic page lives in `epics/`, which the repo doesn't track (epic `shared-content`, 2026-10-04).
  - In every checkout, `epics/` is a link into ONE epic repo, the epic folder (`epic config contentFolder`).
  - So there is ONE epic page:  `main` and every worktree see each edit at once;  it never conflicts on merge.
  - Committed for you after every turn
    (the `Stop` hook, [shared-commit.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/shared-commit.mjs)).
  - NEVER commit, stage, `git checkout --` or `git restore` it in the repo.
    Nor the changelog, the docs' home page, or a details page.
- The same workflow in plain steps, for any agent:  [guide.md](guide.md), beside this file, which `epic guide [topic]`
  prints (epic `epic-friend` P11).
  - Its last topic, `claude-only-tools`, is the plain way to do each step that leans on a tool only Claude Code has.
  - A change to a step here that any agent takes changes it there too:  ONE copy of each step's words for the others.
- With superpowers installed (obra/superpowers, MIT;  epic `epic-engine` P72):  in an epic, the epic page is the design
  and the plan, `/epic` makes the worktree (and runs the repo's own install), and `/epic done` finishes.
  - So NO brainstorming, writing-plans, executing-plans, subagent-driven-development, using-git-worktrees or
    finishing-a-development-branch:  no design doc or plan file in the repo, no `npm install` in the worktree, no
    merge or worktree removal by git.
  - DO use test-driven-development (where the repo wants tests first), systematic-debugging (for an issue found, filed
    as `#I` too) and verification-before-completion (before a phase closes).
  - The words in full:  [guide.md](guide.md)'s `superpowers` topic, which the session-start hook also says in an epic's
    worktree when superpowers is turned on (`Superpowers`).
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
  - `epic open <name>` reloads it in the side bar's Review tab.
  - `epic phase` does it for you.
- Style, in the epic page:  written for the person coming back cold (`plan-doc.md`, "Rules"):
  - a plain lead sentence, then bullets:  never a list run together in a sentence
  - full words, and a concrete example for anything tricky
  - ids explained
  - a **Net effect** list (`<epic-net-effect>`) closing every question, issue, judgement call and decision
  - NOT caveman (2026-10-04).
  - Replies:  short, the same plain words.
  - Items listed in a reply:  a line each, `<ID> - <STATUS> - <title>`, the status word as the page shows it (OPEN, FIXED, DONE ...);  two blank lines between sections.
  - Replies with more than one topic:  a `##` header per topic, never `#` (Owen, 2026-11-17, r75 from epic `language`).
    - Anything waiting on the person comes FIRST, under `## Waiting on you`:  a page to answer, a modal's question,
      a pick, with its link pair.
      - In Codex:  the question goes in the chat, under that header.
    - Why:  a page waiting for him, named mid-reply, got missed.
  - Three or more steps for the person, with commands to type:  a runbook, and the reply gives its ONE start command,
    `spell runbook start <name>` (the kit's AGENTS.md, "Commands";  epic `epic-engine` P78).
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
  - Done while the person was away, it's a few lines and "0. While you were out"'s link pair (`--hash away`):  the
    section at the top of the epic page keeps the detail by itself (epic `epic-engine` P62).

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
  - `tidy`:  `/epic tidy [<epic>]` closes the items other work made obsolete, with a reason on each.
    Go to "14. Tidy" (epic `epic-engine` Q69).
  - `request`:  `/epic request <epic> [<rN>...]` takes up a request the person sent from another session:
    a bug report becomes an issue, a feature a todo, bigger a phase.  Go to "12. Request" (epic `epic-workflow`;
    epic `epic-engine` T88, T108).
  - `fresh`:  `/epic fresh [--force]` hands THIS session's epic to a new session in this window, which picks it up
    from the page:  NOT a new epic.  Go to "16. Fresh" (epic `epic-engine` T110).
    - `/epic fresh all`, typed in ANY session:  every running epic session does, each at its next clear moment.
      Go to "16. Fresh", "All epics" (epic `epic-engine` T113).
    - `/epic fresh all --pause`:  every session pauses and saves its agents first, then all go.
      Go to "16. Fresh", "Pause first" (epic `epic-engine` T139).
  - `demo`:  `/epic demo [pasted text]` runs the STAGED DEMO when its step files are ready (`epic demo check`):
    NOT a new epic.  Go to "15. Staged demo", and skip everything else here (epic `epic-engine` P77).
  - `done`:  `/epic done` is `/isolate done`, word for word.
    - In an epic's session, every prompt and question names it `/epic done`, never `/isolate done` (2026-10-24):
      the close-out modal's "Run `/epic done`", a reply's "`/epic done` when you're ready".
      - In Codex:  the same words:  `$epic done` is `$isolate done`.
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
    - In Codex:  propose it in the chat;  the person types another if they like.
- Checks and rename, BEFORE anything else:
  as [the isolate skill](../isolate/SKILL.md)'s "Start", step 0.
  - FIRST of all, for every form that makes or enters a worktree (a new epic, `resume`, `request`):
    `epic window hooks --again "<the command typed>"` (epic `epic-engine` P71).
    - In Codex:  skip it:  Codex has no prompt hook (the command stands down, exit 0).
    - Exit 1:  this session's hooks don't run (it started before the plugin was installed or updated).
      STOP, changing nothing:  no rename, no prompt file, no worktree, no `epic create`, no window, no `epic open`.
      - Reply with its two lines:  the problem, then "Nothing was made.  Fix:  type /reload-plugins, then
        /epic <name> again (or start a new session)".
      - Why:  without the hooks, `EnterWorktree` made Claude Code's own worktree (branch `worktree-<name>`, in
        `.claude/worktrees/`, from `origin/main`), and only the move to the new window noticed.
      - Typed again after `/reload-plugins`, the prompt hook marks the session, and the check passes.
    - Not "From another worktree" (it makes no worktree from this session:  `launch --move` refuses a move by itself
      and starts a new session), nor `review`, `future`, `phase`, `start`, `tidy`, `color`.
  - ANOTHER REPO's epic (`epic list --json` gives it a `repo`;  epic `epic-engine` I47):
    NOT this window's, whatever the command (`/epic <name>`, `resume`, `request`).
    - No rename, no `EnterWorktree`, no worktree `<name>` here:  the `WorktreeCreate` hook refuses one.
    - AskUserQuestion "Open `<name>` in its own window?", then `epic window launch <name> --prompt "<the command>"`;
      it finds the epic's repo from here.
      - In Codex:  say where it belongs,
        and print `epic window launch <name> --prompt "<the command>"` for the person to run.
    - The prompt hook's note says so for a typed command;  its text is saved, as below.
  - A typed `/epic <name> ...` got them from the repo's `UserPromptSubmit` hook
    ([prompt-gate.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/prompt-gate.mjs)).
  - It renamed the session `<name>`, or blocked the prompt (plan mode) and saved its text.
    - In Codex:  no prompt hook or session title:  do the checks here, and skip the rename.
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
    - In Codex:  ask in the chat, the options numbered.
    - "Reuse `<name>`":  continue that doc / worktree
    - "Different name":  the user types it in "Other"
    - Never overwrite an existing epic page.
  - A FUTURE epic's doc ("9. Future";  `epic list --json` says `status` `future`):
    no modal, it's waiting to be planned.
    - In Codex:  no question at all, likewise.
    - Say so in one line, then go on.
    - In "2. Session", step 3, `epic create <name>` PROMOTES it where it is:  no `--prompt-file`.
      Its prompt, decided questions and review page are kept;  the meta lines name the branch and worktree.
    - "3. Plan" starts from its kickoff prompt, its decided questions and its review page.
      The page is `epics/<name>/details/analysis.html`;  its answers, from `epic ask answer <name>/analysis`.
- Name and nothing after it, nothing saved (and not mid-session):  the person writes the plan ON THE PAGE
  (epic `epic-engine` P75;  Owen, 2026-11-17:  "start with an empty-ish epic doc and a field where I can type in what
  i want to do, rather than typing it in chat").
  - Do "2. Session" now anyway:  a stub doc with no prompt, then the move.
  - The stub page's Overview opens with the KICKOFF BOX (`<epic-kickoff>`):  a growing box the person types into,
    pasting or dropping several pictures, each labelled in the words (`![IMG2](pictures/kickoff-...png)`).
  - Once the page shows, LISTEN:  `epic inbox listen <name>`;  nothing to run in the background, the epic hub listens
    for this session ("7. Review", "This session LISTENS").
    - In Codex:  run `epic inbox wait <name>` and wait for it.
  - The last line says where:  "type what this epic should do in the kickoff box on its page, and Send".
  - The Send wakes the session (its `📬` line):  `epic inbox wait <name> --timeout 5` prints a `kickoff` mark,
    its words and a line per picture, `IMG2:  <its file>`.  Then `epic inbox apply <name>` (it becomes the Kickoff prompt, pictures and all), then
    "3. Plan", opening each picture's file.
  - The person types the plan in the chat instead (the NEXT prompt):  that's the kickoff prompt as before,
    `epic prompt <name> --file <file>` first, then "3. Plan";  the kickoff box gives way to it.
  - Pictures pasted into the chat with `/epic <name> ...` stay in the chat:  the page can't take them (a later todo).

## Mid-session

When the session already has work under way ("make this a plan doc"), carry it over -- don't start again:
- Plan mode, and edits already made on `main`:  the isolate skill's "Start", step 0.
  - In Codex:  no plan mode:  only the edits on `main` carry over.
- Step 3:  start from the plan drafted so far (a harness plan file, the conversation),
  reshaped into the Overview and its questions:  still the Overview stage, agreed on the page ("3. Plan").
  - Explore only to fill gaps.
  - Decisions and questions already settled become `decision` items (questions born answered:  `Q7`).

## From another worktree

`/epic <name> ...`, typed in a session working in ANOTHER worktree (`<other>`),
means "open a window for epic `<name>`" (2026-10-07).
- This session stays `<other>`'s:  no rename, no `EnterWorktree`, no plan here.
  - In Codex:  say so, and print `epic window launch <name>` for the person to run.

1. The text after `<name>`:  the hook saved it in `~/.spell/prompts/<name>.md`.
   - A natural-language trigger:  save it yourself, as "1. Name" says.
2. Collisions, as "1. Name".
   Not the future-epic case:  it goes on as usual in the new window.
3. NO question:  typing it is the ask (2026-10-21:  "I just create a new session in this window, type
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
   (epic `epic-engine` I72;  2026-10-22:  the tab stayed in epic-engine's window, beside the new window's
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
  - In Codex:  no launched sessions:  Codex starts in the main checkout, and step 1 makes or finds the worktree.
  - An epic page or guide already there still asks.
- "2. Session" as "Staying in this window", with no question and no `window stay`:
  the window is already `⎇ <name>`, tinted.
  - `EnterWorktree` with `name: "<name>"` ONLY when `pwd` isn't in the worktree already.
    - An epic's window starts its new tabs IN the worktree (its first folder):  then never enter.
    - ALWAYS by `name`, NEVER by `path` (epic `epic-engine` P16):  the worktree hook finds the existing one by its
      name, and Claude Code lets the call through.
      - With a `path` outside `.claude/worktrees/` it asks the person every time, whatever the permission rules say;  a
        symlink doesn't help (it resolves links).
      - "this EnterWorktree thing is intolerable -- it's halting processes and wasting my time."
        - In Codex:  none of this:
          `cd "$(epic worktree path <name>)"`, or `epic worktree create <name>` when it isn't there.
    - The session-start guard records a session that starts in the worktree, so a reopen from another window still
      comes back to it (epic `epic-eject` I3).
  - Then steps 2, 3 and 5, then "3. Plan".

## 2. Session:  stub doc, then move

All in the FIRST turn, in this order, then the turn ends.
- Why:  the move to the worktree's window waits for the turn to end,
  and the stub doc keeps the kickoff prompt safe whatever happens to this session.

0. Where:  isolate's "Start", step 2b, with `should-stay --epic`:  a new window, or stay in this one.
   - In Codex:  skip it:  no window move;  print `epic window open <name>` for the person, if they want its window.
1. Isolate, with this `<name>`:  `EnterWorktree`.
   - In Codex:  `epic worktree create <name>`, then `cd` into the folder it prints, and work from there.
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
       - In Codex:  ask in the chat, the sagas numbered, the likeliest first.
       - the likeliest first, "(Recommended)"
       - each option the saga's title and its purpose
       - "No saga" too:  then no `--saga`
     - Later:  `epic saga set <name> <saga>`.

   - It starts in the OVERVIEW STAGE (epic `epic-engine` P33):  the page shows the Overview, Questions and Todo
     until the person's Accept Overview ("3. Plan").
   - The prompt is quoted at the top of the Overview, and in the "Plan hung?" notice above it.
     That notice has a copy button and restart steps;  it goes once P1 starts.
   - No prompt (a name alone):  the Overview opens with the kickoff box instead, and no "Plan hung?" notice until
     there's a prompt to copy (epic `epic-engine` P75;  "1. Name").
   - Then delete the prompt file.
   - Reusing a doc:
     - its prompt missing:  `epic prompt <name> --file <file>`
     - an older doc (before the `<epic-*>` elements):  the tool refuses it;  start a new doc instead
       (the converter went in epic `repo-split`)
     - No phases yet:  a restart after a hang.
       Plan again from its prompt ("3. Plan");  explore only what the doc doesn't say.
4. Isolate "Start", steps 4-5:  the worktree's own window, then `handoff <name> --prompt continue`.
   - Name alone, no plan yet:  no `--prompt`.
   - The handoff REFUSED ("this session can't move", exit 1:  the plugin's lists went wrong after the hooks check
     passed;  epic `epic-engine` P71):  NO `epic open` here, ever.
     - It would show the epic page in THIS window, the one being left.
     - Instead `epic window launch <name>` (`--prompt continue`, or none for a name alone):  a NEW session in the
       epic's window, which shows the page there, as a launched session does ("Launched").
     - Then skip steps 5 and 6.  The reply:  the handoff's `fix:` line, and that this tab can be closed once the new
       session is up.
     - In Codex:  no handoff, so never refused.
5. `epic open <name> --review`, AFTER an ACCEPTED handoff (step 4).
   - It shows in the right side bar's Review tab (the checkbox icon) of the window the session moves to,
     once it has:  one tab, reloaded on every later `open`.
   - Needs spell-epic's VS Code extension ([its README](${CLAUDE_PLUGIN_ROOT}/README-vscode.md)).
   - In Cursor:  the same extension and view;  if the person can't see it, point them at **View: Open View...** › Review.
   - MUST print "... shows in ... once this session moves there".
     Why:  only a PENDING move defers it;  before the handoff, it shows in THIS window's side bar, the one being left.
6. Isolate "Start", step 6:  END THE TURN.
   - Last line:  "moving to `⎇ <name>`:  press enter on `continue` there".
   - No plan yet:  "type what this epic should do in the kickoff box on its page there, and Send".
7. Next turn, in the new window:  isolate's "Continue" step 1 (old tab), then "3. Plan".
   - No plan yet:  listen ("1. Name":  `epic inbox listen`, `wait` in the background);  its Send starts "3. Plan".

Staying in this window (step 0):  skip steps 4 and 6.
- `epic window stay <name>` instead:  the window titled `⎇ <name>`, tinted (isolate's "Stay", step 0).
- Step 5's `epic open` shows the doc in THIS window's side bar, at once.
- Then go straight on to "3. Plan", in this turn.
  No plan yet:  listen instead ("1. Name"), the last line pointing at the kickoff box on the page.

## 3. Plan:  the Overview, on the page

NO plan mode, ever, for an epic (epic `epic-engine` P33;  2026-10-24).
- In Codex:  nothing to avoid:  Codex has no plan mode.
- The epic is agreed ON THE PAGE, from its first minute:  `epic create` starts it in the OVERVIEW STAGE, until the
  person presses Accept Overview.
  - A section hides when it's empty, at every stage (epic `epic-engine` P70);  anything that holds an item shows.
    Phases written at this stage show, titled `P1. DRAFT: ...`.
- Three stages, each ended by the person's Accept on the title row of what it accepts (epic `epic-engine` I180;  the page
  header's before;  `epic stage <name>` prints and sets it):  Accept Overview on the Overview's, Accept Phases on the
  Phases section's, before its gear;  the header's Send stays the paper plane
  - a press counts down FIVE MINUTES (a green ring round its thumbs up;  I181), a second press calling it off:  the
    accept reaches the inbox's sent marks only then, so `inbox wait` hears it 5 minutes after the press
  1. `overview`:  Claude writes the Overview and its questions;  each answer rewrites it.  Accept Overview ->
  2. `phases`:  Claude writes the phases AND each one's build plan, in one pass ("4b. Build plans");  the person Defers any,
     then ONE Accept Phases accepts the phases and their plans together ->
  3. `building`:  the phases built one after another with no stop between them ("5. Each phase").
  - ONE accept, not two (epic `epic-engine` I125;  2026-10-25:  "the mode where I 'accept the phase' twice
    (once for symptom/goals, once for plan) is slowing things down.  Collapse them into one").

1. Explore (read-only):  the code, the docs, the kickoff prompt.
   - Its pictures (typed on the page, epic `epic-engine` P75):  open each file `wait` printed (`IMG2:  <file>`);  the
     words name them by label ("like IMG2"), and so may the Overview.
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
   - WHERE a choice goes (epic `epic-engine` P50;  `PLAN-DOC.md`, "Option sets"):
     - a fork that belongs to ONE phase:  inside that phase, its Choices field
       (`epic update <name>#P3 --choices "<epic-choices>...</epic-choices>"`), not a separate question:
       the phase's story stays together, and Accept plan takes its recommended option
     - a cross-cutting one:  a question, as here
     - an open-ended list the person picks from round after round:  a STANDING set in the Choices section
       (`epic add <name>#choices "Title" [--multiple]`, then `epic option add <name>#s-<slug> "Title" "note"`)
     - `multiple` where several can be picked;  `fixed` where an added option makes no sense (every other set takes
       the person's);  `epic option close <name>#<id>` once a set is done
   - Loose ends:  `#T` (a todo, work still to do), `#T ... --limit` (a limit to know about).
4. `epic lint <name>`, `epic open <name> --review`, then LISTEN:  `epic inbox listen <name>`;  nothing in the
   background:  the epic hub wakes this session at every Send ("7. Review", "This session LISTENS").
5. Each answer REWRITES the Overview (Q13, B;  `plan-doc.md`, "Change marks"):
   - `decide <name>#Q<n> "..."`, then rewrite the Overview's words it changes, wrapping the changed words in
     `<epic-change item="q<n>">...</epic-change>`, in the part file
   - then `epic change <name>`:  it stamps each mark;  the words show orange for 3 days, so the person sees what moved
   - NO approval, and never a wait (2026-10-25:  "i shouldn't have to approve those -- I already answered the
     question"):  go straight on, the next answer, the next question, the phases once the Overview is accepted.  They
     Reopen one if they disagree:  it comes back as a mark like any other
   - a new question the answer raises:  `add <name>#Q`, as step 3
6. The person presses Accept Overview:  `inbox apply` moves the page to `phases`.  Then "4. Fill the doc".
   - The person says "go" in chat instead:  `epic stage <name> phases` yourself.

## 4. Fill the doc:  the phases (after Accept Overview)

The phases go to a background agent, `<name>-plan-doc`, as if the person had typed `/bg "plan-doc" ...`
([the bg skill](../bg/SKILL.md);  2026-10-07).
- In Codex:  no background agents:  do it yourself now, or ask for a Codex sub-agent and wait for it.
  The same for every "background agent" below:  a sub-agent Codex waits for, or the work done here, one item at a time.
- Its prompt has these steps, the Overview's sub-sections to read, and the decided questions.
- The session stays free meanwhile, listening, and relays its report.
- So does every later epic-page edit bigger than one command:
  a phase's Done list and items at its end, a reorder, Doc Review's pruning.

- Per phase, in order, `add-phase`
  (2026-10-06:  "Symptom, Changes, then the details";  the page draws Changes after the Goal, next to the plan,
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
  - Its details:  a new `<p>` wherever the context changes
    ([plan-doc.md](${CLAUDE_PLUGIN_ROOT}/templates/epics/plan-doc.md), "Rules").
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
the person sees them and before any code (2026-10-25:  "write the plans
up front, then look into adjusting before starting.  Otherwise, you'll stop after each phase and make me approve rather
than just being able to move on").
- Before epic `epic-engine` I117 each plan was written right before its phase, and the session stopped after every
  phase for the person's Accept.
- Each one:  `epic update <name>#P<N> --plan "<ol><li>...</li></ol>"`:  the steps, the files, how it's checked, what's
  left out;  short, in the person's terms.
  - FIRST, before reading for it:  `epic phase <name>#P<N> planning`, so its page shows a blue spinner on the phase,
    "Claude is writing this phase's plan" (epic `epic-engine` I147;  2026-10-26:  "no indication in the phase
    header").  The `--plan` write ends it;  given up, `epic phase <name>#P<N> planning off`.
    - `epic update <name>#P<N> --goal ...` on a phase whose plan isn't accepted turns it on by itself.
  - Agents (up to 5) may draft them in parallel, a few phases each;  the session reads them all before showing them.
  - Each phase shows "Claude's plan:" with an orange rule, and its buttons are Accept Phase and Revisit
    (`<epic-phase plan="waiting">`).
- ONE coherence review over ALL of them (epic `coherence` P4, its Q3):  a `coherence` agent, `<name>-coherence`,
  as in "3. Plan", step 1.
  - Started AS the drafting starts, not after it (2026-10-25:  so it overlaps the writing):  it reads the
    accepted phases (their goals and files) while the plans are written, then the plans as they land.
  - Before showing them, its findings are worked into the plans:  the wait is only what's left of it.
  - The build plan is where "write a new X" shows:  each finding changes its plan to use what exists, or becomes a
    question, "(coherence)".
  - A plan that adds nothing new (a rename, docs, a test) is left out of it, in one line.
  - Again whenever a plan is written later:  a phase added, a request filed, a plan rewritten ("5. Each phase", step 1).
- Then END THE TURN (the epic hub listens for the Send:  nothing to arm) with the Phases section's link pair:
  "The phases and their build plans are up, P3-P9:  one Accept Phases takes both".
- The Doc Review phase's plan never waits:  `--plan` on it is accepted as it's written (2026-10-25).
- The person accepts them on the page:  Accept Phases on the Phases section's title row (in the `phases` stage:  the phases and every waiting plan,
  ONE press, I125), or Accept Phase on each (once building:  the header's Send is ringed (2px #666) while any waits, its tooltip naming them);  one Send.  Or they say "go"
  in chat:  every waiting plan accepted.
  - Revisit on one:  rewrite that plan (a new `--plan` waits again);  the accepted ones stay accepted.
  - Un-clicking an accepted phase's green thumbs up HOLDS it (epic `epic-engine` I218):  `inbox apply` writes
    `plan="held"` (paused, grey, I221).  Build no held phase;  go on to the next accepted one, and stop when none is left.
  - Accept Phase on one they have just COMMENTED in (its Revisit pressed by itself, I158):  the Accept keeps their comments
    (epic `epic-engine` I163;  2026-10-29:  "just incorporate the feedback and auto-approve rather than asking
    me again").  `wait` prints "accepted, with comments to fold in:  C4, C5";  `inbox apply` accepts the plan as usual.
    - Fold them into the plan and KEEP it accepted:  `epic update <name>#P<N> --plan "<ol>...</ol>" --accepted`
      (no `waiting`, no spinner), the words each one changed marked `<epic-change item="c4">` (epic `epic-engine`
      T100;  never an Update block), then answer each comment on its thread
      (`epic inbox done <name>#C4 --file <answer.html>`:  what changed in the plan).  NO new Accept, no stop.
    - Only a comment that goes against something they decided, or changes the scope a lot, becomes a Q item instead
      (`epic add <name>#Q`, its thread answered with the link);  the rest are still folded in.
  - A plan rewritten from an ANSWER (a question decided, a revisit's pick):  the changed words marked
    (`<epic-change item="q<n>">`, then `epic change`), and NO `epic updated` block (epic `epic-engine` I159;
    2026-10-29, on P51's orange Update under its Q53 marks:  "Do we still need the orange update section like this?").
  - Defer Phase on one (beside Accept Phase):  `inbox apply` moves it after the other phases, still to do.
- Then "5. Each phase", from the first, straight through.
- A phase ADDED later ("10. Add a phase", a request):  its plan written as it's added, accepted the same way.



## The session answers;  agents build

An epic's session ANSWERS the person, and named background agents do the work (epic `epic-engine` T77;
Owen, 2026-11-15:  "the main session should just respond to me rather than doing work, so responses are quick").
- In Codex:  no background agents:  the session does the work itself, a step at a time, looking at `epic inbox <epic>`
  between steps;  the claims and turns below still hold when Codex sub-agents share the worktree.
- The session itself, within seconds:
  - answers them, files their requests as items, decides, and relays
    - a request it takes up at once is filed STARTED, blue, never red as if it waited on them (epic `epic-engine`
      T78;  Owen, 2026-11-15:  "you should start the issue and show it appropriately"):
      `epic add <epic>#I "<title>" --requested --start "<their words>" --agent <full name>`, after `epic agents add`
      - their words become its body, quoted;  an Underway card names the agent;  the spinner goes on
      - a request from another session (`/send`, "12. Request"):  a bug report an ISSUE, a feature a TODO
        (epic `epic-engine` T88, T108):
        `epic add <epic>#I "<title>" --requested --start "<their words>" --agent <full name>` (`#T` for a feature), then
        `epic file <epic>#I<n> <rN>` (`#T<n>`):  its words, its Context and its screenshots go into the item, and the
        request is marked filed there, so the item never sits at "What it says on the tin" (I292:  I287, filed from r70
        with no body)
      - a picture they pasted with it goes in too, never described in words instead (epic `epic-engine` T87):
        `--pasted <n>`, as the guide's "build" says (`epic guide build`)
      - the agent's `epic update <epic>#I<n> fixed "..."` turns it light orange, for their review
        (`--requested`:  never leave it off their words, or the fix goes grey with nothing for them to press,
        epic `epic-engine` T143)
  - passes their redirects on to the agent doing that work (`SendMessage`)
  - relays what an agent found, its first line bold, by itself:  `**Agent <full name> came back with:**`
  - hears every Send at once, idle or at work:  the epic hub listens for it, with nothing to arm (7, "This session
    LISTENS");  never a background `epic inbox wait`
  - does by itself only quick reads, and fixes under about a minute:  one file, one command
- Everything longer goes to a NAMED background agent, as the root `CLAUDE.md`'s "Delegated work" says:
  a phase, an item's fix, a check run, Add Details, a revisit now.
  - `epic agents add <name> "<task>" --files <path,...>`, then the `Agent` call, its full name first in its
    description;  then AT ONCE `epic agents set <name> --task-id <the agent's id>`, the id from the `Agent` result
    (what resumes it after a restart, "After a restart" below);  `epic agents done <name>` when it's back
  - In Codex:  no background agents:  do it here, one item at a time, and check `epic inbox <epic>` between steps.
- Several agents share ONE worktree, so its brief tells each one to:
  - claim the files it will change, as it starts (`--files`) or as it finds them
    (`epic agents claim <name> <path...>`):  a file, a folder or a glob
    - another agent has one:  `epic agents set <name> --status "blocked on <other>"`, and work on something else
      meanwhile, or come back with that
  - commit only its own files, by path, never `git add -A`
  - never mark ITSELF done (`epic agents done`):  the session does, when its notice arrives;  done early, `epic agents
    wait` stopped while it still worked (epic `epic-engine` I288)
  - merge with `epic worktree merge-main --as <name>`:  it never moves aside a file another running agent claims
    - nor waits for another agent's uncommitted files (epic `epic-engine` I406):  only a file the merge changes holds it
      up, named with the agent claiming it;  the rest are left alone, a real merge made in a temporary worktree
    - `epic merge <epic>` the same:  it fast-forwards `main` to the branch's COMMITS, however dirty the worktree
  - test in THREE TIERS, never a full run per commit (epic `epic-engine` T90;  Owen, 2026-11-16, r74:  "this is taking
    too long!!!  Do we need to cut down on tests?":  the language epic's agents each ran the parser's and the app's full
    suites on every commit, 10-25 minutes each under load, one turn at a time, again after `merge-main`, and the speed
    test twice):
    1. PER CHANGE:  only the tests for what changed, the test files beside the changed files
       (`yarn vp test run tests/x/Y.test.ts`, or `--project <name>`);  no turn needed
    2. BEFORE MERGING:  each folder it touched, its UNIT tests, from that folder, in its turn:
       `cd <folder> && epic turns run test -- yarn test:unit`;  no browser and no integration projects
       - the kit, when it changed the kit's `src/`:  `yarn kit:test:unit`, at the root:  every project but the browser
         ones (`util`, `places`, `element`)
       - parser:  `yarn test:unit`, its `yarn test`:  it has no browser project;  its Python tests too
       - ui:  `yarn test:unit`, the `ssr` project;  not `browser`, `motion`
       - epic:  `yarn test:unit`, the `node` project and its plain-node scripts;  not `browser`, `motion`, `integration`
       - app:  `yarn test:unit`, every project but `app:integration` and `app:browser`;  its Python tests too
       - plus `yarn ts` and `yarn lint` in each;  never the root's `yarn review` or `yarn test` here
    3. AFTER MERGING into `main`:  the FULL suite, only by the LAST AGENT STANDING:
       `epic agents last <name>` exits 0 when no other agent of the epic is listed, 1 listing the others
       (it's still listed itself until the session's `epic agents done`:  `last` leaves it out)
       - last:  `epic turns run test -- yarn test` at the kit's root, every folder, the browser projects too, and each
         touched folder's `yarn test:integration` where it has one;  nobody waits on it now
       - what it finds is an issue, never a held merge (it's in `main` already):  `epic add <epic>#I "<the failure>"
         --calm`, named in its report;  a failure its own work caused, it fixes and merges again
       - not last:  no full run;  the last one catches it
    - the parser's speed test (`SP.spellParser.speedTest()`, on the diff and on `HEAD`, both reported):  ONLY for a
      change on the parser's HOT PATH, the code every parse runs:  the engine (`parser/src/parser/`:  `Parser`, `Match`,
      the tokenizer, rules, scopes, incremental parsing) and the spell rules' matching (`parser/src/spell/rules/`);
      once, before merging, never again after `merge-main`
      - this narrows the standing "speed test on parser changes":  not for writers, compiled output, core, docs or
        tests
    - why turns at all:  three full runs at once drove the load to about 50, and failed tests on their 5-second
      timeouts;  the root's `yarn review` over every folder held the turn 30+ minutes while every other agent waited
      (epic `epic-engine` I313)
    - waiters go first come, first served, and wait while the line moves;  `epic turns list` shows the holder, how
      long, and the line
    - a run silent and idle (no output, next to no CPU) for 10 minutes is stopped by `epic turns run` itself, saying
      where it was, and the turn freed (exit 1;  `--stall <minutes>`, epic `epic-engine` I384):  report it as an issue
  - record its choices as items (`epic add <epic>#J "<title>" --details "..." --calm`;  titles:  plan-doc.md's "Rules"),
    and come back with any question for the person,
    rather than ask it:  an agent has no question modal
    - In Codex:  the same:  a sub-agent's question comes back to the session, which asks it in the chat
  - MERGE ITS OWN WORK INTO `main` THE MOMENT IT'S DONE, whenever it merges cleanly, so the person sees it at once
    (epic `epic-engine` T82;  Owen, 2026-11-15, a standing rule:  "when an agent in an epic finishes, if it can cleanly
    merge into main, it should do so so I can see the changes.  I'm having to wait 2+ hours to see things"):
    1. commit its files by path
    2. `epic worktree merge-main --as <name>`
    3. its folders' unit tests, tier 2 above (`cd <folder> && epic turns run test -- yarn test:unit`), once, on the
       merged branch:  not before `merge-main` as well
    4. `epic merge <epic>`
    5. mark its item fixed or done (`epic update <epic>#<id> fixed "..."`)
    6. `epic agents last <name>`:  the last agent standing runs the full suite, tier 3 above
    - NOT held for its phase's end, and NOT batched with other agents' work
    - "cleanly":  `merge-main` with no conflict, its checks passing (a test that has failed in full runs before called
      so), no red hard-to-undo judgement call open on it, the person's uncommitted edits in the main checkout carried
      into the branch first, generated strays ditched
    - NEVER ask the person whether to merge (Owen, 2026-11-15, on codemirror asking "Should I merge main into the branch,
      re-run the checks, and merge P1?":  "You shouldn't have to ask this.  You should automatically merge main in before
      attempting to merge.  If tests are failing that aren't yours, just go ahead and merge."):
      - main moved, or the branch is behind:  `epic worktree merge-main` first, always, then `epic merge`;  `epic merge`
        takes `main` in itself when it moved (T83), stopping only on a conflict it can't settle, which it names
      - failures that aren't this work's (failing on `main` too, or in files it didn't touch):  merge anyway, naming them
        in the report;  only failures this work caused hold the merge
      - an agent's `merge-main` or `merge` refused by its permission check:  the SESSION runs them itself, no question
    - it can't (a conflict it can't settle, its own failures, a red hard-to-undo call):  it says why in its report AND on
      its item (`epic update <epic>#<id> noted "Not merged:  <why>"`), and the session tells the person in bold, on a
      line of its own
    - `/bedtime` too (2026-11-15);  NOT in a phase whose plan says to hold its work
    - In Codex:  the same steps, by the session itself, after each item.
- `epic merge` and `epic worktree merge-main` take their own turn (`epic turns`):  one merge at a time on the machine,
  each saying who has it while it waits.

### After a restart

A restart of VS Code (or a window reload) ends every background agent with the session that started them
(epic `epic-engine` I310;  Owen, 2026-11-15:  `mockup` sat idle an hour on four
cut-off agents, "it should have restarted automatically").
- The plugin's `SessionStart` hook wakes the session at once (`hooks/restarted.mjs`, `RestartWake`) with a `📬` line
  naming each agent still listed that the restart cut off, its id and its task.
- Woken so, before anything else:
  - resume each agent with `SendMessage` to its id (its work and transcript are saved);  tell it it was cut off, to
    check what it already committed, and to finish
  - one with no id:  start it again from its task, `Agent` with the same name and brief, then `epic agents set
    <name> --task-id <its new id>`
  - then one line to the person:  "the restart cut off N agents:  resumed <names>"
- No agents listed:  no wake.  Nothing to arm for the page either:  the epic hub listens for the new process, and
  its poller's hook starts by itself.
- PAUSED agents (`epic agents` says `paused`) weren't cut off:  never resume one for a restart.
- A pause under way (the `📬` line says so, or `epic fresh status`):  resume none.  Save what was cut off
  (`epic agents pause <name> --next "..."`), and go on from "Pause first" below.
- In Codex:  no background agents to cut off:  `epic guide` says to start the epic's open items again from the page.

### Focus mode (`/focus`, `/back`)

The person is focusing on something else (epic `epic-engine` T93):  a `/focus:  ...` message from another session,
`epic focus status` saying "focus on", or the session-start hook's notice ([the focus skill](../focus/SKILL.md)).
Until a `/back:  ...` message (or `epic focus status` says off):
- keep building what's in flight, an accepted next phase too, and merge what's clean, as by day
- ask the person NOTHING:  no AskUserQuestion, no details page, no `epic ask show`, as in bedtime mode
  - In Codex:  no question in the chat either:  record it and go on.
  - a choice:  a calm judgement call (`epic add <epic>#J "..." --calm`);  a question:  a Q item on the page, left to
    wait;  something only they can unblock:  work on what isn't blocked
- the person writing here doesn't end it:  answer them, and go on as above
- the `/back` message:  post your status in THIS window ([the back skill](../back/SKILL.md), "A session's status"),
  then the usual rules again

## 5. Each phase

1. `epic phase <name>#P<N> active`, then CHECK its accepted build plan ("4b. Build plans") against what's there now.
   - Check the session's name (the isolate skill's "Session name").
   - What you're doing (epic `epic-engine` P35):  `epic inbox status <name> "Building P<N>"`;  `--clear` once it's done.
     The page's step label turns while it's set, the words its tooltip (I340):  never left set when you stop.
   - Earlier phases, answers and requests may have moved things since it was written.  Adjust, and go on:
     - a SMALL change (a file moved, a step folded into an earlier phase, a name changed):  say what and why with
       `epic updated <name>#P<N> "<p>...</p>" --summary "Plan adjusted:  ..."`;  the plan stays accepted.  NO stop.
       - a change an answer caused:  its change marks alone, no block (step 2, "An ANSWER rewrote ...")
     - a BIG one the person would want a say in (scope, a choice they made, much more work):  write the plan again
       (`--plan`, it waits), with the coherence review over it ("4b. Build plans"), listen, and END THE TURN with the
       phase's link pair:  "P<N>'s plan changed:  ...".  Only then a stop.
   - No accepted plan (a phase from before I117, or added without one):  write it now, as "4b. Build plans", and wait.
   - Accepted WITH their comments ("accepted, with comments to fold in", epic `epic-engine` I163):  fold them in as
     "4b. Build plans" says, `--plan ... --accepted`, answer each comment, and go on.  NO stop.
   - No plan at all only when the person said to start the phase without one ("just do it"), or in bedtime mode.
2. Do the work.
   - TEXT PEOPLE SEE (dialogs, notices, errors, empty states, onboarding, help;  not every label):  written in the
     novice voice (`epic voice novice`), and checked COLD before it ships (Owen, 2026-11-17, epic `epic-engine` T92):
     `epic voice check <file> --about "<what it is>"`, or `--text "..."`.
     - A fresh reader with no context reads it, and fails jargon, ids, insider words and run-on sentences, each quoted
       with a rewrite.  Check a dialog whole:  heading, message and buttons in one text.
     - Fix what it finds, or say in the item why a finding is wrong;  its verdict goes in the item's details.
     - In Codex:  the same command;  it runs `claude -p` itself.
   Record as you go, not at the end:
   - Every item's title is read by someone NOT following the work:  what changed or what's wrong, effect first,
     named by what the person sees or types, never an internal name;  no visible effect ends "Nothing you'd see."
     (the rule:  [plan-doc.md](${CLAUDE_PLUGIN_ROOT}/templates/epics/plan-doc.md), "Rules", TITLES;  `epic add`
     has a fresh reader check it).  Tell every agent you start the same, pointing there.
   - Found a problem:  `add <name>#I`.
   - A limit we accept:  `add <name>#T ... --limit`.
   - A choice:  `add <name>#D` (a question born answered).
   - The person settles an item's options IN WORDS (a reply, the chat:  "require the parens"), not with the page's pick:
     `choose <name>#<id> <letter> "<outcome>"` right away, before or with building it.
     - several letters in a pick-any set (`choose <name>#Q4 A C "..."`);  a phase's set (`#P3`) or a standing set
       (`#s-upgrades`) as its target
     - an option to add, reword or drop:  `epic option add | edit | remove <name>#<id> ...` (the old text kept, folded)
     - It records it as their pick would:  that card set's `chosen`, the item green (a question answered, a call
       closed;  an issue or todo only reviewed), the outcome on the set, shown in its Choices (no Noted card, I153).
     - Skipped, the item stays red with nothing chosen, though the work is built (`outline-spell` J9, 2026-10-19).
   - A choice made WITHOUT the person (they're away, or an agent decided):  `add <name>#J`.
     - Ids `J1` ...;  see `/bedtime`.
     - CALM by default:  `--calm` (last):  yellow (a call blue while its work isn't on main), rather than red.
     - An issue filed from the person's own words (their request, their screenshot):  add `--requested` too.
       Closed, it turns light orange until they've looked;  without it, a calm issue Claude closes goes grey (epic `epic-engine` P63).
       - "if what you picked was reasonable, and I didn't explicitly state otherwise, [it] should be yellow"
         (2026-10-10, "the principle of least surprise").
       - RED (no `--calm`) only when it would surprise them:
         - it goes against something they said
         - it drops, narrows or changes what they asked for
         - a real fork they'd plausibly have picked differently, AND that matters to them
           (cost, behaviour they'll notice, something hard to undo)
         - it needs their answer before work can go on
       - Following the repo's house style is one case of calm, not the only one.
       - Never ask:  decide, and record it.
       - A call that needs their YES / NO (it went ahead, but they may say "don't"):  give it an option set, so they pick on
         the page (epic `epic-engine` P50, request r44;  2026-10-29:  "In future, this could be a question
         block!"):  `add <name>#J "..." --options "*Do it | Don't" --calm`, `*` the one taken.
         - a question takes `--options` too (`add <name>#Q "..." --options "A:Red | B:Blue"`)
         - pros and cons on an option afterwards:  `epic option edit <name>#J5 A --note "..."`
       - The person flips it from its id chip while reviewing;  `epic calm <name>#<id> [<id>...] [--loud]` from the CLI.
       - A TODO the person wants red, as a reminder ("a red todo so I can think about it tomorrow"):
         `epic update <name>#T3 --loud`, or `epic add <name>#T "..." --loud`;  `--calm` takes it back (epic
         `epic-engine` T94).  A limit is never red.
   - Items added while the phase is active carry it.
     - The phase's "To review" line lists the ones the person hasn't reviewed;  the script writes it on every edit.
     - Never hand-write a "Judgement calls:" line.
   - Something only the person can check (a live window, a click, a look):  a manual test, into "Manual tests".
     - First, check it yourself where you can (a test, a script, a browser screenshot):  only what you can't goes to
       the person.
     - Written so they can do it straight off the page, in its Manual tests section (epic `epic-engine` P4, P51):

       ```text
       add <name>#M "<what it checks>" --step "<exactly what to do>" --should "<what should happen>"
           [--example <screenshot.png> | "a line"] [--if-not "<what to tell Claude>"]
       ```

       - `--step`:  short, exact;  a page to open is an action link, drawn as a button:
         `<a class="epic-test-action" href="<an epic pages link URL>">Open the Epics page</a>`
       - HOW a step is written (epic `epic-engine` r16;  2026-10-22:  "You are making me think too much to do this
         stuff ... put them in code blocks with exactly what I need to type"):
         - it names the app, the window and the menu or keys:  "In VS Code's `⎇ repo-split` window, View > Output (⇧⌘U),
           pick `Spell` in its list", never "the Output panel" (the person's:  "What is the output panel?")
         - everything to type in a code block, `cd` included:  `<pre><code>cd ui</code></pre>`, or in plain text a
           fenced block;  the page shows each with a Copy button
         - a new terminal in a worktree's window asks which folder:  the step says which to pick, or `cd`s first
         - a wait or a look between commands is a step of its own, between their blocks
         - the real names:  the extension's output channel is `Spell`, not "Spell Language Server"
         - nothing Claude can check itself:  CI (`gh run list`), a command's output, a page's markup are Claude's to check
         - three or more steps with commands:  write them as a runbook, and the Step is its start command,
           `spell runbook start <name>` (the kit's AGENTS.md, "Commands")
         - each step's COMMAND (a code block in it) gets a box under it on the page, "Paste what this command
           printed" (epic `epic-engine` T165):  one box per step, so a command whose output they should send you is a
           step of its own, a numbered list item;  the page reads it off the markup, nothing to add
       - `--example`:  a screenshot you took of it working, copied beside the page (`tests/<id>.png`)
       - `details <name>#M3 --step ... --should ...` rewrites an older manual test in these fields
     - They answer it WHERE IT IS, with the page's own marks (epic `epic-engine` P51, Q53:  no separate test run,
       no Passed / Failed / Skip / Not now):
       - Approve:  passed;  `inbox apply` closes it.
       - A Revisit note, or a comment in its Step or Should:  what they saw, left for you (7.3, "Tests").
       - The note box's ✕:  it no longer applies;  `inbox apply` cancels it.
       - Left alone:  still open.
     - Their Start testing button, on the Manual tests section, asks you to prepare them all (7.3, "Start testing").
     - A test you checked yourself and saw pass, you MAY close (Q58):  the one exception to "the person's to close".
     - Told in chat instead:  `close` it once they say it passed.
   - Fixed or done:  `close <name>#<id>`.
     It stays, closed, NOT struck.
   - Made moot by another decision:  `cancel <name>#<id> "why"`.
     It's struck through:  the one struck status (J16 of `review-review`).
   - An item talked through with the person (they answered, accepted, or said leave it):
     `review <name>#<id> "outcome"`, so the next `/epic review` doesn't bring it up again ("7. Review").
   - Changed a phase's PLAN, for a reason NO ITEM or comment is (something found while building, a file moved):
     - `updated <name>#P<N> "<p>what changed, and why</p>" --summary "..."`:
       an `<epic-update>` block at the end of the phase's description, after Goal:  **Update**: <summary>, dated.
       Never an "Updated" word in the text.
     - NEVER for a change an answer caused:  its change marks say it (next bullet;
       epic `epic-engine` I159, 2026-10-29:  an Update block "only when no mark says it").
       - `updated` itself writes nothing then:  `--for q53` (or, without it, the item ids its text names, marked in
         the phase this pass) with marks in the phase prints "no Update block, the change marks say it".
       - Something the marks can't say (a file moved, why a step went):  its own block, `--for` left off.
     - ALWAYS pass `--summary`:  5-10 words saying WHAT changed (2026-10-11).
       - Never who or when ("From the person's comment CM2 ...", "2026-10-11:"):
         the text says who, the block shows when.
       - E.g. `--summary "Tab labelled App/UI, right after App"`.
     - Then `update <name>#P<N> --changes ...` (or `--goal` ...), to make the fields say the new plan.
   - An ANSWER rewrote the Overview's or a phase's words (epic `epic-engine` P30;  Q13, B):  mark the changed words
     themselves, `<epic-change item="q16">the new words</epic-change>`, as you rewrite them.
     NO `<epic-update>`, and no `epic updated` after `epic change` (I159):  the marks are the whole record.
   - A COMMENT of theirs rewrote them (folded into a phase or the Overview;  epic `epic-engine` T100):  the same,
     naming the comment, `<epic-change item="c2">the new words</epic-change>`;  `epic change <name>` stamps it with
     the comment's words.  NO Update block for it.  Then answer its thread as ever, naming the phase.
     - The words, not the block:  one mark per change, the question's id alone.
     - Then `epic change <name>`:  it stamps each (id `ch3`, time, the answer in short) and lists them;
       `epic lint` fails one not stamped, or naming no item.
     - The words a mark replaced (`was`, the popup's "Originally") are found by the tool as it stamps, from the page
       as it was (on disk, else its last commits):  write nothing more (I160).  Run `epic change` in the same turn
       you wrote the marks:  the epic repo's turn-end commit is what it compares with.
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
3. Subagents:  named and listed, as the root `CLAUDE.md`'s "Delegated work" says;  the work itself is theirs
   ("The session answers;  agents build", above).
   - `epic agents add` / `done`
   - Paste the cheat sheet below into their prompts,
     with "record todos, issues and decisions in the epic page as you find them".
   - An agent changing a page or an element (a docs page, a component, the editor app) is told, in its brief, that
     "done" means its rows line up (epic `epic-engine` P83):  before it says done it runs the page checker
     (`node epic/src/tools/check-spell.js <page>`) or the designer's shots (`designer-shots.js`) on what it changed,
     and fixes each misaligned row in its component, or marks one meant to be uneven
     (`data-align="free: <why>"`);  the editor's tests check it after every test by themselves.
     The scan:  `Alignment` (`spell/test-helpers/Alignment`), one item drawn more than half a pixel off its row.
4. The reviews before the phase closes.
   - A phase that changed a page or an element (a docs page, a component, the editor app):  the DESIGNER review first
     ([the designer skill](../designer/SKILL.md);  epic `epic-engine` P24, Q12).
     - It fixes the obvious things itself, and asks about the bigger ones with before / after pictures on a details page.
     - Its shots list every row whose items don't line up (epic `epic-engine` P83):  each one fixed in its component,
       or marked as meant (`data-align="free: <why>"`), before the phase closes.
     - Its fixes go in the phase's Done;  what it asks about waits on the person, as calm issues.
   - Every phase:  the PLAN CHECK (epic `epic-engine` P72;  the idea borrowed from superpowers' spec review, MIT):
     a `plan-check` agent, named and listed `<name>-p<N>-check`, given the epic, the phase and the phase's diff
     (its commits, or `git diff <base>` when not committed yet).
     - In Codex:  its custom agent `plan-check` (`epic plugin install --codex`), else follow its agent file's steps yourself.
     - It reads the accepted build plan, and returns two lists:  what the plan said that wasn't built, and what was
       built that the plan didn't say.  It changes nothing.
     - Each miss:  built now if small, else `add <name>#I "..." --calm` (red, no `--calm`, only when it drops or changes
       what the person asked for).  A change made on purpose, already said in an Update block or an item:  no issue.
     - One more kind of review beside the designer and coherence:  coherence asks "is this the one way we do it?",
       the designer "does it look right?", the plan check "did we build what was agreed?".
     - Its agent file:  [plan-check-agent.md](${CLAUDE_PLUGIN_ROOT}/plan-check/plan-check-agent.md).
     - Left out only for a phase with no accepted plan ("just do it", bedtime mode), in one line.
5. Close the phase:  `epic phase <name>#P<N> done --done "<ul><li>...</li></ul>"`.
   - It drops that phase's UPDATE markers, writes its Done field, and brings the doc forward.
   - It writes how long Claude worked on it, `took` (epic `epic-engine` P41):  its own agents' time from their
     transcripts (named `<epic>-p<N>`, or saying `P<N>`), else the epic's sessions' while it was active, never the
     time waiting on the person.  Beside it, `span`:  how long it was under way by the clock, from the log
     (epic `epic-engine` I127).  The title row then shows `21m / 4h`, the rest in its tooltip.
     A phase done before:  `epic phase <name>#P<N> took` writes both.
   - Then `epic summary <name>`:  the phases left and the loose ends;  done phases and grey items are only counted
     (`--all` lists them).
   - With the phase's items, this runs in a background `<name>-plan-doc` agent ("4. Fill the doc"),
     while the reply below goes out.
   - Done:  what was BUILT, ordered by what the person asks about first:
     where to see it, what changed in how they work, what's rough or not yet tried by hand.
   - PROOF before done (epic `epic-engine` P72;  borrowed from superpowers' verification-before-completion, MIT):
     the Done list's last bullet names each check run and what it printed, never "tests pass" alone.
     - `Checked:  yarn test, 1128 passed / 65 files (was 1130:  two tests merged);  yarn lint, 0 errors;
       epic skills check, no problems`
     - a check that was already failing before the phase:  said so, by name
     - a check not run:  said so, and why
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
   - The commits reach the epic page BY THEMSELVES (epic `epic-engine` I135), found by subject, in the kit, every
     child repo and every peer (a repo beside the kit;  a commit there links to that repo on GitHub):
     - under its phases and items, and as an entry in the page's LOG, the epic's change log (epic `epic-engine` P52):
       its time, its sha, its sentence, a chip per phase and item it names;  `<epic>:  ...` with no phase gets one too
     - `epic phase <name>#P<n> done` lists the branch's so far
     - `epic merge <name>` lists every commit it just brought onto `main`
     - by hand, any time:  `epic commits <name> --backfill`;  none is listed twice
     - The epic page is never in that commit:
       it's in the epic repo, committed for you (see "The epic repo" at the top).
   - A STANDING epic:  the phase goes onto `main` AT ONCE (Q8 of `epic-workflow`),
     once its commit is made and its checks pass.
     - Standing:  `<epic-page standing>`, and `epic summary --json`'s `standing` (epic `epic-workflow`).
     - Its own short doc pass comes first, in place of one Doc Review at the end:
       the repo's text-rewriting skill (spell-app's `/fussbudget`) on the files the phase changed,
       and the guide and the READMEs the phase made untrue brought in line, in the readme voice
       ("6. Doc Review"), before the commit.
     - `epic config baseBranchProtected` prints `true`:  the base branch takes only pull requests, so `epic merge` refuses
       and steps 1-2 below don't apply.
       No asking, as below:  `epic worktree merge-main`, then `epic pr <name>`, which pushes and opens one unless one's open
       ([the isolate skill](../isolate/SKILL.md), "Finish, when the base branch takes only pull requests").
       The phase reaches `main` when the code host merges it;  its changelog entry stays under "2. In worktrees" until then.
     - Then, no asking (the standing epic is the ask):
       1. `main` moved (`git log --oneline HEAD..main` not empty):  `epic worktree merge-main`.
          - A multi-repo top (`epic config repos` prints names;  [the isolate skill](../isolate/SKILL.md), "A
            multi-repo top"):  `epic worktree repos` says which repos are behind;  `merge-main` merges every one.
       2. `epic merge <name>`, from the worktree:  it works on the MAIN checkout, checks it's on `main` and clean,
          then fast-forwards.
          - Never `ExitWorktree` and back for it:  entering asks the person every time (epic `epic-engine` P12, r11).
            - In Codex:  nothing to leave:  stay in the worktree's folder.
          - A multi-repo top:  every repo's main checkout;  only the repos whose `<name>` branch has commits move.
          - The branch is the epic's id unless its page names another (`<epic-page branch>`, epic `epic-engine`
            I378):  a branch renamed apart from its id, `epic update <name> --branch <branch>`, and every verb follows.
          It refuses, saying why (`main` moved again, uncommitted work there):  `add <name>#I`, and go on.
          - STRAY files in a main checkout (epic `epic-engine` I77;  "ask if I want to ditch them before merging
            rather than just bailing"):
            - a test's snapshot, a repo's generated output:  it moves them aside by itself, and says so
            - one to three others (a `settings.json5` ...):  it refuses, listing them.  Ask the person in a modal, "Ditch
              these in main?", each file named;  on a yes, `epic merge <name> --ditch`
              - In Codex:  ask in the chat, yes or no, the files named.
            - moved aside, never deleted:  into `~/.spell-epic/ditched/<time>/`, which it prints
            - more than three is somebody's work:  `add <name>#I`, as above
          - The merge changed a lockfile or a `package.json` (epic `epic-engine` T89):  it runs the install command
            (`epic config installCommand`) in the main checkout, as `merge-main` does in a worktree, then restarts
            the main checkout's page server, if it runs, and the editor (Vite) with it:
            `main checkout:  installed the packages:  \`yarn install\` (yarn.lock changed)`.
            - FAILED:  the merge stands;  the line says what to run there by hand.  Run it, then tell the person.
       3. The changelog, if the repo keeps one:
          the epic's entry, under "3. Merged into main", gets the phase's bullets.
     - Never `/epic done`:  the worktree, the window and the session stay, for the next request.
     - In bedtime mode too:  each finished phase merges when it merges cleanly, as `/bedtime` says.
     - `epic update <name> --standing [on|off]` makes an epic standing, or not;
       the docs' home page, `/epics` and its step label then never call it done (STANDING, when every phase is).
6. A short note (done, issues, todos, next), the "complete.  Next is" line (see the top), then GO STRAIGHT ON to
   the next phase whose plan is accepted:  no question, no stop (2026-10-25, I117:  "rather than just being able to
   move on").
   - Stop, and ask (AskUserQuestion), only when:
     - In Codex:  ask in the chat.
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
    - Phase numbers are always WHOLE (epic `epic-engine` I126;  2026-10-25:  "ditch the 17.1 and just
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
     - `epic pages fuss <the epic's guide>`:  it's in the epic repo, not in the branch's diff
     - the repo's README checker, if it has one (Spell's:  `yarn readme:check` at the kit's root)
     - Their misses fixed, or listed for the person in the reply.
- Turn it into the epic's guide:  `epic pages create durable <page> --title "..."` (fixes asset paths for the depth).
  - One page:  `guides/<name>.html`.
  - Several files (pages, experiments):  `guides/<name>/<name>.html`.
    The epic repo too:  committed for you, like the epic page.
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
  - Which:  in every repo the epic touched (the kit and each child repo it committed to), every `README.md`,
    `README-*.md` and `README/*.md` that names something the epic added, changed, renamed or removed:
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
  - The shared changelog is the epic folder's `guides/changelog.html`:  `epic docs <name>` looks for the entry there.
  - It links the epic page and the guide.
  - Under "3. Merged into main" if "Finish" below merges it, else "2. In worktrees".
  - Nothing to commit on the branch for it, and no merge conflict:  every checkout sees the one file.
- Then leave the worktree:  follow the isolate skill's "Finish".
  - No move back:  the session and its epic page stay in the window they're in.
- Last line of the reply:  "All done ..." (see the top).

## 7. Review:  `/epic review [<name>]`

The person reviews ON THE PAGE:  the epic page in the side bar's Review tab, where they mark items.
- Each item's buttons:  one group, Make Todo, Revisit, Approve (no wand on them since 2026-10-25).
  - Answered or finished:  Reopen alone, a `revisit` mark:  open it again, their note saying why.
- An issue's or a judgement call's first button is Do this:  worked in the item itself, no todo
  (`epic guide review`, "Do this").
- A todo that's WORK (no `limit`) has these instead:
  the plane, "start it now" (`next`);  Revisit;  the x, "drop it" (`drop`).
  `inbox apply` applies both.
  - The plane STARTS the todo (epic `epic-engine` I314):  its line says `start now`, and the session starts an agent on
    each at once ("The session answers;  agents build"), never queueing it into a phase still to do.
    His note asking for a phase:  `epic phase` a NEW one for it, next.
- Every other note box:  Revisit Later;  the x, "skip this" (`skip`:  nothing to do).
  `inbox apply` applies it as reviewed:  the note kept, the status left as it was.
- Choose, on option cards.
- A to-do PHASE dragged by its title to another place (epic `epic-engine` P34):  its move arrives as a mark
  (`{ action: "move", to }`);  `inbox apply` moves it, the numbers and every link and "P5 · Name" following.
- Their colours and fills:  `plan-doc.md`, "Colours".
- They send them with the page header's paper plane, or AUTO SEND sends them by itself (epic `epic-engine` P53):
  a ring round the plane drains once they leave the page alone (2 minutes by default, set in the header's gear),
  whether or not this session listens;  with nobody listening, the page server wakes the epic.
- A running revisit now clicked again is "nevermind" (`canceled`, 7.3).

This session LISTENS:  it waits on the doc's review inbox, and acts on what arrives.
- EVERY epic session listens while it's open, `/epic review` or not, with NOTHING to arm (epic `epic-engine` P18,
  T163;  Owen, 2026-11-23:  "Can we have a single server which waits for comments on pages for all epics"):
  - ONE listener, in the epic hub (`InboxHub`), looks at every epic's inbox for every running session whose title, or
    worktree, names the epic:  it holds the inbox for the session while the session runs, so the page says it's
    listening
  - when the person sends, it leaves the session a NOTE (`WakeNotes`), and the note reaches it one of two ways,
    whichever comes first:
    - idle:  the session's inbox POLLER takes it and wakes the session (`InboxPoller`, started by the plugin's `Stop`
      and `SessionStart` hooks, `asyncRewake`, epic `epic-engine` I144)
    - at work:  the plugin's `PostToolUse` hook hands it to you at your next tool call, within seconds (I286's
      promise, kept):  the same `📬` line, in a hook's context
  - so NEVER run `epic inbox wait` in the background:  nothing times out, and no turn is woken with nothing to do
    (the "still listening" turns are gone)
  - no hub running (a machine without it, a hub restarting):  the poller looks at the inbox itself, as before
  - never in a scripted `claude -p` (CI, an agent harness):  the poller and the hook stand down there, as Claude
    Code's `CLAUDE_CODE_SESSION_ATTENDED` is `0`;  `claude -p` waits for every session-start hook (epic `epic-engine`
    I319)
  - `/epic review`'s `epic inbox watch` (or the session's own foreground `wait`) holds the inbox while it runs:  it
    hears the work itself, and the hub leaves no note
  - it prints NOTHING until the person sends;  then ONE line, `📬 <epic>:  taking your Send ... (3 marks:  J149
    approve, ...)`
  - that line:  take the work with `epic inbox wait <epic> --timeout 5` (in the foreground), then go on at 7.3
    - it found nothing (exit 2, no words:  something else took it first):  carry on with what you were doing, no
      reply about it
    - In Codex:  no hub wake:  look with `epic inbox <epic>` between steps, and wait with `epic inbox wait <epic>` in
      the foreground when there's nothing else to do
  - `📬 <epic>:  the person pressed "start review" ...`:  they asked for a review from the page;  start one, `/epic review
    <epic>` (this section), as if they'd typed it
- Mechanical marks:  at once.
- Add Details and "revisit now":  by background agents ("The session answers;  agents build").
  - In Codex:  a Codex sub-agent each, waited for;  or answered here, one at a time.
- "Revisit soon":  answered one at a time.
- EVERY answer goes INTO its item, on the page;  the chat only links them (Q3 of `windows-and-review`).
- No modal walk through items any more (epic `review-review`, 2026-10-04;  its epic page, 1.1-1.2:
  `epics/review-review/review-review.plan.html` in the epic folder).

- Runs from ANY window, `main` or a worktree.
  - The prompt hook lets `/epic review` through, and never renames the session.
  - EXCEPT in a session titled for a DIFFERENT epic (`🚧 seo` typing `/epic review airplane`):
    the hook refuses it, with a one-line reason (epic `airplane` P12, Q10 B).
    Untitled and main sessions are allowed.
  - No worktree, no plan mode.
    - In Codex:  Codex has neither.
- Started from the PAGE too (epic `airplane` P12):  the person clicks the "No Claude session is reviewing" pill
  (or the review line).
  - The page server finds the ONE running session titled for the epic (`🚧 <name>`, or the name as a word).
    - Its inbox poller runs:  it asks through the inbox, and the poller's `📬` line wakes the session (above).
    - Else it types `/epic review <name>` into its tab through its window's bridge:  the person presses Enter there.
      Its tab open already, VS Code refuses that, so nothing is typed and the page says to paste it.
  - None, or several:  nothing is sent, and the page says which sessions it found.
- And WOKEN by the page (epic `epic-workflow` P16):  Send with NO session listening.
  - The page server, the first of these that applies:
    - tells the epic's running session through its inbox (its poller runs, or it's mid-turn);  else types
      `/epic review <name>` into it (`🚧 <name>`), and the person presses Enter
    - else opens a new session in the epic's worktree window (opening the window if it's closed):  nothing typed,
      nothing to press;  it wakes by itself
    - else, with no worktree, a new session in a main window, `/epic review <name>` typed in:  the person presses Enter
  - Once per epic per 10 minutes, or until a session listens.
  - Never with several sessions titled for it, in airplane mode, or for a Send with nothing new.
  - NEVER a second session while one of the epic's runs (epic `epic-engine` I286):  a session titled for it OR
    working in its worktree counts;  one mid-turn is told through its inbox, and hears it at its next `wait` or turn's
    end.
  - A session it opens is titled `🚧 <name>` as it starts, nothing typed into it:  its first line is the `📬` line,
    saying what it's taking.
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
epic pages link <ABS doc> --hash <id> --show   show the doc in its tab (an epic page Review), at <id>;  prints its links
epic inbox watch <name>  /  ignore <name>  this session is (no longer) reviewing:  the page says so
epic inbox wait <name> --timeout 5        after a `📬` line, in the FOREGROUND:  takes the work (exit 2, silent:  none)
                                           never in the background:  the epic hub listens (This session LISTENS)
                                           In Codex:  `epic inbox wait <name>`, foreground;  it returns with the work
epic inbox apply <name> [ids]              approve / pick / Make Todo / Do this marks into the doc;  prints what's left
                                           a pick on a PHASE's set ("P3's choices:  ...;  adjust its plan"):  rewrite
                                           that phase's plan to it;  on a STANDING set ("...:  act on this round"):
                                           act on the picked options, add new ones as they come (epic-engine P50)
epic inbox working <name>#<id> on|off      the page's spinner on an item, or a phase (P20)
epic inbox status <name> "<text>" [--items q3,c2] | --clear   what you're doing (the step label's tooltip), what you answer
epic update <name>#<id> underway "<reading>"   Claude's blue status card on an item, spinner on
epic update <name>#<id> done ["<summary>"]     the item FINISHED:  that card green (Done);  an open issue / todo closes
epic update <name>#<id> noted "<what>"         a STEP done (choice recorded, answer written):  an outlined Noted card
                                           a card:  a short lead sentence, then short paragraphs or "- " bullets, one idea
                                           each ("\n\n" between);  code names and numbers only where the reader needs them;
                                           the full story in the item's body (details --append);  --file for a long one
epic details <name>#<id> --file f --more | --append   More Details in place of the unclear text (Add Details) / a reply
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
  - In Codex:  the question in the chat, the epics numbered.
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
   - `epic pages link <ABS doc> --hash <that id> --show`:  the doc opens in the Review tab, at it.
4. `epic inbox watch <name>`.
   - Nothing to arm:  the epic hub wakes this session at the Send, when its title or worktree names the epic.
   - Reviewing ANOTHER epic (a main or untitled session):  the hub doesn't listen for it;  run
     `epic inbox wait <name> --timeout 8h` in the background, and once it ends with nothing (exit 2, silent), arm it
     again without a word.
     - In Codex:  run it in the foreground, and take the work it returns;  end the turn only when it times out.
5. END THE TURN, short:
   "Mark items in the Review tab:  each item's buttons;
   a todo's plane starts it now, its x drops it;
   a phase's or an issue's plane (Do this) says go ahead and build it;
   an open issue's x closes it (not needed);  a fixed one's check accepts the fix;
   a note box's x skips it (nothing to do);
   the header's paper plane sends the rest.  I'm listening."
   - Then the doc's link pair.

### 7.3 Woken:  the `wait` command finished

Read what it printed.
Then, in this order.

Every card you finish says what REALLY happened, one of three
(2026-10-10:  "Claude Done entries are confusing ... you haven't apparently done anything";
2026-10-26, epic `epic-engine` I148:  a fixed issue with two Done cards stayed red):
- `status ... underway "<reading>"`:  you're on it.
- `status ... noted "<what;  what happens next>"`:  a STEP done, the item NOT finished.
  - their choice recorded (a todo made;  "do it next phase"):  `"Queued for P9 · Build"`
  - a phase's Do this (its thumbs up, a `todo` mark;  Make Todo before epic `epic-engine` I181):  NOT a todo to make
    (2026-10-29:  "it's already a phase, you wouldn't make it a todo"):  `apply` notes "Go ahead" on it;
    build it (its plan first, when it has none accepted), or say why not yet
    - NOT a pick:  `choose` / `apply` record it inside the item's Choices, no card (I153)
  - an answer or reply written, details added, the item condensed:  `"Answered their note:  options A and B"`
  - called off:  `"Called off on the page:  nothing written."`
  - An underway card turns noted.
- `status ... fixed ["<what changed>"]`:  an issue or judgement call fixed (`epic update <epic>#I3 fixed`).
  Who found it decides (epic `epic-engine` T143;  `done` on an issue you found means the same):
  - an issue you found, fixed before they got to it:  grey by itself, `FIXED - <title>`, closed, nothing for them to
    press (2026-11-22:  "Issues which are fixed before I get to them can just be labeled `FIXED - <description>` and
    go to grey automatically")
  - got to:  their Do this, Revisit or other mark, a comment or note, its id chip clicked.  Then orange, still open;
    they close it, as with a judgement call
  - an issue from their words (`--requested`):  light orange, still open;  they close it
  - `epic guide review`, "Do this".
- `status ... done ["<summary>"]` ONLY when the item's work is FINISHED:  an issue fixed, a todo built.
  - An open issue or todo CLOSES with it (status done, green, its phase stamped, logged), as `epic close` does.
    - Except an issue you found:  it's `fixed`, below (grey, or orange if they got to it first;  epic `epic-engine` T143).
  - A question, judgement call or manual test keeps its status:  a question is decided (`decide`, `choose`), the
    other two are the person's to close (except a test you checked yourself, Q58:  "Start testing" below).
  - Meant "this step done"?  That's `noted`.

The item's id chip follows too (PLAN-DOC.md "Colours"):
- dashed:  not sent
- OUTLINED:  sent / on it / still due
- solid:  done
- Leave work you queued `queued` until it's built, so their chip stays outlined.

A revisit note that says just `do it` (now or soon) means:  DO it, no question back -- the call as written, the todo
as asked.  Revisit puts it in a judgement call's or todo's empty note box for them (2026-10-19:  "I generally
want you to just do it").

0. Nothing to arm:  the epic hub keeps listening for this session (epic `epic-engine` T163), and the next Send reaches
   you at your next tool call, or wakes you once idle.  Busy with something else when woken (I286):
   - apply the quick marks at once (`epic inbox apply`:  approve, close, pick, todo)
   - put a Noted card on each heavy one at once, `epic update <name>#<id> noted "Queued:  after <what you're on>"`,
     so the person sees it was heard
   - go back to what you were doing, and take the queued ones after it
   - In Codex:  just the three steps above.
0b. What you're doing (epic `epic-engine` P35;  Send's ring turns while you answer, I340):  `epic inbox status <name> "Responding" --items <the ids
   taken>`, so the person sees what you're answering;  `epic inbox status <name> --clear` once you've answered.
1. `epic inbox wait <name> --timeout 5` found nothing (exit 2, no words):  something took it first;  carry on, with no
   reply about it.  Never arm a `wait` in the background (epic `epic-engine` T163).

1b. CANCELED:  The person said "nevermind" on a running request for now (epic `windows-and-review` P2).
   - Stop that item's background agent (`TaskStop`).
     - In Codex:  Codex waits for its sub-agents, so nothing is left running:  just don't write that item's answer.
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
     - In Codex:  ask for a Codex sub-agent per item, each with this prompt, and wait for them;
       or answer each here, one at a time.
   - Which doc, which item (id, title), and the rules:
     - `plan-doc.md` "Rules":  cold reader, bullets, examples, Net effect
     - and "Prose":  the blocks are ELEMENTS
       - `<epic-code>`, `<epic-aside>`, `<epic-net-effect>`, `<epic-choices>`, `<epic-field label>`
     - never `ui-accordion.spell-code`, or a `<p><b>Net effect:</b></p>` by hand
   - Add Details (the (i) button on every item's line, or a given body's Clarify;  epic `epic-engine` T76, T95):
     CLARIFY its text.  Read the item, the code and docs it names, then say plainly what it means, whole:  a new paragraph
     wherever the context changes (`plan-doc.md`, "Rules").
     - `epic details <name>#<id> --more --file <html>`.
     - Yours REPLACES the unclear text (epic `epic-engine` I301;  2026-11-15:  "When you `clarify` you can remove
       'What it says on the tin' or the original unclear text.  Change title to 'More Details', not collapsable"):
       a card headed "More Details" that never folds.
       - The old text moves into its Original Discussion;  "_What it says on the tin._" goes for good.
       - The person's own quoted words and every card (Choices, Net effect, code, replies, commits) stay.
       - So write it WHOLE:  every fact the old text had, said clearly, not only what it left out.
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
   - START TESTING (epic `epic-engine` P51, Q53):  the person pressed "Start testing" on the Manual tests section.
     - `wait` prints it under now, keyed `tests` (the section's id, not an item):
       "Start testing:  check the open tests you can, write out the rest".
     - No status card (it's no item):  `epic inbox status <name> "Preparing tests"` (the step label's tooltip);
       `wait` already marked `<name>#tests` working, so their button says "Preparing tests".
     - Then ONE background agent, which:
       - In Codex:  no background agents:  do these steps yourself, in order, then tell the person the tests are ready.
       1. lists the open tests:  `epic test <name> --list --json`
       2. checks each one it can itself:  runs its commands, reads CI (`gh run list`), takes a headless Playwright
          screenshot from the kit's root (`node epic/src/tools/check-spell.js`, or a script);
          NEVER the Claude-in-Chrome tools
          - passed:  close it (Q58:  Claude MAY close a test it checked itself), with a Done card saying how it was
            checked, and the picture beside the page (`tests/m3-check.png`) in a reply
            (`details <name>#M3 --append`, an `<img>`):

            ```text
            epic update <name>#M3 underway "Checking it headless"
            epic update <name>#M3 done "Checked headless:  the pill turns green"
            epic close <name>#M3
            ```

          - failed:  file an issue and mark the test (`--failed I12`), as for the person's note ("Tests" below);
            the test stays open
       3. rewrites the Step of each one left in the explicit form ("5. Each phase":  the app, the window, the menu or
          keys, every command in a code block, `cd` included, a wait as its own step):

          ```text
          epic details <name>#M3 --step "..." --should "..." --example tests/m3.png --if-not "..."
          ```

       4. an EXAMPLE screenshot of what it should look like, wherever a page or a headless window can show it
          (`--example` takes a PNG file)
       5. ORDERS them so tests in the same window come together, and stamps each with its place, 1 first:
          `epic details <name>#M3 --prepared 1` (alone it only stamps;  with `--step` ... it stamps too)
       6. `epic inbox done <name>#tests`:  the page opens Focus mode on its Tests tab, on the first test, in that order
          (epic `epic-engine` P57, Q65;  unless they're typing:  then "Tests ready:  Focus on the tests opens the first")
     - Their button then reads "Focus on the tests · 3 left";  with every test prepared it never asks you again.
     - Nevermind on it (their click while "Preparing tests") is 1b:  stop the agent, `epic inbox done <name>#tests`.
3. SENT marks:  `epic inbox apply <name>`.
   - Approvals, picks and todos made or queued land in the doc;  it prints each.
   - An Accept that carries their comments in its text ("accepted, with comments to fold in:  C4, C5";  epic
     `epic-engine` I163):  `apply` accepts the plan and leaves the comments.  Fold them into the plan, keeping it
     accepted (`epic update <name>#P<N> --plan "..." --accepted`), each change marked `<epic-change item="c4">`
     (T100, never an Update block), then answer each (`epic inbox done <name>#C4
     --file <answer.html>`).  No new Accept.  Only a comment against something they decided, or a big change of
     scope, becomes a Q item instead ("4b. Build plans").
   - TESTS, answered on the page (epic `epic-engine` P51, Q53;  no test run, no Passed / Failed / Skip / Not now):
     - Approve on a test:  `apply` closes it as passed.
     - The note box's ✕ (`skip`) on a test:  `apply` CANCELS it, "no longer applies";  their note, if any, says why.
     - A REVISIT note on a test (or their comment in its Step or Should, which presses Revisit itself, I158) is what they
       saw, left for you.  A picture they pasted comes with it:  `wait` prints `screenshot:  tests/...png` under the mark.
       What a step's command printed, pasted in the box under it (T165), comes with ANY of their marks on the test
       (Approve, Revisit, the ✕), or alone as a revisit:  `wait` prints `step 2 printed (pasted by the person):` and the
       text under the mark;  read it before `apply` closes a passed test (it may show a problem they missed).
       Read it, then:
       - it says it passed:  `epic close <name>#M3`
         (a passed test with a comment may still need work:  a todo or issue for what it asks)
       - it failed, or did only part:  file an issue holding their note and picture, linked both ways, the test left open:

         ```text
         epic add <name>#I "M3 failed:  <test's title>" --details "<p>From <a href=\"#m3\">M3</a>:  <their note></p>
           <img src=\"tests/m3-20261029-1432.png\">"
         epic update <name>#M3 --failed I12
         ```

         - `--failed` puts the red "failed → I12" on the test's line, and a Noted card linking the issue;
           tell the person one line, with the issue's link
           (`epic pages link <doc> --hash i12 --review`), e.g. "M3 failed:  the pill stayed grey -> I12"
         - fix it as any issue;  don't reopen the test by hand:  they try it again once it's fixed,
           and closing it as passed takes the "failed" off
       - then `inbox clear <name>#m3`
     - Left alone:  still open;  there's nothing to press for "not now".
     - An OLD `test` mark (`{ action: "test", result }`, sent before P51) still applies as it did:  `apply` closes a
       passed one, cancels a skip, defers a not-now, files a failed one as "M3 failed:  ..." (`M3 -> I12`).
   - A pick works on ANY item's cards, a reply's too (I8 of `epic-components`):
     a question is answered with it, any other item approved with it.
   - `apply` itself gives each todo made and todo queued its outlined NOTED card;  an approval gets none (Q19):
     - a pick gets none either:  its line ("recorded ...;  waiting for ...") goes inside the item's Choices (I153)
     - "Made todo T23 ..."
     - "Queued for P10 · ..."
   - A plain revisit's NOTE (words, no pick, no picture, not their comments in its text) is no "to talk over" any
     more (epic `epic-engine` I200;  2026-11-02:  "make it a comment like the rest and clear the field"):
     - `wait` makes it a COMMENT on its item, its mark gone, so their note box empties:  printed under "comments, to
       answer on their threads", with "their revisit note on P3, made a comment"
     - answer it on its thread, as 3b says;  a note `wait` never took (`/airplane land`) becomes one, answered, at
       `inbox clear`
   - A comment's words holding `![picture](<path>)`:  a picture they pasted in it (epic `epic-engine` I267), its path
     the page's URL path;  look at it (`Read` on `$(epic config contentFolder)<path>`) before answering.
   - Then each "to talk over" left (a pick "B, but ...", a picture, their comments in its text), one at a time:
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
     - In Codex:  in the chat.
   - A call made name by name (they want each name's context before a rule's renames go in):
     a CHOICE page (the Choice Pages guide, the epic folder's `guides/syntax-choices.html`).
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
   - The person's SEND hands them over, as it does marks (2026-10-10:  Send stays the way comments reach you).
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
     On a phase field or Overview prose:  into that phase or part, the words it changed marked
     `<epic-change item="c3">` (epic `epic-engine` T100), never an Update block.
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
4. Nothing to arm (the epic hub listens;  a session reviewing ANOTHER epic arms its `--timeout 8h` wait again, 7.2),
   then reply:
   - what landed:  bullets, items in words, ids after
   - what's being worked on in the background
   - what needs them
   - the doc's link pair last

- A background agent's own completion notice wakes the session too.
  - In Codex:  no notices:  the sub-agents' results come back before the turn goes on.
  - Nothing to do but check `inbox` shows the item done.
  - A session reviewing another epic:  don't re-arm a second `wait` while one runs:  `inbox` would print both.
    Check the background tasks.

### 7.4 Finish

When the person says they're done ("stop reviewing", "that's it"), or the session must stop:
- `epic inbox ignore <name>`;  a session reviewing ANOTHER epic stops its waiter first (`TaskStop`)
  - In Codex:  the foreground wait has ended already:  just `epic inbox ignore <name>`.
  - a session whose title or worktree names the epic keeps listening anyway, through the epic hub (P18, T163):  the
    next Send still reaches it, as a `📬` line
- `epic log <name> "Review:  <n> approved, <n> answered, <n> to todos, <n> details added"`
- reply:  what was decided and done (in words, ids after), and what's still waiting on them;  the link pair
- the doc's changes:  nothing to commit, from any checkout.
  It's in the epic repo, committed for you at the turn's end.

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

0. First, "1. Name"'s hooks check:  `epic window hooks --again "/epic resume <name>"`;  exit 1, STOP, change nothing,
   and give its fix.
   - In Codex:  skip it.
0. In ANOTHER epic's window (the prompt hook's note says so;  epic `epic-engine` r15:  "this should open the epic in
   a new window!"):  never resumed here.
   - "From another worktree", steps 4-5, with `--prompt "/epic resume <name>"`:  a launch, or a fresh session's move.
   - Then stop:  the epic's own window resumes it.
0. Already home:  this window or this session is ALREADY the epic's own (2026-10-10):
   - the window:  `epic window which` says `ongoing/<name>.code-workspace` (in `epic config windowsFolder`)
   - or the session:  its folder is `epic worktree path <name>`'s
   - and `<name>` has an epic page (`epics/<name>/`), and is the `<name>` typed, if one was.
   - Then that's the epic, and nothing is asked:
     no "Which epic?" modal (step 1), no new-window-or-stay modal (step 3).
     - Step 3 is `EnterWorktree` with `name: "<name>"` (if not in it yet), then `epic window stay <name>`.
       - In Codex:  `cd "$(epic worktree path <name>)"` if not there yet;  no window step.
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
       - In Codex:  ask in the chat, the epics numbered.
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
     - In Codex:  print that command for the person to run.
   - `main`:  no worktree;  work in the main checkout, this window.
   - a worktree (`.claude/worktrees/<name>`, or beside the repo):  as [the unpark skill](../unpark/SKILL.md), step 3.
     - That's `should-stay --epic`, a new window or stay, and `EnterWorktree` with `name: "<name>"` (never `path`:
       "Launched").
       - In Codex:  `cd "$(epic worktree path <name>)"`;  no window question.
     - A `PARKED-<name>.md` there:  it was parked.
       `/unpark`'s steps instead, and stop here.
   - The worktree is gone but branch `<name>` isn't:
     `EnterWorktree` with `name: "<name>"` re-makes it on that branch (the `WorktreeCreate` hook).
     - In Codex:  `epic worktree create <name>` re-makes it the same way.
   - Neither:  say so, and ask before starting the epic over.
4. Catch up, in the checkout:
   - What's done, what's half done:
     - `epic summary <name>`:  what's left;  done phases and grey items only counted (`--all` lists them)
     - the active phase's part file, and the newest review lines:  `epic log <name> --last 20`
       (the page's Log shows only commits since epic `epic-engine` P52)
     - `git status --short` and `git log --oneline -5`
   - Behind `main` (`git log --oneline HEAD..main` not empty):
     `epic worktree merge-main`, as [the park skill](../park/SKILL.md)'s "Resume", steps 2-4.
     - Resuming is the go-ahead for its merge commit.
   - No `node_modules/`:  the install command (`epic config installCommand`;  empty:  nothing to install).
   - `epic open <name> --review`.
     In a new window:  after the handoff, as "2. Session", step 5.
   - Nothing to arm for the page ("7. Review", "This session LISTENS"):  the epic hub listens for a session started
     by `/epic fresh` (or a restart) from its first moment.
   - Paused agents (`epic agents` says `paused`;  "Pause first", under "16. Fresh") start again now, once each,
     with no modal:  it's work that was under way.  For each:
     1. `epic agents resume <name>`:  it prints the brief, and clears what was saved, so it can't start twice
        - refused, a pause still under way:  start none, say so, and start them when its go or cancel comes
     2. start that agent:  `Agent`, its full name first in the description, the whole printed brief as its prompt
     3. `epic agents set <name> --task-id <its id>`, then `epic agents wait` in the background once
     - In Codex:  no background agents:  do each one's work here, one at a time, from the printed brief.
5. Reply, for someone who remembers nothing:  three lines at most.
   - What the epic is, where it stopped, and what's waiting on the person (open questions, issues, tests).
   - Uncommitted work in bold.
   - Paused agents restarted:  name them, and what each is on.  They're the carrying on, so ask nothing about them.
   - Then:
     - a phase `active` with work under way:
       AskUserQuestion "Carry on with P<N> · <Name> (Recommended)" / "Stop here"
       - In Codex:  ask in the chat, the options numbered;  the same for every "step 6's modal" below.
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
    - In Codex:  the same in Codex.
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
   - Then format it:  `yarn vp fmt <its ABSOLUTE path>`, run from the plugin's own folder (`${CLAUDE_PLUGIN_ROOT}`), never
     your repo's root (no `vp` there:  skip this step)
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
- Epic `skillz` P4, 2026-10-07:
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
    - In Codex:  in the chat.

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
    - In Codex:  ask in the chat.
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
- Focus mode on (`epic focus status`):  no modals either, as "Focus mode" says.
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
    - first "1. Name"'s hooks check, `epic window hooks --again "/epic request <epic> r3"`:  exit 1, STOP, give its fix
      - In Codex:  skip it.
    - then `EnterWorktree` with `name: "<epic>"`, as "Launched" does, only when `pwd` isn't in it already
      - In Codex:  `cd "$(epic worktree path <epic>)"`.
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
EVERY request becomes an ISSUE, a TODO or a PHASE (epic `epic-engine` T88, T108;  Owen, 2026-11-16:  "When an epic gets
requests from other epics, it should make them a Todo or a phase"):  never only a note on the request ("fixed as I282").
- A BUG REPORT (something broken):  an issue;  a FEATURE (something new):  a todo;  BIGGER:  a phase (below).
- SMALL, one agent's work (a fix, a tweak, one file or two):  an issue or a todo, taken up at once as "The session
  answers;  agents build" says:
  `epic agents add <name> ...`, then
  `epic add <epic>#I "<title>" --requested --start "<their words>" --agent <full name>` (a feature:  `#T`),
  then `epic file <epic>#I<n> <rN>` (`#T<n>`)
  - the file puts their words, the Context and the screenshots into the item (its pictures, deletable on the page),
    marks it `requested` (light orange once done, until they look), and marks the request filed `I<n>` (`T<n>`)
  - the agent builds it, and closes it with `epic update <epic>#I<n> fixed "..."`;  one line back:
    "r3:  I41 · <title>, agent `<epic>-<name>` on it"
- BIGGER, or about the same thing as a to-do phase:  a phase, steps 3 and 4.
- A true DUPLICATE of a todo or phase the epic already has:  `epic file <epic> <rN> "same as T12"`, and say so.
  - `where` MUST name that todo or phase (`T12`, `P7`):  the command refuses anything else.
  - A todo it names is marked `requested` too.

3. The filing of a phase goes to a background `<epic>-plan-doc` agent (root `CLAUDE.md`, "Delegated work"), the
   session free.
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
     - In Codex:  in the chat.
   - a phase under way:  no modal;  the new work waits its turn.
- A request with no issue, todo or phase:  only a duplicate, `epic file <epic> r3 "same as T12"` (above);
  one already done by other work is a todo too, closed at once with what did it.

## 13. Summarize:  condense an item after a lot of back and forth

When the person asks to summarize (condense, boil down) an item -- in chat, or a revisit note ("summarize this") --
because its text and replies have grown too long to read (epic `repo-split` J141):
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

## 14. Tidy:  `/epic tidy [<epic>]`

Close the open judgement calls, issues and todos that other work has made obsolete, leaving a reason on each
(epic `epic-engine` Q69;  "mark as done any that have been obviated by other changes").
No `<epic>`:  this session's epic.
Only when the person (or that epic's session) asks:  it never starts by itself.

Its mechanical half runs BY ITSELF at the end of every turn (epic `epic-engine` T78;  Owen, 2026-11-15:  "we need an
'end of turn' action to go through the open/underway issues and clean things up"):
- `epic stale <epic> --underway --apply`, from `epic turn end` (`TurnEnd.tidy()`), in an epic's worktree, at most once
  an hour per epic
- it looks at open items whose latest card is still Underway, older than 3 hours, nobody working on them
  (`StaleUnderway`):
  - their work on `main` (a commit naming the item, or a sha its commit cards list):  an issue or call fixed for
    review, orange, the commit its evidence;  another kind, a Noted card with the evidence
  - not:  a `Stale:` card, once, so it's back on the person's list instead of spinning blue for weeks
  - it closes nothing
- by hand:  `epic stale <epic> --underway` reports, `--apply` acts;  then pick up each `Stale:` item, or close it
  with a reason (below)

1. Get the facts:  `epic stale <epic> --json` (scratchpad file).
   - One entry per open call, issue, todo and limit:  age from when it was written, its phase and whether that's done,
     the files and code names it mentions and whether they still exist (in its worktree or on `main`;  only what
     git's history has can be gone), commits since it was written, commits naming it, later items and phases that
     mention it, the todo made to follow it up (`madeTodo`), the done phases it says it waits for (`waitsOnDone`),
     every status card already on it (`statusCards`).
   - It decides nothing.  A file gone or a name missing is a reason to look, not a verdict.
   - Skip an entry with `closeRefused` (a wanted item, one the person asked for lately, a fix waiting for review, a
     pick or mark of the person's, work under way):  those are never closed here.
   - Skip an entry with `settled`:  a judgement call the person has reviewed.  Don't re-read it.
     A call that only records something ("formatting only", "nothing changed") stays open until they've seen it, and
     their Approve is what finishes it;  tidy doesn't close it.
2. Hand the rest to background agents, up to 5 in all, each a batch of ids:
   - named and listed as the kit's `CLAUDE.md` says (`epic agents add <name> "<task>"`, `epic agents done <name>`).
   - In Codex:  ask for sub-agents, one per batch, and wait for them;  else work the batches one at a time, here.
   - Each reads its items (the page, the part files) against the current code and the recent commits, and sorts each:
     - CLEAR:  something named did ALL of it.
       - List each thing the item asked for.  Close only if every one is done or moot;  half done is never clear
         (data T110, three gaps and a commit fixing two, was closed and wrong).
       - The reason says what did it, names the commit, phase or later item that actually did the work, and says where
         anything left over went.
         Check the one you name:  open the commit, see that it touched this.  Not the nearest one in the list
         (language I12's credited commit never touched the file;  editor T16's credit was another epic's, ids repeat).
       - `epic close <epic>#J3 <epic>#I7 --why "<reason>"`;  a reason per item, ONE command (one process per id took
         15-20s each):  write a JSON5 file of id => reason, `epic close <epic> --why-file <file>`.
       - Reasons are plain text:  a tag in one shows as typed.
       - An entry with `madeTodo`:  the follow-up exists.  Clear only if the todo covers ALL of what's left;
         say so, naming it.
       - An entry with a Done card already in `statusCards` ("Obviated by ..."):  the reason joins that card.
         Read it first:  a leftover Done card that contradicts the item's note is not a reason.
     - HALF DONE or HALF OBSOLETE:  a note that doesn't overstate.
       `epic update <epic>#J3 noted "Partly obsolete:  <what's moot, what's still wanted>" --quiet`
     - DOUBTFUL:  it might be obsolete.
       `epic update <epic>#J3 noted "Maybe obsolete:  <why, in a line>" --quiet`, last on the line.
       - Write `&lt;` for a `<` in a card:  a live tag eats the text.
       - An entry with `tidyNoted` has a card already:  never a second;  close it only if it's now clear.
       - Without a `Maybe obsolete:` or `Partly obsolete:` start, a later run can't tell and notes it again.
     - PROMISED, NOT DELIVERED:  the item says it waits for a phase or later work ("until P35", `waitsOnDone` is the
       hint), that phase is done, and the promised thing never arrived (atmosphere J60:  nothing calls `keepIn`;
       J139:  no Spanish Inbox).  Never close it, however old:  it's a gap.
       `epic update <epic>#J60 promised "<what was promised, and what's there instead>"`
       - Its card starts `Promised, not delivered:`, it goes back on the person's list (red), and `epic close --why`
         refuses it from then on.
     - STILL LIVE:  leave it alone, no card.
   - The rules:
     - **Unsure:  leave it open.**  A wrong close hides work;  a stale item only costs a reading.
     - Age alone never closes anything.
     - A judgement call carried out as decided stays open:  it's a record of a choice, for the person.
       It closes only when a named commit, phase or later item made the choice itself moot.
     - A `limit` (a todo that only notes something) is obsolete when the limit no longer holds, and not before.
     - Near-identical follow-ups are judged together:  both close or neither (mockup T17 was closed, its twin T25 left).
   - A refusal from `epic close` (exit 1, one line per id, the others closed):  leave that item as it is.
3. Reply:  how many closed, how many left noted, how many left alone, every "promised, not delivered" by id with what's
   missing (the person decides those), and the epic page's link pair.

## 15. Staged demo:  `/epic demo`

A demo of the epic tooling for a room, run from PRE-WRITTEN text, so nobody waits for Claude to think
(epic `epic-engine` P77;  Owen, 2026-11-18:  "pre-seed an epic so that I can do a 'realistic' demo without people
waiting for you to think").
- The page and the tools are REAL:  the demo epic, `demo`, is made, filled and moved through its stages by the
  real `epic` verbs.  Only the thinking is faked.
- The text:  the STEP FILES in the epic folder's `epics/epic-engine/staged-demo/` (`epic demo check` prints where),
  `00-paste.md` (what the person pastes) to `07-while-you-were-out.md`, each with its commands and its "Say" text.
  The person rewrites them between runs;  never improvise past them.
- The prompt hook says so (`STAGED DEMO:`), titles the session `🚧 demo` and saves the pasted text.
- NO worktree, no `EnterWorktree`, no window move, no saga question, no install, no agents, no coherence review,
  no modal.  Everything in THIS session, from where it is.
  - In Codex:  the same steps;  run each `epic demo wait` in the foreground.

WORKING LINES fill each wait, the person's words:  "phrases like 'I'm confabulating the confabulator' which are even
more ridiculous than your normal 'Wibbling...' messages ... 3 or 4 per wait".
- `epic demo lines 4` prints 4 (6 before step 06), picked at random from the step files' `silly-lines.txt`.
- Write each as its OWN line of reply text, in italics, then `epic demo pause 2`, then the next:  about 10 seconds
  in all.  Never `sleep`:  Claude Code refuses a foreground one.
- Nothing else in between:  no narration, no tool output read out.

The steps, each turn as short as it can be:
1. Prompt `/epic demo ...`:  `epic demo check` (it fails:  say its lines, and stop).  Then working lines, then
   `epic demo run 01` and `epic demo run 02`, then working lines, then `epic demo run 03`.
   - Reply with the three "Say" texts, run together as one reply in the order they ran, and nothing else.
2. Listen:  `epic demo wait` with Bash `run_in_background: true`, and END THE TURN.
   - In Codex:  run it in the foreground;  it returns when the person acts.
   - It hears the person's Send or Accept on the page (an Accept goes at once, not after its 5 minutes), applies it
     (`epic inbox apply demo`) and ends with `NEXT:  <what>`.
3. Woken (its notice, or a `📬 demo` line:  then `epic demo wait --timeout 5` first):  read its `NEXT:` line.
   - `NEXT:  wait`:  the person isn't done (picks sent before the Accept, one question of two answered):  one short
     line ("Got your picks.  Press Accept Overview when it looks right.";  a phase's thumbs up:  "Got your pick.
     Press Accept Phases when it looks right."), arm `epic demo wait` again, end the turn.
   - `NEXT:  run 04`, `run 05`:  working lines, the step, its "Say" text, then step 2 again.
     - The phase built is the one the person PICKED (Looks good on one phase, or Do this):  `epic demo wait` notes
       it before applying, and the steps name it as `$PICK` (its id;  none picked:  the step's own default).
       So the demo builds the person's choice, wherever it sits in the list, not always P1.
   - `NEXT:  run 06`:  6 working lines ("building"), `epic demo run 06`, `epic demo run 07`, then 07's "Say" text,
     and that's the end:  no more listening.
   - `NEXT:  done`:  the demo is over:  say so in one line.
4. Something the person TYPES in chat mid-demo:  answer it in a line or two, in the demo's voice, then go on from
   `epic demo next`.
5. A step fails:  say what failed in one line, and `epic demo next` says where things stand.  Never fix the page by
   hand mid-demo.
- `epic demo reset` clears it all for the next run (the page, its card, a worktree, branch or window file named
  `demo`, the saved paste);  only when the person asks.
- Rehearsing with nobody watching:  `epic demo run <step> --quiet` (nothing shown in VS Code), and
  `node src/demo/shoot-staged-demo.mjs overview|phases|away|items` from `epic/` for pictures of the page.

## 16. Fresh:  `/epic fresh [--force]`

A NEW session takes this session's epic on, in this window, from its page;  this session's tab closes
(epic `epic-engine` T110;  Owen, 2026-11-19:  "can you do this automatically?  Can we make a command for it?").
- Why:  every turn re-reads the session's whole conversation, so a long-running epic's session pays for it again and
  again.  The new one starts from the epic page, "8. Resume".
- A hint suggests it, in one line, once the session's conversation passes `freshHintMB` (8 MB;  the repo's
  `.epic/config.json5`):  a hint, never a move (`FreshHint`).  Say the line to the person;  don't move.
  - first from the prompt hook;  then again at a break point (Owen, 2026-11-19:  "ok to show it again at the end of a
    phase, significant chunk of work, after a merge"):  `epic phase ... done`, `epic merge` and `epic agents done`
    print it last, at most once every 15 minutes;  an agent that sees it passes it on in its report
- In Codex:  nothing to hand off:  start a new Codex session in the epic's worktree, run `epic guide`, then
  `$epic resume <name>`.

0. Which epic:  this session's, its title (`🚧 <name>`), else its worktree's (`epic worktree path <name>`).
   None:  say so, and stop.
1. Agents:  `epic agents`.  Any listed but not `paused`:  refuse, in one line naming them;  closing this tab would
   cut them off.  Paused ones don't count:  they're saved, and the new session starts them ("8. Resume").
   - A pause under way:  `epic window fresh` refuses until all are quiet.  Never `--force` past it.
   - Wait for their notices, then `/epic fresh` again;  or the person types `/epic fresh --force`.
   - Background waits (`epic agents wait`) don't count:  the new session starts its own.
2. Write down what's open but NOT on the page yet:  the new session knows only the page.
   - a question asked of the person and not answered yet (in the chat, or on a details page):  a Q item,
     `epic add <name>#Q "<the question>" --details "<options, context>"`;  a choice made alone:  `#J ... --calm`
   - a promise made ("I'll release once X lands", "merge after T3"):  a Noted card on the item it's about,
     `epic update <name>#<id> noted "Promised:  <what, and when>"`;  about no item:  a todo saying so
   - work this session itself started and didn't finish (not an agent's):  committed by path, or a Noted card on its
     item saying where it stopped, and the uncommitted files by name
   - agents still running (only with `--force`):  a Noted card on each one's item, "Cut off by /epic fresh"
3. `epic window fresh <name> [--force]`:  records the handoff.
   - Exit 1 (agents, the end-of-turn hook won't run, no window):  say why, and stop.
4. Reply in one line:  "a new session takes `<name>` on in this window, `/epic resume <name>` typed in:  press Enter
   there".  Then END THE TURN, at once, as `/isolate` does after `handoff`:
   - the `Stop` hook ([handoff.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/handoff.mjs)) opens a NEW Claude tab in this window,
     types `/epic resume <name>` into it (not sent), and closes this tab
   - the new session is home already ("8. Resume", step 0, "Already home"):  it asks neither which epic nor which window

### All epics:  `/epic fresh all`

Every running epic session hands itself to a fresh session, each at its next CLEAR MOMENT (epic `epic-engine` T113;
Owen, 2026-11-19:  "anything not actively working or interacting with me ... does it immediately, others do it on
their next clear moment").
- Typed in ANY session:  an epic's, a worktree's, or none.
- Clear:  none of its epic's agents running, not mid-turn, no question from it waiting on the person, and no prompt from
  them in the last 5 minutes (they may be typing to it).
  - The person working on its epic PAGE is no reason to wait:  their marks and Sends sit in the inbox, and the new
    session reads them.
- Each session's own end-of-turn hook watches for that moment
  ([fresh-wait.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/fresh-wait.mjs)), then wakes it with a line saying to run `/epic fresh`.

1. `epic fresh all`.
   - It marks every running epic session as waiting to go fresh, this one too when it's an epic's (it goes LAST:  after
     the others, or 10 minutes on), and prints:
     - a `TELL:` line for each other session (`to 🚧 seo:  /epic fresh all:  ...`)
     - `now:` the sessions clear already;  `later:` the rest, each with why (agents running, mid-turn ...)
2. Send each `TELL:` line, as is, to the session it names:  `SendMessage`, `to` its address, one each.
   - In Codex:  Codex can't message another session:  print each line for the person to paste;  a session not told
     goes at no moment, so say which.
3. Reply ONE line:  "fresh now:  <epics>;  later:  <epic> (<why>), ...".
4. A session that receives the line:  nothing to reply.  Finish what you're on, and end your turn.
   - The wake comes as a hook's line, "/epic fresh all:  this session is clear now ...":  run "16. Fresh" above, from
     step 0.
   - Refused there (no window, the end-of-turn hook won't run):  `epic fresh drop`, so it isn't woken again, and say why
     in one line.
     - Its agents were paused ("Pause first"):  it's carrying on, so it resumes each ("8. Resume", step 4).
- `epic fresh status`:  the sessions still waiting, and why each waits.

### Pause first:  `/epic fresh all --pause`

Every session stops its agents as fast as it can, saving enough to start them again;
then, once ALL are quiet, all go fresh (epic `epic-engine` T139;  Owen, 2026-11-22:  "pause all active agents as
quickly as possible, saving enough info about what is happening to restart again cleanly.  Test runs can be abandoned.
Once they are quiet, they should report back to the initiating agent.  Then that session runs epic fresh all").
- Quiet:  its agents paused and saved, no test or merge of its own running.
- Settled by Owen, the same day:
  - a session that doesn't report holds the round up:  name it to the person and wait, NEVER skip it after a time
    - one whose process has exited doesn't hold it up
  - a merge running finishes, or stops where it can be picked up again:  NEVER killed half way
  - a round can be cancelled, and the agents then pick their work back up

The session that starts it (any session, an epic's or not):
1. `epic fresh all --pause`.  Send each `TELL:` line, as is, with `SendMessage`, all in one message.
   - In Codex:  it can't start a round, or message a session:  say so, and have the person type it into a Claude Code
     session.
2. An epic's session itself:  pause your own agents, the steps below, and `epic fresh quiet`.
3. `epic fresh wait` in the background, then END THE TURN, so reports reach you.
   Reply one line:  "pausing <N> sessions;  I'll say who's outstanding".
   - exit 2, time's up:  name each outstanding session and why to the person, in bold
     (one waiting on their answer:  which window), then `epic fresh wait --max 10m` again.  Skip nobody.
   - a report:  `epic fresh status`;  not all quiet yet, just end the turn
   - a session that started since:  `epic fresh all --pause` again tells it
   - exit 3:  it's over or cancelled:  nothing to do
4. All quiet (exit 0, or status says so):  stop that wait, then `epic fresh all`, "All epics" above, from its step 1.
   Never before:  it refuses, and there's no forcing it.
   - This session went away meanwhile:  any session may run it once all are quiet.

Each epic's session, when the line comes (and the one that started it):
1. Start nothing new from now on:  no agent, item, phase, test or merge.  A Send waits in the inbox for the new session.
2. `epic turns stop test`:  abandons this session's test runs, its agents' too, and frees the turn;  nobody else's.
   - It names any merge of yours still running:  that finishes.
   - A test of your own outside a turn, in a background Bash:  `TaskStop` it.
   - In Codex:  Ctrl-C the test you started.
3. Message EVERY running agent at once (`SendMessage`, one message with a call each;  `epic agents --json` has the ids):

   > Stop now:  we're going fresh.  Start nothing.  Stop any test you started and don't rerun it.  A merge running:
   > let it finish;  one stopped on conflicts:  leave it as it is, never abort it.  Don't commit unfinished work, and
   > never stash, discard or commit another's files.  Claim what you changed (`epic agents claim`), then run
   > `epic agents pause <name> --item <id> --next "<the next step, for someone who wasn't here>" --tests "<runs dropped>"`
   > and return at once, saying it's paused.

   - In Codex:  no background agents:  save your own state on the page and run `epic fresh quiet`.
4. One not back within about a minute:
   - `epic turns list` first:  a merge of yours running, wait for it;  stop no agent meanwhile
   - then `TaskStop` it, and save for it:  `epic agents pause <name> --next "<from its task, its last report and
     the diff>"`
     - In Codex:  stop that sub-agent, and save for it the same way.
   - what's saved by itself:  its task, item, claims, uncommitted files, commits and whether each is merged, a merge
     stopped part way and how to carry it on.  The next step and the tests dropped are yours or the agent's to say.
   - its uncommitted files stay put, and its claims keep other agents and merges off them
   - a paused agent's notice arriving is NOT `epic agents done` (it refuses):  it's still saved
     - it had finished its whole task:  `epic agents done <name> --finished`
5. "16. Fresh", step 2:  what's open and not on the page, your own unfinished work too.
6. `epic fresh quiet`:  it refuses, naming what still runs.  Send the line it prints to who started the pause
   (`SendMessage`), reply one line, and end the turn.
   - In Codex:  print the line for the person to paste there.
7. Stay paused until `/epic fresh all`'s line comes:  then as "All epics", step 4.  Don't restart your agents:  the new
   session does, "8. Resume", step 4.
   - The person asks for work meanwhile:  say the pause is on, and that `epic fresh cancel` calls it off.

Calling it off:  `epic fresh cancel`, from any session, until a session has gone fresh.
- Send each `TELL:` line it prints (`SendMessage`).
  - In Codex:  print each for the person to paste.
- Each session told (and this one) resumes each paused agent:  `epic agents resume <name>`, then what it prints
  (`SendMessage` to the agent in the session that paused it, else a new `Agent`).
  - In Codex:  do each one's work here, from that brief.
- `epic fresh status`:  who is quiet, and who is outstanding.

## 17. Hush:  `/epic hush [<epic> | all]`

Grey the green, yellow and orange items the person almost surely won't look at again (epic `epic-engine` T122;
Owen, 2026-11-20:  "if you are 80% sure I don't care and the item was settled more than 3 days ago, mark it as
settled").  Tidy's sibling:  tidy closes OPEN items other work made obsolete;  hush greys SETTLED ones.
No `<epic>`:  this worktree's epic;  `all`:  every epic in progress.
Only when the person asks:  it never runs by itself.

1. `epic hush <epic> --dryrun`, and show the person its table:  each candidate's id, colour, age, hush or keep, why.
   - Candidates (`Hush.candidates()`):  drawn green, yellow or orange (a fix waiting for review, a calm call, a
     finished request), nothing on it for 3 days or more (its change stamp, its newest card or reply).
   - Never:  red or blue items, open work (an open todo, an open issue not fixed), a manual test, a question, one
     waiting on their pick, one they marked loud, one a tidy found promised, one with their mark not taken, Claude at
     work on it, or a comment thread on it not finished with.
   - The judge:  a fresh `claude -p` (Sonnet, nothing of the repo), 40 items a call, the rule:  hush only if 80% sure
     they won't want to look again (routine fixes they asked for that shipped, calm calls following house style,
     bookkeeping);  KEEP anything that changed what they'd notice, dropped or narrowed something, cost something, is
     hard to undo, or is a choice they might have made differently.
   - In Codex:  the same command;  it runs `claude -p` itself, so Claude Code must be installed.
2. Only once they say go:  `epic hush <epic>` (the judge runs again:  its calls can differ a little from the dry run's).
   - Each hushed item is approved as their ✓ would (a fix accepted, a call accepted, a finished item reviewed), its log
     line `I4 hushed:  <why>`, then one line for the run, `Hush:  N greyed, M kept`;  one write of the page.
   - It prints the counts and each kept item with its why.
3. Reply:  the counts per epic, the kept ones worth their look, and the epic page's link pair.

## 18. Item badges:  what each one asks of you

Epic `epic-engine` P81.  On a page with badges (`<epic-page badges>`), each line starts with what happens next.
The engine only stores judgements and draws them:  it starts no work.  These are YOUR steps, in that epic's session.

- `URGENT`, `WILL FIX`, `WILL DO`:  do it without asking.  URGENT first, then WILL FIX, then WILL DO.
  - Take it up as any item (an Underway card, an agent), and report it as usual (`fixed`, `done`).
- `YOUR CALL`, `AGAINST YOUR ASK`:  WAIT on the person.  Never decide it, and never answer a question for them.
- `WILL RECHECK`, `WILL CLOSE`:  check them in IDLE time, when nothing above is waiting.
  - Put a card on it first (`epic update <epic>#I7 underway "Rechecking:  ..."`):  it reads RECHECKING.
  - Then one of:
    - it's real:  `epic badges <epic>#I7 set --doubt 5 [--care 80] --why "..."`, and the card noted
    - it isn't, or isn't worth it:  `epic badges <epic> close I7 --as vanished | moot | duplicate | declined --why "..."`
    - theirs (their words, or they got to it), so `close` refuses:  say what you found in a reply, and
      `epic badges <epic>#I7 set --your-call yes`:  it waits on them
- `SOMEDAY`, `OPTIONAL`:  nothing, unless asked.
- `SEE T38`:  work the todo, never the item.  Its proposal needs an OK:  `epic badges <epic>#T38 set --your-call yes`.
- `epic badges <epic> list`:  the scores, the badges, and what would close.
- NEVER turn badges on, score, or close on an epic the person hasn't asked it for.
  `trial` closes nothing;  `epic badges <epic> off` undoes them all.
- With badges `on`, a new item its badge would grey still stays open until the person says yes to that too:
  `epic badges <epic> close-new yes` (I435);  never a judgement call, never on your own.
- In Codex:  the same commands;  the judge runs `claude -p`, so without Claude Code items stay unscored, drawn as
  before badges.

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
       - In Codex:  Codex can't message another session:  print each `TELL:` line for the person to type into it.
     - Never a request (`epic send`):  it's a chore, not a phase.
  3. Report one line:  "migrated N epics;  told seo, docs".
- A session RECEIVING a migrate message ("New epic page migration step ... run `epic migrate <epic>`"):
  - run it on its OWN epic only, at its leisure:
    - now, if idle or between phases
    - else at the end of the phase under way, when running it now would disrupt that work
  - it may commit what changed WITHOUT asking (the person's standing OK, 2026-10-11), as `<epic> migrate <step>:  ...`
    - epic pages are in the epic repo, committed by the turn-end hook:  usually nothing is left for the branch
    - "commit" means the branch's own changes, when a step touched tracked files
  - what the report leaves for a person ("left for you":  a link to a gone id, a comment whose words changed):
    fix it in the doc, or bring it up at the next review

## Cheat sheet (`epic ...`, from anywhere in the repo)

```
create <name> [--title "Title"] [--prompt "..." | --prompt-file f] [--future] [--stage <stage>]
                                                    create from the template, in the Overview stage (3.), update the
                                                    docs' home page;  --future:  a future epic (9.);  create on a
                                                    future epic's doc plans it (promoted)
stage <name> [overview|phases|building]             the page's stage;  the person's Accept buttons move it
add-phase <name> "Short Name" --symptom .. --changes .. [--goal ..] [--files ..] [--verify ..] [--estimate 2h]
          [--after N | --before N]                  last;  just before a last Doc Review (an active or done one goes
                                                    back to do);  --after 11:  the new P12;  --before N:  the new
                                                    PN;  either way the to-do phases after it move down a number
update <name>#P<N> [--symptom ..] [--changes ..] [--goal ..] [--files ..] [--verify ..]   set ("" removes) fields
update <name>#P<N> --plan "<ol>..</ol>"             Claude's build plan:  waits for the person's Accept plan (5., step 1)
update <name>#P<N> --plan "<ol>..</ol>" --accepted  their Accept carried comments:  folded in, stays accepted (4b.)
updated <name>#P<N> "<p>what changed</p>" [--summary ".."] [--for <ids>]   phase N's plan changed, no item the
                                                    cause:  <epic-update>, after Goal;  nothing when marks say it
file <name>#P<N> <rN>                               a request into phase N's Requests field, marked filed there
file <name>#T<n> <rN>                               a request into todo n:  words, context, pictures;  marked requested (T88)
file <name>#I<n> <rN>                               a bug report into issue n, the same way (T108)
file <name> <rN> "same as T12"                      a duplicate:  only marked;  must name the todo or phase (T88)
update <name>#P<N> --estimate "1-2h"                change a phase's estimate;  the Overview's total follows
phase <name>#P<N> todo|active|done [--no-open]      done drops UPDATE labels / prose updates;  reloads the tab
phase <name>#P<N> dropped --why "<p>Moved to P38</p>"   never built:  struck through, finished as done;  why in place of Done
phase <name>#P<N> planning [off]                    Claude writing its plan:  a blue spinner on its page, till --plan
inbox working <name>#P<N> on|off                    Claude at work on a phase (or an item, a comment):  the spinner
add <name>#Q|#J|#T|#I|#M|#D "title" [--details "<p>html</p>"] [--calm] [--requested]   prints the id (T3)
add <name>#I "title" --requested --start "<their words>" [--agent <name>]   filed and taken up at once:  blue (T78)
add <name>#I|#T "title" ... --pasted <n> | --picture <file>...   with the pictures pasted last, or files (T87)
stale <name> --underway [--apply]                   stale Underway items:  on main => fixed;  else a Stale card
add <name>#T "title" [--limit | --loud]             a todo:  work still to do;  --limit:  a limit to know about;  --loud:  red, a reminder
add <name>#M "title" --step .. --should .. [--example <png> | ".."] [--if-not ..]   a manual test, the person does it on the page
details <name>#M3 --prepared <n>                    stamp a test prepared, its place in the person's order (1 first)
test <name>[#M3] [--list [--json]]  /  test --all   the page in the Review tab, Start testing pressed (?test=1);  --list:  open manual tests, the person's order
calm <name>#<id> [<id>...] [--loud]                 calls / issues not urgent (yellow);  --loud:  red again (a todo too:  a reminder)
update <name>#I3 --requested                        an issue or todo filed from the person's own words:  light orange once closed
decide <name>#<Q id> "answer" [--details html]      answer a question, INTO it:  prints its id (Q3)
choose <name>#<id> <letter> ["outcome"] [--set N]   an option the person settled in words, any item:  as their pick (latest set)
commit <name>#P<N> | <name>#<id>  <sha> "..."       list a commit under a phase or an item
commits <name> --backfill                           every phase / item commit (`P3:`, `<name> I3:`), once
update <name> --standing [on|off]                   a standing epic:  each phase merges on its own, never done
close <name>#<id>  /  reopen <name>#<id>            close (done) / open again, never delete
close <name>#J3 <name>#I7 --why "<text>"            close as obsolete, the reason on each;  some refused ("14. Tidy")
close <name> --why-file <file>                       a reason per item (JSON5 of id => reason), one write of the page
hush [<name> | all] [--dryrun]                      grey settled items you won't look at again, 80% sure ("17. Hush")
stale <name> [--json]                               the facts for judging which open items are stale;  decides nothing
cancel <name>#<id> ["why"]                          made moot by another decision:  struck;  reopen undoes it
change <name> [--for <item id>]                     stamp the <epic-change item> marks written by hand, list them,
                                                    new first;  --for:  the item of marks naming none
log <name> ["text"] [--last <n>]                    timestamped review line in the log;  no text:  print the newest
bedtime <name> start "P3-P6" | done "summary"       bedtime mode on / off:  the run's changes stay green (`/bedtime`)
focus status | summary <name> [--since <t>]         focus mode:  on?  what happened since (`/focus`, `/back`)
fresh all [--pause] | status | drop                 every running epic session to a fresh one;  --pause:  agents
                                                    paused and saved first ("16. Fresh", "Pause first")
fresh quiet | wait [--max <t>] | cancel             a pause:  this session's quiet;  wait for all;  call it off
agents pause <agent> --next ".." / agents resume <agent>   save a stopped agent / start it again, once
turns stop test                                     this session's own test runs abandoned;  never a merge
prompt <name> "text" | --file f                     set the prompt quoted in the Overview
migrate [<kind>] [<name>... | --all] [--file f] [--step s] [--dry-run] [--notify] [--list]
                                                    pages up to today's markup, every step of their kind, oldest
                                                    first, safe to run again;  alone:  every kind, every page;
                                                    --notify:  running epics told (TELL lines), idle ones migrated
summary <name> [--json]                             phases, next phase, open questions/issues/todos/manual tests
lint <name> [--no-browser]                          ids, links, phases, then the browser check
open <name>                                         show in the side bar's Review tab (an epic page's only tab)
review <name>#<id> ["outcome"]                      mark reviewed today (outcome to the log)
defer <name>#<id>                                   deferred:  dated, still not reviewed
queue <name>#<id> "work"  /  unqueue <name>#<id>    work a review decided on, waiting  /  started or dropped
items <name> --section s --spec <file>              a review's item picker, as a details page spec
items <name> [--section s] [--filter unreviewed|open|reviewed|queued|all] [--json]
                                                    where reviews stand, the to-do list, sections and items
list [--json]                                       every epic once:  status, where it runs, not reviewed / all
backfill <name> | --all [--apply]                   one-off:  mark what past sessions show the person went through
```
- Every command edits the epic's ONE shared doc, wherever it's called from ("The epic repo" at the top).
