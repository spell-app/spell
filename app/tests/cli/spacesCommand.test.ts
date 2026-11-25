import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { spacesCommand, useCommand } from "spell/app/cli/commands/spacesCommand"

/** `spell spaces [use <folder>]`, on a temp file and a made-up org, `@acme`;  the keeper a stand-in. */
const temp = realpathSync(mkdtempSync(join(tmpdir(), "spaces-command-")))
afterAll(() => rmSync(temp, { recursive: true, force: true }))
afterEach(() => vi.restoreAllMocks())

const fix = join(temp, "acme-app.worktrees/fix/spaces")
mkdirSync(join(fix, "@acme/tools"), { recursive: true })

/** what the command printed, a line each */
function printed(): string[] {
  const log = vi.spyOn(console, "log").mockImplementation(() => {})
  return log.mock.calls as unknown as string[]
}

describe("spell spaces", () => {
  test("use:  written, then the keeper asked to restart the main checkout's page server", async () => {
    const file = join(temp, "a.json5")
    const asked: unknown[] = []
    const keeper = { ask: async (...args: unknown[]) => (asked.push(args), { state: "running" }) }
    const lines = printed()
    expect(await useCommand(fix, { file, keeper: keeper as never })).toBe(0)
    expect(SRV.moreSpacesInFile(file)).toEqual([fix])
    expect(asked).toEqual([["restart", { checkout: expect.any(String) }]])
    expect(lines.flat().join("\n")).toMatch(/@acme now served from .*fix\/spaces[\s\S]*restarted the page server/)
  })

  test("use, no keeper running:  says what to run;  --no-restart:  asks nobody", async () => {
    const file = join(temp, "b.json5")
    const lines = printed()
    expect(await useCommand(fix, { file, keeper: { ask: async () => undefined } })).toBe(0)
    expect(await useCommand(fix, { file, restart: false, keeper: { ask: () => Promise.reject(new Error("asked")) } })).toBe(0)
    expect(lines.flat().join("\n")).toMatch(/No server keeper runs[\s\S]*epic servers restart page-server --repo spell/)
  })

  test("use, a folder with no org's folder:  a plain error;  spell spaces:  each org and its folder", async () => {
    const file = join(temp, "c.json5")
    await expect(useCommand(temp, { file, restart: false })).rejects.toThrow(/no org's folder/)
    const lines = printed()
    await useCommand(fix, { file, restart: false })
    expect(await spacesCommand({ file })).toBe(0)
    expect(lines.flat().join("\n")).toMatch(new RegExp(`@acme  ${fix}`))
    expect(lines.flat().join("\n")).toMatch(/@spell  /)
  })
})
