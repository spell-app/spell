import { createHash } from "crypto"
import { readFileSync, statSync } from "fs"
import { join, relative, resolve } from "path"

import { readJSON5File } from "spell/util/node/json5"
import { SP } from "spell/parser/spell"
import { projectFileIn } from "spell/parser/spell/node/projectFile"
import { buildFolderFor } from "spell/app/spaces/server/node/projects/project-utils"
import { compilerVersion } from "spell/app/spaces/server/node/projects/compilerCode"

/****************
 * ### `SitePages`
 * A site built page by page (epic `editor` P46):  its FRAME, then each page alone in its file, compiled the first
 * time someone visits it, each kept in a folder of its own beside the site's build, `__pages/`.
 * - The frame:  the site compiled without its pages alone in their files (`SP.SpellProject.pagesInPlay` empty), marked
 *   with every one of them (`SP.PageChunks.withLazyPages()`), with its declarations, words and scope pack:
 *   the files a `<spell-viewer>` asks for, under the names a whole build has (`SpellUI.spell.js` ...).
 * - Each page:  its chunk, `<Class>.page.js` (`SP.PageChunks.chunkOfPage()`).
 * - Written by the cli's `SitePagesCompiler`, the child the page server keeps (spaces' `SitePagesBuild`);
 *   read here by the page server, which serves them while the site has no whole build.
 * - Out of date by what's in the files, as a whole build is (the cli's `staleBecause()`), but in two parts:
 *   - the FRAME's fingerprint, `frame.fingerprint.json`:  the compiler, each import's declarations, the project file,
 *     each file the frame compiles, and only the HEAD of each page alone in its file (`edgeHashOf()`), so editing a
 *     page's body leaves the frame as it is
 *   - each PAGE's, in `pages.fingerprint.json`:  its file, and the frame it was compiled against;
 *     a new frame makes every page out of date, each compiled again as it's next visited
 * - Read from disk alone, no parse:  every request for a site's file asks (`frameStaleBecause()`), so each file's hash
 *   is kept while its size and time stay the same.
 * - Node only;  imports nothing of the cli.
 ****************/
export class SitePages {
  /** The site's project, `@spell/guides/SpellUI`. */
  readonly projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /** The site's own folder, where its source is. */
  get projectFolder(): string {
    return SP.SpellLocation.getProjectLocation(this.projectId).serverPath
  }

  /** Where the frame and its pages are:  `__pages/` in the site's build folder. */
  get folder(): string {
    return join(buildFolderFor(this.projectFolder), PAGES_FOLDER)
  }

  /** The frame's copy of built file `name`, e.g. `SpellUI.declarations.json5`. */
  fileFor(name: string): string {
    return join(this.folder, name)
  }

  /** Page `className`'s chunk:  `ButtonUsage.page.js`. */
  chunkFor(className: string): string {
    return join(this.folder, `${className}${PAGE_CHUNK_SUFFIX}`)
  }

  /** The frame's fingerprint:  what it was compiled from. */
  get framePrintFile(): string {
    return join(this.folder, FRAME_PRINT_FILE)
  }

  /** Each page's fingerprint, by its class. */
  get pagePrintsFile(): string {
    return join(this.folder, PAGE_PRINTS_FILE)
  }

  /** The frame's fingerprint as written;  `undefined` when there's none, or it can't be read. */
  readFramePrint(): FramePrint | undefined {
    const print = readJSONOr<Partial<FramePrint>>(this.framePrintFile)
    if (typeof print?.compiler !== "string" || !print.sources || !print.imports || !print.pages) return undefined
    return print as FramePrint
  }

  /** Each page's fingerprint as written, by its class;  `{}` when there are none. */
  readPagePrints(): Record<string, PagePrint> {
    return readJSONOr<Record<string, PagePrint>>(this.pagePrintsFile) ?? {}
  }

  /**
   * Why the frame is out of date, e.g. `"Home.spell's head changed since"`;  `undefined` when it isn't.
   * - Out of date when it's not there, or anything its fingerprint holds differs now:  see the class.
   * - The project file's among its sources:  a page added or taken out changes it.
   */
  frameStaleBecause(): string | undefined {
    const print = this.readFramePrint()
    if (!print) return "no frame"
    for (const [path, hash] of Object.entries(print.sources)) {
      const now = sourceHashOf(resolve(this.projectFolder, path), hash.startsWith(EDGE) ? "alone" : "whole")
      if (now !== hash) return now ? `${path} changed since` : `${path} is gone since`
    }
    for (const [declarations, hash] of Object.entries(print.imports)) {
      if (hashOfFile(declarations) !== hash) return `${relative(this.folder, declarations)} changed since`
    }
    if (print.compiler !== compilerVersion()) return "spell's compiler changed since"
    return undefined
  }

  /**
   * Why page `className`'s chunk is out of date;  `undefined` when it isn't.
   * - Out of date when the frame is, it isn't a page of the frame's, its chunk isn't there,
   *   or its file or the frame changed since it was compiled.
   */
  pageStaleBecause(className: string): string | undefined {
    const frame = this.frameStaleBecause()
    if (frame) return frame
    const path = this.readFramePrint()!.pages[className]
    if (!path) return `no page ${className}`
    const print = this.readPagePrints()[className]
    if (!print || !statSync(this.chunkFor(className), { throwIfNoEntry: false })) return `no ${className} yet`
    if (print.frame !== hashOfFile(this.framePrintFile)) return "the frame changed since"
    if (print.source !== hashOfFile(resolve(this.projectFolder, path))) return `${path} changed since`
    return undefined
  }

