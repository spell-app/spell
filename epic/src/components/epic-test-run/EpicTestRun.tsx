import { For, Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { SHOT_MAX_BYTES, type ReviewClient, type TestResult, type TestsEntry } from "spell-epic/review"
// its view of the review inbox:  the file, not `epic-review`'s barrel
import { ReviewState } from "spell-epic/components/epic-review/ReviewState"
import { EpicPage } from "spell-epic/components/epic-page/EpicPage"

import { epicTestRunVocabulary } from "./EpicTestRun.en"
import { TestRun } from "./TestRun"
import { ALL_QUERY, ANSWER_LOOKS, TEST_DONE, TEST_QUERY, type AnswerLook, type TestFields } from "./EpicTestRun.types"

import runCSS from "./EpicTestRun.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicTestRun`
 * The component behind `<epic-test-run>`:  a TEST RUN (epic `epic-engine` P4;  Owen, 2026-10-19:  "a workflow
 * which will step me through what to do in each without depending on chat").
 * - Its tests:  the open tests of the `<epic-page>` around it (its shadow host's, or its own ancestor in a doc), in
 *   page order, the deferred ones (an earlier run's Not now) last (`TestRun.openIds()`)
 *   - kept in that order for the visit (`order`):  a test Claude closes meanwhile keeps its place
 * - ONE card at a time, from the item's light DOM (`TestRun.fieldsOf()`, copies:  the doc is never touched):
 *   - its title and id;  a test a run failed before says so, a deferred one since when
 *   - Step, with its action links as buttons;  Should;  Example, its screenshots zoomed on a click;  If not
 *   - an older test, prose only:  the prose is its Step
 *   - its part file is loaded for it, and the next one's ahead (`load()`)
 * - The four ANSWERS, one button group:  Passed (green), Failed (red), Skip (grey), Not now (yellow)
 *   - each a review mark, `{ action: "test", result, note?, shot? }`, through the page's one `ReviewClient`
 *   - the fill rule:  grey outline at rest, dashed in its colour once chosen, outlined once sent
 *   - Passed, Skip and Not now move on to the next test;  Failed opens the failure's screenshot area:  pasted (⌘V),
 *     dropped or chosen (its picker:  a file dragged into VS Code's side bar never reaches the page), saved through
 *     `POST shot` and shown as a thumbnail
 * - A COMMENT on every card, under the answers (Owen, 2026-10-19:  "e.g. it did part of what you asked, I want to
 *   explain how"):  an `<epic-text-box>`, kept as he types -- in the test's answer once it has one (its `note`), else
 *   as the inbox's draft for it -- so it survives a reload, goes with whichever answer he picks, before or after
 *   typing, and stays when he changes the answer
 *   - an answered test shows its answer, and takes another
 * - "4 of 9" and a thin bar of how many are answered;  Back and Next;  the keys P / F / S / N, ← →, Esc to leave
 *   (only drawn by the page:  an example written in a doc takes no keys)
 * - LEAVING SENDS (I52;  Owen, 2026-10-19:  "I pressed 'Done Testing' ... and you later said 'no test results have
 *   come in'"):  Done testing, Esc and the summary's Next epic hand the run's unsent answers to Claude (the page's
 *   Send), and the notice line says so ("3 results sent to Claude");  nothing answered:  it just leaves
 *   - the send fails (the page server gone, `file://`):  the notice says so, and they wait, Send blue
 *   - not per answer:  each send wakes a waiting session (`handedOver`), so a run of 17 would wake it 17 times
 * - Its place is the address's `#v3` (replaced, never pushed):  a reload resumes there;  without one, at the first
 *   test not answered
 * - Past the last, the SUMMARY:  the counts, Send results (the page's Send), and with `all` (`epic test --all`) the
 *   next epic with open tests (`GET /api/epics/tests`)
 * - Not reviewed (`file://`, no token):  the answers are disabled, and say why
 * - SIDE EFFECT:  while connected, listens for keys and pastes on the document, and rewrites the address's hash
 ****************/
export class EpicTestRun extends E.UIComponent<typeof epicTestRunVocabulary> {
  @E.proto static vocabulary = epicTestRunVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-test-run": runCSS },
    // a container:  a click on a card's text must not jump to its first button
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** The page's review inbox, as the run reads it:  the page's, never an element's. */
  readonly review = new ReviewState(() => undefined)

  /** The run's tests as it started, in its order:  kept for the visit. */
  @E.state accessor order: readonly string[] = []

  /** Where the run is:  a test's id, or `SUMMARY`;  `""` before it starts. */
  @E.state accessor at = ""

  /** The screenshot zoomed (its address), while the zoom shows. */
  @E.state accessor zoomed: string | undefined = undefined

  /** Screenshots pasted on this visit, test id -> its data URL:  shown at once, while saving and after. */
  @E.state accessor pasted: Readonly<Record<string, string>> = {}

  /**
   * Screenshots saved for tests with no answer yet, test id -> its path (`POST shot`'s):  the answer chosen next
   * carries it.  This visit's only:  a reload before answering drops it (the file stays beside the page).
   */
  heldShots: Readonly<Record<string, string>> = {}

  /** The test whose screenshot is on its way to the page server;  `""` for none. */
  @E.state accessor savingShot = ""

  /** The next epic with open tests, for a run across every epic (`all`);  none until asked, or none left. */
  @E.state accessor nextEpic: TestsEntry | undefined = undefined

  /** What's typed in each test's comment box, not saved yet:  test id -> text. */
  private readonly typed = new Map<string, string>()

  /** The note's save, waiting for the typing to stop. */
  private noteTimer?: E.CancelablePromise<unknown>

  /** The move after an answer, waiting a moment so the press shows. */
  private moveTimer?: E.CancelablePromise<unknown>

  /** The current test's comment box, as drawn. */
  private noteBox?: HTMLElement & { value: string }

  /** The answers and comments on their way to the inbox:  leaving waits for them before it sends. */
  private readonly saving = new Set<Promise<unknown>>()

  ////////////////
  // ## Derived state
  ////////////////

  /** The `<epic-page>` around it:  its shadow host's, or (written in a doc) its own ancestor. */
  get page(): Element | null {
    if (!this.isConnected) return null
    const root = this.domElement.getRootNode()
    return this.domElement.closest(PAGE) ?? (root instanceof ShadowRoot ? root.host.closest(PAGE) : null)
  }

  /** The page's layout counter:  bumped as its items change, or a part arrives (`EpicPage`). */
  get layout(): number {
    const page = this.page
    return page ? EpicPage.signalsOf(page).layout.get() : 0
  }

  /** The run's tests, by id, in its order:  as it started (`order`), then any opened since;  gone ones left out. */
  readonly tests = createMemo((): string[] => {
    void this.layout
    const page = this.page
    if (!page || isServer) return []
    const kept = this.order.filter((id) => TestRun.itemOf(page, id))
    return [...kept, ...TestRun.openIds(page).filter((id) => !kept.includes(id))]
  })

  /** The current test's item;  none on the summary. */
  readonly item = createMemo((): Element | undefined => {
    void this.layout
    const page = this.page
    return page && this.at && this.at !== SUMMARY ? TestRun.itemOf(page, this.at) : undefined
  })

  /** The current test's fields, copied from its item again as it changes (a part arriving, a live edit). */
  readonly fields = createMemo((): TestFields | undefined => {
    void this.layout
    const item = this.item()
    return item ? TestRun.fieldsOf(item) : undefined
  })

  /** How many tests have each answer, and how many none (`open`). */
  readonly counts = createMemo((): Record<TestResult | "open", number> => {
    const counts = { passed: 0, failed: 0, skip: 0, notnow: 0, open: 0 }
    for (const id of this.tests()) counts[this.answerOf(id)?.result ?? "open"]++
    return counts
  })

  /**
   * The tests Owen commented on, in the run's order:  each one's id, answer (none yet:  `undefined`) and comment
   * (its answer's, else its draft).
   */
  readonly commented = createMemo((): { id: string; result?: TestResult; note: string }[] => {
    void this.review.reviewing()
    const client = this.review.client
    return this.tests().flatMap((id) => {
      const answer = client?.testAnswerOf(id)
      const note = (answer?.note ?? client?.draftOf(id)?.note ?? "").trim()
      return note ? [{ id, result: answer?.result, note }] : []
    })
  })

  /** Every answer of the run has gone with a Send (none:  false). */
  readonly allSent = createMemo((): boolean => {
    void this.review.reviewing()
    const client = this.review.client
    const marks = this.tests().flatMap((id) => client?.markOf(id) ?? [])
    return !!client && marks.length > 0 && marks.every((mark) => client.isSent(mark))
  })

  /** The summary card shows. */
  @E.cssState("summary")
  get isSummary(): boolean {
    return this.at === SUMMARY
  }

  ////////////////
  // ## Start
  ////////////////

  /**
   * While connected:  the run starts (its tests, its place), follows the inbox, and listens for keys and pastes;
   * returns the undo.
   * - its place:  the address's `#v3` when it's one of its tests;  else, once the inbox is read, the first test not
   *   answered (none:  the summary)
   */
  @E.whileConnected
  protected startRun() {
    const page = this.page
    if (page) this.order = TestRun.openIds(page)
    const hashed = decodeURIComponent(location.hash.slice(1)).toLowerCase()
    this.at = this.order.includes(hashed) ? hashed : (this.order[0] ?? SUMMARY)
    const leave = this.review.connect()
    if (!this.order.includes(hashed))
      void this.review.client
        ?.start()
        .then(() => (this.at = this.firstOpen()))
        .catch((error: unknown) => console.error("epic-test-run:  couldn't read the inbox", error))
    const listeners = new AbortController()
    // its keys are the page's while it's the page's run, drawn over its blocks;  an example in a doc leaves them be
    if (this.domElement.getRootNode() instanceof ShadowRoot)
      document.addEventListener("keydown", this.onKey, { signal: listeners.signal })
    document.addEventListener("paste", this.onPaste, { signal: listeners.signal })
    // the docs runtime's scroll-follow writes the section being read into the address:  none shows in a run
    addEventListener(PLACE_EVENT, this.keepPlace, { signal: listeners.signal })
    return () => {
      listeners.abort()
      this.flushNote()
      leave()
    }
  }

  /** Ask for the next epic with open tests, for a run across every epic (`all`). */
  @E.onChange("all", "isConnected")
  protected onAll(all: boolean | undefined, connected: boolean) {
    if (all && connected) void this.findNextEpic()
  }

  /** Where the run is:  the address says it (`#v3`, replaced), and the test's part loads, the next one's too. */
  @E.onChange("at")
  protected onMoved(at: string) {
    if (!at || isServer) return
    this.keepPlace()
    const page = this.page
    const tests = this.tests()
    const next = tests[tests.indexOf(at) + 1]
    for (const id of [at, next])
      if (page && id) void (TestRun.itemOf(page, id) as Loadable | undefined)?.load?.().catch(() => undefined)
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div
        class={this.rootClass}
        part={this.partForName("base")}
        role="region"
        aria-label={this.translationForKey("run")}
        title=""
      >
        {this.head()}
        <Show when={this.tests().length} fallback={<p class="card empty">{this.translationForKey("noTests")}</p>}>
          <Show
            when={this.isSummary}
            fallback={
              <Show when={this.at} keyed>
                {(id) => this.card(id)}
              </Show>
            }
          >
            {this.summary()}
          </Show>
          {this.moves()}
        </Show>
        <ui-modal class="zoom" basic="" visible={this.zoomed ? "" : undefined}>
          <Show when={this.zoomed}>{(src) => <img class="zoomed" src={src()} alt="" />}</Show>
        </ui-modal>
      </div>
    )
  }

  /**
   * The head:  "Testing", "4 of 9", Done testing;  then the bar of where the run is, as the words say (Owen,
   * 2026-10-22:  "We're on 3 of 6, but the bar is only 20% full?");  how many are answered, its tooltip.
   */
  private head(): JSX.Element {
    const total = () => this.tests().length
    const answered = () => total() - this.counts().open
    const at = () => (this.isSummary ? total() : this.tests().indexOf(this.at) + 1)
    return (
      // the band at the top:  full width, sticky under the page's header (the run's modal shape)
      <div class="top">
        <div class="head" part={this.partForName("head")}>
          <span class="title">{this.translationForKey("testing")}</span>
          <span class="where" aria-live="polite">
            {this.translationForKey("of", { at: at(), total: total() })}
          </span>
          <ui-button
            class="leave"
            basic=""
            size="small"
            title={this.translationForKey("doneTip")}
            onClick={() => this.leave()}
          >
            {this.translationForKey("done")}
          </ui-button>
        </div>
        <ui-progress
          class="bar"
          part={this.partForName("progress")}
          size="tiny"
          color="green"
          value={at()}
          total={total() || 1}
          aria-label={this.translationForKey("answered", { count: answered(), total: total() })}
          title={this.translationForKey("answered", { count: answered(), total: total() })}
        />
      </div>
    )
  }

  /** Test `id`'s card:  its title, fields, the answers, the comment, the screenshot. */
  private card(id: string): JSX.Element {
    const item = () => this.item()
    const answer = () => this.answerOf(id)
    return (
      <article class="card" part={this.partForName("card")} data-answer={answer()?.result}>
        <header class="card-head">
          <ui-label class="id" size="small" color={STATE_COLORS[item()?.getAttribute("state") ?? "open"]}>
            {id.toUpperCase()}
          </ui-label>
          <h2 class="test-title">{this.titleOf(item())}</h2>
          <Show when={item()?.hasAttribute("failed")}>
            <ui-label class="before" size="mini" basic="" color="red">
              {this.translationForKey("failedBefore")}
              {item()?.getAttribute("failed") ? ` · ${item()!.getAttribute("failed")!.toUpperCase()}` : ""}
            </ui-label>
          </Show>
          <Show when={item()?.getAttribute("deferred")}>
            {(date) => (
              <ui-label class="before" size="mini" basic="" color="yellow">
                {this.translationForKey("deferredOn", { date: date() })}
              </ui-label>
            )}
          </Show>
        </header>
        {this.stepField()}
        <Show when={this.fields()?.should.length}>{this.field("should", this.fields()!.should)}</Show>
        <Show when={this.fields()?.example.length || this.fields()?.shots.length}>{this.exampleField()}</Show>
        <Show when={this.fields()?.ifNot.length}>{this.field("ifNot", this.fields()!.ifNot)}</Show>
        {this.answers(id)}
        {this.commentBox(id)}
        {this.screenshot(id)}
      </article>
    )
  }

  /** The Step:  its text (an older test's prose), then its action buttons;  "Loading ..." while its part comes. */
  private stepField(): JSX.Element {
    const fields = () => this.fields()
    return (
      <section class="field step">
        <h3>{this.translationForKey("step")}</h3>
        <div class="prose">
          <Show
            when={fields()?.step.length}
            fallback={this.translationForKey(fields()?.loading ? "loading" : "noDetails")}
          >
            {fields()!.step}
          </Show>
        </div>
        <Show when={fields()?.actions.length}>
          <div class="actions">
            <For each={fields()!.actions}>
              {(action) => (
                <ui-button
                  class="action"
                  color="blue"
                  basic=""
                  icon="up right from square"
                  href={action.href}
                  target={action.target}
                  title={this.translationForKey("openAction", { href: action.href })}
                >
                  {action.text}
                </ui-button>
              )}
            </For>
          </div>
        </Show>
      </section>
    )
  }

  /** A field:  its label, then its content (copies). */
  private field(key: "should" | "ifNot", nodes: Node[]): JSX.Element {
    return (
      <section class={["field", key]}>
        <h3>{this.translationForKey(key)}</h3>
        <div class="prose">{nodes}</div>
      </section>
    )
  }

  /** The Example:  its screenshots, each a button that zooms it, then its words. */
  private exampleField(): JSX.Element {
    const fields = () => this.fields()!
    return (
      <section class="field example">
        <h3>{this.translationForKey("example")}</h3>
        <For each={fields().shots}>
          {(shot) => (
            <ui-button
              class="shot"
              basic=""
              aria-label={this.translationForKey("zoom", { alt: shot.alt })}
              title={this.translationForKey("zoom", { alt: shot.alt })}
              onClick={(event: MouseEvent) => this.zoom(event)}
            >
              <img src={shot.src} alt={shot.alt} />
            </ui-button>
          )}
        </For>
        <Show when={fields().example.length}>
          <div class="prose">{fields().example}</div>
        </Show>
      </section>
    )
  }

  /** The four answers:  one group, each in its colour by the fill rule;  disabled while not reviewed. */
  private answers(id: string): JSX.Element {
    const reviewing = () => this.review.reviewing()
    return (
      <div class="answers" part={this.partForName("answers")}>
        <Show when={!reviewing()}>
          <p class="not-served">{this.translationForKey("notServed")}</p>
        </Show>
        <div class="answer-group" role="group" aria-label={this.translationForKey("answers")}>
          <For each={ANSWER_LOOKS}>{(look) => this.answerButton(id, look)}</For>
        </div>
      </div>
    )
  }

  /** One answer's button:  its icon and word;  dashed in its colour once chosen, outlined once sent. */
  private answerButton(id: string, look: AnswerLook): JSX.Element {
    const chosen = () => this.answerOf(id)?.result === look.result
    const fill = () => (!chosen() ? "none" : this.isSent(id) ? "outline" : "dashed")
    const state = () => (chosen() ? `:  ${this.translationForKey(this.isSent(id) ? "sent" : "unsent")}` : "")
    return (
      <ui-button
        class="answer"
        basic=""
        icon={look.icon}
        data-color={look.color}
        data-fill={fill()}
        data-result={look.result}
        aria-pressed={chosen() ? "true" : "false"}
        disabled={this.review.reviewing() ? undefined : ""}
        title={`${this.translationForKey(look.tip)}${state()}`}
        onClick={() => this.answer(look.result)}
      >
        {this.translationForKey(look.label)}
      </ui-button>
    )
  }

  /** Test `id`'s comment box, under the answers, whatever the answer (or none yet):  saved as typed. */
  private commentBox(id: string): JSX.Element {
    return (
      <div class="comment" part={this.partForName("comment")}>
        <epic-text-box
          ref={(box: HTMLElement) => this.drawnNote(box as HTMLElement & { value: string }, id)}
          type="note"
          placeholder={this.translationForKey("note")}
          label={this.translationForKey("noteLabel", { id: id.toUpperCase() })}
          onInput={() => this.typeNote(id)}
          onFocusOut={() => this.flushNote()}
        />
      </div>
    )
  }

  /**
   * A test's screenshot:  its area -- its thumbnail, or where to paste, drop or choose one.
   * - on every card, as the comment box is (Owen, 2026-10-22:  "you lost the picture input"):  it goes with whichever
   *   answer is chosen, before or after it
   */
  private screenshot(id: string): JSX.Element {
    const shot = () => this.pasted[id] ?? this.answerOf(id)?.shot
    return (
      <div class="failure" part={this.partForName("failure")}>
        <div
          class={["drop", { saving: this.savingShot === id }]}
          tabindex="0"
          role="group"
          aria-label={this.translationForKey("paste")}
          onDragOver={(event: DragEvent) => event.preventDefault()}
          onDrop={(event: DragEvent) => this.onDrop(event)}
        >
          <Show
            when={shot()}
            fallback={
              <>
                <span class="drop-words">{this.translationForKey(this.savingShot === id ? "saving" : "paste")}</span>
                <Show when={this.savingShot !== id}>
                  {/* VS Code's side bar never lets a dragged file reach the page:  a picker does (I75) */}
                  <ui-button
                    class="choose"
                    basic=""
                    size="mini"
                    icon="file image"
                    onClick={(event: MouseEvent) =>
                      (event.currentTarget as HTMLElement).parentElement?.querySelector("input")?.click()
                    }
                  >
                    {this.translationForKey("choose")}
                  </ui-button>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event: Event) => this.onChoose(event.currentTarget as HTMLInputElement)}
                  />
                </Show>
              </>
            }
          >
            {(src) => (
              <>
                <ui-button
                  class="shot"
                  basic=""
                  aria-label={this.translationForKey("zoom", { alt: id.toUpperCase() })}
                  title={this.translationForKey("zoom", { alt: id.toUpperCase() })}
                  onClick={(event: MouseEvent) => this.zoom(event)}
                >
                  <img src={src()} alt="" />
                </ui-button>
                <Show when={this.savingShot === id}>
                  <span class="drop-words">{this.translationForKey("saving")}</span>
                </Show>
                <ui-button
                  class="remove"
                  circular=""
                  basic=""
                  size="mini"
                  icon="xmark"
                  aria-label={this.translationForKey("removeShot")}
                  title={this.translationForKey("removeShot")}
                  onClick={() => this.removeShot(id)}
                />
              </>
            )}
          </Show>
        </div>
      </div>
    )
  }

  /** Back and Next:  a band of their own, pinned to the window's bottom, under the card or the summary. */
  private moves(): JSX.Element {
    return (
      <nav class="moves" part={this.partForName("moves")}>
        <ui-button
          basic=""
          disabled={this.tests().indexOf(this.at) <= 0 && !this.isSummary ? "" : undefined}
          title={this.translationForKey("backTip")}
          onClick={() => this.move(-1)}
        >
          {this.translationForKey("back")}
        </ui-button>
        <Show when={!this.isSummary}>
          <ui-button basic="" title={this.translationForKey("nextTip")} onClick={() => this.move(1)}>
            {this.translationForKey("next")}
          </ui-button>
        </Show>
      </nav>
    )
  }

  /** The summary:  the counts, what Send does, Send results, the next epic, Done testing. */
  private summary(): JSX.Element {
    const counts = () => this.counts()
    return (
      <article class="card summary" part={this.partForName("summary")}>
        <h2 class="test-title">{this.translationForKey("summaryTitle", { total: this.tests().length })}</h2>
        <ul class="counts">
          <For each={ANSWER_LOOKS}>
            {(look) => (
              <li data-color={look.color} data-zero={counts()[look.result] ? undefined : ""}>
                <ui-icon name={look.icon} />
                {this.translationForKey(look.count, { count: counts()[look.result] })}
              </li>
            )}
          </For>
          <Show when={counts().open}>
            <li data-color="grey">
              <ui-icon name="circle outline" />
              {this.translationForKey("countOpen", { count: counts().open })}
            </li>
          </Show>
        </ul>
        <Show when={this.commented().length}>
          <p class="commented-title">{this.translationForKey("commentedTitle")}</p>
          <ul class="commented">
            <For each={this.commented()}>
              {(each) => (
                <li>
                  <ui-label class="id" size="mini" basic="">
                    {each.id.toUpperCase()}
                  </ui-label>
                  <span class="result">{this.translationForKey(each.result ?? "unanswered")}</span>
                  <span class="said">{each.note}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <p class="what">{this.translationForKey("summaryWhat")}</p>
        <div class="ends">
          <ui-button
            class="send"
            color="blue"
            basic=""
            icon="paper plane"
            data-fill={this.allSent() ? "outline" : "dashed"}
            disabled={this.review.reviewing() ? undefined : ""}
            onClick={() => void this.review.client?.send()}
          >
            {this.translationForKey(this.allSent() ? "sentAll" : "send")}
          </ui-button>
          <Show when={this.nextEpic}>
            {(next) => (
              <ui-button
                class="next-epic"
                color="blue"
                icon="arrow right"
                href={this.nextHref(next())}
                onClick={(event: MouseEvent) => this.onNextEpic(event, this.nextHref(next()))}
              >
                {this.translationForKey("nextEpic", { epic: next().epic, count: next().open })}
              </ui-button>
            )}
          </Show>
        </div>
      </article>
    )
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /**
   * An answer pressed (or its key):  marked at once, then saved.
   * - Passed, Skip, Not now:  on to the next test, a moment later (the press shows first)
   * - Failed:  the screenshot's area opens, the comment box focused;  pressed again, it keeps both
   * - the comment and the screenshot go with it, whichever it is (typed or taken now, or with an earlier answer)
   */
  @E.untracked
  private answer(result: TestResult) {
    const id = this.at
    const client = this.review.client
    if (!client?.reviewing || !this.item()) return
    this.noteTimer?.cancel()
    this.noteTimer = undefined
    const note = this.commentOf(id).trim()
    const prior = client.testAnswerOf(id)
    const shot = prior?.shot ?? this.heldShots[id]
    if (result !== "failed") {
      this.track(client.answerTest(id, { result, ...(note && { note }), ...(shot && { shot }) }))
      this.moveTimer?.cancel()
      this.moveTimer = E.after(ANSWER_PAUSE_MS / 1000, () => {
        if (this.at === id) this.move(1)
      })
      return
    }
    if (prior?.result !== "failed" || (prior.note ?? "") !== note || prior.shot !== shot)
      this.track(client.answerTest(id, { result, ...(note && { note }), ...(shot && { shot }) }))
    E.afterSolidUpdate(() => E.beforeNextPaint(() => this.focusNote()))
  }

  /** Back (-1) or Next (1):  the test before or after;  past the last, the summary.  The note is saved first. */
  @E.untracked
  private move(step: 1 | -1) {
    this.moveTimer?.cancel()
    this.flushNote()
    const tests = this.tests()
    const index = this.isSummary ? tests.length : tests.indexOf(this.at)
    const next = index + step
    if (next < 0) return
    this.at = next >= tests.length ? SUMMARY : tests[next]!
    // the run sits right under the page's header:  the window's top shows its head
    E.afterSolidUpdate(() => window.scrollTo({ top: 0, behavior: "instant" }))
  }

  /**
   * The address says where the run is, `#v3` (none on the summary), replaced:  a reload resumes there.
   * - again each time the docs runtime's scroll-follow writes its own (`spell-doc:place`):  its sections are hidden,
   *   so it would take the hash off;  then said the same way, so VS Code's view keeps the run's place too
   */
  @E.untracked
  private readonly keepPlace = () => {
    const at = this.at
    const hash = at && at !== SUMMARY ? `#${at}` : ""
    if (!at || location.hash === hash) return
    history.replaceState(history.state, "", `${location.pathname}${location.search}${hash}`)
    dispatchEvent(new Event(PLACE_EVENT))
  }

  /** Leave the run (Esc, Done testing):  the note saved, the page told, and its unsent answers sent (`sendAnswers()`). */
  @E.untracked
  private leave() {
    this.moveTimer?.cancel()
    this.flushNote()
    const sending = this.sendAnswers()
    this.send(TEST_DONE, {})
    void sending
  }

  /**
   * The summary's Next epic:  the run's unsent answers sent first (`sendAnswers()`), then on;  a send that failed
   * stays here, the notice saying why.
   */
  @E.untracked
  private onNextEpic(event: MouseEvent, href: string) {
    this.flushNote()
    if (!this.unsentAnswers().length) return
    event.preventDefault()
    void this.sendAnswers().then((sent) => sent && location.assign(href))
  }

  /**
   * Hand the run's unsent answers to Claude, as the run is left:  the page's Send, once the answers and comments on
   * their way are saved;  true when they went, or there were none.
   * - the notice line says what went ("3 results sent to Claude");  with nobody listening, Send's own notice stays
   *   (saved, and how the epic was woken)
   * - it failed (the page server gone, not served):  the notice says so;  the answers wait, Send blue in the header
   * - its words are read now:  the run is gone by the time the send answers
   */
  @E.untracked
  private async sendAnswers(): Promise<boolean> {
    const client = this.review.client
    const ids = this.unsentAnswers()
    const count = ids.length
    if (!client || !count) return true
    const said = {
      sent: count === 1 ? this.translationForKey("leftSentOne") : this.translationForKey("leftSent", { count }),
      notServed: this.translationForKey("leftNotServed", { count }),
      failed: this.translationForKey("leftFailed", { count, error: "{error}" }),
      noReason: this.translationForKey("noReason")
    }
    if (!client.reviewing) {
      client.notify(said.notServed)
      return false
    }
    await Promise.allSettled([...this.saving])
    // sent meanwhile (the header's Send, the summary's):  nothing left to say
    if (!ids.some((id) => EpicTestRun.isUnsent(client, id))) return true
    const sent = await client.send()
    if (sent && client.listening) client.notify(said.sent)
    else if (!sent) client.notify(said.failed.replace("{error}", client.lastWriteError || said.noReason))
    return sent
  }

  /** The run's answers not sent yet, by test id. */
  @E.untracked
  private unsentAnswers(): string[] {
    const client = this.review.client
    if (!client) return []
    return this.tests().filter((id) => !!client.testAnswerOf(id) && EpicTestRun.isUnsent(client, id))
  }

  /** Is item `id`'s mark waiting for a Send? */
  private static isUnsent(client: ReviewClient, id: string): boolean {
    const mark = client.markOf(id)
    return !!mark && !client.isSent(mark)
  }

  /** Keep `saving` (an answer or a comment on its way) until it's saved, or failed. */
  private track(saving: Promise<unknown>) {
    this.saving.add(saving)
    void saving.finally(() => this.saving.delete(saving))
  }

  /**
   * A key on the page:  P / F / S / N answer, ← → move, Esc leaves.
   * - not while typing (Esc there leaves the box), nor with a modifier, nor while a screenshot is zoomed
   */
  private readonly onKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || this.zoomed) return
    const target = event.composedPath()[0]
    const typing =
      target instanceof HTMLElement && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.localName))
    if (event.key === "Escape") {
      event.preventDefault()
      if (typing) (target as HTMLElement).blur()
      else this.leave()
      return
    }
    if (typing) return
    const look = ANSWER_LOOKS.find((each) => each.key === event.key.toLowerCase())
    if (look && !this.isSummary) {
      event.preventDefault()
      this.answer(look.result)
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault()
      this.move(event.key === "ArrowRight" ? 1 : -1)
    }
  }

  ////////////////
  // ## The comment, and a failure's screenshot
  ////////////////

  /**
   * The current test's comment as the inbox holds it:  its answer's, else its draft.  Followed (`onSavedComment()`),
   * so a box drawn before the inbox was read (a reload) fills once it is.
   */
  get savedComment(): string {
    void this.review.reviewing()
    const client = this.review.client
    return client?.testAnswerOf(this.at)?.note ?? client?.draftOf(this.at)?.note ?? ""
  }

  /** The inbox's comment for the current test changed:  into its box, unless Owen is typing there. */
  @E.onChange("savedComment")
  protected onSavedComment(text: string) {
    const box = this.noteBox
    if (!box?.isConnected || this.typed.has(this.at) || box.value === text) return
    if (box.shadowRoot?.activeElement) return
    box.value = text
  }

  /** The comment box, drawn for test `id`:  its comment as it stands. */
  @E.untracked
  private drawnNote(box: HTMLElement & { value: string }, id: string) {
    this.noteBox = box
    box.value = this.commentOf(id)
  }

  /**
   * Test `id`'s comment as it stands:  what was typed this visit, else its answer's (`note`), else the inbox's draft
   * for it (typed before an answer, kept across a reload).
   */
  private commentOf(id: string): string {
    const client = this.review.client
    return this.typed.get(id) ?? client?.testAnswerOf(id)?.note ?? client?.draftOf(id)?.note ?? ""
  }

  /** The note box's field, focused. */
  private focusNote() {
    this.noteBox?.shadowRoot?.querySelector("textarea")?.focus({ preventScroll: true })
  }

  /** A keystroke in test `id`'s comment:  kept, and saved once the typing stops. */
  @E.untracked
  private typeNote(id: string) {
    this.typed.set(id, this.noteBox?.value ?? "")
    this.noteTimer?.cancel()
    this.noteTimer = E.after(NOTE_SAVE_MS / 1000, () => this.saveNote(id))
  }

  /** Save the comment being typed now, if any (the box left, a move). */
  @E.untracked
  private flushNote() {
    if (!this.noteTimer) return
    this.saveNote(this.at)
  }

  /**
   * Save test `id`'s typed comment:  into its answer (unchanged:  nothing);  no answer yet, as the inbox's draft
   * for it, which its answer takes over (the route drops the draft once a mark carries a note).
   */
  @E.untracked
  private saveNote(id: string) {
    this.noteTimer?.cancel()
    this.noteTimer = undefined
    const client = this.review.client
    const text = this.typed.get(id)
    if (!client?.reviewing || text === undefined) return
    const answer = client.testAnswerOf(id)
    const note = text.trim()
    if (!answer) {
      if ((client.draftOf(id)?.note ?? "") !== text) this.track(client.saveDraft(id, text))
      return
    }
    if ((answer.note ?? "") === note) return
    this.track(
      client.answerTest(id, {
        result: answer.result,
        ...(note && { note }),
        ...(answer.shot && { shot: answer.shot })
      })
    )
  }

  /** A paste anywhere on the page, while a test's card shows:  an image in it is the test's screenshot. */
  private readonly onPaste = (event: ClipboardEvent) => {
    if (!this.tests().includes(this.at)) return
    const file = Array.from(event.clipboardData?.items ?? [])
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile()
    if (!file) return
    event.preventDefault()
    this.track(this.takeShot(file))
  }

  /** A file chosen with the screenshot area's picker. */
  @E.untracked
  private onChoose(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ""
    if (file) this.track(this.takeShot(file))
  }

  /** A file dropped on the screenshot's area. */
  @E.untracked
  private onDrop(event: DragEvent) {
    event.preventDefault()
    const file = event.dataTransfer?.files[0]
    if (file) this.track(this.takeShot(file))
  }

  /**
   * Take `file` as the current test's screenshot:  shown at once, saved through the page server (`POST shot`), then
   * put in its answer;  no answer yet, held for the one to come (`heldShots`).
   * - not an image, or over 8 MB:  a notice says so
   */
  @E.untracked
  private async takeShot(file: File) {
    const client = this.review.client
    const id = this.at
    if (!client) return
    if (!file.type.startsWith("image/")) return client.notify(this.translationForKey("notImage"))
    if (file.size > SHOT_MAX_BYTES) return client.notify(this.translationForKey("tooBig"))
    const png = await EpicTestRun.dataUrlOf(file)
    this.pasted = { ...this.pasted, [id]: png }
    this.savingShot = id
    const shot = await client.saveShot(id, png)
    this.savingShot = ""
    if (!shot) return
    const answer = client.testAnswerOf(id)
    if (!answer) {
      this.heldShots = { ...this.heldShots, [id]: shot }
      return
    }
    const note = this.commentOf(id).trim()
    await client.answerTest(id, { result: answer.result, ...(note && { note }), shot })
  }

  /** Test `id`'s screenshot removed:  off its answer (or the one to come), its note kept. */
  @E.untracked
  private removeShot(id: string) {
    const client = this.review.client
    const answer = client?.testAnswerOf(id)
    const pasted = { ...this.pasted }
    delete pasted[id]
    this.pasted = pasted
    const held = { ...this.heldShots }
    delete held[id]
    this.heldShots = held
    if (!client || !answer) return
    void client.answerTest(id, { result: answer.result, ...(answer.note && { note: answer.note }) })
  }

  /** A screenshot's button, clicked:  its image zoomed. */
  @E.untracked
  private zoom(event: MouseEvent) {
    const image = (event.currentTarget as Element | null)?.querySelector("img")
    if (image) this.zoomed = image.src
  }

  /** The zoom closed (Esc, its ×, the dimmer). */
  @E.on("ui-hide", { target: "renderRoot" })
  protected onZoomClosed() {
    this.zoomed = undefined
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Test `id`'s answer, following the inbox. */
  private answerOf(id: string) {
    void this.review.reviewing()
    return this.review.client?.testAnswerOf(id)
  }

  /** Has test `id`'s answer gone with a Send? */
  private isSent(id: string): boolean {
    void this.review.reviewing()
    const client = this.review.client
    const mark = client?.markOf(id)
    return !!client && !!mark && client.isSent(mark)
  }

  /** The first test not answered, read once the inbox is in;  every one answered:  the summary. */
  @E.untracked
  private firstOpen(): string {
    return this.tests().find((id) => !this.review.client?.testAnswerOf(id)) ?? SUMMARY
  }

  /** `item`'s title:  its `title`, else its title slot's text. */
  private titleOf(item: Element | undefined): string {
    return item?.getAttribute("title") ?? item?.querySelector(":scope > [slot=title]")?.textContent?.trim() ?? ""
  }

  /**
   * The next epic with open tests after this one, in Owen's saga order (`GET /api/epics/tests`);  this epic not
   * among them (no tests left):  the first other.
   */
  @E.untracked
  private async findNextEpic() {
    const epic = this.page?.getAttribute("epic") ?? ""
    const entries = (await this.review.client?.openTests()) ?? []
    const index = entries.findIndex((entry) => entry.epic === epic)
    const after = index < 0 ? entries : entries.slice(index + 1)
    this.nextEpic = after.find((entry) => entry.epic !== epic && entry.open > 0)
  }

  /** The next epic's page, in test mode across every epic:  `<page>?test=1&all=1`, as `epic test --all` opens one. */
  private nextHref(next: TestsEntry): string {
    const url = new URL(next.page, location.href)
    url.searchParams.set(TEST_QUERY, "1")
    url.searchParams.set(ALL_QUERY, "1")
    url.hash = ""
    return url.href
  }

  /** `file` as a data URL. */
  private static dataUrlOf(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error ?? new Error("couldn't read the screenshot"))
      reader.readAsDataURL(file)
    })
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicTestRun extends E.AttributeValues<typeof epicTestRunVocabulary> {}

/** An item's DOM element, as the run loads its part:  a `DOMLoadableBodyElement`'s `load()`. */
type Loadable = Element & { load?(): Promise<void> }

/** The page's tag. */
const PAGE = "epic-page"

/** A test's id chip, in its item's state's colour (plan-doc.md, "Colours"). */
const STATE_COLORS: Record<string, string> = {
  attention: "red",
  replied: "orange",
  progress: "blue",
  open: "yellow",
  recent: "green",
  old: "grey"
}

/** The docs runtime's word that it wrote the address (its scroll-follow), for the live client and VS Code's view. */
const PLACE_EVENT = "spell-doc:place"

/** `at` on the summary card. */
const SUMMARY = "summary"

/** How long after an answer the run moves on:  long enough to see the press. */
const ANSWER_PAUSE_MS = 350

/** How long a failure's note waits after the last keystroke before it's saved. */
const NOTE_SAVE_MS = 800
