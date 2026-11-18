/**
 * Constants of the `ui-dial` family that its component (`UIDial`) and its native fallback (`DialFallback`) share.
 * - Pure data:  no imports at all, so node can load it (`yarn site:data`).
 * - A constant ONE class uses is a module constant below that class.
 */

////////////////
// ## Defaults
////////////////

/** The lowest value when `min` is unset. */
export const DEFAULT_MIN = 0

/** The highest value when `max` is unset:  a dial reads as a percent of a turn by default. */
export const DEFAULT_MAX = 100

/** The step when `step` is unset. */
export const DEFAULT_STEP = 1
