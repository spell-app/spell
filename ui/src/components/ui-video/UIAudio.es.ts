import type { E } from "spell/ui/core"

/**
 * `<ui-audio>` in Spanish:  `<es-audio>`, with the names and texts only it uses (from `UIAudio.en.ts`).
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const audioEs = {
  lang: "es",
  tag: "ui-audio",
  name: "audio",
  aka: ["audio", "sonido", "música", "efecto de sonido"],
  attributes: { autoplay: "reproducir-solo", muted: "silenciado", loop: "repetir", controls: "controles" },
  events: { "ui-play": "reproduce", "ui-pause": "pausa", "ui-ended": "termina" },
  parts: { audio: "audio" }
} as const satisfies E.TagDictionary
