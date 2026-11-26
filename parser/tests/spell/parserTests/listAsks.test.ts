/**
 * What a read asks of a web server's list, and what it checks in the page:  a list's own `it filters by`, `it sorts by`
 * and search, under its `live at` line;  a `where` sent in parts;  `the first N`;  `, filtered here`.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** A project of these lines:  its one file's errors, warnings and compiled code. */
function compiled(lines: readonly string[], path = "/A.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

/** A web server whose jobs filter, sort and search on their own, and whose notes take nothing;  then `reads`. */
const PLACE = (...reads: string[]) => [
  `acme is a web server at "https://acme.test":`,
  `\t- check it every 30 seconds`,
  `\t- jobs live at "/api/jobs"`,
  `\t\t- it filters by status and session-id`,
  `\t\t- it sorts by created-at with "order_by"`,
  `\t\t- jobs can be sorted by:`,
  `\t\t\t- "creation" as "recency", by created at`,
  `\t\t- it searches names with "search"`,
  `\t- notes live at "/api/notes"`,
  `a "job" is a thing:`,
  `\t- it is saved in acme`,
  `\t- its "status" is text`,
  `\t- its "session id" is text`,
  `\t- its "name" is text`,
  `\t- its "kind" is text`,
  `a "note" is a thing:`,
  `\t- it is saved in acme`,
  `\t- its "status" is text`,
  `jobs page is an app:`,
  ...reads.map((read, at) => `\t- its "read ${at}" is ${read}`)
]

describe("a list's own lines", () => {
  test("filters, sorts and search under its line are its own;  the place says none of them", () => {
    const { errors, compiled: code } = compiled(PLACE())
    expect(errors).toEqual([])
    // the place's own call, not what its declaration says
    const call = code.slice(code.indexOf("core.place("))
    const jobs = call.slice(call.indexOf("jobs: {"), call.indexOf("notes: {"))
    expect(jobs).toContain(`searches: { param: "search", fields: ["names"] }`)
    expect(jobs).toContain(`filters: ["status", "sessionId"]`)
    expect(jobs).toContain(`sorts: ["createdAt"]`)
    expect(jobs).toContain(`sortedWith: "order_by"`)
    expect(jobs).toMatch(/sortOrders: \[\{\s*name: "creation",\s*as: "recency",\s*field: "createdAt"\s*\}\]/)
    expect(code).not.toMatch(/^ {2}filters: /m)
  })

  test("the same in Spanish", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `\tlos trabajos están en "/api/jobs"`,
        `\t\tfiltra por estado`,
        `\t\tordena por creado-en con "order_by"`,
        `\t\tlos trabajos se pueden ordenar por:`,
        `\t\t\t- "creación" como "recency", por creado en`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toMatch(
      /trabajos: \{\s*filters: \["estado"\],\s*sorts: \["creadoEn"\],\s*sortedWith: "order_by",\s*at: "\/api\/jobs",\s*sortOrders: \[\{\s*name: "creación",\s*as: "recency",\s*field: "creadoEn"\s*\}\]/
    )
  })
})

describe("a `where`, sent in parts", () => {
  test("what the list filters by goes, and a search with it;  the rest is checked here", () => {
    const {
      errors,
      warnings,
      compiled: code
    } = compiled(PLACE(`every job where its status is "open" and its name includes "x" and its kind is "big"`))
    expect(errors).toEqual([])
    expect(code).toContain(
      `core.filter(await core.savedThings(Job, { filter: { status: "open", kind: "big" }, search: { name: "x" } }, "looks through"), (job) => job.status === "open" && core.includes(job.name, "x") && job.kind === "big")`
    )
    // the search narrows the read:  nothing to warn of
    expect(warnings.join("\n")).not.toContain("doesn't support")
  })

  test("`its id is not nothing` is dropped:  every row a place holds has its id", () => {
    const { compiled: code, warnings } = compiled(PLACE(`every job where its id is not nothing`))
    expect(code).toContain("return await core.savedThings(Job)")
    expect(warnings.join("\n")).not.toContain("doesn't support")
  })

  test("a clause the list can't be asked is an error, naming it, and how to opt in", () => {
    const { errors } = compiled(PLACE(`every job where its status is "open" and its kind is not "small"`))
    expect(errors.join("\n")).toContain(
      [
        `The server doesn't support this filter:  its kind is not "small".`,
        `It is possible to have the Spell server pre-fetch rows and filter them here, but this will be slow.`,
        `Options:`,
        `- Change to another filter.`,
        `- End the line with ", filtered here" to pre-fetch all rows and filter in the Spell server.`,
        `- Say "the first 20 jobs where ..." to pre-fetch only the first 20 matching rows.`
      ].join("\n")
    )
  })

  test("an exact value on a field the list doesn't filter by stays here too, and says so", () => {
    const { errors } = compiled(PLACE(`every note where its status is "open"`))
    expect(errors.join("\n")).toContain(`The server doesn't support this filter:  its status is "open".`)
    expect(errors.join("\n")).toContain(`Say "the first 20 notes where ..."`)
  })

  test("opted in:  `, filtered here`, or `the first N ... where`, and nothing said", () => {
    for (const read of [
      `every job where its kind is not "small", filtered here`,
      `the first 20 jobs where its kind is not "small"`,
      `every note where its status is "open", filtered here`
    ]) {
      const { errors, warnings } = compiled(PLACE(read))
      expect(errors).toEqual([])
      expect(warnings.join("\n")).not.toContain("doesn't support")
    }
  })

  test("`, filtered here` before a sort or after it:  the sort's key knows the items, and both sort here", () => {
    const sorted = `core.sortedBy(core.filter(await core.savedThings(Job, {}, "looks through"), (job) => job.kind !== "small"), (item) => item.sessionId)`
    for (const read of [
      `every job where its kind is not "small", filtered here, sorted by its session id`,
      `every job where its kind is not "small", sorted by its session id, filtered here`
    ]) {
      const { errors, compiled: code } = compiled(PLACE(read))
      expect(errors).toEqual([])
      expect(code).toContain(sorted)
    }
  })

  test("`the first X where`:  its `where` knows the thing's fields, a name of several words too", () => {
    const { errors, compiled: code } = compiled(PLACE(`the first job where its session id is "s1" and its kind is "big"`))
    expect(errors).toEqual([])
    expect(code).toContain(`(job) => job.sessionId === "s1" && job.kind === "big"`)
  })

  test("`there are ... where` opts in the same way", () => {
    const where = `there are no jobs where its kind is not "small"`
    expect(compiled(PLACE(where)).errors.join("\n")).toContain(`doesn't support this filter:  its kind is not "small"`)
    expect(compiled(PLACE(`${where}, filtered here`)).errors).toEqual([])
  })

  test("Spanish:  `, filtrado aquí`", () => {
    const { errors } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `\tfiltra por estado`,
        `un "trabajo" es una cosa:`,
        `\t- se guarda en acme`,
        `\t- su "estado" es texto`,
        `\t- su "tipo" es texto`,
        `poner x a cada trabajo donde su tipo es "x"`,
        `poner y a cada trabajo donde su tipo es "x", filtrado aquí`
      ],
      "/A.es.spell"
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain(`El servidor no admite este filtro:  su tipo es "x".`)
    expect(errors[0]).toContain(`- Termina la línea con ", filtrado aquí"`)
  })
})

