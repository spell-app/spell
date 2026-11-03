import { beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { UI } from "spell/ui/runtime"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

import { MarkdownRenderer } from "spell/ui/components/ui-markdown/MarkdownRenderer"
import type { DOMMarkdownElement } from "spell/ui/components/ui-markdown/UIMarkdown"

import "spell/ui/components/ui-markdown"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-markdown/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** The example README. */
const README = "/src/components/ui-markdown/examples/sources/readme.md"

beforeAll(async () => {
  await UI.load()
})

/** Render one `<ui-markdown>`, wait for its render (or failure). */
async function markdown(html: string): Promise<DOMMarkdownElement> {
  const rendered = nextRender(document)
  const host = await ElementFixture.render<DOMMarkdownElement>(html)
  await rendered
  await ElementFixture.tick()
  return host
}

/**
 * Resolves on the next `ui-drawn` or `ui-error` reaching `target`.
 * - No timeout of its own:  a render that never ends fails the test at Vitest's test timeout.
 */
function nextRender(target: EventTarget): Promise<void> {
  return new Promise<void>((resolve) => {
    target.addEventListener("ui-drawn", done)
    target.addEventListener("ui-error", done)

    /** Stop listening, and resolve. */
    function done() {
      target.removeEventListener("ui-drawn", done)
      target.removeEventListener("ui-error", done)
      resolve()
    }
  })
}

/**
 * Resolves once every `ui-*` element in `root` is defined and rendered.
 * - Why:  the markup brings tags whose families load lazily (`<ui-code>`'s),
 *   and `ElementFixture.settle()` only waits for elements already defined.
 */
async function drawn(root: Element) {
  const tags = new Set([...root.querySelectorAll("*")].map(({ localName }) => localName))
  await Promise.all([...tags].filter((tag) => tag.startsWith("ui-")).map((tag) => customElements.whenDefined(tag)))
  await ElementFixture.settle(root)
}

/** The article. */
function body(host: DOMMarkdownElement): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>("[part~=body]")!
}

/** Markdown as an element, exact (`<script type="text/markdown">`). */
function md(text: string, attributes = ""): string {
  return `<ui-markdown ${attributes}><script type="text/markdown">${text}</script></ui-markdown>`
}

////////////////
// ## Rendering
////////////////

