import { describe, expect, it } from "vitest"

import { UI } from "$/runtime"
import { expectAccessible } from "$test/a11y"

import { SpikeFixture } from "$spike/SpikeFixture"
import type { UIHost } from "$spike/UIHost"

import "$spike/components/label"
import "$spike/components/icon"
import "$spike/components/parts"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/demo/examples/label/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A tiny image URL. */
const IMAGE = "data:image/gif;base64,R0lGODlhAQABAAAAACw="

/** Render one `<ui-label>`;  returns it with its root. */
async function label(html: string) {
  const host = await SpikeFixture.render<UIHost>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=label]")!
  return { host, root }
}

describe("<ui-label> definition", () => {
  it("registers its texts with UI.i18n when DEFINED, before any instance exists", async () => {
    expect(document.querySelector("ui-label")).toBeNull()
    await UI.load()
    expect(UI.i18n.has("remove")).toBe(true)
    expect(UI.i18n.t("remove")).toBe("Remove")
  })
})

describe("<ui-label> classes", () => {
  it.each([
    ["", "ui label"],
    ['size="small"', "ui small label"],
    ['size="medium"', "ui label"],
    ['color="red" basic', "ui red basic label"],
    ['basic="no"', "ui label"],
    ['basic="yes"', "ui basic label"],
    ["tag", "ui tag label"],
    ["corner", "ui corner label"],
    ['corner="left"', "ui left corner label"],
    ["ribbon", "ui ribbon label"],
    ['ribbon="right"', "ui right ribbon label"],
    ["pointing", "ui pointing label"],
    ['pointing="below"', "ui below pointing label"],
    ['floating="left"', "ui left floating label"],
    ['attached="top right"', "ui top right attached label"],
    ["horizontal circular empty", "ui circular empty horizontal label"],
    ["fluid centered", "ui centered fluid label"],
    ["prompt", "ui prompt label"],
    ["active disabled inverted", "ui active disabled inverted label"],
    // `image` is a string kind:  no grammar slot, so the element adds the class as an extra, after the noun
    ["image", "ui label image"]
  ])("<ui-label %s>", async (attributes, classes) => {
    const { root } = await label(`<ui-label ${attributes}>Text</ui-label>`)
    expect(root.className).toBe(classes)
  })

  it("adds `icon` for an icon without text, not with text", async () => {
    const { root: alone } = await label(`<ui-label icon="check" aria-label="Checked"></ui-label>`)
    expect(alone.className).toBe("ui label icon")
    const { root: withText } = await label(`<ui-label icon="envelope">Mail</ui-label>`)
    expect(withText.className).toBe("ui label")
    const { root: slotted } = await label(
      `<ui-label aria-label="Checked"><ui-icon slot="icon" name="check"></ui-icon></ui-label>`
    )
    expect(slotted.className).toBe("ui label icon")
  })

  it("sets `:state(active)` / `:state(disabled)`", async () => {
    const { host } = await label(`<ui-label active disabled>x</ui-label>`)
    expect(host.matches(":state(active)")).toBe(true)
    expect(host.matches(":state(disabled)")).toBe(true)
  })
})

