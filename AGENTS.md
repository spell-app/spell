# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in the kit `spell-kit`, `~/www/spell`,
and across the child repos inside it.

**ALWAYS, before any code:  READ [WWOD](agents/wwod/WWOD.md), "What Would Owen Do?", the house style every repo shares.**
- Then the `AGENTS.md` of the folder you're working in:
  - one of the kit's ([server's](src/server/AGENTS.md) ...)
  - or a child repo's ([Spell UI's](spell-ui/AGENTS.md) ...), and its package's
- A rule lives in exactly ONE place:  this file holds what's about the kit and what's ACROSS repos;
  each repo's, what's about it;  each folder's or package's, what's local to it.

## The kit

- The bottom of every repo, and always there.  It holds:
  - the code every repo stands on, under ONE `src/` (epic `repo-split` P14, Q47):
    its seven folders, in "The kit's folders" below
  - the house style, WWOD, in [agents/wwod/](agents/wwod/) (below, "WWOD and the logs")
  - the glue:  the ONE install for every repo, the list of repos, the commands over them
    ([README.md](README.md) lists the files)
- It's what three repos became (epic `repo-split` P9), each merged in with its history:
  - spell-util:  `util/`, `toolchain/`
  - spell-server:  `server/`, and `assembler/`, merged into the server in P14 (Q43)
  - spell-element:  `element/`, its tools and test helpers
  - and `cli/`, the `spell` command's base, from spell-app's CLI (epic `repo-split` P13)
- ONE npm package, `spell-kit` (Q35;  unscoped, Q36):  its root [package.json](package.json), one version.
  - Every file is imported by ONE name, from the kit and every other repo:  the package's name and the file's path
    under `src/`, no extension (`spell-kit/util/string`, `spell-kit/server/page`, `spell-kit/element`).
  - Its `exports` say so in one wildcard entry (below, "Imports");  a few explicit ones keep the toolchain's names.
  - Outside `src/`, never imported:
    `tests/`, `bin/` (the kit's commands), `scripts/`, `tools/` (the glue), the configs.
  - Two TypeScript programs
    (Owen:  "the base shared for all browser things ... node-specific files only when needed"):
    - [tsconfig.json](tsconfig.json), browser-safe (no node types):  util, element, the test helpers
    - [tsconfig.node.json](tsconfig.node.json), node (and the DOM, for the pages the server serves):
      server, cli, the element tools, the toolchain, util's `node/`, and the bins, scripts, glue and configs
    - and [the tests' own](tests/tsconfig.json)
  - ONE lint config ([vite.config.ts](vite.config.ts)), ONE Vitest config of projects, a project per folder
    ([vitest.config.ts](vitest.config.ts)).
  - `yarn install` runs a `postinstall` that links `node_modules/spell-kit` to the kit:
    yarn links the root package nowhere by itself, and the kit's own files import it by that name.
- Every child repo is its own git repo, cloned inside the kit and git-ignored here.
  - Run git in the child repo you mean:  `git -C spell-ui status`.
  - Here, git sees the kit's own:  `src/`, `tests/`, `bin/`, `scripts/`, `agents/`, the glue.
- `yarn install` runs HERE, never in a child repo:  the child repos have no `yarn.lock`.
  - A child repo's `.yarnrc.yml` is a copy of this one's, without `yarnPath`:  the yarn release is here.
  - One copy of each package version (`nmHoistingLimits: none`), above all Solid:  pinned by `resolutions`.
  - Bump tool versions here:  `vite-plus` and every `catalog:` entry together, then the child repos' copies.

## The kit's folders

Each folder of `src/` links to its own `AGENTS.md`:  read it before working there.
- Name:  how every file imports it, the kit's own included.
- Namespace:  its self-namespace (WWOD §8).

| Folder | Name | Namespace | What it is |
| --- | --- | --- | --- |
| [util](src/util/AGENTS.md) | `spell-kit/util` | | the helpers every package shares:  small generic ones (`@proto` ...), spell's own in `spell/`, the reactive engine, and `node/json5` (node only) |
| [toolchain](src/toolchain/AGENTS.md) | `spell-kit/toolchain/...` | | what every repo's configs share:  the lint and format settings and their rules, the decorator pre-pass, the version stamp, the base tsconfig, the global types, `spell-types`, the esbuild resolver (`sourceNames()`) |
| [server](src/server/AGENTS.md) | `spell-kit/server` | `SRV` | serving pages locally:  static folders, an Express-shaped router, live reload, ports, openers, a file lock, the generic page server, the site header;  and assembling them:  link targets (`Linker`), `formatHTML()`, bundles built on demand (`Bundle`), `DataFile`, `contentFolderOf()` |
| [cli](src/cli/AGENTS.md) | `spell-kit/cli` | `CLI` | the `spell` command's base:  arguments, help, every repo's commands and hooks;  the kit's own commands (server, bundle, commands, wwod, pony) |
| [element](src/element/AGENTS.md) | `spell-kit/element` | `E` | what makes a custom element on Solid 2, for every set's elements (Spell UI's, the epics', the app's, the brand's) |
| [element-tools](src/element/AGENTS.md) | `spell-kit/element-tools/...` | | the element tools, node only:  the pack build, the root catalog, the elements' Vite settings;  their bin, `spell-pack` (element's `AGENTS.md`) |
| [test-helpers](src/element/AGENTS.md) | `spell-kit/test-helpers/...` | | the test helpers every set's tests use (element's `AGENTS.md`) |

