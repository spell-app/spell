import { core, App, View, ViewableList, Place, prop, derived, thing, drawn, withSpellPositions } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Una tarea")
///////////////
// ## Una tarea
///////////////
// Algo por hacer:  su título, su prioridad, y si está hecha.
// Cada tarea es un elemento propio en la página, `<lista-de-tareas-tarea>`.
// Un clic la selecciona, mayúsculas y comando (ctrl) seleccionan más, para el editor de propiedades (`seleccionable`);
// arrastrarla la mueve, y las seleccionadas van con ella (`arrastrable`).

export type Prioridad = (typeof Tarea.Prioridades)[number]

export class Tarea extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Lo que hay que hacer */
  // su "título" es texto
  @prop({ type: "text", declaredAt: { path: "/Tarea.es.spell", start: 399, end: 445 } })
  accessor título!: string

  /** Cualquier otra cosa sobre ella */
  // su "nota" es texto
  @prop({ type: "text", declaredAt: { path: "/Tarea.es.spell", start: 447, end: 501 } })
  accessor nota!: string

  // su "prioridad" es uno de baja, normal o alta
  static Prioridades = ["baja", "normal", "alta"] as const
  @prop({ oneOf: () => Tarea.Prioridades, declaredAt: { path: "/Tarea.es.spell", start: 503, end: 547 } })
  accessor prioridad!: Prioridad

  // su "hecha" es sí o no
  @prop({ type: "choice", declaredAt: { path: "/Tarea.es.spell", start: 549, end: 570 } })
  accessor hecha!: boolean

  /** Dónde está en su agenda, desde 1:  se guarda con ella, así que el orden en que la gente arrastra las tareas vuelve */
  // su "orden" es número
  @prop({ type: "number", declaredAt: { path: "/Tarea.es.spell", start: 572, end: 712 } })
  accessor orden!: number

  static { this.declareProp("estáHecha", { declaredAt: { path: "/Tarea.es.spell", start: 714, end: 744 }, readsFrom: ["mis_tareas"] }) }
  get estáHecha() {
    return this.hecha
  }

  static { this.declareProp("estáPendiente", { declaredAt: { path: "/Tarea.es.spell", start: 746, end: 780 }, readsFrom: ["mis_tareas"] }) }
  get estáPendiente() {
    return !this.hecha
  }

  /** Fuera de donde se guarda, y también de la lista */
  tirar() {
    core.removeSaved(this)
  }

  @drawn draw() {
    // Un formulario propio, unido a ella:  marcar la casilla, o escribir un título, cambia la tarea;  su prioridad se muestra solo cuando no es normal
    return (
      <es-formulario prop:value={this}>
        <es-pila direccion="horizontal" separacion="sm">
          <es-icono name="grip vertical" color="grey" aria-label="Arrastrar" />
          <es-casilla name="hecha" aria-label="Hecha" />
          <es-entrada part="title" name="título" aria-label="Tarea" apariencia="transparent" fluido={true} />
          {core.drawIf(() => this.prioridad !== "normal", () => <>
            <es-etiqueta tamano="diminuto" color={this.prioridad === "alta" ? "red" : "grey"}>{this.prioridad}</es-etiqueta>
          </>)}
        </es-pila>
      </es-formulario>
    )
  }

  static selectable = true

  static draggable = true

  static savedIn = {
    place: "mis_tareas",
    collection: "tareas",
    times: ["created", "modified"]
  }

  // una tarea vive en mis tareas
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.api.es.spell", start: 456, end: 484 } })
  accessor creado!: any /* spell: type unknown */

  // una tarea vive en mis tareas
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.api.es.spell", start: 456, end: 484 } })
  accessor modificado!: any /* spell: type unknown */

  /** una tarea está en una sola agenda a la vez */
  static { this.declareProp("agenda", { declaredAt: { path: "/ListaDeTareas.es.spell", start: 2354, end: 2386 } }) }
  get agenda() {
    return Agenda.ownerOf(this)!
  }

  static { this.declareProp("últimaAgenda", { declaredAt: { path: "/ListaDeTareas.es.spell", start: 2354, end: 2386 } }) }
  get últimaAgenda() {
    return Agenda.lastOwnerOf(this)
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
    { name: "nota", kind: "string", description: "Its nota." },
    { name: "prioridad", kind: "string", description: "Its prioridad." },
    { name: "hecha", kind: "boolean", description: "Its hecha." },
    { name: "orden", kind: "number", description: "Its orden." },
    { name: "creado", kind: "json", description: "Its creado." },
    { name: "modificado", kind: "json", description: "Its modificado." }
  ])

  tirar() {
    return this.currentThing?.tirar()
  }
}
core.useElement(Tarea, TareaElement)
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
core.heading("Lista de tareas:  dónde se guardan las tareas")
///////////////////////////////////////////////////
// ## Lista de tareas:  dónde se guardan las tareas
///////////////////////////////////////////////////
/**
 * En este dispositivo, en el almacenamiento propio de este navegador:  nadie más las ve, no se le pregunta a ningún servidor, y no hay que iniciar sesión.
 * Una tarea se guarda sola al cambiar:  marcarla, escribir su título, o arrastrarla a su lugar queda guardado, sin paso de guardar.
 * Cambia la primera línea para guardarlas en otro lugar, y nada más cambia.
 */
