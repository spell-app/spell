import { mkdtempSync, rmSync } from "node:fs"
import { createServer, type Server } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"

describe("PortBook:  the port each worktree's servers keep (epic `epic-engine` P82)", () => {
  let folder: string
  let book: SRV.PortBook

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "port-book-"))
    book = new SRV.PortBook(join(folder, "ports.json"))
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("the same port at every ask, for each checkout and server;  another for each other one", async () => {
    const page = await book.portFor("/w/seo")
    expect(page).toBeGreaterThanOrEqual(4900)
    expect(await book.portFor("/w/seo")).toBe(page)
    expect(await new SRV.PortBook(book.file).portFor("/w/seo")).toBe(page)
    const editor = await book.portFor("/w/seo", "editor")
    const other = await book.portFor("/w/data")
    expect(new Set([page, editor, other]).size).toBe(3)
    expect(book.portsOf("/w/seo")).toEqual({ "page server": page, editor })
  })

  it("a new one skips a port something listens on", async () => {
    const first = await new SRV.PortBook(join(folder, "probe.json")).portFor("/w/probe")
    const holder: Server = createServer()
    await new Promise<void>((done) => holder.listen(first, "127.0.0.1", done))
    try {
      expect(await book.portFor("/w/seo")).not.toBe(first)
    } finally {
      await new Promise((done) => holder.close(done))
    }
  })

  it("forget():  a removed worktree's ports go;  the others stay", async () => {
    await book.portFor("/w/seo")
    const kept = await book.portFor("/w/data")
    book.forget("/w/seo")
    expect(book.portsOf("/w/seo")).toEqual({})
    expect(book.portsOf("/w/data")).toEqual({ "page server": kept })
  })
})
