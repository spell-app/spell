import type { E } from "spell-ui/core"

/**
 * `<ui-emoji>` in Spanish:  `<es-emoji>`, with the names and texts only it uses (from `UIEmoji.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const emojiEs = {
  lang: "es",
  tag: "ui-emoji",
  name: "emoji",
  aka: ["emoji", "emoticono", "carita", "icono gestual"],
  parts: { emoji: "emoji" }
} as const satisfies E.TagDictionary
