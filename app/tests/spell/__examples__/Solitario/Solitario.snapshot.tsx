import { core, List, App, TwoSidedView, ViewableList, prop, derived, thing, drawn, positionOf, spellPosition, position, type SentEvent } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Una carta de la baraja")
////////////////////////////
// ## Una carta de la baraja
////////////////////////////
// Una carta dice cuáles son su rango, su palo y su color:  un mazo, una pila o el juego solo los leen.
// Es una vista reversible:  boca arriba muestra su imagen, boca abajo el dorso que comparten todas las cartas.
// En la página cada carta es su propio elemento, `<solitario-carta>`:  se puede arrastrar (`arrastrable`), cuando su pila la deja ir.

export type Rango = (typeof Carta.Rangos)[number]
export type Palo = (typeof Carta.Palos)[number]

export class Carta extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  // su "rango" es uno de as, 2 ... 10, jota, dama, rey
  //   - "es un (rango)"
  static Rangos = ["as", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jota", "dama", "rey"] as const
  @prop({ oneOf: () => Carta.Rangos })
  accessor rango!: Rango
  esUnRango(rango: Rango) {
    return this.rango === rango
  }

  get valor() {
    return spellPosition(positionOf(Carta.Rangos, this.rango))
  }

  get esUnaFigura() {
    return core.includes(["jota", "dama", "rey"], this.rango)
  }

  get esUnaCartaNumérica() {
    return !this.esUnaFigura
  }

  // su "palo" es uno de tréboles, diamantes, corazones o espadas
  //   - "es un (palo)"
  static Palos = ["tréboles", "diamantes", "corazones", "espadas"] as const
  @prop({ oneOf: () => Carta.Palos })
  accessor palo!: Palo
  esUnPalo(palo: Palo) {
    return this.palo === palo
  }

  // su "color" es uno de rojo, negro :
  //   rojo si es un diamante o es un corazón
  //   negro de lo contrario
  static Colores = ["rojo", "negro"]
  get color() {
    if (this.esUnPalo("diamantes") || this.esUnPalo("corazones")) return "rojo"
    return "negro"
  }

  get símbolo() {
    if (this.esUnPalo("tréboles")) return "♣"
    if (this.esUnPalo("diamantes")) return "♦"
    if (this.esUnPalo("corazones")) return "♥"
    return "♠"
  }

  get nombre() {
    return `${this.rango} de ${this.palo}`
  }

  esElRangoDePalo(rango: Rango, palo: Palo) {
    return this.rango === rango && this.palo === palo
  }

  /** Su nombre corto:  D♠↓ es la dama de espadas, boca abajo */
  get estado() {
    const letra = this.valor === 10 ? 10 : `${core.getItemAt(this.rango, 0) ?? ""}`.toLocaleUpperCase()
    const flecha = this.isFaceDirection("up") ? "↑" : "↓"
    return letra + this.símbolo + flecha
  }

  // Sus dos lados, uno sobre el otro:  styles.css muestra el que mira hacia arriba, y la gira al voltearse
  @drawn draw() {
    return [
      <slot name="front">{this.drawFront()}</slot>,
      <slot name="back">{this.drawBack()}</slot>
    ]
  }

  /** Su cara:  https://www.compart.com/en/unicode/block/U+1F0A0 */
  get imagen() {
    const lugar = this.valor
    if (this.esUnPalo("tréboles")) return core.getItemAt(["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"], position(lugar))
    if (this.esUnPalo("diamantes")) return core.getItemAt(["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"], position(lugar))
    if (this.esUnPalo("corazones")) return core.getItemAt(["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"], position(lugar))
    return core.getItemAt(["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"], position(lugar))
  }

  /** Sacada hacia arriba de su pila, sobre las pilas de encima, como hace la trampa -- styles.css */
  // su "levantada" es sí o no
  @prop({ type: "choice" })
  accessor levantada!: boolean

  drawFront() {
    return <es-texto color={this.color} part="front">{this.imagen}</es-texto>
  }

  drawBack() {
    return <es-texto color="azul" part="back">🂠</es-texto>
  }

  /** lo que suma el movimiento:  10 en una fundación, 5 desde los descartes, si no nada */
  contarLosPuntosDeCartaEnPila(pila: Pila) {
    if (pila instanceof Fundación) return 10
    if (this.pila === solitario.descartes) return 5
    return 0
  }

  /** un clic la juega */
  async onClick(event: ClickEvent) {
    return await this.jugar()
  }

  /** al empezar un arrastre, la última pista se va */
  onDrag(event: DragSpellEvent) {
    solitario.pista = ""
  }

  /** soltada donde ninguna pila la toma, o con Escape:  vuelve a su lugar, y la puntuación lo dice */
  onDragCancelled(event: DragCancelledEvent) {
    solitario.pista = " -- Ahí no"
  }

  static draggable = true

  get pila() {
    return Pila.ownerOf(this)!
  }

  async jugar() {
    if (this.pila === solitario.reserva) {
      await solitario.robarDeLaReserva()
      return
    }
    const pilaFinal = core.filter(core.everyThing(Pila), (pila: Pila) => core.canTake(pila, this)).firstItem
    if (pilaFinal === undefined) return false
    return await this.ponerEnPila(pilaFinal)
  }

  async ponerEnPila(pila: Pila) {
    const pilaInicial = this.pila
    if (!core.canGiveUp(pilaInicial, this)) return false
    if (!core.canTake(pila, this)) return false
    const puntos = this.contarLosPuntosDeCartaEnPila(pila)
    pilaInicial.startingWith(this).forEach((carta) => core.move(carta, pila))
    if (pilaInicial instanceof Columna && !pilaInicial.isEmpty) {
      await core.pauseFor(200, "msec")
      pilaInicial.lastItem?.turnFaceUp()
    }
    solitario.movimientos = solitario.movimientos + 1
    solitario.puntuación = solitario.puntuación + puntos
    return true
  }

  get clickableWhen(): boolean {
    return this.isFaceDirection("up") || this.pila === solitario.reserva
  }

  static clickable = true
}

/**
 * `<test-project-carta>`:  a carta, drawn in its own element, e.g. by `draw the carta`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its carta's properties;  its methods call its carta's.
 * - What every view's element does, e.g. drawing its carta, is `SpellElement`'s.
 */
export class CartaElement extends SpellElement<Carta> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-carta", "carta", [
    { name: "rango", kind: "string", description: "Its rango." },
    { name: "palo", kind: "string", description: "Its palo." },
    { name: "levantada", kind: "boolean", description: "Its levantada." }
  ])

  esUnRango(rango: Rango) {
    return this.currentThing?.esUnRango(rango)
  }

  esUnPalo(palo: Palo) {
    return this.currentThing?.esUnPalo(palo)
  }

  esElRangoDePalo(rango: Rango, palo: Palo) {
    return this.currentThing?.esElRangoDePalo(rango, palo)
  }

  drawFront() {
    return this.currentThing?.drawFront()
  }

  drawBack() {
    return this.currentThing?.drawBack()
  }

  contarLosPuntosDeCartaEnPila(pila: Pila) {
    return this.currentThing?.contarLosPuntosDeCartaEnPila(pila)
  }

  onClick(event: ClickEvent) {
    return this.currentThing?.onClick(event)
  }

  onDrag(event: DragSpellEvent) {
    return this.currentThing?.onDrag(event)
  }

  onDragCancelled(event: DragCancelledEvent) {
    return this.currentThing?.onDragCancelled(event)
  }

  jugar() {
    return this.currentThing?.jugar()
  }

  ponerEnPila(pila: Pila) {
    return this.currentThing?.ponerEnPila(pila)
  }
}
core.useElement(Carta, CartaElement)
// El as es bajo:  as = 1 ... rey = 13

