import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { UI } from "spell/ui/runtime"
import type { SearchResult } from "spell/ui/components/components.types"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-search"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-search/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A search's DOM element, with its rich properties. */
type Search = DOMElement & { value: unknown; source: SearchResult[] | undefined; open: unknown }

/** Fruit, one with a price, one a link. */
const FRUIT: SearchResult[] = [
  { title: "Apple", description: "Crisp and sweet" },
  { title: "Apricot", description: "Soft", price: "$2.00" },
  { title: "Banana", description: "Yellow" },
  { title: "Grape", url: "#grape" },
  { title: "Pineapple", description: "Tropical" }
]

/** Food in categories. */
const FOOD: SearchResult[] = [
  { title: "Apple", category: "Fruit" },
  { title: "Asparagus", category: "Vegetables" },
  { title: "Avocado", category: "Fruit" },
  { title: "Almond" }
]

/** Render a search, set its `source`, and return its pieces. */
async function search(html: string, source?: SearchResult[]) {
  const host = await ElementFixture.render<Search>(html)
  if (source) host.source = source
  await ElementFixture.tick()
  const root = host.shadowRoot!.firstElementChild as HTMLElement
  return {
    host,
    root,
    input: root.querySelector<HTMLInputElement>("input.prompt")!,
    results: root.querySelector<HTMLElement>(".results[popover]")!,
    status: root.querySelector<HTMLElement>("[role=status]")!,
    titles: () => [...root.querySelectorAll(".result .title")].map((title) => title.textContent),
    highlighted: () => root.querySelector(".result.active .title")?.textContent ?? undefined
  }
}

/** Collect `detail`s of `name` events. */
function record(host: Element, name: string) {
  const details: unknown[] = []
  host.addEventListener(name, (event) => details.push((event as CustomEvent).detail))
  return details
}

/** Let `root`'s running transitions (the results fading in) finish, so axe reads final colours. */
async function transitionsDone(root: Element) {
  const shadows = [...root.querySelectorAll("*")].flatMap((element) => (element.shadowRoot ? [element.shadowRoot] : []))
  const animations = shadows.flatMap((shadow) => shadow.getAnimations())
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
}

/** A `fetch` stub answering JSON per URL;  records every call. */
function stubFetch(answer: (url: string) => unknown, status = 200) {
  const calls: { url: string; signal?: AbortSignal | null }[] = []
  const fetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = input.toString()
    calls.push({ url, signal: init?.signal })
    return new Response(JSON.stringify(answer(url)), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  })
  vi.stubGlobal("fetch", fetch)
  return calls
}

beforeEach(async () => {
  await UI.load()
  UI.overlays.useCloseWatcher = false
})

afterEach(() => {
  UI.overlays.dispose()
  vi.unstubAllGlobals()
})

////////////////
// ## Rendering
////////////////

