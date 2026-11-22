import { fileURLToPath } from "node:url"

import { SRV } from "spell/server"
import { CodeEngine } from "spell/ui/components/ui-code/CodeEngine"
// Import directly:  node-safe and import-free, the text `<ui-code>` itself reads (`LoadableComponent`)
import { InlineText } from "spell/ui/elements/InlineText"
import { DrawnItems } from "./DrawnItems.server"

/****************
 * ### `CodeOnServer`
 * `<ui-code>`'s colours drawn ahead, on the page server (`SRV.Drawings`, kind `code`):  highlight.js in the server's
 * own process, the same engine and languages a page loads (`CodeEngine`).
 * - `find()`:  each `<ui-code>` in a page with its own text (no `source`), its `language` and whether it may be drawn
 *   whole (no `line-numbers`, no `wrap`), as the element reads them (`UICode.givenColours()`)
 * - `draw()`:  the language asked for, or highlight.js's guess when none;  a language highlight.js doesn't have
 *   (spell, a page's own) it leaves to another drawer (the app's Spell) or to the page
 * - plain text (`language="text"`) never:  the page colours nothing for it
 * - Node only:  the page server loads it through Spell UI's route module (`drawingRoutes.server.ts`).
 ****************/
export class CodeOnServer implements SRV.Drawer {
  readonly kind = CODE_KIND
  readonly name = "highlight-js"

  /** highlight.js's engine and this file:  a change to either draws everything again. */
  readonly version = SRV.codeVersion([
    fileURLToPath(new URL("../components/ui-code/CodeEngine.ts", import.meta.url)),
    fileURLToPath(import.meta.url),
    fileURLToPath(import.meta.resolve("highlight.js/package.json"))
  ])()

  /** Every language but plain text and the ones highlight.js doesn't know (`draw()` says). */
  takes(item: SRV.DrawingItem): boolean {
    return languageOf(item).toLowerCase() !== PLAIN_TEXT
  }

  /** The `<ui-code>`s in `page` with text of their own. */
  find(page: string): SRV.DrawingItem[] {
    return DrawnItems.elementsIn(page, TAG).flatMap((element) => {
      if (element.hasAttribute("source")) return []
      const language = element.getAttribute("language") ?? ""
      const drawing = !DrawnItems.isOn(element, "line-numbers") && !DrawnItems.isOn(element, "wrap")
      return [{ kind: CODE_KIND, settings: { language, drawing }, text: InlineText.of(element) }]
    })
  }

  /** The code coloured as its language, or guessed;  `undefined` for a language highlight.js doesn't have. */
  async draw(item: SRV.DrawingItem): Promise<SRV.Drawing | undefined> {
    const engine = CodeEngine.instance
    const language = languageOf(item)
    if (!language) {
      const guess = engine.detect(item.text)
      return { markup: guess.html, data: { language: guess.language, detected: true } }
    }
    const name = await engine.ensure(language)
    if (!name) return undefined
    return { markup: engine.highlight(item.text, name), data: { language: name, detected: false } }
  }
}

/** `item`'s `language`, `""` for none. */
function languageOf(item: SRV.DrawingItem): string {
  const { language } = item.settings
  return typeof language === "string" ? language : ""
}

/** The kind of drawing `<ui-code>` asks for. */
export const CODE_KIND = "code"

/** The tag it finds. */
const TAG = "ui-code"

/** `language`'s value for plain text. */
const PLAIN_TEXT = "text"
