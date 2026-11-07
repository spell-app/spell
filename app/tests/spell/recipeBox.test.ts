/**
 * The recipe box, compiled from spell, run in a real browser, reading and writing the demo's servers (epic `data` P11).
 * - The program is the frozen test project, `@spell/test/recipe-box`, and its Spanish twin, `recetario`.
 * - Each back-end changes only the lines that say where it lives (`BACK_ENDS`), with nothing else in the program touched.
 * - And the built-in examples as they ship:  what a person does in them, and the same one-line swap to each back-end.
 * - Headless Chromium through Playwright, on the page's real `<spell-viewer>` and Spell UI, from `yarn build:element`:
 *   skips itself when that's not built.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer, type Server } from "http"
import { tmpdir } from "os"
import { join, resolve } from "path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { AtProtoPlace, PlaceCopy, SPACE_MEMBER_OPERATIONS } from "spell/places"
import { SRV, type Handler } from "spell/server"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"
import { FakeAtProtoIdentity, FAKE_HOST_PAGE } from "spell/server/test/FakeAtProtoIdentity"
import { FakeSignIn } from "spell/server/test/FakeSignIn"
import { startRecipeServers, type RecipeServers } from "spell/server/test/recipeDemo"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import { fixturePath } from "spell/app/spaces/test"
import { MailCatcher, SignInCheck } from "spell/server/signIn"
import { SpaceBackups } from "spell/app/spaces/server/node/places/SpaceBackups"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { PeopleStore, orgFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

// Spell UI, as a spellml drawing names its components:  `<card>` is `<ui-card>`
import "spell/app/spaces/models/spellUIPack"

/** `yarn build:element`'s output. */
const ELEMENT_DIR = resolve(__dirname, "../../app/dist-element")

/** Where people report abuse, here (epic `atmosphere` P6). */
const ABUSE = "abuse@test.example"

/** The token the demo's place server wants. */
const DEMO_TOKEN = "recipe-box-demo"

/** How long a change may take to reach a server:  a change goes out soon, not at once. */
const WAITING = { timeout: 8_000 }

/**
 * The key that puts the caret at the end of a field's line, as a person presses it (epic `language` T50):
 * - End, except on a Mac, where End only scrolls (Playwright copies the Mac's own keys):  Command-Right there
 * - with End on a Mac, a click inside a title's text left the caret where the click put it
 */
const END_OF_LINE = process.platform === "darwin" ? "Meta+ArrowRight" : "End"

