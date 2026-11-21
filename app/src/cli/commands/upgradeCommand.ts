import { SP } from "spell/parser/spell"
import { CLI } from "spell/app/cli"

/**
 * `spell upgrade [projects...]`:  bring projects written for an older Spell up to date (epic `language` P68, Q80).
 * - Rewrites each of Spell's old forms the new way, then writes the Spell each project now matches into its project
 *   file, `spellVersion`:  the same rewrite as `spell lint --fix` (`fixOldForms()`, `upgradeSpellVersion()`), under its
 *   own name.
 *   - It touches nothing else `--fix` would:  a page's old spellings and the editor pages are lint's.
 * - Prints what it changed, one line each (`path:line:col  fixed:  ...`), then a line per project saying where it
 *   stands;  `--json` prints the changes as a JSON array of `CLI.Problem`s instead, and the lines to stderr.
 * - `--dry-run`:  the same list, of what it WOULD change, and writes nothing.
 * - A `.spell` file:  only its own old forms;  the project's file is left as it is, as its other files may still
 *   hold some.
 * - Not a test project:  they stay frozen.
 * - Returns the exit code:  `EXIT.OK`, whatever it found.
 */
export async function upgradeCommand(
  session: CLI.CliSession,
  args: string[],
  options: CLI.UpgradeOptions
): Promise<number> {
  const write = !options.dryRun
  const changes: CLI.Problem[] = []
  const notes: string[] = []
  for (const resolved of await session.projects(args)) {
    if (resolved.kind === "file") {
      changes.push(...(await CLI.fixOldForms(session, resolved.file.project, resolved.file, { write })))
      continue
    }
    const { project } = resolved
    const fixed = await CLI.fixOldForms(session, project, undefined, { write })
    const versioned = CLI.upgradeSpellVersion(project, { write })
    changes.push(...fixed)
    notes.push(upgradeNote(project, { fixed: fixed.length, versioned, write }))
  }

  // a dry run says what it WOULD fix
  const said = (change: CLI.Problem) => (write ? change : { ...change, message: change.message.replace(/^fixed:/, "would fix:") })
  const lines = changes.map((change) => session.problemLine(said(change)))
  if (options.json) {
    for (const line of [...lines, ...notes]) session.err(line)
    session.out(JSON.stringify(changes, null, 2))
  } else for (const line of [...lines, ...notes]) session.out(line)
  return CLI.EXIT.OK
}

/**
 * The line `spell upgrade` says of `project` once it's done:
 * how many lines it changed (or would), and the Spell it now matches.
 */
function upgradeNote(
  project: SP.SpellProject,
  { fixed, versioned, write }: { fixed: number; versioned: boolean; write: boolean }
): string {
  const version = SP.OldForms.shortVersion(SP.SPELL_VERSION)
  const lines = `${fixed} line${fixed === 1 ? "" : "s"}`
  if (!fixed && !versioned) return `${project.projectId}:  already up to date with Spell ${version}`
  if (!write) return `${project.projectId}:  would change ${lines}, to match Spell ${version}`
  return `${project.projectId}:  changed ${lines}, and now matches Spell ${version}`
}