describe("`, filtered here` beside a sort, after `there are`, and `the first X where`'s fields", () => {
  test("before a sort or after it:  the sort's key knows the items, both sort here, and nothing's warned of", () => {
    const sorted = `core.sortedBy(core.filter(await core.savedThings(Job, {}, "looks through"), (job) => job.kind !== "small"), (item) => item.sessionId)`
    for (const read of [
      `every job where its kind is not "small", filtered here, sorted by its session id`,
      `every job where its kind is not "small", sorted by its session id, filtered here`
    ]) {
      const { errors, warnings, compiled: code } = compiled(PLACE(read))
      expect(errors).toEqual([])
      expect(warnings.join("\n")).not.toContain("can't be asked")
      expect(code).toContain(sorted)
    }
  })

  test("after `there are ... where`:  nothing's said", () => {
    const where = `there are no jobs where its kind is not "small"`
    expect(compiled(PLACE(where)).errors.join("\n")).toContain(`doesn't support this filter:  its kind is not "small"`)
    expect(compiled(PLACE(`${where}, filtered here`)).errors).toEqual([])
  })

  test("`the first X where`:  its `where` knows the thing's fields, a name of several words too", () => {
    const { errors, compiled: code } = compiled(PLACE(`the first job where its session id is "s1" and its kind is "big"`))
    expect(errors).toEqual([])
    expect(code).toContain(`(job) => job.sessionId === "s1" && job.kind === "big"`)
  })
})

