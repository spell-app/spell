/**
 * A stand-in token service, for a place whose key is a short-lived token made from a secret (epic `data` P49, J263):
 * no public API makes one from a key, so the tests run this.
 * - `POST /api-keys/<key id>/token`, signed in with Basic `<key id>:<secret>`:  a new token, `tok-1`, `tok-2` ...,
 *   lasting `seconds`.  A key it doesn't know:  401.
 * - `GET /things`:  its one list, for the latest token only, `Authorization: Bearer <token>`;  any other:  401.
 * - Node only;  a test helper.
 */
import { SRV, type Handler } from "spell/server"

/** Where a token is made:  its key id in the path. */
const TOKEN_PATH = /^\/api-keys\/([^/]+)\/token$/

/** What the stand-in holds, and what it's been asked. */
export class TokenService {
  /** Each key it knows, `<key id>:<secret>`. */
  readonly keys: ReadonlySet<string>
  /** How long each token lasts, in seconds. */
  seconds: number
  /** Each token made, oldest first. */
  readonly made: string[] = []

  constructor({ keys, seconds = 3600 }: { keys: readonly string[]; seconds?: number }) {
    this.keys = new Set(keys)
    this.seconds = seconds
  }

  /** Its routes. */
  handler(): Handler {
    return async (request, reply, next) => {
      const { path, method } = request
      const asked = TOKEN_PATH.exec(path)
      if (asked && method === "POST") {
        const basic = /^Basic (.+)$/.exec(request.get("authorization") ?? "")?.[1]
        const key = basic ? Buffer.from(basic, "base64").toString() : ""
        if (!this.keys.has(key) || !key.startsWith(`${decodeURIComponent(asked[1]!)}:`))
          return void reply.status(401).json({ error: "no such key" })
        const token = `tok-${this.made.length + 1}`
        this.made.push(token)
        return void reply.json({ token, expires_in: this.seconds })
      }
      if (path === "/things" && method === "GET") {
        if (request.get("authorization") !== `Bearer ${this.made.at(-1)}`)
          return void reply.status(401).json({ error: "that token is no good" })
        return void reply.json([{ id: "t-1", name: "A thing" }])
      }
      next()
    }
  }

  /** Serve it on a free port:  its address, and what closes it. */
  async serve(): Promise<{ url: string; close: () => Promise<void> }> {
    const { createServer } = await import("node:http")
    const http = createServer(SRV.toListener(this.handler()))
    const port = await SRV.listenPreferred(http)
    return {
      url: `http://127.0.0.1:${port}`,
      close: () =>
        new Promise((done) => {
          http.closeAllConnections()
          http.close(() => done())
        })
    }
  }
}
