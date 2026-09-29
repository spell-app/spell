import { html, nothing } from "lit"
import { describe, expect, it } from "vitest"

import { PART_VOCABULARIES, headerVocabulary } from "$/components/parts/parts.vocabulary.en"
import type { ComponentVocabulary } from "$/vocabulary"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"
import { UIElement } from "../../elements"
import { OwnerStub } from "./OwnerStub"
import type { UIAvatar, UIContent, UIDate, UIHeader, UIValue } from "./index"

import "./index"
import "../segment"
import "../label"
import "../icon"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", { query: "?raw", import: "default", eager: true })

/** Any part element. */
type Part = UIHeader | UIContent | UIDate | UIAvatar | UIValue

/** Render `html`, wait for the first update of every custom element in it. */
async function render<T extends Element = Part>(markup: string): Promise<T> {
  const element = Fixture.render<T>(markup)
  await settle(element)
  return element
}

/** Wait for `root` and every `ui-*` / `x-*` element under it (light DOM) to finish updating. */
async function settle(root: Element) {
  const elements = [root, ...root.querySelectorAll("*")].filter((node) => "updateComplete" in node)
  await Promise.all(elements.map((node) => (node as UIElement).updateComplete))
  // a second round:  owner changes found on connect / slotchange re-render
  await Promise.all(elements.map((node) => (node as UIElement).updateComplete))
}

/** The part's root element. */
function root(element: Element): HTMLElement {
  return element.shadowRoot!.firstElementChild as HTMLElement
}

/** `:state(in-*)` names set on `element`. */
function ownerStates(element: Element): string[] {
  return STATE_NAMES.filter((name) => element.matches(`:state(${name})`))
}

/** Every `in-<owner>` state any part declares, plus the stub owners used below. */
const STATE_NAMES = [
  ...new Set(PART_VOCABULARIES.flatMap((vocabulary) => vocabulary.states.map((state) => state.name))),
  "in-late",
  "in-panel"
]

/****************
 * ### `<x-panel>`
 * A test owner WITH a shadow root:  slots its parts (one slot inside a segment, a barrier), and renders a
 * `<ui-header>` of its own when it has a `heading` attribute -- a part across a SHADOW boundary.
 ****************/
const panelVocabulary = {
  tag: "x-panel",
  noun: "panel",
  attributes: [],
  events: [],
  slots: [],
  parts: [],
  states: [],
  texts: [],
  ownsParts: ["header", "content", "description"]
} as const satisfies ComponentVocabulary

class XPanel extends UIElement.for(panelVocabulary) {
  protected override render() {
    const heading = this.getAttribute("heading")
    return html`<div class="ui panel">
      ${heading ? html`<ui-header>${heading}</ui-header>` : nothing}<slot></slot>
      <ui-segment><slot name="boxed"></slot></ui-segment>
    </div>`
  }
}
XPanel.define()
OwnerStub.defineAll()

describe("parts markup", () => {
  it("renders <div|span|time class=noun part=noun><slot> for every part", async () => {
    const boxes: Record<string, string> = { author: "span", avatar: "span", detail: "span", date: "time" }
    for (const vocabulary of PART_VOCABULARIES) {
      if (vocabulary === headerVocabulary) continue
      const element = await render(`<${vocabulary.tag}>x</${vocabulary.tag}>`)
      const box = root(element)
      expect(box.localName, vocabulary.tag).toBe(boxes[vocabulary.noun] ?? "div")
      expect(box.className, vocabulary.tag).toBe(vocabulary.noun)
      expect(box.getAttribute("part"), vocabulary.tag).toBe(vocabulary.noun)
      expect(box.querySelector("slot"), vocabulary.tag).not.toBeNull()
      // `--ui-part` is declared on every part root by `parts.css`
      expect(getComputedStyle(box).getPropertyValue("--ui-part").trim(), vocabulary.tag).toBe(vocabulary.noun)
      expect(getComputedStyle(element).display, vocabulary.tag).toBe("contents")
    }
  })

  it("emits keyOnly classes, with yes / no booleans", async () => {
    expect(root(await render(`<ui-content image scrolling="yes"></ui-content>`)).className).toBe(
      "image scrolling content"
    )
    expect(root(await render(`<ui-content scrolling="no"></ui-content>`)).className).toBe("content")
    expect(root(await render(`<ui-extra text></ui-extra>`)).className).toBe("text extra")
    expect(root(await render(`<ui-value text></ui-value>`)).className).toBe("text value")
  })

  it("renders links, <time datetime> and avatar images", async () => {
    const author = await render(`<ui-author href="#matt" target="_blank">Matt</ui-author>`)
    expect(root(author).outerHTML).toMatch(/^<a class="author" part="author" href="#matt" target="_blank">/)
    const title = await render(`<ui-title href="#t">T</ui-title>`)
    expect(root(title).localName).toBe("a")
    const date = await render(`<ui-date datetime="2026-09-29">Today</ui-date>`)
    expect(root(date).getAttribute("datetime")).toBe("2026-09-29")
    const avatar = await render(`<ui-avatar src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></ui-avatar>`)
    const image = root(avatar).querySelector("img")!
    expect(image.getAttribute("part")).toBe("image")
    expect(image.getAttribute("alt")).toBe("")
    expect(root(avatar).querySelector("slot")).not.toBeNull()
  })
})

