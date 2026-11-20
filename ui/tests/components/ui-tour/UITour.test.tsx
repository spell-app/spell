import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { UI } from "spell/ui/runtime"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Fixture } from "spell/test-helpers/Fixture"
import { UITour, type DOMTourElement, type TourControl } from "spell/ui/components/ui-tour"

import "spell/ui/components/ui-tour"

/** A tour of three steps over two buttons:  the middle one named `save`, the last pointing at nothing. */
const TOUR = `
  <div>
    <button id="tour-new">New</button>
    <button id="tour-save">Save</button>
    <ui-tour name="Test tour">
      <ui-tour-step target="tour-new">One</ui-tour-step>
      <ui-tour-step name="save" target="tour-save">Two</ui-tour-step>
      <ui-tour-step>Three</ui-tour-step>
    </ui-tour>
  </div>`

/** The key the test tours remember under. */
const SEEN_KEY = "spell-ui-tours:seen:Test tour"

/** Render `html` and wait for its tour. */
async function tourIn(html = TOUR) {
  const host = await ElementFixture.render<HTMLElement>(html)
  const tour = (host.localName === "ui-tour" ? host : host.querySelector("ui-tour")) as unknown as DOMTourElement
  await tour.ready
  await Promise.all(
    [...tour.querySelectorAll<HTMLElement & { ready: Promise<unknown> }>("ui-tour-step")].map((step) => step.ready)
  )
  return { host, tour }
}

/** The tour's shadow root's element matching `selector`. */
function inTour(tour: Element, selector: string): HTMLElement | null {
  return tour.shadowRoot!.querySelector<HTMLElement>(selector)
}

/** Collect `detail`s of `name` events. */
function record<T>(target: EventTarget, name: string) {
  const details: T[] = []
  target.addEventListener(name, (event) => details.push((event as CustomEvent<T>).detail))
  return details
}

beforeEach(async () => {
  await UI.load()
  localStorage.removeItem(SEEN_KEY)
})

afterEach(() => {
  UITour.running?.stop()
  localStorage.removeItem(SEEN_KEY)
})

////////////////
// ## Steps
////////////////

describe("<ui-tour> steps", () => {
  test("draws nothing until it starts;  then one step at a time, the others hidden", async () => {
    const { tour } = await tourIn()
    expect(tour.matches(":popover-open")).toBe(false)
    expect(tour.start()).toBe(true)
    await ElementFixture.settle()
    expect(tour.matches(":popover-open")).toBe(true)
    expect(tour.running).toBe(true)
    expect(tour.step).toBe(1)
    const steps = [...tour.querySelectorAll("ui-tour-step")]
    expect(steps.map((step) => step.hidden)).toEqual([false, true, true])
    tour.next()
    await ElementFixture.settle()
    expect(tour.step).toBe(2)
    expect(steps.map((step) => step.hidden)).toEqual([true, false, true])
  })

  test("goes back, jumps by number or name, and ends `done` after its last step", async () => {
    const { tour } = await tourIn()
    const ended = record<{ reason: string }>(tour, "ui-ended")
    const stepped = record<{ from: number; to: number; name: string }>(tour, "ui-stepped")
    tour.start()
    tour.show("save")
    tour.back()
    tour.show(3)
    tour.next()
    await ElementFixture.settle()
    expect(stepped.map(({ from, to, name }) => [from, to, name])).toEqual([
      [0, 1, ""],
      [1, 2, "save"],
      [2, 1, ""],
      [1, 3, ""]
    ])
    expect(ended).toEqual([{ reason: "done" }])
    expect(tour.running).toBe(false)
    expect(tour.matches(":popover-open")).toBe(false)
  })

  test("rings the step's target, and a step with nothing to point at sits near the top", async () => {
    const { host, tour } = await tourIn()
    tour.start()
    await ElementFixture.settle()
    const ring = inTour(tour, "[part~=ring]")!
    const target = host.querySelector("#tour-new")!.getBoundingClientRect()
    await expect.poll(() => Math.round(ring.getBoundingClientRect().left)).toBe(Math.round(target.left - 6))
    tour.show(3)
    await ElementFixture.settle()
    expect(ring.classList.contains("pointless")).toBe(true)
    expect(inTour(tour, "[part~=box]")!.classList.contains("pointless")).toBe(true)
  })

  test("skips a step whose target isn't on the page", async () => {
    const { tour } = await tourIn(`
      <ui-tour name="Test tour">
        <ui-tour-step>One</ui-tour-step>
        <ui-tour-step target="nothing-by-this-name">Two</ui-tour-step>
        <ui-tour-step>Three</ui-tour-step>
      </ui-tour>`)
    tour.start()
    tour.next()
    expect(tour.step).toBe(3)
    tour.back()
    expect(tour.step).toBe(1)
  })

  test("only one tour runs on a page:  starting one stops the other", async () => {
    const { host, tour } = await tourIn()
    const other = Fixture.render<DOMTourElement>(`<ui-tour name="Other"><ui-tour-step>Hi</ui-tour-step></ui-tour>`)
    host.append(other)
    await other.ready
    tour.start()
    other.start()
    expect(tour.running).toBe(false)
    expect(other.running).toBe(true)
    expect(UITour.running).toBe(other)
  })
})

