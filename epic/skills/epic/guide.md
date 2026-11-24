# Working an epic, with any agent

The epic workflow in plain steps, for any agent:  Codex, Claude Code, or another one.
`epic guide` prints it;  `epic guide <topic>` prints one topic.
- An EPIC is a piece of work and its plan.
  Its live record is the EPIC PAGE, `epics/<epic>/<epic>.plan.html` in the epic folder (`epic config contentFolder`):
  the person reads it, and marks it up, while you work.
- Every change to the page goes through an `epic` command, never by hand,
  except the prose of a part (`epics/<epic>/parts/<id>.html`).
- The epic folder is a git repo of its own.
  Never `git add`, commit or restore its files:  `epic turn end` commits and syncs them.
- Claude Code has a skill for each step (`/epic`, `/epic review` ...):  this guide is the same workflow without it.
  The skill links here, and where a step needs a tool only Claude Code has, the last topic says what to do instead.
- Codex runs the same skills (epic `epic-friend` P12), once `epic plugin install --codex` has linked them:
  `$epic review`, `$wtf`, `$details` ...  Each step that needs a Claude Code tool has an "In Codex:" line beside it.

## workflow -- The loop, start to finish

1. Find the epic and read its page (`epic guide find`).
2. Plan:  the Overview, then the phases, then a build plan for each, each accepted by the person on the page
   (`epic guide plan`).
3. Build the phases in order:  mark each active, do the work, record what you decide and find, mark it done
   (`epic guide build`).
4. Between turns, take what the person sends from the page:  marks, comments, requests (`epic guide review`).
5. End EVERY turn with `epic turn end` (`epic guide turn`).
6. Finish:  the Doc Review phase, then the merge (`epic guide done`).

Replies in the chat with more than one topic:  a `##` header per topic, never `#`.
Anything waiting on the person comes first, under `## Waiting on you`, with its page's links.