describe("<ui-markdown> rendering", () => {
  it("renders GitHub markdown:  tables, task lists, strikethrough, autolinks", async () => {
    const host = await markdown(
      md("| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~old~~ https://example.com")
    )
    expect(body(host).querySelectorAll("table td").length).toBe(2)
    const boxes = body(host).querySelectorAll<HTMLInputElement>("li > input[type=checkbox]")
    expect([...boxes].map((box) => box.checked)).toEqual([true, false])
    expect([...boxes].map((box) => box.getAttribute("aria-label"))).toEqual(["done", "todo"])
    expect(body(host).querySelector("del")!.textContent).toBe("old")
    expect(body(host).querySelector("a")!.getAttribute("href")).toBe("https://example.com")
  })

  it("gives headings GitHub's ids and lists them:  `headings`, `ui-drawn`", async () => {
    const onRender = vi.fn()
    document.addEventListener("ui-drawn", onRender)
    const host = await markdown(md("# Getting started!\n\n## Setup\n\n## Setup"))
    document.removeEventListener("ui-drawn", onRender)
    expect([...body(host).querySelectorAll("h1, h2")].map((heading) => heading.id)).toEqual([
      "getting-started",
      "setup",
      "setup-1"
    ])
    expect(host.headings).toEqual([
      { level: 1, text: "Getting started!", id: "getting-started" },
      { level: 2, text: "Setup", id: "setup" },
      { level: 2, text: "Setup", id: "setup-1" }
    ])
    expect(onRender.mock.calls.at(-1)![0].detail.headings).toHaveLength(3)
  })

  it("`heading-offset` shifts heading levels", async () => {
    const host = await markdown(md("# One\n\n###### Six", 'heading-offset="1"'))
    expect(body(host).querySelector("h2")!.textContent).toBe("One")
    expect(body(host).querySelector("h6")!.textContent).toBe("Six")
  })

  it("`sanitized` sanitizes:  no scripts, no handlers, no javascript: links", async () => {
    // through `content`:  a `</script>` in the text would end an inline `<script type="text/markdown">`
    const host = await markdown(md("placeholder", "sanitized"))
    const rendered = nextRender(host)
    host.content =
      '<script>window.__md = 1</script>\n\n<img src="x" onerror="window.__md = 2">\n\n[x](javascript:alert(1))'
    await rendered
    expect(body(host).querySelector("script")).toBeNull()
    expect(body(host).querySelector("img")!.hasAttribute("onerror")).toBe(false)
    expect(body(host).querySelector("a")?.getAttribute("href") ?? "").not.toMatch(/javascript/)
    expect((window as { __md?: number }).__md).toBeUndefined()
  })

  it("keeps raw HTML without `sanitized`, and never loads DOMPurify", async () => {
    const loadSanitizer = vi.spyOn(MarkdownRenderer, "loadSanitizer")
    try {
      const host = await markdown(md('<ui-label color="teal" data-x="1">kept</ui-label>'))
      expect(body(host).querySelector("ui-label")!.textContent).toBe("kept")
      expect(body(host).querySelector("ui-label")!.getAttribute("data-x")).toBe("1")
      expect(loadSanitizer).not.toHaveBeenCalled()
    } finally {
      loadSanitizer.mockRestore()
    }
  })

  it("turns code blocks into highlighted <ui-code>s", async () => {
    const host = await markdown(md("```ts\nconst a = 1\n```"))
    const code = body(host).querySelector("ui-code")!
    expect(code.getAttribute("language")).toBe("ts")
    expect(code.hasAttribute("copy")).toBe(true)
    expect(code.textContent).toBe("const a = 1")
  })

  it("keeps a SHORT inline code span on one line;  a long one may still wrap", async () => {
    const long = "spell/ui/components/ui-button/UIButton"
    const host = await markdown(md(`Run \`--toggle\` or read \`${long}\`.`))
    const [short, path] = [...body(host).querySelectorAll("code")]
    expect([short!.className, path!.className]).toEqual(["short", ""])
    expect(getComputedStyle(short!).whiteSpace).toBe("nowrap")
    expect(getComputedStyle(path!).whiteSpace).not.toBe("nowrap")
    // no margin at its sides:  punctuation sits against the chip
    expect([getComputedStyle(short!).marginLeft, getComputedStyle(short!).marginRight]).toEqual(["0px", "0px"])
  })

  it("loads a `source` file, its relative links resolved beside it", async () => {
    const host = await markdown(`<ui-markdown source="${README}"></ui-markdown>`)
    expect(body(host).querySelector("h1")!.textContent).toBe("Release notes")
    const changelog = body(host).querySelector<HTMLAnchorElement>("a[href$='changelog.md']")!
    expect(changelog.href).toBe(
      new URL("/src/components/ui-markdown/examples/sources/changelog.md", location.href).href
    )
    expect(body(host).querySelector("a[href='#elements']")).not.toBeNull()
  })

  it("follows a `#id` link to its heading inside the shadow root", async () => {
    const host = await markdown(`<ui-markdown source="${README}"></ui-markdown>`)
    const target = body(host).querySelector("#elements")!
    const scroll = vi.spyOn(target, "scrollIntoView").mockImplementation(() => {})
    body(host).querySelector<HTMLAnchorElement>("a[href='#elements']")!.click()
    expect(scroll).toHaveBeenCalled()
    expect(location.hash).toBe("#elements")
    history.replaceState(history.state, "", location.pathname + location.search)
  })

  it("re-renders new `content`", async () => {
    const host = await markdown(md("# One"))
    const rendered = nextRender(host)
    host.content = "# Two"
    await rendered
    expect(body(host).querySelector("h1")!.textContent).toBe("Two")
  })
})

////////////////
// ## `<ui-markdown skip-title>`
////////////////

