import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, resolve } from "path"

import environment from "spell/app/spaces/server/node/environment"
import { SP } from "spell/parser/spell"
import { locationForDiskPath } from "spell/app/spaces/server/node/projects/disk-fetch"
import * as projectUtils from "spell/app/spaces/server/node/projects/project-utils"
import { ProjectDrafts } from "spell/app/spaces/server/node/projects/ProjectDrafts"
import { THIS_MACHINES_PERSON } from "spell/app/spaces/server/node/projects/ProjectRoles"

/**
 * Where a project's files are on disk (epic `people-and-orgs` P11).
 * - What spell BUILDS for it, e.g. `solitaire.spell.js`:  in its build folder, `build/` at the repo root.
 * - Everything else:  beside its source.
 * - A temporary "repo" stands in for the real one:
 *   - its `packages/` and `build/` replace `environment`'s, but for the built-in roots' test (`useTempRepo()`)
 *   - its projects are a `@local/<folder>` group inside that `packages/`
 */
let repo: string
let packagesDir: string
let buildDir: string
let workspace: string
let realFolders: { packagesDir: string; buildDir: string }

/**
 * Built file names of project `Proj`:  each goes in its build folder.
 * - Its declarations and words too, in any language, since epic `elemental-spell` P4;  its source maps since P14.
 */
const BUILT = [
  "Proj.spell.js",
  "Proj.spell.js.map",
  "Proj.spell.tsx",
  "Proj.spell.tsx.map",
  "Proj.spell.py",
  "Proj.elements.spell.js",
  "Proj.scopes.js",
  "Proj.declarations.json5",
  "Proj.en.js",
  "Proj.es.js",
  "Proj.pt-BR.js",
  "Proj.py.en.json5",
  "Proj.py.es.json5"
]
/** Files of project `Proj` which stay beside its source, built or not. */
const BESIDE = [
  "Other.en.js",
  "Proj.socket.io.js",
  "Proj.lib.ts",
  "Proj.app.py",
  "__project.json5",
  "Proj.spell",
  "Other.spell.js",
  "sub/Proj.spell.js"
]

beforeAll(() => {
  repo = mkdtempSync(resolve(tmpdir(), "spell-build-"))
  packagesDir = resolve(repo, "packages")
  buildDir = resolve(repo, "build")
  workspace = resolve(packagesDir, "build-test-projects")
  realFolders = { packagesDir: environment.packagesDir, buildDir: environment.buildDir }
})

afterAll(() => rmSync(repo, { recursive: true, force: true }))

