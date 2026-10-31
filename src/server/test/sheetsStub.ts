/**
 * A stub of Google's Sheets API, and its token endpoint, for `GoogleSheetPlace`'s tests (epic `data` P7).
 * - Fair to what Google's docs say, checked 2026-10-31:
 *   - no token, or one it didn't give out:  401
 *   - a signed request for a token, checked against the service account's real public key
 *   - a tab's values leave off trailing blanks, and blank rows at the end
 *   - a `batchUpdate` is all or none:  one bad request, and nothing's applied
 *   - indexes from zero, ends not included;  deletes shift what's below them
 * - A limit hit is by hand (`limitNext()`), with or without a `retry-after`.
 * - Node only;  a test helper.
 */
import { createVerify, generateKeyPairSync } from "node:crypto"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

/** One tab of the stub's spreadsheet. */
export type StubTab = {
  /** Its number. */
  sheetId: number
  /** Its cells, row by row. */
  cells: unknown[][]
}

/** The one token it gives out. */
const STUB_TOKEN = "stub-access-token"

/** Its private key is only ever generated once:  they're slow to make. */
const KEY_PAIR = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
})

/****************
 * ### `SheetsStub`
 * One spreadsheet, on a free port.
 ****************/
export class SheetsStub {
  /** Its tabs, by title. */
  readonly tabs = new Map<string, StubTab>()
  /** Each request it's had, oldest first:  method and path. */
  readonly asks: { method: string; path: string; body?: unknown }[] = []
  /** The next few requests are answered 429. */
  private limited: { times: number; retryAfter?: string | undefined } = { times: 0 }
  /** Answer every request with this status. */
  answerAll: number | undefined
  /** How many tokens it gave out. */
  tokensGiven = 0
  /** Where it is, once `start()` says. */
  private port = 0
  /** Its server. */
  private readonly server = createServer((request, reply) => void this.answer(request, reply))

  /** Listen on a free port. */
  async start(): Promise<this> {
    await new Promise<void>((done) => this.server.listen(0, "127.0.0.1", done))
    this.port = (this.server.address() as { port: number }).port
    return this
  }

  /** Stop. */
  stop(): Promise<void> {
    return new Promise((done) => {
      this.server.closeAllConnections()
      this.server.close(() => done())
    })
  }

  /** The address a place is told. */
  get url(): string {
    return `http://127.0.0.1:${this.port}/v4/spreadsheets`
  }

  /** A key file, as Google gives one, as JSON. */
  get keyFile(): string {
    return JSON.stringify({
      client_email: "demo@example.iam.gserviceaccount.com",
      private_key: KEY_PAIR.privateKey,
      token_uri: `http://127.0.0.1:${this.port}/token`
    })
  }

  /** Answer the next `times` requests with a 429, saying `retryAfter`, if it's given. */
  limitNext(times: number, retryAfter?: string): void {
    this.limited = { times, retryAfter }
  }

  /** The requests other than for tokens, by what they are. */
  asksOf(pathEnd: RegExp): number {
    return this.asks.filter(({ path }) => pathEnd.test(path)).length
  }

  ////////////////
  // ## Answering
  ////////////////

  /** One request. */
  private async answer(request: IncomingMessage, reply: ServerResponse): Promise<void> {
    const url = new URL(request.url!, "http://stub")
    const path = decodeURIComponent(url.pathname)
    const text = await textOf(request)
    if (path === "/token") return this.giveToken(text, reply)
    const body = text ? (JSON.parse(text) as unknown) : undefined
    this.asks.push({ method: request.method!, path, ...(body !== undefined && { body }) })
    if (this.limited.times > 0) {
      this.limited.times--
      const { retryAfter } = this.limited
      return send(
        reply,
        429,
        { error: { message: "Too many requests" } },
        retryAfter ? { "retry-after": retryAfter } : {}
      )
    }
    if (this.answerAll) return send(reply, this.answerAll, { error: { message: "no" } })
    if (request.headers.authorization !== `Bearer ${STUB_TOKEN}`)
      return send(reply, 401, { error: { message: "who?" } })
    const [, , , what, ...rest] = path.split("/")
    if (what?.endsWith(":batchUpdate")) return this.batchUpdate(body as BatchUpdate, reply)
    if (what && rest[0] === "values") return this.values(rest[1]!, url, reply)
    if (what) return this.spreadsheet(reply)
    return send(reply, 404, { error: { message: "no such thing" } })
  }

  /** `POST /token`:  a real check of the signed request. */
  private giveToken(text: string, reply: ServerResponse): void {
    const form = new URLSearchParams(text)
    const [header, claims, signature] = (form.get("assertion") ?? "").split(".")
    const isSigned = createVerify("RSA-SHA256")
      .update(`${header}.${claims}`)
      .verify(KEY_PAIR.publicKey, signature ?? "", "base64url")
    if (!isSigned || form.get("grant_type") !== "urn:ietf:params:oauth:grant-type:jwt-bearer") {
      return send(reply, 400, { error: "invalid_grant" })
    }
    this.tokensGiven++
    return send(reply, 200, { access_token: STUB_TOKEN, expires_in: 3600, token_type: "Bearer" })
  }

