/**
 * A field holding another thing's address, followed (epic `data` I33):  compiled spell, on `core`, reading a server.
 * - `its "homeworld" is a planet`, on a web server whose rows say `"homeworld": "https://..."`.
 * - Real requests in the last test:  a real server, to see a read given up on reach it.
 */
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { createMemo, createRoot, flush } from "solid-js"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

const HOST = "https://web.test"
const TATOOINE = { url: `${HOST}/planets/1`, name: "Tatooine" }
const ALDERAAN = { url: `${HOST}/planets/2`, name: "Alderaan" }
const A_NEW_HOPE = { url: `${HOST}/films/1`, title: "A New Hope" }
const EMPIRE = { url: `${HOST}/films/2`, title: "The Empire Strikes Back" }
const LUKE = {
  url: `${HOST}/people/1`,
  name: "Luke",
  homeworld: TATOOINE.url,
  films: [A_NEW_HOPE.url, EMPIRE.url],
  height: "172"
}
const OWEN = {
  url: `${HOST}/people/2`,
  name: "Owen",
  homeworld: TATOOINE.url,
  films: [A_NEW_HOPE.url],
  height: "unknown"
}
const LEIA = { url: `${HOST}/people/3`, name: "Leia", homeworld: `${HOST}/planets/404`, films: [], height: "150" }
const ROUTES = {
  [`${HOST}/people`]: [LUKE, OWEN, LEIA],
  [`${HOST}/planets`]: [TATOOINE, ALDERAAN],
  [`${HOST}/films`]: [A_NEW_HOPE, EMPIRE],
  [TATOOINE.url]: TATOOINE,
  [ALDERAAN.url]: ALDERAAN,
  [A_NEW_HOPE.url]: A_NEW_HOPE,
  [EMPIRE.url]: EMPIRE
}

const LINES = [
  `stars is a web server at "${HOST}":`,
  `\t- its id is its "url"`,
  `\t- check it every 3600 seconds`,
  `\t- people live at "/people"`,
  `\t- planets live at "/planets"`,
  `\t- films live at "/films"`,
  `a "person" is a thing:`,
  `\t- it lives in the stars`,
  `\t- its "name" is text`,
  `\t- its "height" is a number`,
  `\t- its "homeworld" is a planet`,
  `\t- its "films" is a list of films`,
  `\t- to say its home:`,
  `\t\treturn the name of its homeworld`,
  `\t- to name its films:`,
  `\t\tset names to a new list of text`,
  `\t\tfor each film in its films`,
  `\t\t\tadd the title of the film to names`,
  `\t\treturn names`,
  `a "planet" is a thing:`,
  `\t- it lives in the stars`,
  `\t- its "name" is text`,
  `a "film" is a thing:`,
  `\t- it lives in the stars`,
  `\t- its "title" is text`
]

/** A server, by address:  what's been asked, oldest first.  A route that's a `Response` is that answer. */
function serve(routes: Record<string, unknown> = ROUTES): string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    asked.push(url)
    const route = routes[url]
    if (route instanceof Response) return route
    return route === undefined ? new Response("no", { status: 404 }) : Response.json(route)
  })
  return asked
}

type Person = {
  name: string
  height: number | null
  homeworld: { name: string } | undefined
  films: { items: Array<{ title: string }> }
  sayItsHome(): Promise<string>
  nameItsFilms(): Promise<{ items: string[] }>
}

/** The people, read from the server. */
async function people(
  lines = LINES,
  name = "Person"
): Promise<{ list: Person[]; run: (names: string) => Record<string, unknown> }> {
  core.resetRuntime()
  const run = runSpell(lines)
  const Class = run(name)[name] as { savedIn: { select?: unknown } } & (new () => unknown)
  delete Class.savedIn.select
  return { list: (await core.savedThings(Class)).items as Person[], run }
}

afterEach(() => void vi.unstubAllGlobals())

