/**
 * Numbers with units:  a DIMENSION is a kind of measure, e.g. length, with its units and how they convert
 * (epic `language` P23, P24;  Owen's C5).
 * - Generic:  no Spell words, no core.  Spell's runtime (`spell/parser/core`) and Spell UI's `<ui-dimension>` both
 *   convert and write measures with it, from the same table, so a page and a program never disagree.
 * - Its units are written in Spell:  the built-in five in the parser's `core/dimensions/dimensions.spell`, compiled into
 *   [dimensions.generated.ts](dimensions.generated.ts);  a program's own, `data size is a dimension:`, compile to
 *   `core.defineDimension()`.
 * - Taken by file, `spell/util/measures/Dimension`, in no barrel:  a page that shows no measure pays nothing.
 */
import { BUILT_IN_DIMENSIONS, type BuiltInDimensionData } from "./dimensions.generated"

/**
 * One unit of a dimension:  its id, the names it's written as, and how it converts to the base unit.
 * - `base = value * factor + offset`:  e.g. a centimeter is `{ factor: 0.01 }` of a meter;
 *   a fahrenheit `{ factor: 5/9, offset: -160/9 }` of a celsius, as `starting at 32` says.
 */
export type DimensionUnit = {
  /** its id, the compiled code's:  `centimeter`, `fahrenheit` */
  id: string
  /** what it's written as, its name, then each `aka`:  `["centimeter", "cm"]`;  every language's, English first */
  names: string[]
  /** how many base units one of it is */
  factor: number
  /** base units added after the factor, for a unit that doesn't start at the base's zero (temperature) */
  offset?: number
  /** what it's written as next to a number, if not its first `aka`:  a built-in unit's English one, `cup` */
  symbol?: string
}

/**
 * A kind of measure, e.g. `Length`:  its units, and converting between them.
 * - Every dimension is one of these, made from its units:  the units are the only difference.
 */
export class Dimension {
  constructor(
    /** its name, as compiled code names it:  `Length`, `DataSize` */
    readonly name: string,
    /** its units, the base first -- `defineUnit()` adds one */
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

  /** Our unit written `said`:  its id, a name, an `aka`, any case for a name of several letters -- `undefined` if none. */
  unitNamed(said: string): DimensionUnit | undefined {
    const lower = said.toLowerCase()
    return (
      this.units.find((unit) => unit.id === said || unit.names.includes(said)) ??
      this.units.find((unit) => unit.names.some((name) => name.length > 2 && name.toLowerCase() === lower))
    )
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
    if (units.length === 1) {
      return `${roundForPeople(this.convert(value, from, units[0]!))} ${this.symbolOf(units[0]!)}`
    }
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
    return parts.map((amount, index) => `${amount} ${this.symbolOf(units[index]!)}`).join(" ")
  }

  /** What unit `id` is written as next to a number:  its first `aka`, else its name -- `cm`, `°F`. */
  symbolOf(id: string): string {
    const { names, symbol } = this.unit(id)
    return symbol ?? names[1] ?? names[0]!
  }

  /** A built-in dimension, from its compiled table entry:  each unit with every language's names, English first. */
  static fromTable({ name, units }: BuiltInDimensionData): Dimension {
    return new Dimension(
      name,
      units.map(({ id, names, factor, offset }) => ({
        id,
        names: [...new Set(Object.values(names).flat())],
        factor,
        ...(offset ? { offset } : {}),
        // its English first `aka`:  every language's names are merged, so its own list can't say
        symbol: names.en?.[1] ?? names.en?.[0]
      }))
    )
  }
}

/** Three significant figures, at most two decimals:  `169.76` => `170`, `2.5401` => `2.54`. */
function roundForPeople(value: number): number {
  const significant = Number(value.toPrecision(3))
  return Math.round(significant * 100) / 100
}

/** Spell's built-in dimensions, by name:  `Length`, `Weight`, `Temperature`, `Volume`, `Speed`. */
export const BUILT_IN = new Map(BUILT_IN_DIMENSIONS.map((data) => [data.name, Dimension.fromTable(data)]))