describe("<ui-search> rendering open from the start", () => {
  it.each([
    ["", FRUIT],
    ["category", FOOD]
  ])("%s results render without a STRICT_READ_UNTRACKED warning", async (attributes, source) => {
    const logs: string[] = []
    const spies = (["warn", "error", "info", "log"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")))
    )
    try {
      const { titles } = await search(`<ui-search open value="a" ${attributes}></ui-search>`, source)
      await ElementFixture.tick()
      expect(titles().length).toBeGreaterThan(0)
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }
    expect(logs.filter((line) => line.includes("STRICT_READ_UNTRACKED"))).toEqual([])
  })
})

describe("<ui-search> markup", () => {
  it("renders the contract:  classes, the icon input, combobox ARIA, the anchor", async () => {
    const { root, input, results, status } = await search(`<ui-search placeholder="Fruit"></ui-search>`)
    expect(root.className).toBe("ui search")
    expect(input.parentElement!.className).toBe("ui left icon input left-icon")
    expect(input.getAttribute("role")).toBe("combobox")
    expect(input.getAttribute("aria-autocomplete")).toBe("list")
    expect(input.getAttribute("aria-expanded")).toBe("false")
    expect(input.getAttribute("aria-controls")).toBe(results.id)
    expect(input.getAttribute("aria-label")).toBe("Fruit")
    expect(results.getAttribute("popover")).toBe("manual")
    expect(results.hasAttribute("role")).toBe(false)
    expect(status.textContent).toBe("")
    expect(root.style.getPropertyValue("anchor-name")).toMatch(/^--ui-search-\d+$/)
    expect(results.style.getPropertyValue("position-anchor")).toBe(root.style.getPropertyValue("anchor-name"))
    await expect.poll(() => root.querySelector(".search.icon svg")).not.toBeNull()
  })

  it("emits Fomantic's class words", async () => {
    const { root, input } = await search(
      `<ui-search size="large" category fluid align="right" loading aria-label="x"></ui-search>`
    )
    expect(root.className).toBe("ui large category fluid loading right aligned search right-aligned")
    expect(input.parentElement!.className).toBe("ui left icon input left-icon loading fluid")
    expect(input.getAttribute("aria-busy")).toBe("true")
  })

  it("is named by the translated `label` when nothing else names it", async () => {
    const { input } = await search(`<ui-search></ui-search>`)
    expect(input.getAttribute("aria-label")).toBe("Search")
  })
})

////////////////
// ## Searching
////////////////

describe("<ui-search> local", () => {
  it("shows the matches of what's typed, with ui-search and a live count", async () => {
    const { host, input, results, status, titles } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    const searches = record(host, "ui-searched")
    const opens = record(host, "ui-opening")
    await userEvent.type(input, "ap")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(true)
    expect(results.getAttribute("role")).toBe("listbox")
    expect(input.getAttribute("aria-expanded")).toBe("true")
    expect(host.matches(":state(open)")).toBe(true)
    expect(titles()).toEqual(["Apple", "Apricot", "Grape", "Pineapple"])
    expect(searches.map((detail) => (detail as { query: string }).query)).toEqual(["a", "ap"])
    expect(opens).toHaveLength(1)
    expect(host.value).toBe("ap")
    expect(status.textContent).toBe("4 results available.")
    const apricot = results.querySelectorAll(".result")[1]!
    expect(apricot.querySelector(".price")!.textContent).toBe("$2.00")
    expect(apricot.querySelector(".description")!.textContent).toBe("Soft")
  })

  it("waits for `min-characters`, caps at `max-results`, and marks matches", async () => {
    const { input, results, titles } = await search(
      `<ui-search min-characters="2" max-results="2" highlight-matches aria-label="Fruit"></ui-search>`,
      FRUIT
    )
    await userEvent.type(input, "a")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(false)
    await userEvent.type(input, "p")
    await ElementFixture.tick()
    expect(titles()).toEqual(["Apple", "Apricot"])
    expect(results.querySelector(".title mark")!.textContent).toBe("Ap")
  })

  it("matches with `full-text-search` and `search-fields`", async () => {
    const fuzzy = await search(`<ui-search full-text-search="fuzzy" aria-label="x"></ui-search>`, FRUIT)
    await userEvent.type(fuzzy.input, "bnn")
    await ElementFixture.tick()
    expect(fuzzy.titles()).toEqual(["Banana"])
    const titleOnly = await search(`<ui-search search-fields="title" aria-label="y"></ui-search>`, FRUIT)
    await userEvent.type(titleOnly.input, "sweet")
    await ElementFixture.tick()
    expect(titleOnly.titles()).toEqual([])
  })

  it("groups a `category` search by each result's category, as named groups", async () => {
    const { root, input } = await search(`<ui-search category aria-label="Food"></ui-search>`, FOOD)
    await userEvent.type(input, "a")
    await ElementFixture.tick()
    const groups = [...root.querySelectorAll<HTMLElement>(".category[role=group]")]
    expect(groups.map((group) => group.querySelector(".name")!.textContent)).toEqual(["Fruit", "Vegetables"])
    const name = root.querySelector(`#${CSS.escape(groups[0]!.getAttribute("aria-labelledby")!)}`)!
    expect(name.textContent).toBe("Fruit")
    expect([...groups[0]!.querySelectorAll(".result .title")].map((title) => title.textContent)).toEqual([
      "Apple",
      "Avocado"
    ])
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}")
    await ElementFixture.tick()
    expect(groups[1]!.classList.contains("active")).toBe(true)
  })

  it("says so when nothing matches, unless `show-no-results` is off", async () => {
    const { root, input, results, status } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    await userEvent.type(input, "zz")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(true)
    expect(results.hasAttribute("role")).toBe(false)
    expect(input.getAttribute("aria-expanded")).toBe("false")
    expect(root.querySelector(".empty.message .header")!.textContent).toBe("No Results")
    expect(status.textContent).toBe("Your search returned no results")
    const quiet = await search(`<ui-search show-no-results="false" aria-label="Quiet"></ui-search>`, FRUIT)
    await userEvent.type(quiet.input, "zz")
    await ElementFixture.tick()
    expect(quiet.results.matches(":popover-open")).toBe(false)
  })
})

