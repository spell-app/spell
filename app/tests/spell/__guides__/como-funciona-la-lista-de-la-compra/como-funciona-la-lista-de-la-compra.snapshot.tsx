import { core, List, App, View, prop, derived, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Cómo funciona la Lista de la compra")
/////////////////////////////////////////
// ## Cómo funciona la Lista de la compra
/////////////////////////////////////////
// El ejemplo Lista de la compra guarda lo que hay que comprar en un archivo CSV, y lo muestra por pasillo:
// agrega un artículo, márcalo mientras compras, quita lo comprado e imprime lo que falta.
// Cuatro ideas hacen el trabajo:
// - una línea dice dónde se guardan los artículos:  un archivo CSV en la propia carpeta del ejemplo
// - un artículo se dibuja como una fila:  una casilla para marcar, ligada a su "comprado"
// - la lista se calcula a partir de los artículos:  cada pasillo con lo que aún falta comprar en él
// - "abrir impresión" imprime solo la aplicación, y su CSS dice qué va en el papel
//
// Esta guía conserva las tres primeras, con los artículos en memoria:  empiezan de cero en cada ejecución.
// Abre Lista de la compra, en Ejemplos de la página de inicio, para verlo entero.

core.heading("Un artículo")
/** Un artículo */
export class Artículo extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "nombre" es texto
  @prop({ type: "text" })
  accessor nombre!: string

  // su "cantidad" es un número
  @prop({ type: "number" })
  accessor cantidad!: number

  // su "unidad" es texto
  @prop({ type: "text" })
  accessor unidad!: string

  // su "pasillo" es texto
  @prop({ type: "text" })
  accessor pasillo!: string

  /** marcado:  ya está en el carrito */
  // su "comprado" es sí o no
  @prop({ type: "choice" })
  accessor comprado!: boolean

  @drawn draw() {
    // un formulario propio, ligado al artículo:  marcar la casilla cambia su "comprado"
    return (
      <es-formulario prop:value={this}>
        <es-pila direccion="horizontal" separacion="sm">
          <es-casilla name="comprado" aria-label="Lo tengo" />
          <es-texto negrita={true}>{core.joined(this.cantidad, this.unidad, " ")}</es-texto>
          <es-texto>{this.nombre}</es-texto>
        </es-pila>
      </es-formulario>
    )
  }
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
    { name: "comprado", kind: "boolean", description: "Its comprado." }
  ])
}
core.useElement(Artículo, ArtículoElement)

