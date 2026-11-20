import { describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * `choose`:  the person picks from a list, in a dialog (epic `language` P66).
 * - `it` is a NEW `it`, the thing picked (a list, for several);  `the result` is ok or cancel, as `prompt`'s
 * - a kind's own values need no `from`;  `choose a color` is Spell UI's colors, unless the program has a `color` kind
 */
describe("choose:  picking from a list, in English and Spanish, JavaScript and Python", () => {
  /** `lines`, one file:  its match, its errors. */
  const parsed = (lines: string[], path = "/Game.spell") => {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return file!
  }

  /** `file` written in Python. */
  const python = (file: ReturnType<typeof parsed>) => String(PY.PyWriter.instance.writeMatch(file.match!))

  test("one from a list:  `it` is the thing picked, a new `it`;  the prompt and the rows shown are options", () => {
    const file = parsed([
      "a card has a title",
      "game is an app",
      "\tit has some cards",
      "\tto pick",
      '\t\tchoose a card from the cards with prompt "Which card?", showing 10 at a time',
      "\t\tif the result is ok then print the title of it",
      '\t\tchoose one of ["easy", "medium", "hard"]',
      "\t\tprint it"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(
      'const it = await core.choose(core.everyThing(Card), {\n      thing: "a card",\n      prompt: "Which card?",\n      shown: 10\n    })'
    )
    expect(file.compiled).toContain('if (core.resultIs("ok")) core.console.log(it.title)')
    expect(file.compiled).toContain('const it2 = await core.choose(["easy", "medium", "hard"], { thing: "one" })')
    expect(file.compiled).toContain("core.console.log(it2)")
    const py = python(file)
    expect(py).toContain('{"thing": "a card", "prompt": "Which card?", "shown": 10}')
    expect(py).toContain('it_2 = await core.choose(["easy", "medium", "hard"], {"thing": "one"})')
  })

  test("several:  the plural, many, up to 2, between 2 and 4;  `it` is a list (Q74)", () => {
    const file = parsed([
      "a card has a title",
      "game is an app",
      "\tit has some cards",
      "\tto pick",
      "\t\tchoose cards from the cards",
      "\t\tchoose many cards from the cards",
      "\t\tchoose up to 2 cards from the cards",
      "\t\tchoose between 2 and 4 cards from the cards",
      "\t\tprint the length of it"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('const it = await core.choose(core.everyThing(Card), { things: "cards" })')
    expect(file.compiled).toContain('const it2 = await core.choose(core.everyThing(Card), { things: "cards" })')
    expect(file.compiled).toContain(
      'const it3 = await core.choose(core.everyThing(Card), { things: "cards", most: 2 })'
    )
    expect(file.compiled).toContain("least: 2,")
    expect(file.compiled).toContain("core.console.log(core.itemCountOf(it4))")
    expect(python(file)).toContain('it_3 = await core.choose(core.every_thing(Card), {"things": "cards", "most": 2})')
  })

  test("a kind's own values need no `from`;  `from` picks from a shorter list;  the longest name wins", () => {
    const file = parsed([
      "a card is a thing",
      '\tits "suit" is one of clubs, diamonds, hearts or spades',
      '\tits "color" is one of red, black',
      "game is an app",
      "\tto pick",
      "\t\tchoose a card suit",
      "\t\tset remaining to card suits",
      "\t\tchoose a card suit from remaining",
      "\t\tchoose a card color"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('const it = await core.choose(Card.Suits, { thing: "a card suit" })')
    expect(file.compiled).toContain('const it2 = await core.choose(remaining, { thing: "a card suit" })')
    expect(file.compiled).toContain('const it3 = await core.choose(Card.Colors, { thing: "a card color" })')
    expect(python(file)).toContain('it = await core.choose(Card.SUITS, {"thing": "a card suit"})')
  })

  test("`choose a color`:  Spell UI's colors as chips, unless the program has a `color` type of its own", () => {
    const colors = parsed(["game is an app", "\tto pick", "\t\tchoose a color"])
    expect(colors.errors).toEqual([])
    expect(colors.compiled).toContain('const it = await core.chooseColor({ thing: "a color" })')
    expect(python(colors)).toContain('it = await core.choose_color({"thing": "a color"})')
    const ownColors = parsed(["a color has a name", "game is an app", "\tto pick", "\t\tchoose a color"])
    expect(ownColors.errors).toEqual([
      `4:2 This line doesn't say which colors to choose from.  Name them after "from", like this:  choose a color from the colors`
    ])
  })

  test("a thing type with no values of its own, alone, is refused, saying to name the list", () => {
    const file = parsed(["a card has a title", "game is an app", "\tto pick", "\t\tchoose a card"])
    expect(file.errors).toEqual([
      `4:2 This line doesn't say which cards to choose from.  Name them after "from", like this:  choose a card from the cards`
    ])
  })

  test("en español, una carta sola se rechaza, diciendo de qué cartas elegir", () => {
    const file = parsed(
      ["una carta tiene un título", "juego es una app", "\tpara elegir", "\t\telegir una carta"],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([
      `4:2 Esta línea no dice de qué cartas elegir.  Escríbelo después de "de", así:  elegir una carta de tus cartas`
    ])
  })

  test("in Spanish:  elegir, con el mensaje, mostrando 10 a la vez", () => {
    const file = parsed(
      [
        "una carta es una cosa",
        '\tsu "palo" es uno de tréboles, diamantes, corazones o picas',
        "juego es una app",
        "\ttiene unas cartas",
        "\tpara elegir",
        '\t\telegir una carta de las cartas con el mensaje "¿Qué carta?", mostrando 10 a la vez',
        "\t\telegir un palo de carta",
        "\t\telegir hasta 2 cartas de las cartas",
        "\t\telegir un color"
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(
      'const it = await core.choose(this.cartas, {\n      thing: "una carta",\n      prompt: "¿Qué carta?",\n      shown: 10\n    })'
    )
    expect(file.compiled).toContain('const it2 = await core.choose(Carta.Palos, { thing: "un palo de carta" })')
    expect(file.compiled).toContain('const it3 = await core.choose(this.cartas, { things: "cartas", most: 2 })')
    expect(file.compiled).toContain('const it4 = await core.chooseColor({ thing: "un color" })')
  })
})
