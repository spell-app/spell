import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, Page, Site, Thing, View, h } from "spell/parser/core"
import type { SiteHost } from "spell/parser/core/core.types"
import type { Drawing } from "spell/parser/core/drawing"

/**
 * A running SITE (epic `mockup` P2):  the page its address names, its parameters filled in, a dialog or sidebar over it,
 * and its not found and error pages.
 * - Its classes as compiled JavaScript writes them:  the statics a site's lines compile to.
 * - Solid's CLIENT build, drawing into a fake page (linkedom), as `drawing.test.ts` does.
 */

////////////////
// ## Classes under test
////////////////

/** A film, a thing of the program's own. */
class Film extends Thing {
  static {
    this.declareProp("title", { type: "text" })
  }
  get title() {
    return this.getProp("title") as string
  }
  set title(value) {
    this.setProp("title", value)
  }
}

/** The list of films. */
class FilmsPage extends Page {
  draw(): Drawing {
    return h("h1", null, "Films") as unknown as Drawing
  }
}

/** One film, the one its address names. */
class FilmPage extends Page {
  static {
    this.declareProp("film", { type: "Film" })
  }
  get film() {
    return this.getProp("film") as Film | undefined
  }
  set film(value) {
    this.setProp("film", value)
  }
  draw(): Drawing {
    return h("h1", null, () => this.film?.title ?? "?") as unknown as Drawing
  }
}

/** A page whose drawing throws. */
class BrokenPage extends Page {
  draw(): Drawing {
    throw new Error("no projector")
  }
}

/** A dialog's view. */
class SettingsDialog extends View {
  draw(): Drawing {
    return h("p", null, "Settings") as unknown as Drawing
  }
}

/** The site, its lines compiled. */
class GalaxyGuide extends Site {
  static pages = [
    {
      name: "films page",
      page: "FilmsPage",
      address: "/films",
      title: "Films",
      pages: [{ name: "film page", page: "FilmPage", address: "/films/:film", params: ["film"] }]
    },
    { name: "broken page", page: "BrokenPage", address: "/broken" }
  ]
  static dialogs = [{ name: "settings dialog", view: "SettingsDialog" }]
}

////////////////
// ## Tests
////////////////

