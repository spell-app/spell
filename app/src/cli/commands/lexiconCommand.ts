import { readFileSync, writeFileSync } from "fs"

import { AtProtoPasswordSignIn, LexiconSchemas, type AtProtoNetwork } from "spell/places"
import { spellTypeFor, type LexiconDocument } from "spell/parser/core/model"
import { SP } from "spell/parser/spell"
import { CLI } from "spell/app/cli"

/**
 * `spell space lexicon read | publish` (epic `atmosphere` P10):  Lexicons, AT Protocol's schema language, both ways.
 * - `read <file or url> [--write <file>]`:  another app's Lexicon as a Spell type,
 *   the declaration a person would write (`SC.spellTypeFor()`);  printed, or written into a `.spell` file.
 *   - e.g. Statusphere's `xyz.statusphere.status`, which the example `@spell/examples/Statusphere` reads in.
 * - `publish <project> [--as <handle>] [--dry-run] [--json]`:  each type the project's LIBRARY marks for publishing
 *   (`- it is published ...`), as a schema record
 *   in the ONE account that holds Spell's schemas (`LexiconSchemas`).
 *   - From the library `spell compile` wrote (`<Project>.lib.ts`):  compile it first.
 *   - Signed in with an app password, as `epic pages publish` is:  `$ATMOSPHERE_APP_PASSWORD`, never a flag;
 *     the account by `--as`, else `$ATMOSPHERE_HANDLE`.
 *   - Prints the DNS record each name needs, pointing it at that account:  made by hand, by whoever owns the domain.
 *   - `--dry-run`:  the Lexicons it would publish, with no sign-in and nothing written.
 * - Exits 0;  1 when the account or the network says no.  A usage mistake throws `CLI.CliError`.
 */
export async function lexiconCommand(
  session: CLI.CliSession,
  args: string[],
  options: LexiconOptions
): Promise<number> {
  const [verb, target] = args
  if (verb === "read") return read(session, target!, options)
  return publish(session, target!, options)
}

/** Options of `spell space lexicon`. */
export type LexiconOptions = CLI.GlobalOptions & {
  /** `read`:  the `.spell` file to write the type into, instead of printing it. */
  write?: string
  /** `publish`:  the account that holds the schemas, a handle or DID. */
  as?: string
  /** `publish`:  only say what it would publish. */
  dryRun?: boolean
  /** `publish`:  print what it did as JSON. */
  json?: boolean
  /** `publish`:  where accounts and hosts are, for a test.  Left out:  the real network. */
  network?: Partial<AtProtoNetwork>
  /** `publish`:  the environment, for a test.  Left out:  this process's. */
  env?: NodeJS.ProcessEnv
}

/** `read`:  see `lexiconCommand()`. */
async function read(session: CLI.CliSession, from: string, { write }: LexiconOptions): Promise<number> {
  const document = await lexiconAt(from)
  const { source, notes } = spellTypeFor(document)
  if (!write) {
    session.out(source)
    return CLI.EXIT.OK
  }
  writeFileSync(write, source)
  session.out(`wrote ${session.relative(write)}:  ${document.id} as a Spell type`)
  for (const note of notes) session.err(`  ${note}`)
  return CLI.EXIT.OK
}

/** `publish`:  see `lexiconCommand()`. */
async function publish(session: CLI.CliSession, projectArg: string, options: LexiconOptions): Promise<number> {
  const { network, env = process.env } = options
  const project = await libraryProject(session, projectArg)
  const libFile = project.outputFileFor(SP.targetFor("ts/lib")).location.serverPath
  const lexicons = await CLI.publishedLexicons(libFile, project.projectId).catch((error: Error) => {
    throw new CLI.CliError(`${project.projectId}'s library won't load (${error.message}):  spell compile it first`)
  })
  if (!lexicons.size) {
    throw new CLI.CliError(`${project.projectId} marks no type for publishing:  say "- it is published" on one`)
  }
  if (options.dryRun) {
    const all = [...lexicons.values()]
    session.out(
      options.json ? pretty(all) : all.map((lexicon) => `would publish ${lexicon.id}:\n${pretty(lexicon)}`).join("\n")
    )
    return CLI.EXIT.OK
  }

  const who = options.as ?? env.ATMOSPHERE_HANDLE
  const password = env.ATMOSPHERE_APP_PASSWORD
  if (!who) throw new CLI.CliError("--as <handle>?  the account that holds Spell's schemas (or $ATMOSPHERE_HANDLE)")
  if (!password)
    throw new CLI.CliError("$ATMOSPHERE_APP_PASSWORD?  an app password for that account, from its settings")
  try {
    const signIn = new AtProtoPasswordSignIn({ password, network })
    await signIn.signIn(who)
    const schemas = new LexiconSchemas({ signIn })
    const published = []
    for (const lexicon of lexicons.values()) published.push(await schemas.publish(lexicon))
    if (options.json) session.out(pretty(published))
    else {
      for (const { uri, isNew, dns } of published) {
        session.out(`published ${uri}  (${isNew ? "new" : "updated"})`)
        session.out(`  its DNS record, made by hand:  ${dns.name}  ${dns.type}  "${dns.value}"`)
      }
    }
    return CLI.EXIT.OK
  } catch (error) {
    session.err(`spell space lexicon publish:  ${(error as Error).message}`)
    return CLI.EXIT.ERRORS
  }
}

/** The Lexicon at `from`:  a file, or an `https://` address.  - throws `CLI.CliError` for one that isn't a Lexicon */
async function lexiconAt(from: string): Promise<LexiconDocument> {
  if (!from) throw new CLI.CliError("which Lexicon?  a file, or its address, e.g. lexicons/xyz.statusphere.status.json")
  const text = /^https?:\/\//.test(from) ? await fetchedText(from) : readFileSync(from, "utf8")
  let document: LexiconDocument
  try {
    document = JSON.parse(text) as LexiconDocument
  } catch {
    throw new CLI.CliError(`${from} isn't a Lexicon:  it isn't JSON`)
  }
  if (document?.lexicon !== 1 || typeof document.id !== "string") {
    throw new CLI.CliError(`${from} isn't a Lexicon:  it says no "lexicon": 1 and "id"`)
  }
  return document
}

/** The text at web address `url`.  - throws `CLI.CliError` when it answers anything but 200 */
async function fetchedText(url: string): Promise<string> {
  const answer = await fetch(url)
  if (!answer.ok) throw new CLI.CliError(`${url} answered ${answer.status}:  no Lexicon there`)
  return answer.text()
}

/** The project `arg` names, which must be a library.  - throws `CLI.CliError` for one that isn't */
async function libraryProject(session: CLI.CliSession, arg: string): Promise<SP.SpellProject> {
  const [resolved] = await session.projects(arg ? [arg] : [])
  if (resolved?.kind !== "project") throw new CLI.CliError("which project?  a library, e.g. @spell/library/people")
  const { project } = resolved
  await project.load(undefined)
  if (!project.targets.some(({ name }) => name === "ts/lib")) {
    throw new CLI.CliError(`${project.projectId} isn't a library:  its project file names no "ts/lib" target`)
  }
  return project
}

/** `value` as JSON, 2 spaces. */
function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
