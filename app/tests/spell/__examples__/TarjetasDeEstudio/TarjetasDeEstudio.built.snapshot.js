import { core, List, App, TwoSidedView, h } from "@spell/core"

export class Tarjeta extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("palabra", { type: "text" }) }
  get palabra() { return this.getProp("palabra") }
  set palabra(value) { this.setProp("palabra", value) }

  static { this.declareProp("significado", { type: "text" }) }
  get significado() { return this.getProp("significado") }
  set significado(value) { this.setProp("significado", value) }

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
export class Juego extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("mazo", { init: () => new Mazo({ id: "mazo" }), early: true }) }
  get mazo() { return this.getProp("mazo") }
  set mazo(value) { this.setProp("mazo", value) }

  static { this.declareProp("tarjeta", { type: "Tarjeta" }) }
  get tarjeta() { return this.getProp("tarjeta") }
  set tarjeta(value) { this.setProp("tarjeta", value) }

  static { this.declareProp("acertadas", { type: "number" }) }
  get acertadas() { return this.getProp("acertadas") }
  set acertadas(value) { this.setProp("acertadas", value) }

  static { this.declareProp("intentadas", { type: "number" }) }
  get intentadas() { return this.getProp("intentadas") }
  set intentadas(value) { this.setProp("intentadas", value) }

  get puntuación() {
    if (this.intentadas === 0) return "Aún no has intentado ninguna"
    return `${this.acertadas} de ${this.intentadas} bien`
  }

  sacarOtra() {
    const otras = this.mazo.filter((tarjeta) => tarjeta !== this.tarjeta)
    this.tarjeta = otras.randomItem()
    this.tarjeta?.turnFaceUp()
  }

  mostrarLaRespuesta() {
    this.tarjeta?.turnOver()
  }

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

core.describeMenu(Juego, "menúDelJuego", { items: ["empezarDeNuevo"] })

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
