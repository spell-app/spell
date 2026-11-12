import {
  BubblyMarkup,
  type MarkupElement,
  type MarkupEndTag,
  type MarkupNode,
  type MarkupPartOfSpeech,
  type MarkupStartTag
} from "spell/app/app/components/spell-code/BubblyMarkup"
import type { monaco } from "./monaco"
import { TextMarks, spacer, type Spacers } from "./TextMarks"
import type { BubblyInputShape } from "./BubblyMarks"

/****************
 * ### `MarkupMarks`
 * What Monaco draws of an HTML file in the bubbly look (epic `language`), as the drawn-bubbly page draws it
 * (`BubblyMarkup`):  the MARKS on the text, and the SHAPES drawn under it.
 * - From the same reading as the page's, `BubblyMarkup.treeOf()`, so both see the same elements:
 *   - an element with what's inside it on lines of its own:  a block, its start tag the band, an end tag that starts
 *     its line a band of its own under the rail
 *   - an element alone on its line with no end tag (`<meta …>`), and a doctype:  a band by itself
 *   - any other tag:  a small pill of its own, in its line
 * - Marks:
 *   - a tag's `<` and `>` drawn as `⟨` `⟩` over the file's own, which keep their width;  its `/`, name and
 *     attributes' names, as the page draws them
 *   - each attribute's value a white pill, a quoted one's `"` see-through, its curly mark drawn over it
 *   - SPACERS (`TextMarks`):  room either side of a tag in a line and of a value, before a block's start tag, and
 *     before a line of text, so it sits in from the tags beside it, as on the page
 * - Shapes are placed by `SpellBubbly`, from where Monaco draws each line and letter.
 * - Pure data:  Monaco's TYPES only, so it's tested without an editor.
 ****************/
export class MarkupMarks extends TextMarks {
  /** `source`'s marks and shapes:  an HTML file or fragment. */
  static of(source: string): MarkupMarks {
    return new MarkupMarks(source, { from: 0, to: source.length, isInSpell: false })
  }

  /**
   * The tags of a Spell drawing's lines, from `from` to `to` in `text`, its file:  marked into `marks`, Spell's;
   * the lines themselves are Spell's to mark, at their own indent.
   */
  static within(text: string, from: number, to: number, marks: monaco.editor.IModelDeltaDecoration[]): MarkupMarks {
    return new MarkupMarks(text, { from, to, isInSpell: true }, marks)
  }

  /** The shapes at the top of the drawing, each holding those inside it. */
  readonly shapes: MarkupShape[] = []

  /** Where each tag is:  a Spell drawing leaves them to these marks.  Not a `{…}` value in one:  that's Spell. */
  readonly tags: Array<{ start: number; end: number }> = []

  /** Lines of Spell, whose own marks are Spell's:  no spacers before them or a block's start tag. */
  private readonly isInSpell: boolean

  private constructor(
    source: string,
    { from, to, isInSpell }: { from: number; to: number; isInSpell: boolean },
    marks?: monaco.editor.IModelDeltaDecoration[]
  ) {
    super(source, marks)
    this.isInSpell = isInSpell
    this.nodes(BubblyMarkup.treeOf(source, from, to), this.shapes)
  }

  ////////////////
  // ## The file's nodes
  ////////////////

  /** Mark `nodes`, adding their shapes to `into`. */
  private nodes(nodes: MarkupNode[], into: MarkupShape[]) {
    for (const node of nodes) {
      if (node.kind === "element") this.element(node, into)
      else if (node.kind === "doctype") this.doctype(node, into)
      else if (!this.isInSpell) this.lines(node, node.kind === "comment" ? COMMENT : "")
    }
  }

  /**
   * An element:  a block when what's inside it is on lines of its own;  else its tags pills in its line, or a band by
   * itself when it's one tag alone on its line.
   */
  private element(element: MarkupElement, into: MarkupShape[]) {
    const { open, close } = element
    const partOfSpeech = BubblyMarkup.partOfSpeechOf(element.tag)
    const hasInside = element.children.some((child) => child.kind !== "text" || this.slice(child).trim())
    if (!hasInside && !close) {
      if (this.startsLine(open.start) && this.endsLine(open.end)) this.alone(open, partOfSpeech, into)
      else this.tagPill(open, { partOfSpeech, side: "start" }, into)
      return
    }
    if (!close || !this.slice({ start: open.end, end: close.start }).includes("\n")) {
      // one line:  each tag a pill;  nothing between them, their points touch
      const touch = !hasInside
      this.tagPill(open, { partOfSpeech, side: "start", touch }, into)
      this.nodes(element.children, into)
      if (close) this.tagPill(close, { partOfSpeech, side: "end", touch }, into)
      return
    }
    const footStartsLine = this.startsLine(close.start)
    const block: MarkupBlockShape = {
      kind: "markup-block",
      place: this.place(open.start, close.end),
      head: this.place(open.start, open.end),
      partOfSpeech,
      inside: []
    }
    into.push(block)
    if (!this.isInSpell && this.startsLine(open.start))
      this.mark(open.start, open.start + 1, "", { before: spacer("head", "before") })
    this.startTag(open, block.inside)
    this.nodes(element.children, block.inside)
    if (footStartsLine) {
      block.foot = this.place(close.start, close.end)
      this.endTag(close, "block")
    } else this.tagPill(close, { partOfSpeech, side: "end" }, block.inside)
  }

