# Working with coding agents

Spell is built with Claude Code today, and laid out so a coding agent finds the rules before it touches the code.
This page is the map:  what an agent reads, in what order;  the house style;  the logs it writes to;
and the tooling around it, the epic plugin with its skills and hooks.

- The rules themselves are in plain Markdown any agent can read:  the `AGENTS.md` files and the house style.
- The tooling around them is Claude Code's today:  the plugin, the skills, the hooks.
  The same setup for other agents is coming (below).

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFECFB","primaryBorderColor":"#6550CA","primaryTextColor":"#1A1C27","secondaryColor":"#F4F1E9","tertiaryColor":"#F7F6FC","lineColor":"#7F6FD6","textColor":"#7F6FD6","clusterBkg":"#F7F6FC","clusterBorder":"#B9B0E8","titleColor":"#1A1C27","edgeLabelBackground":"#F7F6FC","actorBkg":"#EFECFB","actorBorder":"#6550CA","actorTextColor":"#1A1C27","actorLineColor":"#9C90DE","signalColor":"#7F6FD6","signalTextColor":"#7F6FD6","labelBoxBkgColor":"#EFECFB","labelBoxBorderColor":"#6550CA","labelTextColor":"#1A1C27","loopTextColor":"#7F6FD6","noteBkgColor":"#F1E7D4","noteBorderColor":"#C9B48A","noteTextColor":"#1A1C27","activationBkgColor":"#DCD6F7","activationBorderColor":"#6550CA","sequenceNumberColor":"#FFFFFF"},"flowchart":{"curve":"basis","padding":12,"nodeSpacing":40,"rankSpacing":44}}}%%
flowchart LR
  claude["CLAUDE.md"] --> agents["AGENTS.md: the kit's, the repo's, the folder's"]
  agents --> hub["WWOD: the hub, sections 1-7"]
  hub --> spoke["the spoke for what you're touching"]
  spoke --> solid["the Solid 2 rules, for Solid work"]
  %% the Spell look:  yarn mermaid:pretty
  classDef default fill:#EFECFB,stroke:#6550CA,stroke-width:1.5px,color:#1A1C27,rx:8px,ry:8px
  classDef data fill:#F1E7D4,stroke:#C9B48A,stroke-width:1.5px,color:#1A1C27,rx:2px,ry:2px
  class claude,agents data
