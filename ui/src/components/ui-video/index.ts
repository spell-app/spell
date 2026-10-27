/**
 * The video family:  defines `<ui-video>` and `<ui-audio>`, and exports their components, `UIVideo` and `UIAudio`,
 * and their DOM element class, `DOMMediaElement`.
 * - SIDE EFFECT:  importing it defines the tags.
 * - Also the library's `spell/ui/ui-video` entry (its size is in `notes/report.md`).
 * - NOTE: `MediaPlayer` (the two's base) is internal.
 */

import { UIVideo } from "./UIVideo"
import { UIAudio } from "./UIAudio"
import { DOMMediaElement } from "./MediaPlayer"

UIVideo.define()
UIAudio.define()

export { UIVideo, UIAudio, DOMMediaElement }
