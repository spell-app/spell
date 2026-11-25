/**
 * An object type, `an "asset meta" is an object`:  its known fields typed, and every other key a place sends kept.
 * - Compiled onto `Thing`, `static keepsEveryKey = true`:  JavaScript's own `Object` has no `declareProp()`.
 * - Reading a known field gives its typed value;  any other key reads off it as it came, with no warning.
 * - Written back whole, every key.
 * - A plain `its "raw" is an object` holds the object as it is.
 */
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import * as SC from "spell/parser/core"
import { MemoryPlace, type PlaceChange, type PlaceContext } from "spell/places"
import { parseSpellProject } from "spell/parser/spell/test"
import { bridgeSolid } from "spell/util"

const { core, Place } = SC

/** A lab's job, with an object type and a plain object. */
const LINES = [
  'a "job" is a thing',
  '\tits "name" is text',
  '\tits "meta" is an asset meta',
  '\tits "raw" is an object',
  '\tits "steps" is a list of steps',
  "\tits \"source\" is its meta's provenance",
  "\tits \"owner\" is its meta's owner",
  "\tits \"raw owner\" is its raw's owner",
  "",
  'an "asset meta" is an object',
  '\tits "provenance" is text',
  '\tits "checked at" is a date',
  "",
  'a "step" is a thing',
  '\tits "run by" is text',
  '\tits "remark" is text, stored as "note"'
]

/** A place in memory that keeps every change it's sent. */
class KeepingPlace extends MemoryPlace {
  sent: PlaceChange[] = []

  apply(changes: readonly PlaceChange[], context: PlaceContext) {
    this.sent.push(...changes)
    return super.apply(changes, context)
  }
}

/** `LINES` compiled:  its errors, warnings and code. */
function compiled() {
  const [file] = parseSpellProject([{ path: "/Lab.spell", contents: `${LINES.join("\n")}\n` }]).files
  return { errors: file!.errors, warnings: file!.warnings, code: String(file!.compiled) }
}

/** The compiled code run as a module, `@spell/core` its runtime, as a runner runs it:  what it exports. */
function run(code: string): Record<string, unknown> {
  const exported = [...code.matchAll(/^export (?:class|const|let|function) (\w+)/gm)].map(([, name]) => name!)
  const body = code
    .replace(/^import \{ (.*) \} from "(.*)"$/gm, (_line, names: string) => `const { ${names} } = __core`)
    .replace(/^export /gm, "")
  // oxlint-disable-next-line no-implied-eval -- running compiled spell, as a runner does, is the test
  const namespace = new Function("__core", `const { core, Thing, List } = __core\n${body}\nreturn { ${exported.join(", ")} }`)(SC) as Record<string, unknown>
  core.things.addClasses(namespace)
  return namespace
}

/** A job and what its row holds, read from a place in memory. */
type Job = SC.Thing & {
  name: string
  meta: SC.Thing & Record<string, unknown>
  raw: Record<string, unknown>
  source: string
  owner: unknown
  rawOwner: unknown
}

/** The compiled program's jobs, kept in `behind`. */
async function jobsIn(behind: KeepingPlace): Promise<Job[]> {
  const { Job } = run(compiled().code) as { Job: typeof SC.Thing & { savedIn?: unknown } }
  Job.savedIn = { place: "lab", collection: "jobs" }
  class Lab extends Place {
    makePlace() {
      return behind
    }
  }
  core.place(new Lab(), { name: "lab" })
  return (await core.savedThings(Job as never)).items as Job[]
}

/** A place holding `rows` of jobs. */
function holding(rows: Array<Record<string, unknown>>): KeepingPlace {
  const place = new KeepingPlace({ capabilities: { idOf: "id" } })
  void place.apply(
    rows.map((fields) => ({ kind: "insert", collection: "jobs", id: `${fields.id}`, fields })),
    {}
  )
  place.sent = []
  return place
}

const ROWS = [
  {
    id: "1",
    name: "warm up",
    meta: { provenance: "scan", checked_at: "2026-11-20T10:00:00Z", owner: "ada", deep: { a: { b: 1 } } },
    raw: { owner: "ada", runs: [1, 2] },
    steps: [{ run_by: "ada", note: "first" }]
  },
  { id: "2", name: "cool down", meta: { provenance: "hand", extra_key: true }, raw: { owner: "bo" } }
]

beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
beforeEach(() => core.resetRuntime())

describe("an object type", () => {
  test("compiles onto a thing that keeps every key;  reading a key it doesn't declare warns of nothing", () => {
    const { errors, warnings, code } = compiled()
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(code).toMatch(/^export class AssetMeta extends Thing \{\n {2}static keepsEveryKey = true$/m)
    expect(code).toContain("this.meta?.owner")
  })

  test("its known fields typed, every other key as it came, one row's own key too, and what's inside", async () => {
    const [warm, cool] = await jobsIn(holding(ROWS))
    expect(warm!.meta.constructor.name).toBe("AssetMeta")
    expect(warm!.meta.provenance).toBe("scan")
    expect(warm!.meta.checkedAt).toBeInstanceOf(Date)
    expect(warm!.meta.owner).toBe("ada")
    expect(warm!.meta.deep).toEqual({ a: { b: 1 } })
    expect(cool!.meta.extra_key).toBe(true)
    expect(cool!.meta.owner).toBeUndefined()
    // what the page reads
    expect([warm!.source, warm!.owner, warm!.rawOwner]).toEqual(["scan", "ada", "ada"])
    expect(warm!.raw).toEqual({ owner: "ada", runs: [1, 2] })
  })

  test("written back whole:  every key it was sent", async () => {
    const place = holding(ROWS)
    const [warm] = await jobsIn(place)
    const Job = warm!.constructor as new (props: object) => SC.Thing
    await core.saveThing(new Job({ name: "copy", meta: warm!.meta }))
    await vi.waitFor(() => expect(place.sent).toHaveLength(1), { timeout: 3000 })
    // every key:  a known field under the key the row sent it under, a date as ISO text, the others as they came
    expect(place.sent[0]!.fields?.meta).toEqual({
      provenance: "scan",
      checked_at: "2026-11-20T10:00:00.000Z",
      owner: "ada",
      deep: { a: { b: 1 } }
    })
  })
})

describe("a thing inside a row is written back under the source's keys, never Spell's names", () => {
  test("each field under the key the row sent it under;  one `stored as` under that name", async () => {
    const place = holding(ROWS)
    const [warm] = await jobsIn(place)
    const steps = (warm as unknown as { steps: SC.List }).steps
    expect((steps.items[0] as Record<string, unknown>).runBy).toBe("ada")
    expect((steps.items[0] as Record<string, unknown>).remark).toBe("first")
    const Job = warm!.constructor as new (props: object) => SC.Thing
    await core.saveThing(new Job({ name: "copy", steps }))
    await vi.waitFor(() => expect(place.sent).toHaveLength(1), { timeout: 3000 })
    expect(place.sent[0]!.fields?.steps).toEqual([{ run_by: "ada", note: "first" }])
  })

  test("a thing of that type made here writes the keys its type was read with", async () => {
    const place = holding(ROWS)
    const [warm] = await jobsIn(place)
    const Step = core.things.classNamed("Step") as unknown as new (props: object) => SC.Thing
    const Job = warm!.constructor as new (props: object) => SC.Thing
    await core.saveThing(new Job({ name: "new", steps: [new Step({ runBy: "bo", remark: "fresh" })] }))
    await vi.waitFor(() => expect(place.sent).toHaveLength(1), { timeout: 3000 })
    const [step] = place.sent[0]!.fields?.steps as Array<Record<string, unknown>>
    expect(step).toMatchObject({ run_by: "bo", note: "fresh" })
    expect(Object.keys(step!)).not.toContain("runBy")
    expect(Object.keys(step!)).not.toContain("remark")
  })

  test("a change to one field of it writes its owner's list, the field under the source's key", async () => {
    const place = holding(ROWS)
    const [warm] = await jobsIn(place)
    const [step] = (warm as unknown as { steps: SC.List }).steps.items as Array<Record<string, unknown>>
    step!.runBy = "cy"
    await vi.waitFor(() => expect(place.sent.length).toBeGreaterThan(0), { timeout: 3000 })
    expect(place.sent.at(-1)!.fields?.steps).toEqual([{ run_by: "cy", note: "first" }])
  })
})