describe("<ui-label> content", () => {
  it("renders children in contract order:  image, icon, slot, detail, delete", async () => {
    const { root } = await label(`<ui-label image="${IMAGE}" icon="user" detail="Friend" removable>Veronika</ui-label>`)
    expect([...root.children].map((child) => `${child.localName}.${child.getAttribute("part")}`)).toEqual([
      "img.image",
      "span.icon",
      "slot.null",
      "span.detail",
      "button.delete"
    ])
    const image = root.querySelector("img")!
    expect(image.className).toBe("image")
    expect(image.getAttribute("alt")).toBe("")
    expect(root.querySelector(".detail")!.textContent).toBe("Friend")
    const remove = root.querySelector("button")!
    expect(remove.className).toBe("delete icon")
    expect(remove.getAttribute("aria-label")).toBe("Remove")
    await expect.poll(() => remove.querySelector("svg")).not.toBeNull()
  })

  it("renders <a> for href, and the icon box only when there's an icon", async () => {
    const { root } = await label(`<ui-label href="#tag" target="_blank">Tag</ui-label>`)
    expect(root.localName).toBe("a")
    expect(root.getAttribute("href")).toBe("#tag")
    expect(root.getAttribute("target")).toBe("_blank")
    expect(root.querySelector("[part~=icon]")).toBeNull()
    const { root: withIcon } = await label(`<ui-label icon="envelope">Mail</ui-label>`)
    const box = withIcon.querySelector("[part~=icon]")!
    expect(box.className).toBe("icon")
    await expect.poll(() => box.querySelector("svg")).not.toBeNull()
  })

  it("forwards the host's aria-label to the root", async () => {
    const { host, root } = await label(
      `<ui-label corner="left" href="#like" icon="heart" aria-label="Like"></ui-label>`
    )
    expect(root.getAttribute("aria-label")).toBe("Like")
    host.setAttribute("aria-label", "Love")
    await expect.poll(() => root.getAttribute("aria-label")).toBe("Love")
  })

  it("styles a bare `image` label's slotted <img>, without rendering one", async () => {
    const { root } = await label(`<ui-label image><img src="${IMAGE}" alt="">Joe</ui-label>`)
    expect(root.classList.contains("image")).toBe(true)
    expect(root.querySelector("img")).toBeNull()
  })
})

describe("<ui-label> remove", () => {
  it("dispatches a cancelable, composed ui-remove from the delete button", async () => {
    const { host, root } = await label(`<ui-label removable>Tag</ui-label>`)
    const events: CustomEvent[] = []
    document.addEventListener("ui-remove", (event) => events.push(event as CustomEvent), { once: true })
    root.querySelector("button")!.click()
    expect(events).toHaveLength(1)
    const [event] = events
    expect(event!.target).toBe(host)
    expect(event!.cancelable).toBe(true)
    expect(event!.composed).toBe(true)
    expect(event!.detail.originalEvent).toBeInstanceOf(MouseEvent)
    // the label never removes itself
    expect(host.isConnected).toBe(true)
  })

  it("reports a cancelled ui-remove", async () => {
    const { host, root } = await label(`<ui-label removable>Tag</ui-label>`)
    let prevented = false
    host.addEventListener("ui-remove", (event) => {
      event.preventDefault()
      queueMicrotask(() => (prevented = event.defaultPrevented))
    })
    root.querySelector("button")!.click()
    await SpikeFixture.tick()
    expect(prevented).toBe(true)
    expect(host.isConnected).toBe(true)
  })

  it("doesn't fire while disabled", async () => {
    const { host, root } = await label(`<ui-label removable disabled>Tag</ui-label>`)
    let fired = 0
    host.addEventListener("ui-remove", () => fired++)
    root.querySelector("button")!.click()
    expect(fired).toBe(0)
    expect((root.querySelector("button") as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("<ui-labels>", () => {
  it("renders the group", async () => {
    const group = await SpikeFixture.render<UIHost>(
      `<ui-labels size="huge" color="blue" basic tag><ui-label>A</ui-label></ui-labels>`
    )
    const root = group.shadowRoot!.querySelector("[part~=group]")!
    expect(root.className).toBe("ui huge blue basic tag labels")
    expect(root.querySelector("slot")).not.toBeNull()
  })

  it("hands its look to the labels in it", async () => {
    const group = await SpikeFixture.render<UIHost>(`<ui-labels circular><ui-label>1</ui-label></ui-labels>`)
    const child = group.querySelector("ui-label")!.shadowRoot!.querySelector<HTMLElement>("[part~=label]")!
    const plain = await SpikeFixture.render<UIHost>(`<ui-label>1</ui-label>`)
    const plainRoot = plain.shadowRoot!.querySelector<HTMLElement>("[part~=label]")!
    expect(getComputedStyle(child).borderRadius).not.toBe(getComputedStyle(plainRoot).borderRadius)
  })
})

describe("<ui-label> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await SpikeFixture.render(EXAMPLES[path]!)
    await expectAccessible(root, { rules: { "color-contrast": { enabled: false } } })
  })
})
