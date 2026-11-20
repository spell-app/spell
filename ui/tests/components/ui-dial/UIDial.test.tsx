import { describe, expect, test } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { DOMFormControl } from "spell/ui/elements"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { DialArc } from "spell/ui/components/ui-dial"

import "spell/ui/components/ui-dial"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-dial/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A dial DOM element with its properties. */
type Dial = DOMFormControl & { value: number | undefined }

/** Render one dial;  returns the DOM element and its pieces. */
async function dial(attributes: string) {
  const container = await ElementFixture.render(`<div><ui-dial ${attributes}></ui-dial></div>`)
  await settle()
  const host = container.querySelector<Dial>("ui-dial")!
  return { host, ...parts(host) }
}

/** Pieces of a rendered dial. */
function parts(host: Element) {
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=dial]")!
  return {
    root,
    control: root.querySelector<HTMLElement>("[part~=control]")!,
    fill: root.querySelector<SVGPathElement>("[part~=track-fill]")!,
    handle: root.querySelector<SVGCircleElement>("[part~=handle]")!,
    disc: root.querySelector<SVGCircleElement>("[part~=disc]")!,
    track: root.querySelector<SVGPathElement>("[part~=track]")!,
    value: root.querySelector<HTMLElement>("[part~=value]")!,
    label: root.querySelector<HTMLElement>("[part~=label]"),
    ticks: [...root.querySelectorAll("[part~=ticks] circle")]
  }
}

/** Collect the `value`s of event `name`. */
function events(host: Element, name: string) {
  const values: number[] = []
  host.addEventListener(name, (event) => values.push((event as CustomEvent).detail.value))
  return values
}

/** Wait for writes and the effects they trigger. */
async function settle() {
  await ElementFixture.tick()
  await ElementFixture.tick()
}

/** Dispatch pointer event `type` on `control` at `angle` (degrees clockwise from 12 o'clock), `radius` drawing units out. */
function point(type: string, control: HTMLElement, angle: number, radius = 43) {
  const box = control.getBoundingClientRect()
  const scale = box.width / 100
  const radians = (angle * Math.PI) / 180
  const clientX = box.left + (50 + radius * Math.sin(radians)) * scale
  const clientY = box.top + (50 - radius * Math.cos(radians)) * scale
  control.dispatchEvent(
    new PointerEvent(type, { clientX, clientY, button: 0, pointerId: 1, bubbles: true, composed: true })
  )
}

