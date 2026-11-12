/****************
 * ### `BubblyMarkup`
 * HTML source drawn in the bubbly look, as HTML in the classes of the look's ONE sheet, `bubbly.css` beside it
 * (epic `language`, Owen 2026-11-11):  the same shapes as Spell's, their corners cut (`bubbly-html`).
 * - Each element with children on lines of their own is a `bubbly-block`:
 *   its start tag the band, its children the body, its end tag a band of its own under the rail (`bubbly-foot-pill`).
 * - An element on one line, or with nothing inside, is a `bubbly-pill`:  start tag, what's inside, end tag.
 * - An attribute's value is a white pill on its band (`bubbly-input`), a quoted one with Spell's curly marks just
 *   outside it (`bubbly-quoted`);  `<`, `=` and `>` are faint marks, `<` and `>` drawn as `❮` `❯`.
 * - The band's colour says what kind of element it is, in Spell's parts of speech (`partOfSpeechOf()`).
 * - Text, a `<style>`'s or `<script>`'s lines, a comment:  plain lines in their element's body.
 * - Its own small reader, not a full HTML parser:  enough for hand-written pages, the drawn-bubbly page's examples.
 * - Strings, not DOM, as `BubblyHtml`:  the page's script runs in node.
 * - STATIC and instance-free:  HTML source in, its drawing out.
 ****************/
export class BubblyMarkup {
  /** `source`, an HTML file or fragment, drawn bubbly. */
  static write(source: string): string {
    const nodes = treeOf(tokensOf(source))
    return `<div class="bubbly bubbly-html">${new MarkupWriter(source).nodes(nodes)}</div>`
  }

  /**
   * The part of speech an element's band takes, by its tag:
   * - `thing` (purple):  what lays a page out, and custom elements (`ui-*`, `spell-*`)
   * - `action` (green):  what a person clicks or types into
   * - `property`:  text and what sits in it
   * - `plain` (grey):  the page's head, and the rest
   */
  static partOfSpeechOf(tag: string): MarkupPartOfSpeech {
    const name = tag.toLowerCase()
    if (name.includes("-") || LAYOUT.has(name)) return "thing"
    if (INTERACTIVE.has(name)) return "action"
    if (TEXT.has(name)) return "property"
    return "plain"
  }
}

/** The parts of speech an element's band can take. */
export type MarkupPartOfSpeech = "thing" | "action" | "property" | "plain"

/** Elements that lay a page out:  purple. */
const LAYOUT = new Set(
  "html body main header footer nav section article aside div ul ol dl table thead tbody tfoot tr figure fieldset dialog template slot".split(
    " "
  )
)

/** Elements a person clicks or types into:  green. */
const INTERACTIVE = new Set("a button input select option textarea form label details summary".split(" "))

