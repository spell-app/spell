import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * What rewriting the built-in examples found about the language (epic `language` P30, fixed in P31):
 * each was worked around in an example;  each is held here to what it should be.
 */

/** `contents`, parsed whole, as `path`:  what it compiled to, its errors and its warnings. */
function parsed(contents: string, path = "/Test.spell") {
  return parseSpellProject([{ path, contents }]).files[0]!
}

beforeAll(registerTestComponentPack)

describe("a possessive after a `where` (T47)", () => {
  test("is the condition's last name's, not the whole list's", () => {
    const { compiled, errors, warnings } = parsed(`a film is a thing:
	- it has a title as text
a guide is an app:
	- it has a search as text
	- to look around:
		set matches to a new list of things
		for film in every film where its title includes the guide's search
			add the film to matches
`)
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(compiled).toContain("core.includes(film.title, this.search))")
  })
})

describe("a possessive in a drawing's `{draw each ... in ...}` (T48)", () => {
  const WEATHER = (hole: string) => `an hour is a thing:
	- it has a time as text
	- to draw:
		<tr><td>{its time}</td></tr>
a forecast is a thing:
	- its "hours" is a list of hours
a weather is an app:
	- its "forecast" is a forecast
	- to draw:
		<table>
			${hole}
		</table>
`
  test("reads the possessive as the list", () => {
    const { compiled, errors } = parsed(WEATHER("{draw each hour in its forecast's hours}"))
    expect(errors).toEqual([])
    expect(compiled).toContain("core.drawItems(this.forecast?.hours)")
  })

  test("a refusal inside the braces is the file's error, not only a comment in its code", () => {
    const { errors } = parsed(WEATHER("{draw each hour in its forecast}"))
    expect(errors.join()).toContain("A Forecast isn't a list")
  })
})

describe("a possessive naming a drawing (T49)", () => {
  test("`draw its showing's page` draws its page, as `draw the page of its showing` does", () => {
    const { compiled, errors, warnings } = parsed(`a book is a thing:
	- it has a title as text
	- to draw:
		<p>{its title}</p>
	- to draw its page:
		<h1>{its title}</h1>
a shelf is an app:
	- its "showing" is a book
	- to draw:
		draw its showing's page
`)
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(compiled).toContain("return this.showing?.drawPage()")
  })
})

describe("a property's value on the line below its name (T58)", () => {
  test("spellx:  a list, between its tags", () => {
    const { compiled, errors } = parsed(
      `<spell-thing "habit">
	<property "monday">yes or no</>
	<property "tuesday">yes or no</>
	<property "days">
		[the monday, the tuesday]
	</property>
	<property "both">
		its monday and its tuesday
	</property>
</spell-thing>
`,
      "/Habit.spell"
    )
    expect(errors).toEqual([])
    expect(compiled).toContain("return [this.monday, this.tuesday]")
    expect(compiled).toContain("return this.monday && this.tuesday")
  })

  test("code spell too;  after lines that are steps, the last line's value is returned (I47)", () => {
    const { compiled, errors } = parsed(`a habit is a thing:
	- its "monday" is yes or no
	- its "days" is:
		[the monday]
	- its "one" is:
		set x to 1
		x + 1
`)
    expect(compiled).toContain("return [this.monday]")
    expect(compiled).toContain("const x = 1\n    return x + 1")
    expect(errors).toEqual([])
  })
})

describe("an action with a description, called above it (T59, T60)", () => {
  const STORE = (calls: string) => `<spell-thing "task">
	<property "title">text</>
</spell-thing>
<spell-app "store">
	<property "total">a number</>

	<when its total changes>
${calls}
	</>

	<action "fill the checklist" description="The keeper's tasks, in the list">
		set its total to 1
	</action>
	<action "load the tasks" description="Every task">
		set its total to 2
	</action>
</spell-app>
`
  test("is found", () => {
    const { compiled, errors } = parsed(STORE("\t\tfill the checklist"), "/Store.spell")
    expect(errors).toEqual([])
    expect(compiled).toContain("this.fillTheChecklist()")
  })

  test("`load the tasks` is the action, not a read of every task", () => {
    const { compiled, errors } = parsed(STORE("\t\tload the tasks"), "/Store.spell")
    expect(errors).toEqual([])
    expect(compiled).toContain("this.loadTheTasks()")
    expect(compiled).not.toContain("core.everyThing(Task)")
  })
})