////////////////
// ## Keyboard and pointer
////////////////

describe("<ui-search> keyboard", () => {
  it("moves with the arrows (stopping at the ends), chooses with Enter", async () => {
    const { host, input, results, highlighted } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    const selects = record(host, "ui-choosing")
    const changes = record(host, "ui-changed")
    await userEvent.type(input, "ap")
    await ElementFixture.tick()
    expect(highlighted()).toBeUndefined()
    await userEvent.keyboard("{ArrowDown}")
    await ElementFixture.tick()
    expect(highlighted()).toBe("Apple")
    const active = input.getAttribute("aria-activedescendant")!
    expect(host.shadowRoot!.getElementById(active)!.getAttribute("aria-selected")).toBe("true")
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}")
    await ElementFixture.tick()
    expect(highlighted()).toBe("Pineapple")
    await userEvent.keyboard("{ArrowUp}")
    await ElementFixture.tick()
    expect(highlighted()).toBe("Grape")
    await userEvent.keyboard("{ArrowUp}")
    await ElementFixture.tick()
    expect(highlighted()).toBe("Apricot")
    await userEvent.keyboard("{Enter}")
    await ElementFixture.tick()
    expect(selects).toEqual([expect.objectContaining({ result: FRUIT[1] })])
    expect(changes).toEqual([expect.objectContaining({ value: "Apricot" })])
    expect(host.value).toBe("Apricot")
    expect(input.value).toBe("Apricot")
    expect(results.matches(":popover-open")).toBe(false)
    expect(host.shadowRoot!.activeElement).toBe(input)
  })

  it("Escape closes the results, then clears the text", async () => {
    const { host, input, results } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    await userEvent.type(input, "ban")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(true)
    await userEvent.keyboard("{Escape}")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(false)
    expect(input.value).toBe("ban")
    await userEvent.keyboard("{Escape}")
    await ElementFixture.tick()
    expect(input.value).toBe("")
    expect(host.value).toBe("")
    await userEvent.keyboard("{ArrowDown}")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(false)
  })

  it("ArrowDown reopens closed results;  `select-first-result` highlights the first", async () => {
    const { input, results, highlighted } = await search(
      `<ui-search select-first-result aria-label="Fruit"></ui-search>`,
      FRUIT
    )
    await userEvent.type(input, "gr")
    await ElementFixture.tick()
    expect(highlighted()).toBe("Grape")
    await userEvent.keyboard("{Escape}")
    await ElementFixture.tick()
    await userEvent.keyboard("{ArrowDown}")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(true)
  })

  it("keeps everything when ui-select is cancelled;  a cancelled link click doesn't navigate", async () => {
    const { host, input, results } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    host.addEventListener("ui-choosing", (event) => event.preventDefault())
    await userEvent.type(input, "gra")
    await ElementFixture.tick()
    const link = results.querySelector<HTMLAnchorElement>("a.result")!
    expect(link.getAttribute("href")).toBe("#grape")
    expect(link.getAttribute("tabindex")).toBe("-1")
    const click = new MouseEvent("click", { bubbles: true, cancelable: true })
    link.dispatchEvent(click)
    await ElementFixture.tick()
    expect(click.defaultPrevented).toBe(true)
    expect(host.value).toBe("gra")
    expect(results.matches(":popover-open")).toBe(true)
  })

  it("chooses with a click, and closes on an outside click", async () => {
    const { host, input, results } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    const outside = document.createElement("p")
    outside.textContent = "outside"
    host.before(outside)
    await userEvent.type(input, "ban")
    await ElementFixture.tick()
    results.querySelector<HTMLElement>(".result")!.click()
    await ElementFixture.tick()
    expect(host.value).toBe("Banana")
    await userEvent.type(input, "a")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(true)
    await userEvent.click(outside)
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(false)
  })

  it("stays hidden when ui-opening is cancelled", async () => {
    const { host, input, results } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    host.addEventListener("ui-opening", (event) => event.preventDefault())
    await userEvent.type(input, "ap")
    await ElementFixture.tick()
    expect(results.matches(":popover-open")).toBe(false)
  })

  it("reverts the text when the host re-sets the old value while typing", async () => {
    const { host, input } = await search(`<ui-search aria-label="Fruit" value="x"></ui-search>`, FRUIT)
    host.addEventListener("ui-searched", () => (host.value = "x"))
    await userEvent.type(input, "y")
    await ElementFixture.tick()
    expect(host.value).toBe("x")
    expect(input.value).toBe("x")
  })
})

