import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import { PASSWORD_LEAST, PASSWORD_MOST, SignInError } from "./signIn.types"

/** Scrypt's settings for a new password:  OWASP's for this memory.  Each password keeps its own, so these can rise. */
const COST = { N: 32_768, r: 8, p: 3 }

/** The memory scrypt may take, bytes:  the default is just under what `COST` needs. */
const MOST_MEMORY = 256 * 1024 * 1024

/** A salt's bytes, and a hash's. */
const SALT_BYTES = 16
const HASH_BYTES = 32

/** One account's password, as it's kept:  only the hash, and what it takes to make it again. */
type KeptPassword = typeof COST & {
  /** Its random salt, as hex. */
  salt: string
  /** Its scrypt hash, as hex. */
  hash: string
}

/** Stands in for a password nobody has, so someone with none takes as long as someone with a wrong one. */
const NOBODYS: KeptPassword = { ...COST, salt: "00".repeat(SALT_BYTES), hash: "00".repeat(HASH_BYTES) }

/****************
 * ### `Passwords`
 * Each account's password, kept only as a slow hash (epic `atmosphere` T64).
 *
 * - scrypt, from node, with a random salt per password;  compared in constant time.
 * - Kept in `file`, by account, readable by this machine's person only:  beside the signed-in devices,
 *   so never in a person's own file, nor anywhere a space's export or backup reaches.
 * - `matches()` takes about as long for an account with no password, or nobody at all.
 * - Passwords are used as typed, spaces included;  only Unicode's different spellings of one letter are made the same.
 * - NEVER logs a password, nor puts one in an error.
 * - Knows no people or HTTP:  `SignIns` holds it.
 ****************/
export class Passwords {
  /** Where they're kept;  left out:  memory only. */
  private readonly file: string | undefined
  /** Each account's. */
  private readonly kept = new Map<string, KeptPassword>()

  constructor({ file }: { file?: string } = {}) {
    this.file = file
    this.read()
  }

  /** Does `account` have a password? */
  has(account: string): boolean {
    return this.kept.has(account)
  }

  /**
   * Keep `password` as `account`'s, in place of any it had.
   * - throws `SignInError` `"bad password"` for one too short or too long
   */
  async set(account: string, password: string): Promise<void> {
    const typed = sameSpelling(password)
    if (typed.length < PASSWORD_LEAST || typed.length > PASSWORD_MOST) {
      throw new SignInError(`A password takes at least ${PASSWORD_LEAST} characters, and at most ${PASSWORD_MOST}.`, {
        cause: { kind: "bad password" }
      })
    }
    const salt = randomBytes(SALT_BYTES)
    this.kept.set(account, {
      ...COST,
      salt: salt.toString("hex"),
      hash: (await hashOf(typed, salt, COST)).toString("hex")
    })
    this.write()
  }

  /**
   * Is `password` `account`'s?
   * - No such account, or no password yet:  no, in about the same time.
   * - NEVER throws.
   */
  async matches(account: string | undefined, password: string): Promise<boolean> {
    const kept = (account !== undefined && this.kept.get(account)) || NOBODYS
    const typed = sameSpelling(password).slice(0, PASSWORD_MOST + 1)
    const hash = await hashOf(typed, Buffer.from(kept.salt, "hex"), kept)
    return timingSafeEqual(hash, Buffer.from(kept.hash, "hex")) && kept !== NOBODYS && typed.length <= PASSWORD_MOST
  }

  /** Every password, from `file`.  NEVER throws:  one that won't read is nobody's password, and said. */
  private read(): void {
    if (!this.file || !existsSync(this.file)) return
    try {
      const kept = JSON.parse(readFileSync(this.file, "utf8")) as Record<string, KeptPassword>
      for (const [account, password] of Object.entries(kept)) this.kept.set(account, password)
    } catch (ignored) {
      console.error(`Passwords:  ${this.file} won't read, so no password works`, (ignored as Error).message)
    }
  }

  /** SIDE EFFECT:  every password, to `file`, all at once, readable by this machine's person only. */
  private write(): void {
    if (!this.file) return
    mkdirSync(dirname(this.file), { recursive: true })
    const temp = `${this.file}.${process.pid}.tmp`
    writeFileSync(temp, `${JSON.stringify(Object.fromEntries(this.kept), null, 2)}\n`, { mode: 0o600 })
    renameSync(temp, this.file)
  }
}

/** `password` with Unicode's spellings of one letter made the same:  a phone and a laptop can type it differently. */
function sameSpelling(password: string): string {
  return password.normalize("NFKC")
}

/** `password`'s scrypt hash.  - throws only if scrypt itself can't run */
function hashOf(password: string, salt: Buffer, { N, r, p }: typeof COST): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, HASH_BYTES, { N, r, p, maxmem: MOST_MEMORY }, (error, hash) =>
      error ? reject(error) : resolve(hash)
    )
  })
}
