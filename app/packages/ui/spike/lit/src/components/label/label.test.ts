import { describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { loadUI } from "$/runtime"
import type { AttributeSpec } from "$/vocabulary"
import { labelVocabulary } from "$/components/label/label.vocabulary.en"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"
import { AXTree } from "../../testing/AXTree"
import { OwnerStub } from "../parts/OwnerStub"
import type { UIDetail } from "../parts"
import type { UILabel, UILabels } from "./index"

import "./index"
import "../parts"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", { query: "?raw", import: "default", eager: true })

/** A 1x1 image. */
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACw="

/** Render `html`, wait for its first update. */
async function render<T extends UILabel | UILabels = UILabel>(html: string): Promise<T> {
  const element = Fixture.render<T>(html)
  await element.updateComplete
  return element
}

/** The root `<span>` / `<a>` / `<div>`. */
function root(element: UILabel | UILabels): HTMLElement {
  return element.shadowRoot!.firstElementChild as HTMLElement
}

describe("<ui-label> classes", () => {
  it("emits every keyOnly attribute's key", async () => {
    const specs: readonly AttributeSpec[] = labelVocabulary.attributes
    for (const spec of specs.filter((spec) => spec.kind === "keyOnly")) {
      const element = await render(`<ui-label ${spec.name}>Tag</ui-label>`)
      expect(root(element).className, spec.name).toBe(`ui ${spec.key ?? spec.name} label`)
    }
  })

  it("orders words as the grammar says", async () => {
    const element = await render(`<ui-label color="red" pointing="left" basic size="large">Tag</ui-label>`)
    expect(root(element).className).toBe("ui large red basic left pointing label")
  })

  it("emits keyOrValue attributes bare and with a value", async () => {
    const cases: [string, string][] = [
      ["corner", "corner"],
      [`corner="left"`, "left corner"],
      [`ribbon="right"`, "right ribbon"],
      [`attached="top right"`, "top right attached"],
      [`floating="bottom left"`, "bottom left floating"],
      [`pointing="below"`, "below pointing"]
    ]
    for (const [attribute, expected] of cases) {
      const element = await render(`<ui-label ${attribute}>Tag</ui-label>`)
      expect(root(element).className, attribute).toBe(`ui ${expected} label`)
    }
  })

  it("accepts yes / no booleans and treats medium as the default size", async () => {
    const yes = await render(`<ui-label basic="yes" size="medium">Tag</ui-label>`)
    const no = await render(`<ui-label basic="no">Tag</ui-label>`)
    expect(root(yes).className).toBe("ui basic label")
    expect(root(no).className).toBe("ui label")
  })

  it("sets active / disabled states", async () => {
    const element = await render(`<ui-label active disabled>Tag</ui-label>`)
    expect(element.matches(":state(active):state(disabled)")).toBe(true)
  })
})

describe("<ui-label> content", () => {
  it("renders image, icon, text, detail and delete in the contract's order", async () => {
    const element = await render(
      `<ui-label image="${PIXEL}" icon="user" detail="Friend" removable href="#v">Veronika</ui-label>`
    )
    const box = root(element)
    expect(box.localName).toBe("a")
    expect(box.getAttribute("href")).toBe("#v")
    const order = [...box.children].map((child) => `${child.localName}.${child.className}`)
    expect(order).toEqual(["img.image", "span.icon", "slot.", "span.detail", "button.delete icon"])
    expect(box.querySelector("img")!.getAttribute("src")).toBe(PIXEL)
    expect(box.querySelector("img")!.getAttribute("alt")).toBe("")
    expect(box.querySelector(".detail")!.textContent).toBe("Friend")
    expect([...box.querySelectorAll("[part]")].map((node) => node.getAttribute("part"))).toEqual([
      "image",
      "icon",
      "detail",
      "delete"
    ])
  })

  it("renders no <img> for a bare image label (it styles a slotted one)", async () => {
    const element = await render(`<ui-label image><img src="${PIXEL}" alt="" />Joe</ui-label>`)
    expect(root(element).className).toBe("ui image label")
    expect(root(element).querySelector("img")).toBeNull()
  })

  it("adds the icon class to an icon-only label", async () => {
    const only = await render(`<ui-label icon="check" aria-label="Checked"></ui-label>`)
    expect(root(only).className).toBe("ui label icon")
    const text = await render(`<ui-label icon="mail">Mail</ui-label>`)
    expect(root(text).className).toBe("ui label")
  })

  it("wraps a slotted icon in span.icon, and unwraps it when removed", async () => {
    const element = await render(`<ui-label><span slot="icon">*</span>Star</ui-label>`)
    expect(root(element).querySelector(".icon > slot[name=icon]")).not.toBeNull()
    element.querySelector("[slot=icon]")!.remove()
    await element.updateComplete
    await element.updateComplete
    expect(root(element).querySelector(".icon")).toBeNull()
  })

  it("forwards aria-label onto the root, as an image when it's a <span>", async () => {
    const element = await render(`<ui-label icon="check" aria-label="Checked"></ui-label>`)
    expect(root(element).getAttribute("role")).toBe("img")
    expect(root(element).getAttribute("aria-label")).toBe("Checked")
    expect(await AXTree.node(root(element))).toMatchObject({ role: "image", name: "Checked" })
    element.setAttribute("aria-label", "Done")
    await element.updateComplete
    expect(root(element).getAttribute("aria-label")).toBe("Done")
  })

  it("owns a slotted <ui-detail>", async () => {
    const element = await render(`<ui-label>Dogs<ui-detail>214</ui-detail></ui-label>`)
    const detail = element.querySelector<UIDetail>("ui-detail")!
    await detail.updateComplete
    expect(detail.matches(":state(in-label)")).toBe(true)
    expect(detail.shadowRoot!.firstElementChild!.outerHTML).toMatch(/^<span class="detail" part="detail">/)
  })
})

describe("<ui-label> removable", () => {
  it("dispatches a cancelable ui-remove and never removes itself", async () => {
    const element = await render(`<ui-label removable>Tag</ui-label>`)
    const button = root(element).querySelector<HTMLButtonElement>("button.delete")!
    expect(button.getAttribute("aria-label")).toBe("Remove")
    const events: CustomEvent[] = []
    element.addEventListener("ui-remove", (event) => events.push(event as CustomEvent))
    await userEvent.click(button)
    expect(events).toHaveLength(1)
    expect(events[0]!.cancelable).toBe(true)
    expect(events[0]!.detail.originalEvent).toBeInstanceOf(MouseEvent)
    expect(element.isConnected).toBe(true)
  })

  it("reports a cancelled ui-remove", async () => {
    const element = await render(`<ui-label removable>Tag</ui-label>`)
    let prevented = false
    element.addEventListener("ui-remove", (event) => {
      event.preventDefault()
      prevented = event.defaultPrevented
    })
    root(element).querySelector<HTMLButtonElement>("button.delete")!.click()
    expect(prevented).toBe(true)
  })

  it("disables the delete button and the link while disabled", async () => {
    const element = await render(`<ui-label removable disabled href="#x">Tag</ui-label>`)
    expect(root(element).hasAttribute("href")).toBe(false)
    expect(root(element).getAttribute("aria-disabled")).toBe("true")
    expect(root(element).querySelector("button")!.disabled).toBe(true)
  })
})

describe("<ui-label> texts", () => {
  it("registers its texts with UI.i18n, so a translation pack wins", async () => {
    const ui = await loadUI()
    expect(ui.i18n.has("remove")).toBe(true)
    const locale = ui.i18n.locale
    ui.i18n.register("xx", { remove: "Quitar" })
    ui.i18n.locale = "xx"
    try {
      const element = await render(`<ui-label removable>Tag</ui-label>`)
      expect(root(element).querySelector("button")!.getAttribute("aria-label")).toBe("Quitar")
    } finally {
      ui.i18n.locale = locale
    }
  })
})

describe("<ui-label> in a statistic", () => {
  it("renders the statistic's div.label part and adopts parts.css", async () => {
    OwnerStub.define("statistic", ["label", "value"])
    const statistic = Fixture.render(
      `<x-statistic><ui-value>5,550</ui-value><ui-label>Downloads</ui-label></x-statistic>`
    )
    const label = statistic.querySelector<UILabel>("ui-label")!
    await label.updateComplete
    expect(label.matches(":state(in-statistic)")).toBe(true)
    expect(root(label).outerHTML).toBe(`<div class="label" part="label"><slot></slot></div>`)
    const ui = await loadUI()
    expect(label.shadowRoot!.adoptedStyleSheets).toContain(ui.styles.sheet("parts"))
  })
})

describe("<ui-labels>", () => {
  it("renders the group root", async () => {
    const group = await render<UILabels>(`<ui-labels size="huge" color="blue" tag><ui-label>A</ui-label></ui-labels>`)
    expect(root(group).className).toBe("ui huge blue tag labels")
    expect(root(group).getAttribute("part")).toBe("group")
  })
})

describe("<ui-label> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("passes axe on %s", async (path) => {
    const container = Fixture.render(EXAMPLES[path]!)
    const elements = [...container.querySelectorAll<UILabel>("ui-label, ui-labels, ui-detail")]
    await Promise.all(elements.map((element) => element.updateComplete))
    await expectAccessible(container, AXE_OPTIONS)
  })
})

/**
 * NOTE: `color-contrast` is off:  the palette fails 4.5:1 on the ORIGINAL class-grammar fragments too (a token
 * issue in `colors.css`, see `REPORT.md`).
 */
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } }
