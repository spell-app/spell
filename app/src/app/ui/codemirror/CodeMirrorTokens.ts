import type { EditorState, Extension } from "@codemirror/state"
import { Decoration, type DecorationSet } from "@codemirror/view"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { BubblyMarkup, type MarkupNode } from "spell/app/app/components/spell-code/BubblyMarkup"
import { CodeRules, type CodeRole } from "spell/app/app/ui/CodeRules"
import { CodeMirrorRelayout } from "./CodeMirrorRelayout"

/****************
 * ### `CodeMirrorTokens`
 * Spell coloured by its tokens in a CodeMirror editor, with the bubbly look off:
 * keywords, names, types, properties, actions, constants, text, comments and `#` headings, each in its code colour.
 * - The colours come from the parser's own token pass, `SP.SpellHighlighter.spans()`, as `<spell-code>` colours
 *   a snippet:  no grammar of CodeMirror's own to keep in step with the parser.
 * - Each span's kind takes its role in the one table of code colours (`CodeRules.roleForScope()`),
 *   so a token is the same colour as in the app's other code:  `var(--ui-code-<role>)`, light or dark as the page is.
 * - Read by the file's own language's parser (`Spanish.es.spell` by Spanish's),
 *   and with its project's parse when that's of this very text, so a name declared in another file colours as one.
 * - A page file (`SP.formOfText()`) by its page tokens (`pageSpans()`), read by a page parser of its language,
 *   coloured this way (epic `codemirror` J14):
 *   - its prose and `<!-- ... -->` comments a comment
 *   - its head's name text, its flags (`notebook`) attribute names, the rest of it keywords
 *   - a tag's `<`, `>` and closers punctuation, its word a keyword, its attributes' names attribute names
 *   - markup (`<text>red</text>`) as HTML:  tag names, attribute names, values, punctuation
 *     (`BubblyMarkup.treeOf()`, the bubbly look's reading of markup)
 *   - the words inside a tag (`card in its cards`), and a `{…}` in markup, as Spell colours each tag's twin
 *     (`SP.PageTwin`):  from the page's parse, which parses the twins
 *   - NOT the highlighter's `spans()`:  it reads a page as plain Spell, so its prose would colour as code;
 *     and a twin's own words (`to draw it`) stand at their tag with no text of their own, so only the parse's tokens
 *     really in the file, at their own places, are coloured
 * - Typing never waits:  the marks follow the text, and are worked out again once it pauses (`CodeMirrorRelayout`).
 * - Its position in the import graph:  CodeMirror, the parser, the one table of code colours.
 * - NEVER throws:  a pass that fails leaves the text plain, and logs why.
 ****************/
export class CodeMirrorTokens {
  /**
   * The extension colouring a Spell file by its tokens.
   * - `fileOf()`:  the project file the editor shows, if it is one, for its language and its project's parse.
   */
  static extension(fileOf: () => SP.SpellFile | undefined): Extension {
    return CodeMirrorRelayout.extension(
      (state) => CodeMirrorTokens.decorationsOf(state, fileOf()),
      CodeMirrorTokens.RELAYOUT_MSEC,
      { isAwaitingParse: () => CodeMirrorRelayout.isUnparsed(fileOf()) }
    )
  }

  /** How long the typing must pause before the colours are worked out again, in msec:  as `CodeMirrorBubbly`'s. */
  static RELAYOUT_MSEC = 150

  /**
   * A mark for each coloured token of `state`'s text.
   * - `within`:  its project file, whose parse is read when it's of this very text.
   * - NEVER throws:  `Decoration.none` when the pass fails.
   */
  static decorationsOf(state: EditorState, within?: SP.SpellFile): DecorationSet {
    const text = state.doc.toString()
    try {
      const parser = within ? SP.Language.forFile(within.path).parser : SP.spellParser
      const parsed = within && SP.BubblyLayout.isParseOf(within, text) ? (within.match as P.Match) : undefined
      const spans =
        SP.formOfText(text) === "page"
          ? CodeMirrorTokens.pageSpans(text, CodeMirrorTokens.pageParserFor(parser), parsed)
          : SP.SpellHighlighter.spans(text, parser, parsed)
      const marks = spans.flatMap(({ start, end, kind }) => {
        const role = CodeRules.roleForScope(kind)
        return role && end > start ? [CodeMirrorTokens.markFor(role).range(start, end)] : []
      })
      return Decoration.set(marks, true)
    } catch (error) {
      console.error("CodeMirrorTokens:  couldn't colour the code", error)
      return Decoration.none
    }
  }

