import { core, Thing, List, App, Drawable, DrawableList, h, positionOf, spellPosition, trigger } from "@spell/core"

core.heading("definición de una Carta con alias en español para trabajar con ella")
/** definición de una Carta con alias en español para trabajar con ella */
export class Carta extends Thing {
  ///////////////////////////////
  // ## propiedades de las cartas
  ///////////////////////////////
  /** rangos de cartas */
  // las cartas tienen un rango como uno de as, 2, 3, 4, 5, 6, 7, 8, 9, 10, jota, reina o rey
  static Rangos = ["as", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jota", "reina", "rey"]
  static { this.declareProp("rango", { oneOf: Carta.Rangos }) }
  get rango() { return this.getProp("rango") }
  set rango(value) { this.setProp("rango", value) }

  /** palos de cartas */
  // las cartas tienen un palo como uno de tréboles, diamantes, corazones o espadas
  static Palos = ["tréboles", "diamantes", "corazones", "espadas"]
  static { this.declareProp("palo", { oneOf: Carta.Palos }) }
  get palo() { return this.getProp("palo") }
  set palo(value) { this.setProp("palo", value) }

  /** color como derivación del palo */
  get color() {
    if (core.includes(["diamantes", "corazones"], this.palo)) return "rojo"
    return "negro"
  }

  /** valor como derivación del rango */
  get valor() {
    return spellPosition(positionOf(Carta.Rangos, this.rango))
  }

  /** dirección de la carta:  arriba o abajo */
  // una carta tiene una dirección como o bien arriba o abajo
  static Direcciones = ["arriba", "abajo"]
  static { this.declareProp("dirección", { oneOf: Carta.Direcciones }) }
  get dirección() { return this.getProp("dirección") }
  set dirección(value) { this.setProp("dirección", value) }

  ///////////
  // ## alias
  ///////////
  /** "la carta está boca arriba / abajo" */
  get estáBocaArriba() {
    return this.dirección == "arriba"
  }

  get estáBocaAbajo() {
    return this.dirección == "abajo"
  }

  /** "la carta es una figura" */
  get esUnaFigura() {
    return core.includes(["jota", "reina", "rey"], this.rango)
  }

  /** "la carta es una espada", "... es un trébol" ... */
  esUnPalo(palo) {
    return this.palo === palo
  }

  /** "la carta es una reina", "... es un as" ... */
  esUnRango(rango) {
    return this.rango === rango
  }

  /** "la carta es la reina de espadas" ... */
  esElRangoDePalos(rango, palo) {
    return this.rango === rango && this.palo === palo
  }

  /** nombre como derivación de rango y palo */
  get nombre() {
    return `${this.rango}-de-${this.palo}`
  }

  get paloCorto() {
    if (this.esUnPalo("tréboles")) return "♣️"
    if (this.esUnPalo("diamantes")) return "♦️"
    if (this.esUnPalo("corazones")) return "♥️"
    if (this.esUnPalo("espadas")) return "♠️"
    return "?"
  }

  get rangoCorto() {
    if (this.rango === undefined) return "?"
    if (typeof this.rango === "number") return `${this.rango}`
    return `${core.getItemAt(this.rango, 0) ?? ""}`.toLocaleUpperCase()
  }

  get direcciónCorta() {
    if (this.dirección == "arriba") return "+"
    return "—"
  }

  get nombreCorto() {
    return this.rangoCorto + this.paloCorto
  }

  get estado() {
    return this.rangoCorto + this.paloCorto + this.direcciónCorta
  }

  //## acciones

  /**
   * Voltear la carta boca arriba o boca abajo
   * Se anima si haces `esperar a voltear la carta boca arriba`
   */
  async voltearBocaArriba() {
    this.dirección = "arriba"
    await core.pauseFor(50, "msec")
  }

  async voltearBocaAbajo() {
    this.dirección = "abajo"
    await core.pauseFor(50, "msec")
  }

  /** Darle la vuelta a la carta */
  async darVuelta() {
    if (this.dirección == "arriba") this.voltearBocaAbajo()
    else this.voltearBocaArriba()
    await core.pauseFor(50, "msec")
  }

  dibujar() {
    const className = `Card face-${this.dirección} ${this.rango} ${this.palo} ui button compact fluid `
    if (this.estáBocaAbajo) {
      return h("div", { class: () => className, onClick: () => trigger("card-click", { card: this }) },
        h("i", { class: "fitted bicycle icon" })
      )
    }
    return h("div", { class: () => className + this.color, onClick: () => trigger("card-click", { card: this }) },
      () => `${this.rangoCorto} `,
      h("span", { class: "suit" }, () => this.paloCorto)
    )
  }
}

core.heading("una carta con sus propiedades")
/** una carta con sus propiedades */
export function testLaCarta() {
  return core.test("test la carta", function testLaCarta() {
    core.echoTestAction(`la carta es una nueva carta cuyo rango es reina, palo es espadas y dirección es arriba`)
    const carta = new Carta({
      rango: "reina",
      palo: "espadas",
      dirección: "arriba"
    })
    core.echo(carta)
    core.expect(carta.rango, `el rango de la carta`, "reina", `reina`)
    core.expect(carta.palo, `el palo de la carta`, "espadas", `espadas`)
    core.expect(carta.nombre, `el nombre de la carta`, "reina-de-espadas", `"reina-de-espadas"`)
    core.expect(carta.color, `el color de la carta`, "negro", `negro`)
    core.expect(carta.valor, `el valor de la carta`, 12, `12`)
    core.expect(carta.paloCorto, `el palo corto de la carta`, "♠️", `"♠️"`)
    core.expect(carta.rangoCorto, `el rango corto de la carta`, "R", `"R"`)
    core.expect(carta.nombreCorto, `el nombre corto de la carta`, "R♠️", `"R♠️"`)

    core.expect(carta.estáBocaArriba, `la carta está boca arriba`, true, `sí`)
    core.expect(carta.estáBocaAbajo, `la carta está boca abajo`, false, `no`)

    core.expect(carta.esUnaFigura, `la carta es una figura`, true, `sí`)
    core.expect(!carta.esUnaFigura, `la carta no es una figura`, false, `falso`)

    core.expect(carta.esUnPalo("espadas"), `la carta es una espada`, true, `verdadero`)
    core.expect(carta.esUnPalo("tréboles"), `la carta es un trébol`, false, `falso`)

    core.expect(carta.esUnRango("reina"), `la carta es una reina`, true, `verdadero`)
    core.expect(carta.esUnRango("as"), `la carta es un as`, false, `falso`)
    core.expect(carta.esUnRango(2), `la carta es un 2`, false, `falso`)

    core.expect(carta.esElRangoDePalos("reina", "espadas"), `la carta es la reina de espadas`, true, `verdadero`)
    core.expect(carta.esElRangoDePalos("reina", "tréboles"), `la carta es la reina de tréboles`, false, `falso`)
    core.expect(!carta.esElRangoDePalos(2, "diamantes"), `la carta no es el 2 de diamantes`, true, `verdadero`)

    core.echoTestAction(`voltear la carta boca abajo`)
    carta.voltearBocaAbajo()
    core.expect(carta.dirección, `la dirección de la carta`, "abajo", `abajo`)

    core.echoTestAction(`dar vuelta la carta`)
    carta.darVuelta()
    core.expect(carta.estáBocaArriba, `la carta está boca arriba`, true, `verdadero`)
  })
}
if (!core.isCarryingOver) testLaCarta()
