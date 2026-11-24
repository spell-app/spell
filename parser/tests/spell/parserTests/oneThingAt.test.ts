/**
 * ONE thing at a web server's own address, not a list:  `the server status lives at "/api/status"`.
 * - Its type is declared as any other's, after the place's lines;  read, it's a list of that one row.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** A project of these lines:  its one file's errors and compiled code. */
function compiled(lines: readonly string[], path = "/A.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

describe("one thing at its own address", () => {
  test("its line says where, beside the lists;  its type declared after", () => {
    const { errors, compiled: code } = compiled([
      `acme is a web server at "https://acme.test"`,
      `\tits next page is asked for with "limit" and "offset"`,
      `\tjobs live at "/api/jobs"`,
      `\tthe server status lives at "/api/status"`,
      `\tthe health lives at "/health"`,
      `a "job" is a thing`,
      `\tit lives in acme`,
      `\tits "name" is text`,
      `a "server status" is a thing`,
      `\tit lives in acme`,
      `\tits "ok" is yes or no`,
      `a "health" is a thing`,
      `\tit lives in acme`,
      `\tits "state" is text`
    ])
    expect(errors).toEqual([])
    expect(code).toMatch(/serverStatuses: \{ at: "\/api\/status", isOne: true \}/)
    expect(code).toMatch(/health: \{ at: "\/health", isOne: true \}/)
    expect(code).toMatch(/jobs: \{ at: "\/api\/jobs" \}/)
  })

  test("the same in Spanish", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme es un servidor web en "https://acme.test"`,
        `\tel estado está en "/api/status"`,
        `un "estado" es una cosa`,
        `\tvive en acme`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toMatch(/at: "\/api\/status", isOne: true/)
  })
})
