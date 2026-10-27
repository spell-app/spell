import semver from "semver"
import { describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject } from "spell/parser/spell/test"

/**
 * A project's declarations:  marked inline while compiling, then split out into its declarations file.
 * - That file is what another project imports it by.
 * - Over projects written here, inline.
 *   A whole frozen project's (Solitaire's), and parsing against them (`importScope()`), are spell-app's tests,
 *   beside the projects:  its `tests/spell/SpellDeclarations.test.ts`.
 */
describe("SpellDeclarations, inline", () => {
  test("a rule not specialize()d from a class with an `importableAs` throws, rather than being silently left out", () => {
    const projectScope = new P.ProjectScope({
      name: "unimportable",
      path: "/unimportable",
      parser: SP.SpellParser.rootScope.parser!.clone({ module: "/unimportable" }),
      parentScope: SP.SpellParser.rootScope
    })
    const statement = projectScope.parse("1", "expression")!
    projectScope.addRule(class frobnicate extends P.Keyword {}, { syntax: "frobnicate" }, statement)
    expect(() => SP.SpellDeclarations.declarationFor(statement)).toThrow(/frobnicate.*importableAs/)
  })

  test("`SPELL_VERSION` is the language's own semver, set by hand -- NOT from package.json", () => {
    expect(semver.valid(SP.SPELL_VERSION)).toBe(SP.SPELL_VERSION)
  })
})

/**
 * `a card belongs to one pile` is saved as the member it gives cards:  `pile`, `exclusive`, a `Pile`.
 * - Loading it gives `Card` that read-only member again -- see `P.TypeScope.declareOwnerMember()`.
 * - The list types' own declarations say nothing about it:  `a pile is a list of cards` is plain.
 */
describe("SpellDeclarations of `a card belongs to one pile`", () => {
  const library = [
    { path: "/Card.spell", contents: "a card is a thing" },
    { path: "/Pile.spell", contents: "a pile is a list of cards\na card belongs to one pile\na tableau is a pile" }
  ]
  const declarations = compiledSpellProject(library).declarations
  const from = "@spell/library/piles"

  test("says the member it gives cards -- its list types stay plain", () => {
    expect(declarations.statements.find(({ property }) => property === "pile")).toEqual({
      property: "pile",
      of: "Card",
      datatype: "Pile",
      exclusive: true,
      defined: "/Pile.spell:26-52"
    })
    expect(declarations.statements.find(({ type }) => type === "Pile")).toEqual({
      type: "Pile",
      superType: "List",
      itemType: "Card",
      defined: "/Pile.spell:0-25"
    })
  })

  test("loads it again:  `the pile of a card` is a `Pile`, read-only, declared on its own line", () => {
    const imports = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [{ from, declarations }])
    const member = imports.types.get("Card", "LOCAL_ONLY")?.variables.get("pile", "LOCAL_ONLY")
    expect(member).toMatchObject({ name: "pile", datatype: "Pile", exclusive: true })
    expect(member?.declaredAt).toMatchObject({ path: `${from}/Pile.spell`, start: 26, end: 52 })
    const contents = ["set card to a new card", "print the pile of the card", "set the pile of the card to 1"]
    const { files } = parseSpellProject([{ path: "/A.spell", contents: contents.join("\n") }], {
      parentScope: imports
    })
    expect([files[0]!.compiled, ...files[0]!.errors].join("\n")).toMatchInlineSnapshot(`
      "export const card = new Card()
      core.console.log(card.pile)
      /* PARSE ERROR: Can't set the pile of a Card:  it's the Pile holding it -- move it to a Pile instead */
      3:0 Can't set the pile of a Card:  it's the Pile holding it -- move it to a Pile instead"
    `)
  })

  test("picking `Card` brings `Pile`, the type its member holds", () => {
    const imports = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [
      { from, declarations, import: ["Card"] }
    ])
    expect(imports.types.get("Pile", "LOCAL_ONLY")).toBeDefined()
    expect(imports.types.get("Tableau", "LOCAL_ONLY")).toBeUndefined()
  })
})

