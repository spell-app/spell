/**
 * Tests of `BedtimeAll` (`epic bedtime all ...`, `epic bedtime status`;  epic `epic-engine` T85):  which epics a night
 * takes, the questions an epic's session sends, the one details page's spec, and where each run stands.
 */
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { BedtimeAll, phaseNumbers } from "spell/epic/tool/BedtimeAll"
import type { EpicListing } from "spell/epic/tool/PlanDocFiles"
import type { Phase, PlanSummary } from "spell/epic/tool/planDoc.types"

describe("BedtimeAll", () => {
  let folder: string
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "bedtime-all-"))
  })
  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  test("candidates:  running epics with phases to do;  idle ones only when included;  one in bedtime left out", () => {
    const plan = BedtimeAll.candidates({ listings: LISTINGS, summaryOf, sessions: SESSIONS, worktreeOf })
    expect(plan.epics.map((epic) => epic.name)).toEqual(["seo"])
    expect(plan.idle).toEqual(["idle"])
    const seo = plan.epics[0]!
    expect(seo.session).toBe("🚧 seo")
    expect(seo.phases).toEqual(["P2 · Routes (under way)", "P3 · Sitemaps"])
    expect(seo.questions).toEqual([{ id: "q4", title: "Which sitemap?" }])
    const included = BedtimeAll.candidates({
      listings: LISTINGS,
      summaryOf,
      sessions: SESSIONS,
      worktreeOf,
      include: ["idle"]
    })
    expect(included.epics.map((epic) => epic.name)).toEqual(["seo", "idle"])
    expect(included.epics[1]!.session).toBeNull()
  })

  test("candidates:  a page that won't read is named, not thrown", () => {
    const plan = BedtimeAll.candidates({
      listings: [listing("broken")],
      summaryOf: () => {
        throw new Error("old markup")
      },
      sessions: [],
      worktreeOf
    })
    expect(plan.skipped).toEqual(["broken"])
  })

  test("spec:  a section per epic, its phases then the questions its session sent, ids split by --", () => {
    const plan = BedtimeAll.candidates({
      listings: LISTINGS,
      summaryOf,
      sessions: SESSIONS,
      worktreeOf,
      include: ["idle"]
    })
    BedtimeAll.writePlan(plan, folder)
    expect(BedtimeAll.waitingFor(folder, plan)).toEqual(["seo"])
    BedtimeAll.keepQuestions(
      folder,
      "seo",
      JSON.stringify({ questions: [{ title: "Keep the old routes?", options: [] }] })
    )
    expect(BedtimeAll.waitingFor(folder, plan)).toEqual([])
    const ids = BedtimeAll.spec(folder, plan).questions.map((question) => question.id)
    // seo sent its own;  idle sent none, so its open Q item stands in
    expect(ids).toEqual(["seo--phases", "seo--q1", "idle--phases", "idle--q9"])
    const phases = BedtimeAll.spec(folder, plan).questions[0]!
    expect(phases.multiple).toBe(true)
    expect(phases.options![0]).toMatchObject({ title: "All", recommended: true, checked: true })
  })

  test("keepQuestions:  refuses an epic not in tonight's plan, and a file of the wrong shape", () => {
    BedtimeAll.writePlan({ epics: [], skipped: [], idle: [] }, folder)
    expect(() => BedtimeAll.keepQuestions(folder, "seo", '{ "questions": [] }')).toThrow(/isn't in tonight's plan/)
    BedtimeAll.writePlan(
      BedtimeAll.candidates({ listings: LISTINGS, summaryOf, sessions: SESSIONS, worktreeOf }),
      folder
    )
    expect(() => BedtimeAll.keepQuestions(folder, "seo", '{ "questions": [{}] }')).toThrow(/title/)
  })

  test("status:  every epic in bedtime mode, how many of its phases are done", () => {
    const running = BedtimeAll.status({ listings: LISTINGS, summaryOf })
    expect(running).toEqual([{ name: "asleep", bedtime: "P1-P2", done: 1, total: 2, active: "2" }])
    expect(BedtimeAll.statusLine(running[0]!)).toMatch(/1 of 2 done, P2 under way/)
  })

  test("phaseNumbers:  ranges and single phases", () => {
    expect([...phaseNumbers("P3-P5,P9")]).toEqual(["3", "4", "5", "9"])
    expect([...phaseNumbers("2")]).toEqual(["2"])
  })
})

////////////////
// ## Fixtures
////////////////

const SESSIONS = [{ pid: 1, sessionId: "s1", cwd: "/wt/seo", name: "🚧 seo" }]

/** The epic a folder is the worktree of:  `/wt/<name>`. */
function worktreeOf(path: string | undefined): string | undefined {
  return path?.startsWith("/wt/") ? path.slice(4) : undefined
}

function listing(name: string, status: EpicListing["status"] = "in progress"): EpicListing {
  return { name, title: name, status, checkout: "main", saga: null, notReviewed: 0, total: 0, file: `/epics/${name}` }
}

const LISTINGS = [listing("seo"), listing("idle"), listing("asleep"), listing("old", "done"), listing("all-done")]

function phase(number: number, name: string, status: string): Phase {
  return {
    n: number,
    number: String(number),
    id: `p${number}`,
    name,
    status,
    estimate: undefined,
    took: undefined,
    span: undefined
  }
}

const SUMMARIES: Record<string, Partial<PlanSummary>> = {
  "/epics/seo": {
    title: "SEO",
    phases: [phase(1, "Setup", "done"), phase(2, "Routes", "active"), phase(3, "Sitemaps", "todo")],
    open: openWith([{ id: "q4", title: "Which sitemap?", status: "open" }])
  },
  "/epics/idle": {
    title: "Idle",
    phases: [phase(1, "Start", "todo")],
    open: openWith([{ id: "q9", title: "Why?", status: "open" }])
  },
  "/epics/asleep": {
    title: "Asleep",
    bedtime: "P1-P2",
    phases: [phase(1, "One", "done"), phase(2, "Two", "active"), phase(3, "Three", "todo")]
  },
  "/epics/all-done": { title: "All done", phases: [phase(1, "Only", "done")] }
}

function openWith(question: { id: string; title: string; status: string }[]): PlanSummary["open"] {
  return { question } as PlanSummary["open"]
}

function summaryOf(file: string): PlanSummary {
  return { bedtime: null, standing: false, open: openWith([]), ...SUMMARIES[file] } as PlanSummary
}
