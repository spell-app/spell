import type { PartOfSpeech as MarkupPartOfSpeech } from "spell/element/vocabulary.types"
import { PARTS_OF_SPEECH } from "spell/ui/vocabulary/partsOfSpeech.generated"
import { BubblyHtml } from "./BubblyHtml"

/****************
 * ### `BubblyMarkup`
 * HTML source drawn in the bubbly look, as HTML in the classes of the look's ONE sheet, `bubbly.css` beside it
 * (epic `language`, Owen 2026-11-11):  the same shapes as Spell's, their corners cut (`bubbly-html`).
 * - Each element with children on lines of their own is a `bubbly-block`:
 *   its start tag the band, its children the body, its end tag, named or Spell's nameless `</>`, a TINY pill at
 *   the rail's turn, its words tiny in it (`bubbly-foot-tiny`, Owen, Q61)
 * - An element on one line is a line of its own:  its start tag a small pill (`bubbly-tag-pill`), what's inside it on
 *   the paper, its end tag a pill of its own;  the two pills linked by a line along the top and bottom of what's
 *   between them, when something is (`bubbly-tag-link`, Q58).
 * - A start tag on lines of its own (`<spell-editor`, an attribute a line, `>`) is ONE tall band, a row a line, its
 *   point at its `⟩` (`bubbly-tag-tall`, T118):  a block's band, a band alone, or a one-line element's start tag.
 * - An element with NOTHING between its two tags (`<spell-editor …></spell-editor>`) is ONE pill, as if self-closed:
 *   its start tag ends in `/⟩`, its end tag left out (`bubbly-tag-self-closed`, Owen, Q62);  the file keeps it.
 * - An element with no end tag (`<meta …>`, `<br />`) is a band by itself, `bubbly-pill`.
 * - Whatever holds a start tag is a `bubbly-tag-start` too, an end tag's a `bubbly-tag-end`:  hooks to style them by.
 * - An attribute's value is a white pill on its band (`bubbly-input`), a quoted one with Spell's curly marks just
 *   outside it (`bubbly-quoted`);  a `{…}` one, Spell worked out as it runs, an inverted pill (`bubbly-expression`),
 *   its braces darker;  `<`, `=` and `>` are faint marks, `<` and `>` drawn as `⟨` `⟩`.
 * - The band's colour says what kind of element it is, in Spell's parts of speech (`partOfSpeechOf()`).
 * - Text, a `<style>`'s or `<script>`'s lines, a comment:  plain lines in their element's body.
 * - Its own small reader, not a full HTML parser:  enough for hand-written pages, the drawn-bubbly page's examples.
 *   The editor draws HTML from the same reading (`treeOf()`, Monaco's `MarkupMarks`).
 * - Strings, not DOM, as `BubblyHtml`:  the page's script runs in node.
 * - STATIC and instance-free:  HTML source in, its drawing out.
 ****************/
export class BubblyMarkup {
  /** `source`, an HTML file or fragment, drawn bubbly. */
  static write(source: string): string {
    const nodes = treeOf(tokensOf(source, 0, source.length))
    return `<div class="bubbly bubbly-html">${new MarkupWriter(source).nodes(nodes)}</div>`
  }

  /**
   * `source`, an HTML file or fragment, read as its elements, text and comments, each with where it is in `source`;
   * from `from` to `to` only, when given:  a Spell drawing's lines, in its file.
   * - Spell's own forms too:  `</>` closes the element it's in, a tag's name may be any word (`<botón>`),
   *   a quoted word on a tag (`<header "Hardware">`) is a value with no name, a `{…}` value is Spell's
   */
  static treeOf(source: string, from = 0, to = source.length): MarkupNode[] {
    return treeOf(tokensOf(source, from, to))
  }

