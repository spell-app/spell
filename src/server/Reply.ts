import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import type { OutgoingHttpHeader, ServerResponse } from "node:http"
import { basename, isAbsolute } from "node:path"
import { createGzip } from "node:zlib"

import { acceptsEncoding, brotliCopyOf, COMPRESS_MIN_BYTES, gzipOf, gzipOfFile, isCompressible } from "./compress"
// Import directly:  through the `SRV` barrel, the Linker's HTML parser lands in spell-epic's extension (I58)
import { typeFor, typeNamed } from "./mime"

/**
 * The answer to one request:  the part of Express's `res` our handlers use, over node's `ServerResponse`.
 * - Express-shaped on purpose (`status().send()`, `set`, `type`, `json`, `sendFile`, `headersSent`),
 *   so the app's `api.ts` handlers moved over unchanged.
 * - `send()` picks a content type only when none is set:  set one first (`type()` / `set()`) to override,
 *   e.g. `sendTextFile()` serves a `.spell` file as `text/plain`.
 * - COMPRESSED on the way out, when the browser takes it (`compress.ts`;  epic `solid-2-final` P2):
 *   - `sendFile()`:  the file's brotli copy beside it (`x.js.br`), else text over 1 KB gzipped
 *   - `send()` / `json()`:  text over 1 KB gzipped
 *   - each such answer says `Vary: Accept-Encoding`;  a request that takes neither gets the body as it is
 * - `noStore()`:  the ONE way an answer says "never keep a copy" (`Cache-Control: no-store`)
 */
export class Reply {
  /** node's response, for streaming or anything not wrapped here */
  readonly raw: ServerResponse

  constructor(raw: ServerResponse) {
    this.raw = raw
  }

  /** status code so far (default 200) */
  get statusCode(): number {
    return this.raw.statusCode
  }

  /** whether headers went out already:  too late to change status or send an error */
  get headersSent(): boolean {
    return this.raw.headersSent
  }

  /** set the status code;  chainable */
  status(code: number): this {
    this.raw.statusCode = code
    return this
  }

  /**
   * Set header `name` to `value`, or every header in `headers`;  chainable.
   * - a text `Content-Type` without a charset gets `; charset=utf-8`, as Express's `res.set()` does:
   *   `text/*`, `application/json`, `application/javascript`
   */
  set(name: string, value: OutgoingHttpHeader): this
  set(headers: Record<string, OutgoingHttpHeader>): this
  set(name: string | Record<string, OutgoingHttpHeader>, value?: OutgoingHttpHeader): this {
    if (typeof name !== "string") {
      for (const [key, each] of Object.entries(name)) this.set(key, each)
      return this
    }
    if (name.toLowerCase() === "content-type" && typeof value === "string") value = withCharset(value)
    this.raw.setHeader(name, value!)
    return this
  }

  /** header `name` as set so far */
  get(name: string): OutgoingHttpHeader | undefined {
    return this.raw.getHeader(name)
  }

  /**
   * Add `name` to the `Vary` header (`Accept-Encoding`, `Sec-Fetch-Dest`):  a cache keeps one copy per value of it;
   * chainable.
   */
  vary(name: string): this {
    const now = String(this.get("Vary") ?? "")
    const names = now ? now.split(/\s*,\s*/) : []
    if (!names.some((each) => each.toLowerCase() === name.toLowerCase())) this.set("Vary", [...names, name].join(", "))
    return this
  }

  /**
   * Say "never keep a copy of this answer":  `Cache-Control: no-store`;  chainable.
   * - for answers that change from one request to the next:  the API's JSON, a page made for this request
   * - files a `StaticHandler` serves say so by its `caching` setting instead
   */
  noStore(): this {
    return this.set("Cache-Control", "no-store")
  }

  /** set the content type:  a type (`text/javascript`) or a short name (`json`, `.html`);  chainable */
  type(type: string): this {
    return this.set("Content-Type", typeNamed(type))
  }

  /**
   * Send `body` and end the response.
   * - string:  `text/html` unless a type is set (as Express)
   * - `Uint8Array` / `Buffer`:  `application/octet-stream` unless set
   * - anything else (object, array, number, boolean):  JSON, via `json()`
   * - `undefined` / `null`:  an empty body
   * - HEAD requests get the headers only
   */
  send(body?: unknown): this {
    if (body === undefined || body === null) return this.finish("")
    if (typeof body === "string") {
      if (!this.get("Content-Type")) this.type("text/html; charset=utf-8")
      return this.finish(body)
    }
    if (body instanceof Uint8Array) {
      if (!this.get("Content-Type")) this.type("application/octet-stream")
      return this.finish(body)
    }
    return this.json(body)
  }

  /** send `value` as JSON;  keeps a content type already set */
  json(value: unknown): this {
    if (!this.get("Content-Type")) this.type("application/json; charset=utf-8")
    return this.finish(JSON.stringify(value) ?? "null")
  }

