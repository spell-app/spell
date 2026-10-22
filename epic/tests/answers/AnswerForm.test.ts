import { parseHTML } from "linkedom"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { AnswerForm } from "spell-epic/answers/AnswerForm"
import {
  ANSWER_RETRY_MS,
  DETAILS_SAVE_MS,
  type AnswerPart,
  type AskState,
  type DetailsDraft,
  type PageAnswer,
  type PartLabels,
  type SentAnswer
} from "spell-epic/answers/answers.types"

////////////////
// ## Fakes
////////////////

const PAGE = "/pages/details/pick.html"
const TOKEN = "token-1"

/**
 * The page server's details routes, as `fetch`:  the answer and draft it holds, every POST (answers and drafts
 * apart), and the next failure.
 */
class FakeServer {
  answer: SentAnswer | null = null
  draft: DetailsDraft | null = null
  posts: Record<string, unknown>[] = []
  drafts: Record<string, unknown>[] = []
  failure: { status: number; error: string } | undefined
  /** who waits for the answer (epic `epic-engine` r6);  `undefined`:  a server from before, which never says */
  listening: { since: string; seen: string } | null | undefined

  readonly fetch = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    if (url.startsWith("/api/docs/details/answer?")) return json({ answer: this.answer, listening: this.listening })
    if (url.startsWith("/api/docs/details/listening?")) return json({ listening: this.listening })
    if (url.startsWith("/api/docs/details/draft?")) return json({ draft: this.draft })
    const body = JSON.parse(init!.body as string) as Record<string, unknown>
    if (url === "/api/docs/details/draft") {
      this.drafts.push(body)
      if (this.failure) return json({ error: this.failure.error }, this.failure.status)
      this.draft = { ...(body as unknown as DetailsDraft), saved: "2026-10-14T05:00:00.000Z" }
      return json({ ok: true, draft: this.draft })
    }
    this.posts.push(body)
    if (this.failure) return json({ error: this.failure.error }, this.failure.status)
    this.draft = null
    this.answer = {
      ...(body as unknown as PageAnswer),
      page: body.page as string,
      answered: "2026-10-14T04:00:00.000Z",
      changes: this.answer ? this.answer.changes + 1 : 0
    }
    return json({ ok: true, answer: this.answer, listening: this.listening })
  })
}

/** `body` as a JSON response. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

/** A page of elements to hang parts on, in order:  `#a`, `#b`, `#c`. */
const { document } = parseHTML('<main><div id="a"></div><div id="b"></div><div id="c"></div></main>')

/** The browser's `localStorage`, in a map. */
class FakeStorage {
  readonly items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
  removeItem(key: string) {
    this.items.delete(key)
  }
}

/** A question:  its picks under `key`, of options `letters`. */
class FakeAsk implements AnswerPart {
  picks: string[] = []
  constructor(
    readonly domElement: Element,
    readonly key: string,
    readonly letters = ["A", "B", "C"]
  ) {}
  labelsInto(labels: PartLabels) {
    labels[this.key] = `${this.key.toUpperCase()} · Which?`
    for (const letter of this.letters) labels[`${this.key}-${letter}`] = `${letter} · Option ${letter}`
  }
  get askState(): AskState {
    return this.picks.length ? "done" : "attention"
  }
  gatherInto(page: PageAnswer) {
    ;(page.answers[this.key] ??= { picked: [] }).picked = [...this.picks]
  }
  showAnswer(answer: SentAnswer) {
    this.picks = [...(answer.answers[this.key]?.picked ?? [])]
  }
}

/** A comment box for `id`. */
class FakeBox implements AnswerPart {
  text = ""
  constructor(
    readonly domElement: Element,
    readonly id: string
  ) {}
  labelsInto(labels: PartLabels) {
    labels[this.id] = `Section ${this.id}`
  }
  gatherInto(page: PageAnswer) {
    if (this.text.trim()) page.comments[this.id] = this.text.trim()
  }
  showAnswer(answer: SentAnswer) {
    this.text = answer.comments?.[this.id] ?? ""
  }
}

/**
 * A form on `server`, served with a token (`token: false`:  from `file://`);  `storage`:  the browser's;  `page`:
 * its path.
 */