  /**
   * Is `tag`, a start tag on lines of its own, alone on its last line but its `>`?  Then its rows above overhang
   * that line's piece of its band, their bottom-right corner cut (`bubbly-tag-tall-short-tail`).
   */
  static hasShortTail(source: string, tag: MarkupStartTag): boolean {
    const lastLineStart = source.lastIndexOf("\n", tag.end - 1)
    return !tag.attributes.some((attribute) => attribute.nameStart > lastLineStart)
  }

  /**
   * Is `element` drawn as if self-closed:  ONE pill, its start tag ending in `/⟩`, its end tag left out (Owen, Q62)?
   * - Nothing at all between its two tags, not even a space:  `<div class="x"></div>`
   * - The file keeps its end tag:  a custom element's `/>` means nothing to HTML
   */
  static isDrawnSelfClosed(element: MarkupElement): boolean {
    return !!element.close && element.close.start === element.open.end
  }

  /**
   * An element's part of speech:  its tag's (`partOfSpeechOf()`), but a tag of no kind that names a thing with its
   * quoted word is a thing too:  `<number "score"/>` declares the app's score (Owen, 2026-11-14).
   */
  static partOfSpeechOfElement(element: MarkupElement): MarkupPartOfSpeech {
    const partOfSpeech = BubblyMarkup.partOfSpeechOf(element.tag)
    const named = element.open.attributes[0]
    return partOfSpeech === "plain" && named?.name === "" && named.isQuoted ? "thing" : partOfSpeech
  }

  /**
   * The part of speech an element's band takes, by its tag (`MarkupPartOfSpeech` says what each one is):
   * - a Spell UI tag's is its vocabulary's (`partOfSpeech`, epic `language` T124), by its tag or its bare name,
   *   as a drawing writes it:  `<ui-segment>` ~== `<segment>`
   * - HTML's own tags have no vocabulary:  theirs are `HTML_WORDS`, below, and win over a bare Spell UI name:
   *   `<header>` is HTML's (structure), `<ui-header>` Spell UI's (property)
   * - else a name with a dash is a thing (a custom element), any other plain
   */
  static partOfSpeechOf(tag: string): MarkupPartOfSpeech {
    const name = tag.toLowerCase()
    const listed =
      PART_OF_SPEECH_BY_TAG.get(name) ??
      (name.startsWith("ui-") ? PARTS_OF_SPEECH[name] : PARTS_OF_SPEECH[`ui-${name}`])
    if (listed) return listed
    return name.includes("-") ? "thing" : "plain"
  }
}

/** The parts of speech an element's band can take:  every vocabulary's `partOfSpeech`. */
export type { PartOfSpeech as MarkupPartOfSpeech } from "spell/element/vocabulary.types"

/**
 * HTML's tags of each part of speech, which have no vocabulary to say;  and Spell's own `<context-menu>`.
 * - Spell UI's are in its vocabularies (`partOfSpeech`), read from `PARTS_OF_SPEECH`.
 * - `plain`:  the head's tags a Spell UI tag is also named (`<title>`, `<meta>`, `<link>`), so they stay grey.
 * - Unlisted:  a divider (`hr`) and the rest of the head are plain, as they hold nothing (Owen, 2026-11-14).
 */
const HTML_WORDS = {
  structure: [
    "html body main header footer nav section article aside div ul ol dl table thead tbody tfoot tr figure fieldset",
    "dialog template slot context-menu"
  ],
  action: ["a button input select option textarea form label details summary"],
  property: [
    "p span h1 h2 h3 h4 h5 h6 strong em b i u s small code pre kbd mark q blockquote cite li dt dd td th caption img",
    "figcaption sup sub abbr time"
  ],
  plain: ["head title meta link base"]
} satisfies Partial<Record<MarkupPartOfSpeech, string[]>>

/** `HTML_WORDS` turned round:  each tag => its part of speech. */
const PART_OF_SPEECH_BY_TAG = new Map<string, MarkupPartOfSpeech>(
  Object.entries(HTML_WORDS).flatMap(([part, lines]) =>
    lines.flatMap((line) => line.split(" ").map((tag) => [tag, part as MarkupPartOfSpeech] as const))
  )
)

