/*! SPELL: WORDS ListaDeTareas es */
export const words = {
  lang: "es",
  types: {
    Tarea: {
      título: "título",
      nota: "nota",
      prioridad: "prioridad",
      hecha: "hecha",
      estáHecha: "está hecha",
      estáPendiente: "está pendiente",
      colorDePrioridad: "color de prioridad",
      agenda: "agenda"
    },
    Agenda: {
      mostrando: "mostrando"
    },
    ListaDeTareas: {
      tareas: "tareas",
      borrador: "borrador",
      cuentaPendiente: "cuenta pendiente",
      agregarElBorrador: "agregar el borrador",
      quitarLasTareasHechas: "quitar las tareas hechas"
    }
  },
  messages: {
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
    "page-previous": "Anterior",
    "page-next": "Siguiente",
    "page-number": "Página {page}",
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
    "write-changed-under-draft": "Otra persona cambió {thing} mientras lo editabas.  Lo que estás editando aún no lo muestra.",
    "guest-person": "Invitado {number}",
    "sign-in-signed-out": "No has iniciado sesión en {place}, así que puedes leerlo, y lo que cambies espera aquí hasta que lo hagas.",
    "sign-in-signing": "Iniciando sesión en {place}…",
    "sign-in-as": "Sesión iniciada en {place} como {name}.",
    "sign-in-ended": "Tu sesión en {place} ha terminado:  duran dos semanas como mucho.  Vuelve a iniciar sesión, y lo que cambiaste se guardará.",
    "sign-in-failed": "No se pudo iniciar sesión:  {why}",
    "sign-in-who": "Tu nombre de usuario, p. ej. alicia.bsky.social",
    "sign-in": "Iniciar sesión",
    "sign-out": "Cerrar sesión"
  },
  groups: {
    Tarea: [
      { name: "La agenda:  las tareas, cada una un elemento propio dentro de ella", members: ["agenda"] }
    ]
  }
}
