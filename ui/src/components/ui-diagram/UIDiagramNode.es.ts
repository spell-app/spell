import type { E } from "spell/ui/core"

/**
 * `<ui-diagram-node>` in Spanish:  `<es-nodo-diagrama>`, with the names only it uses.
 * - The names it shares with other tags (`name` ...) are translated once, in `components.es.ts`.
 */
export const diagramNodeEs = {
  lang: "es",
  tag: "ui-diagram-node",
  name: "nodo-diagrama",
  aka: ["caja de diagrama", "contenido de caja"],
  attributes: { resizable: "redimensionable" },
  parts: { content: "contenido" }
} as const satisfies E.TagDictionary
