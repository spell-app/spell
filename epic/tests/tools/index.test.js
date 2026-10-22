import { parseHTML } from "linkedom"
import { describe, expect, it } from "vite-plus/test"

import { END, LISTS, START, areaCards, listSection, planOf, replaceBetween, skeleton } from "spell-epic/tools/index.js"

/** A described epic page (`describe()`'s shape) with `phases`, each a status. */
function epic(name, statuses, updated = new Date().toISOString().slice(0, 10)) {
  return {
    path: `epics/${name}/${name}.plan.html`,
    title: name,
    description: "",
    phases: statuses.map((status, i) => ({ status, label: `P${i + 1} · Phase` })),
    updated,
    future: false,
    urgent: []
  }
}

/** A described page at `path`, naming saga `saga`. */
function page(path, saga = null) {
  return { path, title: path, description: "", saga, phases: [], updated: null, future: false, urgent: [] }
}

/** Two sagas, in order. */
const SAGAS = [
  { id: "drawable-spell", title: "Drawable Spell", purpose: "Drawn." },
  { id: "epics", title: "Epic Tooling", purpose: "Epics & co." }
]

describe("the home page's cards", () => {
  it("come in the top bar's order (epic-workflow J40), counted from the pages", () => {
    const cards = areaCards(
      [
        epic("a", ["done", "done"]),
        epic("b", ["done", "active"]),
        epic("c", []),
        page("guides/x.html"),
        page("guides/y/y.html"),
        page("templates/durable.html"),
        page("brand/pony.html"),
        page("brand/compare.html"),
        page("brand/spell-design-system/Logo.spell.html"),
        page("brand/spell-design-system/Logo.dc.html"),
        page("brand/components/ui-brand-logo.html")
      ],
      new Set(),
      SAGAS
    )
    expect(cards.map((card) => card.title)).toEqual([
      "Guides",
      "Sagas",
      "Epics",
      "Epic/UI",
      "Spell/UI",
      "App",
      "App/UI",
      "Brand",
      "Templates"
    ])
    const sets = cards.filter((card) => card.id === "epic-ui" || card.id === "app-ui")
    expect(sets.map((card) => card.href)).toEqual(["../components/epics/index.html", "../components/app/index.html"])
    expect(sets[0].meta).toBe("served at /components/epics/, by the page server")
    const count = Object.fromEntries(cards.map((card) => [card.id, card.count]))
    // by the Epics page's groups (epic `airplane` P8):  `c` has no phases yet, so it's planning
    expect(count.epics).toBe("1 active · 1 planning · 1 done")
    const starred = areaCards([epic("a", ["done", "done"]), epic("b", ["done", "active"])], new Set(["a"]))
    expect(starred.find((card) => card.id === "epics").count).toBe("1 favorites · 1 active")
    expect(count.guides).toBe("2 guides")
    expect(count.brand).toBe("1 copy · 1 element · 1 page")
    expect(count.templates).toBe("1 template")
    expect(count.sagas).toBe("2 sagas")
    expect(cards.find((card) => card.id === "sagas").href).toBe("../sagas/index.html")
    // the App is only on the page server:  no link from disk
    expect(cards.find((card) => card.id === "app").href).toBeUndefined()
  })
})