/** Elements that never have an end tag. */
const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "))

/** Elements whose content is text, never tags. */
const RAW_TEXT = new Set(["script", "style", "textarea", "title"])

/** The deepest indent the sheet draws, `bubbly-indent-4`. */
const MAX_INDENT = 4

////////////////
// ## Reading
////////////////

/**
 * One attribute of a start tag:  its name, and its value without its quotes (none for `disabled`);
 * where each is in the source, for the editor's marks.
 */
export type MarkupAttribute = {
  /** none for a tag's quoted word, `<header "Hardware">` */
  name: string
  value?: string
  isQuoted: boolean
  /** a Spell expression, `{its color}`:  an inverted pill, its braces outside it */
  isExpression?: boolean
  /** where its name starts */
  nameStart: number
  /** where its `=` is, if it has a value */
  equalsAt?: number
  /** where its value starts and ends, inside its quotes */
  valueStart?: number
  valueEnd?: number
}

/** A start tag, `<div class="x">`:  from its `<` to just past its `>`. */
export type MarkupStartTag = {
  kind: "start"
  start: number
  end: number
  tag: string
  attributes: MarkupAttribute[]
  selfClosing: boolean
}

/** An end tag, `</div>`:  from its `<` to just past its `>`. */
export type MarkupEndTag = { kind: "end"; start: number; end: number; tag: string }

/** One piece of the source, in order. */
type Token = { kind: "text" | "comment" | "doctype"; start: number; end: number } | MarkupStartTag | MarkupEndTag

/** An element:  its tags, and what's inside it;  from its start tag's `<` to its end tag's `>`, or its start tag's. */
export type MarkupElement = {
  kind: "element"
  start: number
  end: number
  tag: string
  open: MarkupStartTag
  close?: MarkupEndTag
  children: MarkupNode[]
}

/** An element and what's inside it, or a piece of text, a comment or a doctype, each from where it starts to its end. */
export type MarkupNode = { kind: "text" | "comment" | "doctype"; start: number; end: number } | MarkupElement

/** `source`'s tokens, from `from` to `to`. */
function tokensOf(source: string, from: number, to: number): Token[] {
  const tokens: Token[] = []
  let at = from
  const text = (end: number) => {
    if (end > at) tokens.push({ kind: "text", start: at, end })
  }
  while (at < to) {
    const next = source.indexOf("<", at)
    if (next < 0 || next >= to) break
    text(next)
    at = next
    if (source.startsWith("<!--", at)) {
      const close = source.indexOf("-->", at + 4)
      const end = close < 0 ? source.length : close + 3
      tokens.push({ kind: "comment", start: at, end })
      at = end
      continue
    }
    if (/^<!doctype/i.test(source.slice(at, at + 9))) {
      const end = source.indexOf(">", at) + 1 || source.length
      tokens.push({ kind: "doctype", start: at, end })
      at = end
      continue
    }
    // `</>`:  Spell's, closing the element it's in
    const endTag = /^<\/(\p{L}[\p{L}\d_:-]*)?\s*>/u.exec(source.slice(at, to))
    if (endTag) {
      tokens.push({ kind: "end", start: at, end: at + endTag[0].length, tag: (endTag[1] ?? "").toLowerCase() })
      at += endTag[0].length
      continue
    }
    const startTag = /^<(\p{L}[\p{L}\d_:-]*)/u.exec(source.slice(at, to))
    if (!startTag) {
      // a `<` that starts no tag:  text
      at++
      continue
    }
    const tag = startTag[1]!.toLowerCase()
    const { attributes, end, selfClosing } = attributesFrom(source, at + startTag[0].length)
    tokens.push({ kind: "start", start: at, end, tag, attributes, selfClosing })
    at = end
    if (RAW_TEXT.has(tag) && !selfClosing) {
      const close = source.toLowerCase().indexOf(`</${tag}`, at)
      const stop = close < 0 ? source.length : close
      if (stop > at) tokens.push({ kind: "text", start: at, end: stop })
      at = stop
    }
  }
  if (at < to) tokens.push({ kind: "text", start: at, end: to })
  return tokens
}

