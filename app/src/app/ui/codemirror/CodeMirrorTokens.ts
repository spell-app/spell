import type { EditorState, Extension } from "@codemirror/state"
import { Decoration, type DecorationSet } from "@codemirror/view"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { CodeRules, type CodeRole } from "spell/app/app/ui/CodeRules"
import { CodeMirrorRelayout } from "./CodeMirrorRelayout"

/****************
 * ### `CodeMirrorTokens`
 * Spell coloured by its tokens in a CodeMirror editor, with the bubbly look off:
 * keywords, names, types, properties, actions, constants, text, comments and `#` headings, each in its code colour.
 * - The colours come from the parser's own token pass, `SP.SpellHighlighter.spans()`, as `<spell-code>` colours
 *   a snippet:  no grammar of CodeMirror's own to keep in step with the parser.
 * - Each span's kind takes its role in the one table of code colours (`CodeRules.roleForScope()`),
 *   so a token is the same colour in either editor:  `var(--ui-code-<role>)`, light or dark as the page is.
 * - Read by the file's own language's parser (`Spanish.es.spell` by Spanish's),
 *   and with its project's parse when that's of this very text, so a name declared in another file colours as one.
 * - A page file (`SP.formOfText()`) by its page tokens alone (`pageSpans()`), read by a page parser of its language:
 *   - its prose and `<!-- ... -->` comments a comment;  its head's name text, the rest of its head a keyword
 *   - a tag's `<` and closers punctuation, its word a keyword;  text and numbers in it as in Spell
 *   - the words inside a tag, and markup (`<text>red</text>`), stay plain:  colouring them by each tag's
 *     Spell twin isn't done yet
 *   - NOT the highlighter's pass:  it reads a page as plain Spell, and its parse's offsets are the twins', not the
 *     file's, so its colours land on the wrong letters
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
      CodeMirrorTokens.RELAYOUT_MSEC
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
          ? CodeMirrorTokens.pageSpans(text, CodeMirrorTokens.pageParserFor(parser))
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
   * The coloured stretches of a page file's `text`, by its page tokens alone, in order, never overlapping:
   * see the class's docstring.
   * - Kinds are the highlighter's scopes (`SP.SpellHighlighter.SCOPES`), so `CodeRules.roleForScope()` reads them.
   */
  static pageSpans(text: string, pages: SP.SpellParser): SP.SpellHighlightSpan[] {
    const { SCOPES } = SP.SpellHighlighter
    const spans: SP.SpellHighlightSpan[] = []
    const add = (start: number, end: number, kind: string) => {
      if (end > start) spans.push({ start, end, kind })
    }
    P.Tokenizer.forEachToken(pages.tokenizer.tokenize(text) ?? [], (token) => {
      if (token instanceof SP.PageTagToken) {
        if (token.tag.category === "page") {
          // the head:  its name is a text token of its own, which follows;  its own words after the name
          const { name } = token.tag
          const afterName = name ? (name.quoted?.end ?? name.start + name.text.length) : token.start
          add(afterName, token.end, SCOPES.keyword)
        } else {
          add(token.start, token.start + 1, SCOPES.operator)
          add(token.start + 1, token.start + 1 + token.tag.word.length, SCOPES.keyword)
        }
      } else if (token instanceof SP.PageCloserToken) add(token.start, token.end, SCOPES.operator)
      else if (token instanceof SP.PageProseToken || token instanceof SP.PageCommentToken)
        add(token.start, token.end, SCOPES.comment)
      else if (token instanceof P.TextToken) add(token.start, token.end, SCOPES.string)
      else if (token instanceof P.NumberToken) add(token.start, token.end, SCOPES.number)
    })
    spans.sort((a, b) => a.start - b.start)
    return spans.filter((span, index) => index === 0 || span.start >= spans[index - 1]!.end)
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

/** Each role's one mark, made on first use. */
const ROLE_MARKS = new Map<CodeRole, Decoration>()