describe("a line starting with an action's name, going on past it (I20)", () => {
  test("`add the new recipe to the recipes`, in the action `add the new recipe`", () => {
    const { compiled, errors } = parsed(
      `<spell-thing "recipe">
	<property "title">text</>
</spell-thing>
<spell-app "recipe box">
	<property "recipes">a new list of recipes</>
	<property "new recipe">a new recipe</>

	<action "add the new recipe">
		add the new recipe to the recipes
		set its new recipe to a new recipe
	</action>
	<action "start it">
		add the new recipe
	</action>
</spell-app>
`,
      "/RecipeBox.spell"
    )
    expect(errors).toEqual([])
    expect(compiled).toContain("core.append(this.recipes, this.newRecipe)")
    expect(compiled).toContain("this.addTheNewRecipe()")
  })
})

describe("a `<for>` inside an element (I19)", () => {
  const SHELF = (drawing: string) => `<spell-thing "film">
	<spell>
		- its "title" is text
	</spell>
	<draw><text>{its title}</text></draw>
</spell-thing>
<spell-view "shelf">
	<spell>
		- its "films" is a list of films
	</spell>
	<draw>
${drawing}
	</draw>
</spell-view>
`
  test("draws its items among the element's other children", () => {
    const { compiled, errors } = parsed(
      SHELF(`		<cards>
			<segment>New</segment>
			<for film in its films>
				<text>{its title}</text>
			</for>
		</cards>`),
      "/Shelf.spell"
    )
    expect(errors).toEqual([])
    expect(compiled).toContain('h("ui-cards",')
    expect(compiled).toContain('h("ui-segment", "New"),')
    expect(compiled).toContain('() => core.drawEach(this.films, (film) => h("ui-text", () => film.title))')
  })

  test("its attributes and `<empty>` are its riders, as on a line of its own", () => {
    const { compiled, errors } = parsed(
      SHELF(`		<segment>
			<header>Films</header>
			<for its films loading="Wait">
				<empty>
					<text>None</text>
				</empty>
			</for>
		</segment>`),
      "/Shelf.spell"
    )
    expect(errors).toEqual([])
    expect(compiled).toContain("core.drawRead(() => this.films, (film) => core.drawThing(film), { waiting:")
    expect(compiled).toContain('none: () => h("ui-text", "None")')
  })

  test("a mistake inside it is the file's error, where it's written", () => {
    const { errors } = parsed(
      SHELF(`		<cards>
			<for film in its films>
				<text>{its nonsense here}</text>
			</for>
		</cards>`),
      "/Shelf.spell"
    )
    expect(errors.join()).toMatch(/^14:\d+ /)
  })

  test("its head is a phrase, whatever's in it:  quotes, parens, an apostrophe;  and it has a body (I93)", () => {
    const { compiled, errors } = parsed(
      SHELF(`		<segment>
			<header>Owen's films</header>
			<for film in the films of (it) where its title isn't "Alien" as="cards">
				<failed><text>Can't</text></failed>
			</for>
			<text>Don't go</text>
		</segment>`),
      "/Shelf.spell"
    )
    expect(errors).toEqual([])
    expect(compiled).toContain('items: () => h("ui-cards"), failed: () => h("ui-text", "Can\'t") })')
    expect(compiled).toContain('h("ui-text", "Don\'t go")')
  })

  test("closed on its own line too, `/>` after its phrase (I93)", () => {
    const { compiled, errors } = parsed(
      SHELF(`		<segment>
			<for film in the films of it where its title isn't "Alien" as="cards" />
			<text>After</text>
		</segment>`),
      "/Shelf.spell"
    )
    expect(errors).toEqual([])
    expect(compiled).toContain('items: () => h("ui-cards") })')
    expect(compiled).toContain('h("ui-text", "After")')
  })
})

