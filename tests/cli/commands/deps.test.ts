import { describe, expect, test } from "vite-plus/test"

import {
  DependencyCheck,
  DependencyCheckUnavailable,
  npmAuditFindings,
  npmDeprecations,
  yarnFindings,
  type DependencyFinding,
  type KnownOpen
} from "spell/cli/commands/deps"

/** The rules, on made-up findings (epic `epic-engine` P67). */

/** An advisory. */
const advisory = (name: string, severity: string, id: string): DependencyFinding => ({
  package: name,
  kind: "advisory",
  severity,
  advisory: id,
  title: `${name} is bad`
})

/** A deprecated package. */
const deprecated = (name: string): DependencyFinding => ({ package: name, kind: "deprecated", title: "old" })

/** A list entry, on both surfaces. */
const entry = (fields: Omit<KnownOpen, "in" | "reason">): KnownOpen => ({
  in: ["repo", "npm"],
  reason: "why",
  ...fields
})

describe("DependencyCheck.report()", () => {
  test("a clean report", () => {
    const report = new DependencyCheck([]).report("repo", [])
    expect(report).toMatchObject({ problems: [], stale: [], knownOpen: 0, advisories: 0, deprecated: 0 })
  })

  test("critical, high and deprecated are problems;  moderate and low are only counted", () => {
    const report = new DependencyCheck([]).report("repo", [
      advisory("a", "critical", "GHSA-a"),
      advisory("b", "high", "GHSA-b"),
      advisory("c", "moderate", "GHSA-c"),
      advisory("d", "low", "GHSA-d"),
      deprecated("e")
    ])
    expect(report.problems).toEqual([
      "a:  critical GHSA-a, a is bad",
      "b:  high GHSA-b, b is bad",
      "e:  deprecated (old)"
    ])
    expect(report).toMatchObject({ advisories: 4, deprecated: 1 })
  })

  test("the list covers what it names, and nothing else", () => {
    const check = new DependencyCheck([
      entry({ package: "a", advisories: ["GHSA-a"] }),
      entry({ package: "e", deprecated: true })
    ])
    const report = check.report("repo", [
      advisory("a", "high", "GHSA-a"),
      advisory("a", "high", "GHSA-other"),
      deprecated("e")
    ])
    expect(report.problems).toEqual(["a:  high GHSA-other, a is bad"])
    expect(report.knownOpen).toBe(2)
    expect(report.stale).toEqual([])
  })

  test("an entry matching nothing is stale", () => {
    const check = new DependencyCheck([
      entry({ package: "gone", advisories: ["GHSA-gone"] }),
      entry({ package: "fresh", deprecated: true })
    ])
    expect(check.report("repo", []).stale).toEqual(["gone:  GHSA-gone", "fresh:  deprecated"])
  })

  test("an entry for the other surface neither covers nor goes stale here", () => {
    const check = new DependencyCheck([{ ...entry({ package: "a", advisories: ["GHSA-a"] }), in: ["npm"] }])
    expect(check.report("repo", [advisory("a", "high", "GHSA-a")]).problems).toHaveLength(1)
    expect(check.report("repo", []).stale).toEqual([])
  })
})

describe("reading what the tools print", () => {
  test("yarn npm audit's lines:  an advisory by its GHSA, a deprecation", () => {
    const lines = [
      JSON.stringify({
        value: "tar",
        children: { ID: 12, Issue: "bad", URL: "https://github.com/advisories/GHSA-abc-def", Severity: "high" }
      }),
      JSON.stringify({ value: "old", children: { ID: "old (deprecation)", Issue: "use new", Severity: "moderate" } })
    ]
    expect(yarnFindings(lines.join("\n"), 1)).toEqual([
      { package: "tar", kind: "advisory", severity: "high", advisory: "GHSA-abc-def", title: "bad" },
      { package: "old", kind: "deprecated", severity: undefined, advisory: undefined, title: "use new" }
    ])
  })

  test("yarn says nothing and failed:  it couldn't run;  nothing and passed:  all clear", () => {
    expect(() => yarnFindings("Network error", 1)).toThrow(DependencyCheckUnavailable)
    expect(yarnFindings("", 0)).toEqual([])
  })

  test("npm audit:  only a package's own advisories, not those it inherits", () => {
    const report = {
      vulnerabilities: {
        zod: {
          name: "zod",
          via: [{ source: 9, title: "bad", url: "https://github.com/advisories/GHSA-zzz", severity: "high" }]
        },
        spell: { name: "spell", via: ["zod"] }
      }
    }
    expect(npmAuditFindings(JSON.stringify(report))).toEqual([
      { package: "zod", kind: "advisory", severity: "high", advisory: "GHSA-zzz", title: "bad" }
    ])
  })

  test("npm audit that didn't answer:  it couldn't run", () => {
    expect(() => npmAuditFindings("not json")).toThrow(DependencyCheckUnavailable)
    expect(() => npmAuditFindings('{"error":{"code":"ENOAUDIT"}}')).toThrow(DependencyCheckUnavailable)
  })

  test("npm's lockfile says what's deprecated, a nested package by its own name", () => {
    expect(
      npmDeprecations({
        packages: {
          "node_modules/a": { deprecated: "old" },
          "node_modules/b/node_modules/@c/d": { deprecated: "older" },
          "node_modules/e": {}
        }
      })
    ).toEqual([
      { package: "a", kind: "deprecated", title: "old" },
      { package: "@c/d", kind: "deprecated", title: "older" }
    ])
  })
})
