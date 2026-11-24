import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The editor's own Spell in its zones (`EditorZones.tsx`;  epic `editor` T141-T143):  opened as a project,
 * `@spell/editor/spell-editor`, its app pane shows a zone per view.
 * - What the editor draws in a view's place is a tag pill naming it, `⟨spell menu⟩`, never words around it (T141).
 * - A menu shows every row it can, the ones the editor hides here too, as the bar's menus draw them (T142).
 * - About Spell and Versions show inline, their title, words and buttons, never over the page (T143).
 * - Read only:  it writes nothing, so it never races another change to the editor's Spell.
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 */
describe.skipIf(!SERVING)("the editor's own Spell, in its zones", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`${EDITOR}edit/@spell/editor/spell-editor`, { timeout: 60_000 })
    await page.locator(".EditorZones .EditorZoneStandIn").first().waitFor({ timeout: 90_000 })
  })

  afterAll(async () => {
    await browser?.close()
  })

  /** The text of every `selector` in the zones, through shadow roots. */
  const textsOf = (selector: string) =>
    page.evaluate((selector) => {
      const found: string[] = []
      const walk = (root: ParentNode) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.matches(selector)) found.push(element.textContent ?? "")
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document.querySelector(".EditorZones")!)
      return found
    }, selector)

  test("each place the editor draws itself is a tag pill naming it (T141)", async () => {
    const standIns = await textsOf(".EditorZoneStandIn")
    expect(standIns).toContain("⟨spell menu⟩")
    expect(standIns).toContain("⟨theme⟩")
    expect(standIns.join(" ")).not.toMatch(/editor's own/)
  })

  test("a menu shows every row it can, the ones the editor hides here too (T142)", async () => {
    const projectMenu = page
      .locator(".EditorZone")
      .filter({ has: page.locator(".EditorZoneTitle", { hasText: /^project menu$/ }) })
    for (const title of ["Rename Project…", "Reset to Saved", "Publish", "Project Settings"]) {
      await expect.poll(() => projectMenu.getByText(title, { exact: true }).count()).toBeGreaterThan(0)
    }
  })

  test("About Spell shows inline, its title and buttons, and nothing opens over the page (T143)", async () => {
    const about = page
      .locator(".EditorZone")
      .filter({ has: page.locator(".EditorZoneTitle", { hasText: /^about box$/ }) })
    await expect.poll(() => about.getByText("Write programs in plain words", { exact: false }).isVisible()).toBe(true)
    await expect.poll(() => about.getByText("OK", { exact: true }).isVisible()).toBe(true)
    // closed:  never in the top layer, so the page isn't inert
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll(".EditorZoneDialog ui-modal")].some(
          (modal) => modal.shadowRoot?.querySelector("dialog")?.open
        )
      )
    ).toBe(false)
  })
})
