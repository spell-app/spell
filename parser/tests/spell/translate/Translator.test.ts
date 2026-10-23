import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-lang/spell"
import { parseSpellProject } from "spell-lang/spell/test"
import { shapeOf } from "spell-lang/spell/translate/ShapeCheck"
import { Translator } from "spell-lang/spell/translate/Translator"
import { TranslationNames } from "spell-lang/spell/translate/TranslationNames"
import type { NamesData } from "spell-lang/spell/translate/translate.types"

/**
 * The translator (epic `spanish` P24):  a project written in English, written again in Spanish, rule by rule.
 * - Each case:  the English, the Spanish it writes, and that Spanish read back by Spanish's parser:
 *   no errors, and the same compiled javascript SHAPE as the English (`ShapeCheck`'s `shapeOf()`:  names and texts left out,
 *   as they're the dictionary's words).
 * - On a small card game, in the outline style, written inline:  a lower repo's tests never read spell-app's examples.
 */

const ENGLISH = SP.Language.for("en")!
const SPANISH = SP.Language.for("es")!

/** The game's names in Spanish:  what `<Project>.es.names.json5` holds. */
const NAMES: NamesData = {
  types: { card: { name: "carta", gender: "feminine" }, deck: { name: "mazo", gender: "masculine" } },
  names: {
    rank: "rango",
    suit: "palo",
    ace: "as",
    king: "rey",
    hearts: "corazones",
    spades: "espadas",
    up: "arriba",
    down: "abajo",
    direction: "dirección",
    pile: "pila",
    count: "cuenta"
  },
  phrases: {
    "is a (rank)": "es un (rango)",
    "is face (direction)": "está boca (dirección)",
    "turn it over": "voltear eso",
    "card setup": "la preparación de la carta"
  },
  texts: { "ace of hearts": "as de corazones" },
  comments: { "a playing card": "una carta de la baraja" }
}

/** The game, in English:  the rules each line uses are in its comment. */
const CARD = `// a playing card
a "card" is a thing where:
	- its "rank" is one of ace, 2 ... 10 or king
	- it "is a (rank)"
	- its "suit" is one of hearts or spades
	- its "direction" is up or down
	- it "is face (direction)"
	- its "name" is its rank + " of " + its suit
	- to turn it over:
		if it is face up:
			set its direction to down
		otherwise:
			set its direction to up

a "deck" is a list of cards

to test card setup
	get a new card whose rank is ace, suit is hearts and direction is up
	its name should be "ace of hearts"
	it is an ace should be yes
	it is not a king should be yes
	turn it over
	it is face down should be yes
	set the pile to a new deck
	add it to the pile
	the number of cards in the pile should be 1
	the first card of the pile is an ace should be yes
	count = 0
	for each card in the pile
		set count to count + 1
	count should be 1
	the pile is empty should be no
	pause for 10 msec
	print "ace of hearts"
`

/** What the translator writes for `CARD`, line by line. */
const CARTA = `// una carta de la baraja
una "carta" es una cosa donde:
	- su "rango" es uno de as, 2 ... 10 o rey
	- "es un (rango)"
	- su "palo" es uno de corazones o espadas
	- su "dirección" es arriba o abajo
	- "está boca (dirección)"
	- su "nombre" es su rango + " of " + su palo  // TODO: translate (texts " of ")
	- para voltearla:
		si está boca arriba:
			poner su dirección a abajo
		de lo contrario:
			poner su dirección a arriba

un "mazo" es una lista de cartas

para probar la preparación de la carta
	obtener una nueva carta cuyo rango es as, palo es corazones y dirección es arriba
	su nombre debería ser "as de corazones"
	es un as debería ser sí
	no es un rey debería ser sí
	voltear eso
	está boca abajo debería ser sí
	poner la pila a un nuevo mazo
	agregar eso a la pila
	el número de cartas en la pila debería ser 1
	la primera carta de la pila es un as debería ser sí
	cuenta = 0
	para cada carta en la pila
		poner cuenta a cuenta + 1
	cuenta debería ser 1
	la pila es vacía debería ser no
	pausar 10 mseg
	imprimir "as de corazones"
`

