import { core, App, View, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Caja de recetas")
/////////////////////
// ## Caja de recetas
/////////////////////

/** Una receta:  una tarjeta que puedes leer y cambiar */
export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  @prop({ type: "text", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 692, end: 712 } })
  accessor título!: string

  // sus "porciones" es un número
  @prop({ type: "number", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 716, end: 744 } })
  accessor porciones!: number

  // sus "notas" es texto
  @prop({ type: "text", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 748, end: 768 } })
  accessor notas!: string

  @drawn draw() {
    return (
      <ui-card fluid={true}>
        <ui-content>
          <ui-form class="recipe" value={this}>
            <ui-field label="Nombre de la receta">
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
        <ui-extra part="foot">
          <ui-button class="remove" size="small" appearance="basic" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Quitar
          </ui-button>
        </ui-extra>
      </ui-card>
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
    { name: "título", kind: "string", description: "Its título." },
    { name: "porciones", kind: "number", description: "Its porciones." },
    { name: "notas", kind: "string", description: "Its notas." }
  ])
}
core.useElement(Receta, RecetaElement)

/**
 * Tus recetas, en tarjetas:  busca una, agrega otra, cambia cualquiera mientras escribes, quita una y deshazlo.
 * Dónde se guardan lo dice la línea siguiente, y solo ella lo sabe.  Cámbiala para guardarlas en otro lugar:
 * recetario familiar es una carpeta en "http://127.0.0.1:4791/api/places/recipes"
 * recetario familiar es una sala en vivo en "http://127.0.0.1:4791/api/rooms/recipes"
 * (Las dos las sirve en tu computadora "yarn tsx scripts/recipe-servers.ts", en la carpeta principal de Spell.)
 */
export class RecetarioFamiliar extends Place {}
export const recetarioFamiliar = core.place(new RecetarioFamiliar(), { name: "recetario_familiar", kind: "this device" })

core.heading("Una receta:  una tarjeta que puedes leer y cambiar")

core.heading("La caja:  la tarjeta de una receta nueva, y luego una tarjeta por cada receta")
/** La caja:  la tarjeta de una receta nueva, y luego una tarjeta por cada receta */
@thing
export class CajaDeRecetas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "búsqueda" es texto
  @prop({ type: "text" })
  accessor búsqueda!: string

  // su "receta nueva" es una nueva receta con porciones = 4
  @prop({ init: () => new Receta({ porciones: 4 }), early: true })
  accessor recetaNueva!: Receta

  static { this.declareProp("coincidencias", { declaredAt: { path: "/CajaDeRecetas.es.spell", start: 1645, end: 1715 }, readsFrom: ["recetario_familiar"] }) }
  get coincidencias() { return core.waitedValue(this, "coincidencias", async () => {
    return core.filter(await core.savedThings(Receta, {}, "looks through"), (receta: Receta) => receta.título.includes(this.búsqueda))
  }, () => [this.búsqueda]) }

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

  agregarLaRecetaNueva() {
    core.saveThing(this.recetaNueva)
    this.recetaNueva = new Receta({ porciones: 4 })
  }

  @drawn draw() {
    return [
      <header class="top">
        <div class="heading">
          <h1>Caja de recetas</h1>
          <p>Todo lo que escribes se guarda al instante.</p>
        </div>
        <ui-toolbar class="undo" menu="menú de la caja" aria-label="Recetas" />
        <ui-form value={this}>
          <ui-field label="Buscar">
            <ui-input class="search" name="búsqueda" icon="search" />
          </ui-field>
        </ui-form>
      </header>,
      <ui-card class="new" fluid={true}>
        <ui-content>
          <ui-form prop:value={this.recetaNueva}>
            <h2>Agrega una receta</h2>
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
        waiting: () => <ui-loader class="waiting" visible={true} inline={true} text={true}>Buscando tus recetas</ui-loader>,
        none: () => <ui-text class="none">
          {this.búsqueda === "" ? "Todavía no hay recetas. Agrega la primera." : "Ninguna receta coincide con tu búsqueda."}
        </ui-text>,
        failed: () => <ui-message class="failed" color="red">
          <p>No podemos llegar a tus recetas ahora mismo.</p>
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

if (!core.isCarryingOver) cajaDeRecetas.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  how the recipe box looks (the same as Recipe Box, its twin).¬   - The box is one grid, <caja-de-recetas-app>:  its header across the top, then a card each, the new recipe's first.¬   - Each recipe is a <caja-de-recetas-receta>, an element of its own:  its insides are reached by their parts. */¬¬caja-de-recetas-app {¬  --ui-card-margin-block: 0;¬  --ui-form-row-distance: 0.75em;¬  --ui-menu-margin: 0;¬  --ui-message-margin: 0;¬¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18em), 1fr));¬  align-items: start;¬  gap: 1em;¬  max-width: 66em;¬  margin-inline: auto;¬  padding-block-end: 1.5em;¬}¬¬caja-de-recetas-receta {¬  display: block;¬}¬¬/****************¬ * Across the top:  the title, then undo and search, on the right while there's room¬ ****************/¬¬.top {¬  grid-column: 1 / -1;¬}¬¬.top {¬  display: flex;¬  flex-wrap: wrap;¬  align-items: end;¬  gap: 0.5em 1em;¬¬  .heading {¬    flex: 1 1 100%;¬  }¬¬  h1,¬  p {¬    margin: 0;¬  }¬¬  p {¬    color: var(--ui-text-muted);¬  }¬¬  ui-form {¬    --ui-form-row-distance: 0;¬¬    flex: 1 1 10em;¬  }¬¬  /* with room, one line:  the search stays the same width as undo's words change */¬  @media (min-width: 40em) {¬    .heading {¬      flex-basis: 16em;¬    }¬¬    ui-form {¬      flex: 0 1 18em;¬    }¬  }¬}¬¬/****************¬ * The cards¬ ****************/¬¬/* the new recipe's card stands beside two rows of others:  no hole under its neighbours */¬@media (min-width: 40em) {¬  .new::part(card) {¬    grid-row: span 2;¬  }¬}¬¬.new h2 {¬  margin: 0 0 0.5em;¬  font-size: 1.15em;¬}¬¬/* the buttons at the foot of a card are at its right */¬.new ui-extra,¬caja-de-recetas-receta::part(foot) {¬  text-align: end;¬}¬¬/* said beside the new recipe's card, in place of the others */¬.none {¬  color: var(--ui-text-muted);¬}¬¬.waiting {¬  justify-self: start;¬}¬`)

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