describe("a field of two words its list filters by (epic `data` I65)", () => {
  // `it filters by session-id` names the field `sessionId`;  `its session id is ...` says `session_id`:  the same field
  test("sent, and no warning:  a value, a local, a page's property inside an `and`", () => {
    const { errors, warnings, compiled: code } = compiled([
      ...PLACE(
        `every job where its session id is "s1"`,
        `every job where its status is "open" and its session id is the picked's id`,
        `every job where its status is "open" and its session id is the wanted session`
      ),
      `\tits "picked" is a job`,
      `\tits "wanted session" is text`,
      `\tits "by a local" is`,
      `\t\tset wanted to its picked's id`,
      `\t\treturn every job where its session id is wanted`
    ])
    expect(errors).toEqual([])
    expect(warnings.join("\n")).not.toContain("doesn't support")
    expect(code).toContain(`core.savedThings(Job, { filter: { sessionId: "s1" } })`)
    expect(code).toContain(
      `core.savedThings(Job, { filter: { status: "open", sessionId: (await core.answerOf(this, "picked"))?.id } })`
    )
    expect(code).toContain(`core.savedThings(Job, { filter: { status: "open", sessionId: this.wantedSession } })`)
    expect(code).toContain(`core.savedThings(Job, { filter: { sessionId: wanted } })`)
  })

  test("counted by the server, and the first few asked for in one page", () => {
    const { compiled: code } = compiled(
      PLACE(`the number of jobs where its session id is "s1"`, `the first 8 jobs where its session id is "s1"`)
    )
    expect(code).toContain(`core.savedCount(Job, { filter: { sessionId: "s1" } })`)
    expect(code).toContain(`core.savedThings(Job, { filter: { sessionId: "s1" }, page: { size: 8 } })`)
  })
})

describe("the number of, counted by the server", () => {
  test("all of the `where` its list's:  one row asked for, and the server's own count", () => {
    const { errors, compiled: code } = compiled(PLACE(`the number of jobs where its status is "open"`))
    expect(errors).toEqual([])
    expect(code).toContain(`core.savedCount(Job, { filter: { status: "open" } })`)
    expect(compiled(PLACE(`the number of jobs where its id is not nothing`)).compiled).toContain("core.savedCount(Job)")
  })

  test("a part left to the page, or a list that filters by none of it:  every one read and counted, as before", () => {
    for (const where of [`its status is "open" and its kind is "big"`, `its status is not "open"`]) {
      const { compiled: code } = compiled(PLACE(`the number of jobs where ${where}`))
      expect(code).not.toContain("savedCount")
      expect(code).toContain("core.itemCountOf(")
    }
    expect(compiled(PLACE(`the number of notes where its status is "open"`)).compiled).not.toContain("savedCount")
  })
})

