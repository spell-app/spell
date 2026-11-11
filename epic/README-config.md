# Epic settings, and what's still rough

`epic init` sets all of this, and most repos never touch it again.
This page is the reference:  the epic folder, every setting, worktrees, the local server, and what you'd trip on today.

## The epic folder:  your plans, in a repo of their own

Every page the agent writes lands in one of four folders, each linked into your checkout:

| Folder | What's in it |
| --- | --- |
| `epics/` | a page per epic, `epics/<name>/<name>.plan.html`, with its parts, review inbox and details pages;  the Epics list, `epics/index.html` |
| `sagas/` | the sagas' list, `sagas/sagas.json5` (`epic saga create`), a page per saga, the Sagas list |
| `guides/` | the guides epics write (`epic pages create durable guides/<page>.html`), the Guides list |
| `pages/` | the docs' home page, `pages/index.html` (`epic pages index` writes a card per area), and scratch details pages, `pages/details/` |

- **Committed by itself.**
  A hook commits the epic folder at the end of every turn (`epic turn end`),
  one commit per epic, guide or folder:  the plans keep a history of their own, off your branches.
  With an epic repo, the same hook syncs it ([every turn syncs](README-teams.md#every-turn-syncs)).
- **Never committed:**  review and comment inboxes, locks, the running-agents lists, scratch details pages,
  and the VS Code window files, each machine's own (`windows/`).
  The comments beside the inboxes ARE committed, a file per person.
- **Its own `.gitignore` and `.gitattributes`** hold a marked block each, which `epic init` and every sync keep
  current:  the logs' `union` merge is in the second.
- **No `templates/`.**
  The page templates are the engine's, in [templates/](templates/).
  A repo can add its own with `repoTemplates`, found by name before the engine's.

## <a id="your-settings"></a>Your settings:  three layers, later wins

How the epic tooling behaves is separate from where a repo keeps things.
Three files of the same name and shape, `epic_settings.json5`, merged key by key:

| Layer | Where | Checked in? |
| --- | --- | --- |
| default | [epic/epic_settings.json5](epic_settings.json5), every key with its value | in Spell |
| org | at the root of the epic repo;  optional | in the epic repo |
| developer | `~/.spell/epic_settings.json5`;  optional | nowhere |

To change one for yourself, write only that key:

```json5
{ away: { finishedPhaseDays: 7 } }
```

- `epic settings` prints each value and which file set it;  `epic settings <key>` one value;  `--json` for a script.
- A file that won't read, or a bad value in one, is said on stderr, and the layer below stands.

| Key | Default | What it sets |
| --- | --- | --- |
| `away.finishedPhaseDays` | `3` | how many days a finished phase (done or dropped) and a bedtime run's summary stay in "While you were out";  a phase with no recorded time stays until you read it |

## <a id="the-config-file"></a>The config file:  one per repo, read from the main checkout

`epic init` wrote this file, and most repos never touch it again.
You'd open it for one of five things:
- an epic repo made by hand (`contentRemote`)
- a different install command
- a second project in the repo that installs on its own (`extraInstalls`)
- an app for the epic server to start (`app`)
- a repo made of several repos (`repos`)

It's ONE file per repo, `.epic/config.json5` in the main checkout, read by
[`EpicConfig`](src/config/EpicConfig.ts).
- Every key is optional:  one left out reads as `epic init` would write it for YOUR repo, the middle column below.
- Folders are relative to the main checkout, and every worktree reads the main checkout's file:
  a branch's change to it counts once it's merged.
- `epic config [<key>] [--json]` prints what's in force, folders made absolute.
- The hooks act only in a repo that has the file.
  In any other repo, the worktree hook makes the worktree Claude Code would make by itself:
  `.claude/worktrees/<name>`, on a new branch `worktree-<name>`, with nothing linked or installed.

| Key | `epic init` writes | What it sets |
| --- | --- | --- |
| `contentFolder` | `"../<repo>.epics"` | the epic repo:  epics, sagas, guides, pages |
| `contentRemote` | the epic repo's address, once it's made (or `--remote`);  `""` until then | where every turn pulls the epic repo from and pushes it to, and what a teammate's `epic init` clones;  `""`:  the plans stay on this machine |
| `baseBranch` | from git:  the remote's default branch, else `main` or `master`, else the branch the main checkout is on | the branch worktrees start from and merge into |
| `codeHost` | the value it settled on:  `--host`, else the `origin` address's, else GitHub;  left out, worked out from `origin` each time | where the code is hosted, `"github"` or `"gitlab"`:  picks `gh` or `glab` ([On GitLab](README-setup.md#on-gitlab)) |
| `baseBranchProtected` | `false`, unless `--protected-base` or the code host says otherwise | the base branch can't be pushed to, and work reaches it only through a pull request ([below](README-setup.md#when-main-takes-only-pull-requests)) |
| `worktreesFolder` | `"../<repo>.worktrees"` | where new worktrees go, one folder each, `<worktreesFolder>/<name>` |
| `installCommand` | from the lock file;  `""` with none | what makes a new worktree ready to run, from its root;  `""`:  nothing to install |
| `installOnCreate` | `true` with an install | whether the worktree hook runs the install before it hands the worktree over |
| `installTimeout` | `600` | the seconds that install may take before the hook fails |
| `extraInstalls` | `[]` | folders of a worktree that are projects of their OWN, outside the install at its root (a `vscode/` extension):  the install runs in each too;  one missing or failing is a warning |
| `windows.default` | the repo's name | the window file a worktree's window is opened from, by default |
| `windows.repoName` | the repo's name | the repo root's folder name in every window |
| `windows.contentName` | `"<repo>.epics"` | the epic folder's name in every window |
| `windows.worktreeOnly` | `true` | whether every worktree's window holds only the worktree and the epic folder |
| `windows.settings` | not written:  `{}` | VS Code settings every window file gets:  the WINDOW settings a folder's `.vscode/settings.json` can't give in a window of several folders (which TypeScript the editor runs, say;  none of Spell's repos names any today);  `epic window init` writes them into the files that exist |
| `windowsFolder` | `"../<repo>.epics/windows"` | where the VS Code window files go;  worktree windows in its `ongoing/` |
| `linkSessionFolders` | `true` | whether each worktree's saved Claude sessions show in every window's Claude panel |
| `sharedFolders` | `epics`, `sagas`, `guides`, `pages` | the epic repo's folders each checkout links in at its root |
| `colors` | not written:  none | a colour for each person (by the short name `epic whoami` prints) and each agent (`codex`) on the epic pages, `{ people: { ana: "green" }, agents: { codex: "#0f8b8d" } }`:  a Spell UI colour name (red, orange, yellow, olive, green, teal, blue, violet, purple, pink, brown, grey, black), drawn from the theme so it suits light and dark, or any CSS colour;  their replies and comment-thread messages draw in it, an agent's words in the agent's;  anyone left out keeps the shared person or agent colour |
| `editor` | not written:  `""` | the editor the tools drive, `code` (VS Code) or `cursor`, when neither this machine (`SPELL_EPIC_EDITOR`) nor the window they run in says;  `""`:  VS Code |
| `engineFolder` | `""` | an engine checkout to link in at each checkout's root, for a repo whose own code imports the engine;  `""`:  none |
| `repoTemplates` | `""` | the repo's own page templates, a folder from each checkout's root;  `""`:  only the engine's |
| `app.path` | not written:  a comment shows how | the repo's APP:  its address on the epic server, `/editor/`, the top bar's App tab |
| `app.url` | not written | where the app answers (`"http://localhost:3000/"`);  `""` with no `urlFile`:  no app |
| `app.urlFile` | not written | or a JSON file its server writes once it's up, `{ "url": ... }`, from the main checkout |
| `app.start` | not written | the shell command that starts the app, run in the background when it doesn't answer (`"npm run dev"`) |
| `repos` | not written | a MULTI-REPO checkout's child repos (a list, or a file such as `"repos.json5"`):  an epic's worktree is then a worktree of the top with one of every child repo inside it, all on the epic's branch;  a child finds its top as the folder above it (`epic config top`) |
| `checkoutPatches` | not written:  a comment shows how | fixes every checkout gets at once, the worktrees behind `main` too (`epic worktree patch`):  each an `id`, a `date`, a `why`, and a `copy` (a file of `main`'s, put where it isn't tracked yet, git-excluded) or a `run` (a command, once per checkout) |
| `voices` | not written | the repo's own voices, a name to a file from the main checkout (`"code": "agents/wwod/writing.md"`), over the engine's `voices/<name>.md` (`epic voice`) |
| `pageVoices` | not written | the voice each kind of page is written in, over the defaults:  `readme` for READMEs and guides, `code` for code and epic pages |
| `promptAck` | not written | whether the prompt hook shows an "On it:  ..." line for a message sent while the session is busy;  on unless `false` |

- Files your build generates (bundles, data) can be listed in `.epic/generators.json5`:
  `epic worktree merge-main` reruns them on the merged source, instead of line-merging what they wrote.
  - each entry:  its `name` and `outputs`
  - and where and how it runs:  the `cwd`, and the command to `run` there
  - read from each checkout, so a branch that adds a generated file lists it, and its own merge knows it
- Two real ones to copy from:
  - Spell's own, [.epic/config.json5](https://github.com/spell-app/spell/blob/main/.epic/config.json5), multi-repo, with no folders linked in
  - the engine's folder's, [epic/.epic/config.json5](.epic/config.json5)

<details>
<summary>The values a key takes when the file leaves it out:  your repo's own</summary>

A key the file leaves out reads as `epic init` would write it for your repo:  the middle column above.
- worked out from the repo, each time it's read:  its name, its lock file, its branches
- `windows.contentName` and `windowsFolder` follow the `contentFolder` you name;
  `installOnCreate`, the `installCommand` you name
- the keys `epic init` doesn't write take the defaults the last column gives
- `epic config` prints every value in force

- NEVER list `agents` in `sharedFolders` in a repo that's also a loaded plugin.
  - Claude Code reads a plugin's root `agents/` as agent types.
  - The engine's folder's own list is `[]`.

</details>

## Worktrees:  beside your repo, one per epic

The plugin's worktree hook replaces Claude Code's own.
An epic's worktree is `../my-app.worktrees/<name>`, on branch `<name>`,
cut from your LOCAL base branch, unpushed work included.

Before it hands the worktree over, the hook:
- links the epic repo's folders in, and the worktrees folder's one link to the epic folder,
  `my-app.worktrees/my-app.epics`, so a page's `../my-app.epics/...` links work from a worktree too
- links the worktree's saved Claude sessions to the main checkout's (`linkSessionFolders`)
- runs `installCommand` in it, when `installOnCreate` is on
- then in each of `extraInstalls`

<details>
<summary>Removing one, and the rest</summary>

- Remove a worktree with `epic worktree remove <name>`, never a bare `git worktree remove`:
  the epic tools stop its web servers (its page server, its app's dev server) BEFORE it goes, and git doesn't.
  What each worktree verb keeps, and the clean-up after a folder deleted another way:
  [the `epic` command's README](README-cli.md#worktrees-sessions-and-parked-work).
- `epic worktree move <name> | --idle` moves worktrees left inside the repo, in `.claude/worktrees`
  where Claude Code puts its own, to beside it.
- Why a worktree's session must enter it through Claude Code's own worktree tool, not just start in its folder:
  the worktree guard, in [the skills' README](README-skills.md#hooks).

</details>

## One epic server for the machine

A dev server runs one per project;  the epic server runs ONE per machine, for every repo that uses epics.

It serves each registered repo's epic folder, the engine's scripts and styles,
Epic UI (the `<epic-*>` elements' own docs), and the routes the review controls call.
It's what the Review tab shows.

```sh
epic server start                       # in your repo:  register it the first time, start the server
epic repos add ~/www/my-app --default    # or register a repo (its main checkout) by hand;  --default:  served at /
epic repos list
epic server url ~/www/my-app.epics/epics/seo/seo.plan.html
```

- In a repo `epic init` set up, `epic server` IS this server:  such a repo has no page server of its own.
  `epic hub` names it from anywhere, with the same verbs (`start`, `ensure`, `stop`, `status`, `url`).
  Spell's own repo has a page server of its own, which runs beside it, never instead of it.
- Port 4848;  `SPELL_EPIC_PORT` changes it.
  Only ever that port:  when something else holds it, `start` fails and says so,
  rather than start elsewhere, so an open page keeps its address.
- `start` restarts it when its code or the repo list changed since it started.
- Its files are in `~/.spell-epic/`, a folder `SPELL_EPIC_HOME` moves:
  - `repos.json5`:  the repos
  - `server.json`:  its process
  - `server.log`
  - `person.json5`:  who you are
- The app is the repo's own server, never the epic server's:  `/editor/` only finds it, or starts it
  (its output in `~/.spell-epic/app-<repo>.log`).
  With no app declared, it shows a page saying so.
- The epic server's code:  [epic/src/server/](src/server/).

<details>
<summary>Every address it serves</summary>

| Address | What it serves |
| --- | --- |
| `/_epic/assets/...` | the engine's scripts and styles:  Spell UI's docs bundle, `spell-doc.css`, the runtime |
| `/_epic/pack/...` | the `<epic-*>` pack, `epics.pack.js` |
| `/components/epics/` | Epic UI, the elements' docs |
| `/components/<set>/` | the default repo's other component sets;  each repo's at `/r/<repo>/components/<set>/` |
| `/r/<repo>/...` | a registered repo's epic folder |
| `/...` | the default repo's epic folder too |
| `/editor/` | the default repo's APP (each repo's at `/r/<repo>/editor/`):  a redirect when it answers;  else started in the background behind a "Starting ..." page;  with none declared, a page saying so |
| `/api/app/<repo>` | how a repo's app stands:  up, starting, or failed and why |
| `/api/server` | what it serves:  its port, its repos, the default one |
| `/api/...` | the review, details, choices, comments, agents, airplane and links routes, for the default repo |

</details>

## What's still Spell-shaped

What you'd trip on today, roughly in the order you'd meet it.

1. **Everything runs from npm's cache.**
   `npx spell@next epic init` installs nothing permanent:  after `npm cache clean`, run it again.
2. **Sharing needs GitHub or GitLab.**
   `epic init` makes the epic repo through `gh` or `glab`;
   anywhere else, make it by hand and pass `--remote <address>`.
   GitLab has run only against a stand-in `glab`, not a real server ([On GitLab](README-setup.md#on-gitlab)).
3. **The review controls reach the DEFAULT repo only.**
   A second repo's pages draw, but their buttons, comments and details pages talk to the default repo's inbox.
   `epic repos default <name>` picks which repo that is.
4. **Your pages wear Spell's look.**
   They load Spell's theme, and the top bar's tabs are Spell's own areas, not yours.
5. **A few skills reach for Spell's own tools.**
   Where a skill wants the repo's house style or text-rewriting skill, its example is Spell's.
   - Saved prompts go to `~/.spell/prompts/`.
6. **Claude Code first.**
   The skills run in Codex too, but five stay Claude Code's, and so do waking a session from the page, session
   titles and window moves ([With Codex](README-teams.md#with-codex));  any other agent follows `epic guide`.
   The prompt gate renames sessions through a hook output Claude Code doesn't document yet.
7. **VS Code or Cursor, tried only on macOS, and Cursor only from its command line.**
   Cursor takes VS Code's command-line flags, so the tools run `cursor` where they'd run `code`
   (`--install-extension` checked against a scratch profile, Cursor 3.22);
   its windows, the Review tab's place and Claude Code's panel in it haven't been tried by a person yet.
   Linux and Windows have their own way of listing processes, linking folders and reading a pasted picture
   (`wl-paste` or `xclip` on Linux, PowerShell on Windows), but no person has run them there yet.
   - Windows:  a session's window can't be told from its process (Windows doesn't say which files a process has open),
     so `epic session open` opens in the last window.
   - `epic` is `epic.cmd` there, in `%USERPROFILE%\.local\bin`:  put that folder on your `PATH`.
   - The window bridge finds a session's window through its parent processes;
     `vscode://` links are avoided because macOS hands them to whichever window is focused.
   - `epic plugin install` (and so `epic init`) installs the extension from `epic/vscode/spell-epic.vsix`;  in a
     clone of Spell, build it first:  `yarn vscode:package` in `epic/`.
8. **Spell's own page server knows your project only by a file you write.**
   You need it only to see your own component set or bundles on Spell's pages, not for epics:
   the epic server above serves your plans.
   The kit's page server knows its own folders and, beside them, the projects two lists name:
   - `repos.json5`, the kit's tracked list:  only the kit's own peers, so not yours
   - `page-server.local.json5`, at the kit checkout's root, git-ignored, yours:
     `{ projects: ["../my-app"] }`, each folder from the kit's, with a `"pageServer"` part in its `package.json`
   - A kit WORKTREE reads the peers beside the MAIN checkout (`~/www/spell`), not beside itself.
   - A folder beside the kit is served under `/_beside/` (`/_beside/_up/` for one further up).
   - Your project needs its own install with `spell` in it (`"spell": "portal:../spell"`):
     its bundles are found by its npm name, through its `node_modules`.
   - What else assumes the kit's own layout:
     - `spell-types --below`, in your project, builds the local packages it depends on (`workspace:`, `portal:` ...),
       a kit among them with its folders
     - the lint's `spell-ui/*` pattern rules know only the component folders of Spell's own sets
     - `spell rename imports` renames in the peers `repos.json5` names, so never in your project
     - `spell publish` publishes only the kit's folders that have a `"spellPublish"`

**Real today:**  a repo that isn't Spell, set up with one command, its plans shared by a team through GitHub
(GitLab is built, and tried only against a stand-in `glab`),
its epics planned, built in worktrees and reviewed on their pages, each reply and comment under its writer's name,
every comment seen by the team and answered by its writer's own agent, Claude Code or Codex.
**Not yet:**
- Cursor tried by a person:  its windows, the Review tab's place, a move between windows
- Send waking an agent other than Claude Code, and the Codex side tried with a real Codex
- a real GitLab, gitlab.com or self-hosted:  `glab`'s flags are from its documentation, not a run against a server
- a host other than GitHub or GitLab, without making the epic repo by hand
- two repos reviewed from one server
- the keys added since the first outside run, tried anywhere but Spell's own repos:
  - `app`
  - `extraInstalls`
  - `windowsFolder`
  - `windows.settings`

🌱 Two are planned:  the plugin from Claude Code's plugin marketplace, with no clone,
and Send waking Codex and other agents
([the epic engine's front page](README.md#-coming) says where each stands).

## See also

- [README-epics.md](https://github.com/spell-app/spell/blob/main/README-epics.md):  what an epic is, why you'd want one, and the short version of all this
- [README-setup.md](README-setup.md):  what `epic init` writes these settings for
- [README-cli.md](README-cli.md):  every `epic` verb
