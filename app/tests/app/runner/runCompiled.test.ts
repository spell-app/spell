import { describe, expect, test } from "vite-plus/test"

import { asFunction, linkModule, nativeImportsOf, projectImportsOf, startChanged } from "spell/app/app/runner"

const COMPILED = `/*! SPELL: PROJECT { spellVersion: "0.8.0" } */
import { core, Thing, List, App } from "@spell/core"
import { Counter } from "@spell/project/@spell/test/counter"
import { Pile } from "@spell/project/@spell/examples/Solitaire"
import { Counter as Again } from "@spell/project/@spell/test/counter"

export class Game extends App {}
`

describe("projectImportsOf()", () => {
  test("lists each imported project once, in order", () => {
    expect(projectImportsOf(COMPILED)).toEqual(["@spell/test/counter", "@spell/examples/Solitaire"])
  })

  test("is empty with no project imports", () => {
    expect(projectImportsOf(`import { core } from "@spell/core"`)).toEqual([])
  })
})

describe("linkModule()", () => {
  test("points `@spell/core` and each project at its URL", () => {
    const linked = linkModule(COMPILED, "blob:core", {
      "@spell/test/counter": "blob:counter",
      "@spell/examples/Solitaire": "blob:solitaire"
    })
    expect(linked).toContain(`import { core, Thing, List, App } from "blob:core"`)
    expect(linked).toContain(`import { Counter } from "blob:counter"`)
    expect(linked).toContain(`import { Pile } from "blob:solitaire"`)
    expect(linked).toContain(`import { Counter as Again } from "blob:counter"`)
    expect(linked).not.toContain("@spell/")
  })

  test("leaves a project it has no URL for alone", () => {
    const linked = linkModule(COMPILED, "blob:core")
    expect(linked).toContain(`from "@spell/project/@spell/test/counter"`)
    expect(linked).toContain(`from "blob:core"`)
  })

  test("points `@spell/elements` at the runtime too:  it exports `SpellElement` (P10)", () => {
    const linked = linkModule(`import { E, SpellElement } from "@spell/elements"`, "blob:core")
    expect(linked).toBe(`import { E, SpellElement } from "blob:core"`)
  })

  test('handles minified `from"..."`', () => {
    expect(linkModule(`import{core}from"@spell/core"`, "blob:core")).toBe(`import{core}from"blob:core"`)
  })

  test("points each code file `call native` calls at its URL, and leaves one it has none for alone (from-console I21)", () => {
    const source = [
      `import { copyText } from "@spell/native/owen@spell/clipboard/clipboard.ts"`,
      `import { shout } from "@spell/native/owen@spell/clipboard/shout.js"`
    ].join("\n")
    const linked = linkModule(
      source,
      "blob:core",
      {},
      { "@spell/native/owen@spell/clipboard/clipboard.ts": "blob:clip" }
    )
    expect(linked).toContain(`import { copyText } from "blob:clip"`)
    expect(linked).toContain(`from "@spell/native/owen@spell/clipboard/shout.js"`)
  })
})

describe("nativeImportsOf()", () => {
  test("lists each code file a program imports once, by module", () => {
    const source = [
      `import { core } from "@spell/core"`,
      `import { copyText } from "@spell/native/owen@spell/clipboard/clipboard.ts"`,
      `import { pasteText } from "@spell/native/owen@spell/clipboard/clipboard.ts"`
    ].join("\n")
    expect(nativeImportsOf(source)).toEqual(["@spell/native/owen@spell/clipboard/clipboard.ts"])
  })
})

describe("startChanged():  does a recompile change the program's start, so it runs afresh?  (P17)", () => {
  const SEPARATOR = "\n// -----------\n"
  const IMPORT = 'import { core, Thing, App } from "@spell/core"\n'
  const CARD = "export class Card extends Thing {}\nif (!core.isCarryingOver) testCardSetup()"
  const GAME = "export let game = new Game()\nresetTheGame()\nif (!core.isCarryingOver) game.start()"
  const STYLES = "core.installStyles(undefined, `.board {}`)"
  /** A project of `files`, compiled:  the runtime's import first, a separator between each file's code. */
  const project = (...files: string[]) => IMPORT + files.join(SEPARATOR)

  test("several files:  an edit to the file that starts its app does;  to a file of types, or styles, doesn't", () => {
    const before = project(CARD, GAME, STYLES)
    expect(startChanged(before, project(CARD.replace("{}", "{ x = 1 }"), GAME, STYLES))).toBe(false)
    expect(startChanged(before, project(CARD, GAME, STYLES.replace("{}", "{ color: red }")))).toBe(false)
    expect(startChanged(before, project(CARD, GAME.replace("resetTheGame()", "dealAgain()"), STYLES))).toBe(true)
    // a test call is part of the start, but its file doesn't start the app
    expect(startChanged(before, project(CARD.replace("testCardSetup", "testCardMoves"), GAME, STYLES))).toBe(false)
  })

  test("the lines importing from the runtime don't count;  a file more or less does", () => {
    const before = project(GAME, CARD)
    expect(startChanged(before, project(GAME, CARD).replace("Thing, App", "Thing, App, List"))).toBe(false)
    expect(startChanged(before, project(GAME, CARD, STYLES))).toBe(true)
  })

  test("one file:  only when its start's own lines change", () => {
    const before = project(`${CARD}\n${GAME}`, STYLES)
    expect(startChanged(before, project(`${CARD}\n${GAME.replace("resetTheGame()", "dealAgain()")}`, STYLES))).toBe(
      false
    )
    expect(startChanged(before, project(`${CARD}\n${GAME.replace("game.start()", "board.start()")}`, STYLES))).toBe(
      true
    )
    expect(startChanged(before, project(`${GAME}`, STYLES))).toBe(true)
  })

  test("no app started:  never", () => {
    const counter = "export let counter = new Counter()\ncounter.start()"
    expect(startChanged(project(counter, CARD), project(counter.replace("new", "new  "), CARD))).toBe(false)
  })
})

