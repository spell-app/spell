import { core, List, App, View, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Lista de la compra:  dónde se guarda la lista")
///////////////////////////////////////////////////
// ## Lista de la compra:  dónde se guarda la lista
///////////////////////////////////////////////////

export class Artículo extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "nombre" es texto
  @prop({ type: "text", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 601, end: 621 } })
  accessor nombre!: string

  /** Cuántos, en su unidad:  nada cuando no importa */
  // su "cantidad" es un número
  @prop({ type: "number", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 623, end: 701 } })
  accessor cantidad!: number

  /** "g", "tazas", "latas" ...;  nada para un conteo, 2 huevos */
  // su "unidad" es texto
  @prop({ type: "text", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 703, end: 786 } })
  accessor unidad!: string

  /** Dónde está en la tienda:  la lista se agrupa por esto */
  // su "pasillo" es texto
  @prop({ type: "text", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 788, end: 868 } })
  accessor pasillo!: string

  /** Tachado:  ya está en el carrito */
  // su "comprado" es sí o no
  @prop({ type: "choice", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 870, end: 931 } })
  accessor comprado!: boolean

  /** La receta para la que es, cuando Fichas de recetas lo agregó */
  // su "receta" es texto
  @prop({ type: "text", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 933, end: 1019 } })
  accessor receta!: string

  static { this.declareProp("seNecesita", { declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 1021, end: 1055 }, readsFrom: ["planilla"] }) }
  get seNecesita() {
    return !this.comprado
  }

  /** Su cantidad y unidad como las escribe la gente:  "2", "200 g", "1 1/2 tazas";  nada si no hay cantidad */
  static { this.declareProp("porción", { declaredAt: { path: "/Artículo.es.spell", start: 267, end: 488 }, readsFrom: ["planilla"] }) }
  get porción() {
    if (this.cantidad === undefined || this.cantidad === 0) return ""
    return core.joined(this.cantidad, this.unidad, " ")
  }

  /** Fuera de la lista, y fuera del archivo */
  sacar() {
    core.removeSaved(this)
  }

  @drawn draw() {
    return (
      <es-formulario prop:value={this}>
        <es-pila class="item" direccion="horizontal" separacion="sm">
          <es-casilla name="comprado" aria-label="Lo tengo" />
          <es-texto class="how-much" negrita={true}>{this.porción}</es-texto>
          <es-texto class="name">{this.nombre}</es-texto>
          {core.drawIf(() => this.receta !== "", () => <>
            <es-texto class="for" color="gris" tamano="pequeño">para {this.receta}</es-texto>
          </>)}
          {core.drawAction(this, "sacar", { "icon-only": true, appearance: "tertiary" })}
        </es-pila>
      </es-formulario>
    )
  }

  static savedIn = {
    place: "planilla",
    collection: "artículos",
    times: ["created", "modified"]
  }

  // vive en la planilla
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 580, end: 599 } })
  accessor creado!: any /* spell: type unknown */

  // vive en la planilla
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/ListaDeLaCompra.api.es.spell", start: 580, end: 599 } })
  accessor modificado!: any /* spell: type unknown */
}

/**
 * `<test-project-articulo>`:  an artículo, drawn in its own element, e.g. by `draw the artículo`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its artículo's properties;  its methods call its artículo's.
 * - What every view's element does, e.g. drawing its artículo, is `SpellElement`'s.
 */
export class ArtículoElement extends SpellElement<Artículo> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-articulo", "artículo", [
    { name: "nombre", kind: "string", description: "Its nombre." },
    { name: "cantidad", kind: "number", description: "Its cantidad." },
    { name: "unidad", kind: "string", description: "Its unidad." },
    { name: "pasillo", kind: "string", description: "Its pasillo." },
    { name: "comprado", kind: "boolean", description: "Its comprado." },
    { name: "receta", kind: "string", description: "Its receta." },
    { name: "creado", kind: "json", description: "Its creado." },
    { name: "modificado", kind: "json", description: "Its modificado." }
  ])

  sacar() {
    return this.currentThing?.sacar()
  }
}
core.useElement(Artículo, ArtículoElement)
core.describeAction(Artículo, "sacar", { title: "Sacar", icon: "close", undoneAs: "Sacar" })

