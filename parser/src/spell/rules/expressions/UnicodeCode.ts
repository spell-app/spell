// Import directly to avoid circular import
import { HexDigits } from "./HexDigits"

/** Hex digits, the most a code point has:  6 (`10FFFF`). */
const MAX_CODE_DIGITS = 6

/** The last code point. */
const MAX_CODE_POINT = 0x10ffff

/**
 * `unicode_code` rule:  a code point written in hex, e.g. `1F0A0`, `2665`, `A0` (epic page `outline-spell`, P26).
 * - Read as `hex_digits` is:  its digits written together, and not a known variable.
 * - Up to `10FFFF`, the last code point.
 */
export class UnicodeCode extends HexDigits {
  /** A code point:  up to 6 digits, up to `10FFFF`. */
  accepts(value: number, digits: string): boolean {
    return digits.length <= MAX_CODE_DIGITS && value <= MAX_CODE_POINT
  }
}
