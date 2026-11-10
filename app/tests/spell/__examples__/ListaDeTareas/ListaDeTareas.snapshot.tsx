import { core, Thing, List, App, View, ViewableList, Place, prop, derived, thing, drawn, withSpellPositions, type SentEvent } from "@spell/core"
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
  @prop({ type: "text" })
  accessor título!: string

  /** Cualquier otra cosa sobre ella */
  // su "nota" es texto
  @prop({ type: "text" })
  accessor nota!: string

  // su "prioridad" es uno de baja, normal o alta
  static Prioridades = ["baja", "normal", "alta"] as const
  @prop({ oneOf: () => Tarea.Prioridades })
  accessor prioridad!: Prioridad

  // su "hecha" es sí o no
  @prop({ type: "choice" })
  accessor hecha!: boolean

  /** Dónde está en su agenda, desde 1:  se guarda con ella, así que el orden en que la gente arrastra las tareas vuelve */
  // su "orden" es número
  @prop({ type: "number" })
  accessor orden!: number

  get estáHecha() {
    return this.hecha
  }

  get estáPendiente() {
    return !this.hecha
  }

  /** Fuera de donde se guarda:  una tarea que no se guarda en ningún lugar no tiene nada que hacer;  cada clase de tarea guardada dice cómo, en el archivo de su guardián */
  tirar() {
    return
  }

  // Un formulario propio, unido a ella:  marcar la casilla, o escribir un título, cambia la tarea;  su prioridad se muestra solo cuando no es normal
  @drawn draw() {
    return (
      <es-formulario value={this}>
        <es-pila direccion="horizontal" separacion="sm">
          <es-icono name="grip vertical" color="grey" aria-label="Arrastrar" />
          <es-casilla name="hecha" aria-label="Hecha" />
          <es-entrada part="title" name="título" aria-label="Tarea" apariencia="transparent" fluido={true} />
          <es-etiqueta tamano="diminuto" color={this.prioridad === "alta" ? "red" : "grey"} hidden={this.prioridad !== "normal" ? undefined : true}>
            {this.prioridad}
          </es-etiqueta>
        </es-pila>
      </es-formulario>
    )
  }

  static draggable = true

  static selectable = true

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
    { name: "nota", kind: "string", description: "Its nota." },
    { name: "prioridad", kind: "string", description: "Its prioridad." },
    { name: "hecha", kind: "boolean", description: "Its hecha." },
    { name: "orden", kind: "number", description: "Its orden." }
  ])

  tirar() {
    return this.currentThing?.tirar()
  }
}
core.useElement(Tarea, TareaElement)

