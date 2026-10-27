import { describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"

import { UI } from "spell/ui/runtime"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-modal"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-button/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one `<ui-button>` and return it with its inner control. */
async function button(html: string) {
  const host = await ElementFixture.render<DOMElement>(html)
  const control = host.shadowRoot!.querySelector<HTMLElement>("[part~=button]")!
  return { host, control }
}

////////////////
// ## Classes
////////////////

describe("<ui-button> classes", () => {
  it.each([
    ["", "ui button"],
    ['color="primary"', "ui primary button"],
    ['color="primary"', "ui primary button"],
    ["", "ui button"],
    ["", "ui button"],
    ['size="small"', "ui small button"],
    ['size="medium"', "ui button"],
    ['color="red"', "ui red button"],
    ['color="rde"', "ui button"],
    ['color="secondary" appearance="basic"', "ui secondary basic button"],
    ['color="positive"', "ui positive button"],
    ['color="negative" appearance="tertiary"', "ui negative tertiary button"],
    ["inverted", "ui inverted button"],
    ['fluid appearance="circular" padding="compact"', "ui compact fluid circular button"],
    ['padding="none"', "ui unpadded button"],
    ["wrap", "ui wrapped button"],
    ["ellipsis fluid", "ui ellipsis fluid button"],
    ["selected", "ui active button"],
    ["disabled", "ui disabled button"],
    ["loading", "ui loading button"],
    ["toggle", "ui toggle button"],
    ["labeled", "ui labeled button"],
    ['labeled="right"', "ui right labeled button"],
    ['reveal="slide"', "ui animated button"],
    ['reveal="fade"', "ui fade animated button"],
    ['attach="top"', "ui top attached button"],
    // `floated` is gone (epic ui-gaps P8):  a `<ui-stack>` places buttons
    ["floated", "ui button"]
  ])("<ui-button %s>", async (attributes, classes) => {
    const { control } = await button(`<ui-button ${attributes}>Go</ui-button>`)
    expect(control.className).toBe(classes)
  })

  it("adds `icon` for icon-only and `labeled icon` buttons", async () => {
    const { control: iconOnly } = await button(`<ui-button icon="cloud" aria-label="Cloud"></ui-button>`)
    expect(iconOnly.className).toBe("ui icon button")
    const { control: labeledIcon } = await button(`<ui-button labeled icon="pause">Pause</ui-button>`)
    expect(labeledIcon.className).toBe("ui labeled icon button")
    const { control: withText } = await button(`<ui-button icon="pause">Pause</ui-button>`)
    expect(withText.className).toBe("ui button")
  })

  it("follows attribute and property changes", async () => {
    const { host, control } = await button(`<ui-button>Go</ui-button>`)
    host.setAttribute("color", "blue")
    await ElementFixture.tick()
    expect(control.className).toBe("ui blue button")
    ;(host as unknown as { appearance: string }).appearance = "basic"
    await ElementFixture.tick()
    expect(control.className).toBe("ui blue basic button")
    expect(host.getAttribute("appearance")).toBe("basic")
    ;(host as unknown as { appearance: string | undefined }).appearance = undefined
    await ElementFixture.tick()
    expect(host.hasAttribute("appearance")).toBe(false)
  })

  it("wraps a joined label in a `labeled` root", async () => {
    const { host } = await button(`<ui-button labeled="left" color="red" icon="heart" badge="2,048">Like</ui-button>`)
    const root = host.shadowRoot!.firstElementChild!
    expect(root.className).toBe("ui red left labeled button")
    expect(root.querySelector("[part~=button]")!.className).toBe("ui red button")
    expect(root.querySelector("[part~=label]")!.textContent).toBe("2,048")
  })

  it("sets host states for layout", async () => {
    const { host } = await button(`<ui-button attach="top">Go</ui-button>`)
    expect(host.matches(":state(fluid)")).toBe(true)
  })

  it("hides with the `hidden` attribute, fluid or not", async () => {
    const { host } = await button(`<ui-button hidden>Go</ui-button>`)
    expect(getComputedStyle(host).display).toBe("none")
    host.setAttribute("fluid", "")
    await ElementFixture.settle()
    expect(getComputedStyle(host).display).toBe("none")
    host.removeAttribute("hidden")
    expect(getComputedStyle(host).display).toBe("flex")
  })
})

////////////////
// ## Padding and text
////////////////

describe("<ui-button> padding and text", () => {
  /** A long-text button in a parent narrower than its text. */
  async function narrow(attributes: string) {
    const wrapper = await ElementFixture.render(
      `<div style="width: 6em"><ui-button ${attributes}>Save every change to this document</ui-button></div>`
    )
    const host = wrapper.querySelector<DOMElement>("ui-button")!
    const control = host.shadowRoot!.querySelector<HTMLElement>("[part~=button]")!
    return { wrapper, host, control }
  }

  it("`unpadded`:  no padding at all, where `compact` keeps some", async () => {
    const { control: unpadded } = await button(`<ui-button padding="none">Go</ui-button>`)
    const style = getComputedStyle(unpadded)
    expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual([
      "0px",
      "0px",
      "0px",
      "0px"
    ])
    const { control: compact } = await button(`<ui-button padding="compact">Go</ui-button>`)
    expect(parseFloat(getComputedStyle(compact).paddingTop)).toBeGreaterThan(0)
  })

  it("keeps its text on one line by default, however narrow its parent;  `wrapped` lets it wrap", async () => {
    const { control: oneLine } = await narrow("")
    const { control: short } = await button(`<ui-button>Go</ui-button>`)
    expect(getComputedStyle(oneLine).whiteSpace).toBe("nowrap")
    expect(oneLine.getBoundingClientRect().height).toBeCloseTo(short.getBoundingClientRect().height, 0)
    const { control: wrapped } = await narrow("wrap")
    expect(wrapped.getBoundingClientRect().height).toBeGreaterThan(oneLine.getBoundingClientRect().height * 1.5)
  })

  it("`ellipsis`:  one line, cut off with `…`, and never wider than its parent", async () => {
    const { wrapper, host, control } = await narrow("ellipsis")
    expect(host.matches(":state(ellipsis)")).toBe(true)
    const style = getComputedStyle(control)
    expect(style.textOverflow).toBe("ellipsis")
    expect(style.overflowX).toBe("hidden")
    expect(style.whiteSpace).toBe("nowrap")
    expect(host.getBoundingClientRect().width).toBeLessThanOrEqual(wrapper.getBoundingClientRect().width)
    // The text is longer than the box it's cut to
    expect(control.scrollWidth).toBeGreaterThan(control.clientWidth)
  })

  it("`ellipsis` beats `wrapped`:  still one line", async () => {
    const { control } = await narrow("ellipsis wrap")
    expect(getComputedStyle(control).whiteSpace).toBe("nowrap")
  })

  it("a lone icon-only button is SQUARE, the icon centred;  one in a group keeps the group's padding", async () => {
    const { control } = await button(`<ui-button icon="cloud" aria-label="Cloud"></ui-button>`)
    const bounds = control.getBoundingClientRect()
    expect(bounds.width).toBeCloseTo(bounds.height, 1)
    const icon = control.querySelector(".icon")!.getBoundingClientRect()
    expect(icon.left + icon.width / 2).toBeCloseTo(bounds.left + bounds.width / 2, 0)
    const { control: small } = await button(`<ui-button size="small" icon="cloud" aria-label="Cloud"></ui-button>`)
    const smallBounds = small.getBoundingClientRect()
    expect(smallBounds.width).toBeCloseTo(smallBounds.height, 1)
    const group = await ElementFixture.render(
      `<ui-buttons icon><ui-button icon="bold" aria-label="Bold"></ui-button></ui-buttons>`
    )
    const grouped = group.querySelector("ui-button")!.shadowRoot!.querySelector("[part~=button]")!
    expect(parseFloat(getComputedStyle(grouped).paddingLeft)).toBeGreaterThan(0)
  })

  it("`attach` top / bottom:  as wide as what it's joined to;  its corners the theme's, never a pill's", async () => {
    const box = await ElementFixture.render(
      `<div style="width: 400px; --ui-button-radius: 9999px; --ui-radius: 6px">` +
        `<ui-button attach="top">Top</ui-button></div>`
    )
    const control = box.querySelector("ui-button")!.shadowRoot!.querySelector<HTMLElement>("[part~=button]")!
    expect(control.getBoundingClientRect().width).toBeCloseTo(400, 0)
    const style = getComputedStyle(control)
    expect([style.borderTopLeftRadius, style.borderBottomLeftRadius]).toEqual(["6px", "0px"])
  })
})

////////////////
// ## Tooltip
////////////////

describe("<ui-button> tooltip", () => {
  it("an icon-only button shows its `aria-label` as the browser's tooltip, and follows it", async () => {
    const { host, control } = await button(`<ui-button icon="cloud" aria-label="Cloud"></ui-button>`)
    expect(control.getAttribute("title")).toBe("Cloud")
    host.setAttribute("aria-label", "Upload")
    await ElementFixture.settle()
    expect(control.getAttribute("title")).toBe("Upload")
  })

  it("leaves the title alone with text of its own, or a `title` of the page's", async () => {
    const { control: withText } = await button(`<ui-button icon="cloud" aria-label="Cloud">Upload</ui-button>`)
    expect(withText.hasAttribute("title")).toBe(false)
    const { control: titled } = await button(`<ui-button icon="cloud" aria-label="Cloud" title="Send"></ui-button>`)
    expect(titled.hasAttribute("title")).toBe(false)
    const { control: link } = await button(`<ui-button link="#x" icon="cloud" aria-label="Cloud"></ui-button>`)
    expect(link.getAttribute("title")).toBe("Cloud")
  })
})

////////////////
// ## Behaviour
////////////////

describe("<ui-button> behaviour", () => {
  it("toggles `active` with aria-pressed and ui-selected / ui-deselected", async () => {
    const { host, control } = await button(`<ui-button toggle>Vote</ui-button>`)
    const events: boolean[] = []
    for (const type of ["ui-selected", "ui-deselected"])
      host.addEventListener(type, (event) => events.push((event as CustomEvent).detail.active))
    expect(control.getAttribute("aria-pressed")).toBe("false")
    control.click()
    await ElementFixture.tick()
    expect(events).toEqual([true])
    expect(control.getAttribute("aria-pressed")).toBe("true")
    expect(control.classList.contains("active")).toBe(true)
    expect(host.matches(":state(active)")).toBe(true)
  })

  it("lets a controlling host veto the toggle from its handler", async () => {
    const { host, control } = await button(`<ui-button toggle selected>Vote</ui-button>`)
    host.addEventListener("ui-deselected", () => ((host as unknown as { selected: boolean }).selected = true))
    control.click()
    await ElementFixture.tick()
    expect(control.getAttribute("aria-pressed")).toBe("true")
  })

  it("state texts (Fomantic's `state`):  the text follows `selected`;  the label carries it, so no aria-pressed", async () => {
    const { host, control } = await button(
      `<ui-button toggle inactive-text="Follow" active-text="Following">Ignored</ui-button>`
    )
    const events: boolean[] = []
    for (const type of ["ui-selected", "ui-deselected"])
      host.addEventListener(type, (event) => events.push((event as CustomEvent).detail.active))
    expect(control.textContent).toBe("Follow")
    expect(control.querySelector("slot")).toBeNull()
    expect(control.hasAttribute("aria-pressed")).toBe(false)
    control.click()
    await ElementFixture.tick()
    expect(events).toEqual([true])
    expect(control.textContent).toBe("Following")
    expect(host.matches(":state(active)")).toBe(true)
    control.click()
    await ElementFixture.tick()
    expect(control.textContent).toBe("Follow")
    await expectAccessible(host)
  })

  it("a single state text:  the content shows in the other state;  a host-set `selected` switches it", async () => {
    const { host, control } = await button(`<ui-button active-text="Voted">Vote</ui-button>`)
    expect(control.querySelector("slot")).not.toBeNull()
    ;(host as unknown as { selected: boolean }).selected = true
    await ElementFixture.tick()
    expect(control.textContent).toBe("Voted")
  })

  it("blocks clicks while disabled", async () => {
    const { host, control } = await button(`<ui-button disabled>Nope</ui-button>`)
    const clicked = vi.fn()
    host.addEventListener("click", clicked)
    expect((control as HTMLButtonElement).disabled).toBe(true)
    control.click()
    host.click()
    expect(clicked).not.toHaveBeenCalled()
    expect(host.matches(":state(disabled)")).toBe(true)
  })

  it("submits its form with name=value via requestSubmit()", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(
      `<form><input name="q" value="x"><ui-button type="submit" name="go" value="yes">Go</ui-button></form>`
    )
    const spy = vi.spyOn(HTMLFormElement.prototype, "requestSubmit")
    let data: [string, FormDataEntryValue][] = []
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      data = [...new FormData(form)]
    })
    form.querySelector("ui-button")!.shadowRoot!.querySelector("button")!.click()
    expect(spy).toHaveBeenCalledOnce()
    expect(data).toEqual([
      ["q", "x"],
      ["go", "yes"]
    ])
    expect([...new FormData(form)]).toEqual([["q", "x"]])
    spy.mockRestore()
  })

  it("resets its form with type=reset", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(
      `<form><input name="q" value="x"><ui-button type="reset">Reset</ui-button></form>`
    )
    const input = form.querySelector("input")!
    input.value = "changed"
    form.querySelector("ui-button")!.shadowRoot!.querySelector("button")!.click()
    expect(input.value).toBe("x")
  })

  it("renders the `icon` attribute as an svg", async () => {
    const { control } = await button(`<ui-button icon="cloud" aria-label="Cloud"></ui-button>`)
    await expect.poll(() => control.querySelector(".icon svg path")).not.toBeNull()
    expect(control.querySelector(".icon svg")!.getAttribute("aria-hidden")).toBe("true")
  })

  it("renders <a> for href", async () => {
    const { control } = await button(`<ui-button link="#x">Link</ui-button>`)
    expect(control.localName).toBe("a")
    expect(control.getAttribute("href")).toBe("#x")
    expect(control.hasAttribute("download")).toBe(false)
  })

  it("forwards `download` to the link, bare or naming the file", async () => {
    const { control: bare } = await button(`<ui-button link="logo.svg" download>SVG</ui-button>`)
    expect(bare.getAttribute("download")).toBe("")
    const { host, control: named } = await button(`<ui-button link="logo.svg" download="spell.svg">SVG</ui-button>`)
    expect(named.getAttribute("download")).toBe("spell.svg")
    host.removeAttribute("download")
    await ElementFixture.tick()
    expect(named.hasAttribute("download")).toBe(false)
  })

  it('`icon-position="right"` puts the icon box after the text, as a `right icon`', async () => {
    const { control } = await button(`<ui-button icon="arrow-right" icon-position="right">Next</ui-button>`)
    const children = [...control.children].map(
      (child) => child.localName + (child.className ? `.${child.className}` : "")
    )
    expect(children).toEqual(["slot", "span.right icon"])
    expect(control.className).toBe("ui button")
    const { control: leading } = await button(`<ui-button icon="arrow-left">Back</ui-button>`)
    expect([...leading.children].map((child) => child.localName)).toEqual(["span", "slot"])
  })

  it('`icon-position="right"` spaces the icon from the text on its start side', async () => {
    const { control } = await button(
      `<ui-button icon="arrow-right" icon-position="right" style="--ui-button-icon-spacing: 6px">Next</ui-button>`
    )
    const style = getComputedStyle(control.querySelector(".icon")!)
    expect(style.marginInlineStart).toBe("6px")
    expect(style.marginInlineEnd).toBe("-3px")
  })

  it("`host.click()` presses the inner control:  submits its form, ONE click reaching the page", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(
      `<form><ui-button type="submit" name="go" value="yes">Go</ui-button></form>`
    )
    const host = form.querySelector<HTMLElement>("ui-button")!
    const submitted = vi.fn((event: Event) => event.preventDefault())
    const clicks = vi.fn()
    form.addEventListener("submit", submitted)
    form.addEventListener("click", clicks)
    host.click()
    expect(submitted).toHaveBeenCalledOnce()
    expect(clicks).toHaveBeenCalledOnce()
    expect(clicks.mock.calls[0]![0].target).toBe(host)
  })

  it("`host.click()`:  a host listener added BEFORE the element connected still sees one click", async () => {
    const host = document.createElement("ui-button")
    host.setAttribute("toggle", "")
    host.textContent = "Mute"
    const clicks = vi.fn()
    host.addEventListener("click", clicks)
    const wrapper = await ElementFixture.render(`<div></div>`)
    wrapper.append(host)
    await ElementFixture.settle(wrapper)
    host.click()
    await ElementFixture.tick()
    expect(clicks).toHaveBeenCalledOnce()
    expect(host.matches(":state(active)")).toBe(true)
  })

  it("`host.click()` vetoed by an earlier listener's preventDefault() presses nothing", async () => {
    const { host } = await button(`<ui-button toggle>Mute</ui-button>`)
    const wrapper = host.parentElement!
    wrapper.addEventListener("click", (event) => event.preventDefault(), { capture: true })
    host.click()
    await ElementFixture.tick()
    expect(host.matches(":state(active)")).toBe(false)
  })

  it("`host.click()` toggles a toggle button", async () => {
    const { host } = await button(`<ui-button toggle>Mute</ui-button>`)
    host.click()
    await ElementFixture.tick()
    expect(host.matches(":state(active)")).toBe(true)
  })

  it("delegates focus to the inner control", async () => {
    const { host, control } = await button(`<ui-button>Focus</ui-button>`)
    host.focus()
    expect(host.shadowRoot!.activeElement).toBe(control)
  })

  it("keeps a property set before upgrade (upgrade backstop)", async () => {
    const element = document.createElement("div")
    element.innerHTML = "<ui-later>x</ui-later>"
    const later = element.firstElementChild as HTMLElement & { color?: string }
    later.color = "red"
    const { UIButton } = await import("spell/ui/components/ui-button")
    UIButton.define("ui-later")
    document.body.append(element)
    await ElementFixture.settle(element)
    expect(later.shadowRoot!.querySelector("button")!.className).toBe("ui red button")
    element.remove()
  })
})

