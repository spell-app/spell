import { core, Thing, List, App, View, Place, h, withSpellPositions, positionOf, spellPosition, position } from "@spell/core"
import { Artículo, Pasillo, Recorrido, Planilla } from "@spell/project/@spell/examples/ListaDeLaCompra"

core.heading("Fichas de recetas:  dónde se guardan las recetas")
//////////////////////////////////////////////////////
// ## Fichas de recetas:  dónde se guardan las recetas
//////////////////////////////////////////////////////

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  static { this.declareProp("título", { type: "text", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 656, end: 676 } }) }
  get título() { return this.getProp("título") }
  set título(value) { this.setProp("título", value) }

  /** Para cuántas personas está escrita:  las cantidades son para ese número */
  // sus "raciones" es un número
  static { this.declareProp("raciones", { type: "number", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 678, end: 782 } }) }
  get raciones() { return this.getProp("raciones") }
  set raciones(value) { this.setProp("raciones", value) }

  /** La dirección de una imagen:  una de la carpeta de imágenes de este ejemplo, o cualquiera de la web */
  // su "imagen" es texto
  static { this.declareProp("imagen", { type: "text", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 784, end: 908 } }) }
  get imagen() { return this.getProp("imagen") }
  set imagen(value) { this.setProp("imagen", value) }

  /** Lo que lleva, en orden:  se guarda dentro de la receta */
  // sus "ingredientes" es una lista de ingredientes
  static { this.declareProp("ingredientes", { itemType: "Ingrediente", init: () => new List({ instanceType: "Ingrediente" }), declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 910, end: 1017 } }) }
  get ingredientes() { return this.getProp("ingredientes") }
  set ingredientes(value) { this.setProp("ingredientes", value) }

  /** Lo que hay que hacer, en orden:  se guarda dentro de la receta */
  // sus "pasos" es una lista de pasos
  static { this.declareProp("pasos", { itemType: "Paso", init: () => new List({ instanceType: "Paso" }), declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 1019, end: 1120 } }) }
  get pasos() { return this.getProp("pasos") }
  set pasos(value) { this.setProp("pasos", value) }

  static { this.declareProp("totalMarcados", { declaredAt: { path: "/Ficha.es.spell", start: 239, end: 331 }, readsFrom: ["recetario"] }) }
  get totalMarcados() {
    return core.itemCountOf(core.filter(this.ingredientes, (ingrediente) => ingrediente.marcado))
  }

  /** Su ficha, en lugar de lo que se mostraba */
  elegir() {
    fichas.elegida = this
    fichas.editada = undefined
  }

  /** Su pantalla de Editar */
  editar() {
    fichas.editada = this
  }

  /** Cada ingrediente marcado, para cuantos comen, a la lista de Lista de la compra;  lo mismo en la misma `unidad` se suma */
  async agregarLosMarcadosALaListaDeLaCompra() {
    const plato = this.título
    await core.forEachSequential(this.ingredientes, async (ingrediente) => {
      if (ingrediente.marcado) {
        const medida = ingrediente.mostrada
        const igual = core.getItemAt(core.filter(await core.savedThings(Artículo, { filter: { comprado: false } }), (artículo) => artículo.nombre === ingrediente.nombre && artículo.unidad === medida.unidad), 0)
        if (igual !== undefined) igual.cantidad = igual.cantidad + medida.número
        else {
          core.saveThing(new Artículo({
            nombre: ingrediente.nombre,
            cantidad: medida.número,
            unidad: medida.unidad,
            pasillo: ingrediente.pasillo,
            receta: plato
          }))
        }
        ingrediente.marcado = false
      }
    })
  }

  draw() {
    return h("es-tarjeta", { class: "recipe", fluido: true },
      () => core.drawIf(() => this.imagen !== "", () => [
        h("es-imagen", { src: () => this.imagen, alt: () => this.título, proporcion: "21:9", recortar: true })
      ]),
      h("es-contenido",
        h("es-pila",
          h("es-pila", { direccion: "horizontal", repartir: "entre" },
            h("es-encabezado", { tamano: "grande" }, () => this.título),
            core.drawAction(this, "editar")
          ),
          h("es-texto", { color: "gris" },
            "La receta es para ",
            () => this.raciones,
            " personas.  Estas cantidades son para las ",
            () => fichas.comensales,
            " para las que cocinas."
          ),
          h("es-encabezado", { tamano: "pequeño" }, "Ingredientes"),
          h("es-pila", { separacion: "xs" },
            () => core.drawEach(this.ingredientes, (ingrediente) => core.drawThing(ingrediente))
          ),
          h("es-pila", { direccion: "horizontal" },
            h("es-boton", {
              color: "primario",
              icono: "cart plus",
              desactivado: () => this.totalMarcados === 0,
              onClick: core.pressed(this, async () => await this.agregarLosMarcadosALaListaDeLaCompra()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Agregar ", () => this.totalMarcados, " ingredientes marcados a la lista de la compra")
          ),
          h("es-encabezado", { tamano: "pequeño" }, "Pasos"),
          () => this.drawPasos()
        )
      )
    )
  }

  drawPasos() {
    // Cada `paso` con su `número`
    return h("es-pila", { separacion: "sm", part: "pasos" }, () => this.drawPasosNumerados())
  }

  drawPasosNumerados() {
    return core.drawEach(this.pasos, withSpellPositions((paso, puesto) => h("es-pila", {
      class: "step",
      direccion: "horizontal",
      separacion: "sm",
      alinear: "inicio",
      part: "pasos_numerados"
    },
      h("es-etiqueta", { circular: true, tamano: "pequeño" }, () => puesto),
      h("es-texto", () => paso.instrucción)
    )))
  }

  static savedIn = {
    place: "recetario",
    collection: "recetas",
    times: ["created", "modified"]
  }

  // vive en recetario
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 637, end: 654 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en recetario
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 637, end: 654 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}
core.describeAction(Receta, "elegir", { title: "Elegirla", undoneAs: "Elegirla" })
core.describeAction(Receta, "editar", { title: "Editar", icon: "pencil", undoneAs: "Editar" })
core.describeAction(Receta, "agregarLosMarcadosALaListaDeLaCompra", { title: "Agregar a la lista de la compra", icon: "cart plus", undoneAs: "Agregar a la lista de la compra" })

/** Una línea de una receta:  cuánto, de qué, y dónde está en la tienda */
export class Ingrediente extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Para el número de personas de la propia receta;  nada para "una pizca" o "al gusto" */
  // su "cantidad" es un número
  static { this.declareProp("cantidad", { type: "number" }) }
  get cantidad() { return this.getProp("cantidad") }
  set cantidad(value) { this.setProp("cantidad", value) }

  /** "g", "ml", "cda", "tazas" ...;  nada para una cuenta, 2 huevos */
  // su "unidad" es texto
  static { this.declareProp("unidad", { type: "text" }) }
  get unidad() { return this.getProp("unidad") }
  set unidad(value) { this.setProp("unidad", value) }

  // su "nombre" es texto
  static { this.declareProp("nombre", { type: "text" }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  /** Dónde está en la tienda, para la lista de la compra */
  // su "pasillo" es texto
  static { this.declareProp("pasillo", { type: "text" }) }
  get pasillo() { return this.getProp("pasillo") }
  set pasillo(value) { this.setProp("pasillo", value) }

  /** Cuánto pesa una taza, para mostrar los gramos como tazas:  harina 125, azúcar 200;  nada para la mayoría de las cosas */
  // su "gramos taza" es un número
  static { this.declareProp("gramosTaza", { type: "number" }) }
  get gramosTaza() { return this.getProp("gramosTaza") }
  set gramosTaza(value) { this.setProp("gramosTaza", value) }

  /** Marcado, para ir a la lista de la compra */
  // su "marcado" es sí o no
  static { this.declareProp("marcado", { type: "choice" }) }
  get marcado() { return this.getProp("marcado") }
  set marcado(value) { this.setProp("marcado", value) }

  /** Para cuantos comen:  su `cantidad` por `comensales` entre `raciones` */
  static { this.declareProp("cantidadEscalada", { declaredAt: { path: "/Ingrediente.es.spell", start: 273, end: 332 }, readsFrom: ["recetario"] }) }
  get cantidadEscalada() {
    return this.cantidad * fichas.escala
  }

  /** Su `cantidad escalada` en las unidades de quien cocina */
  static { this.declareProp("mostrada", { declaredAt: { path: "/Ingrediente.es.spell", start: 408, end: 1457 }, readsFrom: ["recetario"] }) }
  get mostrada() {
    const escalada = this.cantidadEscalada
    if (fichas.unidades === "tazas") {
      if (this.unidad === "g" && this.gramosTaza > 0) return medirCantidadAlCuartoEnUnidad(escalada / this.gramosTaza, "tazas")
      if (this.unidad === "g") {
        return medirCantidadEnUnidad(escalada / core.convertMeasure(
          1,
          "Weight",
          "ounce",
          "gram"
        ), "oz")
      }
      if (this.unidad === "kg") {
        return medirCantidadEnUnidad(escalada * 1000 / core.convertMeasure(
          1,
          "Weight",
          "ounce",
          "gram"
        ), "oz")
      }
      if (this.unidad === "ml") return medirMililitrosEnCucharasOTazas(escalada)
      if (this.unidad === "l") return medirMililitrosEnCucharasOTazas(escalada * 1000)
    } else {
      if (this.unidad === "tazas" && this.gramosTaza > 0) return medirCantidadEnUnidad(escalada * this.gramosTaza, "g")
      if (this.unidad === "tazas") {
        return medirCantidadEnUnidad(escalada * core.convertMeasure(
          1,
          "Volume",
          "cup",
          "milliliter"
        ), "ml")
      }
      if (this.unidad === "oz") {
        return medirCantidadEnUnidad(escalada * core.convertMeasure(
          1,
          "Weight",
          "ounce",
          "gram"
        ), "g")
      }
      if (this.unidad === "lb") {
        return medirCantidadEnUnidad(escalada * core.convertMeasure(
          1,
          "Weight",
          "pound",
          "gram"
        ), "g")
      }
    }
    if (this.unidad === "tazas" || this.unidad === "cda" || this.unidad === "cdta") return medirCantidadAlCuartoEnUnidad(escalada, this.unidad)
    return medirCantidadEnUnidad(escalada, this.unidad)
  }

  draw() {
    // Una casilla para marcarlo, cuánto, y qué
    return h("es-formulario", { "prop:value": this },
      h("es-pila", { class: "ingredient", direccion: "horizontal", separacion: "sm" },
        h("es-casilla", { name: "marcado", "aria-label": "Marca para añadir a la lista de la compra" }),
        h("es-texto", { class: "how-much", negrita: true }, () => this.mostrada.escrito),
        h("es-texto", () => this.nombre)
      )
    )
  }
}

/** Una cosa que hacer */
export class Paso extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "instrucción" es texto
  static { this.declareProp("instrucción", { type: "text" }) }
  get instrucción() { return this.getProp("instrucción") }
  set instrucción(value) { this.setProp("instrucción", value) }
}

/**
 * En un archivo JSON, en la propia carpeta de este ejemplo:  __data/recetas.json.
 * JSON simple que abre cualquier editor, { "recetas": [...] }:  cada receta entera, con sus ingredientes y pasos dentro.
 * El servidor de páginas lo escribe, el archivo entero cada vez que se guarda;  todos los que usan ese servidor de páginas comparten las recetas.
 * La lista de la compra no está aquí:  es de Lista de la compra, en su archivo CSV, que este proyecto importa (__project.json5).
 */
export class Recetario extends Place {}
export const recetario = core.place(new Recetario(), {
  name: "recetario",
  kind: "file",
  at: "/api/places/spaces/@spell/examples/FichasDeRecetas/__data/recetas.json",
  checkedEvery: 30,
  unclearNumbers: ","
})

// -----------
core.heading("Medidas:  una cantidad en las unidades del cocinero")
/////////////////////////////////////////////////////////
// ## Medidas:  una cantidad en las unidades del cocinero
/////////////////////////////////////////////////////////
// Métrico (gramos y mililitros), o tazas y cucharas:  la misma cantidad, mostrada de cualquier forma.
// Los tamaños de las unidades son las medidas propias de Spell, p. ej. "1 taza en ml" es 236.6.
// Los gramos y las cuentas se muestran enteros;  las tazas y cucharas al cuarto más cercano, "1 1/2".

/** Cuánto, y en qué:  lo que muestra un ingrediente, y lo que va en la lista de la compra */
export class Medida extends Thing {
  // su "número" es un número
  static { this.declareProp("número", { type: "number" }) }
  get número() { return this.getProp("número") }
  set número(value) { this.setProp("número", value) }

  // su "unidad" es texto
  static { this.declareProp("unidad", { type: "text" }) }
  get unidad() { return this.getProp("unidad") }
  set unidad(value) { this.setProp("unidad", value) }

  /** Como lo escribe un cocinero:  "200 g", "1 1/2 tazas", "2" */
  get escrito() {
    if (this.número === undefined || this.número === 0) return ""
    if (this.unidad === "") return escribirCantidadParaUnCocinero(this.número)
    if (this.unidad === "tazas" && this.número <= 1) return core.joined(escribirCantidadParaUnCocinero(this.número), "taza", " ")
    return core.joined(escribirCantidadParaUnCocinero(this.número), this.unidad, " ")
  }
}

/** Enteros:  gramos, mililitros, cuentas */
export function medirCantidadEnUnidad(cantidad, unidad) {
  return core.asAction({ undoneAs: "Medir Cantidad en Unidad" }, () => new Medida({ número: Math.round(cantidad), unidad: unidad }))
}

/** Al cuarto más cercano:  tazas y cucharas */
export function medirCantidadAlCuartoEnUnidad(cantidad, unidad) {
  return core.asAction({ undoneAs: "Medir Cantidad al Cuarto en Unidad" }, () => new Medida({ número: Math.round(cantidad * 4) / 4, unidad: unidad }))
}

/** La cuchara o taza que tomaría un cocinero */
export function medirMililitrosEnCucharasOTazas(mililitros) {
  return core.asAction({ undoneAs: "Medir Mililitros en Cucharas o Tazas" }, () => {
    if (mililitros < core.convertMeasure(
      1,
      "Volume",
      "tablespoon",
      "milliliter"
    )) {
      return medirCantidadAlCuartoEnUnidad(mililitros / core.convertMeasure(
        1,
        "Volume",
        "teaspoon",
        "milliliter"
      ), "cdta")
    }
    if (mililitros < core.convertMeasure(
      0.25,
      "Volume",
      "cup",
      "milliliter"
    )) {
      return medirCantidadAlCuartoEnUnidad(mililitros / core.convertMeasure(
        1,
        "Volume",
        "tablespoon",
        "milliliter"
      ), "cda")
    }
    return medirCantidadAlCuartoEnUnidad(mililitros / core.convertMeasure(
      1,
      "Volume",
      "cup",
      "milliliter"
    ), "tazas")
  })
}

/** Un número entero, luego un cuarto, un medio o tres cuartos:  1.5 es "1 1/2" */
export function escribirCantidadParaUnCocinero(cantidad) {
  return core.asAction({ undoneAs: "Escribir Cantidad para un Cocinero" }, () => {
    const cuartos = Math.round(cantidad * 4)
    const entero = parseInt(cuartos / 4)
    const resto = cuartos - entero * 4
    let parte = ""
    if (resto === 1) parte = "1/4"
    if (resto === 2) parte = "1/2"
    if (resto === 3) parte = "3/4"
    if (parte === "") return `${entero}`
    if (entero === 0) return parte
    return core.joined(entero, parte, " ")
  })
}

export function testFracciones() {
  return core.test("test fracciones", function testFracciones() {
    core.expect(escribirCantidadParaUnCocinero(1.5), `escribir 1.5 para un cocinero`, "1 1/2", `"1 1/2"`)
    core.expect(escribirCantidadParaUnCocinero(0.25), `escribir 0.25 para un cocinero`, "1/4", `"1/4"`)
    core.expect(escribirCantidadParaUnCocinero(200), `escribir 200 para un cocinero`, "200", `"200"`)
    core.expect(medirMililitrosEnCucharasOTazas(250).escrito, `el escrito de (medir 250 en cucharas o tazas)`, "1 taza", `"1 taza"`)
    core.expect(medirMililitrosEnCucharasOTazas(15).escrito, `el escrito de (medir 15 en cucharas o tazas)`, "1 cda", `"1 cda"`)
  })
}
// -----------
core.heading("Tres recetas para empezar")
///////////////////////////////
// ## Tres recetas para empezar
///////////////////////////////
// Se añaden la primera vez que se abre Fichas de recetas, mientras su archivo no tiene ninguna:  cámbialas o añade las tuyas.
// Las imágenes se dibujaron para este ejemplo y son de uso libre:  están en la carpeta pictures de Recipe Cards.

export function agregarLaSopaDeTomate() {
  return core.asAction({ undoneAs: "Agregar la Sopa de Tomate" }, () => {
    const sopa = new Receta({
      título: "Sopa de Tomate",
      raciones: 4,
      imagen: "/spaces/@spell/examples/RecipeCards/pictures/tomato-soup.svg"
    })
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 1,
      unidad: "kg",
      nombre: "tomates maduros",
      pasillo: "Frutas y verduras"
    }))
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 1,
      nombre: "cebolla",
      pasillo: "Frutas y verduras"
    }))
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 2,
      unidad: "dientes",
      nombre: "ajo",
      pasillo: "Frutas y verduras"
    }))
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 2,
      unidad: "cda",
      nombre: "aceite de oliva",
      pasillo: "Aceites y especias"
    }))
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 500,
      unidad: "ml",
      nombre: "caldo de verduras",
      pasillo: "Latas y conservas"
    }))
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 1,
      unidad: "cdta",
      nombre: "azúcar",
      pasillo: "Repostería"
    }))
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 15,
      unidad: "g",
      nombre: "albahaca fresca",
      pasillo: "Frutas y verduras"
    }))
    core.append(sopa.ingredientes, new Ingrediente({
      cantidad: 100,
      unidad: "ml",
      nombre: "nata líquida",
      pasillo: "Lácteos"
    }))
    core.append(sopa.pasos, new Paso({ instrucción: "Calienta el horno a 200 °C.  Corta los tomates por la mitad y ásalos 30 minutos con la cebolla, en cuartos, y el ajo." }))
    core.append(sopa.pasos, new Paso({ instrucción: "Calienta el aceite en una olla grande y echa todo lo de la bandeja del horno." }))
    core.append(sopa.pasos, new Paso({ instrucción: "Vierte el caldo, añade el azúcar y cuece a fuego lento 10 minutos." }))
    core.append(sopa.pasos, new Paso({ instrucción: "Tritura hasta que quede fino, con casi toda la albahaca.  Sazona con sal y pimienta." }))
    core.append(sopa.pasos, new Paso({ instrucción: "Sirve con un chorrito de nata y el resto de la albahaca por encima." }))
    core.saveThing(sopa)
  })
}

