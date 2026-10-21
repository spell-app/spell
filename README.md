# spell

The top repo:  the ONE install over Spell's child repos, the list of them, and the commands over them
(epic `repo-split` P7).
- It holds nothing anyone imports:  no package, only the glue.
- Each child repo is its own git repo, cloned INSIDE this one and git-ignored here
  (`~/www/spell/spell-ui/` ...).
  - `git status` here shows only the glue;  each child repo has its own.
- Rules for humans and agents:  [AGENTS.md](AGENTS.md).

## Setting up

```sh
git clone git@github.com:spell-app/spell-hub.git ~/www/spell
cd ~/www/spell
yarn install          # quick:  no child repos yet, so nothing to link
yarn clone            # every child repo in repos.json5, then ONE install for all of them
```

- Or only what you're working on, and what it needs:

  ```sh
  yarn clone spell-ui   # spell-ui, spell-element, spell-server, spell-util
  yarn clone spell-lang # spell-lang, spell-util
  ```

- `yarn clone` clones over SSH, and over HTTPS (GitHub's login, `gh auth setup-git`) when SSH is refused.
- Again after `repos.json5` gains a repo:  it clones only what's missing.

## Day to day

```sh
yarn pull             # git pull --ff-only in every child repo
yarn status           # each child repo's branch and changes;  a clean one in one line
yarn repos            # the list:  which are cloned, and what each needs
yarn ts               # every repo's `yarn ts`, lowest first (each builds the declarations the ones above read)
yarn test             # every repo's tests
yarn lint             # every repo's lint
yarn review           # every repo's finishing pass
```

- In a child repo, its own scripts:  `cd spell-ui && yarn test`.
  In a package of a repo with several:  `cd spell-lang/core && yarn test`.
- A change across two repos is two commits, one in each, and two pull requests, the lower repo's first.
  No publish, no version bump:  every repo uses the others' source, through this one install.

## What's in it

| File | What it is |
| --- | --- |
| `package.json` | `"workspaces": ["spell-*"]`:  every child repo, each naming its own packages (yarn's nested workspaces);  the `resolutions` (one Solid);  the scripts above |
| `yarn.lock`, `.yarnrc.yml`, `.yarn/releases/` | the one lockfile, the one catalog of tool versions (`vite-plus` and its tools), the yarn release |
| `repos.json5` | the child repos, lowest first:  name, git URL, which repos each needs |
| `tools/repos.ts` | what `clone`, `pull`, `status`, `repos` and the checks run;  Node 24 runs it as is |
| `AGENTS.md`, `CLAUDE.md` | the rules across repos |
| `.epic/config.json5` | the epic settings, for a session working here (epic `repo-split` P9) |

The folders, all git-ignored:

| Folder | What it is |
| --- | --- |
| `spell-util/` | util (the helpers every package shares) and the toolchain (lint, tsconfig, decorators, types) |
| `spell-server/` | server (serving pages, the generic page server) and assembler |
| `spell-element/` | custom elements on Solid, for every component set |
| `spell-lang/` | the parser, markdown, core, py and spell:  the language, its runtime and its writers |
| `spell-ui/` | Spell UI, the `ui-*` elements, and its docs site |
| `spell-brand/` | Spell's brand:  Claude Design's pages, the `<brand-*>` pack |
| `spell-epic/` | the epic engine, a Claude Code plugin |
| `spell-app/` | the editor and its servers:  app, spaces, lsp, cli, vscode, page-server |
| `spell.epics/` | the content repo:  epics, guides, sagas, pages, brand pages, window files;  its own git repo, local only |
| `spell.spaces/` | your own projects:  a plain folder |
| `node_modules/` | the one install |

- The dot in `spell.epics` and `spell.spaces` keeps them out of the `"spell-*"` workspaces:  they're data, not code.
  - They're links to their old places (`~/www/spell-app/spell-app.epics`, `~/www/spell-app/spell-spaces`) until the
    move (epic `repo-split` P9) puts the real folders here.
  - `yarn clone` never clones them:  they're yours.  Someone new starts without them.
- spell-epic is a workspace like the rest since epic `epic-engine` P10 (on its `cutover` branch until the move).
- Standalone child repos (`git clone spell-ui && yarn install`, no top repo) aren't supported yet:  that's once the
  packages are on npm.
