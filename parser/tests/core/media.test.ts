import { describe, test, expect, afterEach, onTestFinished, vi } from "vite-plus/test"
import { parseHTML } from "linkedom"

import { core } from "spell/parser/core"
import { mediaEventName } from "spell/parser/core/media"

/** A stand-in for the browser's `Audio`:  what each player was told. */
class FakeAudio {
  static made: FakeAudio[] = []
  preload = ""
  src = ""
  currentTime = 0
  paused = true
  plays = 0
  refuse?: Error
  ended = false
  duration = NaN
  playbackRate = 1
  volume = 1
  muted = false
  loop = false
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
  listeners: Record<string, Array<() => void>> = {}
  addEventListener(type: string, listener: () => void): void {
    ;(this.listeners[type] ??= []).push(listener)
  }
  /** What the browser does as it plays:  `play`, `pause`, `ended`. */
  fire(type: string): void {
    for (const listener of this.listeners[type] ?? []) listener()
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
    void core.play("https://example.com/one.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    const [player] = FakeAudio.made
    expect(player).toMatchObject({ src: "https://example.com/one.ogg", preload: "auto", plays: 1, paused: false })
    void core.play("https://example.com/one.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    expect(player!.plays).toBe(2)
  })

  test("playing it again starts it over", () => {
    vi.stubGlobal("Audio", FakeAudio)
    void core.play("https://example.com/two.ogg")
    const [player] = FakeAudio.made
    player!.currentTime = 1.5
    void core.play("https://example.com/two.ogg")
    expect(player!.currentTime).toBe(0)
  })

  test("stop pauses it and puts it back to its start;  a sound never played gets its player, loading", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.stop("https://example.com/three.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    const [player] = FakeAudio.made
    expect(player).toMatchObject({ preload: "auto", plays: 0, paused: true })
    void core.play("https://example.com/three.ogg")
    player!.currentTime = 0.7
    core.stop("https://example.com/three.ogg")
    expect(player).toMatchObject({ paused: true, currentTime: 0, plays: 1 })
    expect(FakeAudio.made).toHaveLength(1)
  })

  test("no address, or no Audio (node):  nothing, and no throw", () => {
    vi.stubGlobal("Audio", FakeAudio)
    void core.play(undefined)
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
    void core.play("https://example.com/five.ogg")
    core.stop("https://example.com/six.ogg")
    FakeAudio.made[1]!.refuse = Object.assign(new Error("stopped"), { name: "AbortError" })
    void core.play("https://example.com/six.ogg")
    await Promise.resolve()
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("five.ogg")
  })
})

