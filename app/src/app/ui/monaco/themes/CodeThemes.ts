import { ColorScheme, rgbToHex } from "spell/util"
import { UIT } from "spell/ui/core"
import { monaco } from "spell/app/app/ui/monaco/monaco"
import { CodeRules, type CodeInk } from "./CodeRules"

/****************
 * ### `CodeThemes`
 * The code's colours in every Monaco editor on the page:  the PAGE's theme's (epic `debut` P22), light or dark as
 * the page is.
 * - Read off the page as it draws:  each `--ui-code-<role>` token (Spell UI's `codeRoles`) on a hidden probe, as
 *   the browser paints it, so a light / dark pair comes out as the scheme shows it;  nothing is generated for it.
 *   - Every theme has them:  its own, in its theme file, or the recipe from its colours (`colors.css`).
 * - Built again when what the page shows changes:
 *   - `<html>`'s classes, style and `data-spell-theme` (the scheme, the theme's name)
 *   - a theme applied (`UIT.THEME_APPLIED_EVENT`, from `UI.themes`)
 *   - a sheet added or changed in `<head>` (the theme bench's tuning, `PageBridge.applyCss()`):
 *     never Monaco's own, which it adds as each editor is made (`isMonacosOwn()`;  a notebook page of 76 examples
 *     built it again many times a keystroke, at 0.6-2s a time:  epic `notebook` P4)
 *   - the OS's scheme (`ColorScheme`)
 *   - so the editor, the theme bench's live tuning and the read-only public build all follow with nothing more
 * - Monaco has ONE theme per page:  every editor follows at once.
 * - The code is see-through, on the panel (J129):  `EditorTheme.css` clears its background;  the lines stuck at the
 *   top while scrolling take the panel as painted over the page.
 * - `register()` once, before the first editor:  `SpellMonaco.register()` does.
 ****************/
export class CodeThemes {
  /** The theme's name now:  one of `NAMES`, which it takes turns with as it's built again. */
  static get current(): string {
    return NAMES[CodeThemes.builds % NAMES.length]!
  }