/** Text and what sits in it. */
const TEXT = new Set(
  "p span h1 h2 h3 h4 h5 h6 strong em b i u s small code pre kbd mark q blockquote cite li dt dd td th caption img figcaption sup sub abbr time".split(
    " "
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

/** One attribute of a start tag:  its name, and its value without its quotes (none for `disabled`). */
type Attribute = { name: string; value?: string; isQuoted: boolean }

/** One piece of the source, in order. */
type Token =
  | { kind: "text"; start: number; end: number }
  | { kind: "comment"; start: number; end: number }
  | { kind: "doctype"; start: number; end: number }
  | { kind: "start"; start: number; end: number; tag: string; attributes: Attribute[]; selfClosing: boolean }
  | { kind: "end"; start: number; end: number; tag: string }

/** An element and what's inside it, or a piece of text or a comment. */
type MarkupNode =
  | { kind: "text" | "comment" | "doctype"; start: number; end: number }
  | {
      kind: "element"
      start: number
      end: number
      tag: string
      open: Extract<Token, { kind: "start" }>
      close?: Extract<Token, { kind: "end" }>
      children: MarkupNode[]
    }

/** `source`'s tokens. */
function tokensOf(source: string): Token[] {
  const tokens: Token[] = []
  let at = 0
  const text = (end: number) => {
    if (end > at) tokens.push({ kind: "text", start: at, end })
  }
  while (at < source.length) {
    const next = source.indexOf("<", at)
    if (next < 0) break
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
    const endTag = /^<\/([A-Za-z][\w:-]*)\s*>/.exec(source.slice(at))
    if (endTag) {
      tokens.push({ kind: "end", start: at, end: at + endTag[0].length, tag: endTag[1]!.toLowerCase() })
      at += endTag[0].length
      continue
    }
    const startTag = /^<([A-Za-z][\w:-]*)/.exec(source.slice(at))
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
  if (at < source.length) tokens.push({ kind: "text", start: at, end: source.length })
  return tokens
}

/** A start tag's attributes, from `at` just past its name, to its `>`. */
function attributesFrom(source: string, at: number): { attributes: Attribute[]; end: number; selfClosing: boolean } {
  const attributes: Attribute[] = []
  const pattern = /\s*(?:(\/?>)|([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?|\/)/y
  pattern.lastIndex = at
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (match[1]) return { attributes, end: pattern.lastIndex, selfClosing: match[1] === "/>" }
    if (match[2])
      attributes.push({ name: match[2], value: match[3] ?? match[4] ?? match[5], isQuoted: match[5] === undefined })
  }
  return { attributes, end: source.length, selfClosing: false }
}

/** `tokens` as a tree:  an end tag closes the nearest open element of its name;  one that closes nothing is dropped. */
function treeOf(tokens: Token[]): MarkupNode[] {
  const root: MarkupNode[] = []
  const open: Extract<MarkupNode, { kind: "element" }>[] = []
  const add = (node: MarkupNode) => (open.at(-1)?.children ?? root).push(node)
  for (const token of tokens) {
    if (token.kind === "start") {
      const element: Extract<MarkupNode, { kind: "element" }> = {
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
      const index = open.findLastIndex((element) => element.tag === token.tag)
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
  private element(element: Extract<MarkupNode, { kind: "element" }>): string {
    const kind = `bubbly-${BubblyMarkup.partOfSpeechOf(element.tag)}`
    const inside = element.children.filter((child) => child.kind !== "text" || this.slice(child).trim())
    const insideText = element.close ? this.source.slice(element.open.end, element.close.start) : ""
    if (!inside.length)
      return `<p class="bubbly-pill ${kind}">${this.startTag(element.open)}${this.endTag(element.close)}</p>`
    if (!insideText.includes("\n")) return `<p class="bubbly-line">${this.inline([element])}</p>`
    return (
      `<div class="bubbly-block ${kind}"><p class="bubbly-head-pill">${this.startTag(element.open)}</p>` +
      `<div class="bubbly-gutter"></div><div class="bubbly-body">${this.nodes(element.children)}</div>` +
      (element.close
        ? `<p class="bubbly-foot bubbly-foot-pill">${this.endTag(element.close, "block")}</p>`
        : `<div class="bubbly-foot"></div>`) +
      `</div>`
    )
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

  /** An element on a line's paper:  its start tag a pill, what's inside it, its end tag a pill;  with nothing inside, one pill. */
  private tagPills(element: Extract<MarkupNode, { kind: "element" }>): string {
    const kind = `bubbly-tag-pill bubbly-${BubblyMarkup.partOfSpeechOf(element.tag)}`
    const inside = this.inline(element.children)
    if (!inside.trim())
      return `<span class="${kind}">${this.startTag(element.open)}${this.endTag(element.close)}</span>`
    const close = element.close ? `<span class="${kind}">${this.endTag(element.close)}</span>` : ""
    return `<span class="${kind}">${this.startTag(element.open)}</span>${inside}${close}`
  }

  /** A start tag on its band:  `<` faint, its name, each value a white pill. */
  private startTag(tag: Extract<Token, { kind: "start" }>): string {
    const attributes = tag.attributes
      .map(({ name, value, isQuoted }) =>
        value === undefined
          ? ` ${escape(name)}`
          : ` ${escape(name)}<span class="bubbly-mark">=</span>${valueOf(value, isQuoted)}`
      )
      .join("")
    return `<span class="bubbly-mark">${ANGLE_OPEN}</span><span class="bubbly-tag-name">${tag.tag}</span>${attributes}<span class="bubbly-mark">${tag.selfClosing ? `${SLASH}${ANGLE_CLOSE}` : ANGLE_CLOSE}</span>`
  }

  /**
   * An end tag:  `</` and `>` faint, its name in the ink;  none, nothing.
   * - `"block"`:  a block's, on its foot under the gutter, its name faint too:  the gutter already shows where it ends
   */
  private endTag(tag: Extract<Token, { kind: "end" }> | undefined, place: "block" | "inline" = "inline"): string {
    if (!tag) return ""
    const name = `<span class="bubbly-tag-name">${tag.tag}</span>`
    return place === "block"
      ? `<span class="bubbly-mark">${ANGLE_OPEN}${SLASH}${name}${ANGLE_CLOSE}</span>`
      : `<span class="bubbly-mark">${ANGLE_OPEN}${SLASH}</span>${name}<span class="bubbly-mark">${ANGLE_CLOSE}</span>`
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
 * A tag's `<` and `>`, drawn as heavy angle brackets, `❮` `❯`:  steeper, nearer the slant its pill's ends are cut at
 * (Owen).  The file's own `<` and `>` are kept, unseen, so a copied line copies them (`bubbly-angle`).
 */
const ANGLE_OPEN = `<span class="bubbly-angle bubbly-angle-open">&lt;</span>`
const ANGLE_CLOSE = `<span class="bubbly-angle bubbly-angle-close">&gt;</span>`

/** The `/` of an end tag, `</h2>`, and of `<br />`:  heavy, as the brackets beside it are. */
const SLASH = `<span class="bubbly-slash">/</span>`

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

/** `text` safe in HTML. */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
