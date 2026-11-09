import {
  DEFAULT_CORNER,
  REAL_NETWORK,
  documentUrlFor,
  hostIn,
  type AccountDocument,
  type AtProtoNetwork
} from "./AtProtoPlace"
import type { AtProtoAccess } from "./AtProtoSignIn"
import {
  MAC_HEADER,
  SpaceCredential,
  WANT_MAC_HEADER,
  macIn,
  macRequestFor,
  publicKeyOf,
  recordMacFor,
  sameBytes,
  sharedSecretFor
} from "./SpaceCredential"
import { PlaceError, type PlaceErrorCause, type SpaceMember, type SpaceSettings } from "./places.types"

/** The space type Spell's spaces are, until a Lexicon declares one (`<corner>.space`). */
export const SPELL_SPACE_TYPE = `${DEFAULT_CORNER}.space`

/** The collection a file's record is in, unless said:  one record per file, pointing to its blob (P12). */
export const SPELL_FILE = `${DEFAULT_CORNER}.file`

/** The policy a space with a member list goes by:  Spell's `whoWrites: "its members"`. */
export const MEMBERSPACE_POLICY = "com.atproto.memberspace.policy"

/** The policy of a space only its authority reads and writes. */
export const PERSONALSPACE_POLICY = "com.atproto.personalspace.policy"

/** A credential this close to its end is asked for again, in seconds. */
const CREDENTIAL_MARGIN = 60

/** The most rows a host answers with at once. */
const PAGE_SIZE = 100

/** The errors that mean the thing isn't there. */
const NOT_THERE = new Set([
  "SpaceNotFound",
  "SpaceDeleted",
  "RecordNotFound",
  "RepoNotFound",
  "RepoDeactivated",
  "BlobNotFound"
])

/** The errors that mean this person (or app) may not. */
const NOT_ALLOWED = new Set([
  "UserNotAuthorized",
  "AppNotAuthorized",
  "NotAuthorized",
  "NotSpaceOwner",
  "AuthMissing",
  "AuthRequired",
  "InvalidDelegationToken"
])

/****************
 * ### `AtProtoSpace`
 * One AT Protocol Space (proposal 0016), reached by one account signed in:  the trial seam of epic `atmosphere` P11.
 *
 * ```ts
 * const space = await AtProtoSpace.create(signIn, { skey: "recipes" })   // signIn's account is its authority
 * await space.putMember("did:plc:bo", { read: true, write: true })
 * await space.put("app.spell.data.recipe", "r-1", { title: "Dal" })
 * await space.writers()                                                   // who's written:  [{ did, ... }]
 * await space.record(signIn.did!, "app.spell.data.recipe", "r-1")        // read back, with a credential
 * ```
 *
 * - A space is `at://<authority>/space/<type>/<skey>`:
 *   - its AUTHORITY is the account that made it, which always reads and writes it:  an org's own DID (Q10's test org)
 *   - its type, Spell's `SPELL_SPACE_TYPE` unless said;  its key, the folder's name (`recipes`)
 * - Each account writes only its OWN records in it, on its own host (`put()`);  nobody writes another's.
 *   - So Spell writing as the org's account (Q6) makes every shared row the org's.
 * - Reading anyone's records takes a SPACE CREDENTIAL (`credential()`):
 *   - the reader's host vouches for them (a delegation token), the authority's host hands it out
 *   - it's shown, signed, to each writer's host;  each record comes back with a MAC this checks
 * - Who may read and write is a MEMBER LIST, on the authority's host (`putMember()`):  a read and a write flag each,
 *   as Spell's members are (`memberAccessFor()`);  anyone else, by the space's settings (`policyFor()`, P7 / Q13).
 * - The WRITER SET is the accounts that have written into it (`writers()`), not those who may.
 * - A FILE is a blob and one record naming it (`writeFile()`, P12), as the alpha's lexicons have it:
 *   - the blob goes up the account's usual way (`upload()`:  `com.atproto.repo.uploadBlob`), into no space
 *   - a record in the space points to it (`putFile()`):  its name, type and size, and the blob's ref
 *   - it's read through the space (`file()`, `blob()`), only while some record of the writer's IN THAT SPACE points to it
 *   - so copying a file into another space is one more record pointing to the same blob, with no new upload
 *   - a blob no record points to any more is deleted by the writer's host
 * - Plain `fetch` and the browser's crypto:  it runs anywhere.  Taken by file, in no barrel:  a trial, kept out of the
 *   product (Q2).
 * - Every method that fails throws a `SpaceRefusal`:  the host's own error name and status in its `cause`.
 ****************/
