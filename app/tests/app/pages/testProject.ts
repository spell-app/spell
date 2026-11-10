import { existsSync, readdirSync } from "node:fs"
import path from "node:path"

import environment from "spell/app/spaces/server/node/environment"
import { isRunning, testProjectFolderParts } from "../../realSpaceCheck"

/**
 * A project a test makes in your real space, through the running editor, which never outlives its test for long.
 * - Named with the test run's process number:  `owen@spell/drafts-test-82913`.
 * - Making one first removes every earlier project of that name whose process is gone:
 *   a killed run never gets to clean up after itself, so the next run does it.
 * - Every removal is checked, and throws when it didn't work:  a test that can't clean up fails, rather than leaving
 *   a project in your project menu.
 * - The folder-name rule is in `realSpaceCheck`, which has to load outside any test.
 */

/** Whose space test projects are made in. */
const OWNER = "owen@spell"
/** A project made by `createTestProject()`. */
export type TestProject = {
  /** Its full path:  `owen@spell/drafts-test-82913`. */
  projectId: string
  /** Its folder on disk. */
  folder: string
  /**
   * Remove it.
   * - throws if the editor says no, or its folder is still there
   */
  remove(): Promise<void>
}

/** What `createTestProject()` makes. */
export type TestProjectOptions = {
  /** What kind of test this is, the start of the project's name:  `drafts`. */
  name: string
  /** Its one file, from the project's root:  `/Note.spell`. */
  filePath: string
  /** That file's text. */
  contents: string
}

/**
 * Make a test project in your real space, through the editor at `editor`.
 * - SIDE EFFECT:  first removes every project called `<name>-test-<process number>` whose process is gone.
 * - throws if a leftover can't be removed, or the editor won't make the project
 */
export async function createTestProject(
  editor: string,
  { name, filePath, contents }: TestProjectOptions
): Promise<TestProject> {
  for (const folderName of leftoversFor(name)) await removeProject(editor, folderName)

  const folderName = `${name}-test-${process.pid}`
  const projectId = `${OWNER}/${folderName}`
  const response = await sendToEditor(editor, "/api/projects/create/project", "POST", { projectId, filePath, contents })
  if (!response.ok) {
    throw new Error(
      `createTestProject():  the editor wouldn't make ${projectId}, answering ${response.status}:  ${await response.text()}`
    )
  }
  return { projectId, folder: folderFor(folderName), remove: () => removeProject(editor, folderName) }
}

////////////////
// ## Helpers
////////////////

/** Folder names of the projects called `<name>-test-<process number>` whose process is gone. */
function leftoversFor(name: string): string[] {
  if (!existsSync(environment.userFilesRoot)) return []
  return readdirSync(environment.userFilesRoot).filter((folderName) => {
    const parts = testProjectFolderParts(folderName)
    return parts?.name === name && !isRunning(parts.pid)
  })
}

/** The folder of project `folderName` in your space. */
function folderFor(folderName: string): string {
  return path.join(environment.userFilesRoot, folderName)
}

/** Send `body` as JSON to `route` of the editor at `editor`. */
function sendToEditor(editor: string, route: string, method: string, body: object): Promise<Response> {
  return fetch(new URL(route, editor), {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  })
}

/**
 * Remove project `folderName` from your space, through the editor.
 * - throws if the editor can't be reached or says no, or the folder is still there after
 */
async function removeProject(editor: string, folderName: string): Promise<void> {
  const projectId = `${OWNER}/${folderName}`
  const folder = folderFor(folderName)
  let answer: string
  let removed: boolean
  try {
    const response = await sendToEditor(editor, "/api/projects/remove/project", "DELETE", { projectId })
    answer = `${response.status}:  ${(await response.text()).slice(0, 200)}`
    removed = response.ok && !existsSync(folder)
  } catch (error) {
    throw new Error(`removeProject():  couldn't ask the editor at ${editor} to remove ${projectId}`, { cause: error })
  }
  if (!removed) {
    throw new Error(
      `removeProject():  ${projectId} wasn't removed from your real space;  the editor answered ${answer}\n` +
        `Delete its folder by hand:  ${folder}`
    )
  }
}
