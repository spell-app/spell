import { afterEach, describe, expect, test } from "vite-plus/test"
import { page } from "vite-plus/test/browser"

import { SiteHeader } from "spell/server/site/SiteHeader"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-sticky"

import docCSS from "spell/epic/tools/_assets/spell-doc.css?inline"

/**
 * The bars stuck at a docs page's top -- the site's bar, the page's head and its toolbar -- hide what scrolls under
 * them COMPLETELY, in a real browser's layout, with the docs pages' own sheet.
 * - epic `epic-engine` I372 (from solid-2-final's ranked page):  under the page's default glass theme, whose bars are
 *   95% opaque (`--ui-bar-background`), a table's bold item title ("49 · GraphQL subscriptions first") showed faintly
 *   through the page's head, top left
 * - the theme's tokens are set here as that theme sets them:  this checks the sheet, not the theme
 */

/** The glass theme's bar, surface and page colours (Spell UI's `glass.css`):  see-through bars and surfaces. */
const GLASS_THEME =
  ":root { color-scheme: light dark;  --ui-bar-background: light-dark(#fffffff2, #1e1c26f2);" +
  "  --ui-surface: light-dark(#ffffff9e, #1e1c2694);  --ui-background: light-dark(#f2eefb, #15131c);" +
  "  --ui-bar-filter: blur(28px) saturate(1.7); }"

/** A bold title, many times over:  what scrolls under the bars. */
const ROWS = Array.from({ length: 80 }, (_, row) => `<p><b>${row} · GraphQL subscriptions first</b></p>`).join("")

/** A details page's top:  the site's bar, the stuck head with its title and toolbar, then a long run of titles. */
function pageHtml() {
  return (
    `<div><spell-site-header></spell-site-header><main class="spell-doc-main">` +
    `<ui-sticky class="spell-h1" offset="44"><header class="spell-page-head"><h1>Solid TLDR</h1>` +
    `<div class="spell-toolbar spell-toolbar-titled">Sections</div></header></ui-sticky>` +
    `<div class="spell-full-width">${ROWS}</div></main></div>`
  )
}

/** A desktop window wearing the glass theme and the docs pages' sheet, as a details page's body. */
async function glassPage(scheme: "light" | "dark") {
  await page.viewport(1200, 700)
  const sheet = document.createElement("style")
  sheet.textContent = `${GLASS_THEME}\n${docCSS}\n:root { color-scheme: ${scheme}; }`
  sheet.dataset.test = ""
  document.head.append(sheet)
  document.body.className = "spell-doc-page spell-details-page"
  SiteHeader.define()
}

/** How opaque `color` is, 0 to 255, as the browser paints it. */
function alphaOf(color: string): number {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d")!
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return context.getImageData(0, 0, 1, 1).data[3]!
}

/** The box `root` hits at `x`, `y`, through open shadow roots. */
function hitAt(x: number, y: number): Element | null {
  let hit = document.elementFromPoint(x, y)
  while (hit?.shadowRoot) {
    const inner = hit.shadowRoot.elementFromPoint(x, y)
    if (!inner || inner === hit) break
    hit = inner
  }
  return hit
}

afterEach(() => {
  document.head.querySelector("style[data-test]")?.remove()
  document.body.className = ""
  scrollTo(0, 0)
})

describe("the bars stuck at a docs page's top", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`hide what scrolls under them completely, in ${scheme}`, async () => {
      await glassPage(scheme)
      const root = await ElementFixture.render(pageHtml())
      await ElementFixture.settle()
      scrollTo(0, 900)
      await ElementFixture.settle()
      const siteBar = root.querySelector("spell-site-header")!.shadowRoot!.querySelector<HTMLElement>("header")!
      const head = root.querySelector<HTMLElement>(".spell-page-head")!
      const toolbar = root.querySelector<HTMLElement>(".spell-toolbar")!
      const bars = [siteBar, head, toolbar]
      for (const bar of bars) {
        const box = bar.getBoundingClientRect()
        expect(box.height).toBeGreaterThan(0)
        // every bar is painted opaque:  the theme's 95% bar showed the titles through
        expect(alphaOf(getComputedStyle(bar).backgroundColor), bar.className || bar.localName).toBe(255)
        // and its box is what a point on it hits, top left too, never a title scrolled under it
        for (const x of [10, 40, box.width / 2]) {
          const hit = hitAt(x, box.top + box.height / 2)
          expect(hit && (bar === hit || bar.contains(hit) || bars.some((each) => each.contains(hit)))).toBe(true)
        }
      }
      // the site's bar blurs nothing behind it:  nothing shows through to blur
      expect(getComputedStyle(siteBar).backdropFilter).toBe("none")
    })
  }
})