export class AtProtoSpace {
  /** The space:  `at://<authority>/space/<type>/<skey>`. */
  readonly uri: string
  /** Its authority's DID. */
  readonly authority: string
  /** Its type. */
  readonly type: string
  /** Its key. */
  readonly skey: string

  /** Who it's reached as:  left out, nobody, for a space anyone reads. */
  private readonly access: AtProtoAccess | undefined
  /** What it asks about accounts. */
  private readonly network: Pick<AtProtoNetwork, "directory">
  /** The address it reaches a host by:  see `AtProtoSpaceProps.through`. */
  private readonly through: ((host: string) => string) | undefined
  /** Each account's document, once read. */
  private readonly documents = new Map<string, Promise<KeyedDocument>>()
  /** The credential in hand, while it's good. */
  private held: SpaceCredential | undefined

  constructor({ uri, access, network = {}, through }: AtProtoSpaceProps) {
    const { authority, type, skey } = spaceRefOf(uri)
    this.uri = uri
    this.authority = authority
    this.type = type
    this.skey = skey
    this.access = access
    this.network = { ...REAL_NETWORK, ...network }
    this.through = through
  }

  /**
   * A new space, with `access`'s account as its authority.
   * - `settings`:  who besides its members reads and writes it;  left out, members only
   * - throws `SpaceRefusal`:  `SpaceAlreadyExists`, `UnsupportedPolicy` ...
   */
  static async create(
    access: AtProtoAccess,
    { skey, type = SPELL_SPACE_TYPE, settings, network }: SpaceCreation
  ): Promise<AtProtoSpace> {
    const policy = policyFor(settings ?? { publicRead: false, publicWrite: false })
    const { uri } = await answerOf<{ uri: string }>(
      access.fetch(xrpc("space.createSpace"), post({ spaceType: type, skey, policy }))
    )
    return new AtProtoSpace({ uri, access, network })
  }

  ////////////////
  // ## The space itself:  its authority's
  ////////////////

  /** Its settings, as its policy says them.  - throws `SpaceRefusal` */
  async settings(): Promise<SpaceSettings & { policy: SpacePolicy }> {
    const { policy } = await answerOf<{ policy: SpacePolicy }>(this.asMe().fetch(xrpc("space.getSpace", this.asked())))
    return { ...settingsFor(policy), policy }
  }

  /** Change who besides its members reads and writes it:  its policy, replaced whole.  - throws `SpaceRefusal` */
  async changeSettings(settings: SpaceSettings): Promise<void> {
    await answerOf(this.asMe().fetch(xrpc("space.updateSpace"), post({ space: this.uri, policy: policyFor(settings) })))
  }

  /** Add `did` to its members, or change what they may do.  - throws `SpaceRefusal`, `NotSpaceOwner` for anyone else */
  async putMember(did: string, { read, write }: MemberAccess): Promise<void> {
    await answerOf(this.asMe().fetch(xrpc("memberspace.putMember"), post({ space: this.uri, did, read, write })))
  }

  /** Take `did` off its members.  - throws `SpaceRefusal` */
  async removeMember(did: string): Promise<void> {
    await answerOf(this.asMe().fetch(xrpc("memberspace.removeMember"), post({ space: this.uri, did })))
  }

  /** Every member, and what each may do.  - throws `SpaceRefusal` */
  async members(): Promise<SpaceMemberEntry[]> {
    return this.walk<SpaceMemberEntry, "members">("members", (cursor) =>
      this.asMe().fetch(xrpc("memberspace.listMembers", this.asked({ limit: `${PAGE_SIZE}`, cursor })))
    )
  }

