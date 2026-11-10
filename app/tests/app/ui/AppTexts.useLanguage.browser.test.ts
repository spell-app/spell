import { describe, expect, test } from "vite-plus/test"

import { UI } from "spell/ui/core"
import { appTexts } from "spell/app/app/ui/AppTexts"

/**
 * `appTexts.useLanguage()`:  a page that shows one thing in another language.
 * - Its own file:  the language is page-wide.
 */
describe("appTexts.useLanguage()", () => {
  test("speaks the language asked for, and back again", async () => {
    await appTexts.useLanguage("es")
    expect(appTexts.lang).toBe("es")
    expect(appTexts.text("save")).toBe("Guardar")
    await appTexts.useLanguage("en")
    expect(appTexts.lang).toBe("en")
    expect(appTexts.text("save")).toBe("Save")
    expect((await UI.load()).i18n.locale).toBe("en")
    // Spanish has loaded once:  the second time still switches
    await appTexts.useLanguage("es")
    expect(appTexts.text("save")).toBe("Guardar")
  })

  test("the last call wins", async () => {
    await Promise.all([appTexts.useLanguage("es"), appTexts.useLanguage("en")])
    expect(appTexts.lang).toBe("en")
    expect(appTexts.text("save")).toBe("Save")
  })
})
