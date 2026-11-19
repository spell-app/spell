/**
 * Sounds and videos (epic `data` T145;  named, played many ways, and heard, epic `language` P65).
 *
 * ```ts
 * static { this.declareProp("cardSlide", { init: () => core.media("sound", "sounds/slide.mp3", "card slide"), early: true }) }
 * core.play(core.mediaNamed("card slide", "sound"), { speed: 1.5, from: 30 })   // `play sound "card slide" at 1.5x from 0:30`
 * await core.play("intro", { where: "window" })                                // `play "intro" in a new window and wait`
 * ```
 *
 * - ONE player per sound or video:  a named one's (`core.media()`), or a file's, by its address.
 *   - Made the first time anything names it, it starts loading at once (`preload="auto"`),
 *     so a program that `load`s a sound as its page opens has it ready for the click that plays it.
 *   - A sound's player is the browser's `Audio`;  a video's, a `<video>` with its controls.
 * - A NAME is a page's or an app's property (`sound "card slide" is at "..."`, `<video "intro" source="..." />`):
 *   its player is made with the page, and found by its name from anywhere while it's there (`core.mediaNamed()`).
 *   - `play "card slide"` alone looks for a name first, then plays the file at that address.
 * - Where a video plays (epic `language` J280):  where the page draws it (`core.drawMedia()`), if it does;
 *   else in a new window, a see-through framed modal on a desktop, full screen on a phone.
 *   `in a new window` always opens one;  `full screen` plays it full screen everywhere.
 * - A named one SENDS EVENTS as it plays, so a program can build its own player:
 *   `<name>-<sound|video>-starts`, `-pauses`, `-ends` (`when the "intro" video ends`), to everyone:  the app and
 *   each page by its own handler, then the program's own `on ...` listeners (`trigger()`).
 * - Under node, or a page with no `Audio` / `document`:  nothing at all, and nothing throws.
 * - The browser's own players are below everything else here:  this module never imports Spell UI, and draws its
 *   window from Spell UI's `ui-modal` by its tag.
 */
import { currentPlatform } from "spell/util/platform"

import { core } from "./core"
import { defineCoreModule } from "./core.types"
import { trigger } from "./runtime"

/** What a program plays:  a sound or a video, each the same word everywhere (`movie` is a video). */
export type MediaKind = "sound" | "video"

/** What `play` takes after what it plays, each optional -- see `core.play()`. */
export type PlayOptions = {
  /** `at 1.5x`, `at half speed`:  its speed, 1 normal */
  speed?: number
  /** `from 0:30`:  where to start, in seconds;  from its start if not said */
  from?: number
  /** `at 50% volume`, `quietly`:  its volume, from 0 to 1 */
  volume?: number
  /** `muted`:  with no sound */
  muted?: boolean
  /** `over and over`, `looping`:  starting again each time it ends, until stopped */
  loop?: boolean
  /** `in a new window`, `full screen`:  where a video plays;  where it's drawn, else a window, if not said */
  where?: MediaPlace
}

/** Where a video plays, when the program says:  `in a new window`, `full screen`. */
export type MediaPlace = "window" | "full screen"

/** A player:  the part of the browser's `HTMLMediaElement` used here, so a test's stand-in works too. */
type Player = {
  src: string
  preload: string
  currentTime: number
  paused: boolean
  ended?: boolean
  duration?: number
  playbackRate?: number
  volume?: number
  muted?: boolean
  loop?: boolean
  controls?: boolean
  isConnected?: boolean
  play(): Promise<void>
  pause(): void
  addEventListener?(type: string, listener: () => void): void
  requestFullscreen?(): Promise<void>
}

/**
 * A sound or a video the program can play:  its kind, its file's address, its name if it has one, and its player.
 * - What a page's or an app's named property holds, `its card slide`.
 * - Made by `core.media()` (named) or by its address (`play "cry.ogg"`);  plain data plus its one player.
 */
