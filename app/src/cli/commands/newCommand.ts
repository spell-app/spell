import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs"
import { resolve } from "path"

import environment from "spell/app/spaces/server/node/environment"
import { SP } from "spell/parser/spell"
import { hasProjectFile } from "spell/parser/spell/node/projectFile"
import { SPACES } from "spell/app/spaces"
import { CLI } from "spell/app/cli"
import { thisMachinesPerson } from "spell/app/spaces/server/node/people/localPerson"

/**
 * `spell app create <name>` (`spell new` until epic `repo-split` P13):  make a spell project --
 * folder `<name>/`, holding `__project.json5` and a starter
 * `<name>.spell` which prints a hello, so `spell run` shows something straight away.
 * - `--site`:  a site instead (epic `mockup` T40), as the editor's Site card makes one (`SPACES.STARTER_PROGRAMS.site`):
 *   its routing in `<name>.site.spell`, its main page layout in `main.page-layout.spell`, its home page in `home.spell`
 * - In `--in <folder>`, or by default this machine's person's folder, your space in spell-spaces (`@spell/owen@/`).
 * - Writes the files itself:  `projectUtils.createProject()` would go through `getIndex()`, which adds an
 *   `Untitled.spell`.
 * - Refuses a folder that's already there with anything in it.
 * - Returns the exit code.
 */
export async function newCommand(session: CLI.CliSession, args: string[], options: CLI.NewOptions): Promise<number> {
  const [name = ""] = args
  CLI.checkProjectName(name)
  const { id, org } = thisMachinesPerson()
  const parent = options.in ? resolve(options.in) : resolve(environment.spellSpacesDir, `@${org}`, `${id}@`)
  if (!existsSync(parent)) throw new CLI.CliError(`No such folder:  ${options.in ?? parent}`)
  const folder = resolve(parent, name)
  if (existsSync(folder) && readdirSync(folder).length) {
    const what = hasProjectFile(folder) ? "a project" : "files"
    throw new CLI.CliError(`${session.relative(folder)} already holds ${what}`)
  }

  const files = options.site
    ? siteFiles(name)
    : { [`${name}.spell`]: `// ${name}:  a new spell project\nprint "hello from ${name}"\n` }
  mkdirSync(folder, { recursive: true })
  const manifest = { imports: Object.keys(files).map((fileName) => ({ path: `/${fileName}`, active: true })) }
  writeFileSync(resolve(folder, SP.PROJECT_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
  for (const [fileName, contents] of Object.entries(files)) writeFileSync(resolve(folder, fileName), contents)

  session.out(session.relative(folder))
  const next = options.site ? "spell app serve" : "spell run"
  session.err(`Made ${name}:  try  ${next} ${session.relative(folder)}`)
  return CLI.EXIT.OK
}

/** A new site's files, by name, in their order:  the site starter's, its site file named for the project. */
function siteFiles(name: string): Record<string, string> {
  const { contents, alongside } = SPACES.STARTER_PROGRAMS.site
  const files: Record<string, string> = { [`${name}.site.spell`]: contents(SP.SpellLocation.titleFor(name)) }
  for (const file of alongside) files[file.fileName] = file.contents
  return files
}