export function agregarElDalDeLentejasRojas() {
  return core.asAction({ undoneAs: "Agregar el Dal de Lentejas Rojas" }, () => {
    const dal = new Receta({
      título: "Dal de Lentejas Rojas",
      raciones: 4,
      imagen: "/spaces/@spell/examples/RecipeCards/pictures/red-lentil-dal.svg"
    })
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 250,
      unidad: "g",
      nombre: "lentejas rojas",
      pasillo: "Arroz y legumbres",
      gramosTaza: 190
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 1,
      nombre: "cebolla",
      pasillo: "Frutas y verduras"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 3,
      unidad: "dientes",
      nombre: "ajo",
      pasillo: "Frutas y verduras"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 20,
      unidad: "g",
      nombre: "jengibre fresco",
      pasillo: "Frutas y verduras"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 1,
      unidad: "cda",
      nombre: "aceite vegetal",
      pasillo: "Aceites y especias"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 2,
      unidad: "cdta",
      nombre: "semillas de comino",
      pasillo: "Aceites y especias"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 1,
      unidad: "cdta",
      nombre: "cúrcuma molida",
      pasillo: "Aceites y especias"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 400,
      unidad: "g",
      nombre: "tomate troceado",
      pasillo: "Latas y conservas"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 400,
      unidad: "ml",
      nombre: "leche de coco",
      pasillo: "Latas y conservas"
    }))
    core.append(dal.ingredientes, new Ingrediente({
      cantidad: 1,
      nombre: "lima",
      pasillo: "Frutas y verduras"
    }))
    core.append(dal.pasos, new Paso({ instrucción: "Enjuaga las lentejas hasta que el agua salga limpia." }))
    core.append(dal.pasos, new Paso({ instrucción: "Fríe las semillas de comino en el aceite hasta que crepiten, y luego la cebolla, picada, hasta que esté blanda." }))
    core.append(dal.pasos, new Paso({ instrucción: "Añade el ajo y el jengibre, rallados, y la cúrcuma, y remueve un minuto." }))
    core.append(dal.pasos, new Paso({ instrucción: "Añade las lentejas, el tomate, la leche de coco y 500 ml de agua.  Cuece a fuego lento 25 minutos, removiendo de vez en cuando." }))
    core.append(dal.pasos, new Paso({ instrucción: "Exprime la lima, sazona con sal y sirve con arroz." }))
    core.saveThing(dal)
  })
}

