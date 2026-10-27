import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"
import { codeVocabulary } from "./UICode.en"
import { CodeHighlighter } from "./CodeHighlighter"
import { CodeLines } from "./CodeLines"
import type { Highlighted } from "./UICode.types"

import codeCSS from "./UICode.css?inline"

/****************
 * ### `DOMCodeElement`
 * The DOM element of `<ui-code>`:
 * it adds `detectedLanguage` to the source API it inherits from `DOMLoadableElement` (`content`, `save()` ...).
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMCodeElement extends E.DOMLoadableElement<UICode> {
  /**
   * What auto-detection picked (when no `language` is given);
   * `undefined` otherwise, or before the colours arrive (`ui-coloured` says when).
   * - Untracked:  it's for scripts.
   */
  @E.untracked
  get detectedLanguage(): string | undefined {
    return this.component?.detectedLanguage
  }
}

/****************
 * ### `UICode`
 * The component behind `<ui-code>`:  a block of code, coloured by language.
 *
 * - Its shadow DOM:
 *   `<div class="ui [numbered] [wrapping] code" part="box">`
 *   around an optional copy `<button>` and `<pre><code class="hljs language-x">`, one `<span class="line">` per line.
 * - The copy button is an icon (a check for a moment once it has copied);  its words ("Copy", "Copied")
 *   are its name and tooltip.
 * - The text:  the element's own (`<script type="text/plain">` keeps `<` and `&` exact),
 *   or a `source` file (see `LoadableComponent`).
 * - The colours come from highlight.js, loaded with the first highlight
 *   (`CodeHighlighter` -> `CodeEngine`, the lazy chunk):
 *   - no `language`:  guessed among the detect set
 *   - `text`:  none
 *   - a language `UI.code` knows (a page's own, e.g. spell's):  its own highlighter
 * - The code shows plain until the colours arrive.
 *   An unknown language stays plain, with a `render` `ui-error` (no message:  the code is still there).
 * - `line-numbers` (from `start`) and `wrap` are CSS:  counters, and a hanging indent per `.line`.
 * - The `<pre>` is a tab stop, named "`<language>` code", so a keyboard can scroll it.
 ****************/
export class UICode extends E.LoadableComponent<typeof codeVocabulary> {
  // typed wide, as `UIRoot`'s:  a subclass names its own (the app's `<spell-code>`)
  @E.proto static vocabulary: E.ComponentVocabulary = codeVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { code: codeCSS },
    DOMElement: DOMCodeElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Colouring
  ////////////////

  /** The latest colouring, and the code it's for. */
  @E.state accessor highlighted: (Highlighted & { code: string }) | undefined = undefined

  /** Bumped when `UI.code` gets a language:  highlight again. */
  @E.state accessor languageCount = 0

  /** Highlights started;  only the latest one's result is shown. */
  private ticket = 0

  /** The lines as HTML:  coloured once the colours for THIS text arrive, escaped plain text until then. */
  @E.derived
  get lines(): string[] {
    const text = this.textToShow
    const highlighted = this.highlighted
    return CodeLines.split(highlighted?.code === text ? highlighted.html : CodeLines.escape(text))
  }

  /** `<code>`'s HTML:  a `.line` span per line. */
  @E.derived
  get markup(): string {
    return this.lines.map((line) => `<span class="${LINE_CLASS}">${line}</span>`).join("")
  }

  /** The language shown:  as asked for (`language`), or guessed. */
  get shownLanguage(): string | undefined {
    return this.highlighted?.language ?? (this.language || undefined)
  }

  /** `hljs language-<name>`, or `hljs` for plain text. */
  private get codeClass(): string {
    const language = this.shownLanguage
    return language ? `${HLJS_CLASS} language-${language.replace("/", "-")}` : HLJS_CLASS
  }

  /** What auto-detection picked, when it ran (`DOMCodeElement.detectedLanguage`). */
  get detectedLanguage(): string | undefined {
    const highlighted = this.highlighted
    return highlighted?.detected ? highlighted.language : undefined
  }

