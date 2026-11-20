import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { UI } from "spell/ui/runtime"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { MermaidDrawer, type DOMMermaidDiagramElement } from "spell/ui/components/ui-mermaid-diagram"
import { ElkEngine } from "spell/ui/util/ElkEngine"

import "spell/ui/components/ui-mermaid-diagram"
import "spell/ui/components/ui-markdown"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-mermaid-diagram/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A small flowchart. */
const FLOWCHART = "flowchart LR\n  a[Start] --> b[End]"

beforeAll(async () => {
  await UI.load()
  await MermaidDrawer.load()
})

afterEach(() => {
  UI.sources.forget()
  localStorage.clear()
  document.documentElement.classList.remove("ui-dark", "ui-light")
  vi.restoreAllMocks()
})

/** Render `html` and wait for its first `ui-drawn` or `ui-error`;  returns the element. */
async function drawn(html: string): Promise<DOMMermaidDiagramElement> {
  const done = nextDraw(document)
  const host = await ElementFixture.render<DOMMermaidDiagramElement>(html)
  await done
  await ElementFixture.tick()
  return host
}

/**
 * Resolves with the next `ui-drawn` or `ui-error` to reach `target`.
 * - Listen BEFORE the change that draws:  an event that already went by never comes back.
 */
function nextDraw(target: EventTarget): Promise<CustomEvent> {
  return new Promise((resolve) => {
    const seen = (event: Event) => {
      target.removeEventListener("ui-drawn", seen)
      target.removeEventListener("ui-error", seen)
      resolve(event as CustomEvent)
    }
    target.addEventListener("ui-drawn", seen)
    target.addEventListener("ui-error", seen)
  })
}

/** `host`'s `<svg>`. */
function svgOf(host: DOMMermaidDiagramElement): SVGSVGElement | null {
  return host.shadowRoot!.querySelector(".drawing > svg")
}

/** `<ui-mermaid-diagram>` holding `text` in a script child, with `attributes`. */
function markup(text: string, attributes = ""): string {
  return `<ui-mermaid-diagram${attributes}><script type="text/mermaid">${text}</script></ui-mermaid-diagram>`
}

describe("<ui-mermaid-diagram>", () => {
  it("draws its text as an SVG, and says what it drew", async () => {
    const host = await drawn(markup(FLOWCHART))
    expect(svgOf(host)).not.toBeNull()
    expect(host.diagramType).toMatch(/flowchart/)
    expect(host.svg).toMatch(/^<svg/)
    expect(host.shadowRoot!.querySelector(".drawing")!.getAttribute("aria-label")).toBe("Flowchart diagram")
  })

  it("draws a sequence diagram and a newer kind (kanban)", async () => {
    const sequence = await drawn(markup("sequenceDiagram\n  Alice->>Bob: Hi"))
    expect(sequence.diagramType).toBe("sequence")
    const kanban = await drawn(markup("kanban\n  todo[To do]\n    one[Write it]\n  done[Done]"))
    expect(kanban.diagramType).toBe("kanban")
    expect(svgOf(kanban)).not.toBeNull()
  })

  it("draws again when its text changes", async () => {
    const host = await drawn(markup(FLOWCHART))
    const next = nextDraw(host)
    host.content = "flowchart LR\n  x[One] --> y[Two] --> z[Three]"
    await next
    await ElementFixture.tick()
    expect(svgOf(host)!.textContent).toContain("Three")
  })

  it("says which line it stopped at, keeps the last drawing dimmed, and comes back once fixed", async () => {
    const host = await drawn(markup(FLOWCHART))
    const failed = nextDraw(host)
    host.content = "flowchart LR\n  a[Start] --> b[End\n  c --> d"
    expect((await failed).type).toBe("ui-error")
    await ElementFixture.tick()
    expect(host.error).toMatch(/couldn't be drawn/)
    expect(host.error).toMatch(/mistake on line \d/)
    // what it expected, as characters to type, never the grammar's names (`SQE`)
    expect(host.error).not.toMatch(/\b[A-Z][A-Z_]{2,}\b/)
    expect(host.shadowRoot!.querySelector(".drawing.stale > svg")).not.toBeNull()
    const fixed = nextDraw(host)
    host.content = FLOWCHART
    expect((await fixed).type).toBe("ui-drawn")
    await ElementFixture.tick()
    expect(host.error).toBeUndefined()
    expect(host.shadowRoot!.querySelector(".drawing.stale")).toBeNull()
  })

  it("asks for the kind when the text names none", async () => {
    const host = await drawn(markup("not a diagram at all"))
    expect(host.error).toMatch(/kind of diagram/)
  })

  it("throws away a slow draw that finished after a newer one", async () => {
    const host = await drawn(markup(FLOWCHART))
    const seen: string[] = []
    host.addEventListener("ui-drawn", () => seen.push(host.content))
    host.content = "flowchart LR\n  p[First] --> q"
    host.content = "flowchart LR\n  r[Second] --> s"
    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(0))
    await ElementFixture.tick()
    expect(svgOf(host)!.textContent).toContain("Second")
    expect(svgOf(host)!.textContent).not.toContain("First")
  })

  it("shows HTML in a label as text (strict)", async () => {
    const host = await drawn(markup(`flowchart LR\n  a["<img src=x onerror=alert(1)>"] --> b`))
    expect(svgOf(host)!.querySelector("img[onerror]")).toBeNull()
  })

  it("names the drawing by its label, else its own title", async () => {
    const labelled = await drawn(markup(FLOWCHART, ` label="How it flows"`))
    expect(labelled.shadowRoot!.querySelector(".drawing")!.getAttribute("aria-label")).toBe("How it flows")
    const titled = await drawn(markup("flowchart LR\n  accTitle: The steps\n  a --> b"))
    expect(titled.shadowRoot!.querySelector(".drawing")!.getAttribute("aria-label")).toBe("The steps")
  })

  it("draws a file named by source", async () => {
    const host = await drawn(
      `<ui-mermaid-diagram source="/src/components/ui-mermaid-diagram/examples/sources/release.mmd"></ui-mermaid-diagram>`
    )
    expect(host.diagramType).toBe("sequence")
  })

  it("passes axe on every example", async () => {
    for (const html of Object.values(EXAMPLES)) {
      const host = await ElementFixture.render(html)
      const diagrams = [...host.querySelectorAll<DOMMermaidDiagramElement>("ui-mermaid-diagram")]
      await vi.waitFor(() => expect(diagrams.every((diagram) => diagram.diagramType)).toBe(true), { timeout: 10_000 })
      await expectAccessible(host)
    }
  })
})

