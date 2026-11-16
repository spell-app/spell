/**
 * The `ui-docs-palette` family's shared types.
 * - Pure data (`import type` only):  node loads it (`yarn site:data`).
 */

import type { docsPaletteVocabulary } from "./UIDocsPalette.en"

/** `docsPaletteVocabulary`'s type. */
export type DocsPaletteVocabulary = typeof docsPaletteVocabulary

/** A text key of `<ui-docs-palette>`. */
export type DocsPaletteTextKey = DocsPaletteVocabulary["texts"][number]["key"]