  /** Take `did` out of the writer set:  their records stay theirs, but nobody's told of them.  - throws `SpaceRefusal` */
  async removeWriter(did: string): Promise<void> {
    await answerOf(this.asMe().fetch(xrpc("space.removeWriter"), post({ space: this.uri, did })))
  }

  /** Delete the space:  no more credentials;  each member's records stay theirs, unreadable.  - throws `SpaceRefusal` */
  async delete(): Promise<void> {
    await answerOf(this.asMe().fetch(xrpc("space.deleteSpace"), post({ space: this.uri })))
    this.held = undefined
  }

  ////////////////
  // ## My own records in it
  ////////////////

  /**
   * Write my record `rkey` of `collection`, new or not.
   * - `swapRecord`:  the version it was changed from, sent as the public `putRecord`'s check is;
   *   the alpha's space `putRecord` names no such field, so a host may well ignore it (the trial asks)
   * - throws `SpaceRefusal`
   */
  async put(
    collection: string,
    rkey: string,
    record: Record<string, unknown>,
    { swapRecord }: { swapRecord?: string } = {}
  ): Promise<{ uri: string; cid: string }> {
    const repo = this.myDid()
    const asked = { space: this.uri, repo, collection, rkey, record, ...(swapRecord && { swapRecord }) }
    return answerOf(this.asMe().fetch(xrpc("space.putRecord"), post(asked)))
  }

  /**
   * Upload `bytes` as a blob of my account's, the usual way:  in no space yet, until a record of mine points to it.
   * - its host deletes one nothing points to, after a while
   * - throws `SpaceRefusal`:  `BlobTooLarge` ...
   */
  async upload(bytes: Uint8Array, mimeType: string): Promise<BlobRef> {
    const { blob } = await answerOf<{ blob: BlobRef }>(
      this.asMe().fetch("/xrpc/com.atproto.repo.uploadBlob", {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: bytes as BodyInit
      })
    )
    return blob
  }

  /**
   * Write my file record `rkey`, pointing to `blob`:  new, a replacement, or a copy of one from another space.
   * - the blob must be one I uploaded:  else `BlobNotFound`
   * - throws `SpaceRefusal`
   */
  async putFile(
    rkey: string,
    { name, blob }: { name: string; blob: BlobRef },
    collection = SPELL_FILE
  ): Promise<{ uri: string; cid: string }> {
    return this.put(collection, rkey, fileRecordFor(name, blob, collection))
  }

  /** Upload `bytes`, then write my file record `rkey` pointing to it.  - throws `SpaceRefusal` */
  async writeFile(
    rkey: string,
    { name, bytes, mimeType }: { name: string; bytes: Uint8Array; mimeType: string },
    collection = SPELL_FILE
  ): Promise<{ uri: string; cid: string; blob: BlobRef }> {
    const blob = await this.upload(bytes, mimeType)
    return { ...(await this.putFile(rkey, { name, blob }, collection)), blob }
  }

  /** Remove my record `rkey` of `collection`.  - throws `SpaceRefusal` */
  async remove(collection: string, rkey: string): Promise<void> {
    const repo = this.myDid()
    await answerOf(this.asMe().fetch(xrpc("space.deleteRecord"), post({ space: this.uri, repo, collection, rkey })))
  }

  /** Remove every record of mine in it, at once.  - throws `SpaceRefusal` */
  async clearMine(): Promise<void> {
    await answerOf(this.asMe().fetch(xrpc("space.clearRecords"), post({ space: this.uri, repo: this.myDid() })))
  }

  ////////////////
  // ## Reading anyone's, with a credential
  ////////////////

  /**
   * A credential to read the whole space, kept until a minute before it ends.
   * - signed in:  my host's delegation token goes with the ask;  nobody:  none, for a space anyone reads
   * - throws `SpaceRefusal`:  `SpaceNotFound` for someone who's no reader, as for a space that isn't there (a private space stays hidden)
   */
  async credential(): Promise<SpaceCredential> {
    if (this.held && this.held.claims.exp - CREDENTIAL_MARGIN > Date.now() / 1000) return this.held
    const key = await SpaceCredential.newKey()
    const delegationToken = this.access?.did
      ? (await answerOf<{ token: string }>(this.access.fetch(xrpc("space.getDelegationToken", this.asked())))).token
      : undefined
    const host = await this.hostOf(this.authority)
    const { credential } = await answerOf<{ credential: string }>(
      fetch(
        `${host}${xrpc("space.getSpaceCredential")}`,
        post({ space: this.uri, credentialKid: key.didKey, ...(delegationToken && { delegationToken }) })
      )
    )
    return (this.held = new SpaceCredential(credential, key))
  }

