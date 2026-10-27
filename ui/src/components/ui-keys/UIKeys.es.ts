import type { E } from "spell-ui/core"

/**
 * The words of the key caps (`keyCapTexts`), in Spanish:  as Spanish keyboards print them.
 * - Spread into both tags' texts, as the English are:  `<ui-keys>`' and `<ui-action>`'s.
 */
export const keyCapTextsEs = {
  keyControl: "Ctrl",
  keyShift: "Mayús",
  keyAlt: "Alt",
  keyMeta: "Meta",
  keyEnter: "Intro",
  keyEscape: "Esc",
  keyTab: "Tab",
  keyBackspace: "Retroceso",
  keyDelete: "Supr",
  keySpace: "Espacio"
} as const

/**
 * `<ui-keys>` in Spanish:  `<es-teclas>`, with the names and texts only it uses (from `UIKeys.en.ts`).
 * - The names it shares with other tags are translated once, for every tag:  in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const keysEs = {
  lang: "es",
  tag: "ui-keys",
  name: "teclas",
  aka: ["teclas", "atajo de teclado", "combinación de teclas"],
  attributes: { shortcut: "atajo", platform: "plataforma" },
  values: { platform: { auto: "auto", apple: "apple", other: "otra" } },
  texts: {
    command: "Comando",
    control: "Control",
    option: "Opción",
    alt: "Alt",
    shift: "Mayúsculas",
    meta: "Meta",
    or: "o",
    ...keyCapTextsEs
  }
} as const satisfies E.TagDictionary
