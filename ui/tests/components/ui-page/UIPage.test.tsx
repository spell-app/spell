import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { page as browser, userEvent } from "vite-plus/test/browser"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import { UIPage } from "spell-ui/components/ui-page"

/** A whole page frame:  every region filled. */
const FULL =
  `<ui-page><ui-header slot="header" level="1">Inbox</ui-header>` +
  `<ui-menu slot="nav" direction="vertical" aria-label="Folders"><ui-item>Sent</ui-item></ui-menu>` +
  `<p>The messages.</p><ui-segment slot="aside">Tips</ui-segment><ui-text slot="footer">© 2026</ui-text></ui-page>`

/** Render `html`, and the page's shadow regions. */
async function page(html = FULL) {
  const host = await ElementFixture.render<DOMElement>(html)
  await ElementFixture.settle()
  const shadow = host.shadowRoot!
  return { host, shadow, region: (part: string) => shadow.querySelector<HTMLElement>(`[part~=${part}]`) }
}

beforeEach(async () => {
  await browser.viewport(1200, 900)
})

afterEach(() => UIPage.reset())

describe("<ui-page>", () => {
  it("draws each region as its landmark:  header, nav, main, aside, footer", async () => {
    const { region } = await page()
    expect(["header", "nav", "main", "aside", "footer"].map((part) => region(part)?.localName)).toEqual([
      "header",
      "nav",
      "main",
      "aside",
      "footer"
    ])
  })

  it("leaves out a region with nothing in it", async () => {
    const { region } = await page(`<ui-page><p>Just content.</p></ui-page>`)
    expect([region("header"), region("nav"), region("aside"), region("footer")]).toEqual([null, null, null, null])
    expect(region("main")).not.toBeNull()
  })

  it("lays the nav, content and aside out in a row, under the header", async () => {
    const { region } = await page()
    const [header, nav, main, aside] = ["header", "nav", "main", "aside"].map((part) =>
      region(part)!.getBoundingClientRect()
    )
    expect(nav!.top).toBeGreaterThanOrEqual(header!.bottom)
    expect(main!.left).toBeGreaterThan(nav!.right - 1)
    expect(aside!.left).toBeGreaterThan(main!.right - 1)
  })

  it("starts with Skip to content, which moves focus to the main content", async () => {
    const { shadow, region } = await page()
    const skip = region("skip")!
    expect(skip.textContent).toBe("Skip to content")
    await userEvent.tab()
    expect(shadow.activeElement).toBe(skip)
    await userEvent.keyboard("{Enter}")
    expect(shadow.activeElement).toBe(region("main"))
  })

  it("clears the body's margin", async () => {
    await page()
    expect(getComputedStyle(document.body).margin).toBe("0px")
  })

  it("says so when a second page frame joins", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    await page(`<div>${FULL}<ui-page><p>Two.</p></ui-page></div>`)
    expect(warn.mock.calls.some((call) => String(call.join(" ")).includes("second page frame"))).toBe(true)
    warn.mockRestore()
  })

  it("is accessible", async () => {
    const { host } = await page()
    await expectAccessible(host)
  })
})

describe("<ui-page> on a phone", () => {
  it("stacks every region in reading order", async () => {
    await browser.viewport(390, 800)
    const { region } = await page()
    const [nav, main, aside] = ["nav", "main", "aside"].map((part) => region(part)!.getBoundingClientRect())
    expect(main!.top).toBeGreaterThanOrEqual(nav!.bottom)
    expect(aside!.top).toBeGreaterThanOrEqual(main!.bottom)
  })
})
