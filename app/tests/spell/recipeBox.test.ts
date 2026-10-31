/**
 * The recipe box, compiled from spell, run in a real browser, reading and writing the demo's servers (epic `data` P11).
 * - The program is the frozen test project, `@spell/test/recipe-box`, and its Spanish twin, `recetario`.
 * - Each back-end changes only the lines that say where it lives (`BACK_ENDS`), with nothing else in the program touched.
 * - And the built-in examples as they ship:  what a person does in them, and the same one-line swap to each back-end.
 * - Headless Chromium through Playwright, on the page's real `<spell-viewer>` and Spell UI, from `yarn build:element`:
 *   skips itself when that's not built.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs"
import { createServer, type Server } from "http"
import { tmpdir } from "os"
import { join, resolve } from "path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV, type Handler } from "spell/server"
import { startRecipeServers, type RecipeServers } from "spell/server/test/recipeDemo"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import { fixturePath } from "spell/app/spaces/test"

/** `yarn build:element`'s output. */
const ELEMENT_DIR = resolve(__dirname, "../../app/dist-element")

/** The token the demo's place server wants. */
const DEMO_TOKEN = "recipe-box-demo"

/** How long a change may take to reach a server:  a change goes out soon, not at once. */
const WAITING = { timeout: 8_000 }

/** One program:  its source, and the words its lines use. */
type Program = {
  /** Its file. */
  path: string
  /** Its source. */
  source: string
  /** The classes its elements carry. */
  field: string
}

/** The built-in examples:  what people run, in the editor. */
const EXAMPLES = resolve(__dirname, "../../spaces/@spell/examples")

