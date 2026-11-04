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
    "write-refused-role": "No se pudo guardar tu cambio en {thing}:  tu papel no puede escribir aquí",
    "write-refused-taken-down": "No se pudo guardar tu cambio en {thing}:  Encanto lo retiró",
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
    "sign-in-as": "Sesión iniciada en {place} como {name}, con una cuenta de atmosphere.",
    "sign-in-ended": "Tu sesión en {place} ha terminado:  duran dos semanas como mucho.  Vuelve a iniciar sesión, y lo que cambiaste se guardará.",
    "sign-in-failed": "No se pudo iniciar sesión:  {why}",
    "sign-in-abuse": "Para denunciar un abuso en Encanto:  {contact}",
    "sign-in-who": "Tu nombre de usuario, p. ej. alicia.bsky.social",
    "sign-in-as-spell": "Sesión iniciada en {place} con tu cuenta de Encanto, {name}.",
    "sign-in-spell-signed-out": "No has iniciado sesión en {place} con una cuenta de Encanto:  hasta que lo hagas, te toma por la persona de este ordenador.",
    "sign-in-cloud-signed-out": "{place} se guarda solo en este navegador, hasta que inicies sesión con una cuenta de Encanto:  entonces se guarda en la nube, en cada dispositivo donde inicies sesión.",
    "sign-in-check-email": "Revisa tu correo:  {email} tiene un enlace y un código.  Abre el enlace en cualquier dispositivo, o escribe el código aquí.",
    "sign-in-email": "Tu correo, p. ej. ana@ejemplo.com",
    "sign-in-email-me": "Envíame un enlace",
    "sign-in-code": "El código de seis cifras",
    "sign-in": "Iniciar sesión",
    "sign-out": "Cerrar sesión"
  },
  groups: {
    Carta: [
      { name: "La mesa:  una columna, y una mano de cartas para probar en ella", members: ["jugar"] },
      { name: "Una pila, y una columna", members: ["pila"] }
    ]
  }
}
