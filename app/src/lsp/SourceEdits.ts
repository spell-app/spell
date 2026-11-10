import type { Position, TextEdit } from "vscode-languageserver"

/**
 * The ONE place a program's text is changed by what a person did, rather than typed (epic `editor`):
 * the side bar's fields, an example's code on a notebook's page, and the app's parts added, moved and deleted.
 * - Every edit is a list of `TextEdit`s, the shape the language server already speaks:
 *   each changes only its own characters, and the rest of the file stays byte for byte.
 * - Plain text in, edits out:  it loads no parser, no language service and no code editor,
 *   so a side-bar edit works with the code editor not loaded.
 *   - So `spell/app/lsp/SourceEdits` is taken by file:  the folder's barrel loads the service.
 * - What a value's home is, read from the parse:  `SourceHomes`, beside it.
 * - Applying them to a file, the code editor or not:  `editor.applySourceEdits()`.
 * - Static and instance-free on purpose:  it holds nothing, and every caller has its own text.
 */
export class SourceEdits {
  ////////////////
  // ## Offsets and edits
  ////////////////

  /** The line and character of `offset` in `text`, both from 0. */
  static positionAt(text: string, offset: number): Position {
    const before = text.slice(0, offset)
    const line = before.split("\n").length - 1
    return { line, character: offset - (before.lastIndexOf("\n") + 1) }
  }

  /** The offset in `text` of `line`, `character`, both from 0. */
  static offsetAt(text: string, { line, character }: Position): number {
    let offset = 0
    for (let at = 0; at < line; at++) offset = text.indexOf("\n", offset) + 1
    return offset + character
  }

  /** The edit that puts `newText` in place of `span` of `text`. */
  static replacing(text: string, span: TextSpan, newText: string): TextEdit {
    return {
      range: { start: SourceEdits.positionAt(text, span.start), end: SourceEdits.positionAt(text, span.end) },
      newText
    }
  }

  /** `text` with `edits` made.  They don't overlap;  in any order:  the later ones go first, so offsets hold. */
  static applied(text: string, edits: readonly TextEdit[]): string {
    const spans = edits.map((edit) => ({
      start: SourceEdits.offsetAt(text, edit.range.start),
      end: SourceEdits.offsetAt(text, edit.range.end),
      newText: edit.newText
    }))
    spans.sort((one, other) => other.start - one.start)
    let result = text
    for (const { start, end, newText } of spans) result = result.slice(0, start) + newText + result.slice(end)
    return result
  }

  ////////////////
  // ## Tags
  ////////////////

