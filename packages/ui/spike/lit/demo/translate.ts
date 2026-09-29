/**
 * Registers the Spanish tags and checks them:  classes are canonical, events are `ie-*`.
 * - Writes `PASS ...` / `FAIL ...` to `#result` for the scripted smoke run.
 */

import { UIButton, UIDropdown, UIItem } from "../src/index"
import { spanish } from "../src/dictionary.es"

UIItem.define("ie-elemento", spanish)
UIButton.define("ie-boton", spanish)
UIDropdown.define("ie-desplegable", spanish)

const dropdown = document.querySelector<UIDropdown>("#colores")!
const output = document.querySelector("#value")!
dropdown.addEventListener(
  "ie-cambio",
  (event) => (output.textContent = JSON.stringify((event as CustomEvent).detail.value))
)

const buttons = [...document.querySelectorAll<UIButton>("ie-boton")]
await Promise.all([...buttons, dropdown].map((element) => element.updateComplete))
const classes = buttons.map((button) => button.shadowRoot!.querySelector("button")!.className)
dropdown.open = true
await dropdown.updateComplete
dropdown.shadowRoot!.querySelector<HTMLElement>(".item[data-index='2']")!.click()
await dropdown.updateComplete
const ok =
  classes[0] === "ui large primary button" &&
  classes[1] === "ui red basic button" &&
  classes[2] === "ui small blue disabled button" &&
  output.textContent === '"a"'
document.querySelector("#result")!.textContent =
  `${ok ? "PASS" : "FAIL"} ${JSON.stringify({ classes, value: output.textContent })}`