- Every import, inside a folder too, is the package's name plus the path under `src/` (WWOD §4):
  NO `$/`, no `#`, no `../`.
  - Same-folder peers stay `./Peer`.
  - A base class read while a file evaluates comes from its own file, by its full name:  `spell-kit/element/DOMElement`.
  - The toolchain's files import each other as `./peer.ts`:  node runs its bins as they are (below).
  - A pack-module key is the import name too:  a page shares `spell-kit/element`, `spell-ui/core` ... with its
    component packs under those names (`SpellUI.packModules`, `PACK_MODULES`;  epic `repo-split` P14, Q45).
  - Lint fails a `../` import into any package's `src/` (`spell/no-parent-import`, the toolchain's
    `lint.imports.ts`).
- Which folder may use which:
  - `toolchain` and `util` are the bottom:  every config uses the toolchain.
  - `server` uses node, `json5`, linkedom, oxfmt (`formatHTML()`, loaded when it runs), util's json5 and the
    toolchain's format settings.
  - `element` uses util's generic files, one by one, and Solid.
  - `element-tools` uses `element`'s node-safe leaves (`SkeletonText`, the vocabulary types), server, Vite and `tsx`.
  - `test-helpers` use the DOM, Solid and `element`.
  - `cli` uses server and util's json5;  nothing in the kit imports `cli`.
    - It names no child repo in its code:
      each one hands it its commands, by its `package.json` (`"spell": { "commands", "hooks" }`).
  - Nothing in the kit imports a child repo:  every arrow points down.

## Commands

At the kit's root, the kit's own checks:

```sh
yarn kit:ts           # the declarations (spell-types:  both programs, the type check), then the tests' tsc
yarn kit:test         # every Vitest project;  one:  yarn vp test run --project server
yarn kit:lint         # oxlint over src, tests, bin, scripts, tools;  kit:lint:fix fixes what it can
yarn kit:format       # oxfmt;  kit:format:check only checks
yarn kit:review       # the finishing pass:  ts, lint:fix, format, test
```

- And over every repo, the kit's first, then each child repo's, lowest first ([the repos tool](tools/repos.ts)):

  ```sh
  yarn ts    yarn test    yarn lint    yarn review
  ```

- Every child repo runs its own the same way, from its folder:
  `yarn ts`, `yarn test`, `yarn lint`, `yarn review`.
  - They're plain scripts over its one `src/`;
    its declarations come from `spell-types`, a bin of the kit's beside `spell-pack`.
- The kit's other scripts:  `yarn server` (`spell server`:  the page server), `yarn favicon` (server's icons),
  `yarn cli:install` (puts `spell` on your `PATH`).
- The `spell` command:  the kit's `src/cli/` (its [AGENTS.md](src/cli/AGENTS.md)), run by [its bin](bin/spell.mjs);
  every command, every repo's:  [README-cli.md](README-cli.md).
  - Every installed repo adds its own commands to it, named in its `package.json`'s `"spell": { "commands" }`;
    `spell help` lists them, grouped by repo.
  - A word two repos both want goes under each one's short name (`spell lang check`, `spell app check`).
