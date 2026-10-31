import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * What every way of naming a thing means inside an action (epic `language`, Q1-Q4):
 * the table the language's name lookup is held to.
 * - `the X` reads:  a local, argument, loop variable or alias, innermost first;  else a property of the thing the
 *   action runs on, inherited ones too;  else every thing of a type;  else an error.
 * - `set the X to` follows that order too;  `set X to` makes a local.
 * - `its X` follows `it`, so in a loop it's the item;  `the X` never is.
 * - A bare `X` never reads a property.
 * - A local that hides a property warns where it's made and where `the X` reads it;
 *   an argument or loop variable warns only on that read.
 *
 * A row marked `notYet` isn't true yet, and names the phase that makes it true:
 * it runs as `test.fails`, so the phase that makes it true MUST remove the mark.
 */

/** One way of saying something, and what it should mean. */
type NameRow = {
  /** what's being named, and how it's said */
  title: string
  /** the action's lines, one level in */
  spell: string
  /** a piece of the compiled JavaScript, or `ERROR`:  it should not compile */
  js: string | typeof ERROR
  /** the action's first line, when not `PLAY` */
  action?: string
  /** `spell` is in a loose action, not one of the type's */
  outside?: boolean
  /** a piece of the warning it should give;  no `warns`:  it should give none */
  warns?: string
  /** the phase that makes this row true */
  notYet?: "P5" | "P6" | "P7"
}

const ERROR = Symbol("does not compile")
const HIDES = "hides"
const OCULTA = "oculta"

////////////////
// ## English
////////////////

const PLAY = "to play it:"

const ENGLISH_PROJECT = (action: string, lines: string, loose = "set x to 1") => `a pile is a thing:
	- it has a name as text
	- to shuffle it:
		set x to 1
a stock is a pile
a card is a thing:
	- it has a rank as a number
a round is a thing
a base is a thing:
	- it has a label as text
a game is a base:
	- it has a stock as a new stock
	- it has a pile as a new pile
	- it has a score as a number
	- it has a short rank as a number
	- it has rounds as a list
	- its "color" is one of red or blue
	- its "total" is its score + 1
	- to reset the stock:
		set x to 1
	- ${action}
${lines.replace(/^/gm, "\t\t")}
	- it has a later as a number

	- it has a blue as a number
to helper:
${loose.replace(/^/gm, "\t")}
`

