import { describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { type DecorationSet, EditorView } from "@codemirror/view"

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

  test("a page file:  its head's name text, its words keywords;  its prose and comments a comment;  its tags' words", () => {
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
      '" is a notebook page" keyword',
      '"A card, face up or down." comment',
      '"<!-- note -->" comment',
      '"<" punctuation',
      '"for" keyword',
      '"\\"Wait\\"" string',
      '"</for>" punctuation'
    ])
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
