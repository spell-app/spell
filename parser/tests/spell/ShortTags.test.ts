import { beforeAll, describe, test, expect } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * SHORT TAGS (epic `language` P41):  a template's tag is its own word at a file's top level, with no prefix.
 * - `<page>`, `<view>`, `<app>`, `<thing>`, `<site>`, `<notebook>`, `<extend>`;  Spanish's `<página>`, `<vista>` ...
 * - The old spellings, `<spell-page>`, `<encanto-vista>`, `<spell-more-of>`, still read:  the same program.
 * - `<note>` is every note;  the old note words read with a warning naming it.
 * - Inside a drawing nothing changes:  a short word there is markup, Spell UI's or a project's own view.
 */
describe("short tags at a file's top level", () => {
  beforeAll(registerTestComponentPack)

  /** Each template, short and with its old prefix:  English, then Spanish. */
  const PAIRS: Array<{ path: string; short: string; old: string }> = [
    {
      path: "/Card.spell",
      short: '<view "card">\n\t<property "suit">text</>\n\t<draw><text>{its suit}</text></draw>\n</view>\n',
      old: '<spell-view "card">\n\t<property "suit">text</>\n\t<draw><text>{its suit}</text></draw>\n</spell-view>\n'
    },
    {
      path: "/Deck.spell",
      short: '<thing "deck">\n\t<property "size">52</>\n</thing>\n',
      old: '<spell-thing "deck">\n\t<property "size">52</>\n</spell-thing>\n'
    },
    {
      path: "/Game.spell",
      short: '<app "game">\n\t<property "score">0</>\n\t<draw><text>{its score}</text></draw>\n</app>\n',
      old: '<spell-app "game">\n\t<property "score">0</>\n\t<draw><text>{its score}</text></draw>\n</spell-app>\n'
    },
    {
      path: "/Home.spell",
      short: '<page "home">\n\t<draw><text>Hi</text></draw>\n</page>\n',
      old: '<spell-page "home">\n\t<draw><text>Hi</text></draw>\n</spell-page>\n'
    },
    {
      path: "/Counter.spell",
      short: '<notebook "counter notebook">\n\t# A counter\n\tIt counts.\n</notebook>\n',
      old: '<spell-notebook "counter notebook">\n\t# A counter\n\tIt counts.\n</spell-notebook>\n'
    },
    {
      path: "/Base.spell",
      short: '<page-template "base">\n\t<draw><text>Base</text></draw>\n</page-template>\n',
      old: '<spell-page-template "base">\n\t<draw><text>Base</text></draw>\n</spell-page-template>\n'
    },
    {
      path: "/Carta.es.spell",
      short: '<vista "carta">\n\t<propiedad "palo">texto</>\n\t<dibujar><texto>{su palo}</texto></dibujar>\n</vista>\n',
      old: '<encanto-vista "carta">\n\t<propiedad "palo">texto</>\n\t<dibujar><texto>{su palo}</texto></dibujar>\n</encanto-vista>\n'
    },
    {
      path: "/Mazo.es.spell",
      short: '<cosa "mazo">\n\t<propiedad "tamaño">52</>\n</cosa>\n',
      old: '<encanto-cosa "mazo">\n\t<propiedad "tamaño">52</>\n</encanto-cosa>\n'
    },
    {
      path: "/Inicio.es.spell",
      short: '<página "inicio">\n\t<dibujar><texto>Hola</texto></dibujar>\n</página>\n',
      old: '<encanto-página "inicio">\n\t<dibujar><texto>Hola</texto></dibujar>\n</encanto-página>\n'
    }
  ]

  test.each(PAIRS)("$path:  short, it compiles to the same program as its old spelling", ({ path, short, old }) => {
    const written = compiled(short, path)
    expect(written.errors).toEqual([])
    expect(written.code).toEqual(compiled(old, path).code)
  })

  test("a short closer closes an old opener, and the other way round", () => {
    expect(compiled('<spell-thing "deck">\n\t<property "size">52</>\n</thing>\n', "/Deck.spell").errors).toEqual([])
    expect(compiled('<thing "deck">\n\t<property "size">52</>\n</spell-thing>\n', "/Deck.spell").errors).toEqual([])
  })

  test("a site, `<site>`, and its pages, `<page>`, its parts in it", () => {
    const site = (word: string) =>
      `<${word} "galaxy guide">\n\t<page "home"/>\n</${word}>\n<page "home">\n\t<draw><text>Hi</text></draw>\n</page>\n`
    const short = compiled(site("site"), "/Guide.spell")
    expect(short.errors).toEqual([])
    expect(short.code).toEqual(compiled(site("spell-site"), "/Guide.spell").code)
  })

  test("`<extend>` adds to a type another file declares;  `<spell-more-of>` still does", () => {
    const files = (word: string) => [
      { path: "/Card.spell", contents: '<thing "card">\n\t<property "suit">text</>\n</thing>\n' },
      { path: "/Card.more.spell", contents: `<${word} "card">\n\t<property "rank">1</>\n</${word}>\n` }
    ]
    const extended = parseSpellProject(files("extend")).files
    expect(extended.flatMap((file) => file.errors)).toEqual([])
    expect(extended[1]!.compiled).toContain('Object.defineProperty(Card.prototype, "rank"')
    const old = parseSpellProject(files("spell-more-of")).files
    expect(old.flatMap((file) => file.errors)).toEqual([])
    expect(withoutPlaces(old[1]!.compiled)).toEqual(withoutPlaces(extended[1]!.compiled))
  })

  test("in Spanish:  `<extender>`, and the old `<encanto-más-de>`", () => {
    const parentScope = SP.Language.rootScopeFor([SP.Language.forFile("/Carta.es.spell")])
    const files = (word: string) => [
      { path: "/Carta.es.spell", contents: '<cosa "carta">\n\t<propiedad "palo">texto</>\n</cosa>\n' },
      { path: "/Carta.mas.es.spell", contents: `<${word} "carta">\n\t<propiedad "rango">1</>\n</${word}>\n` }
    ]
    const extended = parseSpellProject(files("extender"), { parentScope }).files
    expect(extended.flatMap((file) => file.errors)).toEqual([])
    expect(extended[1]!.compiled).toContain('Object.defineProperty(Carta.prototype, "rango"')
    const old = parseSpellProject(files("encanto-más-de"), { parentScope }).files
    expect(withoutPlaces(old[1]!.compiled)).toEqual(withoutPlaces(extended[1]!.compiled))
  })

  test("a type named twice is still an error:  `<extend>` is how to add to it", () => {
    const [, second] = parseSpellProject([
      { path: "/Card.spell", contents: '<thing "card">\n\t<property "suit">text</>\n</thing>\n' },
      { path: "/Again.spell", contents: '<thing "card">\n\t<property "rank">1</>\n</thing>\n' }
    ]).files
    expect(second!.errors.join("\n")).toContain("There's a card already")
  })

  test("an action a later `<extend>` adds is callable above it (the read-ahead scan reads short tags too)", () => {
    const contents = [
      '<thing "square">',
      '\t<property "mark">text</>',
      "</thing>",
      '<thing "board" template="list of squares">',
      '\t<action "play all">',
      "\t\tfor square in it",
      "\t\t\tplay the square",
      "\t</action>",
      "</thing>",
      '<extend "square">',
      '\t<action "play it">',
      '\t\tset its mark to "x"',
      "\t</action>",
      "</extend>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Board.spell", contents }]).files
    expect(file!.errors).toEqual([])
  })
})

