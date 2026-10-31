import { core, App, View, Place, h } from "@spell/core"

core.heading("Caja de recetas")
/////////////////////
// ## Caja de recetas
/////////////////////

/** Una receta:  una tarjeta que puedes leer y cambiar */
export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  static { this.declareProp("título", { type: "text", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 692, end: 712 } }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  // sus "porciones" es un número
  static { this.declareProp("porciones", { type: "number", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 716, end: 744 } }) }
  get porciones() { return this.getProp("porciones") }
  set porciones(value) { this.setProp("porciones", value) }

  // sus "notas" es texto
  static { this.declareProp("notas", { type: "text", declaredAt: { path: "/CajaDeRecetas.es.spell", start: 748, end: 768 } }) }
  get notas() { return this.getProp("notas") }
  set notas(value) { this.setProp("notas", value) }

  draw() {
    return h("ui-card", { fluid: true },
      h("ui-content",
        h("ui-form", { class: "recipe", value: this },
          h("ui-field", { label: "Nombre de la receta" },
            h("ui-input", { class: "title", name: "título", size: "large" })
          ),
          h("ui-field", { label: "Para", inline: true },
            h("ui-input", { class: "serves", name: "porciones", type: "number", min: "1", labeled: "right", label: "personas" })
          ),
          h("ui-field", { label: "Notas" }, h("ui-textarea", { name: "notas", rows: "2", grow: true }))
        )
      ),
      h("ui-extra", { part: "foot" },
        h("ui-button", {
          class: "remove",
          size: "small",
          appearance: "basic",
          onClick: core.pressed(this, () => core.removeSaved(this)),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Quitar")
      )
    )
  }

  static savedIn = { place: "recetario_familiar", collection: "recetas" }
}

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
export class CajaDeRecetas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "búsqueda" es texto
  static { this.declareProp("búsqueda", { type: "text" }) }
  get búsqueda() { return this.getProp("búsqueda") }
  set búsqueda(value) { this.setProp("búsqueda", value) }

  // su "receta nueva" es una nueva receta con porciones = 4
  static { this.declareProp("recetaNueva", { init: () => new Receta({ porciones: 4 }), early: true }) }
  get recetaNueva() { return this.getProp("recetaNueva") }
  set recetaNueva(value) { this.setProp("recetaNueva", value) }

  static { this.declareProp("coincidencias", { declaredAt: { path: "/CajaDeRecetas.es.spell", start: 1645, end: 1715 }, readsFrom: ["recetario_familiar"] }) }
  get coincidencias() { return core.waitedValue(this, "coincidencias", async () => {
    return core.filter(await core.savedThings(Receta, {}, "looks through"), (receta) => receta.título.includes(this.búsqueda))
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

  draw() {
    return [
      h("header", { class: "top" },
        h("div", { class: "heading" },
          h("h1", "Caja de recetas"),
          h("p", "Todo lo que escribes se guarda al instante.")
        ),
        h("ui-toolbar", { class: "undo", menu: "menú de la caja", "aria-label": "Recetas" }),
        h("ui-form", { value: this },
          h("ui-field", { label: "Buscar" },
            h("ui-input", { class: "search", name: "búsqueda", icon: "search" })
          )
        )
      ),
      h("ui-card", { class: "new", fluid: true },
        h("ui-content",
          h("ui-form", { "prop:value": () => this.recetaNueva },
            h("h2", "Agrega una receta"),
            h("ui-field", { label: "Nombre de la receta" },
              h("ui-input", { class: "draft", name: "título", size: "large" })
            ),
            h("ui-field", { label: "Para", inline: true },
              h("ui-input", { class: "serves", name: "porciones", type: "number", min: "1", labeled: "right", label: "personas" })
            ),
            h("ui-field", { label: "Notas" }, h("ui-textarea", { name: "notas", rows: "2", grow: true }))
          )
        ),
        h("ui-extra",
          h("ui-button", {
            class: "add",
            size: "small",
            color: "primary",
            disabled: () => this.recetaNueva.título === "",
            onClick: core.pressed(this, () => this.agregarLaRecetaNueva()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Agregar receta")
        )
      ),
      core.drawRead(() => this.coincidencias, (receta) => core.drawThing(receta), {
        waiting: () => h("ui-loader", { class: "waiting", visible: true, inline: true, text: true }, "Buscando tus recetas"),
        none: () => h("ui-text", { class: "none" },
          () => this.búsqueda === "" ? "Todavía no hay recetas. Agrega la primera." : "Ninguna receta coincide con tu búsqueda."
        ),
        failed: () => h("ui-message", { class: "failed", color: "red" },
          h("p", "No podemos llegar a tus recetas ahora mismo."),
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
// su "menú de la caja" es un menú de "deshacer"
core.describeMenu(CajaDeRecetas, "menúDeLaCaja", { items: ["undo"] })

if (!core.isCarryingOver) cajaDeRecetas.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  how the recipe box looks (the same as Recipe Box, its twin).¬   - The box is one grid, <caja-de-recetas-app>:  its header across the top, then a card each, the new recipe's first.¬   - Each recipe is a <caja-de-recetas-receta>, an element of its own:  its insides are reached by their parts. */¬¬caja-de-recetas-app {¬  --ui-card-margin-block: 0;¬  --ui-form-row-distance: 0.75em;¬  --ui-menu-margin: 0;¬  --ui-message-margin: 0;¬¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18em), 1fr));¬  align-items: start;¬  gap: 1em;¬  max-width: 66em;¬  margin-inline: auto;¬  padding-block-end: 1.5em;¬}¬¬caja-de-recetas-receta {¬  display: block;¬}¬¬/****************¬ * Across the top:  the title, then undo and search, on the right while there's room¬ ****************/¬¬.top {¬  grid-column: 1 / -1;¬}¬¬.top {¬  display: flex;¬  flex-wrap: wrap;¬  align-items: end;¬  gap: 0.5em 1em;¬¬  .heading {¬    flex: 1 1 100%;¬  }¬¬  h1,¬  p {¬    margin: 0;¬  }¬¬  p {¬    color: var(--ui-text-muted);¬  }¬¬  ui-form {¬    --ui-form-row-distance: 0;¬¬    flex: 1 1 10em;¬  }¬¬  /* with room, one line:  the search stays the same width as undo's words change */¬  @media (min-width: 40em) {¬    .heading {¬      flex-basis: 16em;¬    }¬¬    ui-form {¬      flex: 0 1 18em;¬    }¬  }¬}¬¬/****************¬ * The cards¬ ****************/¬¬/* the new recipe's card stands beside two rows of others:  no hole under its neighbours */¬@media (min-width: 40em) {¬  .new::part(card) {¬    grid-row: span 2;¬  }¬}¬¬.new h2 {¬  margin: 0 0 0.5em;¬  font-size: 1.15em;¬}¬¬/* the buttons at the foot of a card are at its right */¬.new ui-extra,¬caja-de-recetas-receta::part(foot) {¬  text-align: end;¬}¬¬/* said beside the new recipe's card, in place of the others */¬.none {¬  color: var(--ui-text-muted);¬}¬¬.waiting {¬  justify-self: start;¬}¬`)