describe("buildFolderFor()", () => {
  const folders = {
    packagesDir: "/repo/packages",
    buildDir: "/repo/build",
    repoDir: "/repo",
    spellSpacesDir: "/spell-spaces"
  }

  test("a project under `packages/`:  the same path under `build/`", () => {
    expect(projectUtils.buildFolderFor("/repo/packages/spaces/@spell/examples/Proj", folders)).toBe(
      "/repo/build/spaces/@spell/examples/Proj"
    )
  })

  test("a test project, under `tests/`:  the same path under `build/`", () => {
    expect(projectUtils.buildFolderFor("/repo/tests/spaces/@spell/test/Proj", folders)).toBe(
      "/repo/build/spaces/@spell/test/Proj"
    )
  })

  test("a frozen test project, beside the built-in groups (`spaces/@spell/test/`):  the same path under `build/`", () => {
    expect(projectUtils.buildFolderFor("/repo/packages/spaces/@spell/test/Proj", folders)).toBe(
      "/repo/build/spaces/@spell/test/Proj"
    )
  })

  test("a project in spell-spaces:  under `build/spell-spaces/`, in THIS checkout", () => {
    expect(projectUtils.buildFolderFor("/spell-spaces/@spell/owen@/errors", folders)).toBe(
      "/repo/build/spell-spaces/@spell/owen@/errors"
    )
  })

  test("a project of ANOTHER spell-app checkout:  under that checkout's `build/`, never beside its source (P21)", () => {
    // e.g. a worktree's example, which the main checkout's language server compiles
    const other = mkdtempSync(resolve(tmpdir(), "spell-other-checkout-"))
    try {
      writeFileSync(resolve(other, "package.json"), JSON.stringify({ name: "spell-app" }))
      const example = resolve(other, "spaces/@spell/examples/Solitaire")
      expect(projectUtils.buildFolderFor(example, folders)).toBe(
        resolve(other, "build/spaces/@spell/examples/Solitaire")
      )
      // not spell-app:  beside its source, as anywhere else
      writeFileSync(resolve(other, "package.json"), JSON.stringify({ name: "my-app" }))
      expect(projectUtils.buildFolderFor(example, folders)).toBe(example)
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })

  test("a project anywhere else:  its own folder, beside its source", () => {
    expect(projectUtils.buildFolderFor("/tmp/ws/Proj", folders)).toBe("/tmp/ws/Proj")
    expect(projectUtils.buildFolderFor("/repo/packages-old/Proj", folders)).toBe("/repo/packages-old/Proj")
    expect(projectUtils.buildFolderFor("/repo/packages", folders)).toBe("/repo/packages")
  })
})

describe("SpellLocation.serverPath, in this repo", () => {
  test("a built-in project's built files are in `build/`, at its path in the repo:  its declarations and words too", () => {
    expect(environment.buildDir).toBe(resolve(environment.repoDir, "build"))
    expect(new SP.SpellLocation("@spell/examples/Solitaire/Solitaire.spell.js").serverPath).toBe(
      resolve(environment.buildDir, "spaces/@spell/examples/Solitaire/Solitaire.spell.js")
    )
    expect(new SP.SpellLocation("@spell/examples/Solitaire/Solitaire.declarations.json5").serverPath).toBe(
      resolve(environment.buildDir, "spaces/@spell/examples/Solitaire/Solitaire.declarations.json5")
    )
    expect(new SP.SpellLocation("@spell/examples/Solitario/Solitario.es.js").serverPath).toBe(
      resolve(environment.buildDir, "spaces/@spell/examples/Solitario/Solitario.es.js")
    )
    expect(new SP.SpellLocation("@spell/examples/Solitaire/Solitaire.py.en.json5").serverPath).toBe(
      resolve(environment.buildDir, "spaces/@spell/examples/Solitaire/Solitaire.py.en.json5")
    )
    // what others import or edit stays beside the source
    expect(new SP.SpellLocation("@spell/library/people/people.lib.ts").serverPath).toBe(
      resolve(environment.systemFilesRoot, "library/people/people.lib.ts")
    )
  })
})

describe("SpellLocation.serverPath", () => {
  useTempRepo()

  test("ONLY `<Project>` + a built suffix, at the top of the project, goes in its build folder", () => {
    const projectId = project("Proj")
    for (const name of BUILT) {
      expect(SP.SpellLocation.getFileLocation(projectId, name).serverPath, name).toBe(
        resolve(buildDir, "build-test-projects/Proj", name)
      )
    }
    for (const name of BESIDE) {
      expect(SP.SpellLocation.getFileLocation(projectId, name).serverPath, name).toBe(resolve(workspace, "Proj", name))
    }
  })

  test("a project outside `packages/` keeps its built files beside its source", () => {
    const elsewhere = mkdtempSync(resolve(tmpdir(), "spell-ws-"))
    mkdirSync(resolve(elsewhere, "Out"))
    writeFileSync(resolve(elsewhere, "Out", SP.PROJECT_FILE), JSON.stringify({ imports: [] }))
    const location = locationForDiskPath(resolve(elsewhere, "Out", "Out.spell.js"))!
    expect(location.serverPath).toBe(resolve(elsewhere, "Out", "Out.spell.js"))
    expect(projectUtils.buildFolderInBuild(location.projectId)).toBeUndefined()
    rmSync(elsewhere, { recursive: true, force: true })
  })
})

describe("project-utils", () => {
  useTempRepo()
  test("saving a built file makes its build folder, and leaves the source folder be", async () => {
    const projectId = project("Saved")
    await projectUtils.saveFile(projectId, "Saved.spell.js", "export default 1\n")
    expect(readFileSync(resolve(buildDir, "build-test-projects/Saved/Saved.spell.js"), "utf8")).toBe(
      "export default 1\n"
    )
    expect(existsSync(resolve(workspace, "Saved/Saved.spell.js"))).toBe(false)
  })

  test("a project's index says where its build folder is, inside the build folder:  no ../ (J33)", async () => {
    const projectId = project("Indexed")
    expect((await projectUtils.getIndex(projectId)).buildFolder).toBe("build-test-projects/Indexed")
  })

  test("a property editor page is one of a project's files:  its index lists it (property-editor P6)", async () => {
    const projectId = project("Paged")
    await projectUtils.createFile(
      projectId,
      `Card${SP.EDITOR_PAGE_SUFFIX}`,
      "<ui-property-editor></ui-property-editor>\n"
    )
    const index = await projectUtils.getIndex(projectId)
    expect(index.imports.map((it) => it.path)).toEqual(["/Paged.spell", `/Card${SP.EDITOR_PAGE_SUFFIX}`])
  })

  // epic `elemental-spell` J95, Owen 2026-10-25:  "one file" -- a template is a `.spell` file OR a `.spellml` file
  test("a .spellml file is an import of its own, as a .spell file is", async () => {
    const projectId = project("Tags")
    const folder = resolve(workspace, "Tags")
    writeFileSync(resolve(folder, "Card.spellml"), '<spell-thing "card">\n</spell-thing>\n')

    const index = await projectUtils.getIndex(projectId)
    expect(index.imports.map((it) => it.path)).toEqual(["/Tags.spell", "/Card.spellml"])
  })

  describe("sub-folders (notebook P10)", () => {
    const TAG = '<spell-thing "card">\n</spell-thing>\n'
    /** Write `file` under project `folder`, making its sub-folders. */
    function write(folder: string, file: string, contents = TAG) {
      mkdirSync(dirname(resolve(folder, file)), { recursive: true })
      writeFileSync(resolve(folder, file), contents)
    }

    test("every folder's files are the project's, listed by their path:  two `Usage.spellml` are two files", async () => {
      const projectId = project("Folders")
      const folder = resolve(workspace, "Folders")
      write(folder, "Button/Usage.spellml")
      write(folder, "Divider/Usage.spellml")
      write(folder, "Divider/deep/er/API.spellml")

      const index = await projectUtils.getIndex(projectId)
      expect(index.imports.map((it) => it.path)).toEqual([
        "/Folders.spell",
        "/Button/Usage.spellml",
        "/Divider/Usage.spellml",
        "/Divider/deep/er/API.spellml"
      ])
      expect(Object.keys(index.manifest)).toEqual(index.imports.map((it) => `${projectId}${it.path}`))
      expect(index.imports[1]!.contents).toBe(TAG)
      // new ones go in the project file too, each by its path
      expect((await projectUtils.loadProjectFile(projectId)).imports.map((it) => it.path)).toContain(
        "/Divider/deep/er/API.spellml"
      )
    })

    test("NEVER walks into what isn't the project's source:  private, hidden, built, or another project", async () => {
      const projectId = project("Fenced")
      const folder = resolve(workspace, "Fenced")
      for (const inside of [
        "__draft/Page.spellml",
        "versions/Page.spellml",
        "__data/Page.spellml",
        ".git/Page.spellml",
        "build/Page.spellml",
        "dist/Page.js",
        "node_modules/x/index.js",
        "Button/.hidden.spellml",
        "Button/node_modules/x/index.js",
        "Inner/Page.spellml",
        "Odd(1)/Page.spellml"
      ])
        write(folder, inside)
      write(folder, `Inner/${SP.PROJECT_FILE}`, '{ "imports": [] }')
      write(folder, "Button/Usage.spellml")
      write(folder, "__snapshots__/Page.spellml")

      const index = await projectUtils.getIndex(projectId)
      expect(index.imports.map((it) => it.path)).toEqual([
        "/Fenced.spell",
        "/__snapshots__/Page.spellml",
        "/Button/Usage.spellml"
      ])
    })

    test("what's generated stays out at any depth:  compiled output and an old name's words", async () => {
      const projectId = project("Generated")
      const folder = resolve(workspace, "Generated")
      const words = SP.SpellWords.script({ lang: "en", types: {} }, "x")
      write(folder, "Button/Usage.spell.js", "export default 1\n")
      write(folder, "Button/calculator.en.js", words)
      write(folder, "Button/socket.io.js", "export const io = 1\n")

      const index = await projectUtils.getIndex(projectId)
      expect(index.imports.map((it) => it.path)).toEqual(["/Generated.spell", "/Button/socket.io.js"])
    })

    test("two files of one name:  each opens, saves and renames by its own path", async () => {
      const projectId = project("TwoUsages")
      const folder = resolve(workspace, "TwoUsages")
      write(folder, "Button/Usage.spellml", "button\n")
      write(folder, "Divider/Usage.spellml", "divider\n")
      await projectUtils.getIndex(projectId)

      // opens:  the file's URL finds the right one
      const url = `/spaces/${projectId}/Divider/Usage.spellml`
      expect(projectUtils.locationForUrl(url).filePath).toBe("/Divider/Usage.spellml")
      expect(readFileSync(projectUtils.locationForUrl(url).serverPath, "utf8")).toBe("divider\n")

      // saves
      await projectUtils.saveFile(projectId, "/Button/Usage.spellml", "button 2\n")
      expect(readFileSync(resolve(folder, "Button/Usage.spellml"), "utf8")).toBe("button 2\n")
      expect(readFileSync(resolve(folder, "Divider/Usage.spellml"), "utf8")).toBe("divider\n")

      // renames:  only that one, in its place in the file order
      await projectUtils.renameFile(projectId, "/Button/Usage.spellml", "/Button/Examples.spellml")
      expect((await projectUtils.loadProjectFile(projectId)).imports.map((it) => it.path)).toEqual([
        "/TwoUsages.spell",
        "/Button/Examples.spellml",
        "/Divider/Usage.spellml"
      ])
    })

    test("renaming moves a file between folders, making the new one, and removes a folder left empty", async () => {
      const projectId = project("Moved")
      const folder = resolve(workspace, "Moved")
      write(folder, "Old/deep/Usage.spellml")
      write(folder, "Keep/One.spellml")
      write(folder, "Keep/Two.spellml")
      await projectUtils.getIndex(projectId)

      // no leading slash:  the project file still says it the one way
      await projectUtils.renameFile(projectId, "Old/deep/Usage.spellml", "New/Usage.spellml")
      expect(existsSync(resolve(folder, "Old"))).toBe(false)
      expect(readFileSync(resolve(folder, "New/Usage.spellml"), "utf8")).toBe(TAG)
      expect((await projectUtils.loadProjectFile(projectId)).imports.map((it) => it.path)).toEqual([
        "/Moved.spell",
        "/Keep/One.spellml",
        "/Keep/Two.spellml",
        "/New/Usage.spellml"
      ])

      // a folder with something left in it stays
      await projectUtils.renameFile(projectId, "/Keep/One.spellml", "/One.spellml")
      expect(existsSync(resolve(folder, "Keep/Two.spellml"))).toBe(true)
    })

    test("deleting a folder's last file removes the folder, and its parents left empty;  never the project's", async () => {
      const projectId = project("Emptied")
      const folder = resolve(workspace, "Emptied")
      write(folder, "A/B/Only.spellml")
      write(folder, "C/One.spellml")
      write(folder, "C/Two.spellml")
      await projectUtils.getIndex(projectId)

      await projectUtils.deleteFile(projectId, "/A/B/Only.spellml")
      expect(existsSync(resolve(folder, "A"))).toBe(false)
      await projectUtils.deleteFile(projectId, "/C/One.spellml")
      expect(existsSync(resolve(folder, "C/Two.spellml"))).toBe(true)
      await projectUtils.deleteFile(projectId, "/C/Two.spellml")
      expect(existsSync(resolve(folder, "C"))).toBe(false)
      expect(existsSync(folder)).toBe(true)
      expect((await projectUtils.loadProjectFile(projectId)).imports.map((it) => it.path)).toEqual(["/Emptied.spell"])
    })

    test("a link to a folder is NOT followed:  it could point back up", async () => {
      const projectId = project("Linked")
      const folder = resolve(workspace, "Linked")
      write(folder, "Button/Usage.spellml")
      symlinkSync(folder, resolve(folder, "Button/up"))

      const index = await projectUtils.getIndex(projectId)
      expect(index.imports.map((it) => it.path)).toEqual(["/Linked.spell", "/Button/Usage.spellml"])
    })

    test("a file only drafted, in a sub-folder, lists by its path", async () => {
      const projectId = project("Drafted")
      const { folderForPlace } = projectUtils
      const drafts = await ProjectDrafts.for(projectId, THIS_MACHINES_PERSON, { folderFor: folderForPlace })
      await drafts.save("/Button/New.spellml", TAG)

      const index = await projectUtils.getIndex(projectId)
      expect(index.imports.map((it) => it.path)).toEqual(["/Drafted.spell", "/Button/New.spellml"])
      expect(index.imports[1]!.contents).toBe(TAG)
    })
  })

  // epic `language` T75:  FizzBuzz's Explainer, gone a moment, came back last, after the counting it listens to
  test("a file gone a moment keeps its import's place in the project file:  the order is the order it runs", async () => {
    const projectId = project("Ordered")
    const folder = resolve(workspace, "Ordered")
    const imports = [
      { path: "/Console.spellml", active: true },
      { path: "/Explainer.spellml", active: true },
      { path: "/Ordered.spell", active: true }
    ]
    writeFileSync(resolve(folder, SP.PROJECT_FILE), JSON.stringify({ title: "Ordered", imports }, null, 2))
    const before = readFileSync(resolve(folder, SP.PROJECT_FILE), "utf8")
    writeFileSync(resolve(folder, "Console.spellml"), '<spell-thing "console">\n</spell-thing>\n')

    // the explainer not there:  left out of the index, and the project file left as it is
    const paths = async () => (await projectUtils.getIndex(projectId)).imports.map((it) => it.path)
    expect(await paths()).toEqual(["/Console.spellml", "/Ordered.spell"])
    expect(readFileSync(resolve(folder, SP.PROJECT_FILE), "utf8")).toBe(before)

    // back again:  in its place
    writeFileSync(resolve(folder, "Explainer.spellml"), '<spell-page "explainer">\n</spell-page>\n')
    expect(await paths()).toEqual(["/Console.spellml", "/Explainer.spellml", "/Ordered.spell"])
    expect(readFileSync(resolve(folder, SP.PROJECT_FILE), "utf8")).toBe(before)

    // a new one goes at the end, the gone one's place kept
    rmSync(resolve(folder, "Explainer.spellml"))
    writeFileSync(resolve(folder, "Extra.spellml"), '<spell-thing "extra">\n</spell-thing>\n')
    expect(await paths()).toEqual(["/Console.spellml", "/Ordered.spell", "/Extra.spellml"])
    expect((await projectUtils.loadProjectFile(projectId)).imports.map((it) => it.path)).toEqual([
      "/Console.spellml",
      "/Explainer.spellml",
      "/Ordered.spell",
      "/Extra.spellml"
    ])
  })

  test("deleting a file takes its import out of the project file, the rest in their order", async () => {
    const projectId = project("Pruned")
    const folder = resolve(workspace, "Pruned")
    writeFileSync(resolve(folder, "First.spellml"), '<spell-thing "first">\n</spell-thing>\n')
    await projectUtils.getIndex(projectId)
    await projectUtils.deleteFile(projectId, "/Pruned.spell")
    expect((await projectUtils.loadProjectFile(projectId)).imports).toEqual([{ path: "/First.spellml", active: true }])
  })

  // epic `repo-split` P21, Owen 2026-10-27:  ".spellml", and "support both for now"
  test("an old .spellx file still lists, as a .spellml file does", async () => {
    const projectId = project("OldTags")
    const folder = resolve(workspace, "OldTags")
    writeFileSync(resolve(folder, `Card${SP.OLD_SPELLML_SUFFIX}`), '<spell-thing "card">\n</spell-thing>\n')
    writeFileSync(resolve(folder, "Deck.spellml"), '<spell-thing "deck">\n</spell-thing>\n')

    const index = await projectUtils.getIndex(projectId)
    expect(index.imports.map((it) => it.path)).toEqual([
      "/OldTags.spell",
      `/Card${SP.OLD_SPELLML_SUFFIX}`,
      "/Deck.spellml"
    ])
  })

  // the bug of 2026-10-22:  a project copied to a folder of another name read its old words file as spell
  test("a words file is never one of a project's files, whatever its name:  an old name's is left out", async () => {
    const projectId = project("calc2")
    const folder = resolve(workspace, "calc2")
    const words = SP.SpellWords.script({ lang: "en", types: { Calculator: { clear: "clear (a calculator)" } } }, "x")
    writeFileSync(resolve(folder, "calc2.en.js"), words)
    writeFileSync(resolve(folder, "calculator.en.js"), words)
    writeFileSync(resolve(folder, "Calculator.es.js"), words)
    // a helper whose name looks like one, but isn't:  still listed
    writeFileSync(resolve(folder, "socket.io.js"), "export const io = 1\n")

    const index = await projectUtils.getIndex(projectId)
    expect(index.imports.map((it) => it.path)).toEqual(["/calc2.spell", "/socket.io.js"])
    expect(Object.keys(index.manifest).map((path) => path.split("/").pop())).toEqual(["calc2.spell", "socket.io.js"])
    expect((await projectUtils.loadProjectFile(projectId)).imports.map((it) => it.path)).toEqual([
      "/calc2.spell",
      "/socket.io.js"
    ])
  })

  // the suspected bug of 2026-10-13:  renaming or duplicating a project moved only its source folder
  test("renaming a project deletes what was built for the old name:  NOTHING of it is served for the new", async () => {
    const projectId = await built("Old")
    const newProjectId = projectId.replace(/Old$/, "New")
    // left by a project of that name deleted before `deleteApp()` deleted build folders
    await projectUtils.saveFile(newProjectId, "New.spell.js", "// not ours\n")
    expect(existsSync(resolve(workspace, "New"))).toBe(false)

    await projectUtils.renameApp(projectId, newProjectId)
    expect(filesIn("New")).toEqual(["Old.app.py", "Old.lib.ts", "Old.spell", "__project.json5"])
    expect(existsSync(resolve(buildDir, "build-test-projects/Old"))).toBe(false)
    expect(existsSync(resolve(buildDir, "build-test-projects/New"))).toBe(false)
  })

  test("duplicating a project copies its source, NOT what was built for it", async () => {
    const projectId = await built("Original")
    await projectUtils.duplicateApp(projectId, projectId.replace(/Original$/, "Copy"))
    expect(filesIn("Copy")).toEqual(["Original.app.py", "Original.lib.ts", "Original.spell", "__project.json5"])
    expect(filesIn("Original")).toEqual([...GENERATED("Original"), ...filesIn("Copy")].sort())
    expect(existsSync(resolve(buildDir, "build-test-projects/Original/Original.spell.js"))).toBe(true)
    expect(existsSync(resolve(buildDir, "build-test-projects/Copy"))).toBe(false)
  })

  test("an old project.json is read, and saved as __project.json5, its comments kept (P12, T1)", async () => {
    const projectId = project("Older")
    const folder = resolve(workspace, "Older")
    rmSync(resolve(folder, SP.PROJECT_FILE))
    writeFileSync(
      resolve(folder, "project.json"),
      '{\n  // mine\n  "imports": [{ "path": "/Older.spell", "active": true }],\n  "targets": ["py"]\n}\n'
    )
    expect((await projectUtils.getIndex(projectId)).targets).toEqual(["py"])
    await projectUtils.saveProjectFile(projectId, {
      ...(await projectUtils.loadProjectFile(projectId)),
      version: "1.0.0"
    })
    expect(existsSync(resolve(folder, "project.json"))).toBe(false)
    const saved = readFileSync(resolve(folder, SP.PROJECT_FILE), "utf8")
    expect(saved).toContain("// mine")
    expect(saved).toContain('"version": "1.0.0"')
  })

  test("a project's title:  in its file, its index and its group's list;  null takes it out (Q45)", async () => {
    const projectId = project("todos-form-based")
    await projectUtils.setProjectTitle(projectId, "Todos - Form Based")
    expect((await projectUtils.getIndex(projectId)).title).toBe("Todos - Form Based")
    expect(await projectUtils.getProjectList(projectId)).toContainEqual({
      path: projectId,
      title: "Todos - Form Based"
    })
    await projectUtils.setProjectTitle(projectId, undefined)
    expect((await projectUtils.loadProjectFile(projectId)).title).toBe("Todos - Form Based")
    await projectUtils.setProjectTitle(projectId, null)
    expect((await projectUtils.loadProjectFile(projectId)).title).toBeUndefined()
    expect(await projectUtils.getProjectList(projectId)).toContainEqual({ path: projectId })
  })

  test("the list says which projects hold a site, by what their files declare", async () => {
    const projectId = await built("Galaxy")
    writeFileSync(
      resolve(workspace, "Galaxy", "Galaxy.spell"),
      'galaxy guide is a site:\n\t- it has a films page at "/films"\n'
    )
    await projectUtils.setProjectTitle(projectId, "Galaxy")
    const entry = (await projectUtils.getProjectList(projectId)).find((each) => each.path === projectId)
    expect(entry?.isSite).toBe(true)
    writeFileSync(resolve(workspace, "Galaxy", "Galaxy.spell"), "// no site here\n")
    const after = (await projectUtils.getProjectList(projectId)).find((each) => each.path === projectId)
    expect(after?.isSite).toBeUndefined()
  })

  test("a project file's `\"onHome\": false` is in the group's list;  none says nothing", async () => {
    const projectId = await built("OffHome")
    await projectUtils.saveProjectFile(projectId, { imports: [], onHome: false })
    const entry = (await projectUtils.getProjectList(projectId)).find((each) => each.path === projectId)
    expect(entry).toMatchObject({ onHome: false })
    await projectUtils.saveProjectFile(projectId, { imports: [] })
    const after = (await projectUtils.getProjectList(projectId)).find((each) => each.path === projectId)
    expect(Object.keys(after!)).not.toContain("onHome")
  })

  test("deleting a project deletes its build folder too", async () => {
    const projectId = await built("Gone")
    await projectUtils.deleteApp(projectId)
    expect(existsSync(resolve(workspace, "Gone"))).toBe(false)
    expect(existsSync(resolve(buildDir, "build-test-projects/Gone"))).toBe(false)
  })
})

/** SIDE EFFECT:  the temp repo's `packages/` and `build/` replace `environment`'s, for the `describe()` it's in. */
function useTempRepo(): void {
  beforeAll(() => void Object.assign(environment, { packagesDir, buildDir }))
  afterAll(() => void Object.assign(environment, realFolders))
}

/** SIDE EFFECT:  make project `projectName` in the temp workspace, with one spell file;  returns its id. */
function project(projectName: string): string {
  const folder = resolve(workspace, projectName)
  mkdirSync(folder, { recursive: true })
  writeFileSync(
    resolve(folder, SP.PROJECT_FILE),
    JSON.stringify({ imports: [{ path: `/${projectName}.spell`, active: true }] })
  )
  writeFileSync(resolve(folder, `${projectName}.spell`), "set foo to 1\n")
  return locationForDiskPath(resolve(folder, `${projectName}.spell`))!.projectId
}

/** SIDE EFFECT:  `project()`, with a compiled file in its build folder;  returns its id. */
async function built(projectName: string): Promise<string> {
  const projectId = project(projectName)
  await projectUtils.saveFile(projectId, `${projectName}.spell.js`, "export default 1\n")
  expect(existsSync(resolve(buildDir, "build-test-projects", projectName, `${projectName}.spell.js`))).toBe(true)
  for (const name of [...GENERATED(projectName), `${projectName}.lib.ts`, `${projectName}.app.py`]) {
    writeFileSync(resolve(workspace, projectName, name), "// written by spell\n")
  }
  return projectId
}

/**
 * Files spell writes beside project `projectName`'s source, and writes again on each compile:
 * declarations, words, a target's words, and compiled output by its name before `build/`.
 */
function GENERATED(projectName: string): string[] {
  return [".compiled.js", ".declarations.json5", ".en.js", ".py.en.json5"].map((suffix) => `${projectName}${suffix}`)
}

/** Names of the files in the temp workspace's project `projectName`, sorted. */
function filesIn(projectName: string): string[] {
  return readdirSync(resolve(workspace, projectName)).sort()
}