////////////////
// ## Remote
////////////////

describe("<ui-search> clear button", () => {
  /** The clear button's box, if it shows. */
  const clearBox = (host: Element) => host.shadowRoot!.querySelector<HTMLElement>("[part~=clear]")

  it("shows an `x` at its end while there's text, its magnifying glass staying at its start;  a click empties it", async () => {
    const { host, input, results } = await search(`<ui-search aria-label="Fruit"></ui-search>`, FRUIT)
    const changed = record(host, "ui-changed")
    expect(clearBox(host)).toBeNull()
    await userEvent.type(input, "ban")
    await ElementFixture.settle()
    expect(results.matches(":popover-open")).toBe(true)
    expect(getComputedStyle(host.shadowRoot!.querySelector("[part~=icon]")!).visibility).toBe("visible")
    await userEvent.click(clearBox(host)!.querySelector("ui-button")!)
    await ElementFixture.settle()
    expect([host.value, input.value]).toEqual(["", ""])
    expect(changed).toEqual([expect.objectContaining({ value: "" })])
    expect(results.matches(":popover-open")).toBe(false)
    expect(host.shadowRoot!.activeElement).toBe(input)
    expect(clearBox(host)).toBeNull()
  })

  it('`clearable="false"` turns it off', async () => {
    const { host } = await search(`<ui-search clearable="false" value="ban" aria-label="Fruit"></ui-search>`)
    await ElementFixture.settle()
    expect(clearBox(host)).toBeNull()
  })
})

describe("<ui-search collapsed>", () => {
  /** A header row:  a title, and the search beside it. */
  async function header() {
    const row = await ElementFixture.render<HTMLElement>(
      `<div style="display: flex; align-items: center; gap: 8px; width: 320px">
        <b>Overlays</b><ui-search collapsed placeholder="Search Overlays"></ui-search>
      </div>`
    )
    const host = row.querySelector("ui-search") as Search
    await ElementFixture.settle()
    const root = host.shadowRoot!.firstElementChild as HTMLElement
    const opener = root.querySelector<HTMLElement>("[part~=opener]")!
    const input = root.querySelector<HTMLInputElement>("input.prompt")!
    return { row, host, root, opener, input, toggled: record(host, "ui-toggled") }
  }

  it("starts as a search button, as tall as the field would be", async () => {
    const { host, opener, input } = await header()
    expect(host.matches(":state(expanded)")).toBe(false)
    expect(getComputedStyle(input).visibility).toBe("hidden")
    await (opener as unknown as { ready: Promise<unknown> }).ready
    const button = opener.shadowRoot!.querySelector("[part~=button]")!.getBoundingClientRect()
    const box = input.parentElement!.getBoundingClientRect()
    expect(Math.abs(button.height - box.height)).toBeLessThan(1)
    expect(Math.abs(button.width - box.width)).toBeLessThan(1)
  })

  it("slides open from a click, focused;  Escape folds it back and focuses the button", async () => {
    const { host, opener, input, toggled } = await header()
    await userEvent.click(opener)
    await ElementFixture.settle()
    expect(host.matches(":state(expanded)")).toBe(true)
    expect(host.shadowRoot!.activeElement).toBe(input)
    expect(toggled).toEqual([{ expanded: true }])
    await userEvent.keyboard("{Escape}")
    await ElementFixture.settle()
    expect(host.matches(":state(expanded)")).toBe(false)
    expect(toggled).toEqual([{ expanded: true }, { expanded: false }])
    expect(host.shadowRoot!.activeElement).toBe(opener)
  })

  it("folds back when left empty, and stays open with text", async () => {
    const { host, opener, input } = await header()
    await userEvent.click(opener)
    await ElementFixture.settle()
    await userEvent.type(input, "fade")
    input.blur()
    await ElementFixture.settle()
    expect(host.matches(":state(expanded)")).toBe(true)
    input.focus()
    await userEvent.click(host.shadowRoot!.querySelector("[part~=clear] ui-button")!)
    await ElementFixture.settle()
    expect(host.matches(":state(expanded)")).toBe(true)
    input.blur()
    await ElementFixture.settle()
    expect(host.matches(":state(expanded)")).toBe(false)
  })

  it("grows to `--ui-search-expanded-width`, its magnifying glass where the button's was", async () => {
    const { host, opener, root } = await header()
    host.style.setProperty("--ui-search-expanded-width", "200px")
    host.style.setProperty("--ui-motion", "none")
    const glass = () => root.querySelector("[part~=icon] svg")!.getBoundingClientRect()
    await (opener as unknown as { ready: Promise<unknown> }).ready
    const before = opener.shadowRoot!.querySelector("[part~=icon]")!.getBoundingClientRect()
    await userEvent.click(opener)
    await ElementFixture.settle()
    await Promise.all(host.shadowRoot!.getAnimations().map((animation) => animation.finished))
    expect(root.querySelector("[part~=input]")!.getBoundingClientRect().width).toBeCloseTo(200, 0)
    const after = glass()
    expect(Math.abs(after.left + after.width / 2 - (before.left + before.width / 2))).toBeLessThan(1.5)
    expect(Math.abs(after.top + after.height / 2 - (before.top + before.height / 2))).toBeLessThan(1)
  })
})

