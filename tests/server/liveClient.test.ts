import { Script } from "node:vm"

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"

/** A Mac, the key going to the page itself (no field). */
const MAC = { apple: true }

/** A key press:  `key`, with the modifiers named in `held` (`"meta shift"` ...). */
function press(key: string, held = ""): SRV.KeyPress {
  return {
    key,
    metaKey: held.includes("meta"),
    ctrlKey: held.includes("ctrl"),
    altKey: held.includes("alt"),
    shiftKey: held.includes("shift")
  }
}

describe("forVsCode()", () => {
  test("VS Code's own keys go to VS Code:  the palette, quick open, go to symbol, the side bars, F1", () => {
    const keys = [
      press("P", "meta shift"),
      press("p", "meta"),
      press("O", "meta shift"),
      press("b", "meta"),
      press("b", "meta alt"),
      press("`", "ctrl"),
      press("F", "meta shift"),
      press("w", "meta"),
      press("F1")
    ]
    expect(keys.map((key) => SRV.forVsCode(key, MAC))).toEqual(keys.map(() => true))
  })

  test("the PAGE's edit keys, its find bar, plain typing and keys that move stay in the page", () => {
    const keys = [
      press("a", "meta"),
      press("c", "meta"),
      press("v", "meta"),
      press("z", "meta"),
      press("Z", "meta shift"),
      press("f", "meta"),
      press("G", "meta shift"),
      press("p"),
      press("P", "shift"),
      press("Meta", "meta"),
      press("ArrowDown", "meta"),
      press("Enter", "meta"),
      press(" ", "ctrl")
    ]
    expect(keys.map((key) => SRV.forVsCode(key, MAC))).toEqual(keys.map(() => false))
  })

  test("in a field on a Mac, Ctrl moves the caret (stays);  Cmd + Shift + P still opens the palette", () => {
    const field = { apple: true, field: "text" } as const
    expect(SRV.forVsCode(press("e", "ctrl"), field)).toBe(false)
    expect(SRV.forVsCode(press("P", "meta shift"), field)).toBe(true)
    expect(SRV.forVsCode(press("e", "ctrl"), { apple: false, field: "text" })).toBe(true)
  })

  test("in rich text, Cmd + B / I / U format it;  outside it, Cmd + B is VS Code's side bar", () => {
    expect(SRV.forVsCode(press("b", "meta"), { apple: true, field: "rich" })).toBe(false)
    expect(SRV.forVsCode(press("b", "meta"), { apple: true, field: "text" })).toBe(true)
  })

  test("a key still being composed (an IME) is never sent", () => {
    expect(SRV.forVsCode({ ...press("p", "meta"), isComposing: true }, MAC)).toBe(false)
  })
})

describe("liveAction():  what a changed file means to a page", () => {
  /** an epic page that loaded the docs runtime, the docs bundle, a lazy chunk and the epics pack */
  const page = {
    file: "/epics/x/x.plan.html",
    scripts: [
      "/api/server/live.js",
      "/packages/epics/tools/_assets/spell-doc-runtime.js",
      "/packages/epics/tools/_assets/spell-ui.js",
      "/packages/epics/tools/_assets/lazy/ui-code-AbC123.js",
      "/packages/epics/components/__pack/epics.pack.js"
    ]
  }

  test("its own file:  the page, patched in place or reloaded", () => {
    expect(SRV.liveAction("/epics/x/x.plan.html", page)).toBe("page")
  })

  // epic `epic-engine` P40:  a component set's page is reported where it's served, not as its file in the checkout
  test("the file at its own address:  the page too, a folder's as its `index.html`", () => {
    const setPage = { file: "/spell-ui/docs/ui-button.html", scripts: [], address: "/components/ui/ui-button.html" }
    expect(SRV.liveAction("/components/ui/ui-button.html", setPage)).toBe("page")
    expect(SRV.liveAction("/components/ui/ui-icon.html", setPage)).toBe("file")
    const home = { file: "/spell-ui/docs/index.html", scripts: [], address: "/components/ui/" }
    expect(SRV.liveAction("/components/ui/index.html", home)).toBe("page")
  })

  test("a stylesheet:  swapped in place (when the page uses it)", () => {
    expect(SRV.liveAction("/packages/epics/tools/_assets/spell-doc.css", page)).toBe("style")
    expect(SRV.liveAction("/components/ui/_assets/site.css", page)).toBe("style")
  })

  test("the runtime, the bundle, a chunk (old name or new), the pack:  hot reload", () => {
    const paths = [
      "/packages/epics/tools/_assets/spell-doc-runtime.js",
      "/packages/epics/tools/_assets/spell-ui.js",
      "/packages/epics/tools/_assets/lazy/ui-code-XyZ789.js",
      "/packages/epics/components/__pack/epics.pack.js"
    ]
    expect(paths.map((path) => SRV.liveAction(path, page))).toEqual(paths.map(() => "script"))
  })

  test("an experiment's bundle its guide loaded:  hot reload", () => {
    const guide = { file: "/guides/c/c.html", scripts: ["/guides/c/experiments/c.bundle.js"] }
    expect(SRV.liveAction("/guides/c/experiments/c.bundle.js", guide)).toBe("script")
  })

  test("a script it never loaded (a repo tool), or beside the live client under /api/:  ignored", () => {
    expect(SRV.liveAction("/packages/epics/tools/doc-links.js", page)).toBe("ignore")
    expect(SRV.liveAction("/api/server/other.js", page)).toBe("ignore")
  })

  test("any other file:  the page decides (spell-server:changed)", () => {
    expect(SRV.liveAction("/epics/x/parts/q2.html", page)).toBe("file")
    expect(SRV.liveAction("/guides/x/data.json5", page)).toBe("file")
  })
})

