import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { Alignment } from "spell/test-helpers/Alignment"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The editor's own Spell in its zones (`EditorZones.tsx`;  epic `editor` T141-T143):  opened as a project,
 * `@spell/editor/spell-editor`, its app pane shows a zone per view.
 * - What the editor draws in a view's place is a tag pill naming it, `⟨spell menu⟩`, never words around it (T141).
 * - A menu shows every row it can, the ones the editor hides here too, as the bar's menus draw them (T142).
 * - About Spell and Versions show inline, their title, words and buttons, never over the page (T143).
 * - The pills line up:  a row of them on one line (I327);  a pane of the layout as tall as the panes beside it (T146).
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
    // the waits above take up to 150s on a busy machine:  never Vitest's 10s for a hook
  }, 180_000)

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

  /** What the kit's alignment check finds in the zone of the view `name`:  `[]` when its rows line up. */
  const misalignedIn = async (name: string) =>
    Alignment.report(await Alignment.scanPage(page, { within: `.EditorZone[data-zone="${name}"]` }))

  test("the top bar's pills sit on one line, the one in the tools' capsule too (I327)", async () => {
    expect(await misalignedIn("editor bar")).toEqual([])
  })

  test("the app and the Inspector are as tall as the code and the Program panel together (T146)", async () => {
    expect(await misalignedIn("editor layout")).toEqual([])
    // the same middle isn't the same height:  each runs from the code's top to the Program panel's bottom
    const boxOf = async (name: string) =>
      (await page
        .locator(`.EditorZone[data-zone="editor layout"] .EditorZoneStandIn`, { hasText: `⟨${name}⟩` })
        .boundingBox())!
    const [code, programPanel] = [await boxOf("code"), await boxOf("program panel")]
    for (const pane of ["app", "inspector"]) {
      const box = await boxOf(pane)
      expect(Math.abs(box.y - code.y), `${pane}'s top`).toBeLessThanOrEqual(Alignment.TOLERANCE_PX)
      expect(
        Math.abs(box.y + box.height - (programPanel.y + programPanel.height)),
        `${pane}'s bottom`
      ).toBeLessThanOrEqual(Alignment.TOLERANCE_PX)
    }
  })
})