/** The centre of `element`'s box. */
function centreOf(element: Element) {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

////////////////
// ## Rendering
////////////////

describe("<ui-dial> markup", () => {
  test.each([
    ["", "ui dial"],
    ['size="small" color="orange"', "ui small orange dial"],
    ["readonly disabled", "ui disabled read-only dial"]
  ])("<ui-dial %s>", async (attributes, classes) => {
    const { root } = await dial(`${attributes} label="D"`)
    expect(root.className).toBe(classes)
  })

  test("is one APG slider:  range, value, text with its unit, named by its label", async () => {
    const { control, value, label } = await dial(`min="80" max="200" value="98" unit="%" label="Line height"`)
    expect(
      ["role", "tabindex", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-label"].map(
        (name) => control.getAttribute(name)
      )
    ).toEqual(["slider", "0", "80", "200", "98", "98%", "Line height"])
    expect(value.textContent).toBe("98%")
    expect(label!.textContent).toBe("Line height")
  })

  test("`aria-label` names it over its `label`;  no label, no words under it", async () => {
    const { control, label } = await dial(`aria-label="Volume"`)
    expect(control.getAttribute("aria-label")).toBe("Volume")
    expect(label).toBeNull()
  })

  test("defaults to 0 ... 100, value `min`;  snaps and clamps the attribute", async () => {
    const { host, control } = await dial(`label="D"`)
    expect([control.getAttribute("aria-valuemin"), control.getAttribute("aria-valuemax")]).toEqual(["0", "100"])
    expect(control.getAttribute("aria-valuenow")).toBe("0")
    host.setAttribute("value", "140")
    await settle()
    expect(control.getAttribute("aria-valuenow")).toBe("100")
    const { control: stepped } = await dial(`step="5" value="12" label="D"`)
    expect(stepped.getAttribute("aria-valuenow")).toBe("10")
  })

  test("the arc runs from the start to the value, the handle at its end, ON the ring's middle line", async () => {
    const { fill, handle } = await dial(`value="50" label="D"`)
    expect(fill.getAttribute("d")).toBe(DialArc.path(0, 0.5, 43))
    expect([handle.getAttribute("cx"), handle.getAttribute("cy")]).toEqual(["50", "7"])
    const { fill: empty } = await dial(`value="0" label="D"`)
    expect(empty.getAttribute("d")).toBe("")
  })

  test("`ticks`:  9 dots alone, a number of gaps plus one, none when off", async () => {
    expect((await dial(`ticks label="D"`)).ticks).toHaveLength(9)
    expect((await dial(`ticks="4" label="D"`)).ticks).toHaveLength(5)
    expect((await dial(`ticks="false" label="D"`)).ticks).toHaveLength(0)
    expect((await dial(`label="D"`)).ticks).toHaveLength(0)
  })
})

////////////////
// ## Alignment
////////////////

describe("<ui-dial> alignment", () => {
  test("the value is centred in the disc;  the handle's centre is on the ring;  the label under it, centred", async () => {
    const { disc, value, handle, track, label, root } = await dial(`value="777" min="100" max="900" label="Weight"`)
    const [discCentre, valueCentre] = [centreOf(disc), centreOf(value)]
    expect(Math.abs(valueCentre.x - discCentre.x)).toBeLessThan(1)
    expect(Math.abs(valueCentre.y - discCentre.y)).toBeLessThan(1.5)
    // the ring's box is the circle's, less the gap:  its width is the circle's diameter, through its centre
    const ring = track.getBoundingClientRect()
    const radius = ring.width / 2
    const handleCentre = centreOf(handle)
    const distance = Math.hypot(handleCentre.x - discCentre.x, handleCentre.y - discCentre.y)
    expect(Math.abs(distance - radius)).toBeLessThan(1)
    expect(Math.abs(centreOf(label!).x - centreOf(root).x)).toBeLessThan(1)
    expect(label!.getBoundingClientRect().top).toBeGreaterThan(ring.bottom)
  })
})

////////////////
// ## Keys and wheel
////////////////

describe("<ui-dial> keyboard", () => {
  test("arrows step, pages take 2, Home / End go to the ends;  each ui-moved then ui-changed", async () => {
    const { host, control } = await dial(`value="10" max="20" label="D"`)
    const moves = events(host, "ui-moved")
    const changes = events(host, "ui-changed")
    control.focus()
    await userEvent.keyboard("{ArrowRight}{ArrowUp}")
    await settle()
    expect(host.value).toBe(12)
    await userEvent.keyboard("{ArrowDown}{ArrowLeft}{PageUp}{Home}{End}{End}")
    await settle()
    expect(moves).toEqual([11, 12, 11, 10, 12, 0, 20])
    expect(changes).toEqual(moves)
    expect(control.getAttribute("aria-valuenow")).toBe("20")
  })

  test("keeps the host's value when a ui-moved handler re-sets it", async () => {
    const { host, control } = await dial(`value="4" label="D"`)
    host.addEventListener("ui-moved", () => (host.value = 4))
    const changes = events(host, "ui-changed")
    control.focus()
    await userEvent.keyboard("{ArrowRight}")
    await settle()
    expect([host.value, changes]).toEqual([4, []])
  })

  test("readonly and disabled never change;  disabled leaves the tab order", async () => {
    const { host, control } = await dial(`readonly value="4" label="D"`)
    control.focus()
    await userEvent.keyboard("{ArrowRight}{End}")
    await settle()
    expect(host.value).toBe(4)
    expect(control.getAttribute("aria-readonly")).toBe("true")
    const { control: off, host: disabled } = await dial(`disabled value="4" label="D"`)
    expect(off.hasAttribute("tabindex")).toBe(false)
    expect(off.getAttribute("aria-disabled")).toBe("true")
    expect(disabled.matches(":state(disabled)")).toBe(true)
  })
})

describe("<ui-dial> wheel", () => {
  test("turns a step a notch ONLY while focused;  unfocused, the page keeps its scroll", async () => {
    const { host, control } = await dial(`value="10" label="D"`)
    const wheel = (deltaY: number) => {
      const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true, composed: true })
      control.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(wheel(-100)).toBe(false)
    await settle()
    expect(host.value).toBe(10)
    control.focus()
    expect([wheel(-100), wheel(-100), wheel(100)]).toEqual([true, true, true])
    await settle()
    expect(host.value).toBe(11)
  })
})