- The READMEs (every repo's `README.md` and `README-*.md`):
  - `yarn readme:check` checks them
  - `yarn mermaid:pretty` styles their Mermaid pictures ([README-toolchain.md](README-toolchain.md))

## Which repo holds what

The child repos, lowest first, with what each needs:  [repos.json5](repos.json5).
The kit is always there, so no `needs` names it.

| Repo | Packages | Needs |
| --- | --- | --- |
| spell-kit (this one) | `util`, `toolchain`, `server`, `element`, `element-tools`, `test-helpers`, `cli`, in its `src/`:  ONE package, `spell-kit` | nothing:  the bottom |
| [spell-lang](spell-lang/AGENTS.md) | `parser`, `markdown`, `core`, `py`, `spell`:  ONE package, `spell-lang` | the kit |
| [spell-ui](spell-ui/AGENTS.md) | the repo IS `spell-ui` | the kit |
| [spell-brand](spell-brand/AGENTS.md) | the repo IS `spell-brand` | spell-ui, the kit |
| [spell-epic](spell-epic/AGENTS.md) | the repo IS `spell-epic` | spell-ui, the kit |
| [spell-app](spell-app/AGENTS.md) | `app`, `spaces`, `lsp`, `cli`, `page-server`:  ONE package, `spell-app` (and `vscode`, its own yarn project) | spell-lang, spell-brand, spell-ui, the kit;  RUNS spell-epic by its page server's settings |

- EVERY repo is ONE npm package, named after the repo and unscoped (epic `repo-split` P11, Q36).
  - Its code is under ONE `src/` (epic `repo-split` P14, Q47), its folders right inside it:
    `spell-kit/src/server/`, `spell-lang/src/parser/`, `spell-ui/src/components/`.
  - Every file is the package's name plus its path under `src/`:  `spell-lang/parser`, `spell-ui/components/ui-button`.
  - Its tests in `tests/`, at the same paths as the code (`tests/server/Router.test.ts` tests `src/server/Router.ts`).
- Every arrow points DOWN:  a repo uses only the kit and the repos it `needs`, never one above it.
  - `yarn clone <repo>` clones exactly those, so a wrong import fails there.
  - spell-app runs spell-epic's route modules (its page server's settings), never imports it.
- Data, not code, beside them:  `spell.epics/` (the content repo) and `spell.spaces/` (your projects).

## Imports across repos

- ONE name per file, the same in every repo (epic `repo-split` P14, Q47):  the package's name plus the file's path
  under its `src/`, no extension.
  - The kit's:  `spell-kit/util/class`, `spell-kit/server/page`, `spell-kit/element`, `spell-kit/test-helpers/Fixture`.
  - The others':  each repo's ONE package, its name the repo's (epic `repo-split` P11, Q36):
    `spell-ui/components/ui-button`, `spell-lang/spell`, `spell-app/spaces/...`, `spell-brand`, `spell-epic`.
  - Inside its own repo too:  no `$/`, no `#`, no `../`.
  - Spell UI publishes short names besides (`spell-ui/ui-button`, its `publishConfig`, Q47):  for outside the repos.
