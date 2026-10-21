# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `toolchain/` (`spell-kit/toolchain`).

**READ the kit's [AGENTS.md](../AGENTS.md) and [WWOD](../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- What every repo's configs share (epic `repo-split` P6:  until then, files at spell-app's root).
  - A package of its own until P9;  now a folder of the kit, its entries under `spell-kit/toolchain/...`.
- Its entries (the kit's `package.json` `exports`), each a SOURCE file:
  - `spell-kit/toolchain/lint` ([lint.ts](src/lint.ts)):  the lint (oxlint) and format (oxfmt) settings, the
    `lint` / `fmt` blocks every `vite.config.ts` spreads (`packageLint()`, `rootLint()`, `fmtConfig`);
    each repo's root `vite.config.ts` too, which `vp check` and the editor read.
    - The kit, and a repo of several folders (spell-lang, spell-app):  `rootLint()` at its root (globs `<name>/**`,
      `tests/<name>/**`), `packageLint()` in each folder.
    - A flat repo (spell-ui, spell-brand, spell-epic):  its root IS the package, `packageLint({ name })` there.
    - Was spell-app's root `vite.lint.ts`.
  - `spell-kit/toolchain/lint/patterns` ([lint.patterns.ts](src/lint.patterns.ts)):  the `spell-ui/*` rules,
    Spell UI's patterns in every set's component files ("The lint guard" in [ui's AGENTS.md](../spell-ui/AGENTS.md)).
  - `spell-kit/toolchain/lint/imports` ([lint.imports.ts](src/lint.imports.ts)):  the `spell/*` rules, on everywhere:
    - `no-cross-package-import`:  no `../` from one package (or its tests) into another's folder
    - `no-cross-repo-alias`:  no `$/` alias into another repo's package (`REPO_OF`, each package's repo):
      its npm name instead:  `spell-ui`, `spell-kit/element`, `spell-lang/parser`, `spell-app/spaces` (`npmNameOf()`;
      each repo ONE package named after it, epic `repo-split` P11)
    - A file's package (a folder of a several-folder package, or a flat repo) is where it sits in the kit (the folder
      with `repos.json5`):
      - one of the kit's own folders (`KIT_FOLDERS`):  `<folder>/` or `tests/<folder>/`
      - in a child repo:  `<repo>/<name>/` or `<repo>/tests/<name>/`
      - a flat repo (`FLAT_REPOS`) is one package, its `tests/` too (epic `repo-split` I13)
  - `spell-kit/toolchain/decorators` ([decorators.ts](src/decorators.ts)):  the decorator pre-pass, every Vite and
    Vitest config's (standard decorators lowered by esbuild, before the Solid plugin)
  - `spell-kit/toolchain/packageVersion` ([packageVersion.ts](src/packageVersion.ts)):  `__PACKAGE_VERSION__`
  - `spell-kit/toolchain/tsconfig.base.json` ([its file](tsconfig.base.json)):  the TypeScript settings every
    package shares.
    - Each repo's alias table, `tsconfig.base.json` at its root, extends it (epic `repo-split` P8), the kit's too
      (`./toolchain/tsconfig.base.json`, from inside the kit);
      a package's `tsconfig.json` extends that table:  `"extends": "../tsconfig.base.json"`.
    - A config's `tsconfig.node.json` extends it alone:  configs import other packages by npm name.
  - `spell-kit/toolchain/types` ([types/index.d.ts](types/index.d.ts)):  the global types, for a `tsconfig.json`'s
    `"types"` (WWOD §9 › "Ambient globals used bare").
  - `spell-kit/toolchain/declarations` ([declarations.ts](src/declarations.ts)), and its command `spell-types`
    ([bin/spell-types.ts](bin/spell-types.ts)):  a package's built declarations (below, "spell-types").
  - `spell-kit/toolchain/aliases` ([aliases.ts](src/aliases.ts)):  the run-time alias hook (below).
- Its commands, bins of the kit's `package.json` (beside element's `spell-pack`):
  - `spell-types` ([bin/spell-types.ts](bin/spell-types.ts)):  built declarations (below, "spell-types")
  - `spell-folders` ([bin/spell-folders.ts](bin/spell-folders.ts)):  a several-folder package's checks, folder by
    folder (below, "spell-folders")
- Its files import each other relatively, with `.ts` extensions, and no package but its tools (`vite-plus`, esbuild)
  and `json5` (the alias tables are JSON5, comments and all).
- Its tests:  [tests/toolchain/](../tests/toolchain/), at the same paths as the code.
  - The `spell-ui/*` rules' tests stay Spell UI's ([LintPatterns.test.ts](../spell-ui/tests/tools/LintPatterns.test.ts)):
    their allow-list is Spell UI's.
- Every repo's packages name the kit, `spell-kit`, in their dependencies (`workspace:*`).
  - Inside the kit, the assembler's `formatHTML()` reads `fmtConfig` at run time, and the server's background page
    server loads the alias hook.

## `spell-types`:  built declarations (epic `repo-split` I12)

- What:  a package's `.d.ts` files, in `<package>/dist-types/` (git-ignored), mirroring it:
  `src/core.ts` => `dist-types/src/core.d.ts`;  a package of several folders, each under its folder's name
  (`dist-types/parser/src/index.d.ts`, below).
  - The repos ABOVE the package's repo read them, through its `exports`:
    `{ "types": "./dist-types/src/core.d.ts", "default": "./src/core.ts" }`.
    - TypeScript takes `types`;  Vite, Vitest, `tsx` and node take `default`, the source, as before.
    - Not built yet (a fresh clone):  TypeScript falls back to `default`, the source.
- Why:  a package's source imports its own repo's `$/` aliases (`$/spell-element/Reactive`).
  - `tsc` in a repo above reads every file it reaches with the ABOVE repo's alias table, which has only that
    repo's names (epic `repo-split` P8, J46):  TS2307 by the hundred.
  - The declarations name every file of their own repo by a RELATIVE path instead, so any repo can read them with
    only its own table.
  - Owen's pick (c) for I12, over a package's files importing each other relatively (a) or every table naming every
    repo's aliases (b).
- How, for one package ([Declarations](src/declarations.ts)):
  1. `tsc` on the package's own `tsconfig.json`, emitting declarations only, and their maps (so "Go to Definition"
     lands in the source), incrementally:  nothing changed, nothing to do.
     - The generated config is `dist-types/.tsconfig.json`, rewritten each build.
     - Its program reads its REPO-MATES' declarations (the folders built before it), not their source (the repo's
       alias table, re-pointed):  a folder's output holds only its own files.
     - So a package lists its folders in `"spellTypes"` in dependency order, the order they're built in
       (epic `repo-split` P11;  `yarn workspaces foreach --topological-dev` over a repo's packages before).
  2. Every `$/` specifier in the output becomes a relative path:  to the package's own declarations, or to a
     repo-mate's (`../../../parser/dist-types/src/index`).
- The packages of several folders, each its own TypeScript program:  the kit (epic `repo-split` P9) and spell-lang
  (P11).
  - Each `package.json` lists them in `"spellTypes"`, in build order:  the kit's util, server, assembler, element;
    spell-lang's parser, markdown, core, py, spell.
  - Each is built on its own `tsconfig.json` into ONE `dist-types/` at the package's root:
    `dist-types/util/src/index.d.ts`, `dist-types/parser/src/...`.
  - Its `yarn ts` (`spell-folders ts`;  the kit's `kit:ts`) builds them first, as their type check;
    a higher repo's `spell-types --below` builds them that way too.
  - spell-app has no `"spellTypes"`:  no repo reads its declarations, so each folder keeps a plain `tsc`.
- It IS the package's type check:  a package's `yarn ts` runs `spell-types` where it ran a bare `tsc`.
- The command, in a package's folder:

  ```sh
  spell-types            # this package:  type-check it, write dist-types/
  spell-types --below    # every package of the LOWER repos this repo's packages use, lowest first
  spell-types --clean    # dist-types/ deleted first:  a full build
  ```

  - `--below`:  found by the `workspace:` dependencies in each `package.json` (`spell-kit`, `spell-ui` ...),
    through `node_modules`;  up-to-date ones take a second or two.
    - Each repo's `yarn ts` runs it first:  what it reads is never stale.
    - One folder's own `tsc` (`yarn tsc -p <folder>`, `yarn spell-folders ts <folder>`) doesn't:  it reads what the
      lower repos last built.
  - Only packages with `$/` aliases of their own get declarations:  the toolchain has none (it's not in the kit's
    `"spellTypes"`), so others read its source.
- Node runs `bin/spell-types.ts` as is (types stripped):  `declarations.ts` and `aliasTable.ts` use node's modules and
  `json5` only, no alias, no `enum`, no parameter property.

## `spell-folders`:  a several-folder package's checks (epic `repo-split` P11)

- What:  `ts`, `test`, `lint`, `lint:fix`, `format` and `format:check` over a package of several folders, one folder
  at a time ([FolderChecks](src/folders.ts), [bin/spell-folders.ts](bin/spell-folders.ts)).
  - The kit's `kit:*` scripts run it as `node toolchain/bin/spell-folders.ts <check>`;  spell-lang's and spell-app's
    `yarn ts`, `test` ... as `spell-folders <check>`.
  - It replaced the kit's own `tools/kit.ts`, and spell-lang's and spell-app's `yarn workspaces foreach` over their
    packages.
- Why:  each folder is its own TypeScript program (node only, or browser-safe), with its own lint and test configs,
  so each check runs in its own folder, and its tests' in `tests/<folder>/`.
- The folders:  the package's `package.json`, `"spellFolders"`, lowest first (the order `ts` checks them in).
  Each entry:
  - `name`:  its folder at the package's root;  its tests in `tests/<name>/`
  - `lint`:  what oxlint looks at in it (default `["src"]`);  `fmt`:  what oxfmt formats (default `["."]`);
    `tests`:  what both look at in its tests' folder (default `["."]`)
  - `node`:  `tsc` checks its configs too (its `tsconfig.node.json`)
  - `python`:  a uv project in it (py's `core`, spaces' `src/server/py`), where ruff and pytest run, over
    `tests/<name>/<python>/tests` too
- `ts`:  a folder in `"spellTypes"` is type-checked by its declarations build (`spell-types`, run first);  any other
  by a plain `tsc -p <folder>`.  Then its configs (`node`) and its tests' `tsconfig.json`.
- The command, at the package's root:

  ```sh
  spell-folders <check>               # every folder
  spell-folders <check> parser core   # only those
  ```

  - Every folder runs, failed or not;  the summary says which failed, and the exit status is 1 if any did.
- Node runs `bin/spell-folders.ts` as is (types stripped):  node's modules only, as `spell-types`.

## The run-time alias hook (epic `repo-split` I12)

- What:  [aliases.ts](src/aliases.ts), a node resolve hook (`module.registerHooks()`):  every `$/name/...` import
  resolves through the alias table of the repo the IMPORTING file is in.
  - The table:  the nearest `tsconfig.base.json` with `paths` above the file ([aliasTable.ts](src/aliasTable.ts),
    `repoOf()`), read once per repo.
  - The target as `tsc` finds it:  as written, or with `.ts`, `.tsx`, `.mts`, `.js`, `.mjs`, or a folder's `index`;
    then handed on, as a file URL, to `tsx` and node.
  - Anything else (no `$/`, no repo, no match) goes on as it came.
- Why:  `tsx` reads ONE tsconfig, the one it's given (or the current folder's), for every file it runs.
  - A program that runs several repos' source (spell-app's CLI runs spell-lang's;  the page server spell-epic's
    and spaces' route modules) meets `$/server/...` in the kit's `server/` files with spell-app's table, which hasn't
    got it:  `Cannot find package '$'`.
  - Vite and Vitest don't need it:  their `resolve.tsconfigPaths` already uses the tsconfig nearest the importing
    file.
- How to use it:  load it AFTER `tsx`, so it runs first (the last hook registered runs first).

  ```js
  register({ tsconfig })                        // tsx, from `tsx/esm/api`
  await import("spell-kit/toolchain/aliases")  // then this
  ```

  ```sh
  tsx --import spell-kit/toolchain/aliases scripts/site-data.ts
  node --import tsx --import spell-kit/toolchain/aliases src/page/cli.ts serve
  ```

  - A child process by URL:  `--import`, `import.meta.resolve("spell-kit/toolchain/aliases")`.
  - Who loads it:  the kit's `spell` (`cli/bin/spell.mjs`) and every child it starts, the kit's background page server
    (`PageServer.ensure()`, in `server/`), the kit's `spell-pack` (`element/bin/`),
    and the `tsx` package scripts of every repo.