While `epic focus status` says focus mode is on (the person's `/focus`), ask them nothing until it's off:
keep building and merging what's in flight, each choice a calm judgement call, each question a Q item left to wait.
When it goes off, post `epic focus summary <epic>` in your reply, `## Waiting on you` first.

## find -- Find the epic and its page

```sh
epic list                         # every epic:  status, where it runs
epic summary <epic>               # its phases left, the next one, open questions, issues, todos, manual tests;  --all:  done ones too
epic items <epic> --json          # where each item stands
epic config contentFolder         # where the pages are
epic pages link <page> --show     # the page's links, to give the person
```

- Work in the epic's own worktree when it has one:  `epic worktree path <epic>` prints it.
- Read the page (its file, and its parts in `parts/`) before you change anything.
- The rules for writing on it:  `epic pages template epics/plan-doc.md` prints their file.

## plan -- Plan an epic

1. A new epic:  `epic create <epic> --title "Title" --prompt "what was asked"`.
   - Nothing asked yet (a name alone):  `epic create <epic> --title "Title"`, no prompt.  The page's Overview opens with
     a kickoff box:  the person types what the epic should do there, pastes or drops pictures, and presses Send.
     Run `epic inbox wait <epic>`:  it prints the `kickoff` mark, its words and `IMG2:  <file>` for each picture;
     `epic inbox apply <epic>` makes it the Kickoff prompt.  Then plan from it, opening each picture's file.
2. Write the Overview into its parts:  what's asked, the questions to settle, the choices.
   - A question:  `epic add <epic>#Q "title" --details "<p>...</p>"`;  the person answers on the page.
3. Once the person accepts the Overview, add the phases:
   `epic add-phase <epic> "Short Name" --symptom "..." --changes "..." --goal "..." --files "..." --verify "..."`.
4. Write each phase's build plan, ALL of them up front:  `epic update <epic>#P1 --plan "<ol>...</ol>"`.
   The person accepts each on the page (Accept plan);  build none before it's accepted.
   Un-clicking an accepted plan's thumbs up holds it (`plan="held"`):  build it only once it's accepted again.

## build -- Build a phase

An agent that can start background agents keeps its own session free to answer the person, and has them do the work
(the epic skill's "The session answers;  agents build"):  each one claims its files (`epic agents claim <name>
<path...>`) and merges with `epic worktree merge-main --as <name>`.  Else, the steps below, here.
Tests come in three tiers, never a full run per commit (epic `epic-engine` T90;  the epic skill's same section):
1. per change:  only the tests beside what changed (`yarn vp test run <test file>`, or `--project <name>`)
2. before merging:  each touched folder's UNIT tests, no browser or integration projects, in its turn:
   in Spell `cd <folder> && epic turns run test -- yarn test:unit` (the kit's own:  `yarn kit:test:unit`, at the root)
3. after merging into `main`:  the full suite (`epic turns run test -- yarn test`, at the repo's root) only when
   `epic agents last <name>` exits 0:  no other agent of the epic still runs;  what it finds becomes an issue
- the parser's speed test only for a change on its hot path (`parser/src/parser/`, the spell rules' matching)
Each piece of work goes into `main` the moment it's done and merges cleanly (`epic merge <epic>`), never held for the
phase's end, so the person sees it at once (the same section;  a standing rule).  Never ask whether to merge:
`epic worktree merge-main` first, always;  failures that aren't this work's don't hold it.  It can't:  say why on its
item.
A merge that changed a lockfile or a `package.json` installs the packages in the main checkout itself, then restarts
its page server and editor, and says so;  a FAILED install leaves the merge in, and prints what to run by hand.
After a restart, agents it started are gone:  start each again from its task, as the epic's running list
(`epic agents`) names it.
Not the ones it lists as `paused`:  they were saved for a fresh start.

Agents paused for a fresh start (`epic fresh all --pause`):
- picking the epic up, start each again once:  `epic agents resume <name>` prints its whole brief
  (no background agents:  do that work here, one at a time)
- while a pause is under way (`epic fresh status`), start nothing new;  asked to pause:
  - drop your tests, finish a merge under way
  - `epic agents pause <name> --item <id> --next "<next step>" --tests "<runs dropped>"` for each agent
  - leave everyone's uncommitted files where they are
- `epic fresh cancel` calls a pause off

1. `epic phase <epic>#P3 active`, and say what you're doing:  `epic inbox status <epic> "Building P3"` (the page's step label turns, the words its tooltip).
2. Check the accepted plan still fits.
   - A small change:  `epic updated <epic>#P3 "<p>what changed</p>" --summary "Plan adjusted:  ..."`.
   - A big one (scope, a choice the person made):  write the plan again (`--plan`) and stop for them.
3. Do the work.
   Text people will see (dialogs, notices, errors, empty states, onboarding, help):  written in the novice voice
   (`epic voice novice`), then checked by a reader with no context before it ships, a dialog whole:
   `epic voice check <file> --about "<what it is>"` (or `--text "..."`);  fix what it finds, or say why a finding is
   wrong.  Its output goes in the commit's item (`--details`).
   Three or more steps for the person, with commands to type:  a runbook they start with one command,
   `spell runbook start <name>`, never a list in a reply (Spell's AGENTS.md, "Commands").
   Record as you go
   (a title is read by someone NOT following the work:  what changed or what's wrong, effect first, named by what the
   person sees or types, never an internal name;  the rest goes in --details;  the rule:  plan-doc.md's "Rules",
   TITLES;  `epic add` has a fresh reader check it):
   - a problem found:  `epic add <epic>#I "title" --calm --details "<p>...</p>"`
     (filed from the person's own words:  add `--requested`, so it turns light orange once closed, until they've looked;
     taken up at once:  `--requested --start "<their words>"`, so it shows blue, under way, never red as if it waited
     on them -- the epic skill's "The session answers;  agents build";
     a picture they pasted with it:  `--pasted <n>`, the n they pasted last into this session's chat, or
     `--picture <file>`, repeatable:  saved beside the page, shown in the item, deletable there, its file too)
   - a request another session sent (`epic requests <epic>`):  a bug report an ISSUE, a feature a TODO, bigger a PHASE,
     never only a note on the request (epic `epic-engine` T88, T108;  the epic skill's "12. Request")
     - small, one agent's work:  `epic add <epic>#I "title" --requested --start "<their words>"` (a feature:  `#T`),
       then `epic file <epic>#I<n> <rN>` (`#T<n>`):  its words, Context and screenshots go into the item, the request
       filed there
     - bigger, or about a to-do phase:  that phase, or a new one, then `epic file <epic>#P<n> <rN>`
     - a true duplicate only:  `epic file <epic> <rN> "same as T12"`, naming the todo or phase it repeats
   - a choice made without the person:  `epic add <epic>#J "<title>" --calm --details "<p>...</p>"`
     (red, without `--calm`, only when it goes against what they said, or needs their answer)
   - a limit you accept:  `epic add <epic>#T "title" --limit`
   - a todo the person wants red, as a reminder:  `epic add <epic>#T "title" --loud`, or `epic update <epic>#T3 --loud`
     on one already there;  `--calm` takes it back (epic `epic-engine` T94)
   - something only the person can check:  `epic add <epic>#M "title" --step "..." --should "..."`
   - an item you're working on:  `epic inbox working <epic>#I3 on`, `off` when done
   - every item's details:  a new `<p>` wherever the context changes
     (`epic pages template epics/plan-doc.md`, "Rules")
4. Commit the code by path, the message starting `<epic> P3:  ...`, and list it:
   `epic commit <epic>#P3 <sha> "what it did"`.
5. The plan check (the idea borrowed from superpowers' spec review, MIT):  hold the phase's diff up against its
   accepted build plan, with the `plan-check` agent (Codex's custom agent, from `epic plugin install --codex`), else by
   its agent file's steps yourself (`epic guide --root`, then `plan-check/plan-check-agent.md`).
   - What the plan said that wasn't built, and what was built that it didn't say.
   - Each miss:  built now if small, else `epic add <epic>#I "..." --calm`
     (not calm only when it drops or changes what the person asked for).
6. `epic phase <epic>#P3 done --done "<ul>...</ul>"`, and `epic inbox status <epic> --clear`.
   - Proof before done (borrowed from superpowers' verification-before-completion, MIT):  the Done list's last bullet
     names each check run and what it printed:  `Checked:  yarn test, 1128 passed;  yarn lint, 0 errors`.
     A check already failing before the phase, or not run, is said so.

## review -- Take what the person sends from the page

The person marks items, leaves comments and presses Send on the epic page.
Nothing reaches you until you look:
- `epic inbox <epic>`:  what's waiting, sent or not.
- `epic inbox wait <epic>`:  waits until they press Send, prints the work, and exits 0;
  exit 2, printing nothing, after 55 minutes with nothing (`--timeout 2h` for longer).
  - Run it in the foreground.
  - Claude Code never runs it in the background:  the epic hub listens for every Claude session, and wakes it at the
    Send, or hands it the Send at its next tool call while it works (epic `epic-engine` T163).
  - While it waits, the page says so:  "Your Codex is listening".
  - Without it, the page says to ask you to run it.

Then, for what it printed:
0. Busy with other work when it came:  apply the quick marks now (`epic inbox apply <epic>`), put a Noted card on each
   heavy one (`epic update <epic>#I3 noted "Queued:  after <what you're on>"`), so they see it was heard, then finish
   what you were on first.  Between steps, `epic inbox <epic>` says whether a new Send came meanwhile.
1. `epic inbox status <epic> "Responding" --items <ids>`.
2. Requests for now (Add Details, revisit now):  per item,
   `epic update <epic>#J3 underway "<what you take it to be>"`, write the answer
   (`epic details <epic>#J3 --append --file answer.html`;  `--more` for Add Details:  it REPLACES the unclear text, so
   write what it means whole, a new paragraph wherever the context changes),
   `epic update <epic>#J3 noted "<what was written>"`, then `epic inbox done <epic>#J3`.
3. Sent marks:  `epic inbox apply <epic>` lands approvals, picks and todos.
   Do this, on an issue or a judgement call:  NO todo;  it stays in the item, red, and `apply` prints your steps.
   Work in the item:  no proposed fix yet?  write one first, in its "Proposed fix" field;  then build it, commits named
   `<epic> I3:  ...`.  Done:  `epic update <epic>#I3 fixed "<what changed>"` turns it orange (light orange, from their words), for the person to review;
   their Approve closes it.  Never `epic close` it yourself.
   Committed but not merged yet:  keep it `underway` ("merging next");  commit, merge, THEN `fixed`.
   Never a Noted "Fixed in <sha>":  it turns the item red, and the tool refuses it (I452).
   Every card (underway, done, fixed, noted):  a short lead sentence saying what happened, then short paragraphs or
   `- ` bullets, one idea each (`\n\n` between);  code names and numbers only where the reader needs them;
   the full story goes in the item's body (`epic details --append`).  The tool refuses a paragraph over 50 words.
   A revisit left "to talk over" (a pick "B, but ...", a picture, their comments in its text):  answer its note into
   the item, as above, then `epic inbox clear <epic>#J3`.
   A plain revisit's note comes as a comment instead ("his revisit note on J3, made a comment"):  step 4.
4. Comments:  `epic inbox working <epic>#C3 on`, answer into the item it's on,
   then `epic inbox done <epic>#C3 --file answer.html`.
   Words holding `![IMG2](<path>)` (or an older `![picture](<path>)`) are a picture they pasted, labelled:  `wait`
   prints each one's file under the words (`IMG2:  <file>`);  look at it first.  "IMG2" in their words means that one.
5. `epic inbox status <epic> --clear`, then `epic inbox wait <epic>` again (in the foreground), unless they said stop.

## turn -- End every turn

```sh
epic turn end
```

- It commits the epic folder's changes, one commit per epic, guide or folder, then syncs them
  with the team's epic repo when the repo's config names one (`contentRemote`):
  pull, renumber ids two people both made, push.
- Quiet when there's nothing to commit;  safe to run twice.
- Claude Code and Codex run it for you, from their end-of-turn hooks, once the hooks are installed and trusted
  (`epic plugin install`, `epic plugin install --codex`).
  Any other agent runs it itself, as its turn's last step.

## done -- Finish an epic

1. The Doc Review phase:  the epic's guide, its changelog entry, and every doc it touched made true to what was built.
2. Merge the worktree's branch into the base branch, when the person says so, and remove the worktree:
   `epic worktree remove <epic>`, never a bare `git worktree remove`.
   - `epic config baseBranchProtected` prints `true`:  the base branch takes only pull requests, and `epic merge` refuses.
     Offer two things, in the chat:  "Push and open a pull request" (`epic worktree merge-main`, `epic pr <epic>`) or "Leave it".
     The rest happens once it's merged:  `git pull` on the base branch, then `epic worktree remove <epic> --branches`.
3. Say what shipped, with the page's links (`epic pages link <page> --show`).

## superpowers -- With superpowers installed

superpowers (obra/superpowers, MIT) is a plugin of skills for the whole of a piece of work:
a design, a plan, a worktree, the build, the finish.
In an epic, the epic does four of those jobs:
- the epic page is the design and the plan
- `/epic` made this worktree, and ran the repo's own install command in it (`epic config installCommand`)
- `/epic done` finishes:  the merge, the changelog, the worktree removed with its servers stopped

So, in an epic, never use these superpowers skills:
- brainstorming, writing-plans, executing-plans, subagent-driven-development:
  no design doc or plan file in the repo (`docs/superpowers/`);  questions go on the epic page (`epic add <epic>#Q`)
- using-git-worktrees:  no second worktree, and no set-up step:
  never `npm install` (or any other install) in an epic's worktree;  the repo's own install has run
- finishing-a-development-branch:  never merge, or remove an epic's worktree, with git;
  `/epic done` (`epic guide done`) is the only finish

Inside a phase, DO use these:
- test-driven-development, where the repo wants tests first (its AGENTS.md or CLAUDE.md says;  test-first is the repo's call)
- systematic-debugging, for any issue found;  file it on the page too (`epic add <epic>#I`)
- verification-before-completion, before a phase closes:  its Done list names the checks run and what they printed

These words reach a session two ways:
- the session-start hook says them in an epic's worktree whenever superpowers is turned on:
  in the person's settings, the project's `.claude/settings.json` or `.claude/settings.local.json`,
  the managed settings, or `claude --plugin-dir`
- the repo's `AGENTS.md`, which every session reads:  `epic init` offers to put them there when superpowers is on
  (`epic init --superpowers` without asking), and keeps them current once they are

The whole story, for people:  the epic plugin's README-superpowers.md (`epic guide --root` prints its folder).

## tidy -- Close what other work made obsolete

Only when the person asks (the skill's word:  `$epic tidy`).
Its mechanical half runs by itself at every turn's end (`epic turn end`):  `epic stale <epic> --underway --apply`,
stale Underway items whose work is on main turned orange for review, the rest given a `Stale:` card (the epic skill's
"14. Tidy").

```sh
epic stale <epic> --json     # the facts per open call, issue and todo;  it decides nothing
epic close <epic>#J3 <epic>#I7 --why "<what made it obsolete:  the commit, phase or item>"
epic close <epic> --why-file reasons.json5                       # a reason per item (id => text), one write
epic update <epic>#J3 noted "Maybe obsolete:  <why>" --quiet     # doubtful:  stays open
epic update <epic>#J3 noted "Partly obsolete:  <what's moot, what's still wanted>" --quiet
epic update <epic>#J3 promised "<what was promised, what's there instead>"   # waits on finished work that never delivered it
```

- Skip an entry with `closeRefused` or `settled`;  an entry with `tidyNoted` never gets a second card.
- Read each against the current code and recent commits.
- Close only when every thing the item asked for is done or moot, and you can name what did it:  check the commit really
  touched it.  Say where anything left over went.  Half done:  a `Partly obsolete:` note.  Unsure:  leave it open.
- Age alone never closes anything.  A judgement call carried out as decided stays open unless a named commit, phase or
  later item made it moot.  A limit is obsolete only when it no longer holds.  Near-identical follow-ups are judged together.
- An item waiting on a phase that's done (`waitsOnDone`) whose promised thing never came:  `promised`, never closed.
- `--why` is plain text, and refuses questions, tests, and anything the person wants, asked for lately, is reviewing, or
  must pick:  the others still close.
- Then say how many closed, how many noted, and each promised item with what's missing.

## badges -- What each item's badge asks of you

On a page with item badges, each line starts with what happens next.

- URGENT, WILL FIX, WILL DO:  do it without asking, URGENT first.
- YOUR CALL, AGAINST YOUR ASK:  wait for the person.  Never answer a question for them.
- WILL RECHECK, WILL CLOSE:  check them when nothing else is waiting, then either:
  - it's real:  `epic badges <epic>#I7 set --doubt 5 --why "..."`
  - it isn't:  `epic badges <epic> close I7 --as vanished --why "..."` (or `moot`, `duplicate`, `declined`)
- SOMEDAY, OPTIONAL:  nothing, unless asked.
- SEE T38:  work that todo, not the item.
- Never turn badges on, score or close on an epic you weren't asked to.
- A new item closes by itself only once the person said yes to that too:  `epic badges <epic> close-new yes`.

## hush -- Grey settled items the person won't look at again

Only when the person asks (the skill's word:  `$epic hush`):  the epic skill's "17. Hush".
Candidates:  drawn green, yellow or orange, nothing on them for 3 days;  never red, blue, open work, tests, questions,
or anything with their mark, a thread or Claude's work on it.  A fresh `claude -p` judges each:  hush only if 80% sure.

```sh
epic hush <epic> --dryrun     # the table:  id, colour, age, hush or keep, why;  nothing changed
epic hush <epic>              # once they say go:  each hushed item approved as their check would, logged
epic hush all --dryrun        # every epic in progress
```

- Show the dry run's table first;  run it for real only when they say so.
- Then say the counts per epic, and the kept items worth a look.

## claude-only-tools -- What Claude Code has, and what any agent does instead

The epic skills lean on Claude Code's own tools.
Without them, every step still works:  each skill's "In Codex:" lines say it in short, this table in full.

| Claude Code's | What it's for | Any agent instead |
| --- | --- | --- |
| the question modal (`AskUserQuestion`) | a quick pick or yes / no | ask in the chat, the options numbered |
| a details page (`/details`) | a question that needs a picture | `epic ask create <slug>`, then `epic ask wait <slug>` |
| a skill, `/epic review` | the workflow's steps, one skill each | Codex:  the same skill, `$epic review`;  another agent:  this guide |
| background agents (`Agent`, `/bg`) | several items answered at once, the chat free meanwhile | Codex:  ask for sub-agents, one per item, and wait for them (Codex waits, so the chat isn't free);  else one at a time, in this session |
| the designer, coherence and plan-check agents | a review by the plugin's own reviewer | Codex:  its custom agents `designer`, `coherence` and `plan-check`, which `epic plugin install --codex` writes into `~/.codex/agents/`;  else follow that skill's steps yourself |
| messages to another session (`SendMessage`, `ListAgents`) | telling a running session to do something | print the line for the person to type into that session |
| a background command (Bash `run_in_background`, `TaskStop`) | waiting on `epic ask wait` while the chat stays free | run it in the foreground and wait:  it ends when the person sends;  stop it with Ctrl-C |
| plan mode (`/comment`) | the person comments on a file in the plan tab | none:  take their notes in the chat, or open it as a guide with comments (`epic pages link <page> --show`) |
| `${CLAUDE_PLUGIN_ROOT}` in a skill | the epic plugin's own folder, which Claude Code fills in | `epic guide --root` prints it:  read `${CLAUDE_PLUGIN_ROOT}` as that folder |
| the pause before a fresh start (`epic fresh all --pause`) | every session saves its agents and reports back | can't start one:  it needs Claude Code's session messages;  `epic fresh status` and `cancel` work anywhere |
| the epic hub's wake (the inbox poller's `Stop` hook, the `PostToolUse` hook) | wakes the session when the person sends, or hands it the Send at its next tool call | `epic inbox wait <epic>`, run yourself, in the foreground |
| the end-of-turn hook | commits and syncs the plans | `epic turn end` (Codex's hook runs it too) |
| `EnterWorktree` / `ExitWorktree` | moving the session into the epic's worktree | `epic worktree create <name>` (or `git worktree add`), then `cd "$(epic worktree path <epic>)"`;  leaving:  `cd` back to the main checkout |
| the window moves (`epic window handoff`, `launch`) | the session in the epic's VS Code window | print `epic window open <name>` for the person to run, and carry on where you are |
| session titles (`epic session title`) | the epic's name on the session | none needed |
| the Review tab (`epic open <epic>`) | the page beside the chat | `epic pages link <page> --show`:  open its browser link |
| the time on a phase (`epic phase ... took`) | read from Claude Code's transcripts | not counted for other agents yet |
