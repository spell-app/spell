/**
 * Barrel for `spell/element`:  what makes a custom element on Solid, for every component set
 * (Spell UI's, the epics', the app's, the brand's, a space's).
 * - `UIComponent`, the COMPONENT base:  one instance per element, its `render()` returns JSX
 * - `DOMElement`, the DOM element base
 * - `ElementDefinition`:  a vocabulary => the DOM element's attributes
 * - `Reactive`:  the decorators of an element's reactive members (`@state`, `@controlled`, `@derived` ...)
 * - `Cell`, `SlotContent`
 * - `Disclosure`:  one open / closed state, its events, `aria-expanded` and find-in-page, for anything that shows
 *   and hides a box
 * - `OwnControls`:  did a click land on a control inside an element (a button, a link, a field), not on the element?
 * - `ParentLink`:  the `parent` attribute, an element joining the container with that id
 * - `PartContext` and `OwnerContext`:  the generic content parts, and the elements they belong to
 * - `SpellSolid`:  the settings a set's runtime hands it as it loads (Spell UI's, as `spell-ui/core` loads)
 * - the vocabulary's types (`ComponentVocabulary` ...)
 * - `spell/util/timing`:  when to run something (`afterSolidUpdate()`, `after()`, `waitUntil()` ...), re-exported
 * - `spell/util`'s GENERIC helpers, as `spell-ui/util` has them (`@proto`, `@lazy`, `camelCase()` ...):
 *   a component file reads them through `E` too (`@E.proto`)
 * - It imports only `spell/util`'s generic files and Solid:  NEVER Spell UI, or any other package.
 * - NOTE: `HotDefinitions` is left out:  dev-only, and a SIDE EFFECT on import (it wraps `UIComponent.define`);
 *   the HMR plugin loads it into each component barrel (the kit's `src/element-tools/HotElements.ts`).
 * - NOTE: `ShadowEvents` (Solid's events kept from leaking out of shadow roots) is left out too:
 *   only `UIComponent` uses it, directly.
 * - NOTE: so is `RichAttributes` (plain JSX props:  `on-ui-changed={f}`, `options={[...]}`):  only `DOMElement` uses it.
 * - NOTE: the files import this barrel back, as `E`:  a cycle, on purpose (WWOD §4 › "ONE namespace per sub-system").
 *   - What a file reads while it EVALUATES (a base class, a decorator, a static initializer)
 *     comes from its own file instead (WWOD §4 › "Circular imports").
 *   - The order below puts each such file before its readers;  `tests/element/barrel.test.ts` checks it.
 * - NOTE: Spell UI's `spell-ui/core` re-exports all of it, so its `E` holds these names too, and a page has ONE copy:
 *   Spell UI's core bundle carries it, and a component pack reads it from there (`SpellUI.packModules`).
 */

export * from "spell/util/class"
export * from "spell/util/decorators"
export * from "spell/util/dom"
export * from "spell/util/string"
export * from "spell/util/timing"
export * from "spell/util/util.types"

export * from "./vocabulary.types"
export * from "./elements.types"
export * from "./SpellSolid"

export * from "./Reactive"
export * from "./Cell"
export * from "./ElementDefinition"
export * from "./DOMElement"
export * from "./OwnerContext"
export * from "./PartContext"
export * from "./UIComponent"
export * from "./SlotContent"
export * from "./Disclosure"
export * from "./OwnControls"
export * from "./ParentLink"

/**
 * The package namespace (WWOD §4):
 * `import { E } from "spell/element"`, then `E.UIComponent`, `@E.state` (`AGENTS.md`).
 */
export * as E from "."
