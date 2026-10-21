# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `assembler/` (`spell-kit/assembler`).

**READ the kit's [AGENTS.md](../AGENTS.md) and [WWOD](../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- ASSEMBLING pages:  `$/assembler` (`AS`).
  The steps between a page's content and its file on disk, for every tool that writes pages.
  - Born in epic `epic-components` P7 (Owen, Q15 / I1).
    The `epic` tool moved into the epics package, which then could not import the docs package,
    so what both need to write a page lives here (they're one package since `people-and-orgs` P16;  it stays).
  - `Linker` -- a page's links:
    - `<code>path</code>` references become links
    - every link gets a named target (one per destination)
    - `check()` verifies them
    - It was the docs tools' `doc-links.js`, which is now its command line.
  - [`formatHTML()`](src/format.ts):  formats a page's text in memory, as `vp fmt` would format its file (oxfmt).
    It was the docs tools' `plan-parts.js`'s.
  - `Bundle` -- the bundles only the page server serves, BUILT on demand instead of committed.
    - WHICH bundles exist:  the output folders the root `package.json` lists (`Bundle.specs()`).
      The page server reads the same list:

      ```json
      "pageServer": { "bundles": [...] }
      ```

    - HOW each is built:  `BUNDLES`, in [assembler.types.ts](src/assembler.types.ts):
      - `ui-site`:  Spell UI's docs site
      - `brand`:  the brand pages
    - `check()`:  stale when never built, its entry missing or rewritten, or its sources' hash changed.
    - `build()`:  runs its package's script, then records the hash in its output folder (`.bundle.json`).
    - Its command line:  `spell dev bundles build [<name>...] [--stale]` / `check`.
    - The page server runs `build --stale` when it starts:  `BundleBuild`, in the page-server package (`$/page-server`).
    - Why (Owen, 2026-10-07):  their chunk names carry content hashes,
      so every Spell UI change deleted and re-added most of their files, in every diff and merge.
    - A new bundle:
      - a `BUNDLES` entry
      - its output folder in the root `package.json`'s bundle list (above)
      - and in the root `.gitignore`
  - JSON5 written with its comments kept moved to util, `spell-kit/util/node/json5` (epic `repo-split` P1):
    its users (ui's tools, app, brand, spaces, spell-epic) need util, not the assembler.
    - Its re-export here, `$/assembler/json5`, went in P6, once spell-epic had switched.
    - `DataFile` writes through it.
  - Next (Owen, 2026-10-07):  most of the page server's assembly code,
    so other assembly tools can be built on it (e.g. a redone goals package).
    - Grow it by capability:  one class per file, its types in `assembler.types.ts`.
- Node only:  it uses node's file system and child processes, `git`, oxfmt and linkedom.
  - It imports only util's node-only json5 (`spell-kit/util/node/json5`) and the toolchain's format settings
    (`spell-kit/toolchain/lint`, for `formatHTML()`):  spell-epic (its docs tools too) and any other node-side
    package or tool may import it.
  - Another repo imports it by its npm name, an entry of the kit's `exports`:  `spell-kit/assembler`,
    `spell-kit/assembler/DataFile`, `/contentFolder`.
  - NEVER make it import spell-epic's code:  spell-epic imports this.
  - `DataFile` (`$/assembler/DataFile`):  the tooling's JSON5 data files, here since epic `epic-eject` I5, so the CLI
    reads the commands page's data without the engine.
  - `contentFolderOf()` (`$/assembler/contentFolder`, epic `epic-eject` P12):  the repo's shared content folder,
    `contentFolder` in the main checkout's `.epic/config.json5`, so a tool finds the content with no link at the
    checkout's root.
    - The `Linker` lays it under the checkout (`content`), and the CLI reads the commands page's data and the WWOD
      check's shared citers from it.
    - Opt-in by path, like `DataFile`:  the CLI's lean `spell dev` loads no linkedom.
- It knows the checkout's LAYOUT as folder names, never as imports:  `Linker` takes the checkout's root.
  - The folder names:
    - `packages/*/src`, and `packages/*/components` (a component set's elements)
      - Under the kit, an old `packages/<name>/` is found through `node_modules`:  spell-ui, spell-brand, spell-epic,
        and the folders of spell-kit, spell-lang and spell-app (`packages/parser/src` is spell-lang's `parser/src`;
        epic `repo-split` P11).
    - `tests/`, where every package's tests live
    - the shared areas:
      - `pages/`
      - `guides/`
      - `epics/`
      - `templates/`
      - in the shared content folder (`contentFolderOf()`), laid under the checkout:
        its folders the checkout has none of are found there (`Linker`'s `content`)
    - the epic engine's code, docs tools included:  spell-epic's `src/`, through the checkout's `spell-epic` link
- Commands, the kit's, at its root (node tests):

  ```sh
  yarn kit:review    yarn kit:ts    yarn kit:lint    yarn kit:format    yarn kit:test
  ```

  - In this folder, its tests alone:  `yarn vp test run`.
  - The tests live in the kit's [tests/assembler/](../tests/assembler/), at the same paths as the code.

## Imports

- As WWOD §4, plus ONE climb:  `format.ts` imports the toolchain's lint settings (`fmtConfig`).
  - By its npm name, `spell-kit/toolchain/lint`, as every `vite.config.ts` takes it:  the toolchain has no alias.
- The docs tools are JavaScript:  [doc-links.js](../spell-epic/src/tools/doc-links.js) imports `$/assembler`
  statically.
  - So it runs under `tsx`, never plain node:
    `docLinksRun()`, in the docs tools' [pages.js](../spell-epic/src/tools/pages.js).

## Types / Exports

As WWOD §8, plus our self-namespace:

- `AS` ~== `$/assembler`
