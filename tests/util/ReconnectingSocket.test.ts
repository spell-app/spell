import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ReconnectingSocket } from "spell/util/ReconnectingSocket"

/** A socket a test can open and close. */
class FakeSocket extends EventTarget {
  static made: FakeSocket[] = []
  readyState = 0
  sent: string[] = []
  constructor(readonly url: URL) {
    super()
    FakeSocket.made.push(this)
  }
  send(text: string) {
    this.sent.push(text)
  }
  close() {
    this.readyState = 3
    this.dispatchEvent(new Event("close"))
  }
  opens() {
    this.readyState = 1
    this.dispatchEvent(new Event("open"))
  }
  says(data: string) {
    this.dispatchEvent(new MessageEvent("message", { data }))
  }
}

describe("ReconnectingSocket", () => {
  beforeEach(() => {
    FakeSocket.made = []
    vi.useFakeTimers()
    vi.stubGlobal("WebSocket", FakeSocket)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test("reads a page's own address as a socket's", () => {
    new ReconnectingSocket("/api/server/live").close()
    expect(FakeSocket.made[0]!.url.protocol).toMatch(/^wss?:$/)
    expect(FakeSocket.made[0]!.url.pathname).toBe("/api/server/live")
    new ReconnectingSocket("https://example.com/x").close()
    expect(FakeSocket.made[1]!.url.href).toBe("wss://example.com/x")
  })

  test("hears what's said;  sends only while open, and says so", () => {
    const heard: string[] = []
    const socket = new ReconnectingSocket("/x", { onMessage: (text) => heard.push(text) })
    expect(socket.send("early")).toBe(false)
    FakeSocket.made[0]!.opens()
    expect(socket.send("now")).toBe(true)
    FakeSocket.made[0]!.says("hello")
    expect(FakeSocket.made[0]!.sent).toEqual(["now"])
    expect(heard).toEqual(["hello"])
    socket.close()
  })

  test("closed after opening, it comes back in a second;  a try that fails waits twice as long, up to 10s", () => {
    const opened = vi.fn()
    const closed = vi.fn()
    const socket = new ReconnectingSocket("/x", { onOpen: opened, onClose: closed })
    FakeSocket.made[0]!.opens()
    FakeSocket.made[0]!.close()
    expect(closed).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(999)
    expect(FakeSocket.made).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeSocket.made).toHaveLength(2)
    const waits = [2000, 4000, 8000, 10_000, 10_000]
    for (const wait of waits) {
      const made = FakeSocket.made.length
      FakeSocket.made.at(-1)!.close()
      vi.advanceTimersByTime(wait - 1)
      expect(FakeSocket.made).toHaveLength(made)
      vi.advanceTimersByTime(1)
      expect(FakeSocket.made).toHaveLength(made + 1)
    }
    expect(closed).toHaveBeenCalledOnce()
    FakeSocket.made.at(-1)!.opens()
    expect(opened).toHaveBeenCalledTimes(2)
    socket.close()
  })

  test("once told to close, no more tries", () => {
    const socket = new ReconnectingSocket("/x")
    FakeSocket.made[0]!.opens()
    socket.close()
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.made).toHaveLength(1)
    expect(socket.isOpen).toBe(false)
  })

  test("with no WebSocket, it does nothing, quietly", () => {
    vi.stubGlobal("WebSocket", undefined)
    const socket = new ReconnectingSocket("/x")
    expect(socket.isOpen).toBe(false)
    expect(socket.send("x")).toBe(false)
  })
})
