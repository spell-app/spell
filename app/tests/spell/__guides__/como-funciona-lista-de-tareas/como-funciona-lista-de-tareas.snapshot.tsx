import { core, List, App, View, ViewableList, prop, derived, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Cómo funciona Lista de tareas")
///////////////////////////////////
// ## Cómo funciona Lista de tareas
///////////////////////////////////
// El ejemplo Lista de tareas es una lista de cosas por hacer:  escribe una tarea, márcala cuando esté hecha,
// y elige si ver todas, solo las pendientes, o solo las hechas.
// Está escrito en español:  cada línea de código también.
// Tres ideas hacen el trabajo:
// - cada tarea es una COSA propia, que se dibuja como una fila con una casilla
// - la lista elige tareas con "donde":  "tareas en sus tareas donde está pendiente"
// - la lista dibuja cada tarea, o la salta, según dice su filtro
//
// Esta guía tiene esas tres, sin arrastrar, seleccionar, el editor de propiedades,
// ni dónde se guardan las tareas:  aquí están en memoria, y empiezan de nuevo cada vez.
// Abre Lista de tareas, en los Ejemplos, para verlo todo.  Task List es la misma lista, en inglés.

core.heading("Una tarea")
/** Una tarea */
export class Tarea extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  @prop({ type: "text" })
  accessor título!: string

  // su "hecha" es sí o no
  @prop({ type: "choice" })
  accessor hecha!: boolean

  get estáHecha() {
    return this.hecha
  }

  get estáPendiente() {
    return !this.hecha
  }

  // un formulario propio, unido a la tarea:  marcar la casilla cambia su "hecha"
  @drawn draw() {
    return (
      <es-formulario value={this}>
        <es-pila direccion="horizontal" separacion="sm">
          <es-casilla name="hecha" aria-label="Hecha" />
          <es-texto>{this.título}</es-texto>
        </es-pila>
      </es-formulario>
    )
  }

  get agenda() {
    return Agenda.ownerOf(this)!
  }
}

/**
 * `<test-project-tarea>`:  a tarea, drawn in its own element, e.g. by `draw the tarea`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its tarea's properties;  its methods call its tarea's.
 * - What every view's element does, e.g. drawing its tarea, is `SpellElement`'s.
 */
export class TareaElement extends SpellElement<Tarea> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-tarea", "tarea", [
    { name: "título", kind: "string", description: "Its título." },
    { name: "hecha", kind: "boolean", description: "Its hecha." }
  ])
}
core.useElement(Tarea, TareaElement)

core.heading("La agenda:  las tareas, mostradas según su filtro")
export type Mostrando = (typeof Agenda.Mostrandos)[number]

/** La agenda:  las tareas, mostradas según su filtro */
export class Agenda extends ViewableList<Tarea> {
  static instanceType = Tarea
  static elementTag = core.defineElement(this, "test-project")

  /** lo que muestra:  todas las tareas, las pendientes, o las hechas */
  // su "mostrando" es una de todas, pendientes o hechas
  static Mostrandos = ["todas", "pendientes", "hechas"] as const
  @prop({ oneOf: () => Agenda.Mostrandos })
  accessor mostrando!: Mostrando

  // cada tarea, salvo que el filtro la oculte:  "devolver nada" no dibuja nada
  drawEachItem(item: Tarea) {
    if (this.mostrando === "pendientes" && item.estáHecha) return undefined
    if (this.mostrando === "hechas" && item.estáPendiente) return undefined
    return core.drawThing(item)
  }

  static exclusive = true
}

/**
 * `<test-project-agenda>`:  an agenda, drawn in its own element, e.g. by `draw the agenda`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its agenda's properties;  its methods call its agenda's.
 * - What every view's element does, e.g. drawing its agenda, is `SpellElement`'s.
 */
export class AgendaElement extends SpellElement<Agenda> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-agenda", "agenda", [
    { name: "mostrando", kind: "string", description: "Its mostrando." }
  ])

  drawEachItem(item: Tarea) {
    return this.currentThing?.drawEachItem(item)
  }
}
core.useElement(Agenda, AgendaElement)


