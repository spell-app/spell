# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this package, `@spell-app/toolchain`.

**READ the repo root's [AGENTS.md](../../AGENTS.md) and [WWOD](../agents/wwod/WWOD.md) FIRST:**
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
- Its files import each other relatively, with `.ts` extensions, and no package but its tools (`vite-plus`, esbuild).
- Its tests:  [tests/toolchain/](../tests/toolchain/), at the same paths as the code.
  - The `spell-ui/*` rules' tests stay Spell UI's ([LintPatterns.test.ts](../../spell-ui/tests/tools/LintPatterns.test.ts)):
    their allow-list is Spell UI's.
- A dev dependency of every package (`workspace:*`);  a dependency of the assembler, whose `formatHTML()` reads
  `fmtConfig` at run time.