export function agregarLasTortitas() {
  return core.asAction({ undoneAs: "Agregar las Tortitas" }, () => {
    const tortitas = new Receta({
      título: "Tortitas de Arándanos",
      raciones: 4,
      imagen: "/spaces/@spell/examples/RecipeCards/pictures/pancakes.svg"
    })
    core.append(tortitas.ingredientes, new Ingrediente({
      cantidad: 200,
      unidad: "g",
      nombre: "harina de trigo",
      pasillo: "Repostería",
      gramosTaza: 125
    }))
    core.append(tortitas.ingredientes, new Ingrediente({
      cantidad: 2,
      unidad: "cdta",
      nombre: "levadura química",
      pasillo: "Repostería"
    }))
    core.append(tortitas.ingredientes, new Ingrediente({
      cantidad: 1,
      unidad: "cda",
      nombre: "azúcar",
      pasillo: "Repostería"
    }))
    core.append(tortitas.ingredientes, new Ingrediente({
      cantidad: 2,
      nombre: "huevos",
      pasillo: "Lácteos"
    }))
    core.append(tortitas.ingredientes, new Ingrediente({
      cantidad: 300,
      unidad: "ml",
      nombre: "leche",
      pasillo: "Lácteos"
    }))
    core.append(tortitas.ingredientes, new Ingrediente({
      cantidad: 30,
      unidad: "g",
      nombre: "mantequilla",
      pasillo: "Lácteos"
    }))
    core.append(tortitas.ingredientes, new Ingrediente({
      cantidad: 150,
      unidad: "g",
      nombre: "arándanos",
      pasillo: "Frutas y verduras"
    }))
    core.append(tortitas.pasos, new Paso({ instrucción: "Bate la harina, la levadura, el azúcar y una pizca de sal en un bol." }))
    core.append(tortitas.pasos, new Paso({ instrucción: "Derrite la mantequilla.  Bátela con los huevos y la leche, y luego mézclala con la harina hasta que quede lisa." }))
    core.append(tortitas.pasos, new Paso({ instrucción: "Calienta una sartén a fuego medio, con un poco de mantequilla." }))
    core.append(tortitas.pasos, new Paso({ instrucción: "Vierte un cucharón pequeño de masa, esparce unos arándanos y cocina hasta que salgan burbujas.  Dale la vuelta y cocina un minuto más." }))
    core.append(tortitas.pasos, new Paso({ instrucción: "Mantenlas calientes mientras cocinas el resto, y sírvelas con sirope de arce." }))
    core.saveThing(tortitas)
  })
}
// -----------
core.heading("Fichas de recetas")
///////////////////////
// ## Fichas de recetas
///////////////////////
// Tus recetas:  elige una, indica cuántos comen, y cada cantidad se ajusta;
// muéstrala en métrico o en tazas y cucharas;  marca ingredientes y agrégalos a la lista de la compra.
// Las recetas están en un archivo JSON, FichasDeRecetas.api.es.spell dice dónde;  la lista de la compra es la de Lista de la compra, importada.