////////////////
// ## Pointer
////////////////

describe("<ui-dial> pointer", () => {
  test("pressing the ring jumps the handle there;  dragging turns it;  ui-changed once at the end", async () => {
    const { host, control } = await dial(`value="0" label="D"`)
    const moves = events(host, "ui-moved")
    const changes = events(host, "ui-changed")
    point("pointerdown", control, 0)
    await settle()
    expect(host.value).toBe(50)
    expect(host.matches(":state(dragging)")).toBe(true)
    expect(host.shadowRoot!.activeElement).toBe(control)
    point("pointermove", control, 67.5)
    await settle()
    expect(host.value).toBe(75)
    point("pointerup", control, 67.5)
    await settle()
    expect(moves).toEqual([50, 75])
    expect(changes).toEqual([75])
    expect(host.matches(":state(dragging)")).toBe(false)
  })

  test("NEVER wraps across the gap:  dragged past max and round to the start, it stays at max", async () => {
    const { host, control } = await dial(`value="0" label="D"`)
    point("pointerdown", control, 120)
    for (const angle of [150, 180, -150, -120, -90]) point("pointermove", control, angle)
    await settle()
    expect(host.value).toBe(100)
    point("pointerup", control, -90)
  })

  test("a press on the disc's middle only focuses;  readonly ignores the pointer", async () => {
    const { host, control } = await dial(`value="30" label="D"`)
    point("pointerdown", control, 90, 4)
    await settle()
    expect(host.value).toBe(30)
    expect(host.shadowRoot!.activeElement).toBe(control)
    const { host: fixed, control: fixedControl } = await dial(`readonly value="30" label="D"`)
    point("pointerdown", fixedControl, 90)
    await settle()
    expect(fixed.value).toBe(30)
  })
})

////////////////
// ## Forms
////////////////

describe("<ui-dial> forms", () => {
  test("submits `value`;  resets to the attribute;  restores a saved state", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(
      `<form><ui-dial name="size" value="7" label="Size"></ui-dial></form>`
    )
    await settle()
    expect([...new FormData(form)]).toEqual([["size", "7"]])
    const size = form.querySelector<Dial & { formStateRestoreCallback(state: unknown, mode: string): void }>("ui-dial")!
    size.value = 30
    await settle()
    expect(new FormData(form).get("size")).toBe("30")
    form.reset()
    await settle()
    expect(new FormData(form).get("size")).toBe("7")
    size.formStateRestoreCallback("42", "restore")
    await settle()
    expect(new FormData(form).get("size")).toBe("42")
  })

  test("`required`:  fails while no value was set, though the handle rests at `min`;  met once one is", async () => {
    const { host } = await dial(`required name="d" label="D"`)
    expect(host.checkValidity()).toBe(false)
    host.value = 0
    await settle()
    expect(host.checkValidity()).toBe(true)
  })

  test("is named by a <label for> across the shadow boundary", async () => {
    const container = await ElementFixture.render(
      `<div><label for="dial-gain">Gain</label><ui-dial id="dial-gain"></ui-dial></div>`
    )
    await settle()
    const control = parts(container.querySelector("ui-dial")!).control
    expect(control.getAttribute("aria-label")).toBe("Gain")
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-dial> accessibility", () => {
  test.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await settle()
    await expectAccessible(root)
  })
})
