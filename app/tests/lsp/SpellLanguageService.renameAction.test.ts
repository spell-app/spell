import { describe, expect, test } from "vite-plus/test"
import { cpSync, mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { Position, TextEdit } from "vscode-languageserver"

import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { fixtureFolder } from "spell/app/spaces/test"

/**
 * Renaming one of the program's actions, as the Inspector's Code card does when its name is clicked (epic `editor` I111):
 * its head, its calls and its buttons, in a temp copy of Solitaire.
 * - Lines are found by what they say, never by number:  the example is Owen's, and changes.
 */
describe("SpellLanguageService.renameActionAt() (epic `editor` I111)", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-rename-action-"))
  cpSync(fixtureFolder("@spell/examples/Solitaire"), resolve(dir, "Solitaire"), { recursive: true })
  const path = resolve(dir, "Solitaire", "Solitaire.spell")
  const uri = pathToFileURL(path).href
  const text = readFileSync(path, "utf8")
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)

  test("renames its head, keeping its quotes, title and icon, and every button naming it", async () => {
    await workspace.update(uri, text)
    const file = workspace.fileFor(uri)!
    const edit = service.renameActionAt(file, positionOf(text, 'to "cheat"', "cheat"), "peek")
    const renamed = applied(text, edit.changes![uri]!)
    expect(renamed).toContain('to "peek" with shortcut "C", icon "eye"')
    expect(renamed).not.toMatch(/"cheat"/)
    expect(renamed.match(/<action "peek"\/>/g)?.length).toBe(text.match(/<action "cheat"\/>/g)?.length)
  })

  test("renames its calls too:  `if anything changed auto play`", async () => {
    await workspace.update(uri, text)
    const file = workspace.fileFor(uri)!
    const edit = service.renameActionAt(file, positionOf(text, 'to "auto play"', "auto play"), "play all")
    const renamed = applied(text, edit.changes![uri]!)
    expect(renamed).toContain('to "play all" with shortcut "A"')
    expect(renamed).toContain("if anything changed play all")
    expect(renamed).not.toContain('<action "auto play"/>')
    // the renamed project still parses, with no new error
    const errors = async (text: string) => {
      await workspace.update(uri, text)
      return service
        .diagnostics(workspace.fileFor(uri)!)
        .filter(({ severity }) => severity === 1)
        .map(({ message }) => message)
    }
    expect(await errors(renamed)).toEqual(await errors(text))
  })

  test("refuses an empty name, one another member has, and what isn't an action", async () => {
    await workspace.update(uri, text)
    const file = workspace.fileFor(uri)!
    const cheat = positionOf(text, 'to "cheat"', "cheat")
    expect(kindOf(() => service.renameActionAt(file, cheat, "  "))).toBe("empty")
    expect(kindOf(() => service.renameActionAt(file, cheat, "Auto Play"))).toBe("taken")
    // which kind of member has it, for the editor's words (I139)
    expect(takenByOf(() => service.renameActionAt(file, cheat, "Auto Play"))).toBe("action")
    expect(takenByOf(() => service.renameActionAt(file, cheat, "score"))).toBe("property")
    // any other member of its type:  a property, an action that takes something
    expect(kindOf(() => service.renameActionAt(file, cheat, "score"))).toBe("taken")
    expect(kindOf(() => service.renameActionAt(file, cheat, "Cheat"))).toBeUndefined()
    expect(kindOf(() => service.renameActionAt(file, cheat, "a/b"))).toBe("not-words")
    expect(kindOf(() => service.renameActionAt(file, positionOf(text, "to count the points", "count"), "x"))).toBe(
      "not-an-action"
    )
    // and the editor's own rename, F2, says no rather than throwing
    expect(service.rename(file, cheat, "auto play")).toBeNull()
    // a refusal leaves nothing behind:  the next name still renames it everywhere
    const renamed = applied(text, service.renameActionAt(file, cheat, "peek").changes![uri]!)
    expect(renamed.match(/<action "peek"\/>/g)?.length).toBe(text.match(/<action "cheat"\/>/g)?.length)
  })
})

/** Where `word` is, 0-based, on the first line holding `line`. */
function positionOf(text: string, line: string, word: string): Position {
  const lines = text.split("\n")
  const at = lines.findIndex((it) => it.includes(line))
  if (at < 0) throw new TypeError(`positionOf():  no line says \`${line}\``)
  return { line: at, character: lines[at]!.indexOf(word) + 1 }
}

/** `text` with `edits` made, last first so each range still holds. */
function applied(text: string, edits: TextEdit[]): string {
  const lines = text.split("\n")
  const offset = ({ line, character }: Position) =>
    lines.slice(0, line).reduce((sum, it) => sum + it.length + 1, 0) + character
  return [...edits]
    .sort((a, b) => offset(b.range.start) - offset(a.range.start))
    .reduce(
      (out, { range, newText }) => out.slice(0, offset(range.start)) + newText + out.slice(offset(range.end)),
      text
    )
}

/** What `rename` says has the name already, when it throws `taken`;  `undefined` when it doesn't. */
function takenByOf(rename: () => unknown): string | undefined {
  try {
    rename()
  } catch (error) {
    if (error instanceof LSP.RenameError) return error.cause?.takenBy
    throw error
  }
  return undefined
}

/** The `RenameError` kind `rename` throws, or `undefined` if it doesn't. */
function kindOf(rename: () => unknown): string | undefined {
  try {
    rename()
  } catch (error) {
    if (error instanceof LSP.RenameError) return error.cause?.kind
    throw error
  }
  return undefined
}
