# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in the kit `spell-kit`, `~/www/spell`,
and across the child repos inside it.

**ALWAYS, before any code:  READ [WWOD](agents/wwod/WWOD.md), "What Would Owen Do?", the house style every repo shares.**
- Then the `AGENTS.md` of the folder you're working in:  one of the kit's (`server/AGENTS.md` ...), or a child
  repo's (`spell-ui/AGENTS.md` ...) and its package's.
- A rule lives in exactly ONE place:  this file holds what's about the kit and what's ACROSS repos;
  each repo's, what's about it;  each folder's or package's, what's local to it.

## The kit

- The bottom of every repo, and always there.  It holds:
  - five folders of code every repo stands on:  `util/`, `toolchain/`, `server/`, `assembler/`, `element/` (below)
  - the house style, WWOD, in [agents/wwod/](agents/wwod/) (below, "WWOD and the logs")
  - the glue:  the ONE install for every repo, the list of repos, the commands over them
    ([README.md](README.md) lists the files)
- It's what three repos became (epic `repo-split` P9), each merged in with its history:
  - spell-util:  `util/`, `toolchain/`
  - spell-server:  `server/`, `assembler/`
  - spell-element:  `element/`
- ONE npm package, `spell-kit` (Q35;  unscoped, Q36):  its root [package.json](package.json), one version.
  - Its `exports` name every entry the five folders offer, each under its folder's name:
    `spell-kit/util/class`, `spell-kit/server/page`, `spell-kit/element`, `spell-kit/toolchain/lint` ...
  - The folders have NO `package.json` of their own:  their dependencies are the root's.
  - Each folder is still its own TypeScript program, with its own `tsconfig.json`, `vite.config.ts` and
    `vitest.config.ts`:
    - browser-safe:  `util`, `element` (no node types)
    - node:  `assembler` (no DOM);  `server` (node, plus the live-reload client and the site header it serves to
      pages, so its settings keep the DOM)
  - `yarn install` runs a `postinstall` that links `node_modules/spell-kit` to the kit:
    yarn links the root package nowhere by itself.
- Every child repo is its own git repo, cloned inside the kit and git-ignored here.
  - Run git in the child repo you mean:  `git -C spell-ui status`.
  - Here, git sees the kit's own:  its five folders, `tests/`, `agents/`, the glue.
- `yarn install` runs HERE, never in a child repo:  the child repos have no `yarn.lock`.
  - A child repo's `.yarnrc.yml` is a copy of this one's, without `yarnPath`:  the yarn release is here.
  - One copy of each package version (`nmHoistingLimits: none`), above all Solid:  pinned by `resolutions`.
  - Bump tool versions here:  `vite-plus` and every `catalog:` entry together, then the child repos' copies.

## The kit's folders

Each folder links to its own `AGENTS.md`:  read it before working there.
- Entry:  how another repo imports it, an entry of the kit's `exports`.
- Alias:  how the kit's own files import it.
- Namespace:  its self-namespace (WWOD §8).

| Folder | Entry | Alias | Namespace | What it is |
| --- | --- | --- | --- | --- |
| [util](util/AGENTS.md) | `spell-kit/util` | `$/util` | | the helpers every package shares:  small generic ones (`@proto` ...), spell's own in `src/spell/`, the reactive engine, and `node/json5` (node only) |
| [toolchain](toolchain/AGENTS.md) | `spell-kit/toolchain/...` | | | what every repo's configs share:  the lint and format settings and their rules, the decorator pre-pass, the version stamp, the base tsconfig, the global types, `spell-types`, the run-time alias hook |
| [server](server/AGENTS.md) | `spell-kit/server` | `$/server` | `SRV` | serving pages locally:  static folders, an Express-shaped router, live reload, ports, openers, a file lock, the generic page server, the site header |
| [assembler](assembler/AGENTS.md) | `spell-kit/assembler` | `$/assembler` | `AS` | assembling pages:  link targets (`Linker`), `formatHTML()`, bundles built on demand (`Bundle`), `DataFile`, `contentFolder` |
| [element](element/AGENTS.md) | `spell-kit/element` | `$/spell-element` | `E` | what makes a custom element on Solid 2, for every set's elements (Spell UI's, the epics', the app's, the brand's);  the test helpers every set's tests use (`spell-kit/test-helpers/...`);  the element tools (`spell-kit/element/tools/...`:  the pack build, the root catalog, the elements' Vite settings) and their bin, `spell-pack` |

- Inside a folder, its own files by its `$/` alias;  ANOTHER folder of the kit by its entry (`spell-kit/util/string`,
  from `element/`), as before they were one package:  other repos' builds read those files' source, and a `$/` in them
  would need the kit's alias table in each (epic `repo-split` J76).
  - ONE table, [tsconfig.base.json](tsconfig.base.json) at the kit's root:  read its header comment.
  - It extends the toolchain's shared settings, `toolchain/tsconfig.base.json`;
    each folder's `tsconfig.json` (and each tests folder's) extends the table.
  - `element`'s alias is still `$/spell-element`:
    the name every page's component packs share it by at run time (`packModuleKey()`, epic `repo-split` J72).
  - The toolchain has none:  its files import each other relatively.
