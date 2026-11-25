/**
 * What a read asks of a web server's list, and what it checks in the page:  a list's own `it filters by`, `it sorts by`
 * and search, under its `live at` line;  a `where` sent in parts;  `the first N`;  `, checked here`.
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
  `\t\t- it sorts newest first by created-at as "recency"`,
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
    expect(jobs).toMatch(/sortOrders: \[\{\s*field: "createdAt",\s*descending: true,\s*as: "recency"\s*\}\]/)
    expect(code).not.toMatch(/^ {2}filters: /m)
  })

  test("the same in Spanish", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `\tlos trabajos están en "/api/jobs"`,
        `\t\tfiltra por estado`,
        `\t\tordena por creado-en con "order_by"`,
        `\t\tordena de más reciente a más antiguo por creado-en como "recency"`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toMatch(
      /trabajos: \{\s*filters: \["estado"\],\s*sorts: \["creadoEn"\],\s*sortedWith: "order_by",\s*sortOrders: \[\{\s*field: "creadoEn",\s*descending: true,\s*as: "recency"\s*\}\],\s*at: "\/api\/jobs"/
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
    expect(warnings.join("\n")).not.toContain("can't be asked")
  })

  test("`its id is not nothing` is dropped:  every row a place holds has its id", () => {
    const { compiled: code, warnings } = compiled(PLACE(`every job where its id is not nothing`))
    expect(code).toContain("return await core.savedThings(Job)")
    expect(warnings.join("\n")).not.toContain("can't be asked")
  })

  test("a clause the list can't be asked warns, naming it, and a field it filters by", () => {
    const { warnings } = compiled(PLACE(`every job where its status is "open" and its kind is not "small"`))
    expect(warnings.join("\n")).toContain(
      `The server can't be asked "its kind is not "small"", so this reads every job and checks them here, which can be slow.  Ask the server with "its status is ...", or end the line with ", checked here" if checking here is what you want`
    )
  })

  test("an exact value on a field the list doesn't filter by stays here too, and says so", () => {
    const { warnings } = compiled(PLACE(`every note where its status is "open"`))
    expect(warnings.join("\n")).toContain(`The server can't be asked "its status is "open""`)
    expect(warnings.join("\n")).toContain(`Say "the first 20 notes where ..." to stop once there are enough`)
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
    expect(warnings.join("\n")).not.toContain("can't be asked")
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
    expect(warnings.join("\n")).not.toContain("can't be asked")
  })

  test("a type kept in memory:  `the first 8 piles` is still nothing of its own", () => {
    const { errors } = compiled([`a pile is a thing`, `set x to the first 8 piles`])
    expect(errors).not.toEqual([])
  })
})

describe("`, checked here`", () => {
  test("nothing goes to the place, every page is read, and nothing's warned of", () => {
    const {
      errors,
      warnings,
      compiled: code
    } = compiled(PLACE(`every job where its status is "open" and its kind is not "small", checked here`))
    expect(errors).toEqual([])
    expect(code).toContain(
      `core.filter(await core.savedThings(Job, {}, "looks through"), (job) => job.status === "open" && job.kind !== "small")`
    )
    expect(warnings.join("\n")).not.toContain("can't be asked")
  })

  test("in Spanish, `, filtrando aquí`", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `\tfiltra por estado`,
        `un "trabajo" es una cosa:`,
        `\t- se guarda en acme`,
        `\t- su "estado" es texto`,
        `poner x a cada trabajo donde su estado es "abierto", filtrando aquí`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(
      `core.filter(await core.savedThings(Trabajo, {}, "looks through"), (trabajo) => trabajo.estado === "abierto")`
    )
  })
})
