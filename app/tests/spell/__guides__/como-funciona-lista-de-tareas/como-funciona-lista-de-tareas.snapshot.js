import { core, List, App, View, ViewableList, h } from "@spell/core"

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
  static { this.declareProp("título", { type: "text" }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  // su "hecha" es sí o no
  static { this.declareProp("hecha", { type: "choice" }) }
  get hecha() { return this.getProp("hecha") }
  set hecha(value) { this.setProp("hecha", value) }

  get estáHecha() {
    return this.hecha
  }

  get estáPendiente() {
    return !this.hecha
  }

  draw() {
    // un formulario propio, unido a la tarea:  marcar la casilla cambia su "hecha"
    return h("es-formulario", { "prop:value": this },
      h("es-pila", { direccion: "horizontal", separacion: "sm" },
        h("es-casilla", { name: "hecha", "aria-label": "Hecha" }),
        h("es-texto", () => this.título)
      )
    )
  }

  get agenda() {
    return Agenda.ownerOf(this)
  }

  get últimaAgenda() {
    return Agenda.lastOwnerOf(this)
  }
}

core.heading("La agenda:  las tareas, mostradas según su filtro")
/** La agenda:  las tareas, mostradas según su filtro */
export class Agenda extends ViewableList {
  static instanceType = Tarea
  static elementTag = core.defineElement(this, "test-project")

  /** lo que muestra:  todas las tareas, las pendientes, o las hechas */
  // su "mostrando" es una de todas, pendientes o hechas
  static Mostrandos = ["todas", "pendientes", "hechas"]
  static { this.declareProp("mostrando", { oneOf: Agenda.Mostrandos }) }
  get mostrando() { return this.getProp("mostrando") }
  set mostrando(value) { this.setProp("mostrando", value) }

  drawEachItem(item) {
    // cada tarea, salvo que el filtro la oculte:  "devolver nada" no dibuja nada
    if (this.mostrando === "pendientes" && item.estáHecha) return undefined
    if (this.mostrando === "hechas" && item.estáPendiente) return undefined
    return core.drawThing(item)
  }

  static exclusive = true
}

core.heading("La aplicación")
/** La aplicación */
export class ListaDeTareas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // sus "tareas" es una nueva agenda
  static { this.declareProp("tareas", { init: () => new Agenda({ id: "tareas" }), early: true }) }
  get tareas() { return this.getProp("tareas") }
  set tareas(value) { this.setProp("tareas", value) }

  /** cuántas quedan:  las tareas elegidas con "donde", contadas */
  get cuentaPendiente() {
    return this.tareas.filter((tarea) => tarea.estáPendiente).length
  }

  draw() {
    return h("es-contenedor", { texto: true },
      h("es-menu", { apariencia: "secundario" },
        h("es-elemento", { clase: "encabezado" }, () => `${this.cuentaPendiente} pendientes`),
        h("es-elemento", {
          seleccionado: () => this.tareas.mostrando === "todas",
          onClick: core.pressed(this, () => (this.tareas.mostrando = "todas")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Todas"),
        h("es-elemento", {
          seleccionado: () => this.tareas.mostrando === "pendientes",
          onClick: core.pressed(this, () => (this.tareas.mostrando = "pendientes")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Pendientes"),
        h("es-elemento", {
          seleccionado: () => this.tareas.mostrando === "hechas",
          onClick: core.pressed(this, () => (this.tareas.mostrando = "hechas")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Hechas")
      ),
      () => core.drawThing(this.tareas)
    )
  }
}
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
// Lista de tareas las guarda en este dispositivo, en el almacenamiento propio del navegador:  recarga, y siguen ahí.
// No se le pregunta a ningún servidor, y no hay que iniciar sesión.  Dos líneas, en su archivo de API, lo dicen:
//       mis tareas se guarda en este dispositivo
//       una tarea vive en mis tareas
// Después de ellas, las palabras que ya conoces llegan al dispositivo:
//       para tarea en (cada tarea) ordenadas por su orden
//       agregar tarea a las tareas
//       quitar eso de las tareas
// Una tarea guardada allí se guarda sola al cambiar:  marcarla, o escribir su título, queda guardado, sin paso de guardar.
// Su lugar en la lista se guarda igual, como su "orden":  al soltar, cada tarea toma su lugar como orden,
//       - cuando una tarea se suelta sobre ella:
//           guardar el orden
// así las tareas vuelven en el orden en que se arrastraron.
// Guardarlas en otro lugar, una carpeta de datos en el servidor, una hoja, una cuenta de atmosphere, es cambiar la primera línea:
// nada más cambia.
// -----------
if (!core.isCarryingOver) listaDeTareas.start()
// -----------
if (!core.isCarryingOver) testLaCuentaPendiente()