describe("named sounds and videos (epic `language` P65)", () => {
  test("a name is found from anywhere, in any case or spacing;  the same name and address give the same one", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const slide = core.media("sound", "sounds/slide.mp3", "card slide")
    expect(FakeAudio.made).toHaveLength(1)
    expect(FakeAudio.made[0]).toMatchObject({ src: "sounds/slide.mp3", preload: "auto" })
    expect(core.mediaNamed("Card Slide", "sound")).toBe(slide)
    expect(core.mediaNamed("card-slide")).toBe(slide)
    expect(core.mediaNamed("card slide", "video")).toBeUndefined()
    expect(core.media("sound", "sounds/slide.mp3", "card slide")).toBe(slide)
    expect(FakeAudio.made).toHaveLength(1)
  })

  test('`play "card slide"` alone plays the name first, then a file at that address', () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.media("sound", "sounds/flip.mp3", "card flip")
    void core.play("card flip")
    expect(FakeAudio.made).toHaveLength(1)
    expect(FakeAudio.made[0]!.plays).toBe(1)
    void core.play("sounds/other.mp3")
    expect(FakeAudio.made).toHaveLength(2)
    expect(FakeAudio.made[1]).toMatchObject({ src: "sounds/other.mp3", plays: 1 })
  })

  test("speed, a start partway, volume, muted and looping are each play's own", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const music = core.media("sound", "music.mp3", "theme music")
    void core.play(music, { speed: 1.5, from: 30, volume: 0.5, muted: true, loop: true })
    expect(FakeAudio.made[0]).toMatchObject({
      playbackRate: 1.5,
      currentTime: 30,
      volume: 0.5,
      muted: true,
      loop: true
    })
    void core.play(music, { volume: 7 })
    expect(FakeAudio.made[0]).toMatchObject({ playbackRate: 1, currentTime: 0, volume: 1, muted: false, loop: false })
  })

  test("`and wait` ends once it ends, or is stopped;  a loop's end doesn't count", async () => {
    vi.stubGlobal("Audio", FakeAudio)
    const ding = core.media("sound", "ding.mp3", "ding")
    const player = FakeAudio.made[0]!
    let done = false
    void core.play(ding).then(() => (done = true))
    await Promise.resolve()
    expect(done).toBe(false)
    player.ended = true
    player.fire("ended")
    await Promise.resolve()
    expect(done).toBe(true)
    done = false
    void core.play(ding, { loop: true }).then(() => (done = true))
    player.fire("ended")
    await Promise.resolve()
    expect(done).toBe(false)
    core.stop("ding")
    await Promise.resolve()
    expect(done).toBe(true)
  })

  test("pause, resume, is playing, is done, its length", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const song = core.media("sound", "song.mp3", "song")
    const player = FakeAudio.made[0]!
    expect(core.isPlaying(song)).toBe(false)
    void core.play(song)
    expect(core.isPlaying("song")).toBe(true)
    player.currentTime = 12
    core.pause("song")
    expect(core.isPlaying("song")).toBe(false)
    core.resume("song")
    expect(player).toMatchObject({ currentTime: 12, paused: false, plays: 2 })
    expect(core.mediaLength(song)).toBe(0)
    player.duration = 95.5
    expect(core.mediaLength(song)).toBe(95.5)
    expect(core.isDone(song)).toBe(false)
    player.ended = true
    expect(core.isDone(song)).toBe(true)
  })

  test('stop all sounds stops every sound, named or by address;  videos only by `stopAll("video")`', () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.media("sound", "a.mp3", "sound a")
    void core.play("sound a")
    void core.play("b.mp3")
    expect(FakeAudio.made.every((player) => !player.paused)).toBe(true)
    core.stopAll("sound")
    expect(FakeAudio.made.every((player) => player.paused && player.currentTime === 0)).toBe(true)
  })

  test("a named one sends its events to the program:  starts, pauses, ends;  not the pause that comes with its end", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.resetRuntime()
    const heard: string[] = []
    for (const happened of ["starts", "pauses", "ends"] as const) {
      const type = mediaEventName("the bell", "sound", happened)
      core.RUNTIME!.on(type, (event: { name?: string }) => void heard.push(`${type} ${event.name}`))
    }
    core.media("sound", "bell.mp3", "The Bell")
    const player = FakeAudio.made[0]!
    player.fire("play")
    player.fire("pause")
    player.ended = true
    player.fire("pause")
    player.fire("ended")
    expect(heard).toEqual([
      "the-bell-sound-starts The Bell",
      "the-bell-sound-pauses The Bell",
      "the-bell-sound-ends The Bell"
    ])
  })
})