core.heading("Un pasillo:  su nombre, y lo que aún falta comprar en él")
/** Un pasillo:  su nombre, y lo que aún falta comprar en él */
export class Pasillo extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "nombre" es texto
  @prop({ type: "text" })
  accessor nombre!: string

  // sus "artículos" es una lista de artículos
  @prop({ itemType: "Artículo", init: () => new List<Artículo>({ instanceType: "Artículo" }) })
  accessor artículos!: List<Artículo>

  @drawn draw() {
    return (
      <es-pila separacion="xs">
        <es-encabezado tamano="diminuto">{this.nombre}</es-encabezado>
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

core.heading("La aplicación")
/** La aplicación */
export class ListaDeLaCompra extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** todo lo de la lista, aquí en memoria;  los del ejemplo están en su archivo CSV */
  // sus "artículos" es una lista de artículos
  @prop({ itemType: "Artículo", init: () => new List<Artículo>({ instanceType: "Artículo" }) })
  accessor artículos!: List<Artículo>

  /** cada pasillo con algo aún por comprar, una sola vez, de la A a la Z */
  @derived get pasillos() {
    const encontrados = new List<Pasillo>({ instanceType: "Pasillo" })
    core.map(core.sortedBy(this.artículos, (item: Artículo) => item.pasillo), (artículo: Artículo) => {
      if (!artículo.comprado) {
        let pasillo = encontrados.filter((pasillo) => pasillo.nombre === artículo.pasillo).firstItem
        if (pasillo === undefined) {
          pasillo = new Pasillo({ nombre: artículo.pasillo })
          encontrados.append(pasillo!)
        }
        core.append(pasillo?.artículos!, artículo)
      }
    })
    return encontrados
  }

  /** quita de la lista cada artículo marcado */
  quitarLoComprado() {
    core.removeWhere(this.artículos, (artículo: Artículo) => artículo.comprado)
  }

  @drawn draw() {
    return (
      <es-contenedor texto={true}>
        <es-pila>
          {core.drawAction(this, "quitarLoComprado")}
          {core.drawEach(this.pasillos, (pasillo) => core.drawThing(pasillo))}
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
    { name: "artículos", kind: "json", description: "Its artículos." }
  ])

  quitarLoComprado() {
    return this.currentThing?.quitarLoComprado()
  }
}
core.useElement(ListaDeLaCompra, ListaDeLaCompraElement)
export const listaDeLaCompra = new ListaDeLaCompra()
core.describeAction(ListaDeLaCompra, "quitarLoComprado", { title: "Quitar lo comprado", undoneAs: "Quitar lo comprado" })

core.heading("Inicio:  cinco cosas que comprar, una ya comprada")
//## Inicio:  cinco cosas que comprar, una ya comprada
core.append(listaDeLaCompra.artículos, new Artículo({
  nombre: "leche",
  cantidad: 2,
  unidad: "litros",
  pasillo: "Lácteos"
}))
core.append(listaDeLaCompra.artículos, new Artículo({
  nombre: "huevos",
  cantidad: 12,
  pasillo: "Lácteos"
}))
core.append(listaDeLaCompra.artículos, new Artículo({
  nombre: "plátanos",
  cantidad: 6,
  pasillo: "Frutas y verduras"
}))
core.append(listaDeLaCompra.artículos, new Artículo({
  nombre: "pan",
  cantidad: 1,
  unidad: "barra",
  pasillo: "Panadería"
}))
core.append(listaDeLaCompra.artículos, new Artículo({
  nombre: "café",
  cantidad: 250,
  unidad: "g",
  pasillo: "Bebidas",
  comprado: true
}))

core.heading("Una prueba")
/** Una prueba */
export function testLosPasillos() {
  return core.test("test los pasillos", function testLosPasillos() {
    core.echoTestAction(`poner listado a una nueva lista de la compra`)
    const listado = new ListaDeLaCompra()
    core.echoTestAction(`agregar (un nuevo artículo con nombre "leche", pasillo "Lácteos") a artículos de listado`)
    core.append(listado.artículos, new Artículo({ nombre: "leche", pasillo: "Lácteos" }))
    core.echoTestAction(`agregar (un nuevo artículo con nombre "huevos", pasillo "Lácteos") a artículos de listado`)
    core.append(listado.artículos, new Artículo({ nombre: "huevos", pasillo: "Lácteos" }))
    core.echoTestAction(`agregar (un nuevo artículo con nombre "manzanas", pasillo "Fruta", comprado = sí) a artículos de listado`)
    core.append(listado.artículos, new Artículo({
      nombre: "manzanas",
      pasillo: "Fruta",
      comprado: true
    }))
    core.expect(core.itemCountOf(listado.pasillos), `el largo de pasillos de listado`, 1, `1`)
  })
}

core.heading("Pruébalo")
//////////////
// ## Pruébalo
//////////////
// - Marca "leche":  sale de Lácteos, que aún tiene los huevos.
// - Pulsa "Quitar lo que tengo":  el café se va para siempre.
// - Dale a un artículo un pasillo propio, "Congelados", y verás un nuevo encabezado.
//
// Y ahora:  Lista de la compra, en Ejemplos de la página de inicio, que guarda sus artículos en un archivo CSV.

core.heading("Dónde guarda el ejemplo sus artículos")
///////////////////////////////////////////
// ## Dónde guarda el ejemplo sus artículos
///////////////////////////////////////////
// Los artículos de esta guía viven en memoria:  recarga, y empiezan de nuevo.
// Lista de la compra los guarda en un archivo CSV, en su propia carpeta:  __data/shopping.csv.
// Una línea, en su archivo de API, lo dice:
//       hoja-compra es una hoja en "shopping.csv"
// y un artículo dice que vive allí:
//       vive en hoja-compra
// El servidor de páginas escribe el archivo, cambiando solo las líneas que cambian:  ábrelo en Numbers o Excel y compruébalo.
// Después de esas líneas, las palabras que ya conoces llegan al archivo:
//       agregar (un nuevo artículo con ...) a los artículos
//       cada artículo donde su comprado es no
//       quitar artículos de los artículos donde su comprado es sí
// Fichas de Recetas importa ese archivo de API, así que los ingredientes que agrega acaban en el mismo archivo, en la misma lista.

core.heading("En papel")
//////////////
// ## En papel
//////////////
// El botón Imprimir de la Lista de la compra ejecuta un paso:
//       abrir impresión
// que abre el diálogo Imprimir del navegador solo para la aplicación, no para el editor que la rodea.
// Su CSS dice qué sale en papel:  solo lo que falta comprar, cada cosa con su casilla para marcar.
//       @media print {
//         ui-toolbar, .new-item, .got, .item ui-button { display: none; }
//       }
// -----------
if (!core.isCarryingOver) listaDeLaCompra.start()
// -----------
if (!core.isCarryingOver) testLosPasillos()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `ArtículoElement` */
      "test-project-articulo": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PasilloElement` */
      "test-project-pasillo": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ListaDeLaCompraElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
