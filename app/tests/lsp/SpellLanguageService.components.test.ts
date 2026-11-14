import { beforeAll, describe, expect, test, vi } from "vite-plus/test"
import { cpSync, mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { CompletionItem, Hover } from "vscode-languageserver"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { fixtureFolder } from "spell/app/spaces/test"

/**
 * The editor's help for a drawing's components, Spell UI's (epic `editor` I55):
 * their tags, their attributes and the words an attribute takes, each saying what it is, as they're typed;
 * and what a tag or an attribute is, on hover.  A thing's properties say what each is too.
 * - In Tic-Tac-Toe and its Spanish twin's language, Solitario, each a temp copy:  each test types a line into a
 *   drawing, right after a line found by what it says (the examples are Owen's, and change).
 */
describe("SpellLanguageService, a drawing's components (epic `editor` I55)", () => {
  const game = projectIn("tic-tac-toe", "TicTacToe.spell", "<content>")
  const solitario = projectIn("Solitario", "Carta.es.spell", '<texto color="azul">')

  // Spell UI's help table loads the first time it's asked for
  beforeAll(async () => {
    await vi.waitUntil(() => SP.ComponentPacks.help("en") && SP.ComponentPacks.help("es"), { timeout: 10_000 })
  })

  test("a tag offers spell's own, then Spell UI's, each saying what it is", async () => {
    const items = await game.typed("<act")
    expect(labels(items).slice(0, 4)).toEqual(["children", "action", "context-menu", "divider"])
    const button = items.find(({ label }) => label === "button")
    expect(button?.labelDetails?.description).toMatch(/\S/)
  })

  test("inside a tag, its attributes, each saying what it is", async () => {
    const items = await game.typed("<button col")
    expect(labels(items)).toEqual(expect.arrayContaining(["color", "fluid", "size", "disabled"]))
    expect(labels(items)).not.toContain("tic-tac-toe")
    const color = items.find(({ label }) => label === "color")!
    expect(color.labelDetails?.description).toMatch(/\S/)
    expect(color.detail).toBe("attribute of <button>")
  })

  test("...and in an attribute's quotes, the words it takes", async () => {
    const words = labels(await game.typed('<button fluid color="'))
    expect(words).toEqual(expect.arrayContaining(["primary", "red"]))
  })

  test("...in Spanish, a Spanish file's names:  `<botón tam` => `tamano`, its words Spanish", async () => {
    expect(labels(await solitario.typed("<botón tam"))).toContain("tamano")
    expect(labels(await solitario.typed('<texto color="'))).toContain("rojo")
  })

  test("a thing's property says what it is in the list:  `set its tu` => `turn`, `Whose turn it is`", async () => {
    const items = await game.typedInAction("set its tu")
    const turn = items.find(({ label }) => label === "turn")
    expect(turn?.labelDetails?.description).toMatch(/^Whose turn it is/)
  })

  test("hovering a tag or an attribute says what it is", async () => {
    const tag = await game.hovered('<button color="primary">New</button>', "button")
    expect(textOf(tag)).toMatch(/\*\*<button>\*\* · a component/)
    const color = await game.hovered('<button color="primary">New</button>', "color")
    expect(textOf(color)).toMatch(/\*\*color\*\* · attribute of <button>[\s\S]*`primary`/)
  })

  test("nothing in a quoted value, or for a project's own view", async () => {
    expect(labels(await game.typed('<button label="a col'))).not.toContain("color")
    expect(await game.hovered("<square></square>", "square")).toBeNull()
  })
})

/** Each completion's label. */
function labels(items: CompletionItem[]): string[] {
  return items.map(({ label }) => label)
}

/** A hover's markdown. */
function textOf(hover: Hover | null): string {
  return hover && typeof hover.contents === "object" && "value" in hover.contents ? hover.contents.value : ""
}

/**
 * A temp copy of example `project`:
 * - `typed(line)`:  completions at the end of `line`, typed into `file` on a new line after the first holding `after`
 * - `typedInAction(line)`:  the same, after the first line that sets a property (`set its turn to "X"`)
 * - `hovered(line, word)`:  the hover over `word` in `line`, typed there
 */
function projectIn(project: string, file: string, after: string) {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-components-"))
  cpSync(fixtureFolder(`@spell/examples/${project}`), resolve(dir, project), { recursive: true })
  const path = resolve(dir, project, file)
  const uri = pathToFileURL(path).href
  const original = readFileSync(path, "utf8")
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)

  /** `line` written after the first line holding `anchor`, and where its end is. */
  async function write(line: string, anchor = after) {
    const lines = original.split("\n")
    const at = lines.findIndex((it) => it.includes(anchor))
    if (at < 0) throw new TypeError(`projectIn():  no line in ${file} says \`${anchor}\``)
    const indent = /^\s*/.exec(lines[at]!)![0] + (anchor === after ? "\t" : "")
    lines.splice(at + 1, 0, `${indent}${line}`)
    await workspace.update(uri, lines.join("\n"))
    return { file: workspace.fileFor(uri)!, line: at + 1, indent: indent.length }
  }

  return {
    async typed(line: string): Promise<CompletionItem[]> {
      const written = await write(line)
      return service.completion(written.file, { line: written.line, character: written.indent + line.length }).items
    },
    async typedInAction(line: string): Promise<CompletionItem[]> {
      const written = await write(line, "set its turn to")
      return service.completion(written.file, { line: written.line, character: written.indent + line.length }).items
    },
    async hovered(line: string, word: string): Promise<Hover | null> {
      const written = await write(line)
      const character = written.indent + line.indexOf(word) + 1
      return service.hover(written.file, { line: written.line, character }, "plain")
    }
  }
}