const ENGLISH: NameRow[] = [
  // an own property
  { title: "own property:  the X reads it", spell: "set v to the score", js: "v = this.score" },
  {
    title: "own property:  the X as an argument",
    spell: "shuffle the stock",
    js: "this.stock.shuffle()"
  },
  { title: "own property:  its X reads it", spell: "set v to its score", js: "v = this.score" },
  { title: "own property:  a bare X does NOT read it", spell: "set v to score", js: ERROR },
  { title: "own property:  a bare X is no argument", spell: "shuffle stock", js: ERROR },
  { title: "own property:  the X of Y", spell: "shuffle the stock of the game", js: "this.stock.shuffle()" },
  { title: "own property:  set the X writes it", spell: "set the score to 1", js: "this.score = 1" },
  { title: "own property:  set its X writes it", spell: "set its score to 1", js: "this.score = 1" },
  {
    title: "own property:  set X makes a local, and warns",
    spell: "set score to 1",
    js: "score = 1",
    warns: HIDES
  },
  { title: "own property:  the X is V writes it", spell: "the score is 1", js: "this.score = 1" },
  { title: "own property:  the X = V writes it", spell: "the score = 1", js: "this.score = 1" },
  { title: "own property:  let the X = V writes it", spell: "let the score = 1", js: "this.score = 1" },
  {
    title: "own property:  the X is V in a condition compares",
    spell: "if the score is 1\n\tset x to 2",
    js: "this.score === 1"
  },
  { title: "own property:  add to the X reads it", spell: "add 1 to the rounds", js: "this.rounds" },
  {
    title: "own property:  set the X in a loop is the action's thing",
    spell: "for each card in the cards\n\tset the score to 1",
    js: "this.score = 1"
  },
  {
    title: "own property:  a local's block ended, set the X writes it",
    spell: "if 1 is 1\n\tset score to 3\nset the score to 4",
    js: "this.score = 4",
    warns: HIDES
  },
  { title: "outside an action:  set the X makes a local", spell: "set the score to 1", js: "score = 1", outside: true },
  { title: "enum property:  set the X writes it", spell: 'set the color to "red"', js: 'this.color = "red"' },
  {
    title: "named like another type's value:  the X reads the property",
    spell: "set v to the blue",
    js: "v = this.blue"
  },
  { title: "several words:  the X is V writes it", spell: "the short rank is 4", js: "this.shortRank = 4" },
  { title: "several words:  the X = V writes it", spell: "the short rank = 4", js: "this.shortRank = 4" },
  {
    title: "getter:  set the X writes as set its X does",
    spell: "set its total to 1\nset the total to 1",
    js: "this.total = 1"
  },
  {
    title: "own property:  a rule taking a variable can't take its word with the",
    spell: "set v to the score 1 to 3 of its rounds",
    js: ERROR
  },
  {
    title: "own property:  a rule taking a variable keeps its own word",
    spell: "set v to score 1 to 3 of its rounds",
    js: "this.rounds.slice(0, 3)"
  },
  {
    title: "several words:  a longer property beats a local of its first word",
    spell: "set short to 1\nset v to the short rank",
    js: "v = this.shortRank"
  },
  {
    title: "several words:  a local of the whole name beats the property",
    spell: "set short rank to 1\nset v to the short rank",
    js: "v = shortRank",
    warns: HIDES
  },
  { title: "several words:  the X reads it", spell: "set v to the short rank", js: "v = this.shortRank" },
  {
    title: "several words:  set the X writes it",
    spell: "set the short rank to 4",
    js: "this.shortRank = 4"
  },
  {
    title: "declared below the action:  the X reads it",
    spell: "set v to the later",
    js: "v = this.later"
  },
  { title: "declared below the action:  its X reads it", spell: "set v to its later", js: "v = this.later" },

  // an inherited property, and a getter
  { title: "inherited property:  the X reads it", spell: "set v to the label", js: "v = this.label" },
  {
    title: "inherited property:  set the X writes it",
    spell: 'set the label to "x"',
    js: 'this.label = "x"'
  },
  { title: "getter:  the X reads it", spell: "set v to the total", js: "v = this.total" },
  { title: "getter:  its X reads it", spell: "set v to its total", js: "v = this.total" },

  // a local
  { title: "local, no such property:  the X reads it", spell: "set q to 1\nset v to the q", js: "v = q" },
  { title: "no local, no such property:  set the X makes a local", spell: "set the q to 1", js: "q = 1" },
  { title: "no local, no such property:  the X is an error", spell: "set v to the q", js: ERROR },
  {
    title: "local hiding a property:  the X reads the local, and warns",
    spell: "set score to 3\nset v to the score",
    js: "v = score",
    warns: HIDES
  },
  {
    title: "local hiding a property:  its X still reads the property",
    spell: "set score to 3\nset v to its score",
    js: "v = this.score",
    warns: HIDES
  },
  {
    title: "local hiding a property:  set the X writes the local",
    spell: "set score to 3\nset the score to 4",
    js: "score = 4",
    warns: HIDES
  },
  {
    title: "local made later:  the X above it reads the property",
    spell: "set v to the score\nset score to 3",
    js: "v = this.score",
    warns: HIDES
  },
  {
    title: "local in a block:  the X after the block reads the property",
    spell: "if yes\n\tset score to 1\nset v to the score",
    js: "v = this.score",
    warns: HIDES
  },

  {
    title: "local hiding a property:  [the X] in a text reads the local, and warns",
    spell: 'set score to 3\nset v to "x [the score]"',
    js: "${score}",
    warns: HIDES
  },

  {
    title: "argument hiding a property:  [the X] in a text warns, about the text",
    action: "to play (a game) on (a pile):",
    spell: 'set v to "x [the pile]"',
    js: "${pile}",
    warns: HIDES
  },

  // a text's fill-in, and markup's
  {
    title: "own property:  [X] in a text reads it",
    spell: 'set v to "x [score]"',
    js: "${this.score}"
  },
  {
    title: "own property of several words:  [X] in a text reads it",
    spell: 'set v to "x [short rank]"',
    js: "${this.shortRank}"
  },
  {
    title: "local hiding a property:  a bare [X] in a text reads the local, with no warning on the read",
    action: "to play (a game) on (a pile):",
    spell: 'set v to "x [pile]"',
    js: "${pile}"
  },
  {
    title: "in a loop:  [X] in a text is the action's thing, never the item's",
    spell: 'for each card in its rounds\n\tset v to "x [score]"',
    js: "${this.score}"
  },
  {
    title: "in a loop:  [X] that only the item has does not read it",
    spell: 'for each card in the cards\n\tset v to "x [rank]"',
    js: ERROR
  },
  {
    title: "argument hiding a property:  [the X] in markup text warns",
    action: "to play (a game) on (a pile):",
    spell: "return <span>[the pile]</span>",
    js: "${pile}",
    warns: HIDES
  },
  {
    title: "argument hiding a property:  [the X] in a markup attribute warns",
    action: "to play (a game) on (a pile):",
    spell: 'return <span title="[the pile]"></span>',
    js: "${pile}",
    warns: HIDES
  },

  {
    title: "argument hiding a property:  {the X} in a markdown hole warns",
    action: "to play (a game) on (a pile):",
    spell: "return <markdown>x {the pile}</markdown>",
    js: "${pile}",
    warns: HIDES
  },

  // an argument
  {
    title: "argument hiding a property:  the X reads the argument, and warns",
    action: "to play (a game) on (a pile):",
    spell: "set v to the pile",
    js: "v = pile",
    warns: HIDES
  },
  {
    title: "argument hiding a property:  its X reads the property",
    action: "to play (a game) on (a pile):",
    spell: "set v to its pile",
    js: "v = this.pile"
  },
  {
    title: "argument hiding a property:  a bare X reads it, no warning",
    action: "to play (a game) on (a pile):",
    spell: "set v to pile",
    js: "v = pile"
  },

  // a loop variable, and `it` in a loop
  {
    title: "loop variable hiding a property:  the X reads it, and warns",
    spell: "for each pile in the piles\n\tset v to the pile",
    js: "v = pile",
    warns: HIDES
  },
  {
    title: "in a loop:  the X is the action's thing",
    spell: "for each card in the cards\n\tset v to the score",
    js: "v = this.score"
  },
  {
    title: "in a loop:  the X is NEVER the item's",
    spell: "for each card in the cards\n\tset v to the rank",
    js: ERROR
  },
  {
    title: "in a loop:  its X is the item's",
    spell: "for each card in the cards\n\tset v to its rank",
    js: "v = card.rank"
  },
  {
    title: "in a loop:  the X of Y still reads Y's",
    spell: "for each card in the cards\n\tset v to the stock of the game",
    js: "v = this.stock"
  },

  // `it`, from a `get`
  {
    title: "after a get:  its X is what was got",
    spell: "get the stock of the game\nset v to its name",
    js: "v = it.name"
  },
  {
    title: "after a get:  the X is still the action's thing",
    spell: "get the stock of the game\nset v to the score",
    js: "v = this.score"
  },

  {
    title: "in a loop:  a thing's own event is still from the thing",
    spell: "for each card in the cards\n\tsend hit",
    js: 'send(this, "hit", {}, this)'
  },

  // a type
  { title: "own type:  the X is the thing itself", spell: "set v to the game", js: "v = this" },
  { title: "plural type:  the Xs are every thing of it", spell: "set v to the cards", js: "core.everyThing(Card)" },
  { title: "singular type:  the X is an error", spell: "set v to the card", js: ERROR },
  {
    title: "property named as a type:  the X is the property",
    spell: "set v to the pile",
    js: "v = this.pile"
  },
  {
    title: "plural property named as a type:  the Xs are the property",
    spell: "set v to the rounds",
    js: "v = this.rounds"
  },

  // an enumerated property keeps its lookup:  the values live on the type
  {
    title: "enumerated property:  the position of the X keeps its list",
    action: "to play it:",
    spell: "set v to the position of the color in the colors",
    js: "positionOf(Game.Colors, this.color)"
  },

  // an action's own words
  { title: "action phrase:  a literal action name wins", spell: "reset the stock", js: "this.resetTheStock()" },

  // outside a type's action
  { title: "outside any type:  the X is an error", outside: true, spell: "set v to the score", js: ERROR }
]