export class SpellMedia {
  /** a sound, or a video */
  readonly kind: MediaKind
  /** its file's address */
  readonly source: string
  /** its name as written, `card slide`;  none for one played by its address */
  readonly name: string | undefined
  /** its player, once made (`player`) */
  private made: Player | undefined
  /** what waits for it to end (`play ... and wait`):  each told once it ends, or is stopped */
  private waiting: Array<() => void> = []
  /** the window it's playing in, if it's in one (`openWindow()`) */
  window: { close(): void } | undefined

  constructor(kind: MediaKind, source: string, name?: string) {
    this.kind = kind
    this.source = source
    this.name = name
  }

  /**
   * Its player, made the first time it's asked for, and loading from then on.
   * - `undefined` under node, or a page with no `Audio` (a sound) or `document` (a video).
   */
  get player(): Player | undefined {
    if (this.made) return this.made
    const player = this.kind === "video" ? newVideoPlayer() : newSoundPlayer()
    if (!player) return undefined
    player.preload = "auto"
    player.src = this.source
    this.made = player
    this.hear(player)
    return player
  }

  /** SIDE EFFECT:  wait until it ends or is stopped (`play ... and wait`). */
  untilDone(): Promise<void> {
    return new Promise((resolve) => this.waiting.push(resolve))
  }

  /** SIDE EFFECT:  it's ended, or been stopped:  everything waiting for it goes on. */
  finished(): void {
    const waiting = this.waiting
    this.waiting = []
    for (const resolve of waiting) resolve()
  }

  /** The event it sends for `happened` (`ends`, `starts`, `pauses`):  `card-slide-sound-ends`. */
  eventFor(happened: MediaEvent): string | undefined {
    if (!this.name) return undefined
    return mediaEventName(this.name, this.kind, happened)
  }

  /**
   * SIDE EFFECT:  hears its player, to tell what waits for it, close its window, and send its events.
   * - A stand-in player with no `addEventListener` (a test's):  nothing heard.
   */
  private hear(player: Player): void {
    if (!player.addEventListener) return
    player.addEventListener("ended", () => {
      if (player.loop) return
      this.window?.close()
      this.finished()
      this.tell("ends")
    })
    player.addEventListener("play", () => this.tell("starts"))
    // the browser pauses a player as it ends, just before `ended`:  that's no pause of the program's
    player.addEventListener("pause", () => {
      if (!player.ended) this.tell("pauses")
    })
  }

  /** SIDE EFFECT:  sends its event for `happened`, if it has a name -- see the module's docs.  NEVER throws. */
  private tell(happened: MediaEvent): void {
    const type = this.eventFor(happened)
    if (!type) return
    try {
      trigger(type, { [this.kind]: this, name: this.name })
    } catch (error) {
      core.console.warn(`${type}:  a handler failed`, error)
    }
  }
}

/** What a sound or video sends as it plays:  see `SpellMedia.eventFor()`. */
export type MediaEvent = "starts" | "pauses" | "ends"

/**
 * The event a sound or video named `name` sends for `happened`, its name's words dashed:
 * `mediaEventName("card slide", "sound", "ends")` => `card-slide-sound-ends`.
 * - What compiled spell's `when the "card slide" sound ends` hears, by the same words in every language.
 */
export function mediaEventName(name: string, kind: MediaKind, happened: MediaEvent): string {
  return `${keyOf(name).replaceAll(" ", "-")}-${kind}-${happened}`
}

/**
 * Assembled `core` methods for sounds and videos:  see the module's docs.
 * - What `play`, `stop`, `pause`, `resume`, `stop all sounds`, `load` and their questions compile to.
 */
