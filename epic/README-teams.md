# Epics with a team, and with other agents

Everyone runs their own agent and their own worktrees, and shares the plans.
This page is how joining, syncing and two people on one page work, and how Codex works on the same epic as Claude Code.

## <a id="working-with-others"></a>Working with others

Everyone runs their own Claude Code, their own epic server and their own worktrees.
What they share is the epic repo:  every turn pulls the others' changes in, and pushes yours out.

### A teammate joins

The same one command:  `epic init` finds the epic repo's address in the config the first person committed,
and CLONES it, beside the code repo:

```sh
git clone git@github.com:ana/my-app.git && cd my-app
npx spell@next epic init
```

- The plugin and the extension are set up on their machine by the same line.
- It asks your name and your colour, as it asked the first person, from any folder of the code repo:
  it finds the repo's main checkout from wherever it runs.
- The epic repo is private, unless the first person chose public:  they add each teammate to it on GitHub or GitLab,
  with write access, since every turn pushes.
- Joining needs no `gh` or `glab`:  plain git clones the epic repo.
  With one logged in, though, your short name defaults to your login there.
- The plugin step and the extension are once per machine, so a teammate does those too.

### Who you are

```sh
epic whoami
```

Your SHORT NAME is who you are on the epics:  what's stamped on your replies, comments, picks and log lines.
- It's the one you kept (`epic init` asks;  `epic whoami Ana` changes it),
  else your GitHub login, else git's `user.name`.
- Your full name is git's `user.name`;  the GitHub login is looked up once with `gh` and kept,
  so no page or hook waits on the network.
- `epic whoami --rename Ana Lima --dry-run` says what a new name would change:
  `--rename` writes it over your old one everywhere it says who wrote something, on every page.
- `epic whois Ben` lists what the pages say about Ben:  his replies and comments, by page, and when last.
- The AGENT under you is the one running `epic`:  what its words are stamped with, so Bob's Codex reads "Codex (Bob)".
  - Found from the mark each agent leaves on the commands it runs (Claude Code's `CLAUDECODE`, Codex's
    `CODEX_THREAD_ID`).
  - Another agent names itself with `SPELL_EPIC_AGENT=gemini`, set in its own settings.
  - None of them:  `claude`, and `epic whoami` says it guessed.

On a page, your own replies say "You", and everyone else's their name.
Claude's replies say "Claude", or "Claude (Ben)" when Ben's session wrote them,
so you can tell your Claude at work from his.

### Every turn syncs

At the end of every turn, Claude Code's or Codex's, a hook commits the epic repo, one commit per epic, guide or folder.
With an epic repo named in the config (`contentRemote`), the same hook then syncs it:
1. pulls, rebasing this machine's commits on top of the others'
2. renumbers any id both sides made (below)
3. pushes

`epic shared sync` does the same by hand:

```sh
epic shared sync
```

- Offline, the commits stay here, and the next sync pushes them.
- A repo whose config names no `contentRemote` only commits, every turn, and never pulls or pushes,
  even when its epic repo has a remote of its own.

### When two people edit one page

Most of it merges by itself, because a page is many small files:
- **Each item and phase is a file of its own**, so edits to different items never touch each other.
- **Ids made twice are renumbered.**
  - A new id is the highest plus one, so Ana and Ben can both make T22.
  - The sync gives THIS machine's one the next free number, T23, its file and every link to it following.
  - A log line says so:  "Renumbered as the plans synced: T22 → T23 (the same ids came from someone else first)".
  - An id you said in chat before the sync can change:  the log is where to look.
- **The log keeps both people's lines**, in time order:  git's `union` merge keeps both, and the sync re-sorts them.
- **Two items added at the same place**, or two "updated" dates, are settled by the sync:  both items, the later date.

Anything else, the same words changed two ways, is a real conflict:
- the sync undoes its rebase, keeps your commits here unpushed, and stops
- your next session starts by saying which files clash, and how to settle them
- to settle it:  in the epic repo, `git pull --rebase`, keep both people's words in each file, `git add` it,
  `git rebase --continue`, then `epic shared sync`

### Everyone sees every comment;  your agent answers yours

A comment you leave on a page is shared with the plans, the moment the turn's sync runs, answered or not.
- It's kept in a file of YOUR comments beside the page, `<page>.comments.<you>.json5`:
  only your machine writes it, so two people commenting never clash.
- A teammate's sync brings your thread to their page.
  They can reply on it;  their reply goes in their own file, and your sync brings it back.
- **Each person's agent answers that person's threads**, their Claude or their Codex.
  - Your Send hands your session only yours;  a teammate's waits for theirs.
  - The thread says whose agent took it:  "Claude (Ana): thinking…".
- Only the comment's writer edits, deletes or clears it.
- Two people adding a comment between syncs may both make `C4`:  the sync gives yours the next free number.
- `epic whoami --rename` moves your comments file to your new name, in one commit.

