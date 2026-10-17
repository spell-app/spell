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
| `hooks/` | `hooks.json`, and the hooks it runs:  making and removing worktrees, the behind-main notice, the prompt gate, the end-of-turn window move and shared-content commit |
| `bin/epic` | the `epic` command;  on every session's `PATH` while the plugin is on |
| `packages/epics/` | the epics package, `@spell-app/epics`:  the `<epic-*>` elements, the epic tool, the `epic` command's code (`src/command/`), the docs tools and their assets, Epic UI's pages (`docs/`) |
| `tests/epics/` | its tests, at the same paths as the code |
| `scripts/window.mjs` | the VS Code windows (`epic window`), and its test |
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
- `epic init`, which writes the file and makes the content folder, comes with P9 (the test repo).

| Key | Default | What |
| --- | --- | --- |
| `contentFolder` | `"../spell-app-dev"` | the shared content repo:  epics, guides, sagas, pages, brand, the logs |
| `baseBranch` | `"main"` | the branch worktrees start from and merge into |
| `worktreesFolder` | `".claude/worktrees"` | where worktrees go, one folder each, `<worktreesFolder>/<name>` |
| `installCommand` | `"yarn install"` | what makes a new worktree ready to run, from its root |
| `windows.default` | `"spell-app"` | the window file a worktree's window is opened from, by default |
| `windows.repoName` | `"spell-app"` | the repo root's folder name in every window |
| `windows.contentName` | `"spell-app-dev"` | the content repo's folder name in every window |
| `linkSessionFolders` | `false` | whether each worktree's saved-session folder is linked to the main checkout's (nothing links them yet) |

A repo's generated files, which `epic worktree merge-main` rebuilds instead of merging, are its own list:
`.epic/generators.json5`, in each checkout (`MainMerge.generatorsOf()`).

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
```