describe("following a link", () => {
  test("compiles to a read that follows it, and warns of nothing", () => {
    const { compiled, errors, warnings } = parseSpellProject([{ path: "/T.spell", contents: `${LINES.join("\n")}\n` }])
      .files[0]!
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(compiled).toContain(`get homeworld() { return core.linked(this, "homeworld", Planet) }`)
    expect(compiled).toContain(`get films() { return core.linked(this, "films", Film) }`)
    expect(compiled).toContain(`(await core.answerOf(this, "homeworld"))?.name`)
    // a type that's kept in memory holds the thing itself, as ever
    const memory = [
      `a "planet" is a thing:`,
      `\t- its "name" is text`,
      `a "person" is a thing:`,
      `\t- its "home" is a planet`
    ]
    expect(parseSpellProject([{ path: "/T.spell", contents: memory.join("\n") }]).files[0]!.compiled).not.toContain(
      "core.linked"
    )
  })

  test("the same words in Spanish", async () => {
    const asked = serve()
    const lines = [
      `estrellas es un servidor web en "${HOST}":`,
      `\t- su identificador está en "url"`,
      `\t- se revisa cada 3600 segundos`,
      `\t- las personas están en "/people"`,
      `\t- los planetas están en "/planets"`,
      `\t- las películas están en "/films"`,
      `una "persona" es una cosa:`,
      `\t- vive en las estrellas`,
      `\t- su "homeworld" es un planeta`,
      `\t- su "films" es una lista de películas`,
      `un "planeta" es una cosa:`,
      `\t- vive en las estrellas`,
      `\t- su "name" es texto`,
      `\t- su "página" es la película cuyo identificador es su name`,
      `una "película" es una cosa:`,
      `\t- vive en las estrellas`,
      `\t- su "title" es texto`
    ]
    const contents = `${lines.join("\n")}\n`
    const { compiled, errors, warnings } = parseSpellProject([{ path: "/T.es.spell", contents }]).files[0]!
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(compiled).toContain(`core.linked(this, "homeworld", Planeta)`)
    expect(compiled).toContain(`core.linked(this, "films", Película)`)
    expect(compiled).toContain(`core.savedThingWithId(Película, this.name)`)
    expect(asked).toEqual([])
  })

  test("one quiet read per address, shared by whoever follows it", async () => {
    const asked = serve()
    const { list } = await people()
    const [luke, owen] = list as [Person, Person]
    expect(await luke.sayItsHome()).toBe("Tatooine")
    expect(await owen.sayItsHome()).toBe("Tatooine")
    expect(asked.filter((url) => url === TATOOINE.url)).toHaveLength(1)
    // once it's known, it answers at once, and no warning said the address wasn't a planet
    expect(luke.homeworld).toBe(owen.homeworld)
    expect(luke.homeworld!.name).toBe("Tatooine")
    expect(asked.filter((url) => url === TATOOINE.url)).toHaveLength(1)
  })

  test("a list of addresses is a list of things, in order, and the same list after", async () => {
    const asked = serve()
    const { list } = await people()
    const luke = list[0]!
    expect((await luke.nameItsFilms()).items).toEqual(["A New Hope", "The Empire Strikes Back"])
    expect(asked).toContain(A_NEW_HOPE.url)
    expect(luke.films).toBe(luke.films)
    expect(luke.films.items.map(({ title }) => title)).toEqual(["A New Hope", "The Empire Strikes Back"])
  })

  test("no request for a thing a read has already brought", async () => {
    const asked = serve()
    const { list, run } = await people()
    const Planet = run("Planet").Planet as { savedIn: { select?: unknown } } & (new () => unknown)
    delete Planet.savedIn.select
    await core.savedThings(Planet)
    expect(await list[0]!.sayItsHome()).toBe("Tatooine")
    expect(asked).not.toContain(TATOOINE.url)
  })

  test("an address the place doesn't hold is nothing, and asked once", async () => {
    const asked = serve()
    const { list } = await people()
    const leia = list[2]!
    expect(await core.answerOf(leia, "homeworld")).toBeUndefined()
    expect(leia.homeworld).toBeUndefined()
    expect(asked.filter((url) => url === LEIA.homeworld)).toHaveLength(1)
  })

  test("a server's { name, url } is a link too", async () => {
    const asked = serve({
      [`${HOST}/people`]: [{ ...LUKE, homeworld: { name: "Tatooine", url: TATOOINE.url }, films: [] }],
      [TATOOINE.url]: TATOOINE
    })
    const { list } = await people()
    expect(await list[0]!.sayItsHome()).toBe("Tatooine")
    expect(asked).toEqual([`${HOST}/people`, TATOOINE.url])
  })

  test("a number nobody knows reads as nothing, not 0", async () => {
    serve()
    const { list } = await people()
    expect(list[0]!.height).toBe(172)
    expect(list[1]!.height).toBeUndefined()
  })

  test("a read nobody can answer says why, and asks again the next time", async () => {
    let isDown = true
    const asked: string[] = []
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
      asked.push(url)
      if (url === TATOOINE.url && isDown) return new Response("no", { status: 403 })
      return Response.json(ROUTES[url])
    })
    const { list } = await people()
    await expect(list[0]!.sayItsHome()).rejects.toThrow()
    isDown = false
    expect(await list[0]!.sayItsHome()).toBe("Tatooine")
  })
})

