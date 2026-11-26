/**
 * A sort a page holds, a read that follows it, and a table that shows and sets it:
 * `its "order" is a sort:  completion, newest first`, `the first 50 measurements sorted by the order`,
 * `<table sortable sort="the order">` with a header `<cell sort="completion">`.
 */
import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/** A project of these lines:  its one file's errors, warnings and compiled code. */
function compiled(lines: readonly string[], path = "/A.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

/** A web server whose measurements have a named sort, and a page holding a sort;  then its `lines`. */
const PLACE = (...lines: string[]) => [
  `lab is a web server at "https://lab.test":`,
  `\t- check it every 30 seconds`,
  `\t- measurements live at "/api/measurements"`,
  `\t\t- it sorts with "order_by"`,
  `\t\t- measurements can be sorted by:`,
  `\t\t\t- "completion" as "recency", by end time`,
  `a "measurement" is a thing:`,
  `\t- it is saved in lab`,
  `\t- its "name" is text`,
  `\t- its "end time" is a date`,
  `a "measurements page" is a view:`,
  `\t- its "order" is a sort:  completion, newest first`,
  ...lines
]

/** The same, in Spanish. */
const LUGAR = (...lines: string[]) => [
  `laboratorio es un servidor web en "https://lab.test"`,
  `\tlas mediciones están en "/api/measurements"`,
  `\t\tordena con "order_by"`,
  `\t\tlas mediciones se pueden ordenar por:`,
  `\t\t\t- "finalización" como "recency", por hora de fin`,
  `una "medición" es una cosa:`,
  `\tse guarda en laboratorio`,
  `\tsu "nombre" es texto`,
  `\tsu "hora de fin" es una fecha`,
  `una "página de mediciones" es una vista:`,
  `\tsu "orden" es un orden:  finalización, de más reciente a más antiguo`,
  ...lines
]

describe("a sort a page holds", () => {
  test("`is a sort:` starts it as its name or field and its direction", () => {
    const { errors, compiled: code } = compiled(PLACE())
    expect(errors).toEqual([])
    expect(code).toContain(`this.declareProp("order", { init: () => core.sort("completion", true) })`)
  })

  test("without a direction it's smallest first;  a field of two words is kept as written", () => {
    const { errors, compiled: code } = compiled(
      PLACE(`\t- its "by date" is a sort:  end time`, `\t- its "by creation" is a sort:  created at, newest first`)
    )
    expect(errors).toEqual([])
    expect(code).toContain(`core.sort("end time")`)
    expect(code).toContain(`core.sort("created at", true)`)
  })

  test("in Spanish:  `es un orden:`", () => {
    const { errors, compiled: code } = compiled(LUGAR(), "/A.es.spell")
    expect(errors).toEqual([])
    expect(code).toContain(`this.declareProp("orden", { init: () => core.sort("finalización", true) })`)
  })
})

describe("a read sorted by it", () => {
  test("a read of a place:  its place is handed the sort, and the read follows it", () => {
    const { errors, compiled: code } = compiled(
      PLACE(`\t- its "rows" is the first 50 measurements sorted by the order`)
    )
    expect(errors).toEqual([])
    expect(code).toContain(`return await core.savedThingsSortedBy(this.order, Measurement, { page: { size: 50 } })`)
    // asked again whenever the sort changes
    expect(code).toContain(`}, () => [this.order]) }`)
  })

  test("declared further down:  the same", () => {
    const lines = PLACE(`\t- its "rows" is every measurement sorted by the later`, `\t- its "later" is a sort:  name`)
    const { errors, compiled: code } = compiled(lines)
    expect(errors).toEqual([])
    expect(code).toContain(`core.savedThingsSortedBy(this.later, Measurement, {})`)
  })

  test("a list kept here:  sorted here, by its field", () => {
    const { errors, compiled: code } = compiled(
      PLACE(`\t- its "kept" is a list of measurements`, `\t- its "shown" is its kept sorted by the order`)
    )
    expect(errors).toEqual([])
    expect(code).toContain(`core.sortedByValue(this.kept, this.order)`)
  })

  test("in Spanish:  `ordenadas según el orden`", () => {
    const { errors, compiled: code } = compiled(
      LUGAR(`\tsus "filas" son las primeras 50 mediciones ordenadas según el orden`),
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(`core.savedThingsSortedBy(this.orden, Medición, { page: { size: 50 } })`)
  })

  test("in Spanish, `según` goes only with a sort a page holds", () => {
    const { errors } = compiled(LUGAR(`\tsus "filas" son las mediciones ordenadas según su nombre`), "/A.es.spell")
    expect(errors.join("\n")).toContain(`"su nombre" no es un orden que guarde la página`)
  })
})

describe("a table showing it", () => {
  beforeAll(registerTestComponentPack)

  const TABLE = [
    `\t- to draw it`,
    `\t\t<table sortable sort="the order">`,
    `\t\t\t<row header>`,
    `\t\t\t\t<cell sort="completion">Completed</cell>`,
    `\t\t\t\t<cell sort="name">Name</cell>`,
    `\t\t\t\t<cell>Notes</cell>`,
    `\t\t\t</row>`,
    `\t\t</table>`
  ]

  test(`sort="the order":  shown, and where it lives remembered for a header click;  each header's sort as written`, () => {
    const { errors, compiled: code } = compiled(PLACE(...TABLE))
    expect(errors).toEqual([])
    expect(code).toContain(`h("ui-table", { sortable: true, "prop:sort": () => core.sortShown(this, "order") }`)
    expect(code).toContain(`h("ui-cell", { sort: "completion" }, "Completed")`)
    expect(code).toContain(`h("ui-cell", "Notes")`)
  })

  test("naming something that isn't a sort a page holds:  an error", () => {
    const lines = PLACE(`\t- its "count" is a number`, ...TABLE.map((line) => line.replace("the order", "the count")))
    expect(compiled(lines).errors.join("\n")).toContain(`A table's sort="the count" names the sort it shows and sets`)
  })

  test('in Spanish:  `<tabla ordenable sort="el orden">`, a header `<celda sort="finalización">`', () => {
    const { errors, compiled: code } = compiled(
      LUGAR(
        `\tpara dibujarla:`,
        `\t\t<tabla ordenable sort="el orden"><fila encabezado><celda sort="finalización">Terminada</celda></fila></tabla>`
      ),
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(`h("es-tabla", { ordenable: true, "prop:sort": () => core.sortShown(this, "orden") }`)
    expect(code).toContain(`h("es-celda", { sort: "finalización" }, "Terminada")`)
  })
})
