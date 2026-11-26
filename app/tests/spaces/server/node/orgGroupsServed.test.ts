import { execFileSync, spawn, type ChildProcess } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { delimiter, dirname, join, resolve } from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * THE WHOLE PATH of an org's groups (epic `editor` P47, Q97 A):  real page servers, real editors, a headless browser,
 * the two ways Owen runs an org's projects.
 * 1. An org's repo with its own page server, as `spell app serve` runs in it:  `@acme/` at the repo's top, its
 *    `package.json` naming the org.
 * 2. The kit's server showing other spaces folders beside its own (`SPELL_MORE_SPACES`, what the more spaces file
 *    holds):  `@acme` from the org's repo, `@beta` from another's `spaces/`, and a scratch spell.spaces.
 * - Each way:  the home page's org sections right under the hero;  `/@acme`, `/@acme/org-spell`,
 *   `/run/@acme/org-spell` and `/edit/@acme` each the org's or the group's page, the address as typed;
 *   a project in a group still runs;  a group holding a project named `home` runs it at its address.
 * - Scratch folders only, in the system's temporary folder:  never anyone's real spaces.
 * - Slow (two page servers, two editors, their first compiles):  it runs when `ORG_GROUPS_TEST=1`, and when
 *   Playwright's Chromium is there;  alone, as `app:integration`'s files run:
 *   `ORG_GROUPS_TEST=1 yarn vp test run tests/spaces/server/node/orgGroupsServed.test.ts`
 */

/** The kit's root:  whose `spell` command runs. */
const KIT = resolve(import.meta.dirname, "../../../../..")

/** The `spell` command. */
const SPELL_BIN = join(KIT, "bin", "spell.mjs")

/** How long a server and its editor take to start, and a page to compile and draw, at most. */
const START_MS = 240_000
const PAGE_MS = 90_000

/** Is Chromium there for Playwright?  Not in every checkout. */
const hasChromium = (() => {
  try {
    return !!chromium.executablePath()
  } catch {
    return false
  }
})()

