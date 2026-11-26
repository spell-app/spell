import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const spawned = vi.hoisted(() => [] as string[][])
vi.mock("node:child_process", () => ({
  spawn: (_program: string, args: string[]) => {
    spawned.push(args)
    return { unref: () => {} }
  }
}))

import { ensureKeeperSoon } from "spell/cli/keeperEnsure"

describe("ensureKeeperSoon():  any spell command starts Spell's server keeper when none runs (epic `editor` P48)", () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "keeper-ensure-"))
    spawned.length = 0
  })

  afterEach(() => rmSync(home, { recursive: true, force: true }))

  /** the environment of a person's terminal, the keeper's home `home` */
  const env = (more: Record<string, string> = {}) => ({ SPELL_KEEPER_HOME: home, ...more })

  /** a record naming `pid`, written by `keeper` */
  const record = (pid: number, keeper?: string) =>
    writeFileSync(join(home, "server-keeper.json"), JSON.stringify({ pid, base: "http://x", token: "t", keeper }))

  it("nothing registered:  nothing started", () => {
    ensureKeeperSoon(["pony"], env())
    expect(spawned).toEqual([])
  })

  it("registered, no keeper:  `spell keeper ensure --quiet`, detached;  not for keeper, help, the tests or CI", () => {
    mkdirSync(home, { recursive: true })
    writeFileSync(join(home, "keeper.json5"), "{}\n")
    ensureKeeperSoon(["pony"], env())
    expect(spawned).toHaveLength(1)
    expect(spawned[0]!.slice(1)).toEqual(["keeper", "ensure", "--quiet"])
    for (const [args, more] of [
      [["keeper", "status"], {}],
      [["server", "--help"], {}],
      [["pony"], { VITEST: "1" }],
      [["pony"], { CI: "1" }],
      [["pony"], { SPELL_KEEPER: "off" }]
    ] as const)
      ensureKeeperSoon([...args], env(more))
    expect(spawned).toHaveLength(1)
  })

  it("Spell's keeper alive:  nothing;  gone:  started;  the epic hub's record, live or not:  left to the hub", () => {
    writeFileSync(join(home, "keeper.json5"), "{}\n")
    record(process.pid, "spell")
    ensureKeeperSoon(["pony"], env())
    expect(spawned).toEqual([])
    record(2 ** 22 + 7, "spell")
    ensureKeeperSoon(["pony"], env())
    expect(spawned).toHaveLength(1)
    record(2 ** 22 + 7, "epic hub")
    ensureKeeperSoon(["pony"], env())
    record(2 ** 22 + 7)
    ensureKeeperSoon(["pony"], env())
    expect(spawned).toHaveLength(1)
  })
})
