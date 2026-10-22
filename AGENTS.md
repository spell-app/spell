# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in the kit `spell-kit`, `~/www/spell`,
and across the child repos inside it.

**ALWAYS, before any code:  READ [WWOD](agents/wwod/WWOD.md), "What Would Owen Do?", the house style every repo shares.**
- Then the `AGENTS.md` of the folder you're working in:
  - one of the kit's ([server's](src/server/AGENTS.md) ...)
  - or a child repo's ([Spell UI's](spell-ui/AGENTS.md) ...), and its package's
- A rule lives in exactly ONE place:  this file holds what's about the kit and what's ACROSS repos;
  each repo's, what's about it;  each folder's or package's, what's local to it.

**If working with Solid (2.0):  READ [the Solid 2 rules](spell.epics/guides/solid/solid-2.md) IN FULL FIRST.**
- Solid work is any of:
  - components, JSX, effects / signals / stores
  - spell-lang's `core` rendering, `spell-kit/util` reactivity, `spell-kit/element`
  - `spell-ui` elements, and every set's built on them
  - any React-to-Solid step
- Solid 2 is neither React nor Solid 1,
  and guessing from either produces wrong code.

**If asked for a new skill or `spell` command, or about to add, rename or remove a yarn script:
READ [the commands guide](spell.epics/guides/dev/commands/commands.md) FIRST,**
and suggest where it belongs before building it (below, "Commands").

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
  - Tool versions are bumped here (below, "Toolchain:  Vite+").

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
  - `yarn readme:check` (`spell readme check`) checks them
  - `yarn readme:test` (`spell readme test [page...]`) runs every example they print with an Output fold, and
    compares what it prints (epic `readme` P16;  WWOD §6)
  - `yarn mermaid:pretty` styles their Mermaid pictures ([README-toolchain.md](README-toolchain.md))
- Three ways to make a repo do something:  the `spell` CLI, Claude skills, yarn scripts.
  - Their map, one row per operation:  [the commands page](spell.epics/guides/dev/commands/commands.html).
    - Its data:  `commands.json5` beside it.
    - Shown by the page server:  `epic pages open guides/dev/commands/commands.html`.
  - Target:  the CLI drives everything.
    - Repo tools are `spell <noun> <verb>`:  the kit's `spell`, every repo's commands under one name.
      - e.g. `spell server start`, `spell pack build`, `spell app vscode`
    - Skills keep judgement and dialog, and call it.
    - Yarn keeps each repo's own scripts, and aliases the rest.
- **Owen asks for a new skill or `spell` command, or you're about to add, rename or remove a yarn script:**
  - READ [the commands guide](spell.epics/guides/dev/commands/commands.md) FIRST.
  - Then SUGGEST, before building:  where it belongs, its name, what it replaces,
    which roadmap move it advances.
- MUST keep the commands page true in the same change:  `commands.json5`, then `spell commands check`.
  - `commands.json5` and `commands.md` are shared content (below), but the check reads each branch's CLI.
  - So a branch adding a command can make main's check fail until it merges
    ([the code-debt log](agents/CODE-DEBT.md), "docs").
- Tools are TypeScript (or node JS in [the docs tools](spell-epic/src/tools/)), never python:  one language.
- Skills reach them as `spell ...` (and the epic tools as `epic ...`).
  - `spell` is the link `yarn cli:install` makes, once per machine:  the kit's [spell.mjs](bin/spell.mjs)
    (epic `repo-split` P13;  spell-app's `cli/` until then).
  - Without it:  `node bin/spell.mjs ...` from the kit's root.

## Toolchain:  Vite+

- Every repo builds, lints, formats and tests with ONE dev dependency, `vite-plus` (command `vp`),
  which pins these together:
  - vite (as `@voidzero-dev/vite-plus-core`)
  - vitest, oxlint, oxfmt and tsgolint
- Node 24 (`engines`).
- The versions are the yarn `catalog:` in the kit's [.yarnrc.yml](.yarnrc.yml).
  - Bump them here, together:  `vite-plus` and every `catalog:` entry, to what `vp toolchain` lists.
  - Then the child repos' copies of `.yarnrc.yml` (no `yarnPath`:  the yarn release lives once, here).
  - NEVER pin one tool on its own.
- In any repo, at its root:

  ```sh
  yarn vp lint
  yarn vp fmt [--check]
  yarn vp test
  yarn vp check
  ```

- `yarn review` is the finishing pass (WWOD §1):  a repo's, over its one `src/`;  the kit's, over every repo.
  - It's about the same (`~==`) as all four of these (the kit's own:  `yarn kit:review`):

    ```sh
    yarn ts + yarn lint:fix + yarn format + yarn test
    ```