////////////////
// ## Dimming and waiting
////////////////

describe("<ui-tour> dimming and waiting", () => {
  test("dim darkens all but the target, by the ring's shadow;  off by default, and a step can turn it off", async () => {
    const { tour } = await tourIn(`
      <div><button id="tour-new">New</button>
      <ui-tour name="Test tour" dim>
        <ui-tour-step target="tour-new">One</ui-tour-step>
        <ui-tour-step target="tour-new" dim="false">Two</ui-tour-step>
      </ui-tour></div>`)
    tour.start()
    await ElementFixture.settle()
    const ring = inTour(tour, "[part~=ring]")!
    expect(ring.classList.contains("dim")).toBe(true)
    expect(getComputedStyle(ring).boxShadow).not.toBe("none")
    tour.next()
    await ElementFixture.settle()
    expect(ring.classList.contains("dim")).toBe(false)
  })

  test("a step that waits for a click masks the rest, hides Next, and goes on once its target is clicked", async () => {
    const { host, tour } = await tourIn(`
      <div><button id="tour-new">New</button><button id="tour-other">Other</button>
      <ui-tour name="Test tour">
        <ui-tour-step target="tour-new" wait-for="click">Press New</ui-tour-step>
        <ui-tour-step>Done</ui-tour-step>
      </ui-tour></div>`)
    tour.start()
    await ElementFixture.settle()
    expect(tour.shadowRoot!.querySelectorAll(".mask").length).toBe(4)
    expect(inTour(tour, ".next")).toBeNull()
    // a click elsewhere (clear of the ring round the target) lands on a mask, not the page
    const other = host.querySelector<HTMLElement>("#tour-other")!
    const box = other.getBoundingClientRect()
    const hit = document.elementFromPoint(box.right - 2, box.top + box.height / 2)
    expect(hit).toBe(tour)
    // the target itself can be clicked
    await userEvent.click(host.querySelector("#tour-new")!)
    await expect.poll(() => tour.step).toBe(2)
    expect(tour.shadowRoot!.querySelectorAll(".mask").length).toBe(0)
  })
})

////////////////
// ## Closing
////////////////

describe("<ui-tour> closing", () => {
  test("Escape closes it, `closed`", async () => {
    const { tour } = await tourIn()
    const ended = record<{ reason: string }>(tour, "ui-ended")
    tour.start()
    await ElementFixture.settle()
    await userEvent.keyboard("{Escape}")
    expect(ended).toEqual([{ reason: "closed" }])
    expect(tour.running).toBe(false)
  })

  test("its ✕ closes it, `closed`;  stop() is `stopped`", async () => {
    const { tour } = await tourIn()
    const ended = record<{ reason: string }>(tour, "ui-ended")
    tour.start()
    await ElementFixture.settle()
    inTour(tour, "[part~=close]")!.click()
    tour.start()
    tour.stop()
    expect(ended).toEqual([{ reason: "closed" }, { reason: "stopped" }])
  })

  test("ui-starting can keep it from starting", async () => {
    const { tour } = await tourIn()
    tour.addEventListener("ui-starting", (event) => event.preventDefault(), { once: true })
    expect(tour.start()).toBe(false)
    expect(tour.running).toBe(false)
  })
})

////////////////
// ## Remembering and offering
////////////////

