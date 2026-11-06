/**
 * `SpacesHost`, Spell's own Spaces host (epic `atmosphere` P13), as `spell app org host start` runs it:
 * what it adds to the alpha's shape for accounts that aren't a test's.
 * - The Spaces calls themselves are tested through `AtProtoSpace` (`tests/places/AtProtoSpace.test.ts`),
 *   and against a running host by the trial (`tests/server/spacesTrial.test.ts`, with `SPACES_NETWORK`).
 */
import { afterEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { SpacesHost } from "spell/server/places/SpacesHost"

const HOST = "spell.localhost"
const ORG = "did:plc:org"

describe("SpacesHost", () => {
  let host: SpacesHost | undefined

  afterEach(async () => {
    await host?.close()
    host = undefined
  })

  /** Ask the host's `method`, as `token` if given. */
  async function ask(method: string, body: unknown, token?: string) {
    const response = await fetch(`${host!.hostUrl(HOST)}/xrpc/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify(body)
    })
    return { status: response.status, answer: (await response.json()) as Record<string, unknown> }
  }

  test("a session's token is random, not the account's DID:  the DID alone signs nobody in", async () => {
    host = await new SpacesHost().start([HOST])
    await host.addAccount(ORG, { handle: `org.${HOST}`, host: HOST, password: "app-password" })

    const { answer } = await ask("com.atproto.server.createSession", {
      identifier: `org.${HOST}`,
      password: "app-password"
    })
    expect(answer.did).toBe(ORG)
    expect(answer.accessJwt).not.toContain(ORG)

    const policy = { $type: "com.atproto.memberspace.policy" }
    const made = await ask(
      "com.atproto.space.createSpace",
      { spaceType: "app.spell.data.space", policy },
      `${answer.accessJwt as string}`
    )
    expect(made.answer.uri).toBe(`at://${ORG}/space/app.spell.data.space/self`)
    expect(await ask("com.atproto.space.listSpaces", {}, ORG)).toMatchObject({
      status: 401,
      answer: { error: "AuthMissing" }
    })
  })

  test("it listens on the port it's given, the host on the next one up", async () => {
    const port = await SRV.freePort()
    host = await new SpacesHost().start([HOST], { port })
    expect(host.network.directory).toBe(`http://127.0.0.1:${port}`)
    expect(host.hostUrl(HOST)).toBe(`http://127.0.0.1:${port + 1}`)
  })
})
