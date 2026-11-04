import {
  LiveRoomPlace,
  MemoryPlace,
  Places,
  type LiveRoomPlaceProps,
  type Place,
  type PlaceRow,
  type RoomSocket,
  type RoomSocketListeners
} from "spell/util/places"
import { SRV } from "spell/server"
import { Referee, type RoomAction, type RoomMember } from "spell/server/places"

/** What can go wrong between a page and its referee:  a test sets it. */
export type Trouble = {
  /** How likely a message is lost, 0 to 1. */
  drop?: number
  /** How likely a message arrives after later ones, 0 to 1. */
  shuffle?: number
}

/** A seeded random, so a failure comes back the same. */
export function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 48_271) % 2_147_483_647
    return state / 2_147_483_647
  }
}

/**
 * A page's end of a pretend connection to a referee, in this process:  messages can be lost or reordered, both ways.
 * - A held-back message goes out after the next one, or by itself soon after:  so nothing waits for ever by being reordered.
 */
export class FlakySocket implements RoomSocket {
  isOpen = false
  private member: RoomMember | undefined
  private heldUp: (() => void)[] = []
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(
    private readonly referee: Referee,
    private readonly listeners: RoomSocketListeners,
    private readonly trouble: Trouble,
    private readonly random: () => number
  ) {
    // as a real socket:  never while it's being made
    queueMicrotask(() => this.open())
  }

  /** The connection comes up. */
  open(): void {
    if (this.isOpen) return
    this.isOpen = true
    this.member = this.referee.join((text) => this.pass(() => this.isOpen && this.listeners.onMessage(text)))
    this.listeners.onOpen()
  }

  /** The connection drops. */
  drop(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.member?.leave()
    this.listeners.onClose()
  }

  send(text: string): boolean {
    if (!this.isOpen) return false
    this.pass(() => this.member?.receive(text))
    return true
  }

  close(): void {
    this.drop()
    this.timers.forEach(clearTimeout)
  }

  /** Pass one message on:  maybe not, maybe late. */
  private pass(deliver: () => void): void {
    const { drop = 0, shuffle = 0 } = this.trouble
    if (this.random() < drop) return
    if (this.random() < shuffle) {
      this.heldUp.push(deliver)
      const timer = setTimeout(() => this.heldUp.shift()?.(), 5 + this.random() * 20)
      this.timers.add(timer)
      return
    }
    // async, as a real socket is, in order
    queueMicrotask(() => {
      deliver()
      this.heldUp.shift()?.()
    })
  }
}

/** A guard that lets anyone in:  for a referee joined directly, not through its socket. */
export const anyGuard = () => new SRV.Guard()

/** One page in a room:  its place, its list of places, and what it's showing. */
export class TestPage {
  readonly places: Places
  readonly place: LiveRoomPlace
  socket!: FlakySocket
  /** What this page's screen shows, by id. */
  readonly shown = new Map<string, PlaceRow>()
  readonly lost: unknown[] = []
  readonly deleted: { id: string; restore(): void; row: PlaceRow }[] = []
  readonly conflicts: unknown[] = []

  constructor(referee: Referee, trouble: Trouble, seed: number, props: Partial<LiveRoomPlaceProps> = {}) {
    const random = seededRandom(seed)
    this.place = new LiveRoomPlace({
      url: "ws://nowhere/",
      answerSeconds: 0.2,
      checkSeconds: 0.25,
      socket: (listeners) => (this.socket = new FlakySocket(referee, listeners, trouble, random)),
      ...props
    })
    this.places = new Places({ wait: 1, retry: 30 }).add("room", this.place as Place)
    this.places.onRows(({ rows, removed = [] }) => {
      for (const id of removed) this.shown.delete(id)
      for (const row of rows)
        this.shown.set(`${row.id as string}`, { ...this.shown.get(`${row.id as string}`), ...row })
    })
    this.places.onLost((lost) => this.lost.push(lost))
    this.places.onThingDeleted((deleted) => this.deleted.push(deleted))
    this.places.onConflict((conflict) => this.conflicts.push(conflict))
    this.places.heal.follow({ placeName: "room", collection: "recipes" })
  }

  /** The changes on their way. */
  get pending() {
    return this.places.pendingFor("room")
  }

  /** Start by reading everything. */
  async read(): Promise<void> {
    for (;;) {
      try {
        const { rows } = await this.place.list("recipes", {}, {})
        for (const row of rows) this.shown.set(`${row.id as string}`, row)
        return
      } catch {
        // no answer:  a read asks again, as a person's page does
      }
    }
  }

  /** Set a field, as a form does. */
  set(id: string, field: string, value: unknown): void {
    const was = this.shown.get(id)?.[field]
    this.pending.setField({ collection: "recipes", id, field, value, was })
  }

  /** Add a thing. */
  add(id: string, fields: PlaceRow): void {
    this.pending.insert({ collection: "recipes", id, fields })
  }

  /** Remove a thing. */
  remove(id: string): void {
    this.shown.delete(id)
    this.pending.delete({ collection: "recipes", id })
  }

  /** What's on the screen, in order of id, with the engine's own marks taken off. */
  get screen(): Record<string, PlaceRow> {
    return withoutMarks(Object.fromEntries(this.shown))
  }

  close(): void {
    this.place.close()
    this.pending.queue.stop()
  }
}

/** Rows in order of id, with the engine's own marks taken off. */
export function withoutMarks(rows: Record<string, PlaceRow>): Record<string, PlaceRow> {
  return Object.fromEntries(
    Object.entries(rows)
      .sort(([one], [other]) => (one < other ? -1 : 1))
      .map(([id, row]) => [id, Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith("$")))])
  )
}

/** A referee over a memory place holding a few recipes. */
export async function newRoom(actions: Record<string, RoomAction> = {}, place?: Place): Promise<Referee> {
  const store =
    place ??
    new MemoryPlace({
      collections: {
        recipes: [
          { id: "r-1", title: "Soup", servings: 2 },
          { id: "r-2", title: "Dal", servings: 4 }
        ]
      }
    })
  return new Referee({
    path: "/api/rooms/recipes",
    place: store,
    collections: { recipes: {} },
    guard: anyGuard(),
    actions
  }).open()
}