```

_An agent reads from the general to the specific:  where it is, the house style, then the rules for the task at hand._

## The reading order

1. **`CLAUDE.md`**, at the repo's root:  Claude Code's own entry.
   - The kit's [CLAUDE.md](CLAUDE.md) pulls in the cross-model [AGENTS.md](AGENTS.md) and the house style's hub,
     with `@` imports, so both load at the start of every session.
   - A child repo's adds its own, and Claude-only rules where it has them:
     spell-app's say how to ask questions, how to name and list background agents, where tooling requests go.
   - Every code folder has a two-line `CLAUDE.md` pointing at the `AGENTS.md` beside it.
2. **`AGENTS.md`**, from the root down (below, "The AGENTS.md files").
3. **WWOD**, the house style:  its hub, then the spoke for what you're touching (below).
4. **The Solid 2 rules**, read IN FULL before any Solid work:
   Solid 2 is neither React nor Solid 1, and guessing from either produces wrong code.
   - They're not `@`-imported, so they load only when the task needs them.
   - The `solid-2` skill triggers on Solid work.
5. **The commands guide**, before adding a skill, a `spell` command or a yarn script:
   skills keep judgement and dialog, the command line does every repo action, and yarn holds each tool's own scripts.

- The Solid 2 rules and the commands guide live in the content folder (below, "More in the docs site").

## WWOD, the house style

WWOD, "What Would Owen Do?", is the house style every repo shares:  how code, comments and docs are written here.
- It's written for coding agents, to follow over their defaults, and people follow it too.
- It lives in the kit's [`agents/wwod/`](agents/wwod/), and every child repo reads that one copy.

- The hub, [WWOD.md](agents/wwod/WWOD.md), holds the seven rules every task needs:
  1. Working process
  2. General style
  3. Naming
  4. Imports
  5. Errors
  6. Comments and docs
  7. Anti-patterns (the habits coding agents bring, to drop)
- Its "Touching / Also read" table sends you to the SPOKE for your task:  a file per topic, read on demand.
- Each rule is a bullet with a bold title, so it can be cited:  `WWOD §5 › "Sentinel errors as control flow"`.
- A rule lives in exactly ONE place:  the hub or one spoke, never both.
- A rule chosen AGAINST is kept too, as a `NOT:` line under the winner, so nobody proposes it again.
- `spell wwod check` checks every citation and repo path, and exits 1 on a broken one.
  It reads WWOD, every `AGENTS.md` and `CLAUDE.md`, and the skills:  run it after editing any of them.

| Spoke | Sections | About |
| --- | --- | --- |
| [writing.md](agents/wwod/writing.md) | 6 | the long before / afters for docstrings, comments and docs |
| [architecture.md](agents/wwod/architecture.md) | 8 | features, module layout, file names, barrels, namespaces |
| [types.md](agents/wwod/types.md) | 9 | types, function signatures, helpers |
| [server-env.md](agents/wwod/server-env.md) | 10-11 | server routes and APIs, environment, configuration |
| [classes-state.md](agents/wwod/classes-state.md) | 12-16 | classes, decorators, state, `Loadable`, value objects, records |
| [solid.md](agents/wwod/solid.md) | 17 | Solid components and JSX, on top of the Solid 2 rules |
| [css.md](agents/wwod/css.md) | 18 | CSS and styling |
| [logging.md](agents/wwod/logging.md) | 19 | logging and debug output |
| [tests.md](agents/wwod/tests.md) | 20 | tests |

<details>
<summary>Adding a rule, and where WWOD came from</summary>

Adding a rule ([WWOD's own README](agents/wwod/README.md) has it too):

1. Put it in the spoke for its topic, or the hub if every task needs it, as a bullet with a **bold title**.
2. A rule chosen against:  a `NOT:` line under the winning rule, with the why.
3. Cite real code by repo path.
4. A new section is numbered after the last;  renumbering is fine, with the citations fixed.
5. Then `spell wwod check`:  a retitled rule breaks its citations.

- Where it came from:  rules first written for another project (in Svelte), merged with this project's own and
  translated to Solid 2, reviewed file by file in 2026-10.
- It's TRACKED in the kit, so edit it there;
  the content folder keeps an older copy for checkouts from before the repos split, until it's deleted.

</details>

## The AGENTS.md files

`AGENTS.md` is the cross-model file:  Codex reads every one from the root down to the folder it works in;
Claude Code loads the root's through `CLAUDE.md`, then the folder's.
So each rule is written in exactly one of them.

| File | Holds |
| --- | --- |
| the kit's [AGENTS.md](AGENTS.md) | the kit, and what's across repos:  installs, imports, tests, CI, worktrees |
| each child repo's, e.g. [spell-ui's](spell-ui/AGENTS.md) | that repo:  its folders, what it may import, its commands and its own conventions |
| each folder's, e.g. [the kit server's](server/AGENTS.md) | what's local to that folder |

- A section named like a WWOD rule EXTENDS it, and says so:  "As WWOD §4, plus:".
- A README says what a thing IS and how to run it;  the rules for working on it stay in its `AGENTS.md`.
- Every child repo has an `agents` link at its root, to the kit's [agents/](agents/) folder, made by every install:
  so its instructions can name [`agents/wwod/WWOD.md`](agents/wwod/WWOD.md) from where they are.
  - spell-epic has none, on purpose:  a root `agents/` there would load as the plugin's own agents.

## The three logs

Three running logs collect what a session finds but doesn't fix.
Agents write to them as they go;  people read them when something's wrong.

| Log | What goes in it | Entry |
| --- | --- | --- |
| `PAPERCUTS.md` | anything that slowed development down;  check it FIRST when tooling fails mysteriously | date · symptom · fix · project |
| `SUSPECTED-BUGS.md` | something that looks like a bug, not yet confirmed;  deleted when confirmed and fixed, or disproven | the file and symbol:  what looks wrong, why, how to prove it;  `[V]` once checked by hand |
| `CODE-DEBT.md` | structural problems, too big to fix in passing, known and tolerated on purpose | a heading, then Cost, Cause, Fix and Pinned at |

- One section per package in each, `## <package>`:  add to yours.
- NOT in them:  a local cleanup (an inline `REFACTOR:` marker instead).
- They live in the content folder, ONE copy for every repo and branch,
  linked into the kit's `agents` folder under the same names.
  Edit them at their real path in the content folder:  Claude's Edit tool refuses to write through a link to a file.
- Someone new starts without the content folder, so these links dangle in a fresh checkout until it's there.

## The epic plugin

spell-epic is a Claude Code plugin:
epic pages and their review loop, worktrees and VS Code windows, parking and waking sessions,
and the `epic` command that drives them.
ONE copy on the machine serves every repo and every window.

- It adds the skills (`/epic`, `/isolate`, `/details` ...), the hooks, and puts `epic` on every session's `PATH`.
- An edit to it is live at once for `epic` and the hooks;  a skill's new text after `/reload-plugins`.
- A repo opts in with `.epic/config.json5`:  where its content folder, worktrees and windows are.
  The kit's [.epic/config.json5](.epic/config.json5) turns on multi-repo mode, so an epic's worktree holds every repo.
