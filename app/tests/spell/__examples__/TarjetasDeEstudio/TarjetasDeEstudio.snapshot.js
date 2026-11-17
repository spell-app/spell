import { core, List, App, TwoSidedView, h } from "@spell/core"

core.heading("Una tarjeta de estudio")
////////////////////////////
// ## Una tarjeta de estudio
////////////////////////////
// Una palabra en su frente, lo que significa en su dorso.
// Es una vista de dos caras, como las cartas de Solitario:  boca arriba muestra la palabra, boca abajo lo que significa.
// Un clic la voltea.

export class Tarjeta extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  /** La palabra en inglés, en su frente */
  // su "palabra" es texto
  static { this.declareProp("palabra", { type: "text" }) }
  get palabra() { return this.getProp("palabra") }
  set palabra(value) { this.setProp("palabra", value) }

  /** Lo que significa, en su dorso */
  // su "significado" es texto
  static { this.declareProp("significado", { type: "text" }) }
  get significado() { return this.getProp("significado") }
  set significado(value) { this.setProp("significado", value) }

  /** Un clic la voltea */
  onClic(event) {
    this.turnOver()
  }

  drawFront() {
    return h("es-segmento", { apariencia: "elevado", color: "azul", alinear: "centro", relleno: "lg", part: "front" },
      h("es-texto", { tamano: "pequeño", color: "gris", mayusculas: true }, "Inglés"),
      h("es-espacio"),
      h("es-texto", { tamano: "enorme", negrita: true }, () => this.palabra)
    )
  }

  drawBack() {
    return h("es-segmento", { apariencia: "elevado", color: "verde", alinear: "centro", relleno: "lg", part: "back" },
      h("es-texto", { tamano: "pequeño", color: "gris", mayusculas: true }, "Qué significa"),
      h("es-espacio"),
      h("es-texto", { tamano: "enorme", negrita: true }, () => this.significado)
    )
  }

  static clickable = true
}

/** Las tarjetas para aprender */
export class Mazo extends List {
  static instanceType = Tarjeta
}

export function testDarleLaVuelta() {
  return core.test("test darle la vuelta", function testDarleLaVuelta() {
    const it = new Tarjeta()
    core.echoTestAction(`poner la tarjeta a una nueva tarjeta con palabra "the cat", significado = "el gato"`)
    const tarjeta = new Tarjeta({ palabra: "the cat", significado: "el gato" })
    core.echoTestAction(`voltear la tarjeta boca arriba`)
    tarjeta.turnFaceUp()
    core.expect(tarjeta.isFaceDirection("up"), `la tarjeta está boca arriba`, true, `sí`)
    core.echoTestAction(`voltear la tarjeta`)
    tarjeta.turnOver()
    core.expect(tarjeta.isFaceDirection("down"), `la tarjeta está boca abajo`, true, `sí`)
    core.echoTestAction(`voltear la tarjeta`)
    tarjeta.turnOver()
    core.expect(tarjeta.isFaceDirection("up"), `la tarjeta está boca arriba`, true, `sí`)
  })
}
// -----------
core.heading("Tarjetas de estudio")
/////////////////////////
// ## Tarjetas de estudio
/////////////////////////
// Un mazo de tarjetas para aprender:  una palabra en inglés por delante, lo que significa por detrás.
// Haz clic en la tarjeta, o en Mostrar la respuesta, para voltearla, y luego di si la sabías:
// la puntuación lleva la cuenta, y la siguiente tarjeta sale al azar.
// La tarjeta es de este proyecto, en `Tarjeta.es.spell`;  este archivo tiene el juego, y sus palabras.

