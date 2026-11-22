import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { BubblyMarkup, type MarkupNode } from "spell/app/app/components/spell-code/BubblyMarkup"

/****************
 * ### `CodeColours`
 * Spell's colours with the bubbly look off, as stretches of its text:  what the code editor colours a file by
 * (`CodeMirrorTokens`), worked out on the page or in the language worker (epic `solid-2-final` T36).
 * - A Spell file by the parser's own token pass, `SP.SpellHighlighter.spans()`.
 * - A page file (`SP.formOfText()`) by its page tokens, then its parse's twins (`pageSpans()`).
 * - Its position in the import graph:  the parser, and the app's reading of markup (`BubblyMarkup`);
 *   NEVER CodeMirror or the DOM, so the language worker reads it.
 ****************/
export class CodeColours {
  /**
   * The coloured stretches of `text`, in order, never overlapping:  read by `parser`, its file's language's.
   * - `parsed`:  its project's parse of this very text, if there is one;  else it's parsed alone.
   */
  static spansOf(text: string, parser: SP.SpellParser, parsed?: P.Match): SP.SpellHighlightSpan[] {
    return SP.formOfText(text) === "page"
      ? CodeColours.pageSpans(text, CodeColours.pageParserFor(parser), parsed)
      : SP.SpellHighlighter.spans(text, parser, parsed)
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
      if (token instanceof SP.PageTagToken) CodeColours.tagSpans(text, token, add)
      else if (token instanceof SP.PageCloserToken) add(token.start, token.end, SCOPES.operator)
      else if (token instanceof SP.PageProseToken || token instanceof SP.PageCommentToken)
        add(token.start, token.end, SCOPES.comment)
      else if (token instanceof P.JSXToken) {
        // the outermost markup only:  its elements and text are read again inside it
        if (token.start < markupEnd) return
        markupEnd = token.end
        CodeColours.markupSpans(BubblyMarkup.treeOf(text, token.start, token.end), add)
      } else if (token.start < markupEnd) return
      else if (token instanceof P.TextToken) add(token.start, token.end, SCOPES.string)
      else if (token instanceof P.NumberToken) add(token.start, token.end, SCOPES.number)
    })
    const twins = CodeColours.twinSpans(text, pages, parsed)
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
      CodeColours.markupSpans(node.children, add)
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