/**
 * One attribute, or a start tag's end:  `/>` or `>` (1), a tag's quoted word (2), a name (3),
 * a value in `"` (4), `'` (5), a Spell `{…}` (6) or neither (7), which stops before a `/>`:  `suit=clubs/>`.
 */
const ATTRIBUTE_PATTERN =
  /\s*(?:(\/?>)|"([^"]*)"|([^\s=/>"]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\{[^}]*\})|((?:[^\s>/]|\/(?!>))+)))?|\/)/.source

/** A start tag's attributes, from `at` just past its name, to its `>`. */
function attributesFrom(
  source: string,
  at: number
): { attributes: MarkupAttribute[]; end: number; selfClosing: boolean } {
  const attributes: MarkupAttribute[] = []
  // `d`:  where each part is, for the editor's marks
  const pattern = new RegExp(ATTRIBUTE_PATTERN, "dy")
  pattern.lastIndex = at
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (match[1]) return { attributes, end: pattern.lastIndex, selfClosing: match[1] === "/>" }
    const indices = match.indices!
    if (match[2] !== undefined) {
      const [start, end] = indices[2]!
      attributes.push({
        name: "",
        value: match[2],
        isQuoted: true,
        nameStart: start - 1,
        valueStart: start,
        valueEnd: end
      })
      continue
    }
    if (!match[3]) continue
    const [nameStart, nameEnd] = indices[3]!
    const valueAt = indices[4] ?? indices[5] ?? indices[6] ?? indices[7]
    attributes.push({
      name: match[3],
      value: match[4] ?? match[5] ?? match[6] ?? match[7],
      isQuoted: match[4] !== undefined || match[5] !== undefined,
      ...(match[6] !== undefined ? { isExpression: true } : {}),
      nameStart,
      ...(valueAt ? { equalsAt: source.indexOf("=", nameEnd), valueStart: valueAt[0], valueEnd: valueAt[1] } : {})
    })
  }
  return { attributes, end: source.length, selfClosing: false }
}

/** `tokens` as a tree:  an end tag closes the nearest open element of its name;  one that closes nothing is dropped. */
function treeOf(tokens: Token[]): MarkupNode[] {
  const root: MarkupNode[] = []
  const open: MarkupElement[] = []
  const add = (node: MarkupNode) => (open.at(-1)?.children ?? root).push(node)
  for (const token of tokens) {
    if (token.kind === "start") {
      const element: MarkupElement = {
        kind: "element",
        start: token.start,
        end: token.end,
        tag: token.tag,
        open: token,
        children: []
      }
      add(element)
      if (!token.selfClosing && !VOID.has(token.tag)) open.push(element)
    } else if (token.kind === "end") {
      // `</>` closes the element it's in
      const index = token.tag ? open.findLastIndex((element) => element.tag === token.tag) : open.length - 1
      if (index < 0) continue
      const element = open[index]!
      element.close = token
      element.end = token.end
      open.length = index
    } else add(token)
  }
  return root
}

////////////////
// ## Writing
////////////////

/** One drawing being written. */
class MarkupWriter {
  constructor(private readonly source: string) {}

  /** `nodes`, each a band, a block or lines;  a run of blank lines between them a gap. */
  nodes(nodes: MarkupNode[]): string {
    let html = ""
    for (const node of nodes) {
      if (node.kind === "element") html += this.element(node)
      else if (node.kind === "text") html += this.text(node)
      else if (node.kind === "comment") html += this.comment(node)
      else
        /* if (node.kind === "doctype") */ html += `<p class="bubbly-pill bubbly-plain">${marks(this.slice(node))}</p>`
    }
    return html
  }

