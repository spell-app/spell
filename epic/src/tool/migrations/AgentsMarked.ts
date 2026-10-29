import { ThreadFacts } from "spell/epic/comments"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `AgentsMarked`
 * The migration `agents-marked` (epic `epic-friend` P2, Q9):  Claude's old replies say they're his, by a marker, not
 * by a name.
 * - `<epic-reply from="Claude" at="2026-10-04 17:20">` => `<epic-reply from="Claude" agent="claude" at="...">`
 *   - which:  no `agent` yet, `from` says "Claude" (any case), dated before the marker (`ThreadFacts.isOldClaudes()`)
 *   - `from` stays:  an old reply names no person, so it's drawn "Claude" to everyone
 * - why:  a person may call themselves "Claude";  once every page is marked, nothing reads a reply's name to tell
 *   who wrote it, and `ThreadFacts.agentOf()`'s old rule can go
 * - a person's reply (`from="Owen"`) is left;  Claude's in an Original Discussion are marked too, so the history
 *   reads the same way as the rest
 * - the inboxes' comments:  `CommentList.markAgents()`, on every read
 * - IDEMPOTENT:  a marked reply is left
 * - Cheap markup:  every edit runs it too (`everyEdit`)
 ****************/
export class AgentsMarked implements Migration {
  readonly name = "agents-marked"
  readonly kind = "epic"
  readonly date = "2026-10-29"
  readonly everyEdit = true
  readonly description =
    "Claude's old replies marked his, `agent=\"claude\"`, so a reply's name never says who wrote it"

  /** Mark every old reply of Claude's in `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    let marked = 0
    for (const reply of Array.from(document.querySelectorAll(REPLY_TAG))) {
      if (!ThreadFacts.isOldClaudes(reply)) continue
      reply.setAttribute("agent", CLAUDE_AGENT)
      marked++
    }
    if (marked) context.notes?.push(`agents-marked:  ${marked} of Claude's replies marked agent="claude"`)
    return marked > 0
  }
}

/** A reply's tag. */
const REPLY_TAG = "epic-reply"

/** Claude's marker. */
const CLAUDE_AGENT = "claude"
