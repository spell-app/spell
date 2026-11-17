import { core, Thing, List, App, View, Place, prop, derived, thing, drawn, withSpellPositions, positionOf, spellPosition, position } from "@spell/core"
import { E, SpellElement } from "@spell/elements"
import { Artículo, Pasillo, Recorrido, Planilla } from "@spell/project/@spell/examples/ListaDeLaCompra"

core.heading("Fichas de recetas:  dónde se guardan las recetas")
//////////////////////////////////////////////////////
// ## Fichas de recetas:  dónde se guardan las recetas
//////////////////////////////////////////////////////

export class Receta extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "título" es texto
  @prop({ type: "text", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 656, end: 676 } })
  accessor título!: string

  /** Para cuántas personas está escrita:  las cantidades son para ese número */
  // sus "raciones" es un número
  @prop({ type: "number", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 678, end: 782 } })
  accessor raciones!: number

  /** La dirección de una imagen:  una de la carpeta de imágenes de este ejemplo, o cualquiera de la web */
  // su "imagen" es texto
  @prop({ type: "text", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 784, end: 908 } })
  accessor imagen!: string

  /** Lo que lleva, en orden:  se guarda dentro de la receta */
  // sus "ingredientes" es una lista de ingredientes
  @prop({ itemType: "Ingrediente", init: () => new List<Ingrediente>({ instanceType: "Ingrediente" }), declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 910, end: 1017 } })
  accessor ingredientes!: List<Ingrediente>

  /** Lo que hay que hacer, en orden:  se guarda dentro de la receta */
  // sus "pasos" es una lista de pasos
  @prop({ itemType: "Paso", init: () => new List<Paso>({ instanceType: "Paso" }), declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 1019, end: 1120 } })
  accessor pasos!: List<Paso>

  static { this.declareProp("totalMarcados", { declaredAt: { path: "/Ficha.es.spell", start: 239, end: 331 }, readsFrom: ["recetario"] }) }
  @derived get totalMarcados() {
    return core.itemCountOf(core.filter(this.ingredientes, (ingrediente: Ingrediente) => ingrediente.marcado))
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
    await core.forEachSequential(this.ingredientes, async (ingrediente: Ingrediente) => {
      if (ingrediente.marcado) {
        const medida = ingrediente.mostrada
        const igual = core.getItemAt<Artículo>(core.filter(await core.savedThings(Artículo, { filter: { comprado: false } }), (artículo: Artículo) => artículo.nombre === ingrediente.nombre && artículo.unidad === medida.unidad), 0)
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

  @drawn draw() {
    return (
      <es-tarjeta class="recipe" fluido={true}>
        <es-imagen src={this.imagen} alt={this.título} proporcion="21:9" recortar={true} hidden={this.imagen !== "" ? undefined : true} />
        <es-contenido>
          <es-pila>
            <es-pila direccion="horizontal" repartir="entre">
              <es-encabezado tamano="grande">{this.título}</es-encabezado>
              {core.drawAction(this, "editar")}
            </es-pila>
            <es-texto color="gris">
              {"La receta es para "}
              {this.raciones}
              {" personas.  Estas cantidades son para las "}
              {fichas.comensales}
              {" para las que cocinas."}
            </es-texto>
            <es-encabezado tamano="pequeño">Ingredientes</es-encabezado>
            <es-pila separacion="xs">
              {core.drawEach(this.ingredientes, (ingrediente) => core.drawThing(ingrediente))}
            </es-pila>
            <es-pila direccion="horizontal">
              <es-boton color="primario" icono="cart plus" desactivado={this.totalMarcados === 0} onClick={core.pressed(this, async () => await this.agregarLosMarcadosALaListaDeLaCompra())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                {"Agregar "}
                {this.totalMarcados}
                {" ingredientes marcados a la lista de la compra"}
              </es-boton>
            </es-pila>
            <es-encabezado tamano="pequeño">Pasos</es-encabezado>
            {this.drawPasos()}
          </es-pila>
        </es-contenido>
      </es-tarjeta>
    )
  }

  drawPasos() {
    // Cada `paso` con su `número`
    return <es-pila separacion="sm" part="pasos">{this.drawPasosNumerados()}</es-pila>
  }

  drawPasosNumerados() {
    return core.drawEach(this.pasos, withSpellPositions((paso: Paso, puesto: number) => <es-pila class="step" direccion="horizontal" separacion="sm" alinear="inicio" part="pasos_numerados">
      <es-etiqueta circular={true} tamano="pequeño">{puesto}</es-etiqueta>
      <es-texto>{paso.instrucción}</es-texto>
    </es-pila>))
  }

  static savedIn = {
    place: "recetario",
    collection: "recetas",
    times: ["created", "modified"]
  }

  // vive en recetario
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 637, end: 654 } })
  accessor creado!: any /* spell: type unknown */

  // vive en recetario
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/FichasDeRecetas.api.es.spell", start: 637, end: 654 } })
  accessor modificado!: any /* spell: type unknown */
}

/**
 * `<test-project-receta>`:  a receta, drawn in its own element, e.g. by `draw the receta`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its receta's properties;  its methods call its receta's.
 * - What every view's element does, e.g. drawing its receta, is `SpellElement`'s.
 */
export class RecetaElement extends SpellElement<Receta> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-receta", "receta", [
    { name: "título", kind: "string", description: "Its título." },
    { name: "raciones", kind: "number", description: "Its raciones." },
    { name: "imagen", kind: "string", description: "Its imagen." },
    { name: "ingredientes", kind: "json", description: "Its ingredientes." },
    { name: "pasos", kind: "json", description: "Its pasos." },
    { name: "creado", kind: "json", description: "Its creado." },
    { name: "modificado", kind: "json", description: "Its modificado." }
  ])

  elegir() {
    return this.currentThing?.elegir()
  }

  editar() {
    return this.currentThing?.editar()
  }

  agregarLosMarcadosALaListaDeLaCompra() {
    return this.currentThing?.agregarLosMarcadosALaListaDeLaCompra()
  }

  drawPasos() {
    return this.currentThing?.drawPasos()
  }

  drawPasosNumerados() {
    return this.currentThing?.drawPasosNumerados()
  }
}
core.useElement(Receta, RecetaElement)
core.describeAction(Receta, "elegir", { title: "Elegirla", undoneAs: "Elegirla" })
core.describeAction(Receta, "editar", { title: "Editar", icon: "pencil", undoneAs: "Editar" })
core.describeAction(Receta, "agregarLosMarcadosALaListaDeLaCompra", { title: "Agregar a la lista de la compra", icon: "cart plus", undoneAs: "Agregar a la lista de la compra" })

