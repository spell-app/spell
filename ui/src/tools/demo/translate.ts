/**
 * Spell UI in Spanish:  every component named in Spanish at once (`defineComponents()`), its texts too.
 * - `es-cambio` / `es-alternar` events are logged.
 */

import { UI } from "spell-ui"
import { es } from "spell-ui/components/components.es"

const ui = await UI.load()
ui.vocabulary.defineComponents({ prefix: "es", dictionary: es })
ui.i18n.registerDictionary(es)
ui.i18n.locale = "es"

const log = document.getElementById("log")!
for (const name of ["es-cambio", "es-alternar"]) {
  document.addEventListener(name, (event) => {
    log.textContent += `${name} ${JSON.stringify((event as CustomEvent).detail, ["value", "active"])}\n`
  })
}
