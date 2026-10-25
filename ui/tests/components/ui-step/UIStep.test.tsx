import { afterEach, describe, expect, it, onTestFinished, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"
import { Keys } from "spell-ui/test-helpers/Keys"

import { expectAccessible } from "spell/test-helpers/A11y"
import { Fixture } from "spell/test-helpers/Fixture"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Viewport } from "spell/test-helpers/Viewport"
import type { DOMElement } from "spell/element"
import { ParentLink } from "spell-ui/core"

import "spell-ui/components/ui-step"
import "spell-ui/components/ui-parts"
import "spell-ui/components/ui-icon"
import "spell-ui/components/ui-segment"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-step/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one element;  returns it with its root. */
async function render(html: string) {
  const host = await ElementFixture.render<DOMElement>(html)
  const root = host.shadowRoot!.firstElementChild as HTMLElement
  return { host, root }
}

/** The root of each `<ui-step>` under `container`. */
function stepRoots(container: Element): HTMLElement[] {
  return [...container.querySelectorAll<DOMElement>("ui-step")].map(
    (step) => step.shadowRoot!.firstElementChild as HTMLElement
  )
}

/** Computed custom property `name` of `element`, trimmed. */
function token(element: Element, name: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim()
}

/** Three steps in `<ui-steps attributes>`, the middle one selected. */
function three(attributes = "", width?: number) {
  const steps =
    `<ui-steps ${attributes}><ui-step heading="One"></ui-step><ui-step selected heading="Two"></ui-step>` +
    `<ui-step heading="Three"></ui-step></ui-steps>`
  return width ? `<div style="width: ${width}px">${steps}</div>` : steps
}

/** Three steps of uneven titles in `<ui-steps attributes>`, in a 900px box. */
function uneven(attributes: string) {
  return (
    `<div style="width: 900px"><ui-steps ${attributes}><ui-step heading="A"></ui-step>` +
    `<ui-step selected heading="A much longer step"></ui-step><ui-step heading="C"></ui-step></ui-steps></div>`
  )
}

////////////////
// ## Rendering
////////////////

describe("<ui-steps> classes", () => {
  it.each([
    ["", "ui steps"],
    ['size="small"', "ui small steps"],
    ["ordered", "ui ordered steps"],
    ['direction="vertical"', "ui vertical steps"],
    ['direction="vertical-right"', "ui right vertical steps"],
    ['attach="bottom"', "ui bottom attached steps"],
    ['attach="both"', "ui attached steps"],
    ['stackable="tablet"', "ui tablet stackable steps"],
    ["unstackable fluid inverted", "ui fluid inverted unstackable steps"],
    ['widths="3"', "ui three steps"],
    ['appearance="circular" color="red"', "ui red circular steps"]
  ])("<ui-steps %s>", async (attributes, classes) => {
    const { host, root } = await render(`<ui-steps ${attributes}><ui-step heading="A"></ui-step></ui-steps>`)
    expect(root.className).toBe(classes)
    expect(root.localName).toBe("ol")
    expect(root.getAttribute("role")).toBe("list")
    expect(root.getAttribute("part")).toBe("steps")
    expect(host.matches(":state(steps)")).toBe(true)
  })
})

