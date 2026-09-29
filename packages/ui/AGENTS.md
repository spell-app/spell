# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this repository.

## Overview

- `@spell/ui` is Fomantic UI reborn as `ui-*` custom elements on a modern CSS foundation:  Fomantic's
  vocabulary (`ui small primary basic icon button`), shadow DOM, `@layer`s, OKLCH tokens, accessibility built in.
  Usable from any framework or plain HTML.
- The approved design is `docs/plan.md`.  Read "Decisions" and "Architecture" there BEFORE adding a component
  or runtime service.
- Layout:
  - `src/util/` -- general utilities with no dependency on the rest of the package:  `@proto` (`decorators.ts`),
    `class.ts`, `string.ts` (case, `numberToWord`, `suggest`), `dom.ts` (`closestAcrossShadow` ...), `util.types.ts`
  - `src/runtime/` (`UI`) -- the shared `UI` runtime, ONE instance per page (`globalThis.UI ??= new UIRuntime()`).
    Components call `UI.load()` on connect, which dynamic-imports this chunk once.  Services are classes:
    `Browser` (sniffing + `UI.browser.supports` flags), `Keyboard`, `Overlays`, `Focus`, `Styles`, `Vocabulary`,
    `I18n`, `Transitions`, `Ids`, `Toasts`, `Modals`, `Api`
  - `src/elements/` (`E`) -- base classes:  `UIElement`, `ClassBuilder`, `ContentPart`, `FormControl`,
    `OverlayElement`
  - `src/components/<name>/` -- one folder per component:
    - `<name>.ts` -- element class(es)
    - `<name>.css` -- port of Fomantic's `.less` + `.variables`
    - `<name>.vocabulary.en.ts` -- EVERY name the component uses:  tag, attributes (kind + allowed values),
      values, events, slots, parts, states, text strings.  Translations become `<name>.vocabulary.<lang>.ts`
    - `<name>.test.ts`, `<name>.a11y.test.ts`, `<name>.visual.test.ts`, `examples/*.html`
  - `src/styles/` -- `layers.css`, tokens, colours, sizes, reset, typography, animations, utilities, `native.css`,
    `themes/`
  - `src/index.ts` -- registers every component (side-effect entry) and re-exports them
  - `spike/` -- Milestone 0 base-library spike (`spike/lit/`, `spike/solid/`), deleted once decided
  - `site/` -- Astro docs site, modelled on Fomantic's docs
  - `test/` -- shared test utils:  `Fixture.render(html)` (`fixture.ts`), `A11y.check(el)` / `expectAccessible(el)`
    (`a11y.ts`).  Every test runs in a REAL browser (Vitest browser mode + Playwright, chromium by default)
  - `docs/` -- design docs (`plan.md`, later `grammar.md`, `theming.md`, `translation.md`)
  - `reference/Fomantic-UI/` -- READ-ONLY, git-ignored clone of Fomantic for porting.  NEVER edit or import it.
- Commands:
  - `yarn review` -- tsc + oxlint `--fix` + oxfmt + tests;  MUST pass before you hand work back
  - `yarn build` -- tsc + vite library build into `dist/`
  - `yarn test:all` -- chromium + firefox + webkit (`yarn test:browsers` once first)
  - NEVER `npx tsc`:  `node_modules/.bin/tsc` is TypeScript 6 (see `PAPERCUTS.md`).  Use `yarn tsc`.

## UI rules

- Shadow DOM EVERYWHERE, with SEMANTIC shadow markup:  `<button>`, `<dialog>`, `<input>`, `<nav>`, `<table>` ...
  NEVER a `<div>` where an element exists.
- Inside shadow roots, keep Fomantic's class grammar on those elements:  `<button class="ui small primary button">`.
  Why:  it's a mechanical port of the `.less`, and the app stylesheet / `::part` override language is the known
  vocabulary.  Translated names never touch CSS.
- Units:  NEVER `rem` -- the page stylesheet can redefine it.  Sizes derive from px-valued `--ui-font-size`
  (default `16px`) and `em` inside components.
- Sizes are ratios of 16.  `medium` is a real size meaning "default" -- a no-op that emits no class.
- Booleans:  presence / `""` / `"true"` / `"yes"` ~== true;  `"false"` / `"no"` ~== false.
- Widths:  attribute is `width`, NEVER `wide`;  accepts columns (`4` of 16), fractions (`1/4`), percentages (`25%`).
- Chosen state:  `selected` is canonical (checkbox, radio, toggle, items, tabs, options);
  `checked` is accepted as an alias on checkbox / radio only.
