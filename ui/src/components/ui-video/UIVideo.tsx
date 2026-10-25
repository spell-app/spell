import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { videoVocabulary } from "./UIVideo.en"
// Import directly to avoid circular import:  the base class
import { MediaPlayer } from "./MediaPlayer"

import videoCSS from "./UIVideo.css?inline"

/****************
 * ### `<ui-video>`
 * The component behind `<ui-video>`:  a video file in the browser's own player (epic `ui-gaps` P11).
 *
 * - `<video class="ui video" part="video">`, with the browser's controls unless `controls="false"`.
 * - `captions` is a WebVTT file, drawn as the video's `<track>` in the page's language.
 * - `ratio` is its shape (`16/9`);  by default the video's own.
 * - Its name for a screen reader is the shared `label`.
 * - The script API, events and autoplay rule:  `MediaPlayer`.
 ****************/
export class UIVideo extends MediaPlayer<typeof videoVocabulary> {
  @E.proto static vocabulary = videoVocabulary
  @E.protoMerged static elementSetup = { styleSheets: { video: videoCSS } } satisfies Partial<E.ElementSetup>

  /** `ratio` as CSS:  `16/9`, `4 / 3`, `1`;  `undefined` for the video's own. */
  get aspectRatio(): string | undefined {
    const ratio = this.ratio?.trim()
    return ratio && /^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/.test(ratio) ? ratio : undefined
  }

  /** The page's language, for the captions;  none on a server. */
  get pageLanguage(): string | undefined {
    return isServer ? undefined : document.documentElement.lang || undefined
  }

  render(): JSX.Element {
    return (
      <video
        ref={(video: HTMLVideoElement) => this.adopt(video)}
        class={this.rootClass}
        part={this.partForName("video")}
        src={this.src}
        poster={this.poster}
        controls={this.controls}
        autoplay={this.autoplay}
        muted={this.muted}
        loop={this.loop}
        playsinline
        aria-label={this.sharedLabel}
        style={this.aspectRatio ? { "aspect-ratio": this.aspectRatio } : undefined}
      >
        <Show when={this.captions}>
          <track
            kind="captions"
            src={this.captions}
            srclang={this.pageLanguage}
            label={this.isReady ? this.translationForKey("captions") : undefined}
            default
          />
        </Show>
      </video>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIVideo extends E.AttributeValues<typeof videoVocabulary> {}