  /**
   * The tag opening at `opening` in `text`, read as written:  its name, attributes and where each one is.
   * - Reads both shapes alike, and any language:  it only looks at the shape of a tag.
   * - A template tag's quoted name, `<spell-page "counter notebook">`, is its name's, never its attributes:
   *   a new attribute goes after it (`namedEnd`).
   * - `undefined` when no tag opens there.
   */
  static tagAt(text: string, opening: number): WrittenTag | undefined {
    if (text[opening] !== "<") return undefined
    const end = endOfTag(text, opening + 1)
    if (end < 0) return undefined
    const nameEnd = opening + 1 + /^[^\s/>]*/.exec(text.slice(opening + 1, end))![0].length
    const quotedName = /^\s+"[^"]*"/.exec(text.slice(nameEnd, end))
    const namedEnd = nameEnd + (quotedName?.[0].length ?? 0)
    const attributes: WrittenAttribute[] = []
    // a quoted text on its own is skipped:  no attribute's
    const inside = /"[^"]*"|'[^']*'|([a-zA-Z][\w-]*)(?:=("[^"]*"|'[^']*'|\{))?/g
    inside.lastIndex = namedEnd
    let match: RegExpExecArray | null
    while ((match = inside.exec(text)) && match.index < end) {
      const [whole, name, value] = match
      if (!name) continue
      const start = match.index
      if (value === "{") {
        const valueStart = inside.lastIndex
        const close = closingBrace(text, valueStart)
        inside.lastIndex = close + 1
        attributes.push({
          name,
          quote: "{",
          span: { start, end: close + 1 },
          valueSpan: { start: valueStart, end: close }
        })
      } else {
        const stop = start + whole.length
        attributes.push({
          name,
          quote: value ? (value[0] as '"' | "'") : undefined,
          span: { start, end: stop },
          valueSpan: value ? { start: stop - value.length + 1, end: stop - 1 } : undefined
        })
      }
    }
    return { start: opening, nameEnd, namedEnd, end: end + 1, attributes, selfClosing: text[end - 1] === "/" }
  }

  /**
   * The edits that say `word="value"` on the tag at `opening`, keeping its quotes as written.
   * - `true`:  a bare `word`;  `false`, `undefined`, or `""`:  the attribute goes.
   * - throws `TypeError` when no tag opens there, or its value is written as an expression:
   *   that's code, which the side bar doesn't rewrite.
   */
  static settingAttribute(text: string, opening: number, word: string, value: AttributeValue): TextEdit[] {
    const tag = SourceEdits.tagAt(text, opening)
    if (!tag) throw new TypeError(`SourceEdits.settingAttribute():  no tag opens at ${opening};  find it again first`)
    const attribute = tag.attributes.find((each) => each.name === word)
    if (attribute?.quote === "{") {
      throw new TypeError(`SourceEdits.settingAttribute():  \`${word}\` is an expression;  open the code instead`)
    }
    const isGone = value === false || value === undefined || value === ""
    if (attribute && isGone) {
      // with the space before it
      return [SourceEdits.replacing(text, { start: attribute.span.start - 1, end: attribute.span.end }, "")]
    }
    if (isGone) return []
    const written = value === true ? word : `${word}=${quoted(String(value), attribute?.quote ?? '"')}`
    if (attribute) return [SourceEdits.replacing(text, attribute.span, written)]
    return [SourceEdits.replacing(text, { start: tag.namedEnd, end: tag.namedEnd }, ` ${written}`)]
  }

  ////////////////
  // ## Whole elements
  ////////////////

  /**
   * The whole element opening at `opening`, its closing tag and all:  `undefined` when no tag opens there, or it never closes.
   * - Spell's own closer, `</>`, closes whatever's open.
   */
  static elementAt(text: string, opening: number): WrittenElement | undefined {
    const tag = SourceEdits.tagAt(text, opening)
    if (!tag) return undefined
    if (tag.selfClosing) return { tag, start: opening, end: tag.end }
    let depth = 1
    let at = tag.end
    while (depth > 0) {
      at = text.indexOf("<", at)
      if (at < 0) return undefined
      if (text.startsWith("</", at)) {
        const close = text.indexOf(">", at)
        if (close < 0) return undefined
        depth--
        at = close + 1
        if (depth === 0)
          return { tag, start: opening, end: at, bodyStart: tag.end, bodyEnd: text.lastIndexOf("</", at) }
        continue
      }
      const inner = SourceEdits.tagAt(text, at)
      if (!inner || !/^<[a-zA-Z]/.test(text.slice(at, at + 2))) {
        at++
        continue
      }
      at = inner.end
      if (!inner.selfClosing) depth++
    }
    return undefined
  }

  /**
   * `text` with `code` written at `place`, indented as what's around it is, and each thing kept on its own line.
   * - Inside a tag closed with `/>`:  it opens to hold it.
   * - Beside a run of prose (`place.whole`), or a run of prose written:  a blank line between them,
   *   so two runs never join into one (epic `notebook` P5).
   * - `start`:  where `code` starts in the new text, to find it by.
   * - throws `TypeError` when no element opens at `place.opening`, or `place` is inside a run of prose.
   */
  static written(text: string, place: ElementPlace, code: string): { text: string; start: number } {
    const element = place.whole ? undefined : SourceEdits.elementAt(text, place.opening)
    // what it's written beside:  the element, or the run of prose
    const beside = place.whole ?? element
    if (!beside)
      throw new TypeError(`SourceEdits.written():  no element opens at ${place.opening};  find it again first`)
    const indent = indentAt(text, place.opening)
    const gap = place.whole || isProse(code) ? "\n" : ""
    if (place.where === "inside") {
      if (!element)
        throw new TypeError("SourceEdits.written():  nothing goes inside a run of prose;  write it before or after it")
      const inner = indent + indentStep(text)
      const block = `${inner}${indented(code, inner)}\n`
      if (element.bodyStart === undefined) {
        const name = text.slice(element.start + 1, element.tag.nameEnd)
        const head = text.slice(element.start, element.end).replace(/\s*\/>$/, ">")
        const whole = `${head}\n${block}${indent}</${name}>`
        return {
          text: replaceSpan(text, element, whole),
          start: element.start + head.length + 1 + inner.length
        }
      }
      const body = text.slice(element.bodyStart, element.bodyEnd)
      const start = element.bodyStart + body.trimEnd().length
      // after a run of prose, a blank line:  as beside one
      const after = isProse(body.trimEnd().split("\n").at(-1)!) ? "\n" : ""
      const closed = `\n${after}${block}${indent}`
      return {
        text: replaceSpan(text, { start, end: element.bodyEnd! }, closed),
        start: start + 1 + after.length + inner.length
      }
    }
    if (place.where === "before") {
      const block = `${indented(code, indent)}\n${gap}${indent}`
      return { text: replaceSpan(text, { start: beside.start, end: beside.start }, block), start: beside.start }
    }
    const block = `\n${gap}${indent}${indented(code, indent)}`
    return {
      text: replaceSpan(text, { start: beside.end, end: beside.end }, block),
      start: beside.end + 1 + gap.length + indent.length
    }
  }

  /** The element at `span`, as code with no indent of its own, to write somewhere else. */
  static codeOf(text: string, span: TextSpan): string {
    return dedented(text.slice(span.start, span.end), indentAt(text, span.start))
  }

  /**
   * `text` without the elements at `spans`, each taking its own lines with it when it's alone there.
   * - And a blank line after it, when one's before it too:  no gap left twice as wide.
   */
  static without(text: string, spans: readonly TextSpan[]): string {
    let result = text
    for (const span of [...spans].sort((one, other) => other.start - one.start)) {
      result = replaceSpan(result, removedOf(result, span), "")
    }
    return result
  }

  /**
   * `text` with the elements at `spans` moved to `place`, in the order they're written.
   * - Only those characters change:  each keeps its words and its comments, taking the indent of where it lands.
   * - `start`:  where the first starts in the new text, then where each one does.
   * - throws `TypeError` when `place` is inside one of `spans`:  nothing can go inside itself.
   */
  static moved(text: string, spans: readonly TextSpan[], place: ElementPlace): { text: string; starts: number[] } {
    const ordered = [...spans].sort((one, other) => one.start - other.start)
    if (ordered.some((span) => place.opening >= span.start && place.opening < span.end)) {
      throw new TypeError("SourceEdits.moved():  an element can't go inside itself;  choose a place outside it")
    }
    const codes = ordered.map((span) => SourceEdits.codeOf(text, span))
    // the place's offset, once what's moving has gone from before it
    const gone = ordered.filter((span) => span.end <= place.opening)
    const lost = gone.reduce((sum, span) => {
      const removed = removedOf(text, span)
      return sum + removed.end - removed.start
    }, 0)
    const whole = place.whole && { start: place.whole.start - lost, end: place.whole.end - lost }
    return SourceEdits.writtenAll(
      SourceEdits.without(text, ordered),
      { ...place, opening: place.opening - lost, ...(whole && { whole }) },
      codes
    )
  }

  /**
   * `text` with each of `codes` written at `place`, in order, each on its own line.
   * - `starts`:  where each one starts in the new text.
   */
  static writtenAll(text: string, place: ElementPlace, codes: readonly string[]): { text: string; starts: number[] } {
    // runs of prose written together keep a blank line between them, as `written()` does
    const joiner = codes.some(isProse) ? `\n\n` : `\n`
    const indent =
      place.where === "inside" ? indentAt(text, place.opening) + indentStep(text) : indentAt(text, place.opening)
    const { text: result, start } = SourceEdits.written(text, place, codes.join(joiner))
    const starts: number[] = []
    let at = start
    for (const code of codes) {
      starts.push(at)
      at += indented(code, indent).length + joiner.length + indent.length
    }
    return { text: result, starts }
  }

  /**
   * The one edit that turns `before` into `after`:  the smallest span that differs, widened to whole lines,
   * so its text is enough to find again (`EditorHistory`).
   */
  static editBetween(before: string, after: string): { edit: TextEdit; span: TextSpan; newText: string } {
    let start = 0
    while (start < before.length && start < after.length && before[start] === after[start]) start++
    let end = 0
    while (
      end < before.length - start &&
      end < after.length - start &&
      before[before.length - 1 - end] === after[after.length - 1 - end]
    ) {
      end++
    }
    const lineStart = before.lastIndexOf("\n", start - 1) + 1
    const foundEnd = before.indexOf("\n", before.length - end)
    const lineEnd = foundEnd < 0 ? before.length : foundEnd
    const span = { start: lineStart, end: Math.max(lineEnd, lineStart) }
    // the line before too, when it'd leave nothing to find again
    if (lineStart === span.end || lineStart === after.length - (before.length - span.end)) {
      span.start = Math.max(before.lastIndexOf("\n", lineStart - 2) + 1, 0)
    }
    const newText = after.slice(span.start, after.length - (before.length - span.end))
    return { edit: SourceEdits.replacing(before, span, newText), span, newText }
  }
}