////////////////
// ## Spanish
////////////////

const SPANISH_PROJECT = (action: string, lines: string) => `una pila es una cosa:
	- tiene un nombre como texto
	- para barajarla:
		poner x a 1
una reserva es una pila
una carta es una cosa:
	- tiene un rango como un número
una base es una cosa:
	- tiene una etiqueta como texto
un juego es una base:
	- tiene una reserva como una nueva reserva
	- tiene una pila como una nueva pila
	- tiene una puntuación como un número
	- ${action}
${lines.replace(/^/gm, "\t\t")}
	- tiene un resto como un número
`

const JUGAR = "para jugarlo:"

const SPANISH: NameRow[] = [
  {
    title: "propiedad propia:  [X] en un texto la lee",
    spell: 'poner v a "x [puntuación]"',
    js: "${this.puntuación}"
  },
  {
    title: "propiedad propia:  la X la lee",
    spell: "poner v a la puntuación",
    js: "v = this.puntuación"
  },
  {
    title: "propiedad propia:  el X como argumento",
    spell: "barajar la reserva",
    js: "this.reserva.barajar()"
  },
  { title: "propiedad propia:  su X la lee", spell: "poner v a su puntuación", js: "v = this.puntuación" },
  { title: "propiedad propia:  una X sola NO la lee", spell: "poner v a puntuación", js: ERROR },
  {
    title: "propiedad propia:  poner la X la escribe",
    spell: "poner la puntuación a 1",
    js: "this.puntuación = 1"
  },
  { title: "propiedad propia:  la X es V la escribe", spell: "la puntuación es 1", js: "this.puntuación = 1" },
  { title: "propiedad propia:  la X = V la escribe", spell: "la puntuación = 1", js: "this.puntuación = 1" },
  { title: "propiedad propia:  sea la X = V la escribe", spell: "sea la puntuación = 1", js: "this.puntuación = 1" },
  {
    title: "propiedad propia:  poner X hace una local, y avisa",
    spell: "poner puntuación a 1",
    js: "puntuación = 1",
    warns: OCULTA
  },
  { title: "declarada debajo:  el X la lee", spell: "poner v a el resto", js: "v = this.resto" },
  { title: "heredada:  la X la lee", spell: "poner v a la etiqueta", js: "v = this.etiqueta" },
  {
    title: "local que oculta:  la X lee la local, y avisa",
    spell: "poner puntuación a 3\nponer v a la puntuación",
    js: "v = puntuación",
    warns: OCULTA
  },
  {
    title: "en un bucle:  la X es la de la acción",
    spell: "para cada carta en las cartas\n\tponer v a la puntuación",
    js: "v = this.puntuación"
  },
  {
    title: "en un bucle:  el X NUNCA es el del elemento",
    spell: "para cada carta en las cartas\n\tponer v a el rango",
    js: ERROR
  },
  {
    title: "en un bucle:  su X es el del elemento",
    spell: "para cada carta en las cartas\n\tponer v a su rango",
    js: "v = carta.rango"
  },
  { title: "tipo plural:  las X son todas", spell: "poner v a las cartas", js: "core.everyThing(Carta)" },
  {
    title: "propiedad con nombre de tipo:  la X es la propiedad",
    spell: "poner v a la pila",
    js: "v = this.pila"
  }
]