/** Una línea de una receta:  cuánto, de qué, y dónde está en la tienda */
export class Ingrediente extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Para el número de personas de la propia receta;  nada para "una pizca" o "al gusto" */
  // su "cantidad" es un número
  @prop({ type: "number" })
  accessor cantidad!: number

  /** "g", "ml", "cda", "tazas" ...;  nada para una cuenta, 2 huevos */
  // su "unidad" es texto
  @prop({ type: "text" })
  accessor unidad!: string

  // su "nombre" es texto
  @prop({ type: "text" })
  accessor nombre!: string

  /** Dónde está en la tienda, para la lista de la compra */
  // su "pasillo" es texto
  @prop({ type: "text" })
  accessor pasillo!: string

  /** Cuánto pesa una taza, para mostrar los gramos como tazas:  harina 125, azúcar 200;  nada para la mayoría de las cosas */
  // su "gramos taza" es un número
  @prop({ type: "number" })
  accessor gramosTaza!: number

  /** Marcado, para ir a la lista de la compra */
  // su "marcado" es sí o no
  @prop({ type: "choice" })
  accessor marcado!: boolean

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
      if (this.unidad === "g") return medirCantidadEnUnidad(escalada / core.convertMeasure(1, "Weight", "ounce", "gram"), "oz")
      if (this.unidad === "kg") return medirCantidadEnUnidad(escalada * 1000 / core.convertMeasure(1, "Weight", "ounce", "gram"), "oz")
      if (this.unidad === "ml") return medirMililitrosEnCucharasOTazas(escalada)
      if (this.unidad === "l") return medirMililitrosEnCucharasOTazas(escalada * 1000)
    } else {
      if (this.unidad === "tazas" && this.gramosTaza > 0) return medirCantidadEnUnidad(escalada * this.gramosTaza, "g")
      if (this.unidad === "tazas") return medirCantidadEnUnidad(escalada * core.convertMeasure(1, "Volume", "cup", "milliliter"), "ml")
      if (this.unidad === "oz") return medirCantidadEnUnidad(escalada * core.convertMeasure(1, "Weight", "ounce", "gram"), "g")
      if (this.unidad === "lb") return medirCantidadEnUnidad(escalada * core.convertMeasure(1, "Weight", "pound", "gram"), "g")
    }
    if (this.unidad === "tazas" || this.unidad === "cda" || this.unidad === "cdta") return medirCantidadAlCuartoEnUnidad(escalada, this.unidad)
    return medirCantidadEnUnidad(escalada, this.unidad)
  }

  @drawn draw() {
    // Una casilla para marcarlo, cuánto, y qué
    return (
      <es-formulario prop:value={this}>
        <es-pila class="ingredient" direccion="horizontal" separacion="sm">
          <es-casilla name="marcado" aria-label="Marca para añadir a la lista de la compra" />
          <es-texto class="how-much" negrita={true}>{this.mostrada.escrito}</es-texto>
          <es-texto>{this.nombre}</es-texto>
        </es-pila>
      </es-formulario>
    )
  }
}

