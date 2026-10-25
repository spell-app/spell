import { E } from "spell-ui/core"

/****************
 * ### `DOMMediaElement`
 * The DOM element of `<ui-video>` and `<ui-audio>`:  a script API over the player inside, as the platform's
 * `<video>` / `<audio>` have.
 * - Above the components:  their `elementSetup` reads this class while they're defined.
 ****************/
export class DOMMediaElement extends E.DOMElement<MediaPlayer> {
  /** Play it;  the promise settles as the browser starts, or refuses (autoplay with sound, say). */
  play(): Promise<void> {
    return this.component?.play() ?? Promise.resolve()
  }

  /** Pause it. */
  pause() {
    this.component?.pause()
  }

  /** Where it is, in seconds;  set it to jump there. */
  get currentTime(): number {
    return this.component?.media?.currentTime ?? 0
  }

  set currentTime(seconds: number) {
    const media = this.component?.media
    if (media) media.currentTime = seconds
  }

  /** Is it paused (or not started)? */
  get paused(): boolean {
    return this.component?.media?.paused ?? true
  }
}

/****************
 * ### `MediaPlayer`
 * The base of `<ui-video>` and `<ui-audio>`'s components:  the browser's own player in the shadow root.
 *
 * - The native element is the component's `media`, set by its `ref`.
 * - Its `play`, `pause` and `ended` events become `ui-play`, `ui-pause` and `ui-ended`,
 *   with where it was (`currentTime`).
 * - `play()` / `pause()` call through;  the DOM element offers them (`DOMMediaElement`).
 * - Autoplay is the browser's to allow:  only `muted`, or after the reader has clicked on the page.  No workaround.
 ****************/
export abstract class MediaPlayer<V extends E.ComponentVocabulary = E.ComponentVocabulary> extends E.UIComponent<V> {
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    DOMElement: DOMMediaElement,
    delegatesFocus: true
  }

  /** The `<video>` / `<audio>`, once drawn. */
  media: HTMLMediaElement | undefined

  /** Play it;  a refusal (autoplay with sound) rejects, as the platform's does. */
  play(): Promise<void> {
    return this.media?.play() ?? Promise.resolve()
  }

  /** Pause it. */
  pause() {
    this.media?.pause()
  }

  /** Keep the native element, and send its `play` / `pause` / `ended` as `ui-*` events. */
  protected adopt(media: HTMLMediaElement) {
    this.media = media
    for (const [native, event] of PLAYER_EVENTS) {
      media.addEventListener(native, () => this.send(event as never, { currentTime: media.currentTime } as never))
    }
  }
}

/** The native player's events, and what each is sent as. */
const PLAYER_EVENTS = [
  ["play", "ui-play"],
  ["pause", "ui-pause"],
  ["ended", "ui-ended"]
] as const
