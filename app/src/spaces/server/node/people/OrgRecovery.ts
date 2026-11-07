import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

import { SRV } from "spell/server"
import { ADMIN_SPACE } from "spell/app/spaces/models/spaceNames"
import type { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"

/** The record of an org's recovery codes, in its Admin space:  `@rs/__admin/recovery.json5`. */
const RECOVERY_FILE = "recovery.json5"

/** How many bytes the secret behind an org's recovery codes is:  128 bits, plenty against guessing. */
const SECRET_BYTES = 16

/** How many parts a recovery takes, unless an org says otherwise:  2 of 3 (the Spaces guide's "Who watches the Admins"). */
const PARTS_NEEDED = 2

/** Crockford's base32:  no I, L, O or U, so a code written down by hand reads back the same. */
const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** A code's letters come in groups this long, `-` between them, so a person can read one out. */
const GROUP = 4

/****************
 * ### `OrgRecovery`
 * How an org's Board takes the org back (epic `atmosphere` P21, Q15 A):  RECOVERY CODES,
 * a secret split into parts, one for each of a few people, so no one person holding it can take the org with them.
 *
 * ```ts
 * const recovery = new OrgRecovery({ people, roles })
 * const parts = await recovery.makeCodes("rs", { holders: ["ana@rs", "bo@rs", "cy@rs"] }, { by: "owen@spell" })
 * // each holder gets theirs, once:  "RS-1-7KQ2-..." ...  Spell keeps none of them
 * await recovery.recover("rs", { parts: [parts[0].code, parts[2].code], board: ["bo@rs"] }, { by: "owen@spell" })
 * ```
 *
 * - The codes:  a random secret, split so any `needed` parts of it (2 of 3, by default) make it again,
 *   and fewer tell nothing about it (Shamir's secret sharing, over bytes).
 *   - Each part is shown ONCE, as it's made, to give to its holder;  Spell keeps only the secret's hash, and who holds
 *     which part, in the org's Admin space:  `@rs/__admin/recovery.json5`.
 *   - A part reads like `RS-2-7KQ2-9XWD-...`:  the org, which part, then its bytes in base32, in groups.
 * - A RECOVERY, with enough parts:  the org's Board and Admins are named anew.
 *   - Every Board and Admins term held today ends, unless its holder is named again;  the people named get one.
 *   - So it takes the org back even from a Board gone wrong, or from an Admin who's turned against it.
 *   - The codes are SPENT:  their record goes, and the new Board makes new ones (`makeCodes()`).
 * - Both are logged in the org's log of its roles (`OrgRoles.log()`):  who asked, whose parts, who was named, why.
 * - The Board's standing right needs no codes:  the Board manages the Admin space whatever happens, so it can always
 *   name new Admins, even with none left (`OrgRoles`).
 * - Runs on Spell's own server (Q15 A):  `spell space org recover`, by a Spell admin on its machine.
 *   An org gets no AT Protocol id of its own here (Q10 A);  when one moves to Spaces, its id's rotation keys go to the
 *   same people (a todo).
 * - Node only;  knows nothing of commands or pages:  `orgCommand` asks it.
 ****************/
export class OrgRecovery {
  /** People, orgs and rosters. */
  private readonly people: PeopleStore
  /** Who manages what:  where a recovery names the new Board, and logs. */
  private readonly roles: OrgRoles

  constructor({ people, roles }: OrgRecoveryProps) {
    this.people = people
    this.roles = roles
  }

  /** Org `org`'s recovery codes as Spell keeps them:  who holds which part, and how many it takes;  none, `undefined`. */
  async codes(org: string): Promise<RecoveryCodes | undefined> {
    return readJSON5<RecoveryCodes>(this.people.storage, recoveryFile(org)).catch(() => undefined)
  }

  /**
   * SIDE EFFECT:  make org `org` new recovery codes, one part for each of `holders`, any `needed` of them enough;
   * any it had before stop working.
   * - Returns each part, to show its holder ONCE:  Spell keeps none of them.
   * - `holders`:  people in the org, by address, two or more, each once
   * - `needed`:  2 by default;  at least 2, at most one per holder
   * - throws `HttpError(404)` for an org with no Admin space;  `HttpError(400)` for holders or `needed` that make no
   *   codes;  `HttpError(403)` for a holder who isn't in the org
   */
  async makeCodes(org: string, { holders, needed = PARTS_NEEDED }: CodesAsked, why: RecoveryWhy): Promise<CodePart[]> {
    await this.rosterOrDie(org)
    if (new Set(holders).size !== holders.length) throw new SRV.HttpError(400, `name each holder once`)
    if (holders.length < 2) throw new SRV.HttpError(400, `recovery codes need two holders or more:  one alone is a key`)
    if (needed < 2 || needed > holders.length) {
      throw new SRV.HttpError(400, `a recovery takes from 2 to ${holders.length} parts, not ${needed}`)
    }
    await this.inOrgOrDie(org, holders)

    const secret = randomBytes(SECRET_BYTES)
    const shares = split(secret, holders.length, needed)
    const record: RecoveryCodes = {
      needed,
      holders: holders.map((person, index) => ({ part: index + 1, person })),
      check: hashOf(secret),
      made: new Date().toISOString()
    }
    await writeJSON5(this.people.storage, recoveryFile(org), record)
    await this.roles.logChange(org, { action: "recovery codes", by: why.by, holders, needed, why: why.why })
    return record.holders.map(({ part, person }) => ({ part, person, code: codeFor(org, part, shares[part - 1]!) }))
  }

  /**
   * SIDE EFFECT:  take org `org` back with `parts` of its recovery codes:  `board` its Board, `admins` its Admins,
   * every other Board and Admins term ended today;  the codes spent.
   * - Returns who the parts were held by.
   * - `parts`:  as many as the codes need, each a different one;  case, spaces and dashes don't matter
   * - throws `HttpError(404)` for an org with no codes;  `HttpError(400)` for too few parts, one twice, one of another
   *   org, or nobody named to the Board;  `HttpError(403)` for parts that don't make its secret, or someone named who
   *   isn't in the org
   */
  async recover(org: string, { parts, board, admins = [] }: RecoveryAsked, why: RecoveryWhy): Promise<string[]> {
    const codes = await this.codes(org)
    if (!codes) throw new SRV.HttpError(404, `@${org} has no recovery codes:  make some first`)
    const shares = parts.map((code) => shareOrDie(org, code))
    const used = new Set(shares.map(({ part }) => part))
    if (used.size !== shares.length) throw new SRV.HttpError(400, `the same part twice:  each holder's is different`)
    if (shares.length < codes.needed) {
      throw new SRV.HttpError(400, `a recovery of @${org} takes ${codes.needed} parts, not ${shares.length}`)
    }
    const holders = shares.map(({ part }) => codes.holders.find((each) => each.part === part)?.person)
    if (holders.includes(undefined) || !secretMatches(combine(shares), codes.check)) {
      throw new SRV.HttpError(403, `those parts don't make @${org}'s recovery code`)
    }
    if (!board.length) throw new SRV.HttpError(400, `name the new Board:  someone in @${org}`)
    await this.inOrgOrDie(org, [...board, ...admins])

    const named = { board: new Set(board), admins: new Set(admins) }
    const reason = { why: why.why ?? `recovered by ${why.by}` }
    for (const term of await this.roles.terms(org)) {
      if (term.role !== "board" && term.role !== "admins") continue
      if (term.person && named[term.role].has(term.person)) continue
      await this.roles.end(org, { role: term.role, person: term.person, team: term.team }, reason)
    }
    for (const person of board) await this.roles.give(org, { role: "board", person }, reason)
    for (const person of admins) await this.roles.give(org, { role: "admins", person }, reason)

    await this.people.storage.remove(recoveryFile(org))
    await this.roles.logChange(org, {
      action: "recover",
      by: why.by,
      holders: holders as string[],
      board,
      ...(admins.length ? { admins } : {}),
      why: why.why
    })
    return holders as string[]
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** - throws `HttpError(404)` for an org with no Admin space */
  private async rosterOrDie(org: string): Promise<void> {
    if (!(await this.people.roster(org))) throw new SRV.HttpError(404, `@${org} has no Admin space:  set one up first`)
  }

  /** - throws `HttpError(403)` for anyone of `people` not in org `org` */
  private async inOrgOrDie(org: string, people: string[]): Promise<void> {
    for (const who of people) {
      if (!(await this.roles.isInOrg(org, who)))
        throw new SRV.HttpError(403, `${who} isn't in @${org}:  invite them first`)
    }
  }
}

/** Constructor props of `OrgRecovery`. */
export type OrgRecoveryProps = {
  /** People, orgs and rosters. */
  people: PeopleStore
  /** Who manages what, on the same people. */
  roles: OrgRoles
}

/** Who's asking, and why:  for the log. */
export type RecoveryWhy = {
  /** Who, by address:  the Spell admin at the command line. */
  by: string
  /** Why, in their words. */
  why?: string
}

/** `makeCodes()`'s ask. */
export type CodesAsked = {
  /** Who holds a part, by address, one part each. */
  holders: string[]
  /** How many parts a recovery takes:  2 by default. */
  needed?: number
}

/** `recover()`'s ask. */
export type RecoveryAsked = {
  /** The parts given, as their holders read them out. */
  parts: string[]
  /** The new Board, by address:  at least one. */
  board: string[]
  /** The new Admins, by address:  none by default, and the Board names them later. */
  admins?: string[]
}

/** One part of an org's recovery code, as it's made:  shown once, to its holder. */
export type CodePart = {
  /** Which part:  1, 2, 3 ... */
  part: number
  /** Who holds it, by address. */
  person: string
  /** The part itself:  `RS-2-7KQ2-9XWD-...`. */
  code: string
}

/** What Spell keeps of an org's recovery codes:  never a part. */
export type RecoveryCodes = {
  /** How many parts a recovery takes. */
  needed: number
  /** Who holds which part. */
  holders: { part: number; person: string }[]
  /** The secret's SHA-256, hex:  a recovery's parts must make a secret with this hash. */
  check: string
  /** When they were made, ISO. */
  made: string
}

/** One part read back:  which part, and its bytes. */
type Share = { part: number; bytes: Uint8Array }

/** `@rs/__admin/recovery.json5`:  org `org`'s recovery codes, as Spell keeps them. */
function recoveryFile(org: string): string {
  return `@${org}/${ADMIN_SPACE}/${RECOVERY_FILE}`
}

/** `secret`'s SHA-256, hex. */
function hashOf(secret: Uint8Array): string {
  return createHash("sha256").update(secret).digest("hex")
}

/** Does `secret` hash to `check`, compared in constant time? */
function secretMatches(secret: Uint8Array, check: string): boolean {
  const made = Buffer.from(hashOf(secret), "hex")
  const kept = Buffer.from(check, "hex")
  return made.length === kept.length && timingSafeEqual(made, kept)
}

////////////////
// ## Writing a part down
////////////////

/** Part `part` of org `org`'s code, written to be read out:  `RS-2-7KQ2-9XWD-...`. */
function codeFor(org: string, part: number, bytes: Uint8Array): string {
  const letters = base32Of(bytes)
  const groups = letters.match(new RegExp(`.{1,${GROUP}}`, "g")) ?? []
  return [org.toUpperCase(), String(part), ...groups].join("-")
}

/** Part `code` read back.  - throws `HttpError(400)` for one that's no part of org `org`'s code */
function shareOrDie(org: string, code: string): Share {
  const [orgPart, partText, ...groups] = code
    .trim()
    .toUpperCase()
    .split(/[\s-]+/)
  const part = Number(partText)
  const bytes = bytesOfBase32(groups.join(""))
  if (orgPart !== org.toUpperCase() || !Number.isInteger(part) || part < 1 || part > 255 || !bytes) {
    throw new SRV.HttpError(400, `"${code}" isn't a part of @${org}'s recovery code:  it starts ${org.toUpperCase()}-`)
  }
  return { part, bytes }
}

/** `bytes` in Crockford's base32, no padding. */
function base32Of(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let text = ""
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      text += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) text += BASE32[(value << (5 - bits)) & 31]
  return text
}

/** `text` in Crockford's base32 as bytes, its O read as 0 and I or L as 1;  `undefined` for anything else. */
function bytesOfBase32(text: string): Uint8Array | undefined {
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const letter of text.replace(/O/g, "0").replace(/[IL]/g, "1")) {
    const digit = BASE32.indexOf(letter)
    if (digit < 0) return undefined
    value = ((value << 5) | digit) & 0xfff
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return bytes.length === SECRET_BYTES ? new Uint8Array(bytes) : undefined
}

////////////////
// ## Shamir's secret sharing, over bytes
////////////////

/**
 * `secret` split into `count` parts, any `needed` of which make it again (`combine()`), and fewer tell nothing:
 * each byte the constant of a random polynomial of degree `needed - 1`, each part its value at 1, 2, 3 ...
 * - Arithmetic in GF(256), AES's field:  adding is XOR, so every byte stays a byte.
 */
function split(secret: Uint8Array, count: number, needed: number): Uint8Array[] {
  const parts = Array.from({ length: count }, () => new Uint8Array(secret.length))
  for (let index = 0; index < secret.length; index++) {
    const coefficients = [secret[index]!, ...randomBytes(needed - 1)]
    for (let part = 1; part <= count; part++) {
      let y = 0
      for (let power = coefficients.length - 1; power >= 0; power--) y = multiply(y, part) ^ coefficients[power]!
      parts[part - 1]![index] = y
    }
  }
  return parts
}

/** The secret `shares` make:  each byte's polynomial at 0, by Lagrange's formula. */
function combine(shares: Share[]): Uint8Array {
  const secret = new Uint8Array(shares[0]!.bytes.length)
  for (let index = 0; index < secret.length; index++) {
    let value = 0
    for (const { part, bytes } of shares) {
      let weight = 1
      for (const other of shares)
        if (other.part !== part) weight = multiply(weight, divide(other.part, other.part ^ part))
      value ^= multiply(bytes[index]!, weight)
    }
    secret[index] = value
  }
  return secret
}

/** GF(256)'s logarithms and powers of 3, AES's generator:  `EXP[LOG[a] + LOG[b]] === a * b`. */
const { LOG, EXP } = (() => {
  const LOG = new Uint8Array(256)
  const EXP = new Uint8Array(510)
  let value = 1
  for (let power = 0; power < 255; power++) {
    EXP[power] = EXP[power + 255] = value
    LOG[value] = power
    value ^= (value << 1) ^ (value & 0x80 ? 0x11b : 0)
  }
  return { LOG, EXP }
})()

/** `a * b` in GF(256). */
function multiply(a: number, b: number): number {
  return a && b ? EXP[LOG[a]! + LOG[b]!]! : 0
}

/** `a / b` in GF(256), `b` never 0. */
function divide(a: number, b: number): number {
  return a ? EXP[LOG[a]! + 255 - LOG[b]!]! : 0
}
