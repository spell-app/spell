import { describe, expect, test } from "vite-plus/test"

import {
  addressLine,
  editorChoices,
  firstClause,
  httpsToggle,
  stateLook,
  withSecureAddress,
  inCardOrder,
  isActiveWorktree,
  worktreeCards,
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

describe("a worktree's cards (epic `epic-engine` I465)", () => {
  test("worktreeCards():  nothing running, no cards;  anything running, every server's card, the stopped ones too", () => {
    const stopped = { state: "stopped" }
    expect(worktreeCards([server("page server", "editor", stopped)])).toEqual([])
    const servers = [server("page server", "ast-markup"), server("editor", "ast-markup", stopped)]
    expect(worktreeCards(servers).map((one: { name: string }) => one.name)).toEqual(["page server", "editor"])
    expect(worktreeCards([server("page server", "x", { state: "down" })])).toHaveLength(1)
  })
})

describe("only active worktrees listed (epic `epic-engine` J369)", () => {
  test("isActiveWorktree():  a server not stopped, a busy session, agents, a turn or a phase;  commits alone, no", () => {
    const stopped = { state: "stopped" }
    const idle = (more: Record<string, unknown> = {}) => ({ epic: epic("w", more), servers: [] })
    expect(isActiveWorktree(idle())).toBe(false)
    expect(isActiveWorktree(idle({ ahead: 851 }))).toBe(false)
    expect(isActiveWorktree({ ...idle(), servers: [server("page server", "w", stopped)] })).toBe(false)
    expect(isActiveWorktree({ ...idle(), servers: [server("page server", "w", { state: "down" })] })).toBe(true)
    expect(isActiveWorktree({ epic: undefined, servers: [server("page server", "w")] })).toBe(true)
    for (const more of [{ busy: true }, { agents: 2 }, { turn: "test" }, { phase: "P19 · Review Chunking" }]) {
      expect(isActiveWorktree(idle(more))).toBe(true)
    }
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

describe("a card's state, one icon (epic `epic-engine` I456)", () => {
  test("stateLook():  running a green check, down a red triangle, stopped a grey circle;  its words the tooltip", () => {
    expect(stateLook(server("page server"))).toMatchObject({ icon: "circle check", color: "green", tip: "Running" })
    expect(stateLook(server("editor", undefined, { state: "down", why: "it stopped answering" }))).toMatchObject({
      icon: "triangle exclamation",
      color: "red",
      tip: "Down:  it stopped answering"
    })
    expect(stateLook(server("editor", undefined, { state: "stopped" }))).toMatchObject({
      icon: "circle outline",
      color: "grey",
      tip: "Stopped"
    })
    expect(stateLook(server("editor", undefined, { state: "starting" }))).toMatchObject({
      loading: true,
      tip: "Starting"
    })
  })
})

describe("the page server's HTTPS switch, the lock before its address (epic `epic-engine` I454, I456)", () => {
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

describe("Show in the editor, at a checkout's heading", () => {
  const editorSpaces = [
    { repo: "acme-app", orgs: ["acme"], checkouts: [{ served: false }, { worktree: "fix", served: true }] },
    { repo: "other", orgs: ["other"], checkouts: [{ served: true }] }
  ]

  test("editorChoices():  main's checkout of each repo, which one the editor shows", () => {
    expect(editorChoices(editorSpaces, undefined)).toEqual([
      { repo: "acme-app", served: false },
      { repo: "other", served: true }
    ])
  })

  test("editorChoices():  a worktree's, only in the repo that has it, and the epic's repo where it names one", () => {
    expect(editorChoices(editorSpaces, "fix")).toEqual([{ repo: "acme-app", worktree: "fix", served: true }])
    expect(editorChoices(editorSpaces, "fix", "other")).toEqual([])
    expect(editorChoices(editorSpaces, "elsewhere")).toEqual([])
  })

  test("editorChoices():  none when the answer has no editorSpaces", () => {
    expect(editorChoices(undefined, undefined)).toEqual([])
  })
})