// Cómo la llama una persona, una prueba o la consola

// Una letra de los Naipes de unicode, del tamaño del texto de alrededor:  su pila la escala para que quepa -- styles.css

export function testLaPreparaciónDeLaCarta() {
  return core.test("test la preparación de la carta", function testLaPreparaciónDeLaCarta() {
    const it = new Carta()
    core.echoTestAction(`obtener una nueva carta cuyo rango es dama y palo es espadas`)
    const it2 = new Carta({ rango: "dama", palo: "espadas" })
    core.expect(it2.nombre, `su nombre`, "dama de espadas", `"dama de espadas"`)
    core.expect(it2.color, `su color`, "negro", `negro`)
    core.expect(it2.valor, `su valor`, 12, `12`)
    core.expect(it2.estado, `su estado`, "D♠↓", `"D♠↓"`)
    core.expect(it2.esUnaFigura, `es una figura`, true, `sí`)
    core.expect(it2.esUnPalo("espadas"), `es una espada`, true, `sí`)
    core.expect(it2.esUnPalo("tréboles"), `es un trébol`, false, `no`)
    core.expect(it2.esUnRango("dama"), `es una dama`, true, `sí`)
    core.expect(it2.esUnRango(2), `es un 2`, false, `no`)
    core.expect(it2.esElRangoDePalo("dama", "espadas"), `es la dama de espadas`, true, `sí`)
    core.expect(it2.esElRangoDePalo("dama", "tréboles"), `es la dama de tréboles`, false, `no`)
    core.expect(it2.imagen, `su imagen`, "🂭", `"🂭"`)

    core.echoTestAction(`voltear eso`)
    it2.turnOver()
    core.expect(it2.isFaceDirection("up"), `está boca arriba`, true, `sí`)
    core.expect(it2.estado, `su estado`, "D♠↑", `"D♠↑"`)

    core.echoTestAction(`poner siete a una nueva carta cuyo rango es 7 y palo es corazones`)
    const siete = new Carta({ rango: 7, palo: "corazones" })
    core.expect(siete.esUnaCartaNumérica, `siete es una carta numérica`, true, `sí`)
    core.expect(siete.color, `el color del siete`, "rojo", `rojo`)
    core.expect(siete.imagen, `la imagen del siete`, "🂷", `"🂷"`)
    core.expect((new Carta({ rango: "as", palo: "tréboles" })).imagen, `la imagen de una nueva carta cuyo rango es as y palo es tréboles`, "🃑", `"🃑"`)
    core.expect((new Carta({ rango: "rey", palo: "diamantes" })).imagen, `la imagen de una nueva carta cuyo rango es rey y palo es diamantes`, "🃎", `"🃎"`)
  })
}

// -----------
core.heading("Un mazo")
/////////////
// ## Un mazo
/////////////
// Las 52 cartas de una baraja estándar, el as de tréboles primero.

@thing
export class Mazo extends List<Carta> {
  static instanceType = Carta

  /** Una carta de cada, el as de tréboles primero:  cada una empieza boca abajo, como toda vista reversible */
  create() {
    Carta.Rangos.forEach((rango: Rango) => Carta.Palos.forEach((palo: Palo) => this.append(new Carta({ rango: rango, palo: palo }))))
  }

  /** Los nombres cortos de sus cartas, de arriba abajo */
  @derived get estado() {
    const nombres = new List<string>({ instanceType: "text" })
    this.forEach((carta) => nombres.append(carta.estado))
    return `mazo: ${nombres}`
  }
}

export function testLaCreaciónDelMazo() {
  return core.test("test la creación del mazo", function testLaCreaciónDelMazo() {
    const it = new Mazo()
    core.echoTestAction(`el mazo es un nuevo mazo`)
    const mazo = new Mazo()
    core.expect(mazo.length, `el número de cartas en el mazo`, 52, `52`)
    core.expect(mazo.filter((carta) => carta.esUnRango("dama")).length, `el número de (cartas en el mazo donde es una dama)`, 4, `4`)
    core.expect(mazo.firstItem?.estado!, `el estado de la primera carta del mazo`, "A♣↓", `"A♣↓"`)
    core.expect(mazo.lastItem?.nombre!, `el nombre de la última carta del mazo`, "rey de espadas", `"rey de espadas"`)
    core.echoTestAction(`barajar el mazo`)
    mazo.randomize()
    core.expect(mazo.length, `el número de cartas en el mazo`, 52, `52`)
  })
}
// -----------
core.heading("Una pila de cartas")
////////////////////////
// ## Una pila de cartas
////////////////////////
// La reserva de un juego, sus descartes, una columna en la mesa:  el juego nombra sus pilas, y dice qué toma cada tipo.
// Cada pila es su propio elemento alrededor de los elementos de sus cartas, `<solitario-columna>` alrededor de `<solitario-carta>`s.
// Una carta arrastrada sobre ella brilla cuando la tomaría, según sus propias reglas (`soltable`).

export type Disposición = (typeof Pila.Disposiciones)[number]

export class Pila extends ViewableList<Carta> {
  static instanceType = Carta
  static elementTag = core.defineElement(this, "test-project")

  /** Cómo la llama el juego, p. ej. reserva */
  // su "nombre" es texto
  @prop({ type: "text" })
  accessor name!: string

  /** Cómo están sus cartas:  una sobre otra, hacia abajo en una columna, a lo largo de una fila, o en abanico, como se sostiene una mano -- styles.css */
  // su "disposición" es uno de apilada, vertical, horizontal o abanico
  static Disposiciones = ["apilada", "vertical", "horizontal", "abanico"] as const
  @prop({ oneOf: () => Pila.Disposiciones })
  accessor disposición!: Disposición

  /** El de su última carta:  sobre qué va la siguiente carta */
  get color() {
    if (this.isEmpty) return "ninguno"
    return this.lastItem!.color
  }

  /** El de su última carta */
  get valor() {
    if (this.isEmpty) return 0
    return this.lastItem!.valor
  }

  /** Su nombre, luego los nombres cortos de sus cartas:  reserva: D♠↑ 7♥↓ */
  @derived get estado() {
    let resumen = `${this.name || "pila"}:`
    this.forEach((carta) => (resumen = `${resumen} ${carta.estado}`))
    return resumen
  }

