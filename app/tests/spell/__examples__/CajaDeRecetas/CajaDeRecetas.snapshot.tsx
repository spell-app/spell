import { core, Thing, App, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Caja de recetas:  dónde se guardan las recetas")
////////////////////////////////////////////////////
// ## Caja de recetas:  dónde se guardan las recetas
////////////////////////////////////////////////////

export class Receta extends Thing {
  // su "título" es texto
  @prop({ type: "text", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 840, end: 860 } })
  accessor título!: string

  // sus "porciones" es un número
  @prop({ type: "number", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 864, end: 892 } })
  accessor porciones!: number

  // sus "notas" es texto
  @prop({ type: "text", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 896, end: 916 } })
  accessor notas!: string

  @drawn draw() {
    return (
      <ui-card fluid={true}>
        <ui-content>
          <ui-form class="recipe" value={this}>
            <ui-field label="Nombre de la receta">
              <ui-button class="remove" slot="actions" icon="close" size="mini" appearance="transparent" aria-label="Quitar" title="Quitar" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
              <ui-input class="title" name="título" size="large" />
            </ui-field>
            <ui-field label="Para" inline={true}>
              <ui-input class="serves" name="porciones" type="number" min="1" labeled="right" label="personas" />
            </ui-field>
            <ui-field label="Notas">
              <ui-textarea name="notas" rows="2" grow={true} />
            </ui-field>
          </ui-form>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = { place: "recetario_familiar", collection: "recetas" }
}

/**
 * Dónde se guardan lo dice la línea siguiente, y solo ella lo sabe.  Cámbiala para guardarlas en otro lugar:
 * recetario familiar es una carpeta de datos personal en "recetas"
 * (la caja de cada persona, en su espacio;  "recetas" sola es una caja que comparten todos, "owen@spell/recetas" la de Owen)
 * recetario familiar es una carpeta de datos en "http://127.0.0.1:4791/api/places/recipes"
 * recetario familiar es una sala en "http://127.0.0.1:4791/api/rooms/recipes"
 * (Las dos las sirve en tu computadora "yarn tsx scripts/recipe-servers.ts", en la carpeta principal de Spell.)
 * Lo que se dibuja y se hace con ellas está en CajaDeRecetas.es.spellml.
 */
export class RecetarioFamiliar extends Place {}
export const recetarioFamiliar = core.place(new RecetarioFamiliar(), {
  name: "recetario_familiar",
  kind: "database on this device",
  unclearNumbers: ","
})

// -----------
core.heading("Caja de recetas")
/////////////////////
// ## Caja de recetas
/////////////////////
// Tus recetas, en tarjetas:  busca una, agrega otra, cambia cualquiera mientras escribes, quita una y deshazlo.
// Dónde se guardan está en CajaDeRecetas.api.es.spell, y solo su primera línea lo sabe.

core.heading("Una receta:  una tarjeta que puedes leer y cambiar")
//## Una receta:  una tarjeta que puedes leer y cambiar

core.heading("La caja:  la tarjeta de una receta nueva, y luego una tarjeta por cada receta")
//## La caja:  la tarjeta de una receta nueva, y luego una tarjeta por cada receta

@thing
export class CajaDeRecetas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "búsqueda" es texto
  @prop({ type: "text" })
  accessor búsqueda!: string

  // su "receta nueva" es una nueva receta con porciones = 4
  @prop({ init: () => new Receta({ porciones: 4 }), early: true })
  accessor recetaNueva!: Receta

  /** Si todavía no hay nada guardado, unas cuantas para empezar */
  async create() {
    if (core.itemCountOf(await core.savedThings(Receta)) === 0) {
      core.saveThing(new Receta({
        título: "Sopa de tomate",
        porciones: 4,
        notas: "Asa los tomates primero."
      }))
      core.saveThing(new Receta({
        título: "Dal",
        porciones: 6,
        notas: "Agrega las especias al final."
      }))
      core.saveThing(new Receta({
        título: "Pizza Margarita",
        porciones: 2,
        notas: "El horno bien caliente."
      }))
    }
  }

  /** Las más nuevas primero:  una receta nueva se suma al final, así que se muestran al revés */
  static { this.declareProp("coincidencias", { declaredAt: { path: "/CajaDeRecetas.es.spellml", start: 1761, end: 1998 }, readsFrom: ["recetario_familiar"] }) }
  get coincidencias() { return core.waitedValue(this, "coincidencias", async () => {
    const halladas = core.filter(await core.savedThings(Receta, {}, "looks through"), (receta: Receta) => core.includes(receta.título, this.búsqueda))
    core.reverse(halladas)
    return halladas
  }, () => [this.búsqueda]) }

  agregarLaRecetaNueva() {
    core.saveThing(this.recetaNueva)
    this.recetaNueva = new Receta({ porciones: 4 })
  }

  @drawn draw() {
    return [
      <ui-stack class="top" direction="horizontal" wrap={true} align="end" justify="between">
        <ui-stack align="start">
          <ui-header size="large">Caja de recetas</ui-header>
          <ui-text color="grey">Todo lo que escribes se guarda al instante.</ui-text>
        </ui-stack>
        <ui-toolbar class="undo" menu="menú de la caja" aria-label="Recetas" />
        <ui-form class="find" value={this}>
          <ui-field label="Buscar">
            <ui-input class="search" name="búsqueda" icon="search" />
          </ui-field>
        </ui-form>
      </ui-stack>,
      <ui-card class="new" fluid={true}>
        <ui-content>
          <ui-form prop:value={this.recetaNueva}>
            <ui-header size="small">Agrega una receta</ui-header>
            <ui-field label="Nombre de la receta">
              <ui-input class="draft" name="título" size="large" />
            </ui-field>
            <ui-field label="Para" inline={true}>
              <ui-input class="serves" name="porciones" type="number" min="1" labeled="right" label="personas" />
            </ui-field>
            <ui-field label="Notas">
              <ui-textarea name="notas" rows="2" grow={true} />
            </ui-field>
          </ui-form>
        </ui-content>
        <ui-extra>
          <ui-button class="add" size="small" color="primary" disabled={this.recetaNueva.título === ""} onClick={core.pressed(this, () => this.agregarLaRecetaNueva())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Agregar receta
          </ui-button>
        </ui-extra>
      </ui-card>,
      core.drawRead(() => this.coincidencias, (receta: Receta) => core.drawThing(receta), {
        waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando tus recetas"}</ui-loader>,
        none: () => <ui-text class="none" color="grey">
          {this.búsqueda === "" ? "Todavía no hay recetas. Agrega la primera." : "Ninguna receta coincide con tu búsqueda."}
        </ui-text>,
        failed: () => <ui-message class="failed" color="red">
          No podemos llegar a tus recetas ahora mismo.
          <ui-button class="again" onClick={core.pressed(this, () => core.reloadSaved())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
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
    { name: "receta-nueva", kind: "json", description: "Its recetaNueva." }
  ])

  create() {
    return this.currentThing?.create()
  }

  agregarLaRecetaNueva() {
    return this.currentThing?.agregarLaRecetaNueva()
  }
}
core.useElement(CajaDeRecetas, CajaDeRecetasElement)
export const cajaDeRecetas = new CajaDeRecetas()
// su "menú de la caja" es un menú de "deshacer"
core.describeMenu(CajaDeRecetas, "menúDeLaCaja", { items: ["undo"] })
// -----------
core.installStyles(undefined, `/* File styles.css:  how the box is laid out.¬   - The box, <caja-de-recetas-app>, is one grid:  its top row across, then a card each, the new recipe's first. */¬¬caja-de-recetas-app {¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18em), 1fr));¬  align-items: start;¬  gap: 1em;¬  max-width: 66em;¬  margin-inline: auto;¬  --ui-card-margin-block: 0;¬}¬¬.top {¬  grid-column: 1 / -1;¬}¬¬/* the search takes the room that's left on the top row, and its own row on a phone */¬.find {¬  flex: 1 1 12em;¬}¬¬/* the new recipe's card stands beside two rows of others */¬@media (min-width: 40em) {¬  .new::part(card) {¬    grid-row: span 2;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) cajaDeRecetas.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CajaDeRecetasElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