////////////////
// ## <ui-buttons> / <ui-or>
////////////////

describe("<ui-buttons> / <ui-or>", () => {
  it("renders a group and an or", async () => {
    const group = await ElementFixture.render<DOMElement>(
      `<ui-buttons appearance="basic" width="3"><ui-button>A</ui-button><ui-or></ui-or><ui-button>B</ui-button></ui-buttons>`
    )
    const root = group.shadowRoot!.firstElementChild!
    expect(root.className).toBe("ui basic three buttons")
    expect(root.getAttribute("role")).toBe("group")
    expect(group.matches(":state(fluid)")).toBe(true)
    const or = group.querySelector("ui-or")!
    expect(or.matches(":state(or)")).toBe(true)
    expect(or.shadowRoot!.querySelector(".or")!.getAttribute("data-text")).toBe("or")
  })

  it("renders `equal width`", async () => {
    const group = await ElementFixture.render<DOMElement>(
      `<ui-buttons width="equal"><ui-button>A</ui-button></ui-buttons>`
    )
    expect(group.shadowRoot!.firstElementChild!.className).toBe("ui equal width buttons")
  })

  it("`equal`:  every button as wide as the widest, the group hugging them", async () => {
    const natural = await group("")
    const widest = Math.max(...natural.buttons.map((button) => button.getBoundingClientRect().width))
    const { host, root, buttons } = await group("equal")
    expect(root.className).toBe("ui equal buttons")
    expect(host.matches(":state(fluid)")).toBe(false)
    for (const button of buttons) expect(button.getBoundingClientRect().width).toBeCloseTo(widest, -0.5)
    expect(root.getBoundingClientRect().width).toBeLessThan(GROUP_WIDTH)
  })

  it("`equal fluid`:  an equal share of the row each, as the older `width`", async () => {
    const { root, buttons } = await group("equal fluid")
    const share = root.clientWidth / buttons.length
    for (const button of buttons) expect(button.getBoundingClientRect().width).toBeCloseTo(share, -0.5)
    const older = await group('width="3"')
    expect(older.buttons.map((button) => Math.round(button.getBoundingClientRect().width))).toEqual(
      buttons.map((button) => Math.round(button.getBoundingClientRect().width))
    )
  })
})

