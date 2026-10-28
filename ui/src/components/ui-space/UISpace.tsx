import type { JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
import { spaceVocabulary } from "./UISpace.en"

import spaceCSS from "./UISpace.css?inline"

/****************
 * ### `<ui-space>`
 * The component behind `<ui-space>`:  a gap between things, a line break by default (epic `elemental-spell` P28).
 *
 * - Bare, a block with no size:  what follows starts on a new line, as a `<br>` does.
 *   A drawing has no `<br>`, so `<space/>` is its line break.
 * - `inline`:  a gap inside the line instead;  `width` / `height` its size;
 *   `fluid`, `grow`, `shrink`:  how it takes or gives back the room in its row or column.
 * - No look, and nothing inside:  the shadow root is empty.
 * - Its attributes become one `:host` rule of its own (`hostLayout`, written by `UIComponent`),
 *   so the page's own `style` stays the author's.
 ****************/
export class UISpace extends E.UIComponent<typeof spaceVocabulary> {
  @E.proto static vocabulary = spaceVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { space: spaceCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its `:host` rule:  inline or a break, its size, how it grows and shrinks. */
  @E.derived
  protected get hostLayout(): string {
    const rules: string[] = []
    if (this.inline) rules.push("display: inline-block", `inline-size: ${INLINE_WIDTH}`)
    const width = UISpace.lengthFor(this.width)
    if (width) rules.push(`inline-size: ${width}`)
    const height = UISpace.lengthFor(this.height)
    if (height) rules.push(`block-size: ${height}`)
    const grow = UISpace.factorFor(this.grow) ?? (this.fluid ? 1 : undefined)
    if (grow !== undefined) rules.push(`flex-grow: ${grow}`)
    const shrink = UISpace.factorFor(this.shrink) ?? (this.fluid ? 1 : undefined)
    if (shrink !== undefined) rules.push(`flex-shrink: ${shrink}`)
    return rules.join(";  ")
  }

  render(): JSX.Element {
    return null
  }

  /**
   * `width` / `height` as CSS:  a number is pixels (`20` => `20px`), a space step its token (`md` =>
   * `var(--ui-space-m)`), anything else a CSS length as written (`2em`, `50%`);  `undefined` when unset.
   * - A value that could end the rule (`;`, `{`, `}`) is left out:  it's written into a style sheet.
   */
  static lengthFor(value: string | undefined): string | undefined {
    const text = value?.trim()
    if (!text || /[;{}]/.test(text)) return undefined
    if (NUMBER.test(text)) return `${text}px`
    return UIT.SpaceSteps[text as UIT.SpaceStep] ?? text
  }

  /**
   * `grow` / `shrink` as a flex factor:  bare (or `true`, `yes`) is 1, a number itself, `false` / `no` 0;
   * `undefined` when unset, or for anything else.
   */
  static factorFor(value: string | undefined): number | undefined {
    if (value === undefined || value === null) return undefined
    const text = String(value).trim()
    if (text === "" || /^(true|yes)$/i.test(text)) return 1
    if (/^(false|no)$/i.test(text)) return 0
    return NUMBER.test(text) ? Number(text) : undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UISpace extends E.AttributeValues<typeof spaceVocabulary> {}

/** A bare number:  pixels for a size, a factor for `grow` / `shrink`. */
const NUMBER = /^\d+(\.\d+)?$/
/** An `inline` space's width when `width` says none:  about a space character's. */
const INLINE_WIDTH = "0.25em"
