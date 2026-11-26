/**
 * A web server's list's named sorts (`NamedSorts`):  `measurements can be sorted by:`, each `- "<name>" as "<value>"`,
 * and a read naming one, `sorted by completion, newest first`.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** A project of these files:  each file's errors, warnings and compiled code. */
function compiled(files: readonly { path: string; lines: readonly string[] }[]) {
  return parseSpellProject(files.map(({ path, lines }) => ({ path, contents: `${lines.join("\n")}\n` }))).files
}

/** A web server whose measurements sort by two names of their own. */
const PLACE = [
  `acme is a web server at "https://acme.test":`,
  `\t- measurements live at "/api/measurements"`,
  `\t\t- it sorts with "order_by"`,
  `\t\t- measurements can be sorted by:`,
  `\t\t\t- "creation" as "created_at"`,
  `\t\t\t- "completion" as "recency", by end time`,
  `\t\t\t- "name" as "alphabetical", by name`
]

/** What's saved there. */
const TYPE = [
  `a "measurement" is a thing:`,
  `\t- it is saved in acme`,
  `\t- its "created at" is a date`,
  `\t- its "end time" is a date`,
  `\t- its "name" is text`
]

/** A page reading `reads`. */
const PAGE = (...reads: string[]) => [
  `measurements page is an app:`,
  ...reads.map((read, at) => `\t- its "read ${at}" is ${read}`)
]

