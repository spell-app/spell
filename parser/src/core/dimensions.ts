/**
 * Numbers with units:  a DIMENSION is a kind of measure, e.g. length, with its units and how they convert
 * (epic `language` P23, Owen's C5 and Q25).
 * - A `Dimension` does what every dimension shares:  finds a unit by its id, converts through the base unit,
 *   and writes a measure for people, `172 cm`, `5 ft 8 in`.
 * - Its UNITS are written in spell:  the built-in five (length, weight, temperature, volume, speed) in the core's
 *   `dimensions/dimensions.spell`, compiled into `dimensions.generated.ts`;  a program's own, e.g.
 *   `data size is a dimension:`, compile to `core.defineDimension()`.
 * - A measure stays a plain number in its stored unit when the code runs:  a property says its dimension and unit
 *   (`its "height" is a length in cm`), and the compiler hands both to `core.convertMeasure()` / `core.measureText()`.
 * - Python's core has the twin, `spell_core/dimensions.py`, from the same compiled table.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { core } from "./core"
import { defineCoreModule } from "./core.types"
import { BUILT_IN_DIMENSIONS } from "./dimensions.generated"

/**
 * One unit of a dimension, as compiled:  its id, the names spell reads it by, and how it converts to the base unit.
 * - `base = value * factor + offset`:  e.g. a centimeter is `{ factor: 0.01 }` of a meter;
 *   a fahrenheit `{ factor: 5/9, offset: -160/9 }` of a celsius, as `starting at 32` says.
 */
export type DimensionUnit = {
  /** its id, the compiled code's:  `centimeter`, `fahrenheit` */
  id: string
  /** what it's written as, first its name, then each `aka`:  `["centimeter", "cm"]` */
  names: string[]
  /** how many base units one of it is */
  factor: number
  /** base units added after the factor, for a unit that doesn't start at the base's zero (temperature) */
  offset?: number
}

/** A dimension as compiled:  its name and its units, the base unit first. */
export type DimensionData = { name: string; units: DimensionUnit[] }

/**
 * A kind of measure, e.g. `Length`:  its units, and converting between them.
 * - Every dimension is one of these, made from its compiled units:  the units are the only difference.
 */
export class Dimension {
  constructor(
    /** its name, as compiled code names it:  `Length`, `DataSize` */
    readonly name: string,
    /** its units, the base first -- `core.defineUnit()` adds one */
    readonly units: DimensionUnit[] = []
  ) {}

  /**
   * Our unit `id`.
   * - throws a `TypeError` if we have none:  the compiler checks units, so it's a bug in the compiled code.
   */
  unit(id: string): DimensionUnit {
    const unit = this.units.find((it) => it.id === id)
    if (!unit) throw new TypeError(`Dimension.unit():  ${this.name} has no unit "${id}"`)
    return unit
  }

  /** `value` of unit `from`, in unit `to`. */
  convert(value: number, from: string, to: string): number {
    if (from === to) return value
    const source = this.unit(from)
    const target = this.unit(to)
    const base = value * source.factor + (source.offset ?? 0)
    return (base - (target.offset ?? 0)) / target.factor
  }

  /**
   * `value` of unit `from`, written for people, in unit `to` -- `from`'s when left out:  `172 cm`.
   * - Several units, largest first, write a mixed measure:  `5 ft 8 in` for `["foot", "inch"]`;
   *   each but the last a whole number, the last rounded to a whole one.
   * - A single unit keeps three significant figures, at most two decimals:  `170 lb`, `2.54 cm`.
   */
  text(value: number, from: string, to: string | readonly string[] = from): string {
    const units = typeof to === "string" ? [to] : to
    if (units.length === 1)
      return `${numberText(roundForPeople(this.convert(value, from, units[0]!)))} ${this.symbolOf(units[0]!)}`
    const last = units.length - 1
    let rest = this.convert(value, from, units[last]!)
    // each larger unit takes the whole ones it can, from the smallest unit's total
    const sizes = units.map((unit) => this.convert(1, unit, units[last]!))
    const parts = units.map((unit, index) => {
      if (index === last) return Math.round(rest)
      const whole = Math.floor((rest + 0.5) / sizes[index]!)
      rest -= whole * sizes[index]!
      return whole
    })
    return parts.map((amount, index) => `${numberText(amount)} ${this.symbolOf(units[index]!)}`).join(" ")
  }

  /** What unit `id` is written as next to a number:  its first `aka`, else its name -- `cm`, `°F`. */
  symbolOf(id: string): string {
    const { names } = this.unit(id)
    return names[1] ?? names[0]!
  }
}

/** Three significant figures, at most two decimals:  `169.76` => `170`, `2.5401` => `2.54`. */
function roundForPeople(value: number): number {
  const significant = Number(value.toPrecision(3))
  return Math.round(significant * 100) / 100
}

/** A number as it's written beside a unit:  `170`, `2.54` -- the same in Python's core. */
function numberText(value: number): string {
  return `${value}`
}

/** Every dimension the running program knows, by name:  the built-in ones, then its own. */
const DIMENSIONS = new Map<string, Dimension>()

/** `core`'s dimension methods:  what compiled code calls for a measure. */
export const dimensionMethods = defineCoreModule({
  /**
   * Declare dimension `name`, with its compiled `units` if it has them yet:  `data size is a dimension:` compiles to
   * this, each unit line under it to `defineUnit()`.
   * - Replaces one of the same name, so a recompile in the editor takes the new units.
   */
  defineDimension(name: string, units: DimensionUnit[] = []): Dimension {
    const dimension = new Dimension(name, [...units])
    DIMENSIONS.set(name, dimension)
    return dimension
  },

  /**
   * Add `unit` to dimension `dimension`, replacing one of the same id:  `- one "kilobyte", aka "KB", is 1000 B`
   * compiles to this.
   * - throws a `TypeError` if there's no such dimension:  the compiler declares it first.
   */
  defineUnit(dimension: string, unit: DimensionUnit): void {
    const { units } = core.dimensionNamed(dimension)
    const at = units.findIndex((it) => it.id === unit.id)
    if (at < 0) units.push(unit)
    else units[at] = unit
  },

  /**
   * Dimension `name`, e.g. `Length`.
   * - throws a `TypeError` if there's none:  the compiler checks them, so it's a bug in the compiled code.
   */
  dimensionNamed(name: string): Dimension {
    const dimension = DIMENSIONS.get(name)
    if (!dimension) throw new TypeError(`core.dimensionNamed():  no dimension "${name}"`)
    return dimension
  },

  /** `value` of dimension `dimension`'s unit `from`, in unit `to`:  `its height in feet` compiles to this. */
  convertMeasure(value: number, dimension: string, from: string, to: string): number {
    return core.dimensionNamed(dimension).convert(Number(value), from, to)
  },

  /**
   * `value` of dimension `dimension`'s unit `from`, written for people, in `to` -- see `Dimension.text()`:
   * `its height in feet and inches` compiles to this.
   */
  measureText(value: number, dimension: string, from: string, to?: string | string[]): string {
    return core.dimensionNamed(dimension).text(Number(value), from, to)
  }
})
Object.assign(core, dimensionMethods)

for (const { name, units } of BUILT_IN_DIMENSIONS) core.defineDimension(name, units)