/**
 * `<test-project-ingrediente>`:  an ingrediente, drawn in its own element, e.g. by `draw the ingrediente`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its ingrediente's properties;  its methods call its ingrediente's.
 * - What every view's element does, e.g. drawing its ingrediente, is `SpellElement`'s.
 */
export class IngredienteElement extends SpellElement<Ingrediente> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-ingrediente", "ingrediente", [
    { name: "cantidad", kind: "number", description: "Its cantidad." },
    { name: "unidad", kind: "string", description: "Its unidad." },
    { name: "nombre", kind: "string", description: "Its nombre." },
    { name: "pasillo", kind: "string", description: "Its pasillo." },
    { name: "gramos-taza", kind: "number", description: "Its gramosTaza." },
    { name: "marcado", kind: "boolean", description: "Its marcado." }
  ])
}
core.useElement(Ingrediente, IngredienteElement)

/** Una cosa que hacer */
export class Paso extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "instrucción" es texto
  @prop({ type: "text" })
  accessor instrucción!: string
}

/**
 * `<test-project-paso>`:  a paso, drawn in its own element, e.g. by `draw the paso`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its paso's properties;  its methods call its paso's.
 * - What every view's element does, e.g. drawing its paso, is `SpellElement`'s.
 */
export class PasoElement extends SpellElement<Paso> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-paso", "paso", [
    { name: "instrucción", kind: "string", description: "Its instrucción." }
  ])
}
core.useElement(Paso, PasoElement)

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
  @prop({ type: "number" })
  accessor número!: number

  // su "unidad" es texto
  @prop({ type: "text" })
  accessor unidad!: string

  /** Como lo escribe un cocinero:  "200 g", "1 1/2 tazas", "2" */
  get escrito() {
    if (this.número === undefined || this.número === 0) return ""
    if (this.unidad === "") return escribirCantidadParaUnCocinero(this.número)
    if (this.unidad === "tazas" && this.número <= 1) return core.joined(escribirCantidadParaUnCocinero(this.número), "taza", " ")
    return core.joined(escribirCantidadParaUnCocinero(this.número), this.unidad, " ")
  }
}

/** Enteros:  gramos, mililitros, cuentas */
export function medirCantidadEnUnidad(cantidad: number, unidad: string) {
  return core.asAction({ undoneAs: "Medir Cantidad en Unidad" }, () => new Medida({ número: Math.round(cantidad), unidad: unidad }))
}

/** Al cuarto más cercano:  tazas y cucharas */
export function medirCantidadAlCuartoEnUnidad(cantidad: number, unidad: string) {
  return core.asAction({ undoneAs: "Medir Cantidad al Cuarto en Unidad" }, () => new Medida({ número: Math.round(cantidad * 4) / 4, unidad: unidad }))
}

/** La cuchara o taza que tomaría un cocinero */
export function medirMililitrosEnCucharasOTazas(mililitros: number) {
  return core.asAction({ undoneAs: "Medir Mililitros en Cucharas o Tazas" }, () => {
    if (mililitros < core.convertMeasure(1, "Volume", "tablespoon", "milliliter")) return medirCantidadAlCuartoEnUnidad(mililitros / core.convertMeasure(1, "Volume", "teaspoon", "milliliter"), "cdta")
    if (mililitros < core.convertMeasure(0.25, "Volume", "cup", "milliliter")) return medirCantidadAlCuartoEnUnidad(mililitros / core.convertMeasure(1, "Volume", "tablespoon", "milliliter"), "cda")
    return medirCantidadAlCuartoEnUnidad(mililitros / core.convertMeasure(1, "Volume", "cup", "milliliter"), "tazas")
  })
}

