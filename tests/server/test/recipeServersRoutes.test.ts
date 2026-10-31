import { createServer } from "node:net"
import { describe, expect, test } from "vite-plus/test"

import { RecipeServersControl } from "spell/server/test/recipeServersRoutes"

describe("RecipeServersControl", () => {
  /** A port something else is listening on, with what lets it go. */
  async function takenPort() {
    const server = createServer()
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
    const { port } = server.address() as { port: number }
    return { port, release: () => new Promise((done) => server.close(done)) }
  }

  test("a port something else holds is said, by its number, and nothing's ended or started", async () => {
    const { port, release } = await takenPort()
    const control = new RecipeServersControl({ root: "/nowhere", port })
    expect((await control.status()).state).toBe("taken")
    for (const press of [control.stop(), control.start(), control.restart()]) {
      await expect(press).rejects.toThrow(`Port ${port} is taken`)
    }
    await release()
    expect((await control.status()).state).toBe("stopped")
  })
})