- Generic content parts (`<ui-content>`, `<ui-header>`, `<ui-meta>`, `<ui-description>`, `<ui-extra>`,
  `<ui-actions>` ...) style themselves by OWNER CONTEXT (`:state(in-card)` via `ContentPart`).
  NEVER `ui-card-header`, NEVER `:host-context`.
- Events:  `CustomEvent`s, `bubbles: true, composed: true`, lowercase kebab `ui-*` names (`ui-change`, `ui-open`);
  `detail` carries computed state (`{ value }`, `{ open }` ...) plus `originalEvent`.
- Rich data (`options`, `rows`) as JS PROPERTIES -- real accessors on the class, so frameworks find them with `key in el`.
  Primitives as REFLECTED attributes.  First paint MUST NOT need a rich property (SSR drops them).
- Vocabulary files own every name:  NEVER a string literal for an attribute / event / slot / part name in a
  template or `ClassBuilder` -- read it through the component's vocabulary.
- Class defaults (vocabulary, default settings, part names) are `@proto static` (from `$/util`), so instances
  carry no per-instance copies.
- Prefer classes over loose functions for anything that coordinates:  runtime services are classes
  (`Keyboard`, `Overlays`, `Styles`), builders are classes (`ClassBuilder`).  A helper that earns a name
  becomes a private method or a small class.
- CSS layers:  `@layer ui.reset, ui.tokens, ui.base, ui.components, ui.utilities, ui.theme, ui.app;`
  - inside `ui.components` each component declares sublayers `types, content, variations, states`,
    so states beat variations without `!important`
  - NEVER `!important` unless documented with a comment saying why
  - colours / sizes by token REMAP (`--ui-color`, `--ui-scale`) and one generic rule set, not per-hue rules
- Libraries:  `lodash-es` only (tree-shakes).  Ask before adding any other runtime dependency.
- Platform:  ASSUME anchor positioning (no JS fallback), style container queries, popover, `<dialog>`.
  Safari gaps (`closedby`, `popover=hint`, `CloseWatcher`, customizable `<select>`) are feature-flagged through
  `UI.browser.supports`, NEVER user-agent checks at the call site.

## Long-term debt

- `CODE-DEBT.md` tracks structural debt we have knowingly chosen NOT to fix yet.
- Add an entry when a problem is structural, too big to fix in passing, and being tolerated
  deliberately -- especially when a test or lint rule is pinned, skipped or widened to
  accommodate it.  Record the mechanism, not a guess, so nobody rediscovers it.
- NOT for local cleanups (inline `REFACTOR:` marker), suspected bugs (`SUSPECTED-BUGS.md`)
  or tooling papercuts (`PAPERCUTS.md`).
- See that file's header for the entry format.

## Documentation

- Create and maintain a markdown docstring comments before:
  - types and each property in a type
  - classes and class methods/fields
  - loose methods
- Explain _why_, don't just restate the code.
- Make sure to note side effects and unexpected conventions.
- Format:
  - informal style, one line and then `-` bullets
  - DO NOT use jsdoc `@param` etc
  - terse text, e.g. `last server version`, not `the last known server version`
  - two spaces after a period
  - backticked identifiers/types
  - format lists as bullets rather than inline commas
  - `~==` for "equivalent to" and `===` for exactly equals
- Marker vocabulary / invariants: NOTE, TODO, SIDE EFFECT, HACK, NEVER, MUST, DOCME, RENAME, DEPRECATED
- Wrap comments at english phrase boundaries, not mid-clause. Avoid single or double widow words,
  wrap `e.g.` clauses if they don't fit on the original line, etc.
  and drop filler articles (`the`, `a`) that don't earn their place
- Write or clarify docstrings and comments where you see marker `DOCME`.
- Always place a blank line before a group header like the below.
- Separate function code groups like so:

```

////////////////
// ## Group Name
////////////////
```

- Separate custom element classes with a header like so:

```

/****************
 * ### `<ui-component-name>`
 * Description of the component.
 ****************/
```

## Functions

- An inner helper that doesn't use `this` is NOT an inline arrow (`const visit = (...) => ...`).  Either:
  - make it a private helper function, or
  - declare it `function visit(...) {...}` at the BOTTOM of the enclosing function, after any `return`,
    with a docstring saying what it does -- hoisting makes it callable from above.
- Arrow functions stay fine for short callbacks passed inline, e.g. `tokens.map((token) => token.value)`.

