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
      "/Habit.spellml"
    )
    expect(errors).toEqual([])
    expect(compiled).toContain("return [this.monday, this.tuesday]")
    expect(compiled).toContain("return this.monday && this.tuesday")
  })

  test("code spell too;  lines that are steps still need their `return`", () => {
    const { compiled, errors } = parsed(`a habit is a thing:
	- its "monday" is yes or no
	- its "days" is:
		[the monday]
	- its "one" is:
		set x to 1
		x + 1
`)
    expect(compiled).toContain("return [this.monday]")
    expect(errors).toEqual(['7:2 Don\'t understand "x + 1"'])
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
    const { compiled, errors } = parsed(STORE("\t\tfill the checklist"), "/Store.spellml")
    expect(errors).toEqual([])
    expect(compiled).toContain("this.fillTheChecklist()")
  })

  test("`load the tasks` is the action, not a read of every task", () => {
    const { compiled, errors } = parsed(STORE("\t\tload the tasks"), "/Store.spellml")
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
      "/RecipeBox.spellml"
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
      "/Shelf.spellml"
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
      "/Shelf.spellml"
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
      "/Shelf.spellml"
    )
    expect(errors.join()).toMatch(/^14:\d+ /)
  })
})
