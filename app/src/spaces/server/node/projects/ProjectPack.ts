import { join } from "path"

import { FolderWatch } from "spell/server/FolderWatch"
import { pathInside } from "spell/server/RealPath"

import { ComponentPack, PACK_FOLDER } from "spell/element-tools/ComponentPack"
import { ComponentPackError } from "spell/element-tools/tools.types"
import { SP } from "spell/parser/spell"
import { buildFolderFor } from "./project-utils"

/****************
 * ### `ProjectPack`
 * A Spell project's own elements, its COMPONENT PACK:  what its project file says
 * (`"componentPack": { "name", "prefix" }`, Q18), built by the kit's `ComponentPack` with the project's compiled output.
 * - Its generated folder is `__pack/` in the project's BUILD folder, beside `<Project>.spell.js` (`buildFolderFor()`):
 *   its catalog, its entry, its source entry and its script, none committed;  a page asks for it at
 *   `/spaces/<project>/__pack/<name>.pack.js` (`isPackFile()`, `SP.SpellUrls.packUrl()`).
 * - Built by `spell compile` (only when its sources changed:  `ComponentPack.needsBuild()`), and again by the page
 *   server as one of its elements is saved (`spell compile --pack`, `ProjectBuild.rebuildPack()`).
 * - Node only.
 ****************/
export class ProjectPack {
  /**
   * The pack of the project in folder `projectFolder`, built into its build folder;  `undefined` when its project file
   * declares none.
   * - Throws `ComponentPackError` for one it declares that can't be read.
   */
  static of(projectFolder: string): ComponentPack | undefined {
    if (!ComponentPack.projectPackOf(projectFolder)) return undefined
    return ComponentPack.read(projectFolder, { generated: ProjectPack.generatedFolder(projectFolder) })
  }

  /** The pack of project `projectId`, by its address:  `of()` its folder. */
  static ofProject(projectId: string): ComponentPack | undefined {
    return ProjectPack.of(SP.SpellLocation.getProjectLocation(projectId).serverPath)
  }

  /** Where the pack of the project in `projectFolder` is built:  `__pack/` in its build folder. */
  static generatedFolder(projectFolder: string): string {
    return join(buildFolderFor(projectFolder), PACK_FOLDER)
  }

  /**
   * Build the pack of the project in `projectFolder` when it must be:  its sources changed since its script was built,
   * or there's none (`ComponentPack.needsBuild()`);  always with `force`.
   * - `forPage`:  an open page's rebuild, as an element is saved (`ComponentPack.build()`'s:  unminified, its chunks
   *   named afresh).
   * - Returns what happened:  `"none"` (no pack), `"current"`, or what it built;  a `problem` when the build failed,
   *   its message (an import the page can't share, a tag without the prefix ...).
   * - NEVER throws.
   */
  static async build(
    projectFolder: string,
    { force = false, forPage = false }: { force?: boolean; forPage?: boolean } = {}
  ): Promise<ProjectPackBuilt> {
    let pack: ComponentPack | undefined
    try {
      pack = ProjectPack.of(projectFolder)
      if (!pack) return { built: "none" }
      if (!force && !pack.needsBuild()) return { built: "current", pack: pack.name }
      const report = await pack.build({ forPage })
      return { built: "built", pack: pack.name, tags: report.tags.length, script: pack.files.script }
    } catch (error) {
      const problem = error instanceof ComponentPackError || error instanceof Error ? error.message : String(error)
      return { built: "failed", pack: pack?.name, problem }
    }
  }
}

/**
 * Watch `folders` for a save to a project's own elements, and rebuild its pack:
 * the page server's watch of the spaces (`appRoutes.ts`).
 * - Waits for quiet first (`quiet` ms, `FolderWatch`'s own):  a save is often several writes, and a formatter after.
 * - Which saves:  a file in a project's pack's folder (`components/`), or a file of the project one of its elements
 *   imports (`ComponentPack.sources()`), of a project whose project file declares a pack;  never its generated files.
 * - Then `rebuild()` (`ProjectBuild.rebuildPack()`:  one at a time per project), and once it built, `report()` its
 *   script:  the page server tells every open page it changed.
 * - `projectFor()`:  the project a changed path (from its folder) is in, by address and folder;  `undefined` for none.
 * - Returns what stops it.
 */
export function watchProjectPacks({
  folders,
  rebuild,
  report,
  quiet = PACK_QUIET_MS
}: {
  folders: Array<{ dir: string; projectFor: (inside: string) => { projectId: string; folder: string } | undefined }>
  rebuild: (projectId: string) => Promise<boolean>
  report: (projectId: string, pack: ComponentPack) => void
  quiet?: number
}): () => void {
  const rebuildAndReport = async (projectId: string, pack: ComponentPack) => {
    if (await rebuild(projectId)) report(projectId, pack)
  }
  const watches = folders.map(
    ({ dir, projectFor }) =>
      new FolderWatch(dir, { keepsAlive: false, quiet }, (paths) => {
        const byProject = new Map<string, { folder: string; files: string[] }>()
        for (const inside of paths) {
          const project = projectFor(inside)
          if (!project) continue
          const known = byProject.get(project.projectId) ?? { folder: project.folder, files: [] }
          known.files.push(join(dir, inside))
          byProject.set(project.projectId, known)
        }
        for (const [projectId, { folder, files }] of byProject) {
          const pack = packChangedBy(folder, files)
          if (pack) void rebuildAndReport(projectId, pack)
        }
      })
  )
  return () => {
    for (const watch of watches) watch.close()
  }
}

/**
 * The pack of the project in `folder` when `files` (absolute) changed it:  see `watchProjectPacks()`;  else `undefined`.
 * - NEVER throws:  a project file that won't read is no pack's.
 */
function packChangedBy(folder: string, files: string[]): ComponentPack | undefined {
  try {
    const pack = ProjectPack.of(folder)
    if (!pack) return undefined
    const generated = (file: string) => pathInside(pack.generated, file) !== undefined
    const inFolder = (file: string) => pathInside(pack.components, file) !== undefined
    let sources: Set<string> | undefined
    const isSource = (file: string) => (sources ??= new Set(pack.sources())).has(file)
    return files.some((file) => !generated(file) && (inFolder(file) || isSource(file))) ? pack : undefined
  } catch {
    return undefined
  }
}

/** ms a project's files must be quiet before its pack is rebuilt (`watchProjectPacks()`). */
const PACK_QUIET_MS = 300

/** What `ProjectPack.build()` did. */
export type ProjectPackBuilt =
  | { built: "none" }
  | { built: "current"; pack: string }
  | { built: "built"; pack: string; tags: number; script: string }
  | { built: "failed"; pack?: string; problem: string }
