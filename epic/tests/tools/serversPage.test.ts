import { describe, expect, test } from "vite-plus/test"

import {
  addressLine,
  firstClause,
  httpsToggle,
  withSecureAddress,
  inCardOrder,
  worktreeOrder
} from "spell/epic/tools/_assets/servers-page.js"

/** a server of `worktree` (none:  the main checkout's), as `/api/servers` lists it */
const server = (name: string, worktree?: string, more: Record<string, unknown> = {}) => ({
  id: name,
  repo: name === "epic hub" ? "" : "spell",
  name,
  what: "",
  checkout: "",
  state: "running",
  canStart: true,
  ...(worktree && { worktree }),
  ...more
})

/** an epic's worktree, as `ServerFacts.epicWorktrees()` sends it */
const epic = (worktree: string, more: Record<string, unknown> = {}) => ({
  epic: worktree,
  worktree,
  url: "",
  ahead: 0,
  ...more
})

describe("the Servers page's order (epic `epic-engine` I449)", () => {
  test("inCardOrder():  page server, editor, epic hub, then a repo's own, each in the order it came", () => {
    const servers = [
      server("proxy", undefined, { own: true }),
      server("epic hub"),
      server("editor"),
      server("page server")
    ]
    expect(inCardOrder(servers).map((one: { name: string }) => one.name)).toEqual([
      "page server",
      "editor",
      "epic hub",
      "proxy"
    ])
  })

  test("worktreeOrder():  a running worktree's servers are under it, its repo named or not", () => {
    for (const repo of [undefined, "spell"]) {
      const groups = worktreeOrder({
        servers: [server("editor", "solid-2-final"), server("page server", "solid-2-final"), server("page server")],
        epicWorktrees: [epic("editor"), epic("solid-2-final", repo ? { repo } : {})]
      })
      expect(groups.map((group) => group.worktree)).toEqual(["editor", "solid-2-final"])
      expect(groups[1]!.servers.map((one: { name: string }) => one.name)).toEqual(["page server", "editor"])
    }
  })

  test("worktreeOrder():  the keeper's order kept (newest worked on first);  a worktree only a server names, last", () => {
    const groups = worktreeOrder({
      servers: [server("page server", "zeta"), server("page server", "alpha")],
      epicWorktrees: [epic("editor"), epic("prefs-and-undo")]
    })
    expect(groups.map((group) => group.worktree)).toEqual(["editor", "prefs-and-undo", "alpha", "zeta"])
  })
})

describe("the Servers page's merged list (epic `epic-engine` I451)", () => {
  test("firstClause():  a commit subject up to its first `;` or ` -- `", () => {
    expect(
      firstClause("T163, I450:  ONE listener for every epic's page, in the epic hub;  no session arms a wait")
    ).toBe("T163, I450:  ONE listener for every epic's page, in the epic hub")
    expect(firstClause("P3:  Tidy -- the rest")).toBe("P3:  Tidy")
    expect(firstClause("I449:  the epics pack rebuilt (server.types.ts changed)")).toBe(
      "I449:  the epics pack rebuilt (server.types.ts changed)"
    )
  })
})

describe("the page server's HTTPS switch, a lock among its buttons (epic `epic-engine` I454)", () => {
  test("httpsToggle():  on, a closed lock that turns it off;  off, an open lock that turns it on", () => {
    expect(httpsToggle({ state: "on", canTurnOn: false, canTurnOff: true })).toMatchObject({
      turn: "off",
      icon: "lock"
    })
    expect(httpsToggle({ state: "on" }).tip).toMatch(/^Secure link \(HTTPS\) is on\.\n.*HTTP\/2/)
    expect(httpsToggle({ state: "off", canTurnOn: true })).toMatchObject({ turn: "on", icon: "unlock" })
    expect(httpsToggle({ state: "needs-trust", canTurnOn: true }).tip).toMatch(/hasn't approved it yet/)
  })

  test("withSecureAddress():  on, main's page server at its https address;  off, as the keeper named it", () => {
    const page = server("page server", undefined, { address: "http://127.0.0.1:4747/" })
    const on = { state: "on", address: "https://localhost:4747/" }
    expect(withSecureAddress(page, on).address).toBe("https://localhost:4747/")
    expect(withSecureAddress(page, { state: "off" }).address).toBe("http://127.0.0.1:4747/")
    expect(withSecureAddress(page, undefined)).toBe(page)
  })

  test("httpsToggle():  no mkcert, disabled with the server's reason", () => {
    expect(httpsToggle({ state: "off", canTurnOn: false, whyNot: "install mkcert" }).whyNot).toMatch(/install mkcert$/)
  })
})

describe("a card's line under its name (epic `epic-engine` T164)", () => {
  test("running:  its address;  stopped or down:  Not running, never its description", () => {
    expect(addressLine(server("page server", undefined, { address: "http://127.0.0.1:4747/" }), "127.0.0.1:4747")).toBe(
      "127.0.0.1:4747"
    )
    expect(addressLine(server("page server", "atmosphere", { state: "stopped", what: "epic pages, guides" }))).toBe(
      "Not running"
    )
    expect(addressLine(server("editor", "atmosphere", { state: "down", what: "the Spell app" }))).toBe("Not running")
  })
})
