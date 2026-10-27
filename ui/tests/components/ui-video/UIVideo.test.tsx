import { describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { DOMMediaElement } from "spell-ui/components/ui-video"

import "spell-ui/components/ui-video"

/** Render `html`;  the element and its native player. */
async function player(html: string) {
  const host = await ElementFixture.render<DOMElement & DOMMediaElement>(html)
  await ElementFixture.settle()
  return { host, media: host.shadowRoot!.querySelector<HTMLMediaElement>("video, audio")! }
}

describe("<ui-video>", () => {
  it("hands its attributes to the browser's player", async () => {
    const { media } = await player(
      `<ui-video src="clip.webm" poster="still.png" muted loop ratio="16/9" label="A clip"></ui-video>`
    )
    const video = media as HTMLVideoElement
    expect(video.localName).toBe("video")
    expect(new URL(video.src).pathname).toMatch(/clip\.webm$/)
    expect(new URL(video.poster).pathname).toMatch(/still\.png$/)
    expect([video.controls, video.muted, video.loop]).toEqual([true, true, true])
    expect(video.getAttribute("aria-label")).toBe("A clip")
    expect(getComputedStyle(video).aspectRatio).toBe("16 / 9")
  })

  it('`controls="false"` hides the browser\'s controls', async () => {
    const { media } = await player(`<ui-video src="clip.webm" controls="false"></ui-video>`)
    expect(media.controls).toBe(false)
  })

  it("draws `captions` as the video's captions track", async () => {
    const { media } = await player(`<ui-video src="clip.webm" captions="clip.vtt"></ui-video>`)
    const track = media.querySelector("track")!
    expect([track.kind, new URL(track.src).pathname.endsWith("clip.vtt")]).toEqual(["captions", true])
  })

  it("sends the player's play, pause and ended as ui-play, ui-pause and ui-ended", async () => {
    const { host, media } = await player(`<ui-video src="clip.webm"></ui-video>`)
    const seen: string[] = []
    for (const type of ["ui-play", "ui-pause", "ui-ended"]) host.addEventListener(type, () => seen.push(type))
    for (const type of ["play", "pause", "ended"]) media.dispatchEvent(new Event(type))
    expect(seen).toEqual(["ui-play", "ui-pause", "ui-ended"])
  })

  it("plays and pauses through the element's own play() and pause()", async () => {
    const { host, media } = await player(`<ui-video src="clip.webm"></ui-video>`)
    const play = vi.spyOn(media, "play").mockResolvedValue(undefined)
    const pause = vi.spyOn(media, "pause").mockImplementation(() => {})
    await host.play()
    host.pause()
    expect([play.mock.calls.length, pause.mock.calls.length]).toEqual([1, 1])
  })
})

describe("<ui-audio>", () => {
  it("draws nothing without `controls`:  a sound the page plays", async () => {
    const { host, media } = await player(`<ui-audio src="chime.wav"></ui-audio>`)
    expect(media.localName).toBe("audio")
    expect(host.matches(":state(silent)")).toBe(true)
    expect(host.getBoundingClientRect().height).toBe(0)
  })

  it("shows the browser's player with `controls`, and is accessible", async () => {
    const { host, media } = await player(`<ui-audio src="chime.wav" controls label="A chime"></ui-audio>`)
    expect(media.controls).toBe(true)
    expect(host.getBoundingClientRect().height).toBeGreaterThan(0)
    await expectAccessible(host)
  })
})
