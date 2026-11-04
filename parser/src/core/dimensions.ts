/**
 * Numbers with units in a running program (epic `language` P23, P24):  the dimensions it knows, converting a measure,
 * and writing one for people.
 * - The work is the kit's generic `Dimension` (`spell/util/measures/Dimension`), from the table compiled from the
 *   core's `dimensions/dimensions.spell`;  how the reader measures is its `MeasureSystem`.
 * - A program's own dimension, `data size is a dimension:`, compiles to `core.defineDimension()`, each unit line to
 *   `core.defineUnit()`.
 * - A measure stays a plain number in its stored unit when the code runs:  the compiler hands its dimension and unit to
 *   `core.convertMeasure()`, `core.measureText()` and `core.measureShown()`.
 * - Python's core has the twin, `spell_core/dimensions.py`, from the same compiled source.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { BUILT_IN, Dimension, type DimensionUnit } from "spell/util/measures/Dimension"
import { MeasureSystem, type MeasureSystemName } from "spell/util/measures/MeasureSystem"
import { core } from "./core"
import { defineCoreModule } from "./core.types"

/** Every dimension the running program knows, by name:  the built-in ones, then its own. */
const DIMENSIONS = new Map<string, Dimension>(BUILT_IN)

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
  },

  /**
   * `value` of dimension `dimension`'s unit `from`, written in the READER's units:  `5 ft 8 in` in the US, `172 cm`
   * elsewhere (epic `language` P24, Q27) -- a measure printed, or put in text, compiles to this.
   * - The reader's units:  their choice, else their region's (`MeasureSystem`).
   * - Nothing:  `""`, so a row with nothing to show shows nothing.
   */
  measureShown(value: unknown, dimension: string, from: string): string {
    return MeasureSystem.shown(value, core.dimensionNamed(dimension), from)
  },

  /**
   * Show every measure in `system` from now on, whatever the reader chose (`undefined`:  theirs again):  for a host,
   * or a test -- see `MeasureSystem.use()`.
   */
  useMeasureSystem(system: MeasureSystemName | undefined): void {
    MeasureSystem.use(system)
  }
})
Object.assign(core, dimensionMethods)
