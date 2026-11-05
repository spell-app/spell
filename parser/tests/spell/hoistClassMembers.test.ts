import { execFileSync } from "child_process"
import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { describe, expect, test } from "vite-plus/test"

import * as SC from "spell/parser/core"
import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/** spell_core's uv project. */
const SPELL_CORE = resolve(import.meta.dirname, "../../src/py/core")

/** A cards library:  a deck that makes its own cards. */
const CARDS = [
  "a card is a thing:",
  '\t- its "rank" is a number',
  "a deck is a list of cards:",
  "\t- to fill it:",
  "\t\tadd a new card to it"
]

/** A jokers library, on the cards library:  it adds to `card`, with no `a card:`. */
const JOKERS = ["to wink a card:", '\tprint "wink"']

/** An app on the cards library (and jokers, in the chain):  it adds `to play a card`, with no `a card:`. */
const APP = [
  "to play a card:",
  '\tprint "played"',
  "set the deck to a new deck",
  "fill the deck",
  "set the top to the first card in the deck",
  "play the top",
  "if the top is a card:",
  '\tprint "a card"'
]

/** One project of a test:  its id, its lines, and the types its project file `exports`. */
type TestProject = { id: string; lines: string[]; exports?: string[] }

/** The module compiled spell imports project `id` by, e.g. `@spell/project/@spell/library/cards`. */
const moduleOf = (id: string) => `${SP.SPELL_PROJECT_MODULE}${id}`

/**
 * `projects`, in order, each compiled by `writer` against the declarations of the ones before it, as a compile is:
 * its code, by project id.
 */
function compiledChain(projects: TestProject[], writer: P.ProgramWriter = P.JSWriter.instance): Map<string, string> {
  const imports: SP.DeclarationsImport[] = []
  const code = new Map<string, string>()
  for (const { id, lines, exports } of projects) {
    const parentScope = imports.length
      ? SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, imports)
      : SP.SpellParser.rootScope
    const { scope, files } = parseSpellProject(
      [{ path: `/${id.split("/").at(-1)}.spell`, contents: lines.join("\n") }],
      {
        parentScope
      }
    )
    expect(files.flatMap((file) => file.errors)).toEqual([])
    const parts = files.map(({ match }) => match!.AST as P.ASTStatementGroup)
    const header = SP.SpellProject.importHeaderFor(scope, writer)
    const options = SP.SpellProject.writerOptionsFor({ exports })
    const marked = SP.SpellProject.combineCompiled(parts, writer, header, scope, options)
    const split = SP.SpellDeclarations.split(marked, scope, { exports })
    code.set(id, split.code)
    imports.push({ from: id, declarations: split.declarations, module: moduleOf(id) })
  }
  return code
}

/**
 * Compiled javascript `code` RUN as a module, its imports from `modules`, by specifier:  what it exports.
 * - Its classes register as a runner's do, after the modules it imports (`core.things.addClasses()`).
 */
function runModule(code: string, modules: Map<string, Record<string, unknown>>): Record<string, unknown> {
  const exported = [...code.matchAll(/^export (?:class|const|let|function) (\w+)/gm)].map(([, name]) => name!)
  const body = code
    .replace(/^import \{ (.*) \} from "(.*)"$/gm, (_line, names: string, module: string) => {
      const bound = names.replace(/ as /g, ": ")
      return `const { ${bound} } = __modules.get(${JSON.stringify(module)})`
    })
    .replace(/^export /gm, "")
  // oxlint-disable-next-line no-implied-eval -- running compiled spell, as a runner does, is the test
  const run = new Function("__modules", `${body}\nreturn { ${exported.join(", ")} }`)
  const namespace = run(modules) as Record<string, unknown>
  SC.core.things.addClasses(namespace)
  return namespace
}

/** `projects` compiled and run in order, as a runner runs a program and what it imports:  each one's exports. */
function runChain(projects: TestProject[]): { exports: Map<string, Record<string, unknown>>; printed: string[] } {
  const code = compiledChain(projects)
  const modules = new Map<string, Record<string, unknown>>([["@spell/core", SC as unknown as Record<string, unknown>]])
  const exports = new Map<string, Record<string, unknown>>()
  const printed: string[] = []
  const log = SC.core.console.log
  SC.core.console.log = (...args: unknown[]) => void printed.push(args.join(" "))
  SC.core.things.clear()
  try {
    for (const { id } of projects) {
      const namespace = runModule(code.get(id)!, modules)
      modules.set(moduleOf(id), namespace)
      exports.set(id, namespace)
    }
  } finally {
    SC.core.console.log = log
  }
  return { exports, printed }
}

/** A class's prototype, to look members up on. */
const prototypeOf = (Class: unknown) => (Class as { prototype: Record<string, unknown> }).prototype

