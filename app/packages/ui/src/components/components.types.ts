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

////////////////
// ## Grid
////////////////

/**
 * Size container a top-level `<ui-grid>` HOST establishes (`container: ui-grid / inline-size`), see `grid.css`.
 * - `stackable`, `doubling`, `reversed` and per-device widths answer to it, not to the viewport.
 * - Page CSS may query it too, e.g. `@container ui-grid (width < 768px) { ... }` inside a column.
 */
export const GRID_CONTAINER_NAME = "ui-grid"

////////////////
// ## Message
////////////////

/** `detail` of the cancelable `ui-dismiss`, from a `dismissible` `<ui-message>`'s close button. */
export type MessageDismissDetail = {
  /** click / key event on the close button */
  originalEvent?: Event
}

////////////////
// ## Breadcrumb
////////////////

/**
 * Inherited tokens a `<ui-breadcrumb>` sets INLINE on its root, which every `<ui-breadcrumb-section>` draws as
 * its leading divider.  See "Dividers" in `breadcrumb.css`.
 * - `text` -- a CSS STRING (`"›"`), from `divider`;  quote and escape it as CSS (`\"`, `\\`, `\A `), not JSON
 * - `icon` -- an `<image>`, `url("data:image/svg+xml,...")` of the `divider-icon` SVG;  painted as a mask in
 *   `currentColor`
 * - `layout` -- `icon` while `divider-icon` is set;  removed otherwise
 */
export const BREADCRUMB_DIVIDER_TOKENS = {
  text: "--ui-breadcrumb-divider",
  icon: "--ui-breadcrumb-divider-icon",
  layout: "--ui-breadcrumb-divider-layout"
} as const

////////////////
// ## Placeholder
////////////////

/**
 * Custom state every `<ui-placeholder>` host MUST carry, always:  `placeholder.css` spaces consecutive
 * placeholders with `:host(:nth-child(n + 2 of :state(placeholder)))`, since a shadow root can't see its host's
 * previous sibling.
 */
export const PLACEHOLDER_HOST_STATE = "placeholder"