describe.runIf(!!process.env.ORG_GROUPS_TEST && hasChromium)(
  "an org's groups, the whole path",
  { timeout: START_MS * 3 },
  () => {
    const temp = realpathSync(mkdtempSync(join(tmpdir(), "spell-org-groups-")))
    /** the org's repo:  `@acme/` at its top (Q100 A) */
    const acme = join(temp, "acme-spell")
    /** another org's repo, its groups in `spaces/`, as before */
    const beta = join(temp, "beta-spell")
    /** the kit's own spaces, for way 2:  a person's space and nothing else */
    const spaces = join(temp, "spell.spaces")
    const servers: ChildProcess[] = []
    let browser: Browser

    beforeAll(async () => {
      put(join(acme, "package.json"), JSON.stringify({ name: "acme-spell", private: true, spell: { org: "acme" } }))
      git(acme)
      app(join(acme, "@acme/org-spell/dashboard"), "Dashboard", "Hello from the dashboard")
      app(join(acme, "@acme/org-spell/reports"), "Reports", "Hello from the reports")
      put(join(acme, "@acme/org-spell/README.md"), "# Org Spell\n\nEvery app the whole org uses, in one place.\n")
      app(join(acme, "@acme/ops/jobs"), "Jobs", "Hello from the jobs")
      // a group that writes its own page:  its project named `home` (Q99 B)
      app(join(acme, "@acme/portal/home"), "Portal", "Welcome to the portal")
      app(join(acme, "@acme/portal/docs"), "Docs", "Hello from the docs")
      put(join(beta, "package.json"), JSON.stringify({ name: "beta-spell", private: true, spell: { org: "beta" } }))
      git(beta)
      app(join(beta, "spaces/@beta/tools/board"), "Board", "Hello from the board")
      mkdirSync(join(spaces, "@spell", "owen@"), { recursive: true })
      browser = await chromium.launch()
    }, START_MS)

    afterAll(async () => {
      await browser?.close()
      for (const server of servers) stop(server)
      rmSync(temp, { recursive: true, force: true })
    })

    describe("1. the org's repo, with its own page server", () => {
      let base: string
      beforeAll(async () => {
        base = await serve(acme, { SPELL_SPACES_DIR: undefined, SPELL_MORE_SPACES: undefined })
      }, START_MS)

      test("the home page:  the org's heading right under the hero, each group a titled row", async () => {
        const page = await open(`${base}/`)
        await page.waitForSelector("#org-acme .TileCard", { timeout: PAGE_MS })
        expect(await sectionsOf(page)).toEqual(expect.arrayContaining(["Hero", "org-acme"]))
        expect((await sectionsOf(page)).slice(0, 2)).toEqual(["Hero", "org-acme"])
        expect(await headingOf(page, "org-acme")).toMatch(/^@acme\. For everyone at @acme\./)
        await expect
          .poll(() => titlesIn(page, "org-acme"), { timeout: PAGE_MS })
          .toEqual(["Ops", "Org Spell", "Portal"])
        await page.close()
      })

      checkAddresses(() => base)
    })

    describe("2. the kit's server, showing other spaces folders beside its own", () => {
      let base: string
      beforeAll(async () => {
        base = await serve(KIT, {
          SPELL_SPACES_DIR: spaces,
          SPELL_MORE_SPACES: [acme, join(beta, "spaces")].join(delimiter)
        })
      }, START_MS)

      test("the home page:  a heading per org right under the hero, @acme and @beta, each group a titled row", async () => {
        const page = await open(`${base}/`)
        await page.waitForSelector("#org-beta .TileCard", { timeout: PAGE_MS })
        expect((await sectionsOf(page)).slice(0, 3)).toEqual(["Hero", "org-acme", "org-beta"])
        // each names the group's own org, never this machine's (@spell)
        expect(await headingOf(page, "org-beta")).toMatch(/^@beta\. For everyone at @beta\./)
        await expect.poll(() => titlesIn(page, "org-beta"), { timeout: PAGE_MS }).toEqual(["Tools"])
        await page.close()
      })

      checkAddresses(() => base)
    })

    /** The addresses each way checks, on the server at `base()`. */
    function checkAddresses(base: () => string): void {
      test("/@acme and /edit/@acme:  the org's page, every group of it;  the address as typed", async () => {
        for (const address of ["/@acme", "/edit/@acme"]) {
          const page = await open(`${base()}${address}`)
          await page.waitForSelector(".GroupPage #org-acme .TileCard", { timeout: PAGE_MS })
          expect(new URL(page.url()).pathname, address).toBe(address)
          await expect
            .poll(() => titlesIn(page, "org-acme"), { timeout: PAGE_MS, message: address })
            .toEqual(["Ops", "Org Spell", "Portal"])
          await page.close()
        }
      })

      test("/@acme/org-spell and /run/@acme/org-spell:  the group's page, its cards and README;  never a file", async () => {
        for (const address of ["/@acme/org-spell", "/run/@acme/org-spell", "/edit/@acme/org-spell"]) {
          const page = await open(`${base()}${address}`)
          await page.waitForSelector(".GroupPage #group .TileCard", { timeout: PAGE_MS })
          expect(new URL(page.url()).pathname, address).toBe(address)
          await expect
            .poll(() => cardsIn(page, "group"), { timeout: PAGE_MS, message: address })
            .toEqual(["Dashboard", "Reports"])
          await page.locator(".GroupReadme").getByText("Every app the whole org uses").waitFor({ timeout: PAGE_MS })
          await page.close()
        }
      })

      test("a project in a group still runs:  /run/@acme/org-spell/dashboard", async () => {
        const page = await open(`${base()}/run/@acme/org-spell/dashboard`)
        await page.getByText("Hello from the dashboard").first().waitFor({ timeout: PAGE_MS })
        expect(new URL(page.url()).pathname).toBe("/run/@acme/org-spell/dashboard")
        await page.close()
      })

      test("a group with a project named home:  /@acme/portal runs it, the address kept;  /edit/ lists it first", async () => {
        for (const address of ["/@acme/portal", "/run/@acme/portal"]) {
          const page = await open(`${base()}${address}`)
          await page.getByText("Welcome to the portal").first().waitFor({ timeout: PAGE_MS })
          expect(new URL(page.url()).pathname, address).toBe(address)
          await page.close()
        }
        const page = await open(`${base()}/edit/@acme/portal`)
        await page.waitForSelector(".GroupPage #group .TileCard", { timeout: PAGE_MS })
        await expect.poll(() => cardsIn(page, "group"), { timeout: PAGE_MS }).toEqual(["Portal", "Docs"])
        expect(await page.locator("#group .TileCard .badge").count()).toBe(1)
        await page.close()
      })
    }

    /** A new page in the browser at `url`. */
    async function open(url: string): Promise<Page> {
      const page = await browser.newPage()
      await page.goto(url, { timeout: PAGE_MS })
      return page
    }

    /**
     * Start `spell app serve --headless` in `cwd`, its page server and editor on free ports, with `env` over this
     * process's (`undefined` takes a variable out):  the editor's address, once it prints it.
     */
    async function serve(cwd: string, env: Record<string, string | undefined>): Promise<string> {
      const [pagePort, editorPort] = [await freePort(), await freePort()]
      const childEnv: NodeJS.ProcessEnv = { ...process.env, SPELL_NO_LOCAL_SITE: "1", INIT_CWD: cwd, ...env }
      for (const [name, value] of Object.entries(env)) if (value === undefined) delete childEnv[name]
      const args = [SPELL_BIN, "app", "serve", "--headless", "--port", `${editorPort}`, "--page-port", `${pagePort}`]
      const child = spawn(process.execPath, args, {
        cwd,
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true
      })
      servers.push(child)
      let said = ""
      return await new Promise<string>((done, fail) => {
        const timer = setTimeout(
          () => fail(new Error(`spell app serve in ${cwd} said nothing in time:\n${said}`)),
          START_MS
        )
        const hear = (chunk: Buffer) => {
          said += chunk.toString()
          const url = /^(http:\/\/\S+?)\/?$/m.exec(said)?.[1]
          if (url) {
            clearTimeout(timer)
            done(new URL(url).origin)
          }
        }
        child.stdout!.on("data", hear)
        child.stderr!.on("data", (chunk: Buffer) => (said += chunk.toString()))
        child.once("exit", (code) => fail(new Error(`spell app serve in ${cwd} ended (${code}):\n${said}`)))
      })
    }
  }
)

