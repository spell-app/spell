import { core, List, App, View, Place, h } from "@spell/core"

export class Artículo extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("nombre", { type: "text" }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  static { this.declareProp("cantidad", { type: "number" }) }
  get cantidad() { return this.getProp("cantidad") }
  set cantidad(value) { this.setProp("cantidad", value) }

  static { this.declareProp("unidad", { type: "text" }) }
  get unidad() { return this.getProp("unidad") }
  set unidad(value) { this.setProp("unidad", value) }

  static { this.declareProp("pasillo", { type: "text" }) }
  get pasillo() { return this.getProp("pasillo") }
  set pasillo(value) { this.setProp("pasillo", value) }

  static { this.declareProp("comprado", { type: "choice" }) }
  get comprado() { return this.getProp("comprado") }
  set comprado(value) { this.setProp("comprado", value) }

  static { this.declareProp("receta", { type: "text" }) }
  get receta() { return this.getProp("receta") }
  set receta(value) { this.setProp("receta", value) }

  static { this.declareProp("seNecesita", { readsFrom: ["planilla"] }) }
  get seNecesita() {
    return !this.comprado
  }

  static { this.declareProp("porción", { readsFrom: ["planilla"] }) }
  get porción() {
    if (this.cantidad === undefined || this.cantidad === 0) return ""
    return core.joined(this.cantidad, this.unidad, " ")
  }

  sacar() {
    core.removeSaved(this)
  }

  draw() {
    return h("es-formulario", { "prop:value": this },
      h("es-pila", { class: "item", direccion: "horizontal", separacion: "sm" },
        h("es-casilla", { name: "comprado", "aria-label": "Lo tengo" }),
        h("es-texto", { class: "how-much", negrita: true }, () => this.porción),
        h("es-texto", { class: "name" }, () => this.nombre),
        () => core.drawIf(() => this.receta !== "", () => [h("es-texto", { class: "for", color: "gris", tamano: "pequeño" }, "para ", () => this.receta)]),
        core.drawAction(this, "sacar", { "icon-only": true, appearance: "tertiary" })
      )
    )
  }

  static savedIn = {
    place: "planilla",
    collection: "artículos",
    times: ["created", "modified"]
  }

  static { this.declareProp("creado", { type: "date", storedAs: "created" }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  static { this.declareProp("modificado", { type: "date", storedAs: "modified" }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}
core.describeAction(Artículo, "sacar", { title: "Sacar", icon: "close", undoneAs: "Sacar" })

export class Planilla extends Place {}
export const planilla = core.place(new Planilla(), {
  name: "planilla",
  kind: "sheet",
  at: "/api/places/spaces/@spell/examples/ListaDeLaCompra/__data/shopping.csv",
  unclearNumbers: ","
})

// -----------
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
export class Pasillo extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("nombre", { type: "text" }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  static { this.declareProp("artículos", { itemType: "Artículo", init: () => new List({ instanceType: "Artículo" }) }) }
  get artículos() { return this.getProp("artículos") }
  set artículos(value) { this.setProp("artículos", value) }

  draw() {
    return h("es-pila", { class: "aisle", separacion: "xs" },
      h("es-encabezado", { class: "aisle-name", tamano: "diminuto" }, () => this.nombre),
      () => core.drawEach(this.artículos, (artículo) => core.drawThing(artículo))
    )
  }
}

export class Recorrido extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("pasillos", { readsFrom: ["planilla"] }) }
  get pasillos() { return core.waitedValue(this, "pasillos", async () => {
    const encontrados = new List({ instanceType: "Pasillo" })
    core.map(core.sortedBy(await core.savedThings(Artículo, { filter: { comprado: false } }), (item) => item.pasillo), (artículo) => {
      let pasillo = encontrados.filter((pasillo) => pasillo.nombre === artículo.pasillo).firstItem
      if (pasillo === undefined) {
        pasillo = new Pasillo({ nombre: artículo.pasillo })
        encontrados.append(pasillo)
      }
      core.append(pasillo?.artículos, artículo)
    })
    return encontrados
  }) }

  static { this.declareProp("comprado", { readsFrom: ["planilla"] }) }
  get comprado() { return core.waitedValue(this, "comprado", async () => {
    return await core.savedThings(Artículo, { filter: { comprado: true } })
  }) }

  draw() {
    return h("es-pila", { class: "aisle-list" },
      () => core.drawRead(() => this.pasillos, (pasillo) => core.drawThing(pasillo), { none: () => h("es-texto", { color: "gris" }, "No falta nada por comprar"), failed: () => h("es-texto", { color: "gris" }, "Ahora no se puede leer la lista:  lo vuelve a intentar enseguida") }),
      h("es-pila", { class: "got", separacion: "xs" },
        () => core.drawRead(() => this.comprado, (artículo) => core.drawThing(artículo), { failed: () => {} })
      )
    )
  }
}
// -----------
export class ListaDeLaCompra extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("recorrido", { init: () => new Recorrido({ id: "recorrido" }), early: true }) }
  get recorrido() { return this.getProp("recorrido") }
  set recorrido(value) { this.setProp("recorrido", value) }

  static { this.declareProp("nuevoArtículo", { init: () => new Artículo(), early: true }) }
  get nuevoArtículo() { return this.getProp("nuevoArtículo") }
  set nuevoArtículo(value) { this.setProp("nuevoArtículo", value) }

  async create() {
    let guardados = undefined
    try {
      guardados = await core.savedThings(Artículo)
    }
    catch (error) {
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

  agregarElArtículoNuevo() {
    if (this.nuevoArtículo.nombre === "") return
    core.saveThing(this.nuevoArtículo)
    this.nuevoArtículo = new Artículo({ pasillo: this.nuevoArtículo.pasillo })
  }

  async quitarLoComprado() {
    await core.inOneGo(async () => core.map(await core.filterInTurn(await core.savedThings(Artículo, { filter: { comprado: true } }), async (artículo) => await core.answerOf(artículo, "comprado")), (artículo) => core.removeSaved(artículo)))
  }

  imprimirLaLista() {
    core.openPrinting()
  }

  draw() {
    return h("es-contenedor", { texto: true },
      h("es-pila",
        h("es-barra-herramientas",
          h("es-texto", { tamano: "grande", extranegrita: true, slot: "titulo" }, "Lista de la compra"),
          core.drawAction(this, "quitarLoComprado", { "in-menu": true }),
          core.drawAction(this, "imprimirLaLista", { "in-menu": true }),
          h("spacer"),
          core.drawAction(this, "undo", { "icon-only": true, "in-menu": true }),
          core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })
        ),
        h("es-formulario", { class: "new-item", "prop:value": () => this.nuevoArtículo },
          h("es-campos", { "no-apilable": true },
            h("es-campo", { ancho: "3" },
              h("es-entrada", { name: "cantidad", type: "number", min: "0", marcador: "Cuántos", "aria-label": "Cantidad" })
            ),
            h("es-campo", { ancho: "3" },
              h("es-entrada", { name: "unidad", marcador: "Unidad", "aria-label": "Unidad" })
            ),
            h("es-campo", { ancho: "6" },
              h("es-entrada", { name: "nombre", marcador: "Algo que comprar", "aria-label": "Elemento" })
            ),
            h("es-campo", { ancho: "4" },
              h("es-entrada", { name: "pasillo", marcador: "Pasillo", "aria-label": "Pasillo", accion: true },
                core.drawAction(this, "agregarElArtículoNuevo", { slot: "accion", color: "primary", "icon-only": true })
              )
            )
          )
        ),
        () => core.drawThing(this.recorrido)
      )
    )
  }
}
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
