import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { LoadableFile, parseJSON5, type $FetchParams } from "spell/util"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"

/** A PNG's first bytes, a NUL among them:  never text. */
const PICTURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff])

/** The group the tests' projects are in:  this machine's person's. */
const GROUP = `${SPACES.LOCAL_PERSON}@${SPACES.HOME_ORG}`

/** Files the editor lists as a project's own (the server's `isManifestFile()`, in short). */
const LISTED = /\.(spell|css|js)$/

/**
 * A pretend editor server, in memory:  the routes `SpellProjectRoot` and `ProjectFiles` ask, by `LoadableFile.fetch`.
 * - Files by address (`owen@spell/proj/Proj.spell`), text or bytes.
 * - A project's index lists its spell, css and js files, in its project file's order where it says one.
 */
class PretendServer {
  /** every file, by its address */
  readonly files = new Map<string, string | Uint8Array>()

  /** what was asked, in order:  each route, and the file it names, if any */
  readonly asked: string[] = []

  /** `LoadableFile.fetch`'s stand-in. */
  fetch = async ($params: $FetchParams): Promise<any> => {
    const { url } = $params
    const body = $params.contents as Record<string, any>
    this.asked.push(body?.filePath ? `${url} ${body.filePath}` : url)
    if (url.startsWith(SP.SpellUrls.LIST)) return this.list()
    if (url === "/api/projects/create/project") {
      this.write(`${body.projectId}/${body.filePath.replace(/^\//, "")}`, body.contents)
      // the title into its project file, unless it says it already (the server's `setProjectTitle()`)
      const projectFile = this.files.get(`${body.projectId}/${SP.PROJECT_FILE}`)
      if (body.title && !(typeof projectFile === "string" && projectFile.includes(body.title))) {
        this.write(`${body.projectId}/${SP.PROJECT_FILE}`, JSON.stringify({ title: body.title }))
      }
      return this.list()
    }
    if (url === "/api/projects/create/file") {
      const contents = body.encoding === SPACES.BASE64_ENCODING ? Buffer.from(body.contents, "base64") : body.contents
      this.write(`${body.projectId}/${body.filePath.replace(/^\//, "")}`, contents)
      return this.index(body.projectId)
    }
    if (url.startsWith(SP.SpellUrls.INDEX)) return this.index(SP.SpellUrls.projectIdFor(url))
    if (url.startsWith(SPACES.PROJECT_FILES_URL)) {
      const projectId = decodeURIComponent(url.slice(SPACES.PROJECT_FILES_URL.length))
      return this.pathsIn(projectId)
    }
    if (url.startsWith(SP.SpellUrls.SPACES)) {
      const contents = this.files.get(SP.SpellUrls.fileForUrl(url).path)
      if (contents === undefined) throw new Error(`${url}:  not found`)
      return typeof contents === "string" ? contents : new Blob([contents as Uint8Array<ArrayBuffer>])
    }
    throw new Error(`PretendServer:  no route for ${url}`)
  }

  /** SIDE EFFECT:  file at `path` says `contents`, bytes kept as a `Uint8Array`. */
  write(path: string, contents: string | Uint8Array): void {
    this.files.set(path, typeof contents === "string" ? contents : new Uint8Array(contents))
  }

  /** The group's projects. */
  private list(): SP.ProjectList {
    const projects = new Set([...this.files.keys()].map((path) => path.split("/").slice(0, 2).join("/")))
    return [...projects].map((path) => ({ path }))
  }

  /** Every file of project `projectId`, as paths from it. */
  private pathsIn(projectId: string): string[] {
    return [...this.files.keys()]
      .filter((path) => path.startsWith(`${projectId}/`))
      .map((path) => path.slice(projectId.length))
  }

  /** Project `projectId`'s index. */
  private index(projectId: string): SP.ProjectManifestJSON5 {
    const projectFile = this.files.get(`${projectId}/${SP.PROJECT_FILE}`)
    const settings = (typeof projectFile === "string" ? parseJSON5(projectFile) : {}) as {
      title?: string
      imports?: { path: string }[]
    }
    const listed = this.pathsIn(projectId).filter((path) => LISTED.test(path))
    const order = (settings.imports ?? []).map(({ path }) => path)
    listed.sort((one, two) => (order.indexOf(one) + 1 || 999) - (order.indexOf(two) + 1 || 999))
    const manifest: SP.ProjectManifestJSON5["manifest"] = {}
    for (const path of listed) manifest[`${projectId}${path}`] = { created: 0, modified: 0, size: 0 }
    const imports = listed.map((path) => ({
      path,
      active: true,
      contents: this.files.get(`${projectId}${path}`) as string
    }))
    return { manifest, imports, ...(settings.title && { title: settings.title }) }
  }
}

