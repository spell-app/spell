import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import JSON5 from "json5"

/****************
 * ### `DependencyCheck`
 * Whether the packages we depend on are safe to send out (epic `epic-engine` P67):
 * Owen's standing rule, "do a dependency check/fix BEFORE pushing to github or npm".
 * - A problem is any deprecated package, and any critical or high advisory.
 *   - Unless it's on the known-open list, the kit's `deps-known-open.json5`:  each entry with its reason.
 *   - An entry that no longer matches anything is a problem too, so the list can't go stale.
 * - Two places are looked at, the `Surface`s:
 *   - `repo`:  the lockfile, by `yarn npm audit`, for `spell deps check` and a push to `main`
 *   - `npm`:  what someone outside gets, by `npm audit` on `spell publish`'s scratch installs
 *     - the lockfile can't show that:  `resolutions` don't reach anyone installing from npm
 * - NEVER `npm audit fix --force`:  on spell 0.8.9 it proposed downgrading `spell` to 0.8.1.
 * - Its position:  node's own modules and `json5`, so `spell deps check` loads nothing else.
 ****************/
export class DependencyCheck {
  /** Where the list is, under the kit. */
  static readonly KNOWN_OPEN_FILE = "deps-known-open.json5"

  /** The known-open list. */
  readonly knownOpen: KnownOpen[]

  constructor(knownOpen: KnownOpen[]) {
    this.knownOpen = knownOpen
  }

  /** The check, with `kit`'s known-open list.  Throws `SyntaxError` on a list that won't read. */
  static forKit(kit: string): DependencyCheck {
    const file = join(kit, DependencyCheck.KNOWN_OPEN_FILE)
    return new DependencyCheck(existsSync(file) ? (JSON5.parse(readFileSync(file, "utf8")) as KnownOpen[]) : [])
  }

  /**
   * What's wrong with `findings`, seen on `surface`:  what's neither allowed nor on the list, and each stale entry.
   * - moderate and low advisories are counted, never problems
   */
  report(surface: Surface, findings: DependencyFinding[]): DependencyReport {
    const serious = findings.filter(isSerious)
    const problems = serious
      .filter((finding) => !this.entryFor(surface, finding))
      .map((finding) => `${finding.package}:  ${labelOf(finding)}`)
    return {
      surface,
      problems: [...new Set(problems)].sort(),
      stale: this.staleEntries(surface, serious),
      knownOpen: serious.length - problems.length,
      deprecated: findings.filter((finding) => finding.kind === "deprecated").length,
      advisories: findings.filter((finding) => finding.kind === "advisory").length
    }
  }

  /** The list's entry covering `finding`, on `surface`. */
  private entryFor(surface: Surface, finding: DependencyFinding): KnownOpen | undefined {
    return this.knownOpen.find((entry) => entry.in.includes(surface) && covers(entry, finding))
  }

  /** What the list claims is open on `surface`, but nothing in `serious` matches. */
  private staleEntries(surface: Surface, serious: DependencyFinding[]): string[] {
    const stale: string[] = []
    for (const entry of this.knownOpen.filter((each) => each.in.includes(surface))) {
      for (const advisory of entry.advisories ?? [])
        if (!serious.some((finding) => finding.package === entry.package && finding.advisory === advisory))
          stale.push(`${entry.package}:  ${advisory}`)
      if (
        entry.deprecated &&
        !serious.some((finding) => finding.package === entry.package && finding.kind === "deprecated")
      )
        stale.push(`${entry.package}:  deprecated`)
    }
    return stale
  }
}

/** Is it deprecated, or a critical or high advisory? */
function isSerious(finding: DependencyFinding): boolean {
  return finding.kind === "deprecated" || finding.severity === "critical" || finding.severity === "high"
}

/** Does `entry` cover `finding`? */
function covers(entry: KnownOpen, finding: DependencyFinding): boolean {
  if (entry.package !== finding.package) return false
  return finding.kind === "deprecated"
    ? entry.deprecated === true
    : entry.advisories?.includes(finding.advisory!) === true
}

/** `finding`, for a person. */
function labelOf(finding: DependencyFinding): string {
  if (finding.kind === "deprecated") return `deprecated (${finding.title})`
  return `${finding.severity} ${finding.advisory}, ${finding.title}`
}

/**
 * The repo's lockfile, as `yarn npm audit` sees it.
 * - throws `DependencyCheckUnavailable` when it can't say:  no registry
 */
export function repoFindings(kit: string): DependencyFinding[] {
  const audit = spawnSync("yarn", ["npm", "audit", "--all", "--recursive", "--json"], {
    cwd: kit,
    encoding: "utf8",
    maxBuffer: MAX_OUTPUT,
    timeout: AUDIT_TIMEOUT
  })
  return yarnFindings(audit.stdout || audit.stderr || "", audit.status)
}

/**
 * `yarn npm audit --json`'s lines, as findings.
 * - it exits 1 whenever it finds anything, so it's the output that says whether it could run
 * - throws `DependencyCheckUnavailable` when no finding came, and it says it failed
 */
