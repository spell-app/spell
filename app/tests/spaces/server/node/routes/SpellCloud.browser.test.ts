/**
 * Staying signed in to `SpellCloud`, in a real browser (epic `atmosphere` I20):  its cookie, as Chromium really sends it.
 * - The cloud is at `127.0.0.1`, and "another site" is the same server at `localhost`:  to a browser, two sites.
 * - A program's own files are refused here:  whether the sign-in lets someone in is all that's being looked at.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs"
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

/** The page's gutter at phone width, px. */
const GUTTER = 16

/** The widths and the schemes the home pages are looked at in. */
const WIDTHS = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } }
const SCHEMES = ["light", "dark"] as const

/** The org's name, and a second org's. */
const ORG_NAME = "Rock Springs Co-op"
const SECOND_ORG = "kettle"
const SECOND_ORG_NAME = "Kettle Club"

/** A long org name and person's address:  what the bar must give way to, at phone width. */
const LONG_ORG_NAME = "The Rock Springs Neighbourhood Allotment and Seed Sharing Co-operative"
const LONG_PERSON = "alexandria.featherstonehaugh@spell"

/** How tall the top bar is on every page, px. */
const BAR_HEIGHT = 51

/** Set it to a folder and every page tested below is saved there as a picture, to look at. */
const PICTURES = process.env.SPELL_CLOUD_PICTURES

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
    const setup = new OrgSetup({ people, roles: folders.orgRoles, folderFor })
    await setup.create({ org: "rs", name: ORG_NAME, admins: [ANA] })
    await setup.create({ org: SECOND_ORG, name: SECOND_ORG_NAME, admins: [ANA] })
    folders.close()
    const open = join(folderFor("@rs/noticeboard"), "__settings")
    mkdirSync(open, { recursive: true })
    writeFileSync(join(open, "space.json5"), JSON.stringify({ publicRead: true }))
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
    await page.click("#email-link")
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
      await page.locator('#who ui-button[link="/sign-in"]').click({ timeout: SETTLE_MS })
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      await signIn(page, ANA)
      await page.waitForURL(here("/"), { timeout: SETTLE_MS })
      const org = page.locator('ui-card[link="/@rs"]')
      await org.waitFor({ state: "attached", timeout: SETTLE_MS })
      expect(await page.locator("#who > ui-button").textContent()).toBe("ana@spell")

      await page.locator('ui-card[link="/@rs"] a').click()
      await page.waitForURL(here("/@rs"), { timeout: SETTLE_MS })
      const program = page.locator('ui-card[link="/apps/@rs/OrgAdmin"]')
      await program.waitFor({ state: "attached", timeout: SETTLE_MS })
      expect(await page.locator("#title").textContent()).toBe(ORG_NAME)
      expect(await page.locator("#heading").textContent()).toBe(ORG_NAME)

      // a link from another site to a home that gates:  still in
      await arriveFromAnotherSite(page, "/@rs")
      await program.waitFor({ state: "attached", timeout: SETTLE_MS })

      // the drop-down, and signing out from it:  back to the sign-in page, as this org isn't public
      await page.locator("#who > ui-button button").click()
      await page.getByRole("button", { name: "Sign out" }).click()
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      await context.close()
    },
    TEST_MS
  )

  describe.skipIf(!hasElements)("the home pages' look", () => {
    /** A signed-in browser's cookies, for each of the pages below. */
    let signedIn: Awaited<ReturnType<BrowserContext["storageState"]>>

    beforeAll(async () => {
      const { context, page } = await newPage("elements")
      await page.goto(here("/sign-in"))
      await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
      await signIn(page, ANA)
      await page.waitForURL(here("/"), { timeout: SETTLE_MS })
      signedIn = await context.storageState()
      await context.close()
    }, TEST_MS)

    /** What's measured of `page`'s top bar:  how far in each end of it is drawn, and any sideways scroll. */
    const measured = (page: Page) =>
      page.evaluate(() => {
        const brand = document.querySelector(".brand img")!.getBoundingClientRect()
        // the drawn button, inside the element:  the element's own box is wider than what shows
        const right = document.querySelector("#who > ui-button")
        const drawn = right?.shadowRoot?.querySelector("a, button")?.getBoundingClientRect()
        const firstCard = document.querySelector("ui-card")?.shadowRoot?.firstElementChild?.getBoundingClientRect()
        const width = document.documentElement.clientWidth
        return {
          scrolls: document.documentElement.scrollWidth - width,
          barHeight: Math.round(document.querySelector(".top-bar")!.getBoundingClientRect().height),
          brandLeft: Math.round(brand.left),
          rightGap: drawn && Math.round(width - drawn.right),
          cardLeft: firstCard && Math.round(firstCard.left),
          headingLeft: Math.round(document.querySelector("h1")!.getBoundingClientRect().left)
        }
      })

    for (const [widthName, viewport] of Object.entries(WIDTHS)) {
      for (const colorScheme of SCHEMES) {
        test(
          `${widthName}, ${colorScheme}:  the bar's ends at the gutter, the cards under the heading, no sideways scroll`,
          async () => {
            /** `answer` stands in for what the page's list asked the server. */
            const look = async (
              path: string,
              name: string,
              state: "signed in" | "signed out",
              { answer, openMenu }: { answer?: object; openMenu?: boolean } = {}
            ) => {
              const context = await browser.newContext({
                viewport,
                colorScheme,
                ...(state === "signed in" && { storageState: signedIn })
              })
              const page = await context.newPage()
              if (answer) await page.route("**/api/cloud/home**", (route) => route.fulfill({ json: answer }))
              await page.goto(here(path))
              await page
                .locator(path === "/sign-in" ? "#email" : "#who ui-button")
                .first()
                .waitFor({
                  timeout: SETTLE_MS
                })
              await page.waitForTimeout(400)
              if (openMenu) {
                await page.locator("#who > ui-button button").click()
                await page.getByRole("button", { name: "Sign out" }).waitFor({ timeout: SETTLE_MS })
                // its fade finishes
                await page.waitForTimeout(400)
              }
              if (PICTURES) await page.screenshot({ path: join(PICTURES, `${name}-${widthName}-${colorScheme}.png`) })
              const size = await measured(page)
              expect(size.scrolls, name).toBe(0)
              expect(size.barHeight, name).toBe(BAR_HEIGHT)
              expect(size.brandLeft, name).toBe(GUTTER)
              if (size.rightGap !== undefined) expect(size.rightGap, name).toBe(GUTTER)
              if (size.cardLeft !== undefined) expect(size.cardLeft, name).toBe(size.headingLeft)
              if (widthName === "phone" && path !== "/sign-in") expect(size.headingLeft, name).toBe(GUTTER)
              await context.close()
            }
            await look("/", "spaces-signed-in", "signed in")
            await look("/", "spaces-signed-out", "signed out")
            await look("/@rs", "org-home", "signed in")
            await look("/sign-in", "sign-in", "signed out")
            await look("/", "menu-open", "signed in", { openMenu: true })
            await look("/", "spaces-empty", "signed out", { answer: { spaces: [] } })
            await look("/@rs", "org-long-names", "signed in", {
              answer: {
                person: LONG_PERSON,
                org: { id: "rs", name: LONG_ORG_NAME, programs: [], spaces: [] }
              }
            })
          },
          TEST_MS
        )
      }
    }
  })

  describe("signing in with a password", () => {
    const PASSWORD = "a long enough one"
    const NEWER = "another long enough one"

    beforeAll(async () => {
      await cloud.signIn.signIns.setPasswordFor((await new SpellAccounts(people).accountFor(ANA))!, PASSWORD)
    })

    /** The sign-in form, as a browser's password manager reads it. */
    const formAsFound = (page: Page) =>
      page.evaluate(() => {
        const password = document.querySelector<HTMLInputElement>('form input[type="password"]')!
        const form = password.form!
        const username = form.querySelector<HTMLInputElement>('input[autocomplete="username"]')!
        return { method: form.method, username: username.name, password: password.autocomplete }
      })

    test(
      "a page that's gated says so, and a password manager finds the form;  filled, it signs in and goes on",
      async () => {
        const { context, page } = await newPage()
        await page.goto(here(PROGRAM))
        await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
        expect(await page.locator("#lead").textContent()).toContain("belongs to an organization")
        expect(await formAsFound(page)).toEqual({ method: "post", username: "username", password: "current-password" })
        await page.fill("#email", ANA)
        await page.fill("#password", PASSWORD)
        await page.click("#sign-in")
        await expectProgram(page)
        await context.close()
      },
      TEST_MS
    )

    test(
      "at /sign-in it guards nothing, so it says nothing of an org;  a wrong password says so, and stays;  no password in the address",
      async () => {
        const { context, page } = await newPage()
        await page.goto(here("/sign-in"))
        await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
        expect(await page.locator("#lead").textContent()).not.toContain("organization")
        await page.fill("#email", BO)
        await page.fill("#password", "not the password")
        await page.click("#sign-in")
        await expect.poll(() => page.locator("#problem").textContent()).toContain("don't go together")
        expect(page.url()).not.toContain("password=")
        expect(await page.inputValue("#password")).toBe("")
        await context.close()
      },
      TEST_MS
    )

    test.skipIf(!hasElements)(
      "set from the home page's menu:  a link's sign-in needs no current password;  it works next time",
      async () => {
        const { context, page } = await newPage("elements")
        await page.goto(here("/sign-in"))
        await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
        await signIn(page, ANA)
        await page.waitForURL(here("/"), { timeout: SETTLE_MS })
        await page.locator("#who > ui-button button").click()
        await page.getByRole("link", { name: "Change password" }).click()
        await page.locator("#new-password").waitFor({ state: "visible", timeout: SETTLE_MS })
        expect(await page.locator("#current-password").isVisible()).toBe(false)
        await page.fill("#new-password", NEWER)
        await page.click("#save-password")
        await page.locator("#password-saved").waitFor({ state: "visible", timeout: SETTLE_MS })
        await context.close()

        const later = await newPage()
        await later.page.goto(here(PROGRAM))
        await later.page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
        await later.page.fill("#email", ANA)
        await later.page.fill("#password", NEWER)
        await later.page.click("#sign-in")
        await expectProgram(later.page)
        await cloud.signIn.signIns.setPasswordFor((await new SpellAccounts(people).accountFor(ANA))!, PASSWORD)
        await later.context.close()
      },
      TEST_MS
    )

    test.skipIf(!hasElements)(
      "a program's sign-in bar:  email and password in a real form;  signed in, it changes the password",
      async () => {
        const { context, page } = await newPage("elements")
        await page.goto(here("/apps/@spell/examples/FamilyCookbook"))
        const bar = page.locator("ui-message.spell-sign-in")
        await bar.locator("form").waitFor({ state: "attached", timeout: 30_000 })
        const native = bar.locator('input[type="password"]')
        await native.waitFor({ timeout: SETTLE_MS })
        expect(await native.getAttribute("autocomplete")).toBe("current-password")
        expect(await bar.locator("input").first().getAttribute("autocomplete")).toBe("username")
        if (PICTURES) await page.screenshot({ path: join(PICTURES, "password-bar-desktop-light.png") })

        await bar.locator("input").first().fill(ANA)
        await native.fill(PASSWORD)
        await native.press("Enter")
        await expect.poll(() => bar.textContent(), { timeout: SETTLE_MS }).toContain("with your Spell account")

        await bar.locator("ui-button", { hasText: "Change password" }).click()
        await bar.locator('input[autocomplete="new-password"]').waitFor({ timeout: SETTLE_MS })
        if (PICTURES) await page.screenshot({ path: join(PICTURES, "password-bar-changing-desktop-light.png") })
        await bar.locator('input[autocomplete="current-password"]').fill(PASSWORD)
        await bar.locator('input[autocomplete="new-password"]').fill(NEWER)
        await bar.locator("ui-button", { hasText: "Save password" }).click()
        await expect.poll(() => bar.textContent(), { timeout: SETTLE_MS }).toContain("Your password is saved.")
        await bar.locator("ui-button", { hasText: "Change password" }).waitFor({ timeout: SETTLE_MS })
        await cloud.signIn.signIns.setPasswordFor((await new SpellAccounts(people).accountFor(ANA))!, PASSWORD)
        await context.close()
      },
      TEST_MS
    )

    test.skipIf(!hasElements || !PICTURES)(
      "pictures:  the sign-in page and setting a password, each width and scheme",
      async () => {
        const accountId = (await new SpellAccounts(people).accountFor(ANA))!
        for (const [widthName, viewport] of Object.entries(WIDTHS)) {
          for (const colorScheme of SCHEMES) {
            const context = await browser.newContext({ viewport, colorScheme })
            const page = await context.newPage()
            const picture = (name: string) =>
              page.screenshot({ path: join(PICTURES!, `${name}-${widthName}-${colorScheme}.png`) })
            await page.goto(here("/sign-in"))
            await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
            await page.waitForTimeout(400)
            await picture("password-sign-in")
            await page.goto(here(PROGRAM))
            await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
            await page.waitForTimeout(200)
            await picture("password-gated")
            await page.goto(here("/sign-in"))
            await page.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
            await page.fill("#email", ANA)
            await page.fill("#password", "not the password")
            await page.click("#sign-in")
            await expect.poll(() => page.locator("#problem").textContent()).toContain("don't go together")
            await picture("password-wrong")
            await page.fill("#email", ANA)
            await page.fill("#password", PASSWORD)
            await page.click("#sign-in")
            await page.waitForURL(here("/"), { timeout: SETTLE_MS })
            await page.goto(here("/sign-in?password"))
            await page.locator("#new-password").waitFor({ state: "visible", timeout: SETTLE_MS })
            await page.waitForTimeout(200)
            await picture("password-change")
            await context.close()
            const measuring = await browser.newContext({ viewport, colorScheme })
            const measured = await measuring.newPage()
            await measured.goto(here("/sign-in"))
            await measured.locator("#email").waitFor({ state: "visible", timeout: SETTLE_MS })
            expect(
              await measured.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
            ).toBe(0)
            await measuring.close()
          }
        }
        await cloud.signIn.signIns.setPasswordFor(accountId, PASSWORD)
      },
      TEST_MS * 4
    )
  })

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