  /**
   * Build the code's theme from the page, apply it, and follow the page from then on.
   * - SIDE EFFECTS:  watches `<html>`, `<head>`, theme changes and the OS's scheme, for the page's life.
   * - Called again:  does nothing.
   */
  static register(): void {
    if (CodeThemes.isRegistered) return
    CodeThemes.isRegistered = true
    CodeThemes.apply()
    if (typeof document === "undefined") return
    const again = () => CodeThemes.soon()
    new MutationObserver(again).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-spell-theme"]
    })
    new MutationObserver((changes) => {
      if (changes.some((change) => !isMonacosOwn(change))) again()
    }).observe(document.head, { childList: true, subtree: true, characterData: true })
    document.addEventListener(UIT.THEME_APPLIED_EVENT, again)
    ColorScheme.watch(again)
  }

  /** Is the page dark?  `<html>`'s `ui-dark` / `ui-light`, else the one chosen, else the OS's (`ColorScheme.shown()`). */
  static isPageDark(): boolean {
    if (typeof document === "undefined") return false
    return ColorScheme.shown() === "dark"
  }

  /**
   * The code's theme as the page draws it now:  Monaco's rules (`CodeRules`) and the editor's colours.
   * - Outside a browser:  Monaco's own colours, with no rules.
   */
  static build(): monaco.editor.IStandaloneThemeData {
    const isDark = CodeThemes.isPageDark()
    const base = isDark ? "vs-dark" : "vs"
    const host = typeof document === "undefined" ? undefined : (document.body ?? document.documentElement)
    if (!host) return { base, inherit: true, rules: [], colors: {} }
    const resolved = CodeThemes.resolved(host, [...CodeRules.ROLES.map(roleToken), ...THEME_TOKENS])
    const color = (token: string) => CodeThemes.painted(resolved.get(token)!)
    const ink = Object.fromEntries(CodeRules.ROLES.map((role) => [role, color(roleToken(role)).slice(1)])) as CodeInk
    return {
      base,
      inherit: true,
      rules: CodeRules.rules(ink),
      colors: {
        "editor.background": "#00000000",
        "editorGutter.background": "#00000000",
        "editor.foreground": color("--ui-code-color"),
        "editorCursor.foreground": color("--ui-code-cursor"),
        "editor.selectionBackground": color("--ui-code-selection"),
        "editorLineNumber.foreground": color("--ui-code-gutter-color"),
        "editorLineNumber.activeForeground": color("--ui-code-gutter-active"),
        "editorBracketMatch.background": color("--ui-code-bracket"),
        "editorBracketMatch.border": color("--ui-code-bracket"),
        "editor.findMatchBackground": color("--ui-code-find"),
        "editorStickyScroll.background": CodeThemes.painted(
          resolved.get("--ui-surface")!,
          resolved.get("--ui-background")!
        )
      }
    }
  }

  ////////////////
  // ## Internals
  ////////////////

  /** Build the theme and set it, if the page draws its code differently now. */
  private static apply(): void {
    const theme = CodeThemes.build()
    const text = JSON.stringify(theme)
    if (text === CodeThemes.applied) return
    CodeThemes.applied = text
    CodeThemes.builds++
    monaco.editor.defineTheme(CodeThemes.current, theme)
    monaco.editor.setTheme(CodeThemes.current)
  }

  /** Build it again before the next paint, once however many changes come in first. */
  private static soon(): void {
    if (CodeThemes.isQueued) return
    CodeThemes.isQueued = true
    requestAnimationFrame(() => {
      CodeThemes.isQueued = false
      CodeThemes.apply()
    })
  }

  /**
   * Computed colour `color` as the browser paints it, over `backdrop` if given, as Monaco takes a colour:
   * `#rrggbb`, or `#rrggbbaa` when see-through.
   * - A 1px canvas of its own:  Spell UI's (`TokenColor`) is a leaf `<spell-editor>`'s build can't share
   *   (`sharedSolid()`), and this is a few lines.
   */
  private static painted(color: string, backdrop?: string): string {
    const canvas = (CodeThemes.canvas ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 }))
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return GREY
    context.clearRect(0, 0, 1, 1)
    if (backdrop) {
      context.fillStyle = backdrop
      context.fillRect(0, 0, 1, 1)
    }
    context.fillStyle = GREY
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    return rgbToHex({ r: red! / 255, g: green! / 255, b: blue! / 255, alpha: alpha! / 255 })
  }

  /** `painted()`'s canvas, made on first use. */
  private static canvas: HTMLCanvasElement | undefined

  /**
   * Each of `tokens` as the browser computes it on `host`, by token.
   * - Every probe added first, then every one read:  the page's styles are worked out ONCE, not once a token
   *   (a notebook page of 76 examples took 2s for the 25 tokens, one at a time:  epic `notebook` P4).
   */
  private static resolved(host: Element, tokens: readonly string[]): Map<string, string> {
    const probes = tokens.map((token) => {
      const probe = document.createElement("span")
      probe.hidden = true
      probe.style.color = `var(${token})`
      return probe
    })
    host.append(...probes)
    const colors = new Map(tokens.map((token, index) => [token, getComputedStyle(probes[index]!).color]))
    for (const probe of probes) probe.remove()
    return colors
  }

  /** `register()` ran. */
  private static isRegistered = false

  /** A build is waiting for the next frame. */
  private static isQueued = false

  /** How many themes it has defined:  it takes turns between `NAMES`, so Monaco sees each as new. */
  private static builds = 0

  /** The theme last set, as text. */
  private static applied: string | undefined
}

/** What a colour that can't be painted reads as. */
const GREY = "#808080"

/** The two names the code's theme takes turns with:  Monaco redraws on a NEW theme's name. */
const NAMES = ["spell-code-a", "spell-code-b"] as const

/** The token a code role's colour is:  `--ui-code-keyword`, the text's `--ui-code-color`. */
function roleToken(role: string): string {
  return role === "text" ? "--ui-code-color" : `--ui-code-${role}`
}

/** The tokens the editor's own colours are, besides the roles'. */
const THEME_TOKENS = [
  "--ui-code-color",
  "--ui-code-cursor",
  "--ui-code-selection",
  "--ui-code-gutter-color",
  "--ui-code-gutter-active",
  "--ui-code-bracket",
  "--ui-code-find",
  "--ui-surface",
  "--ui-background"
]

/**
 * Is `change` to `<head>` only Monaco's own sheets coming and going, which change no page colour?
 * - HACK:  by their text, `.monaco-...` first, or Monaco's class, `monaco-colors`:  Monaco marks the rest with nothing.
 */
function isMonacosOwn(change: MutationRecord): boolean {
  if (change.type !== "childList") return false
  const nodes = [...change.addedNodes, ...change.removedNodes]
  return nodes.length > 0 && nodes.every(isMonacoSheet)
}

/** Is `node` a sheet Monaco added:  its class `monaco-...`, or its text starting `.monaco-`? */
function isMonacoSheet(node: Node): boolean {
  if (!(node instanceof HTMLStyleElement)) return false
  return /^monaco-/.test(node.className) || /^\s*\.monaco-/.test(node.textContent ?? "")
}
