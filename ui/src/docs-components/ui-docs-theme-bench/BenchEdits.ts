// Import directly:  the `spell-ui/styles` barrel carries every foundation sheet as text, which the bench never needs
import { ThemeFile } from "spell-ui/styles/ThemeFile"
import { BenchTokens } from "./BenchTokens"
import type { BenchEditSet, TokenEdit } from "./UIDocsThemeBench.types"

/****************
 * ### `BenchEdits`
 * The theme bench's tunings (`BenchEditSet`:  theme => token => value), and what they become:
 * - `css()`:  the sheet laid over every framed page, live
 * - `themeFile()`:  the lines to put in the theme's file, `<name>.theme.json5`, in its nested groups
 * - `editorCss()`:  the editor app's own tokens (`--spell-*`), which live in its sheet, not a theme file
 * - A colour is written as hex, `#rrggbb`, or `#rrggbbaa` when it's see-through:  the theme files' one spelling
 *   (a plain `rgb()` typed in is turned into it).
 * - Static, and every change makes a NEW set:  the component keeps the set in one reactive member.
 ****************/
export class BenchEdits {
  ////////////////
  // ## Changing them
  ////////////////

  /**
   * `edits` with `token` of `theme` set to `value`:  for `scheme` alone, or for both (`undefined`).
   * - A value for one scheme keeps the other's edit, if any.
   */
  static set(
    edits: BenchEditSet,
    { theme, token, value, scheme }: { theme: string; token: string; value: string; scheme?: "light" | "dark" }
  ): BenchEditSet {
    const before = edits[theme]?.[token]
    const edit: TokenEdit = !scheme
      ? { both: value }
      : { ...(before && !("both" in before) ? before : {}), [scheme]: value }
    return { ...edits, [theme]: { ...edits[theme], [token]: edit } }
  }

  /** `edits` without `theme`'s edit of `token`;  without all of `theme`'s, when no token is given. */
  static reset(edits: BenchEditSet, theme: string, token?: string): BenchEditSet {
    const { [theme]: ofTheme, ...others } = edits
    if (!ofTheme || token === undefined) return others
    const { [token]: _dropped, ...kept } = ofTheme
    return Object.keys(kept).length ? { ...others, [theme]: kept } : others
  }

  /** `theme`'s edit of `token`, as a value for `scheme`;  `undefined`:  not tuned there. */
  static valueFor(edits: BenchEditSet, theme: string, token: string, scheme: "light" | "dark"): string | undefined {
    const edit = edits[theme]?.[token]
    if (!edit) return undefined
    return "both" in edit ? edit.both : edit[scheme]
  }

  /** How many tokens of `theme` are tuned. */
  static count(edits: BenchEditSet, theme: string): number {
    return Object.keys(edits[theme] ?? {}).length
  }

  ////////////////
  // ## What they become
  ////////////////

  /**
   * The sheet laid over a framed page wearing `theme`:  each tuned token on `:root`, `!important`
   * (`BenchBridge.applyCss()` says why);  a value for one scheme under that scheme's class, which the bench always sets
   * (`ui-light` / `ui-dark`).  `""`:  nothing tuned.
   */
  static css(edits: BenchEditSet, theme: string): string {
    const rules: Record<string, string[]> = { ":root": [], ":root.ui-light": [], ":root.ui-dark": [] }
    for (const [token, edit] of Object.entries(edits[theme] ?? {})) {
      if ("both" in edit) rules[":root"]!.push(`${token}: ${edit.both} !important;`)
      else {
        if (edit.light !== undefined) rules[":root.ui-light"]!.push(`${token}: ${edit.light} !important;`)
        if (edit.dark !== undefined) rules[":root.ui-dark"]!.push(`${token}: ${edit.dark} !important;`)
      }
    }
    return Object.entries(rules)
      .filter(([, lines]) => lines.length)
      .map(([selector, lines]) => `${selector} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`)
      .join("\n")
  }

