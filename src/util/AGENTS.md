# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `util/` (`spell-kit/util`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- `src/util/` (`spell-kit/util`, from the kit and every other repo) holds the small GENERIC helpers more than one package uses:
  - `decorators.ts`:
    - `@proto`:  the standard-decorator for class defaults
    - `@protoMerged`:  for a settings object whose keys merge down the class chain
    - `@lazy`:  a getter made on first read, then kept
    - `@once`:  a method run once, its result kept (e.g. a loader's promise)
    - `forget(object, "name")`:  drops what either of those two kept, for a `reset()`
    - `@resets("name")`, on an accessor:  each write to it drops that kept value too
      - e.g. `@E.resets("load") static accessor url`
  - `class.ts` -- `hasOwnProp` ...
  - `string.ts` -- case conversion, `numberToWord`, `suggest`
  - `dom.ts` -- shadow-aware traversal, `NodeType`, `byDocumentOrder`, `isBrowser`, `nextFrame`
  - `util.types.ts` -- `Constructor`, `AbstractClass`, `Prettify`
- It sits UNDER every other package, and imports NONE of them.
  - `spell-ui` is published, and bundles what it imports from here (its `.d.ts` files inline it).
  - So nothing spell-specific may land here.
- What does NOT belong:
  - anything spell-specific
  - anything needing a dependency `ui` doesn't already have (`pluralize`, CommonJS `lodash` ...):
    it goes in `spell/`, never beside the generic files
  - anything only ONE package uses:
    - `ui`'s `core.ts` re-exports its `spell-ui/util` wholesale, which imports every GENERIC file here
    - so each lands in `ui`'s `core` bundle (`yarn measure`), used or not
  - when in doubt, leave it in the package
- Commands:  the kit's, at its root (`yarn kit:review`, `kit:ts`, `kit:lint`, `kit:format`, `kit:test`);
  its tests alone:  `yarn vp test run --project util --project util:node`, at the kit's root.
  - The tests:  a real browser (chromium) for the generic files;  node for `spell/`, `reactive/` and `node/`.
- Barrel only, as WWOD §4 › "Package aliases, never `../`" says, with ONE exception here:
  [ui's util barrel](../../spell-ui/src/util/index.ts) imports the generic files one by one (`spell-kit/util/class` ...).
  - Why:  so spell's utilities never reach `ui`'s bundles or published declarations.
  - `ui` keeps its own `util` barrel (`spell-ui/util`) for package-specific helpers.

## Node-only helpers (`node/`)

- Generic helpers that need node:  imported by deep path, NEVER through a barrel, so no browser code pulls them in.
- [json5.ts](node/json5.ts):  JSON5 written with its comments kept (`json5Edited()`, `keepingComments()`,
  `readJSON5File()`), on json5-writer.
  - `spell-kit/util/node/json5`.
  - The kit's node program checks it (`tsconfig.node.json`), not the browser-safe one.
  - Moved here from the assembler (epic `repo-split` P1):  ui's tools, app, brand, spaces, spell-epic and the
    server's `DataFile` use it, and util is the bottom of the stack.
  - Its tests run in node (the kit's `vitest.config.ts`, project `util:node`).

## Spell's utilities (`spell/`)

- Spell's own utilities, flattened into the `spell-kit/util` barrel LAST:
  - lodash and string helpers
  - `Observable` / `Derivative` / `Loadable`, `Task` / `TaskList`
  - `$fetch`, `Logger`, prefs, `assert` / `die`
  - DOM helpers
- The bottom of the spell chain:  every spell-family package may import it, and it imports nothing above it.
  - Formerly the package `spell-util`.
  - A sub-folder, not loose files:
    - `string.ts` / `DOM.ts` would clash with the generic `string.ts` / `dom.ts` (macOS is case-insensitive)
    - and nothing in `ui` may import it
  - Its dependencies (lodash, `chalk`, `pluralize` ...) are the kit's `dependencies` (its root `package.json`).
    - `ui` bundles none of them:  `yarn measure` and `yarn smoke` (declarations) prove it.
- Files in `spell/` import the generic helpers by deep path (`spell-kit/util/class`).
  - NEVER the `spell-kit/util` barrel:  it re-exports this folder, so that's a cycle.
- NOTE: [ResponseErrors.ts](spell/ResponseErrors.ts) is deliberately NOT in [the folder's barrel](spell/index.ts)
  -- see its header.
- Spell's layer of reactivity:  `Observable`, and [spellDecorators.ts](spell/spellDecorators.ts) (`@thing`).
  - The engine under it is `reactive/` (below).
- Tests:
  - they live in the kit's [tests/util/](../../tests/util/), at the same paths as the code (`tests/util/spell/...`)
  - the generic ones run in a real browser (`util:browser`)
  - `spell/**`, `reactive/**` and `node/**` run in node (`util:node`)
  - the kit's `vitest.config.ts` makes those two projects

## The reactive engine (`reactive/`)

- `spell-kit/util/reactive`:  the ONE reactive engine every reactive class shares (epic `output-targets` P10, Q20).
  - Flattened into the `spell-kit/util` barrel too.
  - spell CELLS:  `cells.ts` (the page-wide context, tracking, `flushCells()`), `Cell`, `Derived`, `Reaction`
  - the records, [extend.ts](reactive/extend.ts):
    - `getProp` / `setProp`, `getState` / `setState`, `derive()`
    - `typedJSON()`:  an object's props, its class's name first, `"$type"` (what a spell object's JSON says)
  - `Schema`:  per-class prop types
  - the decorators, [decorators.ts](reactive/decorators.ts):  `@prop`, `@state`, `@derived`
    - `{ equals }` on the last two
    - the same names and options as Spell UI's `Reactive.ts`
  - `bridges.ts`:  `bridgeSolid()`, which the HOST calls with its Solid (util never imports Solid), and `observe()`
- GENERIC, like the files beside `index.ts`:  no lodash, no Solid, nothing spell-specific.
  - So Spell UI may import it file by file, once it moves onto spell cells
    (caveat C12 of `output-targets`;  epic `spell-element`, which that waited on, is in `main`).
- Its files import each other as peers.
  - `spell/` imports it as `spell-kit/util/reactive`, never through `spell-kit/util`.
- It's Solid work:  READ [the Solid 2 rules](../../spell.epics/guides/solid/solid-2.md) IN FULL first.

## Decorators

As WWOD §12, plus:

- The kit's `vitest.config.ts` uses the `standardDecorators()` plugin, so `decorators.test.ts` runs lowered decorators.
- Every other package that compiles this source (`ui`'s build, its docs site, `spell`) already runs that plugin.

## Types / Exports

As WWOD §8.
The barrel has no self-namespace:  helpers are imported by name.

## Imports

As WWOD §4:  `spell-kit/util/...`, this folder's files too;  same-folder peers `./peer`.
Files in THIS folder import each other as direct peers (`./class`).