export class MisTareas extends Place {}
export const misTareas = core.place(new MisTareas(), {
  name: "mis_tareas",
  kind: "database on this device",
  unclearNumbers: ","
})
// -----------
core.heading("Lista de tareas")
/////////////////////
// ## Lista de tareas
/////////////////////
// Una lista de cosas por hacer:  agrega una tarea, márcala, filtra la lista, y edita juntas las tareas seleccionadas.
// Sus tareas son la `tarea` de este proyecto, en Tarea.es.spell;  este archivo tiene su lista, y la aplicación.
// Se guardan en este dispositivo, así que siguen ahí la próxima vez:  ListaDeTareas.api.es.spell dice dónde.

core.heading("La agenda")
///////////////
// ## La agenda
///////////////
// Las tareas, cada una un elemento propio dentro de ella:  `<lista-de-tareas-agenda>`, alrededor de sus `<lista-de-tareas-tarea>`.

export type Mostrando = (typeof Agenda.Mostrandos)[number]

export class Agenda extends ViewableList<Tarea> {
  static instanceType = Tarea
  static elementTag = core.defineElement(this, "test-project")

  /** Lo que muestra:  todas las tareas, las pendientes, o las hechas */
  // su "mostrando" es uno de todas, pendientes o hechas
  //   "está mostrando (mostrando)"
  static Mostrandos = ["todas", "pendientes", "hechas"] as const
  @prop({ oneOf: () => Agenda.Mostrandos })
  accessor mostrando!: Mostrando
  estáMostrandoMostrando(mostrando: Mostrando) {
    return this.mostrando === mostrando
  }

  /** soltar movió sus tareas:  cada una guarda su nuevo lugar */
  whenTareaDroppedOn(tarea: Tarea) {
    this.guardarElOrden()
  }

  drawEachItem(item: Tarea) {
    // cada tarea, salvo que el filtro la oculte
    if (this.estáMostrandoMostrando("pendientes") && item.estáHecha) return undefined
    if (this.estáMostrandoMostrando("hechas") && item.estáPendiente) return undefined
    return core.drawThing(item)
  }

  @drawn draw() {
    // Sus tareas una debajo de otra;  vacía, una línea que lo dice
    return (
      <es-pila separacion="xs">
        {core.drawIf(() => this.isEmpty, () => <>
          <es-texto color="grey">Nada por hacer</es-texto>
        </>)}
        <slot />
      </es-pila>
    )
  }

  /** Cada tarea guarda su lugar en la lista, desde 1, donde se guarda:  así el orden en que la gente las arrastra vuelve la próxima vez */
  guardarElOrden() {
    this.forEach(withSpellPositions((tarea, lugar) => (tarea.orden = lugar)))
  }

  static reorderItemsAfter = 0

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

  estáMostrandoMostrando(mostrando: Mostrando) {
    return this.currentThing?.estáMostrandoMostrando(mostrando)
  }

  whenTareaDroppedOn(tarea: Tarea) {
    return this.currentThing?.whenTareaDroppedOn(tarea)
  }

  drawEachItem(item: Tarea) {
    return this.currentThing?.drawEachItem(item)
  }

