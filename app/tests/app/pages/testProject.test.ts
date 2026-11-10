import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * `createTestProject()`, on a temporary space and a stand-in editor:  this file never touches your real space.
 * - Not one of the `app:integration` tests:  it needs no running editor (`vitest.config.ts`).
 */

/** The temporary space:  set BEFORE `environment` is loaded, which reads it once. */
const SPACES = mkdtempSync(path.join(tmpdir(), "testProject-"))
process.env.SPELL_SPACES_DIR = SPACES

const { default: environment } = await import("spell/app/spaces/server/node/environment")
const { createTestProject } = await import("./testProject")

/** The test project every test makes. */
const OPTIONS = { name: "drafts", filePath: "/Note.spell", contents: "words" }

/** A process number nothing is running as:  a process that has already finished. */
const DEAD_PID = spawnSync(process.execPath, ["-e", ""]).pid

/** How the stand-in editor answers. */
type EditorReply = {
  /** The status of a removal;  default 200. */
  removeStatus?: number
  /** Answer that a removal worked, and leave the folder. */
  keepFolder?: boolean
}

describe("createTestProject()", () => {
  let server: Server
  let editor: string
  let reply: EditorReply = {}
  /** Each request the stand-in editor got:  its method, then its project. */
  let requests: string[] = []

  const projectFolder = (folderName: string) => path.join(environment.userFilesRoot, folderName)
  const leaveProject = (folderName: string) => mkdirSync(projectFolder(folderName), { recursive: true })

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = ""
      request.on("data", (chunk) => (body += chunk))
      request.on("end", () => {
        const { projectId } = JSON.parse(body) as { projectId: string }
        requests.push(`${request.method} ${projectId}`)
        const folder = projectFolder(projectId.split("/")[1]!)
        if (request.method === "POST") mkdirSync(folder, { recursive: true })
        else if (!reply.keepFolder && !reply.removeStatus) rmSync(folder, { recursive: true })
        response.statusCode = request.method === "DELETE" ? (reply.removeStatus ?? 200) : 200
        response.end("{}")
      })
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    editor = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
  })

  afterEach(() => {
    rmSync(environment.userFilesRoot, { recursive: true, force: true })
    reply = {}
    requests = []
  })

  afterAll(() => {
    server.close()
    rmSync(SPACES, { recursive: true, force: true })
  })

  test("names the project with this run's process number, and removes it through the editor", async () => {
    const project = await createTestProject(editor, OPTIONS)
    expect(project).toMatchObject({
      projectId: `owen@spell/drafts-test-${process.pid}`,
      folder: projectFolder(`drafts-test-${process.pid}`)
    })
    expect(existsSync(project.folder)).toBe(true)
    await project.remove()
    expect(existsSync(project.folder)).toBe(false)
    expect(requests).toEqual([`POST ${project.projectId}`, `DELETE ${project.projectId}`])
  })

  test("removes a killed run's project first;  NOT a running one's, nor another test's", async () => {
    leaveProject(`drafts-test-${DEAD_PID}`)
    leaveProject(`drafts-test-${process.ppid}`)
    leaveProject(`roster-test-${DEAD_PID}`)
    leaveProject("drafts-test-notes")

    await createTestProject(editor, OPTIONS)

    expect(requests[0]).toBe(`DELETE owen@spell/drafts-test-${DEAD_PID}`)
    expect(existsSync(projectFolder(`drafts-test-${DEAD_PID}`))).toBe(false)
    expect(existsSync(projectFolder(`drafts-test-${process.ppid}`))).toBe(true)
    expect(existsSync(projectFolder(`roster-test-${DEAD_PID}`))).toBe(true)
    expect(existsSync(projectFolder("drafts-test-notes"))).toBe(true)
  })

  test("a removal the editor refuses throws, naming the project and its folder", async () => {
    const project = await createTestProject(editor, OPTIONS)
    reply = { removeStatus: 500 }
    await expect(project.remove()).rejects.toThrow(
      new RegExp(`${project.projectId} wasn't removed .* answered 500[^]*${project.folder}`)
    )
  })

  test("a removal that says it worked but leaves the folder throws too", async () => {
    const project = await createTestProject(editor, OPTIONS)
    reply = { keepFolder: true }
    await expect(project.remove()).rejects.toThrow(`${project.projectId} wasn't removed`)
  })

  test("a leftover that can't be removed fails the test that's starting", async () => {
    leaveProject(`drafts-test-${DEAD_PID}`)
    reply = { removeStatus: 500 }
    await expect(createTestProject(editor, OPTIONS)).rejects.toThrow(`drafts-test-${DEAD_PID} wasn't removed`)
  })

  test("an editor that can't be reached throws, naming the project", async () => {
    leaveProject(`drafts-test-${DEAD_PID}`)
    const stopped = createServer()
    await new Promise<void>((resolve) => stopped.listen(0, "127.0.0.1", resolve))
    const { port } = stopped.address() as AddressInfo
    await new Promise((resolve) => stopped.close(resolve))
    await expect(createTestProject(`http://127.0.0.1:${port}/`, OPTIONS)).rejects.toThrow(
      `to remove owen@spell/drafts-test-${DEAD_PID}`
    )
  })
})