- `yarn oxfmt` and `yarn oxlint` don't work:  they're not deps of their own, only `vp`'s.
  - `yarn vitest` does.
- Configs import from `vite-plus` (lint rule `vite-plus/prefer-vite-plus-imports`).
  - Tests:  WWOD §20 › "Test APIs come from Vite+".
- `yarn tsc`, never `npx tsc`:  yarn picks the install's TypeScript 7.
  - Why:  a dependency's own TypeScript can take `.bin/tsc`.
    - E.g. ui's `vite-plugin-dts` needs TypeScript 6 (`@typescript/typescript6`).
    - Today `.bin/tsc` is the root's 7, but only by luck of the hoister
      ([the papercuts log](agents/PAPERCUTS.md), "## ui").
- NEVER hard-code `<package>/node_modules/<dep>`:  yarn hoists to the kit's `node_modules`.
  - Node code resolves the package instead ([NodePackage](src/element-tools/NodePackage.ts)).
  - Nor `<repo>/node_modules`:  a child repo has none, the install is the kit's.
- Lint / format settings:  the toolchain's, `spell-kit/toolchain/lint` ([lint.ts](src/toolchain/lint.ts)).
  - Each repo's ONE `vite.config.ts`, at its root, spreads it in its lint and fmt blocks
    (the kit's:  [vite.config.ts](vite.config.ts)).
  - No `.oxlintrc.json` / `.oxfmtrc.json` any more.
  - Our own rules, two JS plugins beside [lint.ts](src/toolchain/lint.ts):
    - `lint.patterns.ts`:  its rules, `spell-ui/*`, guard Spell UI's patterns in component files:
      "The lint guard" in [spell-ui's AGENTS.md](spell-ui/AGENTS.md).
    - `lint.imports.ts`, everywhere:
      - `spell/no-parent-import` fails a module path starting `../` that lands in a package's `src/` (any repo's):
        its fix is the package name + path under `src/`;  `../` to a file outside `src/` (a config) is fine
    - Their tests:
      - spell-ui's [LintPatterns.test.ts](spell-ui/tests/tools/LintPatterns.test.ts)
      - the kit's [lint.imports.test.ts](tests/toolchain/lint.imports.test.ts)

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
| [spell-app](spell-app/AGENTS.md) | `app`, `spaces`, `lsp`, `cli`:  ONE package, `spell-app` (and `vscode`, its own yarn project) | spell-lang, spell-brand, spell-ui, the kit |

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
- A file outside its repo that a program needs at run time (spell's `src/`, the core's) is found by
  PACKAGE, through `node_modules`, never by a path into that repo.
- Paths in config and settings that name another repo's folder say so from the repo's root:
  `../spell-ui/site/_assets` in spell-brand's part of the page server's settings.

## The page server

- ONE page server, the KIT's, started from the kit's root only (epic `repo-split` P16):
  `spell server start | status | stop` from any folder of the kit;  any other root is an error naming the kit.
- Each repo declares ITS OWN part of its settings in its own `package.json`, `"pageServer"`, the way it declares its
  `"spell": { "commands" }`, every path from its own folder:
  - spell-ui:  its component set (`docs`) and its site bundle (`site/_assets`)
  - spell-brand:  its set, its engine routes (`/_brand/assets/` ...), what it watches, its pages' bundle
  - spell-epic:  its route modules, engine routes (`/_epic/assets/`, `/_epic/pack/`, `/templates/`), what it watches,
    Epic UI, the local copy of highlight.js (`localCopies`)
  - spell-app:  the app's route module (`appRoutes`), App UI, the script that colours spell (`pageScripts`)
- The CONTENT repo's part is a file of its own, `page-server.json5` in the content folder:  the site's tabs, the
  writable folders, what moved out of it (`gone`).
- The kit's server merges them, kit first, then the content repo's, then each INSTALLED child repo's, lowest first
  (`repos.json5`);  it names no child repo.  So it runs with any set of repos:  the kit, spell-ui and spell-epic serve
  the epic pages.
- How:  [the server's AGENTS.md](src/server/AGENTS.md), "The page server's settings".

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
    `spell-ui/test-helpers/setup.ts`;  spell-app's run spell-lang's `parseSpellProject()`) and its test data
  - a lower repo's never read a higher one's:  a fixture of its own, or the test moves up
    - e.g. Spell's frozen test projects (`@spell/test`) and the tests that compile them whole are spell-app's, beside
      its other `@spell` groups (epic `spanish` P18);  spell-lang's own tests write their projects inline
  - a test that needs a higher repo only to check against it skips itself when that repo isn't installed
    (none today:  spell-lang's TypeScript check of compiled spell, against the editor's types, moved up with the
    frozen projects)
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

## Words

- Each kind of page has ONE name (Owen, 2026-10-14, epic `epic-workflow` P14).
  - Write these, in docs, skills, comments, labels and messages:
    epic page, saga page, details page, review page, choice page, guide, cheatsheet, commands page,
    components page, components guide, brand page, home page, list page, changelog, template.
  - What each one is, and where it lives:  "Page kinds" in [spell-epic's AGENTS.md](spell-epic/src/AGENTS.md).
- Owen still says the older words.  Read them as the new ones, but write the new ones:
  - "plan doc", "epic doc" -- the epic page
  - "epic name" -- the epic id (its folder, `epics/<epic-id>/`)
  - "durable doc" -- the epic's guide;  "syntax-choices page" -- a choice page;
    "analysis page" -- a review page;  "docs index", "docs home" -- the home page;
    "goal", "goals page" -- a saga (an epic of epics), a saga page
- Names only code reads keep the old words:
  - `<epic-id>.plan.html`, `PlanDoc`, `plan-doc.md`
  - spell-epic's `yarn plan-doc` (the `epic` tool in its own order)
  - So does the record:  log entries, quotes, commit messages.
- Pointing at a saga, an epic or an item (epic `epic-workflow` P15, J32):
  - In Owen's prompts, "saga drawable-spell" names a saga, and a SHORT ADDRESS names a saga, an epic or an item:
    `SAGA:/drawable-spell` (the saga page), `SAGA:/drawable-spell/python-target#T1` (item T1 of that epic).
    - The colon form (`SAGA:/drawable-spell:python-target#T1`) means the same;  ids in any case.
  - Resolve one with the openers, which take an address:
    `epic pages open SAGA:/...` shows it, `epic pages link SAGA:/... --show` gives its links.
  - In pages, write `<epic-link epic="python-target" item="T1"></epic-link>`, not a path;
    a plain `<a href="SAGA:/...">` works too.  The rules:  [spell-epic's AGENTS.md](spell-epic/src/AGENTS.md), "Links".

## Worktrees

- An epic's worktree in this layout:  a worktree of the kit at `~/www/spell.worktrees/<epic>/`, with the child repos
  inside it, each a worktree of its own repo on the epic's branch, and one install.
  - A branch cut before the split works in its one repo's worktree, as before
    (spell-app's from before the move in `~/www/spell-app/spell-app.worktrees/`, the old checkout's;
    older still, in spell-app's `.claude/worktrees/<name>`).
- The epic settings for a session working HERE:  [.epic/config.json5](.epic/config.json5).

### Windows

- Owen works in VS Code windows opened from their WINDOW FILES, `<name>.code-workspace`.
  - They live in the content repo's `windows/` folder, not in a code repo (epic `epic-eject` P13):
    `spell.epics/windows/`, each machine's own, git-ignored there.
    - Where:  `windowsFolder` in [the kit's epic settings](.epic/config.json5);  `epic config windowsFolder` prints it.
    - A worktree's window file is in its `ongoing/` folder.
    - Before P13 they were spell-app's `workspaces/`, tracked and marked `skip-worktree`:
      `epic window move` carried them over once.
  - `epic window init` writes missing ones, and brings the rest up to date.
  - Each has its own theme.
- Each window shows the WHOLE branch:
  - folder 1 is the KIT's root, `~/www/spell` (since epic `repo-split` P9), then the shared content repo
    - a worktree's window:  the kit's root, the worktree (`⎇ <name>`), the content repo
  - no package folder since 2026-10-06
  - Why the kit first:  the Claude panel lists only the sessions saved under a window's FIRST folder,
    so every window lists every session, of every repo.
  - So sessions start at the kit's root:
    read the repo's and the folder's `AGENTS.md` before working in one.
- Each file shows ONCE in Explorer and Quick Open:
  - The window's `files.exclude` shows the shared links only under `spell.epics`
    ([filesExclude()](spell-epic/src/window.mjs) writes it).
  - A worktree's window hides the main root's files (beside its git-ignored `.spell-main` marker).
  - `search.exclude` in [spell-app's VS Code settings](spell-app/.vscode/settings.json)
    keeps generated files, icons and screenshots out of Quick Open and Find.

### Entering one

- Enter a worktree with `/isolate <name>` (`/epic` does it too), or with Claude's own `EnterWorktree`.
- The `WorktreeCreate` hook ([worktree.mjs](spell-epic/hooks/worktree.mjs), spell-epic's plugin's):
  - makes an epic's worktree on its own branch, `<name>`, from local main:
    a worktree of the kit at `~/www/spell.worktrees/<name>/`, with a worktree of each child repo inside it
    - which folder and branch:  `worktreesFolder` and `baseBranch` in [the kit's epic settings](.epic/config.json5),
      which win over a child repo's own (`EpicConfig`;  `epic config` prints them)
  - keeps the session saved at the root
    (Claude's own worktrees move it, and it drops out of every window's list)
- New window, or stay?
  - `epic window should-stay` recommends one, with reasons, and Owen picks in a modal
    ([the isolate skill](spell-epic/skills/isolate/SKILL.md), "Start", step 2b).
  - Staying is fine when the session is its window's only one.
  - A session that stays:  same tab, only its folder changes.
    - Its changes show in Source Control,
      since every package window has `git.detectWorktrees` on (each worktree its own repo there).
    - The window is titled `⎇ <name>` and its title bar tinted at once (`epic window stay <name>`).
    - Both are put back at `/isolate done`.
  - NEVER add a worktree's folders to a package window (`epic window add`).
    - VS Code writes them into the window file,
      and they stay there after the worktree is gone (three did, by 2026-10-03).
    - Nobody sees them:  the window files are in no git repo.

### A new window

- Open it at once, from the worktree's root:  `epic window open <name>`.
- On leaving (`/isolate done`), the session does NOT move back:  it stays in that window, which Owen closes.
  - `... close <name>` closes it and deletes its file.
- Then `... handoff <name> --prompt continue`.
  When the turn ends:
  - the session moves to that window, in an editor tab (never the sidebar)
  - `continue` is typed into it
  - its old tab closes (the `Stop` hook, [handoff.mjs](spell-epic/hooks/handoff.mjs))
- So END THE TURN right after `handoff`:  the rest (`yarn install` ...) happens in the new window.
- The old tab is found by the session's title.
  - The `UserPromptSubmit` hook, [prompt-gate.mjs](spell-epic/hooks/prompt-gate.mjs), renames the session
    on `/isolate <name>`, `/epic <name>` and `/unpark <name>`.
  - The hook also blocks those prompts in plan mode or inside another worktree,
    saving their text to `~/.spell/prompts/<name>.md` first.
  - Except `/epic <name>` inside another worktree:  it means "open a window for `<name>`",
    so Claude offers one.
    - `epic window launch <name>`:  a NEW session there.
      - Its window already open (epic `epic-eject` P10, Owen's r2):
        - the window's file and look stay as they are
        - the epic's running session there is typed into;  a new one starts only when none runs
    - The epic skill's "From another worktree" has the steps.
- The window's file:  `<name>.code-workspace`, in the windows folder's `ongoing/` (above, "Windows").
  - Its look:  that of the window it's opened from, or the one asked for.
  - `/epic <name> -purple`:  Tomorrow Night Blue's look in one of 12 hues (`epic window color`).
  - `/epic color <look>` recolours the window you're in, live.
  - Its folders:  the MAIN root first (so its Claude panel lists every session),
    then the worktree's root (`⎇ <name>`), then the shared content repo.
  - The main root's files are hidden (above).
- Why:  Owen reviews in VS Code;  edits a window doesn't show are invisible there.
- `epic window` works in a fresh worktree, before its `yarn install`.
  - The `spell` link runs the MAIN checkout's CLI, which has its packages.
  - `yarn` couldn't run it:  yarn runs no script there before `yarn install`.
- A doc shown while the move is pending waits, then shows beside the session in the window it moved to.
  - That's `epic open <name> --review` or `epic window show`.
- A running epic's epic page is shared (below, "Shared content"):  ONE file, the same in every checkout.
  - So the MAIN checkout's page server shows it too,
    listed on the Epics list page with the merged ones.
  - `spell server url` gives that URL ([the page server guide](spell.epics/guides/server.html), "Running epics").
- NEVER `code --add` / `--remove`:
  they act on the focused window, and a one-folder window restarts its extensions, Claude panel included.
- NEVER `code -r`:  it restarts the session.
- `code <file>.code-workspace` only through `epic window open`.

### Leaving, merging, shelving

- Leave with `ExitWorktree` `keep`.
  - The hook's `remove` never deletes uncommitted or unmerged work.
- Merge main into a branch with `epic worktree merge-main`, never a bare `git merge main`.
  - It REGENERATES each generated file both sides changed, from the merged source:
    bundles, site and brand data, snapshots, `yarn.lock`.
  - It stops on any other conflict;  `--continue` once they're resolved and added.
  - Those generated files are marked in each repo's root `.gitattributes`:
    - `merge=binary`:  never line-merged
    - `-diff`, when minified
    - `linguist-generated`:  collapsed in GitHub's PR diffs
  - A new committed generated file:
    add it there AND to its repo's generators list, `.epic/generators.json5`
    (each branch's own, read by `MainMerge`;  the kit's:  [generators.json5](.epic/generators.json5)).
  - NOT committed at all (since 2026-10-07):  the bundles only the page server serves,
    whose hashed chunk names churned every diff.
    - Spell UI's docs site:  its `_assets/`, in [spell-ui's site](spell-ui/site/)
    - the brand pages':  `_assets/ui/`, in [spell-brand](spell-brand/)
    - They're git-ignored.
      The page server builds the stale ones when it starts, and a page waits for them.
    - By hand:  `spell bundle [--stale]`, or `check`.
    - The code:  `Bundle`, in `spell-kit/server`.
    - A merge untracks any `main` still commits.
  - It reports snapshot entries with a value NEITHER side had:
    new behaviour nobody reviewed;  show them to Owen.
  - NOT `merge=ours`:  it drops the other side's changes silently,
    and GitHub ignores merge drivers anyway.
- Shelve a session's work while another session changes what it depends on:
  - `/park`:  a WIP commit in its own worktree, plus a `PARKED-<name>.md` note
  - `/unpark`:  pick it back up
  - `/wait-for <other>`:  wait for that session to finish, then merge `main` in and carry on by itself
- Say so in one line:
  "isolated in worktree <name> (branch <name>), open in its own window, ⎇ <name>",
  or "..., staying in this window".

## Shared content

- The content repo, `spell.epics`, holds these folders.
  No code repo tracks them, and page URLs follow them (`/epics/seo/seo.plan.html`).
  - Epic `shared-content` made them, live since 2026-10-04.
  - Epic `claude-design` P4 split them into root folders, 2026-10-05.
- The folders:
  - `epics/` -- epic pages, `epics/<name>/<name>.plan.html`, with their inboxes and details pages
  - `guides/` -- every other docs page ([the Solid 2 guide](spell.epics/guides/solid/solid-2.html), say),
    with its Markdown, JSON and `experiments/`
  - `pages/` -- [the docs' home page](spell.epics/pages/index.html), and the scratch details pages, `pages/details/`
  - `ui/` -- Spell UI's hand-written docs pages (claude-design P6), LEFT for the other checkouts.
    - Since epic `people-and-orgs` P18 they're in [spell-ui's docs/](spell-ui/docs/), served at `/components/ui/`.
    - The page server answers "not found" for `/ui/`;  that epic's merge removes the folder (its T3).
  - `brand/` -- the Brand tab's pages ([spell-brand's AGENTS.md](spell-brand/AGENTS.md)):
    Claude Design's exports and their Spell UI copies
  - `sagas/` -- the SAGAS, each an epic of epics (epic `epic-workflow` P15):
    - `sagas/sagas.json5`:  the list, in Owen's order;  changed only through `epic saga ...`
    - `sagas/<id>/<id>.saga.html`:  each saga's page
    - `sagas/index.html`:  the Sagas list page, the top bar's tab
    - an epic names its saga with `<epic-page saga="<id>">`, a guide with `<meta name="spell-saga" content="<id>">`
  - `goals/` -- the first saga pages (once goal sets), PARKED since 2026-10-11 (epic `epic-workflow` P6):
    read only, buttons saying TODO.
    Their tooling is in `goals.zip`, at spell-app's root (`packages/goals.zip` before epic `repo-split` P8);
    epic `epic-goals` rebuilds it ([the parked sagas guide](spell.epics/guides/goals/goals.html)).
  - `agents/` -- one copy of the logs for every repo and branch:
    - the three logs:
      [PAPERCUTS.md](agents/PAPERCUTS.md), [SUSPECTED-BUGS.md](agents/SUSPECTED-BUGS.md),
      [CODE-DEBT.md](agents/CODE-DEBT.md)
    - WWOD's old copy (`agents/wwod/`):  WWOD is tracked in the kit since epic `repo-split` P9 (below);
      the copy here stays for the checkouts from before the split, until a later todo deletes it

### How they're found

- They're ONE shared content repo, the same for main and every worktree.
  - It's `spell.epics`, inside the kit and git-ignored here (epic `repo-split` J5):  an ordinary git repo, local only.
    - `~/www/spell-app/spell-app.epics` before.
    - An epic's worktree has a link to it, `spell.epics`.
  - Where it is:  `contentFolder`, in [the kit's epic settings](.epic/config.json5) (epic `epic-eject` P4);
    a child repo's own settings name the same folder (spell-app's:  `../spell.epics`).
    `epic config contentFolder` prints it.
  - So every worktree sees every edit at once:  no per-branch copy, and these files never conflict on merge.
- Found in the content folder itself, never linked in at a checkout's root (epic `epic-eject` P12):
  - the page server serves it at `/`, after the checkout's own files, and under every worktree's address
    (`serveContent()`, [the kit's server AGENTS.md](src/server/AGENTS.md))
  - the tools read it from the epic settings (spell-epic's `EpicConfig`, the kit server's `contentFolderOf()`)
  - the one link:  each child repo's `agents`, to the kit's `agents/`, whose three logs link here
    (below, "WWOD and the logs")
  - a checkout cut before P12 still links them in, by its own manifest, until it merges `main`
- Claude edits shared files at their REAL path, from main or any worktree.
  - That's `$(epic config contentFolder)/<path>`:  `/Users/owen/www/spell/spell.epics/<path>`.
    - `/Users/owen/www/spell-app/spell-app.epics/<path>` before epic `repo-split` P9.
  - E.g. `.../spell.epics/agents/PAPERCUTS.md`.
  - A worktree session's Edit / Write refuses a path through a link, before any hook could step in.
    It says "Edit the worktree copy of this file instead of the shared-checkout path":
    there is no worktree copy.
  - Folders are linked, never single files:  Claude's Edit refuses to write through a link to a file.
  - Reading goes through `agents/` as usual;  every other shared file by its real path.
- What `epic shared link` links in at a checkout's root, its manifest:  nothing, in every repo now.
  - The manifest:  the root `package.json`'s `"shared": { "links" }`, else the epic settings' `sharedFolders`
    (`[]` in the kit and spell-app);  and the `.gitignore`'s `# shared:start` ... `# shared:end` block.
  - spell-app's listed `agents` until epic `repo-split` I64:  `agents` is the kit's link now (above).
  - A checkout's links are its OWN branch's manifest's:  `epic shared link` after merging a manifest change,
    which also removes a link into the content repo the manifest no longer names.
- Old paths last until every checkout has merged the reorg (claude-design T1).
  - The shared repo's old docs folder holds a link per old entry into the root folders,
    so older code still finds its files there:

    ```text
    packages/docs/content/epics -> ../../../epics
    packages/docs/content/solid -> ../../../guides/solid
    ```

  - The old URLs, `/packages/docs/content/<x>`, answer "not found":
    the page server redirects none since `people-and-orgs` P16 (Q30).
  - Older code writes old-style links, and pages at old paths.
    - The repair that moved them (`epic shared repair`, once also the first step of every turn's
      `epic shared commit`) is gone since epic `repo-split` Q45:  its work is done.

### Commits

- The shared repo is committed by itself after every Claude turn.
  - The `Stop` hook, [shared-commit.mjs](spell-epic/hooks/shared-commit.mjs), runs `epic shared commit`.
  - Nobody commits those files by hand.
- One commit per place the files live:
  - `auto: epic <name>`
  - `auto: guides/<folder or file>`
  - `auto: goals/<set>`
  - `auto: agents`, and likewise for pages, ui and brand
  - else `auto: other`
- Trailers:
  - `Turn-end: <checkout>`:  whose turn swept them up, NOT their author.
    Any turn commits every session's pending edits.
  - `Session:`
- NEVER touch the shared paths from a code repo with any of these:
  - `git add`
  - `git checkout --`
  - `git restore`
- NEVER run git inside the content repo's folders (`epics/`, `guides/` ...):  it's the shared repo there.
  Run it in the code repo you mean.

### Commands and tips

- `epic shared status | init | link | commit | migrate <worktree>`
  - `--dry-run` on `migrate`
- A new worktree is linked by the `WorktreeCreate` hook.
- A worktree cut before the cutover runs `epic shared migrate <name>` before it merges `main`.
  - First it merges `0fc52e02` (spell-app's main just before the cutover), if it predates the docs move.
- After merging a branch from before the docs move, `epic shared repair` used to tidy up after it.
  It's gone since epic `repo-split` Q45, its work done:
  - It moved pages the branch left in the old docs package's folder into their shared folders.
  - It fixed links (and their tab names) written for an old layout.
  - And the docs package's end (`people-and-orgs` P16):
    the shared pages' links into its old tools folder now point into spell-epic's [src/tools/](spell-epic/src/tools/)
    (`relocate.js relink`, run once).
- Shared docs may link code another branch has and this one doesn't yet:
  `doc-links.js --check` reports those as missing in this checkout.
- Every window shows `spell.epics` as a folder, with its own Source Control:  the auto commits.
- Searching:  the links are git-ignored.
  - `grep -R` follows them (`grep -r` doesn't).
  - `rg` needs `-L --no-ignore-vcs`.
  - Or search `spell.epics`.
- Epic-page item fixes carry the epic's name:  `<epic> I3:  ...`.
  - Phase commits stay `P3:  <phase name> -- ...`.

## WWOD and the logs

- WWOD (`agents/wwod/`) is TRACKED in the kit (epic `repo-split` P9):  a real `agents/` folder at its root.
  - Edit it here.
- The three logs stay in the content repo (Q31):
  `agents/PAPERCUTS.md`, `SUSPECTED-BUGS.md` and `CODE-DEBT.md` are links into `../spell.epics/agents/`.
  - Edit them at their REAL path, `spell.epics/agents/<log>`, never through the link (above, "Shared content").
- Every child repo has an `agents` link at its root (git-ignored there), to the kit's `../agents`:
  so its instructions name `agents/wwod/WWOD.md`, `agents/PAPERCUTS.md` ...
  - Every `yarn install` here makes them, and `yarn clone`:  so an epic's worktree and CI have them too.
    - The install's step:  the `postinstall`, `tools/repos.ts links` (epic `repo-split` P12).
    - It replaces an `agents` LINK that points anywhere else (epic `repo-split` I64):
      a checkout from before the split linked the content repo's old WWOD, which teaches `$/` aliases.
    - A real `agents/` folder is left alone.
  - Except spell-epic's:  a root `agents/` there makes Claude Code load WWOD and the logs as plugin agents
    (epic `epic-engine`'s move check).

## Long-term debt

- [The code-debt log](agents/CODE-DEBT.md) tracks structural debt we have knowingly chosen NOT to fix yet.
- It and the other two logs live in `agents/`, shared (above, "Shared content"):
  - [the suspected-bugs log](agents/SUSPECTED-BUGS.md)
  - [the papercuts log](agents/PAPERCUTS.md)
  - One file each for every repo and package, with a `## <package>` section per package.
  - Add to your package's section.
- Add a code-debt entry when a problem is structural, too big to fix in passing, and being tolerated deliberately.
  - Especially when a test or lint rule is pinned, skipped or widened to accommodate it.
  - Record the mechanism, not a guess, so nobody rediscovers it.
- NOT for:
  - local cleanups:  an inline `REFACTOR:` marker
  - suspected bugs:  the suspected-bugs log
  - tooling papercuts:  the papercuts log
- See that file's header for the entry format.
- The papercuts log:  anything that slowed down development.
  - Lost time to one mid-session?  Append date · symptom · fix · project.
  - Check it FIRST when tooling fails mysteriously.
- The suspected-bugs log:  something that looks like a bug, but you're not sure.
  Add it under its package.

## Changelog

- [The changelog](spell.epics/guides/changelog.html):  what the repos shipped, newest first.
- MUST be kept up to date by every `/isolate` and `/epic`:
  - `/epic`:  at its Doc Review, add the entry to "2. In worktrees".
    When it merges into `main`, move it under its month in "3. Merged into main".
  - `/isolate done`:  before merging into `main`, add an entry for what the branch shipped.
    Skip a branch with nothing worth a reader's time:  typo fixes, a papercut.
- It's shared (above, "Shared content"):  write an entry straight into it, from any checkout.
  - No branch commit, no merge conflicts:  the `Stop` hook commits it.
- An entry is one nested `<ui-section>` under its month, newest first.
  - Its markup:  `<ui-section id="<epic or worktree name>" header="YYYY-MM-DD · Title">`.
  - The page's header comment has the markup in full.
  - Inside, a `spell-meta` list with LINKS:
    - the epic page:  `epics/<name>/<name>.plan.html`, with `target="<name>"`
    - the guide
    - the branch
  - Then EVERYTHING it shipped, one bullet each, by phase when there are phases -- not a summary.
- Then finish the page as [spell-epic's AGENTS.md](spell-epic/src/AGENTS.md) says ("Finishing a page"),
  and bump its footer's date.
