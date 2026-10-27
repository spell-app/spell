import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { audioVocabulary } from "./UIAudio.en"
// Import directly to avoid circular import:  the base class
import { MediaPlayer } from "./MediaPlayer"

import videoCSS from "./UIVideo.css?inline"

/****************
 * ### `<ui-audio>`
 * The component behind `<ui-audio>`:  a sound file in the browser's own player (epic `ui-gaps` P11).
 *
 * - `<audio class="ui audio" part="audio">`.
 * - With `controls`, the browser's player shows;  without, nothing does (`:state(silent)`):
 *   a sound the page plays from script, a game's, `document.querySelector("ui-audio").play()`.
 * - Its name for a screen reader is the shared `label`.
 * - The script API, events and autoplay rule:  `MediaPlayer`.
 ****************/
export class UIAudio extends MediaPlayer<typeof audioVocabulary> {
  @E.proto static vocabulary = audioVocabulary
  @E.protoMerged static elementSetup = { styleSheets: { video: videoCSS } } satisfies Partial<E.ElementSetup>

  /** No `controls`:  nothing shows. */
  @E.cssState("silent")
  get isSilent(): boolean {
    return !this.controls
  }

  render(): JSX.Element {
    return (
      <audio
        ref={(audio: HTMLAudioElement) => this.adopt(audio)}
        class={this.rootClass}
        part={this.partForName("audio")}
        src={this.src}
        controls={this.controls}
        autoplay={this.autoplay}
        muted={this.muted}
        loop={this.loop}
        aria-label={this.sharedLabel}
      />
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIAudio extends E.AttributeValues<typeof audioVocabulary> {}
