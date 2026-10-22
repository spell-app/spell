import type { E } from "spell-ui/core"

/**
 * `<ui-embed>` in Spanish:  `<es-incrustado>`, its own names and texts (`UIEmbed.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
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
    "branded-ui": "interfaz-marca",
    parameters: "parametros"
  },
  events: { "ui-activate": "activar", "ui-reset": "restablecer" },
  parts: { embed: "incrustado", play: "reproducir", frame: "marco" },
  texts: { embedPlay: "Reproducir {name}", embedVideo: "vídeo", embedContent: "contenido incrustado" }
} as const satisfies E.TagDictionary
