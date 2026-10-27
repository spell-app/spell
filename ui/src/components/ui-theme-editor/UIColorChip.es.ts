import type { E } from "spell/ui/core"

/**
 * `<ui-color-chip>` in Spanish:  `<es-muestra-color>`, with the names only it uses (from `UIColorChip.en.ts`).
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const colorChipEs = {
  lang: "es",
  tag: "ui-color-chip",
  name: "muestra-color",
  aka: ["muestra de color", "pastilla de color", "color"],
  attributes: { color: "color", scheme: "esquema", label: "etiqueta" },
  values: { scheme: { auto: "auto", light: "claro", dark: "oscuro" } },
  parts: { chip: "muestra" }
} as const satisfies E.TagDictionary