  /** Counts `UI.code`'s new languages (`languageCount`), for the element's whole life (`this.on()` on the document). */
  constructor(...args: ConstructorParameters<typeof E.UIComponent>) {
    super(...args)
    if (!isServer) this.on(E.CODE_LANGUAGES_EVENT, () => (this.languageCount += 1), { target: document })
  }

  /** Highlight whenever the text, `language` or `UI.code`'s languages change, once the text has loaded. */
  @E.onChange("textToShow", "language", "loadStatus", "languageCount")
  protected onCodeChanged(code: string, language: string | undefined, loadStatus: E.SourceStatus) {
    if (loadStatus === "loaded") void this.highlight(code, language || undefined)
  }

  /** Colour `code` as `language`;  `ui-coloured` when done, a `render` `ui-error` (code left plain) when not. */
  @E.untracked
  private async highlight(code: string, language: string | undefined) {
    const ticket = ++this.ticket
    try {
      await UI.load()
      const result = await CodeHighlighter.highlight(code, language)
      if (ticket !== this.ticket) return
      this.highlighted = { ...result, code }
      this.send("ui-coloured", { language: result.language, detected: result.detected })
    } catch (error) {
      if (ticket !== this.ticket) return
      this.highlighted = undefined
      const kind = E.SourceError.kindFor(error, "render")
      this.sendSourceEvent("ui-error", { kind, source: this.source || undefined, error })
    }
  }

  ////////////////
  // ## Copying
  ////////////////

  /** The copy button's copy:  "Copied" for a moment after. */
  readonly clipboard = new E.ClipboardCopy()

  /** The copy button just copied:  it says "Copied", with a check.  `:state(copied)`. */
  @E.cssState("copied")
  get wasJustCopied(): boolean {
    return this.clipboard.isCopied
  }

  /** The copy button's icon:  a copy, a check for a moment once it has copied;  none without the button. */
  readonly copyGlyph = new E.IconGlyph({
    owner: this,
    name: () => (this.copy ? (this.wasJustCopied ? CHECK_ICON : COPY_ICON) : undefined)
  })

  /** The copy button's name and tooltip:  "Copy", or "Copied" for a moment. */
  private get copyLabel(): string {
    return this.wasJustCopied ? this.translationForKey("codeCopied") : this.translationForKey("codeCopy")
  }

  /** The copy button:  the code to the clipboard, `ui-copied`, "Copied" for a moment. */
  private readonly onCopy = async () => {
    const { content } = this
    if (await this.clipboard.copy(content)) this.send("ui-copied", { content })
  }

  ////////////////
  // ## Rendering
  ////////////////

  protected renderContent(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("box")}>
        <Show when={this.copy}>
          <button
            type="button"
            class={COPY_CLASS}
            part={this.partForName("copy")}
            aria-label={this.copyLabel}
            title={this.copyLabel}
            onClick={this.onCopy}
          >
            {this.copyGlyph.svg}
          </button>
        </Show>
        <pre
          part={this.partForName("pre")}
          tabindex="0"
          aria-label={
            this.shownLanguage
              ? this.translationForKey("codeLabel", { language: this.shownLanguage })
              : this.translationForKey("codeLabelPlain")
          }
          style={{ "counter-reset": `${LINE_COUNTER} ${(this.start ?? 1) - 1}` }}
        >
          <code part={this.partForName("code")} class={this.codeClass} innerHTML={this.markup} />
        </pre>
      </div>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UICode extends E.AttributeValues<typeof codeVocabulary> {}

/** Class of each line's span inside `<code>`. */
const LINE_CLASS = "line"

/** The CSS counter that numbers the lines (`UICode.css`);  `start` sets where it begins. */
const LINE_COUNTER = "line"

/** highlight.js's class on `<code>`. */
const HLJS_CLASS = "hljs"

/** Class of the copy button. */
const COPY_CLASS = "copy"

/** The copy button's icon. */
const COPY_ICON = "copy outline"

/** The copy button's icon for a moment once it has copied. */
const CHECK_ICON = "check"
