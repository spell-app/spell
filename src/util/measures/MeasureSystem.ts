import { PrefStore } from "spell/util/persist/PrefStore"
import { BUILT_IN, type Dimension } from "./Dimension"

/** The two ways people measure:  metric, or the US's feet, pounds and °F. */
export const MeasureSystems = ["metric", "us"] as const
/** One of `MeasureSystems`. */
export type MeasureSystemName = (typeof MeasureSystems)[number]

/**
 * The key of the chosen measure system, in the browser's storage:  `metric`, `us`, or absent for the region's.
 * - ONE key for every Spell site, beside the colour scheme's (`spell-site:scheme`):  a switch on one holds on the others.
 */
export const MEASURE_SYSTEM_KEY = "spell-site:units"

/**
 * The regions that measure in US units (Q27):  the US, Liberia, Myanmar.
 * - The browser names a person's region but not how they measure, so this list is ours, written down once.
 */
export const US_UNIT_REGIONS: readonly string[] = ["US", "LR", "MM"]

/**
 * What each built-in unit is shown as for a reader of each system, by the unit's id (P24, Q27):
 * lengths in feet and inches, weights in pounds, temperatures in °F, volumes in cups for a US reader;
 * the metric unit nearest in size for everyone else (`172 cm`, not `1.72 m`).
 * - A unit missing here, or already the reader's (a centimeter for a metric reader), shows as it's stored.
 * - Python's core has the same table, `spell_core/dimensions.py`:  `tests/core/measuresShown.expected.json5` holds both to it.
 */
export const READER_UNITS: Record<string, Partial<Record<MeasureSystemName, readonly string[]>>> = {
  meter: { us: ["foot", "inch"] },
  centimeter: { us: ["foot", "inch"] },
  millimeter: { us: ["inch"] },
  kilometer: { us: ["mile"] },
  inch: { metric: ["centimeter"] },
  foot: { metric: ["centimeter"] },
  yard: { metric: ["meter"] },
  mile: { metric: ["kilometer"] },
  kilogram: { us: ["pound"] },
  gram: { us: ["ounce"] },
  pound: { metric: ["kilogram"] },
  ounce: { metric: ["gram"] },
  stone: { metric: ["kilogram"] },
  celsius: { us: ["fahrenheit"] },
  kelvin: { us: ["fahrenheit"] },
  fahrenheit: { metric: ["celsius"] },
  liter: { us: ["cup"] },
  milliliter: { us: ["teaspoon"] },
  gallon: { metric: ["liter"] },
  quart: { metric: ["liter"] },
  pint: { metric: ["milliliter"] },
  cup: { metric: ["milliliter"] },
  fluidOunce: { metric: ["milliliter"] },
  tablespoon: { metric: ["milliliter"] },
  teaspoon: { metric: ["milliliter"] },
  meterPerSecond: { us: ["milePerHour"] },
  kilometerPerHour: { us: ["milePerHour"] },
  milePerHour: { metric: ["kilometerPerHour"] },
  knot: { metric: ["kilometerPerHour"] }
}

/****************
 * ### `MeasureSystem`
 * How a person reads measures, metric or US (epic `language` P24, Q27):  their region's, unless they've chosen.
 * - Chosen:  kept under ONE key (`MEASURE_SYSTEM_KEY`), through a `PrefStore`, as the colour scheme is.
 * - Else their region's, from the browser's language (`navigator.language`, `en-US` => `US`):  `US_UNIT_REGIONS`.
 * - A host may say it for every page it draws (`use()`):  a test, or a page showing both.
 * - Static only:  one per page.
 * - Safe outside a browser:  the system's own locale, else metric.
 * - NEVER throws:  storage that fails is `PrefStore`'s, which logs and forgets.
 ****************/
export class MeasureSystem {
  /** The system measures are shown in:  the host's (`use()`), else the one chosen, else the region's. */
  static get current(): MeasureSystemName {
    return MeasureSystem.used ?? MeasureSystem.chosen() ?? MeasureSystem.ofRegion()
  }

  /** The system chosen, or `undefined`:  the region's. */
  static chosen(): MeasureSystemName | undefined {
    const kept = PrefStore.getAt(MEASURE_SYSTEM_KEY)
    return MeasureSystems.find((name) => name === kept)
  }

  /** Remember `system` (`undefined`:  the region's again). */
  static choose(system: MeasureSystemName | undefined): void {
    PrefStore.setAt(MEASURE_SYSTEM_KEY, system)
  }

  /** The system of the reader's region:  `us` in `US_UNIT_REGIONS`, else `metric`. */
  static ofRegion(language = MeasureSystem.language()): MeasureSystemName {
    try {
      const region = new Intl.Locale(language).maximize().region
      return region && US_UNIT_REGIONS.includes(region) ? "us" : "metric"
    } catch {
      return "metric"
    }
  }

  /** Show measures in `system` on every page this host draws, whatever's chosen (`undefined`:  as usual). */
  static use(system: MeasureSystemName | undefined): void {
    MeasureSystem.used = system
  }

  /** What a host said, `use()`. */
  private static used: MeasureSystemName | undefined

  /** The reader's language:  the browser's, else this system's own. */
  private static language(): string {
    return (globalThis.navigator as Navigator | undefined)?.language ?? Intl.DateTimeFormat().resolvedOptions().locale
  }

  /**
   * The units unit `unit` of `dimension` is shown in for a reader of `system`:  `["foot", "inch"]` for a centimeter
   * in the US -- the unit itself when the reader reads it already, or it has none (`READER_UNITS`).
   */
  static unitsFor(dimension: Dimension, unit: string, system = MeasureSystem.current): readonly string[] {
    const shown = READER_UNITS[unit]?.[system]
    return shown?.every((id) => dimension.units.some((it) => it.id === id)) ? shown : [unit]
  }

  /**
   * `value` of `dimension`'s unit `unit`, written for a reader of `system`:  `5 ft 8 in` in the US for 172 cm.
   * - Nothing, or not a number:  `""`, so a row with nothing to show shows nothing.
   */
  static shown(value: unknown, dimension: Dimension, unit: string, system = MeasureSystem.current): string {
    if (value === undefined || value === null || value === "" || Number.isNaN(Number(value))) return ""
    return dimension.text(Number(value), unit, MeasureSystem.unitsFor(dimension, unit, system))
  }
}

export { BUILT_IN }
