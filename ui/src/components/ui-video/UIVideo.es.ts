import type { E } from "spell/ui/core"

/**
 * `<ui-video>` in Spanish:  `<es-video>`, with the names and texts only it uses (from `UIVideo.en.ts`).
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const videoEs = {
  lang: "es",
  tag: "ui-video",
  name: "video",
  aka: ["vídeo", "película", "reproductor de vídeo"],
  attributes: {
    autoplay: "reproducir-solo",
    muted: "silenciado",
    loop: "repetir",
    poster: "portada",
    controls: "controles",
    captions: "subtitulos",
    ratio: "proporcion"
  },
  events: { "ui-play": "reproduce", "ui-pause": "pausa", "ui-ended": "termina" },
  parts: { video: "video" },
  texts: { captions: "Subtítulos" }
} as const satisfies E.TagDictionary