/**
 * En un archivo CSV, en la propia carpeta de este ejemplo:  __data/shopping.csv.
 * Ábrelo en Numbers o Excel:  una fila por cada artículo, una columna por cada uno de sus campos.
 * El servidor de páginas lo escribe, cambiando solo las líneas que cambian;  todos los que usan ese servidor de páginas comparten una sola lista.
 * Fichas de Recetas también guarda aquí los ingredientes que eliges:  importa este archivo, así que los dos nombran esta misma lista.
 */
export class Planilla extends Place {}
export const planilla = core.place(new Planilla(), {
  name: "planilla",
  kind: "sheet",
  at: "/api/places/spaces/@spell/examples/ListaDeLaCompra/__data/shopping.csv",
  unclearNumbers: ","
})

// -----------
core.heading("Un artículo de la lista")
/////////////////////////////
// ## Un artículo de la lista
/////////////////////////////
// Una fila propia:  una casilla para marcar, cuánto, su nombre, la receta a la que pertenece y un botón para sacarlo.
// Marcar la casilla cambia el artículo, que se guarda solo:  la línea del archivo CSV cambia de inmediato.

export function testCuántoSeLee() {
  return core.test("test cuánto se lee", function testCuántoSeLee() {
    const it = new Artículo()
    core.echoTestAction(`poner el artículo a un nuevo artículo con nombre "harina", cantidad = 200, unidad = "g"`)
    let artículo = new Artículo({
      nombre: "harina",
      cantidad: 200,
      unidad: "g"
    })
    core.expect(artículo.porción, `la porción del artículo`, "200 g", `"200 g"`)
    core.echoTestAction(`poner el artículo a un nuevo artículo con nombre "limones"`)
    artículo = new Artículo({ nombre: "limones" })
    core.expect(artículo.porción, `la porción del artículo`, "", `""`)
  })
}
// -----------
core.heading("La lista, por pasillo")
///////////////////////////
// ## La lista, por pasillo
///////////////////////////
// Lo que falta comprar, pasillo a pasillo, de la A a la Z;  después lo que ya tienes, atenuado, abajo del todo.
// La Lista de la compra la dibuja, y también las Fichas de recetas:  importan este archivo, así que las dos muestran la misma lista.

export class Pasillo extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "nombre" es texto
  @prop({ type: "text" })
  accessor nombre!: string

  /** Lo que falta comprar en él */
  // sus "artículos" es una lista de artículos
  @prop({ itemType: "Artículo", init: () => new List<Artículo>({ instanceType: "Artículo" }) })
  accessor artículos!: List<Artículo>

  @drawn draw() {
    return (
      <es-pila class="aisle" separacion="xs">
        <es-encabezado class="aisle-name" tamano="diminuto">{this.nombre}</es-encabezado>
        {core.drawEach(this.artículos, (artículo) => core.drawThing(artículo))}
      </es-pila>
    )
  }
}

/**
 * `<test-project-pasillo>`:  a pasillo, drawn in its own element, e.g. by `draw the pasillo`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its pasillo's properties;  its methods call its pasillo's.
 * - What every view's element does, e.g. drawing its pasillo, is `SpellElement`'s.
 */
export class PasilloElement extends SpellElement<Pasillo> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-pasillo", "pasillo", [
    { name: "nombre", kind: "string", description: "Its nombre." },
    { name: "artículos", kind: "json", description: "Its artículos." }
  ])
}
core.useElement(Pasillo, PasilloElement)

