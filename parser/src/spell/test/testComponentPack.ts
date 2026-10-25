import { SP } from "spell-parser/spell"

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
    tagFor: (word, language) => TEST_TAGS[language]?.[unaccented(word)]
  })
}

/** The test pack's tags, by language, then bare name. */
const TEST_TAGS: Record<string, Record<string, string>> = {
  en: {
    text: "ui-text",
    image: "ui-image",
    header: "ui-header",
    toolbar: "ui-toolbar",
    button: "ui-button",
    segment: "ui-segment"
  },
  es: { texto: "es-texto", imagen: "es-imagen", encabezado: "es-encabezado", boton: "es-boton" }
}

/** `word` without its accents:  `botón` => `boton`. */
function unaccented(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "")
}