  /** mientras una carta que tomaría está sobre ella, la puntuación muestra lo que sumaría -- se va al irse la carta */
  whileCartaDraggedOver(carta: Carta) {
    const puntos = carta.contarLosPuntosDeCartaEnPila(this)
    if (core.canTake(this, carta) && puntos > 0) solitario.pista = ` (+${puntos})`
  }

  async whenCartaDroppedOn(carta: Carta) {
    await carta.ponerEnPila(this)
  }

  static droppable = true

  static exclusive = true
}
export interface Pila {
  canTake(carta: Carta): boolean
  canGiveUp(carta: Carta): boolean
  drawItsPlaceholder(): any /* spell: type unknown */
}

/**
 * `<test-project-pila>`:  a pila, drawn in its own element, e.g. by `draw the pila`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its pila's properties;  its methods call its pila's.
 * - What every view's element does, e.g. drawing its pila, is `SpellElement`'s.
 */
export class PilaElement extends SpellElement<Pila> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-pila", "pila", [
    { name: "name", kind: "string", description: "Its name." },
    { name: "disposición", kind: "string", description: "Its disposición." }
  ])

  whileCartaDraggedOver(carta: Carta) {
    return this.currentThing?.whileCartaDraggedOver(carta)
  }

  whenCartaDroppedOn(carta: Carta) {
    return this.currentThing?.whenCartaDroppedOn(carta)
  }
}
core.useElement(Pila, PilaElement)

export function testLasPilas() {
  return core.test("test las pilas", function testLasPilas() {
    const it = new Pila()
    core.echoTestAction(`poner la reserva a una nueva pila con nombre = "reserva"`)
    const reserva = new Pila({ name: "reserva" })
    core.expect(reserva.color, `el color de la reserva`, "ninguno", `"ninguno"`)
    core.expect(reserva.valor, `el valor de la reserva`, 0, `0`)
    core.echoTestAction(`agregar (una nueva carta cuyo rango es dama, palo es espadas y dirección es arriba) a la reserva`)
    reserva.append(new Carta({
      rango: "dama",
      palo: "espadas",
      direction: "up"
    }))
    core.echoTestAction(`agregar (una nueva carta cuyo rango es 7 y palo es corazones) a la reserva`)
    reserva.append(new Carta({ rango: 7, palo: "corazones" }))
    core.expect(reserva.color, `el color de la reserva`, "rojo", `rojo`)
    core.expect(reserva.valor, `el valor de la reserva`, 7, `7`)
    core.expect(reserva.estado, `el estado de la reserva`, "reserva: D♠↑ 7♥↓", `"reserva: D♠↑ 7♥↓"`)

    /** una carta está en una sola pila a la vez */
    const descartes = new Pila({ name: "descartes" })
    core.echoTestAction(`obtener la última carta de la reserva`)
    const it2 = reserva.lastItem
    core.echoTestAction(`agregar eso a los descartes`)
    descartes.append(it2!)
    core.expect(it2?.pila === descartes, `su pila es los descartes`, true, `sí`)
    core.expect(reserva.length, `el número de cartas en la reserva`, 1, `1`)
    core.expect(descartes.estado, `el estado de los descartes`, "descartes: 7♥↓", `"descartes: 7♥↓"`)
  })
}

/** una carta está en una sola pila a la vez:  ponerla en otra pila la quita de esta */
// -----------
core.heading("Solitario Klondike")
////////////////////////
// ## Solitario Klondike
////////////////////////
// Reparte siete columnas, luego arma cuatro fundaciones, del as al rey, un palo cada una:
// la [wikipedia](https://en.wikipedia.org/wiki/Klondike_(solitaire)) tiene sus reglas, y cómo se llama cada pila.
// Las cartas, el mazo y las pilas son los de este proyecto:  `Carta`, `Mazo` y `Pila`.

/** Las cartas aún sin jugar, boca abajo:  un clic voltea la siguiente, así que no se le puede quitar ninguna */
export class PilaDeReserva extends Pila {
  static elementTag = core.defineElement(this, "test-project")

  get disposición(): Disposición {
    return "apilada"
  }

  canTake(carta: Carta) {
    return false
  }

  canGiveUp(carta: Carta) {
    return false
  }

  // Una carta gris claro, boca abajo
  drawItsPlaceholder() {
    return <es-texto part="marcador">🂠</es-texto>
  }

  /** Vacía:  un clic vuelve a voltear los descartes;  un clic en una de sus cartas es de la carta */
  async onClic(event: any /* spell: type unknown */) {
    await solitario.voltearLaReserva()
  }
}

/**
 * `<test-project-pila-de-reserva>`:  a pila de reserva, drawn in its own element, e.g. by `draw the pila de reserva`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its pila de reserva's properties;  its methods call its pila de reserva's.
 * - What every view's element does, e.g. drawing its pila de reserva, is `SpellElement`'s.
 */
export class PilaDeReservaElement extends SpellElement<PilaDeReserva> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-pila-de-reserva", "pila de reserva", [])

  canTake(carta: Carta) {
    return this.currentThing?.canTake(carta)
  }

  canGiveUp(carta: Carta) {
    return this.currentThing?.canGiveUp(carta)
  }

  drawItsPlaceholder() {
    return this.currentThing?.drawItsPlaceholder()
  }

  onClic(event: any /* spell: type unknown */) {
    return this.currentThing?.onClic(event)
  }
}
core.useElement(PilaDeReserva, PilaDeReservaElement)

/** Adonde van las cartas de la reserva al voltearse */
export class PilaDeDescartes extends Pila {
  static elementTag = core.defineElement(this, "test-project")

  get disposición(): Disposición {
    return "apilada"
  }

  canTake(carta: Carta) {
    return false
  }

  canGiveUp(carta: Carta) {
    return carta === this.lastItem
  }

  static itemsDraggable = true
}

/**
 * `<test-project-pila-de-descartes>`:  a pila de descartes, drawn in its own element, e.g. by `draw the pila de descartes`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its pila de descartes's properties;  its methods call its pila de descartes's.
 * - What every view's element does, e.g. drawing its pila de descartes, is `SpellElement`'s.
 */
export class PilaDeDescartesElement extends SpellElement<PilaDeDescartes> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-pila-de-descartes", "pila de descartes", [])

  canTake(carta: Carta) {
    return this.currentThing?.canTake(carta)
  }

  canGiveUp(carta: Carta) {
    return this.currentThing?.canGiveUp(carta)
  }
}
core.useElement(PilaDeDescartes, PilaDeDescartesElement)

/** Donde se arma un palo, del as al rey, una carta a la vez */
export class Fundación extends Pila {
  static elementTag = core.defineElement(this, "test-project")

  get disposición(): Disposición {
    return "apilada"
  }

  // su "palo" es un palo de carta
  @prop({ oneOf: () => Carta.Palos })
  accessor palo!: Palo

  canGiveUp(carta: Carta) {
    return false
  }

  // Un as gris claro de su palo, boca arriba
  drawItsPlaceholder() {
    return <es-texto part="marcador">{(new Carta({ rango: "as", palo: this.palo })).imagen}</es-texto>
  }