describe("<ui-header> standalone", () => {
  it("renders h1 ... h6 by level, a div without", async () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const element = await render(`<ui-header level="${level}">H</ui-header>`)
      expect(root(element).localName).toBe(`h${level}`)
      expect(root(element).className).toBe("ui header")
    }
    expect(root(await render(`<ui-header>H</ui-header>`)).localName).toBe("div")
    expect(root(await render(`<ui-header href="#h">H</ui-header>`)).localName).toBe("a")
  })

  it("builds Fomantic's header classes", async () => {
    const cases: [string, string][] = [
      [`size="huge"`, "ui huge header"],
      [`size="medium"`, "ui header"],
      [`color="red" dividing`, "ui red dividing header"],
      [`sub`, "ui sub header"],
      [`icon text-align="center"`, "ui icon center aligned header"],
      [`block`, "ui block header"],
      [`attached="top"`, "ui top attached header"],
      [`attached seamless`, "ui seamless attached header"],
      [`floated="right"`, "ui right floated header"],
      [`text-align="justified"`, "ui justified header"],
      [`fitted disabled inverted`, "ui disabled fitted inverted header"],
      [`inverted="no"`, "ui header"]
    ]
    for (const [attributes, expected] of cases) {
      const element = await render(`<ui-header ${attributes}>H</ui-header>`)
      expect(root(element).className, attributes).toBe(expected)
    }
  })

  it("sets the inverted owner token and the dark scheme for its parts", async () => {
    const element = await render(`<ui-header inverted>H<ui-header>Sub</ui-header></ui-header>`)
    const style = getComputedStyle(root(element))
    expect(style.getPropertyValue("--ui-inverted").trim()).toBe("1")
    expect(style.colorScheme).toBe("dark")
  })
})