/** Un número entero, luego un cuarto, un medio o tres cuartos:  1.5 es "1 1/2" */
export function escribirCantidadParaUnCocinero(cantidad: number) {
  return core.asAction({ undoneAs: "Escribir Cantidad para un Cocinero" }, () => {
    const cuartos = Math.round(cantidad * 4)
    const entero = parseInt(cuartos / 4)
    const resto = cuartos - entero * 4
    let parte: string = ""
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

export type Unidades = (typeof Ficha.Unidades)[number]

@thing
export class Ficha extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** La receta que se muestra */
  // su "elegida" es una receta
  @prop({ type: "Receta" })
  accessor elegida!: Receta

  /** La receta en su pantalla de edición, mientras haya una */
  // su "editada" es una receta
  @prop({ type: "Receta" })
  accessor editada!: Receta

  /** Cuántos comen */
  // sus "comensales" es un número empezando en 4
  @prop({ type: "number", init: () => 4 })
  accessor comensales!: number

  /** Gramos y mililitros, o tazas y cucharas */
  // sus "unidades" es uno de métrico o tazas
  static Unidades = ["métrico", "tazas"] as const
  @prop({ oneOf: () => Ficha.Unidades })
  accessor unidades!: Unidades

  /** Cuánto más, o menos, de lo que dice la receta */
  static { this.declareProp("escala", { declaredAt: { path: "/FichasDeRecetas.es.spell", start: 671, end: 862 }, readsFrom: ["recetario"] }) }
  get escala() {
    if (this.elegida === undefined || this.elegida?.raciones === 0) return 1
    return this.comensales / this.elegida?.raciones
  }

  /** La propia lista de Lista de la compra, por pasillo:  la misma lista, desde su archivo CSV */
  // "recorrido" es un nuevo recorrido
  @prop({ init: () => new Recorrido({ id: "recorrido" }), early: true })
  accessor recorrido!: Recorrido

  /** La primera vez, con un archivo vacío, tres recetas para empezar */
  async create() {
    if (core.itemCountOf(await core.savedThings(Receta)) === 0) {
      agregarLaSopaDeTomate()
      agregarElDalDeLentejasRojas()
      agregarLasTortitas()
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

  @drawn draw() {
    return (
      <es-contenedor>
        <es-pila>
          <es-barra-herramientas>
            <es-texto tamano="grande" extranegrita={true} slot="titulo">Fichas de recetas</es-texto>
            {core.drawAction(this, "mostrarMétrico", { "in-menu": true })}
            {core.drawAction(this, "mostrarTazasYCucharas", { "in-menu": true })}
            <spacer />
            {core.drawAction(this, "undo", { "icon-only": true, "in-menu": true })}
            {core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })}
          </es-barra-herramientas>
          <es-cuadricula apilable={true}>
            <es-columna ancho="5">
              <es-pila>
                <es-botones direccion="vertical" fluido={true} basico={true}>
                  {core.drawRead(async () => await core.savedThings(Receta, {}, "as drawn"), (receta: Receta) => <es-boton activo={receta === receta.elegida} onClick={core.pressed(this, () => receta.elegir())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                    {receta.título}
                  </es-boton>)}
                </es-botones>
                <es-formulario prop:value={this}>
                  <es-campo etiqueta="Cocinando para">
                    <es-entrada name="comensales" type="number" min="1" etiquetado="derecha" etiqueta="personas" />
                  </es-campo>
                </es-formulario>
                <es-encabezado tamano="pequeño">Lista de la compra</es-encabezado>
                <es-texto color="gris" tamano="pequeño">
                  Los ingredientes marcados van aquí, a la propia lista de la aplicación Lista de la compra
                </es-texto>
                {core.drawThing(this.recorrido)}
              </es-pila>
            </es-columna>
            <es-columna ancho="11">{this.drawPantalla()}</es-columna>
          </es-cuadricula>
        </es-pila>
      </es-contenedor>
    )
  }

  drawPantalla() {
    // La pantalla de edición mientras se cambia una receta;  si no, la ficha de la receta elegida
    if (this.editada) return core.drawThing(new EditorDeReceta({ receta: this.editada }))
    else if (this.elegida) return core.drawThing(this.elegida!)
    else {
      return (
        <es-texto color="gris" part="pantalla">
          Elige una receta a la izquierda para ver sus ingredientes y pasos.
        </es-texto>
      )
    }
  }
}

/**
 * `<test-project-app>`:  a ficha, drawn in its own element, e.g. by `draw the ficha`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its ficha's properties;  its methods call its ficha's.
 * - What every view's element does, e.g. drawing its ficha, is `SpellElement`'s.
 */
export class FichaElement extends SpellElement<Ficha> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "ficha", [
    { name: "elegida", kind: "string", description: "Its elegida." },
    { name: "editada", kind: "string", description: "Its editada." },
    { name: "comensales", kind: "number", description: "Its comensales." },
    { name: "unidades", kind: "string", description: "Its unidades." },
    { name: "recorrido", kind: "json", description: "Its recorrido." }
  ])

  create() {
    return this.currentThing?.create()
  }

  mostrarMétrico() {
    return this.currentThing?.mostrarMétrico()
  }

  mostrarTazasYCucharas() {
    return this.currentThing?.mostrarTazasYCucharas()
  }

  drawPantalla() {
    return this.currentThing?.drawPantalla()
  }
}
core.useElement(Ficha, FichaElement)
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
  @prop({ type: "Receta" })
  accessor receta!: Receta

  /** Una copia para cambiar:  la receta queda como estaba hasta Guardar */
  get borrador() {
    return core.draftOf(this.receta!)
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

  @drawn draw() {
    return (
      <es-tarjeta class="editor" fluido={true}>
        <es-contenido>
          <es-formulario prop:value={this.borrador}>
            <es-encabezado tamano="mediano">Editar {this.receta?.título}</es-encabezado>
            <es-campos>
              <es-campo etiqueta="Receta" ancho="10">
                <es-entrada name="título" />
              </es-campo>
              <es-campo etiqueta="Porciones" ancho="6">
                <es-entrada name="raciones" type="number" min="1" etiquetado="derecha" etiqueta="personas" />
              </es-campo>
            </es-campos>
            <es-campo etiqueta="Imagen">
              <es-entrada name="imagen" marcador="Un enlace a una foto (opcional)" />
            </es-campo>
          </es-formulario>
          <es-encabezado tamano="pequeño">Ingredientes</es-encabezado>
          {this.drawFilasIngrediente()}
          {core.drawAction(this, "agregarIngrediente", { aspecto: "básico" })}
          <es-encabezado tamano="pequeño">Pasos</es-encabezado>
          {this.drawFilasPaso()}
          {core.drawAction(this, "agregarPaso", { aspecto: "básico" })}
        </es-contenido>
        <es-extra>
          {core.drawAction(this, "guardar", { color: "primary" })}
          {core.drawAction(this, "cancelar")}
        </es-extra>
      </es-tarjeta>
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

/**
 * `<test-project-editor-de-receta>`:  an editor de receta, drawn in its own element, e.g. by `draw the editor de receta`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its editor de receta's properties;  its methods call its editor de receta's.
 * - What every view's element does, e.g. drawing its editor de receta, is `SpellElement`'s.
 */
export class EditorDeRecetaElement extends SpellElement<EditorDeReceta> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-editor-de-receta", "editor de receta", [
    { name: "receta", kind: "string", description: "Its receta." }
  ])

  guardar() {
    return this.currentThing?.guardar()
  }

  cancelar() {
    return this.currentThing?.cancelar()
  }

  agregarIngrediente() {
    return this.currentThing?.agregarIngrediente()
  }

  agregarPaso() {
    return this.currentThing?.agregarPaso()
  }

  drawFilasIngrediente() {
    return this.currentThing?.drawFilasIngrediente()
  }

  drawFilasPaso() {
    return this.currentThing?.drawFilasPaso()
  }
}
core.useElement(EditorDeReceta, EditorDeRecetaElement)

/** Los campos de un ingrediente en la pantalla de edición, con botones para moverlo y quitarlo */
export class FilaIngrediente extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "ingrediente" es un ingrediente
  @prop({ type: "Ingrediente" })
  accessor ingrediente!: Ingrediente

  // su "editor" es un editor de receta
  @prop({ type: "EditorDeReceta" })
  accessor editor!: EditorDeReceta

  subir() {
    const lista = this.editor?.borrador?.ingredientes
    const movido = this.ingrediente
    const puesto = spellPosition(positionOf(lista!, movido!))
    if (puesto === 1) return
    core.remove(lista!, movido!)
    core.addBefore(lista!, core.getItemAt(lista, position(puesto - 1))!, movido!)
  }

  quitar() {
    core.remove(this.editor?.borrador?.ingredientes!, this.ingrediente!)
  }

  @drawn draw() {
    return (
      <es-formulario prop:value={this.ingrediente}>
        <es-campos no-apilable={true}>
          <es-campo ancho="2">
            <es-entrada name="cantidad" type="number" min="0" aria-label="Cantidad" />
          </es-campo>
          <es-campo ancho="2">
            <es-entrada name="unidad" marcador="g, tazas ..." aria-label="Unidad" />
          </es-campo>
          <es-campo ancho="6">
            <es-entrada name="nombre" marcador="Ingrediente" aria-label="Ingrediente" />
          </es-campo>
          <es-campo ancho="3">
            <es-entrada name="pasillo" marcador="Pasillo de la tienda" aria-label="Pasillo" />
          </es-campo>
          <es-campo ancho="3">
            <es-pila direccion="horizontal" separacion="xs">
              {core.drawAction(this, "subir", { "icon-only": true, aspecto: "terciario" })}
              {core.drawAction(this, "quitar", { "icon-only": true, aspecto: "terciario" })}
            </es-pila>
          </es-campo>
        </es-campos>
      </es-formulario>
    )
  }
}