export function testMarcarUna() {
  return core.test("test marcar una", function testMarcarUna() {
    const it = new Tarea()
    core.echoTestAction(`poner la tarea a una nueva tarea con título = "Escribir las pruebas"`)
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
// La aplicación le pide sus tareas a un GUARDIÁN, y nunca dice dónde están:
// cada clase de guardián está en un archivo propio, y lo dice a su manera.
//   ListaDeTareas.navegador.api.es.spell:  en este navegador, con el que empieza
//   ListaDeTareas.servidor.api.es.spell:  en un archivo JSON en el servidor
//   ListaDeTareas.csv.api.es.spell:  en un archivo CSV en el servidor
//   ListaDeTareas.atmosphere.api.es.spell:  en tu propia cuenta de atmosphere, el AT Protocol de Bluesky
// Todo guardián hace las mismas tres cosas:
// - sus tareas guardadas:  las tareas que tiene, leídas cuando la aplicación lo elige
// - guardar una tarea nueva titulada ...:  una tarea nueva, guardada desde ahora
// - tirarla:  una acción de la propia tarea, que dice su clase de tarea
// Una tarea guardada en cualquier lugar se guarda sola al cambiar:  marcarla, o escribir su título, queda guardado, sin paso de guardar.
// Su lugar en la lista se guarda igual, como su orden:  así las tareas vuelven en el orden en que la gente las arrastró.

export class GuardiánDeTareas extends Thing {
  /** las tareas que tiene, en cualquier orden:  la aplicación las pone en su propio orden */
  // sus "tareas guardadas" es una lista de tareas
  @prop({ itemType: "Tarea", init: () => new List<Tarea>({ instanceType: "Tarea" }) })
  accessor tareasGuardadas!: List<Tarea>

  /** una tarea nueva, guardada desde ahora, que devuelve */
  guardarUnaTareaNuevaTituladaTítulo(título: string) {
    return new Tarea({ título: título })
  }
}
// -----------
core.heading("Guardadas en este navegador")
/////////////////////////////////
// ## Guardadas en este navegador
/////////////////////////////////

export class TareaDelNavegador extends Tarea {
  static elementTag = core.defineElement(this, "test-project")

  tirar() {
    core.removeSaved(this)
  }

  static savedIn = {
    place: "almacén_del_navegador",
    collection: "tareas_del_navegador",
    times: ["created", "modified"]
  }

  // vive en almacén del navegador
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.navegador.api.es.spell", start: 387, end: 416 } })
  accessor creado!: any /* spell: type unknown */

  // vive en almacén del navegador
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.navegador.api.es.spell", start: 387, end: 416 } })
  accessor modificado!: any /* spell: type unknown */
}

/**
 * `<test-project-tarea-del-navegador>`:  a tarea del navegador, drawn in its own element, e.g. by `draw the tarea del navegador`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its tarea del navegador's properties;  its methods call its tarea del navegador's.
 * - What every view's element does, e.g. drawing its tarea del navegador, is `SpellElement`'s.
 */
export class TareaDelNavegadorElement extends SpellElement<TareaDelNavegador> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-tarea-del-navegador", "tarea del navegador", [
    { name: "creado", kind: "json", description: "Its creado." },
    { name: "modificado", kind: "json", description: "Its modificado." }
  ])

  tirar() {
    return this.currentThing?.tirar()
  }
}
core.useElement(TareaDelNavegador, TareaDelNavegadorElement)

export class GuardiánDelNavegador extends GuardiánDeTareas {
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.navegador.api.es.spell", start: 589, end: 639 }, readsFrom: ["almacén_del_navegador"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDelNavegador)
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título: string) {
    const tarea = new TareaDelNavegador({ título: título })
    core.saveThing(tarea)
    return tarea
  }
}

/**
 * Las tareas se quedan en este dispositivo, en el almacenamiento propio de este navegador:  nadie más las ve, y no se le pregunta a ningún servidor.
 * La aplicación empieza aquí, así que funciona sin servidor y sin iniciar sesión.
 */
export class AlmacénDelNavegador extends Place {}
export const almacénDelNavegador = core.place(new AlmacénDelNavegador(), {
  name: "almacén_del_navegador",
  kind: "database on this device",
  unclearNumbers: ","
})

// -----------
core.heading("Guardadas en un archivo JSON en el servidor")
/////////////////////////////////////////////////
// ## Guardadas en un archivo JSON en el servidor
/////////////////////////////////////////////////

export class TareaDelServidor extends Tarea {
  static elementTag = core.defineElement(this, "test-project")

  tirar() {
    core.removeSaved(this)
  }

  static savedIn = {
    place: "archivos_de_tareas",
    collection: "tareas_del_servidor",
    times: ["created", "modified"]
  }

  // vive en archivos de tareas
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.servidor.api.es.spell", start: 550, end: 576 } })
  accessor creado!: any /* spell: type unknown */

  // vive en archivos de tareas
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.servidor.api.es.spell", start: 550, end: 576 } })
  accessor modificado!: any /* spell: type unknown */
}

/**
 * `<test-project-tarea-del-servidor>`:  a tarea del servidor, drawn in its own element, e.g. by `draw the tarea del servidor`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its tarea del servidor's properties;  its methods call its tarea del servidor's.
 * - What every view's element does, e.g. drawing its tarea del servidor, is `SpellElement`'s.
 */