**Still on your machine:**  your marks (the pills you press on items), your Send, and who's listening,
in the page's review inbox, a file never committed.
What your agent makes of a mark lands in the epic page, under your name, which everyone shares.

## <a id="with-codex"></a>With Codex (or another agent)

```sh
epic guide --list
```

_The epic workflow, for an agent with none of the skills:  `epic guide` prints it, `epic guide build` one topic._

Bob uses Codex, Ana uses Claude Code, and they work the same epic:  the same pages, the same comments,
each answer stamped with whose agent wrote it, "Codex (Bob)".
Both run the same skills:  ONE copy of each, which Codex calls as `$epic review` where Claude Code says `/epic review`.
An agent with no skills at all gets the workflow from `epic guide`.

**Setting Codex up**, once per machine, after `epic init` (which puts `epic` on your `PATH`):

```sh
epic plugin install --codex
```

- It writes three hooks into Codex's own hooks file, `~/.codex/hooks.json` (`$CODEX_HOME` moves it):
  - as each turn ends, `epic turn end`:  the plans committed and synced, as Claude's turns do
  - as a session starts, two notices:  its worktree is behind `main`, or the last sync stopped on a conflict
- It links each of the plugin's skills into `~/.agents/skills/` (`$SPELL_EPIC_AGENTS_HOME` moves `~/.agents`), where the Codex CLI finds your own skills in every repo:
  the same files Claude Code reads, so an edit to one shows in both at once.
- It writes the plugin's two reviewers, the designer and coherence, as Codex custom agents in `~/.codex/agents/`:
  generated from Claude Code's agent files, so edit those and run it again.
- Your own hooks, skills and agents stay;  run again, it changes nothing.
- The Codex desktop app can add the plugin itself instead:  `epic/.codex-plugin/plugin.json` names the same skills and
  hooks.  With both, the hooks still run once:  a hook the plugin starts stands down while `~/.codex/hooks.json` runs it.
- **Codex runs a hook only once you trust it**:  `/hooks` in Codex, once, and again whenever the hooks change.
- Codex knows which agent it is by itself (it marks every command with `CODEX_THREAD_ID`).
  Another agent names itself with `SPELL_EPIC_AGENT=gemini`, set in its own settings.

**The skills in Codex.**
Type `$` and the skill's name, as `/` in Claude Code:
- `$epic review seo` takes your marks, comments and Sends from the page, as `/epic review` does;
  `$epic seo` plans or resumes one, `$wtf` says where things stand, `$details` asks a question on a page
- Codex also picks a skill by itself when the task matches it, as Claude Code does
- where a step needs something only Claude Code has, the skill says what Codex does instead, in a line beginning
  "In Codex:":
  - the question modal:  a numbered question in the chat (a details page works the same for both)
  - background agents:  Codex sub-agents, which it waits for, so the chat isn't free meanwhile
  - a worktree:  `epic worktree create seo`, then the agent works from the folder it prints
  - windows and messages to other sessions:  printed, for you to run or paste
- five skills stay Claude Code's:  `bg`, `bedtime`, `comment`, `session` and `title`
  - Codex never picks them by itself (each has an `agents/openai.yaml` saying so)
  - called by name, `$bg`, each says in its first line what to do in Codex instead
- `epic skills check` keeps the one copy honest:  it fails a skill naming a Claude-only tool with no "In Codex:" line
  beside it, and the `epic/` folder's tests run it

**What the agent runs**, in the workflow `epic guide` prints:
- `epic turn end`, as its turn's last step, when no hook runs it:  safe to run twice, quiet with nothing to do.
- `epic inbox wait <epic>`, to hear your Send:
  it waits until you press Send on the epic page, prints the work, and ends.
  - While it waits, the page says so after its review line:  "Your Codex is listening" (on Ana's page, "Bob's Codex").
  - Send never wakes a Codex that isn't waiting.
    With work sent and nobody listening, the page says "Your Codex isn't listening:  ask it to run `epic inbox wait seo`",
    and a click copies the command.

**Still Claude Code's only, for now:**
- the five skills above, and what the others do with Claude Code's own tools:
  `epic guide claude-only-tools` lists the plain way to do each
- waking a session from the page, session titles, window moves, and the worktree hooks
- the time a phase took counts only Claude's sessions

Untried so far with a real Codex:  the steps above are tested against stand-ins for Codex's files, hooks, skills and
agents.

## See also

- [README-epics.md](https://github.com/spell-app/spell/blob/main/README-epics.md):  what an epic is, why you'd want one, and the short version of all this
- [README-setup.md](README-setup.md):  setting a repo up first
- [README-pages.md](README-pages.md):  a review round, on the page you'll share
- [README-skills.md](README-skills.md):  which skills Codex runs