  /** An element:  a block when what's inside it is on lines of its own, else a band. */
  private element(element: MarkupElement): string {
    const kind = `bubbly-${BubblyMarkup.partOfSpeechOfElement(element)}`
    const inside = element.children.filter((child) => child.kind !== "text" || this.slice(child).trim())
    const insideText = element.close ? this.source.slice(element.open.end, element.close.start) : ""
    const isTall = this.isTall(element.open)
    // no end tag (`<meta …>`, `<br />`):  one band;  else a line of tags, each its own pill
    if (!inside.length && !element.close) {
      if (isTall) return this.tallTag(element.open, `bubbly-tag-tall-alone ${kind}`, "")
      return `<p class="bubbly-pill bubbly-tag-start ${kind}">${this.startTag(element.open)}</p>`
    }
    if (!insideText.includes("\n")) {
      if (!isTall) return `<p class="bubbly-line bubbly-tag-line">${this.inline([element])}</p>`
      // its start tag on lines of its own:  one tall band, the rest of the element after its `⟩` on its last line;
      // nothing between its tags:  its `/⟩` instead, its end tag left out (Q62)
      if (BubblyMarkup.isDrawnSelfClosed(element))
        return this.tallTag(element.open, `bubbly-tag-tall-inline bubbly-tag-self-closed ${kind}`, "", "self-closed")
      const after = this.inline(element.children) + this.endPill(element, !inside.length)
      return this.tallTag(element.open, `bubbly-tag-tall-inline ${kind}`, after)
    }
    const head = isTall
      ? this.tallTag(element.open, "bubbly-tag-tall-head", "")
      : `<p class="bubbly-head-pill bubbly-tag-start">${this.startTag(element.open)}</p>`
    // its end tag, named or `</>`:  a tiny pill at the rail's turn (Owen, Q61)
    const foot = element.close
      ? `<p class="bubbly-foot bubbly-foot-tiny bubbly-tag-end">${this.endTag(element.close, "block")}</p>`
      : `<div class="bubbly-foot"></div>`
    return (
      `<div class="bubbly-block ${kind}">${head}` +
      `<div class="bubbly-gutter"></div><div class="bubbly-body">${this.nodes(element.children)}</div>${foot}</div>`
    )
  }

  /**
   * A start tag on lines of its own (`<spell-editor`, an attribute a line, `>`):  ONE tall band (Owen, T118),
   * each line a row in it, as in the file;  its last line's piece ends in the band's point, at its `⟩`,
   * `after` it on the same line:  what's left of a one-line element, its end tag's pill.
   * - `classes`:  where it sits, `bubbly-tag-tall-head` (a block's), `-alone`, `-inline`;  and its colour
   * - `ends`:  `"self-closed"`, its `>` drawn `/⟩`:  an empty element's (Q62)
   */
  private tallTag(tag: MarkupStartTag, classes: string, after: string, ends: TagEnds = "as-written"): string {
    const rows = this.startTagRows(tag, ends)
    const last = rows.pop()!
    const upper = rows.map((row) => `<p class="bubbly-tag-row">${row}</p>`).join("")
    // nothing after it:  flush, its rows and last line one width, its `⟩` at their right end (Owen, 2026-11-14);
    // else its `>` alone on its last line:  the rows above overhang it, their corner cut
    const isFlush = !after && ends === "as-written" && !tag.selfClosing
    const end = isFlush
      ? " bubbly-tag-tall-flush"
      : BubblyMarkup.hasShortTail(this.source, tag)
        ? " bubbly-tag-tall-short-tail"
        : ""
    return (
      `<div class="bubbly-tag-tall bubbly-tag-start ${classes}${end}"><div class="bubbly-tag-rows">${upper}</div>` +
      `<p class="bubbly-tag-row bubbly-tag-row-last"><span class="bubbly-tag-tail">${last}</span>${after}</p></div>`
    )
  }

