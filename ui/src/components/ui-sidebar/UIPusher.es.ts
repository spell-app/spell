import type { E } from "spell-ui/core"

/**
 * `<ui-pusher>` in Spanish:  `<es-empujador>`, with the names and texts only it uses (from `UIPusher.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const pusherEs = {
  lang: "es",
  tag: "ui-pusher",
  name: "empujador",
  aka: ["contenido de página", "contenido desplazado", "empujador"],
  parts: { pusher: "empujador" }
} as const satisfies E.TagDictionary
