import { EN_STRINGS, type I18nKey, type I18nParams, type StringPack } from "./runtime.types"

/**
 * Text strings and locale-aware formatting, as `UI.i18n`.
 * - Strings:  packs per locale (`register("de", {...})`);  `t(key)` looks up the exact locale (`pt-BR`),
 *   then its language (`pt`), then `en`, then returns the key itself -- a missing string is visible, not blank.
 * - Formatting via `Intl`, with formatters cached per locale + options (they're costly to build).
 * - NOTE: no Temporal yet.  When `temporal-polyfill` lands, date helpers take `Temporal.PlainDate` too;
 *   `UI.browser.supports.temporal` says whether the native one exists, and the polyfill is loaded
 *   (dynamic import) from `formatDate()` only when it doesn't.
 */
export class I18n {
  /** BCP 47 locale for lookups and formatting;  default the browser's */
  locale: string
  /** locale -> strings */
  private readonly packs = new Map<string, StringPack>([["en", { ...EN_STRINGS }]])
  /** formatter cache, keyed by kind + locale + options */
  private readonly formatters = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>()

  constructor({ locale }: I18nProps = {}) {
    this.locale = locale ?? (typeof navigator === "undefined" ? "en" : navigator.language) ?? "en"
  }

  ////////////////
  // ## Strings
  ////////////////

  /** Merge `pack` into `locale`'s strings;  later registrations win per key. */
  register(locale: string, pack: StringPack) {
    this.packs.set(locale, { ...this.packs.get(locale), ...pack })
  }

  /**
   * String for `key` in the current locale (see class docs for fallback), with `{name}` placeholders
   * filled from `params`.
   * - A placeholder without a param stays as-is (`{value}`), so the gap is visible.
   */
  t(key: I18nKey, params?: I18nParams): string {
    const text = this.lookup(key) ?? key
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
  }

  /** Is there a string for `key` in the current locale's chain? */
  has(key: I18nKey): boolean {
    return this.lookup(key) !== undefined
  }

  ////////////////
  // ## Formatting
  ////////////////

  /** Format a date with `Intl.DateTimeFormat`;  default:  medium date. */
  formatDate(date: Date | number, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
    return this.dateFormat(options).format(date)
  }

  /** Format a number with `Intl.NumberFormat`. */
  formatNumber(value: number | bigint, options: Intl.NumberFormatOptions = {}): string {
    return this.numberFormat(options).format(value)
  }

  /**
   * Weekday names, Sunday first (index === `Date.getDay()`).
   * - Rotate by `firstDayOfWeek()` for calendar headers.
   */
  weekdays(style: "long" | "short" | "narrow" = "long"): string[] {
    const format = this.dateFormat({ weekday: style, timeZone: "UTC" })
    // 2023-01-01 was a Sunday
    return Array.from({ length: 7 }, (_, day) => format.format(Date.UTC(2023, 0, 1 + day)))
  }

  /** Month names, January first (index === `Date.getMonth()`). */
  months(style: "long" | "short" | "narrow" = "long"): string[] {
    const format = this.dateFormat({ month: style, timeZone: "UTC" })
    return Array.from({ length: 12 }, (_, month) => format.format(Date.UTC(2023, month, 1)))
  }

  /**
   * First day of the week for the locale, `0` = Sunday (as `Date.getDay()`).
   * - From `Intl.Locale` week info where the browser has it (`1` = Monday ... `7` = Sunday there), else Sunday.
   */
  firstDayOfWeek(): number {
    try {
      const locale = new Intl.Locale(this.locale) as Intl.Locale & WeekInfoLocale
      const info = locale.getWeekInfo?.() ?? locale.weekInfo
      return info ? info.firstDay % 7 : 0
    } catch {
      return 0
    }
  }

  /** Localized name of a language / region / currency code via `Intl.DisplayNames`, e.g. `("region", "DE")`. */
  displayName(type: Intl.DisplayNamesType, code: string): string {
    try {
      return new Intl.DisplayNames([this.locale, "en"], { type }).of(code) ?? code
    } catch {
      return code
    }
  }

  ////////////////
  // ## Internals
  ////////////////

  /** Walk the locale chain for `key`. */
  private lookup(key: I18nKey): string | undefined {
    for (const locale of this.chain()) {
      const text = this.packs.get(locale)?.[key]
      if (text !== undefined) return text
    }
    return undefined
  }

  /** Locales to try, most specific first:  `pt-BR`, `pt`, `en`. */
  private chain(): string[] {
    const language = this.locale.split("-")[0] ?? this.locale
    return [...new Set([this.locale, language, "en"])]
  }

  /** Cached `Intl.DateTimeFormat`. */
  private dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `date|${this.locale}|${JSON.stringify(options)}`
    let format = this.formatters.get(key) as Intl.DateTimeFormat | undefined
    if (!format) this.formatters.set(key, (format = new Intl.DateTimeFormat(this.locale, options)))
    return format
  }

  /** Cached `Intl.NumberFormat`. */
  private numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = `number|${this.locale}|${JSON.stringify(options)}`
    let format = this.formatters.get(key) as Intl.NumberFormat | undefined
    if (!format) this.formatters.set(key, (format = new Intl.NumberFormat(this.locale, options)))
    return format
  }
}

/** Constructor props for `I18n`. */
export type I18nProps = {
  /** starting locale;  default `navigator.language` */
  locale?: string
}

/** `Intl.Locale` week info, not yet in TypeScript's lib (`getWeekInfo()` newer, `weekInfo` older). */
type WeekInfoLocale = {
  /** current spelling */
  getWeekInfo?: () => { firstDay: number }
  /** older spelling (Chromium, Safari) */
  weekInfo?: { firstDay: number }
}
