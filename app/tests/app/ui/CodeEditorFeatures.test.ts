import { describe, expect, test } from "vite-plus/test"
import { cpSync, mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { Position, TextEdit } from "vscode-languageserver"

import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { fixtureFolder } from "spell/app/spaces/test"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { RenameRefusedError } from "spell/app/app/ui/ui.types"

/**
 * What the app's code editors decide alike, Monaco-free and CodeMirror-free (epic `codemirror` P5):
 * Rename Symbol's edits and words, the hover's ⌥ rule, web addresses in a line, heading comments.
 */
describe("CodeEditorFeatures", () => {
  describe("CodeEditorFeatures.rename():  F2, as the Inspector renames an action (epic `editor` I147)", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "spell-code-rename-"))
    cpSync(fixtureFolder("@spell/examples/Solitaire"), resolve(dir, "Solitaire"), { recursive: true })
    const path = resolve(dir, "Solitaire", "Solitaire.spell")
    const uri = pathToFileURL(path).href
    const text = readFileSync(path, "utf8")
    const workspace = new SpellDiskWorkspace()
    const service = new LSP.SpellLanguageService(workspace)
    /** Rename what's at `words` in `line`'s first line holding it, to `newName`:  the file's text after. */
    async function renamed(line: string, words: string, newName: string) {
      await workspace.update(uri, text)
      const file = workspace.fileFor(uri)!
      const edit = CodeEditorFeatures.rename(service, file, positionOf(line, words), { newName, oldName: words })
      return applied(text, edit.changes![uri]!)
    }

    test("an action:  its head, every call, ABOVE its head too, and every button naming it", async () => {
      const callAbove = text.indexOf("\t\trestart the game\n")
      expect(callAbove).toBeLessThan(text.indexOf('to "restart the game"'))
      const after = await renamed('to "restart the game"', "restart the game", "start again")
      expect(after).toContain('to "start again" with shortcut "R"')
      expect(after).not.toMatch(/restart the game/)
      expect(after.slice(0, after.indexOf('to "start again"'))).toMatch(/^\t\tstart again$/m)
    })

    test("refused in the Inspector's words:  a name another action has", async () => {
      await expect(renamed('to "cheat"', "cheat", "auto play")).rejects.toThrow(RenameRefusedError)
      await expect(renamed('to "cheat"', "cheat", "auto play")).rejects.toThrow(
        'There is already an action named "auto play."'
      )
    })

    test("where nothing can be renamed, it says what can", () => {
      expect(CodeEditorFeatures.renameNothingHere()).toMatch(/^Nothing here can be renamed/)
    })

    /** The position of `words` in the first line of `text` holding `line`. */
    function positionOf(line: string, words: string): Position {
      const lines = text.split("\n")
      const index = lines.findIndex((each) => each.includes(line))
      return { line: index, character: lines[index]!.indexOf(words, lines[index]!.indexOf(line)) + 1 }
    }
  })

  describe("the hover's ⌥ rule", () => {
    test("the info shows with ⌥ held in `withAlt`, always in `always`, never in `never`", () => {
      const shows = (mode: "withAlt" | "always" | "never") =>
        [false, true].map((isAltHeld) => CodeEditorFeatures.showsHoverInfo(mode, isAltHeld))
      expect(shows("withAlt")).toEqual([false, true])
      expect(shows("always")).toEqual([true, true])
      expect(shows("never")).toEqual([false, false])
    })

    test("errors show alone exactly when the full hover doesn't show them", () => {
      for (const mode of ["withAlt", "always", "never"] as const)
        for (const isAltHeld of [false, true])
          expect(CodeEditorFeatures.showsErrorsAlone(mode, isAltHeld)).toBe(
            !CodeEditorFeatures.showsHoverInfo(mode, isAltHeld)
          )
    })
  })

  describe("web addresses", () => {
    const KLONDIKE = "https://en.wikipedia.org/wiki/Klondike_(solitaire)"

    test("each address in a line, its offsets 0-based, its end just after it", () => {
      const line = `# See ${KLONDIKE} and http://x.org.`
      expect(CodeEditorFeatures.addressesIn(line)).toEqual([
        { url: KLONDIKE, start: 6, end: 6 + KLONDIKE.length },
        { url: "http://x.org", start: line.indexOf("http://x"), end: line.indexOf("http://x") + 12 }
      ])
    })

    test("none in a line without one", () => {
      expect(CodeEditorFeatures.addressesIn("a card is a view")).toEqual([])
    })

    test("the address at an offset:  its start and its end count, a step either side doesn't", () => {
      const line = `see ${KLONDIKE} now`
      const end = 4 + KLONDIKE.length
      expect(CodeEditorFeatures.addressAt(line, 3)).toBeUndefined()
      expect(CodeEditorFeatures.addressAt(line, 4)?.url).toBe(KLONDIKE)
      expect(CodeEditorFeatures.addressAt(line, end)?.url).toBe(KLONDIKE)
      expect(CodeEditorFeatures.addressAt(line, end + 1)).toBeUndefined()
    })

    test.each([
      ["a sentence's end", "https://x.org/a.", "https://x.org/a"],
      ["a comma and a colon", "https://x.org/a,:", "https://x.org/a"],
      ["its own brackets", KLONDIKE, KLONDIKE],
      ["a Markdown link's bracket", "https://x.org/a_(b))", "https://x.org/a_(b)"],
      ["a bracket around it, then a full stop", "https://x.org/a).", "https://x.org/a"]
    ])("trimmed:  %s", (_, address, trimmed) => {
      expect(CodeEditorFeatures.trimmedAddress(address)).toBe(trimmed)
    })

    test("quotes and angle brackets end an address", () => {
      expect(CodeEditorFeatures.addressesIn(`<a href="https://x.org/a">`).map(({ url }) => url)).toEqual([
        "https://x.org/a"
      ])
    })
  })

  describe("heading comments", () => {
    test("from the first `#` to the line's end, after any indent", () => {
      expect(CodeEditorFeatures.headingIn("\t## Game Play")).toEqual({ level: 2, start: 1, end: 13 })
      expect(CodeEditorFeatures.headingIn("# Solitaire")).toEqual({ level: 1, start: 0, end: 11 })
    })

    test("deeper than `MAX_HEADING_LEVEL` shares its level", () => {
      expect(CodeEditorFeatures.headingIn("###### deep")?.level).toBe(CodeEditorFeatures.MAX_HEADING_LEVEL)
    })

    test("none when the line doesn't start with `#`", () => {
      expect(CodeEditorFeatures.headingIn("its rank  # a note")).toBeUndefined()
      expect(CodeEditorFeatures.headingIn("")).toBeUndefined()
    })
  })
})

/** `text` with `edits` made, each against the text before any of them. */
function applied(text: string, edits: TextEdit[]): string {
  const lines = text.split("\n")
  const offset = ({ line, character }: Position) =>
    lines.slice(0, line).reduce((sum, each) => sum + each.length + 1, 0) + character
  return [...edits]
    .sort((a, b) => offset(b.range.start) - offset(a.range.start))
    .reduce(
      (now, { range, newText }) => now.slice(0, offset(range.start)) + newText + now.slice(offset(range.end)),
      text
    )
}
