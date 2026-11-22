import { core, App, h } from "@spell/core"

export class CuentaAtrás extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("hora", { type: "date" }) }
  get hora() { return this.getProp("hora") }
  set hora(value) { this.setProp("hora", value) }

  everySecond() {
    this.hora = core.now()
  }

  get esFinDeSemana() {
    return core.isWeekendDay(this.hora)
  }

  get tiempoRestante() {
    return core.secondsBetween(core.nextWeekend(), this.hora)
  }

  draw() {
    return h("es-contenedor", { ancho: "32em" },
      h("es-segmento", { relleno: "lg" },
        h("es-encabezado", { hidden: () => this.esFinDeSemana ? undefined : true }, "¡Es fin de semana!"),
        h("es-texto", { color: "gris", hidden: () => !this.esFinDeSemana ? undefined : true },
          "El fin de semana empieza en"
        ),
        h("es-estadisticas", { igual: true, tamano: "pequeño", hidden: () => !this.esFinDeSemana ? undefined : true },
          h("es-estadistica", { value: () => core.durationPartOf(this.tiempoRestante, "days"), etiqueta: "Días" }),
          h("es-estadistica", { value: () => core.twoDigits(core.durationPartOf(this.tiempoRestante, "hours")), etiqueta: "Hr" }),
          h("es-estadistica", { value: () => core.twoDigits(core.durationPartOf(this.tiempoRestante, "minutes")), etiqueta: "Min" }),
          h("es-estadistica", { value: () => core.twoDigits(core.durationPartOf(this.tiempoRestante, "seconds")), etiqueta: "Seg" })
        )
      )
    )
  }
}
export const cuentaAtrás = new CuentaAtrás()
core.addTimer(CuentaAtrás, "everySecond", { seconds: 1 })
// -----------
if (!core.isCarryingOver) cuentaAtrás.start()