  /** Its authority's host, `https://...`, as its document names it:  never `through`.  - throws `SpaceRefusal` */
  async authorityHost(): Promise<string> {
    return hostIn(this.authority, await this.documentOf(this.authority))
  }

  /** Forget the credential in hand:  the next read asks again. */
  forgetCredential(): void {
    this.held = undefined
  }

  /** The accounts that have written into it, as its authority last heard.  - throws `SpaceRefusal` */
  async writers(): Promise<SpaceWriter[]> {
    const host = await this.hostOf(this.authority)
    return this.walk<SpaceWriter, "repos">("repos", async (cursor) =>
      fetch(`${host}${xrpc("space.listRepos", this.asked({ limit: `${PAGE_SIZE}`, cursor }))}`, {
        headers: await (await this.credential()).headersFor(this.authority)
      })
    )
  }

  /**
   * `author`'s record `rkey` of `collection`, read from their host with the credential, its MAC checked.
   * - `mac`:  `"checked"`, or `"none"` when the host sent none
   * - throws `SpaceRefusal`:  `RecordNotFound`;  `BadSpaceMac`, a MAC that isn't right
   */
  async record(author: string, collection: string, rkey: string): Promise<SpaceRecord> {
    const [host, document] = [await this.hostOf(author), await this.documentOf(author)]
    const ask = await macRequestFor("atproto-space-record")
    const response = await fetch(`${host}${xrpc("space.getRecord", this.asked({ repo: author, collection, rkey }))}`, {
      headers: { ...(await (await this.credential()).headersFor(author)), [WANT_MAC_HEADER]: ask.header }
    })
    const macHeader = response.headers.get(MAC_HEADER)
    const answer = await answerOf<{ uri: string; cid: string; value: Record<string, unknown> }>(
      Promise.resolve(response)
    )
    const mac = macIn(macHeader)
    if (!mac) return { ...answer, author, rkey, mac: "none" }
    const kem = kemKeyIn(document)
    if (!kem) throw refusalFor(502, "BadSpaceMac", `${author}'s document names no #atproto_kem key to check a MAC by`)
    const authorKey = await publicKeyOf(kem, "ECDH")
    const syncerKey = await publicKeyOf(ask.didKey, "ECDH")
    const secret = await sharedSecretFor({ ours: ask.privateKey, theirs: authorKey, syncerKey, authorKey })
    if (!sameBytes(mac, await recordMacFor(secret, answer.uri, answer.cid))) {
      throw refusalFor(502, "BadSpaceMac", `${answer.uri}:  its MAC isn't right`)
    }
    return { ...answer, author, rkey, mac: "checked" }
  }

  /** Every record of `author`'s in `collection`, read with the credential.  - throws `SpaceRefusal` */
  async records(author: string, collection: string): Promise<SpaceRecord[]> {
    const host = await this.hostOf(author)
    const listed = await this.walk<
      { collection: string; rkey: string; cid: string; value: Record<string, unknown> },
      "records"
    >("records", async (cursor) =>
      fetch(
        `${host}${xrpc("space.listRecords", this.asked({ repo: author, collection, limit: `${PAGE_SIZE}`, cursor }))}`,
        {
          headers: await (await this.credential()).headersFor(author)
        }
      )
    )
    return listed.map(({ rkey, cid, value }) => ({
      uri: `${this.uri}/${author}/${collection}/${rkey}`,
      cid,
      value,
      author,
      rkey,
      mac: "none"
    }))
  }

