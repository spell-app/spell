/**
 * Shared types for `$/components` -- event details and the CSS contracts every implementation of a component
 * (Lit or Solid, Milestone 0) must honour.
 * - Runtime-light:  `import type` only, plus a few constants.
 */

import type { MenuOption } from "$/elements"

////////////////
// ## Button
////////////////

/** `detail` of `ui-toggle`, from a `toggle` `<ui-button>`. */
export type ButtonToggleDetail = {
  /** new `active` state */
  active: boolean
  /** click / key event that flipped it */
  originalEvent?: Event
}

////////////////
// ## Dropdown
////////////////

/** A dropdown's value:  one string, or one per chosen option with `multiple`. */
export type DropdownValue = string | string[]

/** `options` property of `<ui-dropdown>`:  the `MenuOptions` model's option shape. */
export type DropdownOptions = readonly MenuOption[]

/** `detail` of `ui-change`. */
export type DropdownChangeDetail = {
  /** value after the change */
  value: DropdownValue
  originalEvent?: Event
}

/** `detail` of the cancelable `ui-open` / `ui-close`. */
export type DropdownOpenDetail = {
  /** state it's ABOUT to enter */
  open: boolean
  originalEvent?: Event
}

/** `detail` of `ui-search`. */
export type DropdownSearchDetail = {
  /** current query */
  query: string
  originalEvent?: Event
}

/** `detail` of `ui-add` / `ui-remove`:  the one value added or removed. */
export type DropdownItemDetail = {
  value: string
  originalEvent?: Event
}

/** `<ui-item type>`:  an option, a group header, or a divider. */
export type ItemType = "item" | "header" | "divider"

////////////////
// ## CSS contracts
////////////////

/**
 * Custom property `dropdown.css` reads for the anchor name, e.g. `--ui-dropdown-anchor: --ui-dropdown-7`.
 * - The element sets it INLINE on its root, to a per-instance dashed ident (`UI.ids`);  the root's
 *   `anchor-name` and the menu's `position-anchor` both read it.
 * - Falls back to `--ui-dropdown`, which is enough inside one shadow root.
 */
export const DROPDOWN_ANCHOR_PROPERTY = "--ui-dropdown-anchor"
