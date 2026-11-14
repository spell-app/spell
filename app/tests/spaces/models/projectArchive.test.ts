import { describe, expect, test } from "vite-plus/test"

import { SPACES } from "spell/app/spaces"
import { zipOf } from "spell/app/spaces/models/zip"

/** Some bytes that aren't text:  a NUL among them. */
const PICTURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff])

/** `text` as bytes. */
const bytesOf = (text: string) => new TextEncoder().encode(text)

describe("projectArchiveZip() and projectArchiveFrom()", () => {
  test("a round trip:  the project in a folder of its name, text as text, a picture as bytes, its title", async () => {
    const archive: SPACES.ProjectArchive = {
      name: "Solitaire",
      files: [
        { path: "/Solitaire.spell", contents: "# Solitaire\n" },
        { path: "/Button/Usage.spell", contents: "usage\n" },
        { path: "/__thumbnail.png", contents: PICTURE },
        { path: "/__project.json5", contents: '{ title: "Solitaire!", imports: [] }\n' }
      ]
    }
    const zip = await SPACES.projectArchiveZip(archive)
    const back = await SPACES.projectArchiveFrom("Solitaire (2).zip", zip)
    expect(back.name).toBe("Solitaire")
    expect(back.title).toBe("Solitaire!")
    expect(back.files).toEqual(archive.files)
  })

  test("a zip of loose files is named for the zip;  a Mac's extras and hidden files are left out", async () => {
    const zip = await zipOf([
      { path: "Main.spell", bytes: bytesOf("main\n") },
      { path: "pics/a.png", bytes: PICTURE },
      { path: "__MACOSX/._Main.spell", bytes: PICTURE },
      { path: ".DS_Store", bytes: PICTURE }
    ])
    const archive = await SPACES.projectArchiveFrom("my-thing.zip", zip)
    expect(archive.name).toBe("my-thing")
    expect(archive.files.map(({ path }) => path)).toEqual(["/Main.spell", "/pics/a.png"])
  })

  test("an old .spell.json export still reads", async () => {
    const old = {
      format: SPACES.OLD_PROJECT_ARCHIVE_FORMAT,
      name: "a",
      title: "A!",
      files: [{ path: "/A.spell", contents: "" }]
    }
    const archive = await SPACES.projectArchiveFrom("a.spell.json", bytesOf(JSON.stringify(old)))
    expect(archive).toEqual({ name: "a", title: "A!", files: [{ path: "/A.spell", contents: "" }] })
  })

  test("anything else throws TypeError", async () => {
    await expect(SPACES.projectArchiveFrom("x.json", bytesOf('{"format":"x"}'))).rejects.toThrow(TypeError)
    await expect(SPACES.projectArchiveFrom("x.txt", bytesOf("hello"))).rejects.toThrow(TypeError)
    await expect(SPACES.projectArchiveFrom("x.zip", await zipOf([]))).rejects.toThrow(TypeError)
  })
})
