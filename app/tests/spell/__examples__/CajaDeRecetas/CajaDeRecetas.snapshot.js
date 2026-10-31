import { core, App, View, Place, h } from "@spell/core"

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  static { this.declareProp("título", { type: "text", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 314, end: 334 } }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  // sus "porciones" es un número
  static { this.declareProp("porciones", { type: "number", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 338, end: 366 } }) }
  get porciones() { return this.getProp("porciones") }
  set porciones(value) { this.setProp("porciones", value) }

  draw() {
    return h("ui-form", { class: "recipe", value: this },
      h("ui-input", { name: "título", "aria-label": "Receta" }),
      h("ui-text", { class: "servings" }, "para ", () => this.porciones),
      h("ui-button", {
        class: "remove",
        onClick: core.pressed(this, () => this.quitarEso()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Quitar")
    )
  }

  static savedIn = { place: "recetario_familiar", collection: "recetas" }

  quitarEso() {
    core.removeSaved(this)
  }
}

/**
 * Dónde se guardan las recetas:  en este navegador, sin ningún servidor.
 * Para guardarlas en otro lugar, cambia esta línea:  prueba "una sala en vivo en ...", "un servicio web en ...", "una hoja en ..."
 */
export class RecetarioFamiliar extends Place {}
export const recetarioFamiliar = core.place(new RecetarioFamiliar(), { name: "recetario_familiar", kind: "this device" })

core.describeAction(Receta, "quitarEso", { title: "quitar eso", undoneAs: "Quitar receta" })

export class CajaDeRecetas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "búsqueda" es texto
  static { this.declareProp("búsqueda", { type: "text" }) }
  get búsqueda() { return this.getProp("búsqueda") }
  set búsqueda(value) { this.setProp("búsqueda", value) }

  // su "borrador" es texto
  static { this.declareProp("borrador", { type: "text" }) }
  get borrador() { return this.getProp("borrador") }
  set borrador(value) { this.setProp("borrador", value) }

  static { this.declareProp("coincidencias", { declaredAt: { path: "/CajaDeRecetas.es.spell", start: 791, end: 885 }, readsFrom: ["recetario_familiar"] }) }
  get coincidencias() { return core.waitedValue(this, "coincidencias", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Receta, {}, "looks through"), (receta) => receta.título.includes(this.búsqueda)), (item) => item.título)
  }) }

  agregarElBorrador() {
    if (this.borrador === "") return
    core.saveThing(new Receta({ título: this.borrador, porciones: 2 }))
    this.borrador = ""
  }

  draw() {
    return [
      h("ui-form", { class: "box", value: this },
        h("ui-input", { class: "draft", name: "borrador", label: "Receta nueva", "aria-label": "Receta nueva" }),
        h("ui-button", {
          class: "add",
          disabled: () => this.borrador === "",
          onClick: core.pressed(this, () => this.agregarElBorrador()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Agregar"),
        h("ui-input", { class: "search", name: "búsqueda", label: "Buscar", "aria-label": "Buscar" })
      ),
      core.drawRead(() => this.coincidencias, (receta) => core.drawThing(receta), {
        waiting: () => h("ui-loader", { class: "waiting" }),
        none: () => h("ui-text", { class: "none" },
          () => this.búsqueda === "" ? "Todavía no hay recetas. Agrega la primera." : "Ninguna receta coincide con tu búsqueda."
        ),
        failed: () => h("ui-message", { class: "failed", color: "red" },
          "No se puede llegar al recetario.",
          h("ui-button", {
            class: "again",
            onClick: core.pressed(this, () => core.refreshSaved()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Reintentar")
        )
      })
    ]
  }
}
export const cajaDeRecetas = new CajaDeRecetas()

if (!core.isCarryingOver) cajaDeRecetas.start()
