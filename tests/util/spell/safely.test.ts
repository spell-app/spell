import { describe, expect, test, vi } from "vite-plus/test"

import { Logger, makeErrorWrapper, safelyCall, safelyCallAll, setDebugGlobal } from "spell/util"

/** A logger whose `warn` and `error` are spies, and print nothing. */
function quietLogger(): Logger {
  const logger = new Logger({ level: Logger.OFF })
  logger.warn = vi.fn()
  logger.error = vi.fn()
  return logger
}

describe("safelyCall()", () => {
  test("a predicate's answer;  `undefined` when it throws, WARNED through the logger", () => {
    const logger = quietLogger()
    expect(safelyCall(() => 3, logger)).toBe(3)
    expect(
      safelyCall(() => {
        throw new Error("bad predicate")
      }, logger)
    ).toBeUndefined()
    expect(logger.warn).toHaveBeenCalledOnce()
  })

  test("with no logger, a throw still shows:  console.warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    safelyCall(() => {
      throw new Error("bad predicate")
    })
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})

describe("safelyCallAll()", () => {
  test("runs EVERY cleanup, whichever throw;  silent without a logger", () => {
    const ran: number[] = []
    const error = vi.spyOn(console, "error")
    safelyCallAll([
      () => ran.push(1),
      () => {
        throw new Error("noisy cleanup")
      },
      () => ran.push(3)
    ])
    expect(ran).toEqual([1, 3])
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})

describe("makeErrorWrapper()", () => {
  @makeErrorWrapper("Account")
  class Account {
    balance = 10
    withdraw(amount: number) {
      if (amount > this.balance) throw new Error("not enough")
      return (this.balance -= amount)
    }
    async load(id: string) {
      throw new Error(`no account ${id}`)
    }
    keepCause() {
      throw new Error("deep", { cause: { from: "below" } })
    }
  }

  test("a method's error carries the class, method and arguments;  `this` and results are untouched", async () => {
    const account = new Account()
    expect(account.withdraw(3)).toBe(7)
    expect(() => account.withdraw(50)).toThrow(
      expect.objectContaining({ cause: { className: "Account", method: "withdraw", args: [50] } })
    )
    await expect(account.load("a1")).rejects.toMatchObject({
      cause: { className: "Account", method: "load", args: ["a1"] }
    })
  })

  test("an error that already has a cause keeps it", () => {
    expect(() => new Account().keepCause()).toThrow(expect.objectContaining({ cause: { from: "below" } }))
  })
})

describe("setDebugGlobal()", () => {
  test("puts each object on the global scope, for the console", () => {
    const project = { name: "Snake" }
    setDebugGlobal({ debugProject: project })
    expect((globalThis as Record<string, unknown>).debugProject).toBe(project)
    delete (globalThis as Record<string, unknown>).debugProject
  })
})