  /** redirect to `location` (default 302) */
  redirect(location: string, status = 302): this {
    this.status(status).set("Location", location)
    return this.finish("")
  }

  /**
   * Stream the file at absolute `path`;  resolves when it's sent (or answered with an error).
   * - content type from the extension, unless one is set
   * - compressed when the browser takes it (the class's docstring):  its brotli copy, else gzip for text over 1 KB
   * - `dotfiles`:  what a name starting with `.` gets (only the file's own name counts, not its folders)
   *   - `"ignore"` (default, as Express's `send` without the option):  404
   *   - `"deny"`:  403
   *   - `"allow"`:  served
   * - missing file:  404 `Not found`, unless headers already went
   */
  async sendFile(path: string, { dotfiles = "ignore" }: SendFileOptions = {}): Promise<void> {
    if (!isAbsolute(path)) throw new TypeError(`sendFile():  path must be absolute:  ${path}`)
    if (basename(path).startsWith(".") && dotfiles !== "allow") {
      this.status(dotfiles === "deny" ? 403 : 404).type("text/plain; charset=utf-8")
      this.finish(dotfiles === "deny" ? "Forbidden" : "Not found")
      return
    }
    const stats = await stat(path).catch(() => undefined)
    if (!stats?.isFile()) {
      if (!this.headersSent) this.status(404).type("text/plain; charset=utf-8").finish("Not found")
      return
    }
    if (!this.get("Content-Type")) this.type(typeFor(path))
    const accepts = this.raw.req?.headers["accept-encoding"]
    const brotli = await brotliCopyOf(path, stats)
    if (brotli || this.isCompressible(stats.size)) this.vary("Accept-Encoding")
    if (brotli && acceptsEncoding(accepts, "br")) {
      this.set("Content-Encoding", "br")
      return this.stream(brotli.path, brotli.stat.size)
    }
    if (this.isCompressible(stats.size) && acceptsEncoding(accepts, "gzip")) {
      this.set("Content-Encoding", "gzip")
      const gzipped = await gzipOfFile(path, stats).catch(() => undefined)
      if (gzipped) return void this.finish(gzipped)
      return this.stream(path)
    }
    return this.stream(path, stats.size)
  }

  /** end the response with nothing more */
  end(): this {
    this.raw.end()
    return this
  }

  /** whether a body of `size` bytes, of the content type set, is worth compressing */
  private isCompressible(size: number): boolean {
    return size >= COMPRESS_MIN_BYTES && isCompressible(String(this.get("Content-Type") ?? ""))
  }

  /**
   * Stream file `path` as the body;  `size`:  its length, `undefined` when it's gzipped as it goes.
   * - HEAD gets the headers only
   */
  private async stream(path: string, size?: number): Promise<void> {
    if (size !== undefined) this.set("Content-Length", size)
    if (this.raw.req?.method === "HEAD") return void this.raw.end()
    await new Promise<void>((done) => {
      const stream = createReadStream(path)
      stream.on("error", () => {
        if (!this.headersSent) {
          this.raw.removeHeader("Content-Encoding")
          this.status(500).type("text/plain; charset=utf-8").finish("Read failed")
        } else this.raw.destroy()
        done()
      })
      stream.on("end", () => done())
      if (size === undefined) stream.pipe(createGzip()).pipe(this.raw)
      else stream.pipe(this.raw)
    })
  }

  /**
   * Write `body` with its length and end;  HEAD gets the headers only.
   * - text over 1 KB gzipped when the browser takes it, and no `Content-Encoding` is set yet
   */
  private finish(body: string | Uint8Array): this {
    if (this.raw.writableEnded) return this
    const length = typeof body === "string" ? Buffer.byteLength(body) : body.byteLength
    if (!this.get("Content-Encoding") && this.statusCode !== 204 && this.statusCode !== 304) {
      if (this.isCompressible(length)) {
        this.vary("Accept-Encoding")
        if (acceptsEncoding(this.raw.req?.headers["accept-encoding"], "gzip")) {
          this.set("Content-Encoding", "gzip")
          body = gzipOf(body)
        }
      }
    }
    this.set("Content-Length", typeof body === "string" ? Buffer.byteLength(body) : body.byteLength)
    if (this.raw.req?.method === "HEAD") this.raw.end()
    else this.raw.end(body)
    return this
  }
}

/** `type` with `; charset=utf-8` added when it's text and has none. */
function withCharset(type: string): string {
  if (/;\s*charset=/i.test(type) || !/^(text\/|application\/(json|javascript)\b)/i.test(type)) return type
  return `${type}; charset=utf-8`
}

/** How `Reply.sendFile()` treats a file whose name starts with `.`. */
export type SendFileOptions = { dotfiles?: "allow" | "deny" | "ignore" }