describe("<ui-search shortcut>", () => {
  /** Press `ctrl+F` on the page;  returns the event. */
  function pressCtrlF(): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
      key: "f",
      code: "KeyF",
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    document.body.dispatchEvent(event)
    return event
  }

  it("shows its keys at its end while empty, its magnifying glass at its start;  the keys focus it", async () => {
    const { host, root, input } = await search(`<ui-search shortcut="ctrl+F" aria-label="Fruit"></ui-search>`, FRUIT)
    await ElementFixture.settle()
    expect(root.querySelector("[part~=input]")!.className).toContain("left-icon")
    expect(root.querySelector("[part~=shortcut] ui-keys")?.getAttribute("shortcut")).toBe("ctrl+F")
    expect(pressCtrlF().defaultPrevented).toBe(true)
    expect(host.shadowRoot!.activeElement).toBe(input)
    await userEvent.type(input, "ap")
    await ElementFixture.settle()
    expect(root.querySelector("[part~=shortcut]")).toBeNull()
  })

  it("opens a `collapsed` search, focused", async () => {
    const { host, input } = await search(`<ui-search collapsed shortcut="ctrl+F" aria-label="Fruit"></ui-search>`)
    await ElementFixture.settle()
    pressCtrlF()
    await ElementFixture.settle()
    expect(host.matches(":state(expanded)")).toBe(true)
    expect(host.shadowRoot!.activeElement).toBe(input)
  })
})

describe("<ui-search> remote", () => {
  it("fills the url template, shows loading, then the answer;  caches per query", async () => {
    const calls = stubFetch((url) => ({
      results: FRUIT.filter((result) =>
        result.title.toLowerCase().includes(new URL(url, location.href).searchParams.get("q")!)
      )
    }))
    const { host, root, input, titles } = await search(
      `<ui-search url="/api/fruit?q={query}" search-delay="0" aria-label="Fruit"></ui-search>`
    )
    const answers = record(host, "ui-replied")
    await userEvent.type(input, "ban")
    expect(host.matches(":state(loading)") || titles().length > 0).toBe(true)
    await expect.poll(() => titles()).toEqual(["Banana"])
    expect(root.classList.contains("loading")).toBe(false)
    expect(calls.at(-1)!.url).toBe("/api/fruit?q=ban")
    expect(answers.at(-1)).toEqual({ query: "ban", results: [FRUIT[2]] })
    const count = calls.length
    await userEvent.keyboard("{Backspace}")
    await ElementFixture.tick()
    await userEvent.type(input, "n")
    await ElementFixture.tick()
    expect(calls.length).toBe(count)
    expect(titles()).toEqual(["Banana"])
  })

  it("debounces typing and aborts a superseded query", async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const calls: { url: string; signal?: AbortSignal | null }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = input.toString()
        calls.push({ url, signal: init?.signal })
        if (calls.length === 1) await gate
        return new Response(JSON.stringify([{ title: url }]), {
          headers: { "Content-Type": "application/json" }
        })
      })
    )
    const { input, titles } = await search(
      `<ui-search url="/api?q={query}" search-delay="50" aria-label="Remote"></ui-search>`
    )
    await userEvent.type(input, "abc")
    await expect.poll(() => calls.length).toBe(1)
    expect(calls[0]!.url).toBe("/api?q=abc")
    await userEvent.type(input, "d")
    await expect.poll(() => calls.length).toBe(2)
    expect(calls[0]!.signal!.aborted).toBe(true)
    release()
    await expect.poll(() => titles()).toEqual(["/api?q=abcd"])
  })

  it("shows the server error, and category answers as groups", async () => {
    stubFetch(() => ({}), 500)
    const failing = await search(`<ui-search url="/api?q={query}" search-delay="0" aria-label="Failing"></ui-search>`)
    await userEvent.type(failing.input, "x")
    await expect
      .poll(() => failing.root.querySelector(".error.message")?.textContent)
      .toBe("There was an issue querying the server.")
    vi.unstubAllGlobals()
    stubFetch(() => ({ results: { fruit: { name: "Fruit", results: [{ title: "Kiwi" }] } } }))
    const grouped = await search(
      `<ui-search category url="/api?q={query}" search-delay="0" aria-label="Grouped"></ui-search>`
    )
    await userEvent.type(grouped.input, "k")
    await expect.poll(() => grouped.root.querySelector(".category .name")?.textContent).toBe("Fruit")
    expect(grouped.titles()).toEqual(["Kiwi"])
  })
})