export class Recorrido extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Cada pasillo con algo que falta comprar, una sola vez, en el orden de sus nombres */
  static { this.declareProp("pasillos", { declaredAt: { path: "/Recorrido.es.spell", start: 611, end: 1145 }, readsFrom: ["planilla"] }) }
  get pasillos() { return core.waitedValue(this, "pasillos", async () => {
    const encontrados = new List<Pasillo>({ instanceType: "Pasillo" })
    core.map(core.sortedBy(await core.savedThings(Artículo, { filter: { comprado: false } }), (item: Artículo) => item.pasillo), (artículo: Artículo) => {
      let pasillo = encontrados.filter((pasillo) => pasillo.nombre === artículo.pasillo).firstItem
      if (pasillo === undefined) {
        pasillo = new Pasillo({ nombre: artículo.pasillo })
        encontrados.append(pasillo!)
      }
      core.append(pasillo?.artículos!, artículo)
    })
    return encontrados
  }) }

  /** Ya en el carrito */
  static { this.declareProp("comprado", { declaredAt: { path: "/Recorrido.es.spell", start: 1147, end: 1201 }, readsFrom: ["planilla"] }) }
  get comprado() { return core.waitedValue(this, "comprado", async () => {
    return await core.savedThings(Artículo, { filter: { comprado: true } })
  }) }

  @drawn draw() {
    return (
      <es-pila class="aisle-list">
        {core.drawRead(() => this.pasillos, (pasillo: Pasillo) => core.drawThing(pasillo), { none: () => <es-texto color="gris">No falta nada por comprar</es-texto>, failed: () => <es-texto color="gris">{"Ahora no se puede leer la lista:  lo vuelve a intentar enseguida"}</es-texto> })}
        <es-pila class="got" separacion="xs">
          {core.drawRead(() => this.comprado, (artículo: Artículo) => core.drawThing(artículo), { failed: () => {} })}
        </es-pila>
      </es-pila>
    )
  }
}

/**
 * `<test-project-recorrido>`:  a recorrido, drawn in its own element, e.g. by `draw the recorrido`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recorrido's properties;  its methods call its recorrido's.
 * - What every view's element does, e.g. drawing its recorrido, is `SpellElement`'s.
 */
export class RecorridoElement extends SpellElement<Recorrido> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-recorrido", "recorrido", [])
}
core.useElement(Recorrido, RecorridoElement)
// -----------
core.heading("Lista de la compra")
////////////////////////
// ## Lista de la compra
////////////////////////
// Qué comprar, por pasillo:  agrega un artículo, márcalo mientras compras, quita lo comprado e imprime lo que falta.
// Sus artículos están en un archivo CSV que abren Numbers o Excel:  ListaDeLaCompra.api.es.spell dice dónde.
// Un artículo se dibuja en Artículo.es.spell, y la lista por pasillo es Recorrido.es.spell;  este archivo tiene la aplicación.

@thing
export class ListaDeLaCompra extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "recorrido" es un nuevo recorrido
  @prop({ init: () => new Recorrido({ id: "recorrido" }), early: true })
  accessor recorrido!: Recorrido

  /** El próximo artículo, tal como lo tiene el formulario sobre la lista */
  // su "nuevo artículo" es un nuevo artículo
  @prop({ init: () => new Artículo(), early: true })
  accessor nuevoArtículo!: Artículo

  /** La primera vez, con el archivo vacío, unos cuantos para empezar */
  async create() {
    let guardados: undefined = undefined
    try {
      guardados = await core.savedThings(Artículo)
    }
    catch (error) {
      // El archivo no se puede leer ahora:  la lista lo dice, y lo vuelve a intentar
      return
    }
    if (core.isEmpty(guardados)) {
      core.saveThing(new Artículo({
        nombre: "leche",
        pasillo: "Lácteos",
        cantidad: 2,
        unidad: "litros"
      }))
      core.saveThing(new Artículo({
        nombre: "huevos",
        pasillo: "Lácteos",
        cantidad: 12
      }))
      core.saveThing(new Artículo({
        nombre: "plátanos",
        pasillo: "Frutas y verduras",
        cantidad: 6
      }))
      core.saveThing(new Artículo({
        nombre: "espinacas",
        pasillo: "Frutas y verduras",
        cantidad: 200,
        unidad: "g"
      }))
      core.saveThing(new Artículo({
        nombre: "pan",
        pasillo: "Panadería",
        cantidad: 1,
        unidad: "barra"
      }))
      core.saveThing(new Artículo({
        nombre: "café",
        pasillo: "Bebidas",
        cantidad: 250,
        unidad: "g",
        comprado: true
      }))
    }
  }

  /** El artículo del formulario, a la lista y al archivo;  el formulario se vacía, conservando su pasillo */
  agregarElArtículoNuevo() {
    if (this.nuevoArtículo.nombre === "") return
    core.saveThing(this.nuevoArtículo)
    this.nuevoArtículo = new Artículo({ pasillo: this.nuevoArtículo.pasillo })
  }

  /** Cada artículo marcado fuera de la lista, en un solo paso para deshacer */
  async quitarLoComprado() {
    await core.inOneGo(async () => core.map(await core.filterInTurn(await core.savedThings(Artículo, { filter: { comprado: true } }), async (artículo: Artículo) => await core.answerOf(artículo, "comprado")), (artículo: Artículo) => core.removeSaved(artículo)))
  }

  /** Solo lo que falta comprar, por pasillo:  styles.css dice qué sale en papel */
  imprimirLaLista() {
    core.openPrinting()
  }

  @drawn draw() {
    return (
      <es-contenedor texto={true}>
        <es-pila>
          <es-barra-herramientas>
            <es-texto tamano="grande" extranegrita={true} slot="titulo">Lista de la compra</es-texto>
            {core.drawAction(this, "quitarLoComprado", { "in-menu": true })}
            {core.drawAction(this, "imprimirLaLista", { "in-menu": true })}
            <spacer />
            {core.drawAction(this, "undo", { "icon-only": true, "in-menu": true })}
            {core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })}
          </es-barra-herramientas>
          <es-formulario class="new-item" prop:value={this.nuevoArtículo}>
            <es-campos no-apilable={true}>
              <es-campo ancho="3">
                <es-entrada name="cantidad" type="number" min="0" marcador="Cuántos" aria-label="Cantidad" />
              </es-campo>
              <es-campo ancho="3">
                <es-entrada name="unidad" marcador="Unidad" aria-label="Unidad" />
              </es-campo>
              <es-campo ancho="6">
                <es-entrada name="nombre" marcador="Algo que comprar" aria-label="Elemento" />
              </es-campo>
              <es-campo ancho="4">
                <es-entrada name="pasillo" marcador="Pasillo" aria-label="Pasillo" accion={true}>
                  {core.drawAction(this, "agregarElArtículoNuevo", { slot: "accion", color: "primary", "icon-only": true })}
                </es-entrada>
              </es-campo>
            </es-campos>
          </es-formulario>
          {core.drawThing(this.recorrido)}
        </es-pila>
      </es-contenedor>
    )
  }
}

