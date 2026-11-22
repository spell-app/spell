import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { UI } from "spell/ui/runtime"
import { IconCatalog } from "spell/ui/components/ui-icon-picker"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-icon-browser"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-icon-browser/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one browser, and wait for its pack's tiles. */
async function browser(html: string) {
  const host = await ElementFixture.render(html)
  const pieces = parts(host)
  await expect.poll(() => pieces.tiles().length, { timeout: 10_000 }).toBeGreaterThan(0)
  return { host, ...pieces }
}

/** Pieces of a rendered browser. */
function parts(host: Element) {
  const root = host.shadowRoot!
  return {
    packButtons: () => [...root.querySelectorAll<HTMLElement>("[part~=packs] > ui-button")],
    chosenPack: () => root.querySelector<HTMLElement>("[part~=packs] > ui-button[color=primary]")?.textContent,
    search: () => root.querySelector<HTMLElement & { value: string }>("[part~=search]")!,
    usage: () => root.querySelector<HTMLElement>("[part~=usage]")!,
    count: () => root.querySelector<HTMLElement>("[part~=count]")?.textContent ?? "",
    copied: () => root.querySelector<HTMLElement>("[part~=copied]")?.textContent,
    tiles: () => [...root.querySelectorAll<HTMLElement>("[part~=tile]")],
    names: () => [...root.querySelectorAll<HTMLElement>("[part~=tile] [part~=name]")].map((it) => it.textContent)
  }
}

/** Type `text` into the browser's search box, as the box would announce it. */
function typeSearch(host: Element, text: string) {
  const search = parts(host).search()
  search.value = text
  search.dispatchEvent(new CustomEvent("ui-input", { detail: { value: text }, bubbles: true, composed: true }))
}

afterEach(() => {
  vi.restoreAllMocks()
  history.replaceState(history.state, "", location.pathname)
})

describe("<ui-icon-browser>", () => {
  test("shows the default pack:  its tiles, the first ones only, a count of every icon, and the usage line", async () => {
    const { chosenPack, count, tiles, usage } = await browser("<ui-icon-browser></ui-icon-browser>")
    expect(chosenPack()).toBe("FA7 Free")
    expect(count()).toMatch(/^Showing (\d[\d,]*) of \1 icons$/)
    const total = Number.parseInt(count().replace("Showing ", "").replaceAll(",", ""))
    expect(total).toBeGreaterThan(1000)
    // drawn as they scroll near:  never all ~2,000 at once
    expect(tiles().length).toBeLessThan(total)
    expect(usage().textContent).toContain("every page has it")
  })

  test("a search filters by name and by Font Awesome's terms, best first:  `mail` finds `envelope`", async () => {
    const { host, names, count } = await browser("<ui-icon-browser></ui-icon-browser>")
    typeSearch(host, "mail")
    await expect.poll(() => names(), { timeout: 10_000 }).toContain("envelope")
    expect(count()).toMatch(/^Showing \d+ of \d[\d,]* icons$/)
  })

  test("`pack` and `query` start it on a pack and a search;  the usage line names the pack's code", async () => {
    const { chosenPack, names, usage } = await browser(
      '<ui-icon-browser pack="fa7-brands" query="github"></ui-icon-browser>'
    )
    expect(chosenPack()).toBe("FA7 Brands")
    await expect.poll(() => names()[0], { timeout: 10_000 }).toBe("github")
    expect([...usage().querySelectorAll("code")].map((code) => code.textContent)).toEqual([
      '<ui-root icons="fa7-brands">',
      'UI.icons.use("fa7-brands")'
    ])
  })

  test("the switch shows another pack, in a set of its own:  the page's icons don't change", async () => {
    const { host, packButtons, chosenPack, names } = await browser("<ui-icon-browser></ui-icon-browser>")
    const ui = await UI.load()
    const pageIds = () => ui.icons.packs.map((pack) => pack.id)
    const before = pageIds()
    await userEvent.click(packButtons()[2])
    expect(chosenPack()).toBe("Fomantic")
    typeSearch(host, "setting")
    await expect.poll(() => names(), { timeout: 10_000 }).toContain("cog")
    expect(pageIds()).toEqual(before)
    expect(pageIds()).not.toContain("fomantic")
  })

  test("a click on a tile copies its name, and says so", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined)
    const { host, tiles, names, copied } = await browser("<ui-icon-browser></ui-icon-browser>")
    typeSearch(host, "bell")
    await expect.poll(() => names()[0], { timeout: 10_000 }).toBe("bell")
    await userEvent.click(tiles()[0])
    await expect.poll(() => copied()).toBe("Copied “bell”")
    expect(writeText).toHaveBeenCalledWith("bell")
  })

  test("`address`:  opens on the address's search and pack, ahead of `query` and `pack`", async () => {
    history.replaceState(history.state, "", `${location.pathname}?q=apple&pack=fa7-brands`)
    const { chosenPack, names } = await browser('<ui-icon-browser address query="bell"></ui-icon-browser>')
    expect(chosenPack()).toBe("FA7 Brands")
    await expect.poll(() => names()[0], { timeout: 10_000 }).toBe("apple")
  })

  test("a search that finds nothing says so", async () => {
    const { host } = await browser("<ui-icon-browser></ui-icon-browser>")
    typeSearch(host, "qqqzzzxxx")
    await expect.poll(() => host.shadowRoot!.querySelector("[role=status].message")?.textContent).toBe("No icons match")
    expect(parts(host).count()).toMatch(/^Showing 0 of /)
  })

  test.each(Object.entries(EXAMPLES))("is accessible:  %s", async (_path, html) => {
    const host = await ElementFixture.render(html)
    const browsers = [...host.querySelectorAll("ui-icon-browser"), ...(host.matches("ui-icon-browser") ? [host] : [])]
    for (const each of browsers)
      await expect.poll(() => parts(each).tiles().length, { timeout: 10_000 }).toBeGreaterThan(0)
    await expectAccessible(host)
  })
})

describe("IconCatalog.choicesOfPack()", () => {
  test("one pack's own glyphs, A-Z, made once", async () => {
    const ui = await UI.load()
    const pack = await ui.icons.scope([]).use("fa7-brands", { only: true })
    const choices = IconCatalog.choicesOfPack(pack!)
    expect(choices.map((choice) => choice.name)).toContain("github")
    expect(choices.map((choice) => choice.name)).toEqual(choices.map((choice) => choice.name).toSorted())
    expect(IconCatalog.choicesOfPack(pack!)).toBe(choices)
  })
})
