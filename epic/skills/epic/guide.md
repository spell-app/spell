# Working an epic, with any agent

The epic workflow in plain steps, for any agent:  Codex, Claude Code, or another one.
`epic guide` prints it;  `epic guide <topic>` prints one topic.
- An EPIC is a piece of work and its plan.
  Its live record is the EPIC PAGE, `epics/<epic>/<epic>.plan.html` in the content folder (`epic config contentFolder`):
  the person reads it, and marks it up, while you work.
- Every change to the page goes through an `epic` command, never by hand,
  except the prose of a part (`epics/<epic>/parts/<id>.html`).
- The content folder is a git repo of its own.
  Never `git add`, commit or restore its files:  `epic turn end` commits and syncs them.
- Claude Code has a skill for each step (`/epic`, `/epic review` ...):  this guide is the same workflow without it.
  The skill links here, and where a step needs a tool only Claude Code has, the last topic says what to do instead.

## workflow -- The loop, start to finish

1. Find the epic and read its page (`epic guide find`).
2. Plan:  the Overview, then the phases, then a build plan for each, each accepted by the person on the page
   (`epic guide plan`).
3. Build the phases in order:  mark each active, do the work, record what you decide and find, mark it done
   (`epic guide build`).
4. Between turns, take what the person sends from the page:  marks, comments, requests (`epic guide review`).
5. End EVERY turn with `epic turn end` (`epic guide turn`).
6. Finish:  the Doc Review phase, then the merge (`epic guide done`).

## find -- Find the epic and its page

```sh
epic list                         # every epic:  status, where it runs
epic summary <epic>               # its phases, the next one, open questions, issues, todos, manual tests
epic items <epic> --json          # where each item stands
epic config contentFolder         # where the pages are
epic pages link <page> --show     # the page's links, to give the person
```

- Work in the epic's own worktree when it has one:  `epic worktree path <epic>` prints it.
- Read the page (its file, and its parts in `parts/`) before you change anything.
- The rules for writing on it:  `epic pages template epics/plan-doc.md` prints their file.

## plan -- Plan an epic

1. A new epic:  `epic create <epic> --title "Title" --prompt "what was asked"`.
2. Write the Overview into its parts:  what's asked, the questions to settle, the choices.
   - A question:  `epic add <epic>#Q "title" --details "<p>...</p>"`;  the person answers on the page.
3. Once the person accepts the Overview, add the phases:
   `epic add-phase <epic> "Short Name" --symptom "..." --changes "..." --goal "..." --files "..." --verify "..."`.
4. Write each phase's build plan, ALL of them up front:  `epic update <epic>#P1 --plan "<ol>...</ol>"`.
   The person accepts each on the page (Accept plan);  build none before it's accepted.

## build -- Build a phase

1. `epic phase <epic>#P3 active`, and the page's line:  `epic inbox status <epic> "Building P3"`.
2. Check the accepted plan still fits.
   - A small change:  `epic updated <epic>#P3 "<p>what changed</p>" --summary "Plan adjusted:  ..."`.
   - A big one (scope, a choice the person made):  write the plan again (`--plan`) and stop for them.
3. Do the work.  Record as you go:
   - a problem found:  `epic add <epic>#I "title" --calm --details "<p>...</p>"`
   - a choice made without the person:  `epic add <epic>#J "title" --calm --details "<p>...</p>"`
     (red, without `--calm`, only when it goes against what they said, or needs their answer)
   - a limit you accept:  `epic add <epic>#T "title" --limit`
   - something only the person can check:  `epic add <epic>#M "title" --step "..." --should "..."`
   - an item you're working on:  `epic inbox working <epic>#I3 on`, `off` when done
4. Commit the code by path, the message starting `<epic> P3:  ...`, and list it:
   `epic commit <epic>#P3 <sha> "what it did"`.
5. `epic phase <epic>#P3 done`, and `epic inbox status <epic> --clear`.

## review -- Take what the person sends from the page

The person marks items, leaves comments and presses Send on the epic page.
Nothing reaches you until you look:
- `epic inbox <epic>`:  what's waiting, sent or not.
- `epic inbox wait <epic>`:  waits until they press Send, prints the work, and exits 0;
  exit 2 after 55 minutes with nothing (`--timeout 2h` for longer).
  - While it waits, the page says so:  "Your Codex is listening".
  - Without it, the page says to ask you to run it.

Then, for what it printed:
1. `epic inbox status <epic> "Responding" --items <ids>`.
2. Requests for now (Add Details, revisit now):  per item,
   `epic update <epic>#J3 underway "<what you take it to be>"`, write the answer
   (`epic details <epic>#J3 --append --file answer.html`;  `--more` for Add Details),
   `epic update <epic>#J3 noted "<what was written>"`, then `epic inbox done <epic>#J3`.
3. Sent marks:  `epic inbox apply <epic>` lands approvals, picks and todos.
   A revisit left "to talk over":  answer its note into the item, as above, then `epic inbox clear <epic>#J3`.
4. Comments:  `epic inbox working <epic>#C3 on`, answer into the item it's on,
   then `epic inbox done <epic>#C3 --file answer.html`.
5. `epic inbox status <epic> --clear`, then `epic inbox wait <epic>` again, unless they said stop.

## turn -- End every turn

```sh
epic turn end
```

- It commits the content folder's changes, one commit per epic, guide or folder, then syncs them with the team's
  content repo when the repo's config names one (`contentRemote`):  pull, renumber ids two people both made, push.
- Quiet when there's nothing to commit;  safe to run twice.
- Claude Code and Codex run it for you, from their end-of-turn hooks, once the hooks are installed and trusted
  (`epic plugin install`, `epic plugin install --codex`).
  Any other agent runs it itself, as its turn's last step.

## done -- Finish an epic

1. The Doc Review phase:  the epic's guide, its changelog entry, and every doc it touched made true to what was built.
2. Merge the worktree's branch into the base branch, when the person says so, and remove the worktree:
   `epic worktree remove <epic>`, never a bare `git worktree remove`.
3. Say what shipped, with the page's links (`epic pages link <page> --show`).

## claude-only-tools -- What Claude Code has, and what any agent does instead

The epic skills lean on Claude Code's own tools.
Without them, every step still works:

| Claude Code's | What it's for | Any agent instead |
| --- | --- | --- |
| the question modal (`AskUserQuestion`) | a quick pick or yes / no | ask in the chat, the options numbered |
| a details page (`/details`) | a question that needs a picture | `epic ask create <slug>`, then `epic ask wait <slug>` |
| background agents (`Agent`) | several items answered at once | answer them one at a time, in this session |
| the inbox poller (its `Stop` hook) | wakes the session when the person sends | `epic inbox wait <epic>`, run yourself |
| the end-of-turn hook | commits and syncs the plans | `epic turn end` (Codex's hook runs it too) |
| `EnterWorktree` / `ExitWorktree` | moving the session into the epic's worktree | `cd "$(epic worktree path <epic>)"` |
| the window moves (`epic window handoff`) | the session in the epic's VS Code window | open the worktree yourself |
| session titles (`epic session title`) | the epic's name on the session | none needed |
| the Review tab (`epic open <epic> --review`) | the page beside the chat | `epic pages link <page> --show`:  open its browser link |
| the time on a phase (`epic phase ... took`) | read from Claude Code's transcripts | not counted for other agents yet |
