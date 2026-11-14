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
  static Rangos = ["as", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jota", "dama", "rey"] as const
  @prop({ oneOf: () => Carta.Rangos })
  accessor rango!: Rango

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
  static Palos = ["tréboles", "diamantes", "corazones", "espadas"] as const
  @prop({ oneOf: () => Carta.Palos })
  accessor palo!: Palo

  // su "color" es uno de rojo, negro
  //   rojo si es un diamante o es un corazón
  //   negro de lo contrario
  static Colores = ["rojo", "negro"]
  get color() {
    if (this.palo === "diamantes" || this.palo === "corazones") return "rojo"
    return "negro"
  }

  get símbolo() {
    if (this.palo === "tréboles") return "♣"
    if (this.palo === "diamantes") return "♦"
    if (this.palo === "corazones") return "♥"
    return "♠"
  }

  get nombre() {
    return core.joined(core.joined(this.rango, "de", " "), this.palo, " ")
  }

  esElRangoDePalo(rango: Rango, palo: Palo) {
    return this.rango === rango && this.palo === palo
  }

  /** Su nombre corto:  D♠↓ es la dama de espadas, boca abajo */
  get nombreCorto() {
    const letra = this.valor === 10 ? 10 : `${core.getItemAt(this.rango, 0) ?? ""}`.toLocaleUpperCase()
    const flecha = this.isFaceDirection("up") ? "↑" : "↓"
    return letra + this.símbolo + flecha
  }

  /** Su cara:  https://www.compart.com/en/unicode/block/U+1F0A0 */
  get imagen() {
    const lugar = this.valor
    if (this.palo === "tréboles") return core.getItemAt(["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"], position(lugar))
    if (this.palo === "diamantes") return core.getItemAt(["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"], position(lugar))
    if (this.palo === "corazones") return core.getItemAt(["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"], position(lugar))
    return core.getItemAt(["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"], position(lugar))
  }

  /** Por encima de las cartas y pilas de su alrededor mientras la trampa la mueve -- styles.css */
  // su "levantada" es sí o no
  @prop({ type: "choice" })
  accessor levantada!: boolean

  drawFront() {
    return <es-texto color={this.color} part="front">{this.imagen}</es-texto>
  }

  drawBack() {
    return <es-texto color="azul" part="back">🂠</es-texto>
  }

  /////////////////////
  // ## Jugar una carta
  /////////////////////
  // Qué hace un clic o un arrastre:  los movimientos propios de la carta, y los de cada pila, como el juego los juega.

  /**
   * la carta, y cada carta sobre ella, a la primera pila que la tome;  dice si se movió
   * - la carta de la reserva se voltea sobre los descartes en su lugar
   */
  async jugar() {
    if (this.pila === solitario.reserva) {
      await solitario.robarDeLaReserva()
      return
    }
    const pilaFinal = core.filter(core.everyThing(Pila), (pila: Pila) => core.canTake(pila, this)).firstItem
    if (pilaFinal === undefined) return false
    return await this.ponerEnPila(pilaFinal)
  }

  /**
   * la carta, y cada carta sobre ella, a la pila, si las reglas de las pilas la dejan ir y tomarla;  dice si se movió
   * - la pila que dejó voltea su nueva última carta;  el movimiento cuenta, y suma puntos
   */
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

  /** lo que suma el movimiento:  10 en una fundación, 5 desde los descartes, si no nada */
  contarLosPuntosDeCartaEnPila(pila: Pila) {
    if (pila instanceof Fundación) return 10
    if (this.pila === solitario.descartes) return 5
    return 0
  }

  /** un clic la juega */
  async onClick(event: ClickEvent) {
    await this.jugar()
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

  esElRangoDePalo(rango: Rango, palo: Palo) {
    return this.currentThing?.esElRangoDePalo(rango, palo)
  }

  drawFront() {
    return this.currentThing?.drawFront()
  }

  drawBack() {
    return this.currentThing?.drawBack()
  }

  jugar() {
    return this.currentThing?.jugar()
  }

  ponerEnPila(pila: Pila) {
    return this.currentThing?.ponerEnPila(pila)
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
}
core.useElement(Carta, CartaElement)
core.describeAction(Carta, "jugar", { title: "Jugar Una Carta", undoneAs: "Jugar carta" })
core.describeAction(Carta, "ponerEnPila", { title: "Poner Una Carta En Una Pila", undoneAs: "Mover carta" })
core.describeAction(Carta, "contarLosPuntosDeCartaEnPila", { title: "Contar Los Puntos De Una Carta En Una Pila", undoneAs: "Contar Los Puntos De Una Carta En Una Pila" })
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
    core.expect(it2.nombreCorto, `su nombre corto`, "D♠↓", `"D♠↓"`)
    core.expect(it2.esUnaFigura, `es una figura`, true, `sí`)
    core.expect(it2.palo === "espadas", `es una espada`, true, `sí`)
    core.expect(it2.palo === "tréboles", `es un trébol`, false, `no`)
    core.expect(it2.rango === "dama", `es una dama`, true, `sí`)
    core.expect(it2.rango === 2, `es un 2`, false, `no`)
    core.expect(it2.esElRangoDePalo("dama", "espadas"), `es la dama de espadas`, true, `sí`)
    core.expect(it2.esElRangoDePalo("dama", "tréboles"), `es la dama de tréboles`, false, `no`)
    core.expect(it2.imagen, `su imagen`, "🂭", `"🂭"`)

    core.echoTestAction(`voltear eso`)
    it2.turnOver()
    core.expect(it2.isFaceDirection("up"), `está boca arriba`, true, `sí`)
    core.expect(it2.nombreCorto, `su nombre corto`, "D♠↑", `"D♠↑"`)

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
  @derived get nombreCorto() {
    const nombres = new List<string>({ instanceType: "text" })
    this.forEach((carta) => nombres.append(carta.nombreCorto))
    return `mazo: ${nombres}`
  }
}

export function testLaCreaciónDelMazo() {
  return core.test("test la creación del mazo", function testLaCreaciónDelMazo() {
    const it = new Mazo()
    core.echoTestAction(`el mazo es un nuevo mazo`)
    const mazo = new Mazo()
    core.expect(mazo.length, `el número de cartas en el mazo`, 52, `52`)
    core.expect(mazo.filter((carta) => carta.rango === "dama").length, `el número de (cartas en el mazo donde es una dama)`, 4, `4`)
    core.expect(mazo.firstItem?.nombreCorto!, `el nombre corto de la primera carta del mazo`, "A♣↓", `"A♣↓"`)
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

  /** Cómo están sus cartas:  una sobre otra, o hacia abajo en una columna -- styles.css */
  // su "disposición" es uno de apilada o vertical
  static Disposiciones = ["apilada", "vertical"] as const
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

  /** Su id, luego los nombres cortos de sus cartas:  reserva: D♠↑ 7♥↓ */
  @derived get nombreCorto() {
    let resumen = `${this.id}:`
    this.forEach((carta) => (resumen = `${resumen} ${carta.nombreCorto}`))
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
    core.echoTestAction(`poner la reserva a una nueva pila con id "reserva"`)
    const reserva = new Pila({ id: "reserva" })
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
    core.expect(reserva.nombreCorto, `el nombre corto de la reserva`, "reserva: D♠↑ 7♥↓", `"reserva: D♠↑ 7♥↓"`)

    /** una carta está en una sola pila a la vez */
    const descartes = new Pila({ id: "descartes" })
    core.echoTestAction(`obtener la última carta de la reserva`)
    const it2 = reserva.lastItem
    core.echoTestAction(`agregar eso a los descartes`)
    descartes.append(it2!)
    core.expect(it2?.pila === descartes, `su pila es los descartes`, true, `sí`)
    core.expect(reserva.length, `el número de cartas en la reserva`, 1, `1`)
    core.expect(descartes.nombreCorto, `el nombre corto de los descartes`, "descartes: 7♥↓", `"descartes: 7♥↓"`)
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

  drawItsPlaceholder() {
    // Una carta gris claro, boca abajo
    return <es-texto part="placeholder">🂠</es-texto>
  }

  /** Vacía:  un clic vuelve a voltear los descartes;  un clic en una de sus cartas es de la carta */
  async onClic(event: any /* spell: type unknown */) {
    await solitario.robarDeLaReserva()
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

  drawItsPlaceholder() {
    // Un as gris claro de su palo, boca arriba
    return <es-texto part="placeholder">{(new Carta({ rango: "as", palo: this.palo })).imagen}</es-texto>
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
    return (this.isEmpty && carta.rango === "rey") || (this.color !== carta.color && this.valor === carta.valor + 1)
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

/** Cada pila se declara donde se dibuja, `<columna "C1"/>`, y también la puntuación, `<número "puntuación"/>` */
@thing
export class Solitario extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** el cambio de una propiedad es un evento:  cada uno corre justo después del cambio */
  async onPuntuaciónChange(event: PuntuaciónChangeEvent) {
    /** cada carta en una fundación:  el juego está ganado */
    let colocadas = this.tréboles.length + this.diamantes.length
    colocadas = colocadas + this.corazones.length + this.espadas.length
    if (colocadas === 52) {
      await core.alert("¡Ganaste!", "Juego nuevo")
      await this.reiniciarElJuego()
    }
  }

  /** una carta jugada:  la última pista se va */
  onMovimientosChange(event: MovimientosChangeEvent) {
    this.pista = ""
  }

  // "mazo" es un nuevo mazo
  @prop({ init: () => new Mazo({ id: "mazo" }), early: true })
  accessor mazo!: Mazo

  /** Cada carta del mazo a la reserva */
  create() {
    this.mazo.forEach((carta) => this.reserva.append(carta))
  }

  /** Los descartes, volteados, de vuelta a la reserva */
  rehacerLaReserva() {
    const cartas = this.descartes.clone()
    cartas.reverse()
    cartas.forEach((carta) => this.reserva.append(carta))
    this.reserva.forEach((carta) => carta.turnFaceDown())
  }

  /** Voltea la siguiente carta de la reserva, sobre los descartes:  los descartes de vuelta a la reserva cuando está vacía */
  async robarDeLaReserva() {
    // - un clic en la reserva, un paso para deshacer;  el del reparto ninguno, pues empieza el juego
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

  async reiniciarElJuego() {
    this.puntuación = 0
    this.movimientos = 0
    this.pista = ""
    await this.repartirLasCartas()
  }

  /** Juega cada carta que puede ir a algún lado, hasta que ninguna pueda */
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
      if (candidata.rango === "rey" && candidata === pila.firstItem) return
      if (await candidata.jugar()) {
        huboCambios = true
        await core.pauseFor(500, "msec")
      }
    })
    if (huboCambios) await this.jugarSolo()
  }

  /** Voltea una carta boca abajo de una columna, al azar, sobre los descartes */
  async hacerTrampa() {
    const pilasRestantes = core.filter(core.everyThing(Columna), (pila: Columna) => !pila.isEmpty && pila.firstItem?.isFaceDirection("down"))
    if (core.isEmpty(pilasRestantes)) return
    const pila = core.randomItemOf<Columna>(pilasRestantes)
    const carta = pila?.filter((carta) => carta.isFaceDirection("down"))?.randomItem()
    // por encima de las cartas de su alrededor, luego se voltea mientras pasa a los descartes
    carta!.levantada = true
    carta?.turnFaceUp()
    this.descartes.append(carta!)
    await core.pauseFor(300, "msec")
    carta!.levantada = false
  }

  @drawn draw() {
    // Su barra, luego sus pilas, siete por línea, la tercera celda vacía;  un clic derecho en la mesa muestra sus jugadas
    return (
      <>
        <es-segmento invertido={true} unir="arriba">
          <es-barra-herramientas class="GameBar" aria-label="Juego" apariencia="secundario" invertido={true} tamano="pequeño" encogible={true}>
            <es-texto slot="titulo" tamano="grande" extranegrita={true}>Solitario Encanto</es-texto>
            {core.drawAction(this, "jugarSolo", { "in-menu": true })}
            {core.drawAction(this, "hacerTrampa", { "in-menu": true })}
            {core.drawAction(this, "reiniciarElJuego", { "in-menu": true })}
            <ui-action kind="divider" />
            {core.drawAction(this, "undo", { "in-menu": true })}
            {core.drawAction(this, "redo", { "in-menu": true })}
            <es-texto slot="derecha">
              {"Movimientos: "}
              {this.movimientos}
              {"  ·  Puntos: "}
              {this.puntuación}
              {this.pista}
            </es-texto>
          </es-barra-herramientas>
        </es-segmento>
        <es-contenedor relleno="pequeño" columnas="7" separacion="xs">
          {core.drawContextMenu(this, ["jugarSolo", "hacerTrampa", "reiniciarElJuego", "-", "undo", "redo"])}
          <test-project-pila-de-reserva id="reserva" />
          <test-project-pila-de-descartes id="descartes" />
          <es-columna />
          <test-project-fundacion id="tréboles" />
          <test-project-fundacion id="diamantes" />
          <test-project-fundacion id="corazones" />
          <test-project-fundacion id="espadas" />
          <test-project-columna id="C1" />
          <test-project-columna id="C2" />
          <test-project-columna id="C3" />
          <test-project-columna id="C4" />
          <test-project-columna id="C5" />
          <test-project-columna id="C6" />
          <test-project-columna id="C7" />
        </es-contenedor>
      </>
    )
  }
  // <número "movimientos"/>
  @prop({ type: "number" })
  accessor movimientos!: number
  // <número "puntuación"/>
  @prop({ type: "number" })
  accessor puntuación!: number
  // <texto "pista"/>
  @prop({ type: "text" })
  accessor pista!: string
  // <pila-de-reserva "reserva"/>
  @prop({ init: () => new PilaDeReserva({ id: "reserva" }), early: true })
  accessor reserva!: PilaDeReserva
  // <pila-de-descartes "descartes"/>
  @prop({ init: () => new PilaDeDescartes({ id: "descartes" }), early: true })
  accessor descartes!: PilaDeDescartes
  // <fundación "tréboles" palo=tréboles/>
  @prop({ init: () => new Fundación({ id: "tréboles", palo: "tréboles" }), early: true })
  accessor tréboles!: Fundación
  // <fundación "diamantes" palo=diamantes/>
  @prop({ init: () => new Fundación({ id: "diamantes", palo: "diamantes" }), early: true })
  accessor diamantes!: Fundación
  // <fundación "corazones" palo=corazones/>
  @prop({ init: () => new Fundación({ id: "corazones", palo: "corazones" }), early: true })
  accessor corazones!: Fundación
  // <fundación "espadas" palo=espadas/>
  @prop({ init: () => new Fundación({ id: "espadas", palo: "espadas" }), early: true })
  accessor espadas!: Fundación
  // <columna "C1"/>
  @prop({ init: () => new Columna({ id: "C1" }), early: true })
  accessor C1!: Columna
  // <columna "C2"/>
  @prop({ init: () => new Columna({ id: "C2" }), early: true })
  accessor C2!: Columna
  // <columna "C3"/>
  @prop({ init: () => new Columna({ id: "C3" }), early: true })
  accessor C3!: Columna
  // <columna "C4"/>
  @prop({ init: () => new Columna({ id: "C4" }), early: true })
  accessor C4!: Columna
  // <columna "C5"/>
  @prop({ init: () => new Columna({ id: "C5" }), early: true })
  accessor C5!: Columna
  // <columna "C6"/>
  @prop({ init: () => new Columna({ id: "C6" }), early: true })
  accessor C6!: Columna
  // <columna "C7"/>
  @prop({ init: () => new Columna({ id: "C7" }), early: true })
  accessor C7!: Columna
}

/**
 * `<test-project-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its solitario's properties;  its methods call its solitario's.
 * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.
 */
export class SolitarioElement extends SpellElement<Solitario> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "solitario", [
    { name: "mazo", kind: "json", description: "Its mazo." },
    { name: "movimientos", kind: "number", description: "Its movimientos." },
    { name: "puntuación", kind: "number", description: "Its puntuación." },
    { name: "pista", kind: "string", description: "Its pista." },
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

  reiniciarElJuego() {
    return this.currentThing?.reiniciarElJuego()
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
core.describeAction(Solitario, "rehacerLaReserva", { title: "Rehacer La Reserva", undoneAs: "Rehacer La Reserva" })
core.describeAction(Solitario, "robarDeLaReserva", { title: "Robar De La Reserva", undoneAs: "Voltear carta" })
core.describeAction(Solitario, "repartirLasCartas", { title: "Repartir Las Cartas", undoneAs: "Repartir Las Cartas" })
core.describeAction(Solitario, "reiniciarElJuego", { title: "Reiniciar", shortcuts: ["N"], icon: "sync alternate", undoneAs: "Reiniciar" })
core.describeAction(Solitario, "jugarSolo", { title: "Jugar solo", shortcuts: ["A"], icon: "play", undoneAs: "Jugar solo" })
core.describeAction(Solitario, "hacerTrampa", { title: "Trampa", shortcuts: ["C"], icon: "eye", undoneAs: "Trampa" })

// Cada uno se detiene un momento, así el reparto se anima

// Sus movimientos:  los botones de la barra, sus teclas, y el clic derecho en la mesa;  cada uno dice su título una vez, para los tres

core.heading("Jugar una carta")
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
    core.echoTestAction(`poner la columna a una nueva columna con id "C1"`)
    let columna = new Columna({ id: "C1" })
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
    core.expect(columna.nombreCorto, `el nombre corto de la columna`, "C1: R♠↑ D♥↑", `"C1: R♠↑ D♥↑"`)
    core.expect(core.canGiveUp(columna, dama), `la columna puede soltar la dama`, true, `sí`)
    core.echoTestAction(`voltear la dama boca abajo`)
    dama.turnFaceDown()
    core.expect(core.canGiveUp(columna, dama), `la columna puede soltar la dama`, false, `no`)

    /** una fundación toma su palo, el as primero, luego uno más alto:  cada una la última carta de su pila */
    const fundación = new Fundación({ palo: "corazones" })
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
    core.echoTestAction(`poner la columna a una nueva columna con id "C2"`)
    columna = new Columna({ id: "C2" })
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
core.installStyles(undefined, `/* File styles.css:  what no attribute draws -- the felt, the toolbar's middle, and the cards and piles.¬   - The toolbar's bar, the board's grid and its spacing are their components' attributes (Solitario.es.spell).¬   - A card is one letter of unicode's Playing Cards, as wide as its pile:  no <ui-*> tag draws one.¬   - A pile is styled by its disposición, its layout (<solitario-columna disposición="vertical">),¬     each card in it by its place:  --index from 0, of --count;¬     an empty pile's placeholder, its marcador, by its part:  ::part(placeholder). */¬¬/* A card's letter, in ems (measured in Chrome on a Mac):  0.604em wide, 0.805em tall, its left edge 0.049em in,¬   with 0.008em to spare above and below */¬:root,¬:host {¬  --card-width: 0.604;¬  /* its height, in widths:  (0.805 + 2 x 0.008) / 0.604 */¬  --card-height: 1.359;¬  /* down a column, how much of each card shows under the next:  its rank and suit */¬  --card-step-down: 0.2;¬}¬¬/* The table:  green felt, as on a casino's card table */¬solitario-app {¬  display: block;¬  min-height: 100%;¬  border-radius: 12px;¬  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"), #12683f;¬}¬¬/* The toolbar:  its actions in the true middle, the title and the score taking equal room on either side,¬   never squeezed:  as the bar narrows, the actions give way (\`shrinkable\`), down to one \`…\` button */¬.GameBar {¬  --ui-toolbar-gap: 1em;¬}¬.GameBar::part(title),¬.GameBar::part(right) {¬  flex: 1 0 0;¬  min-width: max-content;¬}¬.GameBar::part(right) {¬  justify-content: flex-end;¬}¬.GameBar::part(menu) {¬  flex: 0 1 auto;¬}¬¬/* A pile:  as wide as its cell of the board, as tall as its cards */¬[disposición] {¬  display: flow-root;¬  position: relative;¬  container-type: inline-size;¬  /* its top card glows when a dragged card would land on it (below), not the whole pile */¬  --spell-drop-glow: none;¬}¬/* its height, a floated sizer:  a padding's percentage is one of its width */¬[disposición]::before {¬  content: "";¬  float: left;¬  width: 100%;¬  padding-top: calc(100% * var(--card-height));¬}¬¬/* Each card in a pile, and its placeholder:  a letter as wide as the pile, cut to the card it draws */¬[disposición] > *,¬[disposición]::part(placeholder) {¬  position: absolute;¬  display: block;¬  font-size: calc(100cqi / var(--card-width));¬}¬/* a card in no pile (one added to the table in the editor):  a column's usual width */¬solitario-carta:not([disposición] > *) {¬  position: relative;¬  display: inline-block;¬  font-size: calc(6rem / var(--card-width));¬}¬[disposición] > *,¬solitario-carta,¬[disposición]::part(placeholder) {¬  width: calc(var(--card-width) * 1em);¬  height: calc(var(--card-width) * var(--card-height) * 1em);¬  overflow: hidden;¬  /* the font that draws the cards, so a theme's font never moves them */¬  font-family: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif;¬  /* the face hugs the ink:  Apple Symbols' ink starts 0.917em down a line */¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  line-height: 0.917;¬  --ui-text-line-height: 0.917;¬  text-indent: -0.049em;¬  user-select: none;¬}¬¬/* A card:  a two sided view (Carta.es.spell), its sides turning in 3D, so it cuts nothing itself;¬   a real deck's inks in every theme and scheme */¬[disposición] > *,¬solitario-carta {¬  overflow: visible;¬  --spell-turn-perspective: 3em;¬  color-scheme: light;¬  --ui-red-text: #c8102e;¬  --ui-black-text: #1a1a1a;¬  --ui-blue-text: #2f6fd6;¬}¬/* each side:  its letter cut to the card, on a white face with the letter's rounded corners */¬[disposición] > *::part(front),¬[disposición] > *::part(back),¬solitario-carta::part(front),¬solitario-carta::part(back) {¬  display: block;¬  position: absolute;¬  inset: 0;¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  overflow: hidden;¬  background: #fff;¬  background-clip: content-box;¬  border-radius: 0.035em;¬}¬¬/* Moving:  the cheat's card is "levantada" over every card around it, and turns face up as it goes to the discards¬   (the game pauses 0.3s for it:  Solitario.es.spell) */¬[disposición] > * {¬  transition:¬    transform 0.3s ease-in-out,¬    translate 0.3s ease-out;¬}¬[disposición] > [levantada] {¬  z-index: 5;¬}¬[disposición] > [levantada][direction="up"] {¬  @starting-style {¬    transform: perspective(var(--spell-turn-perspective, 100em)) rotateY(180deg);¬  }¬}¬@media (prefers-reduced-motion: reduce) {¬  [disposición] > * {¬    transition: none;¬  }¬}¬¬/* An empty pile's placeholder:  a faint pale card on the felt */¬[disposición]::part(placeholder) {¬  color: #d8f0e0;¬  opacity: 0.4;¬}¬[disposición]::part(placeholder):hover {¬  opacity: 0.5;¬}¬¬/* Dropping:  where a dragged card would land glows -- the pile's top card, or its placeholder¬   (:state(accepting-drop), set by the pile's rules) */¬[disposición]:state(accepting-drop) > :last-child,¬[disposición]:state(accepting-drop)::part(placeholder) {¬  opacity: 1;¬  border-radius: 0.035em;¬  box-shadow:¬    0 0 0 0.012em rgb(150 80 255 / 0.85),¬    0 0 0.06em 0.025em rgb(150 80 255 / 0.55);¬}¬¬/* The disposiciones:  apilada puts every card on top of the one before;  vertical, each a step below it */¬[disposición="vertical"]::before {¬  padding-top: calc(100% * var(--card-height) * (1 + (max(var(--count, 1), 1) - 1) * var(--card-step-down)));¬}¬[disposición="vertical"] > * {¬  margin-top: calc(var(--index) * var(--card-width) * var(--card-height) * 1em * var(--card-step-down));¬}¬`)
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
