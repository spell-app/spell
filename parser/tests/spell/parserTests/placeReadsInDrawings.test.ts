import { Script } from "node:vm"

import { beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A read of a place written right in a drawing, as an attribute or a child value (epic `mockup` I4):
 * a drawing can't wait, so each is a waited value, never an `await` inside the arrow function around it.
 */

const REVIEWS = `reviews kept is a database on this device

a "film" is a thing:
	- its "title" is text

a "review" is a thing:
	- it lives in reviews kept
	- its "film title" is text
`

/** What a view whose drawing is `drawing`, with a list of films, compiles to. */
function compiled(drawing: string) {
  const contents = `<spell-view "shelf">
	<spell>
		- its "films" is a list of films
	</spell>
	<draw>
		${drawing}
	</draw>
</spell-view>`
  const made = parseSpellProject([
    { path: "/Reviews.spell", contents: REVIEWS },
    { path: "/Shelf.spell", contents }
  ])
  const { files, scope } = made
  const shelf = files[1]!
  expect(shelf.errors).toEqual([])
  // syntax only:  an `await` in a plain arrow function fails here, as it fails in a page
  new Script(shelf.compiled.replace(/^export /gm, ""))
  const asts = files.map(({ match }) => match?.AST as P.ASTStatementGroup)
  return { code: shelf.compiled, typescript: SP.SpellProject.combineCompiled(asts, P.TSWriter.instance, "", scope) }
}

describe("a read of a place, right in a drawing", () => {
  beforeAll(registerTestComponentPack)

  test("as an attribute:  a waited value, and the whole thing is held until its answer", () => {
    const { code } = compiled("<table rows={every review}/>")
    expect(code).toContain(
      '"prop:rows": () => core.waitedValue(this, "every review", async () => await core.savedThings(Review))'
    )
    expect(code).toContain("static drawsWaiting = true")
    expect(code).toMatch(/^\s*draw\(\) \{/m)
  })

  test('as a child value:  a waited value with its own "…"', () => {
    const { code } = compiled("<text>{every review}</text>")
    expect(code).toContain(
      '() => core.whileWaiting(() => core.listShown(core.waitedValue(this, "every review", async () => await core.savedThings(Review))))'
    )
    expect(code).not.toContain("static drawsWaiting")
  })

  test("a handler's read is the handler's own:  it waits when it's called", () => {
    const { code } = compiled(`<button onClick={set its films to every review}>Go</button>`)
    expect(code).not.toContain("waitedValue")
    expect(code).toContain("await core.savedThings(Review)")
  })

  test("TypeScript's the same", () => {
    const { typescript } = compiled("<table rows={every review}/>")
    expect(typescript).toContain('core.waitedValue(this, "every review", async () => await core.savedThings(Review))')
    expect(typescript).not.toMatch(/\{await /)
  })

  describe("in a loop", () => {
    const reviewsOfFilm = "every review where its film title is the title of film"

    test("the loop's function stays a plain one", () => {
      const { code } = compiled(`<for film in its films><table rows={${reviewsOfFilm}}/></for>`)
      expect(code).toContain("core.drawEach(this.films, (film) => ")
      expect(code).toContain("static drawsWaiting = true")
    })

    test("a read naming the loop's item is a value per item", () => {
      const { code } = compiled(`<for film in its films><table rows={${reviewsOfFilm}}/></for>`)
      expect(code).toContain(`core.waitedValue(core.waitedValueKeyFor(this, film), "${reviewsOfFilm}"`)
    })

    test("a read that doesn't name it is one value for the whole drawing", () => {
      const { code } = compiled(`<for film in its films><table rows={every review}/></for>`)
      expect(code).toContain('core.waitedValue(this, "every review"')
    })

    test("over a read of a place too:  its items' function stays plain", () => {
      const { code } = compiled(
        `<for review in every review><text>{the number of reviews where its film title is the film title of review}</text></for>`
      )
      expect(code).toContain("core.drawRead(async () => await core.savedThings(Review, {}, ")
      expect(code).toContain(', (review) => h("ui-text"')
      expect(code).toContain("core.waitedValueKeyFor(this, review)")
    })
  })
})
