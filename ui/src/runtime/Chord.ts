import { Browser } from "./Browser"

/****************
 * ### `Chord`
 * One keyboard shortcut, e.g. `Mod+Shift+K`, `Escape`, `Alt+ArrowUp`, `?`.
 * - In the runtime's lazy chunk, with `Keyboard`;  imports only `Browser` (its platform sniff), so tests use it alone.
 * - Parse once with `Chord.parse()`, then test events with `matches()`.
 * - Spell UI's ONE reading of a shortcut:  `UI.keyboard` matches with it, `<ui-keys>` and `<ui-action>` draw what
 *   it reads (`UI.keyboard.chord()`:  its `modifiers` in the order written, then its key).
 * - Syntax:  modifiers then one key, joined by `+`, case-insensitive:
 *   - modifiers:  `Mod` / `Modifier` (Meta on Apple, Ctrl elsewhere), `Ctrl` / `Control`,
 *     `Meta` / `Cmd` / `Command` (the Meta key itself), `Alt` / `Option`, `Shift`
 *   - key:  any `KeyboardEvent.key` (`ArrowDown`, `Enter`, `k`, `/`), plus aliases `Esc`, `Space`, `Up`,
 *     `Down`, `Left`, `Right`, `Del`, `Return`, `Plus`;  a trailing `++`, or `+` alone, means the `+` key
 * - Modifiers match EXACTLY:  `Mod+K` does not fire for `Mod+Shift+K`.
 *   - Exception:  a symbol key without `Shift` in the chord ignores Shift, since `?` / `+` need it on most layouts.
 * - Letters and digits also match by `event.code` (`KeyK`, `Digit1`), so `Alt+K` still fires on macOS,
 *   where Option turns `event.key` into `˚`.
 ****************/
export class Chord {
  /** normalized key:  lowercased, aliases resolved, e.g. `"k"`, `"arrowdown"`, `" "` */
  readonly key: string
  /** the key as the shortcut wrote it, e.g. `"K"`, `"PageUp"`:  how a key cap shows a key it has no symbol for */
  readonly keyText: string
  /** the modifiers that must be down, in the order the shortcut wrote them (`Mod` already resolved) */
  readonly modifiers: readonly ChordModifier[]
  /** Ctrl must be down */
  readonly ctrl: boolean
  /** Meta (Cmd / Windows key) must be down */
  readonly meta: boolean
  /** Alt (Option) must be down */
  readonly alt: boolean
  /** Shift must be down */
  readonly shift: boolean

  constructor({ key, modifiers = [] }: ChordProps) {
    this.key = Chord.normalizeKey(key)
    this.keyText = key
    this.modifiers = modifiers
    this.ctrl = modifiers.includes("ctrl")
    this.meta = modifiers.includes("meta")
    this.alt = modifiers.includes("alt")
    this.shift = modifiers.includes("shift")
  }

  /** True when any of Ctrl / Meta / Alt is part of the chord -- such chords fire inside editable fields. */
  get hasCommandModifier(): boolean {
    return this.ctrl || this.meta || this.alt
  }

  /** Canonical text, e.g. `"Ctrl+Shift+k"`;  equal chords give equal strings (used for conflict detection). */
  toString(): string {
    const names = [this.ctrl && "Ctrl", this.meta && "Meta", this.alt && "Alt", this.shift && "Shift"]
    return [...names.filter(Boolean), this.key === " " ? "Space" : this.key].join("+")
  }

  /** Does `event` press this chord?  See class docs for the Shift and `event.code` rules. */
  matches(event: KeyboardEvent): boolean {
    if (event.ctrlKey !== this.ctrl || event.metaKey !== this.meta || event.altKey !== this.alt) return false
    if (event.shiftKey !== this.shift && !(this.isSymbol && !this.shift)) return false
    if (Chord.normalizeKey(event.key ?? "") === this.key) return true
    return this.code !== undefined && event.code === this.code
  }

  ////////////////
  // ## Internals
  ////////////////

