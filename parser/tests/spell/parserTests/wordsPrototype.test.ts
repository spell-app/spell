/**
 * Every line of Spell epic `data` proposes, tried on the real parser:  T8, the first time any was compiled.
 * - Its Overview's first and third sections, line by line (`LINES`), and the recipe box whole.
 * - Each line twice, in English and Spanish:
 *   - `today`:  on the parser as it is
 *   - `withRule`:  with the smallest rule that reads it, `wordsPrototype.rules.ts`, which no project ever sees
 * - It says what a line IS, not whether it's right:  a line that compiles to the wrong thing is `wrong`, with what it
 *   compiled to, so nobody takes "no error" for "works".
 * - Set `WORDS_TABLE` to a path to write the table as Markdown:  what The Words (P11) is built from.
 */
import { writeFileSync } from "fs"

import { afterAll, beforeEach, describe, expect, it } from "vite-plus/test"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"

import { prototypeScope } from "./wordsPrototype.rules"

/** What became of a line:  compiled, compiled to something else (what, in `means`), or an error. */
type Status = "compiles" | "wrong" | "fails"

/** Where a line goes, in `programFor()`. */
type Where = "top" | "recipe bullet" | "app bullet" | "action" | "recipe action" | "value" | "recipe value" | "end"

/** One proposed line. */
type Line = {
  /** The line in English;  several lines:  it has a body. */
  en: string
  /** The Overview's Spanish, to go through the glossary in The Words. */
  es: string
  /** Where it goes. */
  at: Where
  /** On today's parser, each language's;  one word:  both. */
  today: Status | [Status, Status]
  /** With the prototype's rules. */
  withRule: Status | [Status, Status]
  /** What a `wrong` line compiled to:  in its compiled code. */
  means?: string
  /** Top-level lines it needs, with the rules:  a place to be saved in. */
  needs?: [string, string]
  /** What the table says about it. */
  note?: string
}

/** A place to be saved in, that takes no address. */
const A_PLACE: [string, string] = ["family cookbook is this device", "recetario familiar es este dispositivo"]

/** The kinds of place, each a type (Q2):  in core, in The Words. */
const KINDS = [
  `a place is a thing
a web service is a place
a graph service is a place
a folder is a place
a file is a place
a live room is a place
a sheet is a place
an airtable base is a place
an at protocol account is a place
`,
  `un lugar es una cosa
un servicio web es un lugar
un servicio de grafos es un lugar
una carpeta es un lugar
un archivo es un lugar
una sala en vivo es un lugar
una hoja es un lugar
una base de airtable es un lugar
una cuenta de at protocol es un lugar
`
] as const

/** The program around each line, by language:  each `__WHERE__` is where a kind of line goes. */
const PROGRAMS = [
  `a person is a thing:
	- its "nickname" is text
a recipe is a thing:
	- its "title" is text
	- its "cook" is a person
	- its "minutes" is a number
	- its "prices" is a list of numbers
	- its "ingredients" is a list of ingredients
	- "is quick" if its minutes < 20
__recipe bullet__
	- to look:
		__recipe action__
		return __recipe value__
an ingredient is a thing:
	- its "name" is text
__top__
recipe box is an app:
	- its "search" is text
	- its "draft" is text
__app bullet__
	- to go:
		__action__
		set x to __value__
__end__
`,
  `una persona es una cosa:
	- su "apodo" es texto
una receta es una cosa:
	- su "título" es texto
	- su "cocinero" es una persona
	- sus "minutos" es un número
	- sus "precios" es una lista de números
	- sus "ingredientes" es una lista de ingredientes
	- "es rápida" si sus minutos < 20
__recipe bullet__
	- para mirar:
		__recipe action__
		devolver __recipe value__
un ingrediente es una cosa:
	- su "nombre" es texto
__top__
caja de recetas es una aplicación:
	- su "búsqueda" es texto
	- su "borrador" es texto
__app bullet__
	- para ir:
		__action__
		poner x a __value__
__end__
`
] as const

/** What fills the places a line doesn't. */
const NOTHING = [
  { action: "print 0", value: "1" },
  { action: "imprimir 0", value: "1" }
] as const

