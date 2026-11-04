/**
 * `epic pages publish <page> --site <url> [--as <handle>] [--dry-run] [--no-link] [--json]`:  publish one guide to
 * AT Protocol, as a Standard.site document in your atmosphere account (epic `atmosphere` P9).
 * The record describes the guide and links to it:  the page stays where it is.
 *
 *     ATMOSPHERE_APP_PASSWORD=... epic pages publish guides/atmosphere/spaces-and-spell.html \
 *       --site https://spell.example --as owen.bsky.social
 *     published guides/atmosphere/spaces-and-spell.html
 *       at://did:plc:.../site.standard.document/guides.atmosphere.spaces-and-spell  (new)
 *       https://spell.example/guides/atmosphere/spaces-and-spell.html
 *     its head now points back at it:  <link rel="site.standard.document" ...>
 *
 * - What's said of the page:  its `<title>`, its description meta, and its path, from the epic folder
 *   (`guides/x.html` is `/guides/x.html` on the site).
 * - `--site <url>`:  where the guides are on the web, `https://`;  else `$SPELL_GUIDES_SITE`.
 *   The page server is this machine's, so there's no address of its own to use.
 * - Signed in with an APP PASSWORD (`AtProtoPasswordSignIn`):  `$ATMOSPHERE_APP_PASSWORD`, never a flag, so it's in no
 *   shell history;  the account by `--as <handle or DID>`, else `$ATMOSPHERE_HANDLE`.
 * - The record's key is the page's path (`StandardSite.keyFor()`):  publishing again updates it.
 * - Then the page's `<head>` gets `<link rel="site.standard.document" href="at://...">`, Standard.site's way for a reader
 *   to check the record is the page's own;  `--no-link` leaves the page alone.
 * - `--dry-run`:  the record it would write, with no sign-in and nothing written.
 * - Exits 0;  1 when the account or the network says no;  2 on a usage error.
 * - One guide, by hand:  publishing every guide by itself, and a feed of them, are left out (P9's plan).
 */
import { readFileSync, writeFileSync } from "node:fs"

import {
  AtProtoPasswordSignIn,
  STANDARD_SITE_LINK_REL,
  StandardSite,
  type AtProtoNetwork,
  type StandardSitePage
} from "spell/util/places"

import { pageFile, pagePath } from "./pages.js"

/**
 * A guide as a Standard.site page:  reading what to say of it, and pointing its head back at its record.
 * - All `static`, on the page's text:  a test checks a plain string.
 */
export class GuidePublish {
  /**
   * What's said of the page at `path`, on `site`.
   * - throws `TypeError` for a page with no `<title>`
   */
  static pageOf(html: string, path: string, site: string): StandardSitePage {
    const title = textOf(TITLE.exec(html)?.[1])
    if (!title) throw new TypeError(`GuidePublish.pageOf():  ${path} has no <title>;  publish only a docs page`)
    const description = textOf(DESCRIPTION.exec(html)?.[1])
    return { site, path: `/${path.replace(/^\/+/, "")}`, title, ...(description && { description }) }
  }

  /**
   * `html` with its head pointing at the record `uri`:  in place of an older tag, else just before `</head>`.
   * - throws `TypeError` for a page with no `<head>`
   */
  static withLink(html: string, uri: string): string {
    const tag = StandardSite.linkTagFor(uri)
    if (LINK.test(html)) return html.replace(LINK, tag)
    if (!/<\/head>/i.test(html)) throw new TypeError("GuidePublish.withLink():  the page has no <head>")
    return html.replace(/\n?(\s*)<\/head>/i, (_end, indent: string) => `\n${indent}  ${tag}\n${indent}</head>`)
  }
}

/** A page's title. */
const TITLE = /<title>([\s\S]*?)<\/title>/i

/** A page's description meta's text. */
const DESCRIPTION = /<meta\s+name="description"\s+content="([^"]*)"/i

/** The tag pointing a page at its record. */
const LINK = new RegExp(`<link\\s+rel="${STANDARD_SITE_LINK_REL}"[^>]*>`, "i")

