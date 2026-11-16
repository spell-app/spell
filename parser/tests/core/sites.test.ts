import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid, PrefStore } from "spell/util"
import { core, Page, PageLayout, Site, Thing, View, h } from "spell/parser/core"
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

/** A sidebar's view, showing a film it's handed:  its `film` has no value of its own. */
class FilmSidebar extends View {
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
    return h("p", null, () => this.film?.title ?? "?") as unknown as Drawing
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
  static sidebars = [{ name: "film sidebar", view: "FilmSidebar" }]
}

/** A page that wants its family as tabs (epic `mockup` T38):  `<site-tabs/>` above its header. */
class TabbedPage extends Page {
  draw(): Drawing {
    return h("div", null, h("ui-site-tabs", null), h("h1", null, "Tabbed")) as unknown as Drawing
  }
}

/** A site whose one page draws tabs. */
class TabbedGuide extends Site {
  static pages = [{ name: "tabbed page", page: "TabbedPage", address: "/tabbed" }]
}

/** A page drawn alone, its line saying `, no layout` (T39). */
class LoginPage extends Page {
  static layout = false
  draw(): Drawing {
    return h("h1", null, "Log in") as unknown as Drawing
  }
}

/** A page in the bare layout, its line saying `, in the bare layout`. */
class PrintPage extends Page {
  static layout = "BareLayout"
  draw(): Drawing {
    return h("h1", null, "Print") as unknown as Drawing
  }
}

/** A page that draws the layout's right side bar itself:  its own wins while it's shown. */
class CastPage extends Page {
  draw(): Drawing {
    return h("h1", null, "Cast") as unknown as Drawing
  }
  drawRightSidebar(): Drawing {
    return h("p", null, "Who's in it") as unknown as Drawing
  }
}

/** The main layout:  an app menu with a button, and a right side bar;  its page menu the template's, the tabs. */
class MainLayout extends PageLayout {
  drawAppMenu(): Drawing {
    return h("ui-app-menu", null, h("button", null, "Share")) as unknown as Drawing
  }
  drawRightSidebar(): Drawing {
    return h("p", null, "Related") as unknown as Drawing
  }
}

/** Another layout:  only a footer, its drawer the site's navigation. */
class BareLayout extends PageLayout {
  drawFooter(): Drawing {
    return h("p", null, "Made with Spell") as unknown as Drawing
  }
}

/** A site with page layouts (T39):  its films in a group, a page drawn alone, one in the bare layout. */
class StarCharts extends Site {
  static pages = [
    { ...GalaxyGuide.pages[0]!, group: "Archive" },
    { name: "login page", page: "LoginPage", address: "/login" },
    { name: "print page", page: "PrintPage", address: "/print" },
    { name: "cast page", page: "CastPage", address: "/cast" }
  ]
  static mainLayout = "MainLayout"
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
    core.things.addClass(FilmSidebar)
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