/** A multi-word member keeps its words as written through an import, so an importer's editors show `short rank`. */
describe("SpellDeclarations of a multi-word member", () => {
  const library = [
    { path: "/Card.spell", contents: "a card is a thing\na card has short rank as text\na card has a suit" }
  ]
  const declarations = compiledSpellProject(library).declarations

  test("says its `asWritten` when it isn't its name -- not for a one-word member", () => {
    expect(declarations.statements.find(({ property }) => property === "short_rank")?.asWritten).toBe("short rank")
    expect(declarations.statements.find(({ property }) => property === "suit")?.asWritten).toBeUndefined()
  })

  test("loads them again", () => {
    const imports = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [
      { from: "@spell/library/c", declarations }
    ])
    const member = imports.types.get("Card", "LOCAL_ONLY")?.variables.get("short_rank", "LOCAL_ONLY")
    expect(member?.asWritten).toBe("short rank")
  })
})

/**
 * A DERIVED property (a getter works it out) is declared as a stored one is (epic `output-targets`, Q56).
 * - Every member is named the same way, `card.shortRank`, `card.isSetUp`, so an importer needn't know which it is.
 */
describe("SpellDeclarations of a derived property", () => {
  const library = [
    {
      path: "/Card.spell",
      contents: [
        "a card is a thing",
        "a card has a rank as number",
        "a card has a suit as text",
        "the short rank of a card is: its rank",
        'the color of a card is "red" if its suit is "hearts" otherwise "black"'
      ].join("\n")
    }
  ]
  const declarations = compiledSpellProject(library).declarations
  const property = (name: string) => declarations.statements.find((it) => it.property === name)

  test("says nothing a stored property's declaration doesn't", () => {
    expect(property("short_rank")).toBeDefined()
    expect(property("short_rank")).not.toHaveProperty("getter")
    expect(property("color")).not.toHaveProperty("getter")
  })
})

/**
 * A value kind, `- "suits" as one of clubs ...`, and its property, `the "color" of a suit is:`, in another project
 * (epic `spanish` P11):  the importer's `the color of its suit` calls `Suit.color()`, as the card's own does.
 */
describe("SpellDeclarations of a value kind", () => {
  const library = [
    {
      path: "/Card.spell",
      contents: [
        'a "card" is a thing where:',
        '\t- "suits" as one of clubs, diamonds, hearts or spades',
        '\t- the "color" of a suit is:',
        "\t\tred if it is diamonds or hearts",
        "\t\tblack otherwise",
        '\t- its "suit" is a suit'
      ].join("\n")
    }
  ]
  const declarations = compiledSpellProject(library).declarations

  test("its property says how it's read, `Suit.color({it})`", () => {
    const color = declarations.statements.find((it) => it.property === "color" && it.of === "Suit")
    expect(color?.readAs).toBe("Suit.color({it})")
  })

  test("loads them again:  the kind keeps its values and list, its property its reading", () => {
    const imports = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [
      { from: "@spell/library/c", declarations }
    ])
    const suit = imports.types.get("Suit", "LOCAL_ONLY")
    expect(suit?.valueKind).toEqual({
      values: ["clubs", "diamonds", "hearts", "spades"],
      listOn: "Card",
      listName: "Suits"
    })
    expect(suit?.variables.get("color", "LOCAL_ONLY")?.readAs).toBe("Suit.color({it})")
  })
})

/**
 * The kind of a property's values (epic `spanish` P22):  a card's `its "suit" is one of ...` makes `card suit`.
 * - It has no class, so a project neither exports it nor writes it:  an importer makes it again from the property's.
 */
