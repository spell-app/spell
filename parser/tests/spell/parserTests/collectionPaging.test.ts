/**
 * A collection that pages its own way, one step in under its `live at` line (epic `data` P56):
 * a FastAPI service's events, asked with `?take=&skip=`, beside lists asked with `?limit=&offset=`.
 * - The place's paging lines, the same words, win for that collection alone;  every other list keeps the place's way.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** A project of these lines:  its one file's errors and compiled code. */
function compiled(lines: readonly string[], path = "/A.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

describe("a collection's own paging, under its line", () => {
  test("its paging lines are its own;  the place's stay the place's", () => {
    const { errors, compiled: code } = compiled([
      `acme jobs is a web server at "https://jobs.acme.test"`,
      `\tits next page is asked for with "limit" and "offset"`,
      `\tit gives up to 500 at a time`,
      `\tjobs live at "/api/jobs"`,
      `\tevents live at "/api/events"`,
      `\t\tits next page is asked for with "take" and "skip"`,
      `\t\tit gives up to 100 at a time`,
      `\t\tenabled operations are read`
    ])
    expect(errors).toEqual([])
    expect(code).toContain(`pagesByOffset: { limit: "limit", offset: "offset" }`)
    expect(code).toContain(`pageSize: 500`)
    expect(code).toMatch(
      /events: \{\s*at: "\/api\/events",\s*operations: \["read"\],\s*paging: \{ pagesByOffset: \{ limit: "take", offset: "skip" \}, pageSize: 100 \}/
    )
  })

  test("the same in Spanish", () => {
    const { errors, compiled: code } = compiled(
      [
        `acme jobs es un servidor web en "https://jobs.acme.test"`,
        `\tsu página siguiente se pide con "limit" y "offset"`,
        `\tlos eventos están en "/api/events"`,
        `\t\tsu página siguiente se pide con "take" y "skip"`,
        `\t\tda hasta 100 a la vez`
      ],
      "/A.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(`pagesByOffset: { limit: "limit", offset: "offset" }`)
    expect(code).toMatch(
      /eventos: \{\s*at: "\/api\/events",\s*paging: \{ pagesByOffset: \{ limit: "take", offset: "skip" \}, pageSize: 100 \}/
    )
    expect(code).not.toMatch(/^\s*pageSize: 100/m)
  })
})