  /** Single printable character that isn't a letter or digit, e.g. `?`, `/`, `+`. */
  private get isSymbol(): boolean {
    return this.key.length === 1 && !/[\p{L}\p{N}\s]/u.test(this.key)
  }

  /** `event.code` for letter / digit keys (`KeyK`, `Digit1`), else `undefined`. */
  private get code(): string | undefined {
    if (/^[a-z]$/.test(this.key)) return `Key${this.key.toUpperCase()}`
    if (/^[0-9]$/.test(this.key)) return `Digit${this.key}`
    return undefined
  }

  ////////////////
  // ## Statics
  ////////////////

  /**
   * Parse `text` like `"Mod+Shift+K"`.
   * - STATIC:  the factory, called before there's a chord to call it on.
   * - `isApple` decides what `Mod` means;  defaults to sniffing `navigator` (the runtime passes `UI.browser.isApple`).
   * - Throws a `SyntaxError` on an unknown modifier or a missing key, so a typo in a shortcut fails at registration,
   *   not silently never firing.
   */
  static parse(text: string, { isApple = Browser.isApplePlatform() }: { isApple?: boolean } = {}): Chord {
    const parts = Chord.partsOf(text.trim())
    const key = parts.pop()?.trim()
    if (!key) throw new SyntaxError(`Chord.parse():  no key in ${JSON.stringify(text)};  end it with one, e.g. "Mod+K"`)
    const modifiers: ChordModifier[] = []
    for (const part of parts) {
      const word = MODIFIER_ALIASES[part.trim().toLowerCase()]
      if (!word) {
        throw new SyntaxError(
          `Chord.parse():  unknown modifier ${JSON.stringify(part)} in ${JSON.stringify(text)};  ` +
            `use Mod, Ctrl, Meta, Alt or Shift`
        )
      }
      const modifier = word === "mod" ? (isApple ? "meta" : "ctrl") : word
      if (!modifiers.includes(modifier)) modifiers.push(modifier)
    }
    return new Chord({ key, modifiers })
  }

  /**
   * `text`'s parts, the key last:  `"Mod+Shift+K"` => `["Mod", "Shift", "K"]`.
   * - A trailing `++`, or `+` alone, is the `+` key:  `"Ctrl++"` => `["Ctrl", "+"]`.
   * - STATIC:  pure, part of `parse()`.
   */
  private static partsOf(text: string): string[] {
    if (text === "+") return [text]
    if (text.endsWith("++")) return [...text.slice(0, -2).split("+"), "+"]
    return text.split("+")
  }

  /**
   * Lowercase `key` and resolve aliases (`Esc` -> `escape`, `Space` -> `" "`).
   * - STATIC:  pure, and the constructor needs it before the fields it would read exist.
   */
  private static normalizeKey(key: string): string {
    if (key === " ") return key
    const lower = key.toLowerCase()
    return KEY_ALIASES[lower] ?? lower
  }
}

/** Constructor props for `Chord`:  the key, and which modifiers must be down (default none). */
export type ChordProps = {
  /** any `KeyboardEvent.key`, or an alias (`Esc`, `Space` ...), as written;  normalized by the constructor */
  key: string
  /** the modifiers that must be down, in the order written */
  modifiers?: readonly ChordModifier[]
}

/** A key a chord holds down with its key:  `Mod` is already one of the first two. */
export type ChordModifier = "ctrl" | "meta" | "alt" | "shift"

/** Modifier words accepted by `Chord.parse()`, lowercased -> canonical. */
const MODIFIER_ALIASES: Record<string, "mod" | ChordModifier | undefined> = {
  mod: "mod",
  modifier: "mod",
  ctrl: "ctrl",
  control: "ctrl",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  alt: "alt",
  option: "alt",
  shift: "shift"
}

/** Key aliases accepted by `Chord.parse()`, lowercased -> lowercased `KeyboardEvent.key`. */
const KEY_ALIASES: Record<string, string | undefined> = {
  esc: "escape",
  space: " ",
  spacebar: " ",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  del: "delete",
  return: "enter",
  plus: "+"
}
