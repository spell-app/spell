/*! SPELL: WORDS como-funciona-lista-de-tareas es */
export const words = {
  lang: "es",
  types: {
    Tarea: {
      título: "título",
      hecha: "hecha",
      estáHecha: "está hecha",
      estáPendiente: "está pendiente",
      agenda: "agenda"
    },
    Agenda: {
      mostrando: "mostrando"
    },
    ListaDeTareas: {
      tareas: "tareas",
      cuentaPendiente: "cuenta pendiente"
    }
  },
  messages: {
    "expect-passed": "Como se esperaba, {what} es {expected}",
    "expect-failed": "Inesperado: {what} debería ser {expected} pero en realidad es {actual}",
    "expect-truthy": "verdadero",
    "test-step": "▶️ Ejecutando   {step}",
    "test-threw": "Error en la prueba {test}:",
    "cant-draw": "⚠ {type} no se puede dibujar",
    "confirm-default": "{question} (sí)",
    "drop-event": "soltar-{thing}",
    undo: "Deshacer",
    "undo-step": "Deshacer {step}",
    redo: "Rehacer",
    "redo-step": "Rehacer {step}",
    "write-refused": "No se pudo guardar tu cambio en {thing}",
    "write-retry": "Reintentar",
    "write-show-me": "Muéstrame",
    "write-merged": "{field} de {thing} también cambió en otro sitio.  Se conservó lo tuyo;  lo otro era:  {theirs}",
    "write-use-theirs": "Usar lo otro"
  },
  groups: {
    Tarea: [
      { name: "La agenda:  las tareas, mostradas según su filtro", members: ["agenda"] }
    ]
  }
}
