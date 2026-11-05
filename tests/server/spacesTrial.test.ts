/**
 * The Spaces trial, for real (epic `atmosphere` P11):  Spell's Spaces seam against Bluesky's Spaces ALPHA,
 * on accounts Owen made there.
 * - SKIPPED unless both are set:
 *   - `SPACES_ALPHA_HANDLE`:  the first account, the test org's (`spell-test.spaces-alpha.bsky.network`)
 *   - `ATMOSPHERE_APP_PASSWORD`:  its app password
 * - With a second account too, the two-person steps run:  `SPACES_ALPHA_HANDLE_2`, `ATMOSPHERE_APP_PASSWORD_2`.
 * - `SPACES_TRIAL_LOG`:  a file each step's answer is added to, one JSON line each;  left out, the console.
 *   - Never a password or a token:  a credential is logged by its claims only.
 * - `SPACES_TRIAL_TYPE`:  the space type to make, if the alpha won't take Spell's (`app.spell.data.space`).
 * - It WRITES to the alpha:  a new space each run (`spell-trial-<time>`), records in it, then clears and deletes them.
 *   - and from P12, a public one beside it (`spell-trial-<time>-public`), and two small pictures uploaded as blobs:
 *     the blobs go once no record points to them
 * - The file steps (P12, step 7) answer the guide's four unknowns about files:
 *   uploading one into a space, copying it to a public space, whether a replaced one is cleared away, and whether the
 *   host refuses a write made from an out-of-date copy.
 * - Each step logs its answer, yes or no, then checks it:  a step that fails leaves the rest to run and log.
 *
 * ```sh
 * SPACES_ALPHA_HANDLE=spell-test.spaces-alpha.bsky.network ATMOSPHERE_APP_PASSWORD=... \
 *   SPACES_TRIAL_LOG=/tmp/spaces-trial.jsonl yarn vp test run --project server tests/server/spacesTrial.test.ts
 * ```
 */
import { appendFileSync } from "node:fs"

import { describe, expect, test } from "vite-plus/test"

import { MemoryPlace, PlaceCopy } from "spell/util/places"
import { AtProtoPasswordSignIn } from "spell/util/places/AtProtoPasswordSignIn"
import { REAL_NETWORK, documentUrlFor, hostIn } from "spell/util/places/AtProtoPlace"
import {
  AtProtoSpace,
  SPELL_FILE,
  SPELL_SPACE_TYPE,
  SpaceRefusal,
  kemKeyIn,
  type BlobRef,
  type KeyedDocument,
  type SpaceFile,
  type SpaceFileRecord
} from "spell/util/places/AtProtoSpace"
import { AtProtoSpacePlace } from "spell/util/places/AtProtoSpacePlace"

const HANDLE = process.env.SPACES_ALPHA_HANDLE
const PASSWORD = process.env.ATMOSPHERE_APP_PASSWORD
const HANDLE_2 = process.env.SPACES_ALPHA_HANDLE_2
const PASSWORD_2 = process.env.ATMOSPHERE_APP_PASSWORD_2
const LOG = process.env.SPACES_TRIAL_LOG
const TYPE = process.env.SPACES_TRIAL_TYPE ?? SPELL_SPACE_TYPE

/** The collection the trial writes. */
const RECIPE = "app.spell.data.recipe"

/** Two small pictures, 1x1 PNGs:  a first version and its replacement. */
const PICTURE = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
  (letter) => letter.charCodeAt(0)
)
const NEW_PICTURE = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="),
  (letter) => letter.charCodeAt(0)
)

/** A file read, as the log has it:  its bytes by their count, and whether they're the ones sent. */
function fileAsLogged(file: SpaceFile, sent: Uint8Array) {
  const { bytes, ...record } = file
  return {
    ...record,
    bytesRead: bytes.length,
    isSame: bytes.length === sent.length && bytes.every((b, i) => b === sent[i])
  }
}

/** Each step may take this long:  a real host, over the internet. */
const STEP_MS = 60_000

/** One step's answer, as the log has it. */
type StepAnswer = { ok: true; answer: unknown } | { ok: false; status?: number; error?: string; message: string }

