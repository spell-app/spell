# spell-epic

The epic tooling, as a Claude Code plugin:  epic pages and their review loop, worktrees and VS Code windows,
parking and waking sessions, and the `epic` command that drives them.

- Lifted out of spell-app by epic `epic-eject`, phase P6 (2026-10-17).
  - A fresh history (Q9):  the first commit names the spell-app commit the files came from.
  - To see how a file came to be before that, look in spell-app's history.
- ONE copy per machine, which every repo and every window runs.
  - An edit here is live at once for the `epic` command and the hooks.
  - A skill's new text reaches a running session after `/reload-plugins`.
- spell-app is its first user:  it keeps `spell dev` aliases that hand the epic verbs on to `epic`.

## What's in it

| Folder | What |
| --- | --- |
| `.claude-plugin/plugin.json` | the plugin's manifest, `spell-epic` |
| `.claude-plugin/marketplace.json` | a marketplace of one, this folder (`"source": "."`), so the plugin loads in place |
| `skills/` | the skills:  `epic`, `epics`, `details`, `comment`, `docs-check`, `send`, `isolate`, `park`, `unpark`, `wait-for`, `worktrees`, `session`, `title`, `wtf`, `bg`, `bedtime`, `airplane` |
| `hooks/` | `hooks.json`, and the hooks it runs:  making and removing worktrees, the behind-main notice, the worktree guard, the prompt gate, the end-of-turn window move and shared-content commit |
| `bin/epic` | the `epic` command;  on every session's `PATH` while the plugin is on |
| `packages/epics/` | the epics package, `@spell-app/epics`:  the `<epic-*>` elements, the epic tool, the `epic` command's code (`src/command/`), the docs tools and their assets, Epic UI's pages (`docs/`) |
| `tests/epics/` | its tests, at the same paths as the code |
| `scripts/window.mjs` | the VS Code windows (`epic window`), and its test |
| `vscode/` | spell-epic's VS Code extension, `spell-app.spell-epic` (its own yarn project):  the Review tab, Epic Docs, "Open Epic...", the window bridge and the handoff;  [its README](vscode/README.md) |
| `templates/` | every kind of page's starting point (Q8):  details, review, choices, guides, cheatsheets, commands pages, component pages, the epic-page writing rules |

## Install

Not run yet:  these are the steps (Owen, 2026-10-17:  the install waits for him).

1. `yarn install` here.
   - spell-epic needs a spell-app checkout with its own `yarn install` done:  see "spell-app's packages", below.
2. Add this folder as a marketplace, for the whole machine, and install the plugin from it:

   ```sh
   claude plugin marketplace add /Users/owen/www/spell-app/spell-epic --scope user
   claude plugin install spell-epic@spell-epic --scope user
   ```

   - A marketplace added from a local path loads its plugin IN PLACE:  no copy, no version pin.
     An edit here is the plugin.
3. Bare `/epic` (Q6):  a plugin's skills are named `/spell-epic:epic`.
   To keep typing `/epic`, `/isolate`, `/bg` ..., link each skill into `~/.claude/skills`:

   ```sh
   for skill in skills/*/; do ln -s "$PWD/$skill" ~/.claude/skills/; done
   ```

   - Then remove the repo's own copies of those skills (spell-app's `.claude/skills/<name>`),
     or they win over the links in that repo.
4. In a terminal, outside Claude Code:  link `bin/epic` onto your `PATH`
   (`ln -s "$PWD/bin/epic" ~/.local/bin/epic`, or wherever your `PATH` looks).
5. Remove the repo's own copies of the hooks from its `.claude/settings.json`, or each runs twice.

To try it in ONE session first, with nothing installed:

```sh
claude --plugin-dir /Users/owen/www/spell-app/spell-epic
```

## A repo that uses it:  `.epic/config.json5`

Each repo says where it keeps its epic things in ONE file, `.epic/config.json5`, in its main checkout
(`EpicConfig`, `packages/epics/src/config/EpicConfig.ts`).
- Every key is optional;  a key left out takes its default, which is spell-app's layout.
- Folders are relative to the main checkout.  Every worktree reads the main checkout's file.
- `epic config [key] [--json]` prints what's in force.
- The hooks act only in a repo that has the file (the worktree hook excepted, which Claude Code needs everywhere).
- `epic init` writes the file for a new repo, and makes its content folder:  "Using spell-epic in another repo", below.

