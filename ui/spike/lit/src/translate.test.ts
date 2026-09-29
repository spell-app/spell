import { describe, expect, it } from "vitest"

import { Fixture } from "$test/fixture"
import { UIButton, UIDropdown, UIItem } from "./index"
import { spanish } from "./dictionary.es"

UIItem.define("ie-elemento", spanish)
UIButton.define("ie-boton", spanish)
UIDropdown.define("ie-desplegable", spanish)

describe("translation hook", () => {
  it("reads localized attribute names and values into canonical properties", async () => {
    const element = Fixture.render<UIButton>(`<ie-boton primario color="rojo" tamano="grande">Guardar</ie-boton>`)
    await element.updateComplete
    expect(element).toBeInstanceOf(UIButton)
    expect(element.primary).toBe(true)
    expect(element.color).toBe("red")
    const button = element.shadowRoot!.querySelector("button")!
    expect(button.className).toBe("ui large red primary button")
    expect(button.getAttribute("part")).toBe("button boton")
  })

  it("reflects canonical values back under localized names", async () => {
    const element = Fixture.render<UIButton>(`<ie-boton>Guardar</ie-boton>`)
    element.color = "blue"
    element.basic = true
    await element.updateComplete
    expect(element.getAttribute("color")).toBe("azul")
    expect(element.hasAttribute("basico")).toBe(true)
    expect(element.hasAttribute("basic")).toBe(false)
  })

  it("ignores canonical attribute names (strict)", async () => {
    const element = Fixture.render<UIButton>(`<ie-boton primary>Guardar</ie-boton>`)
    await element.updateComplete
    expect(element.primary).toBe(false)
  })

  it("dispatches localized events", async () => {
    const element = Fixture.render<UIDropdown>(`<ie-desplegable seleccion marcador="Color">
      <ie-elemento valor="r">Rojo</ie-elemento><ie-elemento valor="v">Verde</ie-elemento></ie-desplegable>`)
    await element.updateComplete
    const events: string[] = []
    element.addEventListener("ie-cambio", (event) => events.push((event as CustomEvent).detail.value))
    element.addEventListener("ui-change", () => events.push("canonical!"))
    element.open = true
    await element.updateComplete
    element.shadowRoot!.querySelector<HTMLElement>(".item[data-index='1']")!.click()
    await element.updateComplete
    expect(events).toEqual(["v"])
    expect(element.getAttribute("valor")).toBe("v")
    expect(element.shadowRoot!.querySelector(".text")!.textContent!.trim()).toBe("Verde")
  })
})