  /**
   * `theme`'s tunings as the lines of its theme file, in its nested groups:  JSON5, ready to merge in.
   * - A pair keeps the half not tuned as the file writes it, else as what it extends sets it;
   *   a half nothing sets is written as the tuned one, and says so.
   * - The editor's own tokens are left out:  they're `editorCss()`'s.
   * - `""`:  nothing tuned in a theme file.
   */
  static themeFile(edits: BenchEditSet, theme: string, tokens: BenchTokens): string {
    const tree: Record<string, unknown> = {}
    const notes: string[] = []
    for (const [token, edit] of Object.entries(edits[theme] ?? {})) {
      const place = tokens.placeOf(token)
      if (place === EDITOR) continue
      let value: unknown
      if ("both" in edit) value = BenchEdits.hex(edit.both)
      else {
        const written = tokens.writtenIn(theme, token)
        const half = (scheme: "light" | "dark") => {
          const tuned = edit[scheme]
          if (tuned !== undefined) return BenchEdits.hex(tuned)
          if (ThemeFile.isPair(written)) return written[scheme]
          if (written !== undefined) return written
          // what it extends (or its palette) sets it:  that, as this file would point at it
          const inherited = tokens.valueIn(theme, token)
          if (inherited !== undefined) return tokens.asWritten(BenchTokens.forScheme(inherited, scheme))
          notes.push(`${place}:  only ${scheme === "light" ? "dark" : "light"} was tuned;  ${scheme} is a copy of it`)
          return BenchEdits.hex((edit.light ?? edit.dark)!)
        }
        value = { light: half("light"), dark: half("dark") }
      }
      setAt(tree, place.split("."), value)
    }
    if (!Object.keys(tree).length) return ""
    const head = [
      `// ${theme}.theme.json5:  merge these into the file, then \`yarn gen:styles\``,
      ...notes.map((note) => `// ${note}`)
    ]
    return `${head.join("\n")}\n${JSON.stringify(tree, undefined, 2)}\n`
  }

  /** `theme`'s tunings of the editor app's own tokens, as a rule for its sheet;  `""`:  none. */
  static editorCss(edits: BenchEditSet, theme: string, tokens: BenchTokens): string {
    const lines: string[] = []
    for (const [token, edit] of Object.entries(edits[theme] ?? {})) {
      if (tokens.placeOf(token) !== EDITOR) continue
      const value = "both" in edit ? edit.both : `light-dark(${edit.light ?? edit.dark}, ${edit.dark ?? edit.light})`
      lines.push(`  ${token}: ${BenchEdits.hex(value)};`)
    }
    if (!lines.length) return ""
    return `/* the editor app's sheet (spell-app's EditorTheme.css) */\n:root[data-spell-theme="${theme}"] {\n${lines.join("\n")}\n}\n`
  }

  /**
   * `value` with every plain `rgb()` / `rgba()` written as hex (`ThemeFile.hexOf()`):
   * `rgb(255 255 255 / 0.5)` => `#ffffff80`;  anything else as it is.
   */
  static hex(value: string): string {
    return value.replace(RGB, (...match) => {
      const [whole, red, green, blue, alpha] = match as string[]
      const fraction = alpha === undefined ? undefined : alpha.endsWith("%") ? parseFloat(alpha) / 100 : Number(alpha)
      const exec = Object.assign([whole, red, green, blue, fraction === undefined ? undefined : String(fraction)], {
        index: 0,
        input: whole
      }) as unknown as RegExpExecArray
      const hex = ThemeFile.hexOf(exec)
      return fraction === 1 ? hex.slice(0, 7) : hex
    })
  }
}

/** Set `value` at `path` in `tree`, making groups on the way. */
function setAt(tree: Record<string, unknown>, path: readonly string[], value: unknown): void {
  let node = tree
  for (const key of path.slice(0, -1)) node = (node[key] ??= {}) as Record<string, unknown>
  node[path.at(-1)!] = value
}

/** `BenchTokens`' group of the editor app's own tokens. */
const EDITOR = "editor"

/** A plain `rgb()` / `rgba()`, its channels whole numbers:  space or comma separated, the alpha a number or a %. */
const RGB = /rgba?\(\s*(\d+)\s*[\s,]\s*(\d+)\s*[\s,]\s*(\d+)\s*(?:[/,]\s*([\d.]+%?)\s*)?\)/g