- Which folder may use which:
  - `toolchain` and `util` are the bottom:  every config uses the toolchain.
  - `server` is a leaf:  node built-ins only (its background page server loads the toolchain's alias hook by name).
  - `assembler` uses util's json5 and the toolchain's format settings.
  - `element` uses util's generic files, one by one.
  - Nothing in the kit imports a child repo:  every arrow points down.

## Commands

At the kit's root, the kit's own checks (`tools/kit.ts` runs each folder's step in turn, and its tests' in
`tests/<folder>/`):

```sh
yarn kit:ts           # the declarations (spell-types), then every folder's tsc
yarn kit:test         # every folder's Vitest
yarn kit:lint         # every folder's oxlint;  kit:lint:fix fixes what it can
yarn kit:format       # every folder's oxfmt;  kit:format:check only checks
yarn kit:review       # the finishing pass:  ts, lint:fix, format, test
```

- And over every repo, the kit's first, then each child repo's, lowest first (`tools/repos.ts`):

  ```sh
  yarn ts    yarn test    yarn lint    yarn review
  ```

- A folder has no scripts of its own (no `package.json`):  in it, its tools directly, `yarn vp test run`,
  `yarn vp lint src`.
- The kit's other scripts:  `yarn server` (the page server's command line), `yarn favicon` (server's icons).

## Which repo holds what

The child repos, lowest first, with what each needs:  [repos.json5](repos.json5).
The kit is always there, so no `needs` names it.

| Repo | Packages | Needs |
| --- | --- | --- |
| spell-kit (this one) | `util`, `toolchain`, `server`, `assembler`, `element`:  ONE package, `spell-kit` | nothing:  the bottom |
| [spell-lang](spell-lang/AGENTS.md) | `parser`, `markdown`, `core`, `py`, `spell` | the kit |
| [spell-ui](spell-ui/AGENTS.md) | the repo IS `@spell-app/ui` | the kit |
| [spell-brand](spell-brand/AGENTS.md) | the repo IS `@spell-app/brand` | spell-ui, the kit |
| [spell-epic](spell-epic/AGENTS.md) | the repo IS `@spell-app/epics` | spell-ui, the kit |
| [spell-app](spell-app/AGENTS.md) | `app`, `spaces`, `lsp`, `cli`, `page-server` (and `vscode`, its own yarn project) | spell-lang, spell-brand, spell-ui, the kit;  RUNS spell-epic by its page server's settings |

- Three kinds of repo:
  - the kit:  ONE package of several folders, each its own TypeScript program, at its root;
    tests in `tests/<folder>/`
  - several packages:  a folder each at the repo's root (`spell-lang/core/`, no `packages/`), named in its
    `package.json`'s `workspaces`;  tests in `tests/<package>/`
  - flat:  the repo IS its one package;  tests in `tests/`, mirroring the code
- Every arrow points DOWN:  a repo uses only the kit and the repos it `needs`, never one above it.
  - `yarn clone <repo>` clones exactly those, so a wrong import fails there.
  - spell-app runs spell-epic's route modules (its page server's settings), never imports it.
- Data, not code, beside them:  `spell.epics/` (the content repo) and `spell.spaces/` (your projects).

## Imports across repos

- INSIDE a repo, its `$/` aliases:  `$/parser`, `$/ui/components/...`, the kit's `$/server`.
  - Each repo's own table, `tsconfig.base.json` at its root, holds ONLY that repo's names (epic `repo-split` P8, J46).
  - It extends the toolchain's shared settings, `spell-kit/toolchain/tsconfig.base.json`;  each package's
    `tsconfig.json` extends the table.
