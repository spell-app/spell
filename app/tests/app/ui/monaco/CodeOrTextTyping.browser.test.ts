import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { monaco } from "spell/app/app/ui/monaco/monaco"
import { SpellMonaco } from "spell/app/app/ui/monaco/SpellMonaco"

/**
 * `CodeOrTextTyping` on a real Monaco editor, in the browser (epic `editor` T74):  a `{` typed in a quoted value makes
 * it code, a `"` typed right after a code value's `{` makes it text;  one undo leaves what was typed.
 */
describe("switching a value between text and code as it's typed", () => {
  let editor: monaco.editor.IStandaloneCodeEditor | undefined

  beforeAll(() => {
    SpellMonaco.register()
  })

  afterEach(() => {
    const model = editor?.getModel()
    editor?.dispose()
    model?.dispose()
    editor = undefined
  })

  /** An editor of Spell holding `line`, the caret at its `|`, focused:  only the editor typed in helps (I150). */
  function editorOf(line: string) {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 200px"
    document.body.append(host)
    const model = monaco.editor.createModel(`to draw it\n${line.replace("|", "")}`, SpellMonaco.LANGUAGE)
    editor = monaco.editor.create(host, { model })
    editor.setPosition({ lineNumber: 2, column: line.indexOf("|") + 1 })
    editor.focus()
    return editor
  }

  /** Type `text` as the keyboard does, then let the help write. */
  async function type(text: string) {
    editor!.trigger("keyboard", "type", { text })
    await Promise.resolve()
  }

  /** The drawing's line, the caret at its `|`. */
  function lineWithCaret(): string {
    const line = editor!.getModel()!.getLineContent(2)
    const column = editor!.getPosition()!.column
    return `${line.slice(0, column - 1)}|${line.slice(column - 1)}`
  }

  test("`{` in a quoted value:  its quotes become braces, the caret in the same words", async () => {
    editorOf('\t<text color="bl|ue">Hi</text>')
    await type("{")
    expect(lineWithCaret()).toBe("\t<text color={bl|ue}>Hi</text>")
  })

  test('`"` right after a code value\'s `{`:  its braces become quotes', async () => {
    editorOf("\t<text color={|its color}>Hi</text>")
    await type('"')
    expect(lineWithCaret()).toBe('\t<text color="|its color">Hi</text>')
  })

  test("one undo leaves the character typed;  another, the line as it was", async () => {
    const code = editorOf('\t<text color="bl|ue">Hi</text>')
    await type("{")
    code.trigger("keyboard", "undo", null)
    expect(code.getModel()!.getLineContent(2)).toMatch(/^\t<text color="bl\{\}?ue">Hi<\/text>$/)
    code.trigger("keyboard", "undo", null)
    expect(code.getModel()!.getLineContent(2)).toBe('\t<text color="blue">Hi</text>')
  })

  test('a `"` further into code starts a string, as typed', async () => {
    editorOf("\t<button onClick={say |} />")
    await type('"')
    expect(lineWithCaret()).toMatch(/^\t<button onClick=\{say "\|"?\} \/>$/)
  })

  test("a Spell line's quotes are its own:  a `{` there is typed as itself", async () => {
    const code = editorOf('\tits "si|ze" is "small"')
    await type("{")
    expect(code.getModel()!.getLineContent(2)).toMatch(/^\tits "si\{\}?ze" is "small"$/)
  })
})
