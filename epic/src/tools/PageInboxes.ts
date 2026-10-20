import { existsSync, readdirSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { EpicConfig } from "$/epics/config/EpicConfig"
import { GuideInbox } from "$/epics/tool/GuideInbox"
import { SeeAlso } from "$/epics/tool/SeeAlso"

import { EPIC_UI } from "../server/server.types"

/** The folders, from the content folder, whose pages take comments (`commentsRoutes.ts`). */
const COMMENT_FOLDERS = ["guides", "pages", "epics"]

/** Epic UI's folder, the engine's own (`EPIC_UI`):  its pages take comments too, in inbox files beside them. */
const EPIC_UI_DOCS = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", EPIC_UI.dir)

/** Folders under those that hold no pages of their own:  a split epic page's bodies, experiments' output. */
const SKIPPED = /(^|\/)(parts|experiments|node_modules)(\/|$)/

/** A docs page's inbox file, by its name or its old one (epic `epic-workflow` P21):  `<page>.inbox.json5`. */
const INBOX_FILE = /\.inbox\.json5?$/

/****************
 * ### `PageInboxes`
 * The docs pages' INBOX FILES (`<page>.inbox.json5` beside each page that has comments, `GuideInbox`):  where they
 * are, and which page each is for (epic `epic-engine` T9, lifted out of `GuideChanges`).
 * - the content folder's `guides/`, `pages/` and `epics/` (an epic's own pages;  never an epic page's review inbox)
 * - Epic UI's pages too (the engine's `src/docs/`, `EPIC_UI`;  epic `epic-engine` P2):  each by its served path,
 *   `components/epics/<page>` (`pageOf()`)
 * - `unowned()`:  the pages no epic owns, the standing `feedback` epic's (`SeeAlso.epicFor()`):  how `epic inbox
 *   feedback wait` hears their Send
 * - Reads files only, never writes.  Node only:  imported by path, as `SeeAlso` is.
 ****************/
export class PageInboxes {
  /** the checkout's root:  its owners (`SeeAlso`) */
  readonly root: string
  /** its repo's content folder (`EpicConfig.contentOf()`):  its `guides/`, `pages/`, `epics/` */
  readonly content: string
  /** Epic UI's folder:  the engine's `src/docs/`, or another (a test's) */
  readonly epicUi: string

  constructor({ root, epicUi = EPIC_UI_DOCS }: { root: string; epicUi?: string }) {
    this.root = root
    this.content = EpicConfig.contentOf(root)
    this.epicUi = epicUi
  }

  /**
   * The page path of inbox file `inbox`'s page:  from the content folder (`guides/x.html`), or Epic UI's as served
   * (`components/epics/epic-item.html`).
   */
  pageOf(inbox: string): string {
    const inEpicUi = relative(this.epicUi, inbox)
    const path = inEpicUi.startsWith("..") ? relative(this.content, inbox) : `${EPIC_UI.path}/${inEpicUi}`
    return path.split(sep).join("/").replace(INBOX_FILE, ".html")
  }

  /** Page path `page`'s file (`pageOf()` turned round). */
  fileOf(page: string): string {
    const epicUi = `${EPIC_UI.path}/`
    return page.startsWith(epicUi) ? join(this.epicUi, page.slice(epicUi.length)) : join(this.content, page)
  }

  /**
   * Every docs page's inbox file (`<page>.inbox.json5` beside a `<page>.html`, never an epic page's), sorted:  the
   * content folder's, then Epic UI's.
   * - by its `.json5` name, also when only its old `.json` is there (`GuideInbox.read()` reads either)
   */
  inboxFiles(): string[] {
    return [...COMMENT_FOLDERS.map((folder) => join(this.content, folder)), this.epicUi].flatMap((top) => {
      let names: string[]
      try {
        names = readdirSync(top, { recursive: true, encoding: "utf8" })
      } catch {
        return []
      }
      const pages = names
        .filter((name) => INBOX_FILE.test(name) && !SKIPPED.test(name))
        .map((name) => join(top, name.replace(INBOX_FILE, ".html")))
        .filter((page) => existsSync(page))
      return [...new Set(pages)].map((page) => GuideInbox.fileFor(page)).sort()
    })
  }

  /**
   * Every page with an inbox file that NO epic owns (`SeeAlso.ownerOf()`), as page paths, sorted:  the standing
   * `feedback` epic's pages (epic `epic-engine` T9).
   */
  unowned(): string[] {
    const owners = new SeeAlso(this.root)
    return this.inboxFiles()
      .map((inbox) => this.pageOf(inbox))
      .filter((page) => !owners.ownerOf(page))
  }
}