describe("<ui-markdown skip-title>", () => {
  it("drops the leading `#` title, keeping the text and every other heading", async () => {
    const text = "\n# Spell Design System\n\nIntro.\n\n## Voice\n\n# Second title"
    const host = await markdown(md(text, "skip-title"))
    expect([...body(host).querySelectorAll("h1, h2")].map((heading) => heading.textContent)).toEqual([
      "Voice",
      "Second title"
    ])
    expect(body(host).firstElementChild!.textContent).toBe("Intro.")
    expect(host.headings.map(({ id }) => id)).toEqual(["voice", "second-title"])
    expect(host.content).toContain("# Spell Design System")
    expect(host.dirty).toBe(false)
  })

  it("drops a setext title too, but never a `##` heading or a leading paragraph", async () => {
    const setext = await markdown(md("Title\n=====\n\nBody", "skip-title"))
    expect(body(setext).querySelector("h1")).toBeNull()
    const second = await markdown(md("## Not a title\n\nBody", "skip-title"))
    expect(body(second).querySelector("h2")!.textContent).toBe("Not a title")
    const paragraph = await markdown(md("Body first\n\n# Title", "skip-title"))
    expect(body(paragraph).querySelector("h1")!.textContent).toBe("Title")
  })

  it("follows the attribute:  removing it shows the title again", async () => {
    const host = await markdown(md("# Title\n\nBody", "skip-title"))
    expect(body(host).querySelector("h1")).toBeNull()
    const rendered = nextRender(host)
    host.removeAttribute("skip-title")
    await rendered
    expect(body(host).querySelector("h1")!.textContent).toBe("Title")
  })
})

////////////////
// ## Revealing a heading
////////////////

describe("<ui-markdown> revealing a heading", () => {
  /** Spy on `id`'s `scrollIntoView`. */
  function scrollSpy(host: DOMMarkdownElement, id: string) {
    return vi.spyOn(body(host).querySelector(`#${id}`)!, "scrollIntoView").mockImplementation(() => {})
  }

  /** Clear the address's hash. */
  function clearHash() {
    history.replaceState(history.state, "", location.pathname + location.search)
  }

  it("`reveal(id)` scrolls to the heading and puts it in the address;  `false` for an unknown id", async () => {
    const host = await markdown(md("# One\n\n## Two"))
    const scroll = scrollSpy(host, "two")
    try {
      expect(host.reveal("two")).toBe(true)
      expect(scroll).toHaveBeenCalled()
      expect(location.hash).toBe("#two")
      expect(host.reveal("missing")).toBe(false)
      expect(location.hash).toBe("#two")
    } finally {
      clearHash()
    }
  })

  it("honours the address's `#id` after its FIRST render", async () => {
    history.replaceState(history.state, "", "#later-heading")
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {})
    try {
      const host = await markdown(md("# One\n\n## Later heading"))
      expect(scroll.mock.contexts).toContain(body(host).querySelector("#later-heading"))
      scroll.mockClear()
      const rendered = nextRender(host)
      host.content = "# One\n\n## Later heading\n\nMore."
      await rendered
      expect(scroll).not.toHaveBeenCalled()
    } finally {
      scroll.mockRestore()
      clearHash()
    }
  })

  it("follows a `hashchange` naming one of its headings, but not one the page itself has", async () => {
    const host = await markdown(md("# One\n\n## Two"))
    const scroll = scrollSpy(host, "two")
    const page = document.createElement("div")
    page.id = "page-own"
    document.body.append(page)
    try {
      location.hash = "#two"
      await expect.poll(() => scroll.mock.calls.length).toBe(1)
      location.hash = "#page-own"
      await new Promise((resolve) => window.addEventListener("hashchange", resolve, { once: true }))
      expect(scroll).toHaveBeenCalledTimes(1)
    } finally {
      page.remove()
      clearHash()
    }
  })
})

////////////////
// ## `<ui-markdown editable="tabs">`
////////////////