export function yarnFindings(output: string, status: number | null): DependencyFinding[] {
  const lines = output.split("\n").filter((line) => line.startsWith("{"))
  if (status !== 0 && !lines.length)
    throw new DependencyCheckUnavailable(
      `yarn npm audit:  ${output.trim().slice(0, 300) || "no answer from the registry"}`
    )
  return lines.map((line) => {
    const { value, children } = JSON.parse(line) as YarnAuditLine
    const isDeprecation = String(children.ID).endsWith("(deprecation)")
    return {
      package: value,
      kind: isDeprecation ? "deprecated" : "advisory",
      severity: isDeprecation ? undefined : children.Severity,
      advisory: isDeprecation ? undefined : advisoryOf(children.URL, children.ID),
      title: children.Issue
    }
  })
}

/**
 * The npm install in `project`, as someone outside gets it:  `npm audit`, and what npm calls deprecated.
 * - throws `DependencyCheckUnavailable` when `npm audit` can't say:  no registry
 */
export function npmFindings(project: string): DependencyFinding[] {
  const audit = spawnSync("npm", ["audit", "--json"], {
    cwd: project,
    encoding: "utf8",
    maxBuffer: MAX_OUTPUT,
    timeout: AUDIT_TIMEOUT,
    env: { ...process.env, npm_config_update_notifier: "false" }
  })
  const lock = JSON.parse(readFileSync(join(project, "node_modules", ".package-lock.json"), "utf8")) as NpmLock
  return [...npmAuditFindings(audit.stdout ?? ""), ...npmDeprecations(lock)]
}

/**
 * `npm audit --json`'s report, as findings.
 * - only a package's OWN advisories:  npm also lists everything that depends on one, naming the package it's through
 * - throws `DependencyCheckUnavailable` on a report with no `vulnerabilities`
 */
export function npmAuditFindings(output: string): DependencyFinding[] {
  let report: NpmAudit
  try {
    report = JSON.parse(output) as NpmAudit
  } catch {
    throw new DependencyCheckUnavailable(`npm audit:  ${output.slice(0, 300)}`)
  }
  if (!report.vulnerabilities) throw new DependencyCheckUnavailable(`npm audit:  ${output.slice(0, 300)}`)
  return Object.values(report.vulnerabilities).flatMap((vulnerability) =>
    vulnerability.via.flatMap((via) =>
      typeof via === "string"
        ? []
        : [
            {
              package: vulnerability.name,
              kind: "advisory" as const,
              severity: via.severity,
              advisory: advisoryOf(via.url, via.source),
              title: via.title
            }
          ]
    )
  )
}

/** Every package an npm install's lockfile calls deprecated. */
export function npmDeprecations(lock: NpmLock): DependencyFinding[] {
  return Object.entries(lock.packages).flatMap(([path, entry]) =>
    entry.deprecated
      ? [{ package: path.split("node_modules/").at(-1)!, kind: "deprecated" as const, title: entry.deprecated }]
      : []
  )
}

/** An advisory's own id, the same from yarn and npm:  `GHSA-...`, from its address, else what the tool called it. */
function advisoryOf(url: string | undefined, id: unknown): string {
  return /GHSA-[\w-]+/.exec(url ?? "")?.[0] ?? String(id)
}

/** The most an audit may print. */
const MAX_OUTPUT = 1 << 28

/** How long an audit may take, in ms. */
const AUDIT_TIMEOUT = 120_000

/** The audit couldn't run or answer:  no registry, usually. */
export class DependencyCheckUnavailable extends Error {}
DependencyCheckUnavailable.prototype.name = "DependencyCheckUnavailable"

/** Where the packages are looked at:  the lockfile, or an npm install. */
export type Surface = "repo" | "npm"

/** Something an audit says about one package. */
export type DependencyFinding = {
  /** the package's name */
  package: string
  kind: "advisory" | "deprecated"
  /** an advisory's:  `critical`, `high`, `moderate`, `low`, `info` */
  severity?: string
  /** an advisory's id:  `GHSA-...` */
  advisory?: string
  /** what it says */
  title: string
}

/** One problem we know about, and have decided to live with for now. */
export type KnownOpen = {
  package: string
  /** the advisories it covers:  `GHSA-...` */
  advisories?: string[]
  /** it covers the package being deprecated */
  deprecated?: boolean
  /** where it shows up */
  in: Surface[]
  /** why it's still open */
  reason: string
}

/** What a check found. */
export type DependencyReport = {
  surface: Surface
  /** what must be fixed, or listed */
  problems: string[]
  /** entries on the list that no longer match anything */
  stale: string[]
  /** serious findings the list covers */
  knownOpen: number
  /** deprecated findings, listed or not */
  deprecated: number
  /** advisories of every severity, listed or not */
  advisories: number
}

/** One line of `yarn npm audit --json`. */
type YarnAuditLine = {
  value: string
  children: { ID: number | string; Issue: string; URL?: string; Severity?: string }
}

/** What's used of `npm audit --json`. */
type NpmAudit = {
  vulnerabilities?: Record<
    string,
    { name: string; via: (string | { source: number; title: string; url: string; severity: string })[] }
  >
}

/** What's used of npm's lockfile. */
export type NpmLock = { packages: Record<string, { deprecated?: string }> }