  guardarElOrden() {
    return this.currentThing?.guardarElOrden()
  }
}
core.useElement(Agenda, AgendaElement)
core.describeAction(Agenda, "guardarElOrden", { title: "Guardar el Orden", undoneAs: "Guardar el Orden" })

// en la página, sus tareas se pueden arrastrar a otro lugar:  se mueven con el puntero, deslizándose

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
    core.expect(core.getItemAt(core.sortedBy(lista, (item: Tarea) => item.orden), 0)?.título!, `el título de la primera tarea en (la lista ordenada por su orden)`, "segunda", `"segunda"`)
  })
}

core.heading("La aplicación")
///////////////////
// ## La aplicación
///////////////////
// Su barra de herramientas, el campo de la nueva tarea, y luego la lista junto al editor de propiedades.

@thing
export class ListaDeTareas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "agenda" es una nueva agenda
  @prop({ init: () => new Agenda({ id: "agenda" }), early: true })
  accessor agenda!: Agenda

  /** El título de la siguiente tarea, como lo tiene el campo de la nueva tarea */
  // su "borrador" es texto
  @prop({ type: "text" })
  accessor borrador!: string

  static { this.declareProp("cuentaPendiente", { declaredAt: { path: "/ListaDeTareas.es.spell", start: 2727, end: 2806 }, readsFrom: ["mis_tareas"] }) }
  @derived get cuentaPendiente() {
    return this.agenda.filter((tarea) => tarea.estáPendiente).length
  }

  /** Las tareas guardadas en este dispositivo, en su orden;  la primera vez, sin ninguna guardada, unas cuantas para empezar */
  async llenarLaAgenda() {
    core.clear(this.agenda)
    core.map(core.sortedBy(await core.savedThings(Tarea), (item: Tarea) => item.orden), (tarea: Tarea) => this.agenda.append(tarea))
    if (!this.agenda.isEmpty) return
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Escribir el ejemplo Lista de tareas", "alta")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Enseñarle a dibujar", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Seleccionar unas tareas, y editarlas juntas", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Arrastrar tareas para reordenarlas", "baja")
    this.agenda.firstItem!.hecha = true
  }

  /** Una lista de tareas nueva muestra todas sus tareas */
  create() {
    this.agenda.mostrando = "todas"
    core.holdWhile(() => this.llenarLaAgenda())
  }

  agregarLaTareaInicialTítuloConPrioridadNivel(título: string, nivel: string) {
    const tarea = new Tarea({ título: título, prioridad: nivel })
    core.saveThing(tarea)
    this.agenda.append(tarea)
    tarea.orden = this.agenda.length
  }

  /** El borrador, como una nueva tarea al final de la lista;  el campo se vacía */
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

  @drawn draw() {
    // El editor de propiedades edita todas las tareas seleccionadas a la vez:  una propiedad en la que no coinciden muestra Varios
    return (
      <es-contenedor>
        <es-pila>
          <es-barra-herramientas menu="menú de tareas" aria-label="Tareas">
            <es-texto slot="titulo" tamano="large">Lista de tareas</es-texto>
            <es-texto slot="derecha">
              {core.drawIf(() => this.cuentaPendiente === 0, () => <>Todo hecho</>, () => <>{this.cuentaPendiente} pendientes</>)}
            </es-texto>
          </es-barra-herramientas>
          <es-formulario prop:value={this}>
            <es-entrada name="borrador" marcador="Algo por hacer" aria-label="Nueva tarea" fluido={true} accion={true}>
              <es-boton slot="accion" color="primario" disabled={this.borrador === ""} onClick={core.pressed(this, () => this.agregarElBorrador())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Agregar
              </es-boton>
            </es-entrada>
          </es-formulario>
          <es-cuadricula columnas="2" apilable={true} context-menu="menú de la lista">
            {core.drawThing(this.agenda)}
            <es-editor-propiedades etiqueta="Tareas seleccionadas" esquema="lista-de-tareas-tarea" prop:value={this.agenda.selection}>
              <es-propiedad name="título" />
              <es-propiedad name="prioridad" />
              <es-propiedad name="hecha" />
              <es-propiedad name="nota" />
            </es-editor-propiedades>
          </es-cuadricula>
        </es-pila>
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
    { name: "agenda", kind: "json", description: "Its agenda." },
    { name: "borrador", kind: "string", description: "Its borrador." }
  ])

  llenarLaAgenda() {
    return this.currentThing?.llenarLaAgenda()
  }

  create() {
    return this.currentThing?.create()
  }

  agregarLaTareaInicialTítuloConPrioridadNivel(título: string, nivel: string) {
    return this.currentThing?.agregarLaTareaInicialTítuloConPrioridadNivel(título, nivel)
  }

  agregarElBorrador() {
    return this.currentThing?.agregarElBorrador()
  }

  mostrarTodas() {
    return this.currentThing?.mostrarTodas()
  }

  mostrarPendientes() {
    return this.currentThing?.mostrarPendientes()
  }

  mostrarHechas() {
    return this.currentThing?.mostrarHechas()
  }

  quitarLasTareasHechas() {
    return this.currentThing?.quitarLasTareasHechas()
  }
}
core.useElement(ListaDeTareas, ListaDeTareasElement)
export const listaDeTareas = new ListaDeTareas()
core.describeAction(ListaDeTareas, "llenarLaAgenda", { title: "Llenar la Agenda", undoneAs: "Llenar la Agenda" })
core.describeAction(ListaDeTareas, "agregarLaTareaInicialTítuloConPrioridadNivel", { title: "Agregar la Tarea Inicial Título con Prioridad Nivel", undoneAs: "Agregar la Tarea Inicial Título con Prioridad Nivel" })
core.describeAction(ListaDeTareas, "agregarElBorrador", { title: "Agregar el Borrador", undoneAs: "Agregar el Borrador" })
core.describeAction(ListaDeTareas, "mostrarTodas", { title: "Todas", icon: "list", selectedWhen: "mostrarTodasIsSelected", undoneAs: "Todas" })
core.describeAction(ListaDeTareas, "mostrarPendientes", { title: "Pendientes", icon: "square outline", selectedWhen: "mostrarPendientesIsSelected", undoneAs: "Pendientes" })
core.describeAction(ListaDeTareas, "mostrarHechas", { title: "Hechas", icon: "check square outline", selectedWhen: "mostrarHechasIsSelected", undoneAs: "Hechas" })
core.describeAction(ListaDeTareas, "quitarLasTareasHechas", { title: "Quitar las tareas hechas", icon: "trash alternate outline", undoneAs: "Quitar las tareas hechas" })

