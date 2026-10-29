# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `src/toolchain/` (`spell/toolchain`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every folder shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- What every config of the kit and its folders shares (epic `repo-split` P6:  until then, files at spell-app's root).
  - A package of its own until P9;  a folder of the kit since, `src/toolchain/` since P14.
- Its names, each a SOURCE file (the kit's `package.json` `exports`:  `./toolchain/*`, and a few exact entries):
  - `spell/toolchain/lint` ([lint.ts](lint.ts)):  the lint (oxlint) and format (oxfmt) settings.
    - They're the `lint` / `fmt` blocks every `vite.config.ts` spreads (`packageLint()`, `rootLint()`, `fmtConfig`),
      the kit's root one too, which `vp check` and the editor read.
    - The kit:  `rootLint()` at its root (React's rules in `src/cli/` and `src/util/`, and their tests).
    - Each big folder (`parser/`, `ui/`, `epic/`, `app/`):  `packageLint({ name, react, ignorePatterns })`
      in its ONE `vite.config.ts`;  `name` turns on the `spell-ui/*` rules in its component folders.
    - Was spell-app's root `vite.lint.ts`.
  - `spell/toolchain/lint/patterns` ([lint.patterns.ts](lint.patterns.ts)):
    the `spell-ui/*` rules, Spell UI's patterns in every set's component files
    ("The lint guard" in [ui's AGENTS.md](../../ui/AGENTS.md)).
  - `spell/toolchain/lint/imports` ([lint.imports.ts](lint.imports.ts)):  the `spell/*` rule, on everywhere:
    - `no-parent-import`:  no `../` import into a `src/`:  the kit's, a folder's, or a project's beside the kit.
      Its message names the import to write:
      the nearest `package.json`'s `name` + the path under `src/` (`importNameFor()`).
    - Same-folder peers (`./Peer`), a climb to a file outside `src/` (a config, a glue tool) and globs are fine.
    - It replaced `no-cross-package-import` and `no-cross-repo-alias` (epic `repo-split` P14), which knew each repo's
      layout and alias table.
  - `spell/toolchain/decorators` ([decorators.ts](decorators.ts)):  the decorator pre-pass, every Vite and Vitest
    config's (standard decorators lowered by esbuild, before the Solid plugin)
  - `spell/toolchain/packageVersion` ([packageVersion.ts](packageVersion.ts)):  `__PACKAGE_VERSION__`
  - `spell/toolchain/browserMode` ([browserMode.ts](browserMode.ts)):  `browserMode()`, the `browser` block of every
    repo's browser test projects:  headless Playwright, animations off (reduced motion;  epic `debut` I77)
  - [`spell/toolchain/tsconfig.base.json`](tsconfig.base.json):  the TypeScript settings every package shares.
    - Every folder's `tsconfig.json` extends it, with `"customConditions": ["spell-source"]` and no `paths`
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
  - `spell-folders` is gone (epic `repo-split` P14):  every folder is one `src/`, checked by plain scripts.
- Its files import each other as same-folder peers, with `.ts` extensions (`./lint.patterns.ts`).
  - The bins import them by package name (`spell/toolchain/declarations`).
  - Why:  node runs them as they are, types stripped,
    and the `./toolchain/*` entry of the kit's `exports` names each `.ts`.
  - No package but its tools (`vite-plus`, esbuild) and `json5`.
- Its tests:  [tests/toolchain/](../../tests/toolchain/), at the same paths as the code.
  - The `spell-ui/*` rules' tests stay Spell UI's:  their allow-list is Spell UI's.
- Every folder manifest names the kit, `spell`, in its dependencies (`workspace:*`), for the bins.
  - Inside the kit, the server's `formatHTML()` reads `fmtConfig` at run time.

## `spell-types`:  built declarations (epic `repo-split` I12)

- What:  the `.d.ts` files of the kit or one of its folders, in its `dist-types/` (git-ignored), mirroring it:
  `src/util/string.ts` => `dist-types/src/util/string.d.ts`;  `ui/src/core.ts` => `ui/dist-types/src/core.d.ts`.
  - Who reads them, through the `types` condition of the kit's `exports`
    (the kit's [AGENTS.md](../../AGENTS.md), "Imports across repos"):
    - the app's node program (`app/tsconfig.node.json`, React's JSX for the Ink screens), which has no
      `spell-source` condition
    - spell-brand, a project beside the kit
  - Every other program reads every folder's SOURCE (`"customConditions": ["spell-source"]`), not these.
  - Not built yet (a fresh clone):  TS2307 in the readers.  Their `yarn ts` builds them first (`--below`).
- Why:  a program that can't share the folders' settings must not read their SOURCE:
  it would check it under its own settings.
  - Owen's pick (c) for I12, over a package's files importing each other relatively (a),
    or every table naming every repo's aliases (b).
  - Before epic `repo-split` P20 every repo above read them;  since, only those two.
- The kit and each folder list their TypeScript programs in their `package.json`'s `"spellTypes"`,
  as their `tsconfig` files, in build order:  `["tsconfig.json", "tsconfig.node.json"]`, browser-safe code and node
  code.
  - The kit, `parser/` and `ui/` list them;  `epic/` and `app/` don't (nothing reads their declarations).
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
- It IS the type check of the kit, `parser/` and `ui/`:  their `yarn ts` runs `spell-types` where it ran a bare `tsc`
  (the kit's:  `yarn kit:ts`).
  - `epic/` and `app/` have no `"spellTypes"`, so they keep a plain `tsc`;  `spell-types --below` skips them.
- The command, in the kit's or a folder's root:

  ```sh
  spell-types            # this one:  type-check it, write dist-types/
  spell-types --below    # first, the kit's and every folder below this one, lowest first
  spell-types --clean    # dist-types/ deleted first:  a full build
  ```

  - `--below`, in a folder:  the kit's own, then each folder before it in the kit's `workspaces`
    (`ui/`:  the kit's, `parser/`'s);  up-to-date ones take a second or two.
    - In a project beside the kit (spell-brand):  the local packages it depends on (`workspace:`, `portal:` ...),
      through `node_modules`, a kit among them with its folders.
    - The app's `yarn ts` runs it first, for its node program:  what that reads is never stale.
    - One program's own `tsc` (`yarn tsc -p tsconfig.node.json`) doesn't:  it reads what was last built.
- Node runs [the bin](../../bin/spell-types.ts) as is, types stripped:
  so [Declarations](declarations.ts) uses node's modules and `json5` only, no `enum`, no parameter property.
