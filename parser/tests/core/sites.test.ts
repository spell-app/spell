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

/** A page with sections, its tab bound to its `section`, a text parameter that may be left out. */
class AccountPage extends Page {
  static {
    this.declareProp("section", { type: "text" })
  }
  get section() {
    return this.getProp("section") as string | undefined
  }
  set section(value) {
    this.setProp("section", value)
  }
  draw(): Drawing {
    return h("h1", null, () => `Account ${this.section ?? ""}`) as unknown as Drawing
  }
}

/** A page with two text parameters that may be left out:  a tab, and a view under it. */
class ShelfPage extends Page {
  static {
    this.declareProp("tab", { type: "text" })
    this.declareProp("view", { type: "text" })
  }
  get tab() {
    return this.getProp("tab") as string | undefined
  }
  set tab(value) {
    this.setProp("tab", value)
  }
  get view() {
    return this.getProp("view") as string | undefined
  }
  set view(value) {
    this.setProp("view", value)
  }
  draw(): Drawing {
    return h("h1", null, () => `Shelf ${this.tab ?? ""} ${this.view ?? ""}`) as unknown as Drawing
  }
}

/** A rack, by the text its address names:  a text parameter that can't be left out. */
class RackPage extends Page {
  static {
    this.declareProp("rack", { type: "text" })
  }
  get rack() {
    return this.getProp("rack") as string | undefined
  }
  set rack(value) {
    this.setProp("rack", value)
  }
  draw(): Drawing {
    return h("h1", null, () => `Rack ${this.rack ?? ""}`) as unknown as Drawing
  }
}

/**
 * A site whose pages keep their tabs in their addresses:  its account's sections, its shelf's tab and view, a film's
 * page under the shelf listed before it, so it keeps `/shelf/films/<film>`.
 */
