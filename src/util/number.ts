/**
 * Number helpers:  a number held between two others, and a size in KB.
 * - Standalone:  no imports, so plain `node` loads it too (`spell/util/number.ts`).
 */

/**
 * `value` held between `low` and `high`, ends included:  `clamp(12, 0, 10)` => `10`.
 * - `NaN` stays `NaN`
 */
export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** How `kb()` writes a size. */
export type SizeOptions = {
  /** digits after the point, default 1 */
  digits?: number
}

/**
 * `bytes` as kilobytes, `12.3 KB`:  ONE unit for every size we print.
 * - a KB is 1024 bytes (not 1000), whatever the size:  sizes compare at a glance
 */
export function kb(bytes: number, { digits = 1 }: SizeOptions = {}): string {
  return `${(bytes / 1024).toFixed(digits)} KB`
}
