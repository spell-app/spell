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

  describe("an attribute picked, not typed:  its list's first row opens a picker (epic `editor` T61)", () => {
    test("a colour's:  Pick a color…, writing what's typed, its command handed the palette's colours", async () => {
      game.service.picksValues = true
      const [pick, first] = await game.typed('<button color="pr')
      expect(pick?.label).toBe("Pick a color…")
      expect(pick?.insertText).toBe("pr")
      expect(pick?.command?.command).toBe(LSP.PICK_VALUE_COMMAND)
      const [picker, values] = pick!.command!.arguments as [SP.ComponentValuePicker, string[]]
      expect(picker.kind).toBe("color")
      expect(picker.kind === "color" && picker.colors[values.indexOf("red")]).toBe("var(--ui-red, gray)")
      expect(first?.label).toBe("primary")
    })

    test("an icon's, though it takes no words:  Pick an icon…, alone", async () => {
      game.service.picksValues = true
      expect(labels(await game.typed('<button icon="'))).toEqual(["Pick an icon…"])
    })

    test("in Spanish:  `icono`, Elegir un icono…;  a colour's words Spanish", async () => {
      solitario.service.picksValues = true
      expect(labels(await solitario.typed('<botón icono="'))).toEqual(["Elegir un icono…"])
      const colours = labels(await solitario.typed('<texto color="'))
      expect(colours[0]).toBe("Elegir un color…")
      expect(colours).toContain("rojo")
    })

    test("not for an editor that can't pick (VS Code):  no Pick row", async () => {
      solitario.service.picksValues = false
      expect(labels(await solitario.typed('<texto color="'))).not.toContain("Elegir un color…")
      expect(labels(await solitario.typed('<botón icono="'))).not.toContain("Elegir un icono…")
    })
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

  test("a tag split over lines:  its attributes, and their words, on each line under it (epic `editor` I64)", async () => {
    expect(labels(await game.typed("<button fluid\n\tcol"))).toEqual(expect.arrayContaining(["color", "size"]))
    expect(labels(await game.typed('<button\n\tfluid\n\tcolor="'))).toEqual(expect.arrayContaining(["primary"]))
    const color = await game.hovered('<button fluid\n\tcolor="primary">New</button>', "color")
    expect(textOf(color)).toMatch(/\*\*color\*\* · attribute of <button>/)
  })

  test("...but not once the tag is closed, nor on a line no further in than its tag", async () => {
    expect(labels(await game.typed("<button fluid>\n\tcol"))).not.toContain("color")
    expect(labels(await game.typed("<button fluid\ncol"))).not.toContain("color")
  })

  describe("a tag or an attribute chosen is written whole, the caret where you type next (epic `editor` I70)", () => {
    /** What choosing `label` writes, typed as `line`:  its snippet, or its name alone;  and whether a list follows. */
    async function chosen(project: typeof game, line: string, label: string) {
      const item = (await project.typed(line)).find((it) => it.label === label)
      if (!item) throw new TypeError(`chosen():  no \`${label}\` for \`${line}\``)
      return { writes: item.insertText ?? item.label, isSnippet: item.insertTextFormat === 2, lists: !!item.command }
    }

    test('spell\'s own:  `<action "|" />`, its actions listed at once;  `<divider/>`;  `<context-menu>` a line in', async () => {
      expect(await chosen(game, "<act", "action")).toEqual({ writes: 'action "$1" />', isSnippet: true, lists: true })
      expect(await chosen(game, "<", "divider")).toMatchObject({ writes: "divider/>$0", lists: false })
      expect(await chosen(game, "<chi", "children")).toMatchObject({ writes: "children/>$0" })
      expect(await chosen(game, "<con", "context-menu")).toMatchObject({ writes: "context-menu>\n\t$0\n</>" })
    })

    test('Spell UI\'s, by what each holds:  `<icon |/>`, `<button>|</>`, `<tab "|">`, `<content>` a line in', async () => {
      expect(await chosen(game, "<ic", "icon")).toEqual({ writes: "icon $0/>", isSnippet: true, lists: true })
      expect(await chosen(game, "<inp", "input")).toMatchObject({ writes: "input $0/>" })
      expect(await chosen(game, "<but", "button")).toMatchObject({ writes: "button>$0</>", lists: false })
      expect(await chosen(game, "<ta", "tab")).toMatchObject({ writes: 'tab "$1">\n\t$0\n</>' })
      expect(await chosen(game, "<cont", "content")).toMatchObject({ writes: "content>\n\t$0\n</>" })
      expect(await chosen(game, "<tool", "toolbar")).toMatchObject({ writes: "toolbar>\n\t$0\n</>" })
    })

    test('...in Spanish, a Spanish file\'s names:  `<acción "|" />`, `<boton>|</>`', async () => {
      expect(await chosen(solitario, "<acc", "acción")).toMatchObject({ writes: 'acción "$1" />', lists: true })
      expect(await chosen(solitario, "<bot", "boton")).toMatchObject({ writes: "boton>$0</>" })
    })

    test("nothing doubled:  a tag already written on after the caret writes its name alone", async () => {
      expect(await chosen(game, '<act| "cheat"/>', "action")).toEqual({
        writes: "action",
        isSnippet: false,
        lists: false
      })
      expect(await chosen(game, "<but|>New</button>", "button")).toMatchObject({ writes: "button", isSnippet: false })
      expect(await chosen(game, '<cont| class="x">', "content")).toMatchObject({ writes: "content" })
      // the line's end, or another tag, after it:  written whole
      expect(await chosen(game, "<but|</segment>", "button")).toMatchObject({ writes: "button>$0</>" })
    })

    test('an attribute:  `color="|"`, its words listed at once;  `fluid` by its name alone (Owen, on I55)', async () => {
      expect(await chosen(game, "<segment col", "color")).toEqual({
        writes: 'color="$1"',
        isSnippet: true,
        lists: true
      })
      expect(await chosen(game, "<button flu", "fluid")).toEqual({ writes: "fluid", isSnippet: false, lists: false })
      expect(await chosen(game, "<button dis", "disabled")).toMatchObject({ writes: "disabled", isSnippet: false })
      // any text:  its quotes, no list
      expect(await chosen(game, "<button lab", "label")).toEqual({
        writes: 'label="$1"',
        isSnippet: true,
        lists: false
      })
      // its `=` already there
      expect(await chosen(game, '<segment col|="red">', "color")).toMatchObject({ writes: "color", isSnippet: false })
      expect(await chosen(solitario, "<botón tam", "tamano")).toMatchObject({ writes: 'tamano="$1"', lists: true })
    })
  })

  test("nothing in a quoted value, or for a project's own view", async () => {
    expect(labels(await game.typed('<button label="a col'))).not.toContain("color")
    expect(await game.hovered("<square></square>", "square")).toBeNull()
  })
})

