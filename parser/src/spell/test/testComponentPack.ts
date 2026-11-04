import { withoutAccents } from "spell/util"
import { SP } from "spell/parser/spell"

/**
 * A few of Spell UI's components, as spellx names them bare (`<text>`, `<botón>`), for spell-parser's own tests:
 * spell-parser never imports Spell UI, so spell-app registers the real pack (`SP.ComponentPacks`, epic
 * `elemental-spell` P7).
 * - English:  the tag without its `ui-`;  Spanish:  Spell UI's Spanish names, `es-` before them.
 * - SIDE EFFECT:  registers it as `"spell-ui"`, replacing any registered before.
 */
export function registerTestComponentPack(): void {
  SP.ComponentPacks.register({
    name: "spell-ui",
    tagFor: (word, language) => TEST_TAGS[language]?.[withoutAccents(word)],
    readDefault: readTestDefault
  })
}

/**
 * A sample of an app's widget defaults, in the test pack's own names (`SP.ComponentPack.readDefault()`):
 * `<ui-button>` / `<es-boton>`'s `appearance` (`apariencia`:  `pill`, `píldora`) and `fluid`, and its `label`, which
 * is content.
 */
function readTestDefault(sample: SP.DefaultSample, language: string): SP.DefaultReading {
  const bare = withoutAccents(sample.tag.replace(/^(ui|es)-/, ""))
  const tag = TEST_TAGS.en![bare] ?? CANONICAL[TEST_TAGS[language]?.[bare] ?? sample.tag]
  if (tag !== "ui-button") return { problem: "unknown-tag" }
  const written = language === "es" ? "es-boton" : "ui-button"
  const names = BUTTON_NAMES[language] ?? BUTTON_NAMES.en!
  const attribute = names[sample.attribute] ?? sample.attribute
  if (attribute === "label") return { problem: "content", tag: written }
  if (attribute === "fluid") {
    if (sample.value === true) return { tag, attribute, value: true }
    return { problem: "bad-value", tag: written, values: [], takes: "boolean" }
  }
  if (attribute !== "appearance") {
    return { problem: "unknown-attribute", tag: written, attributes: Object.keys(names) }
  }
  const values = APPEARANCES[language] ?? APPEARANCES.en!
  const value = values[withoutAccents(`${sample.value}`)]
  return value ? { tag, attribute, value } : { problem: "bad-value", tag: written, values: Object.keys(values) }
}

/** The test pack's Spanish tags, by their canonical one. */
const CANONICAL: Record<string, string> = { "es-boton": "ui-button" }

/** `<ui-button>`'s attributes in the test pack, by language:  as written => its own name. */
const BUTTON_NAMES: Record<string, Record<string, string>> = {
  en: { appearance: "appearance", fluid: "fluid", label: "label" },
  es: { apariencia: "appearance", fluido: "fluid", etiqueta: "label", appearance: "appearance" }
}

/** `<ui-button appearance>`'s values in the test pack, by language:  as written, without accents => its own. */
const APPEARANCES: Record<string, Record<string, string>> = {
  en: { basic: "basic", pill: "pill" },
  es: { basico: "basic", pildora: "pill" }
}

/** The test pack's tags, by language, then bare name. */
const TEST_TAGS: Record<string, Record<string, string>> = {
  en: {
    text: "ui-text",
    image: "ui-image",
    header: "ui-header",
    toolbar: "ui-toolbar",
    button: "ui-button",
    segment: "ui-segment",
    cards: "ui-cards",
    list: "ui-list",
    table: "ui-table",
    row: "ui-row",
    cell: "ui-cell"
  },
  es: {
    texto: "es-texto",
    imagen: "es-imagen",
    encabezado: "es-encabezado",
    boton: "es-boton",
    tarjetas: "es-tarjetas",
    tabla: "es-tabla",
    fila: "es-fila",
    celda: "es-celda"
  }
}