  canTake(carta: Carta) {
    if (carta !== carta.pila.lastItem) return false
    return this.palo === carta.palo && this.valor + 1 === carta.valor
  }

  static droppable = true
}

/**
 * `<test-project-fundacion>`:  a fundación, drawn in its own element, e.g. by `draw the fundación`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its fundación's properties;  its methods call its fundación's.
 * - What every view's element does, e.g. drawing its fundación, is `SpellElement`'s.
 */
export class FundaciónElement extends SpellElement<Fundación> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-fundacion", "fundación", [
    { name: "palo", kind: "string", description: "Its palo." }
  ])

  canGiveUp(carta: Carta) {
    return this.currentThing?.canGiveUp(carta)
  }

  drawItsPlaceholder() {
    return this.currentThing?.drawItsPlaceholder()
  }

  canTake(carta: Carta) {
    return this.currentThing?.canTake(carta)
  }
}
core.useElement(Fundación, FundaciónElement)

/** Una columna, armada hacia abajo del rey al as, rojo y negro alternados */
export class Columna extends Pila {
  static elementTag = core.defineElement(this, "test-project")

  get disposición(): Disposición {
    return "vertical"
  }

  canGiveUp(carta: Carta) {
    return carta.isFaceDirection("up")
  }

  static itemsDraggable = true

  canTake(carta: Carta) {
    if (this.isEmpty) return carta.esUnRango("rey")
    return this.color !== carta.color && this.valor === carta.valor + 1
  }

  static droppable = true
}

/**
 * `<test-project-columna>`:  a columna, drawn in its own element, e.g. by `draw the columna`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its columna's properties;  its methods call its columna's.
 * - What every view's element does, e.g. drawing its columna, is `SpellElement`'s.
 */
export class ColumnaElement extends SpellElement<Columna> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-columna", "columna", [])

  canGiveUp(carta: Carta) {
    return this.currentThing?.canGiveUp(carta)
  }

  canTake(carta: Carta) {
    return this.currentThing?.canTake(carta)
  }
}
core.useElement(Columna, ColumnaElement)

@thing
export class Solitario extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "puntuación" es un número
  @prop({ type: "number" })
  accessor puntuación!: number

  /** Las cartas jugadas en este juego:  voltear la reserva no cuenta */
  // su "movimientos" es un número
  @prop({ type: "number" })
  accessor movimientos!: number

  /** Lo que dice junto a la puntuación:  lo que sumaría un arrastre, p. ej. (+10), un arrastre que no cae en nada, una victoria */
  // su "pista" es texto
  @prop({ type: "text" })
  accessor pista!: string

  /** el cambio de una propiedad es un evento:  cada uno corre justo después del cambio */
  onPuntuaciónChange(event: PuntuaciónChangeEvent) {
    /** cada carta en una fundación:  el juego está ganado */
    let colocadas = this.tréboles.length + this.diamantes.length
    colocadas = colocadas + this.corazones.length + this.espadas.length
    if (colocadas === 52) this.pista = " -- ¡Ganaste!"
  }

  /** una carta jugada:  la última pista se va */
  onMovimientosChange(event: MovimientosChangeEvent) {
    this.pista = ""
  }

  // su "mazo" es un nuevo mazo
  @prop({ init: () => new Mazo(), early: true })
  accessor mazo!: Mazo

  // su "reserva" es una nueva pila de reserva con nombre = "reserva"
  @prop({ init: () => new PilaDeReserva({ name: "reserva" }), early: true })
  accessor reserva!: PilaDeReserva

  // su "descartes" es una nueva pila de descartes con nombre = "descartes"
  @prop({ init: () => new PilaDeDescartes({ name: "descartes" }), early: true })
  accessor descartes!: PilaDeDescartes

  // su "tréboles" es una nueva fundación con nombre = "tréboles", palo = tréboles
  @prop({ init: () => new Fundación({ name: "tréboles", palo: "tréboles" }), early: true })
  accessor tréboles!: Fundación

  // su "diamantes" es una nueva fundación con nombre = "diamantes", palo = diamantes
  @prop({ init: () => new Fundación({ name: "diamantes", palo: "diamantes" }), early: true })
  accessor diamantes!: Fundación

  // su "corazones" es una nueva fundación con nombre = "corazones", palo = corazones
  @prop({ init: () => new Fundación({ name: "corazones", palo: "corazones" }), early: true })
  accessor corazones!: Fundación

  // su "espadas" es una nueva fundación con nombre = "espadas", palo = espadas
  @prop({ init: () => new Fundación({ name: "espadas", palo: "espadas" }), early: true })
  accessor espadas!: Fundación

  // su "C1" es una nueva columna con nombre = "C1"
  @prop({ init: () => new Columna({ name: "C1" }), early: true })
  accessor C1!: Columna

  // su "C2" es una nueva columna con nombre = "C2"
  @prop({ init: () => new Columna({ name: "C2" }), early: true })
  accessor C2!: Columna

  // su "C3" es una nueva columna con nombre = "C3"
  @prop({ init: () => new Columna({ name: "C3" }), early: true })
  accessor C3!: Columna

  // su "C4" es una nueva columna con nombre = "C4"
  @prop({ init: () => new Columna({ name: "C4" }), early: true })
  accessor C4!: Columna

  // su "C5" es una nueva columna con nombre = "C5"
  @prop({ init: () => new Columna({ name: "C5" }), early: true })
  accessor C5!: Columna

  // su "C6" es una nueva columna con nombre = "C6"
  @prop({ init: () => new Columna({ name: "C6" }), early: true })
  accessor C6!: Columna

  // su "C7" es una nueva columna con nombre = "C7"
  @prop({ init: () => new Columna({ name: "C7" }), early: true })
  accessor C7!: Columna

  /** Cada carta del mazo a la reserva */
  create() {
    this.mazo.forEach((carta) => this.reserva.append(carta))
  }

  /** Los descartes, volteados, de vuelta a la reserva */
  rehacerLaReserva() {
    const cartas = this.descartes.clone()
    cartas.reverse()
    cartas.forEach((carta) => {
      this.reserva.append(carta)
      carta.turnFaceDown()
    })
  }

  /** Voltea la siguiente carta de la reserva, sobre los descartes:  los descartes de vuelta a la reserva cuando está vacía */
  async robarDeLaReserva() {
    if (this.reserva.isEmpty) this.rehacerLaReserva()
    const it = this.reserva.lastItem
    it?.turnFaceUp()
    // lo que tarda su giro (styles.css), así se voltea antes de moverse
    await core.pauseFor(300, "msec")
    this.descartes.append(it!)
  }

  /** Junta cada carta en la reserva, barájala, y reparte las columnas:  una carta más en cada una, de izquierda a derecha */
  async repartirLasCartas() {
    for (const carta of this.mazo) {
      const pilaInicial = carta.pila
      carta.turnFaceDown()
      if (pilaInicial !== this.reserva) {
        this.reserva.append(carta)
        await core.pauseFor(50, "msec")
      }
    }
    this.reserva.randomize()
    // la primera carta de cada fila cae boca abajo, y se voltea donde queda
    for (const fila of core.getRange(1, 7)) {
      for (const lugar of core.getRange(fila, 7)) {
        core.getItemAt(core.everyThing(Columna), position(lugar))?.append(this.reserva.lastItem!)
        if (lugar === fila) core.getItemAt(core.everyThing(Columna), position(lugar))?.lastItem?.turnFaceUp()
        await core.pauseFor(50, "msec")
      }
    }
    await this.robarDeLaReserva()
  }

  // Su barra, luego sus pilas, siete por línea, la tercera celda vacía;  un clic derecho en la mesa muestra el menú del juego
  @drawn draw() {
    return (
      <es-contenedor>
        <es-barra-herramientas class="GameBar" menu="menú del juego" aria-label="Juego" encogible={true}>
          <es-texto class="GameTitle" slot="titulo" tamano="grande">Solitario Encanto</es-texto>
          <es-texto slot="derecha">
            {"Movimientos: "}
            {this.movimientos}
            {"  ·  Puntos: "}
            {this.puntuación}
            {this.pista}
          </es-texto>
        </es-barra-herramientas>
        <es-cuadricula class="Board" columnas="7" context-menu="menú del juego">
          {core.drawThing(this.reserva)}
          {core.drawThing(this.descartes)}
          <es-columna />
          {core.drawThing(this.tréboles)}
          {core.drawThing(this.diamantes)}
          {core.drawThing(this.corazones)}
          {core.drawThing(this.espadas)}
          {core.drawThing(this.C1)}
          {core.drawThing(this.C2)}
          {core.drawThing(this.C3)}
          {core.drawThing(this.C4)}
          {core.drawThing(this.C5)}
          {core.drawThing(this.C6)}
          {core.drawThing(this.C7)}
        </es-cuadricula>
      </es-contenedor>
    )
  }

  async voltearLaReserva() {
    await this.robarDeLaReserva()
  }

  async empezarElJuego() {
    this.puntuación = 0
    this.movimientos = 0
    this.pista = ""
    await this.repartirLasCartas()
  }

  async jugarSolo() {
    let huboCambios: boolean = false
    if (!this.descartes.isEmpty) {
      const candidata = this.descartes.lastItem
      if (await candidata?.jugar()) {
        huboCambios = true
        await core.pauseFor(500, "msec")
      }
    }
    // la última carta de cada columna a su fundación
    await core.forEachSequential(core.everyThing(Columna), async (pila: Columna) => {
      if (pila.isEmpty) return
      const candidata = pila.lastItem!
      const fundación = core.filter(core.everyThing(Fundación), (pila: Fundación) => pila.palo === candidata.palo).firstItem
      if (core.canTake(fundación!, candidata)) {
        huboCambios = true
        await candidata.jugar()
        await core.pauseFor(100, "msec")
      }
    })
    // las cartas boca arriba de cada columna, todas juntas, a otra columna
    await core.forEachSequential(core.everyThing(Columna), async (pila: Columna) => {
      const cartasVisibles = pila.filter((carta) => carta.isFaceDirection("up"))
      if (cartasVisibles.isEmpty) return
      const candidata = cartasVisibles.firstItem!
      if (candidata.esUnRango("rey") && candidata === pila.firstItem) return
      if (await candidata.jugar()) {
        huboCambios = true
        await core.pauseFor(500, "msec")
      }
    })
    if (huboCambios) await this.jugarSolo()
  }

  async hacerTrampa() {
    const pilasRestantes = core.filter(core.everyThing(Columna), (pila: Columna) => !pila.isEmpty && pila.firstItem?.isFaceDirection("down"))
    if (core.isEmpty(pilasRestantes)) return
    const pila = core.randomItemOf<Columna>(pilasRestantes)
    const carta = pila?.filter((carta) => carta.isFaceDirection("down"))?.randomItem()
    // arriba, fuera de su pila, luego se voltea, luego baja a los descartes
    carta!.levantada = true
    await core.pauseFor(300, "msec")
    carta?.turnFaceUp()
    await core.pauseFor(30, "ticks")
    carta!.levantada = false
    this.descartes.append(carta!)
  }
}