export class TareaDelServidorElement extends SpellElement<TareaDelServidor> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-tarea-del-servidor", "tarea del servidor", [
    { name: "creado", kind: "json", description: "Its creado." },
    { name: "modificado", kind: "json", description: "Its modificado." }
  ])

  tirar() {
    return this.currentThing?.tirar()
  }
}
core.useElement(TareaDelServidor, TareaDelServidorElement)

export class GuardiánDelServidor extends GuardiánDeTareas {
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.servidor.api.es.spell", start: 747, end: 796 }, readsFrom: ["archivos_de_tareas"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDelServidor)
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título: string) {
    const tarea = new TareaDelServidor({ título: título })
    core.saveThing(tarea)
    return tarea
  }
}

/**
 * Las tareas son una carpeta de datos del proyecto en el servidor de Spell:  cada tarea un archivo JSON, en `__data/tareas` de este proyecto.
 * Todos los que usan la aplicación las comparten, y cada persona cambia solo las tareas que hizo.
 * Abre una en un editor y cámbiala:  la aplicación lo muestra en su siguiente revisión.
 */
export class ArchivoDeTareas extends Place {}
export const archivosDeTareas = core.place(new ArchivoDeTareas(), {
  name: "archivos_de_tareas",
  kind: "data folder",
  at: "/api/places/spaces/@spell/examples/ListaDeTareas/__data/tareas",
  checkedEvery: 30,
  unclearNumbers: ","
})

// -----------
core.heading("Guardadas en un archivo CSV en el servidor")
////////////////////////////////////////////////
// ## Guardadas en un archivo CSV en el servidor
////////////////////////////////////////////////

export class TareaDeLaHoja extends Tarea {
  static elementTag = core.defineElement(this, "test-project")

  tirar() {
    core.removeSaved(this)
  }

  static savedIn = {
    place: "hoja_de_tareas",
    collection: "tareas_de_la_hoja",
    times: ["created", "modified"]
  }

  // vive en hoja de tareas
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.csv.api.es.spell", start: 728, end: 750 } })
  accessor creado!: any /* spell: type unknown */

  // vive en hoja de tareas
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.csv.api.es.spell", start: 728, end: 750 } })
  accessor modificado!: any /* spell: type unknown */
}

/**
 * `<test-project-tarea-de-la-hoja>`:  a tarea de la hoja, drawn in its own element, e.g. by `draw the tarea de la hoja`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its tarea de la hoja's properties;  its methods call its tarea de la hoja's.
 * - What every view's element does, e.g. drawing its tarea de la hoja, is `SpellElement`'s.
 */
export class TareaDeLaHojaElement extends SpellElement<TareaDeLaHoja> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-tarea-de-la-hoja", "tarea de la hoja", [
    { name: "creado", kind: "json", description: "Its creado." },
    { name: "modificado", kind: "json", description: "Its modificado." }
  ])

  tirar() {
    return this.currentThing?.tirar()
  }
}
core.useElement(TareaDeLaHoja, TareaDeLaHojaElement)

export class GuardiánDeLaHoja extends GuardiánDeTareas {
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.csv.api.es.spell", start: 917, end: 964 }, readsFrom: ["hoja_de_tareas"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDeLaHoja)
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título: string) {
    const tarea = new TareaDeLaHoja({ título: título })
    core.saveThing(tarea)
    return tarea
  }
}

/**
 * Las tareas son un archivo CSV en el servidor de Spell, `__data/tareas.csv` de este proyecto:  una fila cada una, bajo las columnas que nombra su primera línea.
 * Todos los que usan la aplicación lo comparten, y cualquiera cambia cualquier fila:  un archivo CSV no tiene columna que diga de quién es una fila.
 * Cada cambio reescribe solo su propia línea, así que el archivo se lee bien en un diff;  ábrelo en una hoja o un editor y cámbialo,
 * y la aplicación lo muestra en su siguiente revisión.
 */
export class HojaDeTareas extends Place {}
export const hojaDeTareas = core.place(new HojaDeTareas(), {
  name: "hoja_de_tareas",
  kind: "sheet",
  at: "/api/places/spaces/@spell/examples/ListaDeTareas/__data/tareas.csv",
  idColumn: "id",
  checkedEvery: 30,
  unclearNumbers: ","
})

