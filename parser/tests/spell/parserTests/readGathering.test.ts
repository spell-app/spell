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

const PLACE = 'family cookbook is a graph service at "https://x.example/graphql"'

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
    expect(code).not.toContain("firstReads")
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
      'static savedIn = { place: "family_cookbook", collection: "recipes", select: ["title", "minutes"] }'
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

describe("what a first draw reads", () => {
  test("two reads a draw can reach go on the place's line, the part drawn from it too;  in a function", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      `box is an app:
	- to draw it:
		for each recipe in every recipe
			draw the recipe
start the box`,
      `to draw (a recipe):
	for each tag in every tag
		<ui-text>{the word of the tag}</ui-text>`
    )
    expect(code).toContain("firstReads: () => [[Recipe], [Tag]] })")
  })

  test("one read alone asks for itself", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      "box is an app:\n\t- to draw it:\n\t\tfor each recipe in every recipe\n\t\t\tdraw the recipe\nstart the box"
    )
    expect(code).not.toContain("firstReads")
  })

  test("what only a handler reads isn't part of a first draw", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      `box is an app:
	- to reset:
		for each tag in every tag
			print the word of the tag
	- to draw it:
		<ui-button onClick={reset}>Reset</ui-button>
		for each recipe in every recipe
			draw the recipe
start the box`
    )
    expect(code).not.toContain("firstReads")
  })

  test("a read whose value is known only when it's drawn asks for itself", () => {
    const { code } = compile(
      PLACE,
      TYPES,
      `box is an app:
	- its "wanted" is a number
	- its "quick" is every recipe where its minutes is the wanted
	- its "words" is every tag where its word is "soup"
	- to draw it:
		for each recipe in the quick
			draw the recipe
		for each tag in the words
			<ui-text>{the word of the tag}</ui-text>
		for each tag in every tag
			<ui-text>{the word of the tag}</ui-text>
start the box`
    )
    expect(code).toContain('firstReads: () => [[Tag], [Tag, { filter: { word: "soup" } }]] })')
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
