import { describe, test, expect, afterEach, vi } from "vite-plus/test"

import { core } from "spell/parser/core"

/** A stand-in for the browser's `Audio`:  what each player was told. */
class FakeAudio {
  static made: FakeAudio[] = []
  preload = ""
  src = ""
  currentTime = 0
  paused = true
  plays = 0
  refuse?: Error
  constructor() {
    FakeAudio.made.push(this)
  }
  play(): Promise<void> {
    this.plays++
    this.paused = false
    return this.refuse ? Promise.reject(this.refuse) : Promise.resolve()
  }
  pause(): void {
    this.paused = true
  }
}

afterEach(() => {
  FakeAudio.made = []
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("core.play() / core.stop():  `play its sound`, `stop its sound` (epic `data` T145)", () => {
  test("play makes ONE player per sound file, loading at once, and plays it in the same moment", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.play("https://example.com/one.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    const [player] = FakeAudio.made
    expect(player).toMatchObject({ src: "https://example.com/one.ogg", preload: "auto", plays: 1, paused: false })
    core.play("https://example.com/one.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    expect(player!.plays).toBe(2)
  })

  test("playing it again starts it over", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.play("https://example.com/two.ogg")
    const [player] = FakeAudio.made
    player!.currentTime = 1.5
    core.play("https://example.com/two.ogg")
    expect(player!.currentTime).toBe(0)
  })

  test("stop pauses it and puts it back to its start;  a sound never played gets its player, loading", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.stop("https://example.com/three.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    const [player] = FakeAudio.made
    expect(player).toMatchObject({ preload: "auto", plays: 0, paused: true })
    core.play("https://example.com/three.ogg")
    player!.currentTime = 0.7
    core.stop("https://example.com/three.ogg")
    expect(player).toMatchObject({ paused: true, currentTime: 0, plays: 1 })
    expect(FakeAudio.made).toHaveLength(1)
  })

  test("no address, or no Audio (node):  nothing, and no throw", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.play(undefined)
    core.stop("")
    expect(FakeAudio.made).toHaveLength(0)
    vi.stubGlobal("Audio", undefined)
    expect(() => core.play("https://example.com/four.ogg")).not.toThrow()
  })

  test("a play the browser refuses is said on the program's console;  one `stop` cut short isn't", async () => {
    vi.stubGlobal("Audio", FakeAudio)
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    core.stop("https://example.com/five.ogg")
    FakeAudio.made[0]!.refuse = Object.assign(new Error("no"), { name: "NotAllowedError" })
    core.play("https://example.com/five.ogg")
    core.stop("https://example.com/six.ogg")
    FakeAudio.made[1]!.refuse = Object.assign(new Error("stopped"), { name: "AbortError" })
    core.play("https://example.com/six.ogg")
    await Promise.resolve()
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("five.ogg")
  })
})
