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
 *   - a sheet added or changed in `<head>` (the theme bench's tuning, `PageBridge.applyCss()`)
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
    new MutationObserver(again).observe(document.head, { childList: true, subtree: true, characterData: true })
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
    const color = (token: string) => CodeThemes.painted(CodeThemes.resolved(token, host))
    const ink = Object.fromEntries(
      CodeRules.ROLES.map((role) => [role, color(role === "text" ? "--ui-code-color" : `--ui-code-${role}`).slice(1)])
    ) as CodeInk
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
        "editor.lineHighlightBackground": color("--ui-code-current-line"),
        "editor.lineHighlightBorder": color("--ui-code-current-line"),
        "editorLineNumber.foreground": color("--ui-code-gutter-color"),
        "editorLineNumber.activeForeground": color("--ui-code-gutter-active"),
        "editorBracketMatch.background": color("--ui-code-bracket"),
        "editorBracketMatch.border": color("--ui-code-bracket"),
        "editor.findMatchBackground": color("--ui-code-find"),
        "editorStickyScroll.background": CodeThemes.painted(
          CodeThemes.resolved("--ui-surface", host),
          CodeThemes.resolved("--ui-background", host)
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

  /** Token `token` as the browser computes it on `host`. */
  private static resolved(token: string, host: Element): string {
    const probe = document.createElement("span")
    probe.hidden = true
    probe.style.color = `var(${token})`
    host.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
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