describe("<ui-step>", () => {
  it.each([
    ["", "div", "step"],
    ["selected", "div", "active step"],
    ["active", "div", "active step"],
    ["completed disabled", "div", "completed disabled step"],
    ['color="red"', "div", "red ui-red step"],
    ['link="#a"', "a", "step"],
    ['appearance="link"', "button", "link step"]
  ])("<ui-step %s> => <%s class=%s>", async (attributes, tag, classes) => {
    const holder = await ElementFixture.render(`<ui-steps><ui-step ${attributes} heading="A"></ui-step></ui-steps>`)
    const [root] = stepRoots(holder)
    expect(root!.localName).toBe(tag)
    expect(root!.className).toBe(classes)
    expect(root!.getAttribute("part")).toBe("step")
  })

  it("is a listitem of the group's list;  the selected step is the current one", async () => {
    const holder = await ElementFixture.render(three())
    const steps = [...holder.querySelectorAll<DOMElement>("ui-step")]
    for (const step of steps) expect(step.internals.role).toBe("listitem")
    const roots = stepRoots(holder)
    expect(roots.map((root) => root.getAttribute("aria-current"))).toEqual([null, "step", null])
    expect(steps[1]!.matches(":state(selected)")).toBe(true)
    steps[1]!.removeAttribute("selected")
    steps[2]!.setAttribute("selected", "")
    await ElementFixture.tick()
    expect(roots.map((root) => root.getAttribute("aria-current"))).toEqual([null, null, "step"])
    expect(steps[2]!.matches(":state(selected)")).toBe(true)
  })

  it("renders the header / description shorthands as its content parts", async () => {
    const holder = await ElementFixture.render(
      `<ui-steps><ui-step heading="Shipping" description="Choose"></ui-step></ui-steps>`
    )
    const [root] = stepRoots(holder)
    const content = root!.querySelector<HTMLElement>("[part=content]")!
    expect(content.className).toBe("content in-step")
    expect(content.querySelector("[part=title]")!.textContent).toBe("Shipping")
    expect(content.querySelector("[part=title]")!.className).toBe("title in-step")
    expect(content.querySelector("[part=description]")!.textContent).toBe("Choose")
    const title = getComputedStyle(content.querySelector("[part=title]")!)
    expect(title.fontWeight).toBe("700")
  })

  it("owns slotted content parts, which read its state", async () => {
    const holder = await ElementFixture.render(
      `<ui-steps><ui-step selected><ui-content><ui-title>Billing</ui-title>` +
        `<ui-description>Enter details</ui-description></ui-content></ui-step></ui-steps>`
    )
    const title = holder.querySelector<DOMElement>("ui-title")!
    expect(title.matches(":state(in-step)")).toBe(true)
    expect(holder.querySelector<DOMElement>("ui-content")!.matches(":state(in-step)")).toBe(true)
    const [root] = stepRoots(holder)
    expect(token(root!, "--_ui-step-state")).toBe("active")
    const link = Fixture.render(`<span style="color: var(--ui-link)"></span>`)
    expect(getComputedStyle(title.shadowRoot!.firstElementChild!).color).toBe(getComputedStyle(link).color)
  })

  it("draws its icon, and a check in its place once completed, with a hidden 'Completed'", async () => {
    const holder = await ElementFixture.render(`<ui-steps><ui-step icon="truck" heading="Ship"></ui-step></ui-steps>`)
    const step = holder.querySelector<DOMElement>("ui-step")!
    const [root] = stepRoots(holder)
    await expect.poll(() => root!.querySelector("[part=icon] svg")).not.toBeNull()
    const truck = root!.querySelector("[part=icon] svg path")!.getAttribute("d")
    expect(root!.textContent).not.toContain("Completed")
    step.setAttribute("completed", "")
    await ElementFixture.tick()
    const icon = root!.querySelector("[part=icon]")!
    expect(icon.querySelector("slot")!.hidden).toBe(true)
    await expect.poll(() => icon.querySelector(":scope > svg")).not.toBeNull()
    expect(icon.querySelector(":scope > svg path")!.getAttribute("d")).not.toBe(truck)
    expect(root!.textContent).toContain("Completed")
    expect(step.matches(":state(completed)")).toBe(true)
    const positive = Fixture.render(`<span style="color: var(--ui-positive)"></span>`)
    expect(getComputedStyle(icon).color).toBe(getComputedStyle(positive).color)
  })

  it("keeps a disabled link's <a> without href, and disables a <button>", async () => {
    const holder = await ElementFixture.render(
      `<ui-steps><ui-step link="#a" disabled heading="A"></ui-step><ui-step appearance="link" disabled heading="B"></ui-step></ui-steps>`
    )
    const [link, button] = stepRoots(holder)
    expect(link!.hasAttribute("href")).toBe(false)
    expect(link!.getAttribute("aria-disabled")).toBe("true")
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(token(link!, "--_ui-step-state")).toBe("disabled")
  })
})

////////////////
// ## Layouts
////////////////

