import { core, Thing, List, App, View, ViewableList, Place, h, withSpellPositions } from "@spell/core"

core.heading("Una tarea")
///////////////
// ## Una tarea
///////////////
// Algo por hacer:  su título, su prioridad, y si está hecha.
// Cada tarea es un elemento propio en la página, `<lista-de-tareas-tarea>`.
// Un clic la selecciona, mayúsculas y comando (ctrl) seleccionan más, para el editor de propiedades (`seleccionable`);
// arrastrarla la mueve, y las seleccionadas van con ella (`arrastrable`).

export class Tarea extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Lo que hay que hacer */
  // su "título" es texto
  static { this.declareProp("título", { type: "text" }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  /** Cualquier otra cosa sobre ella */
  // su "nota" es texto
  static { this.declareProp("nota", { type: "text" }) }
  get nota() { return this.getProp("nota") }
  set nota(value) { this.setProp("nota", value) }

  // su "prioridad" es uno de baja, normal o alta
  static Prioridades = ["baja", "normal", "alta"]
  static { this.declareProp("prioridad", { oneOf: Tarea.Prioridades }) }
  get prioridad() { return this.getProp("prioridad") }
  set prioridad(value) { this.setProp("prioridad", value) }

  // su "hecha" es sí o no
  static { this.declareProp("hecha", { type: "choice" }) }
  get hecha() { return this.getProp("hecha") }
  set hecha(value) { this.setProp("hecha", value) }

  /** Dónde está en su agenda, desde 1:  se guarda con ella, así que el orden en que la gente arrastra las tareas vuelve */
  // su "orden" es número
  static { this.declareProp("orden", { type: "number" }) }
  get orden() { return this.getProp("orden") }
  set orden(value) { this.setProp("orden", value) }

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
  draw() {
    return h("es-formulario", { value: this },
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

  static draggable = true

  static selectable = true

  get agenda() {
    return Agenda.ownerOf(this)
  }
}

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
  static { this.declareProp("tareasGuardadas", { itemType: "Tarea", init: () => new List({ instanceType: "Tarea" }) }) }
  get tareasGuardadas() { return this.getProp("tareasGuardadas") }
  set tareasGuardadas(value) { this.setProp("tareasGuardadas", value) }

  /** una tarea nueva, guardada desde ahora, que devuelve */
  guardarUnaTareaNuevaTituladaTítulo(título) {
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
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.navegador.api.es.spell", start: 371, end: 400 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en almacén del navegador
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.navegador.api.es.spell", start: 371, end: 400 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class GuardiánDelNavegador extends GuardiánDeTareas {
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.navegador.api.es.spell", start: 517, end: 567 }, readsFrom: ["almacén_del_navegador"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDelNavegador)
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título) {
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
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.servidor.api.es.spell", start: 507, end: 533 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en archivos de tareas
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.servidor.api.es.spell", start: 507, end: 533 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class GuardiánDelServidor extends GuardiánDeTareas {
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.servidor.api.es.spell", start: 648, end: 697 }, readsFrom: ["archivos_de_tareas"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDelServidor)
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título) {
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
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.csv.api.es.spell", start: 697, end: 719 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en hoja de tareas
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.csv.api.es.spell", start: 697, end: 719 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class GuardiánDeLaHoja extends GuardiánDeTareas {
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.csv.api.es.spell", start: 830, end: 877 }, readsFrom: ["hoja_de_tareas"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDeLaHoja)
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título) {
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
  static { this.declareProp("dueño", { type: "text", declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 664, end: 709 } }) }
  get dueño() { return this.getProp("dueño") }
  set dueño(value) { this.setProp("dueño", value) }

  static savedIn = {
    place: "cielo_de_tareas",
    collection: "tareas_del_cielo",
    times: ["created", "modified"]
  }

  // vive en cielo de tareas
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 511, end: 534 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en cielo de tareas
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 511, end: 534 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class GuardiánDelCielo extends GuardiánDeTareas {
  /** solo las tuyas:  las tareas de cada uno están en su propia cuenta */
  static { this.declareProp("tareasGuardadas", { declaredAt: { path: "/ListaDeTareas.atmosphere.api.es.spell", start: 834, end: 919 }, readsFrom: ["cielo_de_tareas"] }) }
  get tareasGuardadas() { return core.waitedValue(this, "tareasGuardadas", async () => {
    return await core.savedThings(TareaDelCielo, { filter: { dueño: core.currentPerson().id } })
  }) }

  guardarUnaTareaNuevaTituladaTítulo(título) {
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
// Sus tareas son la `<encanto-vista "tarea">` de este proyecto;  este archivo tiene su lista, y la aplicación.
// Dónde se guardan lo elige la persona, "Guardarlas en":  cada lugar es un guardián en un archivo de API propio,
// ListaDeTareas.navegador.api.es.spell, ListaDeTareas.servidor.api.es.spell, ListaDeTareas.csv.api.es.spell y ListaDeTareas.atmosphere.api.es.spell, todos haciendo lo que dice ListaDeTareas.api.es.spell.

core.heading("La agenda")
///////////////
// ## La agenda
///////////////
// Las tareas, cada una un elemento propio dentro de ella:  `<lista-de-tareas-agenda>`, alrededor de sus `<lista-de-tareas-tarea>`.

export class Agenda extends ViewableList {
  static instanceType = Tarea
  static elementTag = core.defineElement(this, "test-project")

  /** Lo que muestra:  todas las tareas, las pendientes, o las hechas */
  // su "mostrando" es uno de todas, pendientes o hechas
  //   - "está mostrando (mostrando)"
  static Mostrandos = ["todas", "pendientes", "hechas"]
  static { this.declareProp("mostrando", { oneOf: Agenda.Mostrandos }) }
  get mostrando() { return this.getProp("mostrando") }
  set mostrando(value) { this.setProp("mostrando", value) }
  estáMostrandoMostrando(mostrando) {
    return this.mostrando === mostrando
  }

  /** soltar movió sus tareas:  cada una guarda su nuevo lugar */
  whenTareaDroppedOn(tarea) {
    this.guardarElOrden()
  }

  // cada tarea, salvo que el filtro la oculte
  drawEachItem(item) {
    if (this.estáMostrandoMostrando("pendientes") && item.estáHecha) return undefined
    if (this.estáMostrandoMostrando("hechas") && item.estáPendiente) return undefined
    return core.drawThing(item)
  }

  // Sus tareas una debajo de otra;  vacía, una línea que lo dice
  draw() {
    return h("es-pila", { separacion: "xs" },
      h("es-texto", { color: "grey", hidden: () => this.isEmpty ? undefined : true }, "Nada por hacer"),
      h("slot")
    )
  }

  /** Cada tarea guarda su lugar en la lista, desde 1, donde se guarda:  así el orden en que la gente las arrastra vuelve la próxima vez */
  guardarElOrden() {
    this.forEach(withSpellPositions((tarea, lugar) => (tarea.orden = lugar)))
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

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
    core.expect(core.getItemAt(core.sortedBy(tareas, (item) => item.orden), 0)?.título, `el título de la primera tarea en (las tareas ordenadas por su orden)`, "segunda", `"segunda"`)
  })
}

/** una tarea está en una sola agenda a la vez */

core.heading("La aplicación")
///////////////////
// ## La aplicación
///////////////////
// Su barra de herramientas, el campo de la nueva tarea, y luego la lista junto al editor de propiedades.

export class ListaDeTareas extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // su "tareas" es una nueva agenda
  static { this.declareProp("tareas", { init: () => new Agenda(), early: true }) }
  get tareas() { return this.getProp("tareas") }
  set tareas(value) { this.setProp("tareas", value) }

  /** El título de la siguiente tarea, como lo tiene el campo de la nueva tarea */
  // su "borrador" es texto
  static { this.declareProp("borrador", { type: "text" }) }
  get borrador() { return this.getProp("borrador") }
  set borrador(value) { this.setProp("borrador", value) }

  get cuentaPendiente() {
    return this.tareas.filter((tarea) => tarea.estáPendiente).length
  }

  /** Dónde se guardan las tareas:  este navegador, un archivo JSON en el servidor, un archivo CSV en el servidor, o tu cuenta de atmosphere */
  // su "almacén" es uno de navegador, servidor, csv o atmosphere
  static Almacenes = ["navegador", "servidor", "csv", "atmosphere"]
  static { this.declareProp("almacén", { oneOf: ListaDeTareas.Almacenes }) }
  get almacén() { return this.getProp("almacén") }
  set almacén(value) { this.setProp("almacén", value) }

  /** Quién las guarda, según dónde se guardan:  uno de los guardianes de los archivos de API */
  // su "guardián" es un guardián de tareas
  static { this.declareProp("guardián", { type: "GuardiánDeTareas" }) }
  get guardián() { return this.getProp("guardián") }
  set guardián(value) { this.setProp("guardián", value) }

  /** Las tareas del guardián, en la lista;  un guardián sin ninguna empieza con unas cuantas */
  async llenarLaAgenda() {
    core.clear(this.tareas)
    core.map(core.sortedBy(await core.answerOf(this.guardián, "tareasGuardadas"), (item) => item.orden), (tarea) => this.tareas.append(tarea))
    if (!this.tareas.isEmpty) return
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Escribir el ejemplo Lista de tareas", "alta")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Enseñarle a dibujar", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Seleccionar unas tareas, y editarlas juntas", "normal")
    this.agregarLaTareaInicialTítuloConPrioridadNivel("Arrastrar tareas para reordenarlas", "baja")
    this.tareas.firstItem.hecha = true
  }

  async onAlmacénChange(event) {
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

  agregarLaTareaInicialTítuloConPrioridadNivel(título, nivel) {
    const tarea = this.guardián?.guardarUnaTareaNuevaTituladaTítulo(título)
    tarea.prioridad = nivel
    this.tareas.append(tarea)
    tarea.orden = this.tareas.length
  }

  /** El borrador, como una nueva tarea al final de la lista;  el campo se vacía */
  agregarElBorrador() {
    if (this.borrador === "") return
    const tarea = this.guardián?.guardarUnaTareaNuevaTituladaTítulo(this.borrador)
    tarea.prioridad = "normal"
    this.tareas.append(tarea)
    tarea.orden = this.tareas.length
    this.borrador = ""
  }

  // El editor de propiedades edita todas las tareas seleccionadas a la vez:  una propiedad en la que no coinciden muestra Varios
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
        h("es-formulario", { value: this },
          h("es-pila",
            h("es-campo", { etiqueta: "Guardarlas en", "en-linea": true },
              h("es-selector", { name: "almacén" },
                h("es-elemento", { value: "navegador", icono: "desktop" }, "Este navegador"),
                h("es-elemento", { value: "servidor", icono: "server" }, "Un archivo JSON en el servidor"),
                h("es-elemento", { value: "csv", icono: "table" }, "Un archivo CSV en el servidor"),
                h("es-elemento", { value: "atmosphere", icono: "cloud" }, "Tu cuenta de atmosphere")
              )
            ),
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
          )
        ),
        h("es-cuadricula", { columnas: "2", apilable: true, "context-menu": "menú de la lista" },
          () => core.drawThing(this.tareas),
          h("es-editor-propiedades", {
            etiqueta: "Tareas seleccionadas",
            esquema: "lista-de-tareas-tarea",
            "prop:value": () => this.tareas.selection
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