  /**
   * `author`'s blob `cid`, read from their host through this space, with the credential.
   * - throws `SpaceRefusal`:  `BlobNotFound` when no record of theirs in THIS space points to it
   */
  async blob(author: string, cid: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
    const host = await this.hostOf(author)
    const response = await fetch(`${host}${xrpc("space.getBlob", this.asked({ repo: author, cid }))}`, {
      headers: await (await this.credential()).headersFor(author)
    })
    // The host's no, thrown as every other
    if (!response.ok) await answerOf(Promise.resolve(response))
    const mimeType = response.headers.get("content-type") ?? "application/octet-stream"
    return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType }
  }

  /** The blobs `author`'s records in this space point to, by CID.  - throws `SpaceRefusal` */
  async blobs(author: string): Promise<string[]> {
    const host = await this.hostOf(author)
    return this.walk<string, "cids">("cids", async (cursor) =>
      fetch(`${host}${xrpc("space.listBlobs", this.asked({ repo: author, limit: `${PAGE_SIZE}`, cursor }))}`, {
        headers: await (await this.credential()).headersFor(author)
      })
    )
  }

  /**
   * `author`'s file `rkey`:  its record, MAC checked, and its blob's bytes.
   * - throws `SpaceRefusal`:  `RecordNotFound`, `BlobNotFound`;  `TypeError` for a record that's no file
   */
  async file(author: string, rkey: string, collection = SPELL_FILE): Promise<SpaceFile> {
    const record = await this.record(author, collection, rkey)
    const value = record.value as SpaceFileRecord
    const cid = value.blob?.ref?.$link
    if (!cid) throw new TypeError(`AtProtoSpace.file():  ${record.uri} names no blob;  is it a file's record?`)
    const { bytes } = await this.blob(author, cid)
    return { ...value, bytes, author, rkey, uri: record.uri, cid: record.cid }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Who it's reached as.  - throws `TypeError` for nobody */
  private asMe(): AtProtoAccess {
    if (!this.access) throw new TypeError("AtProtoSpace:  that needs someone signed in;  hand in `access`")
    return this.access
  }

  /** The DID signed in.  - throws `TypeError` for nobody */
  private myDid(): string {
    const did = this.asMe().did
    if (!did) throw new TypeError("AtProtoSpace:  nobody's signed in;  signIn() first")
    return did
  }

  /** A query naming this space, and `more`. */
  private asked(more: Record<string, string | undefined> = {}): Record<string, string> {
    const defined = Object.entries(more).filter((entry): entry is [string, string] => entry[1] !== undefined)
    return { space: this.uri, ...Object.fromEntries(defined) }
  }

  /** Every page of a list, by its cursor. */
  private async walk<Item, Field extends string>(
    field: Field,
    ask: (cursor: string | undefined) => Promise<Response>
  ): Promise<Item[]> {
    const items: Item[] = []
    let cursor: string | undefined
    do {
      const page = await answerOf<Record<Field, Item[]> & { cursor?: string }>(ask(cursor))
      items.push(...(page[field] ?? []))
      cursor = page[field]?.length ? page.cursor : undefined
    } while (cursor)
    return items
  }

  /** `did`'s document, read once. */
  private documentOf(did: string): Promise<KeyedDocument> {
    let document = this.documents.get(did)
    if (!document) {
      document = answerOf<KeyedDocument>(fetch(documentUrlFor(did, this.network.directory)))
      this.documents.set(did, document)
      document.catch(() => this.documents.delete(did))
    }
    return document
  }

  /** `did`'s host, or the address `through` reaches it by.  - throws `PlaceError` `"not found"` for one naming none */
  private async hostOf(did: string): Promise<string> {
    const host = hostIn(did, await this.documentOf(did))
    return this.through ? this.through(host) : host
  }
}

/** `AtProtoSpace`'s settings. */
export type AtProtoSpaceProps = {
  /** The space:  `at://<authority>/space/<type>/<skey>`. */
  uri: string
  /** Who it's reached as.  Left out:  nobody, for a space anyone reads. */
  access?: AtProtoAccess
  /** Where accounts' documents are.  Left out:  the real network. */
  network?: Partial<Pick<AtProtoNetwork, "directory">>
  /**
   * Reach the hosts it reads from through this address instead, as it's handed each host's own:  a pass-through
   * that keeps nothing, so a page reads a space whose hosts it can't ask itself (epic `atmosphere` P14).
   * - e.g. Spell's read proxy, `<SPACE_READS_PREFIX>/<address>/__host` (the kit's `DirectReads`)
   * - its requests are signed over the credential and the audience, never the address, so the host checks them as ever
   * - left out:  each host directly
   */
  through?: (host: string) => string
}

