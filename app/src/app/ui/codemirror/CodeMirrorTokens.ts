import type { EditorState, Extension } from "@codemirror/state"
import { Decoration, type DecorationSet } from "@codemirror/view"

import type { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { CodeColours } from "spell/app/app/ui/CodeColours"
import { CodeRules, type CodeRole } from "spell/app/app/ui/CodeRules"
import type { ParsedElsewhere } from "./CodeMirrorLanguage"
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
 * - A page file (`SP.formOfText()`) by its page tokens (`CodeColours.pageSpans()`), read by a page parser of its language,
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
 * - The stretches are `CodeColours`', CodeMirror-free:  the language worker works them out too, where it parses the
 *   file, and sends them with each parse (epic `solid-2-final` T36).
 * - Its position in the import graph:  CodeMirror, the parser, the one table of code colours.
 * - NEVER throws:  a pass that fails leaves the text plain, and logs why.
 ****************/
export class CodeMirrorTokens {
  /**
   * The extension colouring a Spell file by its tokens.
   * - `fileOf()`:  the project file the editor shows, if it is one, for its language and its project's parse.
   * - `elsewhere`:  where the language worker parses the file, the colours it sends with each parse (epic
   *   `solid-2-final` T36):  the page reads no parse;  between them the colours follow the text as it's typed.
   */
  static extension(fileOf: () => SP.SpellFile | undefined, elsewhere?: ParsedElsewhere): Extension {
    return CodeMirrorRelayout.extension(
      (state) =>
        elsewhere?.isElsewhere()
          ? elsewhere.coloursOf(state.doc) && CodeMirrorTokens.decorationsOf(state, undefined, elsewhere)
          : CodeMirrorTokens.decorationsOf(state, fileOf()),
      CodeMirrorTokens.RELAYOUT_MSEC,
      {
        isAwaitingParse: () =>
          elsewhere?.isElsewhere() ? !elsewhere.hasParsed() : CodeMirrorRelayout.isUnparsed(fileOf()),
        isParseOnItsWay: (state) => !!elsewhere?.isElsewhere() && !elsewhere.coloursOf(state.doc)
      }
    )
  }

  /** How long the typing must pause before the colours are worked out again, in msec:  as `CodeMirrorBubbly`'s. */
  static RELAYOUT_MSEC = 150

  /**
   * A mark for each coloured token of `state`'s text.
   * - `within`:  its project file, whose parse is read when it's of this very text.
   * - `elsewhere`:  the language worker's colours, read instead:  none if they aren't of this text.
   * - NEVER throws:  `Decoration.none` when the pass fails.
   */
  static decorationsOf(state: EditorState, within?: SP.SpellFile, elsewhere?: ParsedElsewhere): DecorationSet {
    try {
      const spans = elsewhere ? elsewhere.coloursOf(state.doc) : CodeMirrorTokens.spansOf(state.doc.toString(), within)
      if (!spans) return Decoration.none
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

  /** The coloured stretches of `text`, read here, with `within`'s parse when it's of this very text. */
  private static spansOf(text: string, within?: SP.SpellFile): SP.SpellHighlightSpan[] {
    const parser = within ? SP.Language.forFile(within.path).parser : SP.spellParser
    const parsed = within && SP.BubblyLayout.isParseOf(within, text) ? (within.match as P.Match) : undefined
    return CodeColours.spansOf(text, parser, parsed)
  }

  /** The class a role's marks carry:  `cmt-<role>`, e.g. `cmt-keyword`. */
  static classFor(role: CodeRole): string {
    return `cmt-${role}`
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

/** Each role's one mark, made on first use. */
const ROLE_MARKS = new Map<CodeRole, Decoration>()

