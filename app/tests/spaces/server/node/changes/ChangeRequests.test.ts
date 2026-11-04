import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { ChangeRequests } from "spell/app/spaces/server/node/changes/ChangeRequests"
import type { SPACES } from "spell/app/spaces"

/** A request, as the editor asks. */
const ASKED: SPACES.ChangeAsked = {
  projectId: "owen@spell/Proj",
  filePath: "/Proj.spell",
  line: 3,
  column: 2,
  kind: "ui-button",
  excerpt: "<ui-button>Go</ui-button>",
  text: "say Stop"
}

describe("ChangeRequests", () => {
  let folder: string
  let inbox: ChangeRequests

  beforeEach(() => {
    folder = mkdtempSync(path.join(os.tmpdir(), "change-requests-"))
    inbox = new ChangeRequests(path.join(folder, "inbox.json"))
  })
  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("adds a request that waits, with an id never used twice", () => {
    expect(inbox.add(ASKED, "/disk/Proj.spell")).toMatchObject({
      id: "c1",
      status: "waiting",
      diskPath: "/disk/Proj.spell"
    })
    expect(inbox.add(ASKED, "/disk/Proj.spell").id).toBe("c2")
    expect(inbox.of("c2")?.text).toBe("say Stop")
    expect(inbox.of("c9")).toBeUndefined()
  })

  it("is read afresh, so the command and the server see the same", () => {
    inbox.add(ASKED, "/disk/Proj.spell")
    const other = new ChangeRequests(inbox.file)
    expect(other.takeNext()?.id).toBe("c1")
    expect(inbox.of("c1")?.status).toBe("taken")
  })

  it("takes the oldest waiting first, and nothing once none waits", () => {
    inbox.add(ASKED, "/disk/Proj.spell")
    inbox.add(ASKED, "/disk/Proj.spell")
    expect(inbox.takeNext()?.id).toBe("c1")
    expect(inbox.takeNext()?.id).toBe("c2")
    expect(inbox.takeNext()).toBeUndefined()
  })

  it("drops a request left waiting too long, rather than doing it", () => {
    const { at } = inbox.add(ASKED, "/disk/Proj.spell")
    const twoHoursOn = Date.parse(at) + 2 * 60 * 60 * 1000
    expect(inbox.takeNext(twoHoursOn)).toBeUndefined()
    expect(inbox.of("c1")?.status).toBe("failed")
  })

  it("finishes a request with the session's line, and throws for one it doesn't have", () => {
    inbox.add(ASKED, "/disk/Proj.spell")
    expect(inbox.finish("c1", "done", "it says Stop")).toMatchObject({ status: "done", summary: "it says Stop" })
    expect(() => inbox.finish("c9", "done")).toThrow(/no request c9/)
  })

  it("is listened to while a session's beat is live, or while one has a request", () => {
    const now = Date.now()
    expect(inbox.isListening(now)).toBe(false)
    inbox.hear(new Date(now))
    expect(inbox.isListening(now + SRV.Heartbeat.STALE_MS)).toBe(true)
    expect(inbox.isListening(now + SRV.Heartbeat.STALE_MS + 1)).toBe(false)
    inbox.add(ASKED, "/disk/Proj.spell")
    inbox.takeNext()
    expect(inbox.isListening(now + SRV.Heartbeat.STALE_MS + 1)).toBe(true)
  })

  it("stops listening as the listener stops, or as its process is gone", () => {
    const stop = inbox.listen()
    expect(inbox.isListening()).toBe(true)
    stop()
    expect(inbox.isListening()).toBe(false)
    // a beat from a process that's gone (pid 2^22 + 1, past any real one):  nobody
    writeFileSync(
      inbox.file,
      JSON.stringify({ lastId: 0, requests: [], heard: { pid: 4194305, seen: new Date().toISOString() } })
    )
    expect(inbox.isListening()).toBe(false)
  })

  it("keeps both writers' requests, the server's and the command's, at once (I21)", async () => {
    // two processes each add 15 requests while the other does:  with no lock, one's write dropped the other's
    const script = [
      'import { ChangeRequests } from "spell/app/spaces/server/node/changes/ChangeRequests"',
      `const inbox = new ChangeRequests(${JSON.stringify(inbox.file)})`,
      'for (let i = 0; i < 15; i++) inbox.add({ projectId: "p", filePath: "/f", line: 0, column: 0, kind: "k", excerpt: "", text: "t" }, "/f")'
    ].join("\n")
    const writer = () =>
      new Promise<number>((done) =>
        spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { stdio: "inherit" }).on(
          "exit",
          (code) => done(code ?? 1)
        )
      )
    expect(await Promise.all([writer(), writer()])).toEqual([0, 0])
    const ids = inbox.all.map((request) => request.id)
    expect(ids).toHaveLength(30)
    expect(new Set(ids).size).toBe(30)
  }, 60_000)
})
