import { describe, expect, test } from "vite-plus/test"

import { core } from "spell/parser/core"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * What the `data` epic found that's about the language (epic `language` P15, request r2):  each held to what it should be.
 * - Silent mistakes became errors or warnings;  English and Spanish agree.
 */

/** `contents`, parsed whole, as `path`:  what it compiled to, its errors and its warnings. */
function parsed(contents: string, path = "/Test.spell") {
  return parseSpellProject([{ path, contents }]).files[0]!
}

/** `contents` as `target` writes it. */
function written(contents: string, target: string, path = "/Test.spell"): string {
  const { files } = parseSpellProject([{ path, contents }])
  const parts = files.map(({ match }) => match?.AST as P.ASTStatementGroup)
  return SP.SpellProject.combineCompiled(parts, SP.TARGETS[target]!.writer)
}

describe("`stop it`", () => {
  test("is the thing's own action, once it has one", () => {
    const { compiled, errors } = parsed(`a clock is a thing:
	- to stop it:
		set x to 1
	- to tick it:
		stop it
`)
    expect(errors).toEqual([])
    expect(compiled).toContain("this.stop()")
  })

  test("`stop search` beside `search` is the action of those words", () => {
    const { compiled, errors } = parsed(`a clock is a thing:
	- to search it:
		set x to 1
	- to stop search:
		set y to 1
	- to tick it:
		stop search
`)
    expect(errors).toEqual([])
    expect(compiled).toContain("stopSearch()")
  })
})

describe("a line in an element that reads as a statement", () => {
  const SHELF = (line: string) => `a book is a thing:
	- it has a title as text
a shelf is an app:
	- its "books" is a list of books
	- to draw:
		<div>
			${line}
		</div>
`
  test.each(["for each book in its books", "draw its books"])("%s warns, and says what to write", (line) => {
    const { warnings, errors } = parsed(SHELF(line))
    expect(errors).toEqual([])
    expect(warnings.join()).toContain(`"${line}" shows as text`)
    expect(warnings.join()).toContain("{for book in its books: draw book}")
  })

  test("what the warning says to write compiles, and draws through a loop", () => {
    const { compiled, errors } = parsed(SHELF("{for book in its books: draw book}"))
    expect(errors).toEqual([])
    expect(compiled).toContain("core.listDrawn(")
  })

  test("a sentence starting the same way stays quiet", () => {
    const { warnings } = parsed(SHELF("for each person who reads, a book"))
    expect(warnings.join()).not.toContain("shows as text")
  })

  test("Spanish too", () => {
    const { warnings } = parsed(
      `un libro es una cosa:
	- tiene un título como texto
un estante es una app:
	- tiene libros como una lista de libros
	- para dibujar:
		<div>
			para cada libro en sus libros
		</div>
`,
      "/Test.es.spell"
    )
    expect(warnings.join()).toContain("se muestra como texto")
  })
})

