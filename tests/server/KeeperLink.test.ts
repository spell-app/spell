import { mkdtempSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"
import { serveHandler } from "spell/server/test/serve"

describe("KeeperLink:  asking the server keeper (epic `epic-engine` P82)", () => {
  let folder: string
  let link: SRV.KeeperLink

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "keeper-link-"))
    link = new SRV.KeeperLink(join(folder, "server-keeper.json"))
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("no keeper, or this process's own record:  nothing asked, so the caller does it itself", async () => {
    expect(await link.ask("start", { checkout: "/main" })).toBeUndefined()
    link.write({ pid: process.pid, base: "http://127.0.0.1:1", token: "t" })
    expect(statSync(link.file).mode & 0o777).toBe(0o600)
    expect(link.running()).toBeUndefined()
    expect(await link.ask("start", { checkout: "/main" })).toBeUndefined()
    link.removeIfOurs()
    expect(link.read()).toBeUndefined()
  })

  it("a running keeper:  POSTs the action with its token, and gives back its answer or its words", async () => {
    const asked: unknown[] = []
    const server = await serveHandler(async (request, reply) => {
      asked.push({ path: request.path, token: request.get("x-server-token") })
      if (request.path.endsWith("/stop")) return void reply.status(409).json({ error: "it won't stop" })
      reply.json({ base: "http://127.0.0.1:4747", launched: true })
    })
    try {
      // a record naming another live process:  the test runner's parent stands in for the keeper
      link.write({ pid: process.ppid, base: server.base, token: "secret" })
      expect(await link.ask("start", { checkout: "/main" })).toEqual({ base: "http://127.0.0.1:4747", launched: true })
      await expect(link.ask("stop", { checkout: "/main" })).rejects.toThrow("it won't stop")
      expect(asked[0]).toMatchObject({ path: "/api/servers/start", token: "secret" })
    } finally {
      await server.close()
    }
  })
})

describe("KeeperLink.refusedStart():  main's servers refuse an agent's start (epic `epic-engine` P84)", () => {
  const folder = mkdtempSync(join(tmpdir(), "keeper-refuse-"))
  const main = fakeMainCheckout(join(folder, "kit"))
  const worktree = fakeWorktree(main, join(folder, "kit.worktrees", "seo"))
  const link = new SRV.KeeperLink(join(folder, "server-keeper.json"))
  /** an agent's command:  Claude Code's mark, no test run's */
  const AGENT = { CLAUDECODE: "1" }
  afterAll(() => rmSync(folder, { recursive: true, force: true }))

  it("an agent starting main's page server or editor:  refused, naming the command to ask the keeper with", () => {
    expect(link.refusedStart("page server", main, { env: AGENT, ppid: 1 })).toMatch(
      /^page server:  not started\..*Claude Code ran this\.\nAsk the keeper instead:  epic servers start page-server/
    )
    expect(link.refusedStart("editor", main, { env: { CODEX_THREAD_ID: "t" }, ppid: 1 })).toContain(
      "epic servers start editor"
    )
  })

  it("let through:  the person's own terminal, a worktree's, the keeper's mark or its child, a test run", () => {
    expect(link.refusedStart("editor", main, { env: {}, ppid: 1 })).toBeUndefined()
    expect(link.refusedStart("editor", worktree, { env: AGENT, ppid: 1 })).toBeUndefined()
    expect(
      link.refusedStart("editor", main, { env: { ...AGENT, [SRV.KEEPER_START_VARIABLE]: "1" }, ppid: 1 })
    ).toBeUndefined()
    expect(link.refusedStart("editor", main, { env: { ...AGENT, VITEST: "true" }, ppid: 1 })).toBeUndefined()
    link.write({ pid: 4242, base: "http://127.0.0.1:1", token: "t" })
    expect(link.refusedStart("page server", main, { env: AGENT, ppid: 4242 })).toBeUndefined()
    expect(link.refusedStart("page server", main, { env: AGENT, ppid: 4243 })).toBeDefined()
  })

  it("agentOf():  the agent's mark, or SPELL_EPIC_AGENT;  none for a person's own terminal", () => {
    expect(SRV.KeeperLink.agentOf({ CLAUDECODE: "1" })).toBe("Claude Code")
    expect(SRV.KeeperLink.agentOf({ SPELL_EPIC_AGENT: "gemini" })).toBe("gemini")
    expect(SRV.KeeperLink.agentOf({})).toBeUndefined()
  })
})
