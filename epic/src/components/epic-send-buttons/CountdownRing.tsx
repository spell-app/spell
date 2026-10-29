import type { JSX } from "@solidjs/web"

/****************
 * ### `CountdownRing`
 * THE countdown ring of an epic page's buttons:  round a button's icon, a light track,
 * and over it how much of the wait has gone, its ends round, filling in clockwise from the top.
 * - Who draws it:
 *   - Send's Auto Send countdown (`<epic-send-buttons>`, epic `epic-engine` P53):  blue, over the wait Owen chose
 *   - Accept Overview / Accept Phases (`<epic-stage-button>`, I181):  green, over the 5 minutes a press waits
 * - Its look is `CountdownRing.css`, which each of them adds to its own style sheets;
 *   the element sets its colours and size:
 *   - `--_ring`:  its width and height;  `--_ring-tint`:  what has gone;  `--_ring-track`:  the whole wait
 * - A method, not a tag of its own:  it's drawn in the button's own shadow root, centred on the icon's box
 *   (`position: relative`), in the first frame.
 ****************/
export class CountdownRing {
  /**
   * The ring, for `fractionLeft()`:  `1` just started, `0` run out;  `part`:  its `part` name (the element's `ring`).
   * - the element redraws it each second (`fractionLeft()` reads its clock):  the CSS eases it over that second
   * - started again (a fuller `fractionLeft()`):  it unwinds back to empty, then hides (`empty`)
   */
  static draw(fractionLeft: () => number, part: string): JSX.Element {
    const done = () => (1 - fractionLeft()) * 100
    return (
      <svg class={RING} part={part} viewBox="0 0 28 28" aria-hidden="true">
        <circle class={TRACK} cx="14" cy="14" r="11.5" pathLength="100" />
        <circle
          class={[DONE, { [EMPTY]: done() < 0.5 }]}
          cx="14"
          cy="14"
          r="11.5"
          pathLength="100"
          // 5% past the circle's start, turned back 18deg so it still starts at the top:  Chrome cuts a round cap off where
          // it crosses a closed path's start point
          transform="rotate(-18 14 14)"
          style={{ "stroke-dasharray": `${done()} 100`, "stroke-dashoffset": "-5" }}
        />
      </svg>
    )
  }

  /** `ms` as minutes and seconds, rounded up, for a ring's tooltip:  `1:42`, `0:05`. */
  static timeLeft(ms: number): string {
    const seconds = Math.ceil(ms / 1000)
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  }
}

/** Classes of the ring's markup:  `CountdownRing.css`'s. */
const RING = "ring"
const TRACK = "track"
const DONE = "done"
const EMPTY = "empty"
