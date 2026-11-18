import { PrefStore } from "spell/util/persist/PrefStore"

/**
 * The key of the person's first day of the week, in the browser's storage:  `1` (Monday) to `7` (Sunday), the ISO
 * numbering, or absent for the region's.
 * - ONE key for every Spell site, beside the measure system's (`spell-site:units`).
 */
export const FIRST_DAY_KEY = "spell-site:week-start"

/** The key of the person's clock, in the browser's storage:  `12` or `24`, or absent for the region's. */
export const CLOCK_KEY = "spell-site:clock"

/** The two clocks a person reads times on. */
export const Clocks = ["12", "24"] as const
/** One of `Clocks`. */
export type ClockName = (typeof Clocks)[number]

/** A day of the week, ISO's way:  1 is Monday, 7 is Sunday. */
export type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** What a host may say for every page it draws, whatever the person chose (`CalendarSettings.use()`):  a test. */
export type CalendarHost = {
  /** the person's region, `US`, `ES` */
  region?: string
  /** their first day of the week */
  firstDay?: WeekdayNumber
  /** their clock */
  clock?: ClockName
}

/****************
 * ### `CalendarSettings`
 * How a person reads dates and times (epic `language` P63):  their region, their first day of the week and their clock.
 * - Each their choice, kept under ONE key through a `PrefStore` (`FIRST_DAY_KEY`, `CLOCK_KEY`), as `MeasureSystem` is;
 *   else their region's, from the browser's language (`navigator.language`, `en-US` => `US`) and `Intl.Locale`'s week
 *   and clock info:  Sunday and a 12-hour clock in the US, Monday and 24 hours in Spain.
 * - A host may say any of them for every page it draws (`use()`):  a test.
 * - Static only:  one per page.
 * - Safe outside a browser:  the system's own locale.
 * - NEVER throws:  storage that fails is `PrefStore`'s, which logs and forgets;
 *   a browser with no week info starts the week on Monday, the commonest, its weekend Saturday and Sunday.
 * - Where a person changes them:  nowhere yet.  Spell has no settings dialog of a person's own;
 *   `chooseFirstDay()` and `chooseClock()` keep a choice, for the one that comes.
 ****************/
export class CalendarSettings {
  /** The person's region, `US`:  the host's, else their browser's language's, else `US`. */
  static get region(): string {
    if (CalendarSettings.host.region) return CalendarSettings.host.region
    try {
      return new Intl.Locale(CalendarSettings.language()).maximize().region ?? "US"
    } catch {
      return "US"
    }
  }

  /**
   * The locale to say dates in:  the program's `lang`, the person's region, `es-US` for a Spanish program in the US.
   * - So names follow the program's language, and the order of day and month the person's region.
   */
  static localeFor(lang: string): string {
    try {
      return new Intl.Locale(lang, { region: CalendarSettings.region }).toString()
    } catch {
      return lang
    }
  }

  ////////////////
  // ## The first day of the week
  ////////////////

  /** The person's first day of the week, 1 (Monday) to 7 (Sunday):  the host's, else their choice, else their region's. */
  static get firstDay(): WeekdayNumber {
    return CalendarSettings.host.firstDay ?? CalendarSettings.chosenFirstDay() ?? CalendarSettings.weekInfo().firstDay
  }

  /** The first day chosen, or `undefined`:  the region's. */
  static chosenFirstDay(): WeekdayNumber | undefined {
    const kept = Number(PrefStore.getAt(FIRST_DAY_KEY))
    return kept >= 1 && kept <= 7 ? (kept as WeekdayNumber) : undefined
  }

  /** Remember `day` as the first day of the week (`undefined`:  the region's again). */
  static chooseFirstDay(day: WeekdayNumber | undefined): void {
    PrefStore.setAt(FIRST_DAY_KEY, day === undefined ? undefined : String(day))
  }

  /** The days of the person's region's weekend, ISO's way:  `[6, 7]`, Saturday and Sunday, in most places. */
  static get weekend(): readonly WeekdayNumber[] {
    return CalendarSettings.weekInfo().weekend
  }

  ////////////////
  // ## The clock
  ////////////////

  /** Does the person read times on a 24-hour clock:  the host's, else their choice, else their region's? */
  static get uses24HourClock(): boolean {
    const clock = CalendarSettings.host.clock ?? CalendarSettings.chosenClock() ?? CalendarSettings.regionClock()
    return clock === "24"
  }

  /** The clock chosen, or `undefined`:  the region's. */
  static chosenClock(): ClockName | undefined {
    const kept = PrefStore.getAt(CLOCK_KEY)
    return Clocks.find((name) => name === String(kept))
  }

  /** Remember `clock` ("Use a 24-hour clock":  `24`;  `undefined`:  the region's again). */
  static chooseClock(clock: ClockName | undefined): void {
    PrefStore.setAt(CLOCK_KEY, clock)
  }

  /** The clock of the person's region:  `12` where its first hour cycle is 1-12, `24` elsewhere. */
  static regionClock(): ClockName {
    const cycles = CalendarSettings.localeInfo<string[]>("getHourCycles", "hourCycles")
    return cycles?.[0] === "h12" || cycles?.[0] === "h11" ? "12" : "24"
  }

  ////////////////
  // ## Hosts
  ////////////////

  /** Say `host`'s region, first day or clock for every page this host draws (`{}`:  as usual again). */
  static use(host: CalendarHost): void {
    CalendarSettings.host = host
  }

  /** What a host said, `use()`. */
  private static host: CalendarHost = {}

  /** The reader's language:  the browser's, else this system's own. */
  private static language(): string {
    return (globalThis.navigator as Navigator | undefined)?.language ?? Intl.DateTimeFormat().resolvedOptions().locale
  }

  /** The week of the person's region:  its first day and its weekend, from `Intl.Locale`. */
  private static weekInfo(): { firstDay: WeekdayNumber; weekend: WeekdayNumber[] } {
    const info = CalendarSettings.localeInfo<{ firstDay: WeekdayNumber; weekend: WeekdayNumber[] }>(
      "getWeekInfo",
      "weekInfo"
    )
    return { firstDay: info?.firstDay ?? 1, weekend: info?.weekend ?? [6, 7] }
  }

  /**
   * One of `Intl.Locale`'s newer facts about the person's region, by its method (`getWeekInfo()`), or its older getter
   * where a browser has only that (`weekInfo`) -- `undefined` where it has neither.
   */
  private static localeInfo<T>(method: string, getter: string): T | undefined {
    try {
      const locale = new Intl.Locale("und", { region: CalendarSettings.region }) as unknown as Record<string, unknown>
      const read = locale[method]
      return (typeof read === "function" ? (read as () => T).call(locale) : locale[getter]) as T | undefined
    } catch {
      return undefined
    }
  }
}
