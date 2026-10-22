import type { E } from "spell-ui/core"

/**
 * `<ui-message>` in Spanish:  `<es-mensaje>`, its own names and texts (`UIMessage.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const messageEs = {
  lang: "es",
  tag: "ui-message",
  name: "mensaje",
  aka: ["mensaje", "alerta", "aviso", "nota destacada", "mensaje de error"],
  attributes: { dismissible: "descartable" },
  events: { "ui-dismiss": "descartar" },
  texts: { dismiss: "Descartar" }
} as const satisfies E.TagDictionary