describe("<ui-mermaid-diagram> themes", () => {
  /** The config `MermaidDrawer` built for the last draw. */
  function lastConfig(spy: { mock: { results: { value: unknown }[] } }): Record<string, unknown> {
    return spy.mock.results.at(-1)!.value as Record<string, unknown>
  }

  it("draws `spell` from Spell UI's tokens, as colours Mermaid can read", async () => {
    const spy = vi.spyOn(MermaidDrawer, "configFor")
    await drawn(markup(FLOWCHART))
    const config = lastConfig(spy)
    expect(config.theme).toBe("base")
    const variables = config.themeVariables as Record<string, string>
    expect(variables.primaryColor).toMatch(/^#[0-9a-f]{6}$|^rgba\(/)
    expect(variables.darkMode).toBe(false)
  })

  it("hands each theme's name to Mermaid, and a light preset's dark twin on a dark drawing", async () => {
    const spy = vi.spyOn(MermaidDrawer, "configFor")
    await drawn(markup(FLOWCHART, ` theme="forest"`))
    expect(lastConfig(spy).theme).toBe("forest")
    await drawn(markup(FLOWCHART, ` theme="neo" scheme="dark"`))
    expect(lastConfig(spy).theme).toBe("neo-dark")
    await drawn(markup(FLOWCHART, ` theme="forest" scheme="dark"`))
    expect(lastConfig(spy).theme).toBe("forest")
  })

  it("draws dark with scheme=dark on a light page:  Spell's dark colours", async () => {
    const spy = vi.spyOn(MermaidDrawer, "configFor")
    const host = await drawn(markup(FLOWCHART, ` scheme="dark"`))
    expect(host.matches(":state(dark)")).toBe(true)
    expect((lastConfig(spy).themeVariables as Record<string, unknown>).darkMode).toBe(true)
  })

  it("falls back to spell for an unknown theme, naming the ones it knows", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const spy = vi.spyOn(MermaidDrawer, "configFor")
    await drawn(markup(FLOWCHART, ` theme="purple-haze"`))
    expect(lastConfig(spy).theme).toBe("base")
    expect(warn.mock.calls.flat().join(" ")).toMatch(/purple-haze.*forest/)
  })

  it("draws again, dark, when the page switches to dark", async () => {
    const host = await drawn(markup(FLOWCHART))
    expect(host.matches(":state(dark)")).toBe(false)
    const next = nextDraw(host)
    document.documentElement.classList.add("ui-dark")
    document.documentElement.style.colorScheme = "dark"
    await next
    await ElementFixture.tick()
    expect(host.matches(":state(dark)")).toBe(true)
    document.documentElement.style.colorScheme = ""
  })

  it("hands look, layout and seed to Mermaid", async () => {
    const spy = vi.spyOn(MermaidDrawer, "configFor")
    await drawn(markup(FLOWCHART, ` look="hand-drawn" seed="7" layout="dagre"`))
    const config = lastConfig(spy)
    expect(config.look).toBe("handDrawn")
    expect(config.handDrawnSeed).toBe(7)
    expect(config.layout).toBe("dagre")
  })
})

