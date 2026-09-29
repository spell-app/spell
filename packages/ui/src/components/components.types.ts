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

////////////////
// ## Icon
////////////////

/**
 * Custom property an owner sets on itself to steer a slotted `<ui-icon>` (a `display: contents` host takes no box
 * styles from `::slotted()`), e.g. `--ui-icon-owner-margin: 0 0.75em 0 0` on a label root.  See `icon.css`.
 */
export type IconOwnerToken =
  | "--ui-icon-owner-display"
  | "--ui-icon-owner-size"
  | "--ui-icon-owner-margin"
  | "--ui-icon-owner-opacity"
  | "--ui-icon-owner-align"

////////////////
// ## Label
////////////////

/** `detail` of the cancelable `ui-remove`, from a `removable` `<ui-label>`'s delete icon. */
export type LabelRemoveDetail = {
  /** click / key event on the delete icon */
  originalEvent?: Event
}

////////////////
// ## Parts
////////////////

/** `<ui-header level>`:  renders `<h1>` ... `<h6>`, a page header. */
export type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Inherited tokens OWNERS set on their root for the generic content parts, which style-query them
 * (`@container style(...)`).  See the "Owner tokens" table in `parts.css`.
 * - MUST be declared on EVERY root of the owner, default value included, so a nested owner never inherits an
 *   outer owner's layout.
 * - `inverted` owners also set `color-scheme: dark`;  the token is only for looks the dark scheme doesn't give.
 */
export const PART_OWNER_TOKENS = {
  inverted: "--ui-inverted",
  cardLayout: "--ui-card-layout",
  itemLayout: "--ui-item-layout",
  itemState: "--ui-item-state",
  commentsMinimal: "--ui-comments-minimal",
  modalBasic: "--ui-modal-basic",
  modalHeaderSize: "--ui-modal-header-size",
  messageLayout: "--ui-message-layout",
  listLayout: "--ui-list-layout",
  statisticLayout: "--ui-statistic-layout",
  statisticValueSize: "--ui-statistic-value-size",
  stepState: "--ui-step-state",
  stepLayout: "--ui-step-layout",
  accordionStyle: "--ui-accordion-style",
  accordionOpen: "--ui-accordion-open",
  searchResult: "--ui-search-result",
  headerLayout: "--ui-header-layout",
  labelLayout: "--ui-label-layout",
  part: "--ui-part"
} as const

/**
 * Class a STATIC part carries in place of the `:state(in-<owner>)` its element sets, e.g. `in-card`.
 * - Elements NEVER set it:  it exists for static markup (examples, SSR without scripts);  see `parts.css`.
 * - Same text as `OwnerContext.stateName(ownerNoun)`.
 */
export const PART_STATIC_CLASS_PREFIX = "in-"
