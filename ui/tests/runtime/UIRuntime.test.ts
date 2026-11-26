import { describe, expect, it, vi } from "vite-plus/test"

import { RUNTIME_KEY, UI, loadUI, type RuntimeGlobal } from "spell/ui/runtime"

import { Modals } from "spell/ui/runtime/Modals"
import { Toasts } from "spell/ui/runtime/Toasts"
import { UIRuntime } from "spell/ui/runtime/UIRuntime"

////////////////
// ## The instance
////////////////

describe("UIRuntime.instance", () => {
  it("is one instance per page, stored on globalThis", () => {
    expect(UIRuntime.instance).toBe(UIRuntime.instance)
    expect((globalThis as RuntimeGlobal)[RUNTIME_KEY]).toBe(UIRuntime.instance)
  })

  it("a second copy of the module (duplicate bundle) shares the instance", async () => {
    // a query string makes Vite evaluate the module again:  a distinct `UIRuntime` class, as a second bundle has
    const path = "/src/runtime/UIRuntime.ts?duplicate-bundle"
    const duplicate = (await import(/* @vite-ignore */ path)) as { UIRuntime: typeof UIRuntime }
    expect(duplicate.UIRuntime).not.toBe(UIRuntime)
    expect(duplicate.UIRuntime.instance).toBe(UIRuntime.instance)
  })
})

describe("UIRuntime.load()", () => {
  it("load() / UI.load() / UIRuntime.load() resolve with the instance", async () => {
    const [a, b, c] = await Promise.all([loadUI(), UI.load(), UIRuntime.load()])
    expect(a).toBe(UIRuntime.instance)
    expect(b).toBe(a)
    expect(c).toBe(a)
  })

  // TODO: assert the runtime is a separate chunk in `dist/` (a node-side check after `yarn build`).
  //  Browser-mode tests can't read `dist/`, and `src/index.ts` doesn't import the runtime yet, so the
  //  library build has nothing to split.  Verified by hand with a scratch build of `src/runtime/index.ts`.
  it.todo("code-splits the runtime into its own chunk")
})

////////////////
// ## Services
////////////////

describe("UI.keyboard / version / i18n", () => {
  it("UI forwards to the instance's services", async () => {
    const runtime = await UI.load()
    expect(UI.keyboard).toBe(runtime.keyboard)
    expect(UI.version).toBe(runtime.version)
    expect("overlays" in UI).toBe(true)
    expect(UI.i18n.t("ok")).toBe("OK")
    expect(runtime.version).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe("UIRuntime.toast() / modals", () => {
  it("toasts.ready() imports the family the first time, and not once a provider is there", async () => {
    const ui = new UIRuntime()
    const load = vi.fn(async () => {
      Toasts.provider = { show: ({ id = "t1" }) => ({ id, closed: Promise.resolve() }), dismiss: () => {} }
    })
    ui.toasts.loadFamilyWith(load)
    try {
      await ui.toasts.ready()
      await ui.toasts.ready()
      expect(load).toHaveBeenCalledTimes(1)
    } finally {
      Toasts.provider = undefined
    }
  })

  it("modals.ready() imports the family the first time, and not once a provider is there", async () => {
    const ui = new UIRuntime()
    const load = vi.fn(async () => {
      Modals.provider = {
        confirm: async () => true,
        alert: async () => {},
        prompt: async () => undefined,
        choose: async () => undefined
      }
    })
    ui.modals.loadFamilyWith(load)
    try {
      await ui.modals.ready()
      await ui.modals.ready()
      expect(load).toHaveBeenCalledTimes(1)
    } finally {
      Modals.provider = undefined
    }
  })

  it("a dialog imports the family itself:  no ready() first", async () => {
    const ui = new UIRuntime()
    const load = vi.fn(async () => {
      Modals.provider = {
        confirm: async () => true,
        alert: async () => {},
        prompt: async ({ value }) => value,
        choose: async () => [1]
      }
    })
    ui.modals.loadFamilyWith(load)
    try {
      await expect(ui.modals.alert("hi")).resolves.toBeUndefined()
      await expect(ui.modals.confirm("sure?")).resolves.toBe(true)
      await expect(ui.modals.prompt({ message: "name?", value: "Ann" })).resolves.toBe("Ann")
      await expect(ui.modals.choose({ message: "which?", rows: [] })).resolves.toEqual([1])
      expect(load).toHaveBeenCalledTimes(1)
    } finally {
      Modals.provider = undefined
    }
  })

  it("a toast imports the family itself:  its handle at once, shown with the same id once the family is in", async () => {
    const ui = new UIRuntime()
    const shown = vi.fn(({ id = "t1" }: { id?: string }) => ({ id, closed: Promise.resolve() }))
    const dismissed = vi.fn()
    ui.toasts.loadFamilyWith(async () => {
      Toasts.provider = { show: shown, dismiss: dismissed }
    })
    try {
      const handle = ui.toast({ message: "hi" })
      expect(shown).not.toHaveBeenCalled()
      await handle.closed
      expect(shown).toHaveBeenCalledWith(expect.objectContaining({ message: "hi", id: handle.id }))
      ui.toasts.dismiss(handle.id)
      expect(dismissed).toHaveBeenCalledWith(handle.id)
    } finally {
      Toasts.provider = undefined
    }
  })

  it("on a page with no way to import their families, toasts throw and dialogs reject until a provider registers", async () => {
    const runtime = await UI.load()
    expect(() => runtime.toast({ message: "hi" })).toThrow(/ui-toast not registered/)
    await expect(runtime.modals.confirm("sure?")).rejects.toThrow(/ui-modal not registered/)
    Modals.provider = {
      confirm: async ({ message }) => message === "sure?",
      alert: async () => {},
      prompt: async ({ value }) => value,
      choose: async () => [0]
    }
    Toasts.provider = { show: ({ id = "t1" }) => ({ id, closed: Promise.resolve() }), dismiss: () => {} }
    try {
      await expect(runtime.modals.confirm("sure?")).resolves.toBe(true)
      expect(runtime.toast({ message: "hi" }).id).toBe("t1")
    } finally {
      Modals.provider = undefined
      Toasts.provider = undefined
    }
  })
})
