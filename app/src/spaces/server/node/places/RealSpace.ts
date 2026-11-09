import type { AtProtoNetwork } from "spell/places/AtProtoPlace"
import type { AtProtoAccess } from "spell/places/AtProtoSignIn"
import {
  AtProtoSpace,
  SpaceRefusal,
  memberAccessFor,
  type MemberAccess,
  type SpaceMemberEntry
} from "spell/places/AtProtoSpace"
import { AtProtoSpacePlace } from "spell/places/AtProtoSpacePlace"
import { OWNER_FIELD, type PlaceEvent, type PlaceRow, type SpaceMember } from "spell/places/places.types"
import { SaveQueue } from "spell/places/SaveQueue"
import type { SRV } from "spell/server"

/** How long after a write the host didn't take it tries again, ms:  a host that's down for a moment. */
const RETRY_MS = 5000

/****************
 * ### `RealSpace`
 * A space's own folder, kept in a real AT Protocol Space too, written as its org (epic `atmosphere` P14, Q6 C, Q10).
 *
 * ```ts
 * const real = new RealSpace({ address: "@club/pantry", uri, access: orgSignIn, storage })
 * real.written([{ collection: "recipes", id: "r-1", row }])   // a write that went through, queued for the Space
 * await real.putMember("did:plc:bo", member)                     // Bo on the Space's own list
 * ```
 *
 * - ONE SPACE, TWO STORES:  every write still goes through Spell's one route and all its checks, onto its folder;
 *   then the same thing, whole, into the real Space, as the org's own record (`AtProtoSpacePlace`), its `by` saying who.
 *   - The folder is Spell's copy, for its versions and its checks;  the Space is what members read, each with their
 *     own credential, through the read pass-through (the kit's `DirectReads`, `hostOf`):  so the HOST decides who reads.
 * - Into the Space through the ONE retry queue (Q19 A):  the kit's `SaveQueue`, its unsent writes kept on the server's
 *   disk (`SRV.FileStorage`), in order, until each goes through.
 *   - A host that's down, or doesn't answer:  tried again every `RETRY_MS`, across restarts.
 *   - A host that says no for good (a 4xx but 429):  logged, and dropped, as nothing sent again would change it.
 *   - Whole things, so sending one twice is the same as once.
 * - Its MEMBER LIST follows Spell's (`putMember()`, `removeMember()`):  only for members with an AT Protocol account,
 *   their DID in their membership, or their own file.
 *   - The org's own account is on it too, as the Space's authority (`orgDid`):  never one to take off.
 *   - Brought into step with Spell's as an org's roles change, and each day (the app's `MemberLists`, epic `atmosphere` P24).
 * - Node only;  made by the app's `SpaceFolders`, for a space whose settings name a Space (`SpaceMembers.keptIn()`).
 ****************/
export class RealSpace {
  /** The folder's address:  `@club/pantry`. */
  readonly address: string
  /** The Space, as its org reaches it. */
  readonly space: AtProtoSpace
  /** The org's own account, the Space's authority:  on its list, and never a member to take off. */
  readonly orgDid: string | undefined
  /** The Space as a place, writing the org's own records. */
  private readonly place: AtProtoSpacePlace
  /** Its writes, sent in order until each goes through. */
  private readonly queue: SaveQueue

  constructor({ address, uri, access, network, storage, retry = RETRY_MS }: RealSpaceProps) {
    this.address = address
    this.space = new AtProtoSpace({ uri, access, ...(network && { network }) })
    this.orgDid = access.did
    this.place = new AtProtoSpacePlace({ space: this.space, me: () => access.did })
    this.queue = new SaveQueue({
      key: `space-writes:${address}`,
      storage: () => storage,
      save: () => this.sendQueued(),
      wait: 0,
      retry
    })
    // what a restart left unsent goes now
    if (this.unsent.length) this.queue.changed({ now: true })
  }

