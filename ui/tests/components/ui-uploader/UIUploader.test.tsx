import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Fixture } from "spell/test-helpers/Fixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { DropZones, UIUploader, type DOMUploaderElement } from "spell/ui/components/ui-uploader"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-uploader/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Its four looks. */
const APPEARANCES = ["hero", "button", "input", "compact"]

/** An uploader element, as its tag's DOM element. */
type UploaderElement = DOMUploaderElement & HTMLElement & { action?: unknown; dropZone?: unknown }

/** An uploader drawn with `attributes`. */
async function uploaderWith(attributes = "", inner = "") {
  const uploader = await ElementFixture.render<UploaderElement>(`<ui-uploader ${attributes}>${inner}</ui-uploader>`)
  await ShadowTree.settle(uploader)
  return uploader
}

/** A file named `name`, `size` bytes long. */
function fileOf(name: string, size = 10, type = "application/json") {
  return new File(["x".repeat(size)], name, { type })
}

/** A `DataTransfer` holding `files`. */
function transferOf(files: File[]) {
  const transfer = new DataTransfer()
  for (const file of files) transfer.items.add(file)
  return transfer
}

/** The native input inside its hidden `<ui-input type="file">`, which the file dialog fills. */
function nativePicker(uploader: Element) {
  const fileInput = uploader.shadowRoot!.querySelector('ui-input[type="file"]')!
  return fileInput.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!
}

