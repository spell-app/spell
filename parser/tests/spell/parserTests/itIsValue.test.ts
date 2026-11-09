import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { describeWarnings, parseSpellProject } from "spell/parser/spell/test"

const CARD =
  'a card has a "rank" as one of ace, 2 ... 10, jack, queen or king\n' +
  'a card has a "suit" as one of clubs, diamonds, hearts or spades\n'
const CARTA = 'una carta tiene un "palo" como uno de oros, copas, espadas o bastos\n'

/** `text` compiled alone:  its code, its errors and its warnings. */
function compiled(text: string, path = "/Test.spell") {
  const project = parseSpellProject([{ path, contents: text }])
  const [file] = project.files
  return { code: file!.compiled, errors: file!.errors, warnings: describeWarnings(file!.match) }
}

/**
 * Bare values, `it is <value>`, and the check on quoted values (epic `language` P39).
 */
describe("a value a property lists", () => {
  describe("a page's lock", () => {
    test.each([
      ["inicio es una página donde:\n\t- su candado es bloqueado\n", "/Inicio.es.spell"],
      ['inicio es una página donde:\n\t- su candado es "bloqueado"\n', "/Inicio.es.spell"],
      ["inicio es una página donde:\n\t- está bloqueada\n", "/Inicio.es.spell"],
      ["inicio es una página donde:\n\t- es bloqueado\n", "/Inicio.es.spell"],
      ["home is a page where:\n\t- its lock is locked\n", "/Home.spell"],
      ['home is a page where:\n\t- its lock is "locked"\n', "/Home.spell"],
      ["home is a page where:\n\t- it is locked\n", "/Home.spell"]
    ])("%s", (text, path) => {
      const { code, errors } = compiled(text, path)
      expect(errors).toEqual([])
      expect(code).toMatch(/get lock\(\) \{\s*return "locked"/)
      expect(code).not.toContain("const it")
    })

    test("set and compare, bare", () => {
      const { code, errors } = compiled(
        "home is a page where:\n\t- to shut it:\n\t\tset its lock to locked\n\t- to check it:\n\t\tif its lock is locked:\n\t\t\treturn 1\n"
      )
      expect(errors).toEqual([])
      expect(code).toContain('this.lock = "locked"')
      expect(code).toContain('this.lock === "locked"')
    })

    test("a project's own variable named locked is still that variable", () => {
      const { code, errors } = compiled("locked is 3\nexpect locked to be 3\n")
      expect(errors).toEqual([])
      expect(code).toContain("const locked = 3")
    })
  })

  describe("it is <value>, in a type's body", () => {
    test("a two sided view's direction", () => {
      const { code, errors } = compiled("a tile is a two sided view where:\n\t- it is down\n")
      expect(errors).toEqual([])
      expect(code).toMatch(/get direction\(\) \{\s*return "down"/)
      expect(code).not.toContain("const it")
    })

    test.each(["a queen", "queen"])("a project's own list:  it is %s", (said) => {
      const { code, errors } = compiled(`${CARD}a court card is a card where:\n\t- it is ${said}\n`)
      expect(errors).toEqual([])
      expect(code).toMatch(/get rank\(\) \{\s*return "queen"/)
    })

    test("a singular names the listed value", () => {
      const { code, errors } = compiled(`${CARD}a black card is a card where:\n\t- it is a club\n`)
      expect(errors).toEqual([])
      expect(code).toMatch(/get suit\(\) \{\s*return "clubs"/)
    })

    test("in Spanish, with an article", () => {
      const { code, errors } = compiled(
        `${CARTA}una carta alta es una carta donde:\n\t- es un oro\n`,
        "/Carta.es.spell"
      )
      expect(errors).toEqual([])
      expect(code).toMatch(/get palo\(\) \{\s*return "oros"/)
    })

    test("a word on no list is an error naming the values", () => {
      const { errors, code } = compiled(`${CARD.split("\n")[1]}\na court card is a card where:\n\t- it is banana\n`)
      expect(errors.join()).toContain("clubs, diamonds, hearts, spades")
      expect(code).not.toContain("const it")
    })

    test("a word two properties list says to name one", () => {
      const { errors } = compiled(
        'a tile has a "shade" as one of red or blue\na tile has a "trim" as one of red or gold\na big tile is a tile where:\n\t- it is red\n'
      )
      expect(errors.join()).toContain('say which, "its shade is red"')
    })

    test("a type's own word wins over a value of the same name, setting:  the value", () => {
      const { code, errors } = compiled(`${CARD}a queen is a card\na court card is a card where:\n\t- it is a queen\n`)
      expect(errors).toEqual([])
      expect(code).toMatch(/get rank\(\) \{\s*return "queen"/)
    })

    test("a number isn't a word", () => {
      const { code } = compiled(`${CARD}a low card is a card where:\n\t- it is 2\n`)
      expect(code).not.toMatch(/get rank\(\)/)
    })

    test("a line that says more isn't ours", () => {
      const { errors } = compiled("a recipe is a thing where:\n\t- it is saved in its own file\n")
      expect(errors).toEqual([])
    })

    test("in a method it's a comparison", () => {
      const { code, errors } = compiled(`${CARD}to check a card:\n\tit is clubs\n`)
      expect(errors).toEqual([])
      expect(code).not.toMatch(/get suit\(\) \{\s*return "clubs"/)
    })
  })

  describe("reading", () => {
    test.each([
      ["it is clubs", 'this.suit === "clubs"'],
      ["it is a club", 'this.suit === "clubs"'],
      ["it is a queen", 'this.rank === "queen"'],
      ["it is not a queen", 'this.rank !== "queen"']
    ])("%s", (said, js) => {
      const { code, errors } = compiled(`${CARD}to check a card:\n\tif ${said}:\n\t\treturn 1\n`)
      expect(errors).toEqual([])
      expect(code).toContain(js)
    })

    test("a page's lock", () => {
      const { code, errors } = compiled("home is a page\nto check a page:\n\tif the page is locked:\n\t\treturn 1\n")
      expect(errors).toEqual([])
      expect(code).toContain('.lock === "locked"')
    })

    test("in Spanish:  what it compiles to", () => {
      const { code, errors } = compiled(
        "inicio es una página\npara ver una página:\n\tsi la página está bloqueada:\n\t\tdevolver 1\n",
        "/Inicio.es.spell"
      )
      expect(errors).toEqual([])
      expect(code).toContain('.lock === "locked"')
    })

    test("a known type still wins", () => {
      const { code, errors } = compiled(
        `${CARD}a queen is a card\nto check a card:\n\tif it is a queen:\n\t\treturn 1\n`
      )
      expect(errors).toEqual([])
      expect(code).toContain("instanceof Queen")
    })
  })

  describe("a quoted value that isn't one of them", () => {
    test.each([
      ['home is a page where:\n\t- its lock is "banana"\n', "/Home.spell", "unlocked, locked"],
      ['inicio es una página donde:\n\t- su candado es "plátano"\n', "/Inicio.es.spell", "desbloqueado, bloqueado"],
      ['a tile is a two sided view where:\n\t- its direction is "sideways"\n', "/Tile.spell", "down, up"],
      [`${CARD}a bad card is a card where:\n\t- its suit is "banana"\n`, "/Card.spell", "clubs, diamonds"]
    ])("%s is refused", (text, path, values) => {
      const { errors } = compiled(text, path)
      expect(errors.join()).toContain(values)
    })

    test("set is refused", () => {
      const { errors } = compiled(`${CARD}to spoil a card:\n\tset its suit to "banana"\n`)
      expect(errors.join()).toContain("clubs, diamonds")
    })

    test("a comparison warns", () => {
      const { errors, warnings } = compiled(`${CARD}to check a card:\n\tif its suit is "banana":\n\t\treturn 1\n`)
      expect(errors).toEqual([])
      expect(warnings.join()).toContain("clubs, diamonds")
    })

    test("a new thing warns", () => {
      const { errors, warnings } = compiled(`${CARD}c is a new card whose suit is "banana"\n`)
      expect(errors).toEqual([])
      expect(warnings.join()).toContain("clubs, diamonds")
    })

    test("still fine:  on the list, a Spanish word for it, the value itself, a value from a variable", () => {
      expect(compiled(`${CARD}a bad card is a card where:\n\t- its suit is "clubs"\n`).errors).toEqual([])
      for (const value of ['"bloqueado"', '"locked"']) {
        const text = `inicio es una página donde:\n\t- su candado es ${value}\n`
        expect(compiled(text, "/Inicio.es.spell").errors).toEqual([])
      }
      const fromVariable = "x is 3\nhome is a page where:\n\t- its lock is x\n"
      expect(compiled(fromVariable).errors).toEqual([])
    })

    test("an imported project's own list is checked", () => {
      const project = parseSpellProject([
        { path: "/A.spell", contents: CARD },
        { path: "/B.spell", contents: 'a bad card is a card where:\n\t- its suit is "banana"\n' }
      ])
      expect(project.files[1]!.errors.join()).toContain("clubs, diamonds")
    })
  })

  describe("a drawing's tag", () => {
    const VIEW = 'a card is a view where:\n\t- its "suit" is one of clubs or spades\n'
    const DRAW = (attribute: string) => `${VIEW}a table is a view where:\n\t- to "draw it": <card ${attribute}/>\n`

    test("a wrong plain value warns, naming the values", () => {
      const { warnings } = compiled(DRAW('suit="banana"'))
      expect(warnings.join()).toContain("clubs, spades")
    })

    test.each(['suit="clubs"', "suit={x}", 'suit="[rank]"'])("%s doesn't", (attribute) => {
      const { warnings } = compiled(DRAW(attribute))
      expect(warnings.join()).not.toContain("clubs, spades")
    })
  })
})

describe("the `it is <value>` line is filed under its first words", () => {
  test.each([
    ["/It.spell", ["it"]],
    ["/Es.es.spell", ["es", "está"]]
  ])("%s", (path, words) => {
    const { parser } = SP.Language.rootScopeFor([SP.Language.forFile(path)])!
    const rule = parser!.rules.it_is_value as P.Sequence
    expect(rule.firstWords).toEqual(words)
  })
})
