# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `src/util/` (`spell/util`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- `src/util/` (`spell/util`, from the kit and every other repo):
  the small GENERIC helpers more than one package uses.
  - `decorators.ts`:
    - `@proto`:  the standard-decorator for class defaults
    - `@protoMerged`:  for a settings object whose keys merge down the class chain
    - `@lazy`:  a getter made on first read, then kept
    - `@once`:  a method run once, its result kept (e.g. a loader's promise)
    - `forget(object, "name")`:  drops what either of those two kept, for a `reset()`
    - `@resets("name")`, on an accessor:  each write to it drops that kept value too
      - e.g. `@E.resets("load") static accessor url`
  - `class.ts` -- `hasOwnProp` ...
  - `string.ts` -- case conversion, `numberToWord`, `suggest`;
    and the small text helpers every repo wrote by hand (epic `coherence` I4):
    - `slug(text, { as, fallback })`:  an id's slug (accents and apostrophes dropped), or GitHub's heading anchor
      (`as: "github"`, accented letters kept)
    - `withoutAccents(text, { keep })`, `escapeRegExp()`, `escapeHTML()`, `dedent()`, `indented(text, indent)`
  - `number.ts` -- `clamp()`, and `kb()`:  a size in KB, of 1024 bytes
  - `time.ts` -- LOCAL dates and times (epic `coherence` I5):  `localDate()`, `clockTime()`, `compactTime()`,
    `localTime()` / `localMinutes()` with the offset, `localMidnight()`
    - never `toISOString().slice(0, 10)` for a day:  that's the UTC date, tomorrow in California from 5pm
  - `color.ts` -- colour maths (epic `coherence` I13):  OKLCH <-> sRGB, fitting into sRGB (`clipped()`,
    `toGamut()`), luminance, contrast;  one shape each (`Rgb`, `Oklch`), hex in and out
  - `timing.ts` -- when to run something (epic `coherence` P19, from `spell/element`, which re-exports it):
    `afterSolidUpdate()`, `beforeNextPaint()`, `soon()`, `after()`, `every()`;  and waiting:  `waitUntil()`, `within()`
  - `string.ts`, `number.ts`, `time.ts`, `color.ts` and `timing.ts` import nothing, so plain `node` loads them too,
    with their extension (`spell/util/time.ts`)
  - `dom.ts` -- shadow-aware traversal, `NodeType`, `byDocumentOrder`, `isBrowser`, `nextFrame`,
    `copyText()` (the clipboard, with the fallback VS Code's side bar needs)
  - `util.types.ts` -- `Constructor`, `AbstractClass`, `Prettify`
- It sits UNDER every other package, and imports NONE of them.
  - `spell-ui` is published, and bundles what it imports from here (its `.d.ts` files inline it).
  - So nothing spell-specific may land here.
- What does NOT belong:
  - anything spell-specific
  - anything needing a dependency Spell UI doesn't already have (`pluralize`, CommonJS `lodash` ...):
    it goes in `spell/`, never beside the generic files
  - anything only ONE package uses:
    - Spell UI's `core.ts` re-exports its `spell-ui/util` wholesale, which imports every GENERIC file here
    - so each lands in Spell UI's `core` bundle (`yarn measure`), used or not
  - when in doubt, leave it in the package
- Commands:  the kit's, at its root (`yarn kit:review`, `kit:ts`, `kit:lint`, `kit:format`, `kit:test`).
  - Its tests alone:  `yarn vp test run --project util --project util:node`, at the kit's root.
  - The tests:  a real browser (chromium) for the generic files;  node for `spell/`, `reactive/` and `node/`.
- Barrel only, as WWOD §4 › "The barrel, from another sub-system" says, with ONE exception here:
  [ui's util barrel](../../spell-ui/src/util/index.ts) imports the generic files one by one
  (`spell/util/class` ...).
  - Why:  so spell's utilities never reach `ui`'s bundles or published declarations.
  - Spell UI keeps its own util barrel (`spell-ui/util`) for package-specific helpers.

## Node-only helpers (`node/`)

- Generic helpers that need node:  imported by deep path, NEVER through a barrel, so no browser code pulls them in.
- [json5.ts](node/json5.ts):  JSON5 written with its comments kept, on json5-writer.
  - `json5Edited()`, `keepingComments()`, `readJSON5File()`
  - `spell/util/node/json5`.
  - The kit's node program checks it (`tsconfig.node.json`), not the browser-safe one.
  - Moved here from the assembler (epic `repo-split` P1):  util is the bottom of the stack,
    and ui's tools, app, brand, spaces, spell-epic and the server's `DataFile` use it.
  - Its tests run in node (the kit's `vitest.config.ts`, project `util:node`).

## Spell's utilities (`spell/`)

- Spell's own utilities, flattened into the `spell/util` barrel LAST:
  - lodash and string helpers
  - `Observable` / `Derivative` / `Loadable`, `Task` / `TaskList`
  - `$fetch`, `Logger`, `assert` / `die`
  - `safelyCall()` / `safelyCallAll()`, `makeErrorWrapper()`, `setDebugGlobal()` ([safely.ts](spell/safely.ts)):
    WWOD §5's and §19's helpers, written when coherence found WWOD naming them and no repo having them (its I2)
  - DOM helpers
- The bottom of the spell chain:  every spell-family package may import it, and it imports nothing above it.
  - Formerly the package `spell-util`.
  - A sub-folder, not loose files:
    - its `string.ts` and `DOM.ts` would clash with the generic ones a folder up (macOS is case-insensitive)
    - and nothing in `ui` may import it
  - Its dependencies (lodash, chalk, pluralize ...) are the kit's own, in its root `package.json`.
    - Spell UI bundles none of them:  `yarn measure` and `yarn smoke` (declarations) prove it.
- Files in `spell/` import the generic helpers by deep path (`spell/util/class`).
  - NEVER the `spell/util` barrel:  it re-exports this folder, so that's a cycle.
- NOTE: [ResponseErrors.ts](spell/ResponseErrors.ts) is deliberately NOT in [the folder's barrel](spell/index.ts):
  its header says why.
- Spell's layer of reactivity:  `Observable`, and [spellDecorators.ts](spell/spellDecorators.ts) (`@thing`).
  - The engine under it is `reactive/` (below).
- Tests:
  - they live in the kit's [tests/util/](../../tests/util/), at the same paths as the code (`tests/util/spell/...`)
  - the generic ones run in a real browser (project `util`)
  - `spell/**`, `reactive/**` and `node/**` run in node (project `util:node`)
  - the kit's `vitest.config.ts` makes those two projects

## The reactive engine (`reactive/`)

- `spell/util/reactive`:  the ONE reactive engine every reactive class shares (epic `output-targets` P10, Q20).
  - Flattened into the `spell/util` barrel too.
  - spell CELLS:  `cells.ts` (the page-wide context, tracking, `flushCells()`), `Cell`, `Derived`, `Reaction`
  - the records, [extend.ts](reactive/extend.ts):
    - `getProp` / `setProp`, `getState` / `setState`, `derive()`
    - `typedJSON()`:  an object's props, its class's name first, `"$type"` (what a spell object's JSON says)
  - `Schema`:  per-class prop types
  - the decorators, [decorators.ts](reactive/decorators.ts):  `@prop`, `@state`, `@derived`
    - `{ equals }` on the last two
    - the same names and options as Spell UI's `Reactive.ts`
  - `bridges.ts`:
    - `bridgeSolid()`:  every Solid computation reads cells
      - The host (the app, a runner, `<spell-viewer>`) calls it once with its Solid:  util never imports Solid.
    - `observe()`:  a plain function re-run as what it read changes
- GENERIC, like the files beside `index.ts`:  no lodash, no Solid, nothing spell-specific.
  - So Spell UI may import it file by file, once it moves onto spell cells
    (caveat C12 of `output-targets`;  epic `spell-element`, which that waited on, is in `main`).
- Its files import each other as peers.
  - Spell's utilities (`spell/`) import it as `spell/util/reactive`, never through the barrel.
- It's Solid work:  READ [the Solid 2 rules](../../spell.epics/guides/solid/solid-2.md) IN FULL first.

## Kept values (`persist/`)

- `spell/util/persist`:  what an app keeps for people (epic `prefs-and-undo`):
  preferences across visits, and the history they undo and redo.
  - Flattened into the `spell/util` barrel too.
  - [PrefStore](persist/PrefStore.ts):  one app's preferences.
    - every key `<store>:<key>`, e.g. `spell-site:scheme`
    - values as text people can read, e.g. `dark` ([values.ts](persist/values.ts))
  - `PrefPlace`:  where a store keeps them.
    - quick:  the browser's storage (`StoragePlace`), or memory (`MemoryStorage`)
    - waited on (`WaitedOnPlace`):
      - `DatabasePlace`:  the browser's IndexedDB, one database for the site, `spell-prefs`
      - `ServerPlace`:  the page server's `/api/prefs`, which spell-app's spaces answer, in the person's space
      - the protocol's types:  [persist.types.ts](persist/persist.types.ts)
  - [ColorScheme](persist/ColorScheme.ts):  the light / dark choice, on `PrefStore` (epic `coherence` P12, C16).
    - ONE key for every Spell site (`spell-site:scheme`), its old keys moved over once
    - shown as `ui-light` / `ui-dark` on `<html>` and inline `color-scheme`;  follows the OS and other tabs
    - ONE dark-mode query, `DARK_QUERY`, in [persist.types.ts](persist/persist.types.ts):
      the kit's site header, Spell UI's `ThemePreference` and runtime, and the editor's code colours read it
  - [UndoStack](persist/UndoStack.ts):  undo and redo, with transactions and folding.
    - a transaction:  one step for everything an action does, waits included
    - its records say how to undo themselves, so it knows nothing of what's kept
    - On the reactive engine (`spell/util/reactive`), for its live titles:  the folder's one import from outside it.
- GENERIC, like the files beside `index.ts`:  nothing spell-specific,
  except `ColorScheme`'s key and classes:  the one choice every Spell site shares, kept by both the kit and Spell UI.
  - The pref store imports nothing from outside the folder.
  - NOT in Spell UI's util barrel:  in its `core` bundle it cost every page 1.9 kB (`yarn measure`, 2026-10-24).
    Spell UI's files that keep preferences import `spell/util/persist/PrefStore` (or `ColorScheme`) by file.
- Its files import each other as peers.
- Its tests run in a real browser (project `util`):  they use the browser's own storage.
- Every key a plain script also reads (a page's inline `<head>` script, the live-reload client) is written
  byte for byte as before:  a store's name is the key's part before its first colon.

## Decorators

As WWOD §12, plus:

- The kit's Vitest config uses the `standardDecorators()` plugin, so `decorators.test.ts` runs lowered decorators.
- Every other package that compiles this source (`ui`'s build, its docs site, `spell`) already runs that plugin.

## Types / Exports

As WWOD §8.
The barrel has no self-namespace:  helpers are imported by name.

## Imports

As WWOD §4:  `spell/util/...`, this folder's files too;  same-folder peers `./peer`.
Files in THIS folder import each other as direct peers (`./class`).
