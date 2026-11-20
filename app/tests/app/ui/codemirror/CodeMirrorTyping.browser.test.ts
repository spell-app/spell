import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { undo } from "@codemirror/commands"
import { EditorSelection, EditorState, type Extension } from "@codemirror/state"
import { EditorView, keymap, runScopeHandlers } from "@codemirror/view"

import { declareProp, Observable } from "spell/util"
import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"
import { CodeMirrorTyping } from "spell/app/app/ui/codemirror/CodeMirrorTyping"
import { FileStates } from "spell/app/app/ui/codemirror/FileStates"

/**
 * `CodeMirrorTyping` on a real CodeMirror editor, in the browser (epic `codemirror` P4):
 * each case the same text before and after.
 * - A plain editor of Spell, no project:  only what's typed and pasted is checked.
 * - Keys go through the editor's own key handling (`runScopeHandlers()`), what's typed through its input handlers,
 *   as the keyboard's would.
 * - "a help whose caret has moved on by the time it writes" has no case here:  CodeMirror's helps write with the
 *   key, never after it.
 */
describe("typing Spell in a real CodeMirror editor", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.destroy()
    view = undefined
  })

  /** An editor of Spell holding `lines`, its caret at `line`, `column` (1-based), focused. */
  function editorOf(lines: string[], line: number, column: number, lang = "en"): EditorView {
    const doc = lines.join("\n")
    const state = EditorState.create({ doc, extensions: spellExtensions(lang) })
    view = new EditorView({ parent: hostOf(), state })
    view.dispatch({ selection: { anchor: state.doc.line(line).from + column - 1 } })
    view.focus()
    return view
  }

  /** The text, a `|` at the caret. */
  const withCaret = () => {
    const { state } = view!
    const caret = state.selection.main.head
    return state.sliceDoc(0, caret) + "|" + state.sliceDoc(caret)
  }

  /** The caret's line and column, 1-based. */
  const position = () => {
    const { state } = view!
    const caret = state.selection.main.head
    const line = state.doc.lineAt(caret)
    return { lineNumber: line.number, column: caret - line.from + 1 }
  }

  describe("the right-click menu's Paste (I63)", () => {
    /** As the menu's Paste does:  it reads the clipboard, then asks the help, else pastes it as it is. */
    const pasteFromMenu = (text: string) => {
      if (CodeMirrorTyping.paste(view!, text)) return
      view!.dispatch(view!.state.replaceSelection(text), { userEvent: "input.paste" })
    }

    test("takes the indent where it lands, as Cmd+V does", () => {
      const code = editorOf([`a "card" is a view`, `\tits "name" is`, `\t\t`], 3, 3)
      pasteFromMenu(`its rank\n\tit is high`)
      expect(text(code)).toBe([`a "card" is a view`, `\tits "name" is`, `\t\tits rank`, `\t\t\tit is high`].join("\n"))
    })

    test("a drawing's markup, as a tree", () => {
      const code = editorOf([`\t\t`], 1, 3)
      pasteFromMenu(`<content>\n<text>Hi</text>\n</content>`)
      expect(text(code)).toBe([`\t\t<content>`, `\t\t\t<text>Hi</text>`, `\t\t</content>`].join("\n"))
    })

    test("one undo takes it all back", () => {
      const code = editorOf([`\t`], 1, 2)
      pasteFromMenu(`its rank\nits suit`)
      expect(text(code)).toBe(`\tits rank\n\tits suit`)
      undo(code)
      expect(text(code)).toBe(`\t`)
    })

    test("Cmd+V takes the indent too", () => {
      const code = editorOf([`a "card" is a view`, `\tits "name" is`, `\t\t`], 3, 3)
      const clipboardData = new DataTransfer()
      clipboardData.setData("text/plain", `its rank\n\tit is high`)
      code.contentDOM.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }))
      expect(text(code)).toBe([`a "card" is a view`, `\tits "name" is`, `\t\tits rank`, `\t\t\tit is high`].join("\n"))
    })

    test("a whole line copied is left to CodeMirror:  it pastes above, as copied", () => {
      const code = editorOf([`\tits rank`], 1, 3)
      code.contentDOM.dispatchEvent(
        new ClipboardEvent("copy", { clipboardData: new DataTransfer(), bubbles: true, cancelable: true })
      )
      const clipboardData = new DataTransfer()
      clipboardData.setData("text/plain", `\tits rank`)
      code.contentDOM.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }))
      expect(text(code)).toBe(`\tits rank\n\tits rank`)
    })
  })

  describe("Cmd+[ and Cmd+] take the lines under a line along (I59)", () => {
    const block = [`\t\t<content>`, `\t\t\t<text>Hi</text>`, `\t\t</content>`]

    test("Cmd+[ moves a tag out a level, its children and closing tag with it", () => {
      const code = editorOf(block, 1, 3)
      press("[", { mod: true })
      expect(text(code)).toBe([`\t<content>`, `\t\t<text>Hi</text>`, `\t</content>`].join("\n"))
    })

    test("Cmd+] moves them in a level", () => {
      const code = editorOf(block, 1, 3)
      press("]", { mod: true })
      expect(text(code)).toBe([`\t\t\t<content>`, `\t\t\t\t<text>Hi</text>`, `\t\t\t</content>`].join("\n"))
    })

    test("Backspace at a line's indent moves them out, as one undo", () => {
      const code = editorOf(block, 1, 3)
      press("Backspace")
      expect(text(code)).toBe([`\t<content>`, `\t\t<text>Hi</text>`, `\t</content>`].join("\n"))
      undo(code)
      expect(text(code)).toBe(block.join("\n"))
    })
  })

  describe("Tab at a line's indent takes the lines under it along (I59)", () => {
    test("before an opening tag:  its children and closing tag go in a level with it, the caret at its new indent", () => {
      const code = editorOf([`\t<segment>`, `\t\t<text>Hi</text>`, `\t</segment>`], 1, 2)
      press("Tab")
      expect(text(code)).toBe([`\t\t<segment>`, `\t\t\t<text>Hi</text>`, `\t\t</segment>`].join("\n"))
      expect(position()).toMatchObject({ lineNumber: 1, column: 3 })
    })

    test("before a line with a body:  the body goes in with it, as one undo", () => {
      const code = editorOf([`group "Moves"`, `\tto "cheat"`, `\t\tturn it up`], 2, 2)
      press("Tab")
      expect(text(code)).toBe([`group "Moves"`, `\t\tto "cheat"`, `\t\t\tturn it up`].join("\n"))
      undo(code)
      expect(text(code)).toBe([`group "Moves"`, `\tto "cheat"`, `\t\tturn it up`].join("\n"))
    })

    test("mid-line:  left to CodeMirror, nothing under it moves", () => {
      const lines = [`\t<segment>`, `\t\t<text>Hi</text>`, `\t</segment>`]
      const code = editorOf(lines, 1, 5)
      press("Tab")
      expect(text(code).split("\n").slice(1)).toEqual(lines.slice(1))
    })
  })

  describe("Enter, Backspace and Tab between a tag's attributes (I142, I133)", () => {
    const TOOLBAR = [`\t<toolbar class="GameBar" appearance="pills" inverted>`, `\t</toolbar>`]

    test("Enter lays the tag out:  each attribute a level in, its `>` at the end of the last (I135);  one undo", () => {
      const code = editorOf(TOOLBAR, 1, 27)
      press("Enter")
      expect(text(code).split("\n")).toEqual([
        `\t<toolbar`,
        `\t\tclass="GameBar"`,
        `\t\tappearance="pills"`,
        `\t\tinverted>`,
        `\t</toolbar>`
      ])
      expect(position()).toMatchObject({ lineNumber: 3, column: 3 })
      undo(code)
      expect(text(code).split("\n")).toEqual(TOOLBAR)
    })

    test("Enter right after the tag's name lays it out too, the caret before its first attribute", () => {
      const code = editorOf([`\t<container columns="7">`], 1, 12)
      press("Enter")
      expect(text(code)).toBe(`\t<container\n\t\tcolumns="7">`)
      expect(position()).toMatchObject({ lineNumber: 2, column: 3 })
    })

    test("Backspace at an attribute line's start joins it to the line above, a space between, its `>` with it", () => {
      const code = editorOf([`\t<toolbar class="GameBar"`, `\t\tappearance="pills">`, `\t</toolbar>`], 2, 3)
      press("Backspace")
      expect(text(code).split("\n")).toEqual([`\t<toolbar class="GameBar" appearance="pills">`, `\t</toolbar>`])
      expect(position()).toMatchObject({ lineNumber: 1, column: 27 })
      undo(code)
      expect(text(code).split("\n")).toEqual([`\t<toolbar class="GameBar"`, `\t\tappearance="pills">`, `\t</toolbar>`])
    })

    test("Tab at the start of an attribute line moves that line alone;  Shift+Tab takes it back", () => {
      const lines = [`\t<container`, `\t\tcolumns="7"`, `\t\tspacing="xs">`, `\t\t<text "hi" />`, `\t</container>`]
      const code = editorOf(lines, 3, 3)
      press("Tab")
      expect(text(code).split("\n")).toEqual([...lines.slice(0, 2), `\t\t\tspacing="xs">`, ...lines.slice(3)])
      expect(position()).toMatchObject({ lineNumber: 3, column: 4 })

      press("Tab", { shift: true })
      expect(text(code).split("\n")).toEqual(lines)
    })
  })

  describe("Enter before a comment after code (I155, I161), and at a line's end (I160)", () => {
    /** Solitaire's card's `face`, its comment after its head. */
    const FACE = [
      `\tits "face" is\t\t\t-- the card it draws`,
      `\t\tits card if its card exists`,
      `\t\ta new card whose rank is its rank and suit is its suit otherwise`,
      `\tits "color" is`
    ]

    test("the comment goes at its body's level, no tabs left at the end of the head;  one undo", () => {
      const code = editorOf(FACE, 1, 18)
      press("Enter")
      expect(text(code).split("\n")).toEqual([`\tits "face" is`, `\t\t-- the card it draws`, ...FACE.slice(1)])
      expect(position()).toMatchObject({ lineNumber: 2, column: 3 })
      undo(code)
      expect(text(code).split("\n")).toEqual(FACE)
    })

    test("with the caret before the tabs too:  the comment still at its body's level", () => {
      const code = editorOf(FACE, 1, 15)
      press("Enter")
      expect(text(code).split("\n").slice(0, 2)).toEqual([`\tits "face" is`, `\t\t-- the card it draws`])
    })

    describe("a group's head, its comment after a space and tabs (epic `codemirror` I24)", () => {
      /** Solitaire's card's group of names, as Card.spell writes it. */
      const NAMES = [`\tgroup "Names" \t\t\t\t-- identifying a card`, `\tits "name" is its rank && "of" && its suit`]
      const WANTED = [`\tgroup "Names"`, `\t\t-- identifying a card`, NAMES[1]]
      const dashes = NAMES[0]!.indexOf("--") + 1

      test.each([
        ["right after the name", 15],
        ["after the space", 16],
        ["in the tabs", 18],
        ["right before the `--`", dashes],
        ["between its two dashes, as a click on the drawn dash puts it", dashes + 1]
      ])(
        "the caret %s:  the comment its first line, a level in, nothing left at the head's end;  one undo",
        (_, column) => {
          const code = editorOf(NAMES, 1, column)
          press("Enter")
          expect(text(code).split("\n")).toEqual(WANTED)
          expect(position()).toMatchObject({ lineNumber: 2, column: 3 })
          undo(code)
          expect(text(code).split("\n")).toEqual(NAMES)
        }
      )
    })

    test("Tab on the comment line moves it alone;  Shift+Tab takes it back", () => {
      const lines = [`\tits "face" is`, `\t\t-- the card it draws`, ...FACE.slice(1)]
      const code = editorOf(lines, 2, 3)
      press("Tab")
      expect(text(code).split("\n")).toEqual([lines[0], `\t\t\t-- the card it draws`, ...lines.slice(2)])
      press("Tab", { shift: true })
      expect(text(code).split("\n")).toEqual(lines)
    })

    test("any Enter takes the tabs and spaces before the caret off the line's end, in the same undo step", () => {
      const code = editorOf([`\tits "rank" is 1 \t`, `\tits "suit" is`], 1, 19)
      press("Enter")
      expect(text(code).split("\n")).toEqual([`\tits "rank" is 1`, `\t`, `\tits "suit" is`])
      undo(code)
      expect(text(code).split("\n")).toEqual([`\tits "rank" is 1 \t`, `\tits "suit" is`])
    })

    test("only what's before the caret:  the spaces after it go with the rest to the new line", () => {
      const code = editorOf([`its "x" is  1`], 1, 12)
      press("Enter")
      expect(text(code).split("\n")).toEqual([`its "x" is`, ` 1`])
    })
  })

  describe("Enter after a head goes in a level, so its body stays its body (epic `language` I160)", () => {
    test("before the body under it:  the new line at the body's level", () => {
      for (const [head, body] of [
        ["\twhen creating solitaire", "\t\tadd each card in the deck to the stock"],
        ["\tto draw solitaire", '\t\t<deck "deck" hidden />'],
        ['\tto "reset the stock"', "\t\treverse the cards"],
        ["\t\tfor each card in the deck", "\t\t\tturn the card face down"],
        ["\t\tif the stock is empty", "\t\t\treset the stock"]
      ]) {
        const code = editorOf([`solitaire is an app`, head, body], 2, head.length + 1)
        press("Enter")
        expect(withCaret().split("\n").slice(1), head).toEqual([head, `${/^\t*/.exec(body)![0]}|`, body])
        code.destroy()
      }
    })

    test("not after a step:  the line's own indent", () => {
      const code = editorOf([`a "card" is a view`, `\tto flip it`, `\t\tturn it over`], 3, 15)
      press("Enter")
      expect(withCaret().split("\n")[3]).toBe(`\t\t|`)
      code.destroy()
    })
  })

  describe("Enter after an opening tag (I65)", () => {
    test("goes in a level", () => {
      const code = editorOf([`\t<content>`], 1, 11)
      press("Enter")
      expect(text(code)).toBe(`\t<content>\n\t\t`)
      expect(position()).toMatchObject({ lineNumber: 2, column: 3 })
    })

    test("after a tag with attributes too", () => {
      const code = editorOf([`<toolbar class="x">`], 1, 20)
      press("Enter")
      expect(text(code)).toBe(`<toolbar class="x">\n\t`)
    })

    test("between `<x>` and `</x>`:  the caret a level in, the closing tag on its own line", () => {
      const code = editorOf([`\t<content></content>`], 1, 11)
      press("Enter")
      expect(text(code)).toBe(`\t<content>\n\t\t\n\t</content>`)
      expect(position()).toMatchObject({ lineNumber: 2, column: 3 })
    })

    test("not after a tag that closes itself, nor a closing tag:  the line's own indent", () => {
      for (const line of [`\t<action "x"/>`, `\t</content>`]) {
        const code = editorOf([line], 1, line.length + 1)
        press("Enter")
        expect(text(code)).toBe(`${line}\n\t`)
        code.destroy()
      }
    })
  })

  describe("a space after a tag's name writes the rest of the tag (T68)", () => {
    test('`<action` + space => `<action "|" />`, as choosing it from the list writes', () => {
      editorOf([`\t<action`], 1, 9)
      type(" ")
      expect(withCaret()).toBe(`\t<action "|" />`)
    })

    test("one undo takes the rest back, leaving `<action `", () => {
      const code = editorOf([`\t<action`], 1, 9)
      type(" ")
      undo(code)
      expect(withCaret()).toBe(`\t<action |`)
    })

    test("Spanish's `<acción`, in a Spanish file", () => {
      editorOf([`<acción`], 1, 8, "es")
      type(" ")
      expect(withCaret()).toBe(`<acción "|" />`)
    })

    test("any other tag:  its closing tag written out, the caret before its `>`;  one that holds nothing, ` />`", () => {
      const cases: [string, number, string][] = [
        [`\t<segment`, 10, `\t<segment |></segment>`],
        [`<divider`, 9, `<divider | />`]
      ]
      for (const [line, column, after] of cases) {
        const code = editorOf([line], 1, column)
        type(" ")
        expect(withCaret()).toBe(after)
        undo(code)
        expect(withCaret()).toBe(`${line} |`)
        code.destroy()
      }
    })

    test("left alone:  a tag written on after the caret, a space elsewhere in a tag", () => {
      const cases: [string, number, string][] = [
        [`<action"x" />`, 8, `<action |"x" />`],
        [`<action "x" />`, 11, `<action "x |" />`],
        [`<segment>`, 9, `<segment |>`]
      ]
      for (const [line, column, after] of cases) {
        const code = editorOf([line], 1, column)
        type(" ")
        expect(withCaret()).toBe(after)
        code.destroy()
      }
    })
  })

  describe("a blank line's indent, and a name's quotes", () => {
    test("a letter on a blank line takes the next line's indent;  one undo takes both", () => {
      const code = editorOf([`a "card" is a view`, ``, `\tits "rank" is 1`], 2, 1)
      type("g")
      expect(withCaret()).toBe([`a "card" is a view`, `\tg|`, `\tits "rank" is 1`].join("\n"))
      undo(code)
      expect(text(code)).toBe([`a "card" is a view`, ``, `\tits "rank" is 1`].join("\n"))
    })

    test("`group ` opens a name's quotes, the caret between;  one undo leaves `group `", () => {
      const code = editorOf([`a "card" is a view`, `\tgroup`, `\tits "rank" is 1`], 2, 7)
      type(" ")
      expect(withCaret()).toBe([`a "card" is a view`, `\tgroup "|"`, `\tits "rank" is 1`].join("\n"))
      type("Rank")
      type('"')
      expect(withCaret()).toBe([`a "card" is a view`, `\tgroup "Rank"|`, `\tits "rank" is 1`].join("\n"))
      undo(code)
      undo(code)
      expect(withCaret()).toBe([`a "card" is a view`, `\tgroup |`, `\tits "rank" is 1`].join("\n"))
    })
  })

  describe("the caret snaps into the body a blank line is drawn in", () => {
    const LINES = [`a "card" is a view`, `\tits "rank" is 1`, ``, `\tits "suit" is 2`, `its "x" is 3`]

    test("arrowed onto, a blank line in a body gets its indent, the caret after it;  arrowed off, back as it was", () => {
      const code = editorOf(LINES, 2, 1)
      press("ArrowDown")
      expect(withCaret().split("\n")[2]).toBe(`\t|`)
      press("ArrowDown")
      expect(text(code).split("\n")).toEqual(LINES)
    })

    test("clicked onto too;  its own edit is kept out of undo", () => {
      const code = editorOf(LINES, 1, 1)
      type("x")
      code.dispatch({ selection: { anchor: code.state.doc.line(3).from }, userEvent: "select.pointer" })
      expect(text(code).split("\n")[2]).toBe(`\t`)
      undo(code)
      expect(text(code).split("\n").slice(1)).toEqual([...LINES.slice(1, 2), `\t`, ...LINES.slice(3)])
      expect(text(code).split("\n")[0]).toBe(LINES[0])
    })

    test("typed on, the line is the person's:  leaving it keeps what was typed", () => {
      const code = editorOf(LINES, 2, 1)
      press("ArrowDown")
      type("x")
      press("ArrowDown")
      expect(text(code).split("\n")[2]).toBe(`\tx`)
    })

    describe("Backspace in a body's middle takes the caret out a level, and a letter stays there (I159)", () => {
      const BODY = [`a "card" is a view`, `\tto turn it over`, `\t\tturn it face down`, ``, `\t\tpause for 10 msec`]

      /** An editor of `lines`, scrolled into view:  the arrows move by where lines are drawn. */
      const shownOf = (lines: string[], line: number, column: number) => {
        const code = editorOf(lines, line, column)
        code.dom.scrollIntoView()
        return code
      }

      test("snapped onto:  the letter at the level the caret's drawn at, not the body's", () => {
        const code = shownOf(BODY, 3, 1)
        press("ArrowDown")
        expect(withCaret().split("\n")[3]).toBe(`\t\t|`)
        press("Backspace")
        expect(withCaret().split("\n")[3]).toBe(`\t|`)
        type("s")
        expect(text(code).split("\n")[3]).toBe(`\ts`)
      })

      test("its tabs written already:  the same", () => {
        const code = shownOf(BODY.with(3, `\t\t`), 4, 3)
        press("Backspace")
        type("s")
        expect(text(code).split("\n")[3]).toBe(`\ts`)
      })

      test("left and come back to:  it snaps into the body again", () => {
        shownOf(BODY, 3, 1)
        press("ArrowDown")
        press("Backspace")
        press("ArrowUp")
        press("ArrowDown")
        type("s")
        expect(withCaret().split("\n")[3]).toBe(`\t\ts|`)
      })
    })

    test("moved by code, not a click or a key:  no snap", () => {
      const code = editorOf(LINES, 2, 1)
      code.dispatch({ selection: EditorSelection.cursor(code.state.doc.line(3).from) })
      expect(text(code).split("\n")).toEqual(LINES)
    })

    describe("not on the blank line before a group:  it's drawn outside the group above (epic `language` I121)", () => {
      /** Solitaire's card, shortened:  line 5 is the blank line under the group "Aliases", before "Names". */
      const GROUPS = [
        `a "card" is a view`,
        `\tgroup "Aliases"`,
        `\tit "is a face card" if its rank is jack, queen or king`,
        `\tit "is the (rank) of (suit)"`,
        ``,
        `\tgroup "Names"`,
        `\tits "name" is its rank && "of" && its suit`
      ]

      /** An editor of `GROUPS`, scrolled into view:  the arrows move by where lines are drawn. */
      const shownOf = (line: number, column: number) => {
        const code = editorOf(GROUPS, line, column)
        code.dom.scrollIntoView()
        return code
      }

      test("arrowed onto:  nothing written, the caret at the margin", () => {
        const code = shownOf(4, 1)
        press("ArrowDown")
        expect(position()).toEqual({ lineNumber: 5, column: 1 })
        expect(text(code).split("\n")).toEqual(GROUPS)
        press("ArrowUp")
        press("ArrowDown")
        expect(text(code).split("\n")).toEqual(GROUPS)
      })

      test("clicked onto, by the mouse:  nothing written, the caret at the margin", async () => {
        const code = shownOf(2, 1)
        await userEvent.click(code.dom.querySelectorAll(".cm-line")[4]!)
        expect(position()).toEqual({ lineNumber: 5, column: 1 })
        expect(text(code).split("\n")).toEqual(GROUPS)
      })

      test("typed on:  a letter still takes the group's indent, so `group` lands at its level", () => {
        const code = shownOf(4, 1)
        press("ArrowDown")
        type("g")
        expect(text(code).split("\n")[4]).toBe(`\tg`)
      })

      test("Enter at the end of the group's last line still goes on in its body", () => {
        shownOf(4, GROUPS[3]!.length + 1)
        press("Enter")
        expect(withCaret().split("\n")[4]).toBe(`\t|`)
      })
    })
  })

  describe("two editors on one file (I150)", () => {
    let other: EditorView | undefined

    afterEach(() => {
      other?.destroy()
      other = undefined
    })

    /** A file's editor and a slice of it (`FileStates.showSlice()`), each with the helps, the slice typed in. */
    function twoEditorsOf(lines: string[]) {
      const states = new FileStates({ service: new LSP.SpellLanguageService(new LSP.AppAddresses()) })
      const project = { spellFiles: [], updatedContentsFor: vi.fn() } as unknown as SP.SpellProject
      const file = new StandInFile("@spell/test/standin/Typing.spell", project) as StandInFile & SP.AnySpellFile
      file.contents = lines.join("\n")
      view = new EditorView({ parent: hostOf() })
      states.show(view, file, typingExtensions("en"))
      other = new EditorView({ parent: hostOf() })
      states.showSlice(other, file, { first: 1, last: lines.length }, typingExtensions("en"))
      other.focus()
      return { code: view, slice: other, states }
    }

    test("a tag's rest is written once, at the caret typed at;  never at the other editor's caret", () => {
      const { code, slice, states } = twoEditorsOf([`a "game" is an app`, `\tto draw it`, `\t\t<segment`])
      slice.dispatch({ selection: { anchor: slice.state.doc.length } })
      typeIn(slice, " ")
      const after = [`a "game" is an app`, `\tto draw it`, `\t\t<segment ></segment>`].join("\n")
      expect(text(slice)).toBe(after)
      expect(text(code)).toBe(after)
      states.releaseSlice(slice)
    })

    test("a name's quotes, and a blank line's indent, once each", () => {
      const { code, slice, states } = twoEditorsOf([`a "card" is a view`, ``, `\tits "rank" is 1`])
      slice.dispatch({ selection: { anchor: slice.state.doc.line(2).from } })
      typeIn(slice, "group ")
      const after = [`a "card" is a view`, `\tgroup ""`, `\tits "rank" is 1`].join("\n")
      expect(text(slice)).toBe(after)
      expect(text(code)).toBe(after)
      states.releaseSlice(slice)
    })
  })

  ////////////////
  // ## Typing and keys
  ////////////////

  /** Type `typed` into the test's editor. */
  function type(typed: string) {
    typeIn(view!, typed)
  }

  /** Press `key` in the test's editor, as the keyboard does:  through its keymaps. */
  function press(key: string, { shift = false, mod = false } = {}) {
    const isMac = /Mac/.test(navigator.platform)
    const event = new KeyboardEvent("keydown", {
      key,
      code: key === "[" ? "BracketLeft" : key === "]" ? "BracketRight" : key,
      shiftKey: shift,
      metaKey: mod && isMac,
      ctrlKey: mod && !isMac,
      bubbles: true,
      cancelable: true
    })
    runScopeHandlers(view!, event, "editor")
  }
})

