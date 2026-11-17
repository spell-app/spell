import { core, List, App, View, h } from "@spell/core"

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
  static { this.declareProp("nombre", { type: "text" }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "cantidad" es un número
  static { this.declareProp("cantidad", { type: "number" }) }
  get cantidad() { return this.getProp("cantidad") }
  set cantidad(value) { this.setProp("cantidad", value) }

  // su "unidad" es texto
  static { this.declareProp("unidad", { type: "text" }) }
  get unidad() { return this.getProp("unidad") }
  set unidad(value) { this.setProp("unidad", value) }

  // su "pasillo" es texto
  static { this.declareProp("pasillo", { type: "text" }) }
  get pasillo() { return this.getProp("pasillo") }
  set pasillo(value) { this.setProp("pasillo", value) }

  /** marcado:  ya está en el carrito */
  // su "comprado" es sí o no
  static { this.declareProp("comprado", { type: "choice" }) }
  get comprado() { return this.getProp("comprado") }
  set comprado(value) { this.setProp("comprado", value) }

  draw() {
    // un formulario propio, ligado al artículo:  marcar la casilla cambia su "comprado"
    return h("es-formulario", { "prop:value": this },
      h("es-pila", { direccion: "horizontal", separacion: "sm" },
        h("es-casilla", { name: "comprado", "aria-label": "Lo tengo" }),
        h("es-texto", { negrita: true }, () => core.joined(this.cantidad, this.unidad, " ")),
        h("es-texto", () => this.nombre)
      )
    )
  }
}

core.heading("Un pasillo:  su nombre, y lo que aún falta comprar en él")
/** Un pasillo:  su nombre, y lo que aún falta comprar en él */
export class Pasillo extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "nombre" es texto
  static { this.declareProp("nombre", { type: "text" }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // sus "artículos" es una lista de artículos
  static { this.declareProp("artículos", { itemType: "Artículo", init: () => new List({ instanceType: "Artículo" }) }) }
  get artículos() { return this.getProp("artículos") }
  set artículos(value) { this.setProp("artículos", value) }

  draw() {
    return h("es-pila", { separacion: "xs" },
      h("es-encabezado", { tamano: "diminuto" }, () => this.nombre),
      () => core.drawEach(this.artículos, (artículo) => core.drawThing(artículo))
    )
  }
}

core.heading("La aplicación")
/** La aplicación */
export class ListaDeLaCompra extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** todo lo de la lista, aquí en memoria;  los del ejemplo están en su archivo CSV */
  // sus "artículos" es una lista de artículos
  static { this.declareProp("artículos", { itemType: "Artículo", init: () => new List({ instanceType: "Artículo" }) }) }
  get artículos() { return this.getProp("artículos") }
  set artículos(value) { this.setProp("artículos", value) }

  /** cada pasillo con algo aún por comprar, una sola vez, de la A a la Z */
  get pasillos() {
    const encontrados = new List({ instanceType: "Pasillo" })
    core.map(core.sortedBy(this.artículos, (item) => item.pasillo), (artículo) => {
      if (!artículo.comprado) {
        let pasillo = encontrados.filter((pasillo) => pasillo.nombre === artículo.pasillo).firstItem
        if (pasillo === undefined) {
          pasillo = new Pasillo({ nombre: artículo.pasillo })
          encontrados.append(pasillo)
        }
        core.append(pasillo?.artículos, artículo)
      }
    })
    return encontrados
  }

  /** quita de la lista cada artículo marcado */
  quitarLoComprado() {
    core.removeWhere(this.artículos, (artículo) => artículo.comprado)
  }

  draw() {
    return h("es-contenedor", { texto: true },
      h("es-pila",
        core.drawAction(this, "quitarLoComprado"),
        () => core.drawEach(this.pasillos, (pasillo) => core.drawThing(pasillo))
      )
    )
  }
}
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