describe("servedPath()", () => {
  const base = "http://127.0.0.1:4747/epics/x/x.plan.html"

  test("the path, without query or hash;  another origin's:  none", () => {
    const pack = "/packages/epics/components/__pack/epics.pack.js"
    expect(SRV.servedPath(`${pack}?v=2#x`, base)).toBe(pack)
    expect(SRV.servedPath("https://cdn.example/x.js", base)).toBeUndefined()
  })

  test("a worktree's file on the main server:  its path from the main checkout, as changes are reported", () => {
    const url = "http://127.0.0.1:4747/worktrees/seo/packages/epics/tools/_assets/spell-ui.js"
    expect(SRV.servedPath(url, base)).toBe("/.claude/worktrees/seo/packages/epics/tools/_assets/spell-ui.js")
  })

  test("the worktrees' folder as the server tells it (`SPELL_SERVER.worktreesPath`):  beside the repo too", () => {
    const url = "http://127.0.0.1:4747/worktrees/seo/packages/epics/tools/_assets/spell-ui.js"
    expect(SRV.servedPath(url, base, "/../spell-app.worktrees/")).toBe(
      "/../spell-app.worktrees/seo/packages/epics/tools/_assets/spell-ui.js"
    )
    expect(SRV.servedPath("http://127.0.0.1:4747/epics/x.js", base, "/w/")).toBe("/epics/x.js")
  })
})

// epic `epic-engine` P46:  a root link means the checkout serving the page
describe("worktreeHref()", () => {
  test("a worktree's page:  a root path under its address;  the server's own routes and other URLs as they are", () => {
    const page = "/worktrees/seo/epics/seo/seo.plan.html"
    expect(SRV.worktreeHref("/spell-ui/src/x.ts#L3", page)).toBe("/worktrees/seo/spell-ui/src/x.ts#L3")
    expect(SRV.worktreeHref("/guides/server.html", page)).toBe("/worktrees/seo/guides/server.html")
    for (const href of [
      "/api/server",
      "/_epic/assets/x.js",
      "/worktrees/b/x.html",
      "x.html",
      "#t3",
      "//cdn/x",
      "https://x.dev"
    ])
      expect(SRV.worktreeHref(href, page)).toBe(href)
  })

  test("main's own page:  every link as it is", () => {
    expect(SRV.worktreeHref("/spell-ui/src/x.ts", "/epics/seo/seo.plan.html")).toBe("/spell-ui/src/x.ts")
  })
})

describe("reloadGate():  one hot reload, not while typing", () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  /** a gate whose reader types while `state.typing`;  `reloads` counts reloads, `waits` the pill's states */
  function gate() {
    const state = { typing: false, reloads: 0, waits: [] as boolean[] }
    const it = SRV.reloadGate({
      wait: 500,
      typing: () => state.typing,
      reload: () => void state.reloads++,
      waiting: (on) => void state.waits.push(on)
    })
    return { state, it }
  }

  test("a build's many changes:  ONE reload, 500ms after the last", () => {
    const { state, it } = gate()
    for (let at = 0; at < 5; at++) {
      it.request()
      vi.advanceTimersByTime(200)
    }
    expect(state.reloads).toBe(0)
    vi.advanceTimersByTime(300)
    expect(state.reloads).toBe(1)
    vi.advanceTimersByTime(5000)
    expect(state.reloads).toBe(1)
  })

  test("typing in a field:  waits (the pill shows), then reloads once focus leaves it", () => {
    const { state, it } = gate()
    state.typing = true
    it.request()
    vi.advanceTimersByTime(500)
    expect(state).toMatchObject({ reloads: 0, waits: [true] })
    // focus moves on to another field:  still typing, still waiting
    it.settle()
    vi.advanceTimersByTime(500)
    expect(state.reloads).toBe(0)
    state.typing = false
    it.settle()
    vi.advanceTimersByTime(500)
    expect(state).toMatchObject({ reloads: 1, waits: [true, true, false] })
  })

  test("focus leaving a field with no reload waiting:  nothing", () => {
    const { state, it } = gate()
    it.settle()
    vi.advanceTimersByTime(5000)
    expect(state.reloads).toBe(0)
  })
})

describe("liveClientScript()", () => {
  test("serves the helpers the client calls beside it, as one classic script", () => {
    const script = SRV.liveClientScript()
    for (const helper of ["forVsCode", "liveAction", "servedPath", "reloadGate"])
      expect(script).toContain(`function ${helper}(`)
    // compiled, never run:  it reaches for `window`
    expect(() => new Script(script)).not.toThrow()
  })
})
