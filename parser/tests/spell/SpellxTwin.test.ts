import { readFileSync } from "fs"
import { beforeAll, describe, test, expect } from "vite-plus/test"

import {
  incrementalSpellProject,
  parseSpellProject,
  registerTestComponentPack,
  summarize,
  summarizeIncremental,
  type SpellSourceFile
} from "spell/parser/spell/test"
import { SX } from "spell/parser/spellx"

/**
 * SPELLX read by spell's own rules, as a third style of spell (epic `elemental-spell` P6, Q69 A):
 * each tag line reads as its code-spell twin (`SP.SpellxTwin`), so a `.spellx` file compiles to EXACTLY what its
 * twin `.spell` file does.
 * - The pairs are in `spellx/`:  each `X.spellx` beside the `X.spell` it means.
 *   - `Card`:  o1's playing card, its drawings naming components bare (`<text>`, P7), and no `pass event` (P9).
 *   - `FlipTile`:  an event, an action's details, a drawing's if-chain placing slots.
 *   - `Deck`:  a template with nothing inside, a list template, bodies on a tag's own line.
 *   - `Scores`:  a page template, an app, a test.
 *   - `DoubleSidedView`:  o1's two sided view, renamed:  two sided view is spell's own template now (J35).
 *   - `Solitaire`:  o1's app, page template and page, its game menu (P10) as its menu bar, a toolbar and a right
 *     click's menu;  without what later phases build (the original target, P9;  `<for each>` in a drawing, C28).
 * - A spellx drawing names components bare, `<text>`;  its twin, `<ui-text>`:  the tests' pack says which
 *   (`registerTestComponentPack()`;  spell-app registers Spell UI's).
 *   - `Carta.es`, `Ficha.es`:  Spanish, the card and a tile with an app.
 */