////////////////
// ## Forms
////////////////

describe("<ui-search> forms", () => {
  it("submits its text, validates `required`, resets to the attribute", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(`<form>
      <ui-search name="q" value="start" aria-label="Query"></ui-search>
      <ui-search name="must" required aria-label="Must"></ui-search>
    </form>`)
    const [query, must] = form.querySelectorAll<Search>("ui-search")
    query!.source = FRUIT
    expect(new FormData(form).get("q")).toBe("start")
    expect(form.checkValidity()).toBe(false)
    expect(must!.matches(":state(invalid)")).toBe(true)
    must!.value = "ok"
    const input = query!.shadowRoot!.querySelector<HTMLInputElement>("input")!
    await userEvent.clear(input)
    await userEvent.type(input, "ban")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await ElementFixture.tick()
    expect(form.checkValidity()).toBe(true)
    expect([...new FormData(form)]).toEqual([
      ["q", "Banana"],
      ["must", "ok"]
    ])
    form.reset()
    await ElementFixture.tick()
    expect(new FormData(form).get("q")).toBe("start")
    expect(input.value).toBe("start")
  })

  it("is disabled, and out of the form, inside a disabled fieldset", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(
      `<form><fieldset disabled><ui-search name="q" value="x" aria-label="Q"></ui-search></fieldset></form>`
    )
    await ElementFixture.tick()
    const host = form.querySelector<Search>("ui-search")!
    expect(new FormData(form).has("q")).toBe(false)
    expect(host.shadowRoot!.querySelector("input")!.disabled).toBe(true)
    expect(host.matches(":state(disabled)")).toBe(true)
  })

  it("commits an edited text with ui-changed when it's left", async () => {
    const page = await ElementFixture.render(`<div><ui-search aria-label="Q"></ui-search><button>next</button></div>`)
    const host = page.querySelector<Search>("ui-search")!
    const changes = record(host, "ui-changed")
    await userEvent.type(host.shadowRoot!.querySelector("input")!, "hello")
    await userEvent.click(page.querySelector("button")!)
    await ElementFixture.tick()
    expect(changes).toEqual([expect.objectContaining({ value: "hello" })])
  })
})

////////////////
// ## Settling and the address
////////////////

describe("<ui-search> settling (`delay`)", () => {
  it("settles once typing pauses:  one `ui-changed` for the whole word", async () => {
    const { host, input } = await search(`<ui-search aria-label="Q" delay="300ms"></ui-search>`)
    const changes = record(host, "ui-changed")
    await userEvent.type(input, "gogh")
    expect(changes).toEqual([])
    await expect.poll(() => changes, { timeout: 4000 }).toEqual([expect.objectContaining({ value: "gogh" })])
  })

  it("settles at once on Enter, and only once for the same text (leaving after sends nothing)", async () => {
    const page = await ElementFixture.render(
      `<div><ui-search aria-label="Q" delay="10s"></ui-search><button>next</button></div>`
    )
    const host = page.querySelector<Search>("ui-search")!
    const changes = record(host, "ui-changed")
    await userEvent.type(host.shadowRoot!.querySelector("input")!, "armor{Enter}")
    expect(changes).toEqual([expect.objectContaining({ value: "armor" })])
    await userEvent.click(page.querySelector("button")!)
    await ElementFixture.tick()
    expect(changes).toHaveLength(1)
  })

  it("reads `delay` as a CSS time or bare ms", async () => {
    const { UISearch } = await import("spell/ui/components/ui-search/UISearch")
    expect([UISearch.msFor("0.5s"), UISearch.msFor("500ms"), UISearch.msFor("500"), UISearch.msFor("0")]).toEqual([
      500, 500, 500, 0
    ])
    expect(UISearch.msFor("soon")).toBe(2000)
  })
})

