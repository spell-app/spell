import type { E } from "spell-ui/core"

/**
 * `<ui-nag>` in Spanish:  `<es-aviso>`, its own names and texts (`UINag.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
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
    persist: "persistir",
    path: "ruta",
    domain: "dominio",
    secure: "seguro"
  },
  values: { samesite: { none: "none" } },
  parts: { nag: "aviso" },
  texts: { close: "Cerrar" }
} as const satisfies E.TagDictionary