describe("the list pages", () => {
  const epics = LISTS.find((list) => list.id === "epics")
  const guides = LISTS.find((list) => list.id === "guides")

  // epic `airplane` P8 (Owen, 2026-10-10):  favorites, active, planning, urgent, done;  alphabetical in each.
  // Since epic `epic-engine` P3 the elements draw them (`<epic-list>`, `<epic-card>`):  the page holds their facts.
  it("list epics as ONE <epic-list> of <epic-card>s, by group then title:  Favorites, Active, Planning, Urgent, Done", () => {
    const loud = { ...epic("e", ["done"]), urgent: ["q1"] }
    const pages = [
      epic("a", ["done"]),
      epic("z", ["active", "todo"]),
      epic("b", ["active", "todo"]),
      epic("c", []),
      { ...epic("f", []), future: true },
      epic("p", ["todo"], "2026-01-01"),
      { ...epic("s", ["done"]), worked: new Date(2026, 9, 9, 14, 34) },
      loud
    ]
    const html = listSection(epics, pages, new Set(["z", "s"]), [])
    const order = Array.from(html.matchAll(/<epic-card id="epic-\w+" epic="(\w+)"/g), (m) => m[1])
    // a starred epic first, wherever its state puts it;  paused `p` is Active
    expect(order).toEqual(["s", "z", "b", "p", "c", "f", "e", "a"])
    expect(html).toMatch(/<epic-list class="spell-epics">\n<!-- running-epics -->\n<epic-card/)
    expect(html).toMatch(/<!-- running-epics:end -->\n<\/epic-list>\n<\/ui-section>$/)
    expect(html).toContain(`<a href="b/b.plan.html">b</a>`)
    // the facts the card draws its state from, and the page server marks it again by
    expect(html).toContain(`<epic-card id="epic-p" epic="p" data-status="open" phases="todo" updated="2026-01-01">`)
    expect(html).toMatch(
      /<epic-card id="epic-e" epic="e" data-status="open" phases="done" updated="[\d-]+" urgent="q1">/
    )
    expect(html).toMatch(
      /<epic-card id="epic-s" epic="s" data-status="done" [^>]*worked="2026-10-09T14:34[+-]\d\d:\d\d" favorite>/
    )
    expect(html).toMatch(/<epic-card id="epic-a" epic="a" data-status="done" phases="done" updated="[\d-]+">/)
    expect(html).not.toMatch(/sleeping|😴/)
  })

  // epic `epic-workflow` P15
  it("name each epic's saga on its card;  the list names the sagas, in order, for its chips", () => {
    const pages = [
      { ...epic("a", ["active"]), saga: "epics" },
      { ...epic("b", ["active"]), saga: "gone" },
      epic("c", [])
    ]
    const html = listSection(epics, pages, new Set(), SAGAS)
    expect(html).toContain(`<epic-list class="spell-epics" sagas="drawable-spell epics">`)
    expect(html).toContain(` saga="epics" saga-title="Epic Tooling" saga-purpose="Epics &amp; co.">`)
    // a saga not in the list:  none on the card (the list counts it as No saga)
    expect(html).toMatch(
      /<epic-card id="epic-b" epic="b" data-status="open" phases="active" updated="[\d-]+" active="P1 · Phase">/
    )
  })

  it("list guides by saga, in the sagas' order, each headed by its saga page's link;  the rest in Misc, last", () => {
    const html = listSection(
      guides,
      [page("guides/a.html", "epics"), page("guides/b/b.html"), page("guides/c.html", "gone")],
      undefined,
      SAGAS
    )
    expect(Array.from(html.matchAll(/<ui-section id="([\w-]+)"/g), (m) => m[1])).toEqual([
      "saga-drawable-spell",
      "saga-epics",
      "misc"
    ])
    expect(html).toContain(`<span slot="label"><a href="../sagas/epics/epics.saga.html">Epic Tooling</a></span>`)
    expect(html).toMatch(/id="saga-drawable-spell"[\s\S]*No guides name this saga yet[\s\S]*id="saga-epics"/)
    expect(html).toMatch(
      /id="saga-epics"[\s\S]*href="a.html"[\s\S]*id="misc"[\s\S]*href="b\/b.html"[\s\S]*href="c.html"/
    )
  })

  it("list the sagas in order:  each linking its saga page, its purpose, its epics and guides counted", () => {
    const sagas = LISTS.find((list) => list.id === "sagas")
    const pages = [{ ...epic("a", []), saga: "epics" }, page("guides/a.html", "epics"), page("guides/b.html", "epics")]
    const html = listSection(sagas, pages, undefined, SAGAS)
    expect(Array.from(html.matchAll(/<ui-card id="([\w-]+)"/g), (m) => m[1])).toEqual(["drawable-spell", "epics"])
    expect(html).toContain(`<a href="epics/epics.saga.html">Epic Tooling</a>`)
    expect(html).toContain(`<ui-meta>1 epic · 2 guides · sagas/epics/epics.saga.html</ui-meta>`)
    expect(listSection(sagas, [], undefined, [])).toContain("No sagas yet")
  })

  it("leave the Brand index's own pages to it, in a section of their own (claude-design P11)", () => {
    const brand = LISTS.find((list) => list.id === "brand")
    const paths = ["brand/pony.html", "brand/compare.html", "brand/spell-design-system/Logo.spell.html"]
    expect(paths.filter((path) => brand.has(path))).toEqual(["brand/pony.html"])
    const html = listSection(brand, [page("brand/pony.html")])
    expect(html).toMatch(/^<ui-section id="pulled" label="6\. From Claude Design"/)
    expect(html).toContain(`<a href="pony.html">brand/pony.html</a>`)
  })

  it("say so when an area has no pages", () => {
    expect(listSection(guides, [], undefined, SAGAS)).toContain(`<p class="meta">No guides yet.</p>`)
  })

  it("start from a skeleton:  site header, breadcrumb home, sticky title, the markers", () => {
    const html = skeleton(guides)
    expect(html).toContain(`<spell-site-header root=".."></spell-site-header>`)
    expect(html).toContain(
      `<ui-breadcrumb-section href="../pages/index.html" target="_self">Docs</ui-breadcrumb-section>`
    )
    expect(html).toContain(`<h1>Guides</h1>`)
    expect(html.indexOf(START)).toBeLessThan(html.indexOf(END))
    expect(skeleton(LISTS.find((list) => list.id === "templates"))).toContain(`id="writing-docs"`)
  })

  it("carry the page notes Owen left in the list over when it's written again (epic airplane P3)", () => {
    const templates = LISTS.find((list) => list.id === "templates")
    const written = `${START}\n${listSection(templates, [page("templates/a.html")])}\n${END}`.replace(
      "</ui-section>",
      `<spell-notes for="templates"><spell-note id="n1" status="new" at="2026-10-10 14:02"><p>Group these?</p></spell-note></spell-notes>\n</ui-section>`
    )
    const again = replaceBetween(
      written,
      START,
      END,
      listSection(templates, [page("templates/a.html"), page("templates/b.html")])
    )
    expect(again).toContain(`<a href="b.html">`)
    expect(again).toMatch(
      /<a href="b.html">[\s\S]*<spell-note id="n1"[\s\S]*<\/spell-notes>\n<\/ui-section>\n<!-- index:end -->$/
    )
    expect(replaceBetween("no markers", START, END, "")).toBeUndefined()
  })
})

