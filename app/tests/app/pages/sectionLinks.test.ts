import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * A link to a SECTION of another page of a site lands on that section, in the editor's Run and on the run page
 * (epic `editor` I293):  Button's Usage page links to Examples › State texts.
 * - Usage has a "State texts" section of its own:  a landing asked for too soon found that one, on the page being left,
 *   and Examples then drew with its State texts 2000px down.
 * - The editor's Run scrolls a pane of the editor, not the window:  the landing scrolls whatever box holds the section.
 * - And a page opened at a `#section` lands on it (I277).
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The Spell UI site, and its site file. */
const PROJECT = "@spell/guides/SpellUI"
const SITE_FILE = "SpellUI.spell"

/** Usage's link to a section of the Examples page. */
const SECTION_LINK = "/button/examples#state-texts"
const SECTION = "state-texts"

/** How far below the top of the box that scrolls it a landed section's top may be:  the stuck bars above it. */
const LANDED_PX = 200

/** How long a page takes to draw, and a landing to settle. */
const SETTLE_MS = 6000

/** Where section `id` is:  px from the top of the box that scrolls it, and how far that box is scrolled. */
function sectionPlace(id: string): { top: number; scrolled: number } | undefined {
  const find = (root: Document | ShadowRoot): Element | undefined => {
    const found = root.querySelector(`[id="${CSS.escape(id)}"]`)
    if (found) return found
    for (const element of root.querySelectorAll("*")) {
      const inside = element.shadowRoot && find(element.shadowRoot)
      if (inside) return inside
    }
    return undefined
  }
  const section = find(document)
  if (!section) return undefined
  const parentOf = (element: Element) =>
    element.parentElement ?? ((element.getRootNode() as ShadowRoot).host as Element | undefined) ?? null
  let box = parentOf(section)
  while (box && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY)))
    box = parentOf(box)
  const boxTop = box ? box.getBoundingClientRect().top : 0
  return { top: Math.round(section.getBoundingClientRect().top - boxTop), scrolled: box ? box.scrollTop : scrollY }
}

/** Click the site's link to `href` with a real mouse, scrolled into view first. */
async function clickLink(page: Page, href: string): Promise<void> {
  const at = await page.evaluate((wanted) => {
    const find = (root: Document | ShadowRoot): HTMLAnchorElement | undefined => {
      for (const link of root.querySelectorAll("a")) if (link.getAttribute("href") === wanted) return link
      for (const element of root.querySelectorAll("*")) {
        const inside = element.shadowRoot && find(element.shadowRoot)
        if (inside) return inside
      }
      return undefined
    }
    const link = find(document)
    if (!link) return undefined
    link.scrollIntoView({ block: "center" })
    const box = link.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, href)
  if (!at) throw new Error(`sectionLinks:  no link to ${href} on the page`)
  await page.mouse.click(at.x, at.y)
}

/** Expect section `id` to have landed:  scrolled to, its top near the top of what scrolls it. */
async function expectLanded(page: Page, id: string): Promise<void> {
  const place = await page.evaluate(sectionPlace, id)
  expect(place, `section #${id} on the page`).toBeDefined()
  expect(place!.scrolled, `scrolled to #${id}`).toBeGreaterThan(0)
  expect(place!.top, `#${id}'s top, px below the top`).toBeLessThan(LANDED_PX)
  expect(place!.top).toBeGreaterThanOrEqual(0)
}

describe.skipIf(!SERVING)("a link to a section of another page", { timeout: 240_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("on the run page, lands on the section of the page it goes to", async () => {
    await page.goto(`${EDITOR}run/${PROJECT}/button`, { timeout: 60_000 })
    await page.locator(".spell-site").waitFor({ timeout: 60_000 })
    await page.waitForTimeout(SETTLE_MS)
    await clickLink(page, SECTION_LINK)
    await page.waitForTimeout(SETTLE_MS)
    expect(new URL(page.url()).pathname).toBe(`/run/${PROJECT}/button/examples`)
    expect(new URL(page.url()).hash).toBe(`#${SECTION}`)
    await expectLanded(page, SECTION)
  })

  test("on the run page, a page opened at a section lands on it (I277)", async () => {
    await page.goto(`${EDITOR}run/${PROJECT}${SECTION_LINK}`, { timeout: 60_000 })
    await page.locator(".spell-site").waitFor({ timeout: 60_000 })
    await page.waitForTimeout(SETTLE_MS)
    await expectLanded(page, SECTION)
  })

  test("in the editor's Run, lands on the section of the page it goes to", async () => {
    await page.goto(`${EDITOR}edit/${PROJECT}/${SITE_FILE}`, { timeout: 60_000 })
    await page.locator('.ModeTabs ui-item:has-text("Run")').first().click({ timeout: 60_000 })
    await page.locator(".spell-site").waitFor({ timeout: 60_000 })
    await page.waitForTimeout(SETTLE_MS)
    // to Button's Usage page, as the site's own navigation goes there
    await page.evaluate(async () => {
      let element: Node | null = document.querySelector(".spell-site")
      while (element && !(element as { thing?: object }).thing)
        element = element.parentNode instanceof ShadowRoot ? element.parentNode.host : element.parentNode
      const site = (element as unknown as { thing: { navigate(address: string): Promise<void> } }).thing
      await site.navigate("/button")
    })
    await page.waitForTimeout(SETTLE_MS)
    await clickLink(page, SECTION_LINK)
    await page.waitForTimeout(SETTLE_MS)
    expect(new URL(page.url()).hash).toBe(`#${SECTION}`)
    await expectLanded(page, SECTION)
  })
})
