import { describe, expect, test } from "vite-plus/test"

import { SiteBoard } from "spell/app/app/pages/SiteBoard"
import { SiteEdits } from "spell/app/app/pages/SiteEdits"

/**
 * A site's program, changed by what a person did (epic `mockup` P2, P4):  a site in plain Spell, its part lines bare,
 * or bulleted as an older writer wrote them.
 */
describe("SiteEdits", () => {
  test("a part's thumbnail is read, and kept when its line is rewritten;  a line without one gets none (P16)", () => {
    const code = 's is a site:\n\tit has a "home page" at "/a", thumbnail "x.jpg"\n\tit has a b page at "/b"\n'
    expect(SiteEdits.partsIn(code)![0]).toMatchObject({ thumbnail: "x.jpg" })
    expect(SiteEdits.withPartPlaced(code, "home page", { row: 1, column: 2 })).toContain(
      '\tit has a "home page" at "/a", thumbnail "x.jpg", in row 1 column 2\n'
    )
    expect(SiteEdits.withPartPlaced(code, "b page", { row: 1, column: 2 })).toContain(
      '\tit has a b page at "/b", in row 1 column 2\n'
    )
  })

  test("a link out of the site is no part:  no card, and its line stays as it is", () => {
    const code =
      's is a site:\n\tit has a home page at "/"\n\tit has a link to "https://docs.example.com", named "Help", icon "book"\n'
    expect(SiteEdits.partsIn(code)!.map((part) => part.name)).toEqual(["home page"])
    expect(SiteEdits.withPartPlaced(code, "home page", { row: 1, column: 2 })).toContain(
      '\tit has a link to "https://docs.example.com", named "Help", icon "book"\n'
    )
  })

  test("a page's icon is read, and kept when its line is written again (T34)", () => {
    const code = 's is a site:\n\tit has a films page at "/films", named "Films", icon "film", new\n'
    expect(SiteEdits.partsIn(code)![0]).toMatchObject({ title: "Films", icon: "film", state: "new" })
    expect(SiteEdits.withPartPlaced(code, "films page", { row: 1, column: 2 })).toContain(
      '\tit has a films page at "/films", named "Films", icon "film", new, in row 1 column 2\n'
    )
    expect(SiteEdits.withPartChanged(code, "films page", { title: "Movies" })).toContain(
      '\tit has a films page at "/films", named "Movies", icon "film", new\n'
    )
  })

  test("a top bar is its own kind of part, and a page's `no top bar` is kept when its line is written again (T35)", () => {
    const code = 's is a site:\n\tit has a top bar\n\tit has a login page at "/login", icon "key", no top bar\n'
    const [bar, login] = SiteEdits.partsIn(code)!
    expect(bar).toMatchObject({ kind: "topBar", name: "top bar" })
    expect(login).toMatchObject({ kind: "page", icon: "key", noTopBar: true })
    expect(SiteEdits.withPartPlaced(code, "login page", { row: 1, column: 2 })).toContain(
      '\tit has a login page at "/login", icon "key", no top bar, in row 1 column 2\n'
    )
    expect(SiteEdits.withPartChanged(code, "login page", { title: "Log in" })).toContain(
      '\tit has a login page at "/login", named "Log in", icon "key", no top bar\n'
    )
  })

  test("a page's or view's own thumbnail is found in the file declaring it (P16)", () => {
    expect(SiteEdits.thumbnailOf('"a page" is a page\n\tits thumbnail is "x.jpg"\n', "a page")).toBe("x.jpg")
    expect(SiteEdits.thumbnailOf('films page is a page:\n\tits thumbnail is "v.jpg"\n', "films page")).toBe("v.jpg")
    expect(
      SiteEdits.thumbnailOf('a "b dialog" is a view:\n\tits thumbnail is "y.jpg"\n\tto draw it:\n', "b dialog")
    ).toBe("y.jpg")
    expect(
      SiteEdits.thumbnailOf('"button usage" is a notebook page\n\tits thumbnail is "z.jpg"\n', "button usage page")
    ).toBe("z.jpg")
    // a line an older writer bulleted
    expect(SiteEdits.thumbnailOf('a "c page" is a page where:\n\t- its thumbnail is "w.jpg"\n', "c page")).toBe("w.jpg")
    expect(
      SiteEdits.thumbnailOf('"a page" is a page\n\t# A\n"other" is a page\n\tits thumbnail is "x.jpg"\n', "a page")
    ).toBeUndefined()
  })

  test("a part's tags and tab are read, and kept when its line is rewritten;  a bulleted line keeps its bullet (P15)", () => {
    const bare = 's is a site:\n\tit has a page at "/a", tab "Usage", tagged "Forms, Inputs"\n'
    expect(SiteEdits.partsIn(bare)![0]).toMatchObject({ tab: "Usage", tags: "Forms, Inputs" })
    expect(SiteEdits.withPartPlaced(bare, "page", { row: 1, column: 2 })).toContain(
      '\tit has a page at "/a", tab "Usage", tagged "Forms, Inputs", in row 1 column 2\n'
    )
    const bulleted = 's is a site:\n\t- it has a page at "/a", tab "Usage", tagged "Forms, Inputs", old\n'
    expect(SiteEdits.partsIn(bulleted)![0]).toMatchObject({ tab: "Usage", tags: "Forms, Inputs", state: "old" })
    expect(SiteEdits.withPartPlaced(bulleted, "page", { row: 1, column: 2 })).toContain(
      '\t- it has a page at "/a", tab "Usage", tagged "Forms, Inputs", old, in row 1 column 2\n'
    )
  })

  test("names a new page from its address's last part", () => {
    expect(SiteEdits.pageNameFor("/planets/tatooine")).toBe("tatooine page")
    expect(SiteEdits.pageNameFor("/about-us")).toBe("about us page")
    expect(SiteEdits.pageNameFor("/")).toBe("home page")
    expect(SiteEdits.pageNameFor("/new-page")).toBe("new page")
    expect(SiteEdits.pageNameFor("/about", ["about page", "about page 2"])).toBe("about page 3")
  })

  test("a new page:  `a ... is a page` before the site, `it has a ...` last in it", () => {
    const text = [
      "films page is a page",
      "galaxy guide is a site:",
      '\tit has a films page at "/films"',
      "",
      "to wander:",
      "\tprint 1",
      ""
    ].join("\n")
    expect(SiteEdits.withPageAdded(text, "about page", "/about")).toBe(
      [
        "films page is a page",
        'a "about page" is a page',
        "galaxy guide is a site:",
        '\tit has a films page at "/films"',
        '\tit has an about page at "/about"',
        "",
        "to wander:",
        "\tprint 1",
        ""
      ].join("\n")
    )
  })

  test("a new page in a site an older writer bulleted:  its line bare", () => {
    const text = 'galaxy guide is a site:\n\t- it has a films page at "/films"\n'
    const added = SiteEdits.withPageAdded(text, "about page", "/about")
    expect(added).toContain('\t- it has a films page at "/films"\n\tit has an about page at "/about"\n')
    expect(SiteEdits.partsIn(added)!.map((part) => part.name)).toEqual(["films page", "about page"])
  })

  test("a file with no site says so", () => {
    expect(SiteEdits.hasSite("a card is a thing")).toBe(false)
    expect(() => SiteEdits.withPageAdded("a card is a thing", "x page", "/x")).toThrow(/declares no site/)
  })

  ////////////////
  // ## The site editor's changes (epic `mockup` P4)
  ////////////////

  /** A site in plain Spell:  two pages declared here, one under the other, and a dialog. */
  const CODE = [
    "films page is a page:",
    "\tto draw it:",
    "\t\t<header>Films</header>",
    "film page is a page:",
    "\tits film is a film",
    "galaxy guide is a site:",
    '\tit has a films page at "/films", named "Films"',
    '\t\tit has a film page at "/films/:film", named "Film"',
    "\t// what opens over any page",
    "\tit has a settings dialog",
    ""
  ].join("\n")

  test("reads the parts, nested, with their addresses and titles", () => {
    const text = CODE
    const parts = SiteEdits.partsIn(text)!
    expect(parts.map((part) => [part.kind, part.name, part.address, part.title])).toEqual([
      ["page", "films page", "/films", "Films"],
      ["dialog", "settings dialog", undefined, undefined]
    ])
    expect(parts[0]!.parts.map((part) => [part.name, part.address, part.depth])).toEqual([
      ["film page", "/films/:film", 1]
    ])
    expect(SiteEdits.partsIn("a card is a thing")).toBeUndefined()
  })

  test("a page's address and title changed, a title taken out", () => {
    expect(SiteEdits.withPartChanged(CODE, "films page", { title: "Movies" })).toContain(
      '\tit has a films page at "/films", named "Movies"\n'
    )
    const changed = SiteEdits.withPartChanged(CODE, "film page", { address: "/movies/:film", title: "" })
    expect(changed).toContain('\t\tit has a film page at "/movies/:film"\n')
    expect(() => SiteEdits.withPartChanged(CODE, "film page", { address: "/films" })).toThrow(/is at \/films/)
    expect(() => SiteEdits.withPartChanged(CODE, "film page", { address: "films" })).toThrow(/starts with "\/"/)
  })

  test("a page renamed, in the site and its declaration", () => {
    const renamed = SiteEdits.withPartRenamed(CODE, "film page", "movie page")
    expect(renamed).toContain("movie page is a page:\n")
    expect(renamed).toContain('\t\tit has a movie page at "/films/:film"')
    expect(() => SiteEdits.withPartRenamed(CODE, "film page", "films page")).toThrow(/has a "films page" already/)
    expect(() => SiteEdits.withPartRenamed(CODE, "film page", 'a "quoted" name')).toThrow(/isn't a name/)
    // a name that can't be bare is quoted, in the site and its declaration
    const titled = SiteEdits.withPartRenamed(CODE, "film page", "Boxes & Blades")
    expect(titled).toContain('\t\tit has a "Boxes & Blades" at "/films/:film"')
    expect(titled).toContain('"Boxes & Blades" is a page:\n')
    expect(SiteEdits.partNamed(titled, "Boxes & Blades").address).toBe("/films/:film")
  })

  describe("a site of its routing alone (P17)", () => {
    const ROUTING = [
      "galaxy guide is a site:",
      '\tgroup "Home"',
      '\tit has a "Home" at "/"',
      '\tit has a "notices sidebar"',
      '\tgroup "My Stuff"',
      '\tit has a "My Inbox" at "/inbox"',
      '\tit has a "My Team" at "/team"',
      '\t\tit has a "Roster" at "/team/roster"',
      ""
    ].join("\n")

    test("its file is named for it", () => {
      expect(SiteEdits.isRoutingOnly("/Galaxy.site.spell")).toBe(true)
      expect(SiteEdits.isRoutingOnly("/Galaxia.site.es.spell")).toBe(true)
      expect(SiteEdits.isRoutingOnly("/Galaxy.spell")).toBe(false)
    })

    test("a group holds the lines after it, and is known apart from a page of its name", () => {
      const parts = SiteEdits.partsIn(ROUTING)!
      expect(parts.map((part) => [part.kind, part.name, part.title])).toEqual([
        ["group", SiteEdits.groupKey("Home"), "Home"],
        ["group", SiteEdits.groupKey("My Stuff"), "My Stuff"]
      ])
      expect(parts[0]!.parts.map((part) => [part.kind, part.name])).toEqual([
        ["page", "Home"],
        ["sidebar", "notices sidebar"]
      ])
      expect(parts[1]!.parts.map((part) => part.name)).toEqual(["My Inbox", "My Team"])
      expect(SiteBoard.sectionsOf(parts).map((section) => section.cards.length)).toEqual([3, 4])
    })

    test("a page moves into another group;  a group moves with its lines", () => {
      const into = SiteEdits.withPartMoved(ROUTING, "My Inbox", { where: "into", part: SiteEdits.groupKey("Home") })
      expect(SiteEdits.partsIn(into)![0]!.parts.map((part) => part.name)).toEqual([
        "My Inbox",
        "Home",
        "notices sidebar"
      ])
      const swapped = SiteEdits.withPartMoved(ROUTING, SiteEdits.groupKey("My Stuff"), {
        where: "before",
        part: SiteEdits.groupKey("Home")
      })
      expect(SiteEdits.partsIn(swapped)!.map((part) => part.title)).toEqual(["My Stuff", "Home"])
      expect(SiteEdits.partsIn(swapped)![0]!.parts.map((part) => part.name)).toEqual(["My Inbox", "My Team"])
    })

    test("a group renamed:  only its own line", () => {
      const renamed = SiteEdits.withPartRenamed(ROUTING, SiteEdits.groupKey("Home"), "Start")
      expect(renamed).toContain('\tgroup "Start"\n')
      expect(renamed).toContain('\tit has a "Home" at "/"\n')
    })

    test("a group's colour (T112):  read in each of its forms, its cards take it, and a rename keeps it", () => {
      const colored = [
        "galaxy guide is a site:",
        '\tgroup "Home", color red',
        '\tit has a "Home" at "/"',
        '\tgroup "My Stuff" with color orange',
        '\tit has a "My Inbox" at "/inbox"',
        '\tgroup "Teams", colored purple',
        '\tit has a "Roster" at "/roster"',
        ""
      ].join("\n")
      const parts = SiteEdits.partsIn(colored)!
      expect(parts.map((part) => [part.title, part.color])).toEqual([
        ["Home", "red"],
        ["My Stuff", "orange"],
        ["Teams", "purple"]
      ])
      expect(SiteBoard.sectionsOf(parts).map((section) => section.cards.map((card) => card.color))).toEqual([
        ["red", "red"],
        ["orange", "orange"],
        ["purple", "purple"]
      ])
      const renamed = SiteEdits.withPartRenamed(colored, SiteEdits.groupKey("My Stuff"), "Mine")
      expect(renamed).toContain('\tgroup "Mine" with color orange\n')
      const moved = SiteEdits.withPartMoved(colored, SiteEdits.groupKey("Teams"), {
        where: "before",
        part: SiteEdits.groupKey("Home")
      })
      expect(SiteEdits.partsIn(moved)!.map((part) => [part.title, part.color])[0]).toEqual(["Teams", "purple"])
    })

    test("a group's icon (I20):  read after its colour or alone, and a rename keeps it", () => {
      const withIcons = [
        "galaxy guide is a site:",
        '\tgroup "Hardware", color yellow, icon "microchip"',
        '\tit has a "Boards" at "/boards"',
        '\tgroup "Software", icon "code"',
        '\tit has a "Apps" at "/apps"',
        ""
      ].join("\n")
      const parts = SiteEdits.partsIn(withIcons)!
      expect(parts.map((part) => [part.title, part.color, part.icon])).toEqual([
        ["Hardware", "yellow", "microchip"],
        ["Software", undefined, "code"]
      ])
      const renamed = SiteEdits.withPartRenamed(withIcons, SiteEdits.groupKey("Software"), "Programs")
      expect(renamed).toContain('\tgroup "Programs", icon "code"\n')
    })

    test("a page added lists only its line:  it's made when it's first opened", () => {
      const added = SiteEdits.withPageAdded(ROUTING, "Help", "/help", { listOnly: true })
      // a title, so its name is quoted
      expect(added.endsWith('\t\tit has a "Roster" at "/team/roster"\n\tit has a "Help" at "/help"\n')).toBe(true)
      expect(added).not.toContain("is a page")
      expect(SiteEdits.partNamed(added, "Help").address).toBe("/help")
    })

    test("a live link is written, read back and taken out;  only a web address", () => {
      const live = SiteEdits.withPartChanged(ROUTING, "Home", { live: "https://example.com/" })
      expect(live).toContain('\tit has a "Home" at "/", live "https://example.com/"\n')
      expect(SiteEdits.partNamed(live, "Home").live).toBe("https://example.com/")
      expect(SiteEdits.withPartChanged(live, "Home", { live: "" })).toBe(ROUTING)
      expect(() => SiteEdits.withPartChanged(ROUTING, "Home", { live: "javascript:alert(1)" })).toThrow(/https/)
    })

    test("a card's own file:  named for it, its name free, showing its name", () => {
      expect(SiteEdits.fileNameFor("Boxes & Blades", [])).toBe("boxes-blades.spell")
      expect(SiteEdits.fileNameFor("Home", ["home.spell"])).toBe("home-2.spell")
      expect(SiteEdits.fileNameFor("Películas", [], "es")).toBe("peliculas.es.spell")
      const page = SiteEdits.partNamed(ROUTING, "My Inbox")
      // a page in plain Spell (epic `language` P45)
      expect(SiteEdits.stubFor(page)).toBe('"My Inbox" is a page\n\t<header size="large">My Inbox</header>\n')
      expect(SiteEdits.stubFor(page, "es")).toBe('"My Inbox" es una página\n\t<header size="large">My Inbox</header>\n')
      const sidebar = SiteEdits.partNamed(ROUTING, "notices sidebar")
      expect(SiteEdits.stubFor(sidebar)).toBe(
        'a "notices sidebar" is a view:\n\tto draw it:\n\t\t<header size="medium">notices sidebar</header>\n'
      )
      expect(SiteEdits.stubFor(sidebar, "es")).toBe(
        'una "notices sidebar" es una vista:\n\tpara dibujarla:\n\t\t<header size="medium">notices sidebar</header>\n'
      )
    })

    test("a declaration is found in any file:  a page or a view", () => {
      const view = 'a "notices sidebar" is a view:\n\tto draw it:\n\t\t<header>Notices</header>\n'
      expect(SiteEdits.declarationOf(view, "notices sidebar")).toEqual({ start: 0, end: view.length })
      const spanish = 'una "avisos" es una vista:\n\tpara dibujarla:\n\t\t<header>Avisos</header>\n'
      expect(SiteEdits.declarationOf(spanish, "avisos")).toEqual({ start: 0, end: spanish.length })
      // a page's plain head (epic `language` P45), and a page by its bare name
      const plain = '"my inbox" is a notebook page\n\t# Inbox\n\n'
      expect(SiteEdits.declarationOf(`${plain}x`, "my inbox")).toEqual({ start: 0, end: plain.length })
      const code = "films page is a page:\n\t- to draw it:\n\t\t<text>Films</text>\n"
      expect(SiteEdits.declarationOf(code, "films page")).toEqual({ start: 0, end: code.length })
    })
  })

  test("a page taken out with its declaration;  one with pages under it, with them", () => {
    const text = CODE
    const removed = SiteEdits.withPartRemoved(text, "film page")
    expect(removed).not.toContain("film page")
    expect(removed).not.toContain('film"')
    expect(SiteEdits.partsIn(removed)!.map((part) => part.name)).toEqual(["films page", "settings dialog"])
    const all = SiteEdits.withPartRemoved(text, "films page")
    expect(SiteEdits.partsIn(all)!.map((part) => part.name)).toEqual(["settings dialog"])
    expect(all).not.toMatch(/films? page/)
  })

  test("a part moved before or after another, at its depth", () => {
    const text = CODE
    const moved = SiteEdits.withPartMoved(text, "settings dialog", { where: "before", part: "films page" })
    expect(SiteEdits.partsIn(moved)!.map((part) => part.name)).toEqual(["settings dialog", "films page"])
    const out = SiteEdits.withPartMoved(text, "film page", { where: "after", part: "settings dialog" })
    const parts = SiteEdits.partsIn(out)!
    expect(parts.map((part) => part.name)).toEqual(["films page", "settings dialog", "film page"])
    expect(parts[0]!.parts).toEqual([])
    expect(() => SiteEdits.withPartMoved(text, "films page", { where: "before", part: "film page" })).toThrow(
      /one of its own pages/
    )
  })

  test("after a page goes below its own pages too", () => {
    const text = CODE
    const moved = SiteEdits.withPartMoved(text, "settings dialog", { where: "before", part: "films page" })
    const back = SiteEdits.withPartMoved(moved, "settings dialog", { where: "after", part: "films page" })
    expect(SiteEdits.partsIn(back)!.map((part) => part.name)).toEqual(["films page", "settings dialog"])
    expect(SiteEdits.partNamed(back, "films page").parts.map((part) => part.name)).toEqual(["film page"])
    expect(SiteEdits.partNamed(back, "film page").span.end).toBeLessThanOrEqual(
      SiteEdits.partNamed(back, "settings dialog").line.start
    )
  })

  test("a page moved into another, as its first page, keeping its address, and back out", () => {
    const text = CODE
    const added = SiteEdits.withPageAdded(text, "about page", "/about")
    const inside = SiteEdits.withPartMoved(added, "about page", { where: "into", part: "films page" })
    const films = SiteEdits.partNamed(inside, "films page")
    expect(films.parts.map((part) => part.name)).toEqual(["about page", "film page"])
    expect(films.parts[0]!.address).toBe("/about")
    expect(films.parts[0]!.indent).toBe("\t\t")
    const out = SiteEdits.withPartMoved(inside, "about page", { where: "after", part: "settings dialog" })
    expect(out).toBe(added)
  })

  test("a page moved into one with no pages yet, and the one it left", () => {
    const text = CODE
    const added = SiteEdits.withPageAdded(text, "about page", "/about")
    const moved = SiteEdits.withPartMoved(added, "films page", { where: "into", part: "about page" })
    const about = SiteEdits.partNamed(moved, "about page")
    expect(about.parts.map((part) => part.name)).toEqual(["films page"])
    expect(about.parts[0]!.parts.map((part) => part.name)).toEqual(["film page"])
    expect(about.parts[0]!.parts[0]!.indent).toBe("\t\t\t")
    const left = SiteEdits.withPartMoved(added, "film page", { where: "into", part: "about page" })
    expect(SiteEdits.partNamed(left, "films page").parts).toEqual([])
    expect(SiteEdits.partNamed(left, "about page").parts.map((part) => part.name)).toEqual(["film page"])
  })

  test("what can't go inside what", () => {
    const text = CODE
    const into = (name: string, part: string) => SiteEdits.withPartMoved(text, name, { where: "into", part })
    expect(() => into("films page", "films page")).toThrow(/inside itself/)
    expect(() => into("films page", "film page")).toThrow(/one of its own pages/)
    expect(() => into("film page", "settings dialog")).toThrow(/only a page with an address/)
  })

  test("a file ending without a line break", () => {
    const text = CODE.trimEnd()
    const moved = SiteEdits.withPartMoved(text, "settings dialog", { where: "before", part: "films page" })
    expect(SiteEdits.partsIn(moved)!.map((part) => part.name)).toEqual(["settings dialog", "films page"])
    const after = SiteEdits.withPartMoved(moved, "settings dialog", { where: "after", part: "films page" })
    expect(SiteEdits.partsIn(after)!.map((part) => part.name)).toEqual(["films page", "settings dialog"])
  })
})