describe("a read by id, after a search brought the row (epic `data` I90)", () => {
  /** The people found by name, read from `routes`:  a read of some of them, not every one. */
  async function lukeFound(routes: Record<string, unknown>) {
    const asked = serve(routes)
    core.resetRuntime()
    const Person = runSpell(LINES)("Person").Person as { savedIn: { select?: unknown } } & (new () => unknown)
    delete Person.savedIn.select
    const [found] = (await core.savedThings(Person, { filter: { name: "Luke" } })).items
    return { asked, Person, found }
  }

  test("reads the row whole by its id, the same thing", async () => {
    const { asked, Person, found } = await lukeFound({ ...ROUTES, [LUKE.url]: { ...LUKE, height: "173" } })
    const luke = (await core.savedThingWithId(Person, LUKE.url)) as Person
    expect(asked).toContain(LUKE.url)
    expect(luke).toBe(found)
    expect(luke.height).toBe(173)
  })

  test("a read by id that fails says so, rather than showing the row the search brought", async () => {
    const { Person } = await lukeFound({ ...ROUTES, [LUKE.url]: new Response("slow down", { status: 429 }) })
    await expect(core.savedThingWithId(Person, LUKE.url)).rejects.toThrow()
  })

  test("a thing a read of every one brought isn't read again", async () => {
    const asked = serve()
    const { run } = await people()
    const Person = run("Person").Person as new () => unknown
    // in a drawing, as it's read:  its read is held for the drawing, not asked for by itself
    const reading = createRoot(() => core.savedThingWithId(Person, LUKE.url))
    expect(((await reading) as Person).name).toBe("Luke")
    expect(asked).not.toContain(LUKE.url)
  })
})