- From ANOTHER repo, the package's npm name, an entry its `package.json` `exports` names.
  - The kit's:  `spell-kit/<folder>/...`, `spell-kit/util/class`, `spell-kit/server/page`, `spell-kit/element`.
  - The others':  `@spell-app/ui/core`, `@spell-app/spell` (renamed in a later phase, P11).
  - Lint fails a `$/` alias into another repo (`spell/no-cross-repo-alias`) and a `../` path into another repo's
    package (`spell/no-cross-package-import`):  the toolchain's `lint.imports.ts`.
- How each tool reads another repo's package:
  - `tsc`:  its BUILT DECLARATIONS (epic `repo-split` I12).
    - Each `exports` entry has a `types` condition, `./dist-types/...d.ts`, built by the toolchain's `spell-types`
      (git-ignored), every `$/` in them rewritten as a relative path.
    - The kit's are built folder by folder into ONE `dist-types/` at its root (`dist-types/util/src/index.d.ts` ...):
      its `package.json` lists the folders in `"spellTypes"` (util, server, assembler, element).
      The toolchain has no aliases, so others read its source.
    - A repo's `yarn ts` runs `spell-types --below` first:  the kit's and the lower repos' declarations, rebuilt
      where stale.
    - `yarn ts` here runs the kit's, then every repo's lowest first, so each finds the ones below it fresh.
  - Vite and Vitest:  its SOURCE (`default`), each file with its own repo's aliases (`resolve.tsconfigPaths`).
  - `tsx` and node:  its source, with the RUN-TIME ALIAS HOOK, `spell-kit/toolchain/aliases`:
    each `$/` import by the importing file's own repo's table.
    - Every `tsx` program that runs another repo's source loads it after `tsx`:
      `tsx --import spell-kit/toolchain/aliases <script>`, or `await import("spell-kit/toolchain/aliases")` after
      `register()`.
    - Without it:  `Cannot find package '$'`, on the first other repo's file.
  - The toolchain's [AGENTS.md](toolchain/AGENTS.md) says how both work.
- A file outside its repo that a program needs at run time (spell's `src/`, the frozen test projects) is found by
  PACKAGE, through `node_modules`, never by a path into that repo.
- Paths in config and settings that name another repo's folder say so from the repo's root:
  `../spell-ui/docs` in spell-app's page server settings.

## Tests

- The kit's:  in `tests/<folder>/` at its root, at the same paths as the code they test
  (`tests/server/src/...` tests `server/src/...`), with their snapshots and test data.
  - Each folder's Vitest finds them (its config's `dir`);
    a `tsconfig.json` in each tests folder gives them the folder's own settings and the aliases.
  - Their helpers stay in the folders:  `server/test/`, `element/test-helpers/`.
    - `element/test-helpers/` are every set's (`spell-kit/test-helpers/ElementFixture` ...:  epic `repo-split` P10,
      Q39):  [element's AGENTS.md](element/AGENTS.md), "Tests".
- Tests only reach DOWN:
  - a higher repo's tests may use a lower repo's helpers (spell-app's and spell-brand's run Spell UI's setup,
    `@spell-app/ui/test/setup.ts`) and its test data (spell-app's spaces reads spell-lang's frozen test projects)
  - a lower repo's never read a higher one's:  a fixture of its own, or the test moves up
  - a test that needs a higher repo only to check against it (spell-lang's TypeScript check of compiled spell,
    against the editor's types) skips itself when that repo isn't installed
- `yarn test` here runs the kit's, then every repo's;  each repo's CI (epic `repo-split` P9) its own.

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
  - `yarn clone` makes them.
  - Except spell-epic's:  a root `agents/` there makes Claude Code load WWOD and the logs as plugin agents
    (epic `epic-engine`'s move check).
- Edit every other content file at its real path too, `spell.epics/...`.

## Worktrees

- An epic's worktree in this layout:  a worktree of the kit at `~/www/spell.worktrees/<epic>/`, with the child repos
  inside it, each a worktree of its own repo on the epic's branch, and one install.
  - A branch cut before the split works in its one repo's worktree, as before
    (spell-app's in `~/www/spell-app/spell-app.worktrees/`).
- The epic settings for a session working HERE:  [.epic/config.json5](.epic/config.json5).
