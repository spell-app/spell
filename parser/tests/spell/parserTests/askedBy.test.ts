/**
 * A collection a web server's things are asked for by a query, each a field of theirs (epic `data` P33):
 * Open-Meteo's forecasts, `forecasts are asked for by their latitude and longitude`, `/v1/forecast?latitude=...&longitude=...`.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** A project of these lines:  its one file's errors and compiled code. */
function compiled(lines: readonly string[], path = "/W.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

const WEATHER = [
  `open meteo is a web server at "https://weather.test":`,
  `\t- forecasts live at "/v1/forecast?hourly=temperature_2m"`,
  `\t- forecasts are asked for by their latitude and longitude`,
  `a "forecast" is a thing:`,
  `\t- it lives in open meteo`,
  `\t- its "latitude" is a number`,
  `\t- its "longitude" is a number`,
  `\t- its "hours" is a list of hours, stored as "hourly"`,
  `an "hour" is a thing:`,
  `\t- its "time" is a date`,
  `\t- its "temperature" is a temperature in °C, stored as "temperature_2m"`
]

describe("a collection asked for by a query", () => {
  test("its line says what it's asked for by, and a read that says each asks for it", () => {
    const read = `set found to every forecast where its latitude is 52.52 and its longitude is 13.41`
    const { errors, compiled: code } = compiled([...WEATHER, read])
    expect(errors).toEqual([])
    expect(code).toContain(`askedBy: ["latitude", "longitude"]`)
    expect(code).toContain(`filter: { latitude: 52.52, longitude: 13.41 }`)
  })

  test("a read that leaves one out is refused, saying what to give", () => {
    const { errors } = compiled([...WEATHER, `set found to every forecast where its latitude is 52.52`])
    expect(errors.join("\n")).toMatch(
      /forecasts are only found by their latitude, longitude, with no list of them all:  say each, "every forecast where its latitude is \.\.\. and its longitude is \.\.\."/
    )
    expect(compiled([...WEATHER, `set found to every forecast`]).errors.join("\n")).toMatch(/only found by their/)
  })

  test("the same in Spanish", () => {
    const lines = [
      `open meteo es un servidor web en "https://weather.test":`,
      `\t- los pronósticos están en "/v1/forecast"`,
      `\t- los pronósticos se piden por su latitud y longitud`,
      `un "pronóstico" es una cosa:`,
      `\t- vive en open meteo`,
      `\t- su "latitud" es un número`,
      `\t- su "longitud" es un número`,
      `poner encontrados a cada pronóstico`
    ]
    const { errors, compiled: code } = compiled(lines, "/W.es.spell")
    expect(code).toContain(`askedBy: ["latitud", "longitud"]`)
    expect(errors.join("\n")).toMatch(/solo se piden por su latitud, longitud/)
  })
})