describe("asFunction():  a program run as a function the browser can let go, not a module (solid-2-final P10)", () => {
  const LINKED = [
    `/*! SPELL: PROJECT { spellVersion: "0.8.0" } */`,
    `import { core, App } from "blob:core"`,
    `import { Pile as Stack } from "blob:solitaire"`,
    `export class Game extends App {}`,
    `export const game = new Game()`,
    `export async function testIt() {}`,
    `if (!core.isCarryingOver) game.start()`,
    `//# sourceMappingURL=data:application/json;base64,e30=`
  ].join("\n")

  test("reads each import from what it's handed, keeps every line where it was, and answers its exports", () => {
    const program = asFunction(LINKED, "@spell/examples/Solitaire")!
    expect(program.imports).toEqual(["blob:core", "blob:solitaire"])
    const lines = program.text.split("\n")
    expect(lines[0]).toBe(
      `(async (__spellImports__) => { "use strict"; const { core, App } = __spellImports__["blob:core"]; ` +
        `const { Pile: Stack } = __spellImports__["blob:solitaire"]; /*! SPELL: PROJECT { spellVersion: "0.8.0" } */`
    )
    expect(lines.slice(1, 7)).toEqual([
      "",
      "",
      "class Game extends App {}",
      "const game = new Game()",
      "async function testIt() {}",
      "if (!core.isCarryingOver) game.start()"
    ])
    expect(program.text).toContain(
      "return { get Game() { return Game }, get game() { return game }, get testIt() { return testIt } }\n})\n" +
        "//# sourceMappingURL=data:"
    )
    expect(program.text.trimEnd().endsWith("//# sourceURL=@spell/examples/Solitaire.spell.js")).toBe(true)
  })

  test("runs:  its exports are what it made, from the modules it's handed", async () => {
    class App {
      start() {
        started.push(this)
      }
    }
    const started: App[] = []
    const core = { isCarryingOver: false }
    const { text } = asFunction(LINKED)!
    const exports = await runText(text, { "blob:core": { core, App }, "blob:solitaire": { Pile: class {} } })
    expect(Object.keys(exports)).toEqual(["Game", "game", "testIt"])
    expect(exports.game).toBeInstanceOf(exports.Game as typeof App)
    expect(started).toEqual([exports.game])
  })

  test("its exports stay live, as a module's do:  `export let`, set later, reads as it is now", async () => {
    const { text } = asFunction(`export let count = 1\nexport function bump() { count++ }`)!
    const exports = await runText(text, {})
    ;(exports.bump as () => void)()
    expect(exports.count).toBe(2)
  })

  test("leaves a shape it doesn't know to run as a module", () => {
    expect(asFunction(`export default 3`)).toBeUndefined()
    expect(asFunction(`const a = 1\nexport { a }`)).toBeUndefined()
    expect(asFunction(`import "blob:x"`)).toBeUndefined()
    expect(asFunction(`export const { a } = b`)).toBeUndefined()
  })
})

/** Run a program's function text, as `runProgram()` does, handed `imports`. */
function runText(text: string, imports: Record<string, unknown>): Promise<Record<string, unknown>> {
  // oxlint-disable-next-line no-eval -- the program's text is what's under test
  const run = (0, eval)(text) as (imports: Record<string, unknown>) => Promise<Record<string, unknown>>
  return run(imports)
}

describe("asFunction() for a page's chunk (solid-2-final P13)", () => {
  test("reads what the running program declared by name, but never what it declares itself", async () => {
    const chunk = [
      `import { core, Page } from "blob:core"`,
      `export class Grammar extends Page {}`,
      `export const grammar = new Grammar(home)`
    ].join("\n")
    const program = asFunction(chunk, "Grammar", ["home", "Grammar", "spellUi"])!
    expect(program.text.split("\n")[0]).toContain("const { home, spellUi } = __spellGiven__;")
    expect(program.text).toMatch(/^\(async \(__spellImports__, __spellGiven__\) =>/)
    class Page {
      constructor(readonly from?: unknown) {}
    }
    // oxlint-disable-next-line no-eval -- the program's own text, as `runProgram()` runs it
    const run = (0, eval)(program.text) as (imports: unknown, given: unknown) => Promise<Record<string, unknown>>
    const exports = await run({ "blob:core": { core: {}, Page } }, { home: "the home page", spellUi: {} })
    expect((exports.grammar as Page).from).toBe("the home page")
  })
})