/** What `AtProtoSpace.create()` makes. */
export type SpaceCreation = {
  /** Its key:  a folder's name. */
  skey: string
  /** Its type.  Left out:  `SPELL_SPACE_TYPE`. */
  type?: string
  /** Who besides its members reads and writes it.  Left out:  members only. */
  settings?: SpaceSettings
  /** Where accounts' documents are.  Left out:  the real network. */
  network?: Partial<Pick<AtProtoNetwork, "directory">>
}

/** What one member may do:  a Spaces member-list entry's two flags. */
export type MemberAccess = {
  /** May they be given a credential to read it? */
  read: boolean
  /** Are their writes tracked, and told to readers? */
  write: boolean
}

/** One entry of the member list. */
export type SpaceMemberEntry = MemberAccess & {
  /** Who. */
  did: string
}

/** One account in the writer set. */
export type SpaceWriter = {
  /** Who. */
  did: string
  /** Where their repo stood, as the authority last heard. */
  repoRev: string
  /** When the space last heard of them. */
  spaceRev: string
}

/** One record read. */
export type SpaceRecord = {
  /** Its address:  `at://<authority>/space/<type>/<skey>/<author>/<collection>/<rkey>`. */
  uri: string
  /** Its version. */
  cid: string
  /** What it holds. */
  value: Record<string, unknown>
  /** Whose it is. */
  author: string
  /** Its key. */
  rkey: string
  /** Was its MAC checked?  `"none"`:  the host sent none (a list never does). */
  mac: "checked" | "none"
}

/** A blob, as a record points to it:  AT Protocol's blob ref. */
export type BlobRef = {
  /** Always `"blob"`. */
  $type: "blob"
  /** Its CID. */
  ref: { $link: string }
  /** Its type, as uploaded:  `image/png` ... */
  mimeType: string
  /** Its size, in bytes. */
  size: number
}

/** A file's record:  its name, type and size, and the blob that holds it (the guide's "A Document or Spell file is a real file"). */
export type SpaceFileRecord = {
  /** Its collection:  `SPELL_FILE`, unless said. */
  $type: string
  /** Its name, as people see it:  `MyThoughts.md`, `logo.png`. */
  name: string
  /** Its type:  its blob's. */
  mimeType: string
  /** Its size, in bytes:  its blob's. */
  size: number
  /** What holds it. */
  blob: BlobRef
}

/** One file read:  its record, and its bytes. */
export type SpaceFile = SpaceFileRecord & {
  /** What it holds. */
  bytes: Uint8Array
  /** Whose it is. */
  author: string
  /** Its record's key. */
  rkey: string
  /** Its record's address. */
  uri: string
  /** Its record's version. */
  cid: string
}

/** A space's policy, as its host holds it. */
export type SpacePolicy = {
  /** Which policy:  `MEMBERSPACE_POLICY` ... */
  $type: string
  /** Anyone may read. */
  publicRead?: boolean
  /** Anyone's writes are tracked. */
  publicWrite?: boolean
  /** The apps it hands credentials to.  Left out:  any. */
  allowedApps?: string[]
}

/** An account's document, with its keys. */
export type KeyedDocument = AccountDocument & {
  /** Its keys:  `#atproto` signs;  `#atproto_kem` agrees each record's MAC. */
  verificationMethod?: { id: string; type: string; publicKeyMultibase: string }[]
}

/** What a `SpaceRefusal` knows, under `cause`. */
export type SpaceRefusalCause = PlaceErrorCause & {
  /** The host's status. */
  status: number
  /** The host's own name for it:  `UserNotAuthorized`, `SpaceNotFound` ... */
  error: string
}