| Key | Default | What |
| --- | --- | --- |
| `contentFolder` | `"../spell-app-dev"` | the shared content repo:  epics, guides, sagas, pages, brand, the logs |
| `baseBranch` | `"main"` | the branch worktrees start from and merge into |
| `worktreesFolder` | `".claude/worktrees"` | where NEW worktrees go, one folder each, `<worktreesFolder>/<name>`;  may be beside the repo (`"../spell-app.worktrees"`) |
| `installCommand` | `"yarn install"` | what makes a new worktree ready to run, from its root;  `""`:  nothing to install |
| `installOnCreate` | `false` | whether the worktree hook runs `installCommand` before it hands a new worktree over (I2) |
| `installTimeout` | `600` | the seconds that install may take before the hook fails |
| `windows.default` | `"spell-app"` | the window file a worktree's window is opened from, by default |
| `windows.repoName` | `"spell-app"` | the repo root's folder name in every window |
| `windows.contentName` | `"spell-app-dev"` | the content repo's folder name in every window |
| `windows.worktreeOnly` | `false` | whether EVERY worktree's window holds only the worktree and the content folder |
| `linkSessionFolders` | `false` | whether the worktree hook links each new worktree's saved-session folder to the main checkout's |
| `sharedFolders` | spell-app's eight | the content folder's folders every checkout links in at its root;  a checkout's `package.json` `"shared": { "links" }` wins (spell-app's branches) |

A repo's generated files, which `epic worktree merge-main` rebuilds instead of merging, are its own list:
`.epic/generators.json5`, in each checkout (`MainMerge.generatorsOf()`).

## Worktrees beside the repo

Epic `epic-eject` P8 moves new worktrees OUT of the repo (`worktreesFolder: "../spell-app.worktrees"`), each in a
window of its own folder and the content folder:  no main checkout in it, each file once.
- Worktrees left in the old place (`.claude/worktrees`) keep working there until their `/isolate done`:  the hooks, the
  window script, the epics list, the page server's `/worktrees/<w>/`, parking and the session lists read both places
  (`EpicConfig.worktreesFolders`).  `epic worktree path <name>` says where one is.
- `epic worktree move <name> | --idle [--dry-run]` moves an idle one beside the repo;  a busy one stays put.
- `linkSessionFolders`:  the hook links the worktree's `~/.claude/projects/<slug>` to main's (`SessionFolders`), so
  every window's Claude panel lists every session.
- `installOnCreate`:  the hook runs the install before it answers, so no window opens without packages.
- A worktree's session gets there through `EnterWorktree`, never by starting in its folder:  only then does Claude
  Code bring it back there when it's reopened from another window (I3).  The session-start guard
  (`hooks/worktree-guard.mjs`) tells a session that comes back elsewhere, or starts in a worktree unrecorded, to enter.
- `epic shared rename <new> [--dry-run]` renames the content folder (`spell-app-dev` to `spell-app.epics`), leaving
  a link at the old name.

## Switching a repo over

The morning after epic `epic-eject`'s night (Q17:  nothing was installed, renamed or moved).  In order, one command
each;  the epic page's todo is in brackets.  `epic` is spell-epic's `bin/epic` (step 7 puts it on the `PATH`).

1. Merge `epic-eject` into spell-app's `main`:  `/isolate done` in its session.
2. Point this repo at spell-app's main checkout (T10):  `ln -sfn ../spell-app .spell-app && yarn install`, here.
3. Bring spell-epic up to date with the epic changes spell-app took since the snapshot (T12):
   `git -C ../spell-app log --oneline 79c78e58c..main -- packages/epics tests/epics .claude scripts/window.mjs templates`,
   then port each.
4. Install the plugin for the machine (T6):
   `claude plugin marketplace add ~/www/spell-app/spell-epic --scope user && claude plugin install spell-epic@spell-epic --scope user`.
5. Bare `/epic` (T7):  `for skill in ~/www/spell-app/spell-epic/skills/*/; do ln -s "$skill" ~/.claude/skills/; done`,
   and remove spell-app's own copies of those 17 skills (`.claude/skills/<name>`) in the same commit as step 6.