/** The lines a program starts with, up to its first type. */
const PLACE_LINES = /^[\s\S]*?(?=^(?:a|una) ")/m

/** `program` with its place's lines replaced. */
function withPlace(program: Program, lines: string): Program {
  return { ...program, source: program.source.replace(PLACE_LINES, `${lines}\n\n`) }
}

/** What each back-end's lines say:  all that differs. */
const BACK_ENDS: Record<string, (url: string) => string> = {
  REST: (url) => `family cookbook is a web service at "${url}":
	- a recipe's title is called "name"
	- its versions are in "version"
	- it is checked every 5 seconds`,
  GraphQL: (url) => `family cookbook is a graph service at "${url}/graphql":
	- a recipe's title is called "name"
	- it is checked every 5 seconds`,
  "a folder": (url) => `family cookbook is a folder at "${url}/api/places/recipes":
	- it is checked every 5 seconds`,
  "a live room": (url) => `family cookbook is a live room at "${url}/api/rooms/recipes"`
}

describe.skipIf(!existsSync(join(ELEMENT_DIR, "spell-runtime.js")))("the recipe box, in a browser", () => {
  let browser: Browser
  let servers: RecipeServers
  let folder: string
  /** Is the address that fails answering yet? */
  let flakyIsUp = false
  /** What the page server hands out, by its name. */
  const programs = new Map<string, string>()
  /** Another server of pages, on another port, as the editor is. */
  let elsewhere: Server
  /** Where it's listening. */
  let elsewhereUrl: string

  /** Compile `program`, and say where its page is. */
  function serve(name: string, { path, source }: Program): string {
    programs.set(`/programs/${name}.js`, compiledProgram(path, source))
    programs.set(`/${name}.html`, pageFor(name))
    return `${servers.url}/${name}.html`
  }

  /** A page:  `<spell-viewer>`, and nothing else.  `token`:  what its server hands it, as the demo's own does. */
  function pageFor(name: string, token: string | undefined = DEMO_TOKEN): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
${token ? `<script>window.SPELL_SERVER = { token: "${token}" }</script>` : ""}
<script type="module" src="/element/spell-viewer.js"></script>
</head><body><spell-viewer src="/programs/${name}.js"></spell-viewer></body></html>`
  }

  /** A page opened on `url`, whose errors are the test's. */
  async function opened(url: string): Promise<{ page: Page; problems: string[] }> {
    const page = await browser.newPage()
    const problems: string[] = []
    page.on("pageerror", (error) => problems.push(`${error.message}`))
    page.on("console", (message) => {
      if (message.type() === "error" && !/404|Failed to load resource/.test(message.text()))
        problems.push(message.text())
    })
    await page.goto(url)
    return { page, problems }
  }

  beforeAll(async () => {
    folder = mkdtempSync(join(tmpdir(), "spell-recipe-box-test-"))
    const element = SRV.folderRoute("/element/", ELEMENT_DIR)
    /** Answer with a program, a page or `<spell-viewer>`'s files, if that's what's asked for. */
    const pages: Handler = (request, reply, next) => {
      const text = programs.get(request.path)
      if (text !== undefined) {
        const type = request.path.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8"
        return reply.type(type).send(text)
      }
      const found = element(request.path)
      if (found && "file" in found && found.file) return reply.sendFile(found.file)
      return next()
    }
    servers = await startRecipeServers({
      port: 0,
      folder,
      routes: (router) => {
        router.use((request, reply, next) => {
          if (request.path === "/flaky/recipes") {
            if (!flakyIsUp) return reply.status(404).send("not yet")
            return reply.json([{ id: "r-1", title: "Back again", servings: 1 }])
          }
          if (request.path === "/recipes.csv") {
            return reply.type("text/csv").send("id,title,servings\nr-1,Tomato soup,4\nr-2,Dal,6\n")
          }
          return pages(request, reply, next)
        })
      }
    })
    const pagesRouter = new SRV.Router()
    pagesRouter.use(pages)
    elsewhere = createServer(SRV.toListener(pagesRouter.handle))
    await new Promise<void>((done) => elsewhere.listen(0, "127.0.0.1", done))
    elsewhereUrl = `http://127.0.0.1:${(elsewhere.address() as { port: number }).port}`
    browser = await chromium.launch()
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await servers?.close()
    elsewhere?.close()
    if (folder) {
      rmSync(folder, { recursive: true, force: true })
      rmSync(`${folder}-room`, { recursive: true, force: true })
    }
  })

  /** The recipe box in English, as its project file has it. */
  const english = (): Program => ({
    path: "/RecipeBox.spell",
    source: readFileSync(fixturePath("recipe-box", "RecipeBox.spell"), "utf8"),
    field: "title"
  })

  /** The recipe box in Spanish. */
  const spanish = (): Program => ({
    path: "/CajaDeRecetas.es.spell",
    source: readFileSync(fixturePath("recetario", "CajaDeRecetas.es.spell"), "utf8"),
    field: "título"
  })

  /** The titles the page shows, in order. */
  const titlesOn = (page: Page) =>
    page
      .locator("ui-form.recipe input")
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))

  /** What the server behind each back-end holds:  a title's there, or it isn't. */
  const heldBy: Record<string, () => Promise<string[]>> = {
    REST: async () => [...servers.box.recipes.values()].map(({ name }) => name),
    GraphQL: async () => [...servers.box.recipes.values()].map(({ name }) => name),
    "a folder": async () =>
      (await servers.folderPlace.list("recipes", {}, {})).rows.map(({ title }) => `${title as string}`),
    "a live room": async () =>
      (await servers.folderPlace.list("recipes", {}, {})).rows.map(({ title }) => `${title as string}`)
  }

  /** Reads, adds, changes and removes through the page, each reaching the server. */
  async function roundTrip(page: Page, held: () => Promise<string[]>): Promise<void> {
    await page.locator("ui-form.recipe").first().waitFor(WAITING)
    const before = await titlesOn(page)
    expect(before.length).toBeGreaterThanOrEqual(5)
    expect(before).toEqual([...before].sort((one, other) => one.localeCompare(other)))
    expect((await held()).sort()).toEqual(expect.arrayContaining(before))

    // add
    await page.locator("ui-input.draft input").fill("A new stew")
    await page.locator("ui-button.add").click()
    await expect.poll(() => titlesOn(page), WAITING).toContain("A new stew")
    await expect.poll(held, WAITING).toContain("A new stew")

    // change it:  typing goes to the same input all the way, and reaches the place
    const stew = page
      .locator("ui-form.recipe")
      .filter({ has: page.locator("input") })
      .first()
    await stew.locator("input").click()
    await stew.locator("input").press("End")
    await stew.locator("input").pressSequentially(" again")
    await expect.poll(() => titlesOn(page), WAITING).toContain("A new stew again")
    await expect.poll(held, WAITING).toContain("A new stew again")

    // remove it
    await page.locator("ui-form.recipe").first().locator("ui-button.remove").click()
    await expect.poll(() => titlesOn(page), WAITING).not.toContain("A new stew again")
    await expect.poll(held, WAITING).not.toContain("A new stew again")
  }

  for (const backEnd of Object.keys(BACK_ENDS)) {
    test(`English, on ${backEnd}:  only its first lines change`, { timeout: 60_000 }, async () => {
      const name = `en-${backEnd.replace(/\W/g, "")}`
      const url = serve(name, withPlace(english(), BACK_ENDS[backEnd]!(servers.url)))
      const { page, problems } = await opened(url)
      await roundTrip(page, heldBy[backEnd]!)
      expect(problems).toEqual([])
      await page.close()
    })
  }

  // What the editor's page is to these servers:  another port, and no token it could know
  for (const backEnd of ["a folder", "a live room"]) {
    test(
      `a page on another port, with no token, on ${backEnd}:  as the editor runs it`,
      { timeout: 60_000 },
      async () => {
        const name = `editor-${backEnd.replace(/\W/g, "")}`
        serve(name, withPlace(english(), BACK_ENDS[backEnd]!(servers.url)))
        programs.set(`/${name}.html`, pageFor(name, ""))
        const { page, problems } = await opened(`${elsewhereUrl}/${name}.html`)
        await roundTrip(page, heldBy[backEnd]!)
        expect(problems).toEqual([])
        await page.close()
      }
    )
  }

  test("the place server still refuses another site, and what isn't a page without its token", async () => {
    const asked = (headers: Record<string, string>) =>
      fetch(`${servers.url}/api/places/recipes/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ collection: "recipes", query: {} })
      })
    expect((await asked({ Origin: "https://example.com", "x-server-token": DEMO_TOKEN })).status).toBe(403)
    expect((await asked({})).status).toBe(403)
    expect((await asked({ "x-server-token": DEMO_TOKEN })).status).toBe(200)
    expect((await asked({ Origin: elsewhereUrl })).status).toBe(200)
  })

  test("what a program adds over GraphQL is in the CSV file REST reads", { timeout: 60_000 }, async () => {
    const { page, problems } = await opened(serve("shared", withPlace(english(), BACK_ENDS.GraphQL!(servers.url))))
    await page.locator("ui-form.recipe").first().waitFor(WAITING)
    await page.locator("ui-input.draft input").fill("Over GraphQL")
    await page.locator("ui-button.add").click()
    await expect.poll(() => readFileSync(servers.box.file, "utf8"), WAITING).toContain("Over GraphQL")
    expect(await heldBy.REST!()).toContain("Over GraphQL")
    expect(problems).toEqual([])
    await page.close()
  })

  /** Each built-in example, and what it should say:  the words differ, the classes don't. */
  const SHIPPED = [
    {
      path: "RecipeBox/RecipeBox.spell",
      examples: ["Pizza Margherita", "Dal", "Tomato soup"],
      noRecipes: "No recipes yet. Add your first one.",
      noMatches: "No recipes match your search."
    },
    {
      path: "CajaDeRecetas/CajaDeRecetas.es.spell",
      examples: ["Pizza Margarita", "Dal", "Sopa de tomate"],
      noRecipes: "Todavía no hay recetas. Agrega la primera.",
      noMatches: "Ninguna receta coincide con tu búsqueda."
    }
  ]

  /** An example as it ships. */
  const shipped = (path: string): Program => ({
    path: `/${path.split("/")[1]}`,
    source: readFileSync(join(EXAMPLES, path), "utf8"),
    field: ""
  })

  /** The titles an example's cards show. */
  const cardsOn = (page: Page) =>
    page
      .locator("ui-form.recipe ui-input.title input")
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))

  /** Undo:  the one item of the box's own toolbar. */
  const undoOn = (page: Page) =>
    page
      .locator("ui-toolbar.undo")
      .getByText(/Undo|Deshacer/)
      .first()

  for (const { path, examples, noRecipes, noMatches } of SHIPPED) {
    test(
      `the example ${path}, the first time:  a few to start from, then what a person does`,
      { timeout: 60_000 },
      async () => {
        const name = `example-${path.replace(/\W/g, "")}`
        const { page, problems } = await opened(serve(name, shipped(path)))
        const none = page.locator("ui-text.none")
        const add = page.locator("ui-button.add")
        const isAddOff = () => add.evaluate((button) => (button as HTMLButtonElement).disabled)
        await expect.poll(() => cardsOn(page), WAITING).toEqual(examples)
        expect(await isAddOff()).toBe(true)

        // every field shown, and labelled
        const firstCard = page.locator("ui-form.recipe").first()
        expect(await firstCard.locator("ui-field").count()).toBe(3)
        expect(await firstCard.locator("ui-input.serves input").inputValue()).toBe("2")
        expect(await firstCard.locator("textarea").inputValue()).not.toBe("")

        // a search follows every letter typed, and says when it finds nothing
        await page.locator("ui-input.search input").fill("Dal")
        await expect.poll(() => cardsOn(page), WAITING).toEqual(["Dal"])
        await page.locator("ui-input.search input").fill("birria")
        await expect.poll(() => none.textContent(), WAITING).toBe(noMatches)
        await page.locator("ui-input.search input").fill("")
        await expect.poll(() => cardsOn(page), WAITING).toEqual(examples)

        // a new one:  first of all, with what was typed, and the new card is empty again
        await page.locator("ui-input.draft input").fill("birria")
        await page.locator("ui-card.new textarea").pressSequentially("Slowly")
        await expect.poll(isAddOff, WAITING).toBe(false)
        await add.click()
        await expect.poll(() => cardsOn(page), WAITING).toEqual(["birria", ...examples])
        expect(await page.locator("ui-input.draft input").inputValue()).toBe("")

        // typing in a card stays in that card, whatever it now says
        const card = page.locator("ui-form.recipe ui-input.title input").first()
        await card.click()
        await card.press("End")
        await page.keyboard.type(" again")
        await expect.poll(() => cardsOn(page), WAITING).toContain("birria again")

        // remove, and undo:  back where it was, with what it said
        await page.locator("ui-button.remove").first().click()
        await expect.poll(() => cardsOn(page), WAITING).not.toContain("birria again")
        await undoOn(page).click()
        await expect.poll(() => cardsOn(page), WAITING).toEqual(["birria again", ...examples])
        expect(await firstCard.locator("textarea").inputValue()).toBe("Slowly")

        // with none left, it says so
        while (await page.locator("ui-button.remove").count()) await page.locator("ui-button.remove").first().click()
        await expect.poll(() => none.textContent(), WAITING).toBe(noRecipes)
        expect(problems).toEqual([])
        await page.close()
      }
    )
  }

  // Changing its first lines is all a different back-end takes:  the example as it ships, not a copy
  for (const backEnd of Object.keys(BACK_ENDS)) {
    test(`the example RecipeBox, on ${backEnd}:  only its first lines change`, { timeout: 60_000 }, async () => {
      const name = `shipped-${backEnd.replace(/\W/g, "")}`
      const url = serve(name, withPlace(shipped("RecipeBox/RecipeBox.spell"), BACK_ENDS[backEnd]!(servers.url)))
      const { page, problems } = await opened(url)
      const held = heldBy[backEnd]!
      await page.locator("ui-form.recipe").first().waitFor(WAITING)
      expect(await cardsOn(page)).not.toContain("Pizza Margherita")

      await page.locator("ui-input.draft input").fill("A shipped stew")
      await page.locator("ui-button.add").click()
      await expect.poll(held, WAITING).toContain("A shipped stew")
      expect((await cardsOn(page))[0]).toBe("A shipped stew")

      await page.locator("ui-button.remove").first().click()
      await expect.poll(held, WAITING).not.toContain("A shipped stew")
      await undoOn(page).click()
      await expect.poll(held, WAITING).toContain("A shipped stew")
      await expect.poll(() => cardsOn(page), WAITING).toContain("A shipped stew")

      await page.locator("ui-button.remove").first().click()
      await expect.poll(held, WAITING).not.toContain("A shipped stew")
      expect(problems).toEqual([])
      await page.close()
    })
  }

  test(
    "the example, when its place can't be reached:  it says so, in words, with Try again",
    { timeout: 60_000 },
    async () => {
      const down = `family cookbook is a web service at "${servers.url}/nowhere":\n\t- it is checked every 500 seconds`
      const { page } = await opened(serve("shipped-down", withPlace(shipped("RecipeBox/RecipeBox.spell"), down)))
      const failed = page.locator("ui-message.failed")
      await failed.waitFor(WAITING)
      expect(await failed.textContent()).toContain("We can't reach your recipes right now.")
      expect(await page.locator("ui-button.again").count()).toBe(1)
      await page.close()
    }
  )

  test("Spanish, on REST:  the same servers, in its own words", { timeout: 60_000 }, async () => {
    const lines = `recetario familiar es un servicio web en "${servers.url}":
	- las recetas están en "/recipes"
	- el título de una receta se llama "name"
	- las porciones de una receta se llaman "servings"
	- sus versiones están en "version"
	- se revisa cada 5 segundos`
    const { page, problems } = await opened(serve("es-rest", withPlace(spanish(), lines)))
    await roundTrip(page, heldBy.REST!)
    expect(problems).toEqual([])
    await page.close()
  })

  test("Spanish, on a folder", { timeout: 60_000 }, async () => {
    const lines = `recetario familiar es una carpeta en "${servers.url}/api/places/recipes":
	- las recetas están en "recipes"
	- el título de una receta se llama "title"
	- las porciones de una receta se llaman "servings"
	- se revisa cada 5 segundos`
    const { page, problems } = await opened(serve("es-folder", withPlace(spanish(), lines)))
    await page.locator("ui-form.recipe").first().waitFor(WAITING)
    expect((await titlesOn(page)).length).toBeGreaterThanOrEqual(0)
    expect(problems).toEqual([])
    await page.close()
  })

  test("a sheet:  a write won't compile, and what only reads reads it", { timeout: 60_000 }, async () => {
    const sheet = `family cookbook is a sheet at "${servers.url}/recipes.csv":\n\t- its ids are in "id"`
    const { path, source } = withPlace(english(), sheet)
    expect(errorsOf(path, source).join()).toContain("read only")

    const reads = `${sheet}

a "recipe" is a view:
	- it is saved in the family cookbook
	- its "title" is text
	- its "servings" is a number
	- to draw it:
		<ui-text class="recipe">{its title}, for {its servings}</ui-text>

recipe box is an app:
	- its "matches" is every recipe, sorted by its title
	- to draw it:
		for each recipe in the matches
			draw the recipe

start the recipe box
`
    const { page, problems } = await opened(serve("sheet", { path, source: reads, field: "title" }))
    await page.locator("ui-text.recipe").first().waitFor(WAITING)
    await expect
      .poll(() => page.locator("ui-text.recipe").allTextContents(), WAITING)
      .toEqual(["Dal, for 6", "Tomato soup, for 4"])
    expect(problems).toEqual([])
    await page.close()
  })

  /** A graph service's first lines. */
  const onGraph = (url: string) => `family cookbook is a graph service at "${url}/graphql":
	- a recipe's title is called "name"
	- it is checked every 500 seconds`

  /** A recipe:  what its draw reads, and two fields nothing does. */
  const RECIPE_TYPE = `a "recipe" is a view:
	- it is saved in the family cookbook
	- its "title" is text
	- its "servings" is a number
	- its "cuisine" is text
	- its "notes" is text
	- to draw it:
		<ui-text class="title">{its title}</ui-text>
		<ui-text class="servings">{its servings}</ui-text>`

  /** A page whose second read is in what its first read draws:  it only shows up once the first has answered. */
  const twoParts = (url: string): Program => ({
    path: "/TwoParts.spell",
    field: "title",
    source: `${onGraph(url)}

${RECIPE_TYPE}
		<ui-text class="shelf">{the number of items in its indian}</ui-text>
	- its "indian" is every recipe where its cuisine is "Indian"

recipe box is an app:
	- its "recipes shown" is every recipe
	- to draw it:
		for each recipe in the recipes shown
			draw the recipe

start the recipe box
`
  })

  /** A page with one read, and fields it never reads. */
  const oneRead = (url: string): Program => ({
    path: "/OneRead.spell",
    field: "title",
    source: `${onGraph(url)}

${RECIPE_TYPE}

recipe box is an app:
	- its "recipes shown" is every recipe
	- to draw it:
		for each recipe in the recipes shown
			draw the recipe

start the recipe box
`
  })

  /** What the page asked the GraphQL service, from `from` on. */
  const graphAsks = (from: number) => servers.box.asks.slice(from).filter(({ path }) => path === "/graphql")

  /** `program`, compiled, then changed as `edit` says, and opened:  its page, with the first load settled. */
  async function openedEdited(name: string, program: Program, edit: (code: string) => string) {
    programs.set(`/programs/${name}.js`, edit(compiledProgram(program.path, program.source)))
    programs.set(`/${name}.html`, pageFor(name))
    const { page, problems } = await opened(`${servers.url}/${name}.html`)
    await page.locator("ui-text.servings").first().waitFor(WAITING)
    await page.waitForTimeout(300)
    return { page, problems }
  }

  test("a first load:  ONE request where there were two", { timeout: 60_000 }, async () => {
    const program = twoParts(servers.url)
    expect(compiledProgram(program.path, program.source)).toContain("firstReads: () => [")

    // what it did before:  what the compiler gathered taken out
    let from = servers.box.asks.length
    const before = await openedEdited("two-before", program, (code) =>
      code.replace(/,\s*firstReads: \(\) => \[.*\] \}\)/, " })")
    )
    await expect.poll(() => before.page.locator("ui-text.shelf").first().textContent(), WAITING).toBe("2")
    const asksBefore = graphAsks(from)
    expect(before.problems).toEqual([])
    await before.page.close()

    from = servers.box.asks.length
    const after = await openedEdited("two-after", program, (code) => code)
    await expect.poll(() => after.page.locator("ui-text.shelf").first().textContent(), WAITING).toBe("2")
    const asksAfter = graphAsks(from)
    expect(await after.page.locator("ui-text.title").allTextContents()).toContain("Dal")
    expect(after.problems).toEqual([])
    await after.page.close()

    expect(asksBefore).toHaveLength(2)
    expect(asksAfter).toHaveLength(1)
  })

  test(
    "it asks only for what's read:  a view's element mirroring the rest doesn't count",
    { timeout: 60_000 },
    async () => {
      const from = servers.box.asks.length
      const { page, problems } = await openedEdited("selected", oneRead(servers.url), (code) => code)
      expect(await page.locator("ui-text.title").allTextContents()).toContain("Dal")
      const asks = graphAsks(from)
      expect(asks).toHaveLength(1)
      const asked = `${asks[0]!.body!.query as string}`
      expect(asked).not.toContain("notes")
      expect(asked).toContain("servings")
      expect(problems).toEqual([])
      await page.close()
    }
  )

  test(
    "a field the compiler missed still appears:  one more request, and it's there",
    { timeout: 60_000 },
    async () => {
      const from = servers.box.asks.length
      const { page, problems } = await openedEdited("missed", oneRead(servers.url), (code) => {
        expect(code).toContain('select: ["title", "servings"]')
        return code.replace('select: ["title", "servings"]', 'select: ["servings"]')
      })
      await expect.poll(() => page.locator("ui-text.title").allTextContents(), WAITING).toContain("Dal")
      const asks = graphAsks(from)
      expect(asks).toHaveLength(2)
      expect(`${asks[0]!.body!.query as string}`).not.toContain("name")
      expect(`${asks[1]!.body!.query as string}`).toContain("notes")
      expect(problems).toEqual([])
      await page.close()
    }
  )

  test(
    "the recipe box's own first load:  one read, so one request, before and after",
    { timeout: 60_000 },
    async () => {
      const from = servers.box.asks.length
      const { page, problems } = await opened(serve("one-read", withPlace(english(), BACK_ENDS.REST!(servers.url))))
      await page.locator("ui-form.recipe").first().waitFor(WAITING)
      const reads = servers.box.asks.slice(from).filter(({ path, method }) => method === "GET" && path === "/recipes")
      expect(reads).toHaveLength(1)
      expect(problems).toEqual([])
      await page.close()
    }
  )

  // Undoing an action that adds saved things, wherever they're saved
  for (const backEnd of ["in memory", "REST"]) {
    test(
      `an action undone as one step, adding things saved ${backEnd}:  Undo takes them away, not leaves them blank`,
      { timeout: 60_000 },
      async () => {
        const place = backEnd === "REST" ? BACK_ENDS.REST!(servers.url) : "family cookbook is in memory"
        const source = `${place}

a "recipe" is a view:
	- it is saved in the family cookbook
	- its "title" is text
	- to draw it:
		<ui-label class="item">{its title}</ui-label>

adding box is an app:
	- to add the examples:
		- undone as "Add Examples"
		add (a new recipe with title = "Undo a") to the recipes
		add (a new recipe with title = "Undo b") to the recipes
	- to draw it:
		<ui-button class="add" onClick={add the examples}>Add</ui-button>
		for each recipe in every recipe
			draw the recipe

start the adding box`
        const { page, problems } = await opened(
          serve(`undone-as-${backEnd.replace(/\W/g, "")}`, { path: "/Adding.spell", source, field: "title" })
        )
        const items = page.locator(".item")
        await page.locator("ui-button.add").waitFor(WAITING)
        const before = (await items.allInnerTexts()).length
        await page.locator("ui-button.add").click()
        await expect.poll(() => items.allInnerTexts(), WAITING).toEqual(expect.arrayContaining(["Undo a", "Undo b"]))
        await page.keyboard.press("ControlOrMeta+z")
        await expect.poll(async () => (await items.allInnerTexts()).length, WAITING).toBe(before)
        expect(await items.allInnerTexts()).not.toContain("")
        await page.keyboard.press("ControlOrMeta+Shift+z")
        await expect.poll(() => items.allInnerTexts(), WAITING).toEqual(expect.arrayContaining(["Undo a", "Undo b"]))
        expect(problems).toEqual([])
        await page.close()
      }
    )
  }

  // A program's own list, among other drawn lines:  it draws, and follows the list (T51)
  for (const { kind, source } of [
    {
      kind: "of text",
      source: `listing box is an app:
	- its "items" is a list of text
	- to add one:
		add "c" to its items
	- to draw it:
		<ui-text class="top">top</ui-text>
		for each item in its items
			<ui-label class="item">{item}</ui-label>
		<ui-button class="add" onClick={add one}>Add</ui-button>
		<ui-text class="bottom">bottom</ui-text>
	- when created:
		add "a" to its items
		add "b" to its items

start the listing box`
    },
    {
      kind: "of things",
      source: `a "card" is a view:
	- its "name" is text
	- to draw it:
		<ui-label class="item">{its name}</ui-label>

listing box is an app:
	- its "cards" is a list of cards
	- to add one:
		add (a new card with name = "c") to its cards
	- to draw it:
		<ui-text class="top">top</ui-text>
		for each card in its cards
			draw the card
		<ui-button class="add" onClick={add one}>Add</ui-button>
		<ui-text class="bottom">bottom</ui-text>
	- when created:
		add (a new card with name = "a") to its cards
		add (a new card with name = "b") to its cards

start the listing box`
    }
  ]) {
    test(`a program's own list ${kind}, among other drawn lines, draws and follows`, { timeout: 60_000 }, async () => {
      const { page, problems } = await opened(
        serve(`own-list-${kind.replace(/\W/g, "")}`, { path: "/Listing.spell", source, field: "" })
      )
      const items = page.locator(".item")
      await page.locator("ui-text.bottom").waitFor(WAITING)
      await expect.poll(() => items.allInnerTexts(), WAITING).toEqual(["a", "b"])
      await page.locator("ui-button.add").click()
      await expect.poll(() => items.allInnerTexts(), WAITING).toEqual(["a", "b", "c"])
      expect(await page.locator("ui-text.top").count()).toBe(1)
      expect(problems).toEqual([])
      await page.close()
    })
  }

  // What a named operation does in each language:  a button for each, each reaching the demo's server
  for (const { language, path, source } of [
    {
      language: "English",
      path: "/Publishing.spell",
      source: `family cookbook is a web service at "URL":
	- a recipe's title is called "name"
	- its versions are in "version"
	- it is checked every 5 seconds
	- to publish a recipe is at "/recipes/publish"
	- to refresh is at "/recipes/refresh"

a "recipe" is a view:
	- it is saved in the family cookbook
	- its "title" is text
	- to draw it:
		<ui-button class="publish" onClick={publish the recipe}>Publish</ui-button>

publishing box is an app:
	- to draw it:
		<ui-button class="refresh" onClick={refresh}>Refresh</ui-button>
		for each recipe in every recipe
			draw the recipe

start the publishing box`
    },
    {
      language: "Spanish",
      path: "/Publicando.es.spell",
      source: `recetario familiar es un servicio web en "URL":
	- las recetas están en "/recipes"
	- el título de una receta se llama "name"
	- sus versiones están en "version"
	- se revisa cada 5 segundos
	- para publicar una receta está en "/recipes/publish"
	- para recargar está en "/recipes/refresh"

una "receta" es una vista:
	- se guarda en el recetario familiar
	- su "título" es texto
	- para dibujarla:
		<ui-button class="publish" onClick={publicar la receta}>Publicar</ui-button>

caja que publica es una aplicación:
	- para dibujarla:
		<ui-button class="refresh" onClick={recargar}>Recargar</ui-button>
		para cada receta en cada receta
			dibujar la receta

iniciar la caja que publica`
    }
  ]) {
    test(
      `${language}:  an action at a place's address reaches the server, with what it sends`,
      { timeout: 60_000 },
      async () => {
        const { page, problems } = await opened(
          serve(`operations-${language}`, { path, source: source.replace("URL", servers.url), field: "title" })
        )
        const asked = () =>
          servers.box.asks.filter(({ method, path: at }) => method === "POST" && /publish|refresh/.test(at))
        const before = { asks: asked().length, published: servers.box.published.length }

        await page.locator("ui-button.refresh").click()
        await expect.poll(() => asked().length, WAITING).toBe(before.asks + 1)
        expect(asked().at(-1)).toMatchObject({ path: "/recipes/refresh" })

        await page.locator("ui-button.publish").first().waitFor(WAITING)
        await page.locator("ui-button.publish").first().click()
        await expect.poll(() => servers.box.published.length, WAITING).toBe(before.published + 1)
        expect(asked().at(-1)).toMatchObject({ path: "/recipes/publish" })
        expect(servers.box.published.at(-1)).toMatchObject({ id: "r-1", name: "Tomato soup" })
        expect(problems).toEqual([])
        await page.close()
      }
    )
  }

  test("riders:  if that fails shows, and Try again reads again", { timeout: 60_000 }, async () => {
    const down = `family cookbook is a web service at "${servers.url}/flaky":
	- it is checked every 500 seconds`
    const { page } = await opened(serve("failed", withPlace(english(), down)))
    await page.locator("ui-message.failed").waitFor(WAITING)
    flakyIsUp = true
    await page.locator("ui-button.again").click()
    await expect.poll(() => titlesOn(page), WAITING).toEqual(["Back again"])
    await page.close()
  })

  test(
    "riders:  if there are none shows, on this device, and what's added is there on the next visit",
    { timeout: 60_000 },
    async () => {
      const { page, problems } = await opened(serve("device", withPlace(english(), "family cookbook is this device")))
      await page.locator("ui-text.none").waitFor(WAITING)
      await page.locator("ui-input.draft input").fill("Toast")
      await page.locator("ui-button.add").click()
      await expect.poll(() => titlesOn(page), WAITING).toEqual(["Toast"])
      await expect.poll(() => page.locator("ui-text.none").count(), WAITING).toBe(0)
      await page.waitForTimeout(1_500)
      await page.reload()
      await expect.poll(() => titlesOn(page), WAITING).toEqual(["Toast"])
      expect(problems).toEqual([])
      await page.close()
    }
  )
})

/** `source`, one file, as a runner is handed it:  with its imports. */
function compiledProgram(path: string, source: string): string {
  const { scope, files } = parseSpellProject([{ path, contents: source }])
  const errors = files.flatMap((file) => file.errors)
  if (errors.length) throw new Error(`parse errors:\n${errors.join("\n")}`)
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const header = SP.SpellProject.importHeaderFor(scope, P.JSWriter.instance)
  return SP.SpellDeclarations.stripComments(SP.SpellProject.combineCompiled(parts, P.JSWriter.instance, header, scope))
}

/** The errors of `source`, one file. */
function errorsOf(path: string, source: string): string[] {
  return parseSpellProject([{ path, contents: source }]).files.flatMap((file) => file.errors)
}
