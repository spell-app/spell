/*
 * Saving for the docs' source elements (`<ui-include>`, `<ui-code>`, `<ui-markdown>`):  `UI.sources.saver`, through
 * the page server's `SPELL_SERVER.saveFile()` (`spell/server`'s live client).
 * Bundled into `spell-ui.js` by `scripts/bundle-spell-ui.js`;  side effects only.
 * - Only on a page the page server served (`window.SPELL_SERVER`):  from `file://` there's no server, so no saver,
 *   and `save()` fails with `no-saver`.
 * - `saveFile` is added by the live client (`/api/server/live.js`, deferred), so it's read when a save happens.
 * - Failures are thrown as `{ kind, message, status }` (a classic script can't import `SourceError`):  `conflict`
 *   for 409 (the file changed since it was loaded:  reload, then save again), `save` otherwise.
 * - And `UI.sources.inlineSaver`, on a page the page server may save (`SPELL_SERVER.writable`):  an element's OWN
 *   text (a `<ui-markdown>` written in the page) written back into the page's file (epic `epic-engine` P60).
 */

import { E, UI } from "spell/ui/core"

if (window.SPELL_SERVER) {
  void UI.load().then((ui) => {
    ui.sources.saver ??= saveThroughPageServer
    if (window.SPELL_SERVER.writable) ui.sources.inlineSaver ??= saveInlineThroughPageServer
  })
}

/** `UI.sources.saver`:  `{ url, text, etag, fragment }` to `SPELL_SERVER.saveFile()`, by URL path. */
async function saveThroughPageServer({ url, text, etag, fragment }) {
  const saveFile = window.SPELL_SERVER?.saveFile
  if (!saveFile) throw { kind: "no-saver", message: "the page server's live client isn't loaded" }
  const answer = await saveFile({ path: decodeURIComponent(new URL(url).pathname), text, etag, fragment })
  if (answer.ok) return { etag: answer.etag }
  const kind = answer.status === 409 || answer.status === 412 ? "conflict" : "save"
  throw { kind, message: answer.error ?? `the server said ${answer.status}`, status: answer.status }
}

/**
 * `UI.sources.inlineSaver`:  `element`'s own text, `before` as the page has it, swapped for `text` in the page's file.
 * - The nearest element with an `id` around it is read fresh from the file (`SPELL_SERVER.readElement()`), its script
 *   holding `before` found (`InlineBlocks`), its text swapped, indented as it was, its tags untouched (r52's one-line
 *   tags hold), and the element written back (`editPage()`, `shown`:  the page shows it already).
 * - The page's own script then holds the saved text too, so the page and the file agree, and a later live update
 *   patches from there.
 * - The file changed between the read and the write:  read again, once.
 * - throws `{ kind, message, status }`:  `conflict` when `before` isn't in the file (it changed there), `save` when
 *   there's no element with an id the file has, `no-saver` without the live client
 */
async function saveInlineThroughPageServer({ element, before, text }) {
  const server = window.SPELL_SERVER
  if (!server?.readElement || !server.editPage)
    throw { kind: "no-saver", message: "the page server's live client isn't loaded" }
  const script = InlineBlocks.scriptOf(element)
  if (!script) throw { kind: "save", message: `<${element.localName}>'s text isn't in a script, so it can't be saved` }
  for (let holder = element.parentElement?.closest("[id]"); holder; holder = holder.parentElement?.closest("[id]")) {
    for (let tries = 0; tries < 2; tries++) {
      const read = await server.readElement({ id: holder.id })
      // an id the runtime gave it, not the file's:  the next one out
      if (read.status === 404) break
      if (!read.ok) throw { kind: "save", message: read.error ?? `the server said ${read.status}`, status: read.status }
      const block = InlineBlocks.find(read.html, before, InlineBlocks.ordinalOf(element, holder))
      if (!block) throw { kind: "conflict", message: "this text changed in the file since the page showed it:  reload" }
      const inner = InlineBlocks.reindented(block.inner, text)
      const html = read.html.slice(0, block.start) + inner + read.html.slice(block.end)
      const answer = await server.editPage({ id: holder.id, html, etag: read.etag, shown: true })
      if (answer.ok) {
        script.text = inner
        return { etag: answer.etag }
      }
      const isStale = answer.status === 409 || answer.status === 412
      if (!isStale || tries)
        throw { kind: isStale ? "conflict" : "save", message: answer.error ?? `the server said ${answer.status}` }
    }
  }
  throw { kind: "save", message: `no element around <${element.localName}> has an id the page's file has` }
}

/****************
 * ### `InlineBlocks`
 * The text of a `<script type="text/...">` written in a page, in the page's file:  found by what it says, and swapped
 * keeping its indent.
 * - Pure, but `ordinalOf()` (the live DOM)
 ****************/
class InlineBlocks {
  /** `element`'s own text holder:  its `<script type="text/...">` child. */
  static scriptOf(element) {
    return [...element.children].find((child) => child.localName === "script" && child.type.startsWith("text/"))
  }

  /**
   * Which of the blocks saying the same as `element`'s it is, in `holder`:  `0` for the first.
   * - So two blocks with the same text are told apart by their order, as the file has them.
   */
  static ordinalOf(element, holder) {
    const text = InlineBlocks.scriptOf(element)?.text
    const same = [...holder.querySelectorAll(element.localName)].filter(
      (each) => InlineBlocks.scriptOf(each)?.text === text
    )
    return Math.max(0, same.indexOf(element))
  }

  /**
   * The `ordinal`th script in `html` whose text, dedented, is `before`:  where its text starts and ends, and its text;
   * `undefined` for none.
   */
  static find(html, before, ordinal) {
    const blocks = []
    for (const match of html.matchAll(SCRIPT_BLOCK)) {
      const inner = match[2]
      if (E.LoadableComponent.dedent(inner) !== before) continue
      const start = match.index + match[1].length
      blocks.push({ start, end: start + inner.length, inner })
    }
    return blocks[ordinal] ?? blocks[0]
  }

  /**
   * `text` laid out as `old` was:  the same blank lines before and after it (the line end after the opening tag, the
   * indent before the closing one), each line indented as `old`'s were.
   */
  static reindented(old, text) {
    const lines = old.split("\n")
    const first = lines.findIndex((line) => line.trim())
    if (first < 0) return text
    const last = lines.findLastIndex((line) => line.trim())
    const indent = lines
      .filter((line) => line.trim())
      .map((line) => line.slice(0, line.length - line.trimStart().length))
      .reduce((shortest, each) => (each.length < shortest.length ? each : shortest))
    const head = lines
      .slice(0, first)
      .map((line) => `${line}\n`)
      .join("")
    const tail = lines
      .slice(last + 1)
      .map((line) => `\n${line}`)
      .join("")
    const body = text
      .split("\n")
      .map((line) => (line.trim() ? `${indent}${line}` : ""))
      .join("\n")
    return `${head}${body}${tail}`
  }
}

/** A `<script type="text/...">` in a page's markup:  its opening tag, then its text. */
const SCRIPT_BLOCK = /(<script\b[^>]*\btype="text\/[^"]*"[^>]*>)([\s\S]*?)<\/script>/g
