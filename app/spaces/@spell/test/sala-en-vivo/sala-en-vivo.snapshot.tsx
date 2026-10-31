import { core, App, View, Place, prop, drawn, on } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  @prop({ type: "text", declaredAt: { path: "/SalaEnVivo.es.spell", start: 891, end: 911 } })
  accessor título!: string

  onSomeoneElseChange(event: any /* spell: type unknown */) {
    cajaEnVivo.noticias = `Otra persona cambió ${this.título}`
  }

  @drawn draw() {
    return (
      <ui-form class="recipe" value={this}>
        <ui-input name="título" aria-label="Receta" />
      </ui-form>
    )
  }

  static savedIn = { place: "recetario_familiar", collection: "recetas" }
}

/**
 * `<test-project-receta>`:  a receta, drawn in its own element, e.g. by `draw the receta`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its receta's properties;  its methods call its receta's.
 * - What every view's element does, e.g. drawing its receta, is `SpellElement`'s.
 */
export class RecetaElement extends SpellElement<Receta> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-receta", "receta", [
    { name: "título", kind: "string", description: "Its título." }
  ])

  onSomeoneElseChange(event: any /* spell: type unknown */) {
    return this.currentThing?.onSomeoneElseChange(event)
  }
}
core.useElement(Receta, RecetaElement)

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
  @prop({ type: "text" })
  accessor noticias!: string

  // sus "cambios" es un número
  @prop({ type: "number" })
  accessor cambios!: number

  agregarUna() {
    core.saveThing(new Receta({ título: "Nueva" }))
  }

  @drawn draw() {
    return [
      <ui-text class="me">{core.currentPerson().name}</ui-text>,
      core.drawRead(() => core.peopleHere(), (persona) => <ui-label class="here">{persona.nombre}</ui-label>),
      <ui-text class="news">{this.noticias}</ui-text>,
      <ui-text class="changes">{this.cambios}</ui-text>,
      <ui-button class="again" onClick={core.pressed(this, () => core.refreshSaved(Receta))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        Revisar ahora
      </ui-button>,
      <ui-button class="add" onClick={core.pressed(this, () => this.agregarUna())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        Agregar una
      </ui-button>,
      core.drawRead(async () => await core.savedThings(Receta), (receta: Receta) => core.drawThing(receta))
    ]
  }
}

/**
 * `<test-project-app>`:  a caja en vivo, drawn in its own element, e.g. by `draw the caja en vivo`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its caja en vivo's properties;  its methods call its caja en vivo's.
 * - What every view's element does, e.g. drawing its caja en vivo, is `SpellElement`'s.
 */
export class CajaEnVivoElement extends SpellElement<CajaEnVivo> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "caja en vivo", [
    { name: "noticias", kind: "string", description: "Its noticias." },
    { name: "cambios", kind: "number", description: "Its cambios." }
  ])

  agregarUna() {
    return this.currentThing?.agregarUna()
  }
}
core.useElement(CajaEnVivo, CajaEnVivoElement)
export const cajaEnVivo = new CajaEnVivo()

on<{ receta: Receta }>("a-receta-change", ({ receta }) => {
  cajaEnVivo.cambios = cajaEnVivo.cambios + 1
})

if (!core.isCarryingOver) cajaEnVivo.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `RecetaElement` */
      "test-project-receta": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `CajaEnVivoElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
