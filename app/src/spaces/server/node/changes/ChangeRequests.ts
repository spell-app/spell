import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import type { SPACES } from "spell/app/spaces"
import environment from "spell/app/spaces/server/node/environment"

/**
 * The inbox of changes people ask for on what's selected (epic `editor` P18, its Q15):  one small file on this machine,
 * which the editor's server adds to, and a Claude session takes from (`spell app changes`).
 * - Works with no Claude running:  a request just waits.
 * - Node only, plain files, no server:  the command and the server each read the file afresh, so both see the same.
 * - Written whole, through a temporary file:  neither ever reads half of it.
 * - NEVER knows about epics:  an app has no epic behind it.
 ****************/
export class ChangeRequests {
  constructor(readonly file: string) {}

  /** The ONE inbox, in spell-spaces:  `SPELL_SPACES_DIR`, in a test. */
  static get here(): ChangeRequests {
    return new ChangeRequests(join(environment.spellSpacesDir, INBOX_FILE))
  }

  /** Add a request, for `diskPath`:  it waits for a session. */
  add(asked: SPACES.ChangeAsked, diskPath: string): SPACES.ChangeRequest {
    const inbox = this.read()
    const id = `c${(inbox.lastId += 1)}`
    const request: SPACES.ChangeRequest = { ...asked, id, diskPath, status: "waiting", at: new Date().toISOString() }
    inbox.requests = [...inbox.requests, request].slice(-MOST_KEPT)
    this.write(inbox)
    return request
  }

  /** Request `id`:  `undefined` if there's none. */
  of(id: string): SPACES.ChangeRequest | undefined {
    return this.read().requests.find((request) => request.id === id)
  }

  /** Every request kept, oldest first. */
  get all(): SPACES.ChangeRequest[] {
    return this.read().requests
  }

  /**
   * Take the oldest waiting request:  it's `taken` now, and `undefined` if none waits.
   * - One left waiting too long is dropped, not done:  whoever asked has long moved on.
   */
  takeNext(now = Date.now()): SPACES.ChangeRequest | undefined {
    const inbox = this.read()
    const waiting = inbox.requests.filter((request) => request.status === "waiting")
    const isStale = (request: SPACES.ChangeRequest) => now - Date.parse(request.at) > WAITS_AT_MOST_MS
    for (const request of waiting.filter(isStale)) request.status = "failed"
    const next = waiting.find((request) => !isStale(request))
    if (next) next.status = "taken"
    if (next || waiting.length) this.write(inbox)
    return next
  }

  /**
   * Request `id` is finished, with the session's own line about it.
   * - throws `TypeError` if there's no such request.
   */
  finish(id: string, status: "done" | "failed", summary?: string): SPACES.ChangeRequest {
    const inbox = this.read()
    const request = inbox.requests.find((each) => each.id === id)
    if (!request) throw new TypeError(`ChangeRequests.finish():  there's no request ${id};  'spell app changes list'`)
    request.status = status
    if (summary) request.summary = summary
    this.write(inbox)
    return request
  }

  /** A session is listening, as of now. */
  hear(now = Date.now()): void {
    const inbox = this.read()
    inbox.heardAt = now
    this.write(inbox)
  }

  /** Is a session listening?  One that has taken a request and hasn't finished it counts:  it's coming back. */
  isListening(now = Date.now()): boolean {
    const { heardAt, requests } = this.read()
    return now - (heardAt ?? 0) < LISTENING_MS || requests.some((request) => request.status === "taken")
  }

  /** What the file holds:  nothing yet, or a file that can't be read, is an empty inbox. */
  private read(): ChangeInbox {
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as ChangeInbox
    } catch (ignored) {
      return { lastId: 0, requests: [] }
    }
  }

  /** Write `inbox` whole. */
  private write(inbox: ChangeInbox): void {
    mkdirSync(dirname(this.file), { recursive: true })
    const temporary = `${this.file}.${process.pid}.tmp`
    writeFileSync(temporary, JSON.stringify(inbox, null, 2))
    renameSync(temporary, this.file)
  }
}

/** The inbox file, as it's written. */
type ChangeInbox = {
  /** the last id given, so one is never used twice */
  lastId: number
  /** the requests kept, oldest first */
  requests: SPACES.ChangeRequest[]
  /** when a session last said it's listening, in msec */
  heardAt?: number
}

/** The inbox's name, in spell-spaces:  `__` keeps it out of the project lists. */
const INBOX_FILE = "__change-requests.json"

/** How many finished requests stay:  the file stays small. */
const MOST_KEPT = 50

/** How long a request waits for a session, in msec. */
const WAITS_AT_MOST_MS = 60 * 60 * 1000

/** How long after a session last spoke it still counts as listening:  `spell app changes wait` speaks every 5s. */
export const LISTENING_MS = 15_000
