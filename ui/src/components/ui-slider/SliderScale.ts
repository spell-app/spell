import { E, UIT } from "spell/ui/core"

/****************
 * ### `SliderScale`
 * The number line of a slider:  `min` ... `max` in `step`s -- snapping, ratios along the track, which steps get
 * a label, and where a key moves a value.
 * - Pure arithmetic (no DOM;  of the core, only `E.clamp()` and `UIT.Key`), so it's tested on its own.
 * - `<ui-slider>`'s and `<ui-dial>`'s:  a dial is the same number line, bent round.
 * - Snapping keeps to the step grid from `min`, like a native `<input type=range>`:  a `max` off the grid is never
 *   reached (the last step below it is).  `step` `0` allows any value.
 * - Floating point:  results are rounded to the step's own decimals, so `0.1` steps give `0.3`, not
 *   `0.30000000000000004`.
 * - Exported from the family barrel:  an app can snap values the same way.
 ****************/
export class SliderScale {
  /** Lowest value. */
  readonly min: number

  /** Highest value (never below `min`). */
  readonly max: number

  /** Step;  `0` ~== any value. */
  readonly step: number

  /** Distance between labels (and ticks):  `tickStep`, else `step`;  `0` ~== one per unit. */
  readonly tickStep: number

  /** Decimal places of `step` / `tickStep`, for rounding. */
  private readonly decimals: number

  constructor({ min, max, step, tickStep }: SliderScaleProps) {
    this.min = Number.isFinite(min) ? min : 0
    this.max = Number.isFinite(max) ? Math.max(this.min, max) : this.min
    this.step = Number.isFinite(step) && step > 0 ? step : 0
    this.tickStep = tickStep !== undefined && Number.isFinite(tickStep) && tickStep > 0 ? tickStep : this.step
    this.decimals = Math.max(
      SliderScale.decimalsOf(this.step),
      SliderScale.decimalsOf(this.tickStep),
      SliderScale.decimalsOf(this.min)
    )
  }

  /** `value` on the grid, within `min` ... `max`. */
  snap(value: number): number {
    const { min, max, step } = this
    if (!Number.isFinite(value)) return min
    const clamped = E.clamp(value, min, max)
    if (!step) return clamped
    let snapped = min + Math.round((clamped - min) / step) * step
    if (snapped > max) snapped -= step
    return this.round(snapped)
  }

  /** Where `value` lies along the track, `0` ... `1`. */
  ratio(value: number): number {
    const span = this.max - this.min
    return span ? E.clamp((value - this.min) / span, 0, 1) : 0
  }

  /** The snapped value at `ratio` (`0` ... `1`) along the track. */
  valueAt(ratio: number): number {
    return this.snap(this.min + E.clamp(ratio, 0, 1) * (this.max - this.min))
  }

  /** `value` moved by `steps` steps (a percent of the span when `step` is `0`), snapped. */
  move(value: number, steps: number): number {
    const unit = this.step || (this.max - this.min) / 100
    return this.snap(value + steps * unit)
  }

  /**
   * The value key `key` moves `value` to, or `undefined` for a key that moves nothing:
   * - arrows step the way they point (Fomantic's `keyMovement`), so on a `reversed` or `vertical` track they follow
   *   the thumb, not "right / up increases";  the other arrow pair steps too, up / right increasing
   * - PageUp / PageDown take `PAGE_MULTIPLIER` steps (Fomantic's `pageMultiplier`)
   * - Home / End go to `low` / `high` (default `min` / `max`:  a range's thumb passes its own bounds)
   * - The result is snapped, but not bounded by `low` / `high` for the step keys:  the caller clamps.
   */
  valueForKey(key: string, value: number, options: KeyMoveOptions = {}): number | undefined {
    const { low = this.min, high = this.max } = options
    if (key === UIT.Key.home) return low
    if (key === UIT.Key.end) return high
    const steps = SliderScale.stepsForKey(key, options)
    return steps ? this.move(value, steps) : undefined
  }

  /** Steps key `key` takes on a track laid out as `options` say;  `0` for keys that don't step. */
  private static stepsForKey(key: string, { vertical = false, reversed = false }: KeyMoveOptions): number {
    // the value grows downward on a vertical slider (min at the top) and leftward on a reversed horizontal one
    const { arrowUp, arrowDown, arrowLeft, arrowRight, pageUp, pageDown } = UIT.Key
    const grows = vertical ? (reversed ? arrowUp : arrowDown) : reversed ? arrowLeft : arrowRight
    const shrinks = vertical ? (reversed ? arrowDown : arrowUp) : reversed ? arrowRight : arrowLeft
    if (key === grows || (!vertical && key === arrowUp) || (vertical && key === arrowRight)) return 1
    if (key === shrinks || (!vertical && key === arrowDown) || (vertical && key === arrowLeft)) return -1
    if (key === pageUp) return PAGE_MULTIPLIER
    if (key === pageDown) return -PAGE_MULTIPLIER
    return 0
  }

  /** Number of intervals between labels:  one per `tickStep` (per unit, with no step). */
  get intervals(): number {
    return Math.max(1, Math.round((this.max - this.min) / (this.tickStep || 1)))
  }

  /** Value of label `index`. */
  labelValue(index: number): number {
    return this.round(Math.min(this.max, this.min + index * (this.tickStep || 1)))
  }

  /**
   * Show every `gap()`-th label in full, so neighbours are at least `distance` px apart on a `length` px track
   * (Fomantic's `autoAdjustLabels` / `labelDistance`);  the rest become half ticks.
   * - A gap divides the intervals evenly when it can;  unmeasured (`length` `0`), every label shows.
   */
  gap(length: number, distance: number): number {
    const { intervals } = this
    if (length <= 0) return 1
    const spacing = length / intervals
    for (let gap = 1; gap <= intervals; gap++) {
      if (spacing * gap >= distance && intervals % gap === 0) return gap
    }
    return intervals
  }

  /** `value` rounded to the scale's decimals. */
  private round(value: number): number {
    const factor = 10 ** this.decimals
    return Math.round(value * factor) / factor
  }

  /** Decimal places written in `value`.  Static:  pure, and read in the constructor. */
  private static decimalsOf(value: number): number {
    const [, decimals = ""] = String(value).split(".")
    return decimals.length
  }
}

/** Fomantic's `pageMultiplier`:  steps per PageUp / PageDown. */
const PAGE_MULTIPLIER = 2

/** Constructor props for `SliderScale`. */
export type SliderScaleProps = {
  /** lowest value;  not finite ~== `0` */
  min: number
  /** highest value;  not finite, or below `min`, ~== `min` */
  max: number
  /** step;  not finite, or `<= 0`, ~== any value */
  step: number
  /** labels / ticks every this much;  absent or `<= 0` ~== every step */
  tickStep?: number
}

/** How `SliderScale.valueForKey()` reads a key. */
export type KeyMoveOptions = {
  /** lowest value Home goes to;  default `min` */
  low?: number
  /** highest value End goes to;  default `max` */
  high?: number
  /** the track runs upright, min at the top */
  vertical?: boolean
  /** the track runs from the right (or, `vertical`, from the bottom) */
  reversed?: boolean
}