describe("the number of, waited for (epic `data` I64)", () => {
  // the server's count is an answer it waits for, as `every job` is:  never a Promise handed on
  const SHELF = (...lines: string[]) =>
    compiled([
      ...PLACE().slice(0, 8),
      `\t- job sessions live at "/api/sessions"`,
      ...PLACE().slice(8, -1),
      `a "job session" is a thing:`,
      `\t- it is saved in acme`,
      `a "shelf" is a view:`,
      `\tits "counted" is a number`,
      ...lines.map((line) => `\t${line}`)
    ])

  test("in a property:  a value that waits", () => {
    const { errors, compiled: code } = SHELF(`its "held" is the number of jobs`)
    expect(errors).toEqual([])
    expect(code).toContain(`get held() { return core.waitedValue(this, "held", async () => {`)
    expect(code).toContain("return await core.savedCount(Job)")
  })

  test("in a method's body:  the method waits for it", () => {
    const { errors, compiled: code } = SHELF(`to count:`, `\tset its counted to the number of jobs`)
    expect(errors).toEqual([])
    expect(code).toContain("async count() {")
    expect(code).toContain("this.counted = await core.savedCount(Job)")
  })

  test("in a drawing's attribute:  a waited value, as a read there is", () => {
    const { errors, compiled: code } = SHELF(`to draw it:`, `\t<button title={the number of jobs}>Go</button>`)
    expect(errors).toEqual([])
    expect(code).toContain(`core.waitedValue(this, "the number of jobs", async () => await core.savedCount(Job))`)
    expect(code).toContain("static drawsWaiting = true")
  })

  test("a type of two words, in the plural:  `the number of job sessions`, as `every job session`", () => {
    const { errors, compiled: code } = SHELF(
      `its "sessions" is the number of job sessions`,
      `its "every session" is the number of every job session`,
      `its "listed" is the job sessions`
    )
    expect(errors).toEqual([])
    expect(code).toContain(`get sessions() { return core.waitedValue(this, "sessions", async () => {`)
    expect(code.match(/return await core\.savedCount\(JobSession\)/g)).toHaveLength(2)
    expect(code).toContain("return await core.savedThings(JobSession)")
  })
})

describe("the first few", () => {
  test("`the first 8 jobs` parses, and asks for one page of 8", () => {
    const { errors, compiled: code } = compiled(PLACE(`the first 8 jobs`))
    expect(errors).toEqual([])
    expect(code).toContain("return await core.savedThings(Job, { page: { size: 8 } })")
  })

  test("all of the `where` handed over:  one page of 8, with it", () => {
    const { compiled: code } = compiled(PLACE(`the first 8 jobs where its status is "open" and its id is not nothing`))
    expect(code).toContain(`core.savedThings(Job, { filter: { status: "open" }, page: { size: 8 } })`)
  })

  test("some of it here:  read page by page until 8 pass, and no warning", () => {
    const { warnings, compiled: code } = compiled(PLACE(`the first 8 jobs where its kind is not "small"`))
    expect(code).toMatch(
      /core\.savedThings\(\s*Job,\s*\{\},\s*"looks through",\s*\{ first: 8, where: \(job\) => job\.kind !== "small" \}\s*\)/
    )
    expect(warnings.join("\n")).not.toContain("doesn't support")
    const first = compiled(PLACE(`the first job where its kind is not "small"`))
    expect(first.compiled).toMatch(/\{ first: 1, where: \(job\) => job\.kind !== "small" \}/)
    expect(first.warnings.join("\n")).not.toContain("can't be asked")
  })

  test("an exact value on a field it doesn't filter by stays here with `first`, so the read stops at 8 (I55)", () => {
    const { warnings, compiled: code } = compiled(
      PLACE(`the first 8 jobs where its status is "open" and its kind is "x"`)
    )
    expect(code).toMatch(
      /core\.savedThings\(\s*Job,\s*\{ filter: \{ status: "open" \} \},\s*"looks through",\s*\{ first: 8, where: \(job\) => job\.status === "open" && job\.kind === "x" \}\s*\)/
    )
    expect(warnings.join("\n")).not.toContain("doesn't support")
  })

  test("a type kept in memory:  `the first 8 piles` is still nothing of its own", () => {
    const { errors } = compiled([`a pile is a thing`, `set x to the first 8 piles`])
    expect(errors).not.toEqual([])
  })
})

