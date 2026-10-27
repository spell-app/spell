/**
 * The `ui-docs-theme-bench` family's shared types.
 * - Pure data (`import type` only):  node loads it (`yarn site:data`).
 */

import type { docsThemeBenchVocabulary } from "./UIDocsThemeBench.en"

/** `docsThemeBenchVocabulary`'s type. */
export type DocsThemeBenchVocabulary = typeof docsThemeBenchVocabulary

/** A text key of `<ui-docs-theme-bench>`. */
export type ThemeBenchTextKey = DocsThemeBenchVocabulary["texts"][number]["key"]
