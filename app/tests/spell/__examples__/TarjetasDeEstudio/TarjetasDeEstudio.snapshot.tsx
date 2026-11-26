import { core, List, App, TwoSidedView, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
  @prop({ type: "text" })
  accessor palabra!: string

  /** Lo que significa, en su dorso */
  // su "significado" es texto
  @prop({ type: "text" })
  accessor significado!: string

  /** Un clic la voltea */
  onClic(event: any /* spell: type unknown */) {
    this.turnOver()
  }

  drawFront() {
    return (
      <es-segmento apariencia="elevado" color="azul" alinear="centro" relleno="lg" part="front">
        <es-texto tamano="pequeño" color="gris" mayusculas={true}>Inglés</es-texto>
        <es-espacio />
        <es-texto tamano="enorme" negrita={true}>{this.palabra}</es-texto>
      </es-segmento>
    )
  }

  drawBack() {
    return (
      <es-segmento apariencia="elevado" color="verde" alinear="centro" relleno="lg" part="back">
        <es-texto tamano="pequeño" color="gris" mayusculas={true}>Qué significa</es-texto>
        <es-espacio />
        <es-texto tamano="enorme" negrita={true}>{this.significado}</es-texto>
      </es-segmento>
    )
  }

  static clickable = true
}

/**
 * `<test-project-tarjeta>`:  a tarjeta, drawn in its own element, e.g. by `draw the tarjeta`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its tarjeta's properties;  its methods call its tarjeta's.
 * - What every view's element does, e.g. drawing its tarjeta, is `SpellElement`'s.
 */
export class TarjetaElement extends SpellElement<Tarjeta> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-tarjeta", "tarjeta", [
    { name: "palabra", kind: "string", description: "Its palabra." },
    { name: "significado", kind: "string", description: "Its significado." }
  ])

  onClic(event: any /* spell: type unknown */) {
    return this.currentThing?.onClic(event)
  }

  drawFront() {
    return this.currentThing?.drawFront()
  }

  drawBack() {
    return this.currentThing?.drawBack()
  }
}
core.useElement(Tarjeta, TarjetaElement)

/** Las tarjetas para aprender */
export class Mazo extends List<Tarjeta> {
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
  @prop({ init: () => new Mazo({ id: "mazo" }), early: true })
  accessor mazo!: Mazo

  /** La tarjeta que se ve */
  // su "tarjeta" es una tarjeta
  @prop({ type: "Tarjeta" })
  accessor tarjeta!: Tarjeta

  /** Cuántas sabías */
  // su "acertadas" es un número
  @prop({ type: "number" })
  accessor acertadas!: number

  /** Cuántas has intentado */
  // su "intentadas" es un número
  @prop({ type: "number" })
  accessor intentadas!: number

  /** Lo que dice la barra de herramientas */
  get puntuación() {
    if (this.intentadas === 0) return "Aún no has intentado ninguna"
    return `${this.acertadas} de ${this.intentadas} bien`
  }

  /** Una tarjeta del mazo al azar, con la palabra arriba:  nunca la que se acaba de ver */
  sacarOtra() {
    const otras = this.mazo.filter((tarjeta) => tarjeta !== this.tarjeta)
    this.tarjeta = otras.randomItem()!
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

  @drawn draw() {
    // La barra de herramientas con la puntuación, la tarjeta, y luego lo que puedes hacer:  voltearla, o decir cómo te fue
    return (
      <es-contenedor texto={true}>
        <es-pila>
          <es-barra-herramientas menu="menú del juego" aria-label="Juego" encogible={true}>
            <es-texto slot="titulo" tamano="grande">Tarjetas de estudio</es-texto>
            <es-texto slot="derecha">{this.puntuación}</es-texto>
          </es-barra-herramientas>
          {core.drawThing(this.tarjeta!)}
          <es-pila direccion="horizontal" repartir="centro">
            {core.drawIf(() => this.tarjeta?.isFaceDirection("up"), () => <>
              <es-boton color="primario" onClick={core.pressed(this, () => this.mostrarLaRespuesta())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Mostrar la respuesta
              </es-boton>
            </>, () => <>
              <es-boton color="positivo" icono="check" onClick={core.pressed(this, () => this.decirQueLaSabía())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                La sabía
              </es-boton>
              <es-boton color="negativo" apariencia="básico" icono="close" onClick={core.pressed(this, () => this.decirQueNoLaSabía())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                No la sabía
              </es-boton>
            </>)}
          </es-pila>
        </es-pila>
      </es-contenedor>
    )
  }
}

/**
 * `<test-project-app>`:  a juego, drawn in its own element, e.g. by `draw the juego`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its juego's properties;  its methods call its juego's.
 * - What every view's element does, e.g. drawing its juego, is `SpellElement`'s.
 */
export class JuegoElement extends SpellElement<Juego> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "juego", [
    { name: "mazo", kind: "json", description: "Its mazo." },
    { name: "tarjeta", kind: "string", description: "Its tarjeta." },
    { name: "acertadas", kind: "number", description: "Its acertadas." },
    { name: "intentadas", kind: "number", description: "Its intentadas." }
  ])

  sacarOtra() {
    return this.currentThing?.sacarOtra()
  }

  mostrarLaRespuesta() {
    return this.currentThing?.mostrarLaRespuesta()
  }

  decirQueLaSabía() {
    return this.currentThing?.decirQueLaSabía()
  }

  decirQueNoLaSabía() {
    return this.currentThing?.decirQueNoLaSabía()
  }

  empezarDeNuevo() {
    return this.currentThing?.empezarDeNuevo()
  }
}
core.useElement(Juego, JuegoElement)
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

export function agregarPalabraSignificadoSignificado(palabra: string, significado: string) {
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

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `TarjetaElement` */
      "test-project-tarjeta": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `JuegoElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
