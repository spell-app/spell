import { core } from "./core"
import { defineCoreModule } from "./core.types"

/** Assembled `core` string-utility methods. */
export const stringMethods = defineCoreModule({
  /** Wrap `thing` in double quotes -- no-op if `thing` is already a double-quoted string. */
  doubleQuote(thing: unknown): string {
    if (typeof thing === "string" && thing.startsWith('"') && thing.endsWith('"')) return thing
    return `"${thing}"`
  },
  /**
   * Wrap `thing` in back-ticks -- no-op if `thing` is already a back-ticked string.
   * - Used e.g. by `core.expect()`/`core.echoTestAction()` to quote spell source snippets
   *   for test output.
   */
  backTickQuote(thing: unknown): string {
    if (typeof thing === "string" && thing.startsWith("`") && thing.endsWith("`")) return thing
    return `\`${thing}\``
  },

  /**
   * Stringify and convert to UPPERCASE.
   * - Compiles from spell `{expression} as upper case` / `as uppercase` (see `rules/expressions/AsUppercase.ts`).
   */
  upperCase(string: unknown): string {
    if (string == null) return ""
    return `${string as string}`.toUpperCase()
  },
  /**
   * A date for people to read, as the program shows dates:  `November 7, 2026` unless it says otherwise.
   * - What a date in a drawing compiles to, `<td>{its release date}</td>`, and a date joined to text.
   * - The program says otherwise with `dates are shown as short dates` (`showDatesAs()`).
   * - Its day in the reader's own time, as its parts are (`the hour of`, `the day of`):
   *   a date read from `"1977-05-25"` is that day's midnight there (`valueAsDeclared()`;  epic `data` I73).
   * - Nothing, or anything that isn't a date, stays as it is.
   * - Typed so a date comes back as text, and anything else as itself (epic `mockup` P14, T24):
   *   compiled TypeScript puts it in a drawing, which takes text, not `unknown`.
   */
  dateShown<Shown>(date: Shown): Shown extends Date ? string : Shown {
    return stringMethods.dateAs(date, shownDates) as Shown extends Date ? string : Shown
  },
  /**
   * Show every date the program draws or joins to text as `style` from now on:  `dates are shown as short dates`.
   * - A style it doesn't know:  as at first, `November 7, 2026`.
   */
  showDatesAs(style: string): void {
    shownDates = style in DATE_STYLES ? (style as DateStyle) : "plain"
  },
  /**
   * `date` said as `style`, e.g. `dateAs(date, "short")` is `11/7/26`:  `its time as a short date`.
   * - The styles, HyperTalk's and two more (`DATE_STYLES`):
   *   - `plain`:  `November 7, 2026`, what a program shows unless it says otherwise
   *   - `short`:  `11/7/26`;  `long`:  `Saturday, November 7, 2026`;  `abbreviated`:  `Sat, Nov 7, 2026`
   *   - `short time`:  `9:14 AM`;  `long time`:  `9:14:42 AM`
   *   - `date and time`:  `Nov 7, 2026, 9:14 AM`
   *   - `timestamp`:  `2026-11-07T17:14:42.000Z`, ISO 8601, in UTC:  what a program sends and saves
   *   - `reader`:  as the reader's own browser says a date, `Nov 7, 2026` in the US, `7 nov 2026` in Spain
   * - Nothing, or anything that isn't a date, stays as it is;  a style it doesn't know is `plain`.
   */
  dateAs(date: unknown, style: string): unknown {
    if (!(date instanceof Date)) return date
    return (DATE_STYLES[style as DateStyle] ?? DATE_STYLES.plain)(date)
  },

  /**
   * This moment, as a date:  what spell's `now` compiles to.
   * - `the date` and `the time` say it as text:  `core.shortDate(core.now())`.
   */
  now(): Date {
    return new Date()
  },
  /**
   * `left` and `right` joined into one text, `separator` between:  what `&` and `&&` compile to (HyperTalk's).
   * - Each said as a drawing says it:  a date as the program shows dates (`dateShown()`), nothing as `""`.
   * - Text whatever they are:  `joined(1, 2)` is `"12"`.
   */
  joined(left: unknown, right: unknown, separator = ""): string {
    return `${joinable(left)}${separator}${joinable(right)}`
  },

  /** A date's day, short:  `11/7/26` -- `the short date of its time`, HyperTalk's `the short date`. */
  shortDate(date: unknown): unknown {
    return stringMethods.dateAs(date, "short")
  },
  /** A date's day, in full:  `Saturday, November 7, 2026` -- HyperTalk's `the long date`. */
  longDate(date: unknown): unknown {
    return stringMethods.dateAs(date, "long")
  },
  /** A date's day, its names cut short:  `Sat, Nov 7, 2026` -- HyperTalk's `the abbreviated date`. */
  abbreviatedDate(date: unknown): unknown {
    return stringMethods.dateAs(date, "abbreviated")
  },
  /** A date's time of day:  `9:14 AM` -- HyperTalk's `the short time`. */
  shortTime(date: unknown): unknown {
    return stringMethods.dateAs(date, "short time")
  },
  /** A date's time of day, to the second:  `9:14:42 AM` -- HyperTalk's `the long time`. */
  longTime(date: unknown): unknown {
    return stringMethods.dateAs(date, "long time")
  },
  /** A date as an ISO 8601 timestamp, in UTC:  `2026-11-07T17:14:42.000Z` -- `the timestamp of its time`. */
  timestamp(date: unknown): unknown {
    return stringMethods.dateAs(date, "timestamp")
  },

  /**
   * A number for people to read:  `1,000,000`.
   * - Compiles from spell `{expression} with commas` (see `rules/expressions/WithCommas.ts`).
   * - Nothing stays nothing, and what isn't a number stays as it is.
   */
  withCommas(number: unknown): unknown {
    return typeof number === "number" ? number.toLocaleString("en-US") : number
  },

  /**
   * Stringify and convert to lowercase.
   * - Compiles from spell `{expression} as lower case` / `as lowercase` (see `rules/expressions/AsLowercase.ts`).
   */
  lowerCase(string: unknown): string {
    if (string == null) return ""
    return `${string as string}`.toLowerCase()
  },
  /**
   * Stringify, with each word's first letter a capital:  `"ace of spades"` is `"Ace Of Spades"`.
   * - Compiles from spell `{expression} as title case` / `as titlecase` (see `rules/expressions/AsTitleCase.ts`).
   * - Only first letters change, as a drawing's `font="title-caps"` shows it:  `"NASA rocket"` is `"NASA Rocket"`.
   * - A word starts after anything but a letter, digit or apostrophe:  `"jean-luc's"` is `"Jean-Luc's"`.
   */
  titleCase(string: unknown): string {
    if (string == null) return ""
    return `${string as string}`.replace(
      TITLE_CASE_WORD_START,
      (_, before: string, letter: string) => before + letter.toUpperCase()
    )
  },
  /**
   * The character with unicode code point `code`, e.g. `"🂠"` for `0x1F0A0`.
   * - Compiles from spell `unicode {number}`, a number worked out as the program runs (`unicode_expression`),
   *   and from `unicode 1F0A0 + n` (`unicode_offset`), as `core.unicode(0x1F0A0 + n)`.
   *   `unicode 1F0A0`, written out, compiles straight to the character.
   * - `""` for nothing, or what's no code point (not a whole number, or past `0x10FFFF`).
   */
  unicode(code: unknown): string {
    const point = Number(code)
    if (code == null || !Number.isInteger(point) || point < 0 || point > 0x10ffff) return ""
    return String.fromCodePoint(point)
  }
})
Object.assign(core, stringMethods)

