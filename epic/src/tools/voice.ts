/**
 * `epic pages voice [<page>...] [--voice <name>] [--done <page>...] [--json]`:  which guides a VOICE still has to
 * go over, and the voice's file (epic `readme` P14).
 * The `/voice` skill starts from its list, rewrites each guide, then stamps it done here.
 *
 *     epic pages voice
 *     voice:  readme  /Users/owen/www/spell/epic/voices/readme.md
 *     guides/solid/solid-2.html     6120 words
 *     guides/server.html            2210 words
 *     2 guides to go over, 51 done
 *
 * - What a voice is:  the rules one kind of people-facing page is written to (`epic voice`, `EpicConfig.voiceFile()`).
 *   - `--voice <name>`:  that one;  default, the voice the repo gives guides (`EpicConfig.voiceFor("guide")`)
 * - Which pages:  `<page>`s, as `epic pages open` takes them;  none:  every guide (`guides/`)
 *   - never the guides' list page or the changelog:  one is written by `epic pages index`, the other is a record
 * - DONE:  a guide stamped with the voice in its head, `<meta name="spell-voice" content="readme 2026-10-22">`
 *   - `--done <page>...` writes the stamp, today's date, in place of an older one
 *   - a page stamped with ANOTHER voice is still to go over in this one
 * - `--all`:  the done guides too, each marked so
 * - `--json`:  `{ voice, file, pages: [{ page, file, words, done }] }`, for the skill
 * - Exits 0;  2 on a usage error, or a voice the repo doesn't have.
 * - Reads and writes the pages only:  it never rewrites a word of their text.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { localDate } from "spell/util/time.ts"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

import { GUIDES, ROOT, findPages, pageFile, pagePath } from "./pages.js"

/**
 * The voice stamp on a docs page:  reading it, writing it, and which guides lack it.
 * - All `static`:  no state, so a test checks a plain string.
 */
export class PageVoice {
  /** The voice `html` is stamped with, and when:  `{ voice: "readme", date: "2026-10-22" }`;  `undefined` unstamped. */
  static stampOf(html: string): VoiceStamp | undefined {
    const content = STAMP.exec(html)?.[1]
    if (!content) return undefined
    const [voice, date = ""] = content.trim().split(/\s+/)
    return { voice, date }
  }

  /**
   * `html` stamped with `voice` on `date`.
   * - in place of an older stamp;  else after the description meta, else just before `</head>`
   * - throws `TypeError` for a page with no `<head>` to put it in
   */
  static withStamp(html: string, { voice, date }: VoiceStamp): string {
    const meta = `<meta name="spell-voice" content="${voice} ${date}" />`
    if (STAMP.test(html)) return html.replace(STAMP, meta)
    const description = DESCRIPTION.exec(html)
    if (description) {
      const end = description.index + description[0].length
      return `${html.slice(0, end)}\n    ${meta}${html.slice(end)}`
    }
    if (!/<\/head>/i.test(html))
      throw new TypeError("PageVoice.withStamp():  the page has no <head>;  stamp only a docs page")
    return html.replace(/<\/head>/i, `  ${meta}\n  </head>`)
  }

  /** How many words of TEXT `html` holds:  no head, markup, scripts or styles. */
  static wordsIn(html: string): number {
    const text = html
      .replace(/<(head|script|style)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
    return text.split(/\s+/).filter((word) => /\w/.test(word)).length
  }

  /** Whether `file` is a guide the voice goes over:  not the guides' list page, not the changelog. */
  static isGuide(file: string): boolean {
    return !(resolve(file) === resolve(GUIDES, "index.html") || basename(file) === "changelog.html")
  }
}

/** A page's voice stamp:  the voice's name, and the day it was stamped (`2026-10-22`). */
export type VoiceStamp = { voice: string; date: string }

/** One page `epic pages voice` lists. */
export type VoicePage = {
  /** its page path, `guides/solid/solid-2.html` */
  page: string
  /** its file */
  file: string
  /** words of text in it (`PageVoice.wordsIn()`) */
  words: number
  /** stamped with this voice already */
  done: boolean
}

/** The stamp's tag, anywhere in a page;  its `content` the first group. */
const STAMP = /<meta\s+name="spell-voice"\s+content="([^"]*)"\s*\/?>/i

/** A page's description meta, which the stamp goes after:  its attributes quoted, so a `>` in its text isn't its end. */
const DESCRIPTION = /<meta\s+name="description"(?:\s+[\w-]+="[^"]*")*\s*\/?>/i

/** The exit codes. */
const EXIT = { OK: 0, USAGE: 2 } as const

/**
 * `epic pages voice`'s command line (above);  returns its exit code.
 * - prints to stdout, a usage error to stderr
 */
export function run(args: string[]): number {
  const json = args.includes("--json")
  const all = args.includes("--all")
  const voiceAt = args.indexOf("--voice")
  const doneAt = args.indexOf("--done")
  if (voiceAt !== -1 && !args[voiceAt + 1]?.match(/^[^-]/)) return usage("--voice <name>?  e.g. --voice readme")
  const config = EpicConfig.of(ROOT)
  const voice = voiceAt === -1 ? config.voiceFor("guide") : args[voiceAt + 1]
  const voiceFile = config.voiceFile(voice)
  if (!voiceFile) return usage(`no voice ${voice} here.  The voices:  ${config.voiceNames.join(", ")}`)

  const named = args.filter((arg, at) => !arg.startsWith("--") && !(voiceAt !== -1 && at === voiceAt + 1))
  if (doneAt !== -1) {
    if (!named.length) return usage("--done <page>...?  the guides to stamp")
    const date = localDate()
    for (const page of named) {
      const file = pageFile(page)
      writeFileSync(file, PageVoice.withStamp(readFileSync(file, "utf8"), { voice, date }))
      process.stdout.write(`stamped ${pagePath(file)}:  ${voice} ${date}\n`)
    }
    return EXIT.OK
  }

  const files: string[] = named.length
    ? named.map((page) => pageFile(page))
    : findPages([GUIDES]).filter(PageVoice.isGuide)
  const pages: VoicePage[] = files.map((file) => {
    const html = readFileSync(file, "utf8")
    return {
      page: pagePath(file),
      file,
      words: PageVoice.wordsIn(html),
      done: PageVoice.stampOf(html)?.voice === voice
    }
  })
  if (json) {
    process.stdout.write(`${JSON.stringify({ voice, file: voiceFile, pages }, null, 2)}\n`)
    return EXIT.OK
  }
  const shown = all ? pages : pages.filter((page) => !page.done)
  const width = Math.max(0, ...shown.map((page) => page.page.length))
  const lines = shown.map(
    (page) => `${page.page.padEnd(width)}  ${String(page.words).padStart(6)} words${page.done ? "  done" : ""}`
  )
  const left = pages.filter((page) => !page.done).length
  process.stdout.write(
    [`voice:  ${voice}  ${voiceFile}`, ...lines, `${left} guides to go over, ${pages.length - left} done`].join("\n") +
      "\n"
  )
  return EXIT.OK
}

/** Says `message` on stderr;  the usage error's exit code. */
function usage(message: string): number {
  process.stderr.write(`epic pages voice:  ${message}\n`)
  return EXIT.USAGE
}

// run as a script (`epic pages voice`), not when a test imports it;  last, so every `const` above is set
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = run(process.argv.slice(2))
}
