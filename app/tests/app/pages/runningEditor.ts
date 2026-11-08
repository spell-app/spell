import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { setTimeout as wait } from "node:timers/promises"

/**
 * How the editor's end-to-end tests find the running editor:  every test file here that opens it imports this.
 * - No record of an editor, as in CI:  `SERVING` is false, and the file skips itself.
 * - A record, and the editor answers:  `SERVING` is true.
 * - A record, but no answer for `ANSWER_MS`:  importing this THROWS, so the file fails and says why.
 *   - The editor is meant to be running, so skipping would look like a pass.
 *   - Start one with `spell server start all`.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
export const KIT = path.resolve(import.meta.dirname, "../../../..")

/** How long a just-started or busy editor gets to answer. */
const ANSWER_MS = 30_000

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does the editor at `address` answer within `ANSWER_MS`? */
async function isAnswering(address: string): Promise<boolean> {
  for (const stop = Date.now() + ANSWER_MS; Date.now() < stop; await wait(1000)) {
    try {
      if ((await fetch(address, { signal: AbortSignal.timeout(ANSWER_MS) })).ok) return true
    } catch (ignored) {
      // not up yet:  try again
    }
  }
  return false
}

/** The running editor's address;  `undefined`:  none noted. */
export const EDITOR = editorAddress()

if (EDITOR && !(await isAnswering(EDITOR))) {
  throw new Error(`runningEditor:  the editor noted at ${EDITOR} doesn't answer;  start it:  spell server start all`)
}

/** Is there an editor to test?  (`describe.skipIf(!SERVING)`) */
export const SERVING = !!EDITOR

/**
 * What git says of the built-in projects right now, the changes themselves too.
 * - Compare it before and after a test:  someone's uncommitted work there is not the test's doing.
 */
export function builtInProjectsNow(): string {
  return execSync("git status --short spaces && git diff spaces", {
    cwd: path.join(KIT, "app"),
    maxBuffer: 64 * 1024 * 1024
  }).toString()
}
