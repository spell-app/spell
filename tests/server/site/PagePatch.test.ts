import { parseHTML } from "linkedom"
import { describe, expect, it } from "vite-plus/test"

// The leaf:  the barrel defines the site header, an `HTMLElement`, which node has none of
import { PagePatch, type PatchStep, type PatchTree, TEXT_KIND } from "spell/server/site/PagePatch"

/**
 * `PagePatch.plan()`, the planner (epic `epic-engine` P40):  the list of steps for each kind of edit.
 * - in node, over linkedom's DOM (`PagePatch.domTree()`) and over a plain keyed tree (a notebook's chunks);
 *   the runner, on a real page:  `PagePatch.browser.test.ts`
 */

/** `html`'s `<main>`, parsed */
function mainOf(html: string): Element {
  const { document } = parseHTML(`<!doctype html><html><body><main>${html}</main></body></html>`)
  return document.querySelector("main")!
}

/** The steps from `before` to `after` (`<main>`'s inner markup), by the DOM patcher's rules (shared ones included). */
function steps(before: string, after: string, rules = {}): PatchStep<Node>[] {
  return new PagePatch(rules).plan(mainOf(before), mainOf(after))
}

/** `steps`, each without its node:  the op and addresses alone, and an inserted / replacing node's markup */
function brief(list: PatchStep<Node>[]): unknown[] {
  return list.map((step) =>
    "node" in step ? { ...step, node: (step.node as Element).outerHTML ?? step.node.textContent } : step
  )
}

