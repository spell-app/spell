import { describe, test, expect, vi } from "vite-plus/test"
import { Task, TaskList } from "spell/util"
import { after, soonEvenHidden } from "spell/util/timing"

describe("TaskList.forEach", () => {
  test("reads a `list` function when it RUNS, so an earlier task can fill it", async () => {
    const items: string[] = []
    const seen: string[] = []
    const taskList = new TaskList({
      tasks: [
        new Task({ name: "fill", run: async () => void (items.length || items.push("a", "b")) }),
        TaskList.forEach({
          name: "each",
          list: () => items,
          getTask: (item: string) => new Task({ name: item, run: async () => void seen.push(item) })
        })
      ]
    })
    await taskList.start(undefined)
    expect(seen).toEqual(["a", "b"])

    items.push("c")
    await taskList.start(undefined)
    expect(seen).toEqual(["a", "b", "a", "b", "c"])
  })
})

describe("TaskList, cancelled and started again", () => {
  test("the cancelled run stops:  the new run does each task once, in order, and nothing warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      const ran: string[] = []
      const step = (name: string) => new Task({ name, run: () => after(0.01, () => void ran.push(name)) })
      const taskList = new TaskList({ tasks: [step("a"), step("b"), step("c")] })

      // as `SpellProject.parse()` does:  cancel the run in flight, then start a new one at once
      const first = taskList.start(undefined)
      await after(0.005)
      taskList.cancel()
      await first
      ran.length = 0
      await taskList.start(undefined)
      // let the cancelled run's last step come round, if it still would
      await after(0.05)

      expect(ran).toEqual(["a", "b", "c"])
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})

describe("TaskList, letting the browser in between tasks (epic `solid-2-final` P9)", () => {
  test("work queued during a task runs before the next task", async () => {
    const ran: string[] = []
    const taskList = new TaskList({
      tasks: [
        // a key typed during the first task:  a task of its own, queued while it runs
        // - a message, not a timer:  with no `scheduler.yield()` (node) the list lets the browser in by a message too,
        //   and a timer's turn comes after it in node
        new Task({ name: "a", run: async () => void (ran.push("a"), soonEvenHidden(() => ran.push("key"))) }),
        new Task({ name: "b", run: async () => void ran.push("b") })
      ]
    })
    await taskList.start(undefined)
    expect(ran).toEqual(["a", "key", "b"])
  })

  test("cancelled while it lets the browser in:  the next task never runs", async () => {
    const ran: string[] = []
    const taskList: TaskList = new TaskList({
      tasks: [
        // cancelled as it ends, e.g. by a key typed:  the list is then letting the browser in before "b"
        new Task({ name: "a", run: async () => void (ran.push("a"), soonEvenHidden(() => taskList.cancel())) }),
        new Task({ name: "b", run: async () => void ran.push("b") })
      ]
    })
    await taskList.start(undefined)
    await after(0.02)
    expect(ran).toEqual(["a"])
  })
})

describe("TaskList, in a tab out of sight", () => {
  test("goes from task to task on no timer:  a hidden tab's held-back timers don't hold it", async () => {
    // fake timers that never move, as a hidden tab's:  only the tasks' turns between them could wait on one
    vi.useFakeTimers()
    try {
      const ran: string[] = []
      const step = (name: string) => new Task({ name, run: async () => void ran.push(name) })
      const taskList = new TaskList({ tasks: [step("a"), step("b"), step("c")] })
      await taskList.start(undefined)
      expect(ran).toEqual(["a", "b", "c"])
    } finally {
      vi.useRealTimers()
    }
  })
})