/** Pick `files` in its file dialog, as a person would. */
function pick(uploader: Element, files: File[]) {
  const input = nativePicker(uploader)
  input.files = transferOf(files).files
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

/** Drag `files` over `target`, then drop them. */
function drop(target: Element, files: File[], { dropIt = true } = {}) {
  const dataTransfer = transferOf(files)
  const init = { dataTransfer, bubbles: true, cancelable: true, composed: true }
  target.dispatchEvent(new DragEvent("dragover", init))
  if (dropIt) target.dispatchEvent(new DragEvent("drop", init))
}

/** Its rows, as people read them:  each one's name and status (or "progress"). */
function rowsOf(uploader: Element) {
  return [...uploader.shadowRoot!.querySelectorAll<HTMLElement>('[part~="file"]')].map((row) => ({
    name: row.querySelector('[part~="name"]')!.textContent!.trim(),
    status: row.querySelector('[part~="progress"]')
      ? "progress"
      : row.querySelector('[part~="status"]')!.textContent!.trim()
  }))
}

/** Wait until it has `count` rows. */
async function rows(uploader: Element, count: number) {
  await vi.waitFor(() => expect(uploader.shadowRoot!.querySelectorAll('[part~="file"]').length).toBe(count))
  await ShadowTree.settle(uploader)
  return rowsOf(uploader)
}

/** How see-through `element` is drawn:  its opacity times every box's around it, across shadow roots. */
function drawnOpacity(element: Element) {
  let opacity = 1
  for (let node: Node | null = element; node; node = node.parentNode ?? (node as ShadowRoot).host ?? null) {
    if (node.nodeType === Node.ELEMENT_NODE) opacity *= Number(getComputedStyle(node as Element).opacity)
  }
  return opacity
}

/** A folder of two files dropped on it, and a plain file beside it. */
function folderDrop() {
  return {
    via: "drop",
    folders: [
      {
        name: "netlists",
        path: "netlists",
        files: [
          { file: fileOf("top.json"), path: "netlists/top.json" },
          { file: fileOf("adc.json"), path: "netlists/sub/adc.json" }
        ]
      }
    ],
    files: [{ file: fileOf("stray.json"), path: "stray.json" }]
  } as never
}

/** Every event of `names` it sends, in order:  each one's name and detail. */
function heard(uploader: Element, names: string[]) {
  const events: { type: string; detail: Record<string, unknown> }[] = []
  for (const name of names) {
    uploader.addEventListener(name, (event) => events.push({ type: event.type, detail: (event as CustomEvent).detail }))
  }
  return events
}

afterEach(() => {
  DropZones.reset()
  vi.unstubAllGlobals()
})

describe("<ui-uploader>", () => {
  test("defines its tag;  a hero by default, its words naming the kinds it takes", async () => {
    expect(UIUploader.describe().tag).toBe("ui-uploader")
    const uploader = await uploaderWith('extensions="json" multiple max-files="5" max-size="2 MB"')
    expect(uploader.matches(":state(hero)")).toBe(true)
    const text = uploader.shadowRoot!.textContent!
    expect(text).toContain("Drop .json files here, or")
    expect(text).toContain("Choose files…")
    expect(text).toContain("Up to 5 files, 2 MB each")
    await expectAccessible(uploader)
  })

  test.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await ShadowTree.settle(root.querySelector("ui-uploader") ?? root)
    await expectAccessible(root)
  })

  test.each(APPEARANCES)("%s:  a pick and a drop each take files", async (appearance) => {
    const uploader = await uploaderWith(`appearance="${appearance}" multiple`)
    expect(uploader.matches(`:state(${appearance})`)).toBe(true)
    const leaked = heard(document.body, ["ui-changed"])
    pick(uploader, [fileOf("a.json")])
    await vi.waitFor(() => expect(uploader.files.map((file) => file.name)).toEqual(["a.json"]))
    // its file input's own event stays inside it
    expect(leaked).toEqual([])
    drop(uploader, [fileOf("b.json")])
    await vi.waitFor(() => expect(uploader.files.map((file) => file.name)).toEqual(["a.json", "b.json"]))
    await ShadowTree.settle(uploader)
    // compact shows one line of status, not a row each
    if (appearance === "compact") expect(uploader.shadowRoot!.querySelector('[part~="file"]')).toBeNull()
    else expect(rowsOf(uploader).map((row) => row.name)).toEqual(["a.json", "b.json"])
    await expectAccessible(uploader)
  })

  test("a kind, a size and a count turned away, each with its reason", async () => {
    const uploader = await uploaderWith('extensions="json" multiple max-files="2" max-size="1 KB"')
    pick(uploader, [
      fileOf("a.json"),
      fileOf("b.png", 10, "image/png"),
      fileOf("c.json", 4096),
      fileOf("d.json"),
      fileOf("e.json")
    ])
    expect(await rows(uploader, 5)).toEqual([
      { name: "a.json", status: "Ready" },
      { name: "b.png", status: "Not a .json file" },
      { name: "c.json", status: "Too big" },
      { name: "d.json", status: "Ready" },
      { name: "e.json", status: "Too many files" }
    ])
    // the full sentence is each row's tooltip
    const tooltips = [...uploader.shadowRoot!.querySelectorAll('[part~="status"]')].map((status) =>
      status.getAttribute("data-tooltip")
    )
    expect(tooltips).toEqual([
      null,
      "Only .json files can be uploaded. Choose a file that ends in .json.",
      "This file is too big, so it wasn't added. Choose a file that's 1 KB or smaller.",
      null,
      "This file wasn't added: up to 2 files can be added at once. Remove one, then add this file again."
    ])
  })

  test("without multiple:  one file, a new pick replacing it", async () => {
    const uploader = await uploaderWith()
    pick(uploader, [fileOf("a.json"), fileOf("b.json")])
    expect(await rows(uploader, 2)).toEqual([
      { name: "a.json", status: "Ready" },
      { name: "b.json", status: "Only one file" }
    ])
    pick(uploader, [fileOf("c.json")])
    expect(await rows(uploader, 1)).toEqual([{ name: "c.json", status: "Ready" }])
  })

  test("the events before, while and after, the same for a pick as for a drop", async () => {
    const uploader = await uploaderWith("multiple")
    const events = heard(uploader, ["ui-file-dragged-over", "ui-file-dropping", "ui-file-dropped", "ui-uploading"])
    pick(uploader, [fileOf("a.json")])
    await rows(uploader, 1)
    drop(uploader, [fileOf("b.json")])
    await rows(uploader, 2)
    expect(events.map((event) => [event.type, event.detail.via ?? ""])).toEqual([
      ["ui-file-dropping", "dialog"],
      ["ui-file-dropped", "dialog"],
      ["ui-uploading", ""],
      ["ui-file-dragged-over", "drop"],
      ["ui-file-dropping", "drop"],
      ["ui-file-dropped", "drop"],
      ["ui-uploading", ""]
    ])
    const dropped = events.find((event) => event.type === "ui-file-dropped")!.detail
    expect(dropped).toMatchObject({ name: "a.json", path: "a.json", size: 10, type: "application/json" })
    expect(await (dropped.file as File).text()).toBe("x".repeat(10))
  })

  test("a drag that leaves without a drop:  dragged over, then out", async () => {
    const uploader = await uploaderWith()
    const events = heard(uploader, ["ui-file-dragged-over", "ui-file-dragged-out"])
    drop(uploader, [fileOf("a.json"), fileOf("b.json")], { dropIt: false })
    await ShadowTree.settle(uploader)
    expect(uploader.matches(":state(dragged-over)")).toBe(true)
    expect(uploader.shadowRoot!.textContent).toContain("Drop to add 2 files")
    await vi.waitFor(() =>
      expect(events.map((event) => event.type)).toEqual(["ui-file-dragged-over", "ui-file-dragged-out"])
    )
    expect(events[0]!.detail).toMatchObject({ count: 2, via: "drop" })
    expect(uploader.matches(":state(dragged-over)")).toBe(false)
  })

  test("a cancelled ui-file-dropping leaves its file out", async () => {
    const uploader = await uploaderWith("multiple")
    uploader.addEventListener("ui-file-dropping", (event) => {
      if ((event as CustomEvent).detail.name === "b.json") event.preventDefault()
    })
    pick(uploader, [fileOf("a.json"), fileOf("b.json"), fileOf("c.json")])
    expect((await rows(uploader, 2)).map((row) => row.name)).toEqual(["a.json", "c.json"])
  })

  test("a folder uploader:  ui-folder-* events, then each file's, with its path;  a plain file turned away", async () => {
    const uploader = await uploaderWith("folder multiple")
    const events = heard(uploader, ["ui-folder-dropping", "ui-folder-dropped", "ui-file-dropped"])
    const component = (uploader as unknown as { component: UIUploader }).component
    await component.take(folderDrop())
    expect(events.map((event) => [event.type, event.detail.path])).toEqual([
      ["ui-folder-dropping", "netlists"],
      ["ui-folder-dropped", "netlists"],
      ["ui-file-dropped", "netlists/top.json"],
      ["ui-file-dropped", "netlists/sub/adc.json"],
      ["ui-file-dropped", "stray.json"]
    ])
    expect(await rows(uploader, 3)).toEqual([
      { name: "top.json", status: "Ready" },
      { name: "adc.json", status: "Ready" },
      { name: "stray.json", status: "Not a folder" }
    ])
    const dragEvents = heard(uploader, ["ui-folder-dragged-over", "ui-file-dragged-over"])
    drop(uploader, [fileOf("x.json")], { dropIt: false })
    expect(dragEvents.map((event) => event.type)).toEqual(["ui-folder-dragged-over"])
  })

  test("a cancelled ui-uploading:  nothing called, nothing posted", async () => {
    const action = vi.fn()
    const uploader = await uploaderWith('destination="/upload"')
    uploader.action = action
    uploader.addEventListener("ui-uploading", (event) => event.preventDefault())
    const leaked = heard(document.body, ["ui-changed"])
    pick(uploader, [fileOf("a.json")])
    await vi.waitFor(() => expect(uploader.files.map((file) => file.name)).toEqual(["a.json"]))
    // its file input's own event stays inside it
    expect(leaked).toEqual([])
    expect(action).not.toHaveBeenCalled()
  })

  test("action:  called with the files;  both set, only the action, and one warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const action = vi.fn(async (files: File[]) => files.length)
    const uploader = await uploaderWith('destination="/upload" multiple')
    uploader.action = action
    const events = heard(uploader, ["ui-uploaded"])
    pick(uploader, [fileOf("a.json"), fileOf("b.json")])
    await vi.waitFor(() => expect(rowsOf(uploader).map((row) => row.status)).toEqual(["Done", "Done"]))
    expect(action).toHaveBeenCalledOnce()
    expect(action.mock.calls[0]![0].map((file) => file.name)).toEqual(["a.json", "b.json"])
    expect(events.map((event) => event.detail.response)).toEqual([2, 2])
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  test("action that throws:  each row failed, with its message", async () => {
    const uploader = await uploaderWith()
    uploader.action = () => {
      throw new Error("not a netlist")
    }
    pick(uploader, [fileOf("a.json")])
    await vi.waitFor(() => expect(rowsOf(uploader)).toEqual([{ name: "a.json", status: "Failed:  not a netlist" }]))
  })

  test("destination:  each file posted as form data, one failing", async () => {
    const posted: string[] = []
    vi.stubGlobal("XMLHttpRequest", fakeServer(posted))
    const uploader = await uploaderWith('destination="/upload" multiple')
    const events = heard(uploader, ["ui-upload-progress", "ui-uploaded", "ui-upload-failed"])
    pick(uploader, [fileOf("good.json"), fileOf("bad.json")])
    await vi.waitFor(() =>
      expect(rowsOf(uploader)).toEqual([
        { name: "good.json", status: "Uploaded" },
        { name: "bad.json", status: "Failed:  server error 500" }
      ])
    )
    expect(posted).toEqual(["good.json", "bad.json"])
    expect(events.find((event) => event.type === "ui-uploaded")!.detail.response).toEqual({ ok: true })
    const failed = events.find((event) => event.type === "ui-upload-failed")!.detail.error as Error & {
      status?: number
    }
    expect(failed.name).toBe("ApiError")
    expect(failed.status).toBe(500)
    expect(events.some((event) => event.type === "ui-upload-progress")).toBe(true)
    expect(uploader.shadowRoot!.querySelector('[part~="remove"]')!.getAttribute("aria-label")).toBe("Remove")
  })

  test.each(APPEARANCES)("%s:  its button opens the file dialog, through a hidden ui-input", async (appearance) => {
    const uploader = await uploaderWith(`appearance="${appearance}" extensions="json, csv" multiple`)
    const fileInput = uploader.shadowRoot!.querySelector<HTMLElement>('ui-input[type="file"]')!
    expect(fileInput.hidden).toBe(true)
    expect(uploader.shadowRoot!.querySelector(':not(ui-input) > input[type="file"]')).toBeNull()
    const native = nativePicker(uploader)
    expect(native.accept).toBe(".json,.csv")
    expect(native.multiple).toBe(true)
    const opened: HTMLInputElement[] = []
    const showPicker = vi.spyOn(HTMLInputElement.prototype, "showPicker").mockImplementation(function (
      this: HTMLInputElement
    ) {
      opened.push(this)
    })
    const button = uploader.shadowRoot!.querySelector<HTMLElement>(".choose")!
    button.click()
    expect(opened).toEqual([native])
    showPicker.mockRestore()
    const leaked = heard(document.body, ["ui-changed"])
    pick(uploader, [fileOf("a.json")])
    await vi.waitFor(() => expect(uploader.files.map((file) => file.name)).toEqual(["a.json"]))
    // its file input's own event stays inside it
    expect(leaked).toEqual([])
    // emptied, so the same file can be picked again
    await vi.waitFor(() => expect(native.value).toBe(""))
  })

  test.each(APPEARANCES)("%s:  a folder uploader's dialog picks folders", async (appearance) => {
    const uploader = await uploaderWith(`appearance="${appearance}" folder extensions="json"`)
    const native = nativePicker(uploader)
    expect(native.webkitdirectory).toBe(true)
    expect(native.multiple).toBe(true)
    expect(native.accept).toBe("")
  })

  test.each(APPEARANCES)("%s:  a folder uploader takes folders, and turns a plain file away", async (appearance) => {
    const uploader = await uploaderWith(`appearance="${appearance}" folder multiple`)
    await (uploader as unknown as { component: UIUploader }).component.take(folderDrop())
    expect(uploader.files.map((file) => file.name)).toEqual(["top.json", "adc.json", "stray.json"])
    await ShadowTree.settle(uploader)
    if (appearance === "compact") {
      expect(uploader.shadowRoot!.querySelector('[part~="status"]')!.textContent).toContain("1 file not added")
    } else {
      expect(rowsOf(uploader)).toEqual([
        { name: "top.json", status: "Ready" },
        { name: "adc.json", status: "Ready" },
        { name: "stray.json", status: "Not a folder" }
      ])
    }
  })

  test("button:  a glimpse of its popup as an upload starts, then it shows on focus", async () => {
    const uploader = await uploaderWith('appearance="button" multiple')
    uploader.action = () => new Promise(() => {})
    pick(uploader, [fileOf("a.json")])
    const popup = await vi.waitFor(() => {
      const found = uploader.shadowRoot!.querySelector<HTMLElement>('[part~="popup"]')
      expect(found).not.toBeNull()
      return found!
    })
    await vi.waitFor(() => expect(popup.hidden).toBe(false))
    expect(popup.getAttribute("open-on")).toBe("hover")
    expect(popup.textContent).toContain("a.json")
    // its glimpse over:  focus on its button shows it again
    popup.hidden = true
    await ShadowTree.settle(uploader)
    const button = uploader.shadowRoot!.querySelector(".choose")!
    button.shadowRoot!.querySelector("button")!.focus()
    await vi.waitFor(() => expect(popup.hidden).toBe(false))
  })

  test("drop-zone:  the page, an #id, the section around it, an element;  a section's zone beats the page's", async () => {
    const area = Fixture.render(`<div>
      <section id="outer"><p id="spot">here</p>
        <ui-uploader id="near" drop-zone="section"></ui-uploader>
      </section>
      <ui-uploader id="far" drop-zone="page"></ui-uploader>
      <div id="elsewhere">there</div>
      <ui-uploader id="by-id" drop-zone="#elsewhere"></ui-uploader></div>`)
    const [near, far, byId] = ["near", "far", "by-id"].map((id) => area.querySelector<UploaderElement>(`#${id}`)!)
    for (const uploader of [near, far, byId]) await ShadowTree.settle(uploader!)
    drop(area.querySelector("#spot")!, [fileOf("a.json")])
    expect((await rows(near!, 1))[0]!.name).toBe("a.json")
    drop(area.querySelector("#elsewhere")!, [fileOf("b.json")])
    expect((await rows(byId!, 1))[0]!.name).toBe("b.json")
    drop(document.body, [fileOf("c.json")])
    expect((await rows(far!, 1))[0]!.name).toBe("c.json")

    const box = document.createElement("div")
    area.append(box)
    far!.dropZone = box
    await ShadowTree.settle(far!)
    drop(box, [fileOf("d.json")])
    await vi.waitFor(() => expect(far!.files.map((file) => file.name)).toContain("d.json"))
  })

  test("two uploaders with one zone:  the first takes the drops, the second warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const area = Fixture.render(`<div>
      <div id="zone"><p id="spot">here</p></div>
      <ui-uploader id="first" drop-zone="#zone"></ui-uploader>
      <ui-uploader id="second" drop-zone="#zone"></ui-uploader></div>`)
    const [first, second] = ["first", "second"].map((id) => area.querySelector<UploaderElement>(`#${id}`)!)
    await ShadowTree.settle(first!)
    await ShadowTree.settle(second!)
    drop(area.querySelector("#spot")!, [fileOf("a.json")])
    await rows(first!, 1)
    expect(second!.files).toEqual([])
    expect(warn.mock.calls.some((call) => String(call[0]).includes("share a drop zone"))).toBe(true)
    warn.mockRestore()
  })

  test("its slots and its words, the busy ones from attributes", async () => {
    const uploader = await uploaderWith(
      'multiple drop-message="Let go for {count}"',
      '<span slot="message">Bring in your netlists</span><button slot="button" id="mine">Pick</button>'
    )
    const message = uploader.querySelector('[slot="message"]')!
    expect(message.assignedSlot).not.toBeNull()
    const showPicker = vi.spyOn(HTMLInputElement.prototype, "showPicker").mockImplementation(() => {})
    uploader.querySelector<HTMLButtonElement>("#mine")!.click()
    expect(showPicker).toHaveBeenCalledOnce()
    showPicker.mockRestore()
    drop(uploader, [fileOf("a.json"), fileOf("b.json"), fileOf("c.json")], { dropIt: false })
    await ShadowTree.settle(uploader)
    expect(uploader.shadowRoot!.textContent).toContain("Let go for 3")
  })

  test.each(APPEARANCES)("%s, disabled:  greyed, and takes nothing", async (appearance) => {
    const uploader = await uploaderWith(`appearance="${appearance}" disabled`)
    drop(uploader, [fileOf("a.json")])
    pick(uploader, [fileOf("b.json")])
    await ShadowTree.settle(uploader)
    expect(uploader.files).toEqual([])
    const button = uploader.shadowRoot!.querySelector(".choose")!
    expect(drawnOpacity(button.shadowRoot!.querySelector('[part~="button"]')!)).toBeLessThan(0.7)
  })

  test("UIUploader.bytesFor() reads max-size", () => {
    expect(UIUploader.bytesFor("2 MB")).toBe(2 * 1024 * 1024)
    expect(UIUploader.bytesFor("500 KB")).toBe(500 * 1024)
    expect(UIUploader.bytesFor("1.5 GB")).toBe(Math.round(1.5 * 1024 ** 3))
    expect(UIUploader.bytesFor("2048")).toBe(2048)
    expect(UIUploader.bytesFor(undefined)).toBeUndefined()
  })
})

/**
 * A stand-in for `XMLHttpRequest`:  a file named `bad*` answers 500, any other `{ ok: true }` as JSON,
 * after one progress event;  each posted file's name goes in `posted`.
 */
function fakeServer(posted: string[], { delay = 0 } = {}) {
  return class FakeRequest extends EventTarget {
    static readonly DONE = 4
    readonly upload = new EventTarget()
    readyState = 0
    status = 0
    statusText = ""
    responseText = ""
    private contentType = ""
    open() {}
    abort() {}
    getResponseHeader() {
      return this.contentType
    }
    send(data: FormData) {
      const file = data.get("file") as File
      posted.push(file.name)
      setTimeout(() => {
        this.upload.dispatchEvent(Object.assign(new Event("progress"), { loaded: file.size / 2, total: file.size }))
        const bad = file.name.startsWith("bad")
        this.readyState = 4
        this.status = bad ? 500 : 200
        this.statusText = bad ? "Internal Server Error" : "OK"
        this.contentType = bad ? "text/plain" : "application/json"
        this.responseText = bad ? "boom" : '{"ok":true}'
        this.dispatchEvent(new Event("loadend"))
      }, delay)
    }
  }
}