describe("the wiki page whose id is its name", () => {
  const WIKI = "https://wiki.test/api"
  const lines = [
    `wiki is a web server at "${WIKI}":`,
    `\t- check it every 3600 seconds`,
    `\t- wiki pages live at "/page/summary"`,
    `\t- a wiki page's "content urls" is its "content_urls"`,
    `a "thumbnail" is a thing:`,
    `\t- its "source" is text`,
    `a "link set" is a thing:`,
    `\t- its "desktop" is a web link`,
    `a "web link" is a thing:`,
    `\t- its "page" is text`,
    `a "wiki page" is a thing:`,
    `\t- it lives in the wiki`,
    `\t- its "title" is text`,
    `\t- its "thumbnail" is a thumbnail`,
    `\t- its "content urls" is a link set`,
    `\t- its "picture" is the source of its thumbnail`,
    `\t- its "address" is the page of the desktop of its content urls`,
    `a "person" is a thing:`,
    `\t- its "name" is text`,
    `\t- its "page" is the wiki page whose id is its name`
  ]

  test("a dot in a field's name is refused, saying what to write", () => {
    const contents = [
      `wiki is a web server at "${WIKI}":`,
      `\t- a wiki page's picture is its "thumbnail.source"`,
      `a "wiki page" is a thing:`,
      `\t- it lives in the wiki`,
      `\t- its "picture" is text`
    ].join("\n")
    const { errors } = parseSpellProject([{ path: "/T.spell", contents: `${contents}\n` }]).files[0]!
    expect(errors.join("\n")).toContain(`read as "source of its thumbnail"`)
  })

  test("asks the place for that one row, reading what's inside a field in words", async () => {
    const asked = serve({
      [`${WIKI}/page/summary/Luke`]: {
        id: "Luke",
        title: "Luke",
        thumbnail: { source: "https://img.test/luke.jpg" },
        content_urls: { desktop: { page: "https://wiki.test/Luke" } }
      }
    })
    core.resetRuntime()
    const { Person } = runSpell(lines)("Person") as { Person: new (props: object) => { page: unknown } }
    const luke = new Person({ name: "Luke" })
    const page = (await core.answerOf(luke, "page")) as {
      title: string
      picture: string
      address: string
      thumbnail: object
    }
    expect(page.title).toBe("Luke")
    expect(page.picture).toBe("https://img.test/luke.jpg")
    expect(page.address).toBe("https://wiki.test/Luke")
    expect(page.thumbnail.constructor.name).toBe("Thumbnail")
    expect(asked).toEqual([`${WIKI}/page/summary/Luke`])
  })

  test("a page that isn't there is nothing, and no id asks for nothing", async () => {
    const asked = serve({})
    core.resetRuntime()
    const { Person } = runSpell(lines)("Person") as { Person: new (props: object) => { page: unknown } }
    expect(await core.answerOf(new Person({ name: "Nobody Here" }), "page")).toBeUndefined()
    expect(await core.answerOf(new Person({ name: "" }), "page")).toBeUndefined()
    expect(asked).toHaveLength(1)
  })
})

describe("what the Star Wars example needed", () => {
  const compiled = (lines: string[]) => {
    const { compiled: code, errors } = parseSpellProject([{ path: "/T.spell", contents: `${lines.join("\n")}\n` }])
      .files[0]!
    expect(errors).toEqual([])
    return code!
  }

  test("a date on a page says itself", () => {
    const code = compiled([
      `a "film" is a view:`,
      `\t- its "released" is a date`,
      `\t- to draw it:`,
      `\t\t<p>{its released}</p>`
    ])
    expect(code).toContain("core.dateShown(this.released)")
    expect(core.dateShown(new Date(1977, 4, 25, 23))).toBe("May 25, 1977")
    expect(core.dateShown(undefined)).toBeUndefined()
  })

  test("a number with commas, and nothing stays nothing", () => {
    expect(core.withCommas(2_000_000)).toBe("2,000,000")
    expect(core.withCommas(null)).toBeNull()
  })

  test("another thing's slot", () => {
    const code = compiled([
      `a "film" is a view:`,
      `\t- to draw its page:`,
      `\t\t<p>page</p>`,
      `a "guide" is a view:`,
      `\t- its "showing" is a film`,
      `\t- to draw it:`,
      `\t\tdraw the page of its showing`
    ])
    expect(code).toContain("this.showing?.drawPage()")
  })

  test("a listener on an element's own event isn't run as it's drawn", () => {
    const code = compiled([
      `a "guide" is a view:`,
      `\t- to end it:`,
      `\t\tprint "ended"`,
      `\t- to draw it:`,
      `\t\t<ui-modal on-ui-closed={end it}>Hi</ui-modal>`
    ])
    expect(code).toContain(`"on-ui-closed": () => () => this.end()`)
  })

  test("a value that waits follows what it reads after its wait, written with its", () => {
    const code = compiled([
      `sky is a web server at "${HOST}":`,
      `\t- check it every 3600 seconds`,
      `a "star" is a thing:`,
      `\t- it lives in the sky`,
      `a "guide" is a thing:`,
      `\t- its "how many" is a number`,
      `\t- its "some" is (the number of items in (every star)) + its how many`
    ])
    expect(code).toContain("() => [this.howMany]")
  })
})

