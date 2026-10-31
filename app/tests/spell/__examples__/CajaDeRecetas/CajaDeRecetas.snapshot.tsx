import { core, App, View, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  @prop({ type: "text" })
  accessor título!: string

  // sus "porciones" es un número
  @prop({ type: "number" })
  accessor porciones!: number

  @drawn draw() {
    return (
      <ui-form class="recipe" value={this}>
        <ui-input name="título" aria-label="Receta" />
        <ui-text class="servings">para {this.porciones}</ui-text>
        <ui-button class="remove" onClick={core.pressed(this, () => this.quitarEso())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Quitar
        </ui-button>
      </ui-form>
    )
  }

  static savedIn = { place: "recetario_familiar", collection: "recetas" }

  quitarEso() {
    core.removeSaved(this)
  }
}

/**
 * `<test-project-receta>`:  a receta, drawn in its own element, e.g. by `draw the receta`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its receta's properties;  its methods call its receta's.
 * - What every view's element does, e.g. drawing its receta, is `SpellElement`'s.
 */
export class RecetaElement extends SpellElement<Receta> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-receta", "receta", [
    { name: "título", kind: "string", description: "Its título." },
    { name: "porciones", kind: "number", description: "Its porciones." }
  ])

  quitarEso() {
    return this.currentThing?.quitarEso()
  }
}
core.useElement(Receta, RecetaElement)

/** La ÚNICA línea que cambia otro servidor:  prueba "una sala en vivo en ...", "un servicio web en ...", "una hoja en ..." */
export class RecetarioFamiliar extends Place {}
export const recetarioFamiliar = core.place(new RecetarioFamiliar(), { name: "recetario_familiar", kind: "this device" })

core.describeAction(Receta, "quitarEso", { title: "quitar eso", undoneAs: "Quitar receta" })

export class CajaDeRecetas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "búsqueda" es texto
  @prop({ type: "text" })
  accessor búsqueda!: string

  // su "borrador" es texto
  @prop({ type: "text" })
  accessor borrador!: string

  get coincidencias() { return core.waitedValue(this, "coincidencias", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Receta, {}, "looks through"), (receta: Receta) => receta.título.includes(this.búsqueda)), (item: Receta) => item.título)
  }) }

  agregarElBorrador() {
    if (this.borrador === "") return
    core.saveThing(new Receta({ título: this.borrador, porciones: 2 }))
    this.borrador = ""
  }

  @drawn draw() {
    return [
      <ui-form class="box" value={this}>
        <ui-input class="search" name="búsqueda" aria-label="Búsqueda" />
        <ui-input class="draft" name="borrador" aria-label="Receta nueva" />
        <ui-button class="add" onClick={core.pressed(this, () => this.agregarElBorrador())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Agregar
        </ui-button>
      </ui-form>,
      core.drawRead(() => this.coincidencias, (receta: Receta) => core.drawThing(receta), {
        waiting: () => <ui-loader class="waiting" />,
        none: () => <ui-text class="none">Todavía no hay recetas.</ui-text>,
        failed: () => <ui-message class="failed" color="red">
          No se puede llegar al recetario.
          <ui-button class="again" onClick={core.pressed(this, () => core.refreshSaved())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Reintentar
          </ui-button>
        </ui-message>
      })
    ]
  }
}

/**
 * `<test-project-app>`:  a caja de recetas, drawn in its own element, e.g. by `draw the caja de recetas`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its caja de recetas's properties;  its methods call its caja de recetas's.
 * - What every view's element does, e.g. drawing its caja de recetas, is `SpellElement`'s.
 */
export class CajaDeRecetasElement extends SpellElement<CajaDeRecetas> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "caja de recetas", [
    { name: "búsqueda", kind: "string", description: "Its búsqueda." },
    { name: "borrador", kind: "string", description: "Its borrador." }
  ])

  agregarElBorrador() {
    return this.currentThing?.agregarElBorrador()
  }
}
core.useElement(CajaDeRecetas, CajaDeRecetasElement)
export const cajaDeRecetas = new CajaDeRecetas()

if (!core.isCarryingOver) cajaDeRecetas.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `RecetaElement` */
      "test-project-receta": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `CajaDeRecetasElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