  /** The class a role's marks carry:  `cmt-<role>`, e.g. `cmt-keyword`. */
  static classFor(role: CodeRole): string {
    return `cmt-${role}`
  }

  /**
   * The coloured stretches of a page file's `text`, in order, never overlapping:  see the class's docstring.
   * - Two passes:  its page tokens first, then the parse's colours where they left a gap.
   * - `parsed`:  a parse of `text` already made, its project's;  else it's parsed by `pages`.
   * - Kinds are the highlighter's scopes (`SP.SpellHighlighter.SCOPES`), `name` and `attr` for markup's,
   *   so `CodeRules.roleForScope()` reads them.
   */
  static pageSpans(text: string, pages: SP.SpellParser, parsed?: P.Match): SP.SpellHighlightSpan[] {
    const { SCOPES } = SP.SpellHighlighter
    const spans: SP.SpellHighlightSpan[] = []
    const add = (start: number, end: number, kind: string) => {
      if (end > start) spans.push({ start, end, kind })
    }
    let markupEnd = 0
    P.Tokenizer.forEachToken(pages.tokenizer.tokenize(text) ?? [], (token) => {
      if (token instanceof SP.PageTagToken) CodeMirrorTokens.tagSpans(text, token, add)
      else if (token instanceof SP.PageCloserToken) add(token.start, token.end, SCOPES.operator)
      else if (token instanceof SP.PageProseToken || token instanceof SP.PageCommentToken)
        add(token.start, token.end, SCOPES.comment)
      else if (token instanceof P.JSXToken) {
        // the outermost markup only:  its elements and text are read again inside it
        if (token.start < markupEnd) return
        markupEnd = token.end
        CodeMirrorTokens.markupSpans(BubblyMarkup.treeOf(text, token.start, token.end), add)
      } else if (token.start < markupEnd) return
      else if (token instanceof P.TextToken) add(token.start, token.end, SCOPES.string)
      else if (token instanceof P.NumberToken) add(token.start, token.end, SCOPES.number)
    })
    const twins = CodeMirrorTokens.twinSpans(text, pages, parsed)
    // the tokens' colours first, where a twin's start at the same place
    const ordered = [...spans.map((span) => ({ span, rank: 0 })), ...twins.map((span) => ({ span, rank: 1 }))]
    ordered.sort((a, b) => a.span.start - b.span.start || a.rank - b.rank)
    const kept: SP.SpellHighlightSpan[] = []
    for (const { span } of ordered) if (!kept.length || span.start >= kept.at(-1)!.end) kept.push(span)
    return kept
  }

  /**
   * A page's head or tag, `token`, into `add`:
   * - a head, `"card api" is a notebook page`:  its flags attribute names, the rest after its name keywords
   *   (its name is a text token of its own, which follows)
   * - a tag, `<for card in its cards loading="Wait">`:  its `<`, `=` and `>` punctuation, its word a keyword,
   *   its attributes' names attribute names;  its phrase and values are left to the twins and text tokens
   */
  private static tagSpans(text: string, token: SP.PageTagToken, add: SpanAdder) {
    const { SCOPES } = SP.SpellHighlighter
    const { category, name, word, attributes, selfClosing } = token.tag
    if (category === "page") {
      let at = name ? (name.quoted?.end ?? name.start + name.text.length) : token.start
      for (const flag of attributes) {
        add(at, flag.start, SCOPES.keyword)
        add(flag.start, flag.start + flag.word.length, ATTRIBUTE)
        at = flag.start + flag.word.length
      }
      add(at, token.end, SCOPES.keyword)
      return
    }
    add(token.start, token.start + 1, SCOPES.operator)
    add(token.start + 1, token.start + 1 + word.length, SCOPES.keyword)
    for (const attribute of attributes) {
      const nameEnd = attribute.start + attribute.word.length
      add(attribute.start, nameEnd, ATTRIBUTE)
      if (text[nameEnd] === "=") add(nameEnd, nameEnd + 1, SCOPES.operator)
    }
    if (!token.raw?.endsWith(">")) return
    add(token.end - (selfClosing ? 2 : 1), token.end, SCOPES.operator)
  }

