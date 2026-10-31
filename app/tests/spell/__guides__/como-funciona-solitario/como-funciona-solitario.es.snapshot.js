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
    Carta: [
      { name: "La mesa:  una columna, y una mano de cartas para probar en ella", members: ["jugar"] },
      { name: "Una pila, y una columna", members: ["pila"] }
    ]
  }
}