6. Take spell-app's own hooks out of its `.claude/settings.json` (T9), or each hook runs twice.
7. `epic` on the terminal's `PATH` (T8):  `ln -sfn ~/www/spell-app/spell-epic/bin/epic ~/.local/bin/epic`.
8. The epic server (T14):  `epic repo add ~/www/spell-app/spell-app --default && epic hub ensure`.
9. The shared pages load the engine from its routes (T13):  `epic migrate --step engine-asset-routes --dry-run`, then
   without `--dry-run`, from spell-app's main checkout.
10. The VS Code extension (T15):  `code --install-extension ~/www/spell-app/spell-epic/vscode/spell-epic.vsix`, then
    the hand tests V7-V9.
11. Templates leave the content folder (T11):  `rm -r ~/www/spell-app/spell-app-dev/templates`, once the tools read
    spell-epic's copies (the turn-end commit records it).
12. Rename the content folder (T18):  `epic shared rename spell-app.epics --dry-run`, then without;  then
    `epic window init`, and edit the files it lists (Claude settings' extra folders, memory notes, `AGENTS.md`).
    Commit the `.epic/config.json5` change it makes.
13. New worktrees beside the repo (T19):  in spell-app's `.epic/config.json5`, `"worktreesFolder":
    "../spell-app.worktrees"`, `"linkSessionFolders": true`, `"installOnCreate": true`;  commit on `main`, then
    `epic config` to check.
14. Move the idle worktrees (T20):  `epic worktree move --idle --dry-run`, then without.  Busy ones move at their
    `/isolate done`.
15. Hand tests:  V10-V13 (`/isolate try-move`, reopening its session from main's window, a new tab in its window, old
    pages after the rename).
16. Later, code rather than a command:  `epic server` hands over to `epic hub` (T16), the commands page learns the new
    verbs (T22), a call per repo on the epic server (T17, P9).

## Using spell-epic in another repo

Epic `epic-eject` P9 ran one epic end to end in a throwaway repo, `~/www/epic-try`:  `epic init`, a saga, an epic
page with a phase, the review inbox, the docs pages served by the epic server, `/isolate done`'s merge and the
worktree's removal.  With the plugin on (`bin/epic` on the `PATH`), in the repo's main checkout:

```sh
git init -b main                 # a git repo, with a first commit
epic init --dry-run              # what it would write
epic init                        # .epic/config.json5, the content repo, the links, .gitignore
git add .epic/config.json5 .gitignore && git commit -m "epic init"
epic repo add && epic hub ensure # the epic server serves its pages (at / when it's the only repo)
```

Then `/epic <name>` works there as in spell-app.

What `epic init` does (`RepoInit`, `packages/epics/src/command/RepoInit.ts`), each step skipped when it's done, so it's
safe to run again:
1. Writes `.epic/config.json5` with every key (the table above), each with a comment, valued for THIS repo:
   - `contentFolder`:  `../<repo>.epics`, beside it, as `spell-app.epics` will be
   - `baseBranch`:  the remote's default branch, else the branch the main checkout is on
   - `worktreesFolder`:  `../<repo>.worktrees`;  `windows.worktreeOnly`:  `true`
   - `installCommand`:  what the lock file names (`yarn.lock`:  `yarn install`, `pnpm-lock.yaml`, `bun.lock`,
     `package-lock.json` or a bare `package.json`:  `npm install`, `uv.lock`, `Gemfile.lock`);  none:  `""`.
     `installOnCreate` is on when there is one.
   - `windows.default`, `windows.repoName`:  the repo's folder name;  `windows.contentName`:  `<repo>.epics`
   - `linkSessionFolders`:  `true`
   - `sharedFolders`:  `["epics", "sagas", "guides", "pages"]`
   - A file already there is kept as it is.
2. Makes the content folder a git repo of its own, with those folders (a `.gitkeep` in each), a `README.md` and a
   `.gitignore` for the tooling's scratch files (inboxes, locks, running agents).  The turn-end hook commits it.
3. Links each folder in at the checkout's root;  every new worktree gets the same links from the worktree hook.
4. Lists the links, and `workspaces/` (the VS Code window files, each machine's own), between `# shared:start` and
   `# shared:end` in the repo's `.gitignore`.

What the content folder holds:

| Folder | What |
| --- | --- |
| `epics/` | an epic page per epic, `epics/<name>/<name>.plan.html`, its parts, review inbox and details pages;  `home.json5` (the tooling home) and `favorites.json5`;  the Epics list, `epics/index.html` |
| `sagas/` | the sagas' list, `sagas/sagas.json5` (`epic saga new`), a page per saga, the Sagas list |
| `guides/` | the guides epics write (`epic pages new durable guides/<page>.html`), the Guides list |
| `pages/` | the docs home, `pages/index.html` (`epic pages index` makes it, a card per area the repo has), and the scratch details pages, `pages/details/` |

Not spell-app's own (`brand/`, `ui/`, `goals/`, `agents/`), and no `templates/`:  the templates are spell-epic's.

The verbs a skill names that spell-app spells `spell dev ...`:
- `epic pages index | update | new | open | link | fuss | offline` (`spell dev docs ...`)
- `epic server ...`:  in a repo without its own page server, the epic server (`epic hub`), same verbs
- `epic window open <name> --no-open`:  writes the worktree's window file without opening VS Code

Not yet (the epic page's issues and todos):
- the epic server's review, details and comment routes serve the DEFAULT repo only (T17):  a second repo's pages draw,
  but their review controls reach the default repo
- the skills still name a few of spell-app's own tools (`spell dev vscode`, `spell dev wwod check`, `yarn vp fmt`,
  the changelog)

## The epic server:  one per machine

`epic hub` runs ONE page server for every repo that uses spell-epic (`EpicServer`, `packages/epics/src/server/`;
epic `epic-eject` P7), beside each checkout's own page server (`epic server`, spell-app's, port 4747).