describe("<ui-search parameter>", () => {
  afterEach(() => history.replaceState(history.state, "", location.pathname))

  it("records each settled text in the address, and Back shows the one before", async () => {
    history.replaceState(history.state, "", `${location.pathname}?keep=1`)
    const { host, input } = await search(`<ui-search aria-label="Q" parameter="s" delay="0"></ui-search>`)
    const changes = record(host, "ui-changed")
    const length = history.length
    await userEvent.type(input, "cats{Enter}")
    expect(new URLSearchParams(location.search).get("s")).toBe("cats")
    expect(new URLSearchParams(location.search).get("keep")).toBe("1")
    // `delay="0"`:  each letter settles, each a history entry
    expect(history.length).toBe(length + 4)
    history.back()
    await expect.poll(() => host.value).toBe("cat")
    expect(changes.at(-1)).toEqual(expect.objectContaining({ value: "cat" }))
    // showing a value from the address records nothing
    expect(new URLSearchParams(location.search).get("s")).toBe("cat")
  })

  it("starts on the value a page was opened with", async () => {
    history.replaceState(history.state, "", `${location.pathname}?s=van+gogh`)
    const { host } = await search(`<ui-search aria-label="Q" parameter="s"></ui-search>`)
    await expect.poll(() => host.value).toBe("van gogh")
  })
})

////////////////
// ## Tokens
////////////////

describe("<ui-search> tokens from outside", () => {
  /** The prompt's top-left radius, which `--ui-search-prompt-radius` drives (through the input's own token). */
  function radius(host: Element): string {
    return getComputedStyle(host.shadowRoot!.querySelector("input.prompt")!).borderTopLeftRadius
  }

  it("takes a token set on the HOST", async () => {
    const { host } = await search(`<ui-search style="--ui-search-prompt-radius: 3px"></ui-search>`)
    expect(radius(host)).toBe("3px")
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-search-prompt-radius: 3px"><div><ui-search></ui-search></div></section>`
    )
    expect(radius(wrapper.querySelector("ui-search")!)).toBe("3px")
  })

  it("takes a token set through `::part(input)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(input) { --ui-search-prompt-radius: 3px }</style><ui-search class="themed"></ui-search></div>`
    )
    expect(radius(wrapper.querySelector("ui-search")!)).toBe("3px")
  })

  it("takes a token set through `::part(search)`, the root", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(search) { --ui-search-prompt-radius: 3px }</style><ui-search class="themed"></ui-search></div>`
    )
    expect(radius(wrapper.querySelector("ui-search")!)).toBe("3px")
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-search-prompt-radius", "3px")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-search-prompt-radius")
    })
    const { host } = await search(`<ui-search></ui-search>`)
    expect(radius(host)).toBe("3px")
  })

  it("keeps Fomantic's round prompt when nothing is set", async () => {
    const { host } = await search(`<ui-search></ui-search>`)
    expect(parseFloat(radius(host))).toBeGreaterThan(100)
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-search> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await ElementFixture.tick()
    await expectAccessible(root)
  })

  it("axe passes with results showing, standard and category", async () => {
    const page = await ElementFixture.render(
      `<div><ui-search aria-label="Fruit"></ui-search><ui-search category aria-label="Food"></ui-search></div>`
    )
    const [standard, category] = page.querySelectorAll<Search>("ui-search")
    standard!.source = FRUIT
    category!.source = FOOD
    await ElementFixture.tick()
    await userEvent.type(standard!.shadowRoot!.querySelector("input")!, "ap")
    await userEvent.keyboard("{ArrowDown}")
    await ElementFixture.tick()
    await transitionsDone(page)
    await expectAccessible(page)
    await userEvent.type(category!.shadowRoot!.querySelector("input")!, "a")
    await ElementFixture.tick()
    await transitionsDone(page)
    await expectAccessible(page)
  })
})