describe("planOf():  an epic page's card data (epic-components P8)", () => {
  const expected = {
    phases: [
      { status: "done", label: "P1 · First Go" },
      { status: "active", label: "P2 · Second" }
    ],
    updated: "2026-10-06",
    future: false,
    standing: false,
    saga: null,
    urgent: ["q1", "i1"]
  }

  it("reads the <epic-*> markup:  phases, the page's updated and future, the items that need Owen", () => {
    const { document } = parseHTML(`<html><body><epic-page epic="x" title="X" updated="2026-10-06">
<epic-section id="phases" kind="phases"><epic-phase id="p1" title="First Go" status="done"></epic-phase>
<epic-phase id="p2" status="active"><span slot="title">Second</span></epic-phase></epic-section>
<epic-section id="decisions" kind="questions"><epic-item id="q1" title="a" status="open" state="attention"></epic-item>
<epic-item id="q2" title="b" status="decided" state="recent"></epic-item></epic-section>
<epic-section id="caveats" kind="caveats"><epic-item id="c1" title="c" status="open" state="open"></epic-item></epic-section>
<epic-section id="issues" kind="issues"><epic-item id="i1" title="d" status="open" state="replied"></epic-item>
<epic-item id="i2" title="e" status="open" state="open"></epic-item></epic-section>
</epic-page></body></html>`)
    expect(planOf(document)).toEqual(expected)
  })

  it("reads a doc in the old markup as an empty plan (read no more since P15)", () => {
    const { document } = parseHTML(`<html><body><time id="plan-updated">2026-10-06</time>
<ui-section id="phases"><ui-section data-phase="1" data-status="done" label="P1 · First Go"></ui-section></ui-section>
<ui-list class="plan-items"><ui-item id="q1" data-status="open"></ui-item></ui-list></body></html>`)
    expect(planOf(document)).toEqual({ phases: [], updated: null, future: false, saga: null, urgent: [] })
  })
})
