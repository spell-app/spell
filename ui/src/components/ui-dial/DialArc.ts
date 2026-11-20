import { E } from "spell/ui/core"

/****************
 * ### `DialArc`
 * The geometry of a dial's ring:  an open circle of 270°, its gap at the bottom, drawn clockwise from bottom left.
 * - Angles are in degrees, clockwise from 12 o'clock:  the ring runs `START` (-135°) ... `END` (135°).
 * - Lengths are in the dial's drawing units:  a 100 by 100 box, centred on `CENTRE`.
 * - Pure arithmetic (no DOM;  of the core, only `E.clamp()`), so it's tested on its own.
 * - The value maths (snapping, steps, keys) is `SliderScale`'s:  a dial is a slider's number line, bent round.
 * - STATIC and instance-free on purpose:  every dial has the same ring;  only its ratio differs.
 ****************/
export class DialArc {
  /** Where the ring starts (`min`):  bottom left. */
  static readonly START = -135

  /** How far round the ring runs. */
  static readonly SWEEP = 270

  /** Where the ring ends (`max`):  bottom right. */
  static readonly END = DialArc.START + DialArc.SWEEP

  /** The centre of the drawing, both ways. */
  static readonly CENTRE = 50

  /** The angle at `ratio` (`0` ... `1`) along the ring. */
  static angleAt(ratio: number): number {
    return DialArc.START + DialArc.SWEEP * E.clamp(ratio, 0, 1)
  }

  /** Where along the ring (`0` ... `1`) `angle` lies;  an angle in the gap goes to the nearer end. */
  static ratioAt(angle: number): number {
    return E.clamp((angle - DialArc.START) / DialArc.SWEEP, 0, 1)
  }

  /** The point at `ratio` along a circle of `radius` round the centre. */
  static pointAt(ratio: number, radius: number): { x: number; y: number } {
    const radians = (DialArc.angleAt(ratio) * Math.PI) / 180
    return {
      x: round(DialArc.CENTRE + radius * Math.sin(radians)),
      y: round(DialArc.CENTRE - radius * Math.cos(radians))
    }
  }

  /**
   * An SVG path along a circle of `radius`, from ratio `from` to `to`;  `""` when it would be empty.
   * - One arc command:  the ring is never a full circle, so its ends never meet.
   */
  static path(from: number, to: number, radius: number): string {
    if (to <= from) return ""
    const start = DialArc.pointAt(from, radius)
    const end = DialArc.pointAt(to, radius)
    const isLarge = (to - from) * DialArc.SWEEP > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${isLarge} 1 ${end.x} ${end.y}`
  }

  /** The angle of the point `dx`, `dy` from the centre, `-180` ... `180` (screen axes:  `dy` grows downward). */
  static angleOf(dx: number, dy: number): number {
    return (Math.atan2(dx, -dy) * 180) / Math.PI
  }

  /**
   * Follow a dragging pointer from `previous` to `angle` the short way round, winding on past the ring's ends:
   * so the value never jumps across the gap (`ratioAt()` holds a wound angle at the nearer end).
   * - A pointer dragged past `max`, on round the gap to the start, stays at `max` until it comes back.
   * - Held within half a turn past either end (`-360` ... `360`):  winding further loses no more than that,
   *   and the short way round from there still lands past the end, so it can't jump either.
   */
  static follow(previous: number, angle: number): number {
    let turn = (angle - previous) % 360
    if (turn > 180) turn -= 360
    if (turn < -180) turn += 360
    return E.clamp(previous + turn, -WOUND_LIMIT, WOUND_LIMIT)
  }
}

/** How far past 12 o'clock a dragged angle may wind, either way:  half a turn past either end of the gap. */
const WOUND_LIMIT = 360

/** `value` to 3 decimals:  short path data, the same on every browser. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