core.heading("La aplicación")
/** La aplicación */
export class ListaDeTareas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // sus "tareas" es una nueva agenda
  @prop({ init: () => new Agenda(), early: true })
  accessor tareas!: Agenda

  /** cuántas quedan:  las tareas elegidas con "donde", contadas */
  @derived get cuentaPendiente() {
    return this.tareas.filter((tarea) => tarea.estáPendiente).length
  }

  @drawn draw() {
    return (
      <es-contenedor texto={true}>
        <es-menu apariencia="secundario">
          <es-elemento clase="encabezado">{`${this.cuentaPendiente} pendientes`}</es-elemento>
          <es-elemento seleccionado={this.tareas.mostrando === "todas"} onClick={core.pressed(this, () => (this.tareas.mostrando = "todas"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Todas
          </es-elemento>
          <es-elemento seleccionado={this.tareas.mostrando === "pendientes"} onClick={core.pressed(this, () => (this.tareas.mostrando = "pendientes"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Pendientes
          </es-elemento>
          <es-elemento seleccionado={this.tareas.mostrando === "hechas"} onClick={core.pressed(this, () => (this.tareas.mostrando = "hechas"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Hechas
          </es-elemento>
        </es-menu>
        {core.drawThing(this.tareas)}
      </es-contenedor>
    )
  }
}

/**
 * `<test-project-app>`:  a lista de tareas, drawn in its own element, e.g. by `draw the lista de tareas`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its lista de tareas's properties;  its methods call its lista de tareas's.
 * - What every view's element does, e.g. drawing its lista de tareas, is `SpellElement`'s.
 */
export class ListaDeTareasElement extends SpellElement<ListaDeTareas> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "lista de tareas", [
    { name: "tareas", kind: "json", description: "Its tareas." }
  ])
}
core.useElement(ListaDeTareas, ListaDeTareasElement)
export const listaDeTareas = new ListaDeTareas()

core.heading("Inicio:  tres tareas, una de ellas hecha")
//## Inicio:  tres tareas, una de ellas hecha
listaDeTareas.tareas.mostrando = "todas"
listaDeTareas.tareas.append(new Tarea({ título: "Leer esta guía", hecha: true }))
listaDeTareas.tareas.append(new Tarea({ título: "Marcar una casilla a la derecha" }))
listaDeTareas.tareas.append(new Tarea({ título: "Probar el filtro Pendientes" }))

core.heading("Una prueba")
/** Una prueba */
export function testLaCuentaPendiente() {
  return core.test("test la cuenta pendiente", function testLaCuentaPendiente() {
    core.echoTestAction(`poner la lista a una nueva agenda`)
    const lista = new Agenda()
    core.echoTestAction(`agregar (una nueva tarea con título = "a", hecha = sí) a la lista`)
    lista.append(new Tarea({ título: "a", hecha: true }))
    core.echoTestAction(`agregar (una nueva tarea con título = "b") a la lista`)
    lista.append(new Tarea({ título: "b" }))
    core.expect(lista.filter((tarea) => tarea.estáPendiente).length, `el largo de (tareas en la lista donde está pendiente)`, 1, `1`)
  })
}

core.heading("Pruébalo")
//////////////
// ## Pruébalo
//////////////
// - Marca "Marcar una casilla a la derecha":  la cuenta del menú baja a 1.
// - Haz clic en "Pendientes", luego en "Hechas":  la lista muestra solo las tareas que encajan.
// - Agrega una tarea:  copia una de las líneas "agregar" del Inicio, y cambia su título.
//
// Y después:  Lista de tareas, en los Ejemplos, donde escribes tareas nuevas, las arrastras para ordenarlas,
// y seleccionas varias para cambiarlas todas a la vez.

core.heading("Dónde guarda sus tareas el ejemplo")
////////////////////////////////////////
// ## Dónde guarda sus tareas el ejemplo
////////////////////////////////////////
// Las tareas de esta guía viven en memoria:  recarga, y empiezan otra vez.
// Lista de tareas las guarda en uno de cuatro lugares, el que la persona elige en "Guardarlas en", sobre la lista:
// - Este navegador, con el que empieza:  "almacén del navegador es una base de datos en este dispositivo"
// - Un archivo JSON en el servidor, un archivo por tarea:  "archivos de tareas es una carpeta de datos en "tareas""
// - Un archivo CSV en el servidor, una fila por tarea:  "hoja de tareas es una hoja en "tareas.csv"", el archivo propio del proyecto
// - Tu cuenta de atmosphere, el AT Protocol de Bluesky, como Statusphere:  "cielo de tareas es una cuenta personal de atmosphere"
//
// Cada lugar es un archivo de API propio, y cada uno tiene un GUARDIÁN con las mismas tres cosas:
//       - sus "tareas guardadas" es cada tarea del navegador
//       - para apuntar (título como texto):
//           poner tarea a una nueva tarea del navegador con título = título
//           agregar tarea a las tareas del navegador
//           devolver tarea
// y su clase de tarea dice cómo se tira:
//       una "tarea del navegador" es una tarea:
//           - vive en almacén del navegador
//           - para tirarla:
//               quitar eso de las tareas del navegador
//
// La aplicación nunca nombra un lugar.  Le pregunta a su guardián:
//       para tarea en las tareas guardadas de su guardián
//       poner tarea a apuntar (el borrador) de su guardián
//       tirar la tarea
// Elegir otro lugar en "Guardarlas en" cambia su "almacén";  "cuando su almacén cambia", la aplicación toma el guardián
// de ese lugar, y llena la lista con sus tareas.  Una tarea guardada en cualquier lugar se guarda sola al cambiar:
// no hay paso de guardar.
// -----------
if (!core.isCarryingOver) listaDeTareas.start()
// -----------
if (!core.isCarryingOver) testLaCuentaPendiente()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `TareaElement` */
      "test-project-tarea": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `AgendaElement` */
      "test-project-agenda": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ListaDeTareasElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
