import { afterEach, describe, expect, it } from "vite-plus/test"

import { MeasureSystem } from "spell/util/measures/MeasureSystem"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-dimension"

/** A `<ui-dimension>` with `attributes`, and the measure it shows. */
async function dimension(attributes: string) {
  const host = await ElementFixture.render<DOMElement>(`<ui-dimension ${attributes}></ui-dimension>`)
  await ElementFixture.settle()
  return { host, text: host.shadowRoot!.querySelector("[part~=measure]")!.textContent }
}

afterEach(() => MeasureSystem.use(undefined))

describe("<ui-dimension>", () => {
  it("shows a measure in a US reader's units", async () => {
    MeasureSystem.use("us")
    expect((await dimension(`value="172" dimension="length" unit="cm"`)).text).toBe("5 ft 8 in")
    expect((await dimension(`value="77" dimension="weight" unit="kg"`)).text).toBe("170 lb")
  })

  it("and in a metric reader's", async () => {
    MeasureSystem.use("metric")
    expect((await dimension(`value="172" dimension="length" unit="cm"`)).text).toBe("172 cm")
    expect((await dimension(`value="212" dimension="temperature" unit="°F"`)).text).toBe("100 °C")
  })

  it("in the units `in` names, by any of their names, in English or Spanish", async () => {
    expect((await dimension(`value="172" dimension="length" unit="cm" in="feet and inches"`)).text).toBe("5 ft 8 in")
    expect((await dimension(`value="172" dimension="longitud" unit="centímetro" in="pies y pulgadas"`)).text).toBe(
      "5 ft 8 in"
    )
  })

  it("a percent, with its % sign, whatever the reader's system (epic `language` P34)", async () => {
    MeasureSystem.use("us")
    expect((await dimension(`value="0.18" dimension="proportion" unit="fraction"`)).text).toBe("18%")
    expect((await dimension(`value="20" dimension="proporción" unit="por ciento"`)).text).toBe("20%")
  })

  it("shows nothing with no value, or a dimension it doesn't know", async () => {
    expect((await dimension(`dimension="length" unit="cm"`)).text).toBe("")
    expect((await dimension(`value="3" dimension="data size" unit="KB"`)).text).toBe("")
  })

  it("is accessible", async () => {
    const { host } = await dimension(`value="172" dimension="length" unit="cm"`)
    await expectAccessible(host)
  })
})
