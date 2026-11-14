import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
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
 *     its line, named or `</>`, a TINY pill at the rail's turn, its letters tiny, its line only the pill's row tall
 *     (Owen, Q61;  `SpellBubbly` shortens its line)
 *   - an element alone on its line with no end tag (`<meta …>`), and a doctype:  a band by itself
 *   - an element with nothing between its tags:  ONE pill over both, drawn as if self-closed, `/⟩`, its end tag's
 *     `<` and name hidden (Owen, Q62)
 *   - any other tag:  a small pill of its own, in its line;  a one-line element with something between its tags, a
 *     line linking its two pills too, between them (`MarkupLinkShape`)
 *   - a start tag on lines of its own:  its shape's place spans them, drawn as ONE tall band
 * - Marks:
 *   - a tag's `<` and `>` drawn as `⟨` `⟩` over the file's own, which keep their width;  its `/`, name and
 *     attributes' names, as the page draws them
 *   - each attribute's value a white pill, a quoted one's `"` see-through, its curly mark drawn over it;
 *     a `{…}` one's (Spell, worked out as it runs) an inverted pill, its braces darker
 *   - SPACERS (`TextMarks`):  room either side of a tag in a line and of a value, before a block's start and end
 *     tags, and before a line of text, so it sits in from the tags beside it, as on the page
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
   * - `isView`:  is a tag one of the project's own views, `<tableau "T1"/>`?  Then it draws a thing:  purple.
   * - `declaringTags`:  where each tag that declares a member starts (`SP.BubblyDrawing.declaringTags`):
   *   drawn round, `bubbly-tag-declares` (epic `editor` I84)
   */
  static within(
    text: string,
    from: number,
    to: number,
    marks: monaco.editor.IModelDeltaDecoration[],
    { isView = () => false, declaringTags = [] }: MarkupWithin = {}
  ): MarkupMarks {
    return new MarkupMarks(text, { from, to, isInSpell: true, isView, declaringTags }, marks)
  }

  /** The shapes at the top of the drawing, each holding those inside it. */
  readonly shapes: MarkupShape[] = []

  /** Where each tag is:  a Spell drawing leaves them to these marks.  Not a `{…}` value in one:  that's Spell. */
  readonly tags: Array<{ start: number; end: number }> = []

  /** The room injected after each tag in a line, by where it ends:  a tag right after it starts past it too. */
  private readonly roomAfter = new Map<number, TagRoom>()

  /** Lines of Spell, whose own marks are Spell's:  no spacers before them. */
  private readonly isInSpell: boolean

  /** Is a tag one of the project's own views:  `within()`'s. */
  private readonly isView: (tag: string) => boolean

  /** Where each tag that declares a member starts:  `within()`'s. */
  private readonly declaringTags: ReadonlySet<number>

  private constructor(
    source: string,
    {
      from,
      to,
      isInSpell,
      isView = () => false,
      declaringTags = []
    }: { from: number; to: number; isInSpell: boolean } & MarkupWithin,
    marks?: monaco.editor.IModelDeltaDecoration[]
  ) {
    super(source, marks)
    this.isInSpell = isInSpell
    this.isView = isView
    this.declaringTags = new Set(declaringTags)
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
    // one of the project's own views draws a thing:  purple, whatever its name
    const partOfSpeech = this.isView(element.tag) ? "thing" : BubblyMarkup.partOfSpeechOfElement(element)
    const hasInside = element.children.some((child) => child.kind !== "text" || this.slice(child).trim())
    if (!hasInside && !close) {
      if (this.startsLine(open.start) && this.endsLine(open.end)) this.alone(open, partOfSpeech, into)
      else this.tagPill(open, { partOfSpeech, side: "start" }, into)
      return
    }
    // nothing at all between its tags:  ONE pill, as if self-closed, its end tag's letters hidden (Owen, Q62)
    if (BubblyMarkup.isDrawnSelfClosed(element)) {
      this.tagPill(open, { partOfSpeech, side: "start", through: close }, into)
      return
    }
    if (!close || !this.slice({ start: open.end, end: close.start }).includes("\n")) {
      // one line:  each tag a pill;  nothing between them, their points touch
      const touch = !hasInside
      const first = into.length
      const start = this.tagPill(open, { partOfSpeech, side: "start", touch }, into)
      this.nodes(element.children, into)
      if (!close) return
      const end = this.tagPill(close, { partOfSpeech, side: "end", touch }, into)
      // something between them on one line:  the two pills linked, under them, between them (Owen, Q58)
      if (hasInside && !this.isTall(open))
        into.splice(first, 0, { kind: "tag-link", place: this.place(open.start, close.end), partOfSpeech, start, end })
      return
    }
    const footStartsLine = this.startsLine(close.start)
    const block: MarkupBlockShape = {
      kind: "markup-block",
      place: this.place(open.start, close.end),
      head: this.place(open.start, open.end),
      partOfSpeech,
      ...(this.isTall(open) && BubblyMarkup.hasShortTail(this.text, open) ? { isShortTail: true } : {}),
      inside: []
    }
    into.push(block)
    // its `⟨` clear of its band's cut corner, an HTML file's or a Spell drawing's alike
    if (this.startsLine(open.start)) this.mark(open.start, open.start + 1, "", { before: spacer("tag-head", "before") })
    this.startTag(open, partOfSpeech, block.inside)
    this.nodes(element.children, block.inside)
    if (footStartsLine) {
      block.foot = this.place(close.start, close.end)
      this.mark(close.start, close.start + 1, "", { before: spacer("tag-foot", "before") })
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
    const declares = this.declares(tag)
    into.push({
      kind: "tag",
      place: this.place(tag.start, tag.end),
      partOfSpeech,
      side: "start",
      isAlone: true,
      ...this.tallness(tag),
      ...(declares ? { declares } : {})
    })
    this.startTag(tag, partOfSpeech, into)
  }

  /**
   * A tag in a line:  a small pill of its own, with room either side for it, but at the line's start or end;
   * returns its shape.
   * - `touch`:  it's an empty element's, its points touching its other tag's
   * - `through`:  a start tag's end tag, right after it:  ONE pill over both, drawn as if self-closed (Q62)
   */
  private tagPill(
    tag: MarkupStartTag | MarkupEndTag,
    {
      partOfSpeech,
      side,
      touch = false,
      through
    }: { partOfSpeech: MarkupPartOfSpeech; side: "start" | "end"; touch?: boolean; through?: MarkupEndTag },
    into: MarkupShape[]
  ): MarkupTagShape {
    const end = through?.end ?? tag.end
    const spacers: Spacers = {}
    // the room before it:  the tag's it follows right on, then its own
    const room: TagRoom[] = []
    const behind = this.roomAfter.get(tag.start)
    if (behind) room.push(behind)
    if (!this.startsLine(tag.start)) {
      const before: TagRoom = touch && side === "end" ? "touch" : "tag"
      spacers.before = spacer(before, "before")
      room.push(before)
    }
    if (!this.endsLine(end)) {
      const after: TagRoom = touch && side === "start" ? "touch" : "tag"
      spacers.after = spacer(after, "after")
      this.roomAfter.set(end, after)
    }
    // the room either side, and the pill's place:  the whole tag, its end tag too when it's drawn self-closed
    const place = this.mark(tag.start, end, "", spacers)
    const declares = this.declares(tag)
    const shape: MarkupTagShape = {
      kind: "tag",
      place,
      partOfSpeech,
      side,
      isAlone: false,
      room,
      ...this.tallness(tag),
      ...(declares ? { declares } : {})
    }
    into.push(shape)
    if (tag.kind === "start") this.startTag(tag, partOfSpeech, into, through ? "self-closed" : "as-written")
    else this.endTag(tag, "inline")
    if (through) this.hiddenEndTag(through, declares)
    return shape
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

  /**
   * A start tag's pieces:  its brackets, name and attributes;  a pill under each value, into `into`.
   * - `partOfSpeech`:  its band's colour, a `{…}` value's pill a shade of it
   * - `ends`:  `"self-closed"`, its `>` hidden:  its end tag's `/>` drawn in its place (`hiddenEndTag()`, Q62)
   */
  private startTag(
    tag: MarkupStartTag,
    partOfSpeech: MarkupPartOfSpeech,
    into: MarkupShape[],
    ends: "as-written" | "self-closed" = "as-written"
  ) {
    const { start, end } = tag
    let from = start
    // a tag that declares a member:  its brackets and `/` not drawn, its pill round (I84)
    const declares = this.declares(tag) ? ` ${DECLARES}` : ""
    this.mark(start, start + 1, ANGLE_OPEN + declares)
    this.mark(start + 1, start + 1 + tag.tag.length, TAG_NAME)
    for (const attribute of tag.attributes) {
      if (attribute.name) {
        const nameEnd = attribute.nameStart + attribute.name.length
        // one that starts its line (a tall start tag's):  its indent is its room, as on the page
        const spacers: Spacers = this.startsLine(attribute.nameStart) ? {} : { before: spacer("attribute", "before") }
        this.mark(attribute.nameStart, nameEnd, ATTRIBUTE_NAME, spacers)
      }
      if (attribute.equalsAt !== undefined && attribute.equalsAt >= 0)
        this.mark(attribute.equalsAt, attribute.equalsAt + 1, EQUALS, { before: spacer("equals", "before") })
      if (attribute.valueStart === undefined) continue
      // a `{…}` value is Spell's to mark:  not the tag's;  its pill and braces are
      if (attribute.isExpression) {
        this.tags.push({ start: from, end: attribute.valueStart })
        from = attribute.valueEnd!
        this.expression(attribute.valueStart, attribute.valueEnd!, partOfSpeech, into)
      } else this.value(attribute.valueStart, attribute.valueEnd!, attribute.isQuoted, partOfSpeech, into)
    }
    this.tags.push({ start: from, end })
    if (tag.selfClosing) this.mark(end - 2, end - 1, `${SLASH} ${CLOSING_SLASH}${declares}`)
    this.mark(end - 1, end, ends === "self-closed" ? HIDDEN : ANGLE_CLOSE + declares)
  }

  /**
   * An empty element's end tag, drawn as if its start tag were self-closed (Owen, Q62):  its `/` and `>` shown as
   * the start tag's `/⟩`, in its ink;  its `<` and name hidden, no wider than nothing.
   * - Every letter stays in the file, so the caret, a selection, a copy and typing all work on them:
   *   the caret steps over the hidden ones without seeming to move
   */
  private hiddenEndTag(tag: MarkupEndTag, isDeclaring = false) {
    const { start, end } = tag
    this.tags.push({ start, end })
    const declares = isDeclaring ? ` ${DECLARES}` : ""
    this.mark(start, start + 1, HIDDEN)
    // an attribute's room before its `/`, as on the page;  none where its start tag's `>` starts its line
    const spacers: Spacers = this.startsLine(start - 1) ? {} : { before: spacer("attribute", "before") }
    this.mark(start + 1, start + 2, `${SLASH} ${CLOSING_SLASH}${declares}`, spacers)
    this.mark(start + 2, end - 1, HIDDEN)
    this.mark(end - 1, end, ANGLE_CLOSE + declares)
  }

  /**
   * An end tag's pieces;  `"block"`:  a block's, its name faint as its marks are, as the page draws it, every piece
   * tiny (`bubbly-foot-tiny`, Q61).
   */
  private endTag(tag: MarkupEndTag, place: "block" | "inline") {
    const { start, end } = tag
    this.tags.push({ start, end })
    // every piece an end tag's (`bubbly-tag-end`):  its marks fainter than a start tag's
    // a nameless one, `</>`, drawn close as one glyph (Owen)
    const endClasses = [END, place === "block" && FOOT, !tag.tag && BARE_END].filter(Boolean).join(" ")
    this.mark(start, start + 1, `${ANGLE_OPEN} ${endClasses}`)
    this.mark(start + 1, start + 2, `${SLASH} ${endClasses}`)
    this.mark(start + 2, start + 2 + tag.tag.length, place === "block" ? `${MARK} ${END_NAME} ${FOOT}` : END_NAME)
    this.mark(end - 1, end, `${ANGLE_CLOSE} ${endClasses}`)
  }

  /** An attribute's value:  its words with a spacer either side, a pill under them;  a quoted one's marks outside. */
  private value(start: number, end: number, isQuoted: boolean, inTag: MarkupPartOfSpeech, into: MarkupShape[]) {
    if (isQuoted) {
      this.mark(start - 1, start, `${QUOTE_MARK} ${TAG_QUOTE} bubbly-quote-open`, { before: spacer("quote", "before") })
      this.mark(end, end + 1, `${QUOTE_MARK} ${TAG_QUOTE} bubbly-quote-close`, { after: spacer("tag-quote", "after") })
    }
    const place = this.mark(start, end, INPUT, { before: spacer("input", "before"), after: spacer("input", "after") })
    if (place >= 0) into.push({ kind: "input", place, isChoice: false, isQuoted, inTag })
  }

  /**
   * A `{…}` value, worked out as the program runs (`color={its color}`):  its braces darker than the tag's marks,
   * its words on an INVERTED pill, so it stands apart from a value typed in (Owen);  its words are Spell's to mark.
   */
  private expression(start: number, end: number, partOfSpeech: MarkupPartOfSpeech, into: MarkupShape[]) {
    this.mark(start, start + 1, BRACE)
    this.mark(end - 1, end, BRACE)
    if (end - start <= 2) return
    const place = this.mark(start + 1, end - 1, EXPRESSION, {
      before: spacer("input", "before"),
      after: spacer("input", "after")
    })
    if (place >= 0)
      into.push({ kind: "input", place, isChoice: false, isQuoted: false, inTag: partOfSpeech, isExpression: true })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Does `tag` declare the member it draws (`<number "score"/>`):  a start tag the parse said so of? */
  private declares(tag: MarkupStartTag | MarkupEndTag): true | undefined {
    return tag.kind === "start" && this.declaringTags.has(tag.start) ? true : undefined
  }

  /** Does `tag` run over more than one line:  one tall band (T118)? */
  private isTall(tag: { start: number; end: number }): boolean {
    return this.slice(tag).includes("\n")
  }

  /** A start tag's shape's `isShortTail`, when it's tall. */
  private tallness(tag: MarkupStartTag | MarkupEndTag): { isShortTail?: true } {
    return tag.kind === "start" && this.isTall(tag) && BubblyMarkup.hasShortTail(this.text, tag)
      ? { isShortTail: true }
      : {}
  }

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
export type MarkupShape = MarkupBlockShape | MarkupTagShape | MarkupLinkShape | BubblyInputShape

/** An element with what's inside it on lines of its own:  its band, gutter, body, and its end tag's band. */
export type MarkupBlockShape = {
  kind: "markup-block"
  /** the mark from its start tag's `<` to its end tag's `>` */
  place: number
  /** the mark on its start tag */
  head: number
  /**
   * the mark on its end tag, when it starts its line:  a tiny pill at the rail's turn, its line only its row tall;
   * else the end tag is a pill in its line
   */
  foot?: number
  /** its bands' colour */
  partOfSpeech: MarkupPartOfSpeech
  /** its start tag on lines of its own, its `>` alone on the last:  the rows above overhang it, their corner cut */
  isShortTail?: boolean
  /** the pills on its start tag, and the shapes in its body */
  inside: MarkupShape[]
}

/** A tag:  a small pill in its line (`bubbly-tag-pill`), or a band by itself, alone on its line (`bubbly-pill`). */
export type MarkupTagShape = {
  kind: "tag"
  /** the mark on the tag;  an empty element's start tag's runs on over its end tag, drawn as if self-closed (Q62) */
  place: number
  /** its colour */
  partOfSpeech: MarkupPartOfSpeech
  /** a start tag's, or an end tag's */
  side: "start" | "end"
  /** alone on its line:  a band */
  isAlone: boolean
  /** a start tag on lines of its own, its `>` alone on the last:  its rows above overhang it, their corner cut */
  isShortTail?: boolean
  /**
   * it declares the member it draws, `<number "score"/>` (`SP.BubblyDrawing.declaringTags`):
   * drawn round, `bubbly-tag-declares` (epic `editor` I84)
   */
  declares?: true
  /**
   * the room injected where it starts, each spacer's kind:  the tag's it follows right on (`<p><b>`), then its own;
   * none at its line's start, less where its point touches its element's other tag
   * - Monaco places a column before the room injected there:  the pill starts past it
   */
  room?: TagRoom[]
}

/**
 * A one-line element with something between its tags:  a line along the top and bottom of what's between its two
 * pills, from its start tag's point to its end tag's, under them (`bubbly-tag-link`, Owen, Q58);
 * never under the tags themselves.
 */
export type MarkupLinkShape = {
  kind: "tag-link"
  /** the mark from its start tag's `<` to its end tag's `>` */
  place: number
  /** its colour */
  partOfSpeech: MarkupPartOfSpeech
  /** its start tag's pill, and its end tag's:  it runs between them */
  start: MarkupTagShape
  end: MarkupTagShape
}

/** What `MarkupMarks.within()` knows of a Spell drawing's tags, from its project. */
export type MarkupWithin = {
  /** is a tag one of the project's own views, `<tableau "T1"/>`?  Then it draws a thing:  purple */
  isView?: (tag: string) => boolean
  /** where each tag that declares a member starts:  `SP.BubblyDrawing.declaringTags` */
  declaringTags?: readonly number[]
}

/** A spacer beside a tag in a line:  room for its pill and the gap outside it, or only its pill's where points touch. */
export type TagRoom = "tag" | "touch"

/** A tag's `<` and `>`, drawn as `⟨` `⟩` over the file's own, faint. */
const MARK = "bubbly-mark"
const ANGLE_OPEN = `${MARK} bubbly-angle bubbly-angle-open`
const ANGLE_CLOSE = `${MARK} bubbly-angle bubbly-angle-close`

/** An end tag's `/`, and `<br />`'s. */
const SLASH = `${MARK} bubbly-slash`

/** A self-closed tag's `/`, snug against its `>`:  `/⟩` one glyph (Owen, 2026-11-14). */
const CLOSING_SLASH = "bubbly-closing-slash"

/** A tag that declares the member it draws:  its pill round, its brackets and `/` not drawn (epic `editor` I84). */
const DECLARES = "bubbly-tag-declares"

/** A tag's name, and its attributes' names. */
const TAG_NAME = "bubbly-tag-name"
const ATTRIBUTE_NAME = "bubbly-attribute-name"

/** An end tag's pieces:  its marks fainter, its name not bold, as the page draws it (its `.bubbly-tag-end` holds them). */
const END = "bubbly-tag-end"
const END_NAME = `${TAG_NAME} ${END}`

/** A block's end tag on its own line:  its letters tiny, in its tiny pill (Q61). */
const FOOT = "bubbly-foot-tiny"

/** A nameless end tag's pieces, `</>`:  drawn close together, as one glyph (Owen, 2026-11-14). */
const BARE_END = "bubbly-end-bare"

/** An empty element's end tag's `<` and name, and its start tag's `>`:  hidden, no wider than nothing (Q62). */
const HIDDEN = "bubbly-tag-hidden"

/** An attribute's `=`. */
const EQUALS = `${MARK} bubbly-equals`

/** A value's words:  a white pill under them. */
const INPUT = "bubbly-input"

/** A `{…}` value's words:  an inverted pill under them;  its braces darker than a mark (Owen). */
const EXPRESSION = "bubbly-expression"
const BRACE = `${MARK} ${BubblyHtml.BRACE}`

/** A quoted value's own `"`:  see-through, its curly mark drawn over it. */
const QUOTE_MARK = "bubbly-quote-mark"

/** A tag's quote marks:  leaning further, the opening one over the `=` before it (Owen, 2026-11-14). */
const TAG_QUOTE = "bubbly-tag-quote"

/** A comment's lines:  faint. */
const COMMENT = "bubbly-comment"