describe("<ui-buttons> track", () => {
  it("`<ui-or>` leaves no gap:  the buttons beside it meet under its badge", async () => {
    const group = await ElementFixture.render(
      `<ui-buttons><ui-button>Cancel</ui-button><ui-or></ui-or><ui-button>Save</ui-button></ui-buttons>`
    )
    const [cancel, save] = [...group.querySelectorAll("ui-button")].map((it) => it.getBoundingClientRect())
    expect(save!.left - cancel!.right).toBeCloseTo(0, 1)
    const badge = group.querySelector("ui-or")!.shadowRoot!.querySelector(".or")!
    expect(getComputedStyle(badge, "::before").width).not.toBe("0px")
  })

  it("`wrapping`:  a track behind each row, round at both ends, with a gap between rows", async () => {
    const words = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"]
    const box = await ElementFixture.render(
      `<div style="width: 300px"><ui-buttons wrapping>` +
        words.map((word) => `<ui-button>${word}</ui-button>`).join("") +
        `</ui-buttons></div>`
    )
    const host = box.querySelector<DOMElement>("ui-buttons")!
    const track = host.shadowRoot!.firstElementChild as HTMLElement
    await expect.poll(() => track.querySelectorAll(".row").length).toBeGreaterThan(1)
    const rows = [...track.querySelectorAll<HTMLElement>(".row")].map((row) => row.getBoundingClientRect())
    for (const [above, below] of rows.slice(0, -1).map((row, at) => [row, rows[at + 1]!] as const)) {
      expect(below.top - above.bottom).toBeGreaterThan(0)
    }
    // every button sits inside a row's track
    for (const button of host.querySelectorAll("ui-button")) {
      const bounds = button.getBoundingClientRect()
      expect(rows.some((row) => bounds.top >= row.top && bounds.bottom <= row.bottom)).toBe(true)
    }
    // the rows draw the track now, not the group's own box
    expect(getComputedStyle(track).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    expect(getComputedStyle(track.querySelector(".row")!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  })

  it("a group that doesn't wrap draws no rows", async () => {
    const host = await ElementFixture.render<DOMElement>(`<ui-buttons><ui-button>A</ui-button></ui-buttons>`)
    expect(host.shadowRoot!.querySelectorAll(".row")).toHaveLength(0)
  })

  it("`trackless`:  buttons with their OWN outline or fill sit joined, with no track round them", async () => {
    const host = await ElementFixture.render<DOMElement>(
      `<ui-buttons><ui-button>Cancel</ui-button><ui-button color="positive">Save</ui-button></ui-buttons>`
    )
    const track = host.shadowRoot!.firstElementChild as HTMLElement
    await expect.poll(() => track.className).toBe("ui trackless buttons")
    expect(getComputedStyle(track)).toMatchObject({ backgroundColor: "rgba(0, 0, 0, 0)", paddingTop: "0px" })
    const [cancel, save] = [...host.querySelectorAll("ui-button")].map((it) => it.getBoundingClientRect())
    expect(save!.left - cancel!.right).toBeCloseTo(0, 1)
    expect(save!.top).toBeCloseTo(track.getBoundingClientRect().top, 1)
    // a plain button among them keeps its own fill, square where it meets the next
    const plain = getComputedStyle(host.querySelector("ui-button")!.shadowRoot!.querySelector("[part~=button]")!)
    expect(plain.backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
    expect(plain.borderTopRightRadius).toBe("0px")
  })

  it("`trackless` follows its buttons:  `basic` ones too, and back to a track when none draws its own", async () => {
    const host = await ElementFixture.render<DOMElement>(
      `<ui-buttons><ui-button appearance="basic" color="red">One</ui-button><ui-button appearance="basic">Two</ui-button></ui-buttons>`
    )
    const track = host.shadowRoot!.firstElementChild as HTMLElement
    await expect.poll(() => track.classList.contains("trackless")).toBe(true)
    const [red, old] = [...host.querySelectorAll("ui-button")]
    red!.removeAttribute("color")
    red!.removeAttribute("appearance")
    await expect.poll(() => track.classList.contains("trackless")).toBe(true)
    old!.removeAttribute("appearance")
    await expect.poll(() => track.classList.contains("trackless")).toBe(false)
    expect(getComputedStyle(track).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  })

  it("`circular` and spaced groups:  as much room between rows as between buttons", async () => {
    for (const attributes of ['appearance="circular"', 'spacing="md"']) {
      const box = await ElementFixture.render(
        `<div style="width: 200px"><ui-buttons wrapping padding="compact" ${attributes}>` +
          `<ui-button>One</ui-button><ui-button>Two</ui-button><ui-button>Three</ui-button><ui-button>Four</ui-button>` +
          `</ui-buttons></div>`
      )
      const [one, two, ...rest] = [...box.querySelectorAll("ui-button")].map((it) => it.getBoundingClientRect())
      const nextRow = rest.find((it) => it.top > one!.bottom)!
      expect(two!.top, attributes).toBeCloseTo(one!.top, 0)
      expect(nextRow.top - one!.bottom, attributes).toBeCloseTo(two!.left - one!.right, 0)
      expect(two!.left - one!.right, attributes).toBeGreaterThan(0)
    }
  })
})

/** Width of the box `group()` renders a button group in. */
const GROUP_WIDTH = 800

/** A `<ui-buttons attributes>` of three uneven buttons in a `GROUP_WIDTH` box;  returns it, its root and button boxes. */
async function group(attributes: string) {
  const box = await ElementFixture.render(
    `<div style="width: ${GROUP_WIDTH}px"><ui-buttons ${attributes}>` +
      `<ui-button>A</ui-button><ui-button>A much longer button</ui-button><ui-button>C</ui-button>` +
      `</ui-buttons></div>`
  )
  const host = box.querySelector<DOMElement>("ui-buttons")!
  const root = host.shadowRoot!.firstElementChild as HTMLElement
  const buttons = [...host.querySelectorAll<DOMElement>("ui-button")].map((button) =>
    button.shadowRoot!.querySelector<HTMLElement>("[part~=button]")!
  )
  return { host, root, buttons }
}

////////////////
// ## Tokens from outside
////////////////

/**
 * Public `--ui-button-*` tokens set from OUTSIDE the shadow root reach the box:
 * the sheet declares only private aliases (`--_ui-button-radius: var(--ui-button-radius, ...)`),
 * never the public names (`notes/theming.md` "Component tokens").
 */
describe("<ui-button> tokens from outside", () => {
  /** The inner control's top-left radius. */
  function radius(host: Element): string {
    return getComputedStyle(host.shadowRoot!.querySelector("[part~=button]")!).borderTopLeftRadius
  }

  it("takes a token set on the HOST", async () => {
    const { host } = await button(`<ui-button style="--ui-button-radius: 20px">Go</ui-button>`)
    expect(radius(host)).toBe("20px")
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-button-radius: 20px"><div><ui-button>Go</ui-button></div></section>`
    )
    expect(radius(wrapper.querySelector("ui-button")!)).toBe("20px")
  })

  it("takes a token set through `::part(button)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(button) { --ui-button-radius: 20px }</style><ui-button class="themed">Go</ui-button></div>`
    )
    expect(radius(wrapper.querySelector("ui-button")!)).toBe("20px")
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-button-radius", "20px")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-button-radius")
    })
    const { host } = await button(`<ui-button>Go</ui-button>`)
    expect(radius(host)).toBe("20px")
  })

  it("keeps its defaults when nothing is set", async () => {
    const { host } = await button(`<ui-button>Go</ui-button>`)
    const probe = await ElementFixture.render(`<span style="border-top-left-radius: var(--ui-radius)"></span>`)
    expect(radius(host)).toBe(getComputedStyle(probe).borderTopLeftRadius)
  })

  it("`--ui-button-font-family` / `--ui-button-font-size` reach the label", async () => {
    const { control } = await button(
      `<ui-button style="--ui-button-font-family: serif; --ui-button-font-size: 15px">Add</ui-button>`
    )
    expect(getComputedStyle(control).fontFamily).toBe("serif")
    expect(getComputedStyle(control).fontSize).toBe("15px")
    const { control: small } = await button(
      `<ui-button size="small" style="--ui-button-font-size: 16px">Add</ui-button>`
    )
    expect(parseFloat(getComputedStyle(small).fontSize)).toBeLessThan(16)
  })

  it("variations:  a swap wins over the base token, a derived value follows it", async () => {
    const { control: circular } = await button(
      `<ui-button appearance="circular" style="--ui-button-radius: 20px">Go</ui-button>`
    )
    expect(getComputedStyle(circular).borderTopLeftRadius).not.toBe("20px")
    const { control: compact } = await button(
      `<ui-button padding="compact" style="--ui-button-padding-block: 20px">Go</ui-button>`
    )
    expect(getComputedStyle(compact).paddingTop).toBe("15px")
  })

  it("reaches the members of a group, set on the group:  their corners are the track's, inside its inset", async () => {
    const group = await ElementFixture.render<DOMElement>(
      `<ui-buttons style="--ui-button-radius: 20px; --ui-button-group-padding: 3px">` +
        `<ui-button>A</ui-button><ui-button>B</ui-button></ui-buttons>`
    )
    const [first, last] = [...group.querySelectorAll("ui-button")]
    expect(getComputedStyle(group.shadowRoot!.firstElementChild!).borderTopLeftRadius).toBe("20px")
    expect(radius(first!)).toBe("17px")
    expect(getComputedStyle(last!.shadowRoot!.querySelector("[part~=button]")!).borderTopRightRadius).toBe("17px")
  })

  it("`--ui-button-group-item-radius` rounds only the joined corners of a group's buttons", async () => {
    const group = await ElementFixture.render<DOMElement>(
      `<ui-buttons style="--ui-button-radius: 20px; --ui-button-group-padding: 3px; --ui-button-group-item-radius: 0px">` +
        `<ui-button>A</ui-button><ui-button>B</ui-button></ui-buttons>`
    )
    const [first, last] = [...group.querySelectorAll("ui-button")]
    expect(radius(first!)).toBe("17px")
    expect(getComputedStyle(first!.shadowRoot!.querySelector("[part~=button]")!).borderTopRightRadius).toBe("0px")
    expect(getComputedStyle(last!.shadowRoot!.querySelector("[part~=button]")!).borderTopLeftRadius).toBe("0px")
  })
})

