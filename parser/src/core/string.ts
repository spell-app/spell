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
   * A date for people to read:  `May 25, 1977`.
   * - What a date in a drawing compiles to, `<td>{its release date}</td>`.
   * - Its day in the reader's own time, as its parts are (`the hour of`, `the day of`):
   *   a date read from `"1977-05-25"` is that day's midnight there (`valueAsDeclared()`;  epic `data` I73).
   * - Nothing, or anything that isn't a date, stays as it is.
   */
  dateShown(date: unknown): unknown {
    return date instanceof Date ? date.toLocaleDateString("en-US", { dateStyle: "long" }) : date
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
   * - Each said as a drawing says it:  a date `November 7, 2026` (`dateShown()`), nothing as `""`.
   * - Text whatever they are:  `joined(1, 2)` is `"12"`.
   */
  joined(left: unknown, right: unknown, separator = ""): string {
    return `${joinable(left)}${separator}${joinable(right)}`
  },

  /**
   * A date's day, short:  `11/7/26`.
   * - `the short date of its time`, as HyperTalk's `the short date`.
   * - Nothing, or anything that isn't a date, stays as it is (`dateShown()`).
   */
  shortDate(date: unknown): unknown {
    return date instanceof Date
      ? `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`
      : date
  },
  /** A date's day, in full:  `Saturday, November 7, 2026` -- HyperTalk's `the long date`. */
  longDate(date: unknown): unknown {
    return date instanceof Date ? date.toLocaleDateString("en-US", { dateStyle: "full" }) : date
  },
  /** A date's day, its names cut short:  `Sat, Nov 7, 2026` -- HyperTalk's `the abbreviated date`. */
  abbreviatedDate(date: unknown): unknown {
    if (!(date instanceof Date)) return date
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  },
  /** A date's time of day:  `9:14 AM` -- HyperTalk's `the short time`. */
  shortTime(date: unknown): unknown {
    return date instanceof Date ? clockTime(date, "minutes") : date
  },
  /** A date's time of day, to the second:  `9:14:42 AM` -- HyperTalk's `the long time`. */
  longTime(date: unknown): unknown {
    return date instanceof Date ? clockTime(date, "seconds") : date
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