  /**
   * Markup's `nodes` into `add`, as HTML:  each tag's `<`, `</`, `=`, `>` and `/>` punctuation, its name a tag,
   * its attributes' names attribute names, their quoted values text;  comments a comment.
   * - A `{…}` value, and one between tags, is Spell:  left to the twins.
   */
  private static markupSpans(nodes: MarkupNode[], add: SpanAdder) {
    const { SCOPES } = SP.SpellHighlighter
    for (const node of nodes) {
      if (node.kind === "comment") add(node.start, node.end, SCOPES.comment)
      if (node.kind !== "element") continue
      const { open, close } = node
      add(open.start, open.start + 1, SCOPES.operator)
      add(open.start + 1, open.start + 1 + open.tag.length, TAG_NAME)
      for (const attribute of open.attributes) {
        add(attribute.nameStart, attribute.nameStart + attribute.name.length, ATTRIBUTE)
        if (attribute.equalsAt !== undefined) add(attribute.equalsAt, attribute.equalsAt + 1, SCOPES.operator)
        if (attribute.isQuoted && attribute.valueStart !== undefined && attribute.valueEnd !== undefined)
          add(attribute.valueStart - 1, attribute.valueEnd + 1, SCOPES.string)
      }
      add(open.end - (open.selfClosing ? 2 : 1), open.end, SCOPES.operator)
      CodeMirrorTokens.markupSpans(node.children, add)
      if (!close) continue
      add(close.start, close.start + 2, SCOPES.operator)
      add(close.start + 2, close.start + 2 + close.tag.length, TAG_NAME)
      add(close.end - 1, close.end, SCOPES.operator)
    }
  }

  /**
   * The colours the page's parse gives its tags' twins, and the `{…}` in its markup:  only the parse's tokens really in
   * the file, at their own places.
   * - A twin's own words (`SP.PageTwin.isSynthetic()`) stand at their tag, with no text of their own:  left out;
   *   so is any token whose text isn't the file's where it says it is (a `<for>`'s rider, `while waiting:`).
   * - Best effort:  none when the page doesn't parse.
   */
  private static twinSpans(text: string, pages: SP.SpellParser, parsed?: P.Match): SP.SpellHighlightSpan[] {
    try {
      const match = parsed ?? pages.parse(text, "block")
      if (!match) return []
      return SP.SpellHighlighter.matchSpans(
        match,
        (token) => !SP.PageTwin.isSynthetic(token) && text.slice(token.start, token.end) === token.raw
      )
    } catch {
      // a page that won't parse:  its tokens' colours stand
      return []
    }
  }

  /** `parser`'s page parser, its language's:  a page file's head, tags and prose are tokens of their own. */
  private static pageParserFor(parser: SP.SpellParser): SP.SpellParser {
    let pages = PAGE_PARSERS.get(parser)
    if (!pages) {
      const props = { module: "page colouring", form: "page" } as P.ParserProps
      pages = parser.clone(props) as SP.SpellParser
      PAGE_PARSERS.set(parser, pages)
    }
    return pages
  }

  /** The one mark for `role`:  its class, and its colour, weight and slant inline (`CodeRules.styleFor()`). */
  private static markFor(role: CodeRole): Decoration {
    let mark = ROLE_MARKS.get(role)
    if (!mark) {
      const { color, fontStyle, fontWeight } = CodeRules.styleFor(role)
      const style = [
        `color: ${color}`,
        fontStyle && `font-style: ${fontStyle}`,
        fontWeight && `font-weight: ${fontWeight}`
      ]
      mark = Decoration.mark({
        class: CodeMirrorTokens.classFor(role),
        attributes: { style: style.filter(Boolean).join("; ") }
      })
      ROLE_MARKS.set(role, mark)
    }
    return mark
  }
}

/**
 * Each language's page parser, by its plain one, made on first use:  a page file's tags are tokens of their own.
 * - NOT the project's twin (`SP.SpellParser.twinFor()`):  colouring needs no project.
 */
const PAGE_PARSERS = new WeakMap<SP.SpellParser, SP.SpellParser>()

/** Adds a coloured stretch, from `start` to `end`, of a highlighter's scope:  `pageSpans()`'s. */
type SpanAdder = (start: number, end: number, kind: string) => void

/** The highlight.js scope of a tag's name in a page's markup:  a `tag` (`CodeRules`). */
const TAG_NAME = "name"

/** The highlight.js scope of an attribute's name, a tag's or a head's flag:  a `member` (`CodeRules`). */
const ATTRIBUTE = "attr"

/** Each role's one mark, made on first use. */
const ROLE_MARKS = new Map<CodeRole, Decoration>()
