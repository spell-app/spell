import { createHash } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"

import { Heartbeat } from "spell/server/Heartbeat"
import { RealPath } from "spell/server/RealPath"
import { EpicHome } from "spell/epic/config/EpicHome.ts"
import { DataFile } from "spell/epic/data/DataFile.ts"

/****************
 * ### `AskListeners`
 * Who is WAITING for a details page's answer (epic `epic-engine` r6):  a session's `epic ask wait` (or
 * `ask show --wait`), which the page's `<epic-send>` names, "repo-split is listening".
 * - Why:  `ask wait` watches the answer file, never the review inbox, so the page could only ask the inbox's
 *   heartbeat (`epic inbox wait`'s), and said "nobody is listening" while a session waited on it (request r6).
 * - A HEARTBEAT per page, the kit's `Heartbeat`, as the review inbox's `listening.seen` (`ReviewInbox`):
 *   - `hold()`, by `ask wait`:  stamped at the start and every 30s, removed as the wait ends
 *     (an answer, the timeout, a signal)
 *   - `liveFor()`, by the details route module (`detailsRoutes.ts`):  `null` once 90s without a beat, or its
 *     process is gone (`Heartbeat.isLive()`), so a wait killed outright never leaves the page claiming it's there
 * - Kept in spell-epic's home folder (`~/.spell-epic/asks/`, `SPELL_EPIC_HOME` for tests and the demo server), one
 *   file per page, named by a hash of its real path:
 *   - NOT beside the page:  the epic folder is a git repo committed after every turn, and a file rewritten every
 *     30s there would be a commit each time
 *   - one machine:  the wait and the page server that serves the page are on it
 * - node only;  plain `node` loads it (`details.js`, under tsx without the tsconfig's paths):  relative imports only
 ****************/
export class AskListeners {
  /** The heartbeat file of details page `page` (its file):  `<home>/asks/<hash of its real path>.json5`. */
  static fileFor(page: string): string {
    const key = createHash("sha1").update(RealPath.of(page)).digest("hex").slice(0, 16)
    return join(EpicHome.subfolder(ASKS_FOLDER), `${key}${DataFile.SUFFIX}`)
  }

  /**
   * Stamp `page`'s heartbeat:  this process waits for its answer, `since` (ISO) and seen `at` now.
   * - SIDE EFFECT:  writes the heartbeat file (its folder made if missing)
   */
  static stamp(page: string, { since, at = new Date().toISOString() }: { since?: string; at?: string } = {}) {
    const file = AskListeners.fileFor(page)
    mkdirSync(dirname(file), { recursive: true })
    const listener: AskListener = { page: RealPath.of(page), pid: process.pid, since: since ?? at, seen: at }
    DataFile.write(file, listener)
    return listener
  }

  /**
   * This process stopped waiting on `page`:  its heartbeat goes, unless another wait has stamped it since.
   * - SIDE EFFECT:  removes the heartbeat file
   */
  static stop(page: string) {
    const file = AskListeners.fileFor(page)
    const listener = Heartbeat.read<AskListener>(file)
    if (listener && listener.pid !== process.pid) return
    DataFile.remove(file)
  }

  /**
   * The wait on `page`, alive at `now` (ms);  `null` for none:  no heartbeat, or a dead one (`Heartbeat.isLive()`:
   * 90s without a beat, or its process gone).
   */
  static liveFor(page: string, now = Date.now()): AskListener | null {
    return Heartbeat.liveIn<AskListener>(AskListeners.fileFor(page), now) ?? null
  }

  /**
   * Hold `page`'s heartbeat while this process waits on it:  stamped now and every 30s, removed by the undo, or as the
   * process ends (`Heartbeat.keep()`:  exit, `SIGINT`, `SIGTERM`, `SIGHUP`, a background task stopped).
   * - SIDE EFFECT:  a timer (unref'd:  it never keeps the process alive) and signal handlers, until undone
   */
  static hold(page: string): () => void {
    let since: string | undefined
    return Heartbeat.keep(
      () => (since = AskListeners.stamp(page, { since }).since),
      () => AskListeners.stop(page)
    )
  }
}

/**
 * A wait on a details page's answer, as its heartbeat file holds it.
 * - `page`:  the page's real path;  `pid`:  the waiting process;  `since`, `seen`:  ISO, when it started, its last
 *   heartbeat
 */
export type AskListener = { page: string; pid: number; since: string; seen: string }

/** The heartbeats' folder, in spell-epic's home folder. */
const ASKS_FOLDER = "asks"