describe("spellx:  a third style of spell", () => {
  beforeAll(registerTestComponentPack)

  test.each(["Card", "FlipTile", "Deck", "Scores", "Carta.es", "Ficha.es", "DoubleSidedView", "Solitaire"])(
    "%s.spellx compiles as its .spell twin does",
    (name) => {
      const spellx = compiled(`${name}.spellx`)
      const spell = compiled(`${name}.spell`)
      expect(spellx.errors).toEqual([])
      expect(spell.errors).toEqual([])
      expect(spellx.code).toBe(spell.code)
    }
  )

  // epic `elemental-spell` C27
  test("an app or a page made from a template of several words reads as its twin does", () => {
    const spellx = compiledText([
      '<spell-app-template "card game" />',
      '<spell-app "klondike" template="card game">',
      '\t<property "moves">0</>',
      "</spell-app>"
    ])
    const spell = compiledText(['a "card game" is an app', "klondike is a card game where:", '\t- its "moves" is 0'], {
      path: "/test.spell"
    })
    expect(spellx.errors).toEqual([])
    expect(spellx.code).toBe(spell.code)
    expect(spellx.code).toContain("export const klondike = new Klondike()")
  })

  test("a description becomes the docstring, as the comments above its twin are", () => {
    const { code } = compiledText(
      ['<spell-thing "card">', '\t<property "suit" one-of="clubs, hearts" description="Its suit" />', "</spell-thing>"],
      { keepDocs: true }
    )
    expect(code).toContain("/** Its suit */")
  })

  test("a spellx file and a code-spell file in one project each use what the other declares further down", () => {
    const files: SpellSourceFile[] = [
      { path: "/Game.spell", contents: ["set the card to a new card", "turn the card over"].join("\n") },
      {
        path: "/Card.spellx",
        contents: [
          '<spell-view "card">',
          '\t<property "side" one-of="up, down" />',
          '\t<action "turn it over">set its side to down</>',
          "</spell-view>"
        ].join("\n")
      }
    ]
    const [game, card] = parseSpellProject(files).files
    expect(game!.errors).toEqual([])
    expect(card!.errors).toEqual([])
    expect(game!.compiled).toContain("card.turnOver()")
  })

  test("an edit in a spellx file re-parses as a fresh parse would", () => {
    const text = (body: string) =>
      [
        '<spell-view "card">',
        '\t<property "side" one-of="up, down" />',
        '\t<action "turn it over">',
        `\t\t${body}`,
        "\t</action>",
        "</spell-view>"
      ].join("\n")
    const files: SpellSourceFile[] = [{ path: "/Card.spellx", contents: text("set its side to down") }]
    const project = incrementalSpellProject(files)
    for (const body of ["set its side to up", "print 1", "set its side to down"]) {
      const contents = text(body)
      project.update("/Card.spellx", contents)
      expect(summarizeIncremental(project), body).toEqual(
        summarize(parseSpellProject([{ path: "/Card.spellx", contents }]))
      )
    }
  })

  // epic `elemental-spell` P7
  describe("a drawing names its components bare", () => {
    test("a pack's component:  <button> is <ui-button>, and </> closes it", () => {
      const { code, errors } = compiledText([
        '<spell-view "card">',
        "\t<draw>",
        "\t\t<button>Go</>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors).toEqual([])
      expect(code).toContain('h("ui-button", "Go")')
    })

    test("in Spanish, with or without its accent:  <botón> is <es-boton>", () => {
      const spanish = ['<encanto-vista "carta">', "\t<dibujar>", "\t\t<botón>Ir</>", "\t</dibujar>", "</encanto-vista>"]
      const { code, errors } = compiledText(spanish, { path: "/test.es.spellx" })
      expect(errors).toEqual([])
      expect(code).toContain('h("es-boton", "Ir")')
    })

    test("one of the project's own views first:  <card> is the card's own element", () => {
      const lines = [
        '<spell-view "card" />',
        '<spell-view "table">',
        "\t<draw>",
        "\t\t<card />",
        "\t</draw>",
        "</spell-view>"
      ]
      const { code, errors } = compiledText(lines)
      expect(errors).toEqual([])
      expect(code).toMatch(/h\("[a-z-]+-card"\)/)
    })

    test("a name no pack has is an error naming the packs searched;  no native HTML (<div>)", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        "\t<draw>",
        "\t\t<div>Go</div>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors).toEqual([
        "3:2 <div> isn't a component any pack here has (searched:  spell-ui):  check its name, or add its pack to the project's packs"
      ])
    })

    test("a closer for another element is an error on its line", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        "\t<draw>",
        "\t\t<text>hi</image>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors).toEqual(['3:10 Don\'t understand "</image>"'])
    })

    // Owen, 2026-10-25:  "Inside an element:  hidden" -- it was an error (C29) until then
    test("an <if> inside an element keeps every branch, each hidden until it's the one", () => {
      const { code, errors } = compiledText([
        '<spell-view "card">',
        "\t<draw>",
        "\t\t<segment>",
        "\t\t\t<if it is a card>",
        "\t\t\t\t<text>a</>",
        "\t\t\t<otherwise>",
        "\t\t\t\tb",
        "\t\t\t</>",
        "\t\t</segment>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors).toEqual([])
      expect(code).toContain('h("ui-text", { hidden: () => this instanceof Card ? undefined : true }, "a")')
      expect(code).toContain('h("span", { hidden: () => !(this instanceof Card) ? undefined : "until-found" }, "b")')
    })

    test("in Spanish:  <si ...>, <si no>", () => {
      const { code, errors } = compiledText(
        [
          '<encanto-vista "carta">',
          '\t<propiedad "arriba">sí o no</>',
          "\t<dibujar>",
          "\t\t<texto>",
          "\t\t\t<si su arriba es sí>arriba<si no>abajo</>",
          "\t\t</texto>",
          "\t</dibujar>",
          "</encanto-vista>"
        ],
        { path: "/Carta.es.spellx" }
      )
      expect(errors).toEqual([])
      expect(code).toContain('h("span", { hidden: () => this.arriba ? undefined : "until-found" }, "arriba")')
      expect(code).toContain('h("span", { hidden: () => !(this.arriba) ? undefined : "until-found" }, "abajo")')
    })

    test("an <otherwise> with no <if> before it, and a branch in no element, say so", () => {
      const lonely = compiledText([
        '<spell-view "card">',
        "\t<draw>",
        "\t\t<segment><otherwise>b</></segment>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(lonely.errors).toEqual(['3:11 <otherwise> needs an "if" before it'])
      const alone = compiledText(['a "card" is a view where:', "\t- to draw it:", "\t\t<if it is a card>a</>"], {
        path: "/test.spell"
      })
      expect(alone.errors).toEqual([
        '3:2 <if ...> picks what an element shows, so it goes inside one:  to pick the whole drawing, write "if ..." on a line of its own'
      ])
    })

    test("code spell keeps its tags as written:  <div> is the web's", () => {
      const { code, errors } = compiledText(['a "card" is a view where:', "\t- to draw it:", "\t\t<div>Go</div>"], {
        path: "/test.spell"
      })
      expect(errors).toEqual([])
      expect(code).toContain('h("div", "Go")')
    })
  })

  // epic `elemental-spell` P27
  describe("a view's slots, filled where it's drawn:  slot=", () => {
    const card = (front: string) => [
      '<spell-view "card">',
      '\t<draw "front">',
      `\t\t${front}`,
      "\t</draw>",
      "\t<draw>",
      '\t\t<draw "front" />',
      "\t</draw>",
      "</spell-view>"
    ]
    const table = (cardTag: string) => [
      '<spell-view "table">',
      "\t<draw>",
      `\t\t<${cardTag}><text slot="front">Ace</text></${cardTag}>`,
      "\t</draw>",
      "</spell-view>"
    ]

    test("a placed slot is the web's own, holding its drawing;  what's put in it with slot= takes its place", () => {
      const { code, errors } = compiledText([...card("<text>Card</text>"), ...table("card")])
      expect(errors).toEqual([])
      // the card's own drawing, inside its slot:  shown unless the page fills it
      expect(code).toContain('h("slot", { name: "front" }, () => this.drawFront())')
      expect(code).toContain('h("ui-text", { part: "front" }, "Card")')
      // the table fills that card's front
      expect(code).toMatch(/h\("[a-z-]+-card", h\("ui-text", \{ slot: "front" \}, "Ace"\)\)/)
    })

    test("a card left unfilled is drawn with no children:  its slot shows its own drawing", () => {
      const { code } = compiledText([
        ...card("<text>Card</text>"),
        '<spell-view "table">',
        "\t<draw>",
        "\t\t<card />",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(code).toMatch(/h\("[a-z-]+-card"\)/)
      expect(code).toContain('h("slot", { name: "front" }, () => this.drawFront())')
    })

    test("a view built on it draws the slot again:  its own drawing fills the slot, which slot= still takes over", () => {
      const { code, errors } = compiledText([
        ...card("<text>Card</text>"),
        '<spell-view "joker" template="card">',
        '\t<draw "front">',
        "\t\t<text>Joker</text>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors).toEqual([])
      expect(code).toMatch(
        /class Joker extends Card \{[^}]*drawFront\(\) \{\s+return h\("ui-text", \{ part: "front" \}, "Joker"\)/
      )
      // the slot itself is the card's, placed in its drawing:  the joker's drawing goes in it
      expect(code.match(/h\("slot", \{ name: "front" \}/g)).toHaveLength(1)
    })

    test("its code-spell twin is the same markup, with spell's own in= (or slot=)", () => {
      const spellx = compiledText([...card("<text>Card</text>"), ...table("card")])
      const tag = /h\("([a-z-]+-card)"/.exec(spellx.code)![1]!
      const spell = compiledText(
        [
          'a "card" is a view where:',
          "\t- to draw its front:",
          "\t\t<ui-text>Card</ui-text>",
          "\t- to draw it:",
          "\t\tdraw its front",
          'a "table" is a view where:',
          "\t- to draw it:",
          `\t\t<${tag}><ui-text in="front">Ace</ui-text></${tag}>`
        ],
        { path: "/test.spell" }
      )
      expect(spellx.errors).toEqual([])
      expect(spell.errors).toEqual([])
      expect(spellx.code).toBe(spell.code)
    })

    test("in Spanish, slot= names the slot in the file's words:  a two sided view's frente is its front", () => {
      const { code, errors } = compiledText(
        [
          '<encanto-vista "carta" plantilla="vista reversible">',
          '\t<dibujar "frente">',
          "\t\t<texto>Carta</texto>",
          "\t</dibujar>",
          "</encanto-vista>",
          '<encanto-vista "mesa">',
          "\t<dibujar>",
          '\t\t<carta><texto slot="frente">As</texto></carta>',
          "\t</dibujar>",
          "</encanto-vista>"
        ],
        { path: "/prueba.es.spellx" }
      )
      expect(errors).toEqual([])
      expect(code).toMatch(/h\("[a-z-]+-carta", h\("es-texto", \{ slot: "front" \}, "As"\)\)/)
    })
  })

  describe("a mistake is an error on its own line", () => {
    test("a word spellx doesn't know, naming the closest", () => {
      const { errors } = compiledText(['<spell-view "card">', '\t<propety "suit" one-of="a, b" />', "</spell-view>"])
      expect(errors).toEqual(['2:1 "<propety>" isn\'t a spellx word:  did you mean "<property>"?'])
    })

    test("a closer for another tag than the one open", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        '\t<action "go">',
        "\t\tprint 1",
        "\t</property>",
        "</spell-view>"
      ])
      expect(errors).toEqual(['4:1 "</property>" can\'t close <action>:  write "</>"'])
    })

    test("an <otherwise> after a </> that closed its <if>", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        '\t<property "side" one-of="up, down" />',
        "\t<draw>",
        "\t\t<if it is up>",
        "\t\t\t<ui-text>up</ui-text>",
        "\t\t</>",
        "\t\t<otherwise>",
        "\t\t\t<ui-text>down</ui-text>",
        "\t\t</>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors[0]).toMatch(/^7:2 <otherwise> goes on with the "if" above it, but a "<\/>" closed that/)
    })

    test("a body's line indented less than the rest of its tag's body", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        '\t<action "go">',
        "\tprint 1",
        "\t</action>",
        "</spell-view>"
      ])
      expect(errors[0]).toBe(
        "3:1 This line is indented less than the rest of <action>:  indent it one step more than <action>"
      )
    })

    test("a tag never closed", () => {
      const { errors } = compiledText(['<spell-view "card">', '\t<action "go">', "\t\tprint 1", "</spell-view>"])
      expect(errors).toEqual(['2:1 <action> is never closed:  end it with "</>"'])
    })

    test("in Spanish:  in Spanish, on its own line", () => {
      const path = "/prueba.es.spellx"
      const unknown = compiledText(
        ['<encanto-vista "carta">', '\t<propiedd "palo" uno-de="a, b" />', "</encanto-vista>"],
        {
          path
        }
      )
      expect(unknown.errors).toEqual(['2:1 "<propiedd>" no es una palabra de spellx:  ¿querías decir "<propiedad>"?'])
      const unclosed = compiledText(
        ['<encanto-vista "carta">', '\t<acción "ir">', "\t\timprimir 1", "</encanto-vista>"],
        {
          path
        }
      )
      expect(unclosed.errors).toEqual(['2:1 <acción> nunca se cierra:  termínalo con "</>"'])
    })

    test("a bare `draggable`, `droppable`, `selectable` is the outline's `- it is draggable` ...", () => {
      const { code, errors } = compiledText(['<spell-view "card" draggable selectable>', "</spell-view>"])
      expect(errors).toEqual([])
      expect(code).toContain("static canBeDragged = true")
      expect(code).toContain("static canBeSelected = true")
      expect(code).not.toContain("canBeDroppedOn")
      const pile = compiledText(['<spell-view "pile" droppable>', "</spell-view>"])
      expect(pile.errors).toEqual([])
      expect(pile.code).toContain("static canBeDroppedOn = true")
      // Spanish
      const es = compiledText(['<encanto-vista "carta" arrastrable>', "</encanto-vista>"], { path: "Carta.es.spellx" })
      expect(es.errors).toEqual([])
      expect(es.code).toContain("static canBeDragged = true")
    })

    test("a menu:  one line naming its actions, the app's menu bar a line ending its body (P10)", () => {
      const { code, errors } = compiledText([
        '<spell-app "game" menu-bar="GameMenu">',
        '\t<action "go">',
        "\t\tprint 1",
        "\t</action>",
        '\t<menu "GameMenu">',
        '\t\t<action "go" />',
        '\t\t<action "-" />',
        '\t\t<action "undo" />',
        "\t</menu>",
        "</spell-app>"
      ])
      expect(errors).toEqual([])
      expect(code).toContain('static menuBar = "GameMenu"')
      expect(code).toContain('core.describeMenu(Game, "GameMenu", { items: ["go", "-", "undo"] })')
      // Spanish:  the app's own undo by its Spanish name
      const es = compiledText(
        [
          '<encanto-aplicación "juego" barra-de-menú="MenúDelJuego">',
          '\t<acción "ir">',
          "\t\timprimir 1",
          "\t</acción>",
          '\t<menú "MenúDelJuego">',
          '\t\t<acción "ir" />',
          '\t\t<acción "deshacer" />',
          "\t</menú>",
          "</encanto-aplicación>"
        ],
        { path: "/prueba.es.spellx" }
      )
      expect(es.errors).toEqual([])
      expect(es.code).toContain('static menuBar = "MenúDelJuego"')
      expect(es.code).toMatch(/core\.describeMenu\(\w+, "MenúDelJuego", \{ items: \["ir", "undo"\] \}\)/)
    })
  })

  // epic `elemental-spell` P12:  what the converter writes, `SX.SpellxWriter`
  describe("a <spell> chunk:  code spell, as written", () => {
    test("its lines read where the chunk is:  a member in a template, a function and its call at the top", () => {
      const spellx = compiledText([
        '<spell-thing "card">',
        '\t<property "suit" one-of="clubs, hearts" />',
        "\t<spell>",
        '\t\t- "values" as one of 1, 2',
        "\t</spell>",
        "</spell-thing>",
        "",
        "<spell>",
        "\tto shout (word as text)",
        "\t\tprint word",
        '\tshout "hi"',
        "</spell>"
      ])
      const spell = compiledText(
        [
          'a "card" is a thing where:',
          '\t- its "suit" is one of clubs, hearts',
          '\t- "values" as one of 1, 2',
          "",
          "to shout (word as text)",
          "\tprint word",
          'shout "hi"'
        ],
        { path: "/test.spell" }
      )
      expect(spellx.errors).toEqual([])
      expect(spellx.code).toBe(spell.code)
    })

    test("a function in a chunk is called from above it, as in code spell", () => {
      const { code, errors } = compiledText([
        '<spell-thing "card">',
        '\t<action "deal it">play the card</>',
        "</spell-thing>",
        "<spell>",
        "\tto play a card",
        "\t\tprint 1",
        "</spell>"
      ])
      expect(errors).toEqual([])
      expect(code).toContain("return this.play()")
    })

    // J83:  a drawing in a chunk names the web's own elements, as code spell does
    test("its drawings are code spell's:  <div> and <button> are the web's, inside a {...} too", () => {
      const drawing = '<div><button>hi</button>{<label>x</label> if 1 is 1 otherwise ""}</div>'
      const spellx = compiledText([
        '<spell-view "box">',
        "\t<spell>",
        "\t\t- to draw it:",
        `\t\t\t${drawing}`,
        "\t</spell>",
        "</spell-view>"
      ])
      const spell = compiledText(['a "box" is a view where:', "\t- to draw it:", `\t\t${drawing}`], {
        path: "/test.spell"
      })
      expect(spellx.errors).toEqual([])
      expect(spellx.code).toBe(spell.code)
      expect(spellx.code).toContain('h("button"')
      expect(spellx.code).toContain('h("label"')
    })

    test("outside a chunk, a drawing's <button> is still a pack's", () => {
      const { code, errors } = compiledText([
        '<spell-view "box">',
        "\t<draw>",
        "\t\t<button>hi</button>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors).toEqual([])
      expect(code).not.toContain('h("button"')
    })
  })

  test("a comment after a line's closer is the member's docstring, as after its twin", () => {
    const { code, errors } = compiledText(
      ['<spell-thing "card">', '\t<property "value">1</>\t// ace = 1', "</spell-thing>"],
      { keepDocs: true }
    )
    expect(errors).toEqual([])
    expect(code).toContain("/** ace = 1 */")
  })

  // Owen, 2026-10-25:  "comments go in attribute names" -- a member's comment is its `description=`, handlers' too
  describe("description= on every member", () => {
    test("a handler's phrase may end in description= and group=:  its docstring and its group, not its phrase", () => {
      const lines = [
        '<spell-view "card">',
        '\t<group "playing"/>',
        '\t<group "looks"/>',
        '\t<on click description="A click turns it over" group="playing">print "turned"</on>',
        '\t<while the mouse is down description="Held:  it says so">',
        '\t\tprint "held"',
        "\t</while>",
        "</spell-view>"
      ]
      const { code, errors } = compiledText(lines, { keepDocs: true })
      expect(errors).toEqual([])
      expect(code).toContain("/** A click turns it over */\n  onClick(event) {")
      // as its twin's comment is, above a `- while ...:` with a block
      expect(code).toContain("// Held:  it says so\n  whileMouseDown() {")
      const [card] = SX.SpellxView.read(lines.join("\n"), { path: "/Card.spellx" }).templates
      const groups = SX.SpellxFile.groupsOf(card!).map(({ name, members }) => [name, members.length])
      expect(groups).toEqual([
        ["playing", 1],
        ["looks", 1]
      ])
    })

    test("in Spanish:  descripción= ends an <al ...>'s phrase", () => {
      const { code, errors } = compiledText(
        [
          '<encanto-vista "carta">',
          '\t<al clic descripción="Un clic la voltea">imprimir "volteada"</>',
          "</encanto-vista>"
        ],
        { path: "/Carta.es.spellx", keepDocs: true }
      )
      expect(errors).toEqual([])
      expect(code).toContain("/** Un clic la voltea */")
    })

    test("a menu's description= is its docstring", () => {
      const { code, errors } = compiledText(
        [
          '<spell-app "game">',
          '\t<action "deal">print "dealt"</>',
          '\t<menu "game menu" description="What the game can do">',
          '\t\t<action "deal" />',
          "\t</menu>",
          "</spell-app>"
        ],
        { keepDocs: true }
      )
      expect(errors).toEqual([])
      expect(code).toContain('// What the game can do\n// - its "game menu" is a menu of "deal"')
    })

    test('an action with details keeps its body on its line:  <action "deal" shortcut="D">deal it</>', () => {
      const { code, errors } = compiledText([
        '<spell-app "game">',
        '\t<action "deal" shortcut="meta+D" description="Deals">print "dealt"</>',
        "</spell-app>"
      ])
      expect(errors).toEqual([])
      expect(code).toContain('deal() {\n    core.console.log("dealt")\n  }')
      expect(code).toContain('core.describeAction(Game, "deal", { title: "deal", shortcuts: ["meta+D"] })')
    })
  })
})

/** Fixture `name`'s compiled code alone, and its errors -- see `compiledText()`. */
function compiled(name: string) {
  return compiledText(readFileSync(new URL(`./spellx/${name}`, import.meta.url), "utf8").split("\n"), {
    path: `/${name}`
  })
}

/**
 * `lines`, one file of its own project, compiled:  the CODE alone, and its parse errors.
 * - without its `SPELL: DECLARES` comments, which say where each declaration is, and its line comments:
 *   the two forms say where and how in their own ways
 * - `keepDocs`:  keep its line comments, to see a docstring
 */
function compiledText(lines: string[], { path = "/test.spellx", keepDocs = false } = {}) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
    .split("\n")
    .filter((line) => line.trim() && (keepDocs || !line.trim().startsWith("//")))
    .join("\n")
  return { code, errors: file!.errors }
}
