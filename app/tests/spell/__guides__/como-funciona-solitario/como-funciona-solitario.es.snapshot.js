/*! SPELL: WORDS como-funciona-solitario es */
export const words = {
  lang: "es",
  types: {
    Carta: {
      rango: "rango",
      palo: "palo",
      valor: "valor",
      color: "color",
      nombre: "nombre",
      jugar: "jugar una carta",
      pila: "pila"
    },
    Mesa: {
      columna: "columna",
      mano: "mano",
      mensaje: "mensaje"
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
    "read-failed": "No se puede leer ahora:  {why}",
    "saved-added": "Agregar",
    "saved-removed": "Quitar",
    "write-show-me": "Muéstrame",
    "write-merged": "{field} de {thing} también cambió en otro sitio.  Se conservó lo tuyo;  lo otro era:  {theirs}",
    "write-use-theirs": "Usar lo otro",
    "write-lost": "Otra persona cambió {field} de {thing} a la vez, y queda lo suyo.  Lo tuyo era:  {mine}",
    "write-deleted": "Otra persona borró {thing} mientras lo cambiabas.",
    "write-use-mine": "Usar lo mío",
    "write-restore": "Restaurar"
  },
  groups: {
    Carta: [
      { name: "La mesa:  una columna, y una mano de cartas para probar en ella", members: ["jugar"] },
      { name: "Una pila, y una columna", members: ["pila"] }
    ]
  }
}