  /** `GET .../values/{range}`:  a whole tab, trailing blanks left off. */
  private values(range: string, url: URL, reply: ServerResponse): void {
    const title = range.replace(/^'|'$/g, "").replaceAll("''", "'")
    const tab = this.tabs.get(title)
    if (!tab) return send(reply, 400, { error: { message: `Unable to parse range: ${range}` } })
    const asFormatted = url.searchParams.get("valueRenderOption") !== "UNFORMATTED_VALUE"
    const values = withoutTrailingBlanks(tab.cells).map((row) =>
      row.map((cell) => (asFormatted ? `${cell as string}` : cell))
    )
    return send(reply, 200, { range, majorDimension: "ROWS", ...(values.length && { values }) })
  }

  /** `GET .../{spreadsheet}`:  its tabs.  Tab 0 has no `sheetId`, as Google's JSON leaves out zeroes. */
  private spreadsheet(reply: ServerResponse): void {
    const sheets = [...this.tabs].map(([title, { sheetId }]) => ({
      properties: { title, ...(sheetId && { sheetId }) }
    }))
    send(reply, 200, { sheets })
  }

  /** `POST .../{spreadsheet}:batchUpdate`:  all or none. */
  private batchUpdate({ requests }: BatchUpdate, reply: ServerResponse): void {
    const saved = [...this.tabs].map(([title, tab]) => [title, structuredClone(tab.cells)] as const)
    try {
      for (const request of requests) this.applyRequest(request)
    } catch (error) {
      for (const [title, cells] of saved) this.tabs.get(title)!.cells = cells
      return send(reply, 400, { error: { message: (error as Error).message } })
    }
    send(reply, 200, { replies: requests.map(() => ({})) })
  }

  /** One request of a batch.  - throws for one Google would refuse */
  private applyRequest({ updateCells, appendCells, deleteDimension }: BatchRequest): void {
    if (updateCells) {
      const { sheetId, rowIndex, columnIndex } = updateCells.start
      const { cells } = this.tabNumbered(sheetId)
      const row = (cells[rowIndex] ??= [])
      row[columnIndex] = valueOf(updateCells.rows[0]!.values[0]!)
    } else if (appendCells) {
      const { cells } = this.tabNumbered(appendCells.sheetId)
      for (const { values } of appendCells.rows) cells.push(values.map(valueOf))
    } else if (deleteDimension) {
      const { sheetId, startIndex, endIndex } = deleteDimension.range
      this.tabNumbered(sheetId).cells.splice(startIndex, endIndex - startIndex)
    } else {
      throw new Error("Invalid requests[0]: no kind of request")
    }
  }

  /** The tab with this number.  - throws if there's none */
  private tabNumbered(sheetId: number): StubTab {
    const tab = [...this.tabs.values()].find((each) => each.sheetId === sheetId)
    if (!tab) throw new Error(`Invalid requests[0]: no grid with id: ${sheetId}`)
    return tab
  }
}

/** A cell as a batch sends it. */
type StubCell = {
  userEnteredValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean; formulaValue?: string }
}

/** One request of a batch, of those `GoogleSheetPlace` sends. */
type BatchRequest = {
  updateCells?: { start: { sheetId: number; rowIndex: number; columnIndex: number }; rows: { values: StubCell[] }[] }
  appendCells?: { sheetId: number; rows: { values: StubCell[] }[] }
  deleteDimension?: { range: { sheetId: number; startIndex: number; endIndex: number } }
}

/** A `batchUpdate`'s body. */
type BatchUpdate = { requests: BatchRequest[] }

/** What a cell ends up holding:  a blank for nothing. */
function valueOf({ userEnteredValue: value }: StubCell): unknown {
  return value?.stringValue ?? value?.numberValue ?? value?.boolValue ?? ""
}

/** `cells`, as Google answers them. */
function withoutTrailingBlanks(cells: readonly unknown[][]): unknown[][] {
  const rows = cells.map((row) => {
    let length = row.length
    while (length && (row[length - 1] === "" || row[length - 1] === undefined)) length--
    return row.slice(0, length)
  })
  while (rows.length && !rows.at(-1)!.length) rows.pop()
  return rows
}

/** A request's body. */
async function textOf(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString()
}

/** Answer as JSON. */
function send(reply: ServerResponse, status: number, body: object, headers: Record<string, string> = {}): void {
  reply.writeHead(status, { "Content-Type": "application/json", ...headers })
  reply.end(JSON.stringify(body))
}