/** Run `name`, and log what it answered, yes or no.  NEVER throws:  the answer says. */
async function step(name: string, run: () => Promise<unknown>): Promise<StepAnswer> {
  let answer: StepAnswer
  try {
    answer = { ok: true, answer: (await run()) ?? null }
  } catch (error) {
    const said = error instanceof SpaceRefusal ? { status: error.status, error: error.error } : {}
    answer = { ok: false, ...said, message: (error as Error).message }
  }
  const line = JSON.stringify({ at: new Date().toISOString(), step: name, ...answer })
  if (LOG) appendFileSync(LOG, `${line}\n`)
  else console.log(line)
  return answer
}

/** A step that should say yes:  its answer. */
async function yes(name: string, run: () => Promise<unknown>): Promise<unknown> {
  const answer = await step(name, run)
  expect(answer, `${name}:  ${JSON.stringify(answer)}`).toMatchObject({ ok: true })
  return (answer as { answer: unknown }).answer
}

/** A step that should say no:  its answer. */
async function no(name: string, run: () => Promise<unknown>): Promise<StepAnswer> {
  const answer = await step(name, run)
  expect(answer.ok, `${name}:  ${JSON.stringify(answer)}`).toBe(false)
  return answer
}

/** A note in the log:  a step that can't be tried. */
function note(name: string, message: string): void {
  void step(name, async () => ({ note: message }))
}

