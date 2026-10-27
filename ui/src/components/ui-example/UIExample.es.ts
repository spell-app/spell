import type { E } from "spell/ui/core"

/**
 * `<ui-example>` in Spanish:  `<es-ejemplo>` (epic `epic-engine` Q23), with the names and texts only it uses
 * (from `UIExample.en.ts`).
 * - The names it shares with other tags (`heading`, `description`, `level`, `ui-opened` ...) are translated once,
 *   for every tag:  in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const exampleEs = {
  lang: "es",
  tag: "ui-example",
  name: "ejemplo",
  aka: ["ejemplo", "demostración", "ejemplo en vivo", "muestra de código", "ver código"],
  attributes: { code: "codigo", language: "idioma", bare: "desnudo", variation: "variacion" },
  slots: { source: "fuente" },
  parts: { example: "ejemplo", demo: "demo", code: "codigo", source: "fuente" },
  texts: { showCode: "Mostrar código", hideCode: "Ocultar código" }
} as const satisfies E.TagDictionary
