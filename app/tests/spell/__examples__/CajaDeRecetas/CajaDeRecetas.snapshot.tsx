import { core, Thing, App, View, Place, prop, thing, drawn } from "@spell/core"
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

  /** Su pantalla de edición:  nada cambia hasta Guardar */
  editar() {
    cajaDeRecetas.editando = this
  }

  @drawn draw() {
    return (
      <es-tarjeta>
        <es-contenido>
          <es-formulario class="recipe" value={this}>
            <es-campo etiqueta="Nombre de la receta">
              <es-boton class="edit" slot="acciones" icono="pencil" tamano="mini" apariencia="transparent" aria-label="Editar" title="Editar" onClick={core.pressed(this, () => this.editar())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
              <es-boton class="remove" slot="acciones" icono="close" tamano="mini" apariencia="transparent" aria-label="Quitar" title="Quitar" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
              <es-entrada class="title" name="título" tamano="grande" />
            </es-campo>
            <es-campo etiqueta="Para" en-linea={true}>
              <es-entrada class="serves" name="porciones" type="number" min="1" etiquetado="derecha" etiqueta="personas" />
            </es-campo>
            <es-campo etiqueta="Notas">
              <es-area-texto name="notas" rows="2" />
            </es-campo>
          </es-formulario>
        </es-contenido>
      </es-tarjeta>
    )
  }

  static savedIn = {
    place: "recetario_familiar",
    collection: "recetas",
    times: ["created", "modified"]
  }

  // vive en recetario familiar
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 810, end: 836 } })
  accessor creado!: any /* spell: type unknown */

  // vive en recetario familiar
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/CajaDeRecetas.api.es.spell", start: 810, end: 836 } })
  accessor modificado!: any /* spell: type unknown */
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
// Tus recetas, en tarjetas:  busca una, agrega otra, cambia cualquiera mientras escribes o en su pantalla de edición, quita una y deshazlo.
// Dónde se guardan está en CajaDeRecetas.api.es.spell, y solo su primera línea lo sabe.

// Cada caja de notas crece mientras escribes

export class EditorDeReceta extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** La receta que se está cambiando */
  // su "receta" es una receta
  @prop({ type: "Receta" })
  accessor receta!: Receta

  /** Una copia para cambiar:  la receta sigue igual hasta Guardar */
  get borrador() {
    return core.draftOf(this.receta!)
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

  @drawn draw() {
    return (
      <es-tarjeta class="editor">
        <es-contenido>
          <es-formulario prop:value={this.borrador}>
            <es-encabezado tamano="pequeño">Editar {this.receta?.título}</es-encabezado>
            <es-campo etiqueta="Nombre de la receta">
              <es-entrada class="edit-title" name="título" tamano="grande" />
            </es-campo>
            <es-campo etiqueta="Para" en-linea={true}>
              <es-entrada class="serves" name="porciones" type="number" min="1" etiquetado="derecha" etiqueta="personas" />
            </es-campo>
            <es-campo etiqueta="Notas">
              <es-area-texto name="notas" rows="2" />
            </es-campo>
          </es-formulario>
        </es-contenido>
        <es-extra>
          <es-boton class="save" tamano="pequeño" color="primario" desactivado={this.borrador.título === ""} onClick={core.pressed(this, () => this.aceptarLosCambios())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Guardar
          </es-boton>
          <es-boton class="cancel" tamano="pequeño" onClick={core.pressed(this, () => this.olvidarLosCambios())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Cancelar
          </es-boton>
        </es-extra>
      </es-tarjeta>
    )
  }
}

/**
 * `<test-project-editor-de-receta>`:  an editor de receta, drawn in its own element, e.g. by `draw the editor de receta`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its editor de receta's properties;  its methods call its editor de receta's.
 * - What every view's element does, e.g. drawing its editor de receta, is `SpellElement`'s.
 */
export class EditorDeRecetaElement extends SpellElement<EditorDeReceta> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-editor-de-receta", "editor de receta", [
    { name: "receta", kind: "string", description: "Its receta." }
  ])

  aceptarLosCambios() {
    return this.currentThing?.aceptarLosCambios()
  }

  olvidarLosCambios() {
    return this.currentThing?.olvidarLosCambios()
  }
}
core.useElement(EditorDeReceta, EditorDeRecetaElement)

core.useDefaults("/CajaDeRecetas.es.spellml", {
  "ui-textarea": { grow: true }
})

core.heading("Una receta:  una tarjeta que puedes leer y cambiar")
//## Una receta:  una tarjeta que puedes leer y cambiar

