import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { SRV } from "spell/server"
import type { SPACES } from "spell/app/spaces"
import environment from "spell/app/spaces/server/node/environment"

/**
 * The inbox of changes people ask for on what's selected (epic `editor` P18, its Q15):  one small file on this machine,
 * which the editor's server adds to, and a Claude session takes from (`spell app changes`).
 * - Works with no Claude running:  a request just waits.
 * - Node only, plain files, no server:  the command and the server each read the file afresh, so both see the same.
 * - TWO writers, the editor's server adding a request and `spell app changes` taking one:  each read-change-write is
 *   under the file's lock (`SRV.FileLock`), so neither loses the other's (epic `coherence` I21).
 * - Written whole, through a temporary file:  neither ever reads half of it.
 * - A session listening holds a heartbeat in the file (`listen()`, `SRV.Heartbeat`):  gone 90s after its last beat,
 *   or at once when its process ends.
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
    return this.change((inbox) => {
      const id = `c${(inbox.lastId += 1)}`
      const request: SPACES.ChangeRequest = { ...asked, id, diskPath, status: "waiting", at: new Date().toISOString() }
      inbox.requests = [...inbox.requests, request].slice(-MOST_KEPT)
      return request
    })
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
    // nothing waits (each look, every half second):  no lock, no write
    if (!this.read().requests.some((request) => request.status === "waiting")) return undefined
    return this.change((inbox) => {
      const waiting = inbox.requests.filter((request) => request.status === "waiting")
      const isStale = (request: SPACES.ChangeRequest) => now - Date.parse(request.at) > WAITS_AT_MOST_MS
      for (const request of waiting.filter(isStale)) request.status = "failed"
      const next = waiting.find((request) => !isStale(request))
      if (next) next.status = "taken"
      return next
    })
  }

  /**
   * Request `id` is finished, with the session's own line about it.
   * - throws `TypeError` if there's no such request.
   */
  finish(id: string, status: "done" | "failed", summary?: string): SPACES.ChangeRequest {
    return this.change((inbox) => {
      const request = inbox.requests.find((each) => each.id === id)
      if (!request) throw new TypeError(`ChangeRequests.finish():  there's no request ${id};  'spell app changes list'`)
      request.status = status
      if (summary) request.summary = summary
      return request
    })
  }

  /**
   * This process listens, until the undo it returns is called or it ends:  its beat in the file now and every 30s
   * (`SRV.Heartbeat.keep()`), taken out as it stops.
   * - SIDE EFFECT:  a timer and signal handlers, until undone
   */
  listen(): () => void {
    return SRV.Heartbeat.keep(
      () => this.hear(),
      () =>
        this.change((inbox) => {
          if (inbox.heard?.pid === process.pid) delete inbox.heard
        })
    )
  }

  /** One beat:  this process is listening, as of `at`. */
  hear(at = new Date()): void {
    this.change((inbox) => {
      inbox.heard = { pid: process.pid, seen: at.toISOString() }
    })
  }

  /**
   * Is a session listening?  Its beat is live (`SRV.Heartbeat.isLive()`:  within 90s, its process running).
   * One that has taken a request and hasn't finished it counts too:  it's coming back.
   */
  isListening(now = Date.now()): boolean {
    const { heard, requests } = this.read()
    return SRV.Heartbeat.isLive(heard, now) || requests.some((request) => request.status === "taken")
  }

  /** What the file holds:  nothing yet, or a file that can't be read, is an empty inbox. */
  private read(): ChangeInbox {
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as ChangeInbox
    } catch (ignored) {
      return { lastId: 0, requests: [] }
    }
  }

  /**
   * Read the inbox, `edit` it, and write it back, all under the file's lock;  returns what `edit` returned.
   * - throws what `edit` throws, writing nothing;  a `FileLockError` if the lock stays held 20s
   */
  private change<T>(edit: (inbox: ChangeInbox) => T): T {
    mkdirSync(dirname(this.file), { recursive: true })
    return SRV.FileLock.run(this.file, () => {
      const inbox = this.read()
      const result = edit(inbox)
      this.write(inbox)
      return result
    })
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
  /** the session listening:  its process, and its last beat (`SRV.Heartbeat`) */
  heard?: SRV.Beat
}

/** The inbox's name, in spell-spaces:  `__` keeps it out of the project lists. */
const INBOX_FILE = "__change-requests.json"

/** How many finished requests stay:  the file stays small. */
const MOST_KEPT = 50

/** How long a request waits for a session, in msec. */
const WAITS_AT_MOST_MS = 60 * 60 * 1000
