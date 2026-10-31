import { core, App, View, Place, h } from "@spell/core"

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  static { this.declareProp("título", { type: "text" }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  // sus "porciones" es un número
  static { this.declareProp("porciones", { type: "number" }) }
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

/** La línea que cambia otro servidor:  tests/spell/recipeBox.test.ts solo cambia esta, para cada uno que prueba */
export class RecetarioFamiliar extends Place {}
export const recetarioFamiliar = core.place(new RecetarioFamiliar(), { name: "recetario_familiar", kind: "in memory" })

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
        h("ui-input", { class: "search", name: "búsqueda", "aria-label": "Búsqueda" }),
        h("ui-input", { class: "draft", name: "borrador", "aria-label": "Receta nueva" }),
        h("ui-button", {
          class: "add",
          onClick: core.pressed(this, () => this.agregarElBorrador()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Agregar")
      ),
      core.drawRead(() => this.coincidencias, (receta) => core.drawThing(receta), {
        waiting: () => h("ui-loader", { class: "waiting" }),
        none: () => h("ui-text", { class: "none" }, "Todavía no hay recetas."),
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
