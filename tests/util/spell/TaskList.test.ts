import { describe, test, expect, vi } from "vite-plus/test"
import { Task, TaskList } from "spell/util"
import { after } from "spell/util/timing"

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
