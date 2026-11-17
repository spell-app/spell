import { core, App, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Calculadora")
/////////////////
// ## Calculadora
/////////////////
// Una calculadora de bolsillo:  un número, un operador, otro número, y el total mientras escribes.
// Sus teclas son botones de Spell UI, cuatro por fila, y cada una ejecuta una de las acciones de la calculadora.

export class Calculadora extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** El número que se escribe, como texto, para que cada tecla pueda añadir un dígito al final */
  // su "entrada" es texto
  @prop({ type: "text" })
  accessor entrada!: string

  // su "izquierdo" es texto
  @prop({ type: "text" })
  accessor izquierdo!: string

  // su "operador" es texto
  @prop({ type: "text" })
  accessor operador!: string

  // su "derecho" es texto
  @prop({ type: "text" })
  accessor derecho!: string

  /** La cuenta hasta ahora, calculada cada vez que se lee */
  get total() {
    const númeroIzquierdo = parseFloat(this.izquierdo)
    const númeroDerecho = parseFloat(this.derecho)
    if (this.operador === "+") return númeroIzquierdo + númeroDerecho
    if (this.operador === "–") return númeroIzquierdo - númeroDerecho
    if (this.operador === "×") return númeroIzquierdo * númeroDerecho
    return númeroIzquierdo / númeroDerecho
  }

  /** Lo que muestra la línea de arriba de la pantalla:  0 hasta que se pulsa una tecla */
  get cuenta() {
    const mostrado = !this.izquierdo ? "0" : this.izquierdo
    return `${mostrado} ${this.operador} ${this.derecho}`
  }

  /** La segunda línea de la pantalla:  el total, una vez que hay un número derecho */
  get resultado() {
    if (!this.derecho) return ""
    return `= ${this.total}`
  }

  borrar() {
    this.entrada = ""
    this.izquierdo = ""
    this.operador = ""
    this.derecho = ""
  }

  /** Igual:  el total pasa a ser el número izquierdo, listo para el siguiente operador */
  terminar() {
    if (!this.derecho) return
    this.izquierdo = `${this.total}`
    this.operador = ""
    this.derecho = ""
    this.entrada = ""
  }

  /** Un dígito, o el punto decimal:  al final del número que se escribe, el izquierdo hasta que haya un operador */
  pulsarDígito(dígito: string) {
    if (dígito === ".") {
      if (!this.entrada) this.entrada = "0."
      else if (!this.entrada.includes(".")) this.entrada = `${this.entrada}.`
    } else this.entrada = this.entrada + dígito
    if (!this.operador) this.izquierdo = this.entrada
    else this.derecho = this.entrada
  }

  /** Un operador:  tras una cuenta completa, el total pasa a ser el número izquierdo de la siguiente cuenta */
  aplicarTecla(tecla: string) {
    if (this.derecho) this.terminar()
    this.operador = tecla
    this.entrada = ""
  }

  @drawn draw() {
    // La pantalla, luego el teclado, cuatro teclas por fila:  C y 0 ocupan dos teclas de ancho
    return (
      <es-contenedor ancho="20em">
        <es-tarjeta fluido={true}>
          <es-segmento apariencia="secundario" alinear="derecha">
            <es-texto tamano="enorme">{this.cuenta}</es-texto>
            <es-espacio />
            <es-texto tamano="grande" color="gris">{this.resultado}</es-texto>
          </es-segmento>
          <es-contenido>
            <es-cuadricula columnas="4" separacion="compact">
              <es-columna ancho="8">
                <es-boton fluido={true} color="negativo" onClick={core.pressed(this, () => this.borrar())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  C
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} color="secundario" onClick={core.pressed(this, () => this.terminar())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  =
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} color="primario" onClick={core.pressed(this, () => this.aplicarTecla("÷"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  ÷
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("7"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  7
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("8"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  8
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("9"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  9
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} color="primario" onClick={core.pressed(this, () => this.aplicarTecla("×"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  ×
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("4"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  4
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("5"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  5
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("6"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  6
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} color="primario" onClick={core.pressed(this, () => this.aplicarTecla("–"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  –
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("1"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  1
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("2"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  2
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("3"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  3
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} color="primario" onClick={core.pressed(this, () => this.aplicarTecla("+"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  +
                </es-boton>
              </es-columna>
              <es-columna ancho="8">
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("0"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  0
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("."))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  .
                </es-boton>
              </es-columna>
            </es-cuadricula>
          </es-contenido>
        </es-tarjeta>
      </es-contenedor>
    )
  }
}

/**
 * `<test-project-app>`:  a calculadora, drawn in its own element, e.g. by `draw the calculadora`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its calculadora's properties;  its methods call its calculadora's.
 * - What every view's element does, e.g. drawing its calculadora, is `SpellElement`'s.
 */
export class CalculadoraElement extends SpellElement<Calculadora> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "calculadora", [
    { name: "entrada", kind: "string", description: "Its entrada." },
    { name: "izquierdo", kind: "string", description: "Its izquierdo." },
    { name: "operador", kind: "string", description: "Its operador." },
    { name: "derecho", kind: "string", description: "Its derecho." }
  ])

  borrar() {
    return this.currentThing?.borrar()
  }

  terminar() {
    return this.currentThing?.terminar()
  }

  pulsarDígito(dígito: string) {
    return this.currentThing?.pulsarDígito(dígito)
  }

  aplicarTecla(tecla: string) {
    return this.currentThing?.aplicarTecla(tecla)
  }
}
core.useElement(Calculadora, CalculadoraElement)
export const calculadora = new Calculadora()
core.describeAction(Calculadora, "borrar", { title: "Borrarla", undoneAs: "Borrarla" })
core.describeAction(Calculadora, "terminar", { title: "Terminarla", undoneAs: "Terminarla" })
core.describeAction(Calculadora, "pulsarDígito", { title: "Pulsar Dígito", undoneAs: "Pulsar Dígito" })
core.describeAction(Calculadora, "aplicarTecla", { title: "Aplicar Tecla", undoneAs: "Aplicar Tecla" })
// La cuenta que se escribe:  su número izquierdo, su operador y su número derecho

/** 12 + 5, luego por 2:  el total pasa a ser el número izquierdo de la siguiente cuenta */
export function testDosCuentasSeguidas() {
  return core.test("test dos cuentas seguidas", function testDosCuentasSeguidas() {
    const it = new Calculadora()
    core.echoTestAction(`pulsar "1"`)
    it.pulsarDígito("1")
    core.echoTestAction(`pulsar "2"`)
    it.pulsarDígito("2")
    core.echoTestAction(`aplicar "+"`)
    it.aplicarTecla("+")
    core.echoTestAction(`pulsar "5"`)
    it.pulsarDígito("5")
    core.expect(it.resultado, `el resultado`, "= 17", `"= 17"`)
    core.echoTestAction(`aplicar "×"`)
    it.aplicarTecla("×")
    core.echoTestAction(`pulsar "2"`)
    it.pulsarDígito("2")
    core.expect(it.resultado, `el resultado`, "= 34", `"= 34"`)
    core.echoTestAction(`terminar eso`)
    it.terminar()
    core.expect(it.izquierdo, `el izquierdo`, "34", `"34"`)
    core.expect(it.resultado, `el resultado`, "", `""`)
  })
}
// -----------
if (!core.isCarryingOver) calculadora.start()
// -----------
if (!core.isCarryingOver) testDosCuentasSeguidas()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CalculadoraElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
