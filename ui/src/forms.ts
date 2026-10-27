/**
 * `forms` lib entry (`spell/ui/forms`):  what only form controls with a VALUE need,
 * split from `core` so a page without one never loads it.
 * - `FormComponent` (form value, validity, reset) on a `DOMFormControl` (the form-control API)
 * - `Validator` (Fomantic's rules)
 * - `MenuOptions` (search, additions, keyboard navigation of an option list)
 * - `HighlightedOption` (the highlighted option of a list a control opens:  dropdown, search, icon picker)
 * - `ControlLabels` (the DOM element's `<label>`s as the inner control's name)
 * - NOT `PopoverPanel`, the panel a control opens under itself:  `core`'s, since a menu opens one too.
 * - Imported by the families with a value:
 *   `checkbox`, `dropdown`, `form`, `input`, `select`, `search`, `calendar`, `rating` and `slider`.
 *   - `ui-button` is form-associated too (submit / reset), but through `elementSetup.isAFormControl` alone:
 *     it needs no value, validity or form API, so it stays on `core`.
 * - NOTE: re-exports `spell/ui/elements` leaves one by one, for the reason given in `core.ts`.
 * - NOTE: every `forms` file imports the element core through the `spell/ui/core` ENTRY (`E`), never its leaves,
 *   or Rolldown hoists what `core` and `forms` share into a third, hashed chunk.
 *   - They reach each other through `F`,
 *     except what a class definition reads (`FormComponent`'s `DOMFormControl`, `Validator`):
 *     that comes directly (WWOD §4 › "Circular imports").
 */

export * from "spell/ui/elements/Validator"
export * from "spell/ui/elements/MenuOptions"
export * from "spell/ui/elements/HighlightedOption"
export * from "spell/ui/elements/DOMFormControl"
export * from "spell/ui/elements/FormComponent"
export * from "spell/ui/elements/ControlLabels"

/** The `forms` namespace:  `import { F } from "spell/ui/forms"`, then `F.FormComponent` (`AGENTS.md`). */
export * as F from "spell/ui/forms"