function formOn(
  server: FakeServer,
  { token = true, storage = undefined as FakeStorage | undefined, page = PAGE } = {}
) {
  return new AnswerForm({
    page,
    server: token ? { token: TOKEN } : undefined,
    protocol: token ? "http:" : "file:",
    fetch: server.fetch as unknown as typeof fetch,
    storage: storage as unknown as Storage
  })
}

/** A draft of `PAGE` saved at `saved`, holding `answer`, with the labels of `q1`, `q2` and section `context`. */
function draftOf(saved: string, answer: Partial<PageAnswer>): DetailsDraft {
  return {
    page: PAGE,
    saved,
    answers: {},
    comments: {},
    notes: "",
    ...answer,
    labels: {
      q1: "Q1 · Which?",
      "q1-A": "A · Option A",
      "q1-B": "B · Option B",
      "q1-C": "C · Option C",
      q2: "Q2 · Which?",
      "q2-A": "A · Option A",
      context: "Section context",
      notes: "Notes"
    }
  }
}

/** An answer to `PAGE` sent at `answered`, holding `answer`. */
function sentOf(answered: string, answer: Partial<PageAnswer>): SentAnswer {
  return { page: PAGE, answered, changes: 0, answers: {}, comments: {}, notes: "", ...answer }
}

/** The page's elements by id. */
function at(id: string): Element {
  return document.getElementById(id)!
}

////////////////
// ## Tests
////////////////

