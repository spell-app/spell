import { describe, expect, test } from "vite-plus/test"

import { parseTarget, phaseOf, phaseRanges, planDocArgs } from "spell-epic/command/epicArgs"

////////////////
// ## Owen's rows
////////////////

/**
 * The 26 rows Owen changed on the Command Review Page (2026-10-12), as the `epic` tool runs each:
 * `[epic command line, the tool's command lines]`.
 * - the two groups' rows (`epic choices list seo`, `epic comments list seo`)
 *   pass through to the docs tools verbatim:  `cli.test.ts` runs them
 */
const OWENS_ROWS: [string[], string[][]][] = [
  [["open", "seo"], [["open", "seo", "--docs"]]],
  [["open", "seo", "--review"], [["open", "seo"]]],
  [["update", "seo#P3", "--goal", "<p>g</p>"], [["phase-body", "seo", "3", "--goal", "<p>g</p>"]]],
  [["updated", "seo#3", "<p>u</p>"], [["updated", "seo", "3", "<p>u</p>"]]],
  [["update", "seo#P3", "--estimate", "1-2h"], [["estimate", "seo", "3", "1-2h"]]],
  [["phase", "seo#3", "done", "--done", "<ul></ul>"], [["phase", "seo", "3", "done", "--done", "<ul></ul>"]]],
  [["update", "epic-workflow", "--standing"], [["standing", "epic-workflow", "on"]]],
  // `epic file seo#P7 r3`, as `Requests` runs it (`add-request`'s row until repo-split P13)
  [
    ["file", "seo#P7", "r3", "--from", "python", "--file", "r3.html"],
    [["request", "seo", "7", "r3", "--from", "python", "--file", "r3.html"]]
  ],
  [["commit", "seo#p3", "abc123", "what it did"], [["commit", "seo", "abc123", "what it did", "--phase", "3"]]],
  [["add", "seo#J", "Title", "--details", "<p>d</p>"], [["add", "seo", "judgement", "Title", "--details", "<p>d</p>"]]],
  // epic `epic-engine` P4:  a test's fields;  the test run, at a test or every epic's
  [
    ["add", "seo#V", "T", "--step", "Do", "--should", "Works"],
    [["add", "seo", "test", "T", "--step", "Do", "--should", "Works"]]
  ],
  [["test", "seo"], [["test", "seo"]]],
  [["test", "seo#V3"], [["test", "seo", "--at", "V3"]]],
  [["test", "seo", "--list", "--json"], [["test", "seo", "--list", "--json"]]],
  [["test", "--all"], [["test", "--all"]]],
  [["decide", "seo#Q3", "yes", "--option", "A"], [["decide", "seo", "Q3", "yes", "--option", "A"]]],
  [["choose", "seo#J9", "A", "built", "--set", "2"], [["choose", "seo", "J9", "A", "built", "--set", "2"]]],
  [["close", "seo#J3"], [["close", "seo", "J3"]]],
  [["reopen", "seo#J3"], [["reopen", "seo", "J3"]]],
  [["cancel", "seo#J3", "why"], [["cancel", "seo", "J3", "why"]]],
  [
    ["details", "seo#J3", "--file", "reply.html", "--append"],
    [["details", "seo", "J3", "--file", "reply.html", "--append"]]
  ],
  // Claude's status card is `update`'s (epic `repo-split` J140:  `epic status` takes stock)
  [["update", "seo#J3", "underway", "reading"], [["status", "seo", "J3", "underway", "reading"]]],
  [["update", "seo#J3", "done"], [["status", "seo", "J3", "done"]]],
  [["update", "seo#o3", "noted", "kept"], [["status", "seo", "o3", "noted", "kept"]]],
  [["update", "seo#P3", "done", "--filed", "B"], [["status", "seo", "P3", "done", "--filed", "B"]]],
  // epic `repo-split` Q44, J141
  [["summarize", "seo#J3", "--file", "c.html"], [["summarize", "seo", "J3", "--file", "c.html"]]],
  [["restore", "seo#J3", "--file", "old.html"], [["original", "seo", "J3", "--file", "old.html"]]],
  [["review", "seo#J3", "outcome"], [["review", "seo", "J3", "outcome"]]],
  [["defer", "seo#J3"], [["defer", "seo", "J3"]]],
  [["queue", "seo#J3", "work"], [["queue", "seo", "J3", "work"]]],
  [["unqueue", "seo#J3"], [["unqueue", "seo", "J3"]]],
  // the inbox's own verb first (Owen's names, repo-split P13)
  [["inbox", "working", "seo#J3", "on"], [["inbox", "seo", "working", "J3", "on"]]],
  [["inbox", "done", "seo#J3"], [["inbox", "seo", "done", "J3"]]],
  [["inbox", "clear", "seo#J3"], [["inbox", "seo", "clear", "J3"]]],
  [["inbox", "watch", "seo", "--session", "abc"], [["inbox", "seo", "watch", "--session", "abc"]]],
  [["inbox", "ignore", "seo"], [["inbox", "seo", "ignore"]]],
  [["bedtime", "seo", "start", "P3-P6,P9"], [["bedtime", "seo", "start", "P3-P6,P9"]]]
]