/**
 * `<test-project-fila-ingrediente>`:  a fila ingrediente, drawn in its own element, e.g. by `draw the fila ingrediente`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its fila ingrediente's properties;  its methods call its fila ingrediente's.
 * - What every view's element does, e.g. drawing its fila ingrediente, is `SpellElement`'s.
 */
export class FilaIngredienteElement extends SpellElement<FilaIngrediente> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-fila-ingrediente", "fila ingrediente", [
    { name: "ingrediente", kind: "string", description: "Its ingrediente." },
    { name: "editor", kind: "string", description: "Its editor." }
  ])

  subir() {
    return this.currentThing?.subir()
  }

  quitar() {
    return this.currentThing?.quitar()
  }
}
core.useElement(FilaIngrediente, FilaIngredienteElement)

/** Las palabras de un paso en la pantalla de edición, con botones para moverlo y quitarlo */
export class FilaPaso extends View {
  static elementTag = core.defineElement(this, "test-project")

  // su "paso" es un paso
  @prop({ type: "Paso" })
  accessor paso!: Paso

  // su "editor" es un editor de receta
  @prop({ type: "EditorDeReceta" })
  accessor editor!: EditorDeReceta

  subir() {
    const lista = this.editor?.borrador?.pasos
    const movido = this.paso
    const puesto = spellPosition(positionOf(lista!, movido!))
    if (puesto === 1) return
    core.remove(lista!, movido!)
    core.addBefore(lista!, core.getItemAt(lista, position(puesto - 1))!, movido!)
  }