export class Ficha extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** La receta que se muestra */
  // su "elegida" es una receta
  static { this.declareProp("elegida", { type: "Receta" }) }
  get elegida() { return this.getProp("elegida") }
  set elegida(value) { this.setProp("elegida", value) }

  /** La receta en su pantalla de edición, mientras haya una */
  // su "editada" es una receta
  static { this.declareProp("editada", { type: "Receta" }) }
  get editada() { return this.getProp("editada") }
  set editada(value) { this.setProp("editada", value) }

  /** Cuántos comen */
  // sus "comensales" es un número empezando en 4
  static { this.declareProp("comensales", { type: "number", init: () => 4 }) }
  get comensales() { return this.getProp("comensales") }
  set comensales(value) { this.setProp("comensales", value) }

  /** Gramos y mililitros, o tazas y cucharas */
  // sus "unidades" es uno de métrico o tazas
  static Unidades = ["métrico", "tazas"]
  static { this.declareProp("unidades", { oneOf: Ficha.Unidades }) }
  get unidades() { return this.getProp("unidades") }
  set unidades(value) { this.setProp("unidades", value) }

  /** Cuánto más, o menos, de lo que dice la receta */
  static { this.declareProp("escala", { declaredAt: { path: "/FichasDeRecetas.es.spell", start: 671, end: 862 }, readsFrom: ["recetario"] }) }
  get escala() {
    if (this.elegida === undefined || this.elegida?.raciones === 0) return 1
    return this.comensales / this.elegida?.raciones
  }

  /** La propia lista de Lista de la compra, por pasillo:  la misma lista, desde su archivo CSV */
  // "recorrido" es un nuevo recorrido
  static { this.declareProp("recorrido", { init: () => new Recorrido({ id: "recorrido" }), early: true }) }
  get recorrido() { return this.getProp("recorrido") }
  set recorrido(value) { this.setProp("recorrido", value) }

  /** La primera vez, con un archivo vacío, tres recetas para empezar */
  async create() {
    try {
      if (core.itemCountOf(await core.savedThings(Receta)) === 0) {
        agregarLaSopaDeTomate()
        agregarElDalDeLentejasRojas()
        agregarLasTortitas()
      }
    }
    catch (error) {
      // El archivo no se puede leer ahora:  la lista de recetas lo dice
      return
    }
    this.elegida = core.getItemAt(await core.savedThings(Receta), 0)
  }

  mostrarMétrico() {
    this.unidades = "métrico"
  }
  get mostrarMétricoIsSelected() {
    return this.unidades === "métrico"
  }

  mostrarTazasYCucharas() {
    this.unidades = "tazas"
  }
  get mostrarTazasYCucharasIsSelected() {
    return this.unidades === "tazas"
  }

  draw() {
    return h("es-contenedor",
      h("es-pila",
        h("es-barra-herramientas",
          h("es-texto", { tamano: "grande", extranegrita: true, slot: "titulo" }, "Fichas de recetas"),
          core.drawAction(this, "mostrarMétrico", { "in-menu": true }),
          core.drawAction(this, "mostrarTazasYCucharas", { "in-menu": true }),
          h("spacer"),
          core.drawAction(this, "undo", { "icon-only": true, "in-menu": true }),
          core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })
        ),
        h("es-cuadricula", { apilable: true },
          h("es-columna", { ancho: "5" },
            h("es-pila",
              h("es-botones", { direccion: "vertical", fluido: true, basico: true },
                () => core.drawRead(async () => await core.savedThings(Receta, {}, "as drawn"), (receta) => h("es-boton", {
                  activo: () => receta === receta.elegida,
                  onClick: core.pressed(this, () => receta.elegir()),
                  style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
                }, () => receta.título))
              ),
              h("es-formulario", { "prop:value": this },
                h("es-campo", { etiqueta: "Cocinando para" },
                  h("es-entrada", { name: "comensales", type: "number", min: "1", etiquetado: "derecha", etiqueta: "personas" })
                )
              ),
              h("es-encabezado", { tamano: "pequeño" }, "Lista de la compra"),
              h("es-texto", { color: "gris", tamano: "pequeño" },
                "Los ingredientes marcados van aquí, a la propia lista de la aplicación Lista de la compra"
              ),
              () => core.drawThing(this.recorrido)
            )
          ),
          h("es-columna", { ancho: "11" }, () => this.drawPantalla())
        )
      )
    )
  }

  drawPantalla() {
    // La pantalla de edición mientras se cambia una receta;  si no, la ficha de la receta elegida
    if (this.editada) return core.drawThing(new EditorDeReceta({ receta: this.editada }))
    else if (this.elegida) return core.drawThing(this.elegida)
    else {
      return h("es-texto", { color: "gris", part: "pantalla" },
        "Elige una receta a la izquierda para ver sus ingredientes y pasos."
      )
    }
  }
}
export const fichas = new Ficha()
core.describeAction(Ficha, "mostrarMétrico", { title: "Gramos y ml", selectedWhen: "mostrarMétricoIsSelected", undoneAs: "Gramos y ml" })
core.describeAction(Ficha, "mostrarTazasYCucharas", { title: "Tazas y cucharas", selectedWhen: "mostrarTazasYCucharasIsSelected", undoneAs: "Tazas y cucharas" })