describe("reading as it's drawn", () => {
  const STARS = `${HOST}/stars`
  const lines = [
    `sky is a web server at "${HOST}":`,
    `\t- its id is its "url"`,
    `\t- its rows are the "items" of its "data"`,
    `\t- its next page is the "next" of its "links"`,
    `\t- check it every 3600 seconds`,
    `\t- stars live at "/stars"`,
    `a "star" is a thing:`,
    `\t- it lives in the sky`,
    `\t- its "name" is text`,
    `a "guide" is a view:`,
    `\t- to draw it:`,
    `\t\tfor each star in every star`,
    `\t\t\tdraw the star`,
    `\t- to count them:`,
    `\t\treturn the number of items in every star`
  ]
  const pageOf = (names: string[], next: string | null) => ({
    data: { items: names.map((name) => ({ url: `${STARS}/${name}`, name })) },
    links: { next }
  })
  const ROWS = {
    [STARS]: pageOf(["vega"], `${STARS}?page=2`),
    [`${STARS}?page=2`]: pageOf(["rigel"], null)
  }

  test("a loop that only draws says so;  further in is words", () => {
    const { compiled, errors } = parseSpellProject([{ path: "/T.spell", contents: `${lines.join("\n")}\n` }]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toContain(`core.savedThings(Star, {}, "as drawn")`)
    expect(compiled).toContain(`rowsIn: "data.items"`)
    expect(compiled).toContain(`nextPageIn: "links.next"`)
    expect(compiled).toContain(`core.savedThings(Star)`)
  })

  test("drawn, its later pages wait;  anything else reads them all", async () => {
    const asked = serve(ROWS)
    core.resetRuntime()
    const { Star } = runSpell(lines)("Star") as { Star: new () => unknown }
    const drawn = await core.savedThings(Star, {}, "as drawn")
    expect(drawn.items.map((star) => (star as { name: string }).name)).toEqual(["vega"])
    expect(asked).toEqual([STARS])
    const all = await core.savedThings(Star)
    expect(all.items.map((star) => (star as { name: string }).name)).toEqual(["vega", "rigel"])
    expect(asked.at(-1)).toBe(`${STARS}?page=2`)
  })
})

describe("a real server", () => {
  let server: Server | undefined
  afterEach(() => void server?.close())

  test("a drawing that leaves gives up its read, and coming back asks again", async () => {
    const answers: Array<() => void> = []
    let gaveUp = 0
    server = createServer((request, response) => {
      const send = (body: unknown) => response.setHeader("Content-Type", "application/json").end(JSON.stringify(body))
      if (request.url === "/people")
        return send([{ url: `${host()}/people/1`, name: "Luke", homeworld: `${host()}/planets/1` }])
      response.on("close", () => {
        if (!response.writableEnded) gaveUp++
      })
      answers.push(() => send({ url: `${host()}/planets/1`, name: "Tatooine" }))
    })
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve))
    const host = () => `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
    const { list } = await people([
      `stars is a web server at "${host()}":`,
      `\t- its id is its "url"`,
      `\t- check it every 3600 seconds`,
      `a "person" is a thing:`,
      `\t- it lives in the stars`,
      `\t- its "name" is text`,
      `\t- its "homeworld" is a planet`,
      `a "planet" is a thing:`,
      `\t- it lives in the stars`,
      `\t- its "name" is text`
    ])
    const luke = list[0]!
    const draw = () =>
      createRoot((dispose) => {
        createMemo(() => luke.homeworld?.name)
        return dispose
      })
    const leave = draw()
    flush()
    await vi.waitFor(() => expect(answers).toHaveLength(1))
    leave()
    await vi.waitFor(() => expect(gaveUp).toBe(1))
    // nothing was learned from that:  it asks again
    const leaveAgain = draw()
    flush()
    await vi.waitFor(() => expect(answers).toHaveLength(2))
    answers[1]!()
    await vi.waitFor(() => expect(luke.homeworld?.name).toBe("Tatooine"))
    leaveAgain()
  })
})
