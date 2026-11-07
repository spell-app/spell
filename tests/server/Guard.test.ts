import type { IncomingMessage } from "node:http"
import { describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/** This run's token, as the page server hands it to its pages. */
const TOKEN = "t0k3n"

/** A request addressed to `host`, with `headers`. */
function requestTo(host: string, headers: Record<string, string> = {}): SRV.Request {
  return new SRV.Request({ method: "POST", url: "/api/places/x", headers: { host, ...headers } } as IncomingMessage)
}

describe("Guard.allowOriginPort():  writes from the editor's dev server, which passes them on (epic `language` T68)", () => {
  const guard = new SRV.Guard({ token: TOKEN }).allowPort(4747).allowOriginPort(5173)

  test("a write from the editor's origin, with the token, is let in", () => {
    for (const origin of ["http://localhost:5173", "http://127.0.0.1:5173", "http://[::1]:5173"]) {
      expect(() => guard.checkWrite(requestTo("127.0.0.1:4747", { origin, "x-server-token": TOKEN }))).not.toThrow()
    }
  })

  test("its origin only:  a request addressed to the editor's port is still an unknown host", () => {
    expect(() => guard.checkHost(requestTo("localhost:5173"))).toThrow("unknown host")
    expect(() => guard.checkHost(requestTo("localhost:4747"))).not.toThrow()
  })

  test("the token still counts:  the editor's origin without it is refused", () => {
    expect(() => guard.checkWrite(requestTo("127.0.0.1:4747", { origin: "http://localhost:5173" }))).toThrow(
      "bad token"
    )
  })

  test("any other origin is still refused, token or not", () => {
    for (const origin of ["http://localhost:5174", "https://example.com"]) {
      expect(() => guard.checkWrite(requestTo("127.0.0.1:4747", { origin, "x-server-token": TOKEN }))).toThrow(
        "wrong origin"
      )
    }
  })
})
