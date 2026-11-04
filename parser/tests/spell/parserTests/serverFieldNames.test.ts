/**
 * The words for a server's field names and numbers (epic `data` P23), both languages:  what's written, what it compiles to.
 * - What the running program does with them:  `tests/core/serverFieldNames.test.ts`.
 */
import { describe, expect, it } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"
// After the helpers, which load the language whole:  the rules' folder can't load first
import { checkEveryInWords } from "spell/parser/spell/rules/places"

/** A program's lines, compiled:  what a test asks of it. */
function compiled(lines: string[], path = "/Test.spell") {
  const { files } = parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }])
  const { compiled: js, errors } = files[0]!
  return { js: `${js}`, errors: errors as unknown as string[] }
}

const SERVER = [
  'star wars is a web server at "https://swapi.py4e.com/api":',
  '\t- it writes names like "hair_color"',
  '\t- it writes numbers like "1.200,5"',
  '\t- characters live at "/people"',
  ""
]

describe("a field's own line says what isn't its words", () => {
  it("or its words for nothing;  stored as its name there", () => {
    const { js, errors } = compiled([
      ...SERVER,
      'a "character" is a thing:',
      "\t- it lives in star wars",
      '\t- its "height" is a number or "unknown"',
      '\t- its "average height" is a number or "n/a" or "unknown", stored as "avg_ht"',
      '\t- its "hair color" is text'
    ])
    expect(errors).toEqual([])
    expect(js).toContain('this.declareProp("height", { type: "number", nothingAs: ["unknown"],')
    expect(js).toContain(
      'this.declareProp("averageHeight", { type: "number", storedAs: "avg_ht", nothingAs: ["n/a", "unknown"],'
    )
    expect(js).toContain('this.declareProp("hairColor", { type: "text",')
  })

  it("the server's lines:  how it writes names and numbers", () => {
    const { js, errors } = compiled(SERVER)
    expect(errors).toEqual([])
    expect(js).toContain('namesLike: "hair_color"')
    expect(js).toContain('numbersLike: "1.200,5"')
    expect(js).not.toContain("unclearNumbers")
  })

  it("in Spanish:  o, guardado como, escribe ... como;  a number its text can't settle reads with a comma", () => {
    const { js, errors } = compiled(
      [
        'guerra de las galaxias es un servidor web en "https://swapi.py4e.com/api":',
        '\t- escribe los nombres como "hair_color"',
        '\t- escribe los números como "1.200,5"',
        "",
        'un "personaje" es una cosa:',
        "\t- vive en guerra de las galaxias",
        '\t- su "altura" es un número o "unknown"',
        '\t- su "color de pelo" es texto, guardado como "hair_colour"'
      ],
      "/Test.es.spell"
    )
    expect(errors).toEqual([])
    expect(js).toContain('this.declareProp("altura", { type: "number", nothingAs: ["unknown"],')
    expect(js).toContain('this.declareProp("colorDePelo", { type: "text", storedAs: "hair_colour",')
    expect(js).toContain('namesLike: "hair_color"')
    expect(js).toContain('unclearNumbers: ","')
  })

  it('the old way still reads:  a character\'s hair color is its "hair_color"', () => {
    const { js, errors } = compiled([
      ...SERVER.slice(0, 1),
      `\t- a character's hair color is its "hair_colour"`,
      '\t- characters live at "/people"',
      "",
      'a "character" is a thing:',
      "\t- it lives in star wars",
      '\t- its "hair color" is text'
    ])
    expect(errors).toEqual([])
    expect(js).toContain('fields: { hairColor: "hair_colour" }')
  })
})

describe("how often to check, in the largest whole unit", () => {
  it.each([
    ["check it every 30 seconds", 30],
    ["check it every 30", 30],
    ["check it every 5 minutes", 300],
    ["check it every minute", 60],
    ["check it every 2 hours", 7200],
    ["check it every hour", 3600],
    ["check it every day", 86400],
    ["check it every 2 days", 172800]
  ])("%s", (line, seconds) => {
    const { js, errors } = compiled(['star wars is a web server at "https://x":', `\t- ${line}`])
    expect(errors).toEqual([])
    expect(js).toContain(`checkedEvery: ${seconds}`)
  })

  it.each([
    ["se revisa cada 30 segundos", 30],
    ["se revisa cada 5 minutos", 300],
    ["se revisa cada hora", 3600],
    ["se revisa cada día", 86400]
  ])("in Spanish:  %s", (line, seconds) => {
    const { js, errors } = compiled(
      ['guerra de las galaxias es un servidor web en "https://x":', `\t- ${line}`],
      "/Test.es.spell"
    )
    expect(errors).toEqual([])
    expect(js).toContain(`checkedEvery: ${seconds}`)
  })

  it.each([
    ["check it once a day", undefined],
    ["check it once a day at 5am", "{ hour: 5, minute: 0 }"],
    ["check it every day at 5am", "{ hour: 5, minute: 0 }"],
    ["check it once a day at 5:30 pm", "{ hour: 17, minute: 30 }"],
    ["check it once a day at 12am", "{ hour: 0, minute: 0 }"],
    ["check it once a day at 12pm", "{ hour: 12, minute: 0 }"],
    ["check it once a day at 17:00", "{ hour: 17, minute: 0 }"],
    ["check it once a day at 5am UTC", "{ hour: 5, minute: 0, utc: true }"]
  ])("once a day, at a time:  %s", (line, at) => {
    const { js, errors } = compiled(['star wars is a web server at "https://x":', `\t- ${line}`])
    expect(errors).toEqual([])
    expect(js).toContain("checkedEvery: 86400")
    if (at) expect(js.replace(/\s+/g, " ")).toContain(`checkedAt: ${at}`)
    else expect(js).not.toContain("checkedAt")
  })

  it.each([
    ["se revisa una vez al día", undefined],
    ["se revisa una vez al día a las 5", "{ hour: 5, minute: 0 }"],
    ["se revisa cada día a las 5:30 de la tarde", "{ hour: 17, minute: 30 }"],
    ["se revisa una vez al día a la 1", "{ hour: 1, minute: 0 }"]
  ])("in Spanish:  %s", (line, at) => {
    const { js, errors } = compiled(
      ['guerra de las galaxias es un servidor web en "https://x":', `\t- ${line}`],
      "/Test.es.spell"
    )
    expect(errors).toEqual([])
    expect(js).toContain("checkedEvery: 86400")
    if (at) expect(js.replace(/\s+/g, " ")).toContain(`checkedAt: ${at}`)
  })

  it.each(["check it once a day at 25", "check it once a day at 13pm", "check it once a day at 5:75"])(
    "refuses a time no clock has:  %s",
    (line) => {
      const { errors } = compiled(['star wars is a web server at "https://x":', `\t- ${line}`])
      expect(errors.join(" ")).toMatch(/isn.t a time of day/)
    }
  )

  it("what the ingest writes", () => {
    expect([30, 60, 300, 3600, 7200, 86400, 90, 172800].map(checkEveryInWords)).toEqual([
      "every 30 seconds",
      "every minute",
      "every 5 minutes",
      "every hour",
      "every 2 hours",
      "once a day",
      "every 90 seconds",
      "every 2 days"
    ])
  })
})
