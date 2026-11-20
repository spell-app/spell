import { describe, expect, it } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { mergedSpell, type SpellParts } from "spell/parser/spell/ingest/PlaceSpell"
import { PlaceWords } from "spell/parser/spell/ingest/PlaceWords"

/** NetBox's Spell, as the settled design shows it (epic `data` P53):  a person's words as `--` lines. */
const NETBOX = [
  'netbox is a web server at "https://demo.netbox.dev"',
  "\t-- An inventory of a network.",
  "\t-- Use the demo account for reads.",
  '\tjobs live at "/api/jobs"',
  "",
  'a "job" is a thing',
  "\t-- A piece of work NetBox runs in the background.",
  "\tit lives in netbox",
  '\tits "status" is one of pending, running, completed or errored',
  "\t\t-- completed is the only finished one.",
  '\tits "user" is text',
  '\tits "queue" is text',
  "\t\t-- NEW as of 2026-11-18",
  ""
].join("\n")

// the language loads first:  `PlaceSpell` reads its rules as it loads
void SP

describe("PlaceWords.of()", () => {
  it("reads the place's prose, a type's words and its fields'", () => {
    const words = PlaceWords.of(NETBOX)
    expect(words.place!.words).toBe("An inventory of a network.\nUse the demo account for reads.")
    expect(words.types.job!.words).toBe("A piece of work NetBox runs in the background.")
    expect(words.types.job!.fields.status!.words).toBe("completed is the only finished one.")
    expect(words.types.job!.fields.user!.words).toBe("")
  })

  it("reads the ingest's marks apart from the words", () => {
    const queue = PlaceWords.of(NETBOX).types.job!.fields.queue!
    expect(queue.words).toBe("")
    expect(queue.marks).toEqual([{ is: "new", date: "2026-11-18" }])
  })

  it("reads a Spanish file's lines", () => {
    const text = [
      'estrellas es un servidor web en "https://swapi.info/api"',
      "\t-- Las películas de La guerra de las galaxias.",
      "",
      'una "película" es una cosa',
      '\tsu "title" es texto',
      "\t\t-- Su título.",
      "\t\t-- NUEVO desde el 2026-11-18"
    ].join("\n")
    const words = PlaceWords.of(text)
    expect(words.place!.words).toBe("Las películas de La guerra de las galaxias.")
    expect(words.types.película!.fields.title!.words).toBe("Su título.")
    expect(words.types.película!.fields.title!.marks).toEqual([{ is: "new", date: "2026-11-18" }])
  })
})

