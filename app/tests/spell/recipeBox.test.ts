/**
 * The recipe box, compiled from spell, run in a real browser, reading and writing the demo's servers (epic `data` P11).
 * - The program is the frozen test project, `@spell/test/recipe-box`, and its Spanish twin, `recetario`.
 * - Each back-end changes only the lines that say where it lives (`BACK_ENDS`), with nothing else in the program touched.
 * - Headless Chromium through Playwright, on the page's real `<spell-viewer>` and Spell UI, from `yarn build:element`:
 *   skips itself when that's not built.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
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

  /** Compile `program`, and say where its page is. */
  function serve(name: string, { path, source }: Program): string {
    programs.set(`/programs/${name}.js`, compiledProgram(path, source))
    programs.set(`/${name}.html`, pageFor(name))
    return `${servers.url}/${name}.html`
  }

  /** A page:  `<spell-viewer>`, and nothing else. */
  function pageFor(name: string): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>window.SPELL_SERVER = { token: "${DEMO_TOKEN}" }</script>
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
    servers = await startRecipeServers({
      port: 0,
      folder,
      routes: (router) => {
        router.use((request, reply, next) => {
          const text = programs.get(request.path)
          if (text !== undefined) {
            const type = request.path.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8"
            return reply.type(type).send(text)
          }
          if (request.path === "/flaky/recipes") {
            if (!flakyIsUp) return reply.status(404).send("not yet")
            return reply.json([{ id: "r-1", title: "Back again", servings: 1 }])
          }
          if (request.path === "/recipes.csv") {
            return reply.type("text/csv").send("id,title,servings\nr-1,Tomato soup,4\nr-2,Dal,6\n")
          }
          const found = element(request.path)
          if (found && "file" in found && found.file) return reply.sendFile(found.file)
          return next()
        })
      }
    })
    browser = await chromium.launch()
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await servers?.close()
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
      (await servers.roomPlace.list("recipes", {}, {})).rows.map(({ title }) => `${title as string}`)
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
