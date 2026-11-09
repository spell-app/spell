import type { AtProtoAccess } from "./AtProtoSignIn"

/** The collection a published Lexicon is in:  AT Protocol's own. */
export const LEXICON_SCHEMA = "com.atproto.lexicon.schema"

/****************
 * ### `LexiconSchemas`
 * Lexicons published to AT Protocol (epic `atmosphere` P10):  each a `com.atproto.lexicon.schema` record, keyed by its
 * name, in the ONE account that holds every Spell schema.
 *
 * ```ts
 * const schemas = new LexiconSchemas({ signIn })
 * await schemas.publish(lexicon)   // at://did:plc:.../com.atproto.lexicon.schema/space.spell.owen.recipes.recipe
 * LexiconSchemas.dnsRecordFor("space.spell.owen.recipes.recipe", did)
 * // => { name: "_lexicon.recipes.owen.spell.space", type: "TXT", value: "did=did:plc:..." }
 * ```
 *
 * - How another app finds one:
 *   the name's domain part (`recipes.owen.spell.space`) has a DNS record saying which account holds it,
 *   and that account has the record.
 *   The DNS records are made by hand, by whoever owns the domain.
 * - Written straight to the account's own host (`putRecord`), as the one record under its name:
 *   publishing again replaces it.
 *   - NOT through `AtProtoPlace`, whose rows' `id` is the record's key:
 *     a Lexicon's own `id` field would be dropped.
 * - A published schema's fields never change:  this writes what it's handed.  The language warns of a rename.
 * - Knows nothing of Spell's types:  `spell space lexicon publish` makes each Lexicon (`spell/parser/core`'s
 *   `lexiconFor()`) and hands it here.
 ****************/
export class LexiconSchemas {
  /** Who it's published as. */
  readonly signIn: AtProtoAccess
  /** The account:  its DID. */
  readonly did: string

  /** - throws `TypeError` while nobody's signed in:  sign in first */
  constructor({ signIn }: LexiconSchemasProps) {
    if (!signIn.did) throw new TypeError("LexiconSchemas:  nobody's signed in;  sign in before publishing")
    this.signIn = signIn
    this.did = signIn.did
  }

  /**
   * Publish `lexicon` under its own name:  a new record, or the one there replaced.
   * - throws `Error` naming the host's own words when it says no, or nothing answers
   */
  async publish(lexicon: PublishedLexicon): Promise<PublishedSchema> {
    const where = { repo: this.did, collection: LEXICON_SCHEMA, rkey: lexicon.id }
    const held = await this.signIn.fetch(`/xrpc/com.atproto.repo.getRecord?${new URLSearchParams(where)}`)
    const isNew = !held.ok
    const answer = await this.signIn.fetch("/xrpc/com.atproto.repo.putRecord", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...where, record: { $type: LEXICON_SCHEMA, ...lexicon } })
    })
    if (!answer.ok) {
      const said = (await answer.json().catch(() => ({}))) as { message?: string; error?: string }
      throw new Error(
        `LexiconSchemas.publish():  ${lexicon.id} wasn't written:  ${said.message ?? said.error ?? answer.status}`
      )
    }
    const { cid } = (await answer.json()) as { cid?: string }
    return {
      uri: LexiconSchemas.uriOf(this.did, lexicon.id),
      version: cid ?? "",
      isNew,
      dns: LexiconSchemas.dnsRecordFor(lexicon.id, this.did)
    }
  }

  /** A schema's `at://` address. */
  static uriOf(did: string, nsid: string): string {
    return `at://${did}/${LEXICON_SCHEMA}/${nsid}`
  }

  /**
   * The DNS record that says `did` holds `nsid`'s schema:  a TXT record on its domain part, `_lexicon.` first.
   * - `space.spell.owen.recipes.recipe` => `_lexicon.recipes.owen.spell.space`, `did=<did>`
   * - One for each domain part:  every type of one folder shares it.
   */
  static dnsRecordFor(nsid: string, did: string): LexiconDnsRecord {
    const authority = nsid.split(".").slice(0, -1).reverse().join(".")
    return { name: `_lexicon.${authority}`, type: "TXT", value: `did=${did}` }
  }
}

/** `LexiconSchemas`' settings. */
export type LexiconSchemasProps = {
  /** Who it's published as:  signed in already, as the account that holds the schemas. */
  signIn: AtProtoAccess
}

/** A Lexicon document, as it's published:  its name, `id`, and the rest as written. */
export type PublishedLexicon = { lexicon: number; id: string } & Record<string, unknown>

/** A DNS record to make by hand. */
export type LexiconDnsRecord = {
  /** Its name:  `_lexicon.recipes.owen.spell.space`. */
  name: string
  type: "TXT"
  /** Its value:  `did=did:plc:...`. */
  value: string
}

/** What `publish()` did. */
export type PublishedSchema = {
  /** The record's `at://` address. */
  uri: string
  /** Its version now. */
  version: string
  /** It wasn't there before. */
  isNew: boolean
  /** The DNS record that points the name at this account. */
  dns: LexiconDnsRecord
}
