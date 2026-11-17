import type { EpicRequest } from "spell/epic/command/command.types"
import { SRV } from "spell/server"
import { NightSummary, type DoneLine, type NeedLine, type SummaryOptions } from "./NightSummary"
import type { PlanDoc } from "./PlanDoc"

/****************
 * ### `FocusSummary`
 * What happened on one epic while Owen was in focus mode (`epic focus summary <epic>`;  epic `epic-engine` T93):  the
 * data a running session posts in its own window at `/back`, and the one line `/back` gives an epic with no session.
 * - Built on "0. While you were out" (`NightSummary`):  the same phases done and under way, and the same things
 *   waiting on Owen (calls and questions, fixes to review, issues, manual tests), but since focus started, whatever he
 *   ticked Read on the page
 * - plus the epic's commits merged into `main` since (`mergedSince()`), and the requests it got since, not yet filed
 * - Pure over what it's handed, but `mergedSince()`, which runs git
 ****************/
export class FocusSummary {
  /**
   * Epic `epic`'s summary since `since`, from its page `plan`.
   * - `merged`:  its commits on `main` since (`mergedSince()`)
   * - `requests`:  its requests (`Requests.list()`);  the ones sent since and not filed count
   * - `isMerged`, `answered`, `finishedPhaseDays`:  as `NightSummary.of()` takes them
   */
  static of(
    epic: string,
    plan: PlanDoc,
    since: Date,
    { merged = [], requests = [], ...options }: FocusSummaryOptions = {}
  ): EpicFocusSummary {
    const night = NightSummary.of(plan, since, options)
    const from = since.getTime()
    return {
      epic,
      title: plan.summary().title,
      since: since.toISOString(),
      merged,
      done: night.done.filter((line) => line.status !== "under way"),
      underway: night.done.filter((line) => line.status === "under way"),
      waiting: night.needs,
      requests: requests
        .filter((request) => request.status !== "filed" && (Date.parse(request.at) || 0) >= from)
        .map((request) => ({ id: request.id, text: firstLine(request.text) }))
    }
  }

  /**
   * The commits of epic `epic` on `main` in `checkout` since `since`:  their subjects start with its id
   * (`epic-engine T92:  ...`), as every commit of an epic's does.
   * - NEVER throws:  no git, or no `main`, is none
   */
  static mergedSince(checkout: string, epic: string, since: Date): MergedCommit[] {
    const run = SRV.Git.run(
      ["log", "main", `--since=${since.toISOString()}`, "--no-merges", "--format=%h%x09%s"],
      checkout
    )
    if (!run.ok) return []
    const ours = new RegExp(`^${epic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
    return run.out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha = "", ...subject] = line.split("\t")
        return { sha, subject: subject.join("\t") }
      })
      .filter((commit) => ours.test(commit.subject))
  }

  /** Nothing happened since:  no line in `/back`'s list. */
  static isEmpty(summary: EpicFocusSummary): boolean {
    const { merged, done, underway, waiting, requests } = summary
    return !merged.length && !done.length && !underway.length && !waiting.length && !requests.length
  }

  /** The one line `/back` gives an epic:  `seo:  3 merged, 2 waiting on you, 1 under way`;  "nothing new" for none. */
  static oneLine(summary: EpicFocusSummary): string {
    const parts = [
      count(summary.waiting.length, "waiting on you"),
      count(summary.merged.length, "merged"),
      count(summary.done.length, "phase(s) done"),
      count(summary.underway.length, "under way"),
      count(summary.requests.length, "request(s) to file")
    ].filter(Boolean)
    return `${summary.epic}:  ${parts.length ? parts.join(", ") : "nothing new"}`
  }

  /**
   * The summary as the lines a session builds its `/back` post from:  `## Waiting on you` first, then what merged,
   * then what's still running.
   * - ids as the page shows them (`J256`, `P3 · Name`):  the session adds their link pairs (`epic pages link`)
   */
  static lines(summary: EpicFocusSummary): string[] {
    const lines = [`${summary.epic} · ${summary.title}, since ${summary.since}`]
    if (FocusSummary.isEmpty(summary)) return [...lines, "nothing new"]
    if (summary.waiting.length || summary.requests.length) {
      lines.push("", "## Waiting on you")
      for (const need of summary.waiting) lines.push(`- ${need.label} · ${need.title} -- ${need.why}`)
      for (const request of summary.requests) lines.push(`- ${request.id} · ${request.text} -- request to file`)
    }
    if (summary.merged.length || summary.done.length) {
      lines.push("", "## Merged")
      for (const line of summary.done) lines.push(`- ${doneLine(line)}`)
      for (const commit of summary.merged) lines.push(`- ${commit.sha} ${commit.subject}`)
    }
    if (summary.underway.length) {
      lines.push("", "## Still running")
      for (const line of summary.underway) lines.push(`- ${line.label}`)
    }
    return lines
  }
}

////////////////
// ## Helpers
////////////////

/** `3 merged`, or `""` for none. */
function count(n: number, what: string): string {
  return n ? `${n} ${what}` : ""
}

/** A phase done since:  `P3 · Sitemaps -- built them (merged)`. */
function doneLine(line: DoneLine): string {
  const built = line.built ? ` -- ${line.built}` : ""
  const merged = line.merged === true ? " (merged)" : line.merged === false ? " (not merged yet)" : ""
  return `${line.label}${built}${line.status === "dropped" ? " (dropped)" : merged}`
}

/** A request's first line, at most 100 characters. */
function firstLine(text: string): string {
  const line = text.trim().split("\n")[0] ?? ""
  return line.length > 100 ? `${line.slice(0, 99)}…` : line
}

////////////////
// ## Types
////////////////

/** What `FocusSummary.of()` takes besides the epic, its page and the time. */
export type FocusSummaryOptions = Omit<SummaryOptions, "seen"> & {
  /** its commits on `main` since (`mergedSince()`) */
  merged?: MergedCommit[]
  /** its requests, every one (`Requests.list()`) */
  requests?: EpicRequest[]
}

/** One commit of the epic's on `main`. */
export type MergedCommit = {
  /** short sha */
  sha: string
  /** its subject */
  subject: string
}

/** What happened on one epic since focus started:  `epic focus summary <epic> --json`. */
export type EpicFocusSummary = {
  /** its id */
  epic: string
  /** its title */
  title: string
  /** since when (ISO) */
  since: string
  /** its commits on `main` since */
  merged: MergedCommit[]
  /** phases done (or dropped) since */
  done: DoneLine[]
  /** phases started since and still under way */
  underway: DoneLine[]
  /** what waits on Owen:  calls and questions, fixes to review, issues, manual tests */
  waiting: NeedLine[]
  /** requests sent to it since, not filed yet */
  requests: { id: string; text: string }[]
}
