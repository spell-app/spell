/*! SPELL: WORDS Solitario es */
export const words = {
  lang: "es",
  types: {
    Carta: {
      rango: "rango",
      valor: "valor",
      esUnRango: "es un (rango)",
      esUnaFigura: "es una figura",
      esUnaCartaNumérica: "es una carta numérica",
      palo: "palo",
      esUnPalo: "es un (palo)",
      color: "color",
      nombre: "nombre",
      esElRangoDePalo: "es el (rango) de (palo)",
      dirección: "dirección",
      estáBocaDirección: "está boca (dirección)",
      voltearBocaArriba: "voltearla boca arriba",
      voltearBocaAbajo: "voltearla boca abajo",
      voltear: "voltearla",
      imagen: "imagen",
      cara: "cara",
      símbolo: "símbolo",
      estado: "estado",
      jugar: "jugar una carta",
      ponerEnPila: "poner una carta en una pila",
      contarLosPuntosDeCartaEnPila: "contar los puntos de una carta en una pila",
      pila: "pila"
    },
    Comodín: {
      color: "color",
      esElComodínColor: "es el comodín (color)",
      valor: "valor",
      imagen: "imagen",
      nombre: "nombre",
      estado: "estado"
    },
    Mazo: {
      comodines: "comodines",
      create: "crearlo",
      estado: "estado"
    },
    Pila: {
      name: "nombre",
      disposición: "disposición",
      color: "color",
      valor: "valor",
      estado: "estado"
    },
    PilaDeReserva: {
      disposición: "disposición"
    },
    PilaDeDescartes: {
      disposición: "disposición"
    },
    Fundación: {
      disposición: "disposición",
      palo: "palo"
    },
    Columna: {
      disposición: "disposición"
    },
    Solitario: {
      puntuación: "puntuación",
      movimientos: "movimientos",
      pista: "pista",
      mazo: "mazo",
      reserva: "reserva",
      descartes: "descartes",
      tréboles: "tréboles",
      diamantes: "diamantes",
      corazones: "corazones",
      espadas: "espadas",
      C1: "C1",
      C2: "C2",
      C3: "C3",
      C4: "C4",
      C5: "C5",
      C6: "C6",
      C7: "C7",
      create: "crearlo",
      depurar: "depurarlo",
      rehacerLaReserva: "rehacer la reserva",
      robarDeLaReserva: "robar de la reserva",
      repartirLasCartas: "repartir las cartas",
      empezarElJuego: "empezar el juego",
      hacerTrampa: "hacer trampa",
      jugarSolo: "jugar solo"
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
      { name: "rango de la carta", members: ["rango", "valor", "esUnRango", "esUnaFigura", "esUnaCartaNumérica"] },
      { name: "palo de la carta", members: ["palo", "esUnPalo", "color"] },
      { name: "cartas concretas", members: ["nombre", "esElRangoDePalo"] },
      { name: "su dirección:  boca arriba o boca abajo", members: ["dirección", "estáBocaDirección"] },
      { name: "voltear la carta", members: ["voltearBocaArriba", "voltearBocaAbajo", "voltear", "imagen", "cara"] },
      { name: "dibujarla:  sus dos lados, uno sobre el otro -- styles.css muestra el que mira hacia arriba, y la gira al voltearse", members: ["símbolo"] },
      { name: "el \"estado\" de la carta, para depurar", members: ["estado"] },
      { name: "Jugar una carta:  qué hace un clic o un arrastre", members: ["jugar", "ponerEnPila", "contarLosPuntosDeCartaEnPila"] },
      { name: "Una pila de cartas, p. ej. el mazo de reserva de un juego o sus descartes", members: ["pila"] }
    ],
    Pila: [
      { name: "estado de la pila, para depurar", members: ["estado"] }
    ]
  }
}