// -----------
core.heading("Un ingrediente, escalado y en las unidades de quien cocina")
////////////////////////////////////////////////////////////////
// ## Un ingrediente, escalado y en las unidades de quien cocina
////////////////////////////////////////////////////////////////
// Su `cantidad` es para las raciones de la propia receta:  se muestra para cuantos comen, en sistema métrico o en tazas y cucharas.
// Una casilla a su lado lo marca para la lista de la compra.

// -----------
core.heading("La ficha de una receta, y su pantalla de Editar")
/////////////////////////////////////////////////////
// ## La ficha de una receta, y su pantalla de Editar
/////////////////////////////////////////////////////
// La ficha:  su `imagen`, para cuántos es, sus `ingredientes` para marcar, y sus `pasos numerados`.
// La pantalla de Editar cambia un `borrador`:  nada cambia hasta Guardar.

// -----------
core.heading("La pantalla de edición de una receta")
//////////////////////////////////////////
// ## La pantalla de edición de una receta
//////////////////////////////////////////
// Un formulario sobre un borrador de la receta:  cambia su título, para cuántos rinde y su imagen;
// agrega, quita y mueve sus ingredientes y pasos.  Nada cambia hasta Guardar;  Cancelar lo olvida todo.

export class EditorDeReceta extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** La receta que se está cambiando */
  // su "receta" es una receta
  static { this.declareProp("receta", { type: "Receta" }) }
  get receta() { return this.getProp("receta") }
  set receta(value) { this.setProp("receta", value) }

  /** Una copia para cambiar:  la receta queda como estaba hasta Guardar */
  get borrador() {
    return core.draftOf(this.receta)
  }

  /** Todos los cambios de una vez, un solo paso para deshacer */
  guardar() {
    core.saveDraft(this.borrador)
    fichas.editada = undefined
  }

  /** La receta nunca cambió */
  cancelar() {
    core.discardDraft(this.borrador)
    fichas.editada = undefined
  }

  agregarIngrediente() {
    core.append(this.borrador.ingredientes, new Ingrediente())
  }

  agregarPaso() {
    core.append(this.borrador.pasos, new Paso())
  }

  draw() {
    return h("es-tarjeta", { class: "editor", fluido: true },
      h("es-contenido",
        h("es-formulario", { "prop:value": () => this.borrador },
          h("es-encabezado", { tamano: "mediano" }, "Editar ", () => this.receta?.título),
          h("es-campos",
            h("es-campo", { etiqueta: "Receta", ancho: "10" }, h("es-entrada", { name: "título" })),
            h("es-campo", { etiqueta: "Porciones", ancho: "6" },
              h("es-entrada", { name: "raciones", type: "number", min: "1", etiquetado: "derecha", etiqueta: "personas" })
            )
          ),
          h("es-campo", { etiqueta: "Imagen" },
            h("es-entrada", { name: "imagen", marcador: "Un enlace a una foto (opcional)" })
          )
        ),
        h("es-encabezado", { tamano: "pequeño" }, "Ingredientes"),
        () => this.drawFilasIngrediente(),
        core.drawAction(this, "agregarIngrediente", { aspecto: "básico" }),
        h("es-encabezado", { tamano: "pequeño" }, "Pasos"),
        () => this.drawFilasPaso(),
        core.drawAction(this, "agregarPaso", { aspecto: "básico" })
      ),
      h("es-extra",
        core.drawAction(this, "guardar", { color: "primary" }),
        core.drawAction(this, "cancelar")
      )
    )
  }

  drawFilasIngrediente() {
    /** Una fila de campos para cada ingrediente del borrador */
    const esteEditor = this
    return core.drawEach(this.borrador.ingredientes, (ejemplar) => core.drawThing(new FilaIngrediente({ editor: esteEditor, ingrediente: ejemplar })))
  }

  drawFilasPaso() {
    /** Un cuadro para cada paso del borrador */
    const esteEditor = this
    return core.drawEach(this.borrador.pasos, (ejemplar) => core.drawThing(new FilaPaso({ editor: esteEditor, paso: ejemplar })))
  }
}