////////////////
// ## Invoker commands
////////////////

describe("<ui-button> invoker commands", () => {
  /** Render a button wired to `target`, which is rendered after it. */
  async function invoker(command: string, target: string) {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div><ui-button commandfor="t" command="${command}">Go</ui-button>${target}</div>`
    )
    const host = wrapper.querySelector<DOMElement>("ui-button")!
    const control = host.shadowRoot!.querySelector<HTMLButtonElement>("[part~=button]")!
    return { wrapper, host, control, target: wrapper.querySelector<HTMLElement>("#t")! }
  }

  /** Run `test` with `UI.browser.supports.invokers` forced to `value`. */
  async function withInvokers(value: boolean, test: () => Promise<void>) {
    await UI.load()
    const supports = UI.browser.supports
    const was = supports.invokers
    supports.invokers = value
    try {
      await test()
    } finally {
      supports.invokers = was
    }
  }

  it("detects invokers", async () => {
    await UI.load()
    expect(UI.browser.supports.invokers).toBe("commandForElement" in HTMLButtonElement.prototype)
  })

  it("native:  the inner button gets `command` and a `commandForElement` that is the light-DOM target", async () => {
    await withInvokers("commandForElement" in HTMLButtonElement.prototype, async () => {
      const { control, target } = await invoker("show-modal", `<dialog id="t">x</dialog>`)
      expect(control.getAttribute("command")).toBe("show-modal")
      expect(control.commandForElement).toBe(target)
    })
  })

  it("native:  a click opens a dialog, and re-resolves when `commandfor` changes", async () => {
    await withInvokers("commandForElement" in HTMLButtonElement.prototype, async () => {
      const { wrapper, host, control } = await invoker(
        "show-modal",
        `<dialog id="t">x</dialog><dialog id="u">y</dialog>`
      )
      host.setAttribute("commandfor", "u")
      await ElementFixture.settle()
      expect(control.commandForElement).toBe(wrapper.querySelector("#u"))
      control.click()
      expect((wrapper.querySelector("#u") as HTMLDialogElement).open).toBe(true)
      expect((wrapper.querySelector("#t") as HTMLDialogElement).open).toBe(false)
      ;(wrapper.querySelector("#u") as HTMLDialogElement).close()
    })
  })

  it("native:  a target that arrives after the button still works (resolved at click)", async () => {
    await withInvokers("commandForElement" in HTMLButtonElement.prototype, async () => {
      const { wrapper, control } = await invoker("show-popover", "")
      wrapper.insertAdjacentHTML("beforeend", `<div id="t" popover>late</div>`)
      control.click()
      expect(wrapper.querySelector<HTMLElement>("#t")!.matches(":popover-open")).toBe(true)
    })
  })

  it("native:  a custom command reaches a <ui-modal> (--toggle)", async () => {
    await withInvokers("commandForElement" in HTMLButtonElement.prototype, async () => {
      const { control } = await invoker("--toggle", `<ui-modal id="t" content="Body"></ui-modal>`)
      const modal = document.querySelector<DOMElement & { visible: boolean }>("ui-modal#t")!
      control.click()
      await ElementFixture.settle()
      expect(modal.visible).toBe(true)
      control.click()
      await ElementFixture.settle()
      expect(modal.visible).toBe(false)
    })
  })

  it("fallback (no invokers):  the inner button carries no command, and a click runs show-modal / close", async () => {
    await withInvokers(false, async () => {
      const { host, control, target } = await invoker("show-modal", `<dialog id="t">x</dialog>`)
      expect(control.hasAttribute("command")).toBe(false)
      expect(control.commandForElement).toBeNull()
      control.click()
      expect((target as HTMLDialogElement).open).toBe(true)
      host.setAttribute("command", "close")
      await ElementFixture.settle()
      control.click()
      expect((target as HTMLDialogElement).open).toBe(false)
    })
  })

  it("fallback (no invokers):  show-popover / hide-popover / toggle-popover", async () => {
    await withInvokers(false, async () => {
      const { host, control, target } = await invoker("show-popover", `<div id="t" popover>p</div>`)
      control.click()
      expect(target.matches(":popover-open")).toBe(true)
      host.setAttribute("command", "hide-popover")
      await ElementFixture.settle()
      control.click()
      expect(target.matches(":popover-open")).toBe(false)
      host.setAttribute("command", "toggle-popover")
      await ElementFixture.settle()
      control.click()
      expect(target.matches(":popover-open")).toBe(true)
      control.click()
      expect(target.matches(":popover-open")).toBe(false)
    })
  })

  it("fallback (no invokers):  a custom command dispatches `command` with `{ command }`;  preventDefault skips built-ins", async () => {
    await withInvokers(false, async () => {
      const { host, control, target } = await invoker("--foo", `<div id="t" popover>p</div>`)
      const seen: string[] = []
      target.addEventListener("command", (event) => seen.push((event as Event & { command: string }).command))
      control.click()
      expect(seen).toEqual(["--foo"])
      host.setAttribute("command", "show-popover")
      await ElementFixture.settle()
      target.addEventListener("command", (event) => event.preventDefault())
      control.click()
      expect(seen).toEqual(["--foo", "show-popover"])
      expect(target.matches(":popover-open")).toBe(false)
    })
  })

  it("fallback (no invokers):  `--show` / `--toggle` reach a <ui-modal> as user actions", async () => {
    await withInvokers(false, async () => {
      const { host, control } = await invoker("--show", `<ui-modal id="t" content="Body"></ui-modal>`)
      const modal = document.querySelector<DOMElement & { visible: boolean }>("ui-modal#t")!
      control.click()
      await ElementFixture.settle()
      expect(modal.visible).toBe(true)
      host.setAttribute("command", "--toggle")
      await ElementFixture.settle()
      control.click()
      await ElementFixture.settle()
      expect(modal.visible).toBe(false)
    })
  })

  it("a disabled button invokes nothing", async () => {
    await withInvokers(false, async () => {
      const wrapper = await ElementFixture.render<HTMLElement>(
        `<div><ui-button disabled commandfor="t" command="show-popover">Go</ui-button><div id="t" popover>p</div></div>`
      )
      wrapper.querySelector("ui-button")!.shadowRoot!.querySelector<HTMLElement>("[part~=button]")!.click()
      expect(wrapper.querySelector("#t")!.matches(":popover-open")).toBe(false)
    })
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-button> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})

////////////////
// ## `link`, and its old name `href`
//
// Owen's request r1 (epic `ui-gaps` P3):  `href` became `link`, still read under its old name.
////////////////

describe("<ui-button> link", () => {
  it.each(["link"])("%s draws a real link", async (name) => {
    const element = await ElementFixture.render(`<ui-button NAME="#there">Go</ui-button>`.replace("NAME", name))
    expect(element.shadowRoot!.querySelector("a")?.getAttribute("href")).toBe("#there")
  })
})