  /**
   * Could project `projectId` be a site built page by page?  When its project file names a page file
   * (`SP.formOfText()`):  the cheap test, read from disk with no parse;  the cli's compiler says for sure.
   * - Kept while its project file stays the same.
   */
  static mayBeSite(projectId: string): boolean {
    const projectFolder = SP.SpellLocation.getProjectLocation(projectId).serverPath
    const projectFile = projectFileIn(projectFolder)
    if (!projectFile) return false
    const stamp = stampOf(projectFile)
    const known = SITES.get(projectFile)
    if (known && known.stamp === stamp) return known.mayBe
    let mayBe = false
    try {
      const { imports = [] } = readJSON5File<{ imports?: Array<{ path?: string; active?: boolean }> }>(projectFile)
      mayBe = imports.some(({ path = "", active }) => {
        if (active === false || !path.startsWith("/") || !path.endsWith(".spell")) return false
        return SP.formOfText(textOr(resolve(projectFolder, `.${path}`))) === "page"
      })
    } catch {
      mayBe = false
    }
    SITES.set(projectFile, { stamp, mayBe })
    return mayBe
  }
}

/**
 * What a site's frame was compiled from:  `frame.fingerprint.json` (`SitePages`).
 * - Like the cli's `BuildFingerprint`, with its pages alone in their files by their heads alone.
 */
export type FramePrint = {
  /** Spell's compiler:  `compilerVersion()` */
  compiler: string
  /** each import's declarations file, by its path on disk:  its text's hash */
  imports: Record<string, string>
  /**
   * the project file and each of its files, by path from the site's folder:  its text's hash;
   * a page alone in its file, the hash of its head (`edge:<hash>`, `sourceHashOf()`)
   */
  sources: Record<string, string>
  /** each page alone in its file, by its class:  its path from the site's folder */
  pages: Record<string, string>
}

/** What page chunk `<Class>.page.js` was compiled from (`SitePages`). */
export type PagePrint = {
  /** the frame's fingerprint file's hash, when the page compiled */
  frame: string
  /** its own file's hash */
  source: string
}

/**
 * The hash a frame's fingerprint keeps for source `path`:  of its whole text, or for a page alone in its file
 * (`"alone"`), of its HEAD alone, `edge:<hash>`;  `""` when it isn't there.
 * - A head:  the lines at the file's left edge, as `SP.alonePageName()` reads a page's name from them;
 *   everything inside a page is indented, so a change there leaves it the same.
 */
export function sourceHashOf(path: string, kind: "whole" | "alone"): string {
  if (kind === "whole") return hashOfFile(path)
  const text = textOr(path)
  if (text === undefined) return ""
  const edge = text.split("\n").filter((line) => line.trim() && line[0] !== " " && line[0] !== "\t")
  return EDGE + hashOf(edge.join("\n"))
}

/**
 * A hash of file `path`'s bytes;  `""` when it isn't there.
 * - Kept while its size and time stay the same:  a frame's every file is asked on every request for one of its files.
 */
export function hashOfFile(path: string): string {
  const stamp = stampOf(path)
  if (!stamp) return ""
  const known = HASHES.get(path)
  if (known?.stamp === stamp) return known.hash
  const hash = hashOf(readFileSync(path))
  HASHES.set(path, { stamp, hash })
  return hash
}

/** What the page server asks the cli's `SitePagesCompiler`:  a site's frame, and maybe one of its pages, by its class. */
export type SitePagesRequest = { projectId: string; page?: string }

/**
 * What the cli's `SitePagesCompiler` answers a request:  written (`built`, `mistakes`);  no page alone in its file
 * (`whole`);  no such page (`no page`);  a file changed since it read the site, so it ends to start again (`restart`);
 * its compile threw (`failed`).
 */
export type SitePagesResult = "built" | "mistakes" | "whole" | "no page" | "restart" | "failed"

/** What starts each of `SitePagesCompiler`'s answers, a line on its standard output:  then the request and `result`. */
export const SITE_PAGES_PREFIX = "spell-pages: "

/** The folder in a site's build folder where its frame and pages go. */
export const PAGES_FOLDER = "__pages"

/** End of a page chunk's file name:  `ButtonUsage.page.js`. */
export const PAGE_CHUNK_SUFFIX = ".page.js"

/** The frame's fingerprint file, in `PAGES_FOLDER`. */
const FRAME_PRINT_FILE = "frame.fingerprint.json"

/** Each page's fingerprint, in one file, in `PAGES_FOLDER`. */
const PAGE_PRINTS_FILE = "pages.fingerprint.json"

/** What starts the hash of a page's head, in a frame's fingerprint. */
const EDGE = "edge:"

////////////////
// ## Helpers
////////////////

/** Each file hashed, by its path, with the size and time it had. */
const HASHES = new Map<string, { stamp: string; hash: string }>()

/** Each project file read by `mayBeSite()`, with its stamp. */
const SITES = new Map<string, { stamp: string; mayBe: boolean }>()

/** `path`'s size and time, as one string;  `""` when it isn't a file. */
function stampOf(path: string): string {
  const stats = statSync(path, { throwIfNoEntry: false })
  return stats?.isFile() ? `${stats.mtimeMs}:${stats.size}` : ""
}

/** A hash of `data`. */
function hashOf(data: string | Buffer): string {
  return createHash("sha1").update(data).digest("hex")
}

/** File `path`'s text;  `undefined` when it can't be read. */
function textOr(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return undefined
  }
}

/** JSON file `path`, read;  `undefined` when it can't be. */
function readJSONOr<T>(path: string): T | undefined {
  const text = textOr(path)
  if (text === undefined) return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}
