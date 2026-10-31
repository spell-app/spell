import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium } from "playwright"
import { describe, expect, test } from "vite-plus/test"

/**
 * The cursor over every part of the running editor (epic `editor` P1):  nothing left to the browser's guess.
 * - Walks a grid over Solitaire in Glass, with the Inspector open, and reads the cursor at each point.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 * - A browser can't report what's really on screen, and `auto` is what it would guess at:
 *   so a flicker while something redraws stays a check for a person.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does it answer? */
async function isServing(address: string | undefined): Promise<boolean> {
  if (!address) return false
  try {
    return (await fetch(address)).ok
  } catch (ignored) {
    return false
  }
}

const EDITOR = editorAddress()
const SERVING = await isServing(EDITOR)

/** What a place may show, by what's around it;  the first match decides. */
const RULES: [where: RegExp, allowed: RegExp][] = [
  // the code draws its own:  text, and its gutter's fold markers
  [/monaco/, /^(default|text|pointer|col-resize|row-resize|ns-resize|ew-resize)$/],
  [/^(input|textarea)\b|ui-input|ui-textarea/, /^(text|default)$/],
  [/ui-selectable/, /^(auto|default|text)$/],
  // the app's own, to be dragged
  [/solitaire-/, /^(grab|default)$/],
  // the bars between panes
  [/ui-split-panel/, /^(default|col-resize|row-resize|ns-resize)$/],
  [/./, /^(default|col-resize|row-resize|ns-resize)$/]
]

describe.skipIf(!SERVING)("the cursor over the running editor", () => {
  test("every place shows what its kind of thing shows", { timeout: 180_000 }, async () => {
    const browser = await chromium.launch()
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, colorScheme: "dark" })
      await context.route(/spell-site/, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ contentType: "text/plain", body: '{ theme: "glass", scheme: "dark" }' })
          : route.fulfill({ status: 200, body: "" })
      )
      const page = await context.newPage()
      await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`)
      await page.waitForSelector(".monaco-editor .view-line", { timeout: 90_000 })
      await page.waitForTimeout(4000)
      await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
      await page.waitForTimeout(2000)

      /////////////////////////
      // The Inspector starts picking:  a crosshair over the app
      /////////////////////////
      const inspecting = await page.evaluate(() => {
        const area = document.querySelector("[data-inspecting]")
        return area && getComputedStyle(area).cursor
      })
      expect(inspecting).toBe("crosshair")
      await page.evaluate(() => document.querySelector("[data-inspecting]")?.removeAttribute("data-inspecting"))

      /////////////////////////
      // The walk
      /////////////////////////
      const seen = await page.evaluate(() => {
        /** The innermost element at a point, through shadow roots, with what's around it. */
        const at = (x: number, y: number) => {
          let element = document.elementFromPoint(x, y)
          while (element?.shadowRoot) {
            const inner = element.shadowRoot.elementFromPoint(x, y)
            if (!inner || inner === element) break
            element = inner
          }
          if (!element) return undefined
          const names: string[] = []
          for (let node: Node | null = element; node; node = node.parentNode ?? (node as ShadowRoot).host ?? null) {
            if (node instanceof Element) names.push(`${node.localName} ${node.getAttribute("class") ?? ""}`)
          }
          return { cursor: getComputedStyle(element).cursor, where: names.join(" < ") }
        }
        const places = new Map<string, { cursor: string; where: string }>()
        for (let y = 4; y < innerHeight; y += 12) {
          for (let x = 4; x < innerWidth; x += 12) {
            const place = at(x, y)
            if (place) places.set(`${place.cursor} ${place.where}`, place)
          }
        }
        return [...places.values()]
      })
      expect(seen.length).toBeGreaterThan(50)
      const wrong = seen.filter(({ cursor, where }) => !RULES.find(([around]) => around.test(where))![1].test(cursor))
      expect(wrong.map(({ cursor, where }) => `${cursor}:  ${where.slice(0, 120)}`)).toEqual([])
    } finally {
      await browser.close()
    }
  })
})