/** Where `projectIn().typed()`'s caret is, in a line that says. */
const CARET = "|"

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
 * - `typed(line)`:  completions at the end of `line`, typed into `file` on a new line after the first holding `after`;
 *   a `line` of several (`\n`) ends on its last;  at its `|`, if it has one:  `<act|/>`
 * - `typedInAction(line)`:  the same, after the first line that sets a property (`set its turn to "X"`)
 * - `hovered(line, word)`:  the hover over `word` in `line`'s last line, typed there
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
    const written = line.split("\n")
    lines.splice(at + 1, 0, ...written.map((it) => `${indent}${it}`))
    await workspace.update(uri, lines.join("\n"))
    // its last line, where it ends
    const last = written.at(-1)!
    return { file: workspace.fileFor(uri)!, line: at + written.length, indent: indent.length, last }
  }

  return {
    service,
    async typed(line: string): Promise<CompletionItem[]> {
      // a `|` is the caret, what follows it written after it (epic `editor` I70);  else the line's end
      const caret = line.lastIndexOf(CARET)
      const written = await write(caret < 0 ? line : line.slice(0, caret) + line.slice(caret + 1))
      const lastCaret = caret < 0 ? -1 : line.split("\n").at(-1)!.lastIndexOf(CARET)
      const character = written.indent + (lastCaret < 0 ? written.last.length : lastCaret)
      return service.completion(written.file, { line: written.line, character }).items
    },
    async typedInAction(line: string): Promise<CompletionItem[]> {
      const written = await write(line, "set its turn to")
      const character = written.indent + written.last.length
      return service.completion(written.file, { line: written.line, character }).items
    },
    async hovered(line: string, word: string): Promise<Hover | null> {
      const written = await write(line)
      const character = written.indent + written.last.indexOf(word) + 1
      return service.hover(written.file, { line: written.line, character }, "plain")
    }
  }
}