- Each package's `exports`, ONE wildcard entry in three conditions, e.g. the kit's
  ([package.json](package.json)):

  ```jsonc
  "./*": {
    "spell-kit-source": ["./src/*.ts", "./src/*.tsx", "./src/*/index.ts", "./src/*/index.tsx", "./src/*"],
    "types": ["./dist-types/src/*.d.ts", "./dist-types/src/*/index.d.ts"],
    "default": "./src/*"
  },
  "./*.ts": { "spell-kit-source": "./src/*.ts", "types": "./dist-types/src/*.d.ts", "default": "./src/*.ts" }
  ```

  - `<package>-source`:  TypeScript, for the package itself (its tsconfig's `customConditions`):  its own SOURCE.
    The array is the shapes TypeScript won't try itself:  `.ts`, `.tsx`, a folder's `index`.
  - `types`:  TypeScript, for every OTHER repo:  the package's built declarations (below).
  - `default`:  Vite, Vitest, `tsx` and lint, which add extensions and find `index` files themselves.
  - `./*.ts`:  plain node, which adds none:  it imports a package file only with `.ts` written.
  - A condition name is always the package's own, never plain `source`:  `tar` in this install already uses that.
- How each tool reads another repo's package:
  - `tsc`:  its BUILT DECLARATIONS (epic `repo-split` I12), in `dist-types/` at its root (git-ignored), built by the
    toolchain's `spell-types`:  `src/util/string.ts` => `dist-types/src/util/string.d.ts`.
    - Its `package.json` lists its TypeScript programs in `"spellTypes"`, as their `tsconfig` files.
    - A repo's `yarn ts` runs `spell-types --below` first:
      the kit's and the lower repos' declarations, rebuilt where stale.
    - `yarn ts` here runs the kit's, then every repo's lowest first, so each finds the ones below it fresh.
  - Vite, Vitest, `tsx` and node:  its SOURCE (`default`).
- esbuild, used directly (spell-epic's extension and docs bundle, the brand's design bundle), reads `exports` as
  node does:  no extension added, no folder's `index`.  Its builds take the toolchain's `sourceNames()` plugin,
  which finds our names as their source files (epic `repo-split` I50).
- A file outside its repo that a program needs at run time (spell's `src/`, the frozen test projects) is found by
  PACKAGE, through `node_modules`, never by a path into that repo.
- Paths in config and settings that name another repo's folder say so from the repo's root:
  `../spell-ui/docs` in spell-app's page server settings.

## Tests

- The kit's:  in `tests/` at its root, at the same paths as the code they test under `src/`
  (`tests/server/Router.test.ts` tests `src/server/Router.ts`), with their snapshots and test data.
  - The kit's [vitest.config.ts](vitest.config.ts) runs them, a project per folder;
    [the tests' tsconfig](tests/tsconfig.json) type-checks them.
  - They import what they test by its package name (`spell-kit/server`), as everything else does.
  - Their helpers are in `src/`:  `src/server/test/` (`spell-kit/server/test/serve`), `src/test-helpers/`.
    - `src/test-helpers/` are every set's (`spell-kit/test-helpers/ElementFixture` ...;  epic `repo-split` P10, Q39):
      [element's AGENTS.md](src/element/AGENTS.md), "Tests".
- Tests only reach DOWN:
  - a higher repo's tests may use a lower repo's helpers (spell-app's and spell-brand's run Spell UI's setup,
    `spell-ui/test-helpers/setup.ts`) and its test data (spell-app's spaces reads spell-lang's frozen test projects)
  - a lower repo's never read a higher one's:  a fixture of its own, or the test moves up
  - a test that needs a higher repo only to check against it (spell-lang's TypeScript check of compiled spell,
    against the editor's types) skips itself when that repo isn't installed
- `yarn test` here runs the kit's, then every repo's;  each repo's CI its own (epic `repo-split` P12).

## CI

- Every repo has one GitHub Actions workflow, [checks.yml](.github/workflows/checks.yml):
  on a push to `main`, a pull request, or by hand.
- The kit's runs `kit:ts`, `kit:lint` and `kit:test`, with no child repo cloned.
- A child repo's checks it in the layout it's worked on:
  - the kit at the root, at the branch under test when the kit has one, else at `main`
  - the repo itself inside it, at its folder name:  the commit under test
  - the repos it needs (`repos.json5`), by `yarn clone <repo> --branch <branch> --https --shallow`:
    each at the branch under test when it has one, else its default branch
  - then its `yarn ts`, `yarn lint` and `yarn test`
- So a change across repos is checked together when every repo's branch has the same name.
- The repos are public:  no token.  The secret `SPELL_REPOS_TOKEN`, if it's set, signs the clones in (J74).
- The five child workflows are the same but for the repo's name, uv (spell-lang's and spell-app's Python) and
  spell-epic's extension install:  change them together.

## WWOD and the logs

- WWOD (`agents/wwod/`) is TRACKED in the kit (epic `repo-split` P9):  a real `agents/` folder at its root.
  - Edit it here.
  - The content repo's copy, `spell.epics/agents/wwod/`, stays for the checkouts from before the split,
    until a later todo deletes it.
- The three logs stay in the content repo (Q31):
  `agents/PAPERCUTS.md`, `SUSPECTED-BUGS.md` and `CODE-DEBT.md` are links into `../spell.epics/agents/`.
  - Edit them at their REAL path, `spell.epics/agents/<log>`, never through the link:
    Claude's Edit refuses to write through a link to a file.
- Every child repo has an `agents` link at its root (git-ignored there), to the kit's `../agents`:
  so its instructions name `agents/wwod/WWOD.md`, `agents/PAPERCUTS.md` ...
  - Every `yarn install` here makes them, and `yarn clone`:  so an epic's worktree and CI have them too.
    - The install's step:  the `postinstall`, `tools/repos.ts links` (epic `repo-split` P12).
  - Except spell-epic's:  a root `agents/` there makes Claude Code load WWOD and the logs as plugin agents
    (epic `epic-engine`'s move check).
- Edit every other content file at its real path too, `spell.epics/...`.

## Worktrees

- An epic's worktree in this layout:  a worktree of the kit at `~/www/spell.worktrees/<epic>/`, with the child repos
  inside it, each a worktree of its own repo on the epic's branch, and one install.
  - A branch cut before the split works in its one repo's worktree, as before
    (spell-app's from before the move in `~/www/spell-app/spell-app.worktrees/`, the old checkout's).
- The epic settings for a session working HERE:  [.epic/config.json5](.epic/config.json5).
