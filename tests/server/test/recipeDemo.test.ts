import { readdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { parseCsv } from "spell/util/places"
import { csvFor } from "spell/server/test/RecipeFile"
import { DEMO_TOKEN, type WireRecipe } from "spell/server/test/recipeServers"
import { startRecipeServers, type RecipeServers } from "spell/server/test/recipeDemo"

/** A file with what a real one has:  commas, quotes, a line end in a field, a column the servers don't know. */
const FIRST_CSV = `id,title,cuisine,servings,notes,shelf
r-1,Tomato soup,Italian,4,"Roast the tomatoes first, then the garlic.",top
r-2,Dal,Indian,6,Temper the spices last.,top
r-3,Tacos al pastor,Mexican,4,"Pineapple on top.
Warm the tortillas just before.",low
r-4,Margherita,Italian,2,"A ""very hot"" oven.",low
`

/** A row of the file as `parseCsv()` reads it, by column. */
function rowsOf(csv: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(csv)
  return rows.map((cells) => Object.fromEntries(header!.map((column, index) => [column, cells[index]!])))
}

describe("the demo's servers:  one source, several ways in", () => {
  let servers: RecipeServers
  let folder: string
  /** The CSV file. */
  let csv: string

  /** REST's recipe `id`. */
  const onRest = async (id: string) => (await (await fetch(`${servers.url}/recipes/${id}`)).json()) as WireRecipe

  /** Change recipe `id` over REST:  saying `version`, or the one it has now. */
  const changeOnRest = async (id: string, fields: object, version?: number) =>
    fetch(`${servers.url}/recipes/${id}`, {
      method: "PATCH",
      headers: { "If-Match": `${version ?? (await onRest(id)).version}` },
      body: JSON.stringify(fields)
    })

  /** Every recipe's id and name, as GraphQL says. */
  const onGraph = async () => {
    const query = `query { recipes { edges { node { id name } } } }`
    const response = await fetch(`${servers.url}/graphql`, { method: "POST", body: JSON.stringify({ query }) })
    const { data } = (await response.json()) as { data: { recipes: { edges: { node: WireRecipe }[] } } }
    return data.recipes.edges.map(({ node }) => node)
  }

  /** What the file's address serves, as rows. */
  const onSheet = async () => rowsOf(await (await fetch(`${servers.url}/recipes.csv`)).text())

  beforeAll(async () => {
    folder = mkdtempSync(join(tmpdir(), "spell-recipe-demo-test-"))
    csv = `${folder}.csv`
    servers = await startRecipeServers({ port: 0, folder, csvFile: csv, firstCsv: FIRST_CSV })
  })

  afterAll(async () => {
    await servers.close()
    rmSync(folder, { recursive: true, force: true })
    rmSync(csv, { force: true })
  })

  beforeEach(() => writeFileSync(csv, FIRST_CSV))

  describe("one CSV file", () => {
    test("a change over REST is in the file, and GraphQL and the sheet show it;  the other cells and columns stay", async () => {
      expect((await changeOnRest("r-1", { name: "Soup, tomato" })).status).toBe(200)
      const row = rowsOf(readFileSync(csv, "utf8"))[0]!
      expect(row.title).toBe("Soup, tomato")
      expect(row.shelf).toBe("top")
      expect(row.notes).toBe("Roast the tomatoes first, then the garlic.")
      expect((await onGraph())[0]!.name).toBe("Soup, tomato")
      expect((await onSheet())[0]!.title).toBe("Soup, tomato")
      expect(rowsOf(readFileSync(csv, "utf8"))[2]!.notes).toBe("Pineapple on top.\nWarm the tortillas just before.")
      expect(rowsOf(readFileSync(csv, "utf8"))[3]!.notes).toBe('A "very hot" oven.')
    })

    test("a change over GraphQL is in the file too;  adding and removing as well", async () => {
      const ask = (query: string, variables: object) =>
        fetch(`${servers.url}/graphql`, { method: "POST", body: JSON.stringify({ query, variables }) })
      await ask(`mutation($input: RecipeInput!) { addRecipe(input: $input) { id } }`, {
        input: { id: "r-9", name: "Toast", servings: 1 }
      })
      expect(rowsOf(readFileSync(csv, "utf8")).at(-1)!.title).toBe("Toast")
      await ask(`mutation($id: ID!) { removeRecipe(id: $id) }`, { id: "r-9" })
      expect(rowsOf(readFileSync(csv, "utf8")).map(({ id }) => id)).not.toContain("r-9")
    })

    test("a file edited outside is in the next answer of all three", async () => {
      writeFileSync(csv, FIRST_CSV.replace("Dal", "Dal again"))
      expect((await onRest("r-2")).name).toBe("Dal again")
      expect((await onGraph())[1]!.name).toBe("Dal again")
      expect((await onSheet())[1]!.title).toBe("Dal again")
    })

    test("an edit moves that row's version and no other's:  a save from before it clashes on that row alone", async () => {
      const [dal, soup] = [await onRest("r-2"), await onRest("r-1")]
      writeFileSync(csv, FIRST_CSV.replace("Dal", "Dal again"))
      expect((await onRest("r-2")).version).not.toBe(dal.version)
      expect((await onRest("r-1")).version).toBe(soup.version)
      expect((await changeOnRest("r-2", { servings: 8 }, dal.version)).status).toBe(412)
      expect((await changeOnRest("r-1", { servings: 8 }, soup.version)).status).toBe(200)
      expect(rowsOf(readFileSync(csv, "utf8"))[1]!.title).toBe("Dal again")
    })

    test("a version is the row's content:  saving doesn't move what it didn't change", async () => {
      const { version } = await onRest("r-1")
      await changeOnRest("r-2", { servings: 7 })
      expect((await onRest("r-1")).version).toBe(version)
    })

    test("a sheet can't write, though REST can write the same file", async () => {
      const before = readFileSync(csv, "utf8")
      const response = await fetch(`${servers.url}/recipes.csv`, { method: "PUT", body: "id\nr-1\n" })
      expect(response.status).toBe(405)
      expect(readFileSync(csv, "utf8")).toBe(before)
    })

    test("a file half saved:  answers stand as last read, and nothing's saved over it until it's fixed", async () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {})
      await onRest("r-1")
      const half = `${FIRST_CSV}r-5,"Never closes`
      writeFileSync(csv, half)
      expect((await onRest("r-1")).name).toBe("Tomato soup")
      expect((await changeOnRest("r-1", { name: "No" })).status).toBe(409)
      expect(readFileSync(csv, "utf8")).toBe(half)
      writeFileSync(csv, FIRST_CSV)
      expect((await changeOnRest("r-1", { name: "Yes" })).status).toBe(200)
      expect(errors).toHaveBeenCalled()
      errors.mockRestore()
    })
  })

  test("csvFor():  what it writes, parseCsv() reads back", () => {
    const notes = 'One, "two"\nthree\r\nfour'
    const recipe: WireRecipe = { id: "r", name: "Name", cuisine: "", servings: 2, notes, version: 1 }
    const text = csvFor(["id", "title", "cuisine", "servings", "notes"], [recipe])
    expect(parseCsv(text)).toEqual([
      ["id", "title", "cuisine", "servings", "notes"],
      ["r", "Name", "", "2", notes]
    ])
  })

  describe("one folder", () => {
    /** Everyone in the room's steps, as they come, with what stops hearing them. */
    async function inTheRoom() {
      const url = `${servers.url.replace("http", "ws")}/api/rooms/recipes?token=${DEMO_TOKEN}`
      const socket = new WebSocket(url)
      const steps: { from: string; changes: { id: string; fields?: Record<string, unknown> }[] }[] = []
      socket.addEventListener("message", ({ data }) => {
        const message = JSON.parse(`${data}`) as { kind: string; entry?: (typeof steps)[number] }
        if (message.kind === "entry") steps.push(message.entry!)
      })
      await new Promise((opened) => socket.addEventListener("open", opened))
      return { socket, steps }
    }

    /** What the folder's place server says recipe `id` holds. */
    const inFolder = async (id: string) => {
      const response = await fetch(`${servers.url}/api/places/recipes/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-server-token": DEMO_TOKEN },
        body: JSON.stringify({ collection: "recipes", query: { select: ["title", "notes"] } })
      })
      const { rows } = (await response.json()) as { rows: { id: string; title: string }[] }
      return rows.find((row) => row.id === id)
    }

    test("a change through the place server reaches the room", async () => {
      const { socket, steps } = await inTheRoom()
      const response = await fetch(`${servers.url}/api/places/recipes/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-server-token": DEMO_TOKEN },
        body: JSON.stringify({
          changes: [{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Changed" } }]
        })
      })
      expect(response.status).toBe(200)
      await vi.waitFor(() => expect(steps.at(-1)?.changes[0]?.fields?.title).toBe("Changed"))
      socket.close()
    })

    test("a file edited outside reaches the room, within a second or two", async () => {
      const { socket, steps } = await inTheRoom()
      const file = join(folder, "recipes", "r-2.json")
      writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, "utf8")), title: "By hand" }))
      await vi.waitFor(() => expect(steps.at(-1)?.changes[0]?.fields?.title).toBe("By hand"), { timeout: 3_000 })
      expect((await inFolder("r-2"))?.title).toBe("By hand")
      socket.close()
    })

    test("a change in the room is in the file, and the place server says so", async () => {
      const { socket, steps } = await inTheRoom()
      socket.send(
        JSON.stringify({
          kind: "changes",
          from: "a page",
          changes: [
            { kind: "update", collection: "recipes", id: "r-3", fields: { title: "From the room" }, changeId: "c-1" }
          ]
        })
      )
      await vi.waitFor(() => expect(steps.at(-1)?.changes[0]?.fields?.title).toBe("From the room"))
      expect(readdirSync(join(folder, "recipes"))).toContain("r-3.json")
      expect(JSON.parse(readFileSync(join(folder, "recipes", "r-3.json"), "utf8")).title).toBe("From the room")
      expect((await inFolder("r-3"))?.title).toBe("From the room")
      socket.close()
    })
  })
})
