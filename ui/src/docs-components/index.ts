/**
 * Barrel for `spell/ui/docs-components` -- the DOC-ONLY elements:
 * `<ui-docs-*>` widgets Spell UI's docs site (its pages:  the shared `ui/*.html`) is built from,
 * on top of the real components.
 * - What they are:  element families written EXACTLY like a component family,
 *   but for documenting the library, not for apps.
 *   Same files in `ui-docs-<name>/`:  a component class, a vocabulary with `topics` + `aka`, css, tests,
 *   `examples/elements/*.html` (`packages/ui/AGENTS.md` "Solid authoring").
 *   - `<ui-docs-api>`, `<ui-docs-tokens>`, `<ui-docs-nav>` --
 *     a tag's API / token tables, the sidebar:
 *     built from the site's generated data, `docs/__data/components.json5`
 *     (`SiteData`;  its shape is `docs-components.types.ts`)
 *   - `<ui-docs-search>` -- the site search (in the nav's header band):
 *     the page shown's sections, components, attributes and every page's sections
 *     (`__data/search.json5`, its own `SearchData`)
 *   - `<ui-docs-inspector for>` -- a live view of another element's attributes, properties and `:state()`s
 *     (the custom elements guide, `guides/custom-elements/`, loads it in its own script)
 * - NOT components:  `ComponentDefinitions.all`, the component list and the lib build's entries leave them out
 *   (`ComponentDefinitions.docs` lists them);  every vocabulary's topics include `documentation`.
 * - `<ui-root>` KNOWS them:
 *   - `yarn gen:root` puts their tags in its catalog
 *   - `RootLoader` imports a family from here on first use, like any component's,
 *     once the page's bundle has called `DocsFamilies.add()` (the docs site's does)
 *   - never in the library's own `<ui-root>` (`DocsFamilies` says why)
 * - Adding one:  make `ui-docs-<name>/` (copy `ui-docs-inspector/`), `yarn gen:root`, `yarn site:data`;
 *   add the tags its JSX renders to `DocsJSXTags`,
 *   and import their families in its barrel (a root only loads the light DOM's).
 * - `package.json` `sideEffects` lists every `./src/docs-components/<family>/index.ts`:
 *   without it a bundler drops each barrel's `define()` (the family chunk loads, the tag stays undefined, no error).
 * - Imports:  shared code from `spell/ui/core` as any family;
 *   docs-only shared code (`SiteData`, `SiteDataLoad`) from `spell/ui/docs-components/<file>`.
 * - Real components now, once docs widgets:
 *   - the theme menu, since epic `debut` P17:  `<ui-theme-menu>` (`spell/ui/components/ui-theme-menu`),
 *     with the remembered theme and scheme, `ThemePreference`
 *   - the page's contents and the live example, since epic `ui-gaps` P14:  `<ui-toc>` and `<ui-example>`
 *     (`spell/ui/components/ui-toc`, `spell/ui/components/ui-example`);  a docs widget may use them, never the
 *     other way round
 *   - what they share with the docs widgets is `UIT`'s:  `HeadingLevels`, `CODE_SPAN`, `TocMarks`
 * - NOTE:  this barrel defines NOTHING:  types, `SiteData` and `SiteDataLoad` only.
 *   Import a family (`spell/ui/docs-components/ui-docs-api`) to define its tags.
 */

export * from "./docs-components.types"

export * from "./SiteData"
export * from "./SiteDataLoad"
