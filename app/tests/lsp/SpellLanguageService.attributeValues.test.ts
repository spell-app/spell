import { beforeAll, describe, expect, test, vi } from "vite-plus/test"
import { cpSync, mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { fixtureFolder } from "spell/app/spaces/test"

/**
 * The words an attribute takes, for the quoted value the caret is in (epic `editor` T70):
 * what the app's code editor shows quietly under a value the caret rests in.
 * - In a temp copy of Tic-Tac-Toe, a line written into its drawing after `<content>`.
 */
describe("SpellLanguageService.attributeValuesAt() (epic `editor` T70)", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-attribute-values-"))
  cpSync(fixtureFolder("@spell/examples/tic-tac-toe"), resolve(dir, "tic-tac-toe"), { recursive: true })
  const path = resolve(dir, "tic-tac-toe", "TicTacToe.spell")
  const uri = pathToFileURL(path).href
  const original = readFileSync(path, "utf8")
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)

  // Spell UI's help table loads the first time it's asked for
  beforeAll(async () => {
    await vi.waitUntil(() => SP.ComponentPacks.help("en"), { timeout: 10_000 })
  })

  /** The words at `word`'s `offset`-th letter, on `line` written after `<content>`. */
  async function valuesAt(line: string, word: string, offset = 1) {
    const lines = original.split("\n")
    const at = lines.findIndex((it) => it.includes("<content>"))
    const indent = `${/^\s*/.exec(lines[at]!)![0]}\t`
    lines.splice(at + 1, 0, indent + line)
    await workspace.update(uri, lines.join("\n"))
    const character = indent.length + line.indexOf(word) + offset
    return service.attributeValuesAt(workspace.fileFor(uri)!, { line: at + 1, character })
  }

  test("in a value:  its tag, its attribute and the words it takes", async () => {
    const values = await valuesAt('<button fluid color="red">Go</button>', "red")
    expect(values).toMatchObject({ tag: "button", attribute: "color" })
    expect(values?.values).toEqual(expect.arrayContaining(["primary", "red"]))
  })

  test("not outside the quotes, nor in a quoted name, nor for an attribute that takes any words", async () => {
    expect(await valuesAt('<button fluid color="red">Go</button>', "fluid")).toBeUndefined()
    expect(await valuesAt('<action "auto play" />', "auto")).toBeUndefined()
    expect(await valuesAt('<text class="big">hi</text>', "big")).toBeUndefined()
  })
})
