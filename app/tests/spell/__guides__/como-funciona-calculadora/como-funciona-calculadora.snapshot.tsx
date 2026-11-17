import { core, App, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Cómo funciona Calculadora")
///////////////////////////////
// ## Cómo funciona Calculadora
///////////////////////////////
// El ejemplo Calculadora es una calculadora de bolsillo:  pulsa 7, +, 5, y muestra 12.
// Está escrito en español:  cada línea de código también.
// Cada tecla hace las mismas dos cosas:
// - ejecuta una ACCIÓN, unas pocas líneas que cambian lo que guarda la calculadora
// - y la pantalla, dibujada a partir de lo que guarda, cambia con ella

// Esta guía hace una más pequeña, una sumadora, a la derecha:  tres teclas de números, una tecla + y una tecla C.
// Abre Calculadora, en los Ejemplos, para verla entera con todas sus teclas.  Calculator es la misma, en inglés.

core.heading("Lo que guarda")
///////////////////
// ## Lo que guarda
///////////////////
// Cada línea `su "..." es` es una cosa que guarda toda sumadora.
// - `es un número` hace del total un número, que empieza en 0.
// - El número que se escribe es texto, para que cada tecla pueda añadir un dígito al final.

core.heading("Lo que hacen sus teclas")
/////////////////////////////
// ## Lo que hacen sus teclas
/////////////////////////////
// Cada `para ...` es una acción:  lo que hace una tecla.
// - La acción de una tecla de dígito recibe el dígito:  `pulsar (dígito como texto)`, así que `pulsar "5"` pone un 5 al final.
// - Un "+" entre dos textos los une:  "1" + "2" es "12".
// - `como un número` convierte el texto "12" en el número 12, para poder sumarlo.
// - `limpiar` vacía lo que nombra:  un número vuelve a 0, un texto a "".

core.heading("Cómo se dibuja")
////////////////////
// ## Cómo se dibuja
////////////////////
// La pantalla, luego las teclas, en una tarjeta:  las etiquetas de Spell UI, por sus nombres cortos en español.
// - `<botón>` es el botón de Spell UI, `<cuadricula columnas="5">` pone las teclas de cinco en cinco.
// - `onClick` dice qué hace una tecla cuando se hace clic en ella:  una de las acciones de arriba.
// - La pantalla muestra el número que se escribe, o el total cuando no hay ninguno.

export class Sumadora extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "total" es un número
  @prop({ type: "number" })
  accessor total!: number

  /** El número que se escribe */
  // su "entrada" es texto
  @prop({ type: "text" })
  accessor entrada!: string

  /** Una tecla de dígito:  ese dígito, al final del número que se escribe */
  pulsarDígito(dígito: string) {
    this.entrada = this.entrada + dígito
  }

  /** La tecla +:  el número escrito, sumado al total, y luego otra vez de cero para el siguiente */
  sumar() {
    if (!this.entrada) return
    const escrito = parseFloat(this.entrada)
    this.total = this.total + escrito
    this.entrada = ""
  }

  /** La tecla C:  vuelta a nada */
  borrar() {
    this.total = 0
    this.entrada = ""
  }

  @drawn draw() {
    return (
      <es-pila alinear="centro">
        <es-tarjeta>
          <es-segmento apariencia="secundario" alinear="derecha">
            <es-texto tamano="enorme">{!this.entrada ? this.total : this.entrada}</es-texto>
          </es-segmento>
          <es-contenido>
            <es-cuadricula columnas="5" separacion="compact">
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
                <es-boton fluido={true} onClick={core.pressed(this, () => this.pulsarDígito("5"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  5
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} color="primario" onClick={core.pressed(this, () => this.sumar())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  +
                </es-boton>
              </es-columna>
              <es-columna>
                <es-boton fluido={true} color="negativo" onClick={core.pressed(this, () => this.borrar())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  C
                </es-boton>
              </es-columna>
            </es-cuadricula>
          </es-contenido>
        </es-tarjeta>
      </es-pila>
    )
  }
}

/**
 * `<test-project-app>`:  a sumadora, drawn in its own element, e.g. by `draw the sumadora`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its sumadora's properties;  its methods call its sumadora's.
 * - What every view's element does, e.g. drawing its sumadora, is `SpellElement`'s.
 */
export class SumadoraElement extends SpellElement<Sumadora> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "sumadora", [
    { name: "total", kind: "number", description: "Its total." },
    { name: "entrada", kind: "string", description: "Its entrada." }
  ])

  pulsarDígito(dígito: string) {
    return this.currentThing?.pulsarDígito(dígito)
  }

  sumar() {
    return this.currentThing?.sumar()
  }

  borrar() {
    return this.currentThing?.borrar()
  }
}
core.useElement(Sumadora, SumadoraElement)
export const sumadora = new Sumadora()
core.describeAction(Sumadora, "pulsarDígito", { title: "Pulsar Dígito", undoneAs: "Pulsar Dígito" })
core.describeAction(Sumadora, "sumar", { title: "Sumarlo", undoneAs: "Sumarlo" })
core.describeAction(Sumadora, "borrar", { title: "Borrarla", undoneAs: "Borrarla" })

/** 12 y 5 son 17 */
export function testSumar() {
  return core.test("test sumar", function testSumar() {
    const it = new Sumadora()
    core.echoTestAction(`pulsar "1"`)
    it.pulsarDígito("1")
    core.echoTestAction(`pulsar "2"`)
    it.pulsarDígito("2")
    core.echoTestAction(`sumar eso`)
    it.sumar()
    core.echoTestAction(`pulsar "5"`)
    it.pulsarDígito("5")
    core.echoTestAction(`sumar eso`)
    it.sumar()
    core.expect(it.total, `el total`, 17, `17`)
  })
}

core.heading("Pruébalo")
//////////////
// ## Pruébalo
//////////////
// - Haz clic en 1, 2, +, 5, + a la derecha:  la pantalla muestra 12, luego 17.
// - Agrega una tecla 9:  copia la línea que tiene el "5", y cambia los dos 5 por 9.
//   Luego dale seis columnas a la cuadrícula:  `columnas="6"`.
// - Haz que + reste:  en "sumarlo", cambia el + de "el total + escrito" por un -,
//   y luego la etiqueta de la tecla.  La prueba de arriba se pondrá roja, porque 12 menos 5 no es 17.

// Y después:  el ejemplo Calculadora, que guarda un número izquierdo, un operador y un número derecho,
// así que puede hacer las cuatro cuentas.
// -----------
if (!core.isCarryingOver) sumadora.start()
// -----------
if (!core.isCarryingOver) testSumar()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `SumadoraElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