## Decorators

- Use STANDARD (TC39 2023-11) decorators, NEVER `experimentalDecorators`.  General-purpose ones live in `$/util/decorators.ts`.
- Lowered by esbuild via `vite.decorators.ts`, used by `vite.config.ts`, `vitest.config.ts` and the Astro config --
  vite 8's own transformer (oxc) doesn't do it yet.
- A decorator MUST be the first thing on its line (`@proto static parts = [...]` is fine,
  and preferred) or that plugin won't notice the file.
- Lit properties (if Lit wins the spike) are `@property() accessor value = ""` -- standard decorators need `accessor`.

## Types / Exports

- ALWAYS use `type` rather than `interface`. Wrap with `Prettify` (from `$/util`) when combining types.
- One exported class per file, file named for the class.  e.g. `Keyboard.ts`, `Overlays.ts`
  rather than both living in `services.ts`.
- Types and helper functions appear AFTER the durable JS structure that uses them,
  e.g. `UIElementProps` goes directly below `class UIElement`.
- Centralize shared types in a single `<folder>.types.ts` per folder, e.g. `runtime.types.ts`, `elements.types.ts`.
  - NEVER bare `types.ts` or `constants.ts` -- constants, small error classes
    and pure helpers for those types live in `<folder>.types.ts` too.
  - Group with `// ## Group Name` headers.
  - MUST be runtime-light:  `import type` only, apart from `$/util`.
  - Exception: class constructor props (`XProps`) live in the defining file.
    Move to `<folder>.types.ts` once a second file needs them.
- Create barrel `index.ts` for each folder:
  - header comment block explaining the barrel, with `NOTE:` for anything deliberately left out or namespaced
  - `export * from "./<folder>.types"` first, then leaf files base-classes-first
  - sub-folder barrels are flattened in:  `export * from "./services"`
- Each sub-system has ONE self-namespace, exported from its top barrel:  `export * as E from "."`
  - `UI` ~== the runtime singleton from `$/runtime`
  - `E` ~== `$/elements`
  - the components barrel exports classes by name (`UIButton`, `UIDropdown`), no namespace
  - NEVER create a second namespace for a sub-folder -- flatten into parent.
  - Exception: namespace a file whose names would collide when flattened.
  - Prefer a disambiguating affix over a namespace when the names allow it.
  - NOTE: `export *` through a circular barrel is riskier than a named re-export -- it must read the
    leaf's key list EAGERLY, so a mid-body leaf contributes nothing.
- Barrels MUST NOT pull in optional sub-systems.  Make them opt-in via side-effect import.
- When refactoring imports and exports, if you encounter circular import problems
  create smoke tests (`barrel.test.ts`)  ensuring no circular import problems in
  TS/rollup/browser for various entry points.

## Imports

- ALWAYS import starting from `$`, NEVER start import from `../`.
- OK to import from direct peers: `import { UIElement } from "./UIElement"`, but not subdirectories -- use `$/...` instead.
- Prefer ONE namespace import per sub-system and qualify at use site:
  `import { E } from "$/elements"` => `E.UIElement`, `new E.ClassBuilder(...)`.
  - Applies INSIDE the sub-system as well.
  - Self-import uses full path too, even from same folder as the barrel:
    `import { E } from "$/elements"`, NEVER `import { E } from "."`.
    Only the barrel itself says `"."`:  `export * as E from "."`.
  - NEVER reach into another sub-system's leaf file for something its barrel exports.
  - OK to refer to file's own class unqualified.
  - Tests may mix: `import { E, UIElement } from "$/elements"`.
- Circularity rules for files inside a barrel:
  - `E.X` as a VALUE is fine inside function / method bodies -- resolved at call time.
  - NEVER use `E.X` at module-evaluation time:  `extends` clauses, static initializers,
    top-level `new`.  Circular reentry silently yields `undefined` / broken `instanceof`.
  - Import base classes directly from the defining file, with comment:
    `// Import directly to avoid circular import`
  - Use `import type { E }` when file only needs types, e.g. `*.types.ts`.
- Import order:
  - node_modules
  - (blank line)
  - `$/util` and other general utilities, general-to-specific
  - other sub-system barrels
  - own barrel
  - direct peer files, base classes first
  - (blank line)
  - side-effect imports (`import "$/components/button"`)
  - css files (`./button.css` if in same folder, else `$/styles/tokens.css`)
- One import statement per module.  Inline type imports:  `import { E, type ClassKind } from "$/elements"`.