/** Los campos de un ingrediente en la pantalla de edición, con botones para moverlo y quitarlo */
export class FilaIngrediente extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "ingrediente" es un ingrediente
  static { this.declareProp("ingrediente", { type: "Ingrediente" }) }
  get ingrediente() { return this.getProp("ingrediente") }
  set ingrediente(value) { this.setProp("ingrediente", value) }

  // su "editor" es un editor de receta
  static { this.declareProp("editor", { type: "EditorDeReceta" }) }
  get editor() { return this.getProp("editor") }
  set editor(value) { this.setProp("editor", value) }

  subir() {
    const lista = this.editor?.borrador?.ingredientes
    const movido = this.ingrediente
    const puesto = spellPosition(positionOf(lista, movido))
    if (puesto === 1) return
    core.remove(lista, movido)
    core.addBefore(lista, core.getItemAt(lista, position(puesto - 1)), movido)
  }

  quitar() {
    core.remove(this.editor?.borrador?.ingredientes, this.ingrediente)
  }

  draw() {
    return h("es-formulario", { "prop:value": () => this.ingrediente },
      h("es-campos", { "no-apilable": true },
        h("es-campo", { ancho: "2" },
          h("es-entrada", { name: "cantidad", type: "number", min: "0", "aria-label": "Cantidad" })
        ),
        h("es-campo", { ancho: "2" },
          h("es-entrada", { name: "unidad", marcador: "g, tazas ...", "aria-label": "Unidad" })
        ),
        h("es-campo", { ancho: "6" },
          h("es-entrada", { name: "nombre", marcador: "Ingrediente", "aria-label": "Ingrediente" })
        ),
        h("es-campo", { ancho: "3" },
          h("es-entrada", { name: "pasillo", marcador: "Pasillo de la tienda", "aria-label": "Pasillo" })
        ),
        h("es-campo", { ancho: "3" },
          h("es-pila", { direccion: "horizontal", separacion: "xs" },
            core.drawAction(this, "subir", { "icon-only": true, aspecto: "terciario" }),
            core.drawAction(this, "quitar", { "icon-only": true, aspecto: "terciario" })
          )
        )
      )
    )
  }
}

