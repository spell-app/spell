import { core, Thing, App, View, Place, h } from "@spell/core"

core.heading("Caja de recetas:  dónde se guardan las recetas")
////////////////////////////////////////////////////
// ## Caja de recetas:  dónde se guardan las recetas
////////////////////////////////////////////////////

export class Receta extends Thing {
  // su "título" es texto
  static { this.declareProp("título", { type: "text", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 854, end: 879 } }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  // sus "porciones" es un número
  static { this.declareProp("porciones", { type: "number", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 898, end: 926 } }) }
  get porciones() { return this.getProp("porciones") }
  set porciones(value) { this.setProp("porciones", value) }

  // sus "notas" es texto
  static { this.declareProp("notas", { type: "text", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 931, end: 951 } }) }
  get notas() { return this.getProp("notas") }
  set notas(value) { this.setProp("notas", value) }

  /** Su pantalla de edición:  nada cambia hasta Guardar */
  editar() {
    cajaDeRecetas.editando = this
  }

  draw() {
    return h("es-tarjeta",
      h("es-contenido",
        h("es-formulario", { class: "recipe", value: this },
          h("es-campo", { etiqueta: "Nombre de la receta" },
            h("es-boton", {
              class: "edit",
              slot: "acciones",
              icono: "pencil",
              tamano: "mini",
              apariencia: "transparent",
              "aria-label": "Editar",
              title: "Editar",
              onClick: core.pressed(this, () => this.editar()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }),
            h("es-boton", {
              class: "remove",
              slot: "acciones",
              icono: "close",
              tamano: "mini",
              apariencia: "transparent",
              "aria-label": "Quitar",
              title: "Quitar",
              onClick: core.pressed(this, () => core.removeSaved(this)),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }),
            h("es-entrada", { class: "title", name: "título", tamano: "grande" })
          ),
          h("es-campo", { etiqueta: "Para", "en-linea": true },
            h("es-entrada", {
              class: "serves",
              name: "porciones",
              type: "number",
              min: "1",
              etiquetado: "derecha",
              etiqueta: "personas"
            })
          ),
          h("es-campo", { etiqueta: "Notas" }, h("es-area-texto", { name: "notas", rows: "2" }))
        )
      )
    )
  }

  static savedIn = {
    place: "recetario_familiar",
    collection: "recetas",
    times: ["created", "modified"]
  }

  // vive en recetario familiar
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 814, end: 840 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en recetario familiar
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 814, end: 840 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

/**
 * Dónde se guardan lo dice la línea siguiente, y solo ella lo sabe.  Cámbiala para guardarlas en otro lugar:
 * recetario familiar es una carpeta de datos personal en "recetas"
 * (la caja de cada persona, en su espacio;  "recetas" sola es una caja que comparten todos, "owen@spell/recetas" la de Owen)
 * recetario familiar es una carpeta de datos en "http://127.0.0.1:4791/api/places/recipes"
 * recetario familiar es una sala en "http://127.0.0.1:4791/api/rooms/recipes"
 * (Las dos las sirve en tu computadora "yarn tsx scripts/recipe-servers.ts", en la carpeta principal de Spell.)
 * Lo que se dibuja y se hace con ellas está en CajaDeRecetas.es.spell.
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
// Tus recetas, en tarjetas:  busca una, agrega otra, cambia cualquiera mientras escribes o en su pantalla de edición, quita una y deshazlo.
// Dónde se guardan está en CajaDeRecetas.api.es.spell, y solo su primera línea lo sabe.

// Cada caja de notas crece mientras escribes

export class EditorDeReceta extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** La receta que se está cambiando */
  // su "receta" es una receta
  static { this.declareProp("receta", { type: "Receta" }) }
  get receta() { return this.getProp("receta") }
  set receta(value) { this.setProp("receta", value) }

  /** Una copia para cambiar:  la receta sigue igual hasta Guardar */
  get borrador() {
    return core.draftOf(this.receta)
  }

  /** Todos los campos cambiados, enviados juntos */
  aceptarLosCambios() {
    core.saveDraft(this.borrador)
    cajaDeRecetas.editando = undefined
  }

  /** Olvida la copia:  la receta no cambió */
  olvidarLosCambios() {
    core.discardDraft(this.borrador)
    cajaDeRecetas.editando = undefined
  }

  draw() {
    return h("es-tarjeta", { class: "editor" },
      h("es-contenido",
        h("es-formulario", { "prop:value": () => this.borrador },
          h("es-encabezado", { tamano: "pequeño" }, "Editar ", () => this.receta?.título),
          h("es-campo", { etiqueta: "Nombre de la receta" },
            h("es-entrada", { class: "edit-title", name: "título", tamano: "grande" })
          ),
          h("es-campo", { etiqueta: "Para", "en-linea": true },
            h("es-entrada", {
              class: "serves",
              name: "porciones",
              type: "number",
              min: "1",
              etiquetado: "derecha",
              etiqueta: "personas"
            })
          ),
          h("es-campo", { etiqueta: "Notas" }, h("es-area-texto", { name: "notas", rows: "2" }))
        )
      ),
      h("es-extra",
        h("es-boton", {
          class: "save",
          tamano: "pequeño",
          color: "primario",
          desactivado: () => this.borrador.título === "",
          onClick: core.pressed(this, () => this.aceptarLosCambios()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Guardar"),
        h("es-boton", {
          class: "cancel",
          tamano: "pequeño",
          onClick: core.pressed(this, () => this.olvidarLosCambios()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Cancelar")
      )
    )
  }
}

core.useDefaults("/CajaDeRecetas.es.spell", {
  "ui-textarea": { grow: true }
})

core.heading("Una receta:  una tarjeta que puedes leer y cambiar")
//## Una receta:  una tarjeta que puedes leer y cambiar

core.heading("Su pantalla de edición:  un formulario sobre un borrador, así que nada cambia hasta Guardar")
//## Su pantalla de edición:  un formulario sobre un borrador, así que nada cambia hasta Guardar

core.heading("La caja:  la tarjeta de una receta nueva, y luego una tarjeta por cada receta")
//## La caja:  la tarjeta de una receta nueva, y luego una tarjeta por cada receta

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

  /** La receta en su pantalla de edición, mientras haya una */
  // su "editando" es una receta
  static { this.declareProp("editando", { type: "Receta" }) }
  get editando() { return this.getProp("editando") }
  set editando(value) { this.setProp("editando", value) }

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

  /** Las más nuevas primero, por cuándo se guardó cada una */
  static { this.declareProp("coincidencias", { declaredAt: { path: "/CajaDeRecetas.es.spell", start: 3873, end: 4083 }, readsFrom: ["recetario_familiar"] }) }
  get coincidencias() { return core.waitedValue(this, "coincidencias", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Receta, {}, "looks through"), (receta) => core.includes(receta.título, this.búsqueda)), (item) => core.descending(item.creado))
  }, () => [this.búsqueda]) }

  agregarLaRecetaNueva() {
    core.saveThing(this.recetaNueva)
    this.recetaNueva = new Receta({ porciones: 4 })
  }

  draw() {
    return h("es-contenedor",
      h("es-pila", { direccion: "horizontal", ajustar: true, alinear: "fin", repartir: "entre" },
        h("es-pila", { alinear: "inicio" },
          h("es-encabezado", { tamano: "grande" }, "Caja de recetas"),
          h("es-texto", { color: "gris" }, "Todo lo que escribes se guarda al instante.")
        ),
        h("es-barra-herramientas", { class: "undo", menu: "menú de la caja", "aria-label": "Recetas" }),
        h("es-formulario", { class: "find", value: this },
          h("es-campo", { etiqueta: "Buscar" },
            h("es-entrada", { class: "search", name: "búsqueda", icono: "search" })
          )
        )
      ),
      () => this.drawPantalla()
    )
  }

  // Su pantalla de edición, mientras se cambia una receta;  si no, las tarjetas:  su propio dibujo, para que su `si` elija solo una
  drawPantalla() {
    if (this.editando) return core.drawThing(new EditorDeReceta({ receta: this.editando }))
    else {
      return h("es-tarjetas", { columnas: "3", duplicable: true, part: "pantalla" },
        h("es-tarjeta", { class: "new" },
          h("es-contenido",
            h("es-formulario", { "prop:value": () => this.recetaNueva },
              h("es-encabezado", { tamano: "pequeño" }, "Agrega una receta"),
              h("es-campo", { etiqueta: "Nombre de la receta" },
                h("es-entrada", { class: "draft", name: "título", tamano: "grande" })
              ),
              h("es-campo", { etiqueta: "Para", "en-linea": true },
                h("es-entrada", {
                  class: "serves",
                  name: "porciones",
                  type: "number",
                  min: "1",
                  etiquetado: "derecha",
                  etiqueta: "personas"
                })
              ),
              h("es-campo", { etiqueta: "Notas" }, h("es-area-texto", { name: "notas", rows: "2" }))
            )
          ),
          h("es-extra",
            h("es-boton", {
              class: "add",
              tamano: "pequeño",
              color: "primario",
              desactivado: () => this.recetaNueva.título === "",
              onClick: core.pressed(this, () => this.agregarLaRecetaNueva()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Agregar receta")
          )
        ),
        () => core.drawRead(() => this.coincidencias, (receta) => core.drawThing(receta), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "pantalla" }, "Buscando tus recetas"),
          none: () => h("es-texto", { class: "none", color: "gris", part: "pantalla" },
            () => this.búsqueda === "" ? "Todavía no hay recetas. Agrega la primera." : "Ninguna receta coincide con tu búsqueda."
          ),
          failed: () => h("es-mensaje", { class: "failed", color: "rojo", part: "pantalla" },
            "No podemos llegar a tus recetas ahora mismo.",
            h("es-boton", {
              class: "again",
              onClick: core.pressed(this, () => core.reloadSaved()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Reintentar")
          )
        })
      )
    }
  }
}
export const cajaDeRecetas = new CajaDeRecetas()
// su "menú de la caja" es un menú de "deshacer"
core.describeMenu(CajaDeRecetas, "menúDeLaCaja", { items: ["undo"] })
// -----------
if (!core.isCarryingOver) cajaDeRecetas.start()
