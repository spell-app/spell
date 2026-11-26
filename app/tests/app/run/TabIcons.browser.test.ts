import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { UI } from "spell/ui/core"
import { TabIcons } from "spell/app/app/run/TabIcons"

/**
 * The browser tab's icon while an app runs (epic `editor` P50), in a real browser:  the run page's and the editor's
 * `SiteHost.showIcon()`.
 * - The test page gets two icon links, as `run.html` has, taken out again after each test:  its own stays as it is.
 */
describe("TabIcons", () => {
  /** The page's own icons, as `run.html` links them. */
  const OWN = ["/static/favicon/favicon-32.png", "/static/favicon/favicon.svg"]
  /** A tiny picture that loads:  one transparent pixel. */
  const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="

  let links: HTMLLinkElement[]

  beforeAll(async () => {
    await UI.load()
  })

  beforeEach(() => {
    links = OWN.map((href) => {
      const link = document.createElement("link")
      link.rel = "icon"
      link.href = href
      document.head.append(link)
      return link
    })
  })

  afterEach(() => {
    for (const link of links) link.remove()
    vi.restoreAllMocks()
  })

  /** The addresses our two icon links show now. */
  const hrefs = () => links.map((link) => link.href)

  test("an icon's name is drawn in its colour, on every icon link;  `undefined` puts the page's own back", async () => {
    // an icon of its own, so the test needs no icon pack
    UI.icons.register(
      "test-rocket",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>'
    )
    const icons = new TabIcons(document)
    icons.show({ name: "test-rocket", color: "rgb(1, 2, 3)" })
    await expect.poll(() => links[0]!.href).toMatch(/^data:image\/svg\+xml,/)
    expect(new Set(hrefs()).size).toBe(1)
    const drawn = decodeURIComponent(links[0]!.href.slice("data:image/svg+xml,".length))
    expect(drawn).toContain('fill="rgb(1, 2, 3)" color="rgb(1, 2, 3)"')
    expect(drawn).toContain('<path d="M0 0h10v10z"')
    expect(links[1]!.type).toBe("image/svg+xml")

    icons.show(undefined)
    expect(hrefs()).toEqual(OWN.map((href) => new URL(href, location.href).href))
  })

  test("a Spell UI colour's name is read from its token", async () => {
    UI.icons.register(
      "test-dot",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>'
    )
    document.documentElement.style.setProperty("--ui-green", "rgb(0, 128, 1)")
    const icons = new TabIcons(document)
    icons.show({ name: "test-dot", color: "green" })
    await expect.poll(() => links[0]!.href).toMatch(/^data:image\/svg\+xml,/)
    expect(decodeURIComponent(links[0]!.href)).toContain('fill="rgb(0, 128, 1)"')
    document.documentElement.style.removeProperty("--ui-green")
  })

  test("a picture shows once it's loaded;  one that won't load, or an unknown icon, leaves the tab as it was", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const icons = new TabIcons(document)
    icons.show({ address: "/no/such/icon.png" })
    await expect.poll(() => warn.mock.calls.length).toBe(1)
    icons.show({ name: "no-such-icon-anywhere" })
    await expect.poll(() => warn.mock.calls.length).toBe(2)
    expect(hrefs()).toEqual(OWN.map((href) => new URL(href, location.href).href))

    icons.show({ address: PIXEL })
    await expect.poll(() => links[0]!.href).toBe(PIXEL)
    expect(links[0]!.hasAttribute("type")).toBe(false)
  })
})
