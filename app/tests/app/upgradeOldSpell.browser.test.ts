import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { SP, spellParser } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { UPGRADE_ON_OPEN_PREF, editorPrefs } from "spell/app/app/editorPrefs"

/**
 * A project written for an older Spell, as the editor opens it (epic `language` P68):
 * - the notice offering to upgrade it (`editor.upgradeOffered`, `<UpgradeNotice>`), ONCE per project
 * - Upgrade:  each file's old forms rewritten the new way and saved, then its project file's `spellVersion`,
 *   then a notice saying how many lines changed
 * - Upgrade old Spell when a project opens on:  no notice, upgraded at once
 * - The project and its files are stand-ins, parsed for real:  their saves and the server's answer are recorded.
 */

/** A file with two old forms:  `parts`, and `wait for`. */
const OLD = 'a card is a view where\n\tit has parts "front"\n\tto deal it\n\t\twait for: show it\n'
/** The same file, upgraded. */
const NEW = 'a card is a view where\n\tit has slots "front"\n\tto deal it\n\t\tshow it\n'

/** Undo for each test. */
const cleanups: (() => void)[] = []
/** The projects whose `spellVersion` the server was asked to write. */
let versioned: string[] = []

beforeEach(() => {
  versioned = []
  const spy = vi
    .spyOn(SPACES.SpellProjectRoot.prototype, "saveSpellVersion")
    .mockImplementation(async (project: SP.SpellProject) => {
      versioned.push(project.path)
    })
  cleanups.push(() => spy.mockRestore())
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  editorPrefs.set(UPGRADE_ON_OPEN_PREF, undefined)
  editorPrefs.set("upgradeOffered", undefined)
  editor.upgradeOffered = undefined
  editor.hideNotice()
})

/** A stand-in project at `path`, its project file saying `spellVersion`, holding one file of `text`, parsed. */
function projectOf(path: string, text: string, spellVersion?: string) {
  const saves: string[] = []
  const project = {
    path,
    projectId: path,
    contents: { spellVersion, imports: [] },
    compiledFrom: "compile",
    spellFiles: [] as unknown[],
    files: [] as unknown[],
    updatedContentsFor: () => {},
    // nothing typed is waiting:  saving asks first (`takeWaitingText()`, epic `solid-2-final` P9)
    takeWaitingText: () => {}
  }
  const file = {
    path: `${path}/Cards.spell`,
    project,
    contents: text,
    isDirty: false,
    isLoaded: true,
    match: spellParser.getScope(`upgrade-${path}`).parse(text, "block"),
    get parseText() {
      return text
    },
    save: async () => {
      saves.push(file.contents)
    }
  }
  project.spellFiles = [file]
  project.files = [file]
  return { project: project as unknown as SP.SpellProject, file, saves }
}

describe("upgrading a project written for an older Spell", () => {
  test("an older project with old forms:  the notice offers it, once;  Upgrade rewrites and saves, then says so", async () => {
    const { project, file, saves } = projectOf("owen@spell/upgrade-a", OLD, "0.8.0")
    await editor.offerUpgrade(project)
    expect(editor.upgradeOffered).toBe(project)

    await editor.upgradeProject()
    expect(editor.upgradeOffered).toBeUndefined()
    expect(file.contents).toBe(NEW)
    expect(saves).toEqual([NEW])
    expect(versioned).toEqual(["owen@spell/upgrade-a"])
    expect(editor.notice).toBe(
      "Your project now matches Spell 0.9, the newest version.\n" +
        "The editor changed 2 lines in your project to Spell 0.9's new style.\n" +
        "They still do the same thing:  there's nothing else for you to do."
    )
  })

  test("closed, it's remembered in the browser for that project, so it never shows again", async () => {
    const { project } = projectOf("owen@spell/upgrade-b", OLD)
    await editor.offerUpgrade(project)
    expect(editor.upgradeOffered).toBe(project)
    editor.dismissUpgrade()

    // asked again for the same project:  nothing
    const again = projectOf("owen@spell/upgrade-b", OLD)
    await editor.offerUpgrade(again.project)
    expect(editor.upgradeOffered).toBeUndefined()
    expect(editorPrefs.get<Record<string, true>>("upgradeOffered")).toEqual({ "owen@spell/upgrade-b": true })
  })

  test("with Upgrade old Spell when a project opens on:  upgraded at once, no notice first", async () => {
    editorPrefs.set(UPGRADE_ON_OPEN_PREF, true)
    const { project, file } = projectOf("owen@spell/upgrade-c", OLD, "0.8.0")
    await editor.offerUpgrade(project)
    expect(editor.upgradeOffered).toBeUndefined()
    expect(file.contents).toBe(NEW)
    expect(versioned).toEqual(["owen@spell/upgrade-c"])
  })

  test("nothing for today's Spell, a project with no old form, or one of Spell's own", async () => {
    await editor.offerUpgrade(projectOf("owen@spell/upgrade-d", OLD, SP.SPELL_VERSION).project)
    await editor.offerUpgrade(projectOf("owen@spell/upgrade-e", NEW).project)
    await editor.offerUpgrade(projectOf("@spell/examples/upgrade-f", OLD).project)
    expect(editor.upgradeOffered).toBeUndefined()
    expect(versioned).toEqual([])
  })
})