describe("a body that's only a comment", () => {
  const CLOCK = `a clock is a thing:
	- it has a count as a number
	- to tick it:
		if its count is 1
			set x to 1
		otherwise if its count is 2
			// nothing yet
		otherwise
			// nor here
		if its count is 3
			// only a comment
		set y to 2
`
  test("javascript:  the comment doesn't swallow the brace", () => {
    const js = written(CLOCK, "js/solid")
    expect(js).not.toMatch(/\/\/ [a-z ]+ \}/)
    expect(js).toMatch(/else if \(this\.count === 2\) \{\n\s*\/\/ nothing yet\n\s*\} else \{\n\s*\/\/ nor here\n\s*\}/)
  })

  test("Python:  `pass` follows it", () => {
    const py = written(CLOCK, "py")
    expect(py).toMatch(/elif self\.count == 2:\n\s*# nothing yet\n\s*pass/)
    expect(py).toMatch(/else:\n\s*# nor here\n\s*pass/)
  })
})

describe("`includes`, `starts with`, `ends with`", () => {
  const IN = (line: string, path?: string) =>
    written(`a box is a thing:\n\t- it has a title as text\n\t- to check it:\n\t\t${line}\n`, "js/solid", path)

  test("text ignores capitals;  a list's items don't", () => {
    expect(core.includes("Hello there", "hello")).toBe(true)
    expect(core.includes("Hello there", "hello", "THERE")).toBe(true)
    expect(core.includes("Hello there", "bye")).toBe(false)
    expect(core.startsWith("Hello", "he")).toBe(true)
    expect(core.endsWith("Hello", "LO")).toBe(true)
    expect(core.includes(["Hello"], "hello")).toBe(false)
    expect(core.includes(["Hello"], "Hello")).toBe(true)
  })

  test("`exactly` counts them", () => {
    expect(core.includesExactly("Hello", "hello")).toBe(false)
    expect(core.includesExactly("Hello", "Hell")).toBe(true)
    expect(core.startsWithExactly("Hello", "he")).toBe(false)
    expect(core.startsWithExactly("Hello", "He")).toBe(true)
    expect(core.endsWithExactly("Hello", "LO")).toBe(false)
    expect(core.endsWithExactly("Hello", "lo")).toBe(true)
  })

  test("what's written", () => {
    expect(IN(`if its title includes "hi": set x to 1`)).toContain(`core.includes(this.title, "hi")`)
    expect(IN(`if its title includes exactly "hi": set x to 1`)).toContain(`this.title.includes("hi")`)
    expect(IN(`if its title includes ".": set x to 1`)).toContain(`this.title.includes(".")`)
    expect(IN(`if its title does not include exactly "hi": set x to 1`)).toContain(`!this.title.includes("hi")`)
    expect(IN(`if its title starts with exactly "hi": set x to 1`)).toContain(
      `core.startsWithExactly(this.title, "hi")`
    )
    expect(IN(`if its title ends with "hi": set x to 1`)).toContain(`core.endsWith(this.title, "hi")`)
  })

  test("Spanish says `exactamente`", () => {
    const es = (line: string) =>
      written(
        `una caja es una cosa:\n\t- tiene un título como texto\n\t- para mirarla:\n\t\t${line}\n`,
        "js/solid",
        "/Test.es.spell"
      )
    expect(es(`si su título incluye "hi": poner x a 1`)).toContain(`core.includes(this.título, "hi")`)
    expect(es(`si su título incluye exactamente "hi": poner x a 1`)).toContain(`this.título.includes("hi")`)
  })
})

describe("`if it is empty`", () => {
  const SHELF = `a pile is a list
a book is a thing:
	- it has a title as text
a shelf is a thing:
	- it has a name as text
	- it has a stack as a new pile
	- to check it:
		if it is empty: set x to 1
		if its stack is empty: set y to 1
		if its name is empty: set z to 1
	- to look it up:
		get every book
		if it is empty: set x to 1
`
  test("a thing that holds no items warns, once, naming the words that work", () => {
    const { warnings, errors } = parsed(SHELF)
    expect(errors).toEqual([])
    const found = warnings.filter((warning) => warning.includes("never empty"))
    expect(found).toHaveLength(1)
    expect(found[0]).toContain(`A shelf isn't a list`)
    expect(found[0]).toContain("if its books is empty")
  })

  test("what the warning says to write compiles", () => {
    const { compiled, errors } = parsed(`a shelf is a thing:
	- its "books" is a list of text
	- to check it:
		if its books is empty: set x to 1
`)
    expect(errors).toEqual([])
    expect(compiled).toContain("this.books")
  })

  test.each([
    ["a text property", `get its name\n\t\tif it is empty: set x to 1`],
    ["a text in a loop", `for each word in ["a", ""]\n\t\t\tif it is empty: set x to 1`],
    ["a text local", `set word to ""\n\t\tif word is empty: set x to 1`],
    ["an argument of no known type", `set word to its unknown thing\n\t\tif word is empty: set x to 1`]
  ])("it holding %s stays quiet", (_title, lines) => {
    const { warnings } = parsed(`a shelf is a thing:\n\t- it has a name as text\n\t- to check it:\n\t\t${lines}\n`)
    expect(warnings.join()).not.toContain("never empty")
  })

  test.each([
    ["un texto en un bucle", `para cada palabra en ["a", ""]\n\t\t\tsi eso está vacío: poner x a 1`],
    ["un texto local", `poner palabra a ""\n\t\tsi palabra está vacío: poner x a 1`]
  ])("Spanish:  %s stays quiet", (_title, lines) => {
    const { warnings } = parsed(
      `un estante es una cosa:\n\t- tiene un nombre como texto\n\t- para mirarlo:\n\t\t${lines}\n`,
      "/Test.es.spell"
    )
    expect(warnings.join()).not.toContain("nada que vaciar")
  })

  test("Spanish:  a thing warns", () => {
    const { warnings } = parsed(
      `un estante es una cosa:\n\t- para mirarlo:\n\t\tsi eso está vacío: poner x a 1\n`,
      "/Test.es.spell"
    )
    expect(warnings.join()).toContain("nada que vaciar")
  })

  test("an app warns too", () => {
    const { warnings } = parsed(`a shelf is an app:\n\t- to check it:\n\t\tif it is empty: set x to 1\n`)
    expect(warnings.join()).toContain("never empty")
  })

  test("a type built on text stays quiet", () => {
    const { warnings } = parsed(`a label is a text:\n\t- to check it:\n\t\tif it is empty: set x to 1\n`)
    expect(warnings.join()).not.toContain("never empty")
  })

  test("a list's type stays quiet", () => {
    const { warnings } = parsed(`a pile is a list:
	- to check it:
		if it is empty: set x to 1
`)
    expect(warnings.join()).not.toContain("never empty")
  })
})

describe("types made from each other", () => {
  test("two:  refused, naming the circle", () => {
    const { errors } = parsed(`a chicken is a thing:
	- it has an egg as a new egg
an egg is a thing:
	- it has a chicken as a new chicken
`)
    expect(errors.join()).toContain("each makes the next as it's made")
    expect(errors.join()).toContain("chicken => the egg => the chicken")
  })

  test("three, declared in any order", () => {
    const { errors } = parsed(`a farm is a thing:
	- it has a barn as a new barn
a stall is a thing:
	- it has a farm as a new farm
a barn is a thing:
	- it has a stall as a new stall
`)
    expect(errors.join()).toContain("each makes the next")
  })

  test("itself, and through a type it's built on", () => {
    expect(parsed(`a link is a thing:\n\t- it has a follower as a new link\n`).errors.join()).toContain(
      "each makes the next"
    )
    const { errors } = parsed(`a base is a thing:
	- it has a part as a new part
a part is a base
`)
    expect(errors.join()).toContain("each makes the next")
  })

  test("one held with no `new` breaks the circle", () => {
    const { errors } = parsed(`a chicken is a thing:
	- it has an egg as a new egg
an egg is a thing:
	- it has a chicken as a chicken
`)
    expect(errors).toEqual([])
  })

  test("Spanish too", () => {
    const { errors } = parsed(
      `una gallina es una cosa:
	- tiene un huevo como un nuevo huevo
un huevo es una cosa:
	- tiene una gallina como una nueva gallina
`,
      "/Test.es.spell"
    )
    expect(errors.join()).toContain("cada uno hace el siguiente")
  })
})

describe("the suggestion for a list that doesn't say what it holds", () => {
  test("`is a new list`:  what it says to write compiles", () => {
    const { warnings } = parsed(`a shelf is a thing:\n\t- its "books" is a new list\n`)
    const said = /e\.g\. "(.*)"$/.exec(warnings.find((it) => it.includes(`holds`))!)![1]!
    expect(said).toBe(`its "books" is a list of text`)
    const { errors, warnings: after } = parsed(`a shelf is a thing:\n\t- ${said}\n`)
    expect(errors).toEqual([])
    expect(after.join()).not.toContain("holds")
  })

  test("`as a new list` keeps its long form", () => {
    const { warnings } = parsed(`a shelf is a thing\na shelf has a property books as a new list\n`)
    expect(warnings.join()).toContain("as a new list of")
  })

  test("Spanish:  what it says to write compiles", () => {
    const path = "/Test.es.spell"
    const { warnings } = parsed(`un estante es una cosa:\n\t- sus "libros" es una nueva lista\n`, path)
    const said = /p\. ej\. "(.*)"$/.exec(warnings.find((it) => it.includes(`contiene`))!)![1]!
    expect(said).toContain("una lista de")
    expect(parsed(`un estante es una cosa:\n\t- ${said}\n`, path).errors).toEqual([])
  })
})

describe("`where the person is the cook`", () => {
  const BOX = (where: string) => `a recipe is a record:
	- it has a title as text
	- it has a cook as text
a box is an app:
	- it has a cook as text
	- its "mine" is every recipe where ${where}
`
  const CAJA = (where: string) => `una receta es un registro:
	- tiene un título como texto
	- tiene un cocinero como texto
una caja es una app:
	- tiene un cocinero como texto
	- su "mía" es cada receta donde ${where}
`

  test.each([
    ["the person is the cook", "core.isCurrentPerson(recipe.cook)"],
    ["the person is not the cook", "!core.isCurrentPerson(recipe.cook)"],
    ["they are the cook", "core.isCurrentPerson(recipe.cook)"],
    ["the person is the cook of the box", "core.isCurrentPerson(this.cook)"]
  ])("English:  %s", (where, js) => {
    const { compiled, errors } = parsed(BOX(where))
    expect(errors).toEqual([])
    expect(compiled).toContain(js)
  })

  test("Spanish means the same", () => {
    const { compiled, errors } = parsed(CAJA("la persona es el cocinero"), "/Test.es.spell")
    expect(errors).toEqual([])
    expect(compiled).toContain("core.isCurrentPerson(receta.cocinero)")
  })

  test("a field it hasn't got says so", () => {
    const { errors } = parsed(BOX("the person is the chef"))
    expect(errors.join()).toMatch(/chef/)
  })

  test("outside a `where`, it's the thing's own, as ever", () => {
    const { compiled, errors } = parsed(`a box is an app:
	- it has a cook as text
	- to check it:
		if the person is the cook: set x to 1
`)
    expect(errors).toEqual([])
    expect(compiled).toContain("core.isCurrentPerson(this.cook)")
  })
})

describe("`- to it:`", () => {
  test("an ordinary message, not the whole compile stopped", () => {
    const { errors } = parsed(`a shelf is a thing:\n\t- to it:\n\t\tset x to 1\n`)
    expect(errors.join()).toContain(`doesn't name an action`)
  })
})