/** The few entities a title or description holds. */
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " }

/** `raw` as plain text, its spaces run together.  `undefined`:  none. */
function textOf(raw: string | undefined): string | undefined {
  const text = raw
    ?.replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_all, name: string) => ENTITIES[name]!)
    .replace(/\s+/g, " ")
    .trim()
  return text || undefined
}

/** The exit codes. */
const EXIT = { OK: 0, FAILED: 1, USAGE: 2 } as const

/** What a test hands `run()`:  the network to reach, and the environment to read. */
export type PublishOptions = {
  /** Where accounts and hosts are.  Left out:  the real network. */
  network?: Partial<AtProtoNetwork>
  /** The environment.  Left out:  this process's. */
  env?: NodeJS.ProcessEnv
}

/**
 * `epic pages publish`'s command line (above);  resolves to its exit code.
 * - prints to stdout, a problem to stderr
 */
export async function run(args: string[], { network, env = process.env }: PublishOptions = {}): Promise<number> {
  const [page, ...extra] = args.filter((arg, at) => !arg.startsWith("--") && !VALUED.has(args[at - 1] ?? ""))
  if (!page || extra.length) return usage("which guide?  one page, e.g. guides/server.html")
  const site = valueOf(args, "--site") ?? env.SPELL_GUIDES_SITE
  if (!site || !/^https:\/\/[^/]+/.test(site)) return usage("--site <https://...>?  where the guides are on the web")

  const file = pageFile(page)
  const path = pagePath(file)
  const html = readFileSync(file, "utf8")
  const described = GuidePublish.pageOf(html, path, site)
  const key = StandardSite.keyFor(path)
  if (args.includes("--dry-run")) {
    say(args, { page: path, key, record: described }, `would publish ${path} as ${key}:\n${pretty(described)}`)
    return EXIT.OK
  }

  const who = valueOf(args, "--as") ?? env.ATMOSPHERE_HANDLE
  const password = env.ATMOSPHERE_APP_PASSWORD
  if (!who) return usage("--as <handle>?  the atmosphere account to publish as (or $ATMOSPHERE_HANDLE)")
  if (!password) return usage("$ATMOSPHERE_APP_PASSWORD?  an app password for that account, from its host's settings")
  try {
    const signIn = new AtProtoPasswordSignIn({ password, network })
    await signIn.signIn(who)
    const published = await new StandardSite({ signIn, network }).publish(key, described)
    const linked = !args.includes("--no-link")
    if (linked) writeFileSync(file, GuidePublish.withLink(html, published.uri))
    const address = `${published.document.site}${published.document.path ?? ""}`
    say(
      args,
      { page: path, ...published, address, linked },
      [
        `published ${path}`,
        `  ${published.uri}  (${published.isNew ? "new" : "updated"})`,
        `  ${address}`,
        ...(linked ? [`its head now points back at it:  ${StandardSite.linkTagFor(published.uri)}`] : [])
      ].join("\n")
    )
    return EXIT.OK
  } catch (error) {
    process.stderr.write(`epic pages publish:  ${(error as Error).message}\n`)
    return EXIT.FAILED
  }
}

/** The flags that take a value. */
const VALUED = new Set(["--site", "--as"])

/** The value after `flag`. */
function valueOf(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag)
  return at === -1 ? undefined : args[at + 1]
}

/** Print `value` as JSON with `--json`, else `text`. */
function say(args: string[], value: unknown, text: string): void {
  process.stdout.write(`${args.includes("--json") ? pretty(value) : text}\n`)
}

/** `value` as JSON, 2 spaces. */
function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

/** Says `message` on stderr;  the usage error's exit code. */
function usage(message: string): number {
  process.stderr.write(`epic pages publish:  ${message}\n`)
  return EXIT.USAGE
}

// run as a script (`epic pages publish`), not when a test imports it;  last, so every `const` above is set
if (import.meta.main) {
  process.exitCode = await run(process.argv.slice(2))
}
