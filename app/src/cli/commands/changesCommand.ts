import { waitUntil } from "spell/util/timing"
import { CLI } from "spell/cli"
import { ChangeRequests } from "spell/app/spaces/server/node/changes/ChangeRequests"
import type { SPACES } from "spell/app/spaces"

/**
 * `spell app changes wait | done | list` (epic `editor` P18):  how a Claude session on this machine takes the changes
 * people ask for in the editor (select something, right click, Change This).
 * - `wait [--timeout <seconds>]`:  says it's listening, until a request comes.  Prints it, taken, and what to do with it.
 *   - Exit 0 with a request, 2 at the timeout, an hour by default, as `epic inbox wait` does.
 *   - Run in the background, so the session stays free.
 * - `done <id> [what changed] [--failed]`:  it's finished:  the editor shows the new files and that line.
 * - `list`:  every request kept.
 * - Node only;  loads no spell:  nothing here compiles.
 */
export async function changesCommand(args: string[], options: ChangesOptions): Promise<number> {
  const [verb, id, ...words] = args
  const inbox = ChangeRequests.here
  if (verb === "done") {
    if (!inbox.of(id!)) throw new CLI.CliError(`there's no request ${id};  'spell app changes list' shows them`)
    const summary = words.join(" ")
    const { status } = inbox.finish(id!, options.failed ? "failed" : "done", summary)
    console.log(`${id} ${status}`)
    return 0
  }
  if (verb === "list") {
    for (const request of inbox.all)
      console.log(`${request.id}  ${request.status}  ${placeOf(request)}:  ${request.text}`)
    return 0
  }
  return await waitForRequest(inbox, (options.timeout ?? DEFAULT_TIMEOUT_SECONDS) * 1000)
}

/**
 * Wait up to `timeoutMs` for a request, and print it:  see `changesCommand()`.
 * - LISTENS meanwhile (`ChangeRequests.listen()`):  the editor says a session will pick the change up
 */
async function waitForRequest(inbox: ChangeRequests, timeoutMs: number): Promise<number> {
  const stopListening = inbox.listen()
  // Until a request comes, looking every `LOOK_EVERY_MS`;  gives up after `timeoutMs`
  const request = await waitUntil(() => inbox.takeNext(), {
    timeout: timeoutMs / 1000,
    every: LOOK_EVERY_MS / 1000
  }).finally(stopListening)
  if (!request) return 2
  console.log(describeRequest(request))
  return 0
}

/** `request`, as a Claude session reads it. */
function describeRequest(request: SPACES.ChangeRequest): string {
  return [
    `Someone in the Spell editor asks for a change (${request.id}):`,
    "",
    `  "${request.text}"`,
    "",
    `Project:  ${request.projectId}`,
    `Selected:  <${request.kind}>, written at ${request.diskPath}:${request.line + 1}`,
    "The code there:",
    ...request.excerpt.split("\n").map((line) => `  ${line}`),
    "",
    "Change the project's files on disk, then say so, and listen for the next one:",
    `  spell app changes done ${request.id} "what you changed, in a few plain words"`,
    "  spell app changes wait    (in the background)",
    "If you can't do it, say why:",
    `  spell app changes done ${request.id} --failed "why"`
  ].join("\n")
}

/** Where `request` is, in a line. */
function placeOf(request: SPACES.ChangeRequest): string {
  return `${request.projectId}/${request.filePath}:${request.line + 1}`
}

/** `spell app changes`' options. */
export type ChangesOptions = {
  /** `wait`:  how long to wait, in seconds */
  timeout?: number
  /** `done`:  the session couldn't do it */
  failed?: boolean
}

/** How long `wait` waits, in seconds. */
const DEFAULT_TIMEOUT_SECONDS = 3600

/** How often `wait` looks at the inbox, in msec. */
const LOOK_EVERY_MS = 500