describe("a running site", () => {
  let page: ReturnType<typeof parseHTML>
  let element: HTMLElement
  let site: GalaxyGuide
  let hope: Film
  let dispose: (() => void) | undefined

  beforeAll(() => {
    page = parseHTML("<!doctype html><html><head></head><body></body></html>")
    for (const name of ["window", "document", "Node", "Element", "HTMLElement", "Event", "CustomEvent"]) {
      vi.stubGlobal(name, page[name as keyof typeof page])
    }
    bridgeSolid({ enableExternalSource, flush })
  })

  beforeEach(() => {
    core.resetRuntime()
    element = page.document.createElement("div")
    page.document.body.appendChild(element)
    core.appRoot = element
    core.things.addClass(Film)
    core.things.addClass(SettingsDialog)
    new FilmsPage()
    new FilmPage()
    new BrokenPage()
    hope = new Film({ id: "a-new-hope", title: "A New Hope" })
    site = new GalaxyGuide()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    dispose?.()
    dispose = undefined
    core.siteHost = undefined
    element.remove()
    vi.restoreAllMocks()
  })

  /** What the site draws now, as text:  its columns, not the narrow width's style sheet and menu button. */
  async function shown(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve))
    core.flush()
    return element.querySelector(".spell-site")?.textContent ?? ""
  }

  /** Draw the site into the fake page. */
  function drawSite(): void {
    dispose = render(() => core.drawThing(site) as never, element)
  }

  test("is the program's site:  `go to the ...` goes through it", () => {
    expect(core.RUNTIME.site).toBe(site)
  })

  test("finds the page an address names, nested ones too, and its parameters", () => {
    expect(site.pageFor("/films")?.entry.name).toBe("films page")
    expect(site.pageFor("/films/a-new-hope")).toMatchObject({
      entry: { name: "film page" },
      params: { film: "a-new-hope" }
    })
    expect(site.pageFor("/planets")).toBeUndefined()
  })

  test("makes a page's address from the page's name, a thing's id in its parameter", () => {
    expect(site.addressOf("films page")).toBe("/films")
    expect(site.addressWith("film page", hope)).toBe("/films/a-new-hope")
    expect(core.siteAddressOf("film page", hope)).toBe("/films/a-new-hope")
    expect(() => site.addressOf("planet page")).toThrow(/no page "planet page"/)
    expect(() => site.addressOf("film page")).toThrow(/`:film`/)
  })

  test("lists its pages for its navigation, and marks the one shown, a film's page marking Films (P3)", async () => {
    expect(site.navPages()).toEqual([
      { title: "Films", href: "/films", id: "films page" },
      { title: "broken page", href: "/broken", id: "broken page" }
    ])
    await site.showAddress("/films/a-new-hope")
    expect(site.navCurrent()).toBe("/films")
    await site.showAddress("/planets")
    expect(site.navCurrent()).toBe("")
  })

  test("draws its navigation beside the page:  a `<ui-site-nav>`, marking the page shown (P3)", async () => {
    drawSite()
    await site.showAddress("/films/a-new-hope")
    await shown()
    const nav = element.querySelector("ui-site-nav.spell-site-nav")!
    expect(nav).toBeTruthy()
    expect(nav.getAttribute("current")).toBe("/films")
    expect(nav.getAttribute("remember")).toBe("GalaxyGuide")
    expect(element.querySelector(".spell-site-page")!.textContent).toBe("A New Hope")
  })

  test("shows the page its address names, its parameter filled from the program's things", async () => {
    drawSite()
    await site.showAddress("/films/a-new-hope")
    expect(await shown()).toBe("A New Hope")
    expect(site.currentAddress).toBe("/films/a-new-hope")
  })

  test("`go to the film page for this film`:  through the host, which keeps the address", async () => {
    const went: string[] = []
    core.siteHost = { address: () => "/films", go: (address) => went.push(address), listen: () => {} }
    drawSite()
    core.showSitePart("film page", hope)
    expect(went).toEqual(["/films/a-new-hope"])
    expect(await shown()).toBe("A New Hope")
  })

  test("starts at its host's address, and follows it back and forward", async () => {
    let follow: ((address: string) => void) | undefined
    core.siteHost = { address: () => "/films", go: () => {}, listen: (showAddress) => (follow = showAddress) }
    // `start()` mounts into `core.appRoot`, as an app does
    site.start()
    expect(await shown()).toBe("Films")
    follow?.("/films/a-new-hope")
    expect(await shown()).toBe("A New Hope")
    ;(element as { spellRoot?: { unmount(): void } }).spellRoot?.unmount()
  })

  test("`/` with no page of its own is its first page", async () => {
    drawSite()
    await site.showAddress("/")
    expect(await shown()).toBe("Films")
  })

  test("an address no page has:  no such page, and, while designing, an offer to make one", async () => {
    drawSite()
    await site.showAddress("/planets")
    expect(await shown()).toBe("No such page")
    const made: string[] = []
    core.siteHost = { address: () => "/", go: () => {}, listen: () => {}, createPage: (address) => made.push(address) }
    await site.showAddress("/planets/tatooine")
    expect(await shown()).toBe("No such pageWould you like to create one? Create it")
  })

  test("a page that fails to draw:  the error page in its place, saying why only while designing", async () => {
    drawSite()
    await site.showAddress("/broken")
    expect(await shown()).toBe("Sorry, this page couldn't be shown.")
    const host: SiteHost = { address: () => "/", go: () => {}, listen: () => {}, createPage: () => {} }
    core.siteHost = host
    await site.showAddress("/films")
    await site.showAddress("/broken")
    expect(await shown()).toBe("Sorry, this page couldn't be shown.broken page failed:  no projector")
  })

  test("`show the settings dialog`:  opens over the page, and closing it forgets it", async () => {
    drawSite()
    await site.showAddress("/films")
    core.showSitePart("settings dialog")
    await shown()
    const modal = element.querySelector("ui-modal")
    expect(modal?.textContent).toBe("Settings")
    site.closeOverlay()
    await shown()
    expect(element.querySelector("ui-modal")).toBeNull()
  })

  test("its navigation's pages are JSON text, which reads the same with or without Spell UI", async () => {
    drawSite()
    await site.showAddress("/films")
    await shown()
    const pages = JSON.parse(element.querySelector("ui-site-nav")!.getAttribute("pages")!)
    expect(pages[0]).toMatchObject({ title: "Films", href: "/films" })
  })

  test("narrow:  the menu button opens the navigation over the page;  Escape closes it", async () => {
    drawSite()
    await site.showAddress("/films")
    await shown()
    const menu = element.querySelector<HTMLElement>(".spell-site-menu")!
    const columns = () => element.querySelector(".spell-site")!
    expect(menu.getAttribute("aria-expanded")).toBe("false")
    menu.click()
    await shown()
    expect(columns().classList.contains("nav-open")).toBe(true)
    expect(menu.getAttribute("aria-expanded")).toBe("true")
    columns().dispatchEvent(Object.assign(new Event("keydown", { bubbles: true }), { key: "Escape" }))
    await shown()
    expect(columns().classList.contains("nav-open")).toBe(false)
  })

  test("a link to one of its addresses is followed here", async () => {
    drawSite()
    await site.showAddress("/films")
    const link = page.document.createElement("a")
    link.setAttribute("href", "/films/a-new-hope")
    element.querySelector(".spell-site")!.appendChild(link)
    const click = new page.Event("click", { bubbles: true, cancelable: true }) as Event & { button?: number }
    Object.defineProperty(click, "button", { value: 0 })
    link.dispatchEvent(click)
    expect(await shown()).toContain("A New Hope")
  })

  test("with no site, `go to the ...` says so", () => {
    core.resetRuntime()
    expect(() => core.showSitePart("films page")).toThrow(/has no site/)
  })
})
