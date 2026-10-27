import type { E } from "spell/ui/core"

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
    or: "o"
  }
} as const satisfies E.TagDictionary
