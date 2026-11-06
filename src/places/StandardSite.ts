import type { AtProtoAccess } from "./AtProtoSignIn"
import { AtProtoPlace, type AtProtoNetwork } from "./AtProtoPlace"
import type { PlaceRow } from "./places.types"

/** The collection a Standard.site document is in:  its lexicon's id. */
export const STANDARD_SITE_DOCUMENT = "site.standard.document"

/** What the place calls that collection. */
const DOCUMENTS = "documents"

/** What a page's head says to point back at its record:  Standard.site's verification. */
export const STANDARD_SITE_LINK_REL = STANDARD_SITE_DOCUMENT

/****************
 * ### `StandardSite`
 * A web page published to AT Protocol as a Standard.site document (epic `atmosphere` P9):  a public record in an
 * atmosphere account that DESCRIBES the page and links to it, so the page itself stays where it is.
 *
 * ```ts
 * const site = new StandardSite({ signIn })
 * await site.publish("guides.atmosphere.spaces-and-spell", {
 *   site: "https://spell.example",
 *   path: "/guides/atmosphere/spaces-and-spell.html",
 *   title: "Spell and AT Protocol Spaces"
 * })
 * ```
 *
 * - Written through `AtProtoPlace`, one account's:  a public record needs no Spaces, and no server of Spell's.
 * - The record (`site.standard.document`, https://standard.site):  `site`, `path`, `title`, `description`,
 *   `publishedAt`, `updatedAt`.
 *   - `site` is a plain `https://` address:  a "loose" document, with no publication record of its own.
 *   - `site` and `path` together are the page's address.
 * - Its KEY is the caller's, the same each time:  publishing again updates the one record, keeping when it was first
 *   published and saying when it changed.
 * - Readers that verify it (Standard.site's own rule) look for the page's
 *   `<link rel="site.standard.document" href="at://...">`, which `linkTagFor()` makes.
 * - Knows nothing of guides:  `epic pages publish` reads the page and hands this its words.
 ****************/
export class StandardSite {
  /** The account it's written to, as a place. */
  readonly place: AtProtoPlace
  /** The account:  its DID. */
  readonly did: string

  /** - throws `TypeError` while nobody's signed in:  sign in first */
  constructor({ signIn, network }: StandardSiteProps) {
    if (!signIn.did) throw new TypeError("StandardSite:  nobody's signed in;  sign in before publishing")
    this.did = signIn.did
    this.place = new AtProtoPlace({
      kind: "atmosphere account",
      accounts: [signIn.did],
      collections: { [DOCUMENTS]: STANDARD_SITE_DOCUMENT },
      signIn,
      network
    })
  }

  /**
   * Publish `page` as the document under `key`:  a new one, or the one there updated.
   * - `now`:  when;  a test's own clock
   * - throws what `AtProtoPlace.apply()` throws:  `PlaceError` `"out of date"` if it changed while this ran, `"refused"`
   *   for what a record can't hold;  an ordinary `Error` for no answer
   */
  async publish(key: string, page: StandardSitePage, now = new Date()): Promise<PublishedDocument> {
    const [held] = await this.place.getMany(DOCUMENTS, [key], {})
    const at = now.toISOString()
    const document: StandardSiteDocument = {
      site: page.site.replace(/\/+$/, ""),
      title: page.title,
      ...(page.path && { path: page.path.startsWith("/") ? page.path : `/${page.path}` }),
      ...(page.description && { description: page.description }),
      publishedAt: typeof held?.publishedAt === "string" ? held.publishedAt : at,
      ...(held && { updatedAt: at })
    }
    const { rows, version } = await this.place.apply(
      [
        {
          kind: held ? "update" : "insert",
          collection: DOCUMENTS,
          id: key,
          fields: document as PlaceRow,
          ...(held && { version: this.place.versionOf(DOCUMENTS, key) })
        }
      ],
      {}
    )
    return {
      uri: StandardSite.uriOf(this.did, key),
      version: version ?? "",
      isNew: !held,
      document: rows[0] ? withoutRowFields(rows[0]) : document
    }
  }

  /** The record's `at://` address. */
  static uriOf(did: string, key: string): string {
    return `at://${did}/${STANDARD_SITE_DOCUMENT}/${key}`
  }

  /** The tag a page's `<head>` holds, so a reader can check the record is the page's own. */
  static linkTagFor(uri: string): string {
    return `<link rel="${STANDARD_SITE_LINK_REL}" href="${uri}" />`
  }

  /**
   * A record key for a page at `path`, the same each time:  `guides/atmosphere/x.html` is `guides.atmosphere.x`.
   * - throws `TypeError` for a path that leaves nothing to name it by
   */
  static keyFor(path: string): string {
    const key = path
      .replace(/^\/+/, "")
      .replace(/\.html?$/i, "")
      .replace(/[^A-Za-z0-9._:~-]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 512)
    if (!key || key === "." || key === "..") throw new TypeError(`StandardSite.keyFor():  "${path}" names no page`)
    return key
  }
}

/** A row's own fields, which aren't the record's. */
function withoutRowFields({ id: _id, owner: _owner, ...document }: PlaceRow): StandardSiteDocument {
  return document as StandardSiteDocument
}

/** `StandardSite`'s settings. */
export type StandardSiteProps = {
  /** Who it's published as:  signed in already. */
  signIn: AtProtoAccess
  /** What it reaches.  Left out:  the real network. */
  network?: Partial<AtProtoNetwork>
}

/** What's said of a page. */
export type StandardSitePage = {
  /** The site's address, `https://`, no trailing slash needed. */
  site: string
  /** The page's path on it, from its top:  `/guides/x.html`. */
  path?: string
  /** Its title. */
  title: string
  /** A summary of it. */
  description?: string
}

/** A `site.standard.document` record, as Spell writes one:  the fields it uses of the lexicon. */
export type StandardSiteDocument = {
  /** The site:  an `https://` address, or a publication's `at://`. */
  site: string
  /** The page's path on the site. */
  path?: string
  /** Its title:  500 graphemes at most. */
  title: string
  /** A summary:  3,000 graphemes at most. */
  description?: string
  /** When it was first published. */
  publishedAt: string
  /** When it last changed. */
  updatedAt?: string
}

/** What `publish()` did. */
export type PublishedDocument = {
  /** The record's `at://` address. */
  uri: string
  /** Its version now. */
  version: string
  /** It wasn't there before. */
  isNew: boolean
  /** The record as written. */
  document: StandardSiteDocument
}
