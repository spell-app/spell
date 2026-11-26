import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { runSpellFiles } from "spell/parser/spell/test"

/**
 * A yes or no that can be nothing, read from a web server that sends `null` for one not decided yet:
 * `its "passed" is yes, no or nothing` reads it as nothing, not no;  a plain `yes or no` still reads it as no.
 */

afterAll(() => void vi.unstubAllGlobals())

/** The server's rows:  passed `null`, no, yes, and left out. */
const ROWS = [
  { id: "1", name: "unscored", passed: null, done: null },
  { id: "2", name: "fail", passed: false, done: false },
  { id: "3", name: "pass", passed: true, done: true },
  { id: "4", name: "unsent" }
]

/** `lines` for a result, read from the fake server:  each row's name and what `to say` answers for it. */
async function verdictsOf(passed: string, done: string) {
  vi.stubGlobal("fetch", async () => Response.json(ROWS))
  core.resetRuntime()
  const contents = `lab is a web server at "https://lab.test"
	it is read only
	results live at "/results"

a "result" is a thing
	it lives in lab
	its "name" is text
	its "passed" is ${passed}
	its "done" is ${done}
	its "verdict" is
		if its passed is no
			return "Fail"
		if its passed is nothing
			return "Not scored"
		return "Pass"
`
  const { Result } = runSpellFiles([{ path: "/T.spell", contents }], { registered: true })("Result") as {
    Result: new () => unknown
  }
  const { items } = (await core.savedThings(Result)) as unknown as {
    items: { name: string; passed: unknown; done: unknown; verdict: string }[]
  }
  return items.map((item) => {
    return [item.name, item.passed, item.done, item.verdict]
  })
}

describe("a yes or no that can be nothing, from a place", () => {
  test("`yes, no or nothing`:  null and left out are nothing, Not scored;  a no is Fail;  plain `yes or no` as before", async () => {
    expect(await verdictsOf("yes, no or nothing", "yes or no")).toEqual([
      ["unscored", undefined, false, "Not scored"],
      ["fail", false, false, "Fail"],
      ["pass", true, true, "Pass"],
      ["unsent", undefined, false, "Not scored"]
    ])
  })

  test("a new one is nothing until it's set;  set to no it's no, and set to nothing again, nothing", () => {
    core.resetRuntime()
    const contents = `a "result" is a thing\n\tits "passed" is yes, no or nothing\n`
    const { Result } = runSpellFiles([{ path: "/T.spell", contents }])("Result") as {
      Result: new () => { passed: unknown }
    }
    const result = new Result()
    expect(result.passed).toBe(undefined)
    result.passed = false
    expect(result.passed).toBe(false)
    result.passed = undefined
    expect(result.passed).toBe(undefined)
  })
})
