import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, test, expect } from "vite-plus/test"

import { BuiltInSounds, SOUND_KINDS } from "spell/ui/sounds"

/** The sound files, as they are in the folder. */
const FILES = readdirSync(fileURLToPath(new URL(".", BuiltInSounds.url("click")!))).filter((file) => file.endsWith(".ogg"))

describe("BuiltInSounds", () => {
  test("every sound has its file, and every file is a sound", () => {
    expect(BuiltInSounds.all.map((sound) => BuiltInSounds.fileOf(sound)).toSorted()).toEqual(FILES.toSorted())
  })

  test("each name, English or Spanish, finds its own sound and no other;  every kind has sounds", () => {
    for (const sound of BuiltInSounds.all) {
      expect(BuiltInSounds.find(sound.name)).toBe(sound)
      expect(BuiltInSounds.find(sound.es)).toBe(sound)
    }
    for (const kind of SOUND_KINDS) expect(BuiltInSounds.ofKind(kind).length).toBeGreaterThan(0)
  })

  test("find():  either language, any case, dashes or spaces, accents or not", () => {
    const slide = BuiltInSounds.find("card slide")
    expect(slide).toMatchObject({ es: "deslizar carta", kind: "cards" })
    expect(BuiltInSounds.find("Card-Slide")).toBe(slide)
    expect(BuiltInSounds.find("deslizar carta")).toBe(slide)
    expect(BuiltInSounds.find("tablon")).toBe(BuiltInSounds.find("plank"))
    expect(BuiltInSounds.find("no such sound")).toBeUndefined()
  })

  test("url():  the file in `sound-library/`, beside the class, or under a base given", () => {
    expect(BuiltInSounds.url("ganar")).toMatch(/\/src\/sounds\/sound-library\/win\.ogg$/)
    expect(BuiltInSounds.url("win", "https://example.com/assets/")).toBe("https://example.com/assets/sound-library/win.ogg")
    expect(BuiltInSounds.url("nope")).toBeUndefined()
  })
})