describe("AnswerForm", () => {
  test("gathers the page in page order, its keys sorted, whatever order its parts came in", () => {
    const form = formOn(new FakeServer())
    const box = new FakeBox(at("c"), "context")
    const second = new FakeAsk(at("b"), "q2")
    const first = new FakeAsk(at("a"), "q1")
    for (const part of [box, second, first]) form.add(part)
    first.picks = ["B"]
    box.text = " clear "
    expect(form.gather()).toEqual({
      answers: { q1: { picked: ["B"] }, q2: { picked: [] } },
      comments: { context: "clear" },
      notes: ""
    })
    expect(form.asks).toEqual([first, second])
    expect(form.decided).toEqual({ decided: 1, total: 2 })
  })

  test("where it stands:  nothing (grey), something not sent (blue, dashed), sent (green), changed since (blue)", async () => {
    const server = new FakeServer()
    const form = formOn(server)
    const ask = new FakeAsk(at("a"), "q1")
    form.add(ask)
    expect([form.fill, form.stateLine]).toEqual(["rest", { text: "Not sent", color: "grey" }])
    ask.picks = ["A"]
    expect([form.fill, form.stateLine]).toEqual(["pending", { text: "Not sent", color: "blue" }])
    await form.send()
    expect(server.posts).toEqual([{ page: PAGE, answers: { q1: { picked: ["A"] } }, comments: {}, notes: "" }])
    expect(form.fill).toBe("sent")
    expect(form.stateLine.text).toMatch(/^Sent \d+\/\d+\/26 \d\d:\d\d · 1 of 1 decided$/)
    ask.picks = ["B"]
    expect([form.fill, form.stateLine]).toEqual(["pending", { text: "Changes not sent", color: "blue" }])
  })

  // epic `epic-engine` r6:  a page of comment boxes alone, and who hears its Send
  test("comments alone count:  pending, sent;  no question to count", async () => {
    const form = formOn(new FakeServer())
    const box = new FakeBox(at("a"), "l-main")
    form.add(box)
    box.text = "Make the top project just spell"
    expect([form.isEmpty, form.fill, form.stateLine]).toEqual([false, "pending", { text: "Not sent", color: "blue" }])
    await form.send()
    expect(form.fill).toBe("sent")
    expect(form.stateLine.text).toMatch(/^Sent \d+\/\d+\/26 \d\d:\d\d$/)
  })

  test("who hears it:  nothing said before the server says;  nobody, then a session's `ask wait`", async () => {
    const server = new FakeServer()
    const form = formOn(server, { page: "/epics/repo-split/details/layout.html" })
    await form.load()
    expect(form.listenLine.text).toBe("")
    server.listening = null
    await form.refreshListening()
    expect(form.listenLine).toMatchObject({ text: "nobody is waiting yet", isListening: false })
    server.listening = { since: "2026-10-20T02:12:00.000Z", seen: "2026-10-20T02:14:00.000Z" }
    await form.refreshListening()
    expect(form.listenLine).toMatchObject({ text: "repo-split is listening", isListening: true })
    expect(formOn(server).listenLine.text).toBe("")
  })

  test("Send with nobody waiting:  saved, and it says so;  a session that starts waiting clears that", async () => {
    const server = new FakeServer()
    server.listening = null
    const form = formOn(server)
    const box = new FakeBox(at("a"), "notes")
    form.add(box)
    box.text = "Is this worth it?"
    await form.send()
    expect([form.fill, form.error, form.notice]).toEqual([
      "sent",
      "",
      "Saved:  nobody is waiting yet;  Claude reads it when it next looks."
    ])
    server.listening = { since: "2026-10-20T02:20:00.000Z", seen: "2026-10-20T02:20:00.000Z" }
    await form.refreshListening()
    expect([form.notice, form.listenLine.text]).toEqual(["", "Claude is listening"])
    await form.send()
    expect(form.notice).toBe("")
  })

  test("refuses to send an empty page never sent, or a page off the page server;  a route's error said, editable still", async () => {
    const server = new FakeServer()
    const form = formOn(server)
    form.add(new FakeAsk(at("a"), "q1"))
    await form.send()
    expect(form.error).toBe("Pick an option, or write something (Other, a comment, a note) first.")
    const offline = formOn(server, { token: false })
    const ask = new FakeAsk(at("a"), "q1")
    offline.add(ask)
    ask.picks = ["A"]
    await offline.send()
    expect(offline.error).toMatch(/isn't on the page server/)
    server.failure = { status: 403, error: "not a details page:  /x" }
    ;(form.asks[0] as FakeAsk).picks = ["A"]
    await form.send()
    expect(form.error).toBe("Not a details page:  /x.  Send again, or answer in chat instead.")
    expect(form.isSending).toBe(false)
    expect(server.posts).toHaveLength(1)
  })

  test("reads back the answer sent, into every part:  one that comes later gets it too, and the page counts as sent", async () => {
    const server = new FakeServer()
    server.answer = {
      page: PAGE,
      answered: "2026-10-13T20:00:00.000Z",
      changes: 0,
      answers: { q1: { picked: ["C"] }, q2: { picked: [] } },
      comments: { context: "ok" },
      notes: ""
    }
    const form = formOn(server)
    const ask = new FakeAsk(at("a"), "q1")
    form.add(ask)
    const heard = vi.fn()
    form.subscribe(heard)
    await form.load()
    expect(ask.picks).toEqual(["C"])
    const late = new FakeBox(at("c"), "context")
    form.add(late)
    expect(late.text).toBe("ok")
    expect(form.fill).toBe("sent")
    expect(heard).toHaveBeenCalled()
    // once per form:  the answer, and the draft
    await form.load()
    expect(server.fetch).toHaveBeenCalledTimes(2)
  })
})

describe("AnswerForm's draft (P18)", () => {
  afterEach(() => vi.useRealTimers())

  test("keeps what's typed:  the browser's copy at once, the page server's a moment later;  never wakes anyone", async () => {
    vi.useFakeTimers()
    const server = new FakeServer()
    const storage = new FakeStorage()
    const form = formOn(server, { storage })
    const ask = new FakeAsk(at("a"), "q1")
    const box = new FakeBox(at("c"), "context")
    form.add(ask)
    form.add(box)
    ask.picks = ["B"]
    box.text = "why not"
    form.edited()
    const local = JSON.parse(storage.getItem(`spell-details-draft:${PAGE}`)!) as DetailsDraft
    expect([local.answers, local.comments, local.labels.q1]).toEqual([
      { q1: { picked: ["B"] } },
      { context: "why not" },
      "Q1 · Which?"
    ])
    expect(form.draftText).toBe("draft not saved yet")
    expect(server.drafts).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2000)
    expect(server.drafts).toEqual([
      {
        page: PAGE,
        answers: { q1: { picked: ["B"] } },
        comments: { context: "why not" },
        notes: "",
        labels: expect.objectContaining({ q1: "Q1 · Which?", context: "Section context" }),
        kept: []
      }
    ])
    expect(form.draftText).toMatch(/^draft saved \d\d:\d\d$/)
    // a draft is not an answer
    expect(server.posts).toHaveLength(0)
    expect(form.fill).toBe("pending")
  })

  test("keeps nothing off a details page (an element's docs page);  from `file://`, the browser's copy only", async () => {
    vi.useFakeTimers()
    const storage = new FakeStorage()
    const docs = formOn(new FakeServer(), { storage, page: "/epic-ui/elements/epic-ask.html" })
    docs.add(new FakeAsk(at("a"), "q1"))
    docs.edited()
    expect([docs.typed, storage.items.size]).toEqual([undefined, 0])
    const offline = formOn(new FakeServer(), { storage, token: false })
    const ask = new FakeAsk(at("a"), "q1")
    offline.add(ask)
    ask.picks = ["A"]
    offline.edited()
    await vi.advanceTimersByTimeAsync(2000)
    expect(storage.items.size).toBe(1)
    expect([offline.isDraftError, offline.draftText]).toEqual([
      true,
      "draft kept in this browser only:  this page isn't on the page server"
    ])
  })

  test("on load, a draft newer than the answer goes back over it, by id:  Changes not sent;  an older one doesn't", async () => {
    const server = new FakeServer()
    server.answer = sentOf("2026-10-13T20:00:00.000Z", {
      answers: { q1: { picked: ["A"] }, q2: { picked: ["A"] } },
      comments: { context: "sent" }
    })
    server.draft = draftOf("2026-10-13T21:00:00.000Z", {
      answers: { q1: { picked: ["C"] }, q2: { picked: ["A"] } },
      notes: "typed, not sent"
    })
    const form = formOn(server)
    const [q1, q2, box] = [new FakeAsk(at("a"), "q1"), new FakeAsk(at("b"), "q2"), new FakeBox(at("c"), "context")]
    for (const part of [q1, q2, box]) form.add(part)
    await form.load()
    // the draft knew the context box, and had nothing in it:  cleared since the send
    expect([q1.picks, q2.picks, box.text]).toEqual([["C"], ["A"], ""])
    expect(form.gather().notes).toBe("")
    expect(form.typed?.notes).toBe("typed, not sent")
    expect([form.fill, form.stateLine.text]).toEqual(["pending", "Changes not sent"])
    expect(form.draftText).toMatch(/^draft from \d\d:\d\d put back$/)

    const older = new FakeServer()
    older.answer = server.answer
    older.draft = { ...server.draft, saved: "2026-10-13T19:00:00.000Z" }
    const again = formOn(older)
    const ask = new FakeAsk(at("a"), "q1")
    again.add(ask)
    await again.load()
    expect([ask.picks, again.fill, again.typed]).toEqual([["A"], "sent", undefined])
  })

  test("the browser's copy when the page server has none:  the newest wins", async () => {
    const storage = new FakeStorage()
    const server = new FakeServer()
    storage.setItem(
      `spell-details-draft:${PAGE}`,
      JSON.stringify(draftOf("2026-10-13T22:00:00.000Z", { answers: { q1: { picked: ["B"] } } }))
    )
    const form = formOn(server, { storage })
    const ask = new FakeAsk(at("a"), "q1")
    form.add(ask)
    await form.load()
    expect([ask.picks, form.fill]).toEqual([["B"], "pending"])
  })

  test("a rewrite patched in place:  a question that comes back shows what was typed;  one gone is KEPT, and sent", async () => {
    vi.useFakeTimers()
    const server = new FakeServer()
    const form = formOn(server)
    const q1 = new FakeAsk(at("a"), "q1")
    const q2 = new FakeAsk(at("b"), "q2")
    const box = new FakeBox(at("c"), "context")
    const leaves = [q1, q2, box].map((part) => form.add(part))
    q1.picks = ["B"]
    form.edited()
    q2.picks = ["A", "C"]
    form.edited()
    box.text = "about the context"
    form.edited()
    // the rewrite:  q1 replaced (its text changed), q2 and the context section gone
    for (const leave of leaves) leave()
    const newQ1 = new FakeAsk(at("a"), "q1")
    form.add(newQ1)
    expect(newQ1.picks).toEqual(["B"])
    await vi.advanceTimersByTimeAsync(250)
    expect(form.kept).toEqual([
      { id: "q2", label: "Q2 · Which?", text: "picked A · Option A, C · Option C" },
      { id: "context", label: "Section context", text: "about the context" }
    ])
    expect(form.isPending).toBe(true)
    await form.send()
    expect(server.posts[0]).toEqual({
      page: PAGE,
      answers: { q1: { picked: ["B"] } },
      comments: {},
      notes: "",
      kept: form.kept
    })
    // dropped:  no longer sent
    form.dropKept(form.kept[0]!)
    expect(form.gather().kept).toEqual([{ id: "context", label: "Section context", text: "about the context" }])
  })

  // I9:  a part slower than the settle (`DETAILS_SETTLE_MS`) showed its text twice:  back in it, and kept
  test("a part that comes back after the settle takes its text back OUT of the kept box:  never shown twice", async () => {
    vi.useFakeTimers()
    const server = new FakeServer()
    const form = formOn(server)
    const q1 = new FakeAsk(at("a"), "q1")
    const q2 = new FakeAsk(at("b"), "q2")
    const box = new FakeBox(at("c"), "context")
    const leaves = [q1, q2, box].map((part) => form.add(part))
    q1.picks = ["B"]
    form.edited()
    q2.picks = ["A"]
    form.edited()
    box.text = "about the context"
    form.edited()
    for (const leave of leaves) leave()
    await vi.advanceTimersByTimeAsync(250)
    expect(form.kept.map((each) => each.id)).toEqual(["q1", "q2", "context"])
    // the rewrite's parts, slower than the settle:  q1 and the context section come back, q2 doesn't
    const lateQ1 = new FakeAsk(at("a"), "q1")
    form.add(lateQ1)
    const lateBox = new FakeBox(at("c"), "context")
    form.add(lateBox)
    expect([lateQ1.picks, lateBox.text]).toEqual([["B"], "about the context"])
    expect(form.kept).toEqual([{ id: "q2", label: "Q2 · Which?", text: "picked A · Option A" }])
    expect(form.gather()).toEqual({
      answers: { q1: { picked: ["B"] } },
      comments: { context: "about the context" },
      notes: "",
      kept: [{ id: "q2", label: "Q2 · Which?", text: "picked A · Option A" }]
    })
    // the draft follows:  the text in its part, not kept
    await vi.advanceTimersByTimeAsync(2000)
    expect(server.drafts.at(-1)).toMatchObject({
      answers: { q1: { picked: ["B"] } },
      comments: { context: "about the context" },
      kept: [{ id: "q2", label: "Q2 · Which?", text: "picked A · Option A" }]
    })
    // a later settle keeps it where it is
    form.add(new FakeAsk(at("b"), "q3"))()
    await vi.advanceTimersByTimeAsync(250)
    expect([form.kept.map((each) => each.id), lateQ1.picks]).toEqual([["q2"], ["B"]])
  })

  test("a late option takes its pick back;  kept text the part never held (other words, a draft's) stays kept", async () => {
    vi.useFakeTimers()
    const form = formOn(new FakeServer())
    const ask = new FakeAsk(at("a"), "q1")
    const leave = form.add(ask)
    ask.picks = ["A", "C"]
    form.edited()
    leave()
    const without = new FakeAsk(at("a"), "q1", ["A", "B"])
    const leaveWithout = form.add(without)
    await vi.advanceTimersByTimeAsync(250)
    expect(form.kept.map((each) => each.id)).toEqual(["q1-C"])
    // option C comes back, later
    leaveWithout()
    const back = new FakeAsk(at("a"), "q1")
    form.add(back)
    expect([back.picks, form.kept]).toEqual([["A", "C"], []])

    // kept text from a draft put back (no settle of this page's own):  stays kept, the part shows what was sent
    const server = new FakeServer()
    server.draft = draftOf("2026-10-14T05:00:00.000Z", {
      kept: [{ id: "context", label: "Section context", text: "from before" }]
    })
    const reloaded = formOn(server)
    await reloaded.load()
    const box = new FakeBox(at("c"), "context")
    reloaded.add(box)
    expect([box.text, reloaded.kept.length]).toEqual(["", 1])
  })

  test("a pick of an option gone from a question still there is kept under the option, and un-picked", async () => {
    vi.useFakeTimers()
    const form = formOn(new FakeServer())
    const ask = new FakeAsk(at("a"), "q1")
    const leave = form.add(ask)
    ask.picks = ["A", "C"]
    form.edited()
    leave()
    const rewritten = new FakeAsk(at("a"), "q1", ["A", "B"])
    form.add(rewritten)
    await vi.advanceTimersByTimeAsync(250)
    expect(form.kept).toEqual([
      { id: "q1-C", label: "Q1 · Which?, C · Option C", text: "picked it, and it's no longer an option" }
    ])
    expect(rewritten.picks).toEqual(["A"])
  })

  test("Send:  the draft is done with, the browser's copy goes", async () => {
    vi.useFakeTimers()
    const server = new FakeServer()
    const storage = new FakeStorage()
    const form = formOn(server, { storage })
    const ask = new FakeAsk(at("a"), "q1")
    form.add(ask)
    ask.picks = ["A"]
    form.edited()
    expect(storage.items.size).toBe(1)
    await form.send()
    expect([storage.items.size, form.typed, form.draftText, form.fill]).toEqual([0, undefined, "", "sent"])
    await vi.advanceTimersByTimeAsync(2000)
    expect(server.drafts).toHaveLength(0)
  })

  test("a draft the page server refuses stays in the browser, said in red;  it tries again by itself until one goes through", async () => {
    vi.useFakeTimers()
    const server = new FakeServer()
    server.failure = { status: 404, error: "no such route" }
    const storage = new FakeStorage()
    const form = formOn(server, { storage })
    const ask = new FakeAsk(at("a"), "q1")
    form.add(ask)
    ask.picks = ["A"]
    form.edited()
    await vi.advanceTimersByTimeAsync(DETAILS_SAVE_MS)
    expect([form.isDraftError, form.draftText]).toEqual([
      true,
      "draft kept in this browser only:  no such route;  trying again every 3s"
    ])
    expect(storage.items.size).toBe(1)
    // tries again, with no change:  still failing, still said
    await vi.advanceTimersByTimeAsync(ANSWER_RETRY_MS)
    expect([server.drafts.length, form.isDraftError]).toEqual([2, true])
    // the server takes it:  saved, with no keystroke
    server.failure = undefined
    await vi.advanceTimersByTimeAsync(ANSWER_RETRY_MS)
    expect([server.drafts.length, form.isDraftError]).toEqual([3, false])
    expect(form.draftText).toMatch(/^draft saved \d\d:\d\d$/)
    // nothing more to save:  no more tries
    await vi.advanceTimersByTimeAsync(ANSWER_RETRY_MS * 3)
    expect(server.drafts).toHaveLength(3)
  })

  test("saves one at a time:  a change while a save is on its way goes in the next save, never beside it", async () => {
    vi.useFakeTimers()
    const server = new FakeServer()
    let release!: () => void
    const slow = server.fetch.getMockImplementation()!
    let inFlight = 0
    let most = 0
    server.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method !== "POST") return slow(url, init)
      most = Math.max(most, ++inFlight)
      if (server.drafts.length === 0) await new Promise<void>((done) => (release = done))
      const reply = await slow(url, init)
      inFlight--
      return reply
    })
    const form = formOn(server)
    const ask = new FakeAsk(at("a"), "q1")
    form.add(ask)
    ask.picks = ["A"]
    form.edited()
    await vi.advanceTimersByTimeAsync(DETAILS_SAVE_MS)
    ask.picks = ["B"]
    form.edited()
    await vi.advanceTimersByTimeAsync(DETAILS_SAVE_MS)
    release()
    await vi.advanceTimersByTimeAsync(DETAILS_SAVE_MS)
    expect(most).toBe(1)
    expect(server.drafts.map((draft) => (draft.answers as PageAnswer["answers"]).q1!.picked)).toEqual([["A"], ["B"]])
  })
})
