import { commaList } from "spell/util/string"

import { Warnings } from "./Warnings"

/****************
 * ### `PaneSizes`
 * Sizes written as text, a comma list (`"20%, *, 380px"`), read into one `PaneSize` each:
 * how `<ui-split-panel>` reads its `columns` / `rows`, and `<ui-tree>` its columns' `size`.
 * - Each entry is one of:
 *   - a number, `px`, `em` or `rem`:  fixed
 *   - `%`:  a percent (of what, each element says)
 *   - `*`, or missing:  an equal share of the percent the `%` entries leave
 *   - `auto`:  as big as its content (`units: "auto"`)
 * - A space after a comma is ignored (`commaList()`).
 * - STATIC, plain data, no DOM:  at the bottom of Spell UI (`spell/ui/util`), so both elements share ONE reader.
 ****************/
export class PaneSizes {
  /**
   * One `PaneSize` per pane from `spec`.
   * - Cut or padded to `count`:  a missing or unreadable entry counts as `*`.
   * - `*` entries share the percent the `%` entries leave, equally (at least 1% each).
   * - `source`:  who's reading, for the warning an unreadable entry gets (`"<ui-split-panel>"`)
   */
  static sizesFor(spec: string | undefined, count: number, { source = "PaneSizes" } = {}): PaneSize[] {
    const given = commaList(spec).slice(0, count)
    while (given.length < count) given.push(STAR)
    const sizes = given.map((entry) => PaneSizes.sizeFor(entry, { source }))
    const percents = sizes.reduce((sum, size) => (size?.units === "%" ? sum + size.value : sum), 0)
    const stars = sizes.filter((size) => !size).length
    const perStar = Math.max(1, (100 - percents) / Math.max(stars, 1))
    return sizes.map((size) => size ?? { value: perStar, units: "%" })
  }

  /**
   * ONE entry of a spec, read:  `undefined` for `*`, or for text that isn't a size, which is warned about.
   * - For an element that gives each entry a meaning of its own (`<ui-tree>`'s columns:  `*` is the token's width).
   * - `source`:  who's reading, for the warning
   */
  static sizeFor(entry: string, { source = "PaneSizes" } = {}): PaneSize | undefined {
    const size = entry.trim()
    if (size === AUTO) return { value: 0, units: AUTO }
    const match = NUMBER_WITH_UNITS.exec(size)
    if (match) return { value: parseFloat(match[1]), units: match[2] || "px" }
    if (size !== STAR) Warnings.warn(source, `the size "${size}" isn't one:  a number, px, em, %, * or auto`)
    return undefined
  }

  /** `sizes` written back as text, the form `sizesFor()` reads:  `"60%,40%,auto"`. */
  static sizeText(sizes: readonly PaneSize[]): string {
    return sizes.map(({ value, units }) => (units === AUTO ? AUTO : `${value}${units}`)).join(",")
  }

  /** Is `size` an `auto` one, as big as its content? */
  static isAuto(size: PaneSize | undefined): boolean {
    return size?.units === AUTO
  }
}

/** One pane's size, e.g. `{ value: 20, units: "%" }`. */
export type PaneSize = {
  /** How much, in `units`. */
  value: number
  /** `px`, `em`, `rem`, `%` or `auto` (its `value` unused). */
  units: string
}

/** A size as big as its content:  its units, and how a spec says it. */
const AUTO = "auto"
/** A size that shares what's left. */
const STAR = "*"
/** One size in a spec:  a number with optional units. */
const NUMBER_WITH_UNITS = /^([0-9]*\.?[0-9]+)(px|em|rem|%)?$/