describe("<ui-tour> remember and offer", () => {
  test("remember keeps it as taken in this browser once finished or closed;  stopped by code, it isn't", async () => {
    const { tour } = await tourIn(TOUR.replace('name="Test tour"', 'name="Test tour" remember'))
    tour.start()
    tour.stop()
    expect(localStorage.getItem(SEEN_KEY)).toBeNull()
    tour.start()
    tour.show(3)
    tour.next()
    expect(localStorage.getItem(SEEN_KEY)).not.toBeNull()
    expect(tour.seen).toBe(true)
    expect(await tour.offerToStart()).toBe(false)
    tour.forget()
    expect(localStorage.getItem(SEEN_KEY)).toBeNull()
    expect(tour.seen).toBe(false)
  })

  test('remember="on server" keeps it with the page server\'s preferences, not this browser', async () => {
    const { tour } = await tourIn(TOUR.replace('name="Test tour"', 'name="Test tour" remember="on server"'))
    tour.start()
    tour.stop()
    expect(tour.seen).toBe(false)
    tour.start()
    tour.show(3)
    tour.next()
    expect(tour.seen).toBe(true)
    expect(localStorage.getItem(SEEN_KEY)).toBeNull()
  })

  test("offers itself as `offer` says:  a note to ask (the default), straight away, or a dot;  once a visit", async () => {
    // @ts-expect-error -- the page-wide "offered this visit", reset for each case
    const reset = () => (UITour.hasOffered = false)
    reset()
    const asking = await tourIn()
    expect(await asking.tour.offerToStart()).toBe(true)
    await ElementFixture.settle()
    expect(inTour(asking.tour, "[part~=offer]")).not.toBeNull()
    expect(await asking.tour.offerToStart()).toBe(false)
    inTour(asking.tour, ".start")!.click()
    expect(asking.tour.running).toBe(true)
    asking.tour.stop()

    reset()
    const starting = await tourIn(TOUR.replace('name="Test tour"', 'name="Test tour" offer="start"'))
    expect(await starting.tour.offerToStart()).toBe(true)
    expect(starting.tour.running).toBe(true)
    starting.tour.stop()

    reset()
    const dotting = await tourIn(TOUR.replace('name="Test tour"', 'name="Test tour" offer="dot"'))
    expect(await dotting.tour.offerToStart()).toBe(true)
    await ElementFixture.settle()
    const dot = inTour(dotting.tour, "[part~=dot]")!
    expect(dot).not.toBeNull()
    dot.click()
    expect(dotting.tour.running).toBe(true)
  })

  test("No thanks turns the offer down for good, with remember", async () => {
    // @ts-expect-error -- the page-wide "offered this visit"
    UITour.hasOffered = false
    const { tour } = await tourIn(TOUR.replace('name="Test tour"', 'name="Test tour" remember'))
    await tour.offerToStart()
    await ElementFixture.settle()
    inTour(tour, ".never")!.click()
    expect(tour.seen).toBe(true)
    expect(tour.matches(":popover-open")).toBe(false)
  })
})

////////////////
// ## The page's tour control
////////////////

describe("UITour.control", () => {
  test("is on the page, by its symbol, for Spell's tour words", async () => {
    const { tour } = await tourIn()
    const control = (globalThis as Record<symbol, unknown>)[Symbol.for("spell-ui:tours")] as TourControl
    expect(control.start("No such tour")).toBe(false)
    expect(control.start("Test tour")).toBe(true)
    control.show("save")
    expect(tour.step).toBe(2)
    control.back()
    expect(tour.step).toBe(1)
    control.next()
    expect(tour.step).toBe(2)
    control.stop()
    expect(tour.running).toBe(false)
  })

  test("finds a target inside a shadow root, by its id", async () => {
    const { host, tour } = await tourIn(`
      <div><div id="shadow-host"></div>
      <ui-tour name="Test tour"><ui-tour-step target="deep-one">One</ui-tour-step></ui-tour></div>`)
    const shadow = host.querySelector("#shadow-host")!.attachShadow({ mode: "open" })
    shadow.innerHTML = `<button id="deep-one">Deep</button>`
    expect(UITour.targetFor("deep-one")).toBe(shadow.querySelector("#deep-one"))
    expect(tour.start()).toBe(true)
  })
})