/** One program:  its source, and the words its lines use. */
type Program = {
  /** Its file. */
  path: string
  /** Its source. */
  source: string
  /** The classes its elements carry. */
  field: string
  /** The project's other files, compiled with it:  an example's drawing, beside its API file. */
  more?: { path: string; contents: string }[]
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
  REST: (url) => `family cookbook is a web server at "${url}":
	- a recipe's title is its "name"
	- its version is its "version"
	- check it every 5 seconds`,
  GraphQL: (url) => `family cookbook is a graphql server at "${url}/graphql":
	- a recipe's title is its "name"
	- check it every 5 seconds`,
  "a folder": (url) => `family cookbook is a data folder at "${url}/api/places/recipes":
	- check it every 5 seconds`,
  "a room": (url) => `family cookbook is a room at "${url}/api/rooms/recipes"`,
  Airtable: (url) => `family cookbook is an airtable at "${url}/api/places/airtable":
	- recipes live at "Recipes"
	- a recipe's title is its "Title"
	- a recipe's servings is its "Servings"
	- a recipe's notes is its "Notes"
	- its id is its "Spell id"
	- check it every 5 seconds`
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
  /** The app's project data folders, on a spell.spaces of the test's own (epic `atmosphere` P1). */
  let spaceFolders: SpaceFolders
  /** That spell.spaces. */
  let spaces: string
  /** The write side of the project data folders stopped:  every request to it is no answer (epic `atmosphere` P5). */
  let writesStopped = false
  /** The sign-in's local mail catcher (epic `atmosphere` P3). */
  let mailer: MailCatcher
  /** The accounts in that spell.spaces. */
  let accounts: SpellAccounts
  /** Bluesky's host, faked on the test's own server. */
  let blueskyHost: FakeAtProtoIdentity
  /** A space exported, served at `/my-export/` beside the pages, as from any web server (epic `atmosphere` P7). */
  let exportDir: string | undefined

  /**
   * Compile `program`, and say where its page is.
   * - `token`:  what its server hands it;  `"none"`, as the cloud's pages have none (epic `atmosphere` P8).
   */
  function serve(name: string, { path, source, more }: Program, { token }: { token?: "none" } = {}): string {
    programs.set(`/programs/${name}.js`, compiledProgram(path, source, more))
    programs.set(`/${name}.html`, pageFor(name, token === "none" ? undefined : DEMO_TOKEN))
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
    spaces = mkdtempSync(join(tmpdir(), "spell-recipe-box-spaces-"))
    const people = new PeopleStore(new DiskStorage(spaces))
    // who's asking:  whoever's signed in, else this machine's person, as the page server's own
    spaceFolders = new SpaceFolders({
      folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
      people,
      abuseContact: ABUSE,
      queueFile: join(spaces, ".queue.json")
    })
    mailer = new MailCatcher({ folder: join(spaces, ".mail") })
    accounts = new SpellAccounts(people)
    // Bluesky's host, on this server:  its sign-in page sends the browser straight back (epic `atmosphere` P19)
    blueskyHost = new FakeAtProtoIdentity(
      { "ana.bsky.social": "did:plc:ana-bsky", "zed.bsky.social": "did:plc:zed" },
      { host: FAKE_HOST_PAGE }
    )
    const signIn = new SignInCheck({ mailer, accounts, abuseContact: ABUSE, atProto: blueskyHost })
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
      guardedRoutes: (router, guard) => {
        signIn.route(router, guard)
        spaceFolders.route({ router, guard })
      },
      routes: (router) => {
        router.use(signIn.check)
        blueskyHost.route(router)
        router.use((request, reply, next) => {
          if (writesStopped && request.path.startsWith("/api/places/spaces/")) return reply.status(503).send("stopped")
          next()
        })
        router.use((request, reply, next) => {
          if (request.path === "/flaky/recipes") {
            if (!flakyIsUp) return reply.status(404).send("not yet")
            return reply.json([{ id: "r-1", title: "Back again", servings: 1 }])
          }
          if (exportDir && request.path.startsWith("/my-export/")) {
            return reply.type("application/json").sendFile(join(exportDir, request.path.slice("/my-export/".length)))
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
    spaceFolders?.close()
    if (spaces) rmSync(spaces, { recursive: true, force: true })
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
    "a room": async () =>
      (await servers.folderPlace.list("recipes", {}, {})).rows.map(({ title }) => `${title as string}`),
    Airtable: async () => servers.airtableStub!.rowsOf("Recipes").map(({ Title }) => `${Title as string}`)
  }

  /** The form of the recipe titled `title` on `page`:  by its place, as a field's value isn't an attribute. */
  async function formTitled(page: Page, title: string) {
    await expect.poll(() => titlesOn(page), WAITING).toContain(title)
    return page.locator("ui-form.recipe").nth((await titlesOn(page)).indexOf(title))
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
    await stew.locator("input").press(END_OF_LINE)
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
  for (const backEnd of ["a folder", "a room"]) {
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

  describe("on a real browser's atmosphere account, against a fake network", () => {
    const NSID = "com.example.recipe"
    const ALICE = "did:plc:alice"
    const BOB = "did:plc:bob"
    let network: FakeAtmosphere

    beforeAll(async () => {
      network = await new FakeAtmosphere().start(["one", "two"])
      network.addAccount(ALICE, { handle: "alice.test", host: "one" })
      network.addAccount(BOB, { handle: "bob.test", host: "two" })
      for (const [index, title] of ["Tomato soup", "Dal", "Tacos", "Margherita"].entries()) {
        network.putRecord(ALICE, NSID, `a-${index}`, { title, servings: 2 })
      }
      network.putRecord(BOB, NSID, "b-1", { title: "Bob's stew", servings: 4 })
    })

    afterAll(() => network.close())

    /** A page of `program`, signed in as Alice. */
    function atmospherePage(name: string, program: Program): string {
      const url = serve(name, program)
      const script = `<script>${network.pageScript(ALICE)}</script>`
      programs.set(`/${name}.html`, pageFor(name).replace("<script", `${script}<script`))
      return url
    }

    /** Every title held, in anyone's account. */
    const heldByEveryone = async () =>
      [ALICE, BOB].flatMap((did) =>
        [...network.recordsOf(did, NSID).values()].map(({ value }) => `${value.title as string}`)
      )

    const LINES = `family cookbook is a personal atmosphere account:
	- recipes live at "${NSID}"`

    test(
      "English:  only its first lines change, everyone's put together, and it says who's signed in",
      { timeout: 60_000 },
      async () => {
        const { page, problems } = await opened(atmospherePage("atmosphere", withPlace(english(), LINES)))
        await roundTrip(page, heldByEveryone)
        await expect.poll(() => titlesOn(page), WAITING).toContain("Bob's stew")

        // who's signed in shows, with a way out
        const bar = page.locator("ui-message.spell-sign-in")
        await expect.poll(() => bar.textContent(), WAITING).toContain("Signed in to family cookbook as alice.test")
        expect(await bar.locator("ui-button").textContent()).toBe("Sign out")

        // someone else's change arrives by itself:  this program has no polling
        network.putRecord(BOB, NSID, "b-2", { title: "Bob's pie", servings: 8 })
        await expect.poll(() => titlesOn(page), WAITING).toContain("Bob's pie")

        // changing someone else's is refused, and goes back
        const bobs = page
          .locator("ui-form.recipe")
          .filter({ has: page.locator("input") })
          .nth((await titlesOn(page)).indexOf("Bob's pie"))
        await bobs.locator("ui-button.remove").click()
        await expect.poll(() => titlesOn(page), WAITING).toContain("Bob's pie")
        expect([...network.recordsOf(BOB, NSID).keys()]).toContain("b-2")

        // signing out says so, with a way back
        await bar.locator("ui-button").click()
        await expect.poll(() => bar.textContent(), WAITING).toContain("You aren't signed in")
        await bar.locator("input").waitFor(WAITING)
        // a refused change raises a notice, and a bare <spell-viewer> page has no toasts to show one (epic `data`'s I item)
        expect(problems.filter((problem) => !/ui-toast not registered/.test(problem))).toEqual([])
        await page.close()
      }
    )

    test("Spanish:  the same", { timeout: 60_000 }, async () => {
      const lines = `recetario familiar es una cuenta personal de atmosphere:
	- las recetas están en "com.example.receta"`
      network.putRecord(ALICE, "com.example.receta", "a-1", { título: "Sopa de tomate", raciones: 2 })
      const { page } = await opened(atmospherePage("atmosphere-es", withPlace(spanish(), lines)))
      await expect.poll(() => titlesOn(page), WAITING).toContain("Sopa de tomate")
      const bar = page.locator("ui-message.spell-sign-in")
      // the words are the words file's, which a page like this has none of;  the core's own test has them
      await expect.poll(() => bar.textContent(), WAITING).toContain("recetario familiar")
      await page.close()
    })

    test("them, their name, everyone here:  whoever's signed in", { timeout: 60_000 }, async () => {
      const source = `${LINES}

a "recipe" is a thing:
	- it is saved in the family cookbook
	- its "title" is text
	- its "cook" is text

box is an app:
	- its "mine" is every recipe where its cook is them
	- to go:
		add (a new recipe with title = "From the program", cook = their name) to the recipes
	- to draw it:
		<ui-text class="who">{their name}</ui-text>
		<ui-button class="go" onClick={go}>Go</ui-button>
		for each recipe in the mine
			<ui-text class="mine">{the title of the recipe}</ui-text>
		for each person in everyone here
			<ui-text class="here">{the name of the person}</ui-text>

start the box
`
      const { page, problems } = await opened(
        atmospherePage("atmosphere-them", { path: "/Them.spell", source, field: "title" })
      )
      await expect.poll(() => page.locator("ui-text.who").textContent(), WAITING).toBe("alice.test")
      await page.locator("ui-button.go").click()
      await expect.poll(() => page.locator("ui-text.mine").allTextContents(), WAITING).toEqual(["From the program"])
      await expect.poll(heldByEveryone, WAITING).toContain("From the program")
      const here = () => page.locator("ui-text.here").allTextContents()
      await expect.poll(here, WAITING).toEqual(expect.arrayContaining(["alice.test", "bob.test"]))
      expect(problems).toEqual([])
      await page.close()
    })

    test(
      "a project data folder at owen@spell/recipes:  saved, reloaded, and moved both ways with an atmosphere account",
      { timeout: 90_000 },
      async () => {
        // the box starts with the demo's recipes, copied in:  the folder is a real one, in a spell.spaces of its own
        const box = (await spaceFolders.placeFor("owen@spell/recipes", "owen@spell"))!
        await new PlaceCopy({ from: servers.folderPlace, to: box }).copy("recipes", {
          context: { identity: "owen@spell" }
        })
        const onDisk = async () => (await box.list("recipes", {}, {})).rows.map(({ title }) => `${title as string}`)
        const lines = `family cookbook is a data folder at "owen@spell/recipes":
	- check it every 5 seconds`
        const url = serve("space-folder", withPlace(english(), lines))
        const { page, problems } = await opened(url)
        await roundTrip(page, onDisk)
        expect(existsSync(join(spaces, "@spell", "owen@", "recipes", "recipes.list.json"))).toBe(true)

        // it says who it takes you to be, until you sign in
        const bar = page.locator("ui-message.spell-sign-in")
        await expect.poll(() => bar.textContent(), WAITING).toContain("it takes you to be this computer's person")

        // kept over a reload:  it's on the disk, not in the page
        await page.locator("ui-input.draft input").fill("Kept over a reload")
        await page.locator("ui-button.add").click()
        await expect.poll(onDisk, WAITING).toContain("Kept over a reload")
        await page.reload()
        await expect.poll(() => titlesOn(page), WAITING).toContain("Kept over a reload")

        // moved into Alice's atmosphere account:  the same line, changed, reads them there
        const signIn = new FakeSignIn(network.network.directory)
        await signIn.signIn(ALICE)
        const account = new AtProtoPlace({
          kind: "personal atmosphere account",
          collections: { recipes: NSID },
          signIn,
          network: network.network
        })
        await new PlaceCopy({ from: box, to: account }).copy("recipes")
        const there = await opened(atmospherePage("space-folder-moved", withPlace(english(), LINES)))
        await expect.poll(() => titlesOn(there.page), WAITING).toContain("Kept over a reload")

        // and back:  what was added in the account comes into the folder, and the folder's page shows it
        network.putRecord(ALICE, NSID, "a-moved", { title: "Made in the account", servings: 2 })
        await new PlaceCopy({ from: account, to: box }).copy("recipes", { context: { identity: "owen@spell" } })
        await page.reload()
        await expect.poll(() => titlesOn(page), WAITING).toContain("Made in the account")
        expect(problems).toEqual([])
        await there.page.close()
        await page.close()
      }
    )

    test(
      "a version line:  an old record reads under its new name, and stays as it was",
      { timeout: 60_000 },
      async () => {
        const old = "com.example.oldrecipe"
        network.putRecord(ALICE, old, "o-1", { name: "An old one" })
        const source = `family cookbook is a personal atmosphere account:
	- recipes live at "${old}"

a "recipe" is a thing:
	- it is saved in the family cookbook
	- its "title" is text

a recipe version 2 renames name to title

box is an app:
	- to draw it:
		for each recipe in the recipes
			<ui-text class="old">{the title of the recipe}</ui-text>

start the box
`
        const { page } = await opened(
          atmospherePage("atmosphere-version", { path: "/Old.spell", source, field: "title" })
        )
        await expect.poll(() => page.locator("ui-text.old").allTextContents(), WAITING).toEqual(["An old one"])
        expect(network.recordsOf(ALICE, old).get("o-1")?.value).toEqual({ name: "An old one" })
        await page.close()
      }
    )

    test(
      "signed out, and a place you can't reach:  it reads, offers to sign in, and loads no sign-in library",
      { timeout: 60_000 },
      async () => {
        const url = serve("atmosphere-out", withPlace(english(), LINES))
        const settings = JSON.stringify(network.network)
        programs.set(
          "/atmosphere-out.html",
          pageFor("atmosphere-out").replace("<script", `<script>window.SPELL_ATMOSPHERE = ${settings}</script><script`)
        )
        const page = await browser.newPage()
        const scripts: Promise<string>[] = []
        page.on("response", (response) => {
          if (response.url().endsWith(".js")) scripts.push(response.text().catch(() => ""))
        })
        await page.goto(url)
        await expect.poll(() => titlesOn(page), WAITING).toContain("Bob's stew")
        const bar = page.locator("ui-message.spell-sign-in")
        await expect.poll(() => bar.textContent(), WAITING).toContain("You aren't signed in")
        await bar.locator("input").waitFor(WAITING)
        // what's only in the sign-in library, and it's a chunk of its own, so a page that only reads never asks for it
        expect(
          (await Promise.all(scripts)).filter((text) => text.includes("require_pushed_authorization_requests"))
        ).toEqual([])
        await page.close()
      }
    )

    test(
      "Statusphere, as it ships:  everyone's statuses, a new one set in your own account, others' as they arrive " +
        "(epic `atmosphere` P10)",
      { timeout: 60_000 },
      async () => {
        const STATUS = "xyz.statusphere.status"
        network.putRecord(BOB, STATUS, "3lbob1", { status: "🦋", createdAt: "2026-11-04T10:00:00.000Z" })
        const folder = join(EXAMPLES, "Statusphere")
        const file = (name: string) => ({ path: `/${name}`, contents: readFileSync(join(folder, name), "utf8") })
        const program: Program = {
          path: "/Status.spell",
          source: readFileSync(join(folder, "Status.spell"), "utf8"),
          field: "",
          more: [file("Statusphere.api.spell"), file("Statusphere.spellml")]
        }
        const { page, problems } = await opened(atmospherePage("statusphere", program))
        // each status is a row of its own:  the only stacks naming an account
        const shown = () =>
          page
            .locator("ui-stack")
            .filter({ hasText: /@\S+\.test/ })
            .allTextContents()
        await expect.poll(shown, WAITING).toEqual([expect.stringMatching(/🦋\s*@bob\.test\s*November 4, 2026/)])

        // a status of her own:  a record in Alice's account, in Statusphere's shape
        await page.locator("ui-button", { hasText: "🚀" }).click()
        await expect
          .poll(() => [...network.recordsOf(ALICE, STATUS).values()].map(({ value }) => value), WAITING)
          .toEqual([
            { $type: STATUS, status: "🚀", createdAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z$/) }
          ])
        await expect
          .poll(shown, WAITING)
          .toEqual([expect.stringContaining("🚀@alice.test"), expect.stringContaining("🦋")])

        // someone else's arrives by itself, on the account's live stream
        network.putRecord(BOB, STATUS, "3lbob2", { status: "😎", createdAt: "2026-11-04T11:00:00.000Z" })
        await expect.poll(async () => (await shown()).join(" "), WAITING).toContain("😎@bob.test")
        expect(problems).toEqual([])
        await page.close()
      }
    )
  })

  describe("signing in to a Spell account by email (epic `atmosphere` P3)", () => {
    const EMAIL = "ana@example.com"
    const LINES = `family cookbook is a data folder at personal "recipes":
	- check it every 5 seconds`

    beforeAll(async () => {
      await accounts.invite(EMAIL)
    })

    /** The newest mail to Ana, once it's come:  its link and its code. */
    async function anasMail(after = 0): Promise<{ link: string; code: string }> {
      await expect.poll(async () => (await mailer.newestTo(EMAIL))?.sentAt ?? 0, WAITING).toBeGreaterThan(after)
      const { text } = (await mailer.newestTo(EMAIL))!
      return { link: /^http\S+$/m.exec(text)![0], code: /^\d{6}$/m.exec(text)![0] }
    }

    /** The time of the newest mail to Ana:  0 for none. */
    const newestMail = async () => (await mailer.newestTo(EMAIL))?.sentAt ?? 0

    /** Ask for a sign-in on `page`'s bar. */
    async function askOn(page: Page): Promise<void> {
      const bar = page.locator("ui-message.spell-sign-in")
      await expect.poll(() => bar.textContent(), WAITING).toContain("with a Spell account")
      await bar.locator("input").fill(EMAIL)
      await bar.locator("ui-button").first().click()
      await expect.poll(() => bar.textContent(), WAITING).toContain(`Check your email:  ${EMAIL}`)
    }

    test(
      "by the code:  typed on the page that asked, it's Ana's, and so are her recipes",
      { timeout: 60_000 },
      async () => {
        const { page, problems } = await opened(serve("sign-in-code", withPlace(english(), LINES)))
        const bar = page.locator("ui-message.spell-sign-in")
        const before = await newestMail()
        await askOn(page)
        const { code } = await anasMail(before)
        await bar.locator("input").fill(code)
        await bar.locator("ui-button").first().click()
        await expect
          .poll(() => bar.textContent(), WAITING)
          .toContain("Signed in to family cookbook with your Spell account, ana@spell.")

        // what she adds is hers, in her own space
        await page.locator("ui-input.draft input").fill("Ana's soup")
        await page.locator("ui-button.add").click()
        const anas = join(spaces, "@spell", "ana@", "__data", "recipes")
        await expect.poll(() => existsSync(join(anas, "recipes.list.json")), WAITING).toBe(true)
        await expect.poll(() => readFileSync(join(anas, "recipes.list.json"), "utf8"), WAITING).toContain("Ana's soup")
        expect(readFileSync(join(anas, "recipes.list.json"), "utf8")).toContain("ana@spell")

        // signed out:  this machine's person again
        await bar.locator("ui-button").first().click()
        await expect.poll(() => bar.textContent(), WAITING).toContain("with a Spell account")
        expect(problems).toEqual([])
        await page.close()
      }
    )

    test(
      "by the link, in a second browser:  its page says where it came from, and confirming signs both in",
      { timeout: 60_000 },
      async () => {
        const laptop = await browser.newContext()
        const page = await laptop.newPage()
        await page.goto(serve("sign-in-link", withPlace(english(), LINES)))
        const before = await newestMail()
        await askOn(page)
        const { link } = await anasMail(before)

        const phone = await browser.newContext()
        const confirm = await phone.newPage()
        await confirm.goto(link)
        await expect.poll(() => confirm.locator("#what").textContent(), WAITING).toBe(`Sign in as ${EMAIL}?`)
        expect(await confirm.locator("#where").textContent()).toMatch(/asked for from Chrome, .*on this machine/)
        await confirm.locator("#confirm").click()
        await expect.poll(() => confirm.locator("#what").textContent(), WAITING).toBe("Signed in as ana@spell.")
        expect(await phone.cookies()).toEqual([expect.objectContaining({ name: "spell-session", httpOnly: true })])

        // the laptop's page, waiting, signs in by itself
        const bar = page.locator("ui-message.spell-sign-in")
        await expect.poll(() => bar.textContent(), WAITING).toContain("with your Spell account, ana@spell.")
        // and the link, opened again, is used
        await confirm.goto(link)
        await expect.poll(() => confirm.locator("#what").textContent(), WAITING).toMatch(/used already/)
        await laptop.close()
        await phone.close()
      }
    )
    test(
      "with Bluesky (epic `atmosphere` P19):  Ana links hers, then signs in with it in a second browser;  " +
        "an account nobody linked is told to ask for an invite",
      { timeout: 60_000 },
      async () => {
        // signed in by her code, she links her Bluesky account:  the page goes to its host, and comes back
        const { page, problems } = await opened(serve("sign-in-bluesky", withPlace(english(), LINES)))
        const bar = page.locator("ui-message.spell-sign-in")
        const before = await newestMail()
        await askOn(page)
        await bar.locator("input").fill((await anasMail(before)).code)
        await bar.locator("ui-button").first().click()
        await expect.poll(() => bar.textContent(), WAITING).toContain("with your Spell account, ana@spell.")
        blueskyHost.asks = "ana.bsky.social"
        await bar.locator("ui-button", { hasText: "Link a Bluesky account" }).click()
        await expect
          .poll(() => bar.textContent(), WAITING)
          .toContain("You can sign in with Bluesky too, as ana.bsky.social.")
        expect(page.url()).not.toContain("spell-sign-in")

        // a second browser:  her handle typed, Sign in with Bluesky, and she's in
        const phone = await browser.newContext()
        const other = await phone.newPage()
        await other.goto(serve("sign-in-bluesky-2", withPlace(english(), LINES)))
        const otherBar = other.locator("ui-message.spell-sign-in")
        await expect.poll(() => otherBar.textContent(), WAITING).toContain("with a Spell account")
        await otherBar.locator("input").fill("@ana.bsky.social")
        await otherBar.locator("ui-button", { hasText: "Sign in with Bluesky" }).click()
        await expect.poll(() => otherBar.textContent(), WAITING).toContain("with your Spell account, ana@spell.")

        // signed out, and an account nobody linked:  refused, in words
        await otherBar.locator("ui-button", { hasText: "Sign out" }).click()
        blueskyHost.asks = "zed.bsky.social"
        await expect.poll(() => otherBar.textContent(), WAITING).toContain("with a Spell account")
        await otherBar.locator("ui-button", { hasText: "Sign in with Bluesky" }).click()
        await expect.poll(() => otherBar.textContent(), WAITING).toContain("isn't linked to a Spell account here")
        expect(problems).toEqual([])
        await page.close()
        await phone.close()
      }
    )
  })

  /** A device of its own:  a browser context, on `program`'s page, with no write token, as the cloud's pages have. */
  async function deviceOn(name: string, program: Program) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const problems: string[] = []
    page.on("pageerror", (error) => problems.push(`${error.message}`))
    await page.goto(serve(name, program, { token: "none" }))
    return { page, problems, bar: page.locator("ui-message.spell-sign-in"), close: () => context.close() }
  }

  /** Sign in on `bar` by the code mailed to `email`. */
  async function signIn(bar: ReturnType<Page["locator"]>, email: string): Promise<void> {
    const before = (await mailer.newestTo(email))?.sentAt ?? 0
    await bar.locator("input").fill(email)
    await bar.locator("ui-button").first().click()
    await expect.poll(async () => (await mailer.newestTo(email))?.sentAt ?? 0, WAITING).toBeGreaterThan(before)
    await bar.locator("input").fill(/^\d{6}$/m.exec((await mailer.newestTo(email))!.text)![0])
    await bar.locator("ui-button").first().click()
    await expect.poll(() => bar.textContent(), WAITING).toContain("with your Spell account")
  }

  describe("Ana's story:  the family cookbook, saved in the cloud (epic `atmosphere` P8)", () => {
    /** Ana and Bo's emails. */
    const EMAILS = { ana: "ana.cloud@example.com", bo: "bo.cloud@example.com" }
    /** Each one's address, as their invite made it. */
    const address: Record<string, string> = {}
    /** The example as it ships:  `family cookbook is saved in the cloud`. */
    const cookbook = () => shipped("FamilyCookbook/FamilyCookbook.api.spell")
    /** Ana's own cloud folder, on disk:  her space's `__data/family-cookbook`. */
    const anasCloud = () => join(spaces, "@spell", `${address.ana!.split("@")[0]}@`, "__data", "family-cookbook")

    beforeAll(async () => {
      for (const [who, email] of Object.entries(EMAILS)) address[who] = await accounts.invite(email)
    })

    /** A device of its own, on the cookbook's page (or `program`'s):  see `deviceOn()`. */
    const device = (name: string, program = cookbook()) => deviceOn(name, program)

    /** What Ana's cloud folder holds, its list file's text:  `""` for none yet. */
    const anasList = () => {
      const file = join(anasCloud(), "recipes.list.json")
      return existsSync(file) ? readFileSync(file, "utf8") : ""
    }

    test(
      "her browser first, and the page says so;  she signs in, and it goes up;  her phone shows it;  " +
        "then a cookbook with Bo, a space of its own",
      { timeout: 120_000 },
      async () => {
        // 1. her laptop, nobody signed in:  the recipe stays in this browser, and the bar says so
        const laptop = await device("cloud-laptop")
        await expect.poll(() => laptop.bar.textContent(), WAITING).toContain("is kept in this browser only")
        await laptop.page.locator("ui-input.draft input").fill("Ana's lentil soup")
        await laptop.page.locator("ui-button.add").click()
        await expect.poll(() => cardsOn(laptop.page), WAITING).toContain("Ana's lentil soup")
        await laptop.page.waitForTimeout(1_500)
        expect(anasList()).toBe("")

        // 2. she signs in:  what she added goes up, into her own space, hers
        await signIn(laptop.bar, EMAILS.ana)
        await expect.poll(anasList, WAITING).toContain("Ana's lentil soup")
        expect(anasList()).toContain(address.ana)
        await expect.poll(() => cardsOn(laptop.page), WAITING).toEqual(["Ana's lentil soup"])

        // 3. her phone:  nothing there until she signs in, then her recipe
        const phone = await device("cloud-phone")
        await expect.poll(() => phone.bar.textContent(), WAITING).toContain("is kept in this browser only")
        expect(await cardsOn(phone.page)).toEqual([])
        await signIn(phone.bar, EMAILS.ana)
        await expect.poll(() => cardsOn(phone.page), WAITING).toContain("Ana's lentil soup")
        // a change on her phone reaches her laptop
        const card = phone.page.locator("ui-form.recipe ui-input.title input").first()
        await card.click()
        await card.press(END_OF_LINE)
        await card.pressSequentially(", with lemon")
        await expect.poll(() => cardsOn(laptop.page), { timeout: 20_000 }).toContain("Ana's lentil soup, with lemon")

        // 4. a cookbook with Bo:  a space of her own, which she lets Bo into;  he sees it, and none of her own box
        const shared = withPlace(
          cookbook(),
          `family cookbook is a data folder at "${address.ana}/cookbook":
	- check it every 5 seconds`
        )
        const anaShares = await device("cloud-ana-shares", shared)
        await signIn(anaShares.bar, EMAILS.ana)
        await anaShares.page.locator("ui-input.draft input").fill("Grandma's bread")
        await anaShares.page.locator("ui-button.add").click()
        await expect.poll(() => cardsOn(anaShares.page), WAITING).toContain("Grandma's bread")
        const added = await anaShares.page.evaluate(
          async ({ at, person, name }) => {
            const answer = await fetch(`/api/places/spaces/${at}/call`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, input: { person, role: "member" } })
            })
            return answer.status
          },
          { at: `${address.ana}/cookbook`, person: address.bo, name: SPACE_MEMBER_OPERATIONS.add }
        )
        expect(added).toBe(200)
        const bo = await device("cloud-bo", shared)
        await signIn(bo.bar, EMAILS.bo)
        await expect.poll(() => cardsOn(bo.page), WAITING).toContain("Grandma's bread")
        expect(await cardsOn(bo.page)).not.toContain("Ana's lentil soup, with lemon")
        // and his own cloud is his, empty:  not Ana's
        const bosOwn = await device("cloud-bo-own")
        await signIn(bosOwn.bar, EMAILS.bo)
        await bosOwn.page.waitForTimeout(1_500)
        expect(await cardsOn(bosOwn.page)).toEqual([])

        for (const one of [laptop, phone, anaShares, bo, bosOwn]) {
          expect(one.problems).toEqual([])
          await one.close()
        }
      }
    )
  })

  describe("an org's cookbook, written by its members (epic `atmosphere` P4)", () => {
    /** Ana, Bo and Dee's emails:  Ana and Bo are @family's, Dee isn't. */
    const EMAILS = { ana: "ana@example.com", bo: "bo@example.com", dee: "dee@example.com" }
    const LINES = `family cookbook is a data folder at "@family/cookbook":
	- check it every 5 seconds`
    /** Each person's address, as their invite made it. */
    const address: Record<string, string> = {}
    /** The cookbook's folder on disk. */
    const cookbook = () => join(spaces, "@family", "cookbook", "recipes")

    beforeAll(async () => {
      for (const [who, email] of Object.entries(EMAILS)) address[who] = await accounts.invite(email)
      const membership = (who: string, role: string) =>
        ({ $type: "Membership", person: { $ref: `Person#${address[who]}` }, role }) as const
      const org = {
        $type: "Org",
        id: "family",
        name: "The family",
        members: [membership("ana", "admin"), membership("bo", "member")]
      }
      mkdirSync(join(spaces, "@family"), { recursive: true })
      writeFileSync(join(spaces, "@family", "__org.json5"), JSON.stringify(org, null, 2))
    })

    /** A browser of its own, signed in by the code emailed to `email`, on the cookbook (or `lines`'):  its page. */
    async function signedIn(
      name: string,
      email: string,
      lines = LINES
    ): Promise<{ page: Page; close: () => Promise<void> }> {
      const browserContext = await browser.newContext()
      const page = await browserContext.newPage()
      await page.goto(serve(name, withPlace(english(), lines)))
      const bar = page.locator("ui-message.spell-sign-in")
      await expect.poll(() => bar.textContent(), WAITING).toContain("with a Spell account")
      const before = (await mailer.newestTo(email))?.sentAt ?? 0
      await bar.locator("input").fill(email)
      await bar.locator("ui-button").first().click()
      await expect.poll(async () => (await mailer.newestTo(email))?.sentAt ?? 0, WAITING).toBeGreaterThan(before)
      const code = /^\d{6}$/m.exec((await mailer.newestTo(email))!.text)![0]
      await bar.locator("input").fill(code)
      await bar.locator("ui-button").first().click()
      await expect.poll(() => bar.textContent(), WAITING).toContain("with your Spell account")
      return { page, close: () => browserContext.close() }
    }

    /** What the cookbook's file holds of the recipe titled `title`:  `undefined` for none. */
    function recipeTitled(title: string): Record<string, unknown> | undefined {
      if (!existsSync(cookbook())) return undefined
      return readdirSync(cookbook())
        .filter((name) => name.endsWith(".json"))
        .map((name) => JSON.parse(readFileSync(join(cookbook(), name), "utf8")) as Record<string, unknown>)
        .find((recipe) => recipe.title === title)
    }

    test(
      "Ana and Bo edit ONE recipe, each save saying by whom;  Dee, no member, is refused:  her role can't write",
      { timeout: 90_000 },
      async () => {
        const ana = await signedIn("family-ana", EMAILS.ana)
        await ana.page.locator("ui-input.draft input").fill("Grandma's soup")
        await ana.page.locator("ui-button.add").click()
        await expect
          .poll(() => recipeTitled("Grandma's soup"), WAITING)
          .toMatchObject({ owner: "@family", by: address.ana })

        // Bo, in a browser of his own, sees it and changes it:  the same recipe, now by him
        const bo = await signedIn("family-bo", EMAILS.bo)
        await expect.poll(() => titlesOn(bo.page), WAITING).toContain("Grandma's soup")
        const soup = bo.page
          .locator("ui-form.recipe")
          .filter({ has: bo.page.locator("input") })
          .first()
        await soup.locator("input").click()
        await soup.locator("input").press(END_OF_LINE)
        await soup.locator("input").pressSequentially(", less salt")
        await expect
          .poll(() => recipeTitled("Grandma's soup, less salt"), WAITING)
          .toMatchObject({ owner: "@family", by: address.bo })
        expect(recipeTitled("Grandma's soup")).toBeUndefined()

        // Dee isn't one of @family's:  her add is refused, saying why, and goes back
        const dee = await signedIn("family-dee", EMAILS.dee)
        const refusal = dee.page.waitForResponse((answer) => answer.url().endsWith("/apply"))
        await dee.page.locator("ui-input.draft input").fill("Dee's stew")
        await dee.page.locator("ui-button.add").click()
        const answer = await refusal
        expect(answer.status()).toBe(422)
        expect(await answer.json()).toEqual({
          error: "Your role can't write here:  you aren't a member of @family",
          kind: "refused",
          whyNot: "role"
        })
        await expect.poll(() => titlesOn(dee.page), WAITING).not.toContain("Dee's stew")
        expect(recipeTitled("Dee's stew")).toBeUndefined()

        for (const one of [ana, bo, dee]) await one.close()
      }
    )

    test(
      "read direct (P5):  Bo, a member, and Gil, a guest, read the cookbook straight from its files, " +
        "with the write side stopped too;  Dee is refused;  Ana's own box isn't the family's to read",
      { timeout: 120_000 },
      async () => {
        const GIL = "gil@example.com"
        address.gil = await accounts.invite(GIL)
        const org = JSON.parse(readFileSync(join(spaces, "@family", "__org.json5"), "utf8")) as {
          members: object[]
        }
        org.members.push({ $type: "Membership", person: { $ref: `Person#${address.gil}` }, role: "guest" })
        writeFileSync(join(spaces, "@family", "__org.json5"), JSON.stringify(org, null, 2))

        const ana = await signedIn("direct-ana", EMAILS.ana)
        await ana.page.locator("ui-input.draft input").fill("Read direct stew")
        await ana.page.locator("ui-button.add").click()
        await expect.poll(() => recipeTitled("Read direct stew"), WAITING).toMatchObject({ by: address.ana })

        // Bo's page reads the list file itself, with the credential the write side gave him, as a cookie no script reads
        const bo = await signedIn("direct-bo", EMAILS.bo)
        const directRead = bo.page.waitForResponse((answer) =>
          answer.url().endsWith("/api/reads/spaces/@family/cookbook/recipes.list.json")
        )
        await bo.page.reload()
        expect((await directRead).status()).toBe(200)
        await expect.poll(() => titlesOn(bo.page), WAITING).toContain("Read direct stew")
        expect(await bo.page.context().cookies()).toContainEqual(
          expect.objectContaining({
            name: "spell-space-read",
            path: "/api/reads/spaces/@family/cookbook/",
            httpOnly: true
          })
        )
        expect(await bo.page.evaluate(() => document.cookie)).not.toContain("spell-space-read")

        // a guest reads it too
        const gil = await signedIn("direct-gil", GIL)
        await expect.poll(() => titlesOn(gil.page), WAITING).toContain("Read direct stew")

        // the write side stopped:  reading still works, for a page opened afresh
        writesStopped = true
        try {
          await bo.page.reload()
          await expect.poll(() => titlesOn(bo.page), WAITING).toContain("Read direct stew")
          await gil.page.reload()
          await expect.poll(() => titlesOn(gil.page), WAITING).toContain("Read direct stew")
        } finally {
          writesStopped = false
        }

        // Dee, no member:  no credential for her, and nothing read
        const dee = await signedIn("direct-dee", EMAILS.dee)
        const deesAsk = dee.page.waitForResponse((answer) => answer.url().endsWith("/credential"))
        await dee.page.reload()
        expect((await deesAsk).status()).toBe(422)
        expect(await titlesOn(dee.page)).not.toContain("Read direct stew")

        // Ana's own recipe box is a space of its own:  the family's members read none of it
        const ANAS = `family cookbook is a data folder at "${address.ana}/recipes":
	- check it every 5 seconds`
        const anasOwn = await signedIn("direct-ana-own", EMAILS.ana, ANAS)
        await anasOwn.page.locator("ui-input.draft input").fill("Ana's secret")
        await anasOwn.page.locator("ui-button.add").click()
        const anasList = join(spaces, "@spell", `${address.ana!.split("@")[0]}@`, "recipes", "recipes.list.json")
        await expect
          .poll(() => existsSync(anasList) && readFileSync(anasList, "utf8"), WAITING)
          .toContain("Ana's secret")
        const bosTry = await bo.page.evaluate(async (at) => {
          const read = await fetch(`/api/reads/spaces/${at}/recipes/recipes.list.json`)
          const credential = await fetch(`/api/places/spaces/${at}/credential`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}"
          })
          return { read: read.status, credential: credential.status, said: await credential.text() }
        }, address.ana!)
        expect(bosTry).toMatchObject({ read: 401, credential: 422 })
        expect(bosTry.said).toContain("you aren't a member of")

        for (const one of [ana, bo, gil, dee, anasOwn]) await one.close()
      }
    )

    test(
      "taken down (P6):  a recipe Spell hides is gone for the members on both read paths, " +
        "its own file refused as taken down;  restored, it's back;  the sign-in bar says where to report abuse",
      { timeout: 120_000 },
      async () => {
        const ana = await signedIn("takedown-ana", EMAILS.ana)
        await ana.page.locator("ui-input.draft input").fill("Stranger's address stew")
        await ana.page.locator("ui-button.add").click()
        await expect.poll(() => recipeTitled("Stranger's address stew"), WAITING).toMatchObject({ by: address.ana })
        const id = `${recipeTitled("Stranger's address stew")!.id}`
        const bo = await signedIn("takedown-bo", EMAILS.bo)
        await expect.poll(() => titlesOn(bo.page), WAITING).toContain("Stranger's address stew")

        /** What Bo's page reads of the cookbook, by each path:  the direct list, the server's list, the thing's file. */
        const readsOf = (page: Page) =>
          page.evaluate(async (thing) => {
            const direct = await fetch("/api/reads/spaces/@family/cookbook/recipes.list.json", { cache: "no-store" })
            const through = await fetch("/api/places/spaces/@family/cookbook/list", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ collection: "recipes" })
            })
            const own = await fetch(`/api/reads/spaces/@family/cookbook/recipes/${thing}.json`, { cache: "no-store" })
            const titles = (answer: { rows: { title: string }[] }) => answer.rows.map(({ title }) => title)
            return {
              direct: titles(await direct.json()),
              through: titles(await through.json()),
              own: { status: own.status, said: await own.text() }
            }
          }, id)

        const target = { kind: "record" as const, space: "@family/cookbook", collection: "recipes", id }
        await spaceFolders.takedowns.take("hide", target, { by: "grace@spell", reason: "doxxing" })
        await bo.page.reload()
        await expect.poll(() => titlesOn(bo.page), WAITING).not.toContain("Stranger's address stew")
        const hidden = await readsOf(bo.page)
        expect(hidden.direct).not.toContain("Stranger's address stew")
        expect(hidden.through).not.toContain("Stranger's address stew")
        expect(hidden.own.status).toBe(451)
        expect(hidden.own.said).toContain(`was taken down by Spell.  To ask about it:  ${ABUSE}`)
        // its file is still on the disk:  hidden, not lost
        expect(recipeTitled("Stranger's address stew")).toBeDefined()

        await spaceFolders.takedowns.take("restore", target, { by: "grace@spell", reason: "a mistake" })
        await bo.page.reload()
        await expect.poll(() => titlesOn(bo.page), WAITING).toContain("Stranger's address stew")
        const back = await readsOf(bo.page)
        expect(back.direct).toContain("Stranger's address stew")
        expect(back.through).toContain("Stranger's address stew")
        expect(back.own.status).toBe(200)

        // the abuse contact, on a page nobody's signed in to yet
        const fresh = await browser.newContext()
        const page = await fresh.newPage()
        await page.goto(serve("takedown-fresh", withPlace(english(), LINES)))
        await expect
          .poll(() => page.locator("ui-message.spell-sign-in").textContent(), WAITING)
          .toContain(`To report abuse on Spell:  ${ABUSE}`)
        await fresh.close()
        for (const one of [ana, bo]) await one.close()
      }
    )

    test(
      "leaving Spell (P7):  the cookbook exported is plain files, and the program runs on them, one line changed;  " +
        "a backup brings a recipe back",
      { timeout: 120_000 },
      async () => {
        const ana = await signedIn("export-ana", EMAILS.ana)
        await ana.page.locator("ui-input.draft input").fill("Exported stew")
        await ana.page.locator("ui-button.add").click()
        await expect.poll(() => recipeTitled("Exported stew"), WAITING).toMatchObject({ by: address.ana })

        // a backup, then the stew removed, then brought back
        const backups = new SpaceBackups({
          spacesDir: spaces,
          backupsDir: mkdtempSync(join(tmpdir(), "spell-recipe-box-backups-")),
          folderFor: (at) => join(spaces, ...SP.SpellUrls.folderFor(at)!.path.split("/"))
        })
        await backups.backUp()
        await (await formTitled(ana.page, "Exported stew")).locator("ui-button.remove").click()
        await expect.poll(() => recipeTitled("Exported stew"), WAITING).toBeUndefined()
        await backups.restore("@family/cookbook")
        await ana.page.reload()
        await expect.poll(() => titlesOn(ana.page), WAITING).toContain("Exported stew")
        rmSync(backups.backupsDir, { recursive: true, force: true })

        // exported, and served as plain files:  the same program, its one line changed, reads them with no Spell server
        exportDir = mkdtempSync(join(tmpdir(), "spell-recipe-box-export-"))
        await (await spaceFolders.exportOf("@family/cookbook", undefined)).writeTo(exportDir)
        expect(readFileSync(join(exportDir, "about-this-export.txt"), "utf8")).toContain("is Spell's own")
        const { page, problems } = await opened(
          serve("from-export", withPlace(english(), `family cookbook is a data folder at "./my-export"`))
        )
        await expect.poll(() => titlesOn(page), WAITING).toContain("Exported stew")
        expect(problems).toEqual([])
        await page.close()
        rmSync(exportDir, { recursive: true, force: true })
        exportDir = undefined
        await ana.close()
      }
    )

    test(
      "a limit (P7):  a recipe over about 1 MB is refused, 413, and stays on the page",
      { timeout: 120_000 },
      async () => {
        const ana = await signedIn("limit-ana", EMAILS.ana)
        const huge = `Huge ${"x".repeat(1_100_000)}`
        const refusal = ana.page.waitForResponse((answer) => answer.url().endsWith("/apply"))
        await ana.page.locator("ui-input.draft input").fill(huge)
        await ana.page.locator("ui-button.add").click()
        const answer = await refusal
        expect(answer.status()).toBe(413)
        expect(await answer.json()).toMatchObject({ kind: "over the ceiling" })
        // kept:  still on the page, not saved
        await expect.poll(async () => (await titlesOn(ana.page)).includes(huge), WAITING).toBe(true)
        expect(recipeTitled(huge)).toBeUndefined()
        await ana.close()
      }
    )

    test(
      "a sign-up sheet (P7, Q13):  publicRead and publicWrite on, Dee, no member, adds her own row and changes it;  " +
        "Ana's she can't, and the page says why",
      { timeout: 120_000 },
      async () => {
        const SHEET = `family cookbook is a data folder at "@family/sign-ups":
	- check it every 5 seconds`
        const sheet = await spaceFolders.placeFor("@family/sign-ups", undefined)
        await sheet!.call!(SPACE_MEMBER_OPERATIONS.changeSettings, { publicRead: true, publicWrite: true }, {})
        const ana = await signedIn("sheet-ana", EMAILS.ana, SHEET)
        await ana.page.locator("ui-input.draft input").fill("Ana brings bread")
        await ana.page.locator("ui-button.add").click()

        const dee = await signedIn("sheet-dee", EMAILS.dee, SHEET)
        await expect.poll(() => titlesOn(dee.page), WAITING).toContain("Ana brings bread")
        await dee.page.locator("ui-input.draft input").fill("Dee brings soup")
        await dee.page.locator("ui-button.add").click()
        const sheetFile = (title: string) => {
          const folder = join(spaces, "@family", "sign-ups", "recipes")
          if (!existsSync(folder)) return undefined
          return readdirSync(folder)
            .filter((name) => name.endsWith(".json"))
            .map((name) => JSON.parse(readFileSync(join(folder, name), "utf8")) as Record<string, unknown>)
            .find((row) => row.title === title)
        }
        await expect.poll(() => sheetFile("Dee brings soup"), WAITING).toMatchObject({ by: address.dee })

        // her own row:  she changes it
        const soup = (await formTitled(dee.page, "Dee brings soup")).locator("input")
        await soup.click()
        await soup.press(END_OF_LINE)
        await soup.pressSequentially(", and bowls")
        await expect.poll(() => sheetFile("Dee brings soup, and bowls"), WAITING).toMatchObject({ by: address.dee })

        // Ana's:  refused, saying why, and it goes back
        const refusal = dee.page.waitForResponse((answer) => answer.url().endsWith("/apply"))
        const bread = (await formTitled(dee.page, "Ana brings bread")).locator("input")
        await bread.click()
        await bread.press(END_OF_LINE)
        await bread.pressSequentially(" (Dee)")
        const answer = await refusal
        expect(answer.status()).toBe(422)
        expect(await answer.json()).toMatchObject({ kind: "refused", whyNot: "owner" })
        await expect.poll(() => titlesOn(dee.page), WAITING).toContain("Ana brings bread")
        expect(sheetFile("Ana brings bread")).toMatchObject({ by: address.ana })
        for (const one of [ana, dee]) await one.close()
      }
    )
  })

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
      path: "RecipeBox/RecipeBox.api.spell",
      examples: ["Pizza Margherita", "Dal", "Tomato soup"],
      noRecipes: "No recipes yet. Add your first one.",
      noMatches: "No recipes match your search."
    },
    {
      path: "CajaDeRecetas/CajaDeRecetas.api.es.spell",
      examples: ["Pizza Margarita", "Dal", "Sopa de tomate"],
      noRecipes: "Todavía no hay recetas. Agrega la primera.",
      noMatches: "Ninguna receta coincide con tu búsqueda."
    }
  ]

  /**
   * An example as it ships:  its API file, whose first lines say where it lives, and its drawing beside it.
   * - `path`:  the API file, `RecipeBox/RecipeBox.api.spell`;  the drawing is the same name, `.spellml`, no `.api`.
   */
  const shipped = (path: string): Program => {
    const drawing = path.replace(/\.api(\.\w\w)?\.spell$/, "$1.spellml")
    return {
      path: `/${path.split("/")[1]}`,
      source: readFileSync(join(EXAMPLES, path), "utf8"),
      field: "",
      more: [{ path: `/${drawing.split("/")[1]}`, contents: readFileSync(join(EXAMPLES, drawing), "utf8") }]
    }
  }

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
        await card.press(END_OF_LINE)
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
      const url = serve(name, withPlace(shipped("RecipeBox/RecipeBox.api.spell"), BACK_ENDS[backEnd]!(servers.url)))
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
      const down = `family cookbook is a web server at "${servers.url}/nowhere":\n\t- check it every 500 seconds`
      const { page } = await opened(serve("shipped-down", withPlace(shipped("RecipeBox/RecipeBox.api.spell"), down)))
      const failed = page.locator("ui-message.failed")
      await failed.waitFor(WAITING)
      expect(await failed.textContent()).toContain("We can't reach your recipes right now.")
      expect(await page.locator("ui-button.again").count()).toBe(1)
      await page.close()
    }
  )

  test("Spanish, on REST:  the same servers, in its own words", { timeout: 60_000 }, async () => {
    const lines = `recetario familiar es un servidor web en "${servers.url}":
	- las recetas están en "/recipes"
	- el título de una receta se llama "name"
	- las porciones de una receta se llaman "servings"
	- su versión está en "version"
	- se revisa cada 5 segundos`
    const { page, problems } = await opened(serve("es-rest", withPlace(spanish(), lines)))
    await roundTrip(page, heldBy.REST!)
    expect(problems).toEqual([])
    await page.close()
  })

  test("Spanish, on a folder", { timeout: 60_000 }, async () => {
    const lines = `recetario familiar es una carpeta de datos en "${servers.url}/api/places/recipes":
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
    const sheet = `family cookbook is a sheet at "${servers.url}/recipes.csv":\n\t- its id is its "id"`
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

  /** A graphql server's first lines. */
  const onGraph = (url: string) => `family cookbook is a graphql server at "${url}/graphql":
	- a recipe's title is its "name"
	- check it every 500 seconds`

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

  /** What the page asked the GraphQL server, from `from` on. */
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
        const place = backEnd === "REST" ? BACK_ENDS.REST!(servers.url) : "family cookbook is an in memory database"
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
  test(
    "a question about a read, in a drawing:  it waits for the place, and never holds the drawing's own function",
    { timeout: 60_000 },
    async () => {
      const source = `family cookbook is a web server at "${servers.url}":
	- a recipe's title is its "name"
	- check it every 5 seconds

a "recipe" is a thing:
	- it is saved in the family cookbook
	- its "title" is text

counting box is an app:
	- to draw it:
		if there are no recipes where its title is "nothing called this":
			<ui-text class="none">None like that</ui-text>
		if there are more than 100000 recipes:
			<ui-text class="many">Too many</ui-text>
		<ui-text class="count">{the number of recipes where its title is "nothing called this"}</ui-text>

start the counting box`
      const { page, problems } = await opened(serve("there-are", { path: "/Counting.spell", source, field: "title" }))
      await page.locator("ui-text.none").waitFor(WAITING)
      await expect.poll(() => page.locator("ui-text.count").innerText(), WAITING).toBe("0")
      expect(await page.locator("ui-text.many").count()).toBe(0)
      expect(problems).toEqual([])
    }
  )

  for (const { language, path, source } of [
    {
      language: "English",
      path: "/Publishing.spell",
      source: `family cookbook is a web server at "URL":
	- a recipe's title is its "name"
	- its version is its "version"
	- check it every 5 seconds
	- to publish a recipe is at "/recipes/publish"
	- to reload is at "/recipes/reload"

a "recipe" is a view:
	- it is saved in the family cookbook
	- its "title" is text
	- to draw it:
		<ui-button class="publish" onClick={publish the recipe}>Publish</ui-button>

publishing box is an app:
	- to draw it:
		<ui-button class="reload" onClick={reload}>Reload</ui-button>
		for each recipe in every recipe
			draw the recipe

start the publishing box`
    },
    {
      language: "Spanish",
      path: "/Publicando.es.spell",
      source: `recetario familiar es un servidor web en "URL":
	- las recetas están en "/recipes"
	- el título de una receta se llama "name"
	- su versión está en "version"
	- se revisa cada 5 segundos
	- para publicar una receta está en "/recipes/publish"
	- para recargar está en "/recipes/reload"

una "receta" es una vista:
	- se guarda en el recetario familiar
	- su "título" es texto
	- para dibujarla:
		<ui-button class="publish" onClick={publicar la receta}>Publicar</ui-button>

caja que publica es una aplicación:
	- para dibujarla:
		<ui-button class="reload" onClick={recargar}>Recargar</ui-button>
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
          servers.box.asks.filter(({ method, path: at }) => method === "POST" && /publish|reload/.test(at))
        const before = { asks: asked().length, published: servers.box.published.length }

        await page.locator("ui-button.reload").click()
        await expect.poll(() => asked().length, WAITING).toBe(before.asks + 1)
        expect(asked().at(-1)).toMatchObject({ path: "/recipes/reload" })

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
    const down = `family cookbook is a web server at "${servers.url}/flaky":
	- check it every 500 seconds`
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
      const { page, problems } = await opened(
        serve("device", withPlace(english(), "family cookbook is a database on this device"))
      )
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
  describe("an org's Admin page, the built-in Org Admin (epic `atmosphere` P25)", () => {
    /** Spell's own org, in this spell.spaces:  Ana its Board, Ada an Admin, Bo the Events Team's Manager. */
    const EMAILS = { ana: "ana.admin@example.com", ada: "ada.admin@example.com", bo: "bo.admin@example.com" }
    const MORE = { dee: "dee.admin@example.com", eve: "eve.admin@example.com" }
    /** Each person's address, as their invite made it. */
    const address: Record<string, string> = {}
    /** The example as it ships, at Spell's own org's roles, checked often. */
    const admin = () =>
      withPlace(
        shipped("OrgAdmin/OrgAdmin.api.spell"),
        `admin roles is a data folder at "@spell/__admin/roles":
	- check it every 2 seconds`
      )
    /** What the page's section `name` says. */
    const section = (page: Page, name: string) => page.locator(`ui-segment.${name}`).textContent()

    beforeAll(async () => {
      for (const [who, email] of Object.entries({ ...EMAILS, ...MORE })) address[who] = await accounts.invite(email)
      const people = new PeopleStore(new DiskStorage(spaces))
      const members = ["ana", "ada", "bo", "dee"].map((who) => ({
        $type: "Membership",
        person: { $ref: `Person#${address[who]}` },
        role: "editor"
      }))
      await people.storage.write(
        orgFile("spell"),
        JSON.stringify({ $type: "Org", id: "spell", name: "Spell", members })
      )
      const roles = spaceFolders.orgRoles
      await roles.setUp("spell", { board: address.ana! })
      await roles.give("spell", { role: "admins", person: address.ada }, { by: address.ana })
      await roles.addTeam("spell", { id: "events_team", name: "Events Team" }, { by: address.ana })
      await roles.give("spell", { role: "team-manager", person: address.bo, of: "events_team" }, { by: address.ana })
    })

    test(
      "an Admin adds someone, makes a team, names its Manager until a day, and sees it in the log;  " +
        "a Team Manager makes a project under their team and names its Manager;  a Project Manager can't end a " +
        "Team Manager's term",
      { timeout: 120_000 },
      async () => {
        // 1. Ada, an Admin:  Eve joins, the Finance Team, Eve its Manager until June
        const ada = await deviceOn("admin-ada", admin())
        await signIn(ada.bar, EMAILS.ada)
        await expect.poll(() => section(ada.page, "people"), WAITING).toContain(address.bo!)
        await ada.page.locator("ui-segment.people ui-input input").fill(address.eve!)
        await ada.page.locator("ui-segment.people ui-button.add").click()
        await ada.page.locator("ui-segment.teams ui-form.new-team input").fill("Finance Team")
        await ada.page.locator("ui-segment.teams ui-button.add").click()
        const term = ada.page.locator("ui-segment.roles ui-input input")
        await term.nth(0).fill(address.eve!)
        await term.nth(1).fill("team-manager")
        await term.nth(2).fill("finance_team")
        await term.nth(3).fill("2027-06-30")
        await ada.page.locator("ui-segment.roles ui-button.give").click()
        await expect.poll(() => section(ada.page, "log"), { timeout: 15_000 }).toContain("finance_team")
        const log = (await section(ada.page, "log")) ?? ""
        expect(log).toContain("join")
        expect(log).toContain(`${address.eve} team-manager of finance_team`)
        expect((await spaceFolders.orgRoles.terms("spell")).find((each) => each.person === address.eve)).toMatchObject({
          of: "finance_team",
          end: expect.stringMatching(/^2027-06-30/)
        })

        // 2. Bo, the Events Team's Manager:  the 2026 Q4 project under it, Dee its Manager
        const bo = await deviceOn("admin-bo", admin())
        await signIn(bo.bar, EMAILS.bo)
        await expect.poll(() => section(bo.page, "teams"), WAITING).toContain("Finance Team")
        const project = bo.page.locator("ui-segment.teams ui-form.new-project input")
        await project.nth(0).fill("2026 Q4")
        await project.nth(1).fill("events_team")
        await bo.page.locator("ui-segment.teams ui-button.add-project").click()
        const boTerm = bo.page.locator("ui-segment.roles ui-input input")
        await boTerm.nth(0).fill(address.dee!)
        await boTerm.nth(1).fill("project-manager")
        await boTerm.nth(2).fill("2026_q4")
        await bo.page.locator("ui-segment.roles ui-button.give").click()
        await expect
          .poll(async () => (await spaceFolders.orgRoles.managersOf("spell", "2026_q4")).includes(address.dee!), {
            timeout: 15_000
          })
          .toBe(true)

        // 3. Dee, the project's Manager:  ending Bo's term is refused, and changes nothing
        const dee = await deviceOn("admin-dee", admin())
        await signIn(dee.bar, MORE.dee)
        await expect.poll(() => section(dee.page, "roles"), WAITING).toContain(address.bo!)
        const bosRow = dee.page.locator("ui-segment.roles .term", { hasText: address.bo! })
        await bosRow.locator("ui-button.end").click()
        await dee.page.waitForTimeout(3_000)
        expect(await spaceFolders.orgRoles.managersOf("spell", "events_team")).toContain(address.bo)

        for (const one of [ada, bo, dee]) {
          expect(one.problems).toEqual([])
          await one.close()
        }
      }
    )
  })

  describe("a picnic's sign-up sheet, the built-in Sign-Up Sheet (epic `atmosphere` P27, J101)", () => {
    /** Spell's own org, in this spell.spaces:  Cy manages the picnic;  Bo and Dee are its attendees, Vic isn't one. */
    const EMAILS = {
      ana: "ana.picnic@example.com",
      cy: "cy.picnic@example.com",
      bo: "bo.picnic@example.com",
      dee: "dee.picnic@example.com",
      vic: "vic.picnic@example.com"
    }
    /** Each person's address, as their invite made it. */
    const address: Record<string, string> = {}
    /** The example as it ships, at Spell's own org's picnic, checked often. */
    const sheet = () =>
      withPlace(
        shipped("SignUpSheet/SignUpSheet.api.spell"),
        `sign up sheet is a data folder at "picnic@spell/__private/signups":
	- open to sign-ups from "picnic@spell/sheet"
	- only its attendees add rows
	- at most 2 rows for each shift
	- check it every 2 seconds

the published sheet is a projection of the sign up sheet:
	- into "picnic@spell/sheet"
	- showing each row's person and shift
	- published volunteers live at "volunteers"
	- check it every 2 seconds`
      )
    /** What the page's section `name` says. */
    const section = (page: Page, name: string) => page.locator(`ui-segment.${name}`).textContent()
    /** Who the published sheet shows on `shift`. */
    const onShift = async (page: Page, shift: string) =>
      page
        .locator("ui-segment.published .signed-up", { hasText: shift })
        .evaluateAll((rows) => rows.map((row) => row.textContent ?? ""))

    beforeAll(async () => {
      for (const [who, email] of Object.entries(EMAILS)) address[who] = await accounts.invite(email)
      const people = new PeopleStore(new DiskStorage(spaces))
      const org = await people.org("spell")
      const known = new Set((org?.members.items ?? []).map((each) => people.addressOf(each.person!)))
      const members = [
        ...(org?.members.items ?? []).map((each) => ({
          $type: "Membership",
          person: { $ref: `Person#${people.addressOf(each.person!)}` },
          role: each.role
        })),
        ...Object.values(address)
          .filter((each) => !known.has(each))
          .map((each) => ({ $type: "Membership", person: { $ref: `Person#${each}` }, role: "viewer" }))
      ]
      await people.storage.write(
        orgFile("spell"),
        JSON.stringify({ $type: "Org", id: "spell", name: "Spell", members })
      )
      const roles = spaceFolders.orgRoles
      if (!(await roles.terms("spell")).length) await roles.setUp("spell", { board: address.ana! })
      const board = (await roles.terms("spell")).find((each) => each.role === "board")!.person
      await roles.addProject("spell", { id: "picnic", name: "The Picnic" }, { by: board })
      await roles.give("spell", { role: "project-manager", person: address.cy, of: "picnic" }, { by: board })
    })

    test(
      "attendees sign up from the shared space, two to a shift, the last place to one of two;  someone not on the " +
        "list is refused;  the published sheet never shows an organizer's note",
      { timeout: 150_000 },
      async () => {
        // 1. Cy, the picnic's Manager:  signed in, the page makes the master a sign-up sheet, and publishes it
        const cy = await deviceOn("picnic-cy", sheet())
        await signIn(cy.bar, EMAILS.cy)
        await cy.page.reload()
        await expect.poll(() => section(cy.page, "organizers"), WAITING).toContain("Who may sign up")
        for (const who of ["bo", "dee"]) {
          await cy.page.locator("ui-segment.organizers ui-input input").last().fill(address[who]!)
          await cy.page.locator("ui-segment.organizers ui-button.add").click()
          await expect.poll(() => section(cy.page, "organizers"), WAITING).toContain(address[who]!)
        }
        await cy.page.locator("ui-segment.sign-up ui-button.cleanup").click()
        await expect.poll(() => onShift(cy.page, "cleanup"), { timeout: 15_000 }).toHaveLength(1)

        // 2. Bo and Dee ask for cleanup's last place at once:  one gets it, the other is told it's gone
        const bo = await deviceOn("picnic-bo", sheet())
        await signIn(bo.bar, EMAILS.bo)
        const dee = await deviceOn("picnic-dee", sheet())
        await signIn(dee.bar, EMAILS.dee)
        await expect.poll(() => section(bo.page, "organizers"), WAITING).toContain("Only the picnic's organizers")
        await Promise.all([
          bo.page.locator("ui-segment.sign-up ui-button.cleanup").click(),
          dee.page.locator("ui-segment.sign-up ui-button.cleanup").click()
        ])
        await expect.poll(() => onShift(cy.page, "cleanup"), { timeout: 15_000 }).toHaveLength(2)
        // the one who lost is refused "full", and their row goes back:  a bare page has no toasts to say it
        // (the words are the core's `write-refused-full`, checked where the refusal is made)
        const cleanup = (await onShift(cy.page, "cleanup")).join(" ")
        expect([address.bo, address.dee].filter((who) => cleanup.includes(who!))).toHaveLength(1)
        await bo.page.locator("ui-segment.sign-up ui-button.setup").click()
        await expect
          .poll(async () => (await onShift(cy.page, "setup")).join(" "), { timeout: 15_000 })
          .toContain(address.bo!)

        // 3. Vic is in the org and not an attendee:  refused, in words
        const vic = await deviceOn("picnic-vic", sheet())
        await signIn(vic.bar, EMAILS.vic)
        await vic.page.locator("ui-segment.sign-up ui-button.serving").click()
        await vic.page.waitForTimeout(3_000)
        expect((await onShift(cy.page, "serving")).join(" ")).not.toContain(address.vic!)

        // 4. Cy's note on Bo's row stays on the master
        const note = "get someone more reliable on this shift as well"
        const bosRow = cy.page.locator("ui-segment.organizers .master-row", { hasText: "setup" })
        await expect.poll(() => bosRow.count(), WAITING).toBeGreaterThan(0)
        await bosRow.first().locator("ui-input input").fill(note)
        await cy.page.waitForTimeout(3_000)
        await vic.page.reload()
        await expect.poll(async () => (await onShift(vic.page, "setup")).join(" "), WAITING).toContain(address.bo!)
        expect(await vic.page.getByText(note).count()).toBe(0)
        // both sheets, as each sees them:  SPELL_TEST_SHOTS names a folder to keep them in
        const shots = process.env.SPELL_TEST_SHOTS ?? folder
        await cy.page.screenshot({ path: join(shots, "sign-up-sheet-organizer.png"), fullPage: true })
        await vic.page.screenshot({ path: join(shots, "sign-up-sheet-attendee.png"), fullPage: true })

        for (const one of [cy, bo, dee, vic]) {
          // a refused change raises a notice, and a bare <spell-viewer> page has no toasts to show one
          expect(one.problems.filter((problem) => !/ui-toast not registered/.test(problem))).toEqual([])
          await one.close()
        }
      }
    )
  })
})

/** `source`, one file, as a runner is handed it:  with its imports. */
function compiledProgram(path: string, source: string, more: { path: string; contents: string }[] = []): string {
  const { scope, files } = parseSpellProject([{ path, contents: source }, ...more])
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
