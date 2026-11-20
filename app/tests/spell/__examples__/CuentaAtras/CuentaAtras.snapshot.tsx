import { core, App, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Cuenta atrás para el fin de semana")
////////////////////////////////////////
// ## Cuenta atrás para el fin de semana
////////////////////////////////////////
// Cuánto falta para el fin de semana:  días, horas, minutos y segundos, que bajan cada segundo.

export class CuentaAtrás extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** Este momento:  se vuelve a poner cada segundo, para que la cuenta se redibuje */
  // su "hora" es una fecha
  @prop({ type: "date" })
  accessor hora!: Date

  everySecond() {
    this.hora = core.now()
  }

  /** Sábado y domingo en casi todas partes:  lo dice la región de cada persona */
  get esFinDeSemana() {
    return core.isWeekendDay(this.hora)
  }

  /** Una duración:  2 días, 3 horas, 4 minutos y 5 segundos */
  get tiempoRestante() {
    return core.secondsBetween(core.nextWeekend(), this.hora)
  }

  @drawn draw() {
    // Los días, horas, minutos y segundos que faltan, uno al lado del otro;  en fin de semana, una celebración
    return (
      <es-contenedor ancho="32em">
        <es-segmento relleno="lg">
          <es-encabezado hidden={this.esFinDeSemana ? undefined : true}>¡Es fin de semana!</es-encabezado>
          <es-texto color="gris" hidden={!this.esFinDeSemana ? undefined : true}>El fin de semana empieza en</es-texto>
          <es-estadisticas igual={true} tamano="pequeño" hidden={!this.esFinDeSemana ? undefined : true}>
            <es-estadistica value={core.durationPartOf(this.tiempoRestante, "days")} etiqueta="Días" />
            <es-estadistica value={core.twoDigits(core.durationPartOf(this.tiempoRestante, "hours"))} etiqueta="Hr" />
            <es-estadistica value={core.twoDigits(core.durationPartOf(this.tiempoRestante, "minutes"))} etiqueta="Min" />
            <es-estadistica value={core.twoDigits(core.durationPartOf(this.tiempoRestante, "seconds"))} etiqueta="Seg" />
          </es-estadisticas>
        </es-segmento>
      </es-contenedor>
    )
  }
}

/**
 * `<test-project-app>`:  a cuenta atrás, drawn in its own element, e.g. by `draw the cuenta atrás`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its cuenta atrás's properties;  its methods call its cuenta atrás's.
 * - What every view's element does, e.g. drawing its cuenta atrás, is `SpellElement`'s.
 */
export class CuentaAtrásElement extends SpellElement<CuentaAtrás> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "cuenta atrás", [
    { name: "hora", kind: "string", description: "Its hora." }
  ])

  everySecond() {
    return this.currentThing?.everySecond()
  }
}
core.useElement(CuentaAtrás, CuentaAtrásElement)
export const cuentaAtrás = new CuentaAtrás()
core.addTimer(CuentaAtrás, "everySecond", { seconds: 1 })
// -----------
if (!core.isCarryingOver) cuentaAtrás.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CuentaAtrásElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
