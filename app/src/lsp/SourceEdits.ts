import type { Position, TextEdit } from "vscode-languageserver"

/**
 * The ONE place a program's text is changed by what a person did, rather than typed (epic `editor`):
 * the side bar's fields, the notebook's add, move and delete, and the app's parts added, moved and deleted.
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
   * - Reads `.spell` and `.spellml` alike, and any language:  it only looks at the shape of a tag.
   * - `undefined` when no tag opens there.
   */
  static tagAt(text: string, opening: number): WrittenTag | undefined {
    if (text[opening] !== "<") return undefined
    const end = endOfTag(text, opening + 1)
    if (end < 0) return undefined
    const nameEnd = opening + 1 + /^[^\s/>]*/.exec(text.slice(opening + 1, end))![0].length
    const attributes: WrittenAttribute[] = []
    const inside = /([a-zA-Z][\w-]*)(?:=("[^"]*"|'[^']*'|\{))?/g
    inside.lastIndex = nameEnd
    let match: RegExpExecArray | null
    while ((match = inside.exec(text)) && match.index < end) {
      const [whole, name, value] = match
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
    return { start: opening, nameEnd, end: end + 1, attributes, selfClosing: text[end - 1] === "/" }
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
    return [SourceEdits.replacing(text, { start: tag.nameEnd, end: tag.nameEnd }, ` ${written}`)]
  }

  ////////////////
  // ## Blocks of text
  ////////////////

  /** The edits that trade `first` and `second`, in that order in `text`:  the lines between them stay. */
  static swapped(text: string, first: TextSpan, second: TextSpan): TextEdit[] {
    return [
      SourceEdits.replacing(text, first, text.slice(second.start, second.end)),
      SourceEdits.replacing(text, second, text.slice(first.start, first.end))
    ]
  }

  /**
   * The edit that takes `span`'s lines out of `text`, and a blank line after it when one's before it too.
   * - Nor a blank line left before its block's closing tag, when it was the last in its block.
   */
  static deletedLines(text: string, span: TextSpan): TextEdit {
    const start = text.lastIndexOf("\n", span.start - 1) + 1
    let end = text.indexOf("\n", span.end)
    end = end < 0 ? text.length : end + 1
    const before = text.slice(0, start)
    if (before.endsWith("\n\n") && /^[ \t]*\n/.test(text.slice(end))) end = text.indexOf("\n", end) + 1
    else if (before.endsWith("\n\n") && /^[ \t]*<\//.test(text.slice(end))) {
      return SourceEdits.replacing(text, { start: start - 1, end }, "")
    }
    return SourceEdits.replacing(text, { start, end }, "")
  }

  /**
   * The edit that adds `code` as a block of its own, on the line after the one holding `after`, a blank line before it.
   * - `code` has no indent:  it takes `indent`, on every line.
   * - `start`:  where its code starts in the new text, to find it by.
   */
  static insertedAfterLine(text: string, after: number, code: string, indent: string) {
    const lineEnd = text.indexOf("\n", after)
    const at = lineEnd < 0 ? text.length : lineEnd
    const edit = SourceEdits.replacing(text, { start: at, end: at }, `\n\n${indent}${indented(code, indent)}`)
    return { edit, start: at + 2 + indent.length }
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
   * - `start`:  where `code` starts in the new text, to find it by.
   * - throws `TypeError` when no element opens at `place.opening`.
   */
  static written(text: string, place: ElementPlace, code: string): { text: string; start: number } {
    const element = SourceEdits.elementAt(text, place.opening)
    if (!element)
      throw new TypeError(`SourceEdits.written():  no element opens at ${place.opening};  find it again first`)
    const indent = indentAt(text, place.opening)
    if (place.where === "inside") {
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
      const closed = `\n${block}${indent}`
      return {
        text: replaceSpan(text, { start, end: element.bodyEnd! }, closed),
        start: start + 1 + inner.length
      }
    }
    if (place.where === "before") {
      const block = `${indented(code, indent)}\n${indent}`
      return { text: replaceSpan(text, { start: element.start, end: element.start }, block), start: element.start }
    }
    const block = `\n${indent}${indented(code, indent)}`
    return {
      text: replaceSpan(text, { start: element.end, end: element.end }, block),
      start: element.end + 1 + indent.length
    }
  }

  /** The element at `span`, as code with no indent of its own, to write somewhere else. */
  static codeOf(text: string, span: TextSpan): string {
    return dedented(text.slice(span.start, span.end), indentAt(text, span.start))
  }

  /** `text` without the elements at `spans`, each taking its own line with it when it's alone there. */
  static without(text: string, spans: readonly TextSpan[]): string {
    let result = text
    for (const span of [...spans].sort((one, other) => other.start - one.start)) {
      result = replaceSpan(result, wholeLinesOf(result, span), "")
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
      const lines = wholeLinesOf(text, span)
      return sum + lines.end - lines.start
    }, 0)
    return SourceEdits.writtenAll(
      SourceEdits.without(text, ordered),
      { ...place, opening: place.opening - lost },
      codes
    )
  }

  /**
   * `text` with each of `codes` written at `place`, in order, each on its own line.
   * - `starts`:  where each one starts in the new text.
   */
  static writtenAll(text: string, place: ElementPlace, codes: readonly string[]): { text: string; starts: number[] } {
    const joiner = `\n`
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
  /** offset of that element's `<` */
  opening: number
  /** beside it, or last inside it */
  where: "before" | "after" | "inside"
}

/** What an attribute can be set to:  see `SourceEdits.settingAttribute()`. */
export type AttributeValue = string | number | boolean | undefined

/** A tag as written:  see `SourceEdits.tagAt()`. */
export type WrittenTag = {
  /** offset of its `<` */
  start: number
  /** offset just past its name */
  nameEnd: number
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