describe("PlaceWords.edit()", () => {
  it("replaces a field's words, at its indent", () => {
    const text = PlaceWords.applied(
      NETBOX,
      PlaceWords.edit(
        NETBOX,
        { kind: "field", type: "job", field: "status" },
        "Only completed is finished.\nThe rest are still going."
      )
    )
    expect(text).toContain(
      '\tits "status" is one of pending, running, completed or errored\n\t\t-- Only completed is finished.\n\t\t-- The rest are still going.\n\tits "user"'
    )
  })

  it("puts new words under a line with none, before the ingest's mark", () => {
    const edit = PlaceWords.edit(NETBOX, { kind: "field", type: "job", field: "queue" }, "Which queue runs it.")
    expect(PlaceWords.applied(NETBOX, edit)).toContain(
      '\tits "queue" is text\n\t\t-- Which queue runs it.\n\t\t-- NEW as of 2026-11-18'
    )
  })

  it("takes the place's prose out, given none", () => {
    const text = PlaceWords.applied(NETBOX, PlaceWords.edit(NETBOX, { kind: "place" }, ""))
    expect(text.split("\n").slice(0, 2)).toEqual([
      'netbox is a web server at "https://demo.netbox.dev"',
      '\tjobs live at "/api/jobs"'
    ])
  })

  it("throws for something the file doesn't have", () => {
    expect(() => PlaceWords.edit(NETBOX, { kind: "type", type: "device" }, "x")).toThrow(/isn't in this file/)
  })
})

describe("mergedSpell(), a person's words", () => {
  /** NetBox's parts:  its job's fields, each one's line. */
  const partsWith = (fields: Record<string, string>, more: SpellParts["types"] = []): SpellParts => ({
    header: 'netbox is a web server at "https://demo.netbox.dev"',
    placeLines: [{ key: "lives:jobs", text: 'jobs live at "/api/jobs"' }],
    types: [
      {
        collection: "jobs",
        header: 'a "job" is a thing',
        lines: [
          { key: "lives:jobs", text: "it lives in netbox" },
          ...Object.entries(fields).map(([key, text]) => ({ key: `field:jobs:${key}`, text }))
        ]
      },
      ...more
    ]
  })
  const BEFORE = partsWith({
    status: 'its "status" is one of pending, running, completed or errored',
    user: 'its "user" is text',
    queue: 'its "queue" is text'
  })
  const MARKS = { date: "2026-11-19", lang: "en" }
  const unused = () => false

  it("keeps a field's words when its line changes", () => {
    const after = partsWith({
      status: 'its "status" is one of pending, running, completed, errored or failed',
      user: 'its "user" is text',
      queue: 'its "queue" is text'
    })
    const { text } = mergedSpell(NETBOX, BEFORE, after, unused, [], MARKS)
    expect(text).toContain(
      '\tits "status" is one of pending, running, completed, errored or failed\n\t\t-- completed is the only finished one.'
    )
  })

  it("drops a field's words with it, saying so", () => {
    const after = partsWith({ user: 'its "user" is text', queue: 'its "queue" is text' })
    const { text, changed } = mergedSpell(NETBOX, BEFORE, after, unused, [], MARKS)
    expect(text).not.toContain("completed is the only finished one")
    expect(text).toContain('\tit lives in netbox\n\tits "user" is text')
    expect(changed).toContain('Dropped your words for "status", as it\'s gone:  -- completed is the only finished one.')
  })

  it("marks a field it finds new, and a type", () => {
    const after = partsWith(
      {
        ...Object.fromEntries(BEFORE.types[0]!.lines.slice(1).map((line) => [line.key.split(":")[2]!, line.text])),
        error: 'its "error" is text'
      },
      [
        {
          collection: "devices",
          header: 'a "device" is a thing',
          lines: [{ key: "lives:devices", text: "it lives in netbox" }]
        }
      ]
    )
    const { text } = mergedSpell(NETBOX, BEFORE, after, unused, [], MARKS)
    expect(text).toContain('\tits "error" is text\n\t\t-- NEW as of 2026-11-19')
    expect(text).toContain('a "device" is a thing\n\t-- NEW as of 2026-11-19\n\tit lives in netbox')
  })

  it("marks a field it keeps though the source lost it, once", () => {
    const after = partsWith({ status: BEFORE.types[0]!.lines[1]!.text, queue: 'its "queue" is text' })
    const used = (words: string) => words === "user"
    const once = mergedSpell(NETBOX, BEFORE, after, used, [], MARKS).text
    expect(once).toContain('\tits "user" is text\n\t\t-- APPARENTLY DELETED as of 2026-11-19')
    const twice = mergedSpell(once, BEFORE, after, used, [], MARKS).text
    expect(twice.match(/APPARENTLY DELETED/g)).toHaveLength(1)
  })

  it("marks nothing without a day", () => {
    const after = partsWith({ ...{ status: BEFORE.types[0]!.lines[1]!.text }, error: 'its "error" is text' })
    expect(mergedSpell(NETBOX, BEFORE, after, unused).text).not.toMatch(/NEW as of 2026-11-19/)
  })
})

describe("PlaceWords.check(), for spell place check", () => {
  /** A description of NetBox's jobs, its fields by the source's names. */
  const descriptionWith = (fields: Record<string, { words: string; leftOut?: string }>, more = {}) =>
    ({
      collections: {
        jobs: { type: "job", at: "/api/jobs", fields },
        ...more
      }
    }) as unknown as Parameters<typeof PlaceWords.check>[1]

  it("matches:  every list has its type, and counts the words", () => {
    const check = PlaceWords.check(
      NETBOX,
      descriptionWith({ status: { words: "status" }, user: { words: "user" }, queue: { words: "queue" } })
    )
    expect(check.stale).toEqual([])
    expect(check.orphaned).toEqual([])
    expect(check.wordless).toEqual({ lists: 0, fields: 2, ofLists: 1, ofFields: 3 })
  })

  it("fails on a list with no type, and on words about a field that's gone", () => {
    const check = PlaceWords.check(
      NETBOX,
      descriptionWith(
        { user: { words: "user" }, queue: { words: "queue" }, error: { words: "error" } },
        { devices: { type: "device", at: "/api/devices", fields: {} } }
      )
    )
    expect(check.stale).toEqual(['The list devices has no type in the Spell:  a "device".'])
    expect(check.orphaned).toEqual([
      'Words for "status" of jobs, which the source no longer has:  completed is the only finished one.'
    ])
    expect(check.unwritten).toEqual(["jobs.error"])
  })

  it("never counts what the Spell leaves out on purpose", () => {
    const check = PlaceWords.check(
      NETBOX,
      descriptionWith({ status: { words: "status" }, hidden: { words: "hidden", leftOut: "no words for it" } })
    )
    expect(check.unwritten).toEqual([])
  })
})
