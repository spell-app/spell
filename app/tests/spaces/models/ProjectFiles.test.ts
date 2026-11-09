import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { CONFIRM, LoadableFile } from "spell/util"
import { SPACES } from "spell/app/spaces"
import type { SP } from "spell/parser/spell"

/** A project of one file in a folder, enough for `ProjectFiles` to ask its questions. */
function projectWith(file: { path: string; file: string }) {
  const files = [file]
  const project = {
    projectId: "@spell/examples/Proj",
    files,
    loadOrDie: async () => {},
    getFile: (filePath: string) => (file.path.endsWith(`/Proj${filePath}`) ? file : undefined),
    contents: undefined
  }
  return project as unknown as SP.SpellProject
}

const FILE = { path: "@spell/examples/Proj/Button/Usage.spellml", file: "Usage.spellml", onRemove: () => {} }

describe("ProjectFiles, a file in a folder", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test("rename() starts from its path in the project, so it stays in its folder unless you move it", async () => {
    const prompt = vi.fn(() => null)
    vi.stubGlobal("prompt", prompt)
    await new SPACES.ProjectFiles(projectWith(FILE)).rename("/Button/Usage.spellml")
    expect(prompt).toHaveBeenCalledWith("New name for the file?", "Button/Usage.spellml")
  })

  test("rename() sends the new path, so a file can move to another folder", async () => {
    vi.stubGlobal("prompt", () => "Divider/Usage.spellml")
    const fetch = vi.spyOn(LoadableFile, "fetch").mockResolvedValue({})
    await expect(new SPACES.ProjectFiles(projectWith(FILE)).rename("/Button/Usage.spellml")).rejects.toThrow()
    expect(fetch.mock.calls[0]![0]).toMatchObject({
      contents: {
        projectId: "@spell/examples/Proj",
        filePath: "/Button/Usage.spellml",
        newFilePath: "/Divider/Usage.spellml"
      }
    })
  })

  test("delete() asks by its path in the project", async () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal("confirm", confirm)
    const project = projectWith(FILE)
    ;(project.files as unknown[]).push(FILE)
    await new SPACES.ProjectFiles(project).delete("/Button/Usage.spellml", CONFIRM)
    expect(confirm).toHaveBeenCalledWith("Really remove file 'Button/Usage.spellml'?")
  })
})