describe("a list's named sorts", () => {
  test("compile to the list's sortOrders, each field its value's unless `by` says", () => {
    const [file] = compiled([{ path: "/A.spell", lines: [...PLACE, ...TYPE] }])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toMatch(
      /measurements: \{\s*sortedWith: "order_by",\s*at: "\/api\/measurements",\s*sortOrders: \[\{\s*name: "creation",\s*as: "created_at",\s*field: "createdAt"\s*\}, \{\s*name: "completion",\s*as: "recency",\s*field: "endTime"\s*\}, \{\s*name: "name",\s*as: "alphabetical",\s*field: "name"\s*\}\]/
    )
  })

  test("a read names one by its name alone:  the place gets the name, the code sorting here its field", () => {
    const [file] = compiled([
      {
        path: "/A.spell",
        lines: [
          ...PLACE,
          ...TYPE,
          ...PAGE(
            `the first 20 measurements sorted by completion, newest first`,
            `every measurement, sorted by completion, oldest first, sorted here`,
            `every measurement, sorted by its created at, newest first`
          )
        ]
      }
    ])
    expect(file!.errors).toEqual([])
    const code = file!.compiled
    expect(code).toContain(`sort: [{ field: "completion", descending: true }]`)
    expect(code).toContain(`sort: [{ field: "completion" }]`)
    expect(code).toContain(`sort: [{ field: "createdAt", descending: true }]`)
  })

  test("a name wins over a field of the same name", () => {
    const [file] = compiled([{ path: "/A.spell", lines: [...PLACE, ...TYPE, ...PAGE(`every measurement, sorted by name, sorted here`)] }])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain(`sort: [{ field: "name" }]`)
  })

  test("a read in a file before the place's still finds the name", () => {
    const files = compiled([
      { path: "/A.spell", lines: PAGE(`every measurement, sorted by completion, newest first`) },
      { path: "/B.spell", lines: [...PLACE, ...TYPE] }
    ])
    expect(files.flatMap((each) => each.errors)).toEqual([])
    expect(files[0]!.compiled).toContain(`sort: [{ field: "completion", descending: true }]`)
  })

  test("words that are neither a name nor a field are an error:  a value is no name", () => {
    const [file] = compiled([
      { path: "/A.spell", lines: [...PLACE, ...TYPE, ...PAGE(`every measurement, sorted by recency, newest first`)] }
    ])
    expect(file!.errors.join("\n")).toContain(`never says it has a recency`)
  })

  test("the same in Spanish", () => {
    const [file] = compiled([
      {
        path: "/A.es.spell",
        lines: [
          `acme es un servidor web en "https://acme.test"`,
          `\t- las mediciones están en "/api/measurements"`,
          `\t\t- ordena con "order_by"`,
          `\t\t- las mediciones se pueden ordenar por:`,
          `\t\t\t- "creación" como "created_at"`,
          `\t\t\t- "finalización" como "recency", por hora de fin`,
          `una "medición" es una cosa:`,
          `\t- se guarda en acme`,
          `\t- su "hora de fin" es una fecha`,
          `panel es una aplicación:`,
          `\t- su "lectura" es cada medición, ordenada por finalización, de más reciente a más antiguo`
        ]
      }
    ])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toMatch(
      /sortOrders: \[\{\s*name: "creación",\s*as: "created_at",\s*field: "createdAt"\s*\}, \{\s*name: "finalización",\s*as: "recency",\s*field: "horaDeFin"\s*\}\]/
    )
    expect(file!.compiled).toContain(`sort: [{ field: "finalización", descending: true }]`)
  })
})

describe("a list that sorts by any field (forms 1-3)", () => {
  const TYPE_JOB = [`a "job" is a thing:`, `\t- it is saved in acme`, `\t- its "created at" is a date`, `\t- its "name" is text`]

  test("form 1:  `jobs can be sorted by any field, with \"sort\"`", () => {
    const [file] = compiled([
      {
        path: "/A.spell",
        lines: [
          `acme is a web server at "https://acme.test":`,
          `\t- jobs live at "/api/jobs"`,
          `\t\t- jobs can be sorted by any field, with "sort"`,
          ...TYPE_JOB,
          `jobs page is an app:`,
          `\t- its "rows" is the first 20 jobs sorted by its name`
        ]
      }
    ])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toMatch(/jobs: \{\s*at: "\/api\/jobs",\s*sorts: "every field",\s*sortedWith: "sort"\s*\}/)
    expect(file!.compiled).toContain(`sort: [{ field: "name" }]`)
  })

  test("form 2:  its direction lines", () => {
    const [file] = compiled([
      {
        path: "/A.spell",
        lines: [
          `acme is a web server at "https://acme.test":`,
          `\t- jobs live at "/api/jobs"`,
          `\t\t- jobs can be sorted by any field, with "sort"`,
          `\t\t\t- newest first with "order" as "desc"`,
          `\t\t\t- oldest first with "order" as "asc"`,
          ...TYPE_JOB
        ]
      }
    ])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toMatch(
      /sortDirections: \{\s*param: "order",\s*descending: "desc",\s*ascending: "asc"\s*\}/
    )
  })

  test("form 3:  any field, and named sorts beside it, in the same question", () => {
    const [file] = compiled([
      {
        path: "/A.spell",
        lines: [
          `acme is a web server at "https://acme.test":`,
          `\t- measurements live at "/api/measurements"`,
          `\t\t- measurements can be sorted by any field, with "sort"`,
          `\t\t- measurements can be sorted by:`,
          `\t\t\t- "completion" as "recency", by end time`,
          ...TYPE,
          ...PAGE(`every measurement, sorted by completion, newest first`, `every measurement, sorted by its name`)
        ]
      }
    ])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toMatch(
      /measurements: \{\s*at: "\/api\/measurements",\s*sorts: "every field",\s*sortedWith: "sort",\s*sortOrders: \[\{\s*name: "completion",\s*as: "recency",\s*field: "endTime"\s*\}\]/
    )
    expect(file!.compiled).toContain(`sort: [{ field: "completion", descending: true }]`)
    expect(file!.compiled).toContain(`sort: [{ field: "name" }]`)
  })

  test("the old `it sorts by every field with \"sort\"` still reads", () => {
    const [file] = compiled([
      {
        path: "/A.spell",
        lines: [`acme is a web server at "https://acme.test":`, `\t- it sorts by every field with "sort"`, ...TYPE_JOB]
      }
    ])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain(`sorts: "every field"`)
  })

  test("the same in Spanish", () => {
    const [file] = compiled([
      {
        path: "/A.es.spell",
        lines: [
          `acme es un servidor web en "https://acme.test"`,
          `\t- los trabajos están en "/api/jobs"`,
          `\t\t- los trabajos se pueden ordenar por cualquier campo, con "sort"`,
          `\t\t\t- de más reciente a más antiguo con "order" como "desc"`,
          `\t\t\t- de más antiguo a más reciente con "order" como "asc"`,
          `un "trabajo" es una cosa:`,
          `\t- se guarda en acme`,
          `\t- su "nombre" es texto`
        ]
      }
    ])
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toMatch(
      /trabajos: \{\s*at: "\/api\/jobs",\s*sorts: "every field",\s*sortedWith: "sort",\s*sortDirections: \{\s*param: "order",\s*descending: "desc",\s*ascending: "asc"\s*\}/
    )
  })
})

describe("a sort its server can't do is an error, unless it ends `, sorted here`", () => {
  const errorsOf = (...reads: string[]) =>
    compiled([{ path: "/A.spell", lines: [...PLACE, ...TYPE, ...PAGE(...reads)] }])[0]!.errors

  test("named, the other way round:  the error, in the person's words", () => {
    expect(errorsOf(`every measurement, sorted by completion, oldest first`).join("\n")).toContain(
      [
        `The server doesn't support this sort:  sorted by completion, oldest first.`,
        `It is possible to have the Spell server pre-fetch rows and sort them here, but this will be slow.`,
        `Options:`,
        `- Change to another sort.`,
        `- End the line with ", sorted here" to pre-fetch all rows and sort in the Spell server.`
      ].join("\n")
    )
    expect(errorsOf(`the first 20 measurements sorted by completion, oldest first`)).toHaveLength(1)
  })

  test("none for what it sorts, nor with `, sorted here`", () => {
    expect(
      errorsOf(
        `the first 20 measurements sorted by completion, newest first`,
        `every measurement, sorted by its created at, newest first`,
        `every measurement, sorted by its end time, sorted here`
      )
    ).toEqual([])
  })

  test("a way round its direction lines don't name", () => {
    const lines = (read: string) => [
      `acme is a web server at "https://acme.test":`,
      `\t- jobs live at "/api/jobs"`,
      `\t\t- jobs can be sorted by any field, with "sort"`,
      `\t\t\t- newest first with "order" as "desc"`,
      `a "job" is a thing:`,
      `\t- it is saved in acme`,
      `\t- its "name" is text`,
      `jobs page is an app:`,
      `\t- its "rows" is ${read}`
    ]
    expect(compiled([{ path: "/A.spell", lines: lines(`every job, sorted by its name, newest first`) }])[0]!.errors).toEqual(
      []
    )
    expect(
      compiled([{ path: "/A.spell", lines: lines(`every job, sorted by its name`) }])[0]!.errors.join("\n")
    ).toContain(`doesn't support this sort:  sorted by its name.`)
  })

  test("Spanish:  `, ordenado aquí`", () => {
    const lines = (read: string) => [
      `acme es un servidor web en "https://acme.test"`,
      `un "trabajo" es una cosa:`,
      `\t- se guarda en acme`,
      `\t- su "nombre" es texto`,
      `poner x a ${read}`
    ]
    const [refused] = compiled([{ path: "/A.es.spell", lines: lines(`cada trabajo, ordenado por su nombre`) }])
    expect(refused!.errors.join("\n")).toContain(`El servidor no admite este orden:  ordenado por su nombre.`)
    expect(refused!.errors.join("\n")).toContain(`- Termina la línea con ", ordenado aquí"`)
    const [opted] = compiled([{ path: "/A.es.spell", lines: lines(`cada trabajo, ordenado por su nombre, ordenado aquí`) }])
    expect(opted!.errors).toEqual([])
  })
})