describe("planDocArgs():  Owen's rows", () => {
  test.each(OWENS_ROWS)("epic %j", (epic, tool) => {
    const [verb, ...args] = epic
    expect(planDocArgs(verb!, args)).toEqual(tool)
  })
})

////////////////
// ## The rest
////////////////

describe("planDocArgs()", () => {
  // epic `epic-workflow` P19:  run silently, the old order taught agents the old shape
  test("the tool's old order, with no #, is refused, spelled right", () => {
    const refused = (verb: string, args: string[]) => () => planDocArgs(verb, args)
    expect(refused("close", ["seo", "J3"])).toThrow('close:  epic close seo#J3  (the id goes after a #, not "seo J3")')
    expect(refused("update", ["seo", "J3", "underway", "x"])).toThrow('epic update seo#J3 underway "<reading>"')
    expect(refused("phase", ["seo", "3", "done"])).toThrow("epic phase seo#P3 ...")
    expect(refused("updated", ["seo", "Epic Migrate", "<p>x</p>"])).toThrow('epic updated "seo#Epic Migrate" ...')
    expect(refused("add", ["seo", "todo", "T"])).toThrow("epic add seo#C ...")
    expect(refused("commit", ["seo", "abc", "s", "--phase", "3"])).toThrow("epic commit seo#P3 <sha>")
    expect(refused("commit", ["seo", "abc", "s", "--item", "J3"])).toThrow("epic commit seo#J3 <sha>")
    expect(refused("update", ["seo", "P3", "--goal", "g"])).toThrow("epic update seo#P3 --<field> <value> ...")
    expect(refused("file", ["seo", "7", "r3"])).toThrow("epic file seo#P7 ...")
  })

  test("an item or phase verb given only the epic:  which one, with an example", () => {
    expect(() => planDocArgs("close", ["seo"])).toThrow("close:  which item?  epic close seo#J3")
    expect(() => planDocArgs("details", ["seo"])).toThrow("which item?  epic details seo#J3 --file <reply.html>")
    expect(() => planDocArgs("phase", ["seo"])).toThrow("which phase?  epic phase seo#P3 todo | active | done")
    expect(() => planDocArgs("add", ["seo"])).toThrow('which kind of item?  epic add seo#J "Title"')
  })

  test("no epic at all:  which, pointing to the verb's help;  the verbs that take none run", () => {
    expect(() => planDocArgs("close", [])).toThrow("close:  which epic?  epic close --help")
    expect(() => planDocArgs("summary", ["--json"])).toThrow("summary:  which epic?")
    expect(planDocArgs("list", [])).toEqual([["list"]])
  })

  test("the page's own verbs, and inbox's, take the epic alone", () => {
    expect(planDocArgs("inbox", ["seo"])).toEqual([["inbox", "seo"]])
    expect(planDocArgs("inbox", ["seo", "--json"])).toEqual([["inbox", "seo", "--json"]])
    expect(planDocArgs("inbox", ["wait", "seo"])).toEqual([["inbox", "seo", "wait"]])
    expect(planDocArgs("inbox", ["apply", "seo", "J3"])).toEqual([["inbox", "seo", "apply", "J3"]])
    expect(planDocArgs("inbox", ["wait", "SAGA:/epics", "--timeout", "60"])).toEqual([
      ["inbox", "SAGA:/epics", "wait", "--timeout", "60"]
    ])
    expect(planDocArgs("update", ["seo", "--standing"])).toEqual([["standing", "seo", "on"]])
  })

  test("verbs that take no epic, or several, pass through", () => {
    expect(planDocArgs("list", ["--json"])).toEqual([["list", "--json"]])
    expect(planDocArgs("split", ["--done", "--dry-run"])).toEqual([["split", "--done", "--dry-run"]])
    expect(planDocArgs("migrate", ["epic", "--all"])).toEqual([["migrate", "epic", "--all"]])
  })

  test("calm:  the first id after the #, the rest after it", () => {
    expect(planDocArgs("calm", ["seo#J3", "J4", "--loud"])).toEqual([["calm", "seo", "J3", "J4", "--loud"]])
  })

  test("add:  a kind's letter or word after the #, any case;  a decision is D", () => {
    expect(planDocArgs("add", ["seo#q", "Which?"])).toEqual([["add", "seo", "question", "Which?"]])
    expect(planDocArgs("add", ["seo#D", "Chose"])).toEqual([["add", "seo", "decision", "Chose"]])
    expect(planDocArgs("add", ["seo#issue", "Bug"])).toEqual([["add", "seo", "issue", "Bug"]])
    expect(() => planDocArgs("add", ["seo#J3", "T"])).toThrow(/a kind after the #/)
  })

  // epic `epic-engine` P39:  a decimal phase, P11.1, wherever a phase goes
  test("a decimal phase:  `seo#P11.1`, `seo#11.1`, for phase, move, commit and update", () => {
    expect(planDocArgs("phase", ["seo#P11.1", "done"])).toEqual([["phase", "seo", "11.1", "done"]])
    expect(planDocArgs("move", ["seo#11.1", "P4"])).toEqual([["move", "seo", "11.1", "P4"]])
    expect(planDocArgs("commit", ["seo#P11.1", "abc", "did"])).toEqual([
      ["commit", "seo", "abc", "did", "--phase", "11.1"]
    ])
    expect(planDocArgs("update", ["seo#P11.1", "--title", "New"])).toEqual([["rename", "seo", "P11.1", "New"]])
    expect(phaseOf("p11.1")).toBe("11.1")
  })

  test("commit:  an item after the # is --item", () => {
    expect(planDocArgs("commit", ["seo#J3", "abc", "fixed"])).toEqual([
      ["commit", "seo", "abc", "fixed", "--item", "J3"]
    ])
  })

  test("inbox:  a comment's id (M3, as the page shows it;  the old cm3 too), its flags, and several ids", () => {
    expect(planDocArgs("inbox", ["done", "seo#M3", "--file", "a.html"])).toEqual([
      ["inbox", "seo", "done", "M3", "--file", "a.html"]
    ])
    expect(planDocArgs("inbox", ["done", "seo#cm3", "--file", "a.html"])).toEqual([
      ["inbox", "seo", "done", "cm3", "--file", "a.html"]
    ])
    expect(planDocArgs("inbox", ["done", "seo#J3", "J4"])).toEqual([["inbox", "seo", "done", "J3", "J4"]])
  })

  test("inbox:  the old order, the epic first, refused with its new spelling;  an id where none goes, or none", () => {
    const refused = (args: string[]) => () => planDocArgs("inbox", args)
    expect(refused(["seo", "wait"])).toThrow("inbox:  epic inbox wait seo  (the inbox's verb goes first)")
    expect(refused(["seo#J3", "working", "on"])).toThrow("epic inbox working seo#J3 on  (the inbox's verb goes first)")
    expect(refused(["seo", "done", "cm3", "--file", "a.html"])).toThrow("epic inbox done seo#cm3 --file a.html")
    expect(refused(["seo#J3"])).toThrow("inbox seo#J3:  what?  epic inbox working | done | clear seo#J3")
    expect(refused(["done", "seo", "J3"])).toThrow('epic inbox done seo#J3  (the id goes after a #, not "seo J3")')
    expect(refused(["working", "seo"])).toThrow("epic inbox working seo#J3 on  (the id goes after a #)")
    expect(refused(["wait", "seo#J3"])).toThrow("takes an epic, not seo#J3")
    expect(refused(["wait"])).toThrow("inbox wait:  which epic?  epic inbox wait seo")
    expect(refused([])).toThrow("inbox:  which epic?")
  })

  test("a phase verb refuses an item;  a page verb refuses any #", () => {
    expect(() => planDocArgs("phase", ["seo#J3", "done"])).toThrow(/a phase, e\.g\. seo#P3/)
    expect(() => planDocArgs("summary", ["seo#J3"])).toThrow(/takes an epic, not seo#J3/)
    expect(() => planDocArgs("open", ["seo#P3"])).toThrow(/takes an epic/)
  })

  // epic `epic-workflow` P15
  test("saga:  its own verbs and arguments, passed through as typed", () => {
    expect(planDocArgs("saga", ["set", "seo", "spell-ui"])).toEqual([["saga", "set", "seo", "spell-ui"]])
    expect(planDocArgs("saga", ["create", "x", "A # title", "--purpose", "p"])).toEqual([
      ["saga", "create", "x", "A # title", "--purpose", "p"]
    ])
  })

  test("bedtime:  phases written one way;  done passes through", () => {
    expect(planDocArgs("bedtime", ["seo", "start", "3-6, p9"])).toEqual([["bedtime", "seo", "start", "P3-P6,P9"]])
    expect(planDocArgs("bedtime", ["seo", "done", "slept"])).toEqual([["bedtime", "seo", "done", "slept"]])
  })
})

describe("planDocArgs():  update", () => {
  // epic `repo-split` J140
  test("a card:  a state word after the target;  no id, or fields beside it, refused", () => {
    expect(() => planDocArgs("update", ["seo", "underway", "x"])).toThrow(
      'which item?  epic update seo#J3 underway "<reading>"'
    )
    expect(() => planDocArgs("update", ["seo#J3", "done", "--title", "T"])).toThrow(
      "update:  a card (done) or fields (--title), not both"
    )
    expect(() => planDocArgs("update", ["seo#J3", "finished"])).toThrow(/a card:  underway \| done \| noted/)
  })

  test("a phase:  body fields in one phase-body, then estimate, then rename", () => {
    expect(
      planDocArgs("update", ["seo#P3", "--goal", "g", "--verify", "", "--estimate", "2h", "--title", "New"])
    ).toEqual([
      ["phase-body", "seo", "3", "--goal", "g", "--verify", ""],
      ["estimate", "seo", "3", "2h"],
      ["rename", "seo", "P3", "New"]
    ])
  })

  test("an item:  --title renames it, --calm / --loud", () => {
    expect(planDocArgs("update", ["seo#J3", "--title", "<b>T</b>", "--html"])).toEqual([
      ["rename", "seo", "J3", "<b>T</b>", "--html"]
    ])
    expect(planDocArgs("update", ["seo#J3", "--calm"])).toEqual([["calm", "seo", "J3"]])
    expect(planDocArgs("update", ["seo#J3", "--loud"])).toEqual([["calm", "seo", "J3", "--loud"]])
  })

  test("the page:  standing on or off", () => {
    expect(planDocArgs("update", ["seo", "--standing", "off"])).toEqual([["standing", "seo", "off"]])
    expect(planDocArgs("update", ["seo", "--no-standing"])).toEqual([["standing", "seo", "off"]])
  })

  test("refuses no field, a field the target lacks, and a field with no value", () => {
    expect(() => planDocArgs("update", ["seo#P3"])).toThrow(/which fields\?  phase P3 has --symptom/)
    expect(() => planDocArgs("update", ["seo#J3", "--goal", "g"])).toThrow(/item J3 has no --goal/)
    expect(() => planDocArgs("update", ["seo", "--estimate", "2h"])).toThrow(/the page has no --estimate/)
    expect(() => planDocArgs("update", ["seo#P3", "--estimate"])).toThrow(/--estimate needs a value/)
    expect(() => planDocArgs("update", [])).toThrow(/update what\?/)
  })
})

describe("parseTarget()", () => {
  test("the epic, and what follows the #", () => {
    expect(parseTarget("seo")).toEqual({ epic: "seo" })
    expect(parseTarget("seo#J3")).toEqual({ epic: "seo", ref: "J3" })
    expect(() => parseTarget("#J3")).toThrow(/<epic>#<id>/)
    expect(() => parseTarget("seo#")).toThrow(/<epic>#<id>/)
  })

  test("phaseOf():  P3, p3 and 3 are phase 3;  a stable id is itself;  an item, or a name, isn't", () => {
    expect(["P3", "p3", "3", "p-epic-migrate", "J3", "epic-migrate"].map((ref) => phaseOf(ref))).toEqual([
      "3",
      "3",
      "3",
      "p-epic-migrate",
      undefined,
      undefined
    ])
  })

  test("a phase verb takes a phase's id or name too (the tool finds it);  update and commit its id", () => {
    expect(planDocArgs("phase", ["seo#epic-migrate", "done"])).toEqual([["phase", "seo", "epic-migrate", "done"]])
    expect(planDocArgs("updated", ["seo#Epic Migrate", "<p>x</p>"])).toEqual([
      ["updated", "seo", "Epic Migrate", "<p>x</p>"]
    ])
    expect(planDocArgs("update", ["seo#p-epic-migrate", "--estimate", "2h"])).toEqual([
      ["estimate", "seo", "p-epic-migrate", "2h"]
    ])
    expect(planDocArgs("commit", ["seo#p-epic-migrate", "abc1234", "did it"])).toEqual([
      ["commit", "seo", "abc1234", "did it", "--phase", "p-epic-migrate"]
    ])
  })
})

describe("phaseRanges()", () => {
  test("refuses what isn't phases, and a range that runs backwards", () => {
    expect(() => phaseRanges("P3-")).toThrow(/phases and ranges/)
    expect(() => phaseRanges("P6-P3")).toThrow(/runs backwards/)
  })
})
