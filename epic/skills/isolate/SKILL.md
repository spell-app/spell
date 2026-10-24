---
name: isolate
description: Move this session into its own git worktree `<name>` (worktree, branch and session all named `<name>`) and either open it in a new, tinted VS Code window or stay in this one (Owen picks, `should-stay` recommends);  `/isolate done` offers to merge it into `main` and to open a pull request for it, then leaves it.  Use for `/isolate <name>`, `/isolate done`, or when Owen says "isolate as <name>" / "isolate this" about the current session.
argument-hint: <name> | done
---

# /isolate

Work in worktree `<name>`, so this session's edits never collide with another session's.
- Its folder:  `epic worktree path <name>` prints it.
  - `.claude/worktrees/<name>`, or beside the repo (`../<repo>.worktrees/<name>`)
    once its `.epic/config.json5` moves them (`worktreesFolder`, epic `epic-eject` P8).
- The worktree, its branch and the session share one name.
- `/epic` runs these steps too.
- The session either moves to a NEW window of the worktree's own, or STAYS in this one.
  Owen picks, each time (step 2b).

## A multi-repo top

When `epic config repos` prints names, the repo is a MULTI-REPO top, or a child repo of one (`~/www/spell` and the
repos cloned in it, its `.epic/config.json5`'s `"repos"`;  epic `epic-engine` P10).  Then:
- The worktree is the TOP's:  `epic worktree path <name>` prints `~/www/spell.worktrees/<name>`, a git worktree of the
  top with a git worktree of EVERY child repo inside it, at the same folder names, ALL on branch `<name>`.
  - The `WorktreeCreate` hook makes them all, and runs ONE install, at its top;  then one in each folder that's a yarn
    project of its own (`epic config extraInstalls`:  the `vscode/` extensions).
  - The top is the kit, `spell` (its own folders `util/`, `server/` ... at its root):  its changes are commits in
    the top's worktree, like any child's.
  - Each repo is its own git repo:  run git in the repo's folder (`git -C <name's folder>/spell-ui ...`).
- `epic worktree repos [<name>]` lists each repo's checkout:  its branch, how far it is ahead of and behind its
  `main`, and what's uncommitted.  `--json` for the numbers.
- What changes below, step by step:  each step that says "the worktree" or `main..HEAD` means EACH repo `repos`
  lists;  the commands that loop over the repos themselves are named there.
- A single repo (any other setup):  every step as written, for its one checkout.

## Start:  `/isolate <name>`

0. Checks and rename, BEFORE anything else.
   - A typed `/isolate <name>` got them already, from the repo's `UserPromptSubmit` hook:
     it renamed the session after it, or blocked the prompt.
     - The hook:  [prompt-gate.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/prompt-gate.mjs);  read its header.
   - "Isolate as <name>" in plain words never reaches the hook, so do its checks here:
   - in plan mode:  it's read-only apart from the plan file.
     - So `EnterWorktree` can't run, and ExitPlanMode would ask to APPROVE a half-made plan.
     - Ask the user to leave plan mode (shift+tab);  the plan file survives.
   - in another worktree:  the session's folder is in worktree `<other>`, or its window is a worktree's.
     - the folder:  `.claude/worktrees/<other>`, or beside the repo
     - the window:  `epic window which` prints a `workspace` under an `ongoing/` folder
       (`$(epic config windowsFolder)/ongoing/`, or the old `workspaces/ongoing/`)
     - `<other>` isn't `<name>`:  stop, saying so in one line
       ("`/epic done` there first, or start from a package window";  `/isolate done` for a worktree no epic owns).
   - ANOTHER REPO's epic (epic `epic-engine` I47):  `epic list --json` gives `<name>` a `repo`
     (its page says it's worked in another repo:  `epic-engine` typed in spell-app's window).
     - Stop:  no rename, no `EnterWorktree`.
       The `WorktreeCreate` hook refuses that worktree here anyway, saying where it belongs.
     - AskUserQuestion "Open `<name>` in its own window?", then `epic window launch <name> --prompt "/isolate <name>"`
       (it finds the epic's repo from here).
     - The prompt hook's note says the same for a typed `/isolate <name>`.
   - rename:  `epic session title "🚧 <name>"`.
     It lands on the next prompt, or when the session opens in its new window.
   - a saved prompt, `~/.spell/prompts/<name>.md`:  it's the task to carry on with once isolated.
     - The hook saved it while blocking an earlier `/isolate <name> ...`.
     - Delete it once done.

   Already mid-work ("isolate as <name>" in a running session):
   - edits already made in the main checkout won't follow:  the worktree is cut from COMMITTED `main`.
     - Shared content does follow, and `git status` never lists it.
       `epics`, `guides`, `pages`, `templates`, `goals` and `agents` are links in every checkout
       into the content folder (`epic config contentFolder`).
     - List the edits (`git status --short`) and AskUserQuestion, options:
       - "Carry them over"
       - "Commit on `main` first" (stage, then ask)
       - "Leave them"
     - Carry over with a TAGGED stash:  the stash stack is shared with every worktree.

       ```sh
       git stash push -u -m "isolate:<name>"     # here;  its sha from:
       git stash list --format='%H %gs'
       git stash apply <sha>                     # in the worktree, after step 3;  then drop that entry
       ```

1. `<name>` is `$ARGUMENTS`, or the `<name>` in "isolate as <name>".
   - Lower-kebab-cased:  `Docs Index` -> `docs-index`.
   - No name:  propose one from the work so far in AskUserQuestion;  the user can type another.
   - Then rename (step 0's `epic session title`), since the hook only renames a name it was given.
2. Collisions, from the repo root:
   - a worktree at `epic worktree path <name>` (`git worktree list`)
   - a branch `<name>` or `worktree-<name>`
   - Any hit:  AskUserQuestion, options "Reuse `<name>`" and "Different name" (typed in "Other").

2b. Where:  `epic window should-stay` prints `recommend stay|window`, and why.
   - From `/epic`, add `--epic`.
   - AskUserQuestion "Where should `<name>` run?", its reasons in the question,
     the recommended option first, with "(Recommended)":
   - "New window `⎇ <name>`":  steps 3-6.
     - Tinted, with Explorer and Source Control on the worktree.
     - This window keeps its other sessions.
   - "Stay in this window":  step 3, then "Stay" below.
     - No move, same tab.
     - Its changes show in Source Control, not in Explorer
       (each worktree is its own repo there:  `git.detectWorktrees`).
     - The window is retitled `⎇ <name>` and tinted (`stay`).
   - Why ask:  staying is quicker, and touches nothing else when this is the window's only session.
     - With others, they share its doc preview and Source Control.
     - [window.mjs](${CLAUDE_PLUGIN_ROOT}/src/window.mjs), "Staying put"
3. `EnterWorktree` with `name: "<name>"`.
   - Reusing one:  the same, by `name`:  the worktree hook finds it.  NEVER `path` (epic `epic-engine` P16):  Claude
     Code asks Owen before entering a path outside `.claude/worktrees/`, every time.
   - Already in it (`pwd` is in that folder:  a new tab of the worktree's window):  NOT again.
     - Entering again would be a no-op at best (epic `epic-engine` P12, r11:  "You keep asking for permission to
       EnterWorktree, it has to stop").
     - The session-start guard records a session started in a worktree
       ([worktree-guard.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/worktree-guard.mjs)), and tells one reopened outside it to
       enter:  only then does it ask, once (epic `epic-eject` I3).
     - It isn't:  a reopened session outside its worktree, or a new tab inside one.
     - Do what it says first.
   - The repo's `WorktreeCreate` hook ([worktree.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/worktree.mjs))
     makes it on branch `<name>`, from local `main`.
   - It keeps this session listed in every window.
4. Open it in its own window, from the worktree's root (the root `AGENTS.md`, "Worktrees"):
   - `epic window open <name> [--color <look>]`:  a NEW window.
     - Its file:  `$(epic config windowsFolder)/ongoing/<name>.code-workspace`, each machine's own, never committed.
     - Its look:  this window's, or `<look>`'s, one of the 12 of `epic window color`.
       - e.g. `/isolate <name> -purple`, `/epic <name> -purple` (epic `windows-and-review` P5)
     - Its folders:
       - a worktree beside the repo:  `⎇ <name>` and the content folder only
         - every session listed through its linked session folder (`linkSessionFolders`)
       - a nested one:  the MAIN root (so every session is listed), then the worktree's root, `⎇ <name>`
     - `<pkg>`:  this session's window's.
   - This isn't a package window (a worktree's ...):  `open` takes the whole repo's window and its look
     (`epic config windows`, its `default`).
     - Never ask which package (Owen, 2026-10-07).
     - `--pkg <pkg>` only when Owen names one.
   - `epic window` works before the worktree's install (`epic config installCommand`).
     - `epic` is the plugin's, with its own packages.
   - It fails otherwise:  say so in one line, skip step 5, and do "Continue" now, in this window.
     - NEVER `code --add` / `-r`:  they restart the Claude panel, or target the focused window.
5. Move the session there:  `epic window handoff <name> --prompt continue`.
   - When this turn ends:
     - the new window opens the session in an editor tab (never the sidebar)
     - `continue` is typed into its input
     - this window closes its tab
   - The move itself is the `Stop` hook's ([handoff.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/handoff.mjs)).
   - A doc shown from here on (`epic open`) waits for the move,
     then shows beside the session in the new window.
   - It fails:  say so in one line, and do "Continue" now, in this window.
6. END THE TURN now, so the move happens at once.
   - Nothing else this turn:  no install, no exploring, no questions.
   - One line:  "isolated in worktree `<name>` (branch `<name>`);  moving to `⎇ <name>`:
     press enter on `continue` there".
   - Why:  the move waits for the turn to end, and Owen waits for the move.

## Stay:  in this window

After step 3, when Owen picked "Stay in this window":  no `open`, no `handoff`, no turn end.

0. `epic window stay <name>`:  the window says so at once.
   - It's titled `⎇ <name>`, its title bar tinted:  no reload, the Claude panel untouched.
   - `-<look>` given:  `epic window color <look>` too.
1. "Continue" below, steps 2-4, at once, in this turn.
2. One line:  "isolated in worktree `<name>` (branch `<name>`), staying in this window;
   its changes are in Source Control under `<name>`".

- Later, to move after all:  steps 4-6, any time.
  - That's `open <name>`, `handoff <name> --prompt continue`, then end the turn.

## Continue:  the first turn in the new window

The turn after step 6, whatever Owen sends (`continue`, typed in by the move, or anything else):
1. Old tab still open in the old window (its title didn't match):  say so in one line, close it by hand.
   - The log is `~/.spell/windows/handoffs/<session id>.log`.
   - Only after a move:  "Stay" skips this.
2. No `node_modules/` at the worktree's root:  run the install command, `epic config installCommand`.
   - In spell-app, `yarn install`:  a few seconds.
   - With `installOnCreate` on, the worktree hook already ran it, before the window opened (I2).
   - It prints an empty line (a repo with nothing to install, as `epic init` finds it):  skip this step.
3. Title the session again, whatever it seems to be:  `epic session title --force "🚧 <name>"` ("Session name" below).
   - A session reopened in a new window may show Claude's own title, though its transcript has its name (epic
     `epic-engine` r2).  The move queued it already, for the `continue` it typed;  this costs nothing.
4. Carry on, with the first of these there is:
   - the saved prompt `~/.spell/prompts/<name>.md`, then delete it
   - the work under way (mid-session)
   - `/epic`'s next step
   - Nothing to carry on with:  one line, "ready in `<name>`".

## Session name

The session MUST stay titled `🚧 <name>` while its work is under way.
- Other icons (Owen, 2026-10-07):
  - `📅 <name>`:  a future epic written down
  - `✅ <name>`:  merged (`epic session done`)
- Why:  the handoff finds its old tab by title,
  and Owen finds it in the panel's list by name, its icon saying where it stands.
- It drifts:  Claude's own title ("Doc-plan SEO") wins when the hook never ran, or Owen renamed it.
  - The hook never runs for a plain-words "isolate as ...", or a resumed or reopened session.
- Check, and rename if needed, whenever an isolated or epic session STARTS or RESUMES work:
  - "Continue" above (the first turn in the new window)
  - each `/epic` phase start ("5. Each phase", step 1;  Doc Review is a phase too)
  - [the park skill](../park/SKILL.md)'s "Resume" (`/unpark`, `/wait-for`)
  - Owen reopening the session to carry on ("start P3", "continue")
- How:  `epic session title "🚧 <name>"`.
  - It checks first:  its tab already shows `🚧 <name>` (or it's queued), it does nothing.
    - "Shows":  the session's running record says so, else its transcript's LAST title line is `🚧 <name>`.
      Claude's own title written after it may be what the tab shows.
  - Else it queues it, which lands on Owen's NEXT prompt.
  - `--force`:  queues it all the same.  "Continue" and a resume use it.
  - The prompt hook titles a typed `/isolate`, `/epic` or `/unpark <name>` so by itself.
  - Renamed:  one line, "session renamed `🚧 <name>` (was "<old>");  shows on your next message".
  - `epic session title` alone shows the current title, and any queued one.
- `<name>`:  the worktree's (`epic worktree path <name>`), which is the branch's and the epic page's.

## Merge, keep:  a standing epic

A STANDING epic merges each phase into `main` at once, and never leaves its worktree:  NOT "Finish" below.
- It's marked `<epic-page standing>` (epic `epic-workflow`).
- The steps:  [the epic skill](../epic/SKILL.md), "5. Each phase", step 5 ("A STANDING epic").
- In short:
  1. `merge-main`, if `main` moved
  2. `epic merge <name>`, from the worktree:  it moves the MAIN checkout's `main`
     - no `ExitWorktree` and back:  entering asks Owen every time (epic `epic-engine` P12)
- `/isolate done` in a standing epic's session:  say it stands, and ask first ("Stop standing, and finish?").

## Finish:  `/isolate done`

0. Not in a worktree:  say so in one line, then offer to clean up.
   - Not in one:  the session's folder isn't a worktree's, in `.claude/worktrees/` or beside the repo.
   - Candidates, from `epic worktree list`:  each worktree `<name>` that
     - no session is in:  under "No session in" from `epic worktree list`.
       Why:  a fresh worktree has nothing outside `main` either, but its session is still using it.
     - has nothing uncommitted:  `git -C "$(epic worktree path <name>)" status --short`, fine from the main checkout
     - has nothing outside `main`:  `git log --oneline main..<branch>` empty.
       An agent's `<owner>-agent-<id>` (below):  or nothing outside branch `<owner>`.
   - None:  stop.
   - Else AskUserQuestion, multi-select, one option per candidate:  "`<name>` (`<branch>`)".
     - It takes 2-4 options, so one candidate is "Remove `<name>`" / "Keep it".
     - More than 4 go in several questions.
   - For each picked:
     - `epic worktree remove <name>`:  its page and vite servers stopped first, then git's remove
       - never a bare `git worktree remove`:  it leaves them running (epic `epic-engine` I53)
       - a multi-repo top:  every child repo's worktree, then the top's;  `--branches` deletes each repo's merged
         branch too, in place of the `git branch -d` below
     - `git branch -d <branch>`
       - `-D` for an agent's branch that's only in `<owner>`, since `-d` checks against `main`
   - Then stop:  steps 1-8 are for a session IN a worktree.
1. Report what's uncommitted and unmerged in the worktree:
   `git status --short`, `git log --oneline main..HEAD`.
   - A multi-repo top:  `epic worktree repos`, then those two in each repo it lists ahead or uncommitted.
     A repo the epic never touched (0 ahead, nothing uncommitted) is left out of every step below.
   - Commit only as the root's rules allow (stage, then ask).
2. Unmerged commits (`main..HEAD` not empty):  AskUserQuestion, listing the commits in the question.
   - "Merge `<name>` into `main`?", options "Merge now" and "Leave unmerged"
   - On "Merge now", get the BRANCH ready to fast-forward `main`.
     All from the worktree:  branches are shared, so `main` is visible here.
   - NEVER `git -C <main checkout>` or `cd` there:  a worktree session refuses both.
     `main` itself moves in step 7.
   - First, the changelog, if the repo keeps one (its root `AGENTS.md` says where and how):
     add or move this branch's entry.
     - It's shared content:  write it straight in, nothing to commit on the branch for it.
     - It's committed for you at the turn's end.
   - A worktree cut before 2026-10-04:  `epic shared migrate <name>` first.
     - How to tell:  `epic shared status` shows its folders `tracked`, not `ok`.
     - `--dry-run` shows what it moves.
     - Else merging `main` drags its old tracked copies of the docs, goals and logs into conflicts.
   - A multi-repo top:  `epic worktree merge-main` merges EVERY repo's `main` into its `<name>` branch, a line per
     repo saying what it did;  run the `merge-tree` check below in each repo `epic worktree repos` lists behind
     first.  A repo that stopped on conflicts, or FAILED, is named:  fix it in that repo's folder, then
     `epic worktree merge-main --continue` (it goes on only where a merge is in progress).
   - `git log --oneline HEAD..main` empty (`main` hasn't moved):  ready, go on to step 4.
   - Else `git merge-tree --write-tree --name-only main HEAD`, which merges without touching any files:
     - exit 0, or conflicts ONLY in generated files:  `epic worktree merge-main`, then step 4.
       - No asking (Owen, 2026-10-03);  say in one line what it regenerated.
       - Generated:  the files the checkout's `.epic/generators.json5` lists.
         In spell-app:  the root `.gitattributes`' `merge=binary` paths (bundles, site and brand assets, snapshots),
         and `yarn.lock`.
       - `merge-main` rebuilds each one both sides changed, from the merged source,
         with the command the checkout lists for it, in `.epic/generators.json5`.
         Then it commits the merge ("Merge main into `<name>`").
       - Its `REVIEW` lines:  snapshot entries with a value NEITHER side had, i.e. new behaviour nobody looked at.
         Show each to Owen, in bold, in the summary.
       - It fails (a generator errors):  the merge is left in progress.
         Fix the cause, then `epic worktree merge-main --continue`;
         or `git merge --abort` and step 3's "Can't fix them".
     - Other files conflict:  step 3.
   - Nothing unmerged:  skip this step and say "nothing to merge".
3. Merge conflicts in other files (code, skills, docs prose).
   - These can't conflict any more:  the logs (`agents/*.md`), the changelog, the docs' home page and epic pages.
     - They're shared content, untracked by the repo.
     - One in conflict means a worktree not migrated yet (step 2).
   - AskUserQuestion, listing the conflicting files, options:
     - "Fix conflicts, then merge":
       - `epic worktree merge-main`:  it stops mid-merge, listing them
       - resolve each file, keeping BOTH sides' intent, and `git add` it
       - run the checks of each package the conflicts touch (its `AGENTS.md` says which), if installed
       - `epic worktree merge-main --continue`:  regenerates the generated files and commits the merge
         (the answer counts as the ask), then step 4
     - "Exit anyway":  go on to step 4, unmerged
     - "Stay isolated":  stop here, still in the worktree
   - Can't fix them:  keeping both sides needs a decision only the user can make, or the checks fail.
     - `git merge --abort`, say so, and list each file and why.
     - Then AskUserQuestion "Continue exiting?", options "Exit, unmerged" and "Stay isolated".
4. Pull request:  an offer, ASKED first, since pushing publishes the branch on GitHub.
   - Only when GitHub's `main` is up to date with local `main` (Q16 of `review-review`, answer C).
   - All from the worktree.
   - `git fetch origin main`, then `git rev-list --count origin/main..main`:
     how far the local one is ahead of GitHub's.
     - Not 0:  NO offer;  say why in one line, e.g.
       "No pull request:  GitHub's `main` is 62 commits behind local `main`,
       so a PR would list all 62 as well as this branch's.  Push `main` first if you want one."
     - NEVER push `main` from here.
     - The fetch fails (offline, not signed in):  "No pull request:  couldn't reach GitHub (<the error's gist>)".
   - `git rev-list --count origin/main..HEAD` is 0:  nothing GitHub lacks, so nothing to show.
     Skip, silently.
   - `gh pr list --head <name> --state open --json number,url`:
     one open already, so the offer is to push the branch, which updates it.
   - AskUserQuestion "Open a pull request for `<name>` on GitHub?",
     saying how many commits it shows and that pushing publishes them.
     - Options:  "Push and open a PR", and "No PR".
     - When one is open, the first is "Push `<name>` (updates PR #<n>)".
   - On yes:
     - `git push -u origin <name>`:  never `--force`.
       Refused:  say why, and stop the offer there.
     - Unless one was open, `gh pr create`:

       ```sh
       gh pr create --base main --head <name> --title "<title>" --body-file <file in the scratchpad>
       ```

       - Title:  the branch's changelog entry's header without its date
         (`2026-10-05 · Review Review` -> `Review Review`).
         No entry (left unmerged):  the epic page's title, else the branch name.
       - Body:
         - the entry's bullets, as a markdown list (`- ...`)
         - plain text:  its links point into shared docs, which aren't on GitHub
         - then the attribution line the session's instructions give for pull requests
     - One line with the PR's URL.
   - Merged later (step 7) and `main` pushed:  GitHub marks the PR merged by itself, its commits being in `main`.
5. NO move back:  the session stays in the window it's in (the worktree's, or the one it stayed in).
   - Why:  Owen (2026-10-03) "we don't need to go back into the originating window.
     That's just confusing things".
   - The worktree's window stays open for Owen to read the summary;  he closes it.
   - Its file goes with `epic window close <name>` later, or `/worktrees` lists it.
     That file:  `$(epic config windowsFolder)/ongoing/<name>.code-workspace`.
   - NEVER `handoff <name> --back` from here.
   - It STAYED in its window ("Stay" above):
     `epic window stay --end` puts the window's title and title bar back.
     It says "nothing to put back" when there's nothing.
6. `ExitWorktree` with `action: "keep"`:  the worktree and branch stay, and the session is back in the main checkout.
   - Never `remove` unasked.
   - On a hook-made worktree, `remove` refuses without `discard_changes` anyway.
7. Merging, only after "Merge now" got the branch ready.
   Now in the main checkout:
   - `epic merge <name>`:  it checks the main checkout is on `main`, with nothing uncommitted (another session may be
     working there), then fast-forwards.
     - Stray files there:  as the epic skill's "5. Each phase", step 5 says (a snapshot moved aside by itself;  a few
       others only once Owen says so, `--ditch`).
     - Refused (`main` moved since step 2, somebody's work there):  say so, and don't merge.
     - A multi-repo top:  `epic merge <name>` in the main TOP checkout.
       - It fast-forwards ONLY the repos whose `<name>` branch has commits beyond their `main`, each in its own
         main checkout, after checking them all (on `main`, clean, holding all of `main`):  one failing check
         merges nothing, and says which repo.
       - A line per repo it moved.
     - `/isolate <name>` re-enters the worktree to merge `main` in again.
   - Merged:  `epic session done`.
     - This session's name gets a ✅ (`✅ <name>`), so the Claude panel tells finished work from live work.
     - It shows after Owen's next message here:  a hook applies it, and nothing else can.
     - `/isolate <name>`, `/epic <name>` or `/unpark <name>` takes it off again (epic `windows-and-review` P6).

7b. Agents' worktrees, WITHOUT asking (Owen, 2026-10-05), now in the main checkout.
   - An agent this session started with `isolation: "worktree"` (an epic's phases) got a worktree of its own.
     - worktree and branch `<name>-agent-<id>`, beside `<name>`'s
     - The `WorktreeCreate` hook names it for its owner.
   - It was kept when the agent finished, because its commits weren't in `main` yet.
   - For each in `git worktree list`:
   - Remove it when it's clean and its commits are in `<name>`:
     - clean:  `git -C <path> status --short` empty
     - in `<name>`:  `git log --oneline <name>..<branch>` empty
     - then `epic worktree remove <path>` (its servers stopped first), and `git branch -D <branch>`.
       `-d` checks against `main` only;  the `log` check is the safety.
   - Else keep it, and list it in step 8 with why (uncommitted files, or commits `<name>` lacks).
   - A pre-2026-10-05 agent worktree is plain `agent-<id>`.
     Remove it on the same checks when its branch is in `<name>`:
     `git merge-base --is-ancestor <branch> <name>`.
8. One line;  in a worktree's window, plus "close this window when you're done with it".
   - Merged:  the worktree can go (`epic worktree remove <name>`, `git branch -d <name>`).
     - A multi-repo top:  `epic worktree remove <name> --branches`:  every repo's worktree, children first, and its
       merged branch.
   - Not merged:  how to merge later (`git merge <name>` from the main checkout), then the same cleanup.
   - Agents' worktrees:  how many step 7b removed, and any it kept.
   - Then close the reply as "Closing line" below says.

## Closing line

A reply that closes out the session's work ends with a line of its own, `*You can close this tab*`
(Owen, 2026-10-07;  leaving a worktree added 2026-10-17, epic `epic-eject` r1).
- Closing out, any of:
  - merged, or the worktree gone
  - a worktree LEFT (`ExitWorktree`, keep or remove)
  - `/isolate done`
  - a `/bedtime` night reviewed ...
  - Leaving counts with or without this skill:  a bare `ExitWorktree` too.
    - The plugin's `PostToolUse` hook on it reminds the session of this section:
      [left-worktree.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/left-worktree.mjs).
- Only when nothing is left for THIS session:
  - no uncommitted or unmerged work
  - no background task or agent still running
  - no question waiting on Owen
  - Open items may remain only if they're recorded elsewhere (the epic page, the code-debt log ...)
    and need no context from this session.
- Otherwise leave the line out, and say what keeps the tab open.
- With the line, ALSO ask (AskUserQuestion) whether to finish, when either is still on disk:
  - this session's worktree (left with `keep`)
  - worktrees it made and left:  its step 0 cleans those up
  - Options:  "Run `/epic done`" (Recommended) and "Leave it", in an EPIC's session (its worktree is an epic's;
    Owen, 2026-10-24:  an epic's prompts say `/epic done`, never `/isolate done`);  "Run `/isolate done`" otherwise.
- A repo's own `CLAUDE.md` may say the same:  spell-app's does.