////////////////
// ## Types
////////////////

/** Where something is in a file's text:  character offsets, `end` exclusive. */
export type TextSpan = { start: number; end: number }

/** A whole element as written:  see `SourceEdits.elementAt()`. */
export type WrittenElement = TextSpan & {
  /** its opening tag */
  tag: WrittenTag
  /** where what's inside it starts:  none, for a tag closed with `/>` */
  bodyStart?: number
  /** where what's inside it ends */
  bodyEnd?: number
}

/** Where to write something, beside or inside the element opening at `opening`. */
export type ElementPlace = {
  /** offset of that element's `<`;  of a run of prose's first character */
  opening: number
  /** beside it, or last inside it */
  where: "before" | "after" | "inside"
  /**
   * what's at `opening`, when it's a run of prose rather than a tag (`NotebookPageCells.proseAt()`):
   * its whole span, which no tag says
   * - only beside it:  nothing goes inside prose
   */
  whole?: TextSpan
}

/** What an attribute can be set to:  see `SourceEdits.settingAttribute()`. */
export type AttributeValue = string | number | boolean | undefined

/** A tag as written:  see `SourceEdits.tagAt()`. */
export type WrittenTag = {
  /** offset of its `<` */
  start: number
  /** offset just past its name */
  nameEnd: number
  /** offset just past its name and its quoted name, if it has one (`<spell-page "x"`):  where a new attribute goes */
  namedEnd: number
  /** offset just past its `>` */
  end: number
  /** its attributes, in order */
  attributes: WrittenAttribute[]
  /** `<x />`:  no body */
  selfClosing: boolean
}

