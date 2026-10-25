import type { E } from "spell-ui/core"

/**
 * `<ui-embed>` in Spanish:  `<es-incrustado>`, with the names and texts only it uses (from `UIEmbed.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const embedEs = {
  lang: "es",
  tag: "ui-embed",
  name: "incrustado",
  aka: ["insertar", "contenido incrustado", "iframe", "vídeo", "reproductor"],
  attributes: {
    "video-id": "id-video",
    "aspect-ratio": "proporcion",
    autoplay: "reproduccion-automatica",
    parameters: "parametros"
  },
  events: { "ui-loading": "cargando", "ui-reset": "restablecer" },
  parts: { embed: "incrustado", play: "reproducir", frame: "marco" },
  texts: { embedPlay: "Reproducir {name}", embedVideo: "vídeo", embedContent: "contenido incrustado" }
} as const satisfies E.TagDictionary
