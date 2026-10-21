# spell-kit

The kit:  the layer every Spell repo stands on, the house style, and the ONE install over the child repos
(epic `repo-split` P7, P9).
- Five folders of code:  util, toolchain, server, assembler and element, published as ONE package, `spell-kit`
  (`spell-kit/util`, `spell-kit/server/page` ...).
- The house style every repo shares, WWOD, in `agents/wwod/`.
- The glue:  the install, the list of child repos, and the commands over them.
- Each child repo is its own git repo, cloned INSIDE this one and git-ignored here
  (`~/www/spell/spell-ui/` ...).
  - `git status` here shows only the kit's own files;  each child repo has its own.
- Rules for humans and agents:  [AGENTS.md](AGENTS.md).

## Setting up

```sh
git clone git@github.com:spell-app/spell-kit.git ~/www/spell
cd ~/www/spell
yarn install          # the kit's own packages:  no child repos yet
yarn clone            # every child repo in repos.json5, then ONE install for all of them
```

- Or only what you're working on, and what it needs (the kit is always there):

  ```sh
  yarn clone spell-ui    # spell-ui alone
  yarn clone spell-brand # spell-brand, spell-ui
  ```

- `yarn clone` clones over SSH, and over HTTPS (GitHub's login, `gh auth setup-git`) when SSH is refused.
- Its flags (CI's):  `--branch <name>` clones each repo at that branch when it has one, else its default branch;
  `--https` skips SSH;  `--shallow` takes only the last commit;  `--no-install` clones only.
- Every `yarn install` links each child repo's `agents` to the kit's (`postinstall`), so a checkout made without
  `yarn clone` (an epic's worktree, CI) has them too.
- Again after `repos.json5` gains a repo:  it clones only what's missing.

## Day to day

```sh
yarn kit:review       # the kit's own finishing pass:  ts, lint, format, tests of its five folders
yarn pull             # git pull --ff-only in every child repo
yarn status           # each child repo's branch and changes;  a clean one in one line
yarn repos            # the list:  which are cloned, and what each needs
yarn ts               # the kit's, then every repo's `yarn ts`, lowest first:
                      #   each builds the declarations the ones above read
yarn test             # the kit's tests, then every repo's
yarn lint             # the kit's lint, then every repo's
yarn review           # the kit's finishing pass, then every repo's
```

- The kit's checks one at a time:  `yarn kit:ts`, `kit:test`, `kit:lint`, `kit:lint:fix`, `kit:format`,
  `kit:format:check`.
- In a child repo, its own scripts:  `cd spell-ui && yarn test`.
  One folder of a repo with several (spell-lang, spell-app):  `cd spell-lang && yarn spell-folders test core`.
- A change across two repos is two commits, one in each, and two pull requests, the lower repo's first.
  No publish, no version bump:  every repo uses the others' source, through this one install.

## What's in it

The kit's code, one folder each, its tests in `tests/<folder>/`:

| Folder | Entry | What it is |
| --- | --- | --- |
| [util/](util/) | `spell-kit/util` | the helpers every package shares:  small generic ones (`@proto` ...), spell's own in `src/spell/`, the reactive engine, and `node/json5` (node only) |
| [toolchain/](toolchain/) | `spell-kit/toolchain/...` | the lint and format settings and their rules, the decorator pre-pass, the version stamp, the base tsconfig, the global types, `spell-types`, `spell-folders` (what the `kit:` checks, spell-lang's and spell-app's run, folder by folder), the run-time alias hook |
| [server/](server/) | `spell-kit/server` | serving pages locally:  static folders, an Express-shaped router, live reload, ports, openers, a file lock, the generic page server, the site header |
| [assembler/](assembler/) | `spell-kit/assembler` | assembling pages:  link targets (`Linker`), `formatHTML()`, bundles built on demand (`Bundle`), `DataFile`, `contentFolder` |
| [element/](element/) | `spell-kit/element` | what makes a custom element on Solid 2, for every set's elements (Spell UI's, the epics', the app's, the brand's);  `SkeletonText`;  the test helpers every set's tests use (`spell-kit/test-helpers/ElementFixture` ...);  the element tools (`spell-kit/element/tools/...`:  the component pack build, the root catalog, the elements' Vite settings, the HMR plugin ...) and their bin, `spell-pack build \| check` |

- They were three repos, spell-util, spell-server and spell-element, merged in with their history (P9).

The rest of what's tracked:

| File | What it is |
| --- | --- |
| `package.json` | the ONE package `spell-kit` and its `exports`;  `"workspaces": ["spell-*"]`:  every child repo, each ONE package named after it (epic `repo-split` P11);  `"spellTypes"` and `"spellFolders"`, its folders;  the `resolutions` (one Solid);  the scripts above |
| `tsconfig.base.json` | the kit's `$/` alias table (`$/util`, `$/server` ...), for inside the kit |
| `vite.config.ts` | the kit's lint and format settings, what `vp check` and the editor read |
| `yarn.lock`, `.yarnrc.yml`, `.yarn/releases/` | the one lockfile, the one catalog of tool versions (`vite-plus` and its tools), the yarn release |
| `repos.json5` | the child repos, lowest first:  name, git URL, which repos each needs |
| `tools/repos.ts` | what `clone`, `pull`, `status`, `repos`, the checks over every repo and the `postinstall` run |
| `.github/workflows/checks.yml` | the kit's CI;  each child repo has its own ([AGENTS.md](AGENTS.md), "CI") |
| `agents/` | WWOD, the house style (`agents/wwod/`), and links to the three logs in the content repo |
| `AGENTS.md`, `CLAUDE.md` | the rules for the kit and across repos |
| `.epic/config.json5` | the epic settings, for a session working here |

The folders git ignores:

| Folder | What it is |
| --- | --- |
| `spell-lang/` | the parser, markdown, core, py and spell, ONE package `spell-lang`:  the language, its runtime and its writers |
| `spell-ui/` | Spell UI, the `ui-*` elements, and its docs site |
| `spell-brand/` | Spell's brand:  Claude Design's pages, the `<brand-*>` pack |
| `spell-epic/` | the epic engine, a Claude Code plugin |
| `spell-app/` | the editor and its servers, ONE package `spell-app`:  app, spaces, lsp, cli, page-server;  and vscode |
| `spell.epics/` | the content repo:  epics, guides, sagas, pages, brand pages, window files, the logs;  its own git repo, local only |
| `spell.spaces/` | your own projects:  a plain folder |
| `dist-types/` | the kit's built declarations, for the repos above it (`spell-types`) |
| `node_modules/` | the one install |

- The dot in `spell.epics` and `spell.spaces` keeps them out of the `"spell-*"` workspaces:  they're data, not code.
  - `yarn clone` never clones them:  they're yours.  Someone new starts without them.
  - In a worktree of the kit, they're links to the main checkout's.
- spell-epic is a workspace like the rest since epic `epic-engine` P10.
- Standalone child repos (`git clone spell-ui && yarn install`, no kit around them) aren't supported yet:
  that's once the packages are on npm.
