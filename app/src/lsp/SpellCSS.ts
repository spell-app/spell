import { TextDocument } from "vscode-languageserver-textdocument"
// NOTE: `TextDocument` isn't taken from here:  node can't see this package's re-export of it
import type { CompletionList, Diagnostic, Hover, LanguageService, Position } from "vscode-css-languageservice"

import { LoadOnce } from "spell/util/LoadOnce"

/**
 * CSS inside spell:  the `<css>` blocks a type's outline holds, edited AS CSS.
 *
 * ```spell
 * a card is a view
 *   - it has a rank as a number
 *   <css>
 *     :host { display: inline-block }
 *   </css>
 * ```
 *
 * - Finds the blocks in a file's text, and answers completion, hover and errors inside them
 *   with VS Code's own CSS service, the one VS Code's HTML support uses for `<style>`.
 * - Each block is checked on its own, as a CSS document of the file's whole text
 *   with everything outside the block blanked to spaces:
 *   so a line and character in the file is the same line and character in the CSS.
 * - Works from the TEXT, line by line, not the parse:
 *   so the spell editor's instant colouring, which never parses, uses the same lines (`SpellCSS.OPEN_LINE` ...).
 * - Spell's own rule for the block is `css_block`:  it compiles the CSS to the type's class.
 * - Browser-safe, like the rest of `spell/app/lsp`.
 * - VS Code's CSS service loads on first use (`SpellCSS.load()`, epic `solid-2-final` P6):
 *   it's 180 KB brotli, and 1.25 MB to parse, that a file with no `<css>` block never needs.
 *   - finding a block starts loading it (`regionsIn()`)
 *   - until it's in, completion in a block answers no items, hover nothing, and the block no mistakes:
 *     whoever shows mistakes works them out again once it lands (`SpellCSS.load()`, the editor's `FileStates`)
 *   - the language server's own process (VS Code's) loads it at start (`server.ts`):  nothing waits there
 */
export class SpellCSS {
  /** A line that opens a CSS block:  `<css>` alone, indented to anything. */
  static OPEN_LINE = /^\s*<css>\s*$/
  /** A line that closes it:  `</css>` alone. */
  static CLOSE_LINE = /^\s*<\/css>\s*$/
  /** URI the CSS service sees for a block's document:  it reads none of it but the scheme. */
  static DOCUMENT_URI = "spell-css://block.css"

  /** VS Code's CSS service, loaded once:  `load()`, `service`. */
  private static loads = new LoadOnce<"service", LanguageService>()

  /**
   * Load VS Code's CSS service, once;  resolves to it.
   * - Its module is imported then, not before:  see the class.
   */
  static load(): Promise<LanguageService> {
    return SpellCSS.loads.get("service", async () =>
      (await import("vscode-css-languageservice")).getCSSLanguageService()
    )
  }

  /** VS Code's CSS service, once it's loaded;  `undefined` until then, and asking starts the load. */
  static get service(): LanguageService | undefined {
    const service = SpellCSS.loads.valueOf("service")
    if (!service) SpellCSS.loadSoon()
    return service
  }

  /** Is the CSS service in, so a block's answers are the real ones? */
  static get isLoaded(): boolean {
    return SpellCSS.loads.valueOf("service") !== undefined
  }

  /** Start loading the CSS service, if it isn't yet.  NEVER throws:  a failure is logged, and blocks answer nothing. */
  static loadSoon(): void {
    if (SpellCSS.loads.has("service")) return
    SpellCSS.load().catch((error: unknown) => console.error("SpellCSS:  couldn't load the CSS service", error))
  }

  /** Blocks of the text worked out last, with that text:  every request in a row asks about the same text. */
  #regionsCache: { text: string; regions: CSSRegion[] } | undefined

