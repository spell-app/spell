import { core, List, App, TwoSidedView, h } from "@spell/core"

core.heading("Cómo funcionan las Tarjetas de estudio")
////////////////////////////////////////////
// ## Cómo funcionan las Tarjetas de estudio
////////////////////////////////////////////
// El ejemplo Tarjetas de estudio es un mazo de palabras en inglés para aprender:
// la palabra por delante, lo que significa por detrás.  Haz clic en la tarjeta para voltearla.
// Está escrito en español:  cada línea de código también.
// Dos ideas hacen el trabajo:
// - una tarjeta es una VISTA REVERSIBLE:  sabe hacia qué lado está, y se voltea en 3D para mostrar ese lado
// - el juego reparte la siguiente tarjeta al azar del mazo

// Esta guía tiene esas dos, y deja fuera la puntuación.  Abre Tarjetas de estudio, en los Ejemplos, para el juego entero.
// Flash Cards es el mismo juego, en inglés, para aprender palabras en español.

core.heading("Una tarjeta:  una palabra por delante, lo que significa por detrás")
////////////////////////////////////////////////////////////////////////
// ## Una tarjeta:  una palabra por delante, lo que significa por detrás
////////////////////////////////////////////////////////////////////////
// `una vista reversible` hace de la tarjeta una de las vistas de dos caras que trae Spell, como las cartas de Solitario.
// Trae, sin código propio:
// - hacia qué lado mira, arriba o abajo, y `está boca arriba`, `está boca abajo`
// - `voltear eso boca arriba`, `voltear eso boca abajo`, `voltear eso`
// - un dibujo de sus dos caras, espalda con espalda, que muestra su frente boca arriba y su dorso boca abajo, y se voltea en 3D

// Así que la tarjeta solo dice cómo se ve cada cara:  su `para dibujar su frente` y su `para dibujar su dorso`.
// - `pulsable` muestra una mano sobre ella, y `al clic` dice qué hace un clic.
// - Cada cara es un `<segmento>` de Spell UI:  un panel elevado, azul para la palabra y verde para lo que significa.

export class Tarjeta extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  // su "palabra" es texto
  static { this.declareProp("palabra", { type: "text" }) }
  get palabra() { return this.getProp("palabra") }
  set palabra(value) { this.setProp("palabra", value) }

  // su "significado" es texto
  static { this.declareProp("significado", { type: "text" }) }
  get significado() { return this.getProp("significado") }
  set significado(value) { this.setProp("significado", value) }

  onClic(event) {
    this.turnOver()
  }

  drawFront() {
    return h("es-segmento", { apariencia: "elevado", color: "azul", alinear: "centro", relleno: "lg", part: "front" },
      h("es-texto", { tamano: "enorme", negrita: true }, () => this.palabra)
    )
  }

  drawBack() {
    return h("es-segmento", { apariencia: "elevado", color: "verde", alinear: "centro", relleno: "lg", part: "back" },
      h("es-texto", { tamano: "enorme", negrita: true }, () => this.significado)
    )
  }

  static clickable = true
}

/** Las tarjetas para aprender */
export class Mazo extends List {
  static instanceType = Tarjeta
}

core.heading("El juego:  el mazo, y la tarjeta que se ve")
////////////////////////////////////////////////
// ## El juego:  el mazo, y la tarjeta que se ve
////////////////////////////////////////////////
// `sacar otra` elige una tarjeta al azar, nunca la que se ve ahora, y la pone con la palabra arriba.

export class Juego extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "mazo" es un nuevo mazo
  static { this.declareProp("mazo", { init: () => new Mazo({ id: "mazo" }), early: true }) }
  get mazo() { return this.getProp("mazo") }
  set mazo(value) { this.setProp("mazo", value) }

  // su "tarjeta" es una tarjeta
  static { this.declareProp("tarjeta", { type: "Tarjeta" }) }
  get tarjeta() { return this.getProp("tarjeta") }
  set tarjeta(value) { this.setProp("tarjeta", value) }

  sacarOtra() {
    const otras = this.mazo.filter((tarjeta) => tarjeta !== this.tarjeta)
    this.tarjeta = otras.randomItem()
    this.tarjeta?.turnFaceUp()
  }

  draw() {
    return h("es-contenedor", { texto: true },
      h("es-pila",
        () => core.drawThing(this.tarjeta),
        h("es-pila", { direccion: "horizontal", repartir: "centro" },
          h("es-boton", {
            color: "primario",
            onClick: core.pressed(this, () => this.sacarOtra()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Otra tarjeta")
        )
      )
    )
  }
}
export const juego = new Juego()
core.describeAction(Juego, "sacarOtra", { title: "Sacar Otra", undoneAs: "Sacar Otra" })

core.heading("El mazo:  cuatro palabras para empezar -- agrega las tuyas")
//## El mazo:  cuatro palabras para empezar -- agrega las tuyas

export function agregarPalabraSignificadoSignificado(palabra, significado) {
  return core.asAction({ undoneAs: "Agregar Palabra Significado Significado" }, () => {
    juego.mazo.append(new Tarjeta({ palabra: palabra, significado: significado }))
  })
}

agregarPalabraSignificadoSignificado("the cat", "el gato")
agregarPalabraSignificadoSignificado("the dog", "el perro")
agregarPalabraSignificadoSignificado("the house", "la casa")
agregarPalabraSignificadoSignificado("the book", "el libro")

juego.sacarOtra()

core.heading("Una prueba")
////////////////
// ## Una prueba
////////////////
// Una tarjeta nueva empieza boca abajo, como toda vista reversible.

export function testDarleLaVuelta() {
  return core.test("test darle la vuelta", function testDarleLaVuelta() {
    core.echoTestAction(`poner la tarjeta a una nueva tarjeta con palabra "the cat", significado = "el gato"`)
    const tarjeta = new Tarjeta({ palabra: "the cat", significado: "el gato" })
    core.expect(tarjeta.isFaceDirection("down"), `la tarjeta está boca abajo`, true, `sí`)
    core.echoTestAction(`voltear la tarjeta`)
    tarjeta.turnOver()
    core.expect(tarjeta.isFaceDirection("up"), `la tarjeta está boca arriba`, true, `sí`)
  })
}

core.heading("Pruébalo")
//////////////
// ## Pruébalo
//////////////
// - Haz clic en la tarjeta de la derecha para voltearla, y en "Otra tarjeta" para otra.
// - Agrega una palabra:  copia una de las líneas "agregar" de arriba, y cambia sus dos palabras.
//   Haz clic en "Otra tarjeta" hasta que salga.
// - Haz tu propio mazo:  cambia las cuatro líneas por algo que quieras aprender, en cualquier idioma.

// Y después:  Tarjetas de estudio, en los Ejemplos, que lleva la puntuación:  botones "La sabía" y "No la sabía",
// una barra de herramientas, y doce palabras.
// -----------
if (!core.isCarryingOver) juego.start()
// -----------
if (!core.isCarryingOver) testDarleLaVuelta()