  /** Does `tag` run over more than one line? */
  private isTall(tag: MarkupStartTag): boolean {
    return this.source.slice(tag.start, tag.end).includes("\n")
  }

  /**
   * A one-line element's end tag's pill;  none without one.
   * - `touching`:  nothing between its tags, their points touch
   */
  private endPill(element: MarkupElement, touching: boolean): string {
    if (!element.close) return ""
    const kind = `bubbly-tag-pill bubbly-${BubblyMarkup.partOfSpeechOfElement(element)}${touching ? " bubbly-tags-touch" : ""}`
    return `<span class="${kind} bubbly-tag-end">${this.endTag(element.close)}</span>`
  }

  /**
   * A one-line element's pieces, on the paper:  each tag a small pill of its own (`bubbly-tag-pill`), what's between
   * them plain, as the text it is
   */
  private inline(nodes: MarkupNode[]): string {
    return nodes
      .map((node) =>
        node.kind === "element"
          ? this.tagPills(node)
          : node.kind === "comment"
            ? `<span class="bubbly-comment">${escape(this.slice(node))}</span>`
            : escape(this.slice(node).replace(/\s+/g, " "))
      )
      .join("")
  }

  /**
   * An element on a line's paper:  its start tag a pill, what's inside it, its end tag a pill of its own.
   * - Something between them:  the two pills linked by a thin line along its top and bottom, from one pill's point
   *   to the other's (`bubbly-tag-link`, Owen, Q58), so the pair reads as one element;  never under the tags
   */
  private tagPills(element: MarkupElement): string {
    const inside = this.inline(element.children)
    // nothing between its tags:  their points touch
    const touching = inside ? "" : " bubbly-tags-touch"
    const partOfSpeech = `bubbly-${BubblyMarkup.partOfSpeechOfElement(element)}`
    const kind = `bubbly-tag-pill ${partOfSpeech}${touching}`
    // nothing at all between them:  ONE pill, as if self-closed, its end tag left out (Owen, Q62)
    if (BubblyMarkup.isDrawnSelfClosed(element)) {
      const classes = `bubbly-tag-pill ${partOfSpeech} bubbly-tag-start bubbly-tag-self-closed`
      return `<span class="${classes}">${this.startTag(element.open, "self-closed")}</span>`
    }
    const start = `<span class="${kind} bubbly-tag-start">${this.startTag(element.open)}</span>`
    if (!element.close) return start + inside
    const between = inside ? `<span class="bubbly-tag-link ${partOfSpeech}">${inside}</span>` : ""
    return `${start}${between}${this.endPill(element, !inside)}`
  }

  /**
   * A start tag on its band:  `<` faint, its name, each value a white pill.
   * - `ends`:  `"self-closed"`, its `>` drawn `/⟩` (Q62)
   */
  private startTag(tag: MarkupStartTag, ends: TagEnds = "as-written"): string {
    return `${ANGLE_OPEN_MARK}<span class="bubbly-tag-name">${tag.tag}</span>${this.attributes(tag.attributes)}${this.closeMark(tag, ends)}`
  }

  /**
   * A start tag on lines of its own, a row each, as in the file:  the first its `<`, name and the attributes on its
   * line, each other its attributes, the last its `>` too;  each row's indent past the tag's `<` kept, as spaces.
   */
  private startTagRows(tag: MarkupStartTag, ends: TagEnds): string[] {
    const lineOf = (offset: number) => this.source.slice(tag.start, offset).split("\n").length - 1
    const rows: MarkupAttribute[][] = []
    for (const attribute of tag.attributes) (rows[lineOf(attribute.nameStart)] ??= []).push(attribute)
    const lastLine = lineOf(tag.end - 1)
    const tagColumn = columnOf(this.source, tag.start)
    const html: string[] = []
    for (let line = 0; line <= lastLine; line++) {
      const attributes = this.attributes(rows[line] ?? [])
      if (!line) {
        html.push(`${ANGLE_OPEN_MARK}<span class="bubbly-tag-name">${tag.tag}</span>${attributes}`)
        continue
      }
      // the row's indent past the `<`:  its first attribute's, or its `>`'s
      const first = rows[line]?.[0]?.nameStart ?? tag.end - (tag.selfClosing ? 2 : 1)
      const indent = " ".repeat(Math.max(0, columnOf(this.source, first) - tagColumn))
      // its first attribute's own room before it is in the file's indent, as in the editor
      const row = `<span class="bubbly-tag-indent">${indent}</span>${attributes.replace(/^ /, "")}`
      html.push(line === lastLine ? row + this.closeMark(tag, ends) : row)
    }
    return html
  }