  /**
   * Every `<css>` block in `text`, in order.
   * - A block with no `</css>` runs to the end of the text.
   */
  static regionsIn(text: string): CSSRegion[] {
    const regions: CSSRegion[] = []
    let open: Pick<CSSRegion, "start" | "cssStart"> | undefined
    let lineStart = 0
    for (const line of text.split("\n")) {
      const lineEnd = lineStart + line.length
      if (!open) {
        if (SpellCSS.OPEN_LINE.test(line)) open = { start: lineStart, cssStart: Math.min(lineEnd + 1, text.length) }
      } else if (SpellCSS.CLOSE_LINE.test(line)) {
        regions.push({ ...open, cssEnd: lineStart, end: lineEnd })
        open = undefined
      }
      lineStart = lineEnd + 1
    }
    if (open) regions.push({ ...open, cssEnd: text.length, end: text.length })
    return regions
  }

  /**
   * Blocks in `text`, worked out once per text.
   * - SIDE EFFECT:  a block found starts loading the CSS service (`SpellCSS.loadSoon()`).
   */
  regionsIn(text: string): CSSRegion[] {
    if (this.#regionsCache?.text !== text) this.#regionsCache = { text, regions: SpellCSS.regionsIn(text) }
    const { regions } = this.#regionsCache
    if (regions.length && !SpellCSS.isLoaded) SpellCSS.loadSoon()
    return regions
  }

  /** Block whose CSS holds `offset`, if any -- NOT its `<css>` / `</css>` lines. */
  regionAt(text: string, offset: number): CSSRegion | undefined {
    return this.regionsIn(text).find((region) => region.cssStart <= offset && offset <= region.cssEnd)
  }

  /** Is `offset` anywhere in a block of `text`, its `<css>` / `</css>` lines too? */
  isInBlock(text: string, offset: number): boolean {
    return this.regionsIn(text).some((region) => region.start <= offset && offset < region.end)
  }

  /**
   * CSS completions at `position` (at `offset`) in `text`, or `undefined` outside every block.
   * - No items, marked incomplete, while the CSS service loads:  spell's own never show inside a block.
   */
  completion(text: string, offset: number, position: Position): CompletionList | undefined {
    const region = this.regionAt(text, offset)
    if (!region) return undefined
    const { service } = SpellCSS
    if (!service) return { isIncomplete: true, items: [] }
    const document = SpellCSS.documentFor(text, region)
    return service.doComplete(document, position, service.parseStylesheet(document))
  }

  /**
   * CSS hover at `position` (at `offset`) in `text`, or `undefined` outside every block.
   * - `null` while the CSS service loads.
   */
  hover(text: string, offset: number, position: Position): Hover | null | undefined {
    const region = this.regionAt(text, offset)
    if (!region) return undefined
    const { service } = SpellCSS
    if (!service) return null
    const document = SpellCSS.documentFor(text, region)
    return service.doHover(document, position, service.parseStylesheet(document))
  }

  /**
   * CSS mistakes in every block of `text`, at their place in the text.
   * - None while the CSS service loads:  work them out again once `SpellCSS.load()` resolves.
   */
  diagnostics(text: string): Diagnostic[] {
    const regions = this.regionsIn(text)
    const { service } = SpellCSS
    if (!regions.length || !service) return []
    return regions.flatMap((region) => {
      const document = SpellCSS.documentFor(text, region)
      return service.doValidation(document, service.parseStylesheet(document)) ?? []
    })
  }

  /** `region`'s CSS as a document of `text`'s length, everything else blanked to spaces, line breaks kept. */
  static documentFor(text: string, region: CSSRegion): TextDocument {
    const blank = (part: string) => part.replace(/[^\r\n]/g, " ")
    const css =
      blank(text.slice(0, region.cssStart)) +
      text.slice(region.cssStart, region.cssEnd) +
      blank(text.slice(region.cssEnd))
    return TextDocument.create(SpellCSS.DOCUMENT_URI, "css", 0, css)
  }
}

/**
 * Where one `<css>` block is in a file's text, as offsets.
 * - `start` / `end`:  the whole block, from its `<css>` line to the end of its `</css>` line
 * - `cssStart` / `cssEnd`:  the CSS between those lines
 */
export type CSSRegion = {
  /** Start of the `<css>` line. */
  start: number
  /** End of the `</css>` line, or of the text if there's none. */
  end: number
  /** Start of the line after `<css>`. */
  cssStart: number
  /** Start of the `</css>` line, or the end of the text if there's none. */
  cssEnd: number
}
