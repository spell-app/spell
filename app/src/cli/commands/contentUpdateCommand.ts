import chalk from "chalk"

// Import directly, not through `spell/app/cli`:  the barrel loads spell, which this command never needs
import { CLI } from "spell/cli"
import { ContentUpdate } from "spell/app/cli/ContentUpdate"
import type { ContentUpdateOptions, ContentUpdateReport, UpdateMark } from "spell/app/cli/cli.types"

/**
 * `spell content update [--json]`:  what the parser and Spell UI learned since the last content update, for the
 * session to turn into features worth showing in the examples and notebooks (epic `content` P3).
 * - Lists, since the stop commit:  the commits under `parser/` and `ui/` by epic, each epic's changelog entry, new
 *   components and attributes, new grammar;  each marked when an always rule or an option of "Upgrades on offer"
 *   covers it.
 * - `--json`:  the same as JSON (`ContentUpdateReport`).
 * - `--done [--always <id> ...]`:  record the update's end instead:  the stop commit moves to `HEAD`, and each id
 *   (or its start:  `component`) is upgraded from now on without asking.
 * - The gathering is `ContentUpdate`'s;  this only prints.  Returns `CLI.EXIT.OK`.
 */
export async function contentUpdateCommand({ json, done, always = [] }: ContentUpdateOptions = {}): Promise<number> {
  const update = ContentUpdate.of(CLI.findCheckout(CLI.KIT_MARKER))
  if (always.length && !done)
    throw new CLI.CliError("--always goes with --done:  `spell content update --done --always <id>`")
  if (done) {
    const memory = update.done({ always })
    if (json) CLI.out(JSON.stringify(memory, null, 2))
    else {
      CLI.out(`stop commit now ${memory.last!.commit.slice(0, 9)} (${memory.last!.date})`)
      if (memory.always.length) CLI.out(`always upgraded:  ${memory.always.map((rule) => rule.id).join(", ")}`)
      CLI.out(chalk.dim(CLI.relativePath(update.file)))
    }
    return CLI.EXIT.OK
  }
  const report = update.gather()
  CLI.out(json ? JSON.stringify(report, null, 2) : reportText(report))
  return CLI.EXIT.OK
}

/** The report as a person reads it:  where it starts, then each section, a line per change. */
function reportText(report: ContentUpdateReport): string {
  const { since, head, epics, components, attributes, grammar, options } = report
  const commits = epics.reduce((total, group) => total + group.commits.length, 0)
  const lines = [
    chalk.bold(
      `Since ${since.commit.slice(0, 9)} (${since.date.slice(0, 10)})${since.guessed ? ", a first guess:  no update recorded yet" : ""}`
    ),
    chalk.dim(
      `up to ${head.commit.slice(0, 9)} (${head.date.slice(0, 10)});  ${commits} commits under parser/ and ui/`
    ),
    "",
    chalk.bold(`Epics (${epics.length})`)
  ]
  for (const group of epics) {
    const changelog = group.changelog?.found ? chalk.dim(`  changelog:  ${group.changelog.title ?? group.epic}`) : ""
    lines.push(`  ${group.epic ?? "(no epic)"}  ${group.commits.length} commits${marksText(group.marks)}${changelog}`)
    for (const commit of group.commits.slice(0, SHOWN_COMMITS))
      lines.push(chalk.dim(`    ${commit.sha}  ${commit.subject.slice(0, SUBJECT_WIDTH)}`))
    if (group.commits.length > SHOWN_COMMITS)
      lines.push(chalk.dim(`    ... ${group.commits.length - SHOWN_COMMITS} more (--json lists them all)`))
  }
  lines.push("", chalk.bold(`New components (${components.length})`))
  for (const each of components) lines.push(`  <${each.tag}>  ${each.description}${marksText(each.marks)}`)
  lines.push("", chalk.bold(`New attributes (${attributes.length})`))
  for (const each of attributes)
    lines.push(`  <${each.tag} ${each.name}>  ${each.description.slice(0, SUBJECT_WIDTH)}${marksText(each.marks)}`)
  lines.push("", chalk.bold(`New grammar (${grammar.length})`))
  for (const each of grammar)
    lines.push(`  ${each.className} (${each.module})  ${each.purpose.slice(0, SUBJECT_WIDTH)}${marksText(each.marks)}`)
  lines.push("", chalk.bold(`Upgrades on offer (${options.length})`))
  for (const option of options)
    lines.push(`  ${option.letter} · ${option.title}${option.state === "offered" ? "" : `  [${option.state}]`}`)
  return lines.join("\n")
}

/** A change's marks, as `  [always component]  [picked B]`;  empty for none. */
function marksText(marks: UpdateMark[]): string {
  return marks
    .map((mark) =>
      chalk.yellow(`  [${mark.kind === "always" ? `always ${mark.rule}` : `${mark.kind} ${mark.letter}`}]`)
    )
    .join("")
}

/** How many of an epic's commits the text shows;  `--json` has them all. */
const SHOWN_COMMITS = 5

/** How much of a subject or description a line shows. */
const SUBJECT_WIDTH = 110
