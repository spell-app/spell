import { describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { type DecorationSet, EditorView } from "@codemirror/view"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { CodeRules, type CodeRole } from "spell/app/app/ui/CodeRules"
import { CodeMirrorTokens } from "spell/app/app/ui/codemirror/CodeMirrorTokens"

/**
 * `CodeMirrorTokens`, Spell coloured by the parser's own tokens with the bubbly look off (epic `codemirror` P3).
 * - Runs in node:  the marks are worked out from an editor state, no view needed.
 */
describe("CodeMirrorTokens", () => {
  /** Each marked stretch of `text`, as `"text" role`. */
  function colour(text: string): string[] {
    const marked: string[] = []
    CodeMirrorTokens.decorationsOf(EditorState.create({ doc: text })).between(0, text.length, (from, to, mark) => {
      const role = CodeRules.ROLES.find((it: CodeRole) => mark.spec.class === CodeMirrorTokens.classFor(it))
      marked.push(`${JSON.stringify(text.slice(from, to))} ${role}`)
    })
    return marked
  }

  /** English's page parser, as `CodeMirrorTokens` reads a page file. */
  function pageParser(): SP.SpellParser {
    return SP.spellParser.clone({ module: "page colouring test", form: "page" } as P.ParserProps) as SP.SpellParser
  }

  test("a Spell snippet's heading, comment, keyword and text take their roles", () => {
    const marked = colour('# Greeting\nif 1 is 2 then set x to "hi" // greet\n')
    expect(marked).toContain('"# Greeting" heading')
    expect(marked).toContain('"// greet" comment')
    expect(marked).toContain('"\\"hi\\"" string')
    expect(marked).toContain('"1" constant')
    expect(marked.some((it) => it.endsWith(" keyword"))).toBe(true)
  })

  test("each mark carries its role's colour and look inline", () => {
    let style: string | undefined
    CodeMirrorTokens.decorationsOf(EditorState.create({ doc: "// note" })).between(0, 7, (_from, _to, mark) => {
      style = (mark.spec.attributes as Record<string, string>).style
    })
    expect(style).toBe("color: var(--ui-code-comment); font-style: italic")
  })

  test("a page file:  its head's name text, its flags attribute names;  its prose a comment;  its tags by their twins", () => {
    const page = [
      '"card api" is a notebook page',
      "\tA card, face up or down.",
      "\t<!-- note -->",
      '\t<for card in its cards loading="Wait">',
      "\t\t<card />",
      "\t</for>"
    ]
    expect(colour(page.join("\n"))).toEqual([
      '"\\"card api\\"" string',
      '" is a " keyword',
      '"notebook" member',
      '" page" keyword',
      '"A card, face up or down." comment',
      '"<!-- note -->" comment',
      '"<" punctuation',
      '"for" keyword',
      // the twin's, `for card in its cards`
      '"card" name',
      '"in" keyword',
      '"its" keyword',
      '"cards" member',
      '"loading" member',
      '"=" punctuation',
      '"\\"Wait\\"" string',
      '">" punctuation',
      // markup, as HTML
      '"<" punctuation',
      '"card" tag',
      '"/>" punctuation',
      '"</for>" punctuation'
    ])
  })

  test("a page's markup as HTML, its `{…}` as Spell;  a tag's words as its twin's in Spell code", () => {
    const page = ['"face" is a page', "	<if it is done>", '		<text color="red">{its name}</text>', "	</if>"].join(
      "\n"
    )
    const marked = colour(page)
    expect(marked.slice(marked.indexOf('"if" keyword'))).toEqual([
      '"if" keyword',
      '"it" name',
      '">" punctuation',
      '"<" punctuation',
      '"text" tag',
      '"color" member',
      '"=" punctuation',
      '"\\"red\\"" string',
      '">" punctuation',
      '"its" keyword',
      '"name" member',
      '"</" punctuation',
      '"text" tag',
      '">" punctuation',
      '"</if>" punctuation'
    ])
    // the same words in the page's twin, as Spell code:  the same roles
    const code = colour(
      ["face is a page :", "\tto draw it :", "\t\tif it is done", "\t\t\t<text>{its name}</text>"].join("\n")
    )
    for (const word of ['"it" name', '"its" keyword', '"name" member']) expect(code).toContain(word)
  })

  test("a twin's own words, and any token not where it says, colour nothing:  each colour on the file's own letters", () => {
    const page = ['"cards" is a page', '\t<for card in its cards loading="Wait">', "\t\t<card />", "\t</for>"].join(
      "\n"
    )
    const spans = CodeMirrorTokens.pageSpans(page, pageParser())
    for (const [index, span] of spans.entries()) {
      expect(span.end).toBeGreaterThan(span.start)
      if (index) expect(span.start).toBeGreaterThanOrEqual(spans[index - 1]!.end)
    }
    // `loading="Wait"` is the twin's rider, `while waiting :`, its value placed at the head:  never on the prose
    expect(spans.filter((span) => page.slice(span.start, span.end) === '"Wait"')).toHaveLength(1)
    expect(spans.some((span) => /to draw|while/.test(page.slice(span.start, span.end)))).toBe(false)
  })

  test("in an editor's state, the marks follow an edit at once, before they're worked out again", () => {
    const state = EditorState.create({ doc: "// note", extensions: CodeMirrorTokens.extension(() => undefined) })
    const edited = state.update({ changes: { from: 0, insert: "x " } }).state
    const [marks] = edited.facet(EditorView.decorations) as DecorationSet[]
    const ranges: string[] = []
    marks!.between(0, edited.doc.length, (from, to) => void ranges.push(edited.doc.sliceString(from, to)))
    expect(ranges).toEqual(["// note"])
  })

  test("text it can't read is left plain:  NEVER throws", () => {
    expect(() => colour("<<<< ))) {{{")).not.toThrow()
  })
})