describe("<ui-steps> layouts", () => {
  it("draws a row of steps with arrows between them, rounded at the ends", async () => {
    const holder = await ElementFixture.render(three("unstackable", 900))
    const roots = stepRoots(holder)
    expect(roots[1]!.getBoundingClientRect().top).toBe(roots[0]!.getBoundingClientRect().top)
    expect(getComputedStyle(roots[0]!, "::after").display).toBe("block")
    expect(getComputedStyle(roots[2]!, "::after").display).toBe("none")
    expect(parseFloat(getComputedStyle(roots[0]!).borderTopLeftRadius)).toBeGreaterThan(0)
    expect(getComputedStyle(roots[0]!).borderTopRightRadius).toBe("0px")
    expect(getComputedStyle(roots[0]!).borderRightStyle).toBe("solid")
    expect(getComputedStyle(roots[2]!).borderRightStyle).toBe("none")
    expect(token(roots[0]!, "--_ui-step-layout")).toBe("row")
  })

  it("stacks below 768px of the GROUP's width, not with unstackable", async () => {
    const stacked = await ElementFixture.render(three("", 500))
    const roots = stepRoots(stacked)
    expect(roots[1]!.getBoundingClientRect().top).toBeGreaterThan(roots[0]!.getBoundingClientRect().top)
    expect(token(roots[0]!, "--_ui-step-layout")).toBe("stacked")
    expect(getComputedStyle(roots[0]!, "::after").transform).not.toBe("none")
    const kept = await ElementFixture.render(three("unstackable", 500))
    const row = stepRoots(kept)
    expect(row[1]!.getBoundingClientRect().top).toBe(row[0]!.getBoundingClientRect().top)
  })

  it('`stack-with="page"` stacks by the SCREEN;  the token too, and the attribute beats it', async () => {
    const holder = await ElementFixture.render(
      `<div style="width: 500px">${three('stack-with="page"')}<div style="--ui-stack-with: page">${three()}` +
        `${three('stack-with="container"')}</div></div>`
    )
    const groups = [...holder.querySelectorAll("ui-steps")]
    expect(groups[0]!.shadowRoot!.firstElementChild!.className).toBe("ui stack-with-page steps")
    /** Whether `group`'s steps are stacked. */
    const stacked = (group: Element) => token(stepRoots(group)[0]!, "--_ui-step-layout") === "stacked"
    await Viewport.resize(1200)
    await expect.poll(() => groups.map(stacked)).toEqual([false, false, true])
    await Viewport.resize(900)
    const tablet = await ElementFixture.render(
      `<div style="width: 1200px">${three('stackable="tablet" stack-with="page"')}</div>`
    )
    await expect.poll(() => stacked(tablet.querySelector("ui-steps")!)).toBe(true)
    await Viewport.resize(500)
    await expect.poll(() => groups.map(stacked)).toEqual([true, true, true])
  })

  it("stacks a tablet-stackable group below 992px", async () => {
    const holder = await ElementFixture.render(three('stackable="tablet"', 900))
    const roots = stepRoots(holder)
    expect(roots[1]!.getBoundingClientRect().top).toBeGreaterThan(roots[0]!.getBoundingClientRect().top)
  })

  it("lays vertical steps out top to bottom, the arrow only on the current step", async () => {
    const holder = await ElementFixture.render(three('direction="vertical"', 900))
    const roots = stepRoots(holder)
    expect(roots[1]!.getBoundingClientRect().top).toBeGreaterThan(roots[0]!.getBoundingClientRect().top)
    expect(getComputedStyle(roots[0]!, "::after").display).toBe("none")
    expect(getComputedStyle(roots[1]!, "::after").display).toBe("block")
    expect(getComputedStyle(roots[0]!).borderBottomStyle).toBe("solid")
    expect(getComputedStyle(roots[0]!).justifyContent).toBe("flex-start")
  })

  it("numbers ordered steps with a CSS counter", async () => {
    const holder = await ElementFixture.render(three("ordered unstackable", 900))
    const [root] = stepRoots(holder)
    const before = getComputedStyle(root!, "::before")
    expect(before.content).toContain("counter(ui-step)")
    expect(before.display).toBe("block")
    expect(parseFloat(before.fontSize)).toBeCloseTo(2.5 * parseFloat(getComputedStyle(root!).fontSize), 0)
  })

  it("divides the group evenly with widths", async () => {
    const holder = await ElementFixture.render(three('widths="3" unstackable', 900))
    const roots = stepRoots(holder)
    const group = holder.querySelector("ui-steps")!.shadowRoot!.firstElementChild!.getBoundingClientRect().width
    for (const root of roots) expect(root.getBoundingClientRect().width).toBeCloseTo(group / 3, -1)
  })

  it("scales every step with the group's size", async () => {
    const large = await ElementFixture.render(three('size="large" unstackable', 900))
    const plain = await ElementFixture.render(three("unstackable", 900))
    const size = (holder: Element) => parseFloat(getComputedStyle(stepRoots(holder)[0]!).fontSize)
    expect(size(large) / size(plain)).toBeCloseTo(1.125, 2)
  })

  it("inverts to the dark scheme", async () => {
    const holder = await ElementFixture.render(three("inverted unstackable", 900))
    const [root] = stepRoots(holder)
    expect(getComputedStyle(root!).colorScheme).toBe("dark")
    expect(token(root!, "--ui-inverted")).toBe("1")
  })

  it("draws circular steps as a line with rings, the current ring in the accent", async () => {
    const holder = await ElementFixture.render(three('appearance="circular" color="red"', 900))
    const roots = stepRoots(holder)
    expect(parseFloat(getComputedStyle(roots[0]!).height)).toBeLessThan(4)
    const ring = getComputedStyle(roots[1]!, "::before")
    expect(ring.borderTopLeftRadius).toBe("50%")
    const red = Fixture.render(`<span style="color: var(--ui-red)"></span>`)
    expect(ring.borderTopColor).toBe(getComputedStyle(red).color)
  })

  it("draws a step's own `color` on its ring, over the group's or with none", async () => {
    const holder = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps appearance="circular"><ui-step color="teal"></ui-step><ui-step></ui-step></ui-steps>` +
        `<ui-steps appearance="circular" color="red"><ui-step color="orange"></ui-step></ui-steps></div>`
    )
    const [teal, plain, orange] = stepRoots(holder)
    const hue = (name: string) =>
      getComputedStyle(Fixture.render(`<span style="color: var(--ui-${name})"></span>`)).color
    expect(getComputedStyle(teal!, "::before").borderTopColor).toBe(hue("teal"))
    expect(getComputedStyle(orange!, "::before").borderTopColor).toBe(hue("orange"))
    expect(getComputedStyle(plain!, "::before").borderTopColor).not.toBe(hue("teal"))
  })
})

describe("<ui-steps equal>", () => {
  it("every step as wide as the widest, the group hugging them", async () => {
    const natural = stepRoots(await ElementFixture.render(uneven("unstackable")))
    const widest = Math.max(...natural.map((step) => step.getBoundingClientRect().width))
    const box = await ElementFixture.render(uneven("equal unstackable"))
    const root = box.querySelector("ui-steps")!.shadowRoot!.firstElementChild as HTMLElement
    expect(root.className).toBe("ui equal unstackable steps")
    for (const step of stepRoots(box)) expect(step.getBoundingClientRect().width).toBeCloseTo(widest, -0.5)
    expect(root.getBoundingClientRect().width).toBeLessThan(900)
  })

  it("`equal fluid`:  an equal share of the row each", async () => {
    const box = await ElementFixture.render(uneven("equal fluid unstackable"))
    const root = box.querySelector("ui-steps")!.shadowRoot!.firstElementChild as HTMLElement
    const steps = stepRoots(box)
    const share = root.clientWidth / steps.length
    for (const step of steps) expect(step.getBoundingClientRect().width).toBeCloseTo(share, -0.5)
  })

  it("stacks below 768px of the group all the same", async () => {
    const box = await ElementFixture.render(
      `<div style="width: 500px"><ui-steps equal><ui-step heading="A"></ui-step>` +
        `<ui-step heading="B"></ui-step></ui-steps></div>`
    )
    const [a, b] = stepRoots(box).map((step) => step.getBoundingClientRect())
    expect(b!.top).toBeGreaterThanOrEqual(a!.bottom - 1)
  })
})

describe("<ui-steps> outer margin", () => {
  /** Two groups after a 10px-margin heading in a 900px box;  returns the heading, the DOM elements and their roots. */
  async function twoGroups(attributes: string) {
    const holder = await ElementFixture.render(
      `<div style="width: 900px"><h4 style="margin: 0 0 10px">Heading</h4>` +
        `${three(attributes)}${three(attributes)}</div>`
    )
    const hosts = [...holder.querySelectorAll<DOMElement>("ui-steps")]
    const roots = hosts.map((host) => host.shadowRoot!.firstElementChild as HTMLElement)
    return { heading: holder.querySelector("h4")!, hosts, roots }
  }

  it("keeps an inline group's 1em margins on its root, by the DOM element's position (the root is an only child)", async () => {
    const { heading, roots } = await twoGroups("unstackable")
    expect([getComputedStyle(roots[0]!).marginTop, getComputedStyle(roots[0]!).marginBottom]).toEqual(["16px", "16px"])
    expect(getComputedStyle(roots[1]!).marginBottom).toBe("0px")
    // an inline-flex group's margin never collapses, as in class grammar:  10px + 16px
    expect(roots[0]!.getBoundingClientRect().top - heading.getBoundingClientRect().bottom).toBeCloseTo(26, 0)
  })

  it("puts a block-level (fluid) group's margins on its DOM element, so they collapse with the heading's", async () => {
    const { heading, hosts, roots } = await twoGroups("fluid unstackable")
    expect(hosts[0]!.matches(":state(block)")).toBe(true)
    expect(getComputedStyle(roots[0]!).marginTop).toBe("0px")
    expect([getComputedStyle(hosts[0]!).marginTop, getComputedStyle(hosts[1]!).marginBottom]).toEqual(["16px", "0px"])
    // max(10px, 16px), not their sum
    expect(roots[0]!.getBoundingClientRect().top - heading.getBoundingClientRect().bottom).toBeCloseTo(16, 0)
  })

  it("keeps a circular group's margins on its DOM element, even as the last child", async () => {
    const { hosts } = await twoGroups('appearance="circular"')
    expect(hosts[1]!.matches(":state(block):state(circular)")).toBe(true)
    expect(getComputedStyle(hosts[1]!).marginBottom).toBe("16px")
  })
})

////////////////
// ## Tokens
////////////////

describe("<ui-steps> tokens from outside", () => {
  const RED = "rgb(255, 0, 0)"
  /** Three steps, content as a slotted part in the first. */
  const STEPS =
    `<ui-step><ui-content><ui-title>One</ui-title></ui-content></ui-step>` +
    `<ui-step selected heading="Two"></ui-step><ui-step disabled heading="Three"></ui-step>`

  /** Background of the first step's root under `holder`. */
  function background(holder: Element): string {
    return getComputedStyle(stepRoots(holder)[0]!).backgroundColor
  }

  /** The first step's slotted `<ui-content>` box. */
  function content(holder: Element): HTMLElement {
    return holder.querySelector("ui-content")!.shadowRoot!.firstElementChild as HTMLElement
  }

  it("takes a token set on the DOM element, reaching every step", async () => {
    const holder = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps unstackable style="--ui-step-background: ${RED}">${STEPS}</ui-steps></div>`
    )
    expect(background(holder)).toBe(RED)
  })

  it("takes a token set on an ANCESTOR", async () => {
    const holder = await ElementFixture.render(
      `<div style="width: 900px; --ui-step-background: ${RED}"><section><ui-steps unstackable>${STEPS}</ui-steps></section></div>`
    )
    expect(background(holder)).toBe(RED)
  })

  it("takes a token set through `::part(steps)`", async () => {
    const holder = await ElementFixture.render(
      `<div style="width: 900px"><style>.themed::part(steps) { --ui-step-background: ${RED} }</style>` +
        `<ui-steps class="themed" unstackable>${STEPS}</ui-steps></div>`
    )
    expect(background(holder)).toBe(RED)
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-steps-radius", "20px")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-steps-radius")
    })
    const holder = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps unstackable>${STEPS}</ui-steps></div>`
    )
    const group = holder.querySelector("ui-steps")!.shadowRoot!.firstElementChild!
    expect(getComputedStyle(group).borderTopLeftRadius).toBe("20px")
    expect(getComputedStyle(stepRoots(holder)[0]!).borderTopLeftRadius).toBe("20px")
  })

  it("variations:  `inverted` swaps the background, a disabled step's background derives from it", async () => {
    const inverted = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps inverted unstackable style="--ui-step-background: ${RED}">${STEPS}</ui-steps></div>`
    )
    expect(background(inverted)).not.toBe(RED)
    const plain = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps unstackable style="--ui-step-background: ${RED}">${STEPS}</ui-steps></div>`
    )
    expect(getComputedStyle(stepRoots(plain)[2]!).backgroundColor).toBe(RED)
  })

  it("owner tokens:  a part look token set on the group or one step reaches its content;  circular swaps it", async () => {
    const onGroup = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps unstackable style="--ui-step-content-padding: 20px">${STEPS}</ui-steps></div>`
    )
    expect(getComputedStyle(content(onGroup)).paddingTop).toBe("20px")
    const onStep = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps unstackable>${STEPS.replace("<ui-step>", `<ui-step style="--ui-step-content-padding: 20px">`)}</ui-steps></div>`
    )
    expect(getComputedStyle(content(onStep)).paddingTop).toBe("20px")
    const plain = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps unstackable>${STEPS}</ui-steps></div>`
    )
    expect(getComputedStyle(content(plain)).paddingTop).toBe("0px")
    const circular = await ElementFixture.render(
      `<div style="width: 900px"><ui-steps appearance="circular" style="--ui-step-content-padding: 20px">${STEPS}</ui-steps></div>`
    )
    expect(getComputedStyle(content(circular)).paddingLeft).toBe("8px")
  })
})

