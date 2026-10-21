# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this package, `@spell-app/toolchain`.

**READ the repo root's [AGENTS.md](../AGENTS.md) and [WWOD](../agents/wwod/WWOD.md) FIRST:**
the repo's layout, and the house style every package shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- What every package's configs share, as ONE package (epic `repo-split` P6):  until then, files at the repo root.
  - It goes to spell-util, beside util, when the repos split (P8).
- Its entries (`package.json` `exports`), each a SOURCE file:
  - `@spell-app/toolchain/lint` ([lint.ts](src/lint.ts)):  the lint (oxlint) and format (oxfmt) settings, the
    `lint` / `fmt` blocks every `vite.config.ts` spreads (`packageLint()`, `rootLint()`, `fmtConfig`);
    each repo's root `vite.config.ts` too, which `vp check` and the editor read.
    - A repo of several packages:  `rootLint()` at its root (globs `<name>/**`, `tests/<name>/**`), `packageLint()` in
      each package.
    - A flat repo (spell-ui, spell-brand, spell-element):  its root IS the package, `packageLint({ name })` there.
    - Was spell-app's root `vite.lint.ts`.
  - `@spell-app/toolchain/lint/patterns` ([lint.patterns.ts](src/lint.patterns.ts)):  the `spell-ui/*` rules,
    Spell UI's patterns in every set's component files ("The lint guard" in [ui's AGENTS.md](../../spell-ui/AGENTS.md)).
  - `@spell-app/toolchain/lint/imports` ([lint.imports.ts](src/lint.imports.ts)):  the `spell/*` rules, on everywhere:
    - `no-cross-package-import`:  no `../` from one package (or its tests) into another's folder
    - `no-cross-repo-alias`:  no `$/` alias into another repo's package (`REPO_OF`, each package's repo):
      its npm name instead
    - A file's package is where it sits in the top repo `spell` (the folder with `repos.json5`):  `<repo>/<name>/` or
      `<repo>/tests/<name>/`;  a flat repo (`FLAT_REPOS`) is one package, its `tests/` too (epic `repo-split` I13).
  - `@spell-app/toolchain/decorators` ([decorators.ts](src/decorators.ts)):  the decorator pre-pass, every Vite and
    Vitest config's (standard decorators lowered by esbuild, before the Solid plugin)
  - `@spell-app/toolchain/packageVersion` ([packageVersion.ts](src/packageVersion.ts)):  `__PACKAGE_VERSION__`
  - `@spell-app/toolchain/tsconfig.base.json` ([its file](tsconfig.base.json)):  the TypeScript settings every
    package shares.
    - Each repo's alias table, `tsconfig.base.json` at its root, extends it (epic `repo-split` P8);
      a package's `tsconfig.json` extends that table:  `"extends": "../tsconfig.base.json"`.
    - A config's `tsconfig.node.json` extends it alone:  configs import other packages by npm name.
  - `@spell-app/toolchain/types` ([types/index.d.ts](types/index.d.ts)):  the global types, for a `tsconfig.json`'s
    `"types"` (WWOD §9 › "Ambient globals used bare").
  - `@spell-app/toolchain/declarations` ([declarations.ts](src/declarations.ts)), and its command `spell-types`
    ([bin/spell-types.ts](bin/spell-types.ts)):  a package's built declarations (below, "spell-types").
  - `@spell-app/toolchain/aliases` ([aliases.ts](src/aliases.ts)):  the run-time alias hook (below).
- Its files import each other relatively, with `.ts` extensions, and no package but its tools (`vite-plus`, esbuild)
  and `json5` (the alias tables are JSON5, comments and all).
- Its tests:  [tests/toolchain/](../tests/toolchain/), at the same paths as the code.
  - The `spell-ui/*` rules' tests stay Spell UI's ([LintPatterns.test.ts](../../spell-ui/tests/tools/LintPatterns.test.ts)):
    their allow-list is Spell UI's.
- A dev dependency of every package (`workspace:*`);  a dependency of the assembler, whose `formatHTML()` reads
  `fmtConfig` at run time, and of spell-server's `server`, whose background page server loads the alias hook.

## `spell-types`:  built declarations (epic `repo-split` I12)

- What:  a package's `.d.ts` files, in `<package>/dist-types/` (git-ignored), mirroring it:
  `src/core.ts` => `dist-types/src/core.d.ts`.
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
     - Its program reads the package's REPO-MATES' declarations, not their source (the repo's alias table,
       re-pointed):  a package's output holds only its own files.
     - So a repo builds its packages in dependency order (`yarn workspaces foreach --topological-dev`).
  2. Every `$/` specifier in the output becomes a relative path:  to the package's own declarations, or to a
     repo-mate's (`../../../parser/dist-types/src/index`).
- It IS the package's type check:  a package's `yarn ts` runs `spell-types` where it ran a bare `tsc`.
- The command, in a package's folder:

  ```sh
  spell-types            # this package:  type-check it, write dist-types/
  spell-types --below    # every package of the LOWER repos this repo's packages use, lowest first
  spell-types --clean    # dist-types/ deleted first:  a full build
  ```

  - `--below`:  found by the `@spell-app/*` names in each `package.json`, through `node_modules`;  up-to-date ones take
    a second or two.
    - Each repo's root `yarn ts` (a flat repo's own) runs it first:  what it reads is never stale.
    - A package's own `yarn ts`, in its folder, doesn't:  it reads what the lower repos last built.
  - Only packages with `$/` aliases of their own get declarations:  this package has none, so others read its
    source.
- Node runs `bin/spell-types.ts` as is (types stripped):  `declarations.ts` and `aliasTable.ts` use node's modules and
  `json5` only, no alias, no `enum`, no parameter property.

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
    and spaces' route modules) meets `$/server/...` in spell-server's files with spell-app's table, which hasn't got
    it:  `Cannot find package '$'`.
  - Vite and Vitest don't need it:  their `resolve.tsconfigPaths` already uses the tsconfig nearest the importing
    file.
- How to use it:  load it AFTER `tsx`, so it runs first (the last hook registered runs first).

  ```js
  register({ tsconfig })                        // tsx, from `tsx/esm/api`
  await import("@spell-app/toolchain/aliases")  // then this
  ```

  ```sh
  tsx --import @spell-app/toolchain/aliases scripts/site-data.ts
  node --import tsx --import @spell-app/toolchain/aliases src/page/cli.ts serve
  ```

  - A child process by URL:  `--import`, `import.meta.resolve("@spell-app/toolchain/aliases")`.
  - Who loads it:  spell-app's CLI (`cli/bin/spell.mjs`) and every child it starts, spell-server's background page
    server (`PageServer.ensure()`), Spell UI's `spell-ui-pack`, and the `tsx` package scripts of every repo.