describe("SpellDeclarations of a property's list of values", () => {
  const library = [
    {
      path: "/Card.spell",
      contents: ['a "card" is a thing where:', '\t- its "suit" is one of clubs, diamonds, hearts or spades'].join("\n")
    },
    {
      path: "/Foundation.spell",
      contents: ['a "foundation" is a thing where:', '\t- its "suit" is a card suit'].join("\n")
    }
  ]
  const declarations = compiledSpellProject(library).declarations
  const from = "@spell/library/cards"

  test("says nothing of its kind:  no class to export", () => {
    expect(declarations.provides).toEqual(["Card", "Foundation"])
    expect(declarations.statements.filter((it) => it.type).map((it) => it.type)).toEqual(["Card", "Foundation"])
    expect(declarations.statements.find((it) => it.of === "Foundation" && it.property === "suit")?.datatype).toBe(
      "CardSuit"
    )
  })

  test("loads it again, from the property:  an importer's `a card suit` is one of the card's suits", () => {
    const imports = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [{ from, declarations }])
    expect(imports.types.get("CardSuit", "LOCAL_ONLY")?.valueKind).toEqual({
      values: ["clubs", "diamonds", "hearts", "spades"],
      listOn: "Card",
      listName: "Suits",
      property: "suit"
    })
    const contents = ['a "pile" is a thing where:', '\t- its "suit" is a card suit', "print card suits"]
    const { files } = parseSpellProject([{ path: "/A.spell", contents: contents.join("\n") }], {
      parentScope: imports
    })
    expect(files[0]!.errors).toEqual([])
    expect(files[0]!.compiled).toContain('this.declareProp("suit", { oneOf: () => Card.Suits })')
    expect(files[0]!.compiled).toContain("core.console.log(Card.Suits)")
  })

  test("picking a type with a property of a kind brings the type listing it", () => {
    const imports = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [
      { from, declarations, import: ["Foundation"] }
    ])
    expect(imports.types.get("Card", "LOCAL_ONLY")).toBeDefined()
    expect(imports.types.get("CardSuit", "LOCAL_ONLY")).toBeDefined()
  })

  test("named in the language its declaration is written in:  `palo de carta`", () => {
    const { declarations: cartas } = compiledSpellProject([
      {
        path: "/Carta.es.spell",
        contents: ['una "carta" es una cosa donde:', '\t- su "palo" es uno de tréboles, diamantes'].join("\n")
      }
    ])
    const imports = SP.SpellDeclarations.importScope(SP.spanish.rootScope, [
      { from: "@spell/library/cartas", declarations: cartas }
    ])
    expect(imports.types.get("PaloDeCarta", "LOCAL_ONLY")?.valueKind?.listName).toBe("Palos")
  })
})

/** A type's short name, `a bank account aka account` (epic `drawable-thing`, P1), in another project. */
describe("SpellDeclarations, a type's short name", () => {
  test("goes into its declarations, and finds the type in a project that imports it", () => {
    const { declarations } = compiledSpellProject([
      { path: "/Bank.spell", contents: "a bank account aka account is a thing" }
    ])
    expect(declarations.statements.find((it) => it.type === "BankAccount")?.aka).toBe("Account")
    const imports = SP.SpellDeclarations.importScope(SP.SpellParser.rootScope, [
      { from: "@spell/library/bank", declarations }
    ])
    expect(imports.types.get("accounts")?.name).toBe("BankAccount")
  })
})

/** A type's gender, `una carta es una cosa` (epic `spanish` P8), in another project. */
describe("SpellDeclarations, a type's gender", () => {
  test("goes into its declarations, and its type has it in a project that imports it", () => {
    const { declarations } = compiledSpellProject(
      [{ path: "/Cartas.spell", contents: "una carta es una cosa\nun mazo es una lista de cartas" }],
      { parentScope: SP.spanish.rootScope }
    )
    const genders = declarations.statements.filter((it) => it.type).map(({ type, gender }) => [type, gender])
    expect(genders).toEqual([
      ["Carta", "feminine"],
      ["Mazo", "masculine"]
    ])
    const imports = SP.SpellDeclarations.importScope(SP.spanish.rootScope, [
      { from: "@spell/library/cartas", declarations }
    ])
    expect(imports.types.get("Carta")?.gender).toBe("feminine")
  })

  test("an English type has none:  its declaration says nothing of one", () => {
    const { declarations } = compiledSpellProject([{ path: "/Card.spell", contents: "a card is a thing" }])
    expect(declarations.statements.find((it) => it.type === "Card")).not.toHaveProperty("gender")
  })
})