/**
 * `<test-project-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its solitario's properties;  its methods call its solitario's.
 * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.
 */
export class SolitarioElement extends SpellElement<Solitario> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "solitario", [
    { name: "puntuación", kind: "number", description: "Its puntuación." },
    { name: "movimientos", kind: "number", description: "Its movimientos." },
    { name: "pista", kind: "string", description: "Its pista." },
    { name: "mazo", kind: "json", description: "Its mazo." },
    { name: "reserva", kind: "json", description: "Its reserva." },
    { name: "descartes", kind: "json", description: "Its descartes." },
    { name: "tréboles", kind: "json", description: "Its tréboles." },
    { name: "diamantes", kind: "json", description: "Its diamantes." },
    { name: "corazones", kind: "json", description: "Its corazones." },
    { name: "espadas", kind: "json", description: "Its espadas." },
    { name: "-c1", kind: "json", description: "Its C1." },
    { name: "-c2", kind: "json", description: "Its C2." },
    { name: "-c3", kind: "json", description: "Its C3." },
    { name: "-c4", kind: "json", description: "Its C4." },
    { name: "-c5", kind: "json", description: "Its C5." },
    { name: "-c6", kind: "json", description: "Its C6." },
    { name: "-c7", kind: "json", description: "Its C7." }
  ])

  onPuntuaciónChange(event: PuntuaciónChangeEvent) {
    return this.currentThing?.onPuntuaciónChange(event)
  }

  onMovimientosChange(event: MovimientosChangeEvent) {
    return this.currentThing?.onMovimientosChange(event)
  }

  create() {
    return this.currentThing?.create()
  }

  rehacerLaReserva() {
    return this.currentThing?.rehacerLaReserva()
  }

  robarDeLaReserva() {
    return this.currentThing?.robarDeLaReserva()
  }

  repartirLasCartas() {
    return this.currentThing?.repartirLasCartas()
  }

  voltearLaReserva() {
    return this.currentThing?.voltearLaReserva()
  }

  empezarElJuego() {
    return this.currentThing?.empezarElJuego()
  }

  jugarSolo() {
    return this.currentThing?.jugarSolo()
  }

  hacerTrampa() {
    return this.currentThing?.hacerTrampa()
  }
}
core.useElement(Solitario, SolitarioElement)
export const solitario = new Solitario()

// Una de cada, hecha con el solitario

// Cada uno se detiene un momento, así el reparto se anima

/** Un clic en la reserva vacía:  un paso para deshacer, donde el del reparto no lo es */
core.describeAction(Solitario, "voltearLaReserva", { title: "voltear la reserva", undoneAs: "Voltear carta" })

// Sus movimientos:  los botones de la barra, sus teclas, y el clic derecho en la mesa;  cada uno dice su título una vez, para los tres
core.describeAction(Solitario, "empezarElJuego", { title: "Reiniciar", shortcuts: ["N"], undoneAs: "Reiniciar" })