describe("SpellProjectRoot:  File > Export, then Import", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("every file comes back, a picture's bytes too, with the project file's settings and order", async () => {
    const server = new PretendServer()
    vi.spyOn(LoadableFile, "fetch").mockImplementation(server.fetch)
    const projectFile = `{\n  // kept as written\n  title: "Round Trip!",\n  imports: [{ path: "/Second.spell", active: true }, { path: "/First.spell", active: true }]\n}\n`
    server.write(`${GROUP}/round-trip/First.spell`, "# First\n")
    server.write(`${GROUP}/round-trip/Second.spell`, "# Second\n")
    server.write(`${GROUP}/round-trip/Button/Usage.spell`, "usage\n")
    server.write(`${GROUP}/round-trip/pictures/logo.png`, PICTURE)
    server.write(`${GROUP}/round-trip/${SP.PROJECT_FILE}`, projectFile)

    const root = SPACES.SpellProjectRoot.projects
    const project = new SP.SpellProject(`${GROUP}/round-trip`)
    await project.load(undefined)
    const archive = await root.exportApp(project)
    expect(archive.name).toBe("round-trip")
    expect(archive.files.map(({ path }) => path).sort()).toEqual(
      ["/Button/Usage.spell", "/First.spell", "/Second.spell", "/pictures/logo.png", `/${SP.PROJECT_FILE}`].sort()
    )

    // through the zip, as the download and the file a person picks
    const back = await SPACES.projectArchiveFrom("round-trip.zip", await SPACES.projectArchiveZip(archive))
    const imported = await root.importApp(back)
    expect(imported.projectId).toBe(`${GROUP}/round-trip-2`)
    const copy = (path: string) => server.files.get(`${GROUP}/round-trip-2${path}`)
    expect(copy("/First.spell")).toBe("# First\n")
    expect(copy("/Button/Usage.spell")).toBe("usage\n")
    expect([...(copy("/pictures/logo.png") as Uint8Array)]).toEqual([...PICTURE])
    // its project file as it was, comments and all, so its title and its files' order are the original's
    expect(copy(`/${SP.PROJECT_FILE}`)).toBe(projectFile)
    // made of its project file alone, then every other file, the first one too, so each page and its source is
    // your draft until you Publish (epic `mockup` T33:  which are drafts is the server's, `isDraftable()`);
    // its index not read till they're all written:  read with no file listed, the server would make one up
    const asked = server.asked.slice(server.asked.indexOf(`/api/projects/create/project /${SP.PROJECT_FILE}`))
    expect(asked.filter((each) => each.includes("/create/"))).toEqual(
      expect.arrayContaining([
        `/api/projects/create/project /${SP.PROJECT_FILE}`,
        "/api/projects/create/file /First.spell",
        "/api/projects/create/file /Second.spell",
        "/api/projects/create/file /Button/Usage.spell",
        "/api/projects/create/file /pictures/logo.png"
      ])
    )
    expect(asked.filter((each) => each.includes("/create/"))).toHaveLength(5)
    const written = asked.findLastIndex((each) => each.includes("/create/file"))
    expect(asked.slice(0, written).filter((each) => each.startsWith(SP.SpellUrls.INDEX))).toEqual([])
  })

  test('keep: "text" (the static build) leaves pictures and the project file out, but keeps the title', async () => {
    const server = new PretendServer()
    vi.spyOn(LoadableFile, "fetch").mockImplementation(server.fetch)
    const archive: SPACES.ProjectArchive = {
      name: "texts-only",
      title: "Texts Only!",
      files: [
        { path: "/Main.spell", contents: "# Main\n" },
        { path: "/logo.png", contents: PICTURE },
        { path: `/${SP.PROJECT_FILE}`, contents: '{ title: "Texts Only!", imports: [] }' }
      ]
    }
    await SPACES.SpellProjectRoot.projects.importApp(archive, { keep: "text" })
    expect([...server.files.keys()].sort()).toEqual([
      `${GROUP}/texts-only/Main.spell`,
      `${GROUP}/texts-only/${SP.PROJECT_FILE}`
    ])
    expect(server.files.get(`${GROUP}/texts-only/${SP.PROJECT_FILE}`)).toContain("Texts Only!")
  })
})
