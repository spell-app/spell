import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SpellUiThemes } from "spell/app/spaces/server/node/themes/SpellUiThemes"
import { isSpellAdmin } from "spell/app/spaces/server/node/themes/themesRoutes"
import { PeopleStore, orgFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** Save into Spell UI (epic `debut` P25):  into a temporary themes folder and theme list. */
const root = mkdtempSync(resolve(tmpdir(), "spell-ui-themes-"))
const folder = join(root, "themes")
const listFile = join(root, "Themes.ts")
mkdirSync(join(folder, "palettes"), { recursive: true })
writeFileSync(join(folder, "glass.theme.json5"), '{ "surfaces": { "page": "#f2eefb" } }\n')
writeFileSync(
  listFile,
  ["  readonly own = [", "    // own:start", '    "spell",', '    "glass"', "    // own:end", "  ]", ""].join("\n")
)
const themes = new SpellUiThemes({ folder, listFile })
afterAll(() => rmSync(root, { recursive: true, force: true }))

/** A theme file as the theme editor exports one. */
const SUNSET = `// sunset.theme.json5:  made in the theme editor
{ "title": "Sunset", "extends": "glass", "brand": { "primary": { "color": "{hues.orange.color}" } } }
`

describe("SpellUiThemes", () => {
  test("writes the theme file and its sheet into Spell UI's themes folder, and adds it to the theme list", () => {
    expect(themes.save({ name: "sunset", text: SUNSET })).toBe("sunset.theme.json5")
    const file = readFileSync(join(folder, "sunset.theme.json5"), "utf8")
    expect(file).toMatch(/^\/\/ Sunset:  a theme made in Spell UI's theme editor/)
    expect(JSON.parse(file.split("\n").slice(2).join("\n")).extends).toBe("glass")
    const sheet = readFileSync(join(folder, "sunset.css"), "utf8")
    expect(sheet).toContain('@import "./glass.css";')
    expect(sheet).toContain("--ui-primary: var(--ui-orange);")
    expect(themes.names).toEqual(["spell", "glass", "sunset"])
    expect(readFileSync(listFile, "utf8")).toContain('    "glass",\n    "sunset"\n    // own:end')
  })

  test("refuses a name already there (409) unless asked to write over it;  the list keeps one of it", () => {
    expect(() => themes.save({ name: "glass", text: SUNSET })).toThrow(/already/)
    themes.save({ name: "sunset", text: SUNSET, overwrite: true })
    expect(themes.names).toEqual(["spell", "glass", "sunset"])
  })

  test("refuses a name that can't be one, and a file that isn't a theme (400)", () => {
    expect(() => themes.save({ name: "Bad Name", text: SUNSET })).toThrow(/can't name a theme/)
    expect(() => themes.save({ name: "nope", text: '{ "surfaces": { "nope": "#fff" } }' })).toThrow(
      /no name in the theme tree/
    )
  })
})

describe("isSpellAdmin()", () => {
  test("only `spell-admin` in Spell's own org:  a member is refused", async () => {
    const spaces = mkdtempSync(resolve(tmpdir(), "spell-admin-"))
    const storage = new DiskStorage(spaces)
    const people = new PeopleStore(storage)
    try {
      await people.me("owen")
      const write = (role: string) =>
        storage.write(
          orgFile("spell"),
          JSON.stringify({
            $type: "Org",
            id: "spell",
            name: "Spell",
            members: [{ $type: "Membership", person: { $ref: "Person#owen@spell" }, role }]
          })
        )
      await write("member")
      expect(await isSpellAdmin(people)).toBe(false)
      await write("spell-admin")
      expect(await isSpellAdmin(new PeopleStore(storage))).toBe(true)
    } finally {
      storage.close()
      rmSync(spaces, { recursive: true, force: true })
    }
  })
})
