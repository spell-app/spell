/**
 * A small local web server for a command's page, on `WebServer`:  `serveRoutes()`, and `folderRoute()` for a folder of
 * files under a prefix.
 * - What spell-app's `spell run` shows in a browser (`runInBrowser()`);  the next command that shows a page
 *   (`spell <x> --open`) takes it too.
 *   - It was two word-for-word copies, spell-app's and Spell UI's (`spell icon --open`, which opens the docs' icon
 *     page now), until epic `coherence` P25.
 * - `routes(path)` answers each GET:  text, a file on disk, or `undefined` for 404.  Nothing else is served.
 * - Listens on loopback only, on a free port unless told one.
 * - Opening a browser and waiting for `Ctrl-C`:  `openBrowser()` (`SPELL_NO_BROWSER=1` only prints the URL)
 *   and `untilInterrupted()`.
 */
import type { Server } from "node:http"

import { resolveInside } from "./safePath"
import { HttpError } from "./server.types"
import { WebServer } from "./WebServer"

/**
 * Start serving `routes` on loopback.
 * - resolves to its URL, e.g. `http://localhost:53122/`, and node's server
 * - `port`:  0 (the default) for any free one;  a port that's taken fails, it never moves to another
 */
export async function serveRoutes(
  routes: PathRoutes,
  { port = 0 }: { port?: number } = {}
): Promise<{ url: string; server: Server }> {
  const web = new WebServer()
  web.router.get("*", async (request, reply, next) => {
    let path: string
    try {
      path = decodeURIComponent(request.path)
    } catch {
      throw new HttpError(400, `bad path:  ${request.path}`)
    }
    const answer = await routes(path)
    if (!answer) return next()
    if ("text" in answer) return void reply.type(answer.type).set("Cache-Control", "no-store").send(answer.text)
    await reply.sendFile(answer.file, { dotfiles: "allow" })
  })
  const { port: actual } = await web.listen({ port, fallback: false })
  // `localhost`, as printed before:  the guard accepts both names
  return { url: `http://localhost:${actual}/`, server: web.server }
}

/**
 * Route serving `folder`'s files under `prefix`, e.g. `/element/` -- never anything outside `folder`.
 * - `undefined` for paths not under `prefix`, or not a file there, so routes chain with `??`
 * - `path` is already decoded (`serveRoutes()` decodes it), so it's re-encoded segment by segment for `resolveInside()`
 */
export function folderRoute(prefix: string, folder: string): (path: string) => RouteAnswer | undefined {
  return (path) => {
    if (!path.startsWith(prefix)) return undefined
    const rest = path.slice(prefix.length).split("/").map(encodeURIComponent).join("/")
    const resolved = resolveInside(folder, `/${rest}`, { index: false })
    return "file" in resolved ? { file: resolved.file } : undefined
  }
}

/** What a route answers:  text (with its type), or a file on disk. */
export type RouteAnswer = { text: string; type: string } | { file: string }

/** Answers each path, e.g. `/`, `/element/spell-viewer.js` -- `undefined` for 404. */
export type PathRoutes = (path: string) => RouteAnswer | undefined | Promise<RouteAnswer | undefined>
