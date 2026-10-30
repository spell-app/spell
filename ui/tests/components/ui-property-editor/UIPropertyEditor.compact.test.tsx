import { describe, expect, it } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { PropertySchema } from "spell/ui/vocabulary"

import "spell/ui"

////////////////
// ## Helpers
////////////////

/** A `<ui-property-editor>`, as the tests set it. */
type Editor = HTMLElement & { schema: unknown; value: unknown }

/** A schema of a routine:  text, choices, numbers, an icon row, a hue, yes-or-no fields (epic `debut` P31). */
const ROUTINE: PropertySchema = {
  name: "Routine",
  attributes: [
    { name: "name", kind: "string", type: "text", description: "", hint: "LaTeX", tip: "Shown on the circuit." },
    { name: "kind", kind: "enum", type: "choice", values: ["gate", "measure"], default: "gate", description: "" },
    { name: "steps", kind: "number", type: "number", default: 1, description: "" },
    { name: "align", kind: "textAlign", default: "left", description: "" },
    { name: "color", kind: "color", description: "" },
    { name: "controlled", kind: "boolean", description: "", tip: "Runs only when its control is on." },
    { name: "inverse", kind: "boolean", description: "" },
    { name: "barrier", kind: "boolean", description: "" },
    { name: "visible", kind: "boolean", default: true, description: "" },
    { name: "locked", kind: "boolean", description: "" }
  ]
}

/** A value of every property, as a routine holds it. */
const VALUE = () => ({
  name: "QFT",
  kind: "gate",
  steps: 3,
  align: "center",
  color: "violet",
  controlled: true,
  inverse: false,
  barrier: true,
  visible: true,
  locked: false
})

/** The routine's editor, laid out in two groups;  settled. */
async function editor(attributes = "", value: object = VALUE(), groupAttributes = "") {
  const host = await ElementFixture.render<Editor>(
    `<ui-property-editor ${attributes} style="width: 340px">
       <ui-property-group label="Defaults">
         <ui-property name="name"></ui-property>
         <ui-property name="kind"></ui-property>
         <ui-property name="steps"></ui-property>
         <ui-property name="align"></ui-property>
         <ui-property name="color"></ui-property>
       </ui-property-group>
       <ui-property-group label="Behaviour" ${groupAttributes}>
         <ui-property name="controlled"></ui-property>
         <ui-property name="inverse"></ui-property>
         <ui-property name="barrier"></ui-property>
       </ui-property-group>
       <ui-property-group label="Layout">
         <ui-property name="visible"></ui-property>
         <ui-property name="locked"></ui-property>
       </ui-property-group>
     </ui-property-editor>`
  )
  host.schema = ROUTINE
  host.value = value
  await settle(host)
  return host
}

/** Let the editor make its properties and controls, bind them and draw. */
async function settle(host: Element) {
  for (let round = 0; round < 6; round++) {
    await ElementFixture.settle(host)
    await ElementFixture.tick()
  }
}

/** Property `name`. */
function property(host: Element, name: string): HTMLElement {
  return host.querySelector(`ui-property[name="${name}"]`) as HTMLElement
}

/** Property `name`'s field box (its shadow root's). */
function field(host: Element, name: string): HTMLElement {
  return property(host, name).shadowRoot!.querySelector(".field") as HTMLElement
}

/** Does property `name` carry `:state(state)`? */
function has(host: Element, name: string, state: string): boolean {
  return property(host, name).matches(`:state(${state})`)
}

////////////////
// ## Compact
////////////////