describe('<ui-markdown editable="tabs">', () => {
  /** A `<ui-markdown editable="tabs">` holding `text`, on its Write tab (nothing rendered yet). */
  async function editable(text: string, attributes = ""): Promise<DOMMarkdownElement> {
    const host = await ElementFixture.render<DOMMarkdownElement>(md(text, `editable="tabs" ${attributes}`))
    await ElementFixture.settle(host)
    return host
  }

  /** The tab buttons. */
  function tabs(host: DOMMarkdownElement): HTMLButtonElement[] {
    return [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>("[part~=tab]")]
  }

  /** The text box. */
  function editor(host: DOMMarkdownElement): HTMLTextAreaElement {
    return host.shadowRoot!.querySelector<HTMLTextAreaElement>("[part~=editor]")!
  }

  /** Show the preview;  resolves once it's rendered. */
  async function preview(host: DOMMarkdownElement) {
    const rendered = nextRender(host)
    tabs(host)[1].click()
    await rendered
    await ElementFixture.settle(host)
  }

  /** Type `text` into the box, as the user would:  an `input` event. */
  async function type(host: DOMMarkdownElement, text: string) {
    editor(host).value = text
    editor(host).dispatchEvent(new InputEvent("input", { bubbles: true }))
    await ElementFixture.settle(host)
  }

  it("opens on Write:  the text in a text box, the preview hidden and not rendered", async () => {
    const host = await editable("# Title")
    expect(tabs(host).map((tab) => [tab.textContent, tab.getAttribute("aria-selected")])).toEqual([
      ["Write", "true"],
      ["Preview", "false"]
    ])
    expect(editor(host).value).toBe("# Title")
    expect(editor(host).getAttribute("aria-label")).toBe("Markdown")
    expect(body(host).parentElement!.hidden).toBe(true)
    expect(body(host).childNodes.length).toBe(0)
  })

  it("previews with marked, as the element draws:  ids, labelled task boxes, a table", async () => {
    const host = await editable("# Title\n\n- [x] done\n- [ ] todo\n\n| a | b |\n| - | - |\n| 1 | 2 |")
    await preview(host)
    expect(body(host).parentElement!.hidden).toBe(false)
    expect(editor(host).closest("section")!.hidden).toBe(true)
    expect(body(host).querySelector("h1")!.id).toBe("title")
    expect(host.headings).toEqual([{ level: 1, text: "Title", id: "title" }])
    const boxes = body(host).querySelectorAll("input[type=checkbox]")
    expect([...boxes].map((box) => box.getAttribute("aria-label"))).toEqual(["done", "todo"])
    expect(body(host).querySelectorAll("table td").length).toBe(2)
    expect(body(host).querySelector("ui-header, ui-checkbox, ui-table")).toBeNull()
  })

  it("each edit is `ui-changed` and dirty;  the preview swaps only the changed blocks", async () => {
    const host = await editable("# Title\n\nfirst\n\nlast")
    await preview(host)
    const [title, , last] = body(host).children
    tabs(host)[0].click()
    const onChange = vi.fn()
    host.addEventListener("ui-changed", onChange)
    await type(host, "# Title\n\nchanged\n\nlast")
    expect(onChange.mock.calls.at(-1)![0].detail.content).toBe("# Title\n\nchanged\n\nlast")
    expect(host.matches(":state(dirty)")).toBe(true)
    await preview(host)
    expect(body(host).textContent).toContain("changed")
    expect(body(host).children[0]).toBe(title)
    expect(body(host).lastElementChild).toBe(last)
  })

  it("arrow keys, Home and End move between the tabs", async () => {
    const host = await editable("text")
    await press("ArrowRight")
    expect(tabs(host)[1].getAttribute("aria-selected")).toBe("true")
    expect(host.shadowRoot!.activeElement).toBe(tabs(host)[1])
    await press("ArrowRight")
    expect(tabs(host)[0].getAttribute("aria-selected")).toBe("true")
    await press("End")
    expect(tabs(host)[1].getAttribute("aria-selected")).toBe("true")
    await press("Home")
    expect(tabs(host)[0].getAttribute("aria-selected")).toBe("true")

    /** Press `key` on the shown tab, as a person does. */
    async function press(key: string) {
      const shown = tabs(host).find((tab) => tab.getAttribute("aria-selected") === "true")!
      shown.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }))
      await ElementFixture.settle(host)
    }
  })

  it("axe passes on both tabs", async () => {
    const host = await editable("# Title\n\n- [ ] todo\n\n| a | b |\n| - | - |\n| 1 | 2 |")
    await expectAccessible(host)
    await preview(host)
    await drawn(body(host))
    await expectAccessible(host)
  })
})

////////////////
// ## `<ui-markdown editable>`:  editing in place
////////////////