describe("a drawing named like a list or a property (I94, I95)", () => {
  const SHELF = (call: string, name: string) => `<spell-thing "film">
	<spell>
		- its "title" is text
	</spell>
	<draw><text>{its title}</text></draw>
</spell-thing>
<spell-view "shelf">
	<spell>
		- its "films" is a list of films
		- its "found" is a list of films
	</spell>
	<draw>
		<segment>{${call}}</segment>
	</draw>
	<draw "${name}">
		<for its films as="cards" />
	</draw>
</spell-view>
`
  test("a plural name, written above it, draws it:  not the shelf's items (I94)", () => {
    for (const name of ["results", "hours", "details"]) {
      const { compiled, errors } = parsed(SHELF(`draw the ${name} of it`, name), "/Shelf.spell")
      expect(errors).toEqual([])
      expect(compiled).toContain(`() => this.draw${name[0]!.toUpperCase()}${name.slice(1)}())`)
    }
  })

  test("a property's name draws the drawing, with what's around its items:  not the property's list, loose (I95)", () => {
    for (const name of ["found", "films"]) {
      const { compiled, errors } = parsed(SHELF(`draw the ${name} of it`, name), "/Shelf.spell")
      expect(errors).toEqual([])
      expect(compiled).toContain(`this.draw${name[0]!.toUpperCase()}${name.slice(1)}()`)
      expect(compiled).not.toContain(`core.drawThing(this.${name})`)
    }
  })

  test("with no drawing of that name, a plural's a list's items, and a property draws its value, as before", () => {
    const items = parsed(SHELF("draw the films of it", "other"), "/Shelf.spell")
    expect(items.errors.join()).toContain("A Shelf isn't a list")
    const property = parsed(SHELF("draw the found of it", "other"), "/Shelf.spell")
    expect(property.compiled).toContain("core.drawThing(this.found)")
  })
})

describe('an inline if in a hole, `{its time if ... otherwise ""}` (I96)', () => {
  test("says a date as the block form does:  a raw Date never reaches the page", () => {
    const { compiled, errors } = parsed(`an hour is a thing:
	- it has a time as a date
	- it has a shown as yes or no
	- to draw:
		<td>{its time if its shown otherwise ""}</td>
`)
    expect(errors).toEqual([])
    expect(compiled).toContain('this.shown ? core.dateShown(this.time) : ""')
  })
})

describe("a possessive of the app inside a `where` (T82)", () => {
  test("`where it is not quiz's card` reads the app's card, as `the card of quiz` does", () => {
    const QUIZ = (condition: string) => `a flash card is a thing:
	- it has a word as text
a deck is a list of flash cards
quiz is an app:
	- it has a deck as a deck
	- it has a card as a flash card
	- to deal a card:
		set others to cards in the deck where ${condition}
		set the card to a random card in others
`
    for (const condition of ["it is not quiz's card", "it is not the card of quiz", "it isn't the quiz's card"]) {
      const { compiled, errors, warnings } = parsed(QUIZ(condition))
      expect(errors, condition).toEqual([])
      expect(warnings, condition).toEqual([])
      expect(compiled, condition).toContain(".filter((card) => card !== this.card)")
    }
  })
})