describe("<ui-mermaid-diagram> ELK", () => {
  it("warms ELK up for a flowchart, through the one loader, and never for a pie chart", async () => {
    const load = vi.spyOn(ElkEngine, "load")
    await drawn(markup('pie\n  "Yes" : 3\n  "No" : 1'))
    expect(load).not.toHaveBeenCalled()
    await drawn(markup(FLOWCHART))
    expect(load).toHaveBeenCalled()
    expect(await ElkEngine.load()).toHaveProperty("layout")
  })
})

describe("<ui-mermaid-diagram> menu", () => {
  it("waits the page's hover delay before it shows, and shows at once by keyboard", async () => {
    const host = await drawn(markup(FLOWCHART, " controls"))
    const controls = host.shadowRoot!.querySelector(".controls")!
    expect(getComputedStyle(controls).opacity).toBe("0")
    const sheet = [...host.shadowRoot!.adoptedStyleSheets]
      .flatMap((s) => [...s.cssRules].map((r) => r.cssText))
      .join("\n")
    expect(sheet).toMatch(/:host\(:hover\) \.controls[^}]*transition-delay: var\(--ui-hover-delay/)
    expect(sheet).toMatch(/\.controls:focus-within/)
  })

  it("shows no menu without controls", async () => {
    const host = await drawn(markup(FLOWCHART))
    expect(host.shadowRoot!.querySelector("ui-dropdown")).toBeNull()
  })

  it("redraws with the reader's pick, and keeps it across a reload", async () => {
    const spy = vi.spyOn(MermaidDrawer, "configFor")
    const host = await drawn(markup(FLOWCHART, ` controls remember="menu-test"`))
    const dropdown = host.shadowRoot!.querySelector("ui-dropdown")!
    const next = nextDraw(host)
    dropdown.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "theme:forest" }, bubbles: true }))
    await next
    expect(spy.mock.results.at(-1)!.value).toMatchObject({ theme: "forest" })
    host.remove()
    await drawn(markup(FLOWCHART, ` controls remember="menu-test"`))
    expect(spy.mock.results.at(-1)!.value).toMatchObject({ theme: "forest" })
  })

  it("puts back the attributes' theme", async () => {
    const spy = vi.spyOn(MermaidDrawer, "configFor")
    const host = await drawn(markup(FLOWCHART, ` controls remember="put-back-test" theme="neutral"`))
    const dropdown = host.shadowRoot!.querySelector("ui-dropdown")!
    let next = nextDraw(host)
    dropdown.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "theme:forest" } }))
    await next
    next = nextDraw(host)
    dropdown.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "put-back" } }))
    await next
    expect(spy.mock.results.at(-1)!.value).toMatchObject({ theme: "neutral" })
    expect(localStorage.getItem("ui-mermaid-diagram:put-back-test")).toBeNull()
  })
})

describe("<ui-mermaid-diagram> icons", () => {
  it("draws Font Awesome names and a pack-and-name with the page's own icons", async () => {
    const host = await drawn(
      markup('flowchart LR\n  a["fa:fa-car Car"] --> b["far:fa-heart Love"] --> c["fab:fa-github Code"]')
    )
    const icons = svgOf(host)!.querySelectorAll("svg.label-icon")
    expect(icons.length).toBe(3)
    expect(svgOf(host)!.querySelector("i.fa")).toBeNull()
  })

  it("draws a pack-and-name icon in an architecture diagram", async () => {
    const get = vi.spyOn(UI.icons, "get")
    const host = await drawn(
      markup(
        "architecture-beta\n  group app(cloud)[App]\n  service web(fa7-free:globe)[Web] in app\n  service db(database)[Data] in app\n  web:R --> L:db"
      )
    )
    expect(host.diagramType).toBe("architecture")
    expect(get.mock.calls.map(([name]) => name)).toContain("fa7-free:globe")
  })

  it("fetches no icon for a diagram without one", async () => {
    const get = vi.spyOn(UI.icons, "get")
    await drawn(markup(FLOWCHART))
    expect(get).not.toHaveBeenCalled()
  })
})

describe("<ui-markdown> mermaid blocks", () => {
  it("draws a ```mermaid block as a <ui-mermaid-diagram>", async () => {
    const markdown = await ElementFixture.render(
      '<ui-markdown><script type="text/markdown">Intro\n\n```mermaid\nflowchart LR\n  a --> b\n```\n</script></ui-markdown>'
    )
    await vi.waitFor(() => expect(markdown.shadowRoot!.querySelector("ui-mermaid-diagram")).not.toBeNull())
    const diagram = markdown.shadowRoot!.querySelector("ui-mermaid-diagram") as DOMMermaidDiagramElement
    await vi.waitFor(() => expect(diagram.diagramType).toMatch(/flowchart/))
    expect(markdown.shadowRoot!.querySelector("ui-code")).toBeNull()
  })
})