// -----------
core.heading("Guardadas en tu cuenta de atmosphere")
//////////////////////////////////////////
// ## Guardadas en tu cuenta de atmosphere
//////////////////////////////////////////

export class TareaDelCielo extends Tarea {
  static elementTag = core.defineElement(this, "test-project")

  tirar() {
    core.removeSaved(this)
  }

  /** de quién es:  la cuenta en la que está, que un registro no puede decir */
  // una tarea del cielo tiene un dueño como texto
  @prop({ type: "text", declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 730, end: 775 } })
  accessor dueño!: string

  static savedIn = {
    place: "cielo_de_tareas",
    collection: "tareas_del_cielo",
    times: ["created", "modified"]
  }

  // vive en cielo de tareas
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 531, end: 554 } })
  accessor creado!: any /* spell: type unknown */

  // vive en cielo de tareas
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 531, end: 554 } })
  accessor modificado!: any /* spell: type unknown */
}

/**
 * `<test-project-tarea-del-cielo>`:  a tarea del cielo, drawn in its own element, e.g. by `draw the tarea del cielo`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its tarea del cielo's properties;  its methods call its tarea del cielo's.
 * - What every view's element does, e.g. drawing its tarea del cielo, is `SpellElement`'s.
 */
export class TareaDelCieloElement extends SpellElement<TareaDelCielo> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-tarea-del-cielo", "tarea del cielo", [
    { name: "dueño", kind: "string", description: "Its dueño." },
    { name: "creado", kind: "json", description: "Its creado." },
    { name: "modificado", kind: "json", description: "Its modificado." }
  ])

  tirar() {
    return this.currentThing?.tirar()
  }
}
core.useElement(TareaDelCielo, TareaDelCieloElement)

export class GuardiánDelCielo extends GuardiánDeTareas {
  /** solo las tuyas:  las tareas de cada uno están en su propia cuenta */
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 932, end: 1017 }, readsFrom: ["cielo_de_tareas"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDelCielo, { filter: { dueño: core.currentPerson().id } })
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título: string) {
    const tarea = new TareaDelCielo({ título: título })
    core.saveThing(tarea)
    return tarea
  }
}

/**
 * Las tareas son registros en tu propia cuenta de atmosphere, el AT Protocol de Bluesky, como los estados de Statusphere:
 * inicia sesión, y van contigo a cualquier aplicación que las lea.
 * Allí los registros son públicos:  cualquiera puede leerlos, así que no guardes nada privado en una tarea.
 */
export class CieloDeTareas extends Place {}
export const cieloDeTareas = core.place(new CieloDeTareas(), {
  name: "cielo_de_tareas",
  kind: "personal atmosphere account",
  collections: { tareasDelCielo: { at: "spaces.spell.examples.listadetareas.tarea" } },
  unclearNumbers: ","
})

