/**
 * What the compiler gathers of a program's reads from its places (epic `data` P12), compiled here.
 * - What the running page does with it is `core`'s:  `tests/core/savedReads.test.ts`.
 * - The measured table over every built-in project, and the first load in a real browser, are the app folder's:
 *   its `tests/spell/readGathering.test.ts`, `tests/spell/recipeBox.test.ts`.
 */
import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

const PLACE = 'family cookbook is a graphql server at "https://x.example/graphql"'

/** A recipe with fields no part reads, and a tag, saved beside it. */
const TYPES = `a recipe is a thing:
	- it is saved in the family cookbook
	- its "title" is text
	- its "minutes" is a number
	- its "notes" is text
	- its "label" is its title
a tag is a thing:
	- it is saved in the family cookbook
	- its "word" is text
	- its "colour" is text`

/** `lines`, compiled as a whole project is:  its code, and the warnings it leaves on its lines. */
function compile(...lines: string[]) {
  const { files, scope } = parseSpellProject([{ path: "/Test.spell", contents: `${lines.join("\n")}\n` }])
  const errors = files.flatMap((file) => file.errors)
  if (errors.length) throw new Error(errors.join("\n"))
  const code = SP.SpellProject.combineCompiled(
    files.map(({ match }) => match?.AST as P.ASTStatementGroup),
    P.JSWriter.instance,
    "",
    scope
  )
  const warnings = files.flatMap(({ match }) => SP.SpellWarnings.in(match!).map(({ message }) => message))
  return { code: code.replace(/\s+/g, " "), warnings }
}

describe("a program with no place", () => {
  test("gathers nothing, and compiles as it did", () => {
    const { code } = compile('a card is a thing:\n\t- its "rank" is a number\n\t- its "label" is its rank')
    expect(code).not.toContain("declaredAt")
    expect(code).not.toContain("readsFrom")
    expect(code).not.toContain("select:")
    const { files, scope } = parseSpellProject([
      { path: "/T.spell", contents: 'a card is a thing:\n\t- its "rank" is a number\n' }
    ])
    const statements = [(files[0]!.match!.AST as P.ASTStatementGroup).statements ?? []]
    expect(P.ReadGathering.of(statements, P.WriterProject.of(statements, scope), { scope })).toBeUndefined()
  })
})

describe("the fields it asks for", () => {
  const app = (draw: string) => `box is an app:
	- to draw it:
		for each recipe in every recipe
${draw}
start the box`

  test("are those anything reads:  a draw's, through a getter, an action's;  the rest are left out", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      app("\t\t\t<ui-text>{the label of the recipe}</ui-text>"),
      "to show the minutes of (a recipe):\n\tprint the minutes of the recipe"
    )
    expect(code).toContain(
      'static savedIn = { place: "family_cookbook", collection: "recipes", times: ["created", "modified"], select: ["title", "minutes"] }'
    )
  })

  test("join by name:  a read of a field through something it can't tell the type of still counts", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      app("\t\t\tdraw the recipe"),
      "to show the notes of (x):\n\tprint the notes of x"
    )
    expect(code).toContain('select: ["title", "notes"]')
  })

  test("a form's control names a field:  a read, written out", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      app('\t\t\t<ui-form value={the recipe}><ui-input name="minutes"/></ui-form>')
    )
    expect(code).toContain('select: ["title", "minutes"]')
  })

  test("a thing people can remove is read whole, so undo can put it all back:  and says nothing", () => {
    const { code, warnings } = compile(
      PLACE,
      TYPES,
      "to throw out (a recipe):\n\tremove it from the recipes",
      app("\t\t\tdraw the recipe")
    )
    expect(code).toContain('collection: "recipes" }')
    expect(code).not.toContain('collection: "recipes", select')
    expect(warnings.join()).not.toContain("whole")
  })

  test("a field named by a value reads the whole thing, with a note on its line, in the program's language", () => {
    const { code, warnings } = compile(
      PLACE,
      TYPES,
      'the field is "title"',
      app("\t\t\t<ui-form value={the recipe}><ui-input name={the field}/></ui-form>")
    )
    expect(code).not.toContain('collection: "recipes", select')
    expect(warnings.join()).toContain("the recipe is read whole")
  })

  test("a thing handed to an element reads the whole thing, with a note", () => {
    const { code, warnings } = compile(PLACE, TYPES, app("\t\t\t<ui-text thing={the recipe}/>"))
    expect(code).not.toContain('collection: "recipes", select')
    expect(warnings.join()).toContain("element reads")
  })
})