/** Las palabras de un paso en la pantalla de edición, con botones para moverlo y quitarlo */
export class FilaPaso extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "paso" es un paso
  static { this.declareProp("paso", { type: "Paso" }) }
  get paso() { return this.getProp("paso") }
  set paso(value) { this.setProp("paso", value) }

  // su "editor" es un editor de receta
  static { this.declareProp("editor", { type: "EditorDeReceta" }) }
  get editor() { return this.getProp("editor") }
  set editor(value) { this.setProp("editor", value) }

  subir() {
    const lista = this.editor?.borrador?.pasos
    const movido = this.paso
    const puesto = spellPosition(positionOf(lista, movido))
    if (puesto === 1) return
    core.remove(lista, movido)
    core.addBefore(lista, core.getItemAt(lista, position(puesto - 1)), movido)
  }

  quitar() {
    core.remove(this.editor?.borrador?.pasos, this.paso)
  }

  draw() {
    return h("es-formulario", { "prop:value": () => this.paso },
      h("es-pila", { direccion: "horizontal", separacion: "xs" },
        h("es-area-texto", { name: "instrucción", rows: "2", "aria-label": "Paso", fluido: true }),
        core.drawAction(this, "subir", { "icon-only": true, aspecto: "terciario" }),
        core.drawAction(this, "quitar", { "icon-only": true, aspecto: "terciario" })
      )
    )
  }
}