// -----------
core.heading("Lista de tareas")
/////////////////////
// ## Lista de tareas
/////////////////////
// Una lista de cosas por hacer:  agrega una tarea, márcala, filtra la lista, y edita juntas las tareas seleccionadas.
// Sus tareas son la `<vista "tarea">` de este proyecto;  este archivo tiene su lista, y la aplicación.
// Dónde se guardan lo elige la persona, "Guardarlas en":  cada lugar es un guardián en un archivo de API propio,
// ListaDeTareas.navegador.api.es.spell, ListaDeTareas.servidor.api.es.spell, ListaDeTareas.csv.api.es.spell y ListaDeTareas.atmosphere.api.es.spell, todos haciendo lo que dice ListaDeTareas.api.es.spell.

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
  //   - "está mostrando (mostrando)"
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

  // cada tarea, salvo que el filtro la oculte
  drawEachItem(item: Tarea) {
    if (this.estáMostrandoMostrando("pendientes") && item.estáHecha) return undefined
    if (this.estáMostrandoMostrando("hechas") && item.estáPendiente) return undefined
    return core.drawThing(item)
  }

  // Sus tareas una debajo de otra;  vacía, una línea que lo dice
  @drawn draw() {
    return (
      <es-pila separacion="xs">
        <es-texto color="grey" hidden={this.isEmpty ? undefined : true}>Nada por hacer</es-texto>
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

// en la página, sus tareas se pueden arrastrar a otro lugar:  se mueven con el puntero, deslizándose

export function testElFiltro() {
  return core.test("test el filtro", function testElFiltro() {
    const it = new Agenda()
    core.echoTestAction(`poner la lista a una nueva agenda`)
    const lista = new Agenda()
    core.echoTestAction(`agregar (una nueva tarea con título = "a", hecha = sí) a la lista`)
    lista.append(new Tarea({ título: "a", hecha: true }))
    core.echoTestAction(`agregar (una nueva tarea con título = "b") a la lista`)
    lista.append(new Tarea({ título: "b" }))
    core.expect(lista.filter((tarea) => tarea.estáPendiente).length, `el largo de (tareas en la lista donde está pendiente)`, 1, `1`)
  })
}

export function testUnOrdenArrastradoSeGuarda() {
  return core.test("test un orden arrastrado se guarda", function testUnOrdenArrastradoSeGuarda() {
    const it = new Agenda()
    core.echoTestAction(`poner las tareas a una nueva agenda`)
    const tareas = new Agenda()
    core.echoTestAction(`poner la primera a una nueva tarea con título = "primera"`)
    const primera = new Tarea({ título: "primera" })
    core.echoTestAction(`poner la segunda a una nueva tarea con título = "segunda"`)
    const segunda = new Tarea({ título: "segunda" })
    core.echoTestAction(`agregar la segunda a las tareas`)
    tareas.append(segunda)
    core.echoTestAction(`agregar la primera a las tareas`)
    tareas.append(primera)
    core.echoTestAction(`guardar el orden de las tareas`)
    tareas.guardarElOrden()
    core.expect(segunda.orden, `el orden de la segunda`, 1, `1`)
    core.expect(primera.orden, `el orden de la primera`, 2, `2`)
    core.expect(core.getItemAt(core.sortedBy(tareas, (item: Tarea) => item.orden), 0)?.título!, `el título de la primera tarea en (las tareas ordenadas por su orden)`, "segunda", `"segunda"`)
  })
}

/** una tarea está en una sola agenda a la vez */

core.heading("La aplicación")
///////////////////
// ## La aplicación
///////////////////
// Su barra de herramientas, el campo de la nueva tarea, y luego la lista junto al editor de propiedades.

export type Almacén = (typeof ListaDeTareas.Almacenes)[number]

@thing
export class ListaDeTareas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "tareas" es una nueva agenda
  @prop({ init: () => new Agenda(), early: true })
  accessor tareas!: Agenda

  /** El título de la siguiente tarea, como lo tiene el campo de la nueva tarea */
  // su "borrador" es texto
  @prop({ type: "text" })
  accessor borrador!: string

  @derived get cuentaPendiente() {
    return this.tareas.filter((tarea) => tarea.estáPendiente).length
  }

  /** Dónde se guardan las tareas:  este navegador, un archivo JSON en el servidor, un archivo CSV en el servidor, o tu cuenta de atmosphere */
  // su "almacén" es uno de navegador, servidor, csv o atmosphere
  static Almacenes = ["navegador", "servidor", "csv", "atmosphere"] as const
  @prop({ oneOf: () => ListaDeTareas.Almacenes })
  accessor almacén!: Almacén

  /** Quién las guarda, según dónde se guardan:  uno de los guardianes de los archivos de API */
  // su "guardián" es un guardián de tareas
  @prop({ type: "GuardiánDeTareas" })
  accessor guardián!: GuardiánDeTareas

  /** Las tareas del guardián, en la lista;  un guardián sin ninguna empieza con unas cuantas */
  async llenarLaAgenda() {
    core.clear(this.tareas)
    core.map(core.sortedBy((await core.answerOf(this.guardián, "tareasGuardadas"))!, (item: Tarea) => item.orden), (tarea: Tarea) => this.tareas.append(tarea))
    if (!this.tareas.isEmpty) return
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Escribir el ejemplo Lista de tareas", "alta")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Enseñarle a dibujar", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Seleccionar unas tareas, y editarlas juntas", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Arrastrar tareas para reordenarlas", "baja")
    this.tareas.firstItem!.hecha = true
  }

  async onAlmacénChange(event: AlmacénChangeEvent) {
    if (this.almacén === "servidor") this.guardián = new GuardiánDelServidor()
    else if (this.almacén === "csv") this.guardián = new GuardiánDeLaHoja()
    else if (this.almacén === "atmosphere") this.guardián = new GuardiánDelCielo()
    else this.guardián = new GuardiánDelNavegador()
    await this.llenarLaAgenda()
  }

  /** Una lista de tareas nueva guarda sus tareas en este navegador, y las muestra todas */
  create() {
    this.tareas.mostrando = "todas"
    this.almacén = "navegador"
    this.guardián = new GuardiánDelNavegador()
    this.llenarLaAgenda()
  }

  agregarLaTareaInicialTítuloConPrioridadNivel(título: string, nivel: string) {
    const tarea = this.guardián?.guardarUnaTareaNuevaTituladaTítulo(título)
    tarea!.prioridad = nivel
    this.tareas.append(tarea!)
    tarea!.orden = this.tareas.length
  }

  /** El borrador, como una nueva tarea al final de la lista;  el campo se vacía */
  agregarElBorrador() {
    if (this.borrador === "") return
    const tarea = this.guardián?.guardarUnaTareaNuevaTituladaTítulo(this.borrador)
    tarea!.prioridad = "normal"
    this.tareas.append(tarea!)
    tarea!.orden = this.tareas.length
    this.borrador = ""
  }

  // El editor de propiedades edita todas las tareas seleccionadas a la vez:  una propiedad en la que no coinciden muestra Varios
  @drawn draw() {
    return (
      <es-contenedor>
        <es-pila>
          <es-barra-herramientas menu="menú de tareas" aria-label="Tareas">
            <es-texto slot="titulo" tamano="large">Lista de tareas</es-texto>
            <es-texto slot="derecha">
              <span hidden={this.cuentaPendiente === 0 ? undefined : "until-found"}>Todo hecho</span>
              <span hidden={!(this.cuentaPendiente === 0) ? undefined : "until-found"}>
                {this.cuentaPendiente}
                {" pendientes"}
              </span>
            </es-texto>
          </es-barra-herramientas>
          <es-formulario value={this}>
            <es-pila>
              <es-campo etiqueta="Guardarlas en" en-linea={true}>
                <es-selector name="almacén">
                  <es-elemento value="navegador" icono="desktop">Este navegador</es-elemento>
                  <es-elemento value="servidor" icono="server">Un archivo JSON en el servidor</es-elemento>
                  <es-elemento value="csv" icono="table">Un archivo CSV en el servidor</es-elemento>
                  <es-elemento value="atmosphere" icono="cloud">Tu cuenta de atmosphere</es-elemento>
                </es-selector>
              </es-campo>
              <es-entrada name="borrador" marcador="Algo por hacer" aria-label="Nueva tarea" fluido={true} accion={true}>
                <es-boton slot="accion" color="primario" disabled={this.borrador === ""} onClick={core.pressed(this, () => this.agregarElBorrador())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Agregar
                </es-boton>
              </es-entrada>
            </es-pila>
          </es-formulario>
          <es-cuadricula columnas="2" apilable={true} context-menu="menú de la lista">
            {core.drawThing(this.tareas)}
            <es-editor-propiedades etiqueta="Tareas seleccionadas" esquema="lista-de-tareas-tarea" prop:value={this.tareas.selection}>
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

  mostrarTodas() {
    this.tareas.mostrando = "todas"
  }

  get mostrarTodasIsSelected() {
    return this.tareas.estáMostrandoMostrando("todas")
  }

  mostrarPendientes() {
    this.tareas.mostrando = "pendientes"
  }

  get mostrarPendientesIsSelected() {
    return this.tareas.estáMostrandoMostrando("pendientes")
  }

  mostrarHechas() {
    this.tareas.mostrando = "hechas"
  }

  get mostrarHechasIsSelected() {
    return this.tareas.estáMostrandoMostrando("hechas")
  }

  quitarLasTareasHechas() {
    this.tareas.filter((tarea) => tarea.estáHecha).forEach((tarea) => {
      tarea.tirar()
      this.tareas.remove(tarea)
    })
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
    { name: "tareas", kind: "json", description: "Its tareas." },
    { name: "borrador", kind: "string", description: "Its borrador." },
    { name: "almacén", kind: "string", description: "Its almacén." },
    { name: "guardián", kind: "string", description: "Its guardián." }
  ])

  llenarLaAgenda() {
    return this.currentThing?.llenarLaAgenda()
  }

  onAlmacénChange(event: AlmacénChangeEvent) {
    return this.currentThing?.onAlmacénChange(event)
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

// Dónde se guardan las tareas:  la persona elige, y la aplicación le pregunta a ese guardián

// Qué tareas muestra la lista:  la barra de herramientas marca la que muestra
core.describeAction(ListaDeTareas, "mostrarTodas", { title: "Todas", icon: "list", selectedWhen: "mostrarTodasIsSelected" })
core.describeAction(ListaDeTareas, "mostrarPendientes", { title: "Pendientes", icon: "square outline", selectedWhen: "mostrarPendientesIsSelected" })
core.describeAction(ListaDeTareas, "mostrarHechas", { title: "Hechas", icon: "check square outline", selectedWhen: "mostrarHechasIsSelected" })
core.describeAction(ListaDeTareas, "quitarLasTareasHechas", { title: "Quitar las tareas hechas", icon: "trash alternate outline" })

// Los botones de la barra de herramientas, y el clic derecho en la lista:  las mismas acciones
// su "menú de tareas" es un menú de "mostrar todas" , "mostrar pendientes" , "mostrar hechas" , "-" y "quitar las tareas hechas"
core.describeMenu(ListaDeTareas, "menúDeTareas", { items: ["mostrarTodas", "mostrarPendientes", "mostrarHechas", "-", "quitarLasTareasHechas"] })

// su "menú mostrar" es un menú de "mostrar todas" , "mostrar pendientes" y "mostrar hechas" titulado "Mostrar"
core.describeMenu(ListaDeTareas, "menúMostrar", { items: ["mostrarTodas", "mostrarPendientes", "mostrarHechas"], title: "Mostrar" })

// Un clic derecho en la lista:  qué tareas muestra, como un menú propio, y luego ordenar
// su "menú de la lista" es un menú de "menú mostrar" , "-" y "quitar las tareas hechas"
core.describeMenu(ListaDeTareas, "menúDeLaLista", { items: ["menúMostrar", "-", "quitarLasTareasHechas"] })
// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet.¬   - Each task is an element of its own inside the list, <lista-de-tareas-agenda>:¬     <lista-de-tareas-tarea-del-navegador>, ...-del-servidor or ...-del-cielo, for where it's kept.¬   - Its title's field fills the row by itself:  it's \`fluid\`, in a row of a \`<stack>\`. */¬¬/* done:  it fades */¬lista-de-tareas-agenda > [hecha] {¬  opacity: 0.6;¬}¬`)
// -----------
if (!core.isCarryingOver) listaDeTareas.start()
// -----------
if (!core.isCarryingOver) testMarcarUna()
if (!core.isCarryingOver) testElFiltro()
if (!core.isCarryingOver) testUnOrdenArrastradoSeGuarda()

// what each event this program hears holds
export type AlmacénChangeEvent = SentEvent & { value: Almacén; was: Almacén }

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `TareaElement` */
      "test-project-tarea": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `TareaDelNavegadorElement` */
      "test-project-tarea-del-navegador": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `TareaDelServidorElement` */
      "test-project-tarea-del-servidor": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `TareaDeLaHojaElement` */
      "test-project-tarea-de-la-hoja": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `TareaDelCieloElement` */
      "test-project-tarea-del-cielo": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `AgendaElement` */
      "test-project-agenda": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ListaDeTareasElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
