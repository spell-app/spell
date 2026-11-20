# Epic FAQ:  when something goes wrong

Each entry is what you see, why it happens, and the command that fixes it.
They come from real trouble:  the papercuts and suspected-bugs logs, and the issues filed on epic `epic-engine`.

## Setting up

### `epic: command not found`

- Why:  `epic` is a link `epic plugin install` (or `npx spell@next epic init`) puts in `~/.local/bin`,
  and that folder isn't on your `PATH`.
- Fix:  add it, then open a new terminal.

  ```sh
  export PATH="$HOME/.local/bin:$PATH"
  epic whoami
  ```

- Without it:  `npx spell@next epic <verb>` runs any verb.

### `/epic` does nothing special, or a worktree lands in `.claude/worktrees/`

- Why:  the session started before the plugin was installed, so none of its hooks run.
  Claude Code made its own worktree, on a branch named `worktree-<name>`.
- Fix:  type `/reload-plugins` in that session, or start a new one.
  `epic window hooks` says whether this session's hooks are loaded.
- `/epic`, `/isolate` and `/unpark` check first, and stop with "Nothing was made" when they aren't.

### Superpowers plans its own design, worktree or finish

- Why:  with the superpowers plugin on, both want to plan and build.
- Fix:  `epic init --superpowers` writes a short block into your `AGENTS.md` saying where superpowers stands aside;
  in an epic's worktree the session-start hook says it too.
  Superpowers' own skills still work outside epics.

### Codex doesn't do what Claude Code does

- The same skills run in Codex, but five are Claude Code's alone (`bg`, `bedtime`, `comment`, `session`, `title`).
- Codex can't be woken by the page, or moved between windows.
- Fix:  `epic plugin install --codex` once, trust its hooks (`/hooks`), and end each turn with `epic turn end`.
  `epic guide` prints the whole workflow in plain steps;  `epic inbox wait <epic>` waits for your next Send.

## The pages

### The page doesn't load, or says the server is down

- Why:  the page server isn't running, or moved to another port after a restart.
  Every merge into `main` restarts it.
- Fix:

  ```sh
  epic hub ensure          # the epic server, port 4848
  spell server status      # inside Spell's own repo:  the page server, port 4747
  ```

- The side bar waits for a server that's restarting, and loads the page once it answers.

### The Review tab is empty

- Why:  nothing has been shown there yet in this window;  it remembers the last page per window.
- Fix:  `epic open <epic>` shows the epic's page there.
  The checklist button in the tab's title bar shows this window's epic.

### Pages are slow, or VS Code hangs on a long epic page

- Why:  a long page drew every item's buttons at once (epic `epic-engine` I333).
- Fixed:  items now draw their buttons as they come near the screen.
  Still slow:  fold the Log and the Phases you aren't reading;  the page remembers.

### A page shows old widgets after a merge

- Why:  the bundles a page loads are built from the code, and one is stale.
- Fix:  the page server rebuilds a stale bundle when it starts, and the page reloads by itself.
  By hand:  `spell bundle --stale`.

## Reviewing

### Accept Overview (or Accept Phases) shows a green ring for five minutes

- That's on purpose:  a press waits five minutes before it's sent, so you can change your mind.
- Press it again to take it back.  Nothing you type resets it.
- Closed the page?  It goes when the page opens again.

### Send, and Auto Send

- Send hands everything you marked to the epic's session.
- Auto Send sends by itself after a pause:  Immediately, 2 minutes (the default), 5 minutes, or Off, in the page's gear.
- The ring round the plane counts down;  it turns while the session works through what you sent.
- It waits while you're typing in a field.

### "nobody is listening"

- Why:  no session holds the epic's inbox.
- Fix:  press Send anyway:  it wakes the epic, typing into its session or starting one in its window.

## Running work

### A run stops on a permission prompt

- Why:  Claude Code asks before commands its permission settings don't allow, and an agent waits for your answer.
- Fix:  answer it in the Claude panel.
  To ask less often, allow the read-only commands you trust:  Claude Code's `/fewer-permission-prompts` writes them.

### An agent was cut off by a restart

- Why:  background agents end with their session:  a window reload, a move to another window, a crash.
- Fix:  start it again (`/epic resume <epic>`);  its work so far is in its worktree and on the epic page.
  `epic agents` lists the agents the page still thinks are running.

### "the test turn is stuck"

- Why:  one test run at a time per machine (`epic turns`);  another agent's run holds the turn, or died holding it.
- Fix:  `epic turns` names who holds it and since when.
  A live run:  wait.  A dead process:  the next run takes the turn over by itself.

### A merge is refused for uncommitted files

- Why:  `epic merge` won't move `main` over files you changed there and didn't commit.
- Fix:  commit or stash them in `main`.
  - Generated output (bundles, snapshots) it moves aside by itself, into `~/.spell-epic/ditched/`.
  - Up to 3 hand-made files:  `epic merge <epic> --ditch` moves them aside too.

### A worktree window didn't open, or the session didn't move

- Why:  the move is done by the end-of-turn hook;  with the plugin's hooks not loaded, nothing moves.
- Fix:  `/reload-plugins`, then try again.
  Or `epic window launch <name>`:  a new session in the epic's window.

### `claude -p` with the plugin never starts

- Why:  the plugin's inbox listener waited for a Send that a scripted session never gets (epic `epic-engine` I319).
- Fixed:  the listener stands down in a `claude -p` session.
  On an older plugin:  `epic plugin install` again.

## The epic repo

### Commits I didn't make, "auto: epic ..."

- That's the epic repo (your plans' own git repo), committed at the end of every turn.
- With a remote (`contentRemote`), each turn also pulls and pushes it.
- Never `git add` its files by hand;  never run git inside its folders.

### "Edit the worktree copy of this file instead"

- Why:  the plans live in the epic folder, reached from a worktree through a link, and Claude Code won't write through it.
- Fix:  edit at the real path, `$(epic config contentFolder)/<path>`.

## See also

- [README-epics.md](https://github.com/spell-app/spell/blob/main/README-epics.md):  what an epic is
- [README-setup.md](README-setup.md):  setting a repo up
- [README-config.md](README-config.md):  every setting, and what's still rough