```sh
epic repo add ~/www/spell-app/spell-app --default   # register a repo (its MAIN checkout), served at / too
epic repo list
epic hub ensure                                      # start it in the background:  http://127.0.0.1:4848/
epic hub url ~/www/spell-app/spell-app-dev/epics/seo/seo.plan.html
```

| URL | What |
| --- | --- |
| `/_epic/assets/...` | this checkout's `packages/epics/tools/_assets/`:  `spell-ui.js`, `spell-doc.css`, the runtime |
| `/_epic/pack/...` | this checkout's epics pack, `epics.pack.js` |
| `/r/<repo>/...` | a registered repo's content folder (its `.epic/config.json5`'s `contentFolder`) |
| `/...` | the DEFAULT repo's content folder too, so today's URLs keep working |
| `/api/...` | the epic route modules (review, details, choices, comments, agents, airplane, running, links), for the default repo |

- Its files are in `~/.spell-epic/`:  `repos.json5` (the repos), `server.json` (its pid file), `server.log`.
  `SPELL_EPIC_HOME` moves the folder (the tests' temp homes);  `SPELL_EPIC_PORT` its port (default 4848).
- `ensure` restarts it when its code or the repo list changed since it started.
- Pages load the engine from the routes (the migration step `engine-asset-routes`);  a page not migrated yet still
  loads THIS engine's files, from its old paths.
- Not yet:  another repo's calls (`/api/...` from a `/r/<repo>/` page) reach the default repo's route modules.

## spell-app's packages

The epic pages are drawn with Spell UI, and the tools run on spell's page server and page assembler.
spell-epic uses those packages straight from a spell-app checkout (Q5), not from npm:
- `.spell-app` at the root is a link to that checkout.
  - The `@spell-app/{ui,server,assembler,util,spell-solid}` dependencies are `portal:` links through it
    (`packages/epics/package.json`).
  - The alias table, `tsconfig.base.json`, maps `$/ui`, `$/server` ... into it.
  - Through the CHECKOUT's link, never a package's own:  a package's relative imports out of itself
    (`ui`'s `../../vite.decorators.ts`) then land in that checkout, as they do there.
- Tonight it's the `epic-eject` worktree's checkout:  the epic code needs that branch's server package
  (`checkout.ts`, the running-epics route), which `main` doesn't have yet.
  - Once `epic-eject` is merged:  point the link at the main checkout (`ln -sfn ../spell-app .spell-app`),
    then `yarn install`.
- The component pack's build and check are still spell-app's CLI's (`spell dev pack`):
  `yarn pack:build` / `pack:check` in `packages/epics` run it through `scripts/spell-app.mjs`.
- At release:  publish those packages to npm, and depend on them there.

## Checks

```sh
yarn ts                 # the epics package and its tests
yarn test               # node and browser (chromium) projects, then the window script's own tests
yarn lint
yarn plugin:validate    # claude plugin validate .
yarn vscode:check       # the VS Code extension's typecheck (after `yarn install` in vscode/)
yarn vscode:package     # its bundle and vscode/spell-epic.vsix:  NOT installed by any script
```