/**
 * Every proposed line, in the Overview's order.
 * - The declaring lines of all seven back-ends are here, Airtable's and AT Protocol's too,
 *   though those two are built after the words:  the words are tried against their odd shapes.
 */
const LINES: Line[] = [
  // ## Where it lives:  one line for each kind of place
  {
    en: 'family cookbook is a web service at "https://api.example.com/v1"',
    es: 'recetario familiar es un servicio web en "https://api.example.com/v1"',
    at: "top",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: 'family cookbook is a graph service at "https://api.example.com/gql"',
    es: 'recetario familiar es un servicio de grafos en "https://api.example.com/gql"',
    at: "top",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: 'family cookbook is a folder at "recipes"',
    es: 'recetario familiar es una carpeta en "recetas"',
    at: "top",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: 'family cookbook is a file at "recipes.json5"',
    es: 'recetario familiar es un archivo en "recetas.json5"',
    at: "top",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "family cookbook is this device",
    es: "recetario familiar es este dispositivo",
    at: "top",
    today: "compiles",
    withRule: "compiles",
    note: "no kind and no address:  its own rule, so a library can't add one of this shape"
  },
  {
    en: 'family cookbook is a live room at "wss://rooms.example.com/family"',
    es: 'recetario familiar es una sala en vivo en "wss://rooms.example.com/family"',
    at: "top",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: 'family cookbook is a sheet at "recipes.csv"',
    es: 'recetario familiar es una hoja en "recetas.csv"',
    at: "top",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: 'family cookbook is an airtable base at "appXXXXXXXXXXXXXX"',
    es: 'recetario familiar es una base de airtable en "appXXXXXXXXXXXXXX"',
    at: "top",
    today: "fails",
    withRule: "compiles"
  },
  {
    en: 'family cookbook is an at protocol account at "did:plc:abc123"',
    es: 'recetario familiar es una cuenta de at protocol en "did:plc:abc123"',
    at: "top",
    today: "fails",
    withRule: "compiles",
    note: "`at` both starts the kind's name and follows it:  it reads, because a type's name is read longest first"
  },
  {
    en: `family cookbook is each person's own at protocol account:
	- recipes are at "com.example.recipe"`,
    es: `recetario familiar es la propia cuenta de at protocol de cada persona:
	- las recetas están en "com.example.recipe"`,
    at: "top",
    today: "fails",
    withRule: "compiles",
    note: "the one that doesn't fit `is a ... at`:  its own rule, with no address"
  },
  {
    en: `family cookbook is a web service at "https://api.example.com/v1":
	- recipes are at "/dishes"
	- a recipe's title is called "dish_name"
	- its key is the secret "COOKBOOK_KEY"
	- it is checked every 30 seconds`,
    es: `recetario familiar es un servicio web en "https://api.example.com/v1":
	- las recetas están en "/platos"
	- el título de una receta se llama "nombre_plato"
	- su clave es el secreto "CLAVE_RECETARIO"
	- se revisa cada 30 segundos`,
    at: "top",
    today: "compiles",
    withRule: "compiles",
    note: "a place's details:  each its own rule, in the place's outline body"
  },
  {
    en: `family cookbook is a web service at "https://api.example.com/v1":
	- to publish (a recipe) is at "/recipes/publish"`,
    es: `recetario familiar es un servicio web en "https://api.example.com/v1":
	- para publicar (una receta) está en "/recetas/publicar"`,
    at: "top",
    today: "fails",
    withRule: "fails",
    note: "Q14's form:  `to ...` takes every word up to the text as the action's name.  See Q17 for what reads instead"
  },
  {
    en: `family cookbook is a web service at "https://api.example.com/v1":
	- to publish (a recipe):
		- it is at "/recipes/publish"`,
    es: `recetario familiar es un servicio web en "https://api.example.com/v1":
	- para publicar (una receta):
		- está en "/recetas/publicar"`,
    at: "top",
    today: "fails",
    withRule: "compiles",
    note: "the same, as an action with a detail, as `- undone as` is:  Q17's recommended form"
  },
  {
    en: "family cookbook is the cloud",
    es: "recetario familiar es la nube",
    at: "top",
    today: "fails",
    withRule: "compiles",
    note: "after the seven back-ends (Q3):  the words are ready for it"
  },
  // ## A type living there
  {
    en: "- it is saved in the family cookbook",
    es: "- se guarda en el recetario familiar",
    at: "recipe bullet",
    today: "fails",
    withRule: "compiles",
    needs: A_PLACE,
    note: "only a place's name may follow:  any expression there reads `its own file` as a property, `own`"
  },
  {
    en: "- it is saved in its own file",
    es: "- se guarda en su propio archivo",
    at: "recipe bullet",
    today: "compiles",
    withRule: "compiles",
    note: "works today, and keeps its meaning"
  },
  {
    en: "an ingredient belongs to one recipe",
    es: "un ingrediente pertenece a una receta",
    at: "top",
    today: "fails",
    withRule: "fails",
    note: "refused when its owner isn't a list and isn't saved, as today.  A saved owner:  below, `the collisions`"
  },
  // ## Reading
  {
    en: "every recipe",
    es: "cada receta",
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "a scratch list of what the program made;  for a saved type, a change of meaning, in The Words"
  },
  {
    en: "the recipes",
    es: "las recetas",
    at: "value",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "the first recipe",
    es: "la primera receta",
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "the first made;  for a saved type, the oldest"
  },
  {
    en: "every recipe where it is quick",
    es: "cada receta donde es rápida",
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "new in this phase, in the real parser (`every_thing_where`):  ran"
  },
  {
    en: "every recipe where its title includes the search",
    es: "cada receta donde su título incluye la búsqueda",
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "new in this phase:  ran"
  },
  {
    en: "every recipe, sorted by its title",
    es: "cada receta, ordenada por su título",
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "new in this phase (`list_sorted_by`):  ran.  The Overview's `cada receta, ordenadas` can't agree:  `cada` is one"
  },
  {
    en: "the first 20 recipes where it is quick",
    es: "las primeras 20 recetas donde es rápida",
    at: "value",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "the number of recipes where it is quick",
    es: "el número de recetas donde es rápida",
    at: "value",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "the total of its prices",
    es: "el total de sus precios",
    at: "recipe value",
    today: "wrong",
    withRule: "compiles",
    means: ".total",
    note: "today it silently reads a property called `total`, which isn't there.  The rule takes only a list"
  },
  {
    en: 'its "matches" is every recipe where its title includes the search, sorted by its title',
    es: 'sus "coincidencias" es cada receta donde su título incluye la búsqueda, ordenada por su título',
    at: "app bullet",
    today: "compiles",
    withRule: "compiles",
    note: "I1's sentence:  ran"
  },
  {
    en: "the nickname of its cook",
    es: "el apodo de su cocinero",
    at: "recipe value",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "the number of its ingredients",
    es: "el número de sus ingredientes",
    at: "recipe value",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: 'every recipe where its title is "Ana" or "Bo"',
    es: 'cada receta donde su título es "Ana" o "Bo"',
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "fixed in The Words (I13):  either of them.  Ran"
  },
  {
    en: 'every recipe where its title is either "Ana" or "Bo"',
    es: 'cada receta donde su título es o bien "Ana" o "Bo"',
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "fixed in The Words (I13):  either of them.  Ran"
  },
  {
    en: 'every recipe where its title is "Ana" or its title is "Bo"',
    es: 'cada receta donde su título es "Ana" o su título es "Bo"',
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "what does work, today:  ran"
  },
  {
    en: 'every recipe where its title is "Ana" and its title is "Bo"',
    es: 'cada receta donde su título es "Ana" y su título es "Bo"',
    at: "value",
    today: "compiles",
    withRule: "compiles",
    note: "can never be true, and nothing says so:  the warning is The Words'"
  },
  // ## Showing:  the riders on a read
  {
    en: `while waiting:
			print 1`,
    es: `mientras espera:
			imprimir 1`,
    at: "action",
    today: "fails",
    withRule: "compiles",
    note: "no `while` loop to collide with, whatever a program has called `waiting`"
  },
  {
    en: `if there are none:
			print 1`,
    es: `si no hay ninguna:
			imprimir 1`,
    at: "action",
    today: "fails",
    withRule: "compiles",
    note: "`ninguna` agrees with its type:  `ninguno` for a masculine one"
  },
  {
    en: `if that fails:
			print 1`,
    es: `si falla:
			imprimir 1`,
    at: "action",
    today: "fails",
    withRule: "compiles"
  },
  // ## Changing
  {
    en: 'add (a new recipe with title = "x") to the recipes',
    es: 'agregar (una nueva receta con título = "x") a las recetas',
    at: "action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "add (a new recipe with title = the draft, cook = the current person) to the recipes",
    es: "agregar (una nueva receta con título = el borrador, cocinero = la persona actual) a las recetas",
    at: "action",
    today: "fails",
    withRule: "compiles",
    note: "only for want of `the current person`"
  },
  {
    en: "remove the recipe from the recipes",
    es: "quitar la receta de las recetas",
    at: "recipe action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: 'set the title of the recipe to "x"',
    es: 'poner el título de la receta a "x"',
    at: "recipe action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: `all or nothing:
			print 1`,
    es: `todo o nada:
			imprimir 1`,
    at: "action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "set d to a draft of the recipe",
    es: "poner d a un borrador de la receta",
    at: "recipe action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "save the draft",
    es: "guardar el borrador",
    at: "action",
    today: "fails",
    withRule: "fails",
    note: "the Overview's box has its own `draft`, a text:  refused, naming why.  Of a real draft:  below, `the collisions`"
  },
  {
    en: "clear the draft",
    es: "limpiar el borrador",
    at: "action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: `- to remove it:
		- undone as "Remove Recipe"
		remove it from the recipes`,
    es: `- para quitar eso:
		- se deshace como "Quitar receta"
		quitar eso de las recetas`,
    at: "recipe bullet",
    today: "compiles",
    withRule: "compiles",
    note: "the Spanish is `quitar eso`:  `para quitarla` reads as a name, and `quitarla de ...` doesn't"
  },
  // ## Live, and other people
  {
    en: `when a recipe changes:
	print 1`,
    es: `cuando cambia una receta:
	imprimir 1`,
    at: "top",
    today: ["wrong", "fails"],
    withRule: "compiles",
    means: "a-recipe-changes",
    note: "today, in English, an event nobody sends:  silently never runs.  In Spanish, an error"
  },
  {
    en: "refresh the recipes",
    es: "recargar las recetas",
    at: "action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "the current person",
    es: "la persona actual",
    at: "value",
    today: "fails",
    withRule: "compiles"
  },
  {
    en: "the people here",
    es: "las personas presentes",
    at: "value",
    today: "fails",
    withRule: "compiles"
  },
  {
    en: `- when someone else changes it:
		print 1`,
    es: `- cuando otra persona lo cambia:
		imprimir 1`,
    at: "recipe bullet",
    today: "wrong",
    withRule: "compiles",
    means: "nSomeoneElseChangesIt|nOtraPersonaLoCambia",
    note: "not a property called `someone else`, as o3 feared:  worse, an event of that name, which never comes"
  },
  {
    en: `- when its title changes:
		print 1`,
    es: `- cuando su título cambia:
		imprimir 1`,
    at: "recipe bullet",
    today: "compiles",
    withRule: "compiles",
    note: "the Overview's `when its X changes`"
  },
  {
    en: "cancel search",
    es: "cancelar búsqueda",
    at: "action",
    today: "compiles",
    withRule: "compiles",
    note: "inside a handler, today's `cancel <event>` still takes it:  below, `the collisions`"
  },
  {
    en: `- to search:
		- a new one replaces the last one
		print 1`,
    es: `- para buscar:
		- uno nuevo reemplaza al anterior
		imprimir 1`,
    at: "app bullet",
    today: "compiles",
    withRule: "compiles",
    note: "language's;  the Overview had no Spanish for it"
  },
  // ## Words people must keep for their own actions
  {
    en: `- to load the scores:
		print 1`,
    es: `- para cargar los puntajes:
		imprimir 1`,
    at: "app bullet",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: `- to find the scores:
		print 1`,
    es: `- para buscar los puntajes:
		imprimir 1`,
    at: "app bullet",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: `- to fetch the scores:
		print 1`,
    es: `- para traer los puntajes:
		imprimir 1`,
    at: "app bullet",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "publish the recipe",
    es: "publicar la receta",
    at: "recipe action",
    today: "fails",
    withRule: "compiles",
    needs: [
      `family cookbook is a web service at "https://api.example.com/v1":
	- to publish (a recipe):
		- it is at "/recipes/publish"`,
      `recetario familiar es un servicio web en "https://api.example.com/v1":
	- para publicar (una receta):
		- está en "/recetas/publicar"`
    ],
    note: "Q14's call:  no verb of its own, an action declared under the place, called from anywhere"
  },
  {
    en: "try again",
    es: "reintentar",
    at: "action",
    today: "compiles",
    withRule: "compiles"
  },
  {
    en: "start the recipe box",
    es: "iniciar la caja de recetas",
    at: "end",
    today: "compiles",
    withRule: "compiles"
  }
]

/** `line`, in the program around it, in language `lang` (0:  English, 1:  Spanish). */
function programFor(line: Line, lang: 0 | 1, withRule: boolean): string {
  const text = lang === 0 ? line.en : line.es
  const nothing = NOTHING[lang]
  let program = PROGRAMS[lang] as string
  for (const place of ["recipe bullet", "app bullet", "top", "end"]) {
    program = program.replace(`__${place}__`, () => (line.at === place ? indented(line, text) : ""))
  }
  program = program
    .replace("__recipe action__", () => (line.at === "recipe action" ? text : nothing.action))
    .replace("__recipe value__", () => (line.at === "recipe value" ? text : nothing.value))
    .replace("__action__", () => (line.at === "action" ? text : nothing.action))
    .replace("__value__", () => (line.at === "value" ? text : nothing.value))
  if (!withRule) return program
  const needs = line.needs ? `${line.needs[lang]}\n` : ""
  return `${KINDS[lang]}${needs}${program}`
}

/** A bullet's line, indented into its type. */
function indented(line: Line, text: string): string {
  return line.at.endsWith("bullet") ? `\t${text}` : text
}

/** `src` compiled in language `lang`:  its errors, and its code. */
function compile(src: string, lang: 0 | 1, withRule: boolean) {
  const path = lang === 0 ? "/Test.spell" : withRule ? "/Test.spell" : "/Test.es.spell"
  const parentScope = withRule ? prototypeScope(lang === 0 ? "en" : "es") : undefined
  const { files } = parseSpellProject([{ path, contents: src }], parentScope ? { parentScope } : {})
  const [file] = files
  return { errors: file!.errors, code: file!.compiled, warnings: file!.warnings }
}

/** What one line came to:  a `wrong` line compiled, to what `means` looks for. */
function statusOf({ errors, code }: { errors: string[]; code: string }, means: string | undefined): Status {
  if (errors.length) return "fails"
  return means && new RegExp(means).test(code) ? "wrong" : "compiles"
}

/** Each language's status, `at`:  one word is both. */
function statusFor(status: Status | [Status, Status], lang: 0 | 1): Status {
  return typeof status === "string" ? status : status[lang]
}

/** A proposed program of many lines, as the Overview has it:  RecipeBox.spell, in each language. */
const RECIPE_BOX = [
  `family cookbook is a web service at "https://api.example.com/v1"

a "recipe" is a view:
	- it is saved in the family cookbook
	- its "title" is text
	- its "cook" is a person
	- its "minutes" is a number
	- its "ingredients" is a list of ingredients
	- to draw it:
		<ui-form value={it}>
			<ui-input name="title" aria-label="Recipe"/>
			<ui-text>{the number of its ingredients} ingredients, by {the nickname of its cook}</ui-text>
			<ui-button onClick={remove it}>Remove</ui-button>
		</ui-form>
	- to remove it:
		- undone as "Remove Recipe"
		remove it from the recipes

an "ingredient" is a thing:
	- its "name" is text
an ingredient belongs to one recipe

a "person" is a thing:
	- its "nickname" is text

recipe box is an app:
	- its "search" is text
	- its "draft" is text
	- its "matches" is every recipe where its title includes the search, sorted by its title
	- to add the draft:
		if the draft is "" return
		add (a new recipe with title = the draft, cook = the current person) to the recipes
		clear the draft
	- to draw its shelf:
		for each recipe in the matches
			draw the recipe
		while waiting:
			<ui-loader/>
		if there are none:
			<ui-text>No recipes yet.  Add the first one.</ui-text>
		if that fails:
			<ui-message color="red">
				Can't reach the cookbook right now.
				<ui-button onClick={try again}>Try again</ui-button>
			</ui-message>

start the recipe box
`,
  `recetario familiar es un servicio web en "https://api.example.com/v1"

una "receta" es una vista:
	- se guarda en el recetario familiar
	- su "título" es texto
	- su "cocinero" es una persona
	- sus "minutos" es un número
	- sus "ingredientes" es una lista de ingredientes
	- para dibujarla:
		<ui-form value={eso}>
			<ui-input name="título" aria-label="Receta"/>
			<ui-text>{el número de sus ingredientes} ingredientes, de {el apodo de su cocinero}</ui-text>
			<ui-button onClick={quitar eso}>Quitar</ui-button>
		</ui-form>
	- para quitar eso:
		- se deshace como "Quitar receta"
		quitar eso de las recetas

un "ingrediente" es una cosa:
	- su "nombre" es texto
un ingrediente pertenece a una receta

una "persona" es una cosa:
	- su "apodo" es texto

caja de recetas es una aplicación:
	- su "búsqueda" es texto
	- su "borrador" es texto
	- sus "coincidencias" es cada receta donde su título incluye la búsqueda, ordenada por su título
	- para agregar el borrador:
		si el borrador es "" devolver
		agregar (una nueva receta con título = el borrador, cocinero = la persona actual) a las recetas
		limpiar el borrador
	- para dibujar su estante:
		para cada receta en las coincidencias
			dibujar la receta
		mientras espera:
			<ui-loader/>
		si no hay ninguna:
			<ui-text>Todavía no hay recetas.</ui-text>
		si falla:
			<ui-message color="red">
				No se puede llegar al recetario.
				<ui-button onClick={reintentar}>Reintentar</ui-button>
			</ui-message>

iniciar la caja de recetas
`
] as const

/** What each line came to, for `WORDS_TABLE`. */
const found: string[] = []

describe("every line the Overview proposes", () => {
  LINES.forEach((line) => {
    const firstLine = line.en.split("\n")[0]!
    it(`${firstLine}`, () => {
      const row: string[] = []
      for (const lang of [0, 1] as const) {
        const compiledToday = compile(programFor(line, lang, false), lang, false)
        const compiledWithRule = compile(programFor(line, lang, true), lang, true)
        const today = statusOf(compiledToday, line.means)
        const withRule = statusOf(compiledWithRule, undefined)
        row.push(today, withRule)
        const errors = [compiledToday.errors, compiledWithRule.errors]
        expect({ lang, today, withRule }, JSON.stringify(errors)).toEqual({
          lang,
          today: statusFor(line.today, lang),
          withRule: statusFor(line.withRule, lang)
        })
      }
      found.push(`| \`${firstLine}\` | \`${line.es.split("\n")[0]}\` | ${row.join(" | ")} | ${line.note ?? ""} |`)
    })
  })

  afterAll(() => {
    const path = process.env.WORDS_TABLE
    if (!path) return
    const head =
      "| Line | Spanish | en today | en with rule | es today | es with rule | Note |\n| --- | --- | --- | --- | --- | --- | --- |"
    writeFileSync(path, `${head}\n${found.join("\n")}\n`)
  })
})