export const mediaMethods = defineCoreModule({
  /**
   * A sound or video named `name`, its file at `source`:  what a page's or app's named property starts as
   * (`sound "card slide" is at "sounds/slide.mp3"`, `<video "intro" source="..." />`).
   * - Found from then on by its name (`core.mediaNamed()`), and by `play "card slide"`.
   * - The same one again for the same kind, name and address:  a page shown again plays the same player.
   * - Its player is made now, so it loads at once.
   */
  media(kind: MediaKind, source: string, name?: string): SpellMedia {
    const key = name ? namedKey(kind, name) : undefined
    const found = key ? NAMED.get(key) : undefined
    if (found && found.source === source) return found
    const media = new SpellMedia(kind, `${source ?? ""}`, name)
    if (key) NAMED.set(key, media)
    void media.player
    return media
  },

  /**
   * The sound or video named `name`, of `kind` if it says:  what `sound "card slide"` and `the "intro" video` compile
   * to.
   * - Any case and spacing:  `Card Slide`, `card-slide`.
   * - No kind:  a sound first, then a video.
   * - `undefined` when nothing has that name.
   */
  mediaNamed(name: string, kind?: MediaKind): SpellMedia | undefined {
    if (!name) return undefined
    if (kind) return NAMED.get(namedKey(kind, name))
    return NAMED.get(namedKey("sound", name)) ?? NAMED.get(namedKey("video", name))
  },

  /**
   * Play `target`, from its start, or from `options.from`:  what `play sound "card slide"`, `play its sound` and
   * `play "cry.ogg"` compile to.
   * - `target`:  a sound or a video (a named property, `core.mediaNamed()`), or text:  a name first, then a file's
   *   address (a video by its ending, `.mp4`, `.webm` ...;  else a sound).
   * - Started right here, in the same moment:  so in a click's action, a browser that wants sound to start from a
   *   click (Safari, phones) lets it.
   * - Playing it again while it plays starts it over.
   * - Its speed, volume, muting and looping are what `options` say, else normal:  each play says them afresh.
   * - A video plays where the page draws it, else in a new window;  `options.where` says so outright.
   * - The promise ends once it ends, or is stopped:  `play ... and wait` awaits it.  It never fails.
   * - Nothing to play:  nothing, and the promise ends at once.
   * - NEVER throws:  a sound the browser refuses, or can't load, is said on the program's console.
   */
  play(target: MediaTarget, options: PlayOptions = {}): Promise<void> {
    const media = mediaFor(target)
    const player = media?.player
    if (!media || !player) return Promise.resolve()
    const { speed = 1, from = 0, volume = 1, muted = false, loop = false, where } = options
    if (player.playbackRate !== undefined || speed !== 1) player.playbackRate = speed
    if (player.volume !== undefined || volume !== 1) player.volume = Math.min(1, Math.max(0, volume))
    if (player.muted !== undefined || muted) player.muted = muted
    if (player.loop !== undefined || loop) player.loop = loop
    player.currentTime = from
    if (media.kind === "video") placeVideo(media, player, where)
    const done = media.untilDone()
    player.play().catch((error: unknown) => {
      // `stop` while it was starting:  not a failure
      if ((error as Error | undefined)?.name === "AbortError") return
      core.console.warn(`play:  can't play ${describe(media)}`, error)
      media.finished()
    })
    return done
  },

  /**
   * Start loading `target` now, so a later `play` starts it at once:  what `load its sound` compiles to.
   * - A page that opens with `load its sound` has it ready for the click that plays it.
   * - Nothing to load, or loaded already:  nothing.
   */
  loadSound(target: MediaTarget): void {
    void mediaFor(target)?.player
  },

  /**
   * Stop `target`, if it's playing, and put it back to its start:  what `stop sound "card slide"` and
   * `stop its sound` compile to.
   * - Its window closes, and a `play ... and wait` for it goes on.
   * - Its player is made if it has none, so it loads now, as `loadSound()`.
   * - Nothing to stop:  nothing.
   */
  stop(target: MediaTarget): void {
    const media = mediaFor(target)
    if (media) stopMedia(media)
  },

  /**
   * Pause `target` where it is:  what `pause video "intro"` compiles to.
   * - `resume video "intro"` goes on from there.
   * - Nothing to pause, or not playing:  nothing.
   */
  pause(target: MediaTarget): void {
    mediaFor(target)?.player?.pause()
  },

  /**
   * Go on playing `target` from where it was paused:  what `resume video "intro"` compiles to.
   * - At its speed, volume and looping as they were.
   * - Nothing to resume, or playing already:  nothing.
   * - NEVER throws:  a play the browser refuses is said on the program's console.
   */
  resume(target: MediaTarget): void {
    const media = mediaFor(target)
    const player = media?.player
    if (!media || !player || !player.paused) return
    player.play().catch((error: unknown) => core.console.warn(`resume:  can't play ${describe(media)}`, error))
  },

  /**
   * Stop every sound, or every video, the program has played:  what `stop all sounds` and `stop all videos` compile
   * to.
   * - No kind:  every one of both.
   */
  stopAll(kind?: MediaKind): void {
    for (const media of everyMedia()) if (!kind || media.kind === kind) stopMedia(media)
  },

  /**
   * Is `target` playing now:  what `the "intro" video is playing` compiles to.
   * - Paused, stopped, ended or never played:  no.
   */
  isPlaying(target: MediaTarget): boolean {
    const player = mediaFor(target)?.player
    return !!player && !player.paused && !player.ended
  },

  /** Has `target` played to its end:  what `the "intro" video is done` compiles to.  Never played:  no. */
  isDone(target: MediaTarget): boolean {
    return !!mediaFor(target)?.player?.ended
  },

  /**
   * How long `target` is, in seconds:  what `the length of the "intro" video` compiles to, a duration.
   * - 0 until the browser knows:  its file has to load that far first.
   */
  mediaLength(target: MediaTarget): number {
    const duration = mediaFor(target)?.player?.duration
    return typeof duration === "number" && Number.isFinite(duration) ? duration : 0
  },

  /**
   * What a drawing draws for `target`:  what `<video "intro" />` compiles to.
   * - A video:  its player, with its controls, where the tag is;  `play video "intro"` plays it there.
   * - A sound:  nothing.
   * - Nothing by that name yet, or under node:  nothing.
   */
  drawMedia(target: MediaTarget): unknown {
    const media = mediaFor(target)
    if (media?.kind !== "video") return undefined
    return media.player
  }
})
Object.assign(core, mediaMethods)