describe("<ui-markdown editable>", () => {
  /** The LOE table of the atmosphere guide "Spaces and Spell", shortened, under a paragraph. */
  const TEXT = [
    "Some **bold** words, and [a link](#here).",
    "",
    "| # | Piece | Days |",
    "| --- | --- | --- |",
    "| 1 | Drafts and versions | 5 |",
    "| 4 | Sign-in | 5 |"
  ].join("\n")

  /** A `<ui-markdown editable>` holding `text`, rendered, its saves kept here (`saved`). */
  async function editable(text = TEXT): Promise<{ host: DOMMarkdownElement; saved: string[] }> {
    const host = await markdown(md(text, "editable"))
    const saved: string[] = []
    // the page's saver:  a listener that saves it itself cancels the element's own (no saver in these tests)
    host.addEventListener("ui-saving", (event) => {
      event.preventDefault()
      saved.push((event as CustomEvent<{ content: string }>).detail.content)
    })
    return { host, saved }
  }

  /** The drawn piece holding `text`. */
  function piece(host: DOMMarkdownElement, text: string): HTMLElement {
    const pieces = [...body(host).querySelectorAll<HTMLElement>("[data-ui-place]")]
    return pieces.find((each) => each.textContent?.trim() === text)!
  }

  /** The open box, if any. */
  function box(host: DOMMarkdownElement): HTMLElement | null {
    return host.shadowRoot!.querySelector<HTMLElement>("[part~=edit-box]")
  }

  /** ⌥-click (or a plain click, `altKey: false`) on `target`. */
  async function click(host: DOMMarkdownElement, target: Element, altKey = true) {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey }))
    await ElementFixture.settle(host)
  }

  /** Type `text` over the box's, as a person does:  an `input`. */
  async function type(host: DOMMarkdownElement, text: string) {
    box(host)!.textContent = text
    box(host)!.dispatchEvent(new InputEvent("input", { bubbles: true }))
    await ElementFixture.settle(host)
  }

  /** Press `key` in the box, then let what it does finish. */
  async function press(host: DOMMarkdownElement, key: string, shiftKey = false) {
    box(host)!.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }))
    await ElementFixture.settle(host)
    await nextFrames(3)
    await ElementFixture.settle(host)
  }

  it("marks each paragraph and cell it can edit, and ⌥-click shows a cell's markdown in a box", async () => {
    const { host } = await editable()
    expect(body(host).querySelectorAll("[data-ui-place]").length).toBe(10)
    await click(host, piece(host, "Drafts and versions"))
    expect(box(host)!.textContent).toBe("Drafts and versions")
    expect(box(host)!.getAttribute("aria-label")).toBe("Edit table cell")
    expect(host.matches(":state(editing)")).toBe(true)
    expect(host.shadowRoot!.activeElement).toBe(box(host))
  })

  it("shows a paragraph's markdown:  bold and a link kept as written", async () => {
    const { host } = await editable()
    await click(host, piece(host, "Some bold words, and a link."))
    expect(box(host)!.textContent).toBe("Some **bold** words, and [a link](#here).")
  })

  it("Enter keeps it:  only that cell changes, `ui-changed` and a save;  Escape puts it back", async () => {
    const { host, saved } = await editable()
    const changed = vi.fn()
    host.addEventListener("ui-changed", changed)
    await click(host, piece(host, "Drafts and versions"))
    await type(host, "Drafts | versions")
    await press(host, "Enter")
    const next = TEXT.replace("Drafts and versions", "Drafts \\| versions")
    expect(host.content).toBe(next)
    expect(changed).toHaveBeenCalledTimes(1)
    expect(saved).toEqual([next])
    expect(box(host)).toBeNull()
    expect(piece(host, "Drafts | versions")).toBeTruthy()
    await click(host, piece(host, "Sign-in"))
    await type(host, "Signing in")
    await press(host, "Escape")
    expect(host.content).toBe(next)
    expect(piece(host, "Sign-in")).toBeTruthy()
  })

  it("Tab keeps it and moves to the next cell, Shift+Tab to the one before", async () => {
    const { host } = await editable()
    await click(host, piece(host, "Drafts and versions"))
    await type(host, "Drafts")
    await press(host, "Tab")
    expect(box(host)!.textContent).toBe("5")
    await press(host, "Tab", true)
    expect(box(host)!.textContent).toBe("Drafts")
    expect(host.content).toContain("| 1 | Drafts | 5 |")
  })

  it("keeps a box 5 seconds after the last key, and leaves it open;  4 seconds isn't enough", async () => {
    vi.useFakeTimers()
    try {
      const { host, saved } = await editable()
      await click(host, piece(host, "Drafts and versions"))
      await type(host, "Drafts")
      vi.advanceTimersByTime(4_000)
      expect(saved).toEqual([])
      vi.advanceTimersByTime(1_000)
      await vi.runAllTimersAsync()
      expect(saved).toEqual([TEXT.replace("Drafts and versions", "Drafts")])
      expect(box(host)!.textContent).toBe("Drafts")
    } finally {
      vi.useRealTimers()
    }
  })

  it("a plain click edits nothing, and follows a link;  without `editable`, ⌥-click edits nothing", async () => {
    const { host } = await editable()
    await click(host, piece(host, "Drafts and versions"), false)
    expect(box(host)).toBeNull()
    const plain = await markdown(md(TEXT))
    expect(plain.shadowRoot!.querySelector("[data-ui-place]")).toBeNull()
    await click(plain, body(plain).querySelector("td")!)
    expect(plain.shadowRoot!.querySelector("[part~=edit-box]")).toBeNull()
  })

  it("⌥-click on a link opens the box, not the link", async () => {
    const { host } = await editable()
    const link = body(host).querySelector("a")!
    const clicked = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true })
    link.dispatchEvent(clicked)
    await ElementFixture.settle(host)
    expect(clicked.defaultPrevented).toBe(true)
    expect(box(host)!.textContent).toContain("[a link](#here)")
  })

  it("holding ⌥ outlines what can be edited;  letting go, or the window losing the focus, takes it off", async () => {
    const { host } = await editable()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true }))
    await ElementFixture.settle(host)
    expect(host.matches(":state(placing)")).toBe(true)
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt", altKey: false }))
    await ElementFixture.settle(host)
    expect(host.matches(":state(placing)")).toBe(false)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true }))
    window.dispatchEvent(new FocusEvent("blur"))
    await ElementFixture.settle(host)
    expect(host.matches(":state(placing)")).toBe(false)
  })

  it("a title `skip-title` leaves out still counts:  the right text changes", async () => {
    const { host } = await editable("# Title\n\nfirst\n\nlast")
    host.setAttribute("skip-title", "")
    await nextRender(host)
    await click(host, piece(host, "last"))
    await type(host, "end")
    await press(host, "Enter")
    expect(host.content).toBe("# Title\n\nfirst\n\nend")
  })
})

