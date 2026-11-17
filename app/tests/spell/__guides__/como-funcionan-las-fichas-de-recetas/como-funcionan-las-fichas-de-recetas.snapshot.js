import { core, List, App, View, h } from "@spell/core"

core.heading("Cómo funcionan las fichas de recetas")
//////////////////////////////////////////
// ## Cómo funcionan las fichas de recetas
//////////////////////////////////////////
// El ejemplo de fichas de recetas guarda las recetas en un archivo JSON:  elige una, indica cuántos comen,
// muéstrala en el sistema métrico o en tazas y cucharas, y envía los ingredientes que elijas a la lista de la compra.
// Cuatro ideas hacen el trabajo:
// - una receta guarda sus ingredientes y pasos DENTRO:  listas de cosas que no se guardan en ningún otro sitio
// - cada cantidad se calcula según cuántos comen:  su cantidad, por comensales entre raciones
// - las propias medidas de Spell dicen cuánto mide una taza:  "1 taza en ml" es 236.6
// - la lista de la compra es la de Lista de la compra, importada:  un archivo, una lista
//
// Esta guía se queda con las tres primeras, con una receta en memoria.
// Abre Fichas de recetas, desde Ejemplos en la página de inicio, para verlo todo.

core.heading("Un ingrediente, y una receta que los contiene")
/** Un ingrediente, y una receta que los contiene */
export class Ingrediente extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** para el número de personas de la propia receta */
  // su "cantidad" es un número
  static { this.declareProp("cantidad", { type: "number" }) }
  get cantidad() { return this.getProp("cantidad") }
  set cantidad(value) { this.setProp("cantidad", value) }

  // su "unidad" es texto
  static { this.declareProp("unidad", { type: "text" }) }
  get unidad() { return this.getProp("unidad") }
  set unidad(value) { this.setProp("unidad", value) }

  // su "nombre" es texto
  static { this.declareProp("nombre", { type: "text" }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  /** para cuántos van a comer */
  get ajustada() {
    return this.cantidad * fichas.escala
  }

  draw() {
    return h("es-pila", { direccion: "horizontal", separacion: "sm" },
      h("es-texto", { negrita: true }, () => core.joined(this.ajustada, this.unidad, " ")),
      h("es-texto", () => this.nombre)
    )
  }
}

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  static { this.declareProp("título", { type: "text" }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  // sus "raciones" es un número
  static { this.declareProp("raciones", { type: "number" }) }
  get raciones() { return this.getProp("raciones") }
  set raciones(value) { this.setProp("raciones", value) }

  /** guardados dentro de la receta:  el archivo JSON del ejemplo guarda cada receta entera */
  // sus "ingredientes" es una lista de ingredientes
  static { this.declareProp("ingredientes", { itemType: "Ingrediente", init: () => new List({ instanceType: "Ingrediente" }) }) }
  get ingredientes() { return this.getProp("ingredientes") }
  set ingredientes(value) { this.setProp("ingredientes", value) }

  draw() {
    return h("es-pila", { separacion: "xs" },
      h("es-encabezado", { tamano: "pequeño" }, () => this.título),
      () => core.drawEach(this.ingredientes, (ingrediente) => core.drawThing(ingrediente))
    )
  }
}

core.heading("Tazas y mililitros, con las medidas de Spell")
//## Tazas y mililitros, con las medidas de Spell
/** el tamaño de una taza es el de Spell, de sus unidades de volumen */
export function contarLasTazasEnMililitros(mililitros) {
  return core.asAction({ undoneAs: "Contar las Tazas en Mililitros" }, () => mililitros / core.convertMeasure(
    1,
    "Volume",
    "cup",
    "milliliter"
  ))
}

core.heading("La aplicación")
/** La aplicación */
export class Ficha extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** cuántos van a comer */
  // sus "comensales" es un número empezando en 6
  static { this.declareProp("comensales", { type: "number", init: () => 6 }) }
  get comensales() { return this.getProp("comensales") }
  set comensales(value) { this.setProp("comensales", value) }

  // "sopa" es una nueva receta con título "Sopa de tomate", raciones = 4
  static { this.declareProp("sopa", { init: () => new Receta({
    id: "sopa",
    título: "Sopa de tomate",
    raciones: 4
  }), early: true }) }
  get sopa() { return this.getProp("sopa") }
  set sopa(value) { this.setProp("sopa", value) }

  /** cuánto más, o menos, de lo que dice la receta */
  get escala() {
    return this.comensales / this.sopa.raciones
  }

  draw() {
    return h("es-contenedor", { texto: true },
      h("es-pila",
        h("es-formulario", { "prop:value": this },
          h("es-campo", { etiqueta: "Cocinar para" },
            h("es-entrada", { name: "comensales", type: "number", min: "1", etiquetado: "derecha", etiqueta: "personas" })
          )
        ),
        () => core.drawThing(this.sopa)
      )
    )
  }
}
export const fichas = new Ficha()

core.heading("Inicio:  los ingredientes de la sopa")
//## Inicio:  los ingredientes de la sopa
core.append(fichas.sopa.ingredientes, new Ingrediente({
  cantidad: 1000,
  unidad: "g",
  nombre: "tomates maduros"
}))
core.append(fichas.sopa.ingredientes, new Ingrediente({
  cantidad: 2,
  unidad: "cda",
  nombre: "aceite de oliva"
}))
core.append(fichas.sopa.ingredientes, new Ingrediente({
  cantidad: 500,
  unidad: "ml",
  nombre: "caldo de verduras"
}))

core.heading("Una comprobación")
//## Una comprobación
/** una taza son 236.6 ml, así que 1 litro es algo más de 4 tazas */
export function testLasMedidas() {
  return core.test("test las medidas", function testLasMedidas() {
    core.expect(Math.round(contarLasTazasEnMililitros(1000) * 10), `redondear ((contar las tazas en 1000) * 10)`, 42, `42`)
  })
}

core.heading("Pruébalo")
//////////////
// ## Pruébalo
//////////////
// - Cambia "Cocinando para" a 2:  cada cantidad se reduce a la mitad.
// - Muestra el caldo en tazas:  cambia su línea en "para dibujarlo" para que diga {contar las tazas en su ajustada}.
// - Agrega una lista de pasos:  un "paso" con sus palabras, y "sus pasos son una lista de pasos" en la receta.
//
// Y después:  Fichas de recetas, en Ejemplos de la página de inicio, con sus imágenes, su pantalla de Edición y su lista de la compra.

core.heading("Dónde guarda el ejemplo sus recetas")
/////////////////////////////////////////
// ## Dónde guarda el ejemplo sus recetas
/////////////////////////////////////////
// La receta de esta guía vive en memoria:  recarga y vuelve a empezar.
// Fichas de recetas las guarda en un archivo JSON, en su propia carpeta:  __data/recipes.json.
// Una línea, en su archivo de API, lo dice:
//       recetario es un archivo json en "recetas.json"
// y una receta dice que vive ahí:
//       vive en recetario
// El servidor de páginas escribe el archivo entero, como JSON simple:  { "recipes": [ ... ] },
// cada receta con sus ingredientes y pasos dentro, como los guarda la receta de esta guía.
// Su lista de la compra no está ahí:  Fichas de recetas importa el archivo de API de Lista de la compra, en su archivo de proyecto,
//       { "path": "@spell/examples/ListaDeLaCompra", "import": ["Artículo", "Pasillo", "Recorrido"] }
// así los ingredientes que agrega van al archivo CSV de Lista de la compra, y ambos muestran la misma lista.
// -----------
if (!core.isCarryingOver) fichas.start()
// -----------
if (!core.isCarryingOver) testLasMedidas()