describe("where a video plays (epic `language` J280)", () => {
  /** A page whose videos play and pause, and record full screen. */
  function stubPage() {
    const { document } = parseHTML("<html><body></body></html>")
    const create = document.createElement.bind(document)
    const videos: Array<HTMLElement & { plays: number; fullScreens: number; paused: boolean }> = []
    document.createElement = ((tag: string) => {
      const element = create(tag)
      if (tag === "video") {
        Object.assign(element, {
          plays: 0,
          fullScreens: 0,
          paused: true,
          currentTime: 0,
          play() {
            this.plays++
            this.paused = false
            return Promise.resolve()
          },
          pause() {
            this.paused = true
          },
          requestFullscreen() {
            this.fullScreens++
            return Promise.resolve()
          }
        })
        videos.push(element as never)
      }
      return element
    }) as typeof document.createElement
    vi.stubGlobal("document", document)
    return { document, videos }
  }

  test("drawn by the page:  it plays there, with its controls", () => {
    const { document, videos } = stubPage()
    const intro = core.media("video", "intro.mp4", "intro drawn")
    const drawn = core.drawMedia("intro drawn") as HTMLElement
    expect(drawn).toBe(videos[0])
    expect(drawn.localName).toBe("video")
    expect((drawn as HTMLVideoElement).controls).toBe(true)
    document.body.append(drawn)
    void core.play(intro)
    expect(drawn.parentNode).toBe(document.body)
    expect(document.querySelector("ui-modal")).toBeNull()
  })

  test("drawn nowhere, or `in a new window`:  a see-through modal, which closing stops and puts it back", () => {
    const { document, videos } = stubPage()
    core.media("video", "outro.mp4", "outro")
    void core.play("outro")
    const modal = document.querySelector("ui-modal") as HTMLElement & { visible?: boolean }
    expect(modal.hasAttribute("transparent")).toBe(true)
    expect(modal.visible).toBe(true)
    expect(modal.querySelector("video")).toBe(videos[0])
    modal.dispatchEvent(new (document.defaultView as unknown as typeof globalThis).Event("ui-closed"))
    expect(document.querySelector("ui-modal")).toBeNull()
    expect(videos[0]!.paused).toBe(true)
    // drawn, but asked for a new window:  back where it was drawn once it closes
    const drawn = core.drawMedia("outro") as HTMLElement
    document.body.append(drawn)
    void core.play("outro", { where: "window" })
    expect(document.querySelector("ui-modal video")).toBe(drawn)
    core.stop("outro")
    expect(drawn.parentNode).toBe(document.body)
  })

  test("`full screen`:  full screen, in a window first when it's drawn nowhere", () => {
    const { document, videos } = stubPage()
    core.media("video", "trailer.mp4", "trailer")
    void core.play("trailer", { where: "full screen" })
    expect(videos[0]!.fullScreens).toBe(1)
    expect(document.querySelector("ui-modal video")).toBe(videos[0])
  })

  test("a sound draws nothing;  an address ending .mp4 is a video", () => {
    const { videos } = stubPage()
    vi.stubGlobal("Audio", FakeAudio)
    core.media("sound", "x.mp3", "quiet one")
    expect(core.drawMedia("quiet one")).toBeUndefined()
    void core.play("clips/cat.mp4")
    expect(videos).toHaveLength(1)
    expect(FakeAudio.made).toHaveLength(1)
  })
})

describe("Spell's built-in sounds, and tests (epic `mockup` P28)", () => {
  test("a built-in sound's name plays its file, as the page's Spell UI says where it is", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const key = Symbol.for("spell-ui:runtime")
    const sounds = { url: (name: string) => (name === "door knock" ? "https://example.com/door-knock.ogg" : undefined) }
    ;(globalThis as Record<symbol, unknown>)[key] = { sounds }
    onTestFinished(() => delete (globalThis as Record<symbol, unknown>)[key])
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    void core.play("door knock")
    expect(FakeAudio.made[0]).toMatchObject({ src: "https://example.com/door-knock.ogg" })
    void core.play("no such sound")
    expect(FakeAudio.made).toHaveLength(1)
    expect(String(warn.mock.calls[0]![0])).toContain("no sound called")
  })

  test("a built-in sound's name on a page without Spell UI:  said, and nothing plays", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    void core.play("win")
    expect(FakeAudio.made).toHaveLength(0)
    expect(String(warn.mock.calls[0]![0])).toContain("needs Spell UI")
  })

  test("a test plays no sounds:  a program's tests run as it loads, before anyone clicks", () => {
    vi.stubGlobal("Audio", FakeAudio)
    vi.spyOn(core.console, "groupCollapsed").mockImplementation(() => {})
    vi.spyOn(core.console, "groupEnd").mockImplementation(() => {})
    core.test("test counting", () => void core.play("https://example.com/click.ogg"))
    expect(FakeAudio.made).toHaveLength(0)
    void core.play("https://example.com/click.ogg")
    expect(FakeAudio.made).toHaveLength(1)
  })
})
