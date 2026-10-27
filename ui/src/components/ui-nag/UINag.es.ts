import type { E } from "spell-ui/core"

/**
 * `<ui-nag>` in Spanish:  `<es-aviso>`, with the names and texts only it uses (from `UINag.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const nagEs = {
  lang: "es",
  tag: "ui-nag",
  name: "aviso",
  aka: ["aviso", "banner", "aviso de cookies", "barra de anuncios", "banner fijo"],
  attributes: {
    bottom: "abajo",
    key: "clave",
    storage: "almacenamiento",
    expires: "caduca",
    path: "ruta",
    domain: "dominio",
    secure: "seguro"
  },
  values: { samesite: { none: "none" } },
  parts: { nag: "aviso" },
  texts: { close: "Cerrar" }
} as const satisfies E.TagDictionary
