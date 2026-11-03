import { Marked, Renderer, type Tokens } from "marked"

import { clamp } from "spell/util/number"
import { slug } from "spell/util/string"
// Import directly:  see the class docs
import { SourceError } from "spell/ui/runtime/runtime.types"

import { MarkdownSource } from "./MarkdownSource"
import type { MarkdownHeading, MarkdownOptions, MarkdownResult } from "./UIMarkdown.types"

/****************
 * ### `MarkdownEngine`
 * marked, in `<ui-markdown>`'s LAZY chunk:  imported by `MarkdownRenderer` on the first render, so a page pays for it
 * only when it shows markdown.
 * - GitHub-flavoured (`gfm`):  tables, task lists, strikethrough, autolinks.
 * - Headings get GitHub's ids (the kit's `slug(text, { as: "github" })`:  lowercase, punctuation dropped,
 *   spaces to `-`;  repeats numbered here),
 *   so `[see](#setup)` links work;  `headingOffset` shifts their levels.
 * - Returns MARKUP, never sanitized:  the element sanitizes it when `sanitized`, in a chunk of its own
 *   (`MarkdownSanitizer`).
 * - The element turns code blocks into `<ui-code>` and resolves URLs.
 * - NEVER a value import but marked, `SourceError`, `MarkdownSource` (pure) and the kit's standalone `string` and
 *   `number` leaves:
 *   the docs bundler builds this file ALONE into a classic script (`MarkdownRenderer.engineLoader`).
 * - Imports `SourceError` straight from `spell/ui/runtime/runtime.types` (built into `core.js`), and USES it:
 *   a lazy chunk that needs Rolldown's helpers (`__name`, from `keepNames`) without depending on core makes Rolldown
 *   split them into a `rolldown-runtime-<hash>.js` EVERY page loads (`yarn measure`'s `runtimeChunks`;
 *   see `runtime/TemporalPolyfill.ts`).  Straight, not through `spell/ui/core`:  the docs bundler builds this file alone,
 *   and `runtime.types` is all it may pull in.
 ****************/
export class MarkdownEngine {
  /** The one engine:  static, as it keeps no state and every element shares it. */
  static readonly instance = new MarkdownEngine()

  /**
   * `text` rendered as `options` say.
   * - `places`:  each paragraph, heading, list item and table cell that can be edited in place carries
   *   `data-ui-place="<n>"`, `n` its place in `places` (`MarkdownSource`).
   */
  render(text: string, options: MarkdownOptions): MarkdownResult {
    const headings: MarkdownHeading[] = []
    const ids = new Map<string, number>()
    const marked = new Marked({
      gfm: true,
      breaks: options.breaks,
      renderer: {
        heading(token: Tokens.Heading) {
          const html = this.parser.parseInline(token.tokens)
          const plain = MarkdownEngine.plainText(html)
          const id = MarkdownEngine.unique(slug(plain, { as: "github" }), ids)
          const level = clamp(token.depth + options.headingOffset, 1, MAX_LEVEL)
          headings.push({ level, text: plain, id })
          return MarkdownEngine.placed(`<h${level} id="${id}">${html}</h${level}>\n`, token)
        },
        paragraph(token: Tokens.Paragraph) {
          return MarkdownEngine.placed(Renderer.prototype.paragraph.call(this, token), token)
        },
        listitem(item: Tokens.ListItem) {
          return MarkdownEngine.placed(Renderer.prototype.listitem.call(this, item), item)
        },
        tablecell(cell: Tokens.TableCell) {
          return MarkdownEngine.placed(Renderer.prototype.tablecell.call(this, cell), cell)
        }
      }
    })
    const tokens = marked.lexer(text)
    const places = options.places ? MarkdownSource.placesOf(tokens, text) : undefined
    const html = marked.parser(tokens)
    if (typeof html !== "string") {
      throw new SourceError("MarkdownEngine.render():  marked rendered asynchronously;  drop its async extensions", {
        cause: { kind: "render" }
      })
    }
    return { html, headings, ...(places && { places }) }
  }

  /**
   * `html`, its first tag carrying `token`'s place (`data-ui-place`), when `MarkdownSource.placesOf()` gave it one.
   * - Static:  pure.
   */
  private static placed(html: string, token: object): string {
    const place = MarkdownSource.placeOf(token)
    return place === undefined ? html : html.replace(FIRST_TAG, `$& ${PLACE_ATTRIBUTE}="${place}"`)
  }

  /**
   * `slug`, or `slug-1`, `slug-2` ... when `seen` has it already;  records it.
   * - Static:  works on `seen` only, one map per render.
   */
  private static unique(slug: string, seen: Map<string, number>): string {
    const count = seen.get(slug)
    seen.set(slug, (count ?? -1) + 1)
    return count === undefined ? slug : `${slug}-${count + 1}`
  }

  /**
   * `html`'s text:  tags dropped, entities decoded.
   * - Static:  pure.
   */
  private static plainText(html: string): string {
    const holder = document.createElement("template")
    holder.innerHTML = html
    return holder.content.textContent ?? ""
  }
}

/** The deepest heading HTML has (`<h6>`):  `headingOffset` never shifts past it. */
const MAX_LEVEL = 6

/** The attribute naming an editable piece's place, which `UIMarkdown` reads back. */
const PLACE_ATTRIBUTE = "data-ui-place"

/** A rendered block's opening tag's name:  `<p`, `<li`, `<td`. */
const FIRST_TAG = /^<[a-z][a-z0-9]*/