describe("Translator:  English to Spanish, rule by rule", () => {
  test("writes each line with the same rule's Spanish, its names from the dictionary", () => {
    expect(translated(CARD).lines.join("\n")).toBe(CARTA)
  })

  test("the Spanish reads back, with no errors, as the same program:  the same compiled shape", () => {
    const english = parseSpellProject([{ path: "/Card.spell", contents: CARD }]).files[0]!
    const spanish = parseSpellProject([{ path: "/Carta.es.spell", contents: CARTA }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(spanish.warnings).toEqual([])
    expect(shapeOf(spanish.compiled)).toBe(shapeOf(english.compiled))
  })

  test("one line out for each line in", () => {
    expect(translated(CARD).lines).toHaveLength(CARD.split("\n").length)
  })

  test("a name the dictionary lacks:  kept as written, the line marked TODO, the name noted", () => {
    const { names, file } = translatedWith({ ...NAMES, names: { ...NAMES.names, pile: "" } }, CARD)
    const at = CARD.split("\n").indexOf("\tset the pile to a new deck")
    expect(file.lines[at]).toBe('\tponer el pile a un nuevo mazo  // TODO: translate (names "pile")')
    expect(file.todo.get(at)).toEqual(['names "pile"'])
    expect(file.missing.get(at)).toEqual([{ kind: "names", words: "pile" }])
    expect(names.markTodo(file.missing.get(at)!)).toBe(1)
    expect(names.data.names.pile).toBe(TranslationNames.TODO)
  })

  test("a text joined to a value with `+` is written, and flagged for the fix-up pass:  its word order", () => {
    const { file } = translatedWith({ ...NAMES, texts: { ...NAMES.texts, " of ": " de " } }, CARD)
    const at = CARD.split("\n").findIndex((line) => line.includes('" of "'))
    expect(file.lines[at]).toBe('\t- su "nombre" es su rango + " de " + su palo')
    expect(file.risky.get(at)).toBe('text joined to a value:  `its rank + " of " + its suit`')
    expect([...file.risky.keys()]).toEqual([at])
  })

  test("a possessive agrees in number with a name of either gender:  `sus espadas`, `sus corazones`", () => {
    const source = 'a "card" is a thing where:\n\t- its "spades" is a number\n\t- its "hearts" is a number\n'
    expect(translated(source).lines.slice(1, 3)).toEqual([
      '\t- sus "espadas" es un número',
      '\t- sus "corazones" es un número'
    ])
  })

  test("a comment the dictionary lacks stays as it was, and is no TODO", () => {
    const file = translatedWith({ ...NAMES, comments: {} }, CARD).file
    expect(file.lines[0]).toBe("// a playing card")
    expect(file.todo.has(0)).toBe(false)
    expect(file.missing.get(0)).toEqual([{ kind: "comments", words: "a playing card" }])
  })
})

/** A to-do list's names in Spanish:  its type written `todo-list`, keyed as declared, `todo list`. */
const TODO_NAMES: NamesData = {
  types: { task: { name: "tarea", gender: "feminine" }, "todo list": { name: "agenda", gender: "feminine" } },
  names: { title: "título", done: "hecha", tasks: "tareas", points: "puntos", plan: "plan", item: "elemento" },
  phrases: {
    "create a new task (with title as text, done as a choice)":
      "crear una nueva tarea (con título como texto, hecha como una opción)"
  },
  texts: { Shop: "Compras" }
}

/** A to-do list, in English (epic `spanish` P28):  a call with named arguments, with and without them. */
const TODOS = `a task is a thing
a task has a title as text
a task has a property done as yes or no
a todo-list is a thing
a todo-list has a property tasks as a new list of tasks
to create a new task (with title as text, done as a choice)
	print the title
create a new task
create a new task with title = "Shop", done = yes
points = 3
if points > 0 print points
plan = a new todo-list
print the title of the first item of the tasks of plan
`

describe("Translator:  calls, words and agreement (epic `spanish` P28)", () => {
  const { file } = translatedWith(TODO_NAMES, TODOS)

  test("a call with named arguments:  their `with` in the other language;  without them, none", () => {
    expect(file.lines.slice(7, 9)).toEqual([
      "crear una nueva tarea",
      'crear una nueva tarea con título = "Compras", hecha = sí'
    ])
    expect(file.todo.size).toBe(0)
  })

  test("a type written with a dash is the one declared with a space:  `todo-list` is `todo list`", () => {
    expect(file.lines[3]).toBe("una agenda es una cosa")
  })

  test("a plural property's article agrees;  an adjective after an article agrees with the word after it", () => {
    expect(file.lines[4]).toBe("una agenda tiene unas tareas como una nueva lista de tareas")
  })

  test("a symbol stays itself:  `>` is `>`, never the first of `(<|>)`", () => {
    expect(file.lines[10]).toBe("si puntos > 0 imprimir puntos")
  })

  test("`primer` before a masculine noun;  `del` takes the ordinal's article", () => {
    expect(file.lines[12]).toBe("imprimir el título del primer elemento de las tareas de plan")
  })

  test("the Spanish reads back, with no errors, as the same program", () => {
    const english = parseSpellProject([{ path: "/Todos.spell", contents: TODOS }]).files[0]!
    const spanish = parseSpellProject([{ path: "/Todos.es.spell", contents: file.lines.join("\n") }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(shapeOf(spanish.compiled)).toBe(shapeOf(english.compiled))
  })
})

describe("Translator:  what runs as a thing is made (epic `spanish` P28)", () => {
  const source = `a task is a thing where:
	- its "title" is a text
	- when created (with title as text, done as a choice):
		print the title
create a new task with title = "Shop"
`
  const { file } = translatedWith(TODO_NAMES, source)

  test("its hook in the other language's words, agreeing with the type:  `al crearla (con ...)`", () => {
    expect(file.lines[2]).toBe("\t- al crearla (con título como texto, hecha como una opción):")
    expect(file.lines[4]).toBe('crear una nueva tarea con título = "Compras"')
    expect(file.todo.size).toBe(0)
  })

  test("Spanish to English too:  `al crearla` is `when created`", () => {
    const spanishSource = file.lines.join("\n")
    const { files } = parseSpellProject([{ path: "/Tarea.es.spell", contents: spanishSource }])
    const back: NamesData = {
      types: { tarea: { name: "task" } },
      names: { título: "title", hecha: "done" },
      texts: { Compras: "Shop" }
    }
    const names = new TranslationNames(back, { from: SPANISH, to: ENGLISH })
    const translator = new Translator({ from: SPANISH, to: ENGLISH, names })
    const english = translator.translateFile({
      path: "/Tarea.es.spell",
      contents: spanishSource,
      match: files[0]!.match
    })
    expect(english.lines[2]).toBe("\t- when created (with title as text, done as a choice):")
  })

  test("and reads back as the same program", () => {
    const english = parseSpellProject([{ path: "/Task.spell", contents: source }]).files[0]!
    const spanish = parseSpellProject([{ path: "/Tarea.es.spell", contents: file.lines.join("\n") }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(shapeOf(spanish.compiled)).toBe(shapeOf(english.compiled))
  })
})

describe("TranslationNames", () => {
  const names = new TranslationNames(NAMES, { from: ENGLISH, to: SPANISH })

  test("a plural from its singular, by the other language's rules", () => {
    expect(names.type("cards")).toEqual({ name: "cartas", gender: "feminine" })
    expect(names.name("ranks")).toBe("rangos")
  })

  test("a singular from its plural:  a value kind's one value", () => {
    expect(names.name("heart")).toBe("corazón")
  })

  test("a kind's values, by the language's propertyKindName", () => {
    expect(names.type("card ranks")).toEqual({ name: "rangos de carta" })
    expect(names.type("card rank")).toEqual({ name: "rango de carta" })
  })

  test("a built-in type is the pack's own word", () => {
    expect(names.type("text")).toEqual({ name: "texto" })
    expect(names.type("drawable thing")).toEqual({ name: "cosa dibujable" })
  })

  test("a word with no letters is itself;  a missing one is noted", () => {
    expect(names.name("2")).toBe("2")
    expect(names.name("joker")).toBeUndefined()
    expect(names.takeMissing()).toEqual([{ kind: "names", words: "joker" }])
  })
})

////////////////
// ## Helpers
////////////////

/** `source`, translated with `NAMES`. */
function translated(source: string) {
  return translatedWith(NAMES, source).file
}

/** `source` (one English file), translated with `data`:  the file, and the dictionary after. */
function translatedWith(data: NamesData, source: string) {
  const { files } = parseSpellProject([{ path: "/Card.spell", contents: source }])
  const names = new TranslationNames(data, { from: ENGLISH, to: SPANISH })
  const translator = new Translator({ from: ENGLISH, to: SPANISH, names })
  const file = translator.translateFile({ path: "/Card.spell", contents: source, match: files[0]!.match })
  return { names, file, translator }
}
