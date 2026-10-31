import { join } from "node:path"

import { DataFile } from "spell/epic/data/DataFile.ts"
import { AskListeners } from "./AskListeners.ts"

/****************
 * ### `DetailsPages`
 * Which details and choice pages are still WAITING for Owen's answer, and an epic's list of them, as the side bar's
 * Details tab shows it (epic `epic-engine` P59).
 * - A page waits while either holds:
 *   - it has no answer for its round now (`answerOf()`):  never sent, or a new round asked since
 *   - a session waits on it (`epic ask wait`, `epic choices show --wait`:  a live heartbeat, `AskListeners`)
 * - Why it matters:  the Details tab never replaces a page that waits;  the new page waits its turn (`DocView`).
 * - node only;  plain `node` loads it (`details.js`):  its imports by file, with their `.ts`
 ****************/
export class DetailsPages {
  /**
   * The answer sent for `page`'s round now (`<slug>.answer.json5` beside it, or its old `.json`);  `undefined` for none.
   * - a file holding only the earlier rounds' (`rounds`, `epic ask round`) is no answer yet
   */
  static answerOf(page: string): Record<string, unknown> | undefined {
    const answer = DataFile.read(DataFile.besidePage(page, "answer"))
    return DetailsPages.isAnswer(answer) ? answer : undefined
  }

  /** Is answer file data `data` an answer:  anything but the earlier rounds alone (`rounds`, `epic ask round`)? */
  static isAnswer(data: unknown): data is Record<string, unknown> {
    return !!data && typeof data === "object" && Object.keys(data).some((key) => key !== "rounds")
  }

  /**
   * Whether `page` (a details or choice page's file) still waits for Owen's answer:  see the class.
   * - NEVER throws:  a page that won't read counts as answered, so it never holds the tab
   */
  static isWaiting(page: string, now = Date.now()): boolean {
    try {
      return !DetailsPages.answerOf(page) || AskListeners.liveFor(page, now) !== null
    } catch {
      return false
    }
  }

  /**
   * An epic's details and choice pages from its See Also's `links` (`SeeAlso.linksOf()`), in its order (newest
   * first), each with its file under the epic folder `content` and whether it waits.
   * - the guide and the guides it links are left out
   */
  static listed(links: DetailsLinkInput[], content: string, now = Date.now()): DetailsPageEntry[] {
    return links
      .filter((link) => link.kind === "details" || link.kind === "choices")
      .map((link) => {
        const file = join(content, ...link.href.split("/").filter(Boolean).map(decodeURIComponent))
        return { ...link, file, isWaiting: DetailsPages.isWaiting(file, now) }
      })
  }
}

/** A page of an epic's See Also, as `SeeAlso.linksOf()` lists it:  `href` a root path, `updated` ISO. */
export type DetailsLinkInput = { href: string; title: string; kind: string; updated: string }

/** One details or choice page in the Details tab's list:  its See Also link, its file, and whether it waits. */
export type DetailsPageEntry = DetailsLinkInput & { file: string; isWaiting: boolean }
