import { describe, expect, it } from "vite-plus/test"

import { statusTable, upFor } from "spell/cli/commands/serverWatch"
import type { KeptServer } from "spell/server/keeper"

describe("spell server status --watch's table (epic `editor` P49)", () => {
  const now = Date.parse("2026-11-25T14:07:30Z")
  const row = (more: Partial<KeptServer>): KeptServer => ({
    id: "x",
    repo: "spell",
    name: "page server",
    what: "",
    checkout: "/kit",
    state: "running",
    canStart: true,
    ...more
  })

  it("a line per server, its columns lined up:  where, state, up for, what it's building, its address or why", () => {
    const table = statusTable(
      [
        row({ started: "2026-11-25T11:00:00Z", building: ["epic-docs"], address: "http://127.0.0.1:4747/" }),
        row({ name: "editor", worktree: "seo", state: "down", why: "It didn't start.\nPress Restart." })
      ],
      now
    )
    expect(table.split("\n")).toEqual([
      "where  server       state    up for  doing               address",
      "spell  page server  running  3h 7m   building epic-docs  http://127.0.0.1:4747/",
      "⎇ seo  editor       down                                 It didn't start. Press Restart."
    ])
  })

  it("upFor():  seconds, minutes, hours and minutes, days", () => {
    expect(upFor("2026-11-25T14:07:00Z", now)).toBe("30s")
    expect(upFor("2026-11-25T13:55:30Z", now)).toBe("12m")
    expect(upFor("2026-11-23T14:07:30Z", now)).toBe("2d")
  })
})