// Qué tareas muestra la lista:  la barra de herramientas marca la que muestra

// Los botones de la barra de herramientas, y el clic derecho en la lista:  las mismas acciones
// su "menú de tareas" es un menú de "mostrar todas", "mostrar pendientes", "mostrar hechas", "-" y "quitar las tareas hechas"
core.describeMenu(ListaDeTareas, "menúDeTareas", { items: ["mostrarTodas", "mostrarPendientes", "mostrarHechas", "-", "quitarLasTareasHechas"] })
// su "menú mostrar" es un menú de "mostrar todas", "mostrar pendientes" y "mostrar hechas" titulado "Mostrar"
core.describeMenu(ListaDeTareas, "menúMostrar", { items: ["mostrarTodas", "mostrarPendientes", "mostrarHechas"], title: "Mostrar" })
// su "menú de la lista" es un menú de "menú mostrar", "-" y "quitar las tareas hechas"
core.describeMenu(ListaDeTareas, "menúDeLaLista", { items: ["menúMostrar", "-", "quitarLasTareasHechas"] })
// Un clic derecho en la lista:  qué tareas muestra, como un menú propio, y luego ordenar
// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet.¬   - Each task is an element of its own inside the list, <lista-de-tareas-agenda>:  <lista-de-tareas-tarea>.¬   - Its title's field fills the row by itself:  it's \`fluid\`, in a row of a \`<stack>\`. */¬¬/* done:  it fades */¬lista-de-tareas-agenda > [hecha] {¬  opacity: 0.6;¬}¬`)
// -----------
if (!core.isCarryingOver) listaDeTareas.start()
// -----------
if (!core.isCarryingOver) testMarcarUna()
if (!core.isCarryingOver) testElFiltro()
if (!core.isCarryingOver) testUnOrdenArrastradoSeGuarda()

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
