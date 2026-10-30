import { resolve } from "path"

import { SRV } from "spell/server"
import { CLI } from "spell/app/cli"

/**
 * `spell app preview build | serve | viewer` (Owen's names, epic `debut` Q16):
 *   the editor's static build, the public preview, or the viewer alone.
 * - `build`:  writes it, `app/dist-static/` (`CLI.PreviewSite.build()`), and lists what it holds.
 * - `viewer <folder> <project...>`:  `<spell-viewer>` alone, run mode only, and those projects,
 *   into a site's folder (`CLI.PreviewSite.buildViewer()`;  spell.app's page, epic `repo-split` P25).
 * - `serve [--port <port>] [--headless]`:  shows the build as a host would, on loopback,
 *   and opens it in a browser, until `Ctrl-C`.
 *   - No page server:  the page reads only the build's files, so it shows what a host would.
 * - Builds only:  no deploy yet (epic `debut` Q6).
 * - Returns the exit code.
 */
export async function previewCommand(
  session: CLI.CliSession,
  args: string[],
  options: CLI.PreviewOptions
): Promise<number> {
  const [verb, ...rest] = args
  if (verb === "viewer") return viewerCommand(session, rest)
  const site = new CLI.PreviewSite()
  if (verb === "build") {
    const status = new CLI.StatusReporter(session.isInteractive)
    const row = status.start("Building the static editor")
    let contents: CLI.PreviewContents
    try {
      contents = await site.build(session)
    } catch (error) {
      status.done(row, "failed", error instanceof Error ? error.message : String(error))
      status.finish()
      return CLI.EXIT.ERRORS
    }
    status.done(row, "ok", site.folder)
    status.finish()
    for (const [group, projectIds] of Object.entries(contents.groups)) {
      session.out(`${group}:  ${projectIds.length ? projectIds.join(", ") : "none yet"}`)
    }
    if (contents.imported.length) session.out(`and what they import:  ${contents.imported.join(", ")}`)
    session.err("`spell app preview serve` shows it as a host would")
    return CLI.EXIT.OK
  }
  if (verb !== "serve") throw new CLI.CliError(`\`spell app preview\` takes build, serve or viewer, not '${verb}'`)

  if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 1 || options.port > 65_534)) {
    throw new CLI.CliError(`--port must be a port number`)
  }
  const { url, server } = await site.serve({ port: options.port })
  session.out(url)
  session.err(`The static editor (${site.folder}) is at ${url} -- Ctrl-C to stop`)
  if (!options.headless) SRV.openBrowser(url)
  await SRV.untilInterrupted(server.server)
  return CLI.EXIT.OK
}

/**
 * `spell app preview viewer <folder> <project...>`:  writes `<spell-viewer>` and the projects into `folder`,
 * and lists them.
 * - throws `CLI.CliError` without a folder and a project
 */
async function viewerCommand(session: CLI.CliSession, [folder, ...projectIds]: string[]): Promise<number> {
  if (!folder || !projectIds.length) {
    throw new CLI.CliError(`\`spell app preview viewer\` takes a folder, then the projects to show`)
  }
  const site = new CLI.PreviewSite(resolve(folder))
  const status = new CLI.StatusReporter(session.isInteractive)
  const row = status.start("Building <spell-viewer> and its projects")
  let written: string[]
  try {
    written = await site.buildViewer(session, projectIds)
  } catch (error) {
    status.done(row, "failed", error instanceof Error ? error.message : String(error))
    status.finish()
    return CLI.EXIT.ERRORS
  }
  status.done(row, "ok", site.folder)
  status.finish()
  session.out(`element/, and spaces/ for:  ${written.join(", ")}`)
  return CLI.EXIT.OK
}
