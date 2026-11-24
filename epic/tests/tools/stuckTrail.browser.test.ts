import { afterEach, describe, expect, test } from "vite-plus/test"
import { page } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-section"

import docCSS from "spell/epic/tools/_assets/spell-doc.css?inline"

/**
 * A stuck title with a nested one joined to it (the runtime's `wireStuckTrail()`:  `This epic › 5 · Changes ...`),
 * in a real browser's layout, with the docs pages' own sheet.
 * - epic `epic-engine` I368 (from r88, solid-2-final's ranked page):  at phone width a long sub-section title joined
 *   to its parent's scrolled the page sideways, 566px wide in a 390px window
 * - the runtime marks the top-level section as it would (`data-spell-trail`, `--spell-stuck-trail`):  this checks the
 *   sheet, not the scroll watch
 */

/** The phone width the docs pages are checked at (`check-spell.js`). */
const PHONE = 390

/** A sub-section title as long as the ranked page's. */
const LONG_TITLE = "5 · Changes before an action's first wait show at once, and the rest follow when it settles"

/** A details page's top-level section, its nested one stuck under it:  joined, as the runtime joins them. */
function pageHtml() {
  return (
    `<main class="spell-doc-main"><ui-section id="g-now" label="This epic" sticky collapsible dividing>` +
    `<ui-section id="q5" label="${LONG_TITLE}" sticky collapsible dividing data-spell-merged><p>Text.</p></ui-section>` +
    `</ui-section></main>`
  )
}

/** A phone-width window wearing the docs pages' sheet, as a details page's body. */
async function phonePage() {
  await page.viewport(PHONE, 800)
  const sheet = document.createElement("style")
  sheet.textContent = docCSS
  sheet.dataset.test = ""
  document.head.append(sheet)
  document.body.className = "spell-doc-page spell-details-page"
}

afterEach(() => {
  document.head.querySelector("style[data-test]")?.remove()
  document.body.className = ""
})

describe("a stuck title with a nested one joined to it", () => {
  test("stays inside a phone's width, cut short;  the page never scrolls sideways", async () => {
    await phonePage()
    const main = await ElementFixture.render(pageHtml())
    const top = main.querySelector<HTMLElement>("#g-now")!
    top.setAttribute("data-spell-trail", "")
    top.style.setProperty("--spell-stuck-trail", JSON.stringify(` › ${LONG_TITLE}`))
    await ElementFixture.settle()
    const header = top.shadowRoot!.querySelector<HTMLElement>('[part~="header"]')!
    expect(getComputedStyle(header, "::after").content).toContain("Changes before")
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(PHONE)
    expect(header.getBoundingClientRect().right).toBeLessThanOrEqual(PHONE)
    // cut short on one line, not wrapped onto several
    expect(header.scrollWidth).toBeGreaterThan(header.clientWidth)
  })

  test("joined to nothing, its title still wraps in full", async () => {
    await phonePage()
    const main = await ElementFixture.render(pageHtml())
    await ElementFixture.settle()
    const header = main.querySelector("#q5")!.shadowRoot!.querySelector<HTMLElement>('[part~="header"]')!
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(PHONE)
  })
})
