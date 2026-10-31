import { SaveQueue } from "spell/util/places/SaveQueue"
import { storageNow, type ServerLink, type StorageFinder } from "spell/epic/review"

import { ANSWER_RETRY_MS } from "./answers.types"

/****************
 * ### `DraftSaver`
 * A DRAFT THAT SAVES ITSELF as Owen types (epic `coherence` C10):  the one way every page he types into keeps what's
 * typed and not sent, so nothing lives only in the open page.
 * - Its users:  the answer pages' forms (`AnswerForm`, `ChoicesForm`, `RunForm`), the review note (`<epic-review>`),
 *   the docs pages' comments (`spell-doc-comments.js`), the syntax page.
 * - Each hands it what differs:  the save call (`save`), the wait after the last change (`wait`), and the key of the
 *   browser's own copy (`key`, optional).
 * - Saving in order, retrying, sending as the page goes away, the browser's copy and the wording of where it stands
 *   are all `SaveQueue`'s (epic `data` P3):  this is a queue that knows the page server.
 *   - a page server back on its address takes a retried save, its new token too (`ServerLink`), no keystroke, no reload
 *   - off the page server (`link.isServed`):  saves nothing, says so;  the browser's copy is all there is
 * - Node-safe at import;  `window` only in `watch()`.
 * - Position in the import graph:  `spell/epic/review` (the link's type, `storageNow()`), its peer types, the kit's
 *   `SaveQueue`.  NEVER imports Solid or Spell UI:  callers bridge `onChange` into their own state.
 ****************/
export class DraftSaver extends SaveQueue {
  constructor(props: DraftSaverProps) {
    const { link, storage, retry = ANSWER_RETRY_MS, ...rest } = props
    super({
      ...rest,
      retry,
      ...(link && { isOffServer: () => !link.isServed }),
      storage: () => ("storage" in props ? storageNow(storage) : globalThis.localStorage)
    })
  }
}

/** What a `DraftSaver` is handed:  what differs from one page to the next. */
export type DraftSaverProps = {
  /**
   * Save what's typed to the page server;  resolves to when it was saved (ISO, the server's stamp), or nothing
   * (now);  throws why not, in words (`ServerLink.post()`'s `ServerWriteError`).
   * - `keepalive`:  the page is going away:  `fetch`'s `keepalive`
   */
  save: (options: { keepalive: boolean }) => Promise<string | undefined | void>
  /** How long after the last change it saves, ms:  500 for a form, 10 000 for a review note. */
  wait: number
  /** How long after a failed save it tries again, ms;  default `ANSWER_RETRY_MS` (3s). */
  retry?: number
  /** The browser's copy's key, `<store>:<key>` (`spell-details-draft:/epics/x/details/q.html`);  none:  no copy. */
  key?: string
  /** Where the browser's copy is kept;  default `localStorage`;  `null`:  memory only (tests, a private window). */
  storage?: StorageFinder
  /** The page server:  off it (`isServed`), nothing is saved;  none:  `save` decides. */
  link?: ServerLink
  /** Called whenever `state` changes. */
  onChange?: () => void
}
