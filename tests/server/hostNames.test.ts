import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

describe("namedAddress()", () => {
  it("makes a worktree's page server's and editor's address through main's port", () => {
    expect(SRV.namedAddress("epic-engine", { port: 4747 })).toBe("http://epic-engine.localhost:4747")
    expect(SRV.namedAddress("My_Work", { port: 4747, secure: true })).toBe("https://my-work.localhost:4747")
    expect(SRV.namedAddress("seo", { port: 4747, editor: true })).toBe("http://seo--app.localhost:4747")
  })
})

describe("namedAddressOf()", () => {
  it("reads main's page server record:  its port, and HTTPS while it speaks it;  `undefined` in main or with none", () => {
    const root = fakeMainCheckout(mkdtempSync(join(tmpdir(), "srv-names-")))
    const worktree = fakeWorktree(root, join(root, ".claude", "worktrees", "seo"))
    try {
      expect(SRV.namedAddressOf(worktree)).toBeUndefined()
      const record = { pid: process.pid, port: 4747 }
      writeFileSync(join(root, ".spell-server.json"), JSON.stringify(record))
      expect(SRV.namedAddressOf(join(worktree, "a.html"))).toBe("http://seo.localhost:4747")
      expect(SRV.namedAddressOf(root)).toBeUndefined()
      writeFileSync(join(root, ".spell-server.json"), JSON.stringify({ ...record, https: "https://localhost:4747" }))
      expect(SRV.namedAddressOf(worktree)).toBe("https://seo.localhost:4747")
      expect(SRV.namedAddressOf(worktree, { secure: false, editor: true })).toBe("http://seo--app.localhost:4747")
      // its process gone
      writeFileSync(join(root, ".spell-server.json"), JSON.stringify({ ...record, pid: 999_999_999 }))
      expect(SRV.namedAddressOf(worktree)).toBeUndefined()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
