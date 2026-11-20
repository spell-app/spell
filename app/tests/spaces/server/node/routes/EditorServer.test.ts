import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import {
  EDITOR_FILE,
  EditorServer,
  editorFileName,
  editorRecordFile,
  steadyPort
} from "spell/app/spaces/server/node/routes/EditorServer"
import { defaultSpellSpacesDir } from "spell/app/spaces/server/node/spellSpacesDir"

/** A port check where `held` ports are taken. */
const freeExcept =
  (...held: number[]) =>
  (port: number) =>
    Promise.resolve(!held.includes(port))

describe("steadyPort():  the house site's editor keeps its port, so Caddy's file doesn't change (epic `atmosphere` P39)", () => {
  const noWait = () => Promise.resolve()

  test("the wanted port, when it's free, without waiting", async () => {
    const wait = vi.fn(noWait)
    expect(await steadyPort(3000, freeExcept(), wait)).toBe(3000)
    expect(wait).not.toHaveBeenCalled()
  })

  test("waits for the last editor to let go of it", async () => {
    let looks = 0
    const freeOnThirdLook = () => Promise.resolve(++looks >= 3)
    expect(await steadyPort(3000, freeOnThirdLook, noWait)).toBe(3000)
  })

  test("held for good:  the same spare port every time", async () => {
    const isFree = freeExcept(3000, 3001)
    expect(await steadyPort(3000, isFree, noWait)).toBe(3002)
    expect(await steadyPort(3000, isFree, noWait)).toBe(3002)
  })

  test("nothing free nearby:  says so", async () => {
    expect(await steadyPort(3000, () => Promise.resolve(false), noWait)).toBeUndefined()
  })
})

describe("EditorServer.portPicked:  what the house site waits for before writing Caddy's file (epic `epic-engine` P74)", () => {
  test("with no editor to start, it settles at once, with no port", async () => {
    vi.stubEnv("SPELL_NO_EDITOR", "1")
    try {
      const editor = new EditorServer("/nowhere")
      await editor.start(4747, {} as never)
      expect(await editor.portPicked).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe("one editor per page server's spaces:  starting one never stops another's (epic `old-console-redo` I9)", () => {
  test("the default spell.spaces keeps the plain names;  any other is named by its folder and path", () => {
    expect(editorFileName(defaultSpellSpacesDir)).toBe(EDITOR_FILE)
    const main = editorFileName("/x/harbor-spell/spaces")
    const worktree = editorFileName("/x/harbor-spell.worktrees/old-console-redo/spaces")
    expect(main).toMatch(/^\.spell-server\.editor\.harbor-spell-[0-9a-f]{8}\.json$/)
    expect(worktree).toMatch(/^\.spell-server\.editor\.old-console-redo-[0-9a-f]{8}\.json$/)
    expect(editorFileName("/x/harbor-spell/spaces", ".spell-server.editor.log")).toBe(main.replace(/\.json$/, ".log"))
    expect(editorRecordFile("/kit", "/x/harbor-spell/spaces")).toBe(join("/kit", main))
  })

  test("a vite whose page server still runs, and isn't this one, is left running", async () => {
    const root = mkdtempSync(join(tmpdir(), "editor-"))
    const vite = spawn("sleep", ["30"], { detached: true, stdio: "ignore" })
    const otherServer = spawn("sleep", ["30"], { stdio: "ignore" })
    try {
      const editor = new EditorServer(root, "/x/harbor-spell/spaces")
      writeFileSync(
        editor.recordFile,
        JSON.stringify({ url: "http://localhost:1/", pid: vite.pid, pagePort: 4747, server: otherServer.pid })
      )
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const kept = await editor["adopt"](4760, {} as never, { thisMachineOnly: false })
      warn.mockRestore()
      expect(kept).toBeUndefined()
      expect(SRV.isProcessAlive(vite.pid!)).toBe(true)
    } finally {
      vite.kill()
      otherServer.kill()
      rmSync(root, { recursive: true, force: true })
    }
  })
})
