import { existsSync, readdirSync } from "node:fs"
import path from "node:path"

import type { TestProject } from "vite-plus/test/node"

import { spellSpacesDir } from "spell/app/spaces/server/node/spellSpacesDir"

/**
 * Fails a test run that adds a folder to your real space, naming it.
 * - The app's Vitest settings run this around every run, once (its `globalSetup`):
 *   `yarn test`, `yarn test:integration`, and any one project.
 * - It lists the space's folders by name only, each org, person and project:  so editing a file never trips it.
 * - Your real space is shared by every worktree, so a running test of another session's is not counted
 *   (`isAnotherRunsTestProject()`).
 * - Known limit:  a project you make by hand during a run fails that run, once, naming it.
 * - Python's tests run after Vitest, so this doesn't see them.
 * - NEVER removes anything:  what's new is for a person to look at.
 * - NEVER imports `environment`:  Vitest's global setup can't load it (`spellSpacesDir.ts` says why).
 */

/** Which folders aren't an org's, a person's or a project's:  `__prefs`, `__admin`, `.git` ... */
const NOT_A_SPACE_FOLDER = /^(__|\.)/

/** A test project's folder name:  a name, `-test-`, its process number. */
const TEST_PROJECT_FOLDER = /^(?<name>.+)-test-(?<pid>\d+)$/

/** A person's folder in an org:  `owen@`, holding that person's projects. */
const PERSON_FOLDER = /@$/

/**
 * Vitest calls this before the run, and what it returns after.
 * - Every project that extends the root settings gets it too:  it does its work only for the root project, once.
 * - throws after the run, naming what's new, to fail it
 */
export default function realSpaceCheck(project: TestProject): (() => void) | void {
  if (!project.isRootProject()) return
  const before = spaceFolders()
  return () => {
    const added = newSpaceFolders(before)
    if (added.length) throw new Error(leftBehindMessage(added))
  }
}

/** Every org, person and project folder in the real space, by its path there:  `@spell/owen@/recipes`. */
export function spaceFolders(): string[] {
  return subfolders(spellSpacesDir).flatMap((org) =>
    subfolders(path.join(spellSpacesDir, org)).flatMap((member) => {
      const memberPath = path.join(org, member)
      const projects = PERSON_FOLDER.test(member) ? subfolders(path.join(spellSpacesDir, memberPath)) : []
      return [org, memberPath, ...projects.map((projectName) => path.join(memberPath, projectName))]
    })
  )
}

/** The folders there now which weren't in `before`, less another run's live test projects. */
export function newSpaceFolders(before: string[]): string[] {
  const known = new Set(before)
  return [...new Set(spaceFolders())]
    .filter((folder) => !known.has(folder))
    .filter((folder) => !isAnotherRunsTestProject(path.basename(folder)))
}

/**
 * Is `folderName` a test project of ANOTHER process that's still running?
 * - Your real space is shared by every worktree, so another session's test can be running at the same moment.
 * - NOT this process's own:  the check should still name one that this run left behind.
 */
export function isAnotherRunsTestProject(folderName: string): boolean {
  const pid = testProjectFolderParts(folderName)?.pid
  return pid !== undefined && pid !== process.pid && isRunning(pid)
}

/** The name and process number of a test project's folder;  `undefined`:  it isn't one. */
export function testProjectFolderParts(folderName: string): { name: string; pid: number } | undefined {
  const groups = TEST_PROJECT_FOLDER.exec(folderName)?.groups
  return groups && { name: groups.name!, pid: Number(groups.pid) }
}

/** Is process `pid` running?  "Not allowed to signal it" means it is:  someone else's. */
export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}

/** What a failed check says. */
export function leftBehindMessage(added: string[]): string {
  return [
    `realSpaceCheck:  this test run left ${added.length} new folder(s) in your real space (${spellSpacesDir}):`,
    ...added.map((folder) => `  - ${folder}`),
    "A test should write to a temporary SPELL_SPACES_DIR, or make its project with createTestProject().",
    "Not this run's?  A project made by hand during a run shows here too:  run it again."
  ].join("\n")
}

/** The folders in `folder` that can be an org, person or project;  symlinked projects too. */
function subfolders(folder: string): string[] {
  if (!existsSync(folder)) return []
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) && !NOT_A_SPACE_FOLDER.test(entry.name))
    .map((entry) => entry.name)
}
