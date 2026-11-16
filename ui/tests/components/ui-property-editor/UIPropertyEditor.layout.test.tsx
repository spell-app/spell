import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { PropertyLayouts } from "spell/ui/property"

import "spell/ui"

/** A `<ui-property-editor>`, as the tests set it. */
type Editor = HTMLElement & { value: unknown }

/** Let the editor load its layout, make its properties and controls, bind them and draw. */
async function settle(host: Element) {
  await PropertyLayouts.load("ui-action")
  for (let round = 0; round < 8; round++) {
    await ElementFixture.settle(host)
    await ElementFixture.tick()
  }
}

/** A compact editor of a `<ui-action>`'s attributes, as a Spell UI tag's layout file lays them out;  settled. */
async function actionEditor(attributes = `label="Cheat" icon="eye"`, action?: object) {
  const host = await ElementFixture.render<Editor>(
    `<div><ui-action ${attributes}></ui-action>
     <ui-property-editor schema="ui-action" compact style="width: 340px"></ui-property-editor></div>`
  )
  const item = host.querySelector("ui-action")! as Element & { action?: object }
  if (action) item.action = action
  await ElementFixture.settle(item)
  const editor = host.querySelector<Editor>("ui-property-editor")!
  editor.value = item
  await settle(editor)
  return editor
}

/** The box property `name` draws:  its field's. */
function boxOf(editor: Element, name: string): DOMRect {
  const property = editor.querySelector(`ui-property[name="${name}"]`)!
  return (property.shadowRoot?.querySelector(".field") ?? property).getBoundingClientRect()
}

describe("<ui-property-editor> layout files", () => {
  it("a Spell UI tag's editor takes its layout:  its sections, rows side by side, what it leaves out", async () => {
    const editor = await actionEditor()
    const groups = [...editor.querySelectorAll("ui-property-group")].map((group) => group.getAttribute("label"))
    expect(groups).toEqual(["Appearance", "Layout"])
    const names = [...editor.querySelectorAll("ui-property")].map((property) => property.getAttribute("name"))
    expect(names).toEqual([
      "label",
      "icon",
      "appearance",
      "color",
      "disabled",
      "selected",
      "icon-only",
      "position",
      "padding"
    ])

    // a row's fields side by side, on one line, each the same share of it
    for (const row of [
      ["label", "icon"],
      ["appearance", "color"],
      ["disabled", "selected", "icon-only"]
    ]) {
      const boxes = row.map((name) => boxOf(editor, name))
      for (const box of boxes.slice(1)) expect(Math.abs(box.top - boxes[0]!.top), row.join(" ")).toBeLessThan(1)
      for (const [index, box] of boxes.slice(1).entries()) expect(box.left).toBeGreaterThan(boxes[index]!.right - 1)
      const widths = boxes.map((box) => box.width)
      expect(Math.max(...widths) - Math.min(...widths), row.join(" ")).toBeLessThan(2)
    }
    // rows one under another
    expect(boxOf(editor, "appearance").top).toBeGreaterThan(boxOf(editor, "label").bottom - 1)
    expect(boxOf(editor, "disabled").top).toBeGreaterThan(boxOf(editor, "appearance").bottom - 1)
    // a row of yes-or-no fields stays toggles, never one select of pills
    expect(editor.querySelector("ui-property[name=disabled] ui-dropdown")).toBeNull()
  })

  it("an action's own title and icon are its Label's and Icon's placeholders, while they're unset (I208)", async () => {
    const editor = await actionEditor("", { title: "Cheat", icon: "eye", isEnabled: true, run() {} })
    const label = editor.querySelector("ui-property[name=label] ui-input")!
    const icon = editor.querySelector("ui-property[name=icon] ui-icon-picker")!
    expect(label.getAttribute("placeholder")).toBe("Cheat")
    expect(icon.getAttribute("placeholder")).toBe("eye")
    await ElementFixture.settle(icon)
    await expect.poll(() => icon.shadowRoot!.querySelector(".glyph.placeholder svg")).not.toBeNull()
  })
})
