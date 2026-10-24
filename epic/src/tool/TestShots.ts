import { dirname, join } from "node:path"

import { SRV } from "spell/server"

import { InboxError } from "./ReviewInbox"

/****************
 * ### `TestShots`
 * Owen's SCREENSHOTS in a test run (epic `epic-engine` P4):  a failure pasted or dropped on the page, saved beside
 * the epic page for the issue it becomes.
 * - in the page's folder's `tests/` (`TEST_SHOTS`):  `epics/<epic>/tests/v3-20261019-1432.png`
 *   - beside the screenshots Claude takes for a test's Example (`tests/v3.png`, `epic add <epic>#V --example`)
 * - read by the review routes' `POST shot` (`reviewRoutes.ts`):  the mark then carries its path (`shot`)
 * - Light on purpose:  the review routes load it, and they never load the epic tool's doc code (`PlanDoc`).
 *   Imports only `spell/server` and `ReviewInbox`'s error.
 ****************/
export class TestShots {
  /**
   * `png`, a PNG data URL (`data:image/png;base64,...`, as a paste or drop gives it), as its bytes.
   * - throws an `InboxError` (the route's 400) for anything else, or bytes that aren't a PNG
   */
  static pngOf(png: unknown): Buffer {
    if (typeof png !== "string" || !png.startsWith(PNG_DATA_URL))
      throw new InboxError("a screenshot is a PNG data URL:  data:image/png;base64,...")
    const bytes = Buffer.from(png.slice(PNG_DATA_URL.length), "base64")
    if (!bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) throw new InboxError("that screenshot isn't a PNG")
    return bytes
  }

  /**
   * Save test `id`'s screenshot `bytes` beside epic page `file`, in its folder's `tests/`;
   * resolves to its path from that folder, `tests/v3-20261019-1432.png` (`-2` ... when one is there).
   * - from the epic page's folder, so the page's `<img src>` finds it, and so does a part's (parts load into the page)
   * - `now`:  the time it's stamped with, local, to the minute
   * - throws an `InboxError` for an id that isn't a test's
   * - SIDE EFFECT:  writes the file (and `tests/`), never over one
   */
  static async saveShot(file: string, id: string, bytes: Buffer, now = new Date()): Promise<string> {
    const key = id.toLowerCase()
    if (!TEST_ID.test(key)) throw new InboxError(`only a test takes a screenshot:  ${id}`)
    const stem = `${TEST_SHOTS}/${key}-${stampOf(now)}`
    for (let n = 1; ; n++) {
      const shot = n === 1 ? `${stem}.png` : `${stem}-${n}.png`
      try {
        await SRV.FileOperations.create(join(dirname(file), shot), { contents: bytes })
        return shot
      } catch (error) {
        if (!(error instanceof SRV.HttpError) || error.status !== 409 || n >= MAX_SAME_MINUTE) throw error
      }
    }
  }
}

/** The folder of an epic's test screenshots, beside its page:  `epics/<epic>/tests/`. */
export const TEST_SHOTS = "tests"

/** A test item's id. */
const TEST_ID = /^v\d+$/

/** A pasted PNG's data URL's start. */
const PNG_DATA_URL = "data:image/png;base64,"

/** Every PNG's first eight bytes. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** How many screenshots of one test one minute may hold:  a sanity bound for `saveShot()`'s `-2`, `-3` ... */
const MAX_SAME_MINUTE = 99

/** `date` as a screenshot's stamp, local time to the minute:  `20261019-1432`. */
function stampOf(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}`
  )
}