describe("inside a drawing, a short word is markup, as before", () => {
  beforeAll(registerTestComponentPack)

  /** A drawing holding `markup`, in an app written with short tags, and with the old ones. */
  const drawing = (markup: string) => (word: (short: string) => string) =>
    [`<${word("app")} "board">`, "\t<draw>", `\t\t${markup}`, "\t</draw>", `</${word("app")}>`].join("\n")

  test.each(["<thing/>", "<page>Hi</page>", "<note/>", "<description>hi</description>", "<comment>hi</comment>"])(
    "%s:  drawn as markup, as it was with the old tags",
    (markup) => {
      const short = compiled(
        drawing(markup)((word) => word),
        "/Board.spell"
      )
      const old = compiled(
        drawing(markup)((word) => `spell-${word}`),
        "/Board.spell"
      )
      expect(short).toEqual(old)
      expect(short.code).not.toContain("SPELL: DECLARES")
      expect(short.code).toMatch(/return h\(/)
    }
  )
})

/** `code` without where each thing is declared:  two files' offsets differ by their tags' lengths. */
function withoutPlaces(code: string) {
  return code.replace(/defined: "[^"]*"/g, "").replace(/declaredAt: \{[^}]*\}/g, "")
}

/** `text`, one file at `path` of its own project, compiled:  its code without markers or comments, and its errors. */
function compiled(text: string, path: string) {
  const parentScope = SP.Language.rootScopeFor([SP.Language.forFile(path)])
  const [file] = parseSpellProject([{ path, contents: text }], { parentScope }).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .replace(/declaredAt: \{[^}]*\}/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors }
}