/** One attribute of a tag, as written. */
export type WrittenAttribute = {
  /** its word as written:  `color`, `onClick` */
  name: string
  /** how its value is written:  `undefined` for a bare one */
  quote: '"' | "'" | "{" | undefined
  /** the whole attribute */
  span: TextSpan
  /** its value, inside its quotes or braces */
  valueSpan: TextSpan | undefined
}

////////////////
// ## Helpers
////////////////

/** `text` with `span` replaced by `replacement`. */
export function replaceSpan(text: string, span: TextSpan, replacement: string): string {
  return text.slice(0, span.start) + replacement + text.slice(span.end)
}

/** The whitespace `offset`'s line starts with, up to `offset`. */
export function indentAt(text: string, offset: number): string {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1
  return /^[ \t]*/.exec(text.slice(lineStart, offset))![0]
}

/** `code` with `indent` taken off every line after the first that starts with it. */
export function dedented(code: string, indent: string): string {
  if (!indent) return code
  return code
    .split("\n")
    .map((line, i) => (i > 0 && line.startsWith(indent) ? line.slice(indent.length) : line))
    .join("\n")
}

/** `code` with `indent` put on every non-empty line after the first. */
export function indented(code: string, indent: string): string {
  if (!indent) return code
  return code
    .split("\n")
    .map((line, i) => (i > 0 && line ? indent + line : line))
    .join("\n")
}