  quitar() {
    core.remove(this.editor?.borrador?.pasos!, this.paso!)
  }

  @drawn draw() {
    return (
      <es-formulario prop:value={this.paso}>
        <es-pila direccion="horizontal" separacion="xs">
          <es-area-texto name="instrucción" rows="2" aria-label="Paso" fluido={true} />
          {core.drawAction(this, "subir", { "icon-only": true, aspecto: "terciario" })}
          {core.drawAction(this, "quitar", { "icon-only": true, aspecto: "terciario" })}
        </es-pila>
      </es-formulario>
    )
  }
}

/**
 * `<test-project-fila-paso>`:  a fila paso, drawn in its own element, e.g. by `draw the fila paso`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its fila paso's properties;  its methods call its fila paso's.
 * - What every view's element does, e.g. drawing its fila paso, is `SpellElement`'s.
 */
export class FilaPasoElement extends SpellElement<FilaPaso> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-fila-paso", "fila paso", [
    { name: "paso", kind: "string", description: "Its paso." },
    { name: "editor", kind: "string", description: "Its editor." }
  ])

  subir() {
    return this.currentThing?.subir()
  }

  quitar() {
    return this.currentThing?.quitar()
  }
}
core.useElement(FilaPaso, FilaPasoElement)

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

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `RecetaElement` */
      "test-project-receta": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `IngredienteElement` */
      "test-project-ingrediente": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PasoElement` */
      "test-project-paso": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FichaElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `EditorDeRecetaElement` */
      "test-project-editor-de-receta": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FilaIngredienteElement` */
      "test-project-fila-ingrediente": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FilaPasoElement` */
      "test-project-fila-paso": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