describe("owner context", () => {
  it("owns a sub header and an icon header's content (the header is itself an owner)", async () => {
    const element = await render<UIHeader>(
      `<ui-header level="2" icon><ui-icon name="gear"></ui-icon><ui-content>Account<ui-header>Manage</ui-header></ui-content></ui-header>`
    )
    const content = element.querySelector<UIContent>("ui-content")!
    const sub = content.querySelector<UIHeader>("ui-header")!
    expect(ownerStates(element)).toEqual([])
    expect(ownerStates(content)).toEqual(["in-header"])
    expect(ownerStates(sub)).toEqual(["in-header"])
    expect(sub.owner!.owner).toBe(element)
    expect(sub.owner!.depth).toBe(1)
    expect(root(sub).outerHTML).toMatch(/^<div class="header" part="header">/)
  })

  it("renders an owned header bare, a heading only through ARIA", async () => {
    const card = await render<HTMLElement>(
      `<x-card><ui-content><ui-header level="3">Elliot</ui-header></ui-content></x-card>`
    )
    const header = card.querySelector<UIHeader>("ui-header")!
    expect(ownerStates(header)).toEqual(["in-card"])
    expect(root(header).localName).toBe("div")
    expect(root(header).className).toBe("header")
    expect(root(header).getAttribute("role")).toBe("heading")
    expect(root(header).getAttribute("aria-level")).toBe("3")
  })

  it("finds the owner across a SLOT boundary", async () => {
    const panel = await render<XPanel>(`<x-panel><ui-description>Slotted</ui-description></x-panel>`)
    const description = panel.querySelector<Part>("ui-description")!
    expect(ownerStates(description)).toEqual(["in-panel"])
    expect((description as UIContent).owner!.owner).toBe(panel)
  })

  it("finds the owner across a SHADOW boundary", async () => {
    const panel = await render<XPanel>(`<x-panel heading="Own"></x-panel>`)
    const header = panel.shadowRoot!.querySelector<UIHeader>("ui-header")!
    await header.updateComplete
    expect(ownerStates(header)).toEqual(["in-panel"])
    expect(header.owner!.owner).toBe(panel)
  })

  it("stops at a non-part component (a segment is a barrier)", async () => {
    const card = await render<HTMLElement>(
      `<x-card><ui-segment><ui-header>Standalone</ui-header></ui-segment></x-card>`
    )
    const header = card.querySelector<UIHeader>("ui-header")!
    expect(ownerStates(header)).toEqual([])
    expect(header.owner).toBeUndefined()
    expect(root(header).className).toBe("ui header")
  })

  it("resolves nested owners to the NEAREST", async () => {
    const outer = await render<HTMLElement>(
      `<x-card><ui-content><x-item><ui-content><ui-header>Inner</ui-header></ui-content></x-item></ui-content></x-card>`
    )
    const header = outer.querySelector<UIHeader>("ui-header")!
    expect(ownerStates(header)).toEqual(["in-item"])
    expect(header.owner!.owner.localName).toBe("x-item")
  })

  it("reads owner tokens from the nearest segment:  a header in a segment in a segment", async () => {
    const outer = await render<HTMLElement>(
      `<ui-segment inverted><ui-segment><ui-header>Plain</ui-header></ui-segment></ui-segment>`
    )
    const inner = outer.querySelector<HTMLElement>("ui-segment")!
    const header = inner.querySelector<UIHeader>("ui-header")!
    await settle(inner)
    expect(ownerStates(header)).toEqual([])
    const token = (element: Element) => getComputedStyle(root(element)).getPropertyValue("--ui-inverted").trim()
    expect(token(outer)).toBe("1")
    expect(token(header)).toBe("0")
    const flipped = await render<HTMLElement>(
      `<ui-segment><ui-segment inverted><ui-header>Dark</ui-header></ui-segment></ui-segment>`
    )
    const dark = flipped.querySelector<UIHeader>("ui-header")!
    await settle(flipped.querySelector("ui-segment")!)
    expect(token(dark)).toBe("1")
    expect(getComputedStyle(root(dark)).colorScheme).toBe("dark")
  })

  it("re-resolves when reparented", async () => {
    const card = await render<HTMLElement>(`<x-card><ui-description>Moving</ui-description></x-card>`)
    const description = card.querySelector<UIContent>("ui-description")!
    expect(ownerStates(description)).toEqual(["in-card"])
    const item = Fixture.render(`<x-item></x-item>`)
    item.append(description)
    expect(ownerStates(description)).toEqual(["in-item"])
    document.body.append(description)
    expect(ownerStates(description)).toEqual([])
    description.remove()
  })

  it("re-resolves on slotchange, without reconnecting", async () => {
    const panel = await render<XPanel>(`<x-panel><ui-header>Re-slotted</ui-header></x-panel>`)
    const header = panel.querySelector<UIHeader>("ui-header")!
    expect(ownerStates(header)).toEqual(["in-panel"])
    // into the slot inside the panel's segment:  the segment is a barrier now
    header.slot = "boxed"
    await new Promise((resolve) => setTimeout(resolve))
    expect(ownerStates(header)).toEqual([])
    header.slot = ""
    await new Promise((resolve) => setTimeout(resolve))
    expect(ownerStates(header)).toEqual(["in-panel"])
  })

  it("re-resolves when an owner registers late", async () => {
    const late = await render<HTMLElement>(`<x-late><ui-header>Waiting</ui-header></x-late>`)
    const header = late.querySelector<UIHeader>("ui-header")!
    expect(ownerStates(header)).toEqual([])
    OwnerStub.define("late", ["header"])
    expect(ownerStates(header)).toEqual(["in-late"])
    await header.updateComplete
    expect(root(header).className).toBe("header")
  })

  it("never sets the static in-<owner> class", async () => {
    const card = await render<HTMLElement>(`<x-card><ui-content><ui-meta>2 days</ui-meta></ui-content></x-card>`)
    for (const part of card.querySelectorAll("ui-content, ui-meta")) {
      expect(part.className).toBe("")
      expect(root(part).className).not.toMatch(/\bin-/)
    }
  })
})

describe("parts accessibility", () => {
  it.each(Object.keys(EXAMPLES))("passes axe on %s", async (path) => {
    const container = await render<HTMLElement>(EXAMPLES[path]!)
    await expectAccessible(container, AXE_OPTIONS)
  })
})

/**
 * NOTE: `color-contrast` is off, as for every component (see `REPORT.md`).  So is `heading-order`:  the
 * examples put Fomantic's `<h1>` ... `<h6>` demos under `<h4>` section titles, in the originals too.
 */
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false }, "heading-order": { enabled: false } } }