- What epics are and how the method works:  [spell-epic's README](spell-epic/README.md).

Installing it, once per machine, from the kit's folder after `yarn install`:

```sh
claude plugin marketplace add ~/www/spell/spell-epic --scope user
claude plugin install spell-epic@spell-epic --scope user
for skill in ~/www/spell/spell-epic/skills/*/; do ln -s "$skill" ~/.claude/skills/; done
ln -s ~/www/spell/spell-epic/bin/epic ~/.local/bin/epic
```

1. Adds spell-epic's folder as a marketplace of one, for the whole machine.
   A marketplace added from a local path loads its plugin IN PLACE:
   no copy, no version pin;  an edit there is the plugin.
2. Installs the plugin from it.
3. Links each skill into your own skills folder, so you type bare `/epic`:
   a plugin's skills are otherwise named `/spell-epic:epic`.
4. Puts `epic` on your terminal's `PATH`, outside Claude Code.

- To try it in ONE session first, with nothing installed:  `claude --plugin-dir ~/www/spell/spell-epic`.
- For the Review tab and window moves, install its VS Code extension too:  [README-vscode.md](README-vscode.md).
- Using it in a repo that isn't Spell:  [spell-epic's README-adopting.md](spell-epic/README-adopting.md).

<details>
<summary>The plugin's config keys</summary>

`.epic/config.json5`, every key optional:
- `epic config [key]` prints what's in force
- `epic init` writes them all, with a comment each

| Key | What it sets |
| --- | --- |
| `repos` | the child repos' list (the kit's:  `repos.json5`);  naming it turns on multi-repo mode |
| `contentFolder` | the content repo:  epics, guides, sagas, pages, the logs (the kit's:  `spell.epics`) |
| `baseBranch` | the branch worktrees start from and merge into (`main`) |
| `worktreesFolder` | where an epic's worktree goes (`../spell.worktrees`) |
| `installCommand`, `installOnCreate`, `installTimeout` | what makes a new worktree ready, run before its window opens |
| `extraInstalls` | yarn projects of their own in a worktree:  the two VS Code extensions |
| `windows` | `default`, `repoName`, `contentName`, `worktreeOnly`:  the window files |
| `windowsFolder` | where window files live (`spell.epics/windows`) |
| `linkSessionFolders` | whether each worktree's saved sessions show in every window's Claude panel |
| `sharedFolders` | content folders a checkout links in at its root (none in the kit) |
| `engineFolder` | where spell-epic is, when it isn't a child repo |
| `repoTemplates` | the templates a repo's pages start from |
| `app` | `path`, `url`, `urlFile`, `start`:  the repo's app, which the epic server starts on demand |

</details>

## Skills and hooks

A SKILL is a packaged workflow Claude runs when you type its name (`/epic seo`) or when a task matches it.
A HOOK is a script Claude Code runs on an event:  a session starting, a prompt sent, a turn ending.

All the hooks, and most skills, come from the epic plugin;  spell-app has five skills of its own.

- Planning and review:  `/epic`, `/epics`, `/details`, `/comment`, `/docs-check`, `/send`.
- Worktrees and sessions:  `/isolate`, `/park`, `/unpark`, `/wait-for`, `/worktrees`, `/session`, `/title`, `/wtf`.
- Background and offline:  `/bg`, `/bedtime`, `/airplane`.
- spell-app's own:  `/design`, `/fussbudget`, `/spell-docs`, `/spell-serve`, and `solid-2`, which triggers by itself.
- Each hook acts only in a repo with `.epic/config.json5`, and always exits 0, so it never blocks a session.

<details>
<summary>Every skill, one line each</summary>

The plugin's (spell-epic's [`skills/`](spell-epic/skills/)):

| Skill | What it does |
| --- | --- |
| `/epic` | plans and builds an epic in its own worktree;  `review`, `resume`, `future`, `phase`, `start`, `request`, `done` |
| `/epics` | lists the open epics:  phase, worktree, session, what's waiting on you |
| `/details` | explains a question on a page in the side bar, answered on the page |
| `/comment` | review files by commenting inline, in the editor tab plan mode opens |
| `/docs-check` | makes the docs an epic wrote agree with what was chosen and built |
| `/send` | sends a request to another epic, and wakes its session |
| `/isolate` | moves a session into its own worktree and window;  `done` merges and opens pull requests |
| `/park` | parks a session's work as a WIP commit in its own worktree, with a note of where it stopped |
| `/unpark` | picks parked work back up |
| `/wait-for` | parks, waits for another session to finish, then carries on |
| `/worktrees` | takes stock of every session and worktree, and cleans up |
| `/session` | finds and reopens a saved session |
| `/title` | shows or changes this session's title |
| `/wtf` | says what's going on:  the goal, the worktree, the phase, what's waiting |
| `/bg` | runs a task in a named background agent, with an agent budget |
| `/bedtime` | works an epic's remaining phases unattended overnight, a commit per phase, never merging |
| `/airplane` | readies the pages for working offline;  `land` gathers what you left |