describe("PagePatch.plan():  the DOM", () => {
  it("plans nothing for the same page, however its white space falls", () => {
    expect(steps("<p>One  two</p>\n<p>three</p>", "<p>One\n two</p><p>three</p>")).toEqual([])
  })

  it("edits a changed word in its text node, in place:  one step, addressed by place", () => {
    expect(
      steps("<section><p>a</p><p>Hello world</p></section>", "<section><p>a</p><p>Hello there</p></section>")
    ).toEqual([{ op: "text", target: "/section[1]/p[2]/text()[1]", text: "Hello there", from: "Hello world" }])
  })

  it("addresses from the nearest keyed ancestor (Owen, M1)", () => {
    expect(
      steps(
        `<section id="p-x"><div></div><section><p>1</p><p>2</p><p>3</p></section><section><p>1</p><p>2</p><p>old</p></section></section>`,
        `<section id="p-x"><div></div><section><p>1</p><p>2</p><p>3</p></section><section><p>1</p><p>2</p><p>new</p></section></section>`
      )
    ).toEqual([{ op: "text", target: "#p-x/section[2]/p[3]/text()[1]", text: "new", from: "old" }])
  })

  it("sets a changed attribute, and never a kept one (the reader's folds)", () => {
    expect(
      steps(
        `<ui-section id="s" label="A" open="false"><p>x</p></ui-section>`,
        `<ui-section id="s" label="B"><p>x</p></ui-section>`
      )
    ).toEqual([{ op: "attribute", target: "#s", name: "label", value: "B" }])
  })

  it("inserts a paragraph added at the top as ONE step:  the unchanged ones line up", () => {
    const list = steps("<p>one</p><p>two</p><p>three</p>", "<p>new</p><p>one</p><p>two</p><p>three</p>")
    expect(brief(list)).toEqual([{ op: "insert", parent: "/", index: 0, node: "<p>new</p>" }])
  })

  it("removes a paragraph taken out, and edits the one changed beside it", () => {
    expect(brief(steps("<p>one</p><p>two</p><p>three</p>", "<p>one</p><p>THREE</p>"))).toEqual([
      { op: "text", target: "/p[2]/text()[1]", text: "THREE", from: "two" },
      { op: "remove", target: "/p[3]" }
    ])
  })

  it("moves a keyed section that moved, wherever it went, and patches it there", () => {
    const list = steps(
      `<section id="a"><p id="k">keep me</p><p>x</p></section><section id="b"><p>y</p></section>`,
      `<section id="a"><p>x</p></section><section id="b"><p>y</p><p id="k">keep me, edited</p></section>`
    )
    expect(brief(list)).toEqual([
      { op: "text", target: "#k/text()[1]", text: "keep me, edited", from: "keep me" },
      { op: "move", target: "#k", parent: "#b", index: 1 }
    ])
  })

  it("reorders keyed siblings with a move, the rest staying put", () => {
    const list = steps(`<p id="a">a</p><p id="b">b</p><p id="c">c</p>`, `<p id="c">c</p><p id="a">a</p><p id="b">b</p>`)
    expect(list).toEqual([
      { op: "move", target: "#a", parent: "/", index: 1 },
      { op: "move", target: "#b", parent: "/", index: 2 }
    ])
  })

  it("swaps a node whose tag changed (another kind:  out, and the new one in), and replaces what the rules say", () => {
    expect(brief(steps("<p>a</p><pre><code>x = 1</code></pre>", "<div>a</div><pre><code>x = 2</code></pre>"))).toEqual([
      // a `<pre>` (its code coloured on the page) is replaced whole by the shared rules
      { op: "replace", target: "/pre[1]", node: "<pre><code>x = 2</code></pre>" },
      { op: "remove", target: "/p[1]" },
      { op: "insert", parent: "/", index: 0, node: "<div>a</div>" }
    ])
  })

  it("replaces an element a runtime says manages its children (`replacedWhole`)", () => {
    const rules = { replacedWhole: "ui-tabs" }
    expect(
      brief(steps(`<ui-tabs><ui-tab>a</ui-tab></ui-tabs>`, `<ui-tabs><ui-tab>b</ui-tab></ui-tabs>`, rules))
    ).toEqual([{ op: "replace", target: "/ui-tabs[1]", node: "<ui-tabs><ui-tab>b</ui-tab></ui-tabs>" }])
  })

  it("plans only a host's slotted children when its body is a file's (`slotsOnly`)", () => {
    const rules = { slotsOnly: (element: Element) => element.hasAttribute("source") }
    expect(
      steps(
        `<ui-section source="a.html"><span slot="label">Old</span><p>placeholder</p></ui-section>`,
        `<ui-section source="a.html"><span slot="label">New</span><p>another</p></ui-section>`,
        rules
      )
    ).toEqual([{ op: "text", target: "/ui-section[1]/span[1]/text()[1]", text: "New", from: "Old" }])
  })

  it("treats a key found twice as no key", () => {
    expect(steps(`<p id="d">one</p><p id="d">two</p>`, `<p id="d">one</p><p id="d">TWO</p>`)).toEqual([
      { op: "text", target: "/p[2]/text()[1]", text: "TWO", from: "two" }
    ])
  })

  it("never plans what the runtime added (`skip`)", () => {
    const rules = { skip: "[data-spell-added]" }
    expect(steps(`<p>a</p><div data-spell-added>x</div><p>b</p>`, `<p>a</p><p>B</p>`, rules)).toEqual([
      { op: "text", target: "/p[2]/text()[1]", text: "B", from: "b" }
    ])
  })
})

/** A notebook-ish chunk:  a path (its key), a kind, its text, its chunks. */
type Chunk = { path?: string; kind: string; text?: string; chunks?: Chunk[] }

/** Chunks as a `PatchTree`:  any keyed tree plans the same way. */
const CHUNKS: PatchTree<Chunk> = {
  key: (chunk) => chunk.path,
  kind: (chunk) => chunk.kind,
  attributes: () => [],
  text: (chunk) => chunk.text ?? "",
  children: (chunk) => chunk.chunks ?? []
}

describe("PagePatch.plan():  any keyed tree", () => {
  it("plans a notebook's chunks:  a text edited in place, a cell moved by its key", () => {
    const cell = (path: string, text: string): Chunk => ({ path, kind: "cell", chunks: [{ kind: TEXT_KIND, text }] })
    const before: Chunk = { kind: "notebook", chunks: [cell("a", "1 + 1"), cell("b", "say hi"), cell("c", "x")] }
    const after: Chunk = { kind: "notebook", chunks: [cell("b", "say hello"), cell("a", "1 + 1"), cell("c", "x")] }
    const list = PagePatch.plan(before, after, CHUNKS)
    expect(list).toEqual([
      { op: "text", target: "#b/text()[1]", text: "say hello", from: "say hi" },
      { op: "move", target: "#a", parent: "/", index: 1 }
    ])
  })
})
