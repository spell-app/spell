import { Show } from "solid-js"
import { Dynamic, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
import { textVocabulary } from "./UIText.en"
import type { UILink } from "./UILink"

import textCSS from "./UIText.css?inline"

/****************
 * ### `UIText`
 * The component behind `<ui-text>`:  inline text in a hue, a status colour or a size.
 *
 * - Its shadow DOM is one span, `<span class="ui … text" part="text">`, around a slot for the text.
 *   - With a `link`, that box is a real link instead, `<a href>`:  a link in running text (epic `ui-gaps` P3).
 *     `disabled` drops the link:  a span again (`UIComponent.linkTo`).
 *     `<ui-link>` draws the same box (`inlineBox()`).
 *   - With `paragraph`, a `<p>` (epic `ui-gaps` P9):  a block, with the body's line height;
 *     a `link` is then an `<a>` inside it.
 * - How its letters look (epic `elemental-spell` P26):
 *   - faces, as bare attributes, any together:  `<ui-text bold italic>`
 *     - each drawn as its HTML element around the slot (`<strong>`, `<em>`, `<mark>` ...), so screen readers hear it
 *     - `font="bold italic"`, every tag's shared word, still says the same here:  either one draws it
 *   - its case:  `all-caps`, `title-caps`
 *   - a family from the theme, one at a time (`family`):  `headline`, `subhead`, `serif`, `sans-serif`,
 *     `typewriter`, by `reset.css`
 *     as on every element;  `code` as a `<code>`, in the look `<code>` has in prose
 *   - a size in pixels, `font="14"` or `font="10/20"`:  never bare (`UIComponent.sharedFontSize`)
 *   - `UIText.css` gives code, highlight and the families their look.
 * - The element is `display: contents`:  the span IS the inline box, flowing with the text around it.
 * - `:state(disabled)` is for the page's styles;  `UIText.css` keys on the `disabled` class.
 ****************/
export class UIText extends E.UIComponent<typeof textVocabulary> {
  @E.proto static vocabulary = textVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { text: textCSS },
    delegatesFocus: false,
    // `disabled`:  only a look
    disabled: "its own",
    // a real `<a>`
    link: "its own",
    cssStates: ["paragraph"]
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return (
      <Show when={this.paragraph} fallback={UIText.inlineBox(this)}>
        <p class={this.rootClass} part={this.partForName("text")}>
          <Show when={this.linkTo} fallback={UIText.styled(this.fontStates)}>
            <a href={this.linkTo} target={this.linkTarget}>
              {UIText.styled(this.fontStates)}
            </a>
          </Show>
        </p>
      </Show>
    )
  }

  ////////////////
  // ## Letters
  ////////////////

  /**
   * The faces drawn:  `font`'s words, and the bare attributes that say the same (`<ui-text bold>`);
   * and ONE family, `family`.
   */
  override get fontStates(): Record<string, boolean> {
    const faces: Record<UIT.FontFace, boolean | undefined> = {
      bold: this.bold,
      italic: this.italic,
      underline: this.underline,
      strikethrough: this.strikethrough,
      code: false,
      highlight: this.highlight,
      subscript: this.subscript,
      superscript: this.superscript,
      "all-caps": this.allCaps,
      "title-caps": this.titleCaps
    }
    const states = super.fontStates
    for (const face of UIT.FontFaces) if (faces[face]) states[`font-${face}`] = true
    const { family } = this
    for (const each of TEXT_FAMILIES) states[`font-${each}`] = each === family
    return states
  }

  /**
   * The family its letters are drawn in, the theme's:  written bare (`<ui-text serif>`) or in `font`
   * (`font="serif"`).
   * - One at a time:  written together, the first of `code`, `headline`, `subhead`, `serif`, `sans-serif`,
   *   `typewriter`.
   * - `code` is drawn as a `<code>`, in the look `<code>` has in prose;  the others by `reset.css`.
   */
  get family(): TextFamily | undefined {
    const inFont = super.fontStates
    const bare: Record<TextFamily, boolean | undefined> = {
      code: this.code,
      headline: this.headline,
      subhead: this.subhead,
      serif: this.serif,
      "sans-serif": this.sansSerif,
      typewriter: this.typewriter
    }
    return TEXT_FAMILIES.find((family) => bare[family] || inFont[`font-${family}`])
  }

  ////////////////
  // ## A paragraph's line breaks
  //
  // In a paragraph, a single line break in its text is a space, and a blank line a line break, as in Markdown
  // (Owen, 2026-10-27):  `<br>`'s place in a drawing, which holds none of the web's tags.
  ////////////////

  /** Set once its text has been read as a paragraph's (`breakLines()`):  `UIText.css` then draws its breaks. */
  @E.cssState("lines")
  @E.state
  accessor hasLineBreaks = false

  /** `paragraph`, as the element connects:  read its text as a paragraph's. */
  @E.onChange("paragraph", "isConnected")
  protected onParagraphChanged(paragraph: boolean | undefined, isConnected: boolean) {
    if (paragraph && isConnected) this.breakLines()
  }

  /** Its text changed, a paragraph's:  read it again. */
  @E.watches({ childList: true, subtree: true, characterData: true })
  protected onTextChanged() {
    if (this.paragraph) this.breakLines()
  }

  /**
   * Its text as a paragraph's:  each run of white space holding a blank line becomes one line break (`\n`),
   * every other line break a space;  drawn by `white-space: pre-line`.
   * - SIDE EFFECT:  rewrites the text nodes in its light DOM (their `data`), but a `<script>`'s or `<style>`'s.
   * - Each node once:  `BROKEN_TEXT` remembers what it wrote, so its own write (or a node already read) isn't read
   *   again, and a single `\n` it wrote stays a break.
   */
  private breakLines() {
    const walker = document.createTreeWalker(this.domElement, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (BROKEN_TEXT.get(node) === node.data || RAW_TEXT_PARENTS.has(node.parentElement?.localName ?? "")) continue
      const text = node.data.replace(BLANK_LINES, BREAK_MARK).replace(LINE_BREAK, " ").replaceAll(BREAK_MARK, "\n")
      if (text !== node.data) node.data = text
      BROKEN_TEXT.set(node, text)
    }
    this.hasLineBreaks = true
  }

  ////////////////
  // ## Drawing
  ////////////////

  /**
   * The inline box:  a real link while it links (`linkTo`, `<a href>`), else a span, around its text.
   * - Static:  `<ui-link>` draws itself with it.
   */
  static inlineBox(component: UIText | UILink): JSX.Element {
    return (
      <Dynamic
        component={component.linkTo ? "a" : "span"}
        class={component.rootClass}
        part={component.partForName("text")}
        href={component.linkTo}
        target={component.linkTarget}
      >
        {UIText.styled(component.fontStates)}
      </Dynamic>
    )
  }

  /**
   * The slot, inside the HTML element of each `font` word written, outermost first:  `<strong><em><slot>`.
   * - Static:  `<ui-link>` draws its text the same way.
   */
  static styled(states: Record<string, boolean>): JSX.Element {
    let content: JSX.Element = <slot />
    for (const word of [...UIT.FontWords].reverse()) {
      const tag = FONT_ELEMENTS[word]
      if (!tag || !states[`font-${word}`]) continue
      const inner = content
      content = <Dynamic component={tag}>{inner}</Dynamic>
    }
    return content
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIText extends E.AttributeValues<typeof textVocabulary> {}

/** What `breakLines()` wrote in each text node it read. */
const BROKEN_TEXT = new WeakMap<Text, string>()

/** A blank line, and the white space around it:  one line break. */
const BLANK_LINES = /[ \t]*\n(?:[ \t]*\n)+[ \t]*/g

/** Any other line break, and the white space around it:  a space. */
const LINE_BREAK = /[ \t]*\n[ \t]*/g

/** Where a blank line was, while the single line breaks become spaces. */
const BREAK_MARK = "\u0000"

/** Elements whose text is never a paragraph's. */
const RAW_TEXT_PARENTS = new Set(["script", "style"])

/** The families `<ui-text>` takes, one at a time, the first written winning (`family`). */
const TEXT_FAMILIES = ["code", ...UIT.FontFamilies] as const

/** One of them. */
type TextFamily = (typeof TEXT_FAMILIES)[number]

/**
 * The HTML element each `font` word draws inside running text.
 * - `underline` has none that means it (`<u>` means "misspelt"):  only the look, from `reset.css`.
 */
const FONT_ELEMENTS: Partial<Record<UIT.FontWord, string>> = {
  bold: "strong",
  italic: "em",
  strikethrough: "s",
  code: "code",
  highlight: "mark",
  subscript: "sub",
  superscript: "sup"
}