////////////////
// ## `<ui-markdown editable>`:  formatting while you edit
////////////////

describe("<ui-markdown editable> formatting", () => {
  /** A rendered `<ui-markdown editable>` holding `text`, its saves kept from the page (none in tests). */
  async function editable(text: string): Promise<DOMMarkdownElement> {
    localStorage.removeItem("ui-markdown:edit-view")
    const host = await markdown(md(text, "editable"))
    host.addEventListener("ui-saving", (event) => event.preventDefault())
    return host
  }

  /** ⌥-click the piece holding `text`. */
  async function open(host: DOMMarkdownElement, text: string) {
    const piece = [...body(host).querySelectorAll<HTMLElement>("[data-ui-place]")].find(
      (each) => each.textContent?.trim() === text
    )!
    piece.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true }))
    await ElementFixture.settle(host)
  }

  /** The open box, and its bar. */
  function box(host: DOMMarkdownElement): HTMLElement {
    return host.shadowRoot!.querySelector<HTMLElement>("[part~=edit-box]")!
  }
  function bar(host: DOMMarkdownElement): HTMLElement {
    return host.shadowRoot!.querySelector<HTMLElement>("[part~=edit-bar]")!
  }

  /** Select `from`-`to` of the box's text. */
  function select(host: DOMMarkdownElement, from: number, to: number) {
    const walker = document.createTreeWalker(box(host), NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text)
    const point = (offset: number): [Text, number] => {
      for (const node of nodes) {
        if (offset <= node.data.length) return [node, offset]
        offset -= node.data.length
      }
      return [nodes.at(-1)!, nodes.at(-1)!.data.length]
    }
    document.getSelection()!.setBaseAndExtent(...point(from), ...point(to))
  }

  /** Press `key` (a code, `KeyB`) in the box, with ⌘ (or Ctrl);  returns whether it was prevented. */
  async function command(host: DOMMarkdownElement, code: string, shiftKey = false): Promise<boolean> {
    const event = new KeyboardEvent("keydown", { code, key: code.slice(3).toLowerCase(), metaKey: true, shiftKey, bubbles: true, cancelable: true })
    box(host).dispatchEvent(event)
    await ElementFixture.settle(host)
    return event.defaultPrevented
  }

  /** Enter in the box, and the drawing after it. */
  async function enter(host: DOMMarkdownElement) {
    box(host).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
    await ElementFixture.settle(host)
    await nextFrames(3)
  }

  it("draws a bar of buttons above the box, light icons, the shape menu off for a table cell", async () => {
    const host = await editable("words here\n\n| a |\n| - |\n| b |")
    await open(host, "words here")
    const icons = [...bar(host).querySelectorAll("ui-button")].map((button) => button.getAttribute("icon"))
    expect(icons).toEqual(["bold", "italic", "strikethrough", "link", "list ul", "list ol", "eraser", "eye"])
    // Spell UI's own dropdown, never the browser's (Owen's C1 on J196)
    expect(bar(host).querySelector("ui-select")).toBeTruthy()
    expect(bar(host).querySelector("select")).toBeNull()
    await enter(host)
    await open(host, "b")
    expect(bar(host).querySelector("ui-select")).toBeNull()
    expect(bar(host).querySelectorAll("ui-button").length).toBe(6)
  })

  it("⌘B bolds the selection, ⌘I italics, ⌘⇧X strikes;  ⌘E is left alone", async () => {
    const host = await editable("some words here")
    await open(host, "some words here")
    select(host, 5, 10)
    expect(await command(host, "KeyB")).toBe(true)
    expect(box(host).textContent).toBe("some **words** here")
    expect(box(host).querySelector(".md-mark")).toBeTruthy()
    select(host, 0, 4)
    await command(host, "KeyX", true)
    expect(box(host).textContent).toBe("~~some~~ **words** here")
    expect(await command(host, "KeyE")).toBe(false)
    await enter(host)
    expect(host.content).toBe("~~some~~ **words** here")
  })

  it("the shape menu makes a paragraph a heading;  the list button makes it a list", async () => {
    const host = await editable("first\n\nsecond")
    await open(host, "first")
    // a pick, as <ui-select> says it:  ui-changed with the item's value
    const menu = bar(host).querySelector("ui-select")!
    menu.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "h2" } }))
    await enter(host)
    expect(host.content).toBe("## first\n\nsecond")
    await open(host, "second")
    const bullet = [...bar(host).querySelectorAll("ui-button")].find((button) => button.getAttribute("icon") === "list ul")!
    bullet.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await enter(host)
    expect(host.content).toBe("## first\n\n- second")
  })

  it("the switch shows it formatted, remembered in this browser;  typed there, it's written back as markdown", async () => {
    const host = await editable("some **bold** words")
    await open(host, "some bold words")
    const view = [...bar(host).querySelectorAll("ui-button")].at(-1)!
    view.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await ElementFixture.settle(host)
    expect(box(host).querySelector("strong")?.textContent).toBe("bold")
    expect(localStorage.getItem("ui-markdown:edit-view")).toContain("formatted")
    box(host).querySelector("strong")!.textContent = "strong"
    await enter(host)
    expect(host.content).toBe("some **strong** words")
  })

  it("a piece that wouldn't come back exactly stays in the faded marks, its switch off", async () => {
    const host = await editable("a <nobr>**kept**</nobr> b")
    await open(host, "a kept b")
    const view = [...bar(host).querySelectorAll("ui-button")].at(-1)!
    expect(view.hasAttribute("disabled")).toBe(true)
    expect(view.getAttribute("title")).toContain("can't show formatted")
  })
})

/** Wait `count` animation frames. */
async function nextFrames(count: number) {
  for (let frame = 0; frame < count; frame++) await new Promise((resolve) => requestAnimationFrame(resolve))
}

////////////////
// ## Examples
////////////////

describe("<ui-markdown> examples", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const rendered = nextRender(document)
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await rendered
    for (const host of root.querySelectorAll<DOMMarkdownElement>("ui-markdown")) await drawn(body(host))
    await ElementFixture.settle(root)
    await expectAccessible(root)
  })
})
