# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `src/toolchain/` (`spell/toolchain`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- What every repo's configs share (epic `repo-split` P6:  until then, files at spell-app's root).
  - A package of its own until P9;  a folder of the kit since, `src/toolchain/` since P14.
- Its names, each a SOURCE file (the kit's `package.json` `exports`:  `./toolchain/*`, and a few exact entries):
  - `spell/toolchain/lint` ([lint.ts](lint.ts)):  the lint (oxlint) and format (oxfmt) settings.
    - They're the `lint` / `fmt` blocks every `vite.config.ts` spreads (`packageLint()`, `rootLint()`, `fmtConfig`),
      each repo's root one too, which `vp check` and the editor read.
    - The kit:  `rootLint()` at its root (React's rules in `src/cli/` and `src/util/`, and their tests).
    - Every child repo is ONE package:  `packageLint({ name })` at its root.
    - Was spell-app's root `vite.lint.ts`.
  - `spell/toolchain/lint/patterns` ([lint.patterns.ts](lint.patterns.ts)):
    the `spell-ui/*` rules, Spell UI's patterns in every set's component files
    ("The lint guard" in [ui's AGENTS.md](../../spell-ui/AGENTS.md)).
  - `spell/toolchain/lint/imports` ([lint.imports.ts](lint.imports.ts)):  the `spell/*` rule, on everywhere:
    - `no-parent-import`:  no `../` import into a package's `src/`, any repo's.
      Its message names the import to write:
      the nearest `package.json`'s `name` + the path under `src/` (`importNameFor()`).
    - Same-folder peers (`./Peer`), a climb to a file outside `src/` (a config, a glue tool) and globs are fine.
    - It replaced `no-cross-package-import` and `no-cross-repo-alias` (epic `repo-split` P14), which knew each repo's
      layout and alias table.
  - `spell/toolchain/decorators` ([decorators.ts](decorators.ts)):  the decorator pre-pass, every Vite and Vitest
    config's (standard decorators lowered by esbuild, before the Solid plugin)
  - `spell/toolchain/packageVersion` ([packageVersion.ts](packageVersion.ts)):  `__PACKAGE_VERSION__`
  - [`spell/toolchain/tsconfig.base.json`](tsconfig.base.json):  the TypeScript settings every package shares.
    - Every repo's `tsconfig.json` extends it, with `"customConditions": ["<package>-source"]` and no `paths`
      (epic `repo-split` P14).
    - The kit's own extend it by its path, `./src/toolchain/tsconfig.base.json`.
  - [`spell/toolchain/types`](types/index.d.ts):  the global types, for a `tsconfig.json`'s `"types"`
    (WWOD §9 › "Ambient globals used bare").
  - `spell/toolchain/declarations` ([declarations.ts](declarations.ts)), and its command `spell-types`:
    a package's built declarations (below, "spell-types").
  - `spell/toolchain/sourceNames` ([sourceNames.ts](sourceNames.ts)):
    `sourceNames()`, the esbuild plugin that finds our packages' names as their source files.
    - Every direct esbuild build uses it.
    - Why:  esbuild adds no extension to `exports`' `./src/*`, and finds no folder's `index.ts` (epic `repo-split` I50).
- Its commands, bins of the kit's `package.json`, in the kit's `bin/` (beside `spell` and `spell-pack`):
  - [`spell-types`](../../bin/spell-types.ts):  built declarations (below, "spell-types");
    its entry is [typesMain.ts](typesMain.ts), which the published bin imports too (`spell publish`)
  - `spell-folders` is gone (epic `repo-split` P14):  every repo is one `src/`, checked by plain scripts.
- Its files import each other as same-folder peers, with `.ts` extensions (`./lint.patterns.ts`).
  - The bins import them by package name (`spell/toolchain/declarations`).
  - Why:  node runs them as they are, types stripped,
    and the `./toolchain/*` entry of the kit's `exports` names each `.ts`.
  - No package but its tools (`vite-plus`, esbuild) and `json5`.
- Its tests:  [tests/toolchain/](../../tests/toolchain/), at the same paths as the code.
  - The `spell-ui/*` rules' tests stay Spell UI's:  their allow-list is Spell UI's.
- Every repo's packages name the kit, `spell`, in their dependencies (`workspace:*`).
  - Inside the kit, the server's `formatHTML()` reads `fmtConfig` at run time.

## `spell-types`:  built declarations (epic `repo-split` I12)

- What:  a package's `.d.ts` files, in `<package>/dist-types/` (git-ignored), mirroring it:
  `src/util/string.ts` => `dist-types/src/util/string.d.ts`.
  - The repos ABOVE the package's repo read them, through its `exports`' `types` condition
    (the kit's [AGENTS.md](../../AGENTS.md), "Imports across repos").
  - Not built yet (a fresh clone):  TS2307 in the repos above.  Their `yarn ts` builds them first.
- Why:  TypeScript must not read another repo's SOURCE:  it would check it under the reading repo's settings.
  - Owen's pick (c) for I12, over a package's files importing each other relatively (a),
    or every table naming every repo's aliases (b).
- A package lists its TypeScript programs in its `package.json`'s `"spellTypes"`, as their `tsconfig` files,
  in build order:  the kit's `["tsconfig.json", "tsconfig.node.json"]`, browser-safe code and node code.
  - None listed:  its `tsconfig.json`.
- How, for one program ([Declarations](declarations.ts)):
  1. `tsc` on its `tsconfig`, emitting declarations only, and their maps (so "Go to Definition" lands in the source),
     incrementally:  nothing changed, nothing to do.
     - The generated config is in `dist-types/`, named after its program, rewritten each build:
       the kit's node program's is `.tsconfig.node.tsconfig.json`.
     - Every program writes into the ONE `dist-types/`, `rootDir` the package's root.
     - Its programs read the package's own SOURCE for its own name (`customConditions`),
       so two programs may emit the same file (util's, from both of the kit's):  the same text.
     - Nothing is rewritten:  the declarations name files by package name, as the source does (P14).
- It IS the package's type check:  a package's `yarn ts` runs `spell-types` where it ran a bare `tsc`.
  - spell-app and spell-epic have no `"spellTypes"`:  no repo reads their declarations, so they keep a plain `tsc`;
    `spell-types --below` skips them.
- The command, in a package's folder:

  ```sh
  spell-types            # this package:  type-check it, write dist-types/
  spell-types --below    # every package of the LOWER repos this repo's packages use, lowest first
  spell-types --clean    # dist-types/ deleted first:  a full build
  ```

  - `--below`:  found by the `workspace:` dependencies in each `package.json` (`spell`, `spell-ui` ...),
    through `node_modules`;  up-to-date ones take a second or two.
    - Each repo's `yarn ts` runs it first:  what it reads is never stale.
    - One program's own `tsc` (`yarn tsc -p tsconfig.node.json`) doesn't:  it reads what the lower repos last built.
- Node runs [the bin](../../bin/spell-types.ts) as is, types stripped:
  so [Declarations](declarations.ts) uses node's modules and `json5` only, no `enum`, no parameter property.
