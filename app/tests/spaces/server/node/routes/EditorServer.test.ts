import { spawn } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import {
  EDITOR_FILE,
  EditorServer,
  editorFileName,
  editorRecordFile,
  editorsInTheWay,
  steadyPort,
  worktreeEditorPort
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

describe("one editor per page server's spaces:  starting one never stops another's", () => {
  test("the default spell.spaces keeps the plain names;  any other is named by its folder and path", () => {
    expect(editorFileName(defaultSpellSpacesDir)).toBe(EDITOR_FILE)
    const main = editorFileName("/x/my-project/spaces")
    const worktree = editorFileName("/x/my-project.worktrees/my-feature/spaces")
    expect(main).toMatch(/^\.spell-server\.editor\.my-project-[0-9a-f]{8}\.json$/)
    expect(worktree).toMatch(/^\.spell-server\.editor\.my-feature-[0-9a-f]{8}\.json$/)
    expect(editorFileName("/x/my-project/spaces", ".spell-server.editor.log")).toBe(main.replace(/\.json$/, ".log"))
    expect(editorRecordFile("/kit", "/x/my-project/spaces")).toBe(join("/kit", main))
  })

  test("a vite whose page server still runs past the wait:  stopped, not doubled (epic `epic-engine` I455)", async () => {
    const root = mkdtempSync(join(tmpdir(), "editor-"))
    const vite = spawn("sleep", ["30"], { detached: true, stdio: "ignore" })
    const otherServer = spawn("sleep", ["30"], { stdio: "ignore" })
    try {
      const editor = new EditorServer(root, "/x/my-project/spaces")
      writeFileSync(
        editor.recordFile,
        JSON.stringify({ url: "http://localhost:1/", pid: vite.pid, pagePort: 4747, server: otherServer.pid })
      )
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const kept = await editor["adopt"](4760, {} as never, { thisMachineOnly: false }, 200)
      warn.mockRestore()
      expect(kept).toBeUndefined()
      await vi.waitFor(() => expect(SRV.isProcessAlive(vite.pid!)).toBe(false))
    } finally {
      vite.kill()
      otherServer.kill()
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("a vite that ends by itself comes back (epic `epic-engine` I455)", () => {
  test("one taken over from the last page server is watched:  gone, its record goes and it starts again", async () => {
    vi.useFakeTimers()
    const root = mkdtempSync(join(tmpdir(), "editor-"))
    const vite = spawn("sleep", ["30"], { detached: true, stdio: "ignore" })
    try {
      const editor = new EditorServer(root, "/x/my-project/spaces")
      writeFileSync(editor.recordFile, JSON.stringify({ url: "http://localhost:1/", pid: vite.pid }))
      const relaunch = vi
        .spyOn(editor as never as { relaunchSoon(): void }, "relaunchSoon")
        .mockImplementation(() => {})
      editor["adoptedPid"] = vite.pid
      editor["watchAdopted"]()
      await vi.advanceTimersByTimeAsync(3000)
      expect(relaunch).not.toHaveBeenCalled()
      vite.kill()
      await vi.waitFor(() => expect(SRV.isProcessAlive(vite.pid!)).toBe(false))
      await vi.advanceTimersByTimeAsync(3000)
      expect(relaunch).toHaveBeenCalledOnce()
      expect(existsSync(editor.recordFile)).toBe(false)
    } finally {
      vi.useRealTimers()
      vite.kill()
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("editorsInTheWay():  one editor per checkout, main's alone on 3000 (epic `epic-engine` I455)", () => {
  const app = "/kit/app/app"
  const worktreeApp = "/kit.worktrees/ast-markup/app/app"

  test("a vite of this checkout no record names is stopped;  the kept one and its child stay", () => {
    const editors = [
      { pid: 10, folder: app, port: undefined },
      { pid: 11, parent: 10, folder: app, port: 3000 },
      { pid: 20, folder: app },
      { pid: 21, parent: 20, folder: app, port: 3001 },
      { pid: 30, folder: app, port: 3002 }
    ]
    expect(editorsInTheWay({ editors, appDir: app, keep: new Set([10]) })).toEqual([20, 21, 30])
  })

  test("main stops a worktree's vite on 3000;  a worktree never touches another checkout's", () => {
    const editors = [
      { pid: 40, parent: 39, folder: worktreeApp, port: 3000 },
      { pid: 50, folder: "/kit.worktrees/editor/app/app", port: 4905 }
    ]
    expect(editorsInTheWay({ editors, appDir: app, keep: new Set(), mainPort: 3000 })).toEqual([40])
    expect(editorsInTheWay({ editors, appDir: app, keep: new Set() })).toEqual([])
  })

  test("one whose folder can't be told is left alone", () => {
    expect(
      editorsInTheWay({ editors: [{ pid: 60, port: 3000 }], appDir: app, keep: new Set(), mainPort: 3000 })
    ).toEqual([])
  })
})

describe("worktreeEditorPort():  3000 is the main checkout's editor's alone (epic `epic-engine` I449)", () => {
  test("a worktree asking for 3000 gets its booked port;  main, and a port given by hand, keep theirs", async () => {
    const folder = mkdtempSync(join(tmpdir(), "editor-port-"))
    const ports = join(folder, "ports.json")
    vi.stubEnv("SPELL_PORTS_FILE", ports)
    try {
      const main = join(folder, "main")
      const worktree = join(folder, "worktrees", "solid")
      mkdirSync(join(main, ".git", "worktrees", "solid"), { recursive: true })
      writeFileSync(join(main, ".git", "worktrees", "solid", "commondir"), "../..\n")
      mkdirSync(worktree, { recursive: true })
      writeFileSync(join(worktree, ".git"), `gitdir: ${join(main, ".git", "worktrees", "solid")}\n`)

      const booked = await worktreeEditorPort(worktree, 3000)
      expect(booked).not.toBe(3000)
      expect(booked).toBe(await new SRV.PortBook(ports).portFor(worktree, "editor"))
      expect(await worktreeEditorPort(main, 3000)).toBe(3000)
      expect(await worktreeEditorPort(worktree, 3123)).toBe(3123)
    } finally {
      vi.unstubAllEnvs()
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
