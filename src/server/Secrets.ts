import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** Sets where secrets are kept, e.g. a test's temporary folder. */
export const SECRETS_FOLDER_SETTING = "SPELL_SECRETS_DIR"

/****************
 * ### `Secrets`
 * The secrets you've typed in once, a token or a key, kept on this machine by name (epic `epic-engine` P78):
 * so a command in a new terminal finds `NETBOX_TOKEN` without an `export`.
 *
 * ```ts
 * const secrets = new Secrets()
 * secrets.keep("NETBOX_TOKEN", token)     // a runbook's secret ask does this
 * secrets.named("NETBOX_TOKEN")           // the environment's first, else the one kept
 * ```
 *
 * - One file a secret, `~/.spell/secrets/<NAME>`, holding only the secret:  beside the place sign-ins
 *   (`PlaceSessions`), and NEVER in a repo.
 *   - Only its owner can read it (the file's mode 600, the folder's 700), written beside and moved in.
 * - The environment comes first:  `export NETBOX_TOKEN=...` still wins, for one terminal.
 * - Who reads it:  the place keys (`PlaceKeys`, the page server's), `spell place ingest | verify`, and a runbook's walk.
 * - Never prints:  turned to JSON or a string, it's only the names.
 * - Its position:  node's own modules only.
 ****************/
export class Secrets {
  /** The folder the secrets are in. */
  readonly folder: string
  /** Where a secret is looked for first. */
  private readonly environment: Readonly<Record<string, string | undefined>>

  constructor({ folder, environment = process.env }: SecretsProps = {}) {
    this.folder = folder ?? environment[SECRETS_FOLDER_SETTING] ?? join(homedir(), ".spell", "secrets")
    this.environment = environment
  }

  /**
   * The secret by this name:  the environment's, else the one kept here;  `undefined` when neither has it.
   * - An arrow, so it's handed on as it is (`keyNamed: secrets.named`).
   * - NEVER throws:  a name that can't be one is never kept.
   */
  named = (name: string): string | undefined => this.environment[name] || this.kept(name)

  /**
   * The environment, with the secrets kept here behind it:  for what reads its keys from a record
   * (`PlaceKeys`' `from`, `AuthenticatedPlaces`').
   * - Read as it's asked, so a secret kept later is found.
   */
  withEnvironment(): Readonly<Record<string, string | undefined>> {
    return new Proxy({} as Record<string, string | undefined>, {
      get: (_target, name) => (typeof name === "string" ? this.named(name) : undefined),
      has: (_target, name) => typeof name === "string" && this.named(name) !== undefined
    })
  }

  /** The secret kept here by this name, not looking at the environment;  `undefined` when there's none. */
  kept(name: string): string | undefined {
    if (!SECRET_NAME.test(name)) return undefined
    const file = join(this.folder, name)
    if (!existsSync(file)) return undefined
    return readFileSync(file, "utf8").trim() || undefined
  }

  /**
   * SIDE EFFECT:  keeps `secret` under `name`, replacing what was, its file private from its first byte.
   * - throws `TypeError` for a name that isn't one, or an empty secret
   */
  keep(name: string, secret: string): void {
    const file = this.fileOf(name)
    if (!secret.trim()) throw new TypeError(`Secrets.keep():  ${name} was empty:  there's nothing to keep`)
    mkdirSync(this.folder, { recursive: true, mode: PRIVATE_FOLDER })
    chmodSync(this.folder, PRIVATE_FOLDER)
    const writing = `${file}.${process.pid}.writing`
    writeFileSync(writing, `${secret.trim()}\n`, { mode: PRIVATE_FILE })
    renameSync(writing, file)
  }

  /** SIDE EFFECT:  the secret kept under `name` is gone;  whether there was one.  - throws `TypeError` for a bad name */
  forget(name: string): boolean {
    const file = this.fileOf(name)
    if (!existsSync(file)) return false
    rmSync(file)
    return true
  }

  /** The names of the secrets kept here, sorted. */
  names(): string[] {
    if (!existsSync(this.folder)) return []
    return readdirSync(this.folder)
      .filter((name) => SECRET_NAME.test(name))
      .sort()
  }

  /** Only the names. */
  toJSON(): string[] {
    return this.names()
  }

  /** Only the names. */
  toString(): string {
    return `Secrets(${this.names().join(", ")})`
  }

  /** Only the names, for `console.log()`. */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.toString()
  }

  /** The file of the secret `name`.  - throws `TypeError` for a name that isn't one */
  private fileOf(name: string): string {
    if (!SECRET_NAME.test(name)) {
      throw new TypeError(`Secrets:  "${name}" won't do as a secret's name:  letters, digits and _, as NETBOX_TOKEN`)
    }
    return join(this.folder, name)
  }
}

/**
 * `text`, with each secret in it replaced by its name:  `[the key NETBOX_TOKEN]`.
 * - `secrets`:  each secret by its name;  an empty one is left alone
 * - `word`:  what the name is called, `key` by default (the page server's place keys);  `secret` for a runbook's
 * - As written in JSON too:  a secret with a line end in it doesn't look like itself inside an answer.
 * - The one way Spell takes secrets out of what it shows:  `PlaceKeys.scrubbed()`, a runbook's command output.
 */
export function scrubbed(
  text: string,
  secrets: Iterable<readonly [name: string, secret: string]>,
  { word = "key" }: { word?: string } = {}
): string {
  let clean = text
  for (const [name, secret] of secrets) {
    if (!secret) continue
    const inJson = JSON.stringify(secret).slice(1, -1)
    clean = clean.replaceAll(secret, `[the ${word} ${name}]`).replaceAll(inJson, `[the ${word} ${name}]`)
  }
  return clean
}

/** Constructor props of `Secrets`. */
export type SecretsProps = {
  /** where they're kept;  default `SPELL_SECRETS_DIR`, else `~/.spell/secrets` */
  folder?: string
  /** where a secret is looked for first;  default the environment */
  environment?: Readonly<Record<string, string | undefined>>
}

/** A secret's name:  an environment variable's, so a command finds it there too. */
const SECRET_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Only this person, on this machine. */
const PRIVATE_FILE = 0o600

/** Only this person, on this machine. */
const PRIVATE_FOLDER = 0o700