/** Write `text` at `path`, making folders. */
function put(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/** Make `dir` a git repo of its own:  `spell app serve` serves a checkout's own spaces. */
function git(dir: string): void {
  mkdirSync(dir, { recursive: true })
  execFileSync("git", ["init", "-q"], { cwd: dir })
}

/** A tiny app at `dir`, titled `title`, saying `words`. */
function app(dir: string, title: string, words: string): void {
  const name = title.replace(/\s+/g, "")
  put(
    join(dir, "__project.json5"),
    JSON.stringify({ title, imports: [{ path: `/${name}.spell`, active: true }], spellVersion: "0.9.0" }, null, 2)
  )
  put(
    join(dir, `${name}.spell`),
    `# ${title}\n\n${name.toLowerCase()} app is an app\n\tto draw it\n\t\t<container>${words}</container>\n`
  )
}

/** The ids of the home page's sections, in order;  the hero by its class. */
async function sectionsOf(page: Page): Promise<string[]> {
  return page
    .locator(".Home > section")
    .evaluateAll((sections) => sections.map((section) => section.id || section.className.split(" ")[0]!))
}

/** The heading line of section `id`. */
async function headingOf(page: Page, id: string): Promise<string> {
  return (await page.locator(`#${id} > header h2`).innerText()).replace(/\s+/g, " ").trim()
}

/** The group titles in section `id`, in order. */
async function titlesIn(page: Page, id: string): Promise<string[]> {
  return (await page.locator(`#${id} .subhead`).allInnerTexts()).map((title) => title.trim())
}

/** The card titles in section `id`, in order, without a badge's words. */
async function cardsIn(page: Page, id: string): Promise<string[]> {
  return page
    .locator(`#${id} .TileCard .title`)
    .evaluateAll((titles) => titles.map((title) => title.firstChild?.textContent?.trim() ?? ""))
}

/** A free port on this machine. */
async function freePort(): Promise<number> {
  return await new Promise((done) => {
    const server = createServer()
    server.listen(0, () => {
      const { port } = server.address() as { port: number }
      server.close(() => done(port))
    })
  })
}

/** Stop `spell app serve`, and everything it started:  its page server stops with it. */
function stop(child: ChildProcess): void {
  try {
    if (child.pid) process.kill(-child.pid, "SIGINT")
  } catch {
    // already gone
  }
}
