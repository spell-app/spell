import { describe, expect, test } from "vite-plus/test"

import { type P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { parseSpellProject } from "spell-lang/spell/test"

/**
 * LEDGER of names of several words holding one of spell's grammar words (epic `spanish` P14):
 * `card in play`, `side of play`, `way to go`, `carta de juego`, `fecha de nacimiento`.
 * - A grammar word:
 *   - one on the language's identifier blacklist:  `in`, `of`, `the`, `to` ...;  `de`, `en`, `la` ...
 *   - or, for a member, one of its stop words (`SP.LanguageWords`)
 * - One inline snapshot per probe:  what each line compiles to, then its parse errors.
 *   - What works, and what doesn't yet, both pinned:  a change to either shows here.
 *   - The epic page's P14 has the table, with why each one left is left.
 * - Each probe is ONE file, parsed as a project compile parses it (`parseSpellProject()`), in its language.
 *   `SPELL:` declaration comments are left out:  they repeat the declaring line.
 */
describe("names with grammar words", () => {
  ////////////////
  // ## Types
  ////////////////

  describe("types", () => {
    test("declared up to `is`, then mentioned whole", () => {
      expect(
        english("a card in play is a thing", "a card in play has a rank as a number", "the c is a new card in play")
      ).toMatchInlineSnapshot(`
        "export class CardInPlay extends Thing {
          // a card in play has a rank as a number
          static { this.declareProp("rank", { type: "number" }) }
          get rank() { return this.getProp("rank") }
          set rank(value) { this.setProp("rank", value) }
        }
        export const c = new CardInPlay()"
      `)
    })

    test("several grammar words, and a short name", () => {
      expect(english("a box of the year aka box is a thing", "the b is a new box of the year", "the d is a new box"))
        .toMatchInlineSnapshot(`
        "export class BoxOfTheYear extends Thing {}
        export const b = new BoxOfTheYear()
        export const d = new BoxOfTheYear()"
      `)
    })

    test("in quotes", () => {
      expect(english('a "card in play" is a thing', "the c is a new card in play")).toMatchInlineSnapshot(`
        "export class CardInPlay extends Thing {}
        export const c = new CardInPlay()"
      `)
    })

    test("plural by its first word:  a list of `cards in play`", () => {
      expect(english("a card in play is a thing", "a hand is a list of cards in play")).toMatchInlineSnapshot(`
        "export class CardInPlay extends Thing {}
        export class Hand extends List {
          static instanceType = CardInPlay
        }"
      `)
    })

    test("only the name declared whole:  `card in the deck` is still a card, then `in`", () => {
      expect(
        english(
          "a card is a thing",
          "a card in play is a thing",
          "a deck is a list of cards",
          "the deck is a new deck",
          "the c is a new card",
          "if c is in the deck: print 1"
        )
      ).toMatchInlineSnapshot(`
        "export class Card extends Thing {}
        export class CardInPlay extends Thing {}
        export class Deck extends List {
          static instanceType = Card
        }
        export const deck = new Deck()
        export const c = new Card()
        if (deck.includes(c)) core.console.log(1)"
      `)
    })

    test("declared in a later file, quoted or not:  found by the declaration scan", () => {
      expect(
        [
          probe(SP.SpellParser.rootScope, [
            "the c is a new card in play\nthe d is a new box of the year",
            'a card in play is a thing\na "box of the year" is a thing'
          ]),
          probe(SP.spanish.rootScope, ["la c es una nueva carta de juego", 'una "carta de juego" es una cosa'])
        ].join("\n")
      ).toMatchInlineSnapshot(`
        "export const c = new CardInPlay()
        export const d = new BoxOfTheYear()
        export const c = new CartaDeJuego()"
      `)
    })

    test("LEFT:  a loop's item named for one, `for each card in play in`", () => {
      expect(
        english(
          "a card in play is a thing",
          "a hand is a list of cards in play",
          "the h is a new hand",
          "for each card in play in h: print 1"
        )
      ).toMatchInlineSnapshot(`
        "export class CardInPlay extends Thing {}
        export class Hand extends List {
          static instanceType = CardInPlay
        }
        export const h = new Hand()
        /* PARSE ERROR: Don't understand "for each card in play in h: print 1" */
        ERROR 4:0 Don't understand "for each card in play in h: print 1""
      `)
    })

    test("Spanish:  declared up to `es`, mentioned whole, and plural by its first word", () => {
      expect(
        spanish(
          "una carta de juego es una cosa",
          "una carta de juego tiene un rango como número",
          "una mano es una lista de cartas de juego",
          "la c es una nueva carta de juego"
        )
      ).toMatchInlineSnapshot(`
        "export class CartaDeJuego extends Thing {
          // una carta de juego tiene un rango como número
          static { this.declareProp("rango", { type: "number" }) }
          get rango() { return this.getProp("rango") }
          set rango(value) { this.setProp("rango", value) }
        }
        export class Mano extends List {
          static instanceType = CartaDeJuego
        }
        export const c = new CartaDeJuego()"
      `)
    })

    test("Spanish:  in quotes, and with a short name", () => {
      expect(
        spanish(
          'una "cuenta de ahorro" es una cosa',
          "una caja del año alias caja es una cosa",
          "la c es una nueva cuenta de ahorro",
          "la d es una nueva caja"
        )
      ).toMatchInlineSnapshot(`
        "export class CuentaDeAhorro extends Thing {}
        export class CajaDelAño extends Thing {}
        export const c = new CuentaDeAhorro()
        export const d = new CajaDelAño()"
      `)
    })
  })

  ////////////////
  // ## Properties
  ////////////////

  describe("properties", () => {
    test("declared in quotes, then read whole:  `the X of Y`, `its X`", () => {
      expect(
        english(
          "a card is a thing where:",
          '  - its "side of play" is a number',
          '  - its "what if" is text',
          "  - to flip it: set its side of play to 2",
          "the c is a new card",
          "print the side of play of c + 1",
          "print the what if of c"
        )
      ).toMatchInlineSnapshot(`
        "export class Card extends Thing {
          // - its "side of play" is a number
          static { this.declareProp("sideOfPlay", { type: "number" }) }
          get sideOfPlay() { return this.getProp("sideOfPlay") }
          set sideOfPlay(value) { this.setProp("sideOfPlay", value) }
          // - its "what if" is text
          static { this.declareProp("whatIf", { type: "text" }) }
          get whatIf() { return this.getProp("whatIf") }
          set whatIf(value) { this.setProp("whatIf", value) }
          flip() {
            this.sideOfPlay = 2
          }
        }
        export const c = new Card()
        core.console.log(c.sideOfPlay + 1)
        core.console.log(c.whatIf)"
      `)
    })

    test("in quotes in the sentence style, and a getter", () => {
      expect(
        english(
          "a card is a thing",
          'a card has a "side of play" as a number',
          'the "lucky number" of a card is: the side of play of it + 7',
          "the c is a new card",
          "print the side of play of c"
        )
      ).toMatchInlineSnapshot(`
        "export class Card extends Thing {
          // a card has a "side of play" as a number
          static { this.declareProp("sideOfPlay", { type: "number" }) }
          get sideOfPlay() { return this.getProp("sideOfPlay") }
          set sideOfPlay(value) { this.setProp("sideOfPlay", value) }
          get luckyNumber() {
            return this.sideOfPlay + 7
          }
        }
        export const c = new Card()
        core.console.log(c.sideOfPlay)"
      `)
    })

    test("LEFT:  declared WITHOUT quotes, the name stops at the grammar word", () => {
      expect(english("a card is a thing", "a card has side of play as a number", "the side of play of a card is: 1"))
        .toMatchInlineSnapshot(`
        "export class Card extends Thing {
          // a card has side
          get side() { return this.getProp("side") }
          set side(value) { this.setProp("side", value) }
          /* PARSE ERROR: Don't understand "of play as a number" */
        }
        /* PARSE ERROR: Don't understand "the side of play of a card is: 1" */
        ERROR 2:16 Don't understand "of play as a number"
        ERROR 3:0 Don't understand "the side of play of a card is: 1""
      `)
    })

    test("Spanish:  `fecha de nacimiento`, in quotes, then read with and without its article", () => {
      expect(
        spanish(
          "una persona es una cosa donde:",
          '  - su "fecha de nacimiento" es texto',
          "  - para saludar: imprimir su fecha de nacimiento",
          "la p es una nueva persona",
          "imprimir la fecha de nacimiento de la p",
          "imprimir la fecha de nacimiento de p"
        )
      ).toMatchInlineSnapshot(`
        "export class Persona extends Thing {
          // su "fecha de nacimiento" es texto
          static { this.declareProp("fechaDeNacimiento", { type: "text" }) }
          get fechaDeNacimiento() { return this.getProp("fechaDeNacimiento") }
          set fechaDeNacimiento(value) { this.setProp("fechaDeNacimiento", value) }
          saludar() {
            return core.console.log(this.fechaDeNacimiento)
          }
        }
        export const p = new Persona()
        core.console.log(p.fechaDeNacimiento)
        core.console.log(p.fechaDeNacimiento)"
      `)
    })

    test("Spanish LEFT:  WITHOUT quotes, `de` splits the read in two", () => {
      expect(
        spanish(
          "una persona es una cosa",
          "una persona tiene una fecha de nacimiento como texto",
          "la p es una nueva persona",
          "imprimir la fecha de nacimiento de la p"
        )
      ).toMatchInlineSnapshot(`
        "export class Persona extends Thing {
          // una persona tiene una fecha
          get fecha() { return this.getProp("fecha") }
          set fecha(value) { this.setProp("fecha", value) }
          /* PARSE ERROR: No entiendo "de nacimiento como texto" */
        }
        export const p = new Persona()
        core.console.log(p.nacimiento.fecha)
        ERROR 2:28 No entiendo "de nacimiento como texto""
      `)
    })
  })

  ////////////////
  // ## Variables
  ////////////////

  describe("variables", () => {
    test("declared with dashes, read with spaces", () => {
      expect(english("set way-to-go to 3", "print way to go + 1", "print the way to go")).toMatchInlineSnapshot(`
        "export const wayToGo = 3
        core.console.log(wayToGo + 1)
        core.console.log(wayToGo)"
      `)
    })

    test("LEFT:  declared with spaces, `to` ends the name", () => {
      expect(english("set way to go to 3")).toMatchInlineSnapshot(`
        "/* PARSE ERROR: Don't understand "set way to go to 3" */
        ERROR 1:0 Don't understand "set way to go to 3""
      `)
    })

    test("LEFT:  a name can't START with a grammar word:  `no more` is `no`, then `more`", () => {
      expect(english("set no-more to 3", "print no more")).toMatchInlineSnapshot(`
        "export const noMore = 3
        core.console.log(false)
        /* PARSE ERROR: Don't understand "more" */
        ERROR 2:9 Don't understand "more""
      `)
    })

    test("Spanish:  declared with dashes, read with spaces", () => {
      expect(spanish("poner carta-de-juego a 3", "imprimir carta de juego + 1")).toMatchInlineSnapshot(`
        "export const cartaDeJuego = 3
        core.console.log(cartaDeJuego + 1)"
      `)
    })
  })

  ////////////////
  // ## Methods and phrases
  ////////////////

  describe("methods and quoted phrases:  already fine", () => {
    test("a method's words, and a phrase's", () => {
      expect(
        english(
          "a card is a thing",
          "a card has a side as text",
          "to put (a card) in play: print 1",
          "to open the point of sale: print 2",
          'a card "is in play" if its side is "up"',
          "the c is a new card",
          "put c in play",
          "open the point of sale",
          "print c is in play"
        )
      ).toMatchInlineSnapshot(`
        "export class Card extends Thing {
          // a card has a side as text
          static { this.declareProp("side", { type: "text" }) }
          get side() { return this.getProp("side") }
          set side(value) { this.setProp("side", value) }
          putInPlay() {
            return core.console.log(1)
          }
          get isInPlay() {
            return this.side === "up"
          }
        }
        export function openThePointOfSale() {
          return core.console.log(2)
        }
        export const c = new Card()
        c.putInPlay()
        openThePointOfSale()
        core.console.log(c.isInPlay)"
      `)
    })

    test("Spanish:  a method's words, and a phrase's", () => {
      expect(
        spanish(
          "una carta es una cosa",
          "una carta tiene un lado como texto",
          "para poner (una carta) en juego: imprimir 1",
          "para abrir la cuenta de ahorro: imprimir 2",
          'una carta "está en juego" si su lado es "x"',
          "la c es una nueva carta",
          "poner c en juego",
          "abrir la cuenta de ahorro",
          "imprimir c está en juego"
        )
      ).toMatchInlineSnapshot(`
        "export class Carta extends Thing {
          // una carta tiene un lado como texto
          static { this.declareProp("lado", { type: "text" }) }
          get lado() { return this.getProp("lado") }
          set lado(value) { this.setProp("lado", value) }
          ponerEnJuego() {
            return core.console.log(1)
          }
          get estáEnJuego() {
            return this.lado === "x"
          }
        }
        export function abrirLaCuentaDeAhorro() {
          return core.console.log(2)
        }
        export const c = new Carta()
        c.ponerEnJuego()
        abrirLaCuentaDeAhorro()
        core.console.log(c.estáEnJuego)"
      `)
    })
  })
})

////////////////
// ## Harness
////////////////

/** A compiled line that's part of a `SPELL:` declaration comment, which the probes leave out. */
const DECLARATION_LINE =
  /^\s*(\/\*! SPELL|type:|datatype:|syntax:|defined:|alias:|name:|output:|rule:|of:|kind:|property:|classVariable:|params:|itemType:|returns:|\} \*\/)/

/** `lines` as one English file:  see `probe()`. */
function english(...lines: string[]): string {
  return probe(SP.SpellParser.rootScope, [lines.join("\n")])
}

/** `lines` as one Spanish file:  see `probe()`. */
function spanish(...lines: string[]): string {
  return probe(SP.spanish.rootScope, [lines.join("\n")])
}

/**
 * What the first of `files`, a project's under `parentScope`, compiles to,
 * then one `ERROR <line>:<ch> <message>` per parse error.
 * - One string, so its inline snapshot reads as the compiled code.
 */
function probe(parentScope: P.Scope, files: string[]): string {
  const sources = files.map((contents, index) => ({ path: `/Probe${index}.spell`, contents }))
  const [file] = parseSpellProject(sources, { parentScope }).files
  const compiled = file!.compiled.split("\n").filter((line) => line.trim() && !DECLARATION_LINE.test(line))
  return [...compiled, ...file!.errors.map((error) => `ERROR ${error}`)].join("\n")
}