describe("the recipe box, whole", () => {
  it("compiles in English with the rules, and draws from its loop (I14)", () => {
    const { errors, code } = compile(`${KINDS[0]}${RECIPE_BOX[0]}`, 0, true)
    expect(errors).toEqual([])
    expect(code).toContain("core.map(this.matches, (recipe) => core.drawThing(recipe))")
    expect(code).toContain("return core.map(this.matches")
  })

  it("compiles in Spanish with the rules", () => {
    expect(compile(`${KINDS[1]}${RECIPE_BOX[1]}`, 1, true).errors).toEqual([])
  })

  it("names what's still missing, without the rules", () => {
    const { errors } = compile(RECIPE_BOX[0], 0, false)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe("the collisions", () => {
  /** The errors of `lines` in English, with the rules. */
  const errorsOf = (...lines: string[]) => compile(`${KINDS[0]}${lines.join("\n")}\n`, 0, true).errors
  /** The code of `lines` in English, with the rules. */
  const codeOf = (...lines: string[]) => compile(`${KINDS[0]}${lines.join("\n")}\n`, 0, true).code

  it("is saved in: a place's name, so `is saved in its own file` keeps its meaning", () => {
    const code = codeOf("a recipe is a thing:", "\t- it is saved in its own file")
    expect(code).toContain("savedInFile = true")
  })

  it("belongs to one: a saved owner needn't be a list, one in memory is still refused", () => {
    const owner = ["family cookbook is this device", "a recipe is a thing:", "\t- it is saved in the family cookbook"]
    expect(errorsOf(...owner, "an ingredient is a thing", "an ingredient belongs to one recipe")).toEqual([])
    expect(errorsOf("a pile is a thing", "a card is a thing", "a card belongs to one pile")[0]).toContain(
      "isn't a list"
    )
    const spanish = [
      "recetario familiar es este dispositivo",
      "una receta es una cosa:",
      "\t- se guarda en el recetario familiar",
      "un ingrediente es una cosa",
      "un ingrediente pertenece a una receta"
    ]
    expect(compile(`${KINDS[1]}${spanish.join("\n")}\n`, 1, true).errors).toEqual([])
  })

  it("every recipe: the words are the same, so a saved type must be known where it's read", () => {
    // in memory, as ever:  a scratch list
    expect(codeOf("a recipe is a thing", "set x to every recipe")).toContain("core.everyThing(Recipe)")
    const place = "family cookbook is this device"
    const recipe = ["a recipe is a thing:", "\t- it is saved in the family cookbook"]
    // below the type, a read can tell it's saved
    expect(codeOf(place, ...recipe, "set below to saved yet recipe")).toContain("const below = true")
    // above it, only the type's name is known, as every type's is before a project parses:  The Words must note more
    expect(codeOf(place, "set above to saved yet recipe", ...recipe)).toContain("const above = false")
  })

  it("a kind of place is a type: a library adds one, and only a place is one", () => {
    expect(errorsOf("a supabase project is a place", 'family cookbook is a supabase project at "https://x"')).toEqual(
      []
    )
    expect(errorsOf("a person is a thing", 'family cookbook is a person at "https://x"').length).toBe(1)
  })

  it("the total of: a list only, so a type's own `total` stays what it was", () => {
    const order = ["an order is a thing:", '\t- its "total" is a number', '\t- its "prices" is a list of numbers']
    const code = codeOf(
      ...order,
      "\t- to look:",
      "\t\tset a to the total of it",
      "\t\tset b to the total of its prices"
    )
    expect(code).toContain("const a = this.total")
    expect(code).toContain('core.proposed("the total of its prices")')
  })

  it("a program's own action of the same words wins over refresh, and find and load stay free", () => {
    const box = [
      "recipe box is an app:",
      "\t- to refresh the recipes:",
      "\t\tprint 1",
      "\t- to load the scores:",
      "\t\tprint 2",
      "\t- to find the scores:",
      "\t\tprint 3",
      "\t- to go:",
      "\t\trefresh the recipes",
      "\t\tload the scores",
      "\t\tfind the scores"
    ]
    const code = codeOf("a recipe is a thing", ...box)
    expect(code).toContain("this.refreshTheRecipes()")
    expect(code).toContain("this.loadTheScores()")
    expect(code).toContain("this.findTheScores()")
  })

  it("cancel search: an action's name, inside a handler too", () => {
    const box = [
      "recipe box is an app:",
      "\t- to search:",
      "\t\tprint 1",
      "\t- to go:",
      "\t\tcancel search",
      "\t\ton closing:",
      "\t\t\tcancel search"
    ]
    const code = codeOf(...box)
    // an action's name beats an event's, in a handler too:  The Words' decision
    expect(code.match(/core\.cancelActions\(this, "search"\)/g)).toHaveLength(2)
  })

  it("save: of a draft only, and of anything else it says there's no save step", () => {
    const box = [
      "a recipe is a thing",
      "recipe box is an app:",
      '\t- its "draft" is text',
      "\t- to go:",
      "\t\tset d to a draft of (a new recipe)",
      "\t\tsave d",
      "\t\tsave the draft"
    ]
    const errors = errorsOf(...box)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("no save step")
  })

  it("a rider takes a line of markup in a drawing, as `otherwise` does", () => {
    const box = [
      "a recipe is a view",
      "recipe box is an app:",
      "\t- to draw it:",
      "\t\twhile waiting:",
      "\t\t\t<ui-loader/>"
    ]
    expect(errorsOf(...box)).toEqual([])
  })
})

describe("the words that run today", () => {
  /** A program of recipes, run, and each by its title. */
  const titlesOf = (list: { items: Array<{ title: string }> }) => list.items.map((recipe) => recipe.title)

  beforeEach(() => core.things.clear())

  it("runs I1's sentence: the search is the app's, its title each recipe's, sorted, no case", () => {
    const run = runSpellFiles(
      [
        {
          path: "/Test.spell",
          contents: `a recipe is a thing:
	- its "title" is text
	- its "minutes" is a number
	- "is quick" if its minutes < 20
recipe box is an app:
	- its "search" is text
	- its "matches" is every recipe where its title includes the search, sorted by its title
set a to a new recipe with title = "stew", minutes = 90
set b to a new recipe with title = "Soup", minutes = 15
set c to a new recipe with title = "Toast", minutes = 3
set quick to every recipe where it is quick
set sorted to every recipe, sorted by its minutes
set either to every recipe where its title is "Soup" or its title is "Toast"
set alwaysToo to every recipe where its title is either "Soup" or "Toast"
set always to every recipe where its title is "Soup" or "Toast"
set never to every recipe where its title is "Soup" and its title is "Toast"
set many to the number of every recipe
`
        }
      ],
      { registered: true }
    )
    const result = run("recipeBox, quick, sorted, either, always, alwaysToo, never, many") as Record<string, never>
    const box = result.recipeBox as { search: string; matches: { items: Array<{ title: string }> } }
    box.search = "o"
    expect(titlesOf(box.matches)).toEqual(["Soup", "Toast"])
    box.search = "t"
    expect(titlesOf(box.matches)).toEqual(["stew", "Toast"])
    expect(titlesOf(result.quick)).toEqual(["Soup", "Toast"])
    expect(titlesOf(result.sorted)).toEqual(["Toast", "Soup", "stew"])
    expect(titlesOf(result.either)).toEqual(["Soup", "Toast"])
    // the Overview's `is "Ana" or "Bo"`, and with `either`:  either of them, since The Words (I13)
    expect(titlesOf(result.always)).toEqual(["Soup", "Toast"])
    expect(titlesOf(result.alwaysToo)).toEqual(["Soup", "Toast"])
    expect(titlesOf(result.never)).toEqual([])
    expect(result.many).toBe(3)
  })

  it("runs it in Spanish", () => {
    const run = runSpellFiles(
      [
        {
          path: "/Test.es.spell",
          contents: `una receta es una cosa:
	- su "título" es texto
caja de recetas es una aplicación:
	- su "búsqueda" es texto
	- sus "coincidencias" es cada receta donde su título incluye la búsqueda, ordenada por su título
poner guiso a una nueva receta con título = "guiso"
poner sopa a una nueva receta con título = "Sopa"
`
        }
      ],
      { registered: true }
    )
    const { cajaDeRecetas: box } = run("cajaDeRecetas") as {
      cajaDeRecetas: { búsqueda: string; coincidencias: { items: Array<{ title: string; título: string }> } }
    }
    box.búsqueda = "o"
    expect(box.coincidencias.items.map((receta) => receta.título)).toEqual(["guiso", "Sopa"])
  })
})
