/**
 * A notebook's code in its two VIEWS (epic `elemental-spell` P16, Owen 2026-10-25;  html dropped in P25):
 * spellx and spell.
 * - `spellx`:  as written, `<button>`, `<counter/>`.
 * - `spell`:  the code spell it reads as (`SX.CodeSpellWriter`'s):  an example's markup with each bare name as its
 *   element's tag, `<ui-button>`, `<counter-counter/>` (`writeMarkup()`), a template's outline.
 *   - A drawing's whole code in the spell view:  its tags, each `</>` naming what it closes (`withTags()`).
 * - The tag for a bare name is the one the file's last compile chose (`tagFor`):  the project's own views, then its
 *   packs' components, as `SpellJSX.componentTagFor()` chooses.
 * - An edit in the spell view is turned back into spellx before it's saved (`toSpellx()`):  each tag that is a bare
 *   name's becomes that name again;  anything else (a `ui-*` tag no bare name gives, an attribute, an `<html>`
 *   block's markup) stays as written.
 * - Pure text:  no parser, no Solid.
 */
export class NotebookCode {
  /** `markup` (spellx) with each bare name's tag, and each closer naming what it closes. */
  static withTags(markup: string, tagFor: (word: string) => string | undefined): string {
    const open: string[] = []
    return markup.replace(TAG, (whole, slash: string, name: string, rest: string) => {
      if (!name) return slash ? `</${open.pop() ?? ""}>` : whole
      const tag = BARE.test(name) ? (tagFor(name) ?? name) : name
      if (slash) {
        open.pop()
        return `</${tag}>`
      }
      if (!/\/\s*>$/.test(rest)) open.push(tag)
      return `<${tag}${rest}`
    })
  }

  /**
   * `markup` (the spell view's) with each tag a bare name gives as that name again:  its spellx.
   * - An `<html>` block's markup stays as written:  the web's own tags, which spellx reads there as they are.
   */
  static toSpellx(markup: string, wordFor: (tag: string) => string | undefined): string {
    return markup
      .split(HTML_BLOCK)
      .map((part, index) =>
        // the split keeps each `<html>` block at an odd index
        index % 2
          ? part
          : part.replace(TAG, (whole, slash: string, name: string, rest: string) => {
              if (!name) return whole
              const word = wordFor(name) ?? name
              return slash ? `</${word}>` : `<${word}${rest}`
            })
      )
      .join("")
  }
}

/** The views a notebook shows its code in. */
export const CODE_VIEWS = ["spellx", "spell"] as const

/** One of `CODE_VIEWS`. */
export type CodeView = (typeof CODE_VIEWS)[number]

/**
 * A tag in markup:  its slash (a closer), its name (none for `</>`), and the rest of its head up to its `>`.
 * - The rest skips quoted values and `{...}` holes, which may hold `>`.
 */
const TAG = /<(\/?)([\p{L}][\p{L}\p{N}_.-]*)?((?:"[^"]*"|\{[^}]*\}|[^>"{])*>)/gu

/** An `<html>` block, to its `</html>`:  a capture, so `split()` keeps it. */
const HTML_BLOCK = /(<html>[\s\S]*?<\/html>)/

/** A component's bare name, `button`, `botón`:  lower-case letters only, as `SpellJSX` reads one. */
const BARE = /^\p{Ll}+$/u
