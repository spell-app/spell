# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `element/` (`spell-kit/element`).

**READ the kit's [AGENTS.md](../AGENTS.md) and [WWOD](../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

**This is Solid work:  READ [the Solid 2 rules](../spell.epics/guides/solid/solid-2.md) IN FULL FIRST,**
then [ui's AGENTS.md](../spell-ui/AGENTS.md), "Solid authoring":  how an element is written on this folder's code.

## This folder:  the kit's `element/`

- What makes a custom element on Solid:  the component and DOM element bases, the reactive members' decorators,
  shadow events, hot reloading.
- Its own repo, spell-element, from epic `repo-split` P8 (cut from spell-app with its history);
  merged into the kit with that history in P9.
- Another repo imports it by its npm name, `spell-kit/element`, an entry of the kit's `package.json` `exports`
  (`spell-kit/element/timing` ...).
- Inside the kit, its alias is still `$/spell-element`, in the kit's [tsconfig.base.json](../tsconfig.base.json):
  the name every page's component packs share it by at run time (`packModuleKey()`, epic `repo-split` J72).
- It may use:  util's generic files (`$/util/class` ...) and the toolchain, both the kit's.
  - Every arrow points DOWN:  nothing in the kit or below it may import a child repo.
- Its tests:  in the kit's [tests/element/](../tests/element/) (below, "Overview").

## Overview

- What makes a custom element on Solid, for EVERY component set:
  Spell UI's, the epics', the app's, the brand's, and a space's own (epic `people-and-orgs`, P17).
  - Until then it was the element half of Spell UI's element core, in [its elements folder](../spell-ui/src/elements/).
  - Owen, round 7 of the spaces page:  "Move the code in spell/ui that creates custom components into $/spell-solid."
  - Named `spell-solid` (`$/spell-solid`) until epic `repo-split` P3 renamed it, package and alias, as Owen asked.
    - Its class `SpellSolid` (the settings, below) and the app's `spell-solid.js` chunks keep the old word:
      the app's runner already has a `SpellElement`, and those chunks carry Solid itself.
    - spell-epic followed the rename (epic `repo-split` T6);  the stand-in under the old name went in P6.
  - Its place in the layout:
    the epic's spaces page, [4.3 and 7.4](../spell.epics/epics/people-and-orgs/details/spaces-package.html#spell-solid).
- What's in `src/`, imported as `$/spell-element`, namespace `E`:
  - [UIComponent](src/UIComponent.tsx), the COMPONENT base:  one instance per element, its `render()` returns JSX
  - [DOMElement](src/DOMElement.ts), the DOM element base:  attributes, properties, the upgrade, shown or hidden
  - [ElementDefinition](src/ElementDefinition.ts):  a vocabulary => the DOM element's attributes, events, slots
  - [Reactive](src/Reactive.ts):  the decorators of an element's reactive members:
    - `@state`, `@controlled`, `@derived`
    - `@cssState`, `@aria`
    - `@onChange`, `@whileConnected`, `@watches`, `@on`, `@untracked`
  - [Cell](src/Cell.ts), [SlotContent](src/SlotContent.ts)
  - [PartContext](src/PartContext.ts) and [OwnerContext](src/OwnerContext.ts):
    the generic content parts, and the element they belong to
  - [ShadowEvents](src/ShadowEvents.ts):  Solid's events kept from leaking out of shadow roots
  - [HotDefinitions](src/HotDefinitions.ts):  hot reload of a set's elements in `yarn dev` (dev-only)
  - [timing](src/timing.ts):  when to run something
    - `afterSolidUpdate()`, `beforeNextPaint()`
    - `soon()`, `after()`, `every()`
  - [SkeletonText](src/SkeletonText.ts):  a vocabulary's skeleton, written as one line of text, parsed in node
    - NOT in the barrel:  reached by path, `spell-kit/element/SkeletonText`
    - Spell UI's (`src/vocabulary/`) until epic `repo-split` P10
  - [SpellSolid](src/SpellSolid.ts):  the settings a set's runtime hands it as it loads (below)
  - the types:
    - [elements.types.ts](src/elements.types.ts):  `ElementSetup`, `AttributeValues`, the settings
    - [vocabulary.types.ts](src/vocabulary.types.ts):  `ComponentVocabulary`, `Dictionary`:  every set's schema
- What's in [`tools/`](tools/), node only, imported as `spell-kit/element/tools/<Name>`
  (`$/spell-element/tools/<Name>` inside the kit):  the tools every set's builds and scripts share.
  - Spell UI's own `tools/` until epic `repo-split` P10.
  - [ComponentPack](tools/ComponentPack.ts):  a component pack's build, and whether it's current
    - its shapes and its error:  [tools.types.ts](tools/tools.types.ts)
  - [packModules](tools/packModules.ts):  the modules a pack shares with the page (`PACK_MODULES`, `packModuleKey()`)
  - [RootCatalog](tools/RootCatalog.ts):  what `<ui-root>` needs of each tag, read from the vocabularies;
    [VocabularyFiles](tools/VocabularyFiles.ts):  every vocabulary file of a folder of families
  - [elementConfig](tools/elementConfig.ts):  the Vite settings every set's elements are compiled with
    - `elementBaseConfig()`:  Spell UI's `baseConfig()` starts from it, and so does the pack build
    - `CSS_TARGETS`, `SOLID_DEDUPE`
  - [HotElements](tools/HotElements.ts):  the Vite plugin for hot reloading a set's elements in `yarn dev`
  - [DevServer](tools/DevServer.ts):  a package's Vite dev server, started from node
  - [Terminal](tools/Terminal.ts):  where tools print;  [NodePackage](tools/NodePackage.ts):  finds an installed package
  - Their tests:  the kit's [tests/element/tools/](../tests/element/tools/).
  - The kit checks them as their own folder (`element/tools` in its `"spellFolders"`, run by `spell-folders`:
    [the toolchain's AGENTS.md](../toolchain/AGENTS.md)), with their own [tsconfig.json](tools/tsconfig.json) (node)
    and Vite+ configs.
- [`bin/spell-pack.mjs`](bin/spell-pack.mjs), the kit's bin:  `spell-pack build | check [<folder>]`, a component
  pack's build or its check, from any repo (`ComponentPack`).
  - spell-epic's and the brand's `yarn pack:build` / `pack:check` run it;  spell-app's `spell dev pack` calls
    `ComponentPack` itself.
  - Spell UI's `spell-ui-pack` until epic `repo-split` P10, which ran files Spell UI's package doesn't ship (C10).
- Four of those files began as `@solidjs/element` and `component-register`,
  folded in and fixed (epic `spell-element`, 2026-10-09):
  - `UIComponent`, `DOMElement`, `ShadowEvents`, `HotDefinitions`
  - each carries their MIT notice
- Tests:  in the kit's [`tests/element/`](../tests/element/), at the same paths as the code.
  - [`UIComponent`](src/UIComponent.tsx)'s test is
    [`UIComponent.test.tsx`](../tests/element/src/UIComponent.test.tsx), at the same path under `tests/element/`.
  - In a real browser (Vitest browser mode + Playwright, chromium), as Spell UI's are,
    on the folder's own plugins ([its Vitest config](vitest.config.ts)):  the decorator pre-pass, then Solid's.
  - With NO Spell UI on the page (epic `repo-split` P3):  its tsconfig and Vitest config name none,
    nor do the kit's dependencies.
    - Their setup file, [TestSettings](test-helpers/TestSettings.ts), installs stand-in settings:
      English names, the shared attributes, no styles, every animation over at once.
    - Their helpers are the folder's own, in [`test-helpers/`](test-helpers/) (`$/spell-element/test-helpers/...`).
- The TEST HELPERS every set's tests use, in [`test-helpers/`](test-helpers/) (epic `repo-split` P10, Q39):
  `spell-kit/test-helpers/<Name>` from another repo, `$/spell-element/test-helpers/<Name>` inside the kit.
  - [`Fixture`](test-helpers/Fixture.ts):  render HTML into the live document, removed when the test ends
  - [`ElementFixture`](test-helpers/ElementFixture.ts):  render, wait for every element's `ready`, `flush()`;
    `breakRender()`, a forced render failure
  - [`A11y`](test-helpers/A11y.ts):  axe on a live element (`expectAccessible()`), and WCAG contrast
  - [`Viewport`](test-helpers/Viewport.ts):  resize the test iframe for one test
  - They know only the DOM, Solid, `DOMElement` and `UIComponent`:  a helper that needs Spell UI stays in Spell UI's
    `test-helpers/` (`MemberClashes`, `ThemeHarness`, `Sheets` ...).
    - What needs Spell UI's real runtime is tested in Spell UI's tests:
      `<ui-root>`'s `appContext`, Spell UI's settings and translations, its core carrying every name,
      no vocabulary attribute named like a base's member (`$/ui/test/MemberClashes`, run by each set over its own).
  - [The barrel test](../tests/element/src/barrel.test.ts) pins what "Imports" says:
    - every export live
    - no import but `$/util`'s and Solid's

## Imports

As WWOD §4, plus:

- `src/` imports ONLY Solid, and `$/util`'s generic files, one by one, never the `$/util` barrel:
  - `$/util/class`, `decorators`, `dom`, `string`, `util.types`
  - NEVER Spell UI, or any other package:  every set's elements are written on it, Spell UI's included.
  - The barrel re-exports those `$/util` files,
    so a component file reads them through `E` too (`@E.proto`).
- Its files import each other through `E`, as Spell UI's element core does
  (ui's AGENTS.md, "Imports in component files"):
  - `import { E } from "$/spell-element"`
  - Except what a file reads while it EVALUATES (a base class, a decorator, a static initializer):
    that comes from its own file, under `// Import directly to avoid circular import`.
- Who imports it:
  - Spell UI:  its `$/ui/core` entry re-exports ALL of it, so Spell UI's `E` holds every name this `E` does.
    Spell UI's own component files keep importing `$/ui/core`.
  - Every pack's element files, `import { E } from "spell-kit/element"` (another repo's, so by its npm name):
    - `epics`, `brand`, and `app`'s `components/`
    - A file that also uses Spell UI's own pieces takes `E` from `$/ui/core` instead:
      the same names, and Spell UI's on top.
      Those pieces:  `E.IconGlyph`, `E.LoadableBody`, `E.NativeFallback`, `E.Converters` ...
- Leaves other packages may import by path (the header of the kit's [tsconfig.base.json](../tsconfig.base.json)):
  - `$/spell-element/elements.types` and `$/spell-element/vocabulary.types`:
    - where a set adds its names (below)
    - for node code that mustn't load the element layer (the vocabularies, the epics' definitions)
  - `$/spell-element/timing`:  `$/ui/util` re-exports it
  - `$/spell-element/SkeletonText` (`spell-kit/element/SkeletonText`):  node code that parses skeletons
  - `$/spell-element/HotDefinitions`:  the HMR plugin, [HotElements](tools/HotElements.ts), injects it by its file path
- `tools/` and `bin/` are node only, and may import node built-ins, Vite and `tsx` too:  never a page.

## Settings

- The element bases call the page's RUNTIME for what's a set's own:  its words, style sheets, focus and animations.
  - `element/` can't import that runtime, so the runtime hands them over as it loads.
    - It calls `SpellSolid.install(settings)`.
    - The bases read them as `E.SpellSolid.settings`.
    - Their type:  `SpellSolidSettings`, in [elements.types.ts](src/elements.types.ts).
  - What the settings hold:
    - `runtime`:  is it loaded, load it
    - `words`:  the vocabulary layer (names, value sets, converters, class words, texts)
    - `styles`, `focus`
    - `motion`:  the default animation, reduced motion, running one
    - `warn()`
  - Spell UI's:  [SpellUISettings](../spell-ui/src/elements/SpellUISettings.ts), installed as `$/ui/core` loads.
    - `$/ui`'s barrel and the root's install them too:  a bundler may drop `core`'s side-effect import.
    - Every page with elements has Spell UI's runtime.
  - A tag defined before any are installed waits for them:
    a code-split bundle may run a family's chunk before the one that installs them.
    - `UIComponent.define()` returns `undefined`, and defines the tag as they're installed.
    - Still waiting after 5s:  a console warning.
  - Reading `SpellSolid.settings` before any are installed throws, naming what to import.
- A set adds the NAMES `element/`'s types check against by augmenting its interfaces
  (`declare module "$/spell-element/..."`):
  - `ElementAnimations` (`elementSetup.animation`):  Spell UI adds Fomantic's, in its `components.types.ts`
  - `ValueSetNames` and `TopicNames` (a vocabulary's `values` and `topics`):  Spell UI's `ValueSets`
  - Without Spell UI in a program, they hold only `none` / nothing.

## One copy per page

- Two copies of `element/` on a page would mean two `UIComponent`s and two registries.
  - It fails silently, as two Solids do
    ([the Solid 2 rules](../spell.epics/guides/solid/solid-2.md), "One Solid per page").
- So no bundle of ours carries its own:
  - Spell UI's `core` entry carries it, and so everything built on that entry:
    - Spell UI's built `core.js`
    - the docs bundle, the site bundles
    - the app's `spell-solid.js`
  - A component pack leaves `$/spell-element` external, as it leaves Solid and `$/ui/core`.
    - The list:  `PACK_MODULES`, in [the pack modules](tools/packModules.ts).
    - It reads it from the page:
      `SpellUI.packModules["$/spell-element"]` is Spell UI's core module, which carries all of it.
  - The app's element bundles likewise take it from `spell-solid-shared.js`
    ([the app's shared build](../spell-app/app/vite.shared.ts)).

## Commands

- The kit's, at its root:  `yarn kit:ts`, `kit:lint`, `kit:format`, `kit:test`, `kit:review`.
- In this folder, its tests alone:  `yarn vp test run`.
- No build of its own:  it's source, bundled by whoever draws with it.
