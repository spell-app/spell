import { describe, expect, test } from "vite-plus/test"

import { serverLines } from "spell/cli/commands/serverCommand"

describe("serverLines()", () => {
  test("one aligned line per server:  name, port, URL, what, state", () => {
    const lines = serverLines("/kit/spell-app", [
      { name: "page server", url: "http://127.0.0.1:4747/", what: "docs", state: "running" },
      { name: "editor", url: "-", what: "the spell app (vite)", state: "didn't answer", failed: true }
    ])
    expect(lines).toEqual([
      "Spell servers of /kit/spell-app:",
      "  page server   4747  http://127.0.0.1:4747/  docs                  running",
      "  editor           -  -                       the spell app (vite)  didn't answer"
    ])
  })
})