describe("`, filtered here`", () => {
  test("nothing goes to the place, every page is read, and nothing's warned of", () => {
    const {
      errors,
      warnings,
      compiled: code
    } = compiled(PLACE(`every job where its status is "open" and its kind is not "small", filtered here`))
    expect(errors).toEqual([])
    expect(code).toContain(
      `core.filter(await core.savedThings(Job, {}, "looks through"), (job) => job.status === "open" && job.kind !== "small")`
    )
    expect(warnings.join("\n")).not.toContain("doesn't support")
  })

  test("in Spanish, `, filtrado aquí`", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `\tfiltra por estado`,
        `un "trabajo" es una cosa:`,
        `\t- se guarda en acme`,
        `\t- su "estado" es texto`,
        `poner x a cada trabajo donde su estado es "abierto", filtrado aquí`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(
      `core.filter(await core.savedThings(Trabajo, {}, "looks through"), (trabajo) => trabajo.estado === "abierto")`
    )
  })
})

describe("`, sorted here`", () => {
  test("after a sort:  the read as it is, its sort still in its question", () => {
    const plain = compiled(PLACE(`every job, sorted by its name`)).compiled
    const { errors, compiled: code } = compiled(PLACE(`every job, sorted by its name, sorted here`))
    expect(errors).toEqual([])
    const read = `core.savedThings(Job, { sort: [{ field: "name" }] }`
    expect(plain).toContain(read)
    expect(code).toContain(read)
  })

  test("after `, filtered here`, after a sort", () => {
    const { errors, compiled: code } = compiled(
      PLACE(`every job where its kind is not "small", sorted by its name, filtered here, sorted here`)
    )
    expect(errors).toEqual([])
    expect(code).toContain(`(job) => job.kind !== "small"`)
  })

  test("in Spanish, `, ordenado aquí`", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `un "trabajo" es una cosa:`,
        `\t- se guarda en acme`,
        `\t- su "nombre" es texto`,
        `poner x a cada trabajo, ordenado por su nombre, ordenado aquí`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(`core.savedThings(Trabajo, { sort: [{ field: "nombre" }] }`)
  })
})

describe("a list filtered by any field, with a field and a value", () => {
  const lines = (read: string) => [
    `acme is a web server at "https://acme.test":`,
    `\t- jobs live at "/api/jobs"`,
    `\t\t- jobs can be filtered by any field, with "field" and "value"`,
    `a "job" is a thing:`,
    `\t- it is saved in acme`,
    `\t- its "status" is text`,
    `jobs page is an app:`,
    `\t- its "rows" is ${read}`
  ]

  test("compiles to the list's filters and filteredWith;  a where goes to it, no error", () => {
    const { errors, compiled: code } = compiled(lines(`every job where its status is "open"`))
    expect(errors).toEqual([])
    expect(code).toMatch(/filters: "every field",\s*filteredWith: \{ field: "field", value: "value" \}/)
    expect(code).toContain(`core.savedThings(Job, { filter: { status: "open" } }`)
  })

  test("Spanish:  `los trabajos se pueden filtrar por cualquier campo, con \"field\" y \"value\"`", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `\t- los trabajos están en "/api/jobs"`,
        `\t\t- los trabajos se pueden filtrar por cualquier campo, con "field" y "value"`,
        `un "trabajo" es una cosa:`,
        `\t- se guarda en acme`,
        `\t- su "estado" es texto`,
        `poner x a cada trabajo donde su estado es "abierto"`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toMatch(/filteredWith: \{ field: "field", value: "value" \}/)
  })

  test("a sort opted in on one line doesn't opt in another", () => {
    const { errors } = compiled([
      ...lines(`every job, sorted by its status, sorted here`),
      `\t- its "more" is every job, sorted by its status`
    ])
    expect(errors).toHaveLength(1)
  })
})
