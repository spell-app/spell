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
 * - `take <id>`:  takes that request, and prints it, as `wait` does:  what the session the page server started for it
 *   runs first (`ClaudeStarter`, epic `editor` T66).  It's told not to listen for the next one.
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
  if (verb === "take") {
    if (!inbox.of(id!)) throw new CLI.CliError(`there's no request ${id};  'spell app changes list' shows them`)
    let request: SPACES.ChangeRequest
    try {
      request = inbox.take(id!)
    } catch (error) {
      // taken or finished already
      throw new CLI.CliError((error as Error).message)
    }
    console.log(describeRequest(request, "take"))
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
  console.log(describeRequest(request, "wait"))
  return 0
}

/**
 * `request`, as a Claude session reads it.
 * - `how`:  how it was taken;  a session that listens (`wait`) is told to listen again, one started for it (`take`) isn't
 */
function describeRequest(request: SPACES.ChangeRequest, how: "wait" | "take"): string {
  return [
    `Someone in the Spell editor asks for a change (${request.id}):`,
    "",
    `  "${request.text}"`,
    "",
    `Project:  ${request.projectId}`,
    `Selected:  <${request.kind}>, written at ${request.diskPath}:${request.line + 1}`,
    "  (the file as they see it:  their draft, when they have one;  edit it there, never another copy)",
    "The code there:",
    ...request.excerpt.split("\n").map((line) => `  ${line}`),
    "",
    ...(request.pictureFiles?.length
      ? ["Pictures sent with it (Read each):", ...request.pictureFiles.map((file) => `  ${file}`), ""]
      : []),
    how === "wait"
      ? "Change the project's files on disk, then say so, and listen for the next one:"
      : "Change the project's files on disk, then say so:",
    `  ${SPELL} app changes done ${request.id} "what you changed, in a few plain words"`,
    ...(how === "wait" ? [`  ${SPELL} app changes wait    (in the background)`] : []),
    "If you can't do it, say why:",
    `  ${SPELL} app changes done ${request.id} --failed "why"`
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

/**
 * The `spell` command, as the session should run it:  how this one was run, so a session the page server started,
 * allowed only that command (`ClaudeStarter`), runs `done` the same way;  `spell` when it's the link on the `PATH`.
 */
const SPELL = process.env.SPELL_CHANGES_COMMAND ?? "spell"

/** How long `wait` waits, in seconds. */
const DEFAULT_TIMEOUT_SECONDS = 3600

/** How often `wait` looks at the inbox, in msec. */
const LOOK_EVERY_MS = 500