describe("a template's test runs its lines on its own thing (T86)", () => {
  test("a bare action, `the total` and `set the total` are the test's new calculator's, not the app's", () => {
    const { compiled, errors, warnings } = parsed(
      [
        '<spell-app "calculator">',
        '\t<property "input">text</>',
        '\t<property "total" type="number"/>',
        '\t<action "append (digit as text)">',
        "\t\tset the input to the input + the digit",
        "\t</action>",
        '\t<action "add the input">',
        "\t\tset the total to the total + (the input as a number)",
        "\t\tclear the input",
        "\t</action>",
        '\t<test "sums">',
        '\t\tappend "1"',
        '\t\tappend "7"',
        "\t\tadd the input",
        "\t\tthe total should be 17",
        "\t\tset the total to 0",
        "\t\tits total should be 0",
        "\t</test>",
        "</spell-app>"
      ].join("\n"),
      "/Calculator.spell"
    )
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(compiled).toContain("const it = new Calculator()")
    expect(compiled).toContain('it.appendDigit("1")')
    expect(compiled).toContain("it.addTheInput()")
    expect(compiled).toContain("core.expect(it.total, `the total`, 17, `17`)")
    expect(compiled).toContain("it.total = 0")
    expect(compiled).not.toContain("calculator.appendDigit")
  })
})

describe("a call given a member nobody declares steps aside (T90)", () => {
  const GUIDE = (button: string) => `<spell-thing "film">
	<property "title">text</>
	<action "play it">
		print its title
	</action>
</spell-thing>
<spell-app "guide">
	<property "playing">a film</>
	<action "play the opening">
		set its playing to the first film
	</action>
	<draw>
		<button onClick={${button}}>Play</button>
	</draw>
</spell-app>
`
  test("`play the opening of the guide` is the guide's action, not Film's `play` of a guide's `opening`", () => {
    const { compiled, errors, warnings } = parsed(GUIDE("play the opening of the guide"), "/Guide.spell")
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(compiled).toContain("() => this.playTheOpening()")
  })

  test("with no other reading, the loose read still reads, and warns", () => {
    const { compiled, warnings } = parsed(GUIDE("play the trailer of the guide"), "/Guide.spell")
    expect(compiled).toContain("() => this.trailer.play()")
    expect(warnings.join()).toContain("A guide never says it has a trailer")
  })
})

describe("Spanish:  `ella` is `it`, and a list named `la lista` agrees as one (T89)", () => {
  const AGENDA = (lines: string) => `<encanto-vista "tarea">
	<propiedad "orden" tipo="número"/>
</encanto-vista>
<encanto-vista "agenda" plantilla="lista visible de tareas">
${lines}
</encanto-vista>
`
  test("`para tarea y lugar en ella`, and with a comma, read as `en eso` does", () => {
    for (const loop of ["para tarea y lugar en ella", "para tarea, lugar en ella", "para tarea y lugar en él"]) {
      const { compiled, errors } = parsed(
        AGENDA(`	<acción "guardar el orden">\n\t\t${loop}\n\t\t\tponer el orden de la tarea al lugar\n\t</acción>`),
        "/Agenda.es.spell"
      )
      expect(errors).toEqual([])
      expect(compiled).toContain("this.forEach(withSpellPositions((tarea, lugar) => (tarea.orden = lugar)))")
    }
  })

  const SORTED = (list: string, word: string) =>
    AGENDA(`	<probar "el orden">
		poner la lista a una nueva agenda
		poner x a ${list} ${word} por su orden
	</probar>`)

  test("`la lista ordenada`:  the noun that names it says, not its items", () => {
    expect(parsed(SORTED("la lista", "ordenada"), "/Agenda.es.spell").warnings).toEqual([])
    expect(parsed(SORTED("la lista", "ordenadas"), "/Agenda.es.spell").warnings.join()).toContain('"ordenada"')
  })

  test("a list named by its items' type still agrees with them", () => {
    expect(parsed(SORTED("las tareas", "ordenadas"), "/Agenda.es.spell").warnings).toEqual([])
    expect(parsed(SORTED("las tareas", "ordenada"), "/Agenda.es.spell").warnings.join()).toContain('"ordenadas"')
  })
})
