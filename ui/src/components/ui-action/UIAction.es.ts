import type { E } from "spell-ui/core"
import { keyCapTextsEs } from "spell-ui/components/ui-keys/UIKeys.es"

/**
 * `<ui-action>` in Spanish:  `<es-accion>`, with the names and texts only it uses (from `UIAction.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const actionEs = {
  lang: "es",
  tag: "ui-action",
  name: "accion",
  aka: ["acción", "orden", "elemento de menú", "botón de barra", "atajo de teclado"],
  attributes: { flag: "bandera", action: "accion", shortcut: "atajo" },
  parts: { title: "titulo", shortcut: "atajo" },
  texts: { ...keyCapTextsEs }
} as const satisfies E.TagDictionary