/** Juega cada carta que puede ir a algún lado, hasta que ninguna pueda */
core.describeAction(Solitario, "jugarSolo", { title: "Jugar solo", shortcuts: ["A"], undoneAs: "Jugar solo" })

/** Voltea una carta boca abajo de una columna, al azar, sobre los descartes */
core.describeAction(Solitario, "hacerTrampa", { title: "Trampa", shortcuts: ["C"], undoneAs: "Trampa" })

// su "menú del juego" es un menú de "jugar solo" , "hacer trampa" , "empezar el juego" , "deshacer" y "rehacer"
core.describeMenu(Solitario, "menúDelJuego", { items: ["jugarSolo", "hacerTrampa", "empezarElJuego", "undo", "redo"] })

core.heading("Jugar una carta")
/////////////////////
// ## Jugar una carta
/////////////////////
// Qué hace un clic o un arrastre:  los movimientos propios de la carta, y los de cada pila, como el juego los juega.

/**
 * la carta, y cada carta sobre ella, a la primera pila que la tome;  dice si se movió
 * - la carta de la reserva se voltea sobre los descartes en su lugar
 */
core.describeAction(Carta, "jugar", { title: "jugar una carta", undoneAs: "Jugar carta" })

/**
 * la carta, y cada carta sobre ella, a la pila, si las reglas de las pilas la dejan ir y tomarla;  dice si se movió
 * - la pila que dejó voltea su nueva última carta;  el movimiento cuenta, y suma puntos
 */
core.describeAction(Carta, "ponerEnPila", { title: "poner una carta en una pila", undoneAs: "Mover carta" })

// los eventos de cada carta, y cuándo se puede pulsar:  el Inspector los muestra, como están escritos aquí
// solo una carta boca arriba, o la de la reserva, se puede pulsar:  las otras no muestran el puntero

core.heading("Las pilas")
///////////////
// ## Las pilas
///////////////
// Cada tipo de pila, qué puede tomar o soltar, y cómo están sus cartas.
// Mientras está vacía, muestra su marcador, si tiene uno.

/** solo su carta de arriba se puede levantar */

/** una carta a la vez, la última de su pila:  su palo, uno más alto */

/** sus cartas boca arriba se pueden levantar, con cada carta sobre ellas */
/** un rey en una vacía;  si no, uno más bajo, del otro color */

export function testLosMovimientos() {
  return core.test("test los movimientos", function testLosMovimientos() {
    const it = new Columna()
    core.echoTestAction(`poner la columna a una nueva columna con nombre = "C1"`)
    let columna = new Columna({ name: "C1" })
    core.echoTestAction(`poner el rey a una nueva carta cuyo rango es rey, palo es espadas y dirección es arriba`)
    const rey = new Carta({
      rango: "rey",
      palo: "espadas",
      direction: "up"
    })
    core.echoTestAction(`poner la dama a una nueva carta cuyo rango es dama, palo es corazones y dirección es arriba`)
    const dama = new Carta({
      rango: "dama",
      palo: "corazones",
      direction: "up"
    })
    core.echoTestAction(`poner la jota a una nueva carta cuyo rango es jota, palo es tréboles y dirección es arriba`)
    const jota = new Carta({
      rango: "jota",
      palo: "tréboles",
      direction: "up"
    })
    // una columna vacía toma solo un rey, luego uno más bajo del otro color
    core.expect(core.canTake(columna, dama), `la columna puede tomar la dama`, false, `no`)
    core.expect(core.canTake(columna, rey), `la columna puede tomar el rey`, true, `sí`)
    core.echoTestAction(`agregar el rey a la columna`)
    columna.append(rey)
    core.expect(core.canTake(columna, jota), `la columna puede tomar la jota`, false, `no`)
    core.expect(core.canTake(columna, dama), `la columna puede tomar la dama`, true, `sí`)
    core.echoTestAction(`agregar la dama a la columna`)
    columna.append(dama)
    core.expect(columna.estado, `el estado de la columna`, "C1: R♠↑ D♥↑", `"C1: R♠↑ D♥↑"`)
    core.expect(core.canGiveUp(columna, dama), `la columna puede soltar la dama`, true, `sí`)
    core.echoTestAction(`voltear la dama boca abajo`)
    dama.turnFaceDown()
    core.expect(core.canGiveUp(columna, dama), `la columna puede soltar la dama`, false, `no`)

    /** una fundación toma su palo, el as primero, luego uno más alto:  cada una la última carta de su pila */
    const fundación = new Fundación({ name: "corazones", palo: "corazones" })
    core.echoTestAction(`poner el dos a una nueva carta cuyo rango es 2, palo es corazones y dirección es arriba`)
    const dos = new Carta({
      rango: 2,
      palo: "corazones",
      direction: "up"
    })
    core.echoTestAction(`poner el as a una nueva carta cuyo rango es as, palo es corazones y dirección es arriba`)
    const as = new Carta({
      rango: "as",
      palo: "corazones",
      direction: "up"
    })
    core.echoTestAction(`poner la columna a una nueva columna con nombre = "C2"`)
    columna = new Columna({ name: "C2" })
    core.echoTestAction(`agregar el dos a la columna`)
    columna.append(dos)
    core.echoTestAction(`agregar el as a la columna`)
    columna.append(as)
    core.expect(core.canTake(fundación, dos), `la fundación puede tomar el dos`, false, `no`)
    core.expect(core.canTake(fundación, as), `la fundación puede tomar el as`, true, `sí`)
    core.echoTestAction(`mover el as a la fundación`)
    core.move(as, fundación)
    core.expect(core.canTake(fundación, dos), `la fundación puede tomar el dos`, true, `sí`)
    core.echoTestAction(`agregar la dama a la columna`)
    columna.append(dama)
    core.expect(core.canTake(fundación, dama), `la fundación puede tomar la dama`, false, `no`)
  })
}