/** Thrown when a Spaces host says no;  `cause.error` is its own name for why, `cause.kind` Spell's. */
export class SpaceRefusal extends PlaceError {
  declare cause: SpaceRefusalCause | undefined
  /** The host's own name for it. */
  get error() {
    return this.cause?.error
  }
  /** The host's status. */
  get status() {
    return this.cause?.status
  }
}
SpaceRefusal.prototype.name = "SpaceRefusal"

////////////////
// ## Spell's words, as Spaces'
////////////////

/** A space's settings (P7, Q13) as a member space's policy:  the same two flags. */
export function policyFor({ publicRead, publicWrite }: SpaceSettings): SpacePolicy {
  return { $type: MEMBERSPACE_POLICY, publicRead, publicWrite }
}

/** A policy as a space's settings:  a personal space is members only, and its only member its authority. */
export function settingsFor(policy: SpacePolicy): SpaceSettings {
  if (policy.$type !== MEMBERSPACE_POLICY) return { publicRead: false, publicWrite: false }
  return { publicRead: policy.publicRead ?? false, publicWrite: policy.publicWrite ?? false }
}

/**
 * A Spell member's access as a member-list entry's two flags.
 * - `canManage` has no flag:  only the authority manages a member space, so a manager's managing stays Spell's
 *   (or, later, a group host's roles:  T31).
 */
export function memberAccessFor({ canRead, canWrite }: Pick<SpaceMember, "canRead" | "canWrite">): MemberAccess {
  return { read: canRead, write: canWrite }
}

/** A file's record, pointing to `blob`. */
export function fileRecordFor(name: string, blob: BlobRef, collection = SPELL_FILE): SpaceFileRecord {
  return { $type: collection, name, mimeType: blob.mimeType, size: blob.size, blob }
}

/** A space's three parts, from its URI.  - throws `TypeError` for one that isn't */
export function spaceRefOf(uri: string): { authority: string; type: string; skey: string } {
  const found = /^at:\/\/([^/]+)\/space\/([^/]+)\/([^/]+)$/.exec(uri)
  if (!found) throw new TypeError(`AtProtoSpace:  "${uri}" isn't a space (at://<authority>/space/<type>/<skey>)`)
  return { authority: found[1]!, type: found[2]!, skey: found[3]! }
}

/** A space's URI, from its three parts. */
export function spaceUriFor(authority: string, type: string, skey: string): string {
  return `at://${authority}/space/${type}/${skey}`
}

/** The key an account's document names for agreeing MACs, as multibase. */
export function kemKeyIn({ id, verificationMethod = [] }: KeyedDocument): string | undefined {
  return verificationMethod.find((method) => method.id === `${id}#atproto_kem` || method.id === "#atproto_kem")
    ?.publicKeyMultibase
}

/** A method's path, with its query. */
function xrpc(method: string, query?: Record<string, string>): string {
  return `/xrpc/com.atproto.${method}${query ? `?${new URLSearchParams(query)}` : ""}`
}

/** A `POST` of `body`, as JSON. */
function post(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
}

/** What `response` says, as JSON.  - throws `SpaceRefusal`, with the host's own error and message, for anything but a yes */
async function answerOf<Answer = unknown>(response: Promise<Response>): Promise<Answer> {
  const answer = await response
  const body = await answer.text()
  if (answer.ok) return (body ? JSON.parse(body) : {}) as Answer
  let said: { error?: string; message?: string } = {}
  try {
    said = JSON.parse(body) as typeof said
  } catch (ignored) {
    // not JSON:  the status says it
  }
  throw refusalFor(answer.status, said.error ?? `${answer.status}`, said.message ?? body)
}

/** A host's no, as a `SpaceRefusal`:  what isn't there `"not found"`;  who may not `"role"`;  the rest `"place"`. */
function refusalFor(status: number, error: string, message: string): SpaceRefusal {
  const kind = NOT_THERE.has(error) ? "not found" : "refused"
  const whyNot = NOT_ALLOWED.has(error) || status === 401 || status === 403 ? "role" : "place"
  return new SpaceRefusal(`${error}:  ${message}`, {
    cause: { kind, ...(kind === "refused" && { whyNot }), status, error }
  })
}
