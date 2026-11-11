import * as vscode from "vscode"
import type { LanguageClient } from "vscode-languageclient/node"

import values from "spell/app/app/components/spell-code/bubbly.values.json"

import { RunnerPanel } from "./RunnerPanel"

/****************
 * ### `BubblyDecorations`
 * Spell in VS Code's own editor drawn in as much of the BUBBLY LOOK as VS Code allows (epic `language` P51),
 * its text still ordinary text to edit, find and select.
 * - Each stretch's weight, slant and ink:  references semibold, a name's first mention bold, marks and comments faint,
 *   a comment italic, a phrase or a quantity dotted under.
 * - A pill round what a person typed:  a background in its band's colour, rounded corners, an edge in its hue;
 *   a little room beside it, a space of its own before and after it (a decoration's attachment), NEVER padding on
 *   the text, which would move the caret off its letters.
 * - The layout is the language server's (`spell/bubbly`):  the same layout and stretches as the app's Monaco editor
 *   (`SP.BubblyLayout`, `SP.BubblyStretches`), so how each rule presents is `SP.BubblyPresentation`'s, not ours.
 * - Its colours, weights and sizes are the look's one sheet's, `bubbly.css`:  VS Code can't load CSS, so they come
 *   from its generated table, `bubbly.values.json`, bundled in when the extension is built.
 *   - Light or dark:  VS Code picks each decoration's `light` or `dark` half by the colour theme's kind.
 *   - A change to the sheet shows here after `scripts/bubbly-values.ts` and a rebuild (`spell app vscode`).
 * - What VS Code can't draw, so it's left out:  a declaration's band, gutter and foot, a control line's bracket, the
 *   gap between declarations, the curly quote marks (a quoted input's own `"` stay, faint).
 * - On by default;  the `spell.bubblyLook` setting turns it off, and back on, in every open editor at once.
 * - Laid out again `RELAYOUT_MSEC` after the typing pauses;  till then VS Code moves the decorations with the text.
 * - NEVER throws:  a request that fails leaves the file as the language server colours it, and logs why.
 ****************/
export class BubblyDecorations {
  /** Draw every Spell editor bubbly, from `client`'s layouts, while the setting says so. */
  static register(context: vscode.ExtensionContext, client: LanguageClient): void {
    const drawing = new BubblyDecorations(client)
    context.subscriptions.push(
      drawing,
      vscode.window.onDidChangeVisibleTextEditors(() => drawing.refreshAll()),
      vscode.workspace.onDidChangeTextDocument(({ document, contentChanges }) => {
        if (contentChanges.length) drawing.refreshSoon(document)
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(SETTING)) drawing.refreshAll()
      })
    )
    drawing.refreshAll()
  }

  /** Each style's decoration type, made as it's first needed, by its key (`styleKey()`). */
  private readonly types = new Map<string, vscode.TextEditorDecorationType>()

  /** Pending layouts, by document URI. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  private constructor(private readonly client: LanguageClient) {}

  /** Is the look on?  The `spell.bubblyLook` setting, on by default. */
  get isOn(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>(SETTING, true)
  }

  /** Lay out and decorate every visible editor again:  or clear them all, if the look is off. */
  refreshAll(): void {
    for (const editor of vscode.window.visibleTextEditors) void this.refresh(editor)
  }

  /** Lay `document` out again once the typing pauses. */
  refreshSoon(document: vscode.TextDocument): void {
    if (!RunnerPanel.isSpellDocument(document) || !this.isOn) return
    const key = document.uri.toString()
    clearTimeout(this.timers.get(key))
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key)
        for (const editor of vscode.window.visibleTextEditors)
          if (editor.document === document) void this.refresh(editor)
      }, RELAYOUT_MSEC)
    )
  }

  /**
   * Ask for `editor`'s layout and decorate it;  clear it when the look is off.
   * - An answer for an older version of its text is dropped:  the next layout is on its way.
   * - NEVER throws.
   */
  async refresh(editor: vscode.TextEditor): Promise<void> {
    const { document } = editor
    if (!RunnerPanel.isSpellDocument(document)) return
    if (!this.isOn) return this.decorate(editor, [])
    const { version } = document
    try {
      const stretches = await this.client.sendRequest<BubblyRange[]>("spell/bubbly", { uri: document.uri.toString() })
      if (document.version === version && !editor.document.isClosed) this.decorate(editor, stretches)
    } catch (error) {
      this.client.warn("BubblyDecorations.refresh():  couldn't lay the code out", error, false)
    }
  }

  /** Decorate `editor` with `stretches`, clearing every style it doesn't use. */
  private decorate(editor: vscode.TextEditor, stretches: BubblyRange[]) {
    const byStyle = new Map<string, vscode.Range[]>()
    for (const stretch of stretches) {
      const key = styleKey(stretch)
      const { start, end } = stretch.range
      let ranges = byStyle.get(key)
      if (!ranges) byStyle.set(key, (ranges = []))
      ranges.push(new vscode.Range(start.line, start.character, end.line, end.character))
      if (!this.types.has(key)) this.types.set(key, vscode.window.createTextEditorDecorationType(optionsFor(stretch)))
    }
    for (const [key, type] of this.types) editor.setDecorations(type, byStyle.get(key) ?? [])
  }

  /** Stop:  every decoration type disposed, which clears it from every editor. */
  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer)
    for (const type of this.types.values()) type.dispose()
    this.types.clear()
  }
}

