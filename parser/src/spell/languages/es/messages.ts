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
  "redo-step": "Rehacer {step}",
  "write-refused": "No se pudo guardar tu cambio en {thing}",
  language: "es",
  "write-retry": "Reintentar",
  "read-failed": "No se puede leer ahora:  {why}",
  "saved-added": "Agregar",
  "saved-removed": "Quitar",
  "write-show-me": "Muéstrame",
  "write-merged": "{field} de {thing} también cambió en otro sitio.  Se conservó lo tuyo;  lo otro era:  {theirs}",
  "write-use-theirs": "Usar lo otro",
  "write-lost": "Otra persona cambió {field} de {thing} a la vez, y queda lo suyo.  Lo tuyo era:  {mine}",
  "write-deleted": "Otra persona borró {thing} mientras lo cambiabas.",
  "write-use-mine": "Usar lo mío",
  "write-restore": "Restaurar",
  "write-changed-under-draft":
    "Otra persona cambió {thing} mientras lo editabas.  Lo que estás editando aún no lo muestra.",
  "guest-person": "Invitado {number}"
}