////////////////
// ## Keyboard
////////////////

describe("<ui-step> keyboard", () => {
  it("makes link and button steps Tab stops, plain steps not", async () => {
    const holder = await ElementFixture.render(
      `<div><button>before</button><ui-steps><ui-step heading="Plain"></ui-step>` +
        `<ui-step link="#a" heading="Link"></ui-step><ui-step appearance="link" heading="Button"></ui-step>` +
        `<ui-step link="#b" disabled heading="Off"></ui-step></ui-steps></div>`
    )
    const [, link, button] = stepRoots(holder)
    holder.querySelector("button")!.focus()
    await Keys.tab()
    expect(link!.matches(":focus")).toBe(true)
    await Keys.tab()
    expect(button!.matches(":focus")).toBe(true)
    let clicks = 0
    holder.querySelector('ui-step[appearance~="link"]')!.addEventListener("click", () => clicks++)
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard(" ")
    expect(clicks).toBe(2)
    await Keys.tab()
    expect(document.activeElement).not.toBe(holder.querySelector("ui-step[disabled]"))
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-step> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})

////////////////
// ## Old names
////////////////

describe("<ui-step> heading", () => {
  it("takes `header`, its old name, as `heading`", async () => {
    const element = await ElementFixture.render<DOMElement & { heading?: string }>(
      `<ui-step header="Old">Body</ui-step>`
    )
    expect(element.heading).toBe("Old")
    const written = await ElementFixture.render<DOMElement & { heading?: string }>(
      `<ui-step heading="New">Body</ui-step>`
    )
    expect(written.heading).toBe("New")
  })
})

describe("<ui-steps> and <ui-step> old names", () => {
  it("draw as the new spelling", async () => {
    const old = await render(
      `<ui-steps vertical="right" circular attached="top"><ui-step href="#a">A</ui-step></ui-steps>`
    )
    const spelled = await render(
      `<ui-steps direction="vertical-right" appearance="circular" attach="top"><ui-step link="#a">A</ui-step></ui-steps>`
    )
    expect(old.root.className).toBe(spelled.root.className)
    const [before, after] = [stepRoots(old.host)[0]!, stepRoots(spelled.host)[0]!]
    expect([before.localName, before.getAttribute("href")]).toEqual([after.localName, after.getAttribute("href")])
  })

  it("a bare `link` is the old look:  a <button>", async () => {
    const { host } = await render(`<ui-steps><ui-step link>A</ui-step></ui-steps>`)
    expect(stepRoots(host)[0]!.localName).toBe("button")
  })
})

////////////////
// ## Parent
////////////////

describe("<ui-step parent>", () => {
  afterEach(() => {
    ParentLink.reset()
    vi.restoreAllMocks()
  })

  it("joins the <ui-steps> it names, in page order, as a list item of it", async () => {
    const page = await ElementFixture.render(
      `<div><ui-steps id="flat-steps" ordered><ui-step heading="One"></ui-step></ui-steps>` +
        `<p>Between</p><ui-step parent="flat-steps" heading="Two" selected></ui-step>` +
        `<ui-step parent="flat-steps" heading="Three"></ui-step></div>`
    )
    await joined(page)
    const steps = page.querySelector("ui-steps")!
    expect([...steps.children].map((step) => step.getAttribute("heading"))).toEqual(["One", "Two", "Three"])
    expect(token(stepRoots(steps)[2]!, "--_ui-steps-ordered")).toBe("1")
    await expectAccessible(page)
  })

  it("joins a <ui-steps> that arrives LATER;  warns once while it's missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const page = await ElementFixture.render(
      `<div><ui-step parent="late-steps" heading="A"></ui-step><ui-step parent="late-steps" heading="B"></ui-step></div>`
    )
    await joined(page)
    expect(warn.mock.calls.filter(([message]) => String(message).includes("late-steps"))).toHaveLength(1)
    expect(page.querySelectorAll(":scope > ui-step")).toHaveLength(2)
    const steps = document.createElement("ui-steps")
    steps.id = "late-steps"
    page.append(steps)
    await expect.poll(() => [...steps.children].map((step) => step.getAttribute("heading"))).toEqual(["A", "B"])
  })
})

/** Let flat elements join their containers, and the containers hear of it. */
async function joined(page: Element) {
  await ElementFixture.tick()
  await ElementFixture.settle(page)
  await ElementFixture.tick()
}