/** How a date says itself in each style -- see `dateAs()`. */
const DATE_STYLES = {
  plain: (date: Date) => date.toLocaleDateString("en-US", { dateStyle: "long" }),
  short: (date: Date) => `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`,
  long: (date: Date) => date.toLocaleDateString("en-US", { dateStyle: "full" }),
  abbreviated: (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
  "short time": (date: Date) => clockTime(date, "minutes"),
  "long time": (date: Date) => clockTime(date, "seconds"),
  "date and time": (date: Date) =>
    `${date.toLocaleDateString("en-US", { dateStyle: "medium" })}, ${clockTime(date, "minutes")}`,
  timestamp: (date: Date) => date.toISOString(),
  reader: (date: Date) => date.toLocaleDateString(undefined, { dateStyle: "medium" })
} satisfies Record<string, (date: Date) => string>

/** A style `dateAs()` knows, e.g. `short`. */
type DateStyle = keyof typeof DATE_STYLES

/** How the program shows a date it draws or joins to text -- see `showDatesAs()`. */
let shownDates: DateStyle = "plain"

/** `value` as `joined()` puts it in text:  a date said in words, nothing as `""`. */
function joinable(value: unknown): string {
  if (value == null) return ""
  return `${stringMethods.dateShown(value) as string}`
}

/**
 * `date`'s time on a 12-hour clock:  `9:14 AM`, or `9:14:42 AM` to the second.
 * - Written out, not `toLocaleTimeString()`:  that puts a narrow no-break space before `AM`, which Python's twin doesn't.
 */
function clockTime(date: Date, to: "minutes" | "seconds"): string {
  const hours = date.getHours()
  const pad = (n: number) => String(n).padStart(2, "0")
  const seconds = to === "seconds" ? `:${pad(date.getSeconds())}` : ""
  return `${hours % 12 || 12}:${pad(date.getMinutes())}${seconds} ${hours < 12 ? "AM" : "PM"}`
}

/** A word's first letter, after the start or anything but a letter, digit, `_` or apostrophe (Python's twin:  `[^\w'’]`). */
const TITLE_CASE_WORD_START = /(^|[^\p{L}\p{N}_'’])(\p{L})/gu
