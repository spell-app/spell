import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { UI } from "$/runtime"
import type { ShapeChangeDetail } from "$/components/components.types"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"
import type { ShapeHost } from "$/components/shape"

import "$/components/shape"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/shape/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A shape host with its properties. */
type Shape = ShapeHost & { activeIndex: number; direction: string }

/** Three sides. */
const SIDES = `<ui-side>One</ui-side><ui-side>Two</ui-side><ui-side>Three</ui-side>`

/** Render a shape;  returns the host, its stage, sides box and side elements. */
async function shape(html: string) {
  const wrapper = await ElementFixture.render(`<div>${html}</div>`)
  const host = wrapper.querySelector<Shape>("ui-shape")!
  const stage = host.shadowRoot!.querySelector<HTMLElement>("[part~=shape]")!
  const box = host.shadowRoot!.querySelector<HTMLElement>("[part~=sides]")!
  const sides = [...host.querySelectorAll<UIHost>("ui-side")]
  return { wrapper, host, stage, box, sides }
}

/** Which sides show. */
function shown(sides: readonly Element[]): boolean[] {
  return sides.map((side) => getComputedStyle(side).display !== "none")
}

/** Collect `ui-change` details. */
function changes(target: EventTarget) {
  const details: ShapeChangeDetail[] = []
  target.addEventListener("ui-change", (event) => details.push((event as CustomEvent<ShapeChangeDetail>).detail))
  return details
}

/** Let the element catch up. */
async function settle() {
  await ElementFixture.tick()
  await ElementFixture.tick()
}

beforeEach(async () => {
  await UI.load()
  Fixture.render(`<style>ui-shape { --ui-shape-duration: 30ms }</style>`)
})

afterEach(() => {
  delete (UI.browser as { reducedMotion?: boolean }).reducedMotion
})

