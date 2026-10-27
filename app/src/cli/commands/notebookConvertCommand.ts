import { mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

import { CLI } from "spell-app/cli"
import environment from "spell-app/spaces/server/node/environment"

// Spell UI's pack:  the converter writes its components by their bare names (`<button>`)
import "spell-app/spaces"

/**
 * `spell app notebook convert <page>`:  a Spell UI component page as notebooks, one per tab (epic `elemental-spell`
 * P19) -- `CLI.NotebookFromPage`.
 * - `<page>`:  the page's file, `spell-ui/docs/ui-button.html`;  it's served at `/components/ui/<its name>`.
 * - Writes `@spell/notebooks/<Title>/`:  `Examples.spellx` ..., `TabBar.spellx`, `__project.json5`, over any there.
 * - `--dry-run`:  writes nothing, and prints each file instead, under a `// <name>` line.
 * - Prints what it couldn't write as the page has it on stderr, for a person to tidy by hand.
 * - Returns the exit code.
 */
export async function notebookConvertCommand(
  session: CLI.CliSession,
  args: string[],
  options: CLI.NotebookConvertOptions
): Promise<number> {
  const [file] = args
  if (!file) throw new CLI.CliError("spell app notebook convert:  name the page, e.g. spell-ui/docs/ui-button.html")
  const path = resolve(file)
  const page = `/components/ui/${path.split("/").at(-1)}`
  const converter = new CLI.NotebookFromPage(readFileSync(path, "utf8"), { page, into: NOTEBOOKS })
  const folder = resolve(environment.systemFilesRoot, "notebooks", converter.folder)
  for (const [name, text] of converter.files) {
    if (options.dryRun) session.out(`// ${name}\n${text}`)
    else {
      mkdirSync(folder, { recursive: true })
      writeFileSync(resolve(folder, name), text)
      session.out(session.relative(resolve(folder, name)))
    }
  }
  for (const warning of converter.warnings) session.err(`  tidy by hand:  ${warning}`)
  session.err(`${options.dryRun ? "Would write" : "Wrote"} ${converter.files.size} files for ${page}`)
  return CLI.EXIT.OK
}

/** Where the notebooks go:  the `@spell` space's notebooks group. */
const NOTEBOOKS = "@spell/notebooks"
