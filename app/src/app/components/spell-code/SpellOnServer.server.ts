import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { textHash } from "spell/util/string"
import { SRV } from "spell/server"
// Import directly:  node-safe and import-free, the text `<ui-code>` itself reads (`LoadableComponent`)
import { InlineText } from "spell/ui/elements/InlineText"
import { DrawnItems } from "spell/ui/drawings/DrawnItems.server"

/****************
 * ### `SpellOnServer`
 * Spell's bubbly look drawn ahead, on the page server (`SRV.Drawings`, kind `code`):  what `SpellLanguage`'s
 * `draw()` makes in a page, the parser and `BubblyHtml` in the server's process.
 * - Takes a `code` item in spell (`spell`, `sp`, `spell/<lang>`), drawn whole:  coloured LINES (`line-numbers`,
 *   `wrap`) it leaves to the page, as `<ui-code>` colours them with spell's own highlighter there.
 * - `find()`:  every `<spell-code>` in a page (spell unless its `language` says otherwise);  Spell UI's `CodeOnServer`
 *   finds the `<ui-code language="spell">`s
 * - `replaces`:  the app's `spell-language.js`, which the page server adds to the docs pages only to draw spell:
 *   a page whose spell is all drawn here doesn't load it (285 KB brotli), nor the parser chunk it would fetch
 * - Its drawings carry the bubbly sheet (`bubbly.css`), which a page then holds once however many blocks it shows.
 * - Node only:  the app's route module adds it (`appRoutes.ts`).
 ****************/
export class SpellOnServer implements SRV.Drawer {
  readonly kind = "code"
  readonly name = "spell"
  readonly replaces = [SPELL_LANGUAGE_SCRIPT]

  /** The parser's highlighting and the bubbly look's code and sheet:  a change to any draws everything again. */
  readonly version = [
    SRV.codeVersion([
      fileURLToPath(new URL("../../../../../parser/src/spell/highlight", import.meta.url)),
      fileURLToPath(new URL("../../../../../parser/src/spell/languages", import.meta.url)),
      fileURLToPath(new URL("./BubblyHtml.ts", import.meta.url)),
      fileURLToPath(import.meta.url)
    ])(),
    textHash(readFileSync(new URL("./bubbly.css", import.meta.url), "utf8"))
  ].join(" ")

  /** The bubbly look's sheet, read once. */
  private readonly sheet = readFileSync(new URL("./bubbly.css", import.meta.url), "utf8")

  /** Spell, in any of its names. */
  takes(item: SRV.DrawingItem): boolean {
    return typeof item.settings.language === "string" && SPELL_LANGUAGE.test(item.settings.language)
  }

  /** The `<spell-code>`s in `page` with text of their own. */
  find(page: string): SRV.DrawingItem[] {
    return DrawnItems.elementsIn(page, TAG).flatMap((element) => {
      if (element.hasAttribute("source")) return []
      const language = element.getAttribute("language") || DEFAULT_LANGUAGE
      const drawing = !DrawnItems.isOn(element, "line-numbers") && !DrawnItems.isOn(element, "wrap")
      return [{ kind: this.kind, settings: { language, drawing }, text: InlineText.of(element) }]
    })
  }

  /** The bubbly drawing, in the language's own parser;  `undefined` for coloured lines, or a language Spell lacks. */
  async draw(item: SRV.DrawingItem): Promise<SRV.Drawing | undefined> {
    if (item.settings.drawing !== true) return undefined
    const language = typeof item.settings.language === "string" ? item.settings.language : NAME
    const lang = language.split("/")[1]?.toLowerCase() ?? DEFAULT_VARIANT
    const [{ SP }, { BubblyHtml }] = await Promise.all([import("spell/parser/spell"), import("./BubblyHtml")])
    const { parser } = await SP.Language.load(lang)
    const html = BubblyHtml.write(SP.BubblyLayout.of(item.text, parser))
    // the name `<ui-code>` shows, as `CodeHighlighter` names a registered language with its variant
    const name = lang === DEFAULT_VARIANT && !language.includes("/") ? NAME : `${NAME}/${lang}`
    return { markup: html, sheet: this.sheet, data: { isDrawn: true, language: name, detected: false } }
  }
}

/** The app's page script that registers spell with a docs page's `UI.code` (`"pageScripts"`). */
const SPELL_LANGUAGE_SCRIPT = "/element/spell-language.js"

/** Spell's names as a `language`:  `spell`, `sp`, and a translation, `spell/es`. */
const SPELL_LANGUAGE = /^(spell|sp)(\/[a-z]{2})?$/i

/** The language's name (`SpellLanguage`'s). */
const NAME = "spell"

/** What `<spell-code>`'s `language` is when it says none. */
const DEFAULT_LANGUAGE = "spell"

/** The translation `spell` alone means. */
const DEFAULT_VARIANT = "en"

/** The tag it finds. */
const TAG = "spell-code"