describe("<ui-shape> classes and markup", () => {
  it.each([
    ["", "ui shape"],
    ["cube", "ui cube shape"],
    ["text", "ui text shape"]
  ])("<ui-shape %s>", async (attributes, classes) => {
    const { stage } = await shape(`<ui-shape ${attributes}>${SIDES}</ui-shape>`)
    expect(stage.className).toBe(classes)
  })

  it("shows the active side only;  `active-index` picks it", async () => {
    const { sides, wrapper } = await shape(`<ui-shape>${SIDES}</ui-shape>`)
    expect(shown(sides)).toEqual([true, false, false])
    expect(sides[0]!.matches(":state(active)")).toBe(true)
    wrapper.innerHTML = `<ui-shape active-index="2">${SIDES}</ui-shape>`
    await ElementFixture.settle(wrapper)
    expect(shown([...wrapper.querySelectorAll("ui-side")])).toEqual([false, false, true])
  })

  it("the sides box is a polite live region;  hidden sides are out of the tree", async () => {
    const { box, sides } = await shape(`<ui-shape>${SIDES}</ui-shape>`)
    expect(box.getAttribute("aria-live")).toBe("polite")
    expect(sides[1]!.checkVisibility()).toBe(false)
  })

  it("cube faces:  square and grey, from the shape's type token", async () => {
    const { sides } = await shape(`<ui-shape cube>${SIDES}</ui-shape>`)
    const face = sides[0]!.shadowRoot!.querySelector<HTMLElement>("[part~=side]")!
    expect(face.offsetWidth).toBe(face.offsetHeight)
    expect(face.offsetHeight).toBe(15 * 16)
    expect(getComputedStyle(face).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  })
})

describe("<ui-shape> flipping", () => {
  it("next() turns the sides box, then shows the next side and fires ui-change", async () => {
    const { host, box, sides } = await shape(`<ui-shape>${SIDES}</ui-shape>`)
    const details = changes(host)
    const done = host.next()
    await settle()
    expect(host.matches(":state(animating)")).toBe(true)
    expect(box.style.transform).toContain("rotateY(90deg)")
    expect(sides[1]!.matches(":state(animating)")).toBe(true)
    expect(await done).toBe(true)
    expect(shown(sides)).toEqual([false, true, false])
    expect(details).toEqual([{ activeIndex: 1, side: sides[1], flip: "left" }])
    expect(host.activeIndex).toBe(1)
    expect(box.style.transform).toBe("")
    expect(sides[1]!.style.transform).toBe("")
  })

  it.each([
    ["up", "rotateX(-90deg)"],
    ["down", "rotateX(90deg)"],
    ["right", "rotateY(-90deg)"],
    ["over", "rotateY(180deg)"],
    ["back", "rotateY(-180deg)"]
  ])("flip('%s') turns %s", async (direction, turn) => {
    const { host, box } = await shape(`<ui-shape>${SIDES}</ui-shape>`)
    const done = host.flip(direction as "up", 2)
    await settle()
    expect(box.style.transform).toContain(turn)
    expect(await done).toBe(true)
    expect(host.activeIndex).toBe(2)
  })

  it("writing activeIndex flips the `direction` attribute's way", async () => {
    const { host, box, sides } = await shape(`<ui-shape direction="up">${SIDES}</ui-shape>`)
    const details = changes(host)
    host.activeIndex = 2
    await settle()
    expect(box.style.transform).toContain("rotateX(-90deg)")
    await expect.poll(() => details.length).toBe(1)
    expect(details[0]!.flip).toBe("up")
    expect(shown(sides)).toEqual([false, false, true])
  })

  it("flips queue;  previous() wraps;  a flip to the side shown does nothing", async () => {
    const { host, sides } = await shape(`<ui-shape>${SIDES}</ui-shape>`)
    const details = changes(host)
    const flips = [host.next(), host.next(), host.previous()]
    expect(await Promise.all(flips)).toEqual([true, true, true])
    expect(details.map((detail) => detail.activeIndex)).toEqual([1, 2, 1])
    expect(await host.flip("left", 1)).toBe(false)
    expect(await host.previous()).toBe(true)
    expect(await host.previous()).toBe(true)
    expect(shown(sides)).toEqual([false, false, true])
  })

  it("reduced motion:  an instant swap, ui-change all the same", async () => {
    Object.defineProperty(UI.browser, "reducedMotion", { value: true, configurable: true })
    const { host, box, sides } = await shape(`<ui-shape>${SIDES}</ui-shape>`)
    const details = changes(host)
    const done = host.next()
    expect(box.style.transform).toBe("")
    expect(await done).toBe(true)
    expect(details).toHaveLength(1)
    expect(shown(sides)).toEqual([false, true, false])
  })

  it("invoker commands:  --next, --previous", async () => {
    const { host, wrapper, sides } = await shape(
      `<button id="n" commandfor="s" command="--next">Next</button>` +
        `<button id="p" commandfor="s" command="--previous">Previous</button><ui-shape id="s">${SIDES}</ui-shape>`
    )
    const details = changes(host)
    await userEvent.click(wrapper.querySelector("#p")!)
    await expect.poll(() => details.length).toBe(1)
    expect(shown(sides)).toEqual([false, false, true])
    await userEvent.click(wrapper.querySelector("#n")!)
    await expect.poll(() => details.length).toBe(2)
    expect(shown(sides)).toEqual([true, false, false])
  })

  it("keeps a slotted side's own inline styles", async () => {
    const { host, sides } = await shape(
      `<ui-shape><ui-side style="color: red">A</ui-side><ui-side>B</ui-side></ui-shape>`
    )
    await host.next()
    await host.next()
    expect(sides[0]!.style.color).toBe("red")
  })

  it.each(Object.keys(EXAMPLES))("axe passes on %s, before and after a flip", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
    for (const host of root.querySelectorAll<Shape>("ui-shape")) await host.next()
    await expectAccessible(root)
  })
})