describe("an imported type added to makes a class of our own (epic `language` P26)", () => {
  const cards: TestProject = { id: "@spell/library/cards", lines: CARDS, exports: ["Card", "Deck"] }
  const jokers: TestProject = { id: "@spell/library/jokers", lines: JOKERS, exports: ["Card"] }
  const app: TestProject = { id: "@spell/examples/app", lines: APP }

  test("its class extends the library's, imported by another name;  the library's deck makes by name", () => {
    const code = compiledChain([cards, app])
    expect(code.get(cards.id)).toContain("this.append(new (core.classToMake(Card))())")
    const written = code.get(app.id)!
    expect(written).toContain('import { Card as CardsCard, Deck } from "@spell/project/@spell/library/cards"')
    expect(written).toContain("export class Card extends CardsCard {")
    expect(written).not.toContain("prototype")
  })

  test("the library's card is untouched, and its deck's cards are the app's", () => {
    const { exports, printed } = runChain([cards, app])
    const LibraryCard = exports.get(cards.id)!.Card
    const AppCard = exports.get(app.id)!.Card as abstract new () => unknown
    expect(prototypeOf(LibraryCard).play).toBeUndefined()
    expect(Object.getPrototypeOf(AppCard)).toBe(LibraryCard)
    const top = exports.get(app.id)!.top
    expect(top).toBeInstanceOf(AppCard)
    expect(top).toBeInstanceOf(LibraryCard as abstract new () => unknown)
    expect(printed).toEqual(["played", "a card"])
  })

  test("a project a library made by itself still makes its own cards", () => {
    const { exports } = runChain([cards])
    const { Deck, Card } = exports.get(cards.id)! as Record<string, new () => { fill(): void; items: unknown[] }>
    const deck = new Deck!()
    deck.fill()
    expect(Object.getPrototypeOf(deck.items[0])).toBe(prototypeOf(Card))
  })

  test("three projects make one chain, in import order:  the app's card extends jokers' extends the library's", () => {
    const code = compiledChain([cards, jokers, app])
    expect(code.get(jokers.id)).toContain("export class Card extends CardsCard {")
    const written = code.get(app.id)!
    expect(written).toContain('import { Deck } from "@spell/project/@spell/library/cards"')
    expect(written).toContain('import { Card as JokersCard } from "@spell/project/@spell/library/jokers"')
    expect(written).toContain("export class Card extends JokersCard {")
    const { exports, printed } = runChain([cards, jokers, app])
    const [LibraryCard, JokerCard, AppCard] = [cards, jokers, app].map(({ id }) => exports.get(id)!.Card)
    expect(Object.getPrototypeOf(JokerCard)).toBe(LibraryCard)
    expect(Object.getPrototypeOf(AppCard)).toBe(JokerCard)
    expect(prototypeOf(LibraryCard).wink).toBeUndefined()
    expect(typeof prototypeOf(JokerCard).wink).toBe("function")
    expect(exports.get(app.id)!.top).toBeInstanceOf(AppCard as abstract new () => unknown)
    expect(printed).toEqual(["played", "a card"])
  })

  test("a project that adds to a type imports the project it comes from first", () => {
    const [, jokersCode] = [...compiledChain([cards, jokers]).values()]
    expect(jokersCode).toBeDefined()
    const declarations = (id: string, lines: string[], parentScope: P.Scope) => {
      const { scope, files } = parseSpellProject([{ path: `/${id}.spell`, contents: lines.join("\n") }], {
        parentScope
      })
      const parts = files.map(({ match }) => match!.AST as P.ASTStatementGroup)
      return SP.SpellDeclarations.split(SP.SpellProject.combineCompiled(parts, P.JSWriter.instance, "", scope), scope)
        .declarations
    }
    const cardsDeclarations = declarations("cards", CARDS, SP.SpellParser.rootScope)
    const withCards = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [
      { from: cards.id, declarations: cardsDeclarations }
    ])
    const jokersDeclarations = declarations("jokers", JOKERS, withCards)
    expect(jokersDeclarations.subclasses).toEqual(["Card"])
    expect(jokersDeclarations.provides).toContain("Card")
    expect(() =>
      SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [
        { from: jokers.id, declarations: jokersDeclarations },
        { from: cards.id, declarations: cardsDeclarations }
      ])
    ).toThrow(/adds to 'Card', which isn't imported yet/)
  })

  test("Python:  the same chain, run", () => {
    const code = compiledChain([cards, jokers, app], PY.PyWriter.instance)
    expect(code.get(cards.id)).toContain("core.class_to_make(Card)()")
    expect(code.get(jokers.id)).toContain("class Card(CardsCard):")
    expect(code.get(app.id)).toContain("class Card(JokersCard):")
    const folder = mkdtempSync(join(tmpdir(), "spell-subclasses-"))
    try {
      for (const [id, written] of code) {
        writeFileSync(join(folder, `${PY.PyBaseWriter.projectModule(moduleOf(id))}.py`), written)
      }
      const check = [
        "import cards, jokers, app",
        "print(hasattr(cards.Card, 'wink'), hasattr(jokers.Card, 'play'))",
        "print(type(app.top) is app.Card, isinstance(app.top, cards.Card))"
      ].join("\n")
      writeFileSync(join(folder, "check.py"), check)
      const printed = execFileSync("uv", ["run", "--quiet", "--project", SPELL_CORE, "python", "check.py"], {
        cwd: folder,
        encoding: "utf8"
      })
      expect(printed.trim().split("\n")).toEqual(["played", "a card", "False False", "True True"])
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
