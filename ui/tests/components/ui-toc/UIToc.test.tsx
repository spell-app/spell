import { afterEach, describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { PrefStore } from "spell/util/persist/PrefStore"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import { TocIndex } from "spell/ui/components/ui-toc/TocIndex"
import { TOC_PREFS, type TocEntry } from "spell/ui/components/ui-toc/UIToc.types"

import "spell/ui/components/ui-toc"
import "spell/ui/components/ui-section"
import "spell/ui/components/ui-tab"

////////////////
// ## Fixtures
////////////////

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-toc/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A page-like fixture:  a toc following `#content`, which holds two sections of examples. */
const PAGE = `
  <div>
    <ui-toc for="content" heading="Button"></ui-toc>
    <section id="content">
      <ui-header level="2">Types</ui-header>
      <ui-example heading="Button"><ui-button>A</ui-button></ui-example>
      <ui-example heading="Labeled Icon"><ui-button>B</ui-button></ui-example>
      <ui-example><ui-button>no header:  not listed</ui-button></ui-example>
      <ui-header level="2" id="states-section">States</ui-header>
      <ui-example heading="Disabled">
        <ui-header level="2">A demo heading:  not listed</ui-header>
      </ui-example>
      <ui-header level="3">Loading</ui-header>
    </section>
  </div>`

/**
 * A page of nested `<ui-section>`s, as the site's converter writes them:  a section per example, a rich title,
 * a section inside an example's demo (not listed).
 */
const SECTIONS = `
  <div>
    <ui-toc for="nested"></ui-toc>
    <article id="nested">
      <ui-section id="examples-types" label="Types">
        <ui-section id="examples-types-button" label="Button">
          <ui-example><ui-button>A</ui-button></ui-example>
        </ui-section>
        <ui-section id="examples-types-group">
          <span slot="label">Group <code>ui-buttons</code></span>
          <ui-section id="examples-types-group-or" label="Or"><p>Or</p></ui-section>
        </ui-section>
      </ui-section>
      <ui-section id="examples-states" label="States">
        <ui-example heading="Disabled"><ui-section label="Demo">not listed</ui-section></ui-example>
      </ui-section>
    </article>
  </div>`

////////////////
// ## Helpers
////////////////

/** Render `html`;  returns its toc host. */
async function render(html: string) {
  document.scrollingElement!.scrollTo(0, 0)
  const wrapper = await ElementFixture.render<HTMLElement>(html)
  const toc = wrapper.querySelector<DOMElement>("ui-toc")!
  await rendered(toc)
  return { wrapper, toc }
}

/** Wait for `toc`'s first scan (a microtask after connect) and its redraw. */
async function rendered(toc: Element) {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await ElementFixture.settle(toc)
}

/** `entries` as a tree of ids:  `[id, text, [...]]` for an entry with entries under it, else its id. */
function shapeOf(entries: readonly TocEntry[]): unknown[] {
  return entries.map((entry) => (entry.entries.length ? [entry.id, entry.text, shapeOf(entry.entries)] : entry.id))
}

/** The link texts of `toc`, by part (`section` / `entry`), in order. */
function links(toc: Element, part: "section" | "entry") {
  return [...toc.shadowRoot!.querySelectorAll(`[part~=${part}]`)].map((item) => item.textContent!.trim())
}

////////////////
// ## Scanning
////////////////

describe("<ui-toc> scan", () => {
  it("lists level 2 headings as sections and the current one's examples / level 3 headings as entries", async () => {
    const { toc } = await render(PAGE)
    expect(links(toc, "section")).toEqual(["Types", "States"])
    // the first section is in view at the top:  only its entries show
    await vi.waitFor(() => expect(links(toc, "entry")).toEqual(["Button", "Labeled Icon"]))
    expect(toc.shadowRoot!.querySelector("[part~=header]")!.textContent).toBe("Button")
    expect(toc.matches(":state(empty)")).toBe(false)
  })

  it("gives unnamed headings and examples ids (a slug, unique), and keeps existing ones", async () => {
    const { wrapper, toc } = await render(PAGE)
    const ids = [...wrapper.querySelectorAll("#content > [id]")].map((element) => element.id)
    expect(ids).toEqual(["types", "button", "labeled-icon", "states-section", "disabled", "loading"])
    const hrefs = [...toc.shadowRoot!.querySelectorAll("[part~=section]")].map((item) => item.getAttribute("link"))
    expect(hrefs).toEqual(["#types", "#states-section"])
  })

  it("`expanded` shows every section's entries", async () => {
    const { toc } = await render(PAGE.replace("<ui-toc ", "<ui-toc expanded "))
    expect(links(toc, "entry")).toEqual(["Button", "Labeled Icon", "Disabled", "Loading"])
  })

  it("is `:state(empty)` with nothing to list, and fires `ui-drawn` with the ids", async () => {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div><ui-toc for="nothing"></ui-toc><p id="nothing">Text only.</p></div>`
    )
    const toc = wrapper.querySelector("ui-toc")!
    await rendered(toc)
    expect(toc.matches(":state(empty)")).toBe(true)
    expect(links(toc, "section")).toEqual([])
  })

  it("leaves a heading's sub header out of its link text", async () => {
    const { toc } = await render(
      `<div><ui-toc for="subbed"></ui-toc><section id="subbed">` +
        `<ui-header level="2">Tokens <ui-header>Light and dark</ui-header></ui-header></section></div>`
    )
    expect(links(toc, "section")).toEqual(["Tokens"])
  })

  it("lists `<ui-section>`s as a tree:  nested sections and examples under theirs, a slotted title's text", async () => {
    const { wrapper, toc } = await render(SECTIONS)
    expect(shapeOf(TocIndex.scan(wrapper.querySelector("#nested")!))).toEqual([
      [
        "examples-types",
        "Types",
        ["examples-types-button", ["examples-types-group", "Group ui-buttons", ["examples-types-group-or"]]]
      ],
      ["examples-states", "States", ["disabled"]]
    ])
    expect(links(toc, "section")).toEqual(["Types", "States"])
    // the first section is in view:  its entries show, not the ones nested deeper
    await vi.waitFor(() => expect(links(toc, "entry")).toEqual(["Button", "Group ui-buttons"]))
  })

  it("`expanded` opens nested sections' entries too", async () => {
    const { toc } = await render(SECTIONS.replace("<ui-toc ", "<ui-toc expanded "))
    expect(links(toc, "entry")).toEqual(["Button", "Group ui-buttons", "Or", "Disabled"])
  })

  it("lists a `<ui-docs-api>`'s marked rows once it says it has drawn (`ui-drawn`)", async () => {
    // the docs widget's barrel names itself a shadow host;  a stub here
    TocIndex.addShadowHost("ui-docs-api")
    onTestFinished(() => TocIndex.reset())
    const page = `
      <div>
        <ui-toc for="api" expanded></ui-toc>
        <article id="api"><ui-section id="api-states" label="States"><ui-docs-api></ui-docs-api></ui-section></article>
      </div>`
    const { wrapper, toc } = await render(page)
    expect(links(toc, "entry")).toEqual([])
    const api = wrapper.querySelector("ui-docs-api")!
    api.attachShadow({ mode: "open" }).innerHTML = `<p id="api-states-open" data-toc="open"></p>`
    api.dispatchEvent(new CustomEvent("ui-drawn", { bubbles: true, composed: true }))
    await vi.waitFor(() => expect(links(toc, "entry")).toEqual(["open"]))
    const entry = toc.shadowRoot!.querySelector("[part~=entry]")!
    expect(entry.getAttribute("link")).toBe("#api-states-open")
  })
})

////////////////
// ## Following the page
////////////////

describe("<ui-toc> following", () => {
  it("marks the entry in view and opens its section as the page scrolls;  fires `ui-scrolled-to`", async () => {
    const tall = PAGE.replaceAll("<ui-example", '<ui-example style="display: block; min-height: 120vh"')
    const { toc } = await render(tall)
    const changes: string[] = []
    toc.addEventListener("ui-scrolled-to", (event) =>
      changes.push((event as CustomEvent<{ value: string }>).detail.value)
    )
    const scroller = document.scrollingElement!
    const before = scroller.scrollTop
    onTestFinished(() => scroller.scrollTo(0, before))
    document.getElementById("disabled")!.scrollIntoView({ block: "start" })
    await vi.waitFor(() => expect(changes.at(-1)).toBe("disabled"))
    await rendered(toc)
    expect(links(toc, "entry")).toEqual(["Disabled", "Loading"])
    const current = toc.shadowRoot!.querySelector("[part~=entry]:state(selected)")
    expect(current?.textContent?.trim()).toBe("Disabled")
    expect(toc.shadowRoot!.querySelector("[part~=section]:state(selected)")?.textContent?.trim()).toBe("States")
  })

  it("`scroller`:  follows a box that scrolls on its own, its reading line from that box's top", async () => {
    const tall = PAGE.replaceAll("<ui-example", '<ui-example style="display: block; min-height: 400px"')
      .replace('<ui-toc for="content"', '<ui-toc for="content" scroller="pane"')
      .replace('<section id="content">', '<div id="pane" style="height: 300px; overflow: auto"><section id="content">')
      .replace("</section>\n  </div>", "</section></div>\n  </div>")
    const { toc } = await render(tall)
    const changes: string[] = []
    toc.addEventListener("ui-scrolled-to", (event) =>
      changes.push((event as CustomEvent<{ value: string }>).detail.value)
    )
    const pane = document.getElementById("pane")!
    const window = document.scrollingElement!.scrollTop
    pane.scrollTop = document.getElementById("disabled")!.offsetTop - pane.offsetTop
    await vi.waitFor(() => expect(changes.at(-1)).toBe("disabled"))
    // the pane scrolled, never the window
    expect(document.scrollingElement!.scrollTop).toBe(window)
    pane.scrollTop = 0
    await vi.waitFor(() => expect(changes.at(-1)).toBe("button"))
  })

  it("a page's own buttons in the header's row, after the toggle (`tools`)", async () => {
    const { toc } = await render(
      PAGE.replace('heading="Button">', 'heading="Button"><ui-button slot="tools" icon="close">Hide</ui-button>')
    )
    const slot = toc.shadowRoot!.querySelector<HTMLSlotElement>("[part~=head] slot[name=tools]")!
    expect(slot.assignedElements().map((element) => element.textContent)).toEqual(["Hide"])
    expect(slot.previousElementSibling?.matches("[part~=toggle-all]")).toBe(true)
  })

  it("follows a `<ui-tabs>`:  lists the shown pane, rescans when another shows", async () => {
    const { wrapper, toc } = await render(`
      <div>
        <ui-toc for="tabs"></ui-toc>
        <ui-tabs id="tabs">
          <ui-tab value="examples" label="Examples">
            <ui-header level="2">Types</ui-header>
            <ui-example heading="Button"><ui-button>A</ui-button></ui-example>
          </ui-tab>
          <ui-tab value="usage" label="Usage">
            <ui-header level="2">Keyboard</ui-header>
            <ui-header level="2">Examples</ui-header>
          </ui-tab>
        </ui-tabs>
      </div>`)
    expect(links(toc, "section")).toEqual(["Types"])
    const tabs = wrapper.querySelector<HTMLElement & { value: string }>("ui-tabs")!
    tabs.value = "usage"
    await vi.waitFor(() => expect(links(toc, "section")).toEqual(["Keyboard", "Examples"]))
    // a heading never takes a pane's value as its id:  the URL hash names panes
    expect(wrapper.querySelectorAll("#examples").length).toBe(0)
    expect(wrapper.querySelector("ui-tab[value=usage] > ui-header:last-child")!.id).toBe("examples-2")
  })

  it("a hash naming an element in a hidden pane shows that pane", async () => {
    const { wrapper, toc } = await render(`
      <div>
        <ui-toc for="tabs"></ui-toc>
        <ui-tabs id="tabs">
          <ui-tab value="one" label="One"><ui-header level="2">First</ui-header></ui-tab>
          <ui-tab value="two" label="Two"><ui-header level="2" id="far-away">Second</ui-header></ui-tab>
        </ui-tabs>
      </div>`)
    const before = location.hash
    onTestFinished(() => history.replaceState(history.state, "", before || location.pathname + location.search))
    location.hash = "far-away"
    await vi.waitFor(() => expect(links(toc, "section")).toEqual(["Second"]))
    expect(wrapper.querySelector<HTMLElement & { value: string }>("ui-tabs")!.value).toBe("two")
  })
})

////////////////
// ## Folds
////////////////

describe("<ui-toc> folds", () => {
  afterEach(() => new PrefStore(TOC_PREFS.store).forgetAll())

  /** `toc`'s fold button for the section titled `text`. */
  function foldOf(toc: Element, text: string): HTMLButtonElement {
    const rows = [...toc.shadowRoot!.querySelectorAll("[part~=section-row]")]
    const row = rows.find((each) => each.querySelector("[part~=section]")!.textContent!.trim() === text)!
    return row.querySelector<HTMLButtonElement>("[part~=fold]")!
  }

  /** `toc`'s expand all / collapse all button. */
  function toggleOf(toc: Element): HTMLButtonElement {
    return toc.shadowRoot!.querySelector<HTMLButtonElement>("[part~=toggle-all]")!
  }

  /** Click `button`, and wait for `toc` to redraw. */
  async function click(toc: Element, button: HTMLElement) {
    button.click()
    await ElementFixture.settle(toc)
  }

  /** What the page's folds are kept as. */
  function keptFolds() {
    return PrefStore.getAt(`${TOC_PREFS.store}:${TOC_PREFS.folds}${location.pathname}`)
  }

  it("a section's chevron folds and opens its entries;  the heading stays a link", async () => {
    const { toc } = await render(PAGE)
    await vi.waitFor(() => expect(links(toc, "entry")).toEqual(["Button", "Labeled Icon"]))
    const fold = foldOf(toc, "Types")
    expect(fold.getAttribute("aria-expanded")).toBe("true")
    expect(fold.title).toBe("Fold Types")
    await click(toc, fold)
    expect(links(toc, "entry")).toEqual([])
    expect(fold.getAttribute("aria-expanded")).toBe("false")
    expect(fold.title).toBe("Open Types")
    expect(toc.shadowRoot!.querySelector("[part~=section]")!.getAttribute("link")).toBe("#types")
    await click(toc, foldOf(toc, "States"))
    expect(links(toc, "entry")).toEqual(["Disabled", "Loading"])
  })

  it("keeps the reader's folds for the page:  a new toc starts with them", async () => {
    const first = await render(PAGE)
    await click(first.toc, foldOf(first.toc, "Types"))
    await click(first.toc, foldOf(first.toc, "States"))
    expect(keptFolds()).toEqual({ types: false, "states-section": true })
    const { toc } = await render(PAGE)
    expect(links(toc, "entry")).toEqual(["Disabled", "Loading"])
  })

  it("ONE toggle in the header:  expand all, then collapse all;  kept for every page, the page's folds forgotten", async () => {
    const { toc } = await render(PAGE)
    await click(toc, foldOf(toc, "Types"))
    const toggle = toggleOf(toc)
    expect(toggle.getAttribute("aria-label")).toBe("Expand all")
    await click(toc, toggle)
    expect(links(toc, "entry")).toEqual(["Button", "Labeled Icon", "Disabled", "Loading"])
    expect(toggle.getAttribute("aria-label")).toBe("Collapse all")
    expect(PrefStore.getAt(`${TOC_PREFS.store}:${TOC_PREFS.all}`)).toBe("expanded")
    expect(keptFolds()).toBeUndefined()
    await click(toc, toggle)
    expect(links(toc, "entry")).toEqual([])
    expect(toggle.getAttribute("aria-label")).toBe("Expand all")
    // another page:  folded too, the section in view included
    const next = await render(SECTIONS)
    expect(links(next.toc, "entry")).toEqual([])
  })

  it("a section folded or opened by hand wins over the toggle", async () => {
    const { toc } = await render(PAGE)
    await click(toc, toggleOf(toc))
    await click(toc, foldOf(toc, "States"))
    expect(links(toc, "entry")).toEqual(["Button", "Labeled Icon"])
    expect(toggleOf(toc).getAttribute("aria-label")).toBe("Expand all")
  })

  it("expand all opens nested sections' entries too", async () => {
    const { toc } = await render(SECTIONS)
    await click(toc, toggleOf(toc))
    expect(links(toc, "entry")).toEqual(["Button", "Group ui-buttons", "Or", "Disabled"])
  })

  it("shows no toggle and no chevron when nothing folds", async () => {
    const { toc } = await render(
      `<div><ui-toc for="flat" heading="Flat"></ui-toc><section id="flat">` +
        `<ui-header level="2">One</ui-header><ui-header level="2">Two</ui-header></section></div>`
    )
    expect(links(toc, "section")).toEqual(["One", "Two"])
    expect(toc.shadowRoot!.querySelector("[part~=toggle-all], [part~=fold]")).toBeNull()
    expect(toc.shadowRoot!.querySelector("[part~=header]")!.textContent).toBe("Flat")
  })
})

////////////////
// ## Examples
////////////////

describe("<ui-toc> examples", () => {
  it.each(Object.entries(EXAMPLES))("%s:  renders and is accessible", async (_path, html) => {
    const wrapper = await ElementFixture.render<HTMLElement>(`<div>${html}</div>`)
    const toc = wrapper.querySelector<DOMElement>("ui-toc")!
    await rendered(toc)
    expect(links(toc, "section")).toEqual(["Types", "States"])
    await expectAccessible(toc)
  })
})
