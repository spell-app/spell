import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { LoadableFile } from "spell/util"
import { SPACES } from "spell/app/spaces"
import type { SP } from "spell/parser/spell"

/** A project of one file in a folder, enough for `ProjectFiles` to find it. */
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
    vi.restoreAllMocks()
  })

  test("rename() sends the new path, so a file can move to another folder", async () => {
    const fetch = vi.spyOn(LoadableFile, "fetch").mockResolvedValue({})
    await expect(
      new SPACES.ProjectFiles(projectWith(FILE)).rename("/Button/Usage.spellml", "/Divider/Usage.spellml")
    ).rejects.toThrow()
    expect(fetch.mock.calls[0]![0]).toMatchObject({
      contents: {
        projectId: "@spell/examples/Proj",
        filePath: "/Button/Usage.spellml",
        newFilePath: "/Divider/Usage.spellml"
      }
    })
  })
})