////////////////
// ## Tests
////////////////

/** Holds `row` to what it says:  `js`, and that it warns only when it says so. */
function checkRow(row: NameRow, path: string, project: typeof ENGLISH_PROJECT, action: string) {
  const contents = row.outside ? project(action, "set x to 1", row.spell) : project(row.action ?? action, row.spell)
  const { compiled, errors, warnings } = parseSpellProject([{ path, contents }]).files[0]!
  if (row.js === ERROR) {
    expect(errors).not.toEqual([])
    return
  }
  expect(errors).toEqual([])
  expect(compiled).toContain(row.js)
  const hiding = warnings.filter((warning) => warning.includes(HIDES) || warning.includes(OCULTA))
  if (row.warns) expect(hiding).not.toEqual([])
  else expect(hiding).toEqual([])
}

/** One test per row;  a row not true yet says so in its name, and must fail until its phase. */
function testRows(rows: NameRow[], path: string, project: typeof ENGLISH_PROJECT, action: string) {
  for (const row of rows) {
    const run = () => checkRow(row, path, project, action)
    if (row.notYet) test.fails(`${row.title}  [${row.notYet}]`, run)
    else test(row.title, run)
  }
}

describe("what a name means inside an action", () => {
  describe("English", () => testRows(ENGLISH, "/Game.spell", ENGLISH_PROJECT, PLAY))
  describe("Spanish", () => testRows(SPANISH, "/Juego.es.spell", SPANISH_PROJECT, JUGAR))
})
