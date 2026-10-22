import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { serverLines, serversRoot } from "spell-kit/cli/commands/serverCommand"

describe("serversRoot()", () => {
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "servers-root-")))
  afterAll(() => rmSync(temp, { recursive: true, force: true }))
  // a kit, its spell-app with page server settings, and spell-ui without
  mkdirSync(join(temp, "spell-app", "app"), { recursive: true })
  mkdirSync(join(temp, "spell-ui", "src"), { recursive: true })
  writeFileSync(join(temp, "repos.json5"), "{ repos: [{ name: 'spell-ui' }, { name: 'spell-app' }] }")
  writeFileSync(join(temp, "package.json"), JSON.stringify({ name: "spell-kit", spell: {} }))
  writeFileSync(join(temp, "spell-ui", "package.json"), JSON.stringify({ name: "spell-ui", spell: {} }))
  writeFileSync(
    join(temp, "spell-app", "package.json"),
    JSON.stringify({ name: "spell-app", spell: {}, pageServer: {} })
  )

  test("inside a checkout with page server settings:  that one", () => {
    expect(serversRoot(join(temp, "spell-app", "app"))).toBe(join(temp, "spell-app"))
  })
  test("anywhere else in the kit:  the installed repo that has them", () => {
    expect(serversRoot(join(temp, "spell-ui", "src"))).toBe(join(temp, "spell-app"))
    expect(serversRoot(temp)).toBe(join(temp, "spell-app"))
  })
})

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