/**
 * `<test-project-app>`:  a lista de la compra, drawn in its own element, e.g. by `draw the lista de la compra`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its lista de la compra's properties;  its methods call its lista de la compra's.
 * - What every view's element does, e.g. drawing its lista de la compra, is `SpellElement`'s.
 */
export class ListaDeLaCompraElement extends SpellElement<ListaDeLaCompra> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "lista de la compra", [
    { name: "recorrido", kind: "json", description: "Its recorrido." },
    { name: "nuevo-artículo", kind: "json", description: "Its nuevoArtículo." }
  ])

  create() {
    return this.currentThing?.create()
  }

  agregarElArtículoNuevo() {
    return this.currentThing?.agregarElArtículoNuevo()
  }

  quitarLoComprado() {
    return this.currentThing?.quitarLoComprado()
  }

  imprimirLaLista() {
    return this.currentThing?.imprimirLaLista()
  }
}
core.useElement(ListaDeLaCompra, ListaDeLaCompraElement)
export const listaDeLaCompra = new ListaDeLaCompra()
core.describeAction(ListaDeLaCompra, "agregarElArtículoNuevo", { title: "Agregar", icon: "plus", undoneAs: "Agregar" })
core.describeAction(ListaDeLaCompra, "quitarLoComprado", { title: "Quitar lo que ya tengo", icon: "check", undoneAs: "Quitar lo que ya tengo" })
core.describeAction(ListaDeLaCompra, "imprimirLaLista", { title: "Imprimir", icon: "print", undoneAs: "Imprimir" })
// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet. */¬¬/* got:  it fades */¬.got {¬  opacity: 0.6;¬}¬¬/* On paper (\`open printing\`):  only what's still to get, by aisle, each with its box to tick */¬@media print {¬  es-barra-herramientas,¬  .new-item,¬  .got,¬  .item es-boton {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) listaDeLaCompra.start()
// -----------
if (!core.isCarryingOver) testCuántoSeLee()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `ArtículoElement` */
      "test-project-articulo": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PasilloElement` */
      "test-project-pasillo": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `RecorridoElement` */
      "test-project-recorrido": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ListaDeLaCompraElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
