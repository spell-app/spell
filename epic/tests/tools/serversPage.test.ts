import { describe, expect, test } from "vite-plus/test"

import { inCardOrder, worktreeOrder } from "spell/epic/tools/_assets/servers-page.js"

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