spell-app's ([`.claude/skills/`](spell-app/.claude/skills/)):

| Skill | What it does |
| --- | --- |
| `/design` | designs with Spell's real `<ui-*>` elements, in Claude Design or VS Code:  `push`, `pull`, `new`, `page` |
| `/fussbudget` | rewrites docstrings, comments, READMEs and docs to WWOD's writing rules, uncommitted |
| `solid-2` | the Solid 2 rules, loaded before any Solid work |
| `/spell-docs` | opens the docs in VS Code's Epic Docs tab |
| `/spell-serve` | starts this checkout's servers and says which port each is on |

</details>

<details>
<summary>Every hook, and when it fires</summary>

From the plugin's [`hooks.json`](spell-epic/hooks/hooks.json);  spell-app's own Claude settings hold none.

| Event | Script | What it does |
| --- | --- | --- |
| `WorktreeCreate`, `WorktreeRemove` | `worktree.mjs` | makes the worktree and its branch from local `main`, keeps the session saved at the repo's root, installs;  on remove, stops the checkout's servers first |
| `SessionStart` | `behind-main.mjs` | says when the worktree is behind `main`, and offers the merge |
| `SessionStart` | `worktree-guard.mjs` | tells a worktree's session that started outside it to enter it |
| `SessionStart` | `server-prune.mjs` | at most hourly, stops servers whose checkout is gone |
| `PostToolUse` on `EnterWorktree` | `behind-main.mjs` | the same notice, on entering |
| `PostToolUse` on `ExitWorktree` | `left-worktree.mjs` | reminds the reply to end with its closing line |
| `UserPromptSubmit` | `prompt-gate.mjs` | names the session on `/isolate`, `/epic`, `/unpark`;  refuses them in plan mode or inside another worktree, saving the prompt first |
| `Stop` | `handoff.mjs` | moves the session to another window once its turn ends, when one was armed |
| `Stop` | `shared-commit.mjs` | commits the content folder after every turn (`epic shared commit`) |

</details>

## What's Claude-specific

The rules are for any agent;  the tooling around them is Claude Code's today.

| Works with any agent | Claude Code only, today |
| --- | --- |
| the `AGENTS.md` files | `CLAUDE.md`'s `@` imports |
| WWOD | the skills and their `/slash` workflows |
| the three logs | the plugin and its hooks:  worktrees, window moves, the turn-end commit |
| `spell` and `epic`:  plain command lines | the worktree tools, the question modal, `/details` side-bar pages, `/bg` agents |
| the checks (`yarn review`) | the VS Code Claude panel's session list:  why folder 1 of every window is the kit |

## 🌱 Coming:  other agents

The same setup for agents other than Claude:
the plugin's worktrees, review loop and skills, driven from Codex and others the way Claude Code drives them today.
Codex already reads every `AGENTS.md`, and WWOD and both command lines are plain files and programs any agent can use.

Where it stands:  planned;  the plugin, skills and hooks are Claude Code's for now.

## See also

- [README.md](README.md):  the kit's front page
- [AGENTS.md](AGENTS.md):  the kit's rules for agents
- [README-development.md](README-development.md):  the checks every agent runs before it's done
- [README-cli.md](README-cli.md):  `spell` and `epic`
- [README-vscode.md](README-vscode.md):  the Review tab and windows
- [spell-epic's README](spell-epic/README.md) and [README-skills.md](spell-epic/README-skills.md):  the plugin
- Also beside it:
  [README-element.md](README-element.md) · [README-server.md](README-server.md) ·
  [README-toolchain.md](README-toolchain.md) · [README-util.md](README-util.md)

<details>
<summary>More in the docs site</summary>

These guides live in the content folder:
they need a checkout with `spell.epics` beside the repos,
and the page server running (`spell server start`, then the URL it prints):

- "WWOD:  the agents' house style":  `/guides/wwod.html`
- "Spell on Solid 2":  `/guides/solid/solid-2.html`;  the rules agents read, `/guides/solid/solid-2.md`
- "Commands":  `/guides/dev/commands/commands.html`;  the commands guide, `/guides/dev/commands/commands.md`
- "Background agents:  /bg":  `/guides/background-agents.html`
- "Details Pages":  `/guides/details.html`
- "spell-epic:  the epic engine, outside spell-app":  `/guides/spell-epic/spell-epic.html`
- "Airplane Mode":  `/guides/airplane.html`

</details>
