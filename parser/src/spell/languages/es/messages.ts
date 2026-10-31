/**
 * Spanish's words for what the core says to the person running a program (epic `spanish` P12).
 * - Each key is one of the core's, `CORE_MESSAGES`, with the same `{placeholders}`:  see it for where each shows.
 * - Compiling a Spanish project copies them into its words file, `<Project>.es.js`'s `messages`,
 *   which the runner hands the core.
 * - Words from the glossary (`GLOSSARY.md`):  `verdadero` for true, `sí` for yes, `dibujar` for draw.
 */
import type { CoreMessages } from "spell/parser/core/core.types"

/** Spanish's messages, by the core's keys. */
export const spanishMessages: CoreMessages = {
  "expect-passed": "Como se esperaba, {what} es {expected}",
  "expect-failed": "Inesperado: {what} debería ser {expected} pero en realidad es {actual}",
  "expect-truthy": "verdadero",
  "test-step": "▶️ Ejecutando   {step}",
  "test-threw": "Error en la prueba {test}:",
  "cant-draw": "⚠ {type} no se puede dibujar",
  waiting: "…",
  "confirm-default": "{question} (sí)",
  "drop-event": "soltar-{thing}",
  undo: "Deshacer",
  "undo-step": "Deshacer {step}",
  redo: "Rehacer",
  "redo-step": "Rehacer {step}"
}
