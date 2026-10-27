/**
 * `core` lib entry (`spell/ui/core`):  the element core PLUS the foundation it builds on, as ONE module.
 * - Every component file imports shared code from here (`spell/ui/core`), never from the pieces,
 *   so Rolldown puts all of it in `dist/core.js`,
 *   and each family entry holds only its own classes, sheet, vocabulary and fallback.
 * - Pulls in:
 *   - `spell/element`, whole:  the element bases every set's elements are written on (`UIComponent`, `DOMElement`,
 *     `ElementDefinition`, the `Reactive` decorators, `Cell`, `SlotContent`, `PartContext`, `OwnerContext`, timing,
 *     the vocabulary's types), so `E` holds all of them
 *   - `spell/ui/util`, `spell/ui/vocabulary` -- foundation JS (`proto`, `Warnings`, `ValueSets`, `Converters` ...)
 *   - `spell/ui/components/components.types` as the namespace `UIT` (`UIT.FLUID`, `UIT.ToggleCommands`, `UIT.SelectValue` ...)
 *   - from `spell/ui/elements`, what doesn't use Solid:
 *     - `elements.types` (the element core's shared types and constants)
 *     - `ClassBuilder`, `Shorthand`
 *     - `NativeFallback` (the fallbacks' base)
 *     - `StickyWatch` (`<ui-sticky>` and `<ui-section sticky>`)
 *     - `ParentLink` (the `parent` attribute of `<ui-tab>`, `<ui-step>` and `<ui-section>`)
 *   - from `spell/ui/elements`, Spell UI's own on Solid:
 *     - `SpellUISettings`:  what Spell UI hands `spell/element` (a side effect, below)
 *     - `IconGlyph`, `PartComponent` (the generic content parts)
 *     - `ClipboardCopy`:  a copy button's copy, then "Copied" for a moment
 *     - `PopoverPanel`:  the panel a control opens under itself (dropdown, calendar, search, icon picker, a
 *       shrinkable menu's overflow), a `Disclosure` with its popover, overlay entry and anchor
 *     - `RootSettings`:  what each `<ui-root>` sets for its subtree (icon packs, emoji)
 *     - the elements that show a text file:
 *       `DOMLoadableElement` + `LoadableComponent`, `SourceMarkup`,
 *       and `LoadableBody` + `DOMLoadableBodyElement` (`<ui-section source>` / `<ui-accordion source>`)
 *   - `spell/ui/runtime` -- the eager loader (`UI`, `loadUI`), `runtime.types` and the services' TYPES;
 *     `UIRuntime` itself stays a lazy chunk
 *   - `spell/ui/icons` -- the icon pack format (`IconName`, `BuiltInPacks`);
 *     the packs are separate files (`dist/icon-packs/`), loaded by the runtime (`UI.icons`)
 * - NOT here:  the `forms` entry, loaded only by families that import it
 *   (`forms.ts`:  `FormComponent`, `DOMFormControl`, `Validator`, `MenuOptions`, `ControlLabels`).
 * - NOTE: `spell/ui/elements` LEAVES are re-exported one by one, as `AGENTS.md` ("Solid authoring") says:
 *   its barrel also exports the `forms` files,
 *   and an `export *` of it here would make them `core` exports, i.e. core bytes.
 * - NOTE: those leaves import this entry back, as `E` / `UI` / `UIT`:
 *   a cycle, on purpose (WWOD §4 › "ONE namespace per sub-system").
 *   - What a leaf reads while it EVALUATES (a base class, `@proto`, a static initializer)
 *     comes from its own file instead (WWOD §4 › "Circular imports").
 *   - The order below puts each such file before its readers.
 *   - `tests/elements/barrel.test.ts` checks every export is live.
 * - `spell/element` (the element bases, what every set's elements are written on) is re-exported WHOLE.
 *   - Its settings are installed as this module loads (`SpellUISettings`, a side effect).
 *   - A tag defined before that waits.
 * - NOTE: `solid-js` and `@solidjs/web` are NOT re-exported:
 *   peer dependencies, external in the build (`vite.config.ts`).
 *   The custom-element layer is `spell/element` (`DOMElement`, `UIComponent`, `ShadowEvents`), bundled here.
 * - NOTE: nothing here may `import * as` a Solid package:  a namespace keeps every export alive,
 *   which pins ALL of Solid into any bundle (and any vendored copy) that includes `core`.
 *   The Solid host page's identity probe lives in that page (`src/tools/frameworks/solid/identity.js`).
 */

export * from "spell/element"
import "spell/ui/elements/SpellUISettings"
export * from "spell/ui/util"
export * from "spell/ui/vocabulary"
export * from "spell/ui/elements/elements.types"
export * from "spell/ui/elements/ClassBuilder"
export * from "spell/ui/elements/Shorthand"
export * from "spell/ui/elements/NativeFallback"
export * from "spell/ui/elements/StickyWatch"
export * from "spell/ui/elements/ParentLink"
export * from "spell/ui/runtime"
export * from "spell/ui/icons"
export * as UIT from "spell/ui/components/components.types"

export * from "spell/ui/elements/PartComponent"
export * from "spell/ui/elements/RootSettings"
export * from "spell/ui/elements/IconGlyph"
export * from "spell/ui/elements/ClipboardCopy"
export * from "spell/ui/elements/PopoverPanel"
export * from "spell/ui/elements/DOMLoadableElement"
export * from "spell/ui/elements/LoadableComponent"
export * from "spell/ui/elements/SourceMarkup"
export * from "spell/ui/elements/LoadableBody"
export * from "spell/ui/elements/DOMLoadableBodyElement"

/**
 * The package namespace (WWOD §4):
 * `import { E, UI, UIT } from "spell/ui/core"`, then `E.UIComponent`, `@E.proto` (`AGENTS.md`).
 */
export * as E from "spell/ui/core"