  /** The writes not yet in the Space, oldest first. */
  get unsent(): readonly PlaceEvent[] {
    return this.queue.kept<PlaceEvent[]>() ?? []
  }

  /** Resolves once everything queued has gone, or failed and waits to try again:  `true` when nothing's left. */
  get settled(): Promise<boolean> {
    return this.queue.settled
  }

  /** Where the Space's authority is hosted, `https://...`:  where its reads pass through to.  - throws `SpaceRefusal` */
  host(): Promise<string> {
    return this.space.authorityHost()
  }

  /** SIDE EFFECT:  these writes went through on the folder:  queue each for the Space, and send them.  NEVER throws. */
  written = (written: readonly PlaceEvent[]): void => {
    this.queue.keep([
      ...this.unsent,
      ...written.map(({ collection, id, row }) => ({ collection, id, ...(row && { row }) }))
    ])
    this.queue.changed({ now: true })
  }

  /** Put `did` on the Space's own list, with what `member`'s role lets them.  - throws `SpaceRefusal` */
  async putMember(did: string, member: Pick<SpaceMember, "canRead" | "canWrite">): Promise<void> {
    const access: MemberAccess = memberAccessFor(member)
    await this.space.putMember(did, access)
  }

  /** Take `did` off the Space's own list.  - throws `SpaceRefusal` */
  async removeMember(did: string): Promise<void> {
    await this.space.removeMember(did)
  }

  /** The Space's own list, each account and what it may do:  the org's own among them.  - throws `SpaceRefusal` */
  members(): Promise<SpaceMemberEntry[]> {
    return this.space.members()
  }

  /** Stop sending:  what's unsent stays on the disk, for the next start. */
  stop(): void {
    this.queue.stop()
  }

  ////////////////
  // ## Sending
  ////////////////

  /**
   * Send every queued write, oldest first, each kept until it's gone.
   * - throws what the host didn't take for now:  the queue tries again (`RETRY_MS`)
   */
  private async sendQueued(): Promise<void> {
    for (let [next] = this.unsent; next; [next] = this.unsent) {
      await this.sendOrDrop(next)
      this.queue.keep(this.unsent.slice(1))
    }
  }

  /** Send one write;  one the host says no to for good is logged and dropped.  - throws a refusal for now */
  private async sendOrDrop({ collection, id, row }: PlaceEvent): Promise<void> {
    try {
      if (!row) await this.place.apply([{ kind: "delete", collection, id }])
      else await this.place.apply([{ kind: "update", collection, id, fields: recordOf(row) }])
    } catch (error) {
      if (!isForGood(error)) throw error
      console.error(`RealSpace:  ${this.address}'s Space said no to "${collection}" ${id};  dropped`, error)
    }
  }
}

/** Constructor props of a `RealSpace`. */
export type RealSpaceProps = {
  /** The folder's address:  `@club/pantry`. */
  address: string
  /** The Space:  `at://<org's DID>/space/<type>/<skey>`. */
  uri: string
  /** The org's account, signed in:  every record is its own. */
  access: AtProtoAccess
  /** Where accounts' documents are.  Left out:  the real network. */
  network?: Partial<Pick<AtProtoNetwork, "directory">>
  /** Where its unsent writes are kept:  one file for every space's (`SRV.FileStorage`). */
  storage: SRV.FileStorage
  /** How long after a write the host didn't take it tries again, ms:  default `RETRY_MS`. */
  retry?: number
}

/** A row as the org's record:  everything but Spell's `owner`, which a record can't claim. */
function recordOf(row: PlaceRow): PlaceRow {
  const { [OWNER_FIELD]: _owner, ...record } = row
  return record
}

/** Is `error` a no for good, that sending again won't change:  a host's 4xx but 429, or a thing that's gone already? */
function isForGood(error: unknown): boolean {
  if (!(error instanceof SpaceRefusal)) return false
  const status = error.status ?? 0
  return status >= 400 && status < 500 && status !== 429
}
