/**
 * Staying signed in to `SpellCloud`, in a real browser (epic `atmosphere` I20):  its cookie, as Chromium really sends it.
 * - The cloud is at `127.0.0.1`, and "another site" is the same server at `localhost`:  to a browser, two sites.
 * - A program's own files are refused here:  whether the sign-in lets someone in is all that's being looked at.
 */
import { existsSync, mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { fileURLToPath } from "url"
import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { MailCatcher } from "spell/server/signIn"
import { SP } from "spell/parser/spell"
import { OrgSetup } from "spell/app/spaces/server/node/people/OrgSetup"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The emails of someone in the org, and someone who isn't. */
const ANA = "ana@example.com"
const BO = "bo@example.com"

/** The program the tests open. */
const PROGRAM = "/apps/@rs/OrgAdmin"

/** How long a page gets to settle, ms. */
const SETTLE_MS = 10_000

/** How long a test gets, ms. */
const TEST_MS = 90_000

/** `yarn build:element` has run:  the home pages draw with Spell UI, from its output. */
const hasElements = existsSync(fileURLToPath(new URL("../../../../../app/dist-element/spell-ui.js", import.meta.url)))

describe("staying signed in, in a browser", () => {
  const spaces = mkdtempSync(join(tmpdir(), "spell-cloud-browser-spaces-"))
  const dir = mkdtempSync(join(tmpdir(), "spell-cloud-browser-"))
  const people = new PeopleStore(new DiskStorage(spaces))
  const folderFor = (address: string) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/"))
  let cloud: SpellCloud
  let port: number
  let browser: Browser

  /** A cloud on `onPort`, reading the same folder:  so a restart is one more of these. */
  const start = async (onPort = 0) => {
    cloud = new SpellCloud({ dir, people, folderFor })
    await cloud.listen({ port: onPort, backups: "off" })
    port = cloud.server.port
  }

  beforeAll(async () => {
    await start()
    const folders = new SpaceFolders({ folderFor, people })
    await new OrgSetup({ people, roles: folders.orgRoles, folderFor }).create({ org: "rs", admins: [ANA] })
    folders.close()
    await new SpellAccounts(people).invite(BO)
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser?.close()
    await cloud?.close()
    rmSync(spaces, { recursive: true, force: true })
    rmSync(dir, { recursive: true, force: true })
  })

  const here = (path: string) => `http://127.0.0.1:${port}${path}`

  /** A new browser profile's page, with a program's own files refused. */
  const newPage = async (elements: "no elements" | "elements" = "no elements") => {
    const context: BrowserContext = await browser.newContext()
    const page: Page = await context.newPage()
    if (elements === "no elements") await page.route(/\/(spaces|element)\//, (route) => route.abort())
    return { context, page }
  }

  /** SIDE EFFECT:  `page`, at the sign-in page, signs in as `email` by the code mailed to them. */
  const signIn = async (page: Page, email: string) => {
    await page.fill("#email", email)
    await page.click("#email-form button")
    await page.locator("#code").waitFor({ timeout: SETTLE_MS })
    const mail = await new MailCatcher({ folder: join(dir, "mail") }).newestTo(email)
    await page.fill("#code", /^\d{6}$/m.exec(mail!.text)![0])
    await page.click("#code-form button")
  }

  /** Is `page` showing the program, rather than the sign-in page? */
  const expectProgram = (page: Page) => page.locator("spell-viewer").waitFor({ state: "attached", timeout: SETTLE_MS })

  /** SIDE EFFECT:  `page` follows a link to `path` from a page of another site. */
  const arriveFromAnotherSite = async (page: Page, path: string) => {
    await page.goto(`http://localhost:${port}/terms`)
    await page.evaluate((href) => {
      const link = document.createElement("a")
      link.id = "from-elsewhere"
      link.href = href
      link.textContent = "go"
      document.body.prepend(link)
    }, here(path))
    await page.click("#from-elsewhere")
  }

  test(
    "signed in, still in after a reload, a restart of the cloud, and a link from another site",
    async () => {
      const { context, page } = await newPage()
      await page.goto(here(PROGRAM))
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      await signIn(page, ANA)
      await expectProgram(page)

      await page.reload()
      await expectProgram(page)

      await cloud.close()
      await start(port)
      await page.reload()
      await expectProgram(page)

      await arriveFromAnotherSite(page, PROGRAM)
      await expectProgram(page)
      expect(new URL(page.url()).pathname).toBe(PROGRAM)

      // a reload after arriving that way, too
      await page.reload()
      await expectProgram(page)
      await context.close()
    },
    TEST_MS
  )

  test(
    "signed in as someone it isn't open to:  told so, plainly, and it doesn't go round and round",
    async () => {
      const { context, page } = await newPage()
      await page.goto(here(PROGRAM))
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      let loads = 0
      page.on("load", () => loads++)
      await signIn(page, BO)
      await page.locator("#not-yours").waitFor({ state: "visible", timeout: SETTLE_MS })
      expect(await page.locator("#who").textContent()).toBe("bo@spell")
      await page.waitForTimeout(1000)
      const settled = loads
      expect(settled).toBeLessThanOrEqual(3)
      await page.waitForTimeout(1500)
      expect(loads).toBe(settled)

      await arriveFromAnotherSite(page, PROGRAM)
      await page.locator("#not-yours").waitFor({ state: "visible", timeout: SETTLE_MS })
      await context.close()
    },
    TEST_MS
  )

  test.skipIf(!hasElements)(
    "the home pages:  sign in from the spaces home, the org's link, its programs, each edge lined up",
    async () => {
      const { context, page } = await newPage("elements")
      await page.goto(here("/"))
      await page.locator('ui-button[link="/sign-in"]').click({ timeout: SETTLE_MS })
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      await signIn(page, ANA)
      await page.waitForURL(here("/"), { timeout: SETTLE_MS })
      const org = page.locator('ui-item[link="/@rs"]')
      await org.waitFor({ timeout: SETTLE_MS })
      expect(await page.locator("#who ui-text").textContent()).toBe("ana@spell")

      await org.click()
      await page.waitForURL(here("/@rs"), { timeout: SETTLE_MS })
      const program = page.locator('ui-item[link="/apps/@rs/OrgAdmin"]')
      await program.waitFor({ timeout: SETTLE_MS })
      expect(await page.locator("#title").textContent()).toBe("rs")

      const left = (selector: string) =>
        page.locator(selector).evaluate((each) => {
          const range = document.createRange()
          range.selectNodeContents(each)
          return Math.round(range.getBoundingClientRect().left)
        })
      expect(await left("#title")).toBe(await left('ui-item[link="/apps/@rs/OrgAdmin"]'))
      // the drawn button, inside the element:  the element's own box is wider than what shows
      const signOut = (await page.locator("#who ui-button button").boundingBox())!
      expect(Math.round(page.viewportSize()!.width - (signOut.x + signOut.width))).toBe(await left("#title"))

      // a link from another site to a home that gates:  still in
      await arriveFromAnotherSite(page, "/@rs")
      await program.waitFor({ timeout: SETTLE_MS })
      await context.close()
    },
    TEST_MS
  )

  test(
    "arriving from another site signed out, then signing in, goes on to the page",
    async () => {
      const { context, page } = await newPage()
      await arriveFromAnotherSite(page, PROGRAM)
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      await signIn(page, ANA)
      await expectProgram(page)
      await context.close()
    },
    TEST_MS
  )

  test(
    "nobody signed in:  the sign-in form, and no going round and round",
    async () => {
      const { context, page } = await newPage()
      let loads = 0
      page.on("load", () => loads++)
      await arriveFromAnotherSite(page, PROGRAM)
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      await page.waitForTimeout(1000)
      expect(loads).toBe(2)
      await context.close()
    },
    TEST_MS
  )
})