  /** What the site draws now, as text:  the layout shown, not the ones kept hidden, nor the style sheet. */
  async function shown(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve))
    core.flush()
    return element.querySelector(SHOWN)?.textContent ?? ""
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
    expect(element.querySelector(SHOWN)!.textContent).toBe("A New Hope")
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

  test("`close the settings dialog`:  closes it;  naming no dialog or sidebar throws (P8)", async () => {
    drawSite()
    await site.showAddress("/films")
    core.showSitePart("settings dialog")
    await shown()
    core.closeSitePart("settings dialog")
    await shown()
    expect(element.querySelector("ui-modal")).toBeNull()
    expect(() => core.closeSitePart("films page")).toThrow(TypeError)
  })

  test("`show the film sidebar for this film`:  its view's property with no value of its own takes the film (P8)", async () => {
    drawSite()
    await site.showAddress("/films")
    core.showSitePart("film sidebar", hope)
    await shown()
    expect(element.querySelector("ui-flyout")?.textContent).toBe("A New Hope")
  })

  test("a link to a page whose thing isn't read yet goes nowhere, rather than failing (P8)", () => {
    expect(core.siteAddressOf("film page", undefined)).toBe("")
    expect(core.siteAddressOf("film page", hope)).toBe("/films/a-new-hope")
  })

  test("wears its `theme`, the tokens its host gives for it, on its frame (P8)", async () => {
    Object.defineProperty(site, "theme", { value: "mockup" })
    core.siteHost = {
      address: () => "/films",
      go: () => {},
      listen: () => {},
      themeTokens: async (name) => `--ui-font-family: ${name}`
    }
    site.start()
    drawSite()
    await site.showAddress("/films")
    await shown()
    const frame = element.querySelector(".spell-site-frame")!
    expect(frame.getAttribute("data-theme")).toBe("mockup")
    expect(frame.getAttribute("style")).toContain("--ui-font-family: mockup")
  })

  test("its navigation's pages are JSON text, which reads the same with or without Spell UI", async () => {
    drawSite()
    await site.showAddress("/films")
    await shown()
    const pages = JSON.parse(element.querySelector("ui-site-nav")!.getAttribute("pages")!)
    expect(pages[0]).toMatchObject({ title: "Films", href: "/films" })
  })

  test("draws no tabs of its own:  a page that wants them draws `<site-tabs/>`, inside the box beside its navigation (T38)", async () => {
    drawSite()
    await site.showAddress("/films")
    await shown()
    expect(element.querySelector("ui-site-tabs")).toBeNull()
    dispose?.()
    new TabbedPage()
    const tabbed = new TabbedGuide()
    dispose = render(() => core.drawThing(tabbed) as never, element)
    await tabbed.showAddress("/tabbed")
    await shown()
    const tabs = element.querySelectorAll("ui-site-tabs")
    expect(tabs.length).toBe(1)
    // the box `<ui-site-tabs>` follows the navigation of:  the one with a `<ui-site-nav>` of its own
    const box = element.querySelector(".spell-site")!
    expect(box.contains(tabs[0]!)).toBe(true)
    expect([...box.children].some((child) => child.localName === "ui-site-nav")).toBe(true)
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

  describe("with page layouts (T39)", () => {
    let charts: StarCharts

    beforeEach(() => {
      new LoginPage()
      new PrintPage()
      new CastPage()
      new MainLayout()
      new BareLayout()
      PrefStore.setAt("spell-sites:StarCharts.MainLayout.compact", undefined)
      charts = new StarCharts()
      dispose = render(() => core.drawThing(charts) as never, element)
    })

    afterEach(() => PrefStore.setAt("spell-sites:StarCharts.MainLayout.compact", undefined))

    /** The layout element of class `name`, shown or not. */
    const layout = (name: string) => element.querySelector(`ui-page-layout[data-layout="${name}"]`)
    /** Region `slot` of the layout of class `name`:  the wrapper its drawing is slotted in by. */
    const region = (name: string, slot: string) => layout(name)?.querySelector(`:scope > [slot="${slot}"]`)

    test("draws a page in the site's main layout:  its slots, the site's navigation in the drawer, the page", async () => {
      await charts.showAddress("/films")
      expect(await shown()).toContain("Films")
      expect(region("MainLayout", "menu")?.textContent).toBe("Share")
      expect(region("MainLayout", "page-menu")?.querySelector("ui-site-tabs")).toBeTruthy()
      expect(region("MainLayout", "right")?.textContent).toBe("Related")
      expect(region("MainLayout", "footer")).toBeNull()
      expect(layout("MainLayout")?.querySelector(':scope > ui-site-nav[slot="drawer"]')).toBeTruthy()
    })

    test("wears its `theme` on a layout too:  the drawer, app menu, page menu and page all inside its themed frame (I29)", async () => {
      Object.defineProperty(charts, "theme", { value: "mockup" })
      core.siteHost = {
        address: () => "/films",
        go: () => {},
        listen: () => {},
        themeTokens: async (name) => `--ui-font-family: ${name}`
      }
      charts.start()
      expect(await shown()).toContain("Films")
      const frame = element.querySelector(".spell-site-frame")!
      expect(frame.getAttribute("data-theme")).toBe("mockup")
      expect(frame.getAttribute("style")).toContain("--ui-font-family: mockup")
      for (const part of [
        layout("MainLayout"),
        layout("MainLayout")?.querySelector(':scope > ui-site-nav[slot="drawer"]'),
        region("MainLayout", "menu"),
        region("MainLayout", "page-menu")
      ]) {
        expect(part?.closest(".spell-site-frame")).toBe(frame)
      }
    })

    test("no flash:  a page in the same layout redraws only the page, its menu and navigation the same elements", async () => {
      await charts.showAddress("/films")
      await shown()
      const before = { layout: layout("MainLayout"), menu: region("MainLayout", "menu")?.firstElementChild }
      const nav = element.querySelector("ui-site-nav")
      await charts.showAddress("/films/a-new-hope")
      expect(await shown()).toContain("A New Hope")
      expect(layout("MainLayout")).toBe(before.layout)
      expect(region("MainLayout", "menu")?.firstElementChild).toBe(before.menu)
      expect(element.querySelector("ui-site-nav")).toBe(nav)
    })

    test("a page that draws a slot itself:  its own wins while it's shown, the rest of the layout stays", async () => {
      await charts.showAddress("/films")
      await shown()
      const menu = region("MainLayout", "menu")?.firstElementChild
      await charts.showAddress("/cast")
      await shown()
      expect(region("MainLayout", "right")?.textContent).toBe("Who's in it")
      await charts.showAddress("/films")
      await shown()
      expect(region("MainLayout", "right")?.textContent).toBe("Related")
      expect(region("MainLayout", "menu")?.firstElementChild).toBe(menu)
    })

    test("a page in another layout shows that one;  the first is kept, hidden, and comes back as it was", async () => {
      await charts.showAddress("/films")
      await shown()
      const main = layout("MainLayout")
      await charts.showAddress("/print")
      expect(await shown()).toContain("Made with Spell")
      expect(main?.hasAttribute("hidden")).toBe(true)
      expect(layout("BareLayout")?.hasAttribute("hidden")).toBe(false)
      await charts.showAddress("/films")
      await shown()
      expect(layout("MainLayout")).toBe(main)
      expect(main?.hasAttribute("hidden")).toBe(false)
      expect(layout("BareLayout")?.hasAttribute("hidden")).toBe(true)
    })

    test("`, no layout`:  the page alone", async () => {
      await charts.showAddress("/login")
      expect(await shown()).toBe("Log in")
      expect(element.querySelector("ui-page-layout:not([hidden])")).toBeNull()
    })

    test("the not found page is in the main layout:  its navigation is there, to get out", async () => {
      await charts.showAddress("/nowhere")
      expect(await shown()).toContain("No such page")
      expect(layout("MainLayout")?.hasAttribute("hidden")).toBe(false)
    })

    test('its drawer\'s icons only (`drawer="compact"`):  remembered for each person, site and layout', async () => {
      await charts.showAddress("/films")
      await shown()
      expect(layout("MainLayout")?.hasAttribute("drawer")).toBe(false)
      layout("MainLayout")!.dispatchEvent(
        new CustomEvent("ui-toggle", { detail: { newState: "compact", oldState: "full" } })
      )
      await shown()
      expect(layout("MainLayout")?.getAttribute("drawer")).toBe("compact")
      expect(new StarCharts().isCompact("MainLayout")).toBe(true)
      expect(new StarCharts().isCompact("BareLayout")).toBe(false)
      layout("MainLayout")!.dispatchEvent(
        new CustomEvent("ui-toggle", { detail: { newState: "full", oldState: "compact" } })
      )
      await shown()
      expect(layout("MainLayout")?.hasAttribute("drawer")).toBe(false)
      expect(new StarCharts().isCompact("MainLayout")).toBe(false)
    })

    test("a site with no main layout draws its built-in frame:  the navigation and the page, nothing else", async () => {
      dispose?.()
      drawSite()
      await site.showAddress("/films")
      expect(await shown()).toContain("Films")
      const frame = element.querySelector("ui-page-layout")!
      expect(frame.hasAttribute("data-layout")).toBe(false)
      expect([...frame.children].map((child) => child.getAttribute("slot") ?? child.localName)).toEqual([
        "drawer",
        "h1"
      ])
    })
  })

  test("with no site, `go to the ...` says so", () => {
    core.resetRuntime()
    expect(() => core.showSitePart("films page")).toThrow(/has no site/)
  })
})

/** The layout shown, or the page drawn alone:  not the layouts kept hidden. */
const SHOWN = ".spell-site:not([hidden]), .spell-site-alone:not([hidden])"