////////////////
// ## Styles
////////////////

/**
 * One stretch of the file, as the language server's `spell/bubbly` answers:  its `LSP.BubblyRange`.
 * - Written out here:  the extension runs the server as a process, and never imports its code.
 */
export type BubblyRange = {
  /** where it is, 0-based */
  range: { start: { line: number; character: number }; end: { line: number; character: number } }
  /** what it is to a reader:  `SP.BubblyStretchKind` */
  kind: string
  /** on a declaration's band of this part of speech:  `thing`, `action`, `property` or `plain` */
  partOfSpeech?: string
  /** the name its head defines */
  isName?: boolean
}

/** Which decoration type `stretch` takes:  stretches with the same key look the same. */
export function styleKey({ kind, partOfSpeech, isName }: BubblyRange): string {
  if (!PILLS.has(kind)) return kind
  return `${kind}:${partOfSpeech ?? "plain"}${isName ? ":name" : ""}`
}

/** How `stretch` is drawn, in the sheet's values, light and dark. */
export function optionsFor({ kind, partOfSpeech = "plain", isName }: BubblyRange): vscode.DecorationRenderOptions {
  const ink = INK[kind] ?? "ink"
  const look: vscode.DecorationRenderOptions = {
    light: { color: setting(INK_SETTINGS[ink], "light") },
    dark: { color: setting(INK_SETTINGS[ink], "dark") },
    ...(WEIGHTS[kind] ? { fontWeight: WEIGHTS[kind] } : {}),
    ...(kind === "comment" ? { fontStyle: "italic" } : {})
  }
  if (kind === "phrase" || kind === "quantity") {
    look.light!.textDecoration = `underline dotted ${setting("--bubbly-faint", "light")}`
    look.dark!.textDecoration = `underline dotted ${setting("--bubbly-faint", "dark")}`
  }
  if (!PILLS.has(kind)) return look

  // what a person typed:  a pill in its band's colour, an edge in its hue, room either side
  const part = values.parts[partOfSpeech as keyof typeof values.parts] ?? values.parts.plain
  const hue = setting(`--bubbly-${partOfSpeech}`, "light")
  const isBold = isName || kind === "choice"
  const color = isBold ? "--bubbly-bold-ink" : "--bubbly-ink"
  const room = { contentText: ROOM }
  return {
    light: { color: setting(color, "light"), backgroundColor: part["--bubbly-pill"].light },
    dark: { color: setting(color, "dark"), backgroundColor: part["--bubbly-pill"].dark },
    ...(isBold ? { fontWeight: setting("--bubbly-bold", "light") } : {}),
    borderRadius: PILL_RADIUS,
    border: `1px solid ${hue}${PILL_EDGE_ALPHA}`,
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    before: room,
    after: room
  }
}

/** The setting that turns the look on and off. */
const SETTING = "spell.bubblyLook"

/** How long after the last edit to lay the code out again, in msec:  as Monaco's (`SpellBubbly`). */
const RELAYOUT_MSEC = 300

/** The stretches drawn as a pill:  what a person typed, and each value a list declares. */
const PILLS = new Set(["input", "choice"])

/** Which ink each stretch is in;  any other, the plain ink. */
const INK: Record<string, keyof typeof INK_SETTINGS> = {
  mark: "faint",
  "heading-mark": "faint",
  "quote-open": "faint",
  "quote-close": "faint",
  comment: "faint",
  heading: "bold",
  reference: "bold",
  "first-mention": "bold",
  constant: "bold"
}

/** Each ink's setting in the sheet. */
const INK_SETTINGS = { ink: "--bubbly-ink", bold: "--bubbly-bold-ink", faint: "--bubbly-faint" }

/** Each stretch's weight, as the sheet's rules give it:  a heading's is the sheet's own 700. */
const WEIGHTS: Record<string, string> = {
  heading: "700",
  reference: setting("--bubbly-semibold", "light"),
  constant: setting("--bubbly-semibold", "light"),
  "first-mention": setting("--bubbly-bold", "light")
}

/**
 * A pill's corners:  smaller than the page's, whose pill has room inside it.
 * - Here the pill is the text's own background, tight round its letters:  the page's round ends would cut into them.
 */
const PILL_RADIUS = "5px"

/** How see-through a pill's edge is, as a hex alpha on its hue. */
const PILL_EDGE_ALPHA = "66"

/** The room either side of a pill:  a no-break space, as Monaco's (`BubblyMarks`). */
const ROOM = " "

/** Setting `name` of the sheet in `scheme`. */
function setting(name: string, scheme: "light" | "dark"): string {
  return (values.settings as Record<string, { light: string; dark: string }>)[name]?.[scheme] ?? ""
}
