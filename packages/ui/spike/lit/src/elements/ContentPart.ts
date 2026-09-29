import { nothing, type TemplateResult } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"
import { html, literal, type StaticValue } from "lit/static-html.js"

import { proto } from "$/util"
import type { OwnerMatch } from "$/elements"

import type { PartBox } from "./elements.types"
import { OwnerController } from "./OwnerController"
import { UIElement } from "./UIElement"

/**
 * Base of the generic content parts (`<ui-content>`, `<ui-header>`, `<ui-meta>` ...):  ONE element per part
 * word, styled by its OWNER, never `ui-card-header`.
 * - Owner:  an `OwnerController` for the vocabulary's noun finds the nearest component whose `ownsParts`
 *   lists it (climbing slots and shadow roots, stopping at any other registered component) and sets
 *   `:state(in-<owner>)`;  `parts.css` keys every context rule on that state.
 * - Markup:  `<div class="<noun> [keyOnly ...]" part="<noun>"><slot></slot></div>`;  `@proto static box`
 *   picks `span` / `time`, and an `href` property (author, title, header) makes it an `<a>`.
 * - `--ui-part`:  declared on each part ROOT by `parts.css` (`.meta { --ui-part: meta }`), so parts nested in
 *   parts (a date in a summary) can style-query it;  the element adds nothing.
 * - Sheets:  none here.  The parts folder binds `parts.css` in `PartElement`;  the core stays CSS-free.
 */
export class ContentPart extends UIElement {
  /** element the root renders, unless an `href` makes it an `<a>` */
  declare box: PartBox

  @proto static contentPart = true
  @proto static box: PartBox = "div"

  /** owner lookup;  `this.owner` is its current match */
  protected readonly ownerContext: OwnerController

  constructor() {
    super()
    this.ownerContext = new OwnerController(this, this.vocabulary.noun)
  }

  /** Nearest owner, `undefined` when standalone. */
  get owner(): OwnerMatch | undefined {
    return this.ownerContext.owner
  }

  protected override render() {
    return this.renderBox(this.classes(), this.renderContent())
  }

  /** What goes inside the root:  the default slot. */
  protected renderContent(): TemplateResult {
    return html`<slot></slot>`
  }

  /**
   * The part's root around `content`:  `box` (or `<a>` with `href`), with `classes` and `part`.
   * - `extra` adds ARIA / `datetime` / `tabindex` attributes;  undefined ones are left off.
   */
  protected renderBox(classes: string, content: unknown, extra: BoxAttributes = {}, box?: PartBox) {
    const { href, target } = this as { href?: string; target?: string }
    const tag = href ? TAGS.a : TAGS[box ?? this.box]
    return html`<${tag}
      class=${classes}
      part=${this.partName(this.vocabulary.noun as never)}
      href=${ifDefined(href || undefined)}
      target=${ifDefined(href ? target || undefined : undefined)}
      datetime=${ifDefined(extra.datetime)}
      role=${ifDefined(extra.role)}
      aria-level=${ifDefined(extra.ariaLevel)}
      tabindex=${ifDefined(extra.tabindex)}
      >${content ?? nothing}</${tag}
    >`
  }
}

/** Optional attributes of a part's root. */
type BoxAttributes = {
  datetime?: string
  role?: string
  ariaLevel?: string
  /** `"0"` for a scrolling box, so keyboard users can scroll it */
  tabindex?: string
}

/** Static tag literals for `renderBox()`:  Lit needs a `literal` to vary a tag name. */
const TAGS: Record<PartBox | "a", StaticValue> = {
  div: literal`div`,
  span: literal`span`,
  time: literal`time`,
  a: literal`a`,
  h1: literal`h1`,
  h2: literal`h2`,
  h3: literal`h3`,
  h4: literal`h4`,
  h5: literal`h5`,
  h6: literal`h6`
}