/** How much a block's inside is indented in `text`:  a tab where it uses tabs, else two spaces. */
function indentStep(text: string): string {
  return /^\t/m.test(text) ? "\t" : "  "
}

/** `span` with its whole lines, when nothing else is on them:  else `span`, taking the space before it too. */
function wholeLinesOf(text: string, span: TextSpan): TextSpan {
  const lineStart = text.lastIndexOf("\n", span.start - 1) + 1
  const foundEnd = text.indexOf("\n", span.end)
  const lineEnd = foundEnd < 0 ? text.length : foundEnd
  const isAlone = !text.slice(lineStart, span.start).trim() && !text.slice(span.end, lineEnd).trim()
  if (isAlone) return { start: lineStart, end: foundEnd < 0 ? lineEnd : lineEnd + 1 }
  const spaces = /[ \t]*$/.exec(text.slice(lineStart, span.start))![0].length
  return { start: span.start - spaces, end: span.end }
}

/**
 * What goes with the element at `span` when it's taken out:
 * - its whole lines (`wholeLinesOf()`)
 * - and a blank line round them, when one's before them and another after, or its block's closing tag:
 *   no gap left twice as wide, nor one left before a closer
 */
function removedOf(text: string, span: TextSpan): TextSpan {
  const lines = wholeLinesOf(text, span)
  // alone on its lines:  they go from a line's start to just past its end
  const isAlone = (lines.start === 0 || text[lines.start - 1] === "\n") && text[lines.end - 1] === "\n"
  const blankBefore = isAlone ? /(?:^|\n)([ \t]*\n)$/.exec(text.slice(0, lines.start)) : null
  if (!blankBefore) return lines
  const after = text.slice(lines.end)
  const blankAfter = /^[ \t]*\n/.exec(after)
  if (blankAfter) return { start: lines.start, end: lines.end + blankAfter[0].length }
  return /^[ \t]*<\//.test(after) ? { start: lines.start - blankBefore[1]!.length, end: lines.end } : lines
}

/** Is `code` a run of prose, not a tag:  it starts with words, not `<` or `{`;  nothing's none. */
function isProse(code: string): boolean {
  const start = code.trimStart()
  return !!start && !start.startsWith("<") && !start.startsWith("{")
}

/** `value` in `quote`, a `"` in it written `&quot;`, a `'` as `&#39;`. */
function quoted(value: string, quote: '"' | "'"): string {
  return quote + value.replaceAll(quote, quote === '"' ? "&quot;" : "&#39;") + quote
}

/** The index of the `>` closing a tag opened before `from`, past any `{...}` and quoted values;  -1 if none. */
export function endOfTag(text: string, from: number): number {
  let depth = 0
  for (let i = from; i < text.length; i++) {
    const c = text[i]
    if (c === '"' || c === "'") {
      i = text.indexOf(c, i + 1)
      if (i < 0) return -1
    } else if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth === 0) return i
  }
  return -1
}

/** The index of the `}` closing a brace opened just before `from`. */
function closingBrace(text: string, from: number): number {
  let depth = 1
  let i = from
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++
    else if (text[i] === "}" && --depth === 0) return i
  }
  return i
}