/** What the play calls take:  a sound or a video, or text, a name or an address -- see `core.play()`. */
export type MediaTarget = SpellMedia | string | undefined | null

////////////////
// ## Finding one
////////////////

/** Each named sound and video, by kind and name (`namedKey()`). */
const NAMED = new Map<string, SpellMedia>()

/** Each one played by its file's address, by that address. */
const BY_ADDRESS = new Map<string, SpellMedia>()

/** A file's ending that makes it a video, played by its address. */
const VIDEO_FILE = /\.(mp4|m4v|webm|ogv|mov)(\?|#|$)/i

/** The sound or video `target` means, made if it's an address first played:  see `core.play()`. */
function mediaFor(target: MediaTarget): SpellMedia | undefined {
  if (!target) return undefined
  if (target instanceof SpellMedia) return target
  const named = core.mediaNamed(target)
  if (named) return named
  let media = BY_ADDRESS.get(target)
  if (!media) {
    media = new SpellMedia(VIDEO_FILE.test(target) ? "video" : "sound", target)
    BY_ADDRESS.set(target, media)
  }
  return media
}

/** Every sound and video made so far, named or by address. */
function everyMedia(): SpellMedia[] {
  return [...NAMED.values(), ...BY_ADDRESS.values()]
}

/** A name as it's found, any case or spacing:  `Card Slide`, `card-slide` => `card slide`. */
function keyOf(name: string): string {
  return `${name}`
    .trim()
    .replace(/[\s_-]+/g, " ")
    .toLowerCase()
}

/** Where a named one is kept:  `sound:card slide`. */
function namedKey(kind: MediaKind, name: string): string {
  return `${kind}:${keyOf(name)}`
}

/** `media` for a message:  `sound "card slide"`, or its address. */
function describe(media: SpellMedia): string {
  return media.name ? `${media.kind} "${media.name}"` : media.source
}

////////////////
// ## Players
////////////////

/** A new sound player, the browser's `Audio`:  `undefined` with none. */
function newSoundPlayer(): Player | undefined {
  if (typeof Audio === "undefined") return undefined
  return new Audio() as unknown as Player
}

/** A new video player, a `<video>` with its controls, framed:  `undefined` with no page. */
function newVideoPlayer(): Player | undefined {
  if (typeof document === "undefined") return undefined
  const video = document.createElement("video")
  video.controls = true
  video.playsInline = true
  video.style.maxWidth = "100%"
  return video as unknown as Player
}

/** SIDE EFFECT:  `media` stops and goes back to its start;  its window closes, and what waits for it goes on. */
function stopMedia(media: SpellMedia): void {
  const player = media.player
  if (player) {
    player.pause()
    player.currentTime = 0
  }
  media.window?.close()
  media.finished()
}

////////////////
// ## Where a video plays (epic `language` J280)
////////////////

/** Spell UI's modal, drawn by its tag:  the core sits below Spell UI. */
const MODAL_TAG = "ui-modal"

/** The events Spell UI's modal sends once it's closed, in each language it draws in. */
const MODAL_CLOSED = ["ui-closed", "es-cerrado"]

/**
 * SIDE EFFECT:  puts `media`'s player where it plays -- see the module's docs.
 * - `full screen`, or a phone with nowhere it's drawn:  full screen.
 * - `in a new window`, or nowhere it's drawn:  a new window.
 * - Drawn, and nothing said:  where it is.
 */
function placeVideo(media: SpellMedia, player: Player, where: MediaPlace | undefined): void {
  if (typeof document === "undefined") return
  const drawn = !!player.isConnected && !media.window
  if (where === "full screen") return fullScreen(media, player)
  if (drawn && !where) return
  if (currentPlatform() === "phone") return fullScreen(media, player)
  openWindow(media, player)
}

/**
 * SIDE EFFECT:  plays `player` full screen.
 * - Where it's drawn, if it is;  else in a new window first, which closes once it leaves full screen.
 * - A browser with no full screen:  the window.
 */
function fullScreen(media: SpellMedia, player: Player): void {
  if (!player.isConnected) openWindow(media, player)
  player.requestFullscreen?.().catch((error: unknown) => core.console.warn(`play:  can't go full screen`, error))
}

/**
 * SIDE EFFECT:  shows `player` in a new window:  a see-through modal, the video framed in it, its controls showing.
 * - Closing it (its ✕, Escape, the dimmer) stops the video;  the video ending closes it.
 * - Where it was drawn, if it was, it goes back there once the window closes.
 */
function openWindow(media: SpellMedia, player: Player): void {
  media.window?.close()
  const video = player as unknown as HTMLElement
  const home = video.parentNode ? { parent: video.parentNode, next: video.nextSibling } : undefined
  const modal = document.createElement(MODAL_TAG) as HTMLElement & { visible?: boolean }
  modal.setAttribute("transparent", "")
  const frame = document.createElement("div")
  Object.assign(frame.style, {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px"
  })
  Object.assign(video.style, {
    maxWidth: "90vw",
    maxHeight: "80vh",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
    background: "black"
  })
  frame.append(video)
  modal.append(frame)
  const root = (core as { appRoot?: Element }).appRoot ?? document.body
  root.append(modal)
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    media.window = undefined
    player.pause()
    Object.assign(video.style, { maxWidth: "100%", maxHeight: "", borderRadius: "", boxShadow: "", background: "" })
    if (home) home.parent.insertBefore(video, home.next)
    else video.remove()
    modal.remove()
    media.finished()
  }
  for (const name of MODAL_CLOSED) modal.addEventListener(name, close)
  media.window = { close }
  modal.visible = true
}
