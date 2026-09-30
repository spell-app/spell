/**
 * Shared types for `$/components` -- event details and the CSS contracts every implementation of a component
 * (the element and its native fallback) must honour.
 * - Runtime-light:  `import type` only, plus a few constants.
 */

import type { FieldValue, MenuOption, ValidationRule } from "$/elements"

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

////////////////
// ## Item
////////////////

/** `<ui-item type>`:  an option, a group header, or a divider. */
export type ItemType = "item" | "header" | "divider"

/**
 * How an OWNER wants its generic `<ui-item>`s rendered, from `ItemOwner.itemContext()`.
 * - The item finds its owner through `PartContext` (the owner's vocabulary `ownsParts` has `item`) and reads
 *   this in a memo, so an owner attribute change (`<ui-list selection>`, `<ui-menu interactive>`) re-renders
 *   every item.
 */
export type ItemContext = {
  /** Role of the item HOST (internals), e.g. `listitem`;  `null` for none. */
  hostRole: string | null
  /** Role of the item's ROOT, e.g. `menuitem` in a menubar;  `undefined` keeps the native element's. */
  role?: ItemRole
  /** An item without `href` renders a `<button>` (selection list, menubar);  else a `<div>` (unless `link`). */
  interactive: boolean
  /** `aria-current` of a SELECTED item that is a link:  `page` in a navigation menu. */
  current: "page" | "true"
}

/** Roles an owner may give an item's root. */
export type ItemRole = "menuitem" | "menuitemradio" | "menuitemcheckbox" | "option" | "treeitem"

/**
 * What an owner of `<ui-item>`s (`<ui-list>`, `<ui-menu>`) implements on its CONTROLLER;  the item calls it as
 * `(owner as UIHost).controller.itemContext(item)`, tracked.
 * - The item also adopts the owner's `styles`:  the owner's sheet holds its item rules
 *   (`:host(:state(in-list)) > .item`), next to the static class-grammar ones (`.ui.list > .item`).
 */
export type ItemOwner = {
  itemContext(item: Element): ItemContext
}

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
  itemMedia: "--ui-item-media",
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

////////////////
// ## Input
////////////////

/** `detail` of `ui-input` (every keystroke) and `ui-change` (commit), from `<ui-input>` / `<ui-textarea>`. */
export type InputChangeDetail = {
  /** value after the change */
  value: string
  originalEvent?: Event
}

/**
 * Inherited tokens an OWNER sets for the text controls inside it (`input.css`), e.g. `<ui-field>` on its root.
 * - `width` -- the host's inline size (`100%` in a field, `auto` in an inline one)
 * - `color` / `background` / `border` -- a field's state, RESOLVED colours (declared where the state's remap
 *   runs), so a control's own `state` still wins
 */
export const INPUT_OWNER_TOKENS = {
  width: "--ui-input-owner-width",
  color: "--ui-field-state-color",
  background: "--ui-field-state-background",
  border: "--ui-field-state-border"
} as const

////////////////
// ## Checkbox
////////////////

/** `detail` of `ui-change`, from `<ui-checkbox>` / `<ui-radio>`. */
export type CheckboxChangeDetail = {
  /** chosen after the change */
  selected: boolean
  /** the element's `value` (default `on`) */
  value: string
  originalEvent?: Event
}

////////////////
// ## Form
////////////////

/** One field's value as `<ui-form>` reads it (`values`):  the `Validator`'s `FieldValue`. */
export type FormFieldValue = FieldValue

/** `<ui-form>`'s `values`:  by field name (or id). */
export type FormValues = Record<string, FieldValue>

/**
 * One field's rules in `<ui-form rules>`, Fomantic's `fields` shape:
 * - a shorthand string (`"notEmpty"`, `"minLength[6]"`) or a list of them / rule objects
 * - or `{ rules, optional?, depends?, identifier? }`:  `optional` skips a blank field, `depends` skips the field
 *   while another is blank, `identifier` names the control when the key doesn't
 * - NOTE: Fomantic's deprecated `empty` means `notEmpty`
 */
export type FormFieldRules =
  | ValidationRule
  | readonly ValidationRule[]
  | {
      rules: readonly ValidationRule[]
      optional?: boolean
      depends?: string
      identifier?: string
    }

/** `<ui-form>`'s `rules` property. */
export type FormRules = Record<string, FormFieldRules>

/** `detail` of `ui-valid`. */
export type FormValidDetail = {
  /** field name (or id) */
  field: string
  value: FieldValue
  values: FormValues
}

/** `detail` of `ui-invalid`. */
export type FormInvalidDetail = FormValidDetail & {
  /** the field's prompts */
  errors: string[]
}

/** `detail` of the cancelable `ui-success`. */
export type FormSuccessDetail = {
  values: FormValues
  originalEvent?: Event
}

/** `detail` of `ui-failure`. */
export type FormFailureDetail = FormSuccessDetail & {
  /** prompts by field */
  errors: Record<string, string[]>
}

/**
 * Custom state every `<ui-field>` host carries, always:  `<ui-form>` finds a control's field with
 * `control.closest(":state(field)")`, whatever the field's tag is called in a translation.
 */
export const FIELD_HOST_STATE = "field"

////////////////
// ## Table
////////////////

/** Direction of a sorted `<ui-table>` column (`sort-direction`, `aria-sort`). */
export type TableSortDirection = "ascending" | "descending"

/** `detail` of the cancelable `ui-sort`, from a `sortable` `<ui-table>`'s header. */
export type TableSortDetail = {
  /** column index (0-based, counting `colspan`s) */
  column: number
  /** data mode:  the column's `key`;  slotted:  the header's `data-key`, if any */
  key?: string
  /** direction it's ABOUT to sort in:  flipped for the sorted column, else `ascending` */
  direction: TableSortDirection
  /** click / key event on the header */
  originalEvent?: Event
}

/** One column of `<ui-table>`'s data mode (`columnDefs`). */
export type TableColumn = {
  /** property of each row shown in this column */
  key: string
  /** header text;  default `key` */
  header?: string
  /** cell alignment (`left aligned` ...) */
  textAlign?: "left" | "center" | "right"
  /** `false` opts the column out of sorting;  default sortable when the table is */
  sortable?: boolean
  /** Fomantic width, `1` ... `16` (or `1/4`, `25%`):  `four wide` */
  width?: number | string
}

/** One row of `<ui-table>`'s data mode (`rows`):  values by column key, shown as text. */
export type TableRow = Record<string, unknown>

/**
 * Header attribute that opts one `th` out of a `sortable` table:  `data-sortable="false"`.
 * - Fomantic's `class="disabled"` on a `th` opts out too (and greys it on hover).
 */
export const TABLE_SORT_OPT_OUT = { attribute: "data-sortable", value: "false" } as const

/** Header attribute naming a slotted column for `ui-sort`'s `key`, e.g. `<th data-key="name">`. */
export const TABLE_SORT_KEY = "data-key"

////////////////
// ## List
////////////////

/** `detail` of `ui-select`, from a `<ui-list>` when one of its interactive items is activated. */
export type ListSelectDetail = {
  /** the item's `value`, else its `text`, else its trimmed text content */
  value: string
  /** the `<ui-item>` host */
  item: Element
  /** click (or the click Enter / Space made) on the item's link / button */
  originalEvent?: Event
}