core.heading("Su pantalla de edición:  un formulario sobre un borrador, así que nada cambia hasta Guardar")
//## Su pantalla de edición:  un formulario sobre un borrador, así que nada cambia hasta Guardar

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

  /** La receta en su pantalla de edición, mientras haya una */
  // su "editando" es una receta
  @prop({ type: "Receta" })
  accessor editando!: Receta

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
  static { this.declareProp("coincidencias", { declaredAt: { path: "/CajaDeRecetas.es.spellml", start: 3873, end: 4083 }, readsFrom: ["recetario_familiar"] }) }
  get coincidencias() { return core.waitedValue(this, "coincidencias", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Receta, {}, "looks through"), (receta: Receta) => core.includes(receta.título, this.búsqueda)), (item: Receta) => core.descending(item.creado))
  }, () => [this.búsqueda]) }

  agregarLaRecetaNueva() {
    core.saveThing(this.recetaNueva)
    this.recetaNueva = new Receta({ porciones: 4 })
  }

  @drawn draw() {
    return (
      <es-contenedor>
        <es-pila direccion="horizontal" ajustar={true} alinear="fin" repartir="entre">
          <es-pila alinear="inicio">
            <es-encabezado tamano="grande">Caja de recetas</es-encabezado>
            <es-texto color="gris">Todo lo que escribes se guarda al instante.</es-texto>
          </es-pila>
          <es-barra-herramientas class="undo" menu="menú de la caja" aria-label="Recetas" />
          <es-formulario class="find" value={this}>
            <es-campo etiqueta="Buscar">
              <es-entrada class="search" name="búsqueda" icono="search" />
            </es-campo>
          </es-formulario>
        </es-pila>
        {this.drawPantalla()}
      </es-contenedor>
    )
  }

  // Su pantalla de edición, mientras se cambia una receta;  si no, las tarjetas:  su propio dibujo, para que su `si` elija solo una
  drawPantalla() {
    if (this.editando) return core.drawThing(new EditorDeReceta({ receta: this.editando }))
    else {
      return (
        <es-tarjetas columnas="3" duplicable={true} part="pantalla">
          <es-tarjeta class="new">
            <es-contenido>
              <es-formulario prop:value={this.recetaNueva}>
                <es-encabezado tamano="pequeño">Agrega una receta</es-encabezado>
                <es-campo etiqueta="Nombre de la receta">
                  <es-entrada class="draft" name="título" tamano="grande" />
                </es-campo>
                <es-campo etiqueta="Para" en-linea={true}>
                  <es-entrada class="serves" name="porciones" type="number" min="1" etiquetado="derecha" etiqueta="personas" />
                </es-campo>
                <es-campo etiqueta="Notas">
                  <es-area-texto name="notas" rows="2" />
                </es-campo>
              </es-formulario>
            </es-contenido>
            <es-extra>
              <es-boton class="add" tamano="pequeño" color="primario" desactivado={this.recetaNueva.título === ""} onClick={core.pressed(this, () => this.agregarLaRecetaNueva())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Agregar receta
              </es-boton>
            </es-extra>
          </es-tarjeta>
          {core.drawRead(() => this.coincidencias, (receta: Receta) => core.drawThing(receta), {
            waiting: () => <ui-loader visible={true} inline={true} text={true} part="pantalla">{"Buscando tus recetas"}</ui-loader>,
            none: () => <es-texto class="none" color="gris" part="pantalla">
              {this.búsqueda === "" ? "Todavía no hay recetas. Agrega la primera." : "Ninguna receta coincide con tu búsqueda."}
            </es-texto>,
            failed: () => <es-mensaje class="failed" color="rojo" part="pantalla">
              No podemos llegar a tus recetas ahora mismo.
              <es-boton class="again" onClick={core.pressed(this, () => core.reloadSaved())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Reintentar
              </es-boton>
            </es-mensaje>
          })}
        </es-tarjetas>
      )
    }
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
    { name: "receta-nueva", kind: "json", description: "Its recetaNueva." },
    { name: "editando", kind: "string", description: "Its editando." }
  ])

  create() {
    return this.currentThing?.create()
  }

  agregarLaRecetaNueva() {
    return this.currentThing?.agregarLaRecetaNueva()
  }

  drawPantalla() {
    return this.currentThing?.drawPantalla()
  }
}
core.useElement(CajaDeRecetas, CajaDeRecetasElement)
export const cajaDeRecetas = new CajaDeRecetas()
// su "menú de la caja" es un menú de "deshacer"
core.describeMenu(CajaDeRecetas, "menúDeLaCaja", { items: ["undo"] })
// -----------
if (!core.isCarryingOver) cajaDeRecetas.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `EditorDeRecetaElement` */
      "test-project-editor-de-receta": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `CajaDeRecetasElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
