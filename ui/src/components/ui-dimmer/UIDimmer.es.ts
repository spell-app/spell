import type { E } from "spell-ui/core"

/**
 * `<ui-dimmer>` in Spanish:  `<es-atenuador>`, with the names and texts only it uses (from `UIDimmer.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const dimmerEs = {
  lang: "es",
  tag: "ui-dimmer",
  name: "atenuador",
  aka: ["atenuador", "superposición", "fondo oscuro", "máscara", "capa"],
  attributes: { shade: "sombra", page: "pagina", "show-on": "mostrar-al" },
  values: { closedby: { none: "none" } },
  parts: { dimmer: "atenuador" },
  texts: { dimmedPage: "Página atenuada" }
} as const satisfies E.TagDictionary