core.describeAction(EditorDeReceta, "guardar", { title: "Guardar cambios", icon: "check", undoneAs: "Guardar cambios" })
core.describeAction(EditorDeReceta, "cancelar", { title: "Cancelar", icon: "close", undoneAs: "Cancelar" })
core.describeAction(EditorDeReceta, "agregarIngrediente", { title: "Agregar un ingrediente", icon: "plus", undoneAs: "Agregar un ingrediente" })
core.describeAction(EditorDeReceta, "agregarPaso", { title: "Agregar un paso", icon: "plus", undoneAs: "Agregar un paso" })

core.describeAction(FilaIngrediente, "subir", { title: "Subir", icon: "arrow up", undoneAs: "Subir" })
core.describeAction(FilaIngrediente, "quitar", { title: "Quitar", icon: "trash alternate outline", undoneAs: "Quitar" })

core.describeAction(FilaPaso, "subir", { title: "Subir", icon: "arrow up", undoneAs: "Subir" })
core.describeAction(FilaPaso, "quitar", { title: "Quitar", icon: "trash alternate outline", undoneAs: "Quitar" })

// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet. */¬¬/* the shopping list's ticked items:  they fade, as on Lista de la compra */¬.got {¬  opacity: 0.6;¬}¬`)
// -----------
if (!core.isCarryingOver) fichas.start()
// -----------
if (!core.isCarryingOver) testFracciones()
