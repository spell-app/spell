import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

/** The cookie it sets. */
const COOKIE_NAME = "fake_session"

/** What it signs anyone in with, what a test checks is never written down:  long enough to be a secret. */
export const FAKE_SESSION_SECRET = "s3cret-session-value-0123456789"

/****************
 * ### `FakeSignedInSite`
 * A made-up site that wants a cookie, served on this machine, for tests of signing in (epic `mockup` P12).
 * - `/login`:  a form;  posting it sets the cookie, and goes to `/`
 * - `/api/racks`:  JSON rows, one of which says the cookie back, as a careless server might
 * - `/racks`:  a page with a table, and `/notes`, a page with a list
 * - Without a good cookie, everything but `/login` redirects there, as a company site does.
 ****************/
export class FakeSignedInSite {
  /** The server. */
  private readonly server: Server = createServer((request, response) => this.answer(request, response))
  /** Are the sessions it gave out still good? */
  private isOpen = true

  /** Start it:  itself. */
  async start(): Promise<this> {
    await new Promise<void>((resolve) => this.server.listen(0, "localhost", resolve))
    return this
  }

  /** Stop it. */
  async stop(): Promise<void> {
    await new Promise((resolve) => this.server.close(resolve))
  }

  /** Where it is, with no slash at the end. */
  get address(): string {
    return `http://localhost:${(this.server.address() as AddressInfo).port}`
  }

  /** SIDE EFFECT:  every session it gave out stops working. */
  endSessions(): void {
    this.isOpen = false
  }

  /** Answer one request. */
  private answer(request: IncomingMessage, response: ServerResponse): void {
    const path = new URL(request.url!, this.address).pathname
    if (path === "/login") return this.login(request, response)
    if (!this.isOpen || !request.headers.cookie?.includes(`${COOKIE_NAME}=${FAKE_SESSION_SECRET}`)) {
      response.writeHead(302, { location: "/login" }).end()
      return
    }
    if (path === "/api/racks") {
      response.writeHead(200, { "content-type": "application/json" })
      response.end(
        JSON.stringify([
          { id: 1, name: "North", seenAs: FAKE_SESSION_SECRET },
          { id: 2, name: "South", seenAs: "" }
        ])
      )
    } else {
      response.writeHead(200, { "content-type": "text/html" })
      response.end(path === "/notes" ? NOTES_PAGE : RACKS_PAGE)
    }
  }

  /** The form, or signing in. */
  private login(request: IncomingMessage, response: ServerResponse): void {
    if (request.method === "POST") {
      response.writeHead(302, {
        location: "/",
        "set-cookie": `${COOKIE_NAME}=${FAKE_SESSION_SECRET}; Path=/; HttpOnly`
      })
      response.end()
      return
    }
    response.writeHead(200, { "content-type": "text/html" })
    response.end(`<form method="post"><button id="sign-in">Sign in</button></form>`)
  }
}

/** A page with a table, one of whose cells says the session. */
const RACKS_PAGE = `<h1>Racks</h1><table id="racks"><thead><tr><th>Name</th><th>Seen as</th></tr></thead><tbody>
<tr><td>North</td><td>${FAKE_SESSION_SECRET}</td></tr><tr><td>South</td><td>nobody</td></tr></tbody></table>`

/** A page with a list. */
const NOTES_PAGE = `<ul><li class="note">One   note</li><li class="note">Another</li></ul>`
