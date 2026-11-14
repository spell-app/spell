import { describe, expect, test } from "vite-plus/test"
import { cpSync, mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { CompletionItem } from "vscode-languageserver"

import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { fixtureFolder } from "spell/app/spaces/test"

/**
 * The editor's completions for spell's own `<action>`, `<context-menu>` and `<divider/>` tags, and for an action's
 * quoted word (epic `language` P53):  in Solitaire and its Spanish twin, Solitario, each a temp copy.
 * - Each test types a line into the game's drawing, right after its toolbar's last `<action>`, and asks there.
 * - The lines are found by what they say, never by number:  the examples are Owen's, and change.
 */
describe("SpellLanguageService, action and menu tags (epic `language` P53)", () => {
  const solitaire = gameIn("Solitaire", "Solitaire.spell", '<action "redo"')
  const solitario = gameIn("Solitario", "Solitario.es.spell", '<acción "rehacer"')

  test("typing a tag offers spell's own first:  `children`, `action`, `context-menu`, `divider`", async () => {
    const items = await solitaire.typed("<ac")
    // then Spell UI's (epic `editor` I55)
    expect(labels(items).slice(0, 4)).toEqual(["children", "action", "context-menu", "divider"])
    expect(items.find(({ label }) => label === "action")?.detail).toBe(
      'a button for one of the program\'s actions:  <action "auto play" />'
    )
    expect(items.find(({ label }) => label === "children")?.detail).toBe("spell's word for <slot>")
  })

  test("...in Spanish, a Spanish file's own:  `hijos`, `acción`, `menú-contextual`, `divisor`", async () => {
    const items = await solitario.typed("<acc")
    expect(labels(items).slice(0, 4)).toEqual(["hijos", "acción", "menú-contextual", "divisor"])
    expect(items.find(({ label }) => label === "menú-contextual")?.detail).toBe(
      "el menú del clic derecho del elemento donde está"
    )
  })

  test("an action's quoted word offers the program's actions:  the game's first, then undo and redo", async () => {
    const items = await solitaire.typed('<action "')
    const words = labels(items)
    expect(words).toEqual(expect.arrayContaining(["auto play", "cheat", "restart the game", "turn over the next card"]))
    // in its order:  the game's own, then the app's, then the other types' (a card's `play`)
    const sorted = [...items].sort((a, b) => a.sortText!.localeCompare(b.sortText!)).map(({ label }) => label)
    expect(sorted.indexOf("auto play")).toBeLessThan(sorted.indexOf("undo"))
    expect(sorted.indexOf("redo")).toBeLessThan(sorted.indexOf("play a card"))
    expect(items.find(({ label }) => label === "auto play")?.detail).toBe("action of Solitaire")
    // never a drawing, a test, a question or a creation hook
    expect(words).not.toContain("draw it")
    expect(words.some((word) => /^(draw|test)\b/.test(word))).toBe(false)
    expect(words).not.toContain("is a face card")
    expect(words).not.toContain("creating it")
    expect(items.find(({ label }) => label === "undo")?.detail).toBe("the app's own action")
  })

  test("...replacing what's typed inside the quotes, words and all", async () => {
    const items = await solitaire.typed('<action "auto p')
    const autoPlay = items.find(({ label }) => label === "auto play")!
    expect(autoPlay.textEdit).toMatchObject({ newText: "auto play" })
    const { range } = autoPlay.textEdit as { range: { start: { character: number }; end: { character: number } } }
    expect(range.end.character - range.start.character).toBe("auto p".length)
  })

  test("...in Spanish, Solitario's:  `jugar solo`, `hacer trampa`, `deshacer`", async () => {
    const words = labels(await solitario.typed('<acción "'))
    expect(words).toEqual(expect.arrayContaining(["jugar solo", "hacer trampa", "reiniciar el juego", "deshacer"]))
  })

  test("a quoted word on any other tag offers no actions", async () => {
    const items = await solitaire.typed('<foundation "')
    expect(items.some(({ textEdit }) => textEdit && "range" in textEdit)).toBe(false)
  })
})

/** Each completion's label. */
function labels(items: CompletionItem[]): string[] {
  return items.map(({ label }) => label)
}

/**
 * A temp copy of example `project`, and `typed()`:  completions at the end of `line`,
 * typed into `file` on a new line right after the first line holding `after`.
 */
function gameIn(project: string, file: string, after: string) {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-actions-"))
  cpSync(fixtureFolder(`@spell/examples/${project}`), resolve(dir, project), { recursive: true })
  const path = resolve(dir, project, file)
  const uri = pathToFileURL(path).href
  const original = readFileSync(path, "utf8")
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)

  async function typed(line: string): Promise<CompletionItem[]> {
    const lines = original.split("\n")
    const at = lines.findIndex((it) => it.includes(after))
    if (at < 0) throw new TypeError(`typed():  no line in ${file} says \`${after}\``)
    const indent = /^\s*/.exec(lines[at]!)![0]
    lines.splice(at + 1, 0, `${indent}${line}`)
    await workspace.update(uri, lines.join("\n"))
    const position = { line: at + 1, character: indent.length + line.length }
    return service.completion(workspace.fileFor(uri)!, position).items
  }
  return { typed }
}