  /** Attributes on a start tag's band, each with a space before it. */
  private attributes(attributes: MarkupAttribute[]): string {
    return attributes
      .map(({ name, value, isQuoted, isExpression }) => {
        const named = ` <span class="bubbly-attribute-name">${escape(name)}</span>`
        if (value === undefined) return named
        const shown = isExpression ? expressionOf(value) : valueOf(value, isQuoted)
        return name ? `${named}<span class="bubbly-mark bubbly-equals">=</span>${shown}` : ` ${shown}`
      })
      .join("")
  }

  /**
   * A start tag's `>`, or `/>`:  as written, or drawn self-closed (Q62).
   * - drawn self-closed:  an attribute's room before its `/`, as the editor's spacer (`bubbly-self-close`)
   */
  private closeMark(tag: MarkupStartTag, ends: TagEnds): string {
    if (tag.selfClosing) return `<span class="bubbly-mark">${SLASH}${ANGLE_CLOSE}</span>`
    if (ends === "self-closed") return `<span class="bubbly-mark bubbly-self-close">${SLASH}${ANGLE_CLOSE}</span>`
    return `<span class="bubbly-mark">${ANGLE_CLOSE}</span>`
  }

  /**
   * An end tag:  `</` and `>` faint, its name in the ink;  none, nothing.
   * - `"block"`:  a block's, its tiny pill at the rail's turn, its name faint too:  the rail already shows where it ends
   */
  private endTag(tag: MarkupEndTag | undefined, place: "block" | "inline" = "inline"): string {
    if (!tag) return ""
    const name = `<span class="bubbly-tag-name">${tag.tag}</span>`
    return place === "block"
      ? `<span class="bubbly-mark">${ANGLE_OPEN}${END_SLASH}${name}${ANGLE_CLOSE}</span>`
      : `<span class="bubbly-mark">${ANGLE_OPEN}${END_SLASH}</span>${name}<span class="bubbly-mark">${ANGLE_CLOSE}</span>`
  }

  /** Text on lines of its own:  each line in its body, its indent kept past the text's own;  blank lines a gap. */
  private text(node: { start: number; end: number }): string {
    const lines = this.slice(node).split("\n")
    const indents = lines.filter((line) => line.trim()).map((line) => indentOf(line))
    const least = Math.min(...indents)
    let html = ""
    let blank = 0
    for (const line of lines) {
      if (!line.trim()) {
        blank++
        continue
      }
      if (blank > 1 && html) html += `<div class="bubbly-gap"></div>`
      blank = 0
      const depth = Math.min(Math.round((indentOf(line) - least) / 2), MAX_INDENT)
      html += `<p class="bubbly-line bubbly-indent-${depth}">${escape(line.trim())}</p>`
    }
    return html
  }

  /** A comment:  faint lines. */
  private comment(node: { start: number; end: number }): string {
    const lines = this.slice(node).split("\n")
    const rest = lines.slice(1).filter((line) => line.trim())
    const least = rest.length ? Math.min(...rest.map(indentOf)) : 0
    return lines
      .filter((line) => line.trim())
      .map((line, index) => {
        const depth = index ? Math.min(Math.round((indentOf(line) - least) / 2), MAX_INDENT) : 0
        return `<p class="bubbly-line bubbly-comment bubbly-indent-${depth}">${escape(line.trim())}</p>`
      })
      .join("")
  }