  /** `<!doctype html>`:  a band by itself, its `<` and `>` drawn as the tags' are. */
  private doctype(node: { start: number; end: number }, into: MarkupShape[]) {
    into.push({
      kind: "tag",
      place: this.place(node.start, node.end),
      partOfSpeech: "plain",
      side: "start",
      isAlone: true
    })
    this.tags.push({ start: node.start, end: node.end })
    this.mark(node.start, node.start + 1, ANGLE_OPEN)
    this.mark(node.end - 1, node.end, ANGLE_CLOSE)
  }

  /** A tag alone on its line, with no end tag (`<meta …>`):  a band by itself. */
  private alone(tag: MarkupStartTag, partOfSpeech: MarkupPartOfSpeech, into: MarkupShape[]) {
    into.push({ kind: "tag", place: this.place(tag.start, tag.end), partOfSpeech, side: "start", isAlone: true })
    this.startTag(tag, into)
  }

  /**
   * A tag in a line:  a small pill of its own, with room either side for it, but at the line's start or end.
   * - `touch`:  it's an empty element's, its points touching its other tag's
   */
  private tagPill(
    tag: MarkupStartTag | MarkupEndTag,
    { partOfSpeech, side, touch = false }: { partOfSpeech: MarkupPartOfSpeech; side: "start" | "end"; touch?: boolean },
    into: MarkupShape[]
  ) {
    const spaced: MarkupTagShape["spaced"] = this.startsLine(tag.start)
      ? "none"
      : touch && side === "end"
        ? "touch"
        : "gap"
    const spacers: Spacers = {}
    if (spaced !== "none") spacers.before = spacer(spaced === "touch" ? "touch" : "tag", "before")
    if (!this.endsLine(tag.end)) spacers.after = spacer(touch && side === "start" ? "touch" : "tag", "after")
    // the room either side, and the pill's place:  the whole tag
    const place = this.mark(tag.start, tag.end, "", spacers)
    into.push({ kind: "tag", place, partOfSpeech, side, isAlone: false, spaced })
    if (tag.kind === "start") this.startTag(tag, into)
    else this.endTag(tag, "inline")
  }

  /** Lines of text or a comment, each that starts its line a spacer in from the tags beside it;  `classes`:  their marks. */
  private lines(node: { start: number; end: number }, classes: string) {
    let at = node.start
    for (const line of this.slice(node).split("\n")) {
      const first = line.search(/\S/)
      if (first >= 0) {
        const start = at + first
        const end = at + line.trimEnd().length
        const spacers: Spacers = this.startsLine(start) ? { before: spacer("line", "before") } : {}
        if (classes || spacers.before) this.mark(start, end, classes, spacers)
      }
      at += line.length + 1
    }
  }

  ////////////////
  // ## Tags
  ////////////////

  /** A start tag's pieces:  its brackets, name and attributes;  a pill under each value, into `into`. */
  private startTag(tag: MarkupStartTag, into: MarkupShape[]) {
    const { start, end } = tag
    let from = start
    this.mark(start, start + 1, ANGLE_OPEN)
    this.mark(start + 1, start + 1 + tag.tag.length, TAG_NAME)
    for (const attribute of tag.attributes) {
      if (attribute.name) {
        const nameEnd = attribute.nameStart + attribute.name.length
        this.mark(attribute.nameStart, nameEnd, ATTRIBUTE_NAME, { before: spacer("attribute", "before") })
      }
      if (attribute.equalsAt !== undefined && attribute.equalsAt >= 0)
        this.mark(attribute.equalsAt, attribute.equalsAt + 1, EQUALS, { before: spacer("equals", "before") })
      if (attribute.valueStart === undefined) continue
      // a `{…}` value is Spell's to mark:  not the tag's
      if (attribute.isExpression) {
        this.tags.push({ start: from, end: attribute.valueStart })
        from = attribute.valueEnd!
      } else this.value(attribute.valueStart, attribute.valueEnd!, attribute.isQuoted, into)
    }
    this.tags.push({ start: from, end })
    if (tag.selfClosing) this.mark(end - 2, end - 1, SLASH)
    this.mark(end - 1, end, ANGLE_CLOSE)
  }

