import { core, App, View, Place, h, on } from "@spell/core"

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  static { this.declareProp("título", { type: "text", declaredAt: { path: "/SalaEnVivo.es.spell", start: 891, end: 911 } }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  onSomeoneElseChange(event) {
    cajaEnVivo.noticias = `Otra persona cambió ${this.título}`
  }

  draw() {
    return h("ui-form", { class: "recipe", value: this },
      h("ui-input", { name: "título", "aria-label": "Receta" })
    )
  }

  static savedIn = { place: "recetario_familiar", collection: "recetas" }
}

/** Una caja de recetas que comparten dos personas:  quién está, y qué cambió la otra (épica data P13) */
export class RecetarioFamiliar extends Place {}
export const recetarioFamiliar = core.place(new RecetarioFamiliar(), {
  name: "recetario_familiar",
  kind: "live room",
  at: "/api/rooms/recipes"
})

export class CajaEnVivo extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // sus "noticias" es texto
  static { this.declareProp("noticias", { type: "text" }) }
  get noticias() { return this.getProp("noticias") }
  set noticias(value) { this.setProp("noticias", value) }

  // sus "cambios" es un número
  static { this.declareProp("cambios", { type: "number" }) }
  get cambios() { return this.getProp("cambios") }
  set cambios(value) { this.setProp("cambios", value) }

  agregarUna() {
    core.saveThing(new Receta({ título: "Nueva" }))
  }

  draw() {
    return [
      h("ui-text", { class: "me" }, () => core.currentPerson().name),
      core.drawRead(() => core.peopleHere(), (persona) => h("ui-label", { class: "here" }, () => persona.nombre)),
      h("ui-text", { class: "news" }, () => this.noticias),
      h("ui-text", { class: "changes" }, () => this.cambios),
      h("ui-button", {
        class: "again",
        onClick: core.pressed(this, () => core.refreshSaved(Receta)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Revisar ahora"),
      h("ui-button", {
        class: "add",
        onClick: core.pressed(this, () => this.agregarUna()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Agregar una"),
      core.drawRead(async () => await core.savedThings(Receta), (receta) => core.drawThing(receta))
    ]
  }
}
export const cajaEnVivo = new CajaEnVivo()

on("a-receta-change", (event) => {
  const { receta } = event
  cajaEnVivo.cambios = cajaEnVivo.cambios + 1
})

if (!core.isCarryingOver) cajaEnVivo.start()