core.holdWhile(() => solitario.repartirLasCartas())
// -----------
core.installStyles(undefined, `/* File styles.css:  how the board looks -- each card, and how each pile lays its cards out (its disposición).¬   - A card is drawn as a playing card here, not as a Spell UI element:  no <ui-*> tag draws one, so its size, its¬     faces and its turn over are this sheet's.¬   - Every pile and card is an element of its own on the board, so these rules reach them all:¬     - a pile by its disposición, e.g. <solitario-columna disposición="vertical">¬     - each card in it by its place, --index from 0, and how many there are, --count:  the pile numbers them¬     - an empty pile's placeholder, its marcador, which it draws itself, by its part:  ::part(marcador)¬   - A card is one letter of unicode's Playing Cards, at its pile's width:¬     so a card is as wide as its column, whatever the window's width. */¬¬/* A card's picture, in ems of its own letter (measured in Chrome on a Mac):¬   0.604em wide, 0.805em tall, its left edge 0.049em into the letter;  its outline reaches a little past that, so a¬   card keeps 0.008em to spare above and below. */¬:root,¬:host {¬  /* how wide a card is, for each em of its letter */¬  --card-width: 0.604;¬  /* how tall it is, for each of its widths:  (0.805 + 2 x 0.008) / 0.604 */¬  --card-height: 1.359;¬  /* down a column, how much of each card shows under the next:  a fifth of it, its rank and suit */¬  --card-step-down: 0.2;¬  /* along a row, how much of each card the next one covers:  a tenth of it */¬  --card-overlap: 0.1;¬  /* fanned, how far each card turns from the one before */¬  --card-turn: 8deg;¬}¬¬/****************¬ * The table:  green felt, as on a casino's card table, with the words on it in white¬ ****************/¬¬solitario-app {¬  display: block;¬  min-height: 100%;¬  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"), #12683f;¬}¬.GameTitle,¬.GameBar > [slot] {¬  color: #f2fbf5;¬}¬¬/****************¬ * The board:  below the game's toolbar, its piles seven to a line¬ ****************/¬¬.Board {¬  /* gutters that shrink with a narrow window, so the cards keep most of its width */¬  --ui-grid-gutter: min(2rem, 2.5vw);¬  --ui-grid-row-spacing: min(2rem, 4vw);¬  /* 1.5rem below the toolbar:  the grid pulls itself up by half a row's spacing */¬  margin-top: calc(1.5rem + var(--ui-grid-row-spacing) / 2);¬}¬¬/****************¬ * The toolbar:  its buttons in the middle, each a button of its own, with no frame around them¬ ****************/¬¬.GameBar {¬  --ui-menu-divider: transparent;¬}¬/* the game's name, in the heavy type of Spell's loading screen */¬.GameTitle {¬  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Lato, Arial, sans-serif;¬  font-weight: 800;¬  letter-spacing: -0.035em;¬}¬¬/* the title and the score take equal room, so the buttons sit in the true middle */¬.GameBar::part(title),¬.GameBar::part(right) {¬  flex: 1 1 0;¬}¬.GameBar::part(right) {¬  justify-content: flex-end;¬}¬.GameBar::part(menu) {¬  flex: 0 1 auto;¬  /* it would scroll, which would cut the pills' shadow */¬  overflow: visible;¬  min-width: 0;¬  gap: 0;¬  border: 0;¬  box-shadow: none;¬  background: transparent;¬  /* one shadow around each whole pill, with none falling across its buttons */¬  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.35));¬}¬/* two pills, auto play | cheat | restart and undo | redo:  each button shares its edge with the next */¬.GameBar > *::part(item) {¬  padding: 0.55em 1em;¬  margin-left: -1px;¬  border: 0;¬  border-radius: 0;¬  background: Canvas;¬  font-weight: 500;¬  box-shadow: inset 0 0 0 1px var(--ui-border-color);¬  transition: background-color 120ms ease-out;¬}¬.GameBar > :not([slot]):nth-of-type(1)::part(item),¬.GameBar > :not([slot]):nth-of-type(4)::part(item) {¬  border-start-start-radius: 99em;¬  border-end-start-radius: 99em;¬}¬.GameBar > :not([slot]):nth-of-type(3)::part(item),¬.GameBar > :not([slot]):nth-of-type(5)::part(item) {¬  border-start-end-radius: 99em;¬  border-end-end-radius: 99em;¬}¬.GameBar > :not([slot]):nth-of-type(4)::part(item) {¬  margin-left: 1em;¬}¬.GameBar > *::part(item):hover {¬  background: color-mix(in srgb, Canvas 92%, CanvasText);¬}¬.GameBar > *::part(item):active {¬  background: color-mix(in srgb, Canvas 84%, CanvasText);¬}¬/* undo and redo:  just their icons, their names kept for a screen reader */¬.GameBar > :not([slot]):nth-of-type(n + 4)::part(title) {¬  font-size: 0;¬}¬.GameBar > :not([slot]):nth-of-type(n + 4)::part(icon) {¬  margin: 0;¬}¬.GameBar > :not([slot]):nth-of-type(n + 4)::part(shortcut) {¬  display: none;¬}¬/* its key, a small key cap */¬.GameBar > *::part(shortcut) {¬  margin-inline-start: 0.6em;¬  padding: 0.1em 0.45em;¬  border-radius: var(--ui-radius-s);¬  background: color-mix(in oklch, currentColor 8%, transparent);¬  font-size: 0.75em;¬}¬¬/* A narrow window, a phone's:  the toolbar loses its title, so the score and buttons fit on one line¬   (its buttons fold to their icons, or their first letters, by themselves:  it's shrinkable) */¬@media (width < 36rem) {¬  .GameBar::part(title) {¬    display: none;¬  }¬  .GameBar > *::part(item) {¬    padding-inline: 0.55em;¬  }¬  .GameBar > [slot] {¬    font-size: 0.8em;¬    white-space: nowrap;¬  }¬  [slot="titulo"] {¬    display: none;¬  }¬}¬¬/****************¬ * A pile:  as wide as its cell of the board, and as tall as its cards¬ ****************/¬¬[disposición] {¬  /* a box of its own, holding its floated sizer */¬  display: flow-root;¬  position: relative;¬  /* its cards size themselves by its width */¬  container-type: inline-size;¬  /* no glow around the whole pile when a dragged card would land on it:  its top card glows instead (below) */¬  --spell-drop-glow: none;¬}¬/* its height:  a card's, by default -- a percentage of padding is one of its width */¬[disposición]::before {¬  content: "";¬  /* floated, so its cards start at the top of its content, not below it */¬  float: left;¬  width: 100%;¬  padding-top: calc(100% * var(--card-height));¬}¬¬/* Each card, and the placeholder:  a card's letter as wide as the pile, cut to the card it draws */¬[disposición] > *,¬[disposición]::part(marcador) {¬  position: absolute;¬  display: block;¬  /* where its pile's content starts, inside the cell's gutters:  its offsets in a layout are margins */¬  top: auto;¬  left: auto;¬  font-size: calc(100cqi / var(--card-width));¬}¬/* A card on its own, in no pile (one added to the table in the editor):  a column's usual width, face up */¬solitario-carta:not([disposición] > *) {¬  position: relative;¬  display: inline-block;¬  vertical-align: top;¬  font-size: calc(var(--loose-card-width, 6rem) / var(--card-width));¬}¬[disposición] > *,¬[disposición]::part(marcador),¬solitario-carta {¬  width: calc(var(--card-width) * 1em);¬  height: calc(var(--card-width) * var(--card-height) * 1em);¬  overflow: hidden;¬  /* in the font that draws the cards, so the page's font never moves them:  a line's height comes from its FIRST font,¬     and a theme's (Fruity's system font) set them 0.027em higher than Lato did, cutting off their tops */¬  font-family: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif;¬  /* the card's spare room above and below its ink (0.008em) padding, its white face only the content, so it hugs the ink¬     (not a border:  a browser rounds a border to whole pixels) */¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  /* Apple Symbols rises 0.67em and drops 0.25em, its card's ink 0.666em above its baseline:¬     a line of 0.917 starts the ink at the top of the face (measured:  0.912 by the font's rounded numbers) */¬  line-height: 0.917;¬  --ui-text-line-height: 0.917;¬  text-indent: -0.049em;¬  user-select: none;¬}¬¬/****************¬ * Turning over:  a card draws both its sides (Carta.es.spellml), back to back, and turns over in 3D¬ * - The card is the thing that turns:  face up it's square on, face down it's turned half round (180°).¬ *   Its back side is drawn already turned half round, so it faces you when the card does.¬ * - Each side hides while it faces away (backface-visibility), so you see the front, then the back come round.¬ * - A side is one letter, cut to the card and on its white face:  the cut and the face are the side's own, since a¬ *   card that cut its own content would draw flat, and its sides couldn't turn with it.¬ * - A card that's drawn already turned shows that side at once:  only a change turns it.¬ * - 0.3s:  the game pauses that long after turning the stock's card (Solitario.es.spellml), so it turns over before it moves.¬ ****************/¬¬[disposición] > *,¬solitario-carta {¬  /* its sides turn with it, in 3D */¬  transform-style: preserve-3d;¬  overflow: visible;¬  transform: perspective(3em) rotateY(0deg);¬  transition: transform 0.3s ease-in-out;¬}¬[disposición] > :not([direction="up"]) {¬  transform: perspective(3em) rotateY(180deg);¬}¬/* each side:  the card's whole box, its letter cut to it on a white face, its corners rounded as the letter's are;¬   an <es-texto> draws no box of its own, so it's given one */¬solitario-carta::part(front),¬solitario-carta::part(back),¬[disposición] > *::part(front),¬[disposición] > *::part(back) {¬  display: block;¬  position: absolute;¬  inset: 0;¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  overflow: hidden;¬  background: #fff;¬  background-clip: content-box;¬  border-radius: 0.035em;¬  backface-visibility: hidden;¬}¬solitario-carta::part(back),¬[disposición] > *::part(back) {¬  transform: rotateY(180deg);¬}¬/* Pulled up out of its pile (the card's "levantada"), as the cheat does:  a card's height and a little above the pile's top,¬   over every card and pile it passes */¬[disposición] > * {¬  transition:¬    transform 0.3s ease-in-out,¬    translate 0.3s ease-out;¬}¬[disposición] > [levantada] {¬  z-index: 5;¬  translate: 0 calc(-1 * (var(--index) * var(--card-step-down) + 1.08) * var(--card-width) * var(--card-height) * 1em);¬}¬¬@media (prefers-reduced-motion: reduce) {¬  [disposición] > * {¬    transition: none;¬  }¬}¬¬/* An empty pile's placeholder:  a faint pale card on the felt */¬[disposición]::part(marcador) {¬  color: #d8f0e0;¬  opacity: 0.4;¬}¬[disposición]::part(marcador):hover {¬  opacity: 0.5;¬}¬¬/*¬ * A real deck's colours, the same in every theme and scheme (Owen:  "colors should be the same for all themes",¬ * "foundation colors too"):  each card drawn in the light scheme, so a dark theme doesn't lighten its inks,¬ * and its three inks fixed, so a theme's own red, black and blue don't reach it;  an empty pile's placeholder¬ * (above) pale, on the felt¬ */¬[disposición] > *,¬solitario-carta {¬  color-scheme: light;¬  --ui-red-text: #c8102e;¬  --ui-black-text: #1a1a1a;¬  --ui-blue-text: #2f6fd6;¬}¬¬/****************¬ * Dropping:  a card dragged anywhere over a pile that would take it lights up the card it would land on¬ * - That's the pile's top card, its last:  on a column, the face-up card at its foot.¬ *   An empty pile's placeholder, where it would lie.¬ * - A tight glow hugging the card:  a thin ring, then a soft halo.¬ *   The rings grow out from the card's own corners, so they round more than it does.¬ * - The pile says it would take the card by its state, :state(accepting-drop):  the runtime sets it, by the pile's rules.¬ ****************/¬¬[disposición]:state(accepting-drop) > :last-child,¬[disposición]:state(accepting-drop)::part(marcador) {¬  border-radius: 0.035em;¬  box-shadow:¬    0 0 0 0.012em rgb(150 80 255 / 0.85),¬    0 0 0.06em 0.025em rgb(150 80 255 / 0.55);¬}¬/* an empty pile's placeholder shows clearly while it would take the card */¬[disposición]:state(accepting-drop)::part(marcador) {¬  opacity: 1;¬}¬¬/****************¬ * The disposiciones:  apilada puts every card on top of the one before¬ ****************/¬¬/* vertical:  each card a step below the one before */¬[disposición="vertical"]::before {¬  padding-top: calc(100% * var(--card-height) * (1 + (max(var(--count, 1), 1) - 1) * var(--card-step-down)));¬}¬[disposición="vertical"] > * {¬  margin-top: calc(var(--index) * var(--card-width) * var(--card-height) * 1em * var(--card-step-down));¬}¬¬/* horizontal:  side by side, each covering the edge of the one before;  smaller as there are more, to fit the pile */¬[disposición="horizontal"] {¬  --spread: calc(1 + (max(var(--count, 1), 1) - 1) * (1 - var(--card-overlap)));¬}¬[disposición="horizontal"]::before {¬  padding-top: calc(100% * var(--card-height) / var(--spread));¬}¬[disposición="horizontal"] > * {¬  font-size: calc(100cqi / var(--card-width) / var(--spread));¬  margin-left: calc(var(--index) * var(--card-width) * 1em * (1 - var(--card-overlap)));¬}¬¬/* abanico (fanned):  as a hand of cards is held, each turned a little from the one before, around a point below them */¬[disposición="abanico"] > * {¬  font-size: calc(60cqi / var(--card-width));¬  left: calc(50% - var(--card-width) * 0.5em);¬  margin-top: 10%;¬  transform-origin: 50% 200%;¬  rotate: calc((var(--index) - (var(--count) - 1) / 2) * var(--card-turn));¬}¬`)
// -----------
if (!core.isCarryingOver) solitario.start()
// -----------
if (!core.isCarryingOver) testLaPreparaciónDeLaCarta()
if (!core.isCarryingOver) testLaCreaciónDelMazo()
if (!core.isCarryingOver) testLasPilas()
if (!core.isCarryingOver) testLosMovimientos()

// what each event this program hears holds
export type ClickEvent = SentEvent
export type DragSpellEvent = SentEvent
export type DragCancelledEvent = SentEvent
export type PuntuaciónChangeEvent = SentEvent & { value: number; was: number }
export type MovimientosChangeEvent = SentEvent & { value: number; was: number }

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CartaElement` */
      "test-project-carta": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PilaElement` */
      "test-project-pila": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PilaDeReservaElement` */
      "test-project-pila-de-reserva": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PilaDeDescartesElement` */
      "test-project-pila-de-descartes": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FundaciónElement` */
      "test-project-fundacion": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ColumnaElement` */
      "test-project-columna": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SolitarioElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