describe("<ui-property-editor compact>", () => {
  it("is tight:  13px text, regular labels, 3px under each label, and its properties and groups say so", async () => {
    const host = await editor("compact")
    expect(host.matches(":state(compact)")).toBe(true)
    expect(has(host, "name", "compact")).toBe(true)
    expect(host.querySelector("ui-property-group")!.matches(":state(compact)")).toBe(true)
    const row = field(host, "name").querySelector(".row")!
    expect(getComputedStyle(row).fontWeight).toBe("400")
    expect(getComputedStyle(row).marginBottom).toBe("3px")
    expect(getComputedStyle(field(host, "name")).fontSize).toBe("13px")
  })

  it("lays short fields two to a row, and the rest across the row", async () => {
    const host = await editor("compact")
    expect(has(host, "kind", "half")).toBe(true)
    expect(has(host, "steps", "half")).toBe(true)
    expect(has(host, "name", "half")).toBe(false)
    const kind = field(host, "kind").getBoundingClientRect()
    const steps = field(host, "steps").getBoundingClientRect()
    const name = field(host, "name").getBoundingClientRect()
    expect(Math.round(kind.top)).toBe(Math.round(steps.top))
    expect(steps.left).toBeGreaterThan(kind.right)
    expect(Math.round(name.width)).toBeGreaterThan(Math.round(kind.width * 2))
  })

  it("takes a property's own `width` over its kind's", async () => {
    const host = await editor("compact")
    property(host, "name").setAttribute("width", "1/2")
    property(host, "kind").setAttribute("width", "16")
    await settle(host)
    expect(has(host, "name", "half")).toBe(true)
    expect(has(host, "kind", "half")).toBe(false)
  })

  it("puts a yes or no on one line:  the box, then its label", async () => {
    const host = await editor("compact")
    expect(has(host, "visible", "inline-check")).toBe(true)
    const box = property(host, "visible").querySelector("ui-checkbox")!.getBoundingClientRect()
    const label = field(host, "visible").querySelector(".label")!.getBoundingClientRect()
    expect(Math.abs(box.top + box.height / 2 - (label.top + label.height / 2))).toBeLessThan(3)
    expect(label.left).toBeGreaterThan(box.left)
  })

  it("shows the hint at the end of the label row", async () => {
    const host = await editor("compact")
    const hint = field(host, "name").querySelector(".row > .hint")!
    expect(hint.textContent).toBe("LaTeX")
    expect(field(host, "name").querySelector(":scope > .hint")).toBeNull()
  })

  it("draws the band tight, its look from the theme's tokens", async () => {
    const host = await editor("compact")
    const group = host.querySelector("ui-property-group")!
    const heading = () => group.shadowRoot!.querySelector(".title > .heading")!
    expect(getComputedStyle(heading()).textTransform).toBe("none")
    expect(getComputedStyle(heading()).fontSize).toBe("13px")
    host.style.setProperty("--ui-property-editor-band-transform", "uppercase")
    host.style.setProperty("--ui-property-editor-band-size", "11px")
    expect(getComputedStyle(heading()).textTransform).toBe("uppercase")
    expect(getComputedStyle(heading()).fontSize).toBe("11px")
  })

  it("fits at least 16 fields in 600px", async () => {
    const host = await editor("compact")
    // every property counts, a pill too:  each is a field the reader can set
    const height = host.getBoundingClientRect().height
    expect((10 * 600) / height).toBeGreaterThanOrEqual(16)
  })
})

describe("<ui-property-editor> without `compact`", () => {
  it("keeps today's look:  one field a row, bold labels, the hint under the control", async () => {
    const host = await editor()
    expect(host.matches(":state(compact)")).toBe(false)
    expect(host.matches(":state(grid)")).toBe(false)
    expect(getComputedStyle(field(host, "name").querySelector(".row")!).fontWeight).toBe("700")
    expect(field(host, "name").querySelector(":scope > .hint")!.textContent).toBe("LaTeX")
    const kind = field(host, "kind").getBoundingClientRect()
    const steps = field(host, "steps").getBoundingClientRect()
    expect(steps.top).toBeGreaterThan(kind.bottom - 1)
    expect(has(host, "visible", "inline-check")).toBe(false)
  })

  it("lays fields on `columns` all the same", async () => {
    const host = await editor(`columns="2"`)
    expect(host.matches(":state(grid)")).toBe(true)
    const kind = field(host, "kind").getBoundingClientRect()
    const steps = field(host, "steps").getBoundingClientRect()
    expect(Math.round(kind.top)).toBe(Math.round(steps.top))
  })

  it("takes a group's own `columns` over its editor's", async () => {
    const host = await editor("compact", VALUE(), `columns="1"`)
    const group = host.querySelectorAll("ui-property-group")[1]!
    expect(getComputedStyle(group.shadowRoot!.querySelector(".content")!).gridTemplateColumns.split(" ")).toHaveLength(
      1
    )
  })
})

////////////////
// ## A value other than its default
////////////////

describe("<ui-property-editor show-defaults>", () => {
  it("marks a value other than its default `:state(set)`, compact or not", async () => {
    for (const attributes of ["", "compact"]) {
      const host = await editor(attributes)
      expect(has(host, "kind", "set")).toBe(false) // "gate", its default
      expect(has(host, "steps", "set")).toBe(true) // 3, not 1
      expect(has(host, "name", "set")).toBe(true) // no default:  any value
      expect(has(host, "visible", "set")).toBe(false) // true, its default
      expect(has(host, "locked", "set")).toBe(false) // off, no default
      host.remove()
    }
  })

  it("bolds a changed value only with `show-defaults`", async () => {
    const plain = await editor("compact")
    const input = (host: Element) =>
      property(host, "steps").querySelector("ui-input")!.shadowRoot!.querySelector("input")!
    expect(getComputedStyle(input(plain)).fontWeight).toBe("400")
    plain.remove()
    const shown = await editor("compact show-defaults")
    expect(getComputedStyle(input(shown)).fontWeight).toBe("700")
    expect(
      getComputedStyle(property(shown, "kind").querySelector("ui-select")!.shadowRoot!.querySelector("select")!)
        .fontWeight
    ).toBe("400")
  })

  it("follows a person's edit:  set back to its default, it's plain again", async () => {
    const host = await editor("compact show-defaults", { ...VALUE(), kind: "measure" })
    expect(has(host, "kind", "set")).toBe(true)
    const select = property(host, "kind").querySelector("ui-select") as HTMLElement & { value: string }
    select.value = "gate"
    select.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "gate" }, bubbles: true, composed: true }))
    await settle(host)
    expect(has(host, "kind", "set")).toBe(false)
  })

  it("takes a property's own `default` when the schema has none", async () => {
    const host = await editor("compact")
    property(host, "color").setAttribute("default", "violet")
    await settle(host)
    expect(has(host, "color", "set")).toBe(false)
  })
})

