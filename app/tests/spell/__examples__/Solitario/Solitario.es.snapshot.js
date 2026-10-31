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
    "write-retry": "Reintentar",
    "write-show-me": "Muéstrame",
    "write-merged": "{field} de {thing} también cambió en otro sitio.  Se conservó lo tuyo;  lo otro era:  {theirs}",
    "write-use-theirs": "Usar lo otro"
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