////////////////
// ## Helpers
////////////////

/** What a Spell file's state has for typing:  its pairs closed, the helps. */
function typingExtensions(lang: string): Extension {
  return [closeBrackets(), keymap.of(closeBracketsKeymap), CodeMirrorTyping.extension(() => undefined, lang)]
}

/** A Spell file's state's typing, then the base setup every editor takes. */
function spellExtensions(lang: string): Extension {
  return [typingExtensions(lang), CodeMirrorSetup.extensions()]
}

/** A place in the page for an editor. */
function hostOf(): HTMLElement {
  const host = document.createElement("div")
  host.style.cssText = "width: 600px; height: 300px"
  document.body.append(host)
  return host
}

/** `view`'s text. */
function text(view: EditorView): string {
  return view.state.doc.toString()
}

/** Type `typed` into `view` a character at a time, as the keyboard does:  through its input handlers. */
function typeIn(view: EditorView, typed: string) {
  for (const character of typed) {
    const { from, to } = view.state.selection.main
    const insert = () =>
      view.state.update({
        changes: { from, to, insert: character },
        selection: { anchor: from + character.length },
        userEvent: "input.type"
      })
    const handlers = view.state.facet(EditorView.inputHandler)
    if (!handlers.some((handler) => handler(view, from, to, character, insert))) view.dispatch(insert())
  }
}

/** A project file, standing in:  its `contents` a spell cell, as a real one's. */
class StandInFile extends Observable {
  declare contents: string | undefined
  isDirty = false
  constructor(
    readonly path: string,
    readonly project: SP.SpellProject
  ) {
    super()
  }
  save() {
    return Promise.resolve()
  }
}
declareProp(StandInFile, "contents", { type: "text" })