describe.skipIf(!HANDLE || !PASSWORD)("The Spaces trial, on the real alpha", { timeout: STEP_MS }, () => {
  const first = new AtProtoPasswordSignIn({ password: PASSWORD ?? "" })
  const second = new AtProtoPasswordSignIn({ password: PASSWORD_2 ?? "" })
  const hasSecond = !!HANDLE_2 && !!PASSWORD_2
  const skey = `spell-trial-${Date.now()}`
  let space: AtProtoSpace
  let asSecond: AtProtoSpace
  let site: AtProtoSpace | undefined

  test("1. the host:  describeServer, and the account's document names a MAC key", async () => {
    await step("start", async () => ({ handle: HANDLE, second: HANDLE_2 ?? null, type: TYPE, skey }))
    await yes("sign in (first account, app password)", async () => {
      await first.signIn(HANDLE!)
      return { did: first.did }
    })
    const document = (await (await fetch(documentUrlFor(first.did!, REAL_NETWORK.directory))).json()) as KeyedDocument
    const host = hostIn(first.did!, document)
    await yes("describeServer", async () => (await fetch(`${host}/xrpc/com.atproto.server.describeServer`)).json())
    expect(await yes("the document's #atproto_kem key", async () => kemKeyIn(document))).toBeTruthy()
    if (hasSecond) {
      await yes("sign in (second account, app password)", async () => {
        await second.signIn(HANDLE_2!)
        return { did: second.did }
      })
    } else note("second account", "none set:  the member steps are skipped (SPACES_ALPHA_HANDLE_2)")
  })

  test("2. the org's account makes a member space, and writes a record into it", async () => {
    await yes("createSpace (memberspace, members only)", async () => {
      space = await AtProtoSpace.create(first, { skey, type: TYPE })
      return { uri: space.uri }
    })
    await yes("getSpace", () => space.settings())
    await yes("putRecord r-1 (the org's own repo)", () => space.put(RECIPE, "r-1", { $type: RECIPE, title: "Dal" }))
    await step("listSpaces", async () => (await first.fetch("/xrpc/com.atproto.space.listSpaces")).json())
  })

  test("3. read back with a credential:  its claims, the record's MAC, the writer set", async () => {
    await yes("getSpaceCredential (as the authority)", async () => {
      const { iss, sub, cnf, exp } = (await space.credential()).claims
      return { iss, sub, cnf, minutesLeft: Math.round((exp - Date.now() / 1000) / 60) }
    })
    const record = await yes("getRecord r-1 with the credential, MAC checked", () =>
      space.record(first.did!, RECIPE, "r-1")
    )
    expect(record).toMatchObject({ value: { title: "Dal" } })
    await yes("listRecords with the credential", () => space.records(first.did!, RECIPE))
    const writers = (await yes("listRepos:  the writer set", () => space.writers())) as { did: string }[]
    expect(writers.map(({ did }) => did)).toContain(first.did)
  })

  test("4. a member:  added, reads, writes;  seen in the writer set;  removed, refused", async () => {
    if (!hasSecond) {
      note("member steps", "skipped:  one account can't be its own member, nor a non-member asking")
      return
    }
    asSecond = new AtProtoSpace({ uri: space.uri, access: second })
    await no("getSpaceCredential (second, not a member yet)", () => asSecond.credential())
    await yes("putMember (second, read and write)", () => space.putMember(second.did!, { read: true, write: true }))
    await yes("listMembers", () => space.members())
    await yes("getSpaceCredential (second, a member)", async () => (await asSecond.credential()).claims.sub)
    await yes("getRecord r-1 as the second account", () => asSecond.record(first.did!, RECIPE, "r-1"))
    await yes("putRecord a-1 (the second account's own repo)", () =>
      asSecond.put(RECIPE, "a-1", { $type: RECIPE, title: "Tacos" })
    )
    const writers = (await yes("listRepos after the member wrote", () => space.writers())) as { did: string }[]
    expect(writers.map(({ did }) => did)).toContain(second.did)
    await yes("getRecord a-1 as the org (the member's host)", () => space.record(second.did!, RECIPE, "a-1"))
    await no("putMember by the member (not the authority)", () =>
      asSecond.putMember(second.did!, { read: true, write: true })
    )

    await yes("removeMember (second)", () => space.removeMember(second.did!))
    await step("listRepos after the removal", () => space.writers())
    await step("getRecord r-1 with the second's OLD credential (good until it ends?)", () =>
      asSecond.record(first.did!, RECIPE, "r-1")
    )
    asSecond.forgetCredential()
    await no("getSpaceCredential (second, removed)", () => asSecond.credential())
  })

  test("5. publicRead:  anyone is given a credential, with no delegation token", async () => {
    await yes("updateSpace (publicRead)", () => space.changeSettings({ publicRead: true, publicWrite: false }))
    const anyone = new AtProtoSpace({ uri: space.uri })
    await yes("getSpaceCredential (nobody signed in)", async () => (await anyone.credential()).claims.sub)
    await yes("getRecord r-1 as nobody", () => anyone.record(first.did!, RECIPE, "r-1"))
    await yes("updateSpace (members only again)", () => space.changeSettings({ publicRead: false, publicWrite: false }))
  })

  test("6. the recipe box, saved to the org's space as the org, and read back", async () => {
    const box = new MemoryPlace({
      collections: {
        recipes: [
          { id: "box-1", title: "Soup", serves: 2 },
          { id: "box-2", title: "Bread", serves: 8 }
        ]
      }
    })
    const place = new AtProtoSpacePlace({ space, me: () => first.did, collections: { recipes: RECIPE } })
    await yes("PlaceCopy:  the recipe box into the space", () =>
      new PlaceCopy({ from: box, to: place }).copy("recipes")
    )
    const listed = (await yes("list the recipes back", () => place.list("recipes", {}))) as { rows: unknown[] }
    expect(listed.rows.length).toBeGreaterThanOrEqual(3)
  })

  test("7. files:  uploaded, read by a member, copied to a public space, replaced;  an out-of-date write", async () => {
    const uploaded = (await yes("uploadBlob (a picture, the org's account)", () =>
      space.upload(PICTURE, "image/png")
    )) as BlobRef
    await yes("putRecord f-1:  the file's record, pointing to the blob", () =>
      space.putFile("f-1", { name: "logo.png", blob: uploaded })
    )
    await yes("listBlobs (the org's, in the private space)", () => space.blobs(first.did!))
    const mine = (await yes("getRecord f-1 + getBlob, as the org", async () =>
      fileAsLogged(await space.file(first.did!, "f-1"), PICTURE)
    )) as { isSame: boolean }
    expect(mine.isSame).toBe(true)
    if (hasSecond) {
      await yes("putMember (second, read only, for the file)", () =>
        space.putMember(second.did!, { read: true, write: false })
      )
      asSecond.forgetCredential()
      await yes("getRecord f-1 + getBlob, as the member", async () =>
        fileAsLogged(await asSecond.file(first.did!, "f-1"), PICTURE)
      )
    } else note("file read by a member", "skipped:  no second account")

    // Publishing:  a public space, and the same blob pointed to from there
    await yes("createSpace (the public one, publicRead)", async () => {
      site = await AtProtoSpace.create(first, {
        skey: `${skey}-public`,
        type: TYPE,
        settings: { publicRead: true, publicWrite: false }
      })
      return { uri: site.uri }
    })
    const anyone = new AtProtoSpace({ uri: site!.uri })
    await no("getBlob through the public space, before any record there points to it", () =>
      anyone.blob(first.did!, uploaded.ref.$link)
    )
    const copied = await step("putRecord f-1 in the public space:  the same blob, no new upload", async () => {
      const { value } = await space.record(first.did!, SPELL_FILE, "f-1")
      return site!.putFile("f-1", value as SpaceFileRecord)
    })
    if (!copied.ok) {
      await step("FALLBACK:  the picture uploaded again, for the public space", async () =>
        site!.putFile("f-1", { name: "logo.png", blob: await site!.upload(PICTURE, "image/png") })
      )
    }
    await yes("getRecord f-1 + getBlob through the public space, as nobody", async () =>
      fileAsLogged(await anyone.file(first.did!, "f-1"), PICTURE)
    )

    // Replacing:  a new blob in the private space's record;  is the old one still read?
    const replaced = (await yes("writeFile f-1 again (a new picture) in the private space", () =>
      space.writeFile("f-1", { name: "logo.png", bytes: NEW_PICTURE, mimeType: "image/png" })
    )) as { blob: BlobRef }
    await step("listBlobs (the private space) after the replace:  the old one gone?", () => space.blobs(first.did!))
    await no("getBlob the OLD blob through the private space", () => space.blob(first.did!, uploaded.ref.$link))
    await step("getBlob the OLD blob through the public space (its record still points to it)", async () => {
      const { bytes, mimeType } = await anyone.blob(first.did!, uploaded.ref.$link)
      return { bytesRead: bytes.length, mimeType }
    })
    await step("getBlob the new blob through the private space", async () => {
      const { bytes } = await space.blob(first.did!, replaced.blob.ref.$link)
      return { bytesRead: bytes.length }
    })
    await step("putRecord f-1 in the public space too:  now nothing points to the old blob", () =>
      site!.putFile("f-1", { name: "logo.png", blob: replaced.blob })
    )
    await step("putRecord f-2 pointing to the OLD blob:  refused, once the host cleared it?", () =>
      space.putFile("f-2", { name: "old-logo.png", blob: uploaded })
    )

    // An out-of-date write:  two writes from the same old copy
    const old = (await yes("putRecord r-2 (the copy both writers start from)", () =>
      space.put(RECIPE, "r-2", { $type: RECIPE, title: "Soup" })
    )) as { cid: string }
    await yes("putRecord r-2 from that copy (swapRecord its version)", () =>
      space.put(RECIPE, "r-2", { $type: RECIPE, title: "Soup, the first change" }, { swapRecord: old.cid })
    )
    await step("putRecord r-2 from the SAME old copy:  refused?", () =>
      space.put(RECIPE, "r-2", { $type: RECIPE, title: "Soup, the second change" }, { swapRecord: old.cid })
    )
    await step("getRecord r-2:  which change stands", async () => (await space.record(first.did!, RECIPE, "r-2")).value)
  })

  test("8. clearing up:  every record cleared, both spaces deleted, and no credential after", async () => {
    if (site) {
      await step("clearRecords (the org, the public space)", () => site!.clearMine())
      await step("deleteSpace (the public one)", () => site!.delete())
    }
    if (hasSecond) await step("clearRecords (second)", () => asSecond.clearMine())
    await yes("clearRecords (the org)", () => space.clearMine())
    await yes("deleteSpace", () => space.delete())
    const answer = await no("getSpaceCredential after deleteSpace", () => space.credential())
    await step("after deleteSpace, the error is", async () => answer)
  })
})