export class Juego extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "mazo" es un nuevo mazo
  static { this.declareProp("mazo", { init: () => new Mazo({ id: "mazo" }), early: true }) }
  get mazo() { return this.getProp("mazo") }
  set mazo(value) { this.setProp("mazo", value) }

  /** La tarjeta que se ve */
  // su "tarjeta" es una tarjeta
  static { this.declareProp("tarjeta", { type: "Tarjeta" }) }
  get tarjeta() { return this.getProp("tarjeta") }
  set tarjeta(value) { this.setProp("tarjeta", value) }

  /** Cuántas sabías */
  // su "acertadas" es un número
  static { this.declareProp("acertadas", { type: "number" }) }
  get acertadas() { return this.getProp("acertadas") }
  set acertadas(value) { this.setProp("acertadas", value) }

  /** Cuántas has intentado */
  // su "intentadas" es un número
  static { this.declareProp("intentadas", { type: "number" }) }
  get intentadas() { return this.getProp("intentadas") }
  set intentadas(value) { this.setProp("intentadas", value) }

  /** Lo que dice la barra de herramientas */
  get puntuación() {
    if (this.intentadas === 0) return "Aún no has intentado ninguna"
    return `${this.acertadas} de ${this.intentadas} bien`
  }

  /** Una tarjeta del mazo al azar, con la palabra arriba:  nunca la que se acaba de ver */
  sacarOtra() {
    const otras = this.mazo.filter((tarjeta) => tarjeta !== this.tarjeta)
    this.tarjeta = otras.randomItem()
    this.tarjeta?.turnFaceUp()
  }

  mostrarLaRespuesta() {
    this.tarjeta?.turnOver()
  }

  /** Se cuenta, y luego la siguiente tarjeta */
  decirQueLaSabía() {
    this.acertadas = this.acertadas + 1
    this.intentadas = this.intentadas + 1
    this.sacarOtra()
  }

  decirQueNoLaSabía() {
    this.intentadas = this.intentadas + 1
    this.sacarOtra()
  }

  empezarDeNuevo() {
    this.acertadas = 0
    this.intentadas = 0
    this.sacarOtra()
  }

  draw() {
    // La barra de herramientas con la puntuación, la tarjeta, y luego lo que puedes hacer:  voltearla, o decir cómo te fue
    return h("es-contenedor", { texto: true },
      h("es-pila",
        h("es-barra-herramientas", { menu: "menú del juego", "aria-label": "Juego", encogible: true },
          h("es-texto", { slot: "titulo", tamano: "grande" }, "Tarjetas de estudio"),
          h("es-texto", { slot: "derecha" }, () => this.puntuación)
        ),
        () => core.drawThing(this.tarjeta),
        h("es-pila", { direccion: "horizontal", repartir: "centro" },
          h("es-boton", {
            color: "primario",
            onClick: core.pressed(this, () => this.mostrarLaRespuesta()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
            hidden: () => this.tarjeta?.isFaceDirection("up") ? undefined : true
          }, "Mostrar la respuesta"),
          h("es-boton", {
            color: "positivo",
            icono: "check",
            onClick: core.pressed(this, () => this.decirQueLaSabía()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
            hidden: () => !this.tarjeta?.isFaceDirection("up") ? undefined : true
          }, "La sabía"),
          h("es-boton", {
            color: "negativo",
            apariencia: "básico",
            icono: "close",
            onClick: core.pressed(this, () => this.decirQueNoLaSabía()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
            hidden: () => !this.tarjeta?.isFaceDirection("up") ? undefined : true
          }, "No la sabía")
        )
      )
    )
  }
}
export const juego = new Juego()
core.describeAction(Juego, "sacarOtra", { title: "Sacar Otra", undoneAs: "Sacar Otra" })
core.describeAction(Juego, "mostrarLaRespuesta", { title: "Mostrar la Respuesta", shortcuts: ["espacio"], undoneAs: "Mostrar la Respuesta" })
core.describeAction(Juego, "decirQueLaSabía", { title: "La sabía", shortcuts: ["S"], icon: "check", undoneAs: "La sabía" })
core.describeAction(Juego, "decirQueNoLaSabía", { title: "No la sabía", shortcuts: ["N"], icon: "close", undoneAs: "No la sabía" })
core.describeAction(Juego, "empezarDeNuevo", { title: "Empezar de Nuevo", icon: "redo", undoneAs: "Empezar de Nuevo" })

// su "menú del juego" es un menú de "empezar de nuevo"
core.describeMenu(Juego, "menúDelJuego", { items: ["empezarDeNuevo"] })

core.heading("El mazo:  doce palabras en inglés -- agrega las tuyas")
//## El mazo:  doce palabras en inglés -- agrega las tuyas

export function agregarPalabraSignificadoSignificado(palabra, significado) {
  return core.asAction({ undoneAs: "Agregar Palabra Significado Significado" }, () => {
    juego.mazo.append(new Tarjeta({ palabra: palabra, significado: significado }))
  })
}

agregarPalabraSignificadoSignificado("the cat", "el gato")
agregarPalabraSignificadoSignificado("the dog", "el perro")
agregarPalabraSignificadoSignificado("the house", "la casa")
agregarPalabraSignificadoSignificado("the book", "el libro")
agregarPalabraSignificadoSignificado("the apple", "la manzana")
agregarPalabraSignificadoSignificado("the water", "el agua")
agregarPalabraSignificadoSignificado("the moon", "la luna")
agregarPalabraSignificadoSignificado("the sun", "el sol")
agregarPalabraSignificadoSignificado("the beach", "la playa")
agregarPalabraSignificadoSignificado("the train", "el tren")
agregarPalabraSignificadoSignificado("the key", "la llave")
agregarPalabraSignificadoSignificado("the butterfly", "la mariposa")

juego.empezarDeNuevo()
// -----------
if (!core.isCarryingOver) juego.start()
// -----------
if (!core.isCarryingOver) testDarleLaVuelta()