  /** The source of `node`. */
  private slice({ start, end }: { start: number; end: number }): string {
    return this.source.slice(start, end)
  }
}

/** `<!doctype html>`:  its `<` and `>` faint. */
function marks(text: string): string {
  return `<span class="bubbly-mark">${ANGLE_OPEN}</span>${escape(text.slice(1, -1))}<span class="bubbly-mark">${ANGLE_CLOSE}</span>`
}

/** A value's white pill;  a quoted one's own `"` kept, see-through, its curly marks drawn just outside it, as Spell's. */
function valueOf(value: string, isQuoted: boolean): string {
  const words = escape(value) || "&nbsp;"
  return isQuoted
    ? `<span class="bubbly-quoted"><span class="bubbly-input">${QUOTE_OPEN}${words}${QUOTE_CLOSE}</span></span>`
    : `<span class="bubbly-input">${words}</span>`
}

/**
 * A `{…}` value, Spell worked out as it runs (`{its color}`):  its words on an INVERTED pill, so it stands apart
 * from a value typed in;  its braces outside it, darker than the tag's other marks (Owen).
 */
function expressionOf(value: string): string {
  const brace = (mark: string) => `<span class="bubbly-mark">${BubblyHtml.marksHtml(mark)}</span>`
  const words = value.slice(1, -1)
  return `${brace("{")}${words ? `<span class="bubbly-input bubbly-expression">${escape(words)}</span>` : ""}${brace("}")}`
}

/**
 * A tag's `<` and `>`, drawn as math's angle brackets, `⟨` `⟩`:  steeper, nearer the slant its pill's ends are cut at
 * (Owen).  The file's own `<` and `>` are kept, unseen, so a copied line copies them (`bubbly-angle`).
 */
const ANGLE_OPEN = `<span class="bubbly-angle bubbly-angle-open">&lt;</span>`
const ANGLE_CLOSE = `<span class="bubbly-angle bubbly-angle-close">&gt;</span>`

/** How a start tag's `>` is drawn:  as the file has it, or `/⟩`, an empty element's drawn self-closed (Q62). */
type TagEnds = "as-written" | "self-closed"

/** A start tag's `<`, faint. */
const ANGLE_OPEN_MARK = `<span class="bubbly-mark">${ANGLE_OPEN}</span>`

/** The `/` of an end tag, `</h2>`, and of `<br />`:  heavy, as the brackets beside it are. */
const SLASH = `<span class="bubbly-slash">/</span>`

/** An end tag's `/`, drawn as a bar flush after its `⟨`:  `</h2>` drawn `⟨|h2⟩`, as `</>` is `⟨|⟩` (Owen, 2026-11-14). */
const END_SLASH = `<span class="bubbly-slash bubbly-end-slash">/</span>`

/** A quoted value's marks:  the file's own `"`, kept for copying, its curly mark drawn by the sheet. */
const QUOTE_OPEN = `<span class="bubbly-quote-mark bubbly-quote-open">"</span>`
const QUOTE_CLOSE = `<span class="bubbly-quote-mark bubbly-quote-close">"</span>`

/** How many columns `line`'s indent takes, a tab 2. */
function indentOf(line: string): number {
  let columns = 0
  for (const char of line) {
    if (char === " ") columns++
    else if (char === "\t") columns += 2
    else break
  }
  return columns
}

/** Which column `offset` is at on its line, a tab 2, as `indentOf()` counts. */
function columnOf(source: string, offset: number): number {
  const lineStart = source.lastIndexOf("\n", offset - 1) + 1
  return indentOf(source.slice(lineStart, offset).replace(/\S/g, " "))
}

/** `text` safe in HTML. */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
