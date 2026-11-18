/**
 * What a place lets be done to a type's things (epic `data` P49):  `enabled operations are ...` on the thing, the same
 * line under a collection's `live at` line as the switch for all of them, and `this type is verified`.
 * - Each compiled whole, in English and Spanish;  the refusal when it runs is `RestPlace`'s (`limitOperations()`),
 *   handed both lines by the core (`limitOperations()` in `placeKinds`).
 */
import { describe, expect, it } from "vite-plus/test"

import * as places from "spell/places"
import { limitOperations } from "spell/parser/core/placeKinds"
import { parseSpellProject } from "spell/parser/spell/test"

/** `lines`, as a file at `path`:  what it compiles to, its errors and warnings. */
function compiledAs(path: string, lines: string[]) {
  const { compiled: js, errors, warnings } = parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
  return { js, errors, warnings }
}

describe("enabled operations", () => {
  it("on the thing, and under its collection's line, with an action route", () => {
    const { js, errors, warnings } = compiledAs("/NetBox.api.spell", [
      'netbox is a web server at "https://demo.netbox.dev"',
      "\tcheck it every 30 seconds",
      '\tjobs live at "/api/jobs"',
      "\t\tenabled operations are read, add, change, complete",
      '\tto complete a job is at "/api/jobs/{id}/complete"',
      "",
      'a "job" is a thing',
      "\tit lives in netbox",
      "\tthis type is unverified",
      "\tenabled operations are add, change",
      '\tits "name" is text',
      "",
      'a "job session" is a thing',
      "\tit lives in netbox",
      "\tall operations are disabled"
    ])
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(js).toContain('jobs: { at: "/api/jobs", operations: ["read", "add", "change", "complete"] }')
    expect(js).toContain('operations: ["add", "change"]')
    expect(js).toMatch(/class JobSession[\s\S]*operations: \[\]/)
  })

  it("Spanish:  the same operations, as compiled code names them", () => {
    const { js, errors, warnings } = compiledAs("/NetBox.api.es.spell", [
      'netbox es un servidor web en "https://demo.netbox.dev"',
      "\tse revisa cada 30 segundos",
      '\tlos trabajos están en "/api/jobs"',
      "\t\toperaciones activas: leer, añadir, cambiar, borrar",
      "",
      'un "trabajo" es una cosa',
      "\tvive en netbox",
      "\teste tipo está verificado",
      "\toperaciones activas: añadir y cambiar"
    ])
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(js).toContain('operations: ["read", "add", "change", "delete"]')
    expect(js).toContain('operations: ["add", "change"]')
  })

  it("the core hands a web server both lines, each narrowing", () => {
    const behind = new places.RestPlace({ url: "https://demo.netbox.dev" })
    limitOperations(behind, {
      folder: places,
      collection: "jobs",
      Class: class Job {
        static savedIn = { place: "netbox", collection: "jobs", operations: ["read", "add", "delete"] }
      },
      details: { name: "netbox", collections: { jobs: { operations: ["read", "add", "change"] } } },
      person: {} as never
    })
    expect(behind.canWrite({ collection: "jobs", kind: "insert" })).toEqual({ canWrite: true })
    expect(behind.canWrite({ collection: "jobs", kind: "update" })).toMatchObject({ canWrite: false })
    expect(behind.canWrite({ collection: "jobs", kind: "delete" })).toMatchObject({ canWrite: false })
  })
})