// Spell never reads ahead (epic `data` P12's first reads, gone):  a page reads only what it draws, as it draws it.
// These were the first reads' own tests, rewritten as the behaviour changed on purpose:  they asserted every list a
// first draw could reach went on the place's line, to be asked before anything drew it.
describe("what's read before a page draws it", () => {
  /** An app whose first draw reads both types, one through a view of the other. */
  const DRAWS_BOTH = [
    `box is an app:
	- to draw it:
		for each recipe in every recipe
			draw the recipe
start the box`,
    `to draw (a recipe):
	for each tag in every tag
		<ui-text>{the word of the tag}</ui-text>`
  ]

  test("nothing, by itself:  the place's line names no read, however many a first draw reaches", () => {
    const { code } = compile(PLACE, TYPES, ...DRAWS_BOTH)
    expect(code).not.toContain("readOnStartup")
    expect(code).not.toContain("firstReads")
  })

  test("a collection whose place says it's read on startup, and only it", () => {
    const { code } = compile(
      `${PLACE}
	- tags are read on startup`,
      TYPES.replace(/\t- it is saved in the family cookbook/g, "\t- it lives in family cookbook"),
      ...DRAWS_BOTH
    )
    expect(code).toContain('readOnStartup: ["Tag"] })')
    expect(code).not.toContain('Recipe"] })')
  })

  test("two lines name both", () => {
    const { code } = compile(
      `${PLACE}
	- tags are read on startup
	- recipes are read on startup`,
      TYPES.replace(/\t- it is saved in the family cookbook/g, "\t- it lives in family cookbook"),
      ...DRAWS_BOTH
    )
    expect(code).toContain('readOnStartup: ["Tag", "Recipe"] })')
  })

  test("in Spanish:  `se leen al arrancar`", () => {
    const { files } = parseSpellProject([
      {
        path: "/Prueba.es.spell",
        contents: [
          'tienda es un servidor web en "https://tienda.test"',
          "\t- los artículos se leen al arrancar",
          "un artículo es una cosa",
          "\t- vive en tienda",
          ""
        ].join("\n")
      }
    ])
    expect(files.flatMap((file) => file.errors)).toEqual([])
    const code = SP.SpellProject.combineCompiled(
      files.map(({ match }) => match?.AST as P.ASTStatementGroup),
      P.JSWriter.instance,
      ""
    )
    expect(code).toContain('readOnStartup: ["Artículo"]')
  })
})

describe("where it's declared", () => {
  test("a saved property and a worked-out value carry their line;  an app's own stored property doesn't", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      `box is an app:
	- its "search" is text
	- its "matches" is every recipe where its title includes the search
start the box`
    )
    expect(code).toMatch(
      /declareProp\("title", \{ type: "text", declaredAt: \{ path: "\/Test\.spell", start: \d+, end: \d+ \} \}\)/
    )
    expect(code).toMatch(
      /declareProp\("label", \{ declaredAt: \{ path: "\/Test\.spell", start: \d+, end: \d+ \}, readsFrom: \["family_cookbook"\] \}\)/
    )
    expect(code).toMatch(/declareProp\("matches", \{ declaredAt: .*?, readsFrom: \["family_cookbook"\] \}\)/)
    expect(code).toContain('declareProp("search", { type: "text" })')
  })

  test("each line's own offsets", () => {
    const source = `${PLACE}\n${TYPES}\n`
    const { code } = compile(PLACE, TYPES)
    const [, start, end] =
      /declareProp\("minutes", \{ type: "number", declaredAt: \{ path: "\/Test\.spell", start: (\d+), end: (\d+)/.exec(
        code
      )!
    expect(source.slice(Number(start), Number(end))).toBe('its "minutes" is a number')
  })

  test("the TypeScript target says the same", () => {
    const { files, scope } = parseSpellProject([{ path: "/Test.spell", contents: `${PLACE}\n${TYPES}\n` }])
    const code = SP.SpellProject.combineCompiled(
      files.map(({ match }) => match?.AST as P.ASTStatementGroup),
      P.TSWriter.instance,
      "",
      scope
    )
    expect(code).toMatch(/@prop\(\{ type: "text", declaredAt: \{ path: "\/Test\.spell"/)
  })
})

describe("what's listened to counts as read (epic `data` P13)", () => {
  const SELECT =
    /static savedIn = \{ place: "family_cookbook", collection: "recipes", times: \[[^\]]*\], select: \[([^\]]*)\]/

  test("`when its notes changes` reads notes, with nothing else that does, or it would be left out", () => {
    const read = compile(
      PLACE,
      TYPES,
      "recipe box is an app:",
      "\t- to draw it:",
      "\t\tfor each recipe in every recipe",
      "\t\t\t<ui-text>{the title of the recipe}</ui-text>"
    )
    expect(SELECT.exec(read.code)?.[1]).not.toContain("notes")
    const heard = compile(
      PLACE,
      TYPES.replace('\t- its "notes" is text', '\t- its "notes" is text\n\t- when its notes changes:\n\t\tprint 1'),
      "recipe box is an app:",
      "\t- to draw it:",
      "\t\tfor each recipe in every recipe",
      "\t\t\t<ui-text>{the title of the recipe}</ui-text>"
    )
    expect(SELECT.exec(heard.code)?.[1]).toContain('"notes"')
  })

  test("`when someone else changes it` and `when a recipe changes` hear every field:  it's read whole", () => {
    const app = [
      "recipe box is an app:",
      "\t- to draw it:",
      "\t\tfor each recipe in every recipe",
      "\t\t\t<ui-text>{the title of the recipe}</ui-text>"
    ]
    const someone = compile(
      PLACE,
      TYPES.replace(
        '\t- its "notes" is text',
        '\t- its "notes" is text\n\t- when someone else changes it:\n\t\tprint 1'
      ),
      ...app
    )
    expect(SELECT.exec(someone.code)).toBeNull()
    expect(SELECT.exec(compile(PLACE, TYPES, "when a recipe changes:", "\tprint 1", ...app).code)).toBeNull()
  })
})
