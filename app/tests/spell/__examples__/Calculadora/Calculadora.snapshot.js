import { core, App, h } from "@spell/core"

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
  static { this.declareProp("entrada", { type: "text" }) }
  get entrada() { return this.getProp("entrada") }
  set entrada(value) { this.setProp("entrada", value) }

  // su "izquierdo" es texto
  static { this.declareProp("izquierdo", { type: "text" }) }
  get izquierdo() { return this.getProp("izquierdo") }
  set izquierdo(value) { this.setProp("izquierdo", value) }

  // su "operador" es texto
  static { this.declareProp("operador", { type: "text" }) }
  get operador() { return this.getProp("operador") }
  set operador(value) { this.setProp("operador", value) }

  // su "derecho" es texto
  static { this.declareProp("derecho", { type: "text" }) }
  get derecho() { return this.getProp("derecho") }
  set derecho(value) { this.setProp("derecho", value) }

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
    core.play("toque")
    this.entrada = ""
    this.izquierdo = ""
    this.operador = ""
    this.derecho = ""
  }

  /** Igual:  el total pasa a ser el número izquierdo, listo para el siguiente operador */
  terminar() {
    core.play("toque")
    if (!this.derecho) return
    this.izquierdo = `${this.total}`
    this.operador = ""
    this.derecho = ""
    this.entrada = ""
  }

  /** Un dígito, o el punto decimal:  al final del número que se escribe, el izquierdo hasta que haya un operador */
  pulsarDígito(dígito) {
    core.play("toque")
    if (dígito === ".") {
      if (!this.entrada) this.entrada = "0."
      else if (!this.entrada.includes(".")) this.entrada = `${this.entrada}.`
    } else this.entrada = this.entrada + dígito
    if (!this.operador) this.izquierdo = this.entrada
    else this.derecho = this.entrada
  }

  /** Un operador:  tras una cuenta completa, el total pasa a ser el número izquierdo de la siguiente cuenta */
  aplicarTecla(tecla) {
    core.play("toque")
    if (this.derecho) this.terminar()
    this.operador = tecla
    this.entrada = ""
  }

  draw() {
    // La pantalla, luego el teclado, cuatro teclas por fila:  C y 0 ocupan dos teclas de ancho
    return h("es-contenedor", { ancho: "20em" },
      h("es-tarjeta", { fluido: true },
        h("es-segmento", { apariencia: "secundario", alinear: "derecha" },
          h("es-texto", { tamano: "enorme" }, () => this.cuenta),
          h("es-espacio"),
          h("es-texto", { tamano: "grande", color: "gris" }, () => this.resultado)
        ),
        h("es-contenido",
          h("es-cuadricula", { columnas: "4", separacion: "compact" },
            h("es-columna", { ancho: "8" },
              h("es-boton", {
                fluido: true,
                color: "negativo",
                onClick: core.pressed(this, () => this.borrar()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "C")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                color: "secundario",
                onClick: core.pressed(this, () => this.terminar()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "=")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                color: "primario",
                onClick: core.pressed(this, () => this.aplicarTecla("÷")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "÷")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("7")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "7")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("8")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "8")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("9")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "9")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                color: "primario",
                onClick: core.pressed(this, () => this.aplicarTecla("×")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "×")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("4")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "4")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("5")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "5")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("6")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "6")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                color: "primario",
                onClick: core.pressed(this, () => this.aplicarTecla("–")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "–")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("1")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "1")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("2")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "2")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("3")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "3")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                color: "primario",
                onClick: core.pressed(this, () => this.aplicarTecla("+")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "+")
            ),
            h("es-columna", { ancho: "8" },
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito("0")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "0")
            ),
            h("es-columna",
              h("es-boton", {
                fluido: true,
                onClick: core.pressed(this, () => this.pulsarDígito(".")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, ".")
            )
          )
        )
      )
    )
  }
}
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
