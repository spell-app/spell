import { mkdtempSync, rmSync } from "node:fs"
import type { IncomingMessage } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PassThrough } from "node:stream"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"

describe("textFrame()", () => {
  test("puts the length in 1, 2 or 8 bytes, by size", () => {
    expect([...SRV.textFrame("hi").subarray(0, 2)]).toEqual([0x81, 2])
    expect([...SRV.textFrame("x".repeat(300)).subarray(0, 4)]).toEqual([0x81, 126, 1, 44])
    const big = SRV.textFrame("x".repeat(70_000))
    expect(big[1]).toBe(127)
    expect(big.readBigUInt64BE(2)).toBe(70_000n)
    expect(big.length).toBe(10 + 70_000)
  })
})

// The live-reload socket, end to end:  a real `WebServer`, and node's own `WebSocket` as the page
describe("LiveReload.events", () => {
  const root = mkdtempSync(join(tmpdir(), "srv-socket-"))
  let server: SRV.WebServer

  beforeAll(async () => {
    server = new SRV.WebServer({ live: true, mounts: [{ prefix: "/", dir: root }] })
    await server.listen()
  })

  afterAll(async () => {
    await server.close()
    rmSync(root, { recursive: true, force: true })
  })

  test("says hello (the server's run), then hands every open page each message, short or long", async () => {
    const pages = await Promise.all([open(server.port), open(server.port)])
    const long = "/" + "x".repeat(70_000)
    server.live!.send("change", { path: "/a.html" })
    server.live!.send("change", { path: long })
    for (const page of pages) {
      await vi.waitFor(() => expect(page.messages).toHaveLength(3))
      expect(page.messages).toEqual([
        { event: "hello", data: { run: server.live!.run } },
        { event: "change", data: { path: "/a.html" } },
        { event: "change", data: { path: long } }
      ])
      page.socket.close()
    }
  })

  // the bug it fixes:  6 event streams took all of Chrome's connections to a host
  test("keeps MORE than 6 pages connected at once", async () => {
    const pages = await Promise.all(Array.from({ length: 8 }, () => open(server.port)))
    expect(server.live!.clientCount).toBe(8)
    for (const page of pages) page.socket.close()
  })

  test("a page closing its socket leaves the clients", async () => {
    // the tests before close theirs without waiting
    await vi.waitFor(() => expect(server.live!.clientCount).toBe(0))
    const page = await open(server.port)
    expect(server.live!.clientCount).toBe(1)
    const closed = new Promise((done) => page.socket.addEventListener("close", done))
    page.socket.close()
    await closed
    await vi.waitFor(() => expect(server.live!.clientCount).toBe(0))
  })
})

/** A page's live-reload socket on `port`, open, and every message it has had. */
async function open(port: number): Promise<{ socket: WebSocket; messages: unknown[] }> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${SRV.LIVE_EVENTS}`)
  const messages: unknown[] = []
  socket.addEventListener("message", (message: MessageEvent<string>) => messages.push(JSON.parse(message.data)))
  await new Promise((done, fail) => {
    socket.addEventListener("open", done)
    socket.addEventListener("error", fail)
  })
  return { socket, messages }
}

// What a page says:  masked, as a browser's frames are;  whole, or in pieces
describe("acceptWebSocket()'s `onText`", () => {
  /** A socket accepted with an `onText`, and what it heard and wrote. */
  function accepted() {
    const socket = new PassThrough()
    const heard: string[] = []
    const written: Buffer[] = []
    const raw = { headers: { "sec-websocket-key": "k", upgrade: "websocket" } } as unknown as IncomingMessage
    socket.write = ((chunk: Buffer) => (written.push(Buffer.from(chunk)), true)) as typeof socket.write
    expect(SRV.acceptWebSocket(raw, socket, { onText: (text) => heard.push(text) })).toBe(true)
    return { socket, heard, written }
  }

  /** A frame as a page sends it. */
  function pageFrame(text: string, { opcode = 1, isFinal = true } = {}): Buffer {
    const payload = Buffer.from(text)
    const mask = Buffer.from([1, 2, 3, 4])
    const masked = payload.map((byte, at) => byte ^ mask[at % 4]!)
    const first = (isFinal ? 0x80 : 0) | opcode
    const head =
      payload.length < 126
        ? Buffer.from([first, 0x80 | payload.length])
        : Buffer.from([first, 0x80 | 126, payload.length >> 8, payload.length & 0xff])
    return Buffer.concat([head, mask, masked])
  }

  test("takes a frame's mask off", () => {
    const { socket, heard } = accepted()
    socket.emit("data", pageFrame("héllo"))
    expect(heard).toEqual(["héllo"])
  })

  test("reads a frame split over chunks, and several in one, long and short", () => {
    const { socket, heard } = accepted()
    const long = "x".repeat(5000)
    const frames = Buffer.concat([pageFrame("one"), pageFrame(long), pageFrame("three")])
    for (let at = 0; at < frames.length; at += 1000) socket.emit("data", frames.subarray(at, at + 1000))
    expect(heard).toEqual(["one", long, "three"])
  })

  test("joins a message that came in pieces", () => {
    const { socket, heard } = accepted()
    socket.emit("data", pageFrame("wh", { isFinal: false }))
    socket.emit("data", pageFrame("ole", { opcode: 0 }))
    expect(heard).toEqual(["whole"])
  })

  test("answers a ping, and a close;  a listener that throws doesn't end it", () => {
    const { socket, written } = accepted()
    socket.emit("data", pageFrame("hi", { opcode: 9 }))
    expect(written.at(-1)!.subarray(0, 2)).toEqual(Buffer.from([0x8a, 2]))
    expect(written.at(-1)!.subarray(2).toString()).toBe("hi")
    const ended = vi.spyOn(socket, "end")
    socket.emit("data", pageFrame("", { opcode: 8 }))
    expect(ended).toHaveBeenCalled()
  })

  test("a message past the limit closes the socket, as too big", () => {
    const { socket } = accepted()
    const ended = vi.spyOn(socket, "end")
    const head = Buffer.alloc(14)
    head[0] = 0x81
    head[1] = 0x80 | 127
    head.writeBigUInt64BE(BigInt(20 * 1024 * 1024), 2)
    socket.emit("data", head)
    expect(ended.mock.calls[0]![0]).toEqual(Buffer.from([0x88, 2, 1009 >> 8, 1009 & 0xff]))
  })

  test("with no `onText`, what a page sends goes nowhere:  live reload's sockets", () => {
    const socket = new PassThrough()
    const raw = { headers: { "sec-websocket-key": "k", upgrade: "websocket" } } as unknown as IncomingMessage
    expect(SRV.acceptWebSocket(raw, socket)).toBe(true)
    expect(() => socket.emit("data", pageFrame("nobody hears this"))).not.toThrow()
  })
})