////////////////
// ## Yes-or-no runs as pills
////////////////

describe("<ui-property-group> yes-or-no runs", () => {
  it("draws three or more side by side as one select of pills;  two stay checkboxes", async () => {
    const host = await editor("compact")
    expect(has(host, "controlled", "flags")).toBe(true)
    expect(has(host, "inverse", "flag")).toBe(true)
    expect(has(host, "barrier", "flag")).toBe(true)
    expect(has(host, "visible", "flags")).toBe(false)
    expect(has(host, "visible", "flag")).toBe(false)
    const select = property(host, "controlled").querySelector("ui-dropdown") as HTMLElement & { value: unknown }
    expect([...select.querySelectorAll("ui-item")].map((item) => item.getAttribute("value"))).toEqual([
      "controlled",
      "inverse",
      "barrier"
    ])
    expect(select.querySelector("ui-item[value=controlled]")!.getAttribute("title")).toBe(
      "Runs only when its control is on."
    )
    expect(field(host, "controlled").querySelector(".label")!.textContent).toBe("Options")
    expect(select.value).toEqual(["controlled", "barrier"])
  })

  it("keeps each its own property:  a pill added or removed sets it, and the thing", async () => {
    const thing = VALUE()
    const host = await editor("compact", thing)
    const select = property(host, "controlled").querySelector("ui-dropdown")!
    select.dispatchEvent(
      new CustomEvent("ui-changed", { detail: { value: ["inverse", "barrier"] }, bubbles: true, composed: true })
    )
    await settle(host)
    expect(thing.controlled).toBe(false)
    expect(thing.inverse).toBe(true)
    expect(thing.barrier).toBe(true)
  })

  it("takes a group's `flags`:  `checkboxes` never, `pills` any run", async () => {
    const never = await editor("compact", VALUE(), `flags="checkboxes"`)
    expect(has(never, "controlled", "flags")).toBe(false)
    never.remove()
    const host = await ElementFixture.render<Editor>(
      `<ui-property-editor compact>
         <ui-property-group label="Layout" flags="pills">
           <ui-property name="visible"></ui-property>
           <ui-property name="locked"></ui-property>
         </ui-property-group>
       </ui-property-editor>`
    )
    host.schema = ROUTINE
    host.value = VALUE()
    await settle(host)
    expect(has(host, "visible", "flags")).toBe(true)
  })
})

////////////////
// ## Icons and segmented rows
////////////////

describe("<ui-property> choices with icons", () => {
  it("draws four or fewer choices, all with icons, as a segmented row of icons, read and written by the form", async () => {
    const thing = VALUE()
    const host = await editor("compact", thing)
    const menu = property(host, "align").querySelector("ui-menu") as HTMLElement & { value: string }
    expect(menu.getAttribute("appearance")).toBe("segmented")
    expect(menu.hasAttribute("icon")).toBe(true)
    const items = [...menu.querySelectorAll("ui-item")] as (HTMLElement & { selected: boolean })[]
    expect(items.map((item) => item.getAttribute("icon"))).toEqual([
      "align left",
      "align center",
      "align right",
      "align justify"
    ])
    expect(items.map((item) => item.getAttribute("title"))).toEqual(["left", "center", "right", "justified"])
    await expect.poll(() => items.map((item) => item.selected)).toEqual([false, true, false, false])
    await userEvent.click(items[2]!.shadowRoot!.firstElementChild as HTMLElement)
    await settle(host)
    expect(menu.value).toBe("right")
    expect(thing.align).toBe("right")
  })

  it("shows a hue's chip before its name", async () => {
    const host = await editor("compact")
    const violet = property(host, "color").querySelector("ui-item[value=violet]")!
    expect(violet.getAttribute("image")).toMatch(/^data:image\/svg\+xml,/)
  })
})
