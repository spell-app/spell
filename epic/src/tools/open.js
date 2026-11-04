/**
 * `epic pages open [page] [--vs | --review]`:  show a page in Chrome, reusing its tab (`pages.js` `openInChrome()`).
 * - `<page>` from the checkout's root, an area, or absolute (`pages.js` `pageFile()`), e.g. `guides/solid/solid-2.html`
 *   or just `solid/solid-2.html`;  default:  the home page, `pages/index.html`
 *   - `.html` and a folder's own page may be left off:  `solid/solid-2` ~== `guides/solid/solid-2.html`,
 *     `server` ~== `guides/server.html`
 * - `--vs`:  in VS Code's right side bar instead (`openInVSCode()`), in the tab the page's kind says (epic
 *   `epic-engine` P59):  an epic page "Review", a details or choice page "Details", anything else "Epic Docs"
 *   (`/spell-docs`).  Not run from VS Code:  Chrome anyway.
 * - `--review`:  asks for the "Review" tab, for a page of no such kind (`/epic review`).  Implies `--vs`.
 * - `--hash=<id>`:  an id on the page to land on;  `--query=<query>`:  the page's query, `test=1` (`epic test`:  a
 *   test run, epic `epic-engine` P4)
 * - `<page>` may be a command run's folder, `pages/runs/<id>` (epic `epic-engine` P23):  its page, `/runs/<id>/`
 * - `<page>` may be a SHORT ADDRESS (epic `epic-workflow` P15):  `SAGA:/drawable-spell` (the saga page),
 *   `SAGA:/drawable-spell/python-target#T1` (the epic page, landing on T1)
 *   - read by `spell/epic/links`, imported only then:  `epic pages open` runs this under `tsx`, while `epic open`
 *     runs it with plain `node` and a file
 */
import { existsSync, statSync } from "node:fs"
import { basename, join } from "node:path"

import { openInChrome, openInVSCode, pageFile, runPagePath } from "./pages.js"

const args = process.argv.slice(2)
const review = args.includes("--review")
const vs = review || args.includes("--vs")
const page = args.find((arg) => !arg.startsWith("--")) ?? "index.html"
const query = valueOf("--query")
const { file, hash = valueOf("--hash") } = /^saga:\//i.test(page) ? await addressed(page) : { file: findPage(page) }
if (!file) {
  console.error(`docs:open:  no page ${page}`)
  process.exit(1)
}
if (vs) await openInVSCode(file, { hash, query, ...(review && { view: "review" }) })
else openInChrome(file, { hash, query })

/** The value of flag `--<name>=<value>`, else `undefined`. */
function valueOf(flag) {
  return args.find((arg) => arg.startsWith(`${flag}=`))?.slice(flag.length + 1) || undefined
}

/** Short address `address` as its page's file (`null` if it isn't there) and the id to land on. */
async function addressed(address) {
  const { EpicAddress } = await import("spell/epic/links")
  try {
    const target = EpicAddress.parse(address)
    return { file: findPage(target.page), hash: target.id }
  } catch (error) {
    console.error(`docs:open:  ${error.message}`)
    process.exit(1)
  }
}

/**
 * The file `page` names:  as is, plus `.html`, or a folder's own page (`<dir>/<dir>.html`);  `null` if none.
 * - a command run's folder (`pages/runs/<id>/`, the kit's `CommandRun.show()`):  the folder itself, which the openers
 *   show as its page, `/runs/<id>/` (`runPagePath()`)
 */
function findPage(page) {
  const run = pageFile(page)
  if (runPagePath(run) && existsSync(run)) return run
  for (const each of [page, `${page}.html`, join(page, `${basename(page)}.html`), join(page, "index.html")]) {
    const path = pageFile(each)
    if (existsSync(path) && statSync(path).isFile()) return path
  }
  return null
}