  /** An end tag's pieces;  `"block"`:  a block's, its name faint as its marks are, as the page draws it. */
  private endTag(tag: MarkupEndTag, place: "block" | "inline") {
    const { start, end } = tag
    this.tags.push({ start, end })
    this.mark(start, start + 1, ANGLE_OPEN)
    this.mark(start + 1, start + 2, SLASH)
    this.mark(start + 2, start + 2 + tag.tag.length, place === "block" ? `${MARK} ${END_NAME}` : END_NAME)
    this.mark(end - 1, end, ANGLE_CLOSE)
  }

  /** An attribute's value:  its words with a spacer either side, a pill under them;  a quoted one's marks outside. */
  private value(start: number, end: number, isQuoted: boolean, into: MarkupShape[]) {
    if (isQuoted) {
      this.mark(start - 1, start, `${QUOTE_MARK} bubbly-quote-open`, { before: spacer("quote", "before") })
      this.mark(end, end + 1, `${QUOTE_MARK} bubbly-quote-close`, { after: spacer("quote", "after") })
    }
    const place = this.mark(start, end, INPUT, { before: spacer("input", "before"), after: spacer("input", "after") })
    if (place >= 0) into.push({ kind: "input", place, isChoice: false, isQuoted })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The text of `node`. */
  private slice({ start, end }: { start: number; end: number }): string {
    return this.text.slice(start, end)
  }

  /** Is only space before `offset` on its line? */
  private startsLine(offset: number): boolean {
    const lineStart = this.text.lastIndexOf("\n", offset - 1) + 1
    return !this.text.slice(lineStart, offset).trim()
  }

  /** Is only space after `offset` on its line? */
  private endsLine(offset: number): boolean {
    const lineEnd = this.text.indexOf("\n", offset)
    return !this.text.slice(offset, lineEnd < 0 ? undefined : lineEnd).trim()
  }
}

////////////////
// ## Types and helpers
////////////////

/** A shape `SpellBubbly` draws under an HTML file's text. */
export type MarkupShape = MarkupBlockShape | MarkupTagShape | BubblyInputShape

/** An element with what's inside it on lines of its own:  its band, gutter, body, and its end tag's band. */
export type MarkupBlockShape = {
  kind: "markup-block"
  /** the mark from its start tag's `<` to its end tag's `>` */
  place: number
  /** the mark on its start tag */
  head: number
  /** the mark on its end tag, when it starts its line:  a band under the rail;  else the end tag is a pill in its line */
  foot?: number
  /** its bands' colour */
  partOfSpeech: MarkupPartOfSpeech
  /** the pills on its start tag, and the shapes in its body */
  inside: MarkupShape[]
}

/** A tag:  a small pill in its line (`bubbly-tag-pill`), or a band by itself, alone on its line (`bubbly-pill`). */
export type MarkupTagShape = {
  kind: "tag"
  /** the mark on the tag */
  place: number
  /** its colour */
  partOfSpeech: MarkupPartOfSpeech
  /** a start tag's, or an end tag's */
  side: "start" | "end"
  /** alone on its line:  a band */
  isAlone: boolean
  /** the room injected before it:  none at its line's start, less when its point touches the tag before it */
  spaced?: "none" | "gap" | "touch"
}

/** A tag's `<` and `>`, drawn as `⟨` `⟩` over the file's own, faint. */
const MARK = "bubbly-mark"
const ANGLE_OPEN = `${MARK} bubbly-angle bubbly-angle-open`
const ANGLE_CLOSE = `${MARK} bubbly-angle bubbly-angle-close`

/** An end tag's `/`, and `<br />`'s. */
const SLASH = `${MARK} bubbly-slash`

/** A tag's name, and its attributes' names. */
const TAG_NAME = "bubbly-tag-name"
const ATTRIBUTE_NAME = "bubbly-attribute-name"

/** An end tag's name:  not bold, as the page draws it (its `.bubbly-tag-end` holds it there). */
const END_NAME = `${TAG_NAME} bubbly-tag-end`

/** An attribute's `=`. */
const EQUALS = `${MARK} bubbly-equals`

/** A value's words:  a white pill under them. */
const INPUT = "bubbly-input"

/** A quoted value's own `"`:  see-through, its curly mark drawn over it. */
const QUOTE_MARK = "bubbly-quote-mark"

/** A comment's lines:  faint. */
const COMMENT = "bubbly-comment"