class Library extends Site {
  static pages = [
    { name: "account page", page: "AccountPage", address: "/account/:section?", title: "Account", params: ["section"] },
    { name: "film page", page: "FilmPage", address: "/shelf/films/:film", params: ["film"] },
    { name: "shelf page", page: "ShelfPage", address: "/shelf/:tab?/:view?", title: "Shelf", params: ["tab", "view"] },
    { name: "rack page", page: "RackPage", address: "/racks/:rack", params: ["rack"] }
  ]
  static dialogs = [{ name: "confirm order dialog", view: "SettingsDialog" }]
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

/** A page filling the window, its line saying `, filling the window`. */
class DashPage extends Page {
  static fillsWindow = true
  draw(): Drawing {
    return h("h1", null, "Dash") as unknown as Drawing
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

/** A layout drawing its own drawer round the site's navigation:  a logo above it, its groups headings. */
class DrawerLayout extends PageLayout {
  drawDrawer(): Drawing {
    return h("ui-site-nav", { groups: "headings" }, h("b", { slot: "start" }, "Logo")) as unknown as Drawing
  }
}

/** Another layout:  only a footer, its drawer the site's navigation. */
class BareLayout extends PageLayout {
  drawFooter(): Drawing {
    return h("p", null, "Made with Spell") as unknown as Drawing
  }
}

/**
 * A site whose pages are in groups (T34, I35, C2):  its Home the one page of a group named for it, around it its dialogs
 * (which the navigation doesn't list);  a group of one page of another name;  a group of two.
 */
class Lobby extends Site {
  static pages = [
    { name: "home", page: "FilmsPage", address: "/", title: "Home", group: "Home", groupIcon: "house" },
    {
      name: "inbox",
      page: "FilmsPage",
      address: "/inbox",
      title: "Inbox",
      icon: "inbox",
      group: "Mine",
      groupIcon: "user"
    },
    { name: "help", page: "FilmsPage", address: "/help", title: "Help", group: "help", groupIcon: "circle question" },
    { name: "faq", page: "FilmsPage", address: "/faq", title: "FAQ", group: "help" }
  ]
}

/**
 * A site with links out among its pages:  one in a group of its own, one after the last
 * page with no title, one under a page.
 */
class Portal extends Site {
  static pages = [
    {
      name: "home",
      page: "FilmsPage",
      address: "/",
      title: "Home",
      links: [{ link: "https://films.example.com", title: "Films", at: 0 }]
    },
    { name: "settings", page: "FilmsPage", address: "/settings", title: "Settings", group: "Settings" }
  ]
  static links = [
    { link: "https://docs.example.com", title: "Help", icon: "book", group: "Help", at: 1 },
    { link: "https://status.example.com", at: 2 }
  ]
}

/** A site with a group of two links out. */
class Monitored extends Site {
  static pages = [{ name: "home", page: "FilmsPage", address: "/", title: "Home" }]
  static links = [
    { link: "https://status.example.com", title: "Status", group: "Monitoring", at: 1 },
    { link: "https://env.example.com", title: "Environment", group: "Monitoring", at: 1 }
  ]
}

/** A site with page layouts (T39):  its films in a group, a page drawn alone, one in the bare layout. */
class StarCharts extends Site {
  static pages = [
    { ...GalaxyGuide.pages[0]!, group: "Archive" },
    { name: "login page", page: "LoginPage", address: "/login" },
    { name: "print page", page: "PrintPage", address: "/print" },
    { name: "cast page", page: "CastPage", address: "/cast" },
    { name: "dash page", page: "DashPage", address: "/dash" }
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
    // and what that drawing's changes wrote to the address, a moment after (`SiteBase.followParams()`)
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
    // the page it doesn't list, for the breadcrumbs
    expect(site.navShownBelow()).toEqual(["film page"])
    await site.showAddress("/planets")
    expect(site.navCurrent()).toBe("")
    expect(site.navShownBelow()).toEqual([])
  })

  test("lists a group of one page as that page alone, whatever its name, no group's header;  other groups as groups (I35, C2)", () => {
    expect(new Lobby().navPages()).toEqual([
      // its own icon, else its group's
      { title: "Home", href: "/", id: "home", icon: "house" },
      // named otherwise:  still the page alone, its own icon
      { title: "Inbox", href: "/inbox", id: "inbox", icon: "inbox" },
      {
        title: "help",
        id: "group:help",
        band: "group",
        icon: "circle question",
        pages: [
          { title: "Help", href: "/help", id: "help" },
          { title: "FAQ", href: "/faq", id: "faq" }
        ]
      }
    ])
  })

  test("for a navigation of headings, a group of one page keeps its heading", () => {
    const [home, inbox] = new Lobby().navPages({ headings: true })
    expect(home).toMatchObject({ title: "Home", band: "group", pages: [{ title: "Home", href: "/" }] })
    expect(inbox).toMatchObject({ title: "Mine", band: "group", pages: [{ title: "Inbox", href: "/inbox" }] })
  })

  test("leaves out a page `, not in the navigation`, and a group with no page left;  shown, it's below what's marked", async () => {
    class Quiet extends Site {
      static pages = [
        { name: "films", page: "FilmsPage", address: "/films", title: "Films", group: "Films" },
        { name: "settings", page: "FilmsPage", address: "/settings", title: "Settings", group: "Mine", unlisted: true },
        { name: "patterns", page: "FilmsPage", address: "/patterns", title: "Patterns", group: "Mine", unlisted: true }
      ]
    }
    const site = new Quiet()
    expect(site.navPages({ headings: true }).map((page) => page.title)).toEqual(["Films"])
    await site.showAddress("/settings")
    expect(site.navCurrent()).toBe("")
    expect(site.navShownBelow()).toEqual(["Settings"])
  })

  test("lists its links out among its pages, each where its line is, in its group", () => {
    expect(new Portal().navPages()).toEqual([
      {
        title: "Home",
        href: "/",
        id: "home",
        pages: [{ title: "Films", href: "https://films.example.com", id: "link:https://films.example.com" }]
      },
      { title: "Help", href: "https://docs.example.com", id: "link:https://docs.example.com", icon: "book" },
      { title: "Settings", href: "/settings", id: "settings" },
      // no title:  its address
      { title: "https://status.example.com", href: "https://status.example.com", id: "link:https://status.example.com" }
    ])
  })

  test("a group of links out only starts open:  it never holds the page shown", () => {
    expect(new Monitored().navPages()).toEqual([
      { title: "Home", href: "/", id: "home" },
      {
        title: "Monitoring",
        id: "group:Monitoring",
        band: "group",
        open: true,
        pages: [
          { title: "Status", href: "https://status.example.com", id: "link:https://status.example.com" },
          { title: "Environment", href: "https://env.example.com", id: "link:https://env.example.com" }
        ]
      }
    ])
  })

  test("a link out, picked in its navigation, opens in a new tab;  the site stays where it is", async () => {
    const open = vi.fn()
    // not `vi.stubGlobal()`:  unstubbing would take the fake page's globals with it
    const was = globalThis.open
    globalThis.open = open
    drawSite()
    await site.showAddress("/films")
    await shown()
    const nav = element.querySelector("ui-site-nav.spell-site-nav")!
    const pick = (href: string) =>
      nav.dispatchEvent(new window.CustomEvent("ui-navigating", { detail: { href }, cancelable: true }))
    expect(pick("https://docs.example.com")).toBe(false)
    expect(open).toHaveBeenCalledWith("https://docs.example.com", "_blank", "noopener")
    expect(site.currentAddress).toBe("/films")
    globalThis.open = was
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

  test("asks its host for its theme with the program's folder, where a theme of its own is", async () => {
    Object.defineProperty(site, "theme", { value: "harbor" })
    const asked: Array<[string, string | undefined]> = []
    core.projectFolder = "/spaces/@spell/examples/Harbor"
    core.siteHost = {
      address: () => "/films",
      go: () => {},
      listen: () => {},
      themeTokens: async (name, projectFolder) => {
        asked.push([name, projectFolder])
        return ""
      }
    }
    try {
      site.start()
      expect(asked).toEqual([["harbor", "/spaces/@spell/examples/Harbor"]])
    } finally {
      core.projectFolder = undefined
    }
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
      new DashPage()
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

    test("a page whose parameter's thing is still being read:  its layout at once, a spinner where the page goes", async () => {
      const going = charts.showAddress("/films/a-new-hope")
      core.flush()
      flush()
      expect(region("MainLayout", "menu")?.textContent).toBe("Share")
      expect(layout("MainLayout")?.querySelector(".spell-page-waiting ui-loader")).toBeTruthy()
      await going
      expect(await shown()).toContain("A New Hope")
      expect(layout("MainLayout")?.querySelector(".spell-page-waiting")).toBeNull()
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

    test("a layout drawing its drawer:  the `<ui-site-nav>` in it is the site's navigation, its own attributes kept", async () => {
      new DrawerLayout()
      class Drawn extends Site {
        static pages = StarCharts.pages
        static mainLayout = "DrawerLayout"
      }
      dispose?.()
      const drawn = new Drawn()
      dispose = render(() => core.drawThing(drawn) as never, element)
      await drawn.showAddress("/films")
      expect(await shown()).toContain("Films")
      const nav = layout("DrawerLayout")?.querySelector(':scope > [slot="drawer"] ui-site-nav')
      expect(nav?.getAttribute("groups")).toBe("headings")
      expect(nav?.getAttribute("appearance")).toBe("nav")
      expect(nav?.getAttribute("current")).toBe("/films")
      // a group of one page keeps its heading, for a navigation of headings
      expect(JSON.parse(nav?.getAttribute("pages") ?? "[]")[0]).toMatchObject({ title: "Archive", band: "group" })
      expect(nav?.querySelector('[slot="start"]')?.textContent).toBe("Logo")
      // a page picked in it is shown here
      nav!.dispatchEvent(new CustomEvent("ui-navigating", { cancelable: true, detail: { href: "/films/a-new-hope" } }))
      expect(await shown()).toContain("A New Hope")
      expect(nav?.getAttribute("current")).toBe("/films")
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

    test('`, filling the window`:  its layout is `page-height="fluid"` while it\'s shown, and only then', async () => {
      await charts.showAddress("/dash")
      expect(await shown()).toContain("Dash")
      expect(layout("MainLayout")?.getAttribute("page-height")).toBe("fluid")
      await charts.showAddress("/films")
      await shown()
      expect(layout("MainLayout")?.hasAttribute("page-height")).toBe(false)
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

    // epic `mockup` T55:  the drawer hidden, and the side bars, remembered as the compact drawer is
    test('its drawer hidden (`drawer="hidden"`) and its right side bar hidden:  remembered for each person, site and layout', async () => {
      await charts.showAddress("/films")
      await shown()
      const main = () => layout("MainLayout")!
      main().dispatchEvent(
        new CustomEvent("ui-toggle", { detail: { region: "drawer", newState: "hidden", oldState: "full" } })
      )
      main().dispatchEvent(
        new CustomEvent("ui-toggle", { detail: { region: "right", newState: "hidden", oldState: "shown" } })
      )
      await shown()
      expect(main().getAttribute("drawer")).toBe("hidden")
      expect(main().getAttribute("right")).toBe("hidden")
      expect(new StarCharts().regionState("MainLayout", "drawer")).toBe("hidden")
      expect(new StarCharts().regionState("MainLayout", "right")).toBe("hidden")
      expect(new StarCharts().regionState("BareLayout", "right")).toBeUndefined()
      expect(new StarCharts().isCompact("MainLayout")).toBe(false)
      main().dispatchEvent(
        new CustomEvent("ui-toggle", { detail: { region: "right", newState: "shown", oldState: "hidden" } })
      )
      main().dispatchEvent(
        new CustomEvent("ui-toggle", { detail: { region: "drawer", newState: "full", oldState: "hidden" } })
      )
      await shown()
      expect(main().hasAttribute("right")).toBe(false)
      expect(main().hasAttribute("drawer")).toBe(false)
      expect(new StarCharts().regionState("MainLayout", "right")).toBeUndefined()
    })

    test("a site with no main layout draws its built-in frame:  the navigation and the page, nothing else", async () => {
      dispose?.()
      drawSite()
      await site.showAddress("/films")
      expect(await shown()).toContain("Films")
      const frame = element.querySelector("ui-page-layout")!
      expect(frame.hasAttribute("data-layout")).toBe(false)
      // the page in its own box, which takes no room of its own (`.spell-site-page`):  kept while another shows (P13)
      expect([...frame.children].map((child) => child.getAttribute("slot") ?? child.className)).toEqual([
        "drawer",
        "spell-site-page"
      ])
      expect(frame.querySelector(".spell-site-page > h1")).not.toBeNull()
    })

    test("the last 3 pages stay drawn:  Back to one is the same elements;  an older one is let go (P13)", async () => {
      dispose?.()
      drawSite()
      await site.showAddress("/films")
      await shown()
      const films = element.querySelector(".spell-site-page")
      await site.showAddress("/films/a-new-hope")
      await shown()
      // only the page shown is on the page:  a table of contents finds only its sections
      expect(element.querySelectorAll(".spell-site-page")).toHaveLength(1)
      expect(element.querySelector(".spell-site-page")).not.toBe(films)
      await site.showAddress("/films")
      await shown()
      expect(element.querySelector(".spell-site-page")).toBe(films)
    })

    test("one page at another address is drawn afresh:  what was drawn at the first never shows at the next (P13)", async () => {
      dispose?.()
      new Film({ id: "empire", title: "The Empire Strikes Back" })
      drawSite()
      await site.showAddress("/films/a-new-hope")
      expect(await shown()).toBe("A New Hope")
      const hopes = element.querySelector(".spell-site-page")
      // something only this drawing has, as a view's own choice is (a rack picked in a list)
      hopes!.setAttribute("data-chosen", "yes")
      await site.showAddress("/films/empire")
      expect(await shown()).toBe("The Empire Strikes Back")
      const empires = element.querySelector(".spell-site-page")
      expect(empires).not.toBe(hopes)
      expect(empires!.hasAttribute("data-chosen")).toBe(false)
      // Back to the first address:  its own drawing, as it was left
      await site.showAddress("/films/a-new-hope")
      expect(await shown()).toBe("A New Hope")
      expect(element.querySelector(".spell-site-page")).toBe(hopes)
    })
  })

  describe("a page's text parameters in its address (P22)", () => {
    let library: Library
    let account: AccountPage
    let shelf: ShelfPage
    let went: [string, unknown][]
    let opened: string[]
    let closed: number

    beforeEach(() => {
      core.resetRuntime()
      core.things.addClass(Film)
      core.things.addClass(SettingsDialog)
      core.things.addClass(FilmSidebar)
      new FilmPage()
      account = new AccountPage()
      // what its `when creating it` gives it:  its first tab
      account.section = "profile"
      shelf = new ShelfPage()
      shelf.tab = "books"
      new RackPage()
      hope = new Film({ id: "a-new-hope", title: "A New Hope" })
      library = new Library()
      went = []
      opened = []
      closed = 0
      core.siteHost = {
        address: () => "/",
        go: (address, how) => went.push([address, how]),
        listen: () => {},
        partOpened: (hash) => opened.push(hash),
        partClosed: () => closed++
      }
      dispose = render(() => core.drawThing(library) as never, element)
    })

    test("a page whose parameters may all be left out is listed, at its address without them", () => {
      expect(library.navPages().map((page) => page.href)).toEqual(["/account", "/shelf"])
      expect(library.addressOf("account page")).toBe("/account")
      expect(library.addressOf("account page", { section: "billing" })).toBe("/account/billing")
    })

    test("its address left out:  its starting value;  with it:  the segment's text", async () => {
      await library.showAddress("/account/billing")
      expect(await shown()).toBe("Account billing")
      await library.showAddress("/account")
      expect(account.section).toBe("profile")
      expect(await shown()).toBe("Account profile")
      expect(library.navCurrent()).toBe("/account")
    })

    test("changed on the page:  the address written, a step in the history, the page not drawn again", async () => {
      await library.showAddress("/account")
      await shown()
      const drawn = element.querySelector(".spell-site-page")
      account.section = "team"
      expect(await shown()).toBe("Account team")
      expect(went).toEqual([["/account/team", { keepScroll: true }]])
      expect(library.currentAddress).toBe("/account/team")
      expect(element.querySelector(".spell-site-page")).toBe(drawn)
      // back to its first tab:  its plain address
      account.section = "profile"
      await shown()
      expect(went.at(-1)).toEqual(["/account", { keepScroll: true }])
    })

    test("Back and Forward set it back, the page not drawn again, nothing written", async () => {
      await library.showAddress("/account/team")
      await shown()
      const drawn = element.querySelector(".spell-site-page")
      await library.showAddress("/account/api-keys")
      expect(await shown()).toBe("Account api-keys")
      await library.showAddress("/account")
      expect(await shown()).toBe("Account profile")
      expect(element.querySelector(".spell-site-page")).toBe(drawn)
      expect(went).toEqual([])
    })

    test("several in a row:  one left out before one that's filled is written at its starting value", async () => {
      await library.showAddress("/shelf")
      await shown()
      shelf.view = "grid"
      expect(await shown()).toBe("Shelf books grid")
      expect(went.at(-1)).toEqual(["/shelf/books/grid", { keepScroll: true }])
      await library.showAddress("/shelf/magazines")
      expect(await shown()).toBe("Shelf magazines ")
    })

    test("a tab and its own tab changed together, as one pick:  one step in the history", async () => {
      await library.showAddress("/shelf/books/grid")
      await shown()
      went.length = 0
      shelf.tab = "magazines"
      await Promise.resolve()
      shelf.view = undefined
      expect(await shown()).toBe("Shelf magazines ")
      expect(went).toEqual([["/shelf/magazines", { keepScroll: true }]])
    })

    test("a text parameter that can't be left out, at another address:  drawn afresh, as before", async () => {
      await library.showAddress("/racks/d16")
      expect(await shown()).toBe("Rack d16")
      const d16 = element.querySelector(".spell-site-page")
      await library.showAddress("/racks/b16")
      expect(await shown()).toBe("Rack b16")
      expect(element.querySelector(".spell-site-page")).not.toBe(d16)
    })

    test("a page listed earlier keeps its address:  the film's page, not the shelf's tab and view", async () => {
      await library.showAddress("/shelf/films/a-new-hope")
      expect(await shown()).toBe("A New Hope")
    })

    test("a dialog or sidebar opened:  its hash written, its thing's id after its name;  closed:  taken out", async () => {
      await library.showAddress("/shelf")
      core.showSitePart("confirm order dialog")
      core.showSitePart("film sidebar", hope)
      expect(opened).toEqual(["confirm-order", "film/a-new-hope"])
      core.closeSitePart("film sidebar")
      expect(closed).toBe(1)
      // closed again:  nothing open, nothing to take out
      core.closeSitePart("film sidebar")
      expect(closed).toBe(1)
    })

    test("a hash naming one opens it, its thing looked up by its id;  none, it closes;  any other is a section", async () => {
      await library.showAddress("/shelf")
      expect(await library.showPart("film/a-new-hope")).toBe(true)
      await shown()
      expect(element.querySelector("ui-flyout")?.textContent).toBe("A New Hope")
      // opened from the address:  nothing written
      expect(opened).toEqual([])
      expect(await library.showPart("")).toBe(true)
      await shown()
      expect(element.querySelector("ui-flyout")).toBeNull()
      expect(closed).toBe(0)
      expect(await library.showPart("Confirm-Order")).toBe(true)
      await shown()
      expect(element.querySelector("ui-modal")?.textContent).toBe("Settings")
      expect(await library.showPart("credits")).toBe(false)
    })
  })

  test("with no site, `go to the ...` says so", () => {
    core.resetRuntime()
    expect(() => core.showSitePart("films page")).toThrow(/has no site/)
  })
})

/** The layout shown, or the page drawn alone:  not the layouts kept hidden. */
const SHOWN = ".spell-site:not([hidden]), .spell-site-alone:not([hidden])"
