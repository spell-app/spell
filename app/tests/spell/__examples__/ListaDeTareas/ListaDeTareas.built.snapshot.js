import { core, App, View, ViewableList, Place, h, withSpellPositions } from "@spell/core"

export class Tarea extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("título", { type: "text" }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  static { this.declareProp("nota", { type: "text" }) }
  get nota() { return this.getProp("nota") }
  set nota(value) { this.setProp("nota", value) }

  static Prioridades = ["baja", "normal", "alta"]
  static { this.declareProp("prioridad", { oneOf: Tarea.Prioridades }) }
  get prioridad() { return this.getProp("prioridad") }
  set prioridad(value) { this.setProp("prioridad", value) }

  static { this.declareProp("hecha", { type: "choice" }) }
  get hecha() { return this.getProp("hecha") }
  set hecha(value) { this.setProp("hecha", value) }

  static { this.declareProp("orden", { type: "number" }) }
  get orden() { return this.getProp("orden") }
  set orden(value) { this.setProp("orden", value) }

  static { this.declareProp("estáHecha", { readsFrom: ["mis_tareas"] }) }
  get estáHecha() {
    return this.hecha
  }

  static { this.declareProp("estáPendiente", { readsFrom: ["mis_tareas"] }) }
  get estáPendiente() {
    return !this.hecha
  }

  tirar() {
    core.removeSaved(this)
  }

  draw() {
    return h("es-formulario", { "prop:value": this },
      h("es-pila", { direccion: "horizontal", separacion: "sm" },
        h("es-icono", { name: "grip vertical", color: "grey", "aria-label": "Arrastrar" }),
        h("es-casilla", { name: "hecha", "aria-label": "Hecha" }),
        h("es-entrada", { part: "title", name: "título", "aria-label": "Tarea", apariencia: "transparent", fluido: true }),
        h("es-etiqueta", {
          tamano: "diminuto",
          color: () => this.prioridad === "alta" ? "red" : "grey",
          hidden: () => this.prioridad !== "normal" ? undefined : true
        }, () => this.prioridad)
      )
    )
  }

  static selectable = true

  static draggable = true

  static savedIn = {
    place: "mis_tareas",
    collection: "tareas",
    times: ["created", "modified"]
  }

  static { this.declareProp("creado", { type: "date", storedAs: "created" }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  static { this.declareProp("modificado", { type: "date", storedAs: "modified" }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }

  get agenda() {
    return Agenda.ownerOf(this)
  }

  get últimaAgenda() {
    return Agenda.lastOwnerOf(this)
  }
}
core.describeAction(Tarea, "tirar", { title: "Tirarla", undoneAs: "Tirarla" })

export function testMarcarUna() {
  return core.test("test marcar una", function testMarcarUna() {
    const it = new Tarea()
    core.echoTestAction(`poner la tarea a una nueva tarea con título "Escribir las pruebas"`)
    const tarea = new Tarea({ título: "Escribir las pruebas" })
    core.expect(tarea.estáPendiente, `la tarea está pendiente`, true, `sí`)
    core.echoTestAction(`poner la hecha de la tarea a sí`)
    tarea.hecha = true
    core.expect(tarea.estáHecha, `la tarea está hecha`, true, `sí`)
  })
}
// -----------
export class MisTareas extends Place {}
export const misTareas = core.place(new MisTareas(), {
  name: "mis_tareas",
  kind: "database on this device",
  unclearNumbers: ","
})
// -----------
export class Agenda extends ViewableList {
  static instanceType = Tarea
  static elementTag = core.defineElement(this, "test-project")

  static Mostrandos = ["todas", "pendientes", "hechas"]
  static { this.declareProp("mostrando", { oneOf: Agenda.Mostrandos }) }
  get mostrando() { return this.getProp("mostrando") }
  set mostrando(value) { this.setProp("mostrando", value) }
  estáMostrandoMostrando(mostrando) {
    return this.mostrando === mostrando
  }

  whenTareaDroppedOn(tarea) {
    this.guardarElOrden()
  }

  drawEachItem(item) {
    if (this.estáMostrandoMostrando("pendientes") && item.estáHecha) return undefined
    if (this.estáMostrandoMostrando("hechas") && item.estáPendiente) return undefined
    return core.drawThing(item)
  }

  draw() {
    return h("es-pila", { separacion: "xs" },
      h("es-texto", { color: "grey", hidden: () => this.isEmpty ? undefined : true }, "Nada por hacer"),
      h("slot")
    )
  }

  guardarElOrden() {
    this.forEach(withSpellPositions((tarea, lugar) => (tarea.orden = lugar)))
  }

  static reorderItemsAfter = 0

  static exclusive = true
}
core.describeAction(Agenda, "guardarElOrden", { title: "Guardar el Orden", undoneAs: "Guardar el Orden" })

export function testElFiltro() {
  return core.test("test el filtro", function testElFiltro() {
    const it = new Agenda()
    core.echoTestAction(`poner la lista a una nueva agenda`)
    const lista = new Agenda()
    core.echoTestAction(`agregar (una nueva tarea con título "a", hecha = sí) a la lista`)
    lista.append(new Tarea({ título: "a", hecha: true }))
    core.echoTestAction(`agregar (una nueva tarea con título "b") a la lista`)
    lista.append(new Tarea({ título: "b" }))
    core.expect(lista.filter((tarea) => tarea.estáPendiente).length, `el largo de (tareas en la lista donde está pendiente)`, 1, `1`)
  })
}
export function testUnOrdenArrastradoSeGuarda() {
  return core.test("test un orden arrastrado se guarda", function testUnOrdenArrastradoSeGuarda() {
    const it = new Agenda()
    core.echoTestAction(`poner la lista a una nueva agenda`)
    const lista = new Agenda()
    core.echoTestAction(`poner la primera a una nueva tarea con título "primera"`)
    const primera = new Tarea({ título: "primera" })
    core.echoTestAction(`poner la segunda a una nueva tarea con título "segunda"`)
    const segunda = new Tarea({ título: "segunda" })
    core.echoTestAction(`agregar la segunda a la lista`)
    lista.append(segunda)
    core.echoTestAction(`agregar la primera a la lista`)
    lista.append(primera)
    core.echoTestAction(`guardar el orden de la lista`)
    lista.guardarElOrden()
    core.expect(segunda.orden, `el orden de la segunda`, 1, `1`)
    core.expect(primera.orden, `el orden de la primera`, 2, `2`)
    core.expect(core.getItemAt(core.sortedBy(lista, (item) => item.orden), 0)?.título, `el título de la primera tarea en (la lista ordenada por su orden)`, "segunda", `"segunda"`)
  })
}

export class ListaDeTareas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("agenda", { init: () => new Agenda({ id: "agenda" }), early: true }) }
  get agenda() { return this.getProp("agenda") }
  set agenda(value) { this.setProp("agenda", value) }

  static { this.declareProp("borrador", { type: "text" }) }
  get borrador() { return this.getProp("borrador") }
  set borrador(value) { this.setProp("borrador", value) }

  static { this.declareProp("cuentaPendiente", { readsFrom: ["mis_tareas"] }) }
  get cuentaPendiente() {
    return this.agenda.filter((tarea) => tarea.estáPendiente).length
  }

  async llenarLaAgenda() {
    core.clear(this.agenda)
    core.map(core.sortedBy(await core.savedThings(Tarea), (item) => item.orden), (tarea) => this.agenda.append(tarea))
    if (!this.agenda.isEmpty) return
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Escribir el ejemplo Lista de tareas", "alta")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Enseñarle a dibujar", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Seleccionar unas tareas, y editarlas juntas", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Arrastrar tareas para reordenarlas", "baja")
    this.agenda.firstItem.hecha = true
  }

  create() {
    this.agenda.mostrando = "todas"
    core.holdWhile(() => this.llenarLaAgenda())
  }

  agregarLaTareaInicialTítuloConPrioridadNivel(título, nivel) {
    const tarea = new Tarea({ título: título, prioridad: nivel })
    core.saveThing(tarea)
    this.agenda.append(tarea)
    tarea.orden = this.agenda.length
  }

  agregarElBorrador() {
    if (this.borrador === "") return
    const tarea = new Tarea({ título: this.borrador, prioridad: "normal" })
    core.saveThing(tarea)
    this.agenda.append(tarea)
    tarea.orden = this.agenda.length
    this.borrador = ""
  }

  mostrarTodas() {
    this.agenda.mostrando = "todas"
  }
  get mostrarTodasIsSelected() {
    return this.agenda.estáMostrandoMostrando("todas")
  }

  mostrarPendientes() {
    this.agenda.mostrando = "pendientes"
  }
  get mostrarPendientesIsSelected() {
    return this.agenda.estáMostrandoMostrando("pendientes")
  }

  mostrarHechas() {
    this.agenda.mostrando = "hechas"
  }
  get mostrarHechasIsSelected() {
    return this.agenda.estáMostrandoMostrando("hechas")
  }

  quitarLasTareasHechas() {
    this.agenda.filter((tarea) => tarea.estáHecha).forEach((tarea) => {
      tarea.tirar()
      this.agenda.remove(tarea)
    })
  }

  draw() {
    return h("es-contenedor",
      h("es-pila",
        h("es-barra-herramientas", { menu: "menú de tareas", "aria-label": "Tareas" },
          h("es-texto", { slot: "titulo", tamano: "large" }, "Lista de tareas"),
          h("es-texto", { slot: "derecha" },
            h("span", { hidden: () => this.cuentaPendiente === 0 ? undefined : "until-found" }, "Todo hecho"),
            h("span", { hidden: () => !(this.cuentaPendiente === 0) ? undefined : "until-found" },
              () => this.cuentaPendiente,
              " pendientes"
            )
          )
        ),
        h("es-formulario", { "prop:value": this },
          h("es-entrada", {
            name: "borrador",
            marcador: "Algo por hacer",
            "aria-label": "Nueva tarea",
            fluido: true,
            accion: true
          },
            h("es-boton", {
              slot: "accion",
              color: "primario",
              disabled: () => this.borrador === "",
              onClick: core.pressed(this, () => this.agregarElBorrador()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Agregar")
          )
        ),
        h("es-cuadricula", { columnas: "2", apilable: true, "context-menu": "menú de la lista" },
          () => core.drawThing(this.agenda),
          h("es-editor-propiedades", {
            etiqueta: "Tareas seleccionadas",
            esquema: "lista-de-tareas-tarea",
            "prop:value": () => this.agenda.selection
          },
            h("es-propiedad", { name: "título" }),
            h("es-propiedad", { name: "prioridad" }),
            h("es-propiedad", { name: "hecha" }),
            h("es-propiedad", { name: "nota" })
          )
        )
      )
    )
  }
}
export const listaDeTareas = new ListaDeTareas()
core.describeAction(ListaDeTareas, "llenarLaAgenda", { title: "Llenar la Agenda", undoneAs: "Llenar la Agenda" })
core.describeAction(ListaDeTareas, "agregarLaTareaInicialTítuloConPrioridadNivel", { title: "Agregar la Tarea Inicial Título con Prioridad Nivel", undoneAs: "Agregar la Tarea Inicial Título con Prioridad Nivel" })
core.describeAction(ListaDeTareas, "agregarElBorrador", { title: "Agregar el Borrador", undoneAs: "Agregar el Borrador" })
core.describeAction(ListaDeTareas, "mostrarTodas", { title: "Todas", icon: "list", selectedWhen: "mostrarTodasIsSelected", undoneAs: "Todas" })
core.describeAction(ListaDeTareas, "mostrarPendientes", { title: "Pendientes", icon: "square outline", selectedWhen: "mostrarPendientesIsSelected", undoneAs: "Pendientes" })
core.describeAction(ListaDeTareas, "mostrarHechas", { title: "Hechas", icon: "check square outline", selectedWhen: "mostrarHechasIsSelected", undoneAs: "Hechas" })
core.describeAction(ListaDeTareas, "quitarLasTareasHechas", { title: "Quitar las tareas hechas", icon: "trash alternate outline", undoneAs: "Quitar las tareas hechas" })

core.describeMenu(ListaDeTareas, "menúDeTareas", { items: ["mostrarTodas", "mostrarPendientes", "mostrarHechas", "-", "quitarLasTareasHechas"] })
core.describeMenu(ListaDeTareas, "menúMostrar", { items: ["mostrarTodas", "mostrarPendientes", "mostrarHechas"], title: "Mostrar" })
core.describeMenu(ListaDeTareas, "menúDeLaLista", { items: ["menúMostrar", "-", "quitarLasTareasHechas"] })
// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet.¬   - Each task is an element of its own inside the list, <lista-de-tareas-agenda>:  <lista-de-tareas-tarea>.¬   - Its title's field fills the row by itself:  it's \`fluid\`, in a row of a \`<stack>\`. */¬¬/* done:  it fades */¬lista-de-tareas-agenda > [hecha] {¬  opacity: 0.6;¬}¬`)
// -----------
if (!core.isCarryingOver) listaDeTareas.start()
// -----------
if (!core.isCarryingOver) testMarcarUna()
if (!core.isCarryingOver) testElFiltro()
if (!core.isCarryingOver) testUnOrdenArrastradoSeGuarda()
