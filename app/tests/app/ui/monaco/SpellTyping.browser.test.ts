import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { monaco } from "spell/app/app/ui/monaco/monaco"
import { SpellMonaco } from "spell/app/app/ui/monaco/SpellMonaco"

/**
 * `SpellTyping` and Spell's language settings on a real Monaco editor, in the browser (epic `editor` I63, I65):
 * the right-click menu's Paste, and Enter after an opening tag.
 * - A plain model of the `spell` language, no project:  only what's typed and pasted is checked.
 */
describe("typing Spell in a real Monaco editor", () => {
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

  /** An editor of Spell holding `lines`, its caret at `line`, `column` (1-based). */
  function editorOf(lines: string[], line: number, column: number) {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 300px"
    document.body.append(host)
    const model = monaco.editor.createModel(lines.join("\n"), SpellMonaco.LANGUAGE)
    model.updateOptions({ insertSpaces: false, tabSize: 4 })
    editor = monaco.editor.create(host, { model, autoIndent: "full" })
    editor.setPosition({ lineNumber: line, column })
    return editor
  }

  describe("the right-click menu's Paste (I63)", () => {
    /** As the menu's Paste does on the web:  it reads the clipboard, then asks the editor to paste it. */
    const pasteFromMenu = (text: string) =>
      editor!.trigger("keyboard", "paste", { text, pasteOnNewLine: false, multicursorText: null, mode: null })

    test("takes the indent where it lands, as Cmd+V does", () => {
      const code = editorOf([`a "card" is a view`, `\tits "name" is`, `\t\t`], 3, 3)
      pasteFromMenu(`its rank\n\tit is high`)
      expect(code.getValue()).toBe(
        [`a "card" is a view`, `\tits "name" is`, `\t\tits rank`, `\t\t\tit is high`].join("\n")
      )
    })

    test("a drawing's markup, as a tree", () => {
      const code = editorOf([`\t\t`], 1, 3)
      pasteFromMenu(`<content>\n<text>Hi</text>\n</content>`)
      expect(code.getValue()).toBe([`\t\t<content>`, `\t\t\t<text>Hi</text>`, `\t\t</content>`].join("\n"))
    })

    test("one undo takes it all back", () => {
      const code = editorOf([`\t`], 1, 2)
      pasteFromMenu(`its rank\nits suit`)
      expect(code.getValue()).toBe(`\tits rank\n\tits suit`)
      code.trigger("keyboard", "undo", null)
      expect(code.getValue()).toBe(`\t`)
    })

    test("a whole line copied is left to Monaco:  it pastes above, as copied", () => {
      const code = editorOf([`\tits rank`], 1, 3)
      code.trigger("keyboard", "paste", { text: `its suit\n`, pasteOnNewLine: true, multicursorText: null, mode: null })
      expect(code.getValue()).toBe(`its suit\n\tits rank`)
    })
  })

  describe("Cmd+[ and Cmd+] take the lines under a line along (I59)", () => {
    /** Press `key` with Command on a Mac, Control elsewhere, in the editor's text area. */
    const pressMod = (key: string) => {
      const area = editor!.getDomNode()!.querySelector("textarea")!
      area.focus()
      const isMac = /Mac/.test(navigator.platform)
      area.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          code: key === "[" ? "BracketLeft" : "BracketRight",
          metaKey: isMac,
          ctrlKey: !isMac,
          bubbles: true,
          cancelable: true
        })
      )
    }
    const block = [`\t\t<content>`, `\t\t\t<text>Hi</text>`, `\t\t</content>`]

    test("Cmd+[ moves a tag out a level, its children and closing tag with it", () => {
      const code = editorOf(block, 1, 3)
      pressMod("[")
      expect(code.getValue()).toBe([`\t<content>`, `\t\t<text>Hi</text>`, `\t</content>`].join("\n"))
    })

    test("Cmd+] moves them in a level", () => {
      const code = editorOf(block, 1, 3)
      pressMod("]")
      expect(code.getValue()).toBe([`\t\t\t<content>`, `\t\t\t\t<text>Hi</text>`, `\t\t\t</content>`].join("\n"))
    })
  })

  describe("Tab at a line's indent takes the lines under it along (I59)", () => {
    /** Press Tab, no modifier, in the editor's text area. */
    const pressTab = () => {
      const area = editor!.getDomNode()!.querySelector("textarea")!
      area.focus()
      area.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true, cancelable: true }))
    }

    test("before an opening tag:  its children and closing tag go in a level with it, the caret at its new indent", () => {
      const code = editorOf([`\t<segment>`, `\t\t<text>Hi</text>`, `\t</segment>`], 1, 2)
      pressTab()
      expect(code.getValue()).toBe([`\t\t<segment>`, `\t\t\t<text>Hi</text>`, `\t\t</segment>`].join("\n"))
      expect(code.getPosition()).toMatchObject({ lineNumber: 1, column: 3 })
    })

    test("before a line with a body:  the body goes in with it, as one undo", () => {
      const code = editorOf([`group "Moves"`, `\tto "cheat"`, `\t\tturn it up`], 2, 2)
      pressTab()
      expect(code.getValue()).toBe([`group "Moves"`, `\t\tto "cheat"`, `\t\t\tturn it up`].join("\n"))
      // the model's own undo:  with the text area focused, the editor's "undo" goes to the browser's
      void code.getModel()!.undo()
      expect(code.getValue()).toBe([`group "Moves"`, `\tto "cheat"`, `\t\tturn it up`].join("\n"))
    })

    test("mid-line:  left to Monaco, nothing under it moves", () => {
      const lines = [`\t<segment>`, `\t\t<text>Hi</text>`, `\t</segment>`]
      const code = editorOf(lines, 1, 5)
      pressTab()
      expect(code.getValue().split("\n").slice(1)).toEqual(lines.slice(1))
    })
  })

  describe("Enter and Tab between a tag's attributes (I142)", () => {
    /** Press `key`, no modifier, in the editor's text area. */
    const press = (key: string, shiftKey = false) => {
      const area = editor!.getDomNode()!.querySelector("textarea")!
      area.focus()
      area.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, shiftKey, bubbles: true, cancelable: true }))
    }

    test("Enter lines the rest up under the first attribute, tabs then spaces, as one undo", () => {
      // `columns` is 15 columns in, a tab 4:  3 tabs, then 3 spaces
      const code = editorOf([`\t<container columns="7" spacing="xs">`, `\t</container>`], 1, 25)
      press("Enter")
      expect(code.getValue()).toBe([`\t<container columns="7"`, `\t\t\t   spacing="xs">`, `\t</container>`].join("\n"))
      expect(code.getPosition()).toMatchObject({ lineNumber: 2, column: 7 })
      const model = code.getModel()!
      expect(code.getOffsetForColumn(2, 7)).toBe(
        code.getOffsetForColumn(1, model.getLineContent(1).indexOf("c", 3) + 1)
      )
      void model.undo()
      expect(code.getValue()).toBe([`\t<container columns="7" spacing="xs">`, `\t</container>`].join("\n"))
    })

    test("Enter before the first attribute, or after the tag's `>`, is Monaco's", () => {
      const code = editorOf([`\t<container columns="7">`], 1, 13)
      press("Enter")
      expect(code.getValue()).toBe(`\t<container columns="7">`)
    })

    test("Tab at the start of an attribute line moves that line alone;  Shift+Tab takes it back", () => {
      const lines = [`\t<container columns="7"`, `\t\t\t   spacing="xs">`, `\t\t<text "hi" />`, `\t</container>`]
      const code = editorOf(lines, 2, 7)
      press("Tab")
      expect(code.getValue().split("\n")).toEqual([lines[0], `\t\t\t\t   spacing="xs">`, ...lines.slice(2)])
      expect(code.getPosition()).toMatchObject({ lineNumber: 2, column: 8 })
      press("Tab", true)
      expect(code.getValue().split("\n")).toEqual(lines)
    })
  })

  describe("Enter after an opening tag (I65)", () => {
    const enter = () => editor!.trigger("keyboard", "type", { text: "\n" })

    test("goes in a level", () => {
      const code = editorOf([`\t<content>`], 1, 11)
      enter()
      expect(code.getValue()).toBe(`\t<content>\n\t\t`)
      expect(code.getPosition()).toMatchObject({ lineNumber: 2, column: 3 })
    })

    test("after a tag with attributes too", () => {
      const code = editorOf([`<toolbar class="x">`], 1, 20)
      enter()
      expect(code.getValue()).toBe(`<toolbar class="x">\n\t`)
    })

    test("between `<x>` and `</x>`:  the caret a level in, the closing tag on its own line", () => {
      const code = editorOf([`\t<content></content>`], 1, 11)
      enter()
      expect(code.getValue()).toBe(`\t<content>\n\t\t\n\t</content>`)
      expect(code.getPosition()).toMatchObject({ lineNumber: 2, column: 3 })
    })

    test("not after a tag that closes itself, nor a closing tag:  the line's own indent", () => {
      for (const line of [`\t<action "x"/>`, `\t</content>`]) {
        const code = editorOf([line], 1, line.length + 1)
        enter()
        expect(code.getValue()).toBe(`${line}\n\t`)
        editor!.dispose()
      }
    })
  })

  describe("a space after a tag's name writes the rest of the tag (T68)", () => {
    const space = () => editor!.trigger("keyboard", "type", { text: " " })
    /** The text, a `|` at the caret. */
    const withCaret = () => {
      const model = editor!.getModel()!
      const offset = model.getOffsetAt(editor!.getPosition()!)
      const text = model.getValue()
      return text.slice(0, offset) + "|" + text.slice(offset)
    }

    test('`<action` + space => `<action "|" />`, as choosing it from the list writes', async () => {
      editorOf([`	<action`], 1, 9)
      space()
      await Promise.resolve()
      expect(withCaret()).toBe(`	<action "|" />`)
    })

    test("one undo takes the rest back, leaving `<action `", async () => {
      editorOf([`	<action`], 1, 9)
      space()
      await Promise.resolve()
      editor!.trigger("keyboard", "undo", null)
      expect(withCaret()).toBe(`	<action |`)
    })

    test("Spanish's `<acción`, in a Spanish file", async () => {
      const host = document.createElement("div")
      host.style.cssText = "width: 600px; height: 300px"
      document.body.append(host)
      const uri = monaco.Uri.parse("file:///T68/Carta.es.spell")
      const model = monaco.editor.createModel(`<acción`, SpellMonaco.LANGUAGE, uri)
      editor = monaco.editor.create(host, { model })
      editor.setPosition({ lineNumber: 1, column: 8 })
      space()
      await Promise.resolve()
      expect(withCaret()).toBe(`<acción "|" />`)
    })

    test("any other tag:  its closing tag written out, the caret before its `>`;  one that holds nothing, ` />`", async () => {
      const cases: [string, number, string][] = [
        [`\t<segment`, 10, `\t<segment |></segment>`],
        [`<divider`, 9, `<divider | />`]
      ]
      for (const [line, column, after] of cases) {
        editorOf([line], 1, column)
        space()
        await Promise.resolve()
        expect(withCaret()).toBe(after)
        editor!.trigger("keyboard", "undo", null)
        expect(withCaret()).toBe(`${line} |`)
        editor!.dispose()
      }
    })

    test("left alone:  a tag written on after the caret, a space elsewhere in a tag", async () => {
      const cases: [string, number, string][] = [
        [`<action"x" />`, 8, `<action |"x" />`],
        [`<action "x" />`, 11, `<action "x |" />`],
        [`<segment>`, 9, `<segment |>`]
      ]
      for (const [line, column, after] of cases) {
        editorOf([line], 1, column)
        space()
        await Promise.resolve()
        expect(withCaret()).toBe(after)
        editor!.dispose()
      }
    })
  })
})
