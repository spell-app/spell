import { For, Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
// The file itself (`list/` has no barrel):  it has no imports, so the pack bundles it as is
import { URGENT_SELECTOR, epicStateFor, type EpicState } from "spell/epic/list/EpicState"

import { PlanDates } from "spell/epic/dates"
import { PageStages, PhaseIds, type PageStage } from "spell/epic/phases"
import {
  AUTO_SEND_CHOICES,
  NOBODY_LISTENING,
  SAGA_PREFIX,
  STAGE_ID,
  SendCountdown,
  ServerLink,
  isAirplane,
  isImmediate,
  type AutoSend
} from "spell/epic/review"
// the page's view of the review inbox, as the review controls':  its file, not `epic-review`'s barrel
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
// the fold and filter pieces the blocks share:  their files, not their families' barrels (which would define them here)
import { Fold, expandAllUnder, foldAllUnder } from "spell/epic/components/epic-item/Fold"
import { StateFilter, type ChipPick } from "spell/epic/components/epic-section/StateFilter"
import { STATE_PICK, type StatePickDetail } from "spell/epic/components/epic-state-filter/EpicStateFilter.types"
import { FILTER, FILTER_STATES, type StateFilterEntry } from "spell/epic/components/epic-section/EpicSection.types"
import { SEND_ASKED, type SendAskedDetail } from "spell/epic/components/epic-send-buttons/EpicSendButtons.types"

import { epicPageVocabulary } from "./EpicPage.en"
import {
  ACTIVE,
  BAR,
  CRUMB_LINKS,
  CRUMBS,
  DONE,
  COPIED_TOAST_ID,
  SEE_ALSO,
  SEE_ALSO_KINDS,
  type SagaLink,
  type SeeAlsoLink,
  sagaHref,
  COPIED_TOAST_MS,
  FLASH_MS,
  CENTRE,
  GEAR,
  GEAR_MENU,
  GEAR_ROW,
  GEAR_ROWS,
  GEAR_SUB,
  GEAR_VALUE,
  HEAD,
  HEAD_PROPERTY,
  HEADING,
  HEADING_COPY,
  HUNG,
  ICON,
  LAYOUT_ATTRIBUTES,
  META,
  NOTICE,
  OLD_CRUMBS,
  PILL,
  PROMPT,
  REVIEW_LINE,
  SAGA_KIND,
  SEND,
  STACK_PROPERTY,
  STATUS,
  TODO,
  TOOLBAR,
  TOOLBAR_TOOLS,
  type EpicPageVocabulary,
  type HeaderMarks,
  type PageSignals,
  type PhaseLine,
  type StageButton,
  type StepLabel
} from "./EpicPage.types"

import collapseAllCSS from "spell/epic/components/epic-item/CollapseAll.css?inline"
import chipsCSS from "spell/epic/components/epic-section/StateChips.css?inline"
import pageCSS from "./EpicPage.css?inline"
import crumbsCSS from "./Crumbs.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicPage`
 * The component behind `<epic-page>`:  an epic page --
 * one epic's page, its data in attributes, its Overview and sections as children.
 * - Draws, top to bottom:
 *   - the sticky page header:  ONE line of crumbs, `DOCS / EPICS / <NAME>`, the name in their type, twice their size and bold, the h1
 *     (Owen, 2026-10-13:  "This is all redundant ... Just go with a single set of breadcrumbs")
 *     - a click on the name copies `/epic resume <name>`, and a quiet toast says so
 *     - no `DOCS / EPICS /` while the doc still holds its old `.spell-crumbs` before the page, nor narrow, 720px or
 *       less, where the side bar is too narrow for them (`Crumbs.css`)
 *     - the epic's title isn't drawn:  the name says it (the page's `<title>` and the Epics list still show it)
 *     - one line, cut short with its full name as the tooltip when the header is too narrow (epic `epic-engine` P53)
 *     in its MIDDLE, while reviewed, Send, and beside it the session's spinner (P53;  Owen's comment C7, T53);
 *     at its right the bedtime label, the step label (the state's icon in it) and the gear (P53, where the git toggle
 *     was;  Owen, 2026-10-10:  "Right items:  (=>P14) (whatever the half-filled circle is) (git icon, but bigger)";
 *     then the state went into the step label:  "Into the pill")
 *   - the toolbar's bar, sticky again, right below the header (`--epic-head-h`):  the new item form, the toolbar
 *   - the review line, and the pill under it while it shows
 *   - the meta lines (branch, worktree, dates, the saga it serves, the guide's link from `slot="durable"`)
 *     - the saga (`saga`, epic `epic-workflow` P15):  a link to its saga page, by its title, its purpose the tooltip
 *       - once the page server says them (`GET /api/epics/pages`'s `saga`);  by its id until then, and from `file://`
 *   - a future epic's notice, then its children
 * - The step label follows the phases, in the colours of decision Q20;  while the page is in a stage (P29), the stage
 *   instead (`OVERVIEW`, `PHASES`, grey), since its phases may not show yet, and none while the stage button shows,
 *   which says it in its words:
 *   - the active one (outlined blue:  Claude is on it;  links to it)
 *   - else DONE (solid green) once every phase is done;  else the next one (grey)
 *   - none without phases;  FUTURE (grey:  not started) for a future epic
 *   - read from the `<epic-phase>`s below, so it follows the live update:  a `MutationObserver` bumps `layout`
 * - The epic's state (Owen, 2026-10-10, epic `airplane` P8), by the ONE rule the Epics list uses too
 *   (`spell/epic/list/EpicState`):  the step label's icon and colour, why under its tooltip (`part="state"`)
 *   - in progress (blue half circle), errors (red !:  every phase done, items need Owen), paused (grey pause:
 *     untouched for days)
 *   - none on a future epic or a done one:  the label is FUTURE or DONE in its own look
 *   - from the phases and items below and the doc's `updated` date, so it follows the live update too;
 *     a session listening to the review counts as running
 * - The review line under the header:  "To review this doc, type `/epic review <name>`", copied on click (it flashes)
 *   - on every epic page, as today:  it's how a review starts;  airplane mode:  `/airplane land`
 * - SEND, `<epic-send-buttons countdown>`, at the header's middle (epic `epic-engine` P53;  P20 put it at the right,
 *   before the labels, in place of P10's Send and Review Now)
 *   - centred while the title fits beside it;  narrower, right after the title, never over it (J161)
 *   - there whenever the page is reviewed (served with a token, its inbox answering:
 *     `ReviewClient`, through a `ReviewState` of its own), so it's always in the same place
 *   - Owen, 2026-10-10:  "The send + do now icons in bottom-right is too hidden.  Move back to the page header,
 *     to the left of P11" (epic `airplane` P8 had put them in a bar stuck to the window's bottom)
 *   - the paper plane:  every unsent mark and comment to Claude, by the fill rule (Q20)
 *     - grey with nothing to send, blue with marks not sent, outlined blue once sent
 *     - Owen's comments too (Owen, 2026-10-10, he keeps Send as the way they reach Claude):
 *       a new comment, or his reply on a thread, makes it blue;  its tooltip counts both ("2 marks, 1 comment")
 *   - AUTO SEND (P53;  Owen, 2026-10-29:  "Send works on a 2-minute no interaction timer ... Pressing it sends
 *     immediately"):  a ring round the plane drains over the wait the gear chose, and at its end the plane sends by
 *     itself, waking the epic when nobody listens (Q59, B);  a countdown's send asks every revisit now (Q7)
 *     - no wand (gone 2026-10-25):  the gear's Auto Send turns it off, and the plane is then filled blue until pressed
 *   - nobody listening:  the plane's tooltip says so (`NOBODY_LISTENING`)
 *   - what a send did goes to the notice line at the window's bottom (`ReviewState`'s)
 * - THE STAGE (`stage`, epic `epic-engine` P29;  `PageStages`):  how far planning has got
 *   - `overview`:  only the Overview, Questions and Todo show;  `phases`:  the Phases and Issues too;  `building` (or none):
 *     everything.  Each section hides itself (`<epic-section>`'s `:state(offstage)`), and the toolbar lists only
 *     what shows (`spell-doc-runtime.js` reads the same rule)
 *   - while the page is in a stage, Send's paper plane is the STAGE BUTTON
 *     (Q14:  "Accept Overview", then "Accept Phases";  `stageButton()`)
 *     - a press sends what's unsent, with an accept mark (`accept()`),
 *       and the session moves the page on (`epic inbox apply`)
 *     - its tooltip says what's still open ("2 questions open"):  a reminder, never a lock
 *   - Send's plane is back once building starts
 *   - building, while a phase's build plan waits (`plansWaiting()`):  Send as ever, RINGED (its border 2px #666, darker than its hairline),
 *     "waiting on you", its tooltip naming them ("2 build plans wait for your Accept:  P43, P44");  dotted once
 *     every one has his mark
 *     - Owen, 2026-10-25:  "This just needs to be `send|wand` and not green -- I may not be accepting the phases.
 *       Maybe try the thicker border if you are waiting on me to accept"
 *     - accepting stays per phase, on its row;  a green "Accept 2 plans" stood here before (I119)
 * - THE PILL, under the review line, while marks, comments or requests for now wait and nobody can take them:
 *   no session listening (solid orange, a warning), or airplane mode;  a click copies the review line's command,
 *   and, out of airplane mode, starts the review in the epic's own session (`ReviewClient.startReview()`)
 *   - once a Send WOKE the epic (epic `epic-workflow` P16), it says what the wake did instead,
 *     until a session listens:  "Typed /epic review <name> into 🚧 <name>:  press Enter there"
 * - NEW ITEMS (epic `airplane` P2):  each item section's own comment-dots button, on its title (`<epic-section>`);
 *   the page's toolbar has none since 2026-10-13
 * - THE TOOLBAR (epic `airplane` P8):  the sticky bar's last row.
 *   - edge to edge, its own rule under it and none above (Owen, 2026-10-10)
 *   - the header's and the bar's measured heights (`top`, `--epic-stack`) take it in
 *   - `slot="toolbar"`:
 *     where the docs runtime puts an epic page's section buttons (`spell-doc-runtime.js` `buildToolbar()`)
 *   - at its right, the PAGE'S STATE FILTER:  every section's chips added up,
 *     a click filtering every section at once (`StateFilter`, through each section's DOM element)
 *   - then expand-all and collapse-all, opening or folding the whole page
 * - SEE ALSO (Owen, 2026-10-13:  "There is no easy way to get to a "decisions" or "details" pages from an epic"),
 *   above its blocks:  the pages the epic made or leans on, each with its kind's icon and word, and its day
 *   - its guide;  every page in its `details/` folder (details pages, choice pages, its review page), newest
 *     first;  then every guide its epic page and parts link to (epic `epic-workflow` P13), newest first
 *   - gathered by the page server (`GET /api/epics/pages`, the tool's `SeeAlso`) as it connects, and again when a
 *     page in the epic's folder changes (`spell-server:changed`):  a page made or linked a moment ago shows
 *   - none, or not served (`file://`):  no box
 *   - open, folding (a `<details>`):  short, and it's how to get to them
 * - WHAT CLAUDE IS DOING (epic `epic-engine` P35):  the session's line, a bare spinner beside Send, its words the
 *   tooltip (P53, T53);  the running agents (epic `skillz` P3) in the step label's pill, a popover
 *   (`<epic-agents>`);  no "Agents running" panel above its blocks any more.
 *   - only while the page is served with a token, the epic's list answers (`AgentsClient`) and an agent runs
 *   - each row a note box that redirects that agent
 *   - in the shadow root:  not a section, so the rail and counts never see it
 * - THE GEAR (epic `epic-engine` P53, `gear()`), at the header's right:  Auto Send and Theme, each a sub-menu.
 *   No page-wide git toggle since:  the Log lists every commit (P52), each phase and item shows its own.
 * - The page-wide signals its blocks read (`signalsOf()`):
 *   - `layout`
 *   - `top`, where top-level titles stick:
 *     the site header's `--spell-site-header-height` plus this header's and the toolbar bar's heights,
 *     re-measured as any of them changes size
 * - EDGE TO EDGE (P14):  its `:host` breaks out of the docs' `<main>` padding
 *   (`--spell-doc-pad-inline`, `spell-doc.css`), so the bands reach across;
 *   everything inside insets itself by `--epic-inset`.
 * - SHARED LOOK:  `EpicPage.css` declares the pack's tokens on its `:host`
 *   (`--epic-*`:  colours, bands, the inset, item state colours, the chip);  every `<epic-*>` below inherits them.
 * - A SAGA PAGE (`kind="saga"`, epic `epic-workflow` P15):  the same page for a saga, `saga` naming it
 *   - crumbs `DOCS / SAGAS / <ID>`;  a click on the id copies `/epic review SAGA:/<id>`, as the review line does
 *   - no step label, state, Plan hung?, See Also or Agents running:  a saga has no phases, branch or agents
 *   - one meta line, its short address (`SAGA:/drawable-spell`, copied on click), then its dates
 *   - Send and the review line as on an epic page:  its marks and comments wait in its own inbox,
 *     for the session running `/epic review SAGA:/<id>` (`reviewRoutes.ts`)
 * - NO TEST MODE since epic `epic-engine` P51 (Q53):  tests are answered where they are, in the Manual tests section,
 *   whose button and the address's `?test=1` are its own (`<epic-section kind="tests">`);  P4's test run went
 * - SIDE EFFECT:  observes its subtree and the site header while connected;
 *   follows the page's review and agents clients.
 ****************/
export class EpicPage extends E.UIComponent<EpicPageVocabulary> {
  @E.proto static vocabulary = epicPageVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: {
      "epic-tooltip": tooltipCSS,
      "epic-page": pageCSS,
      "epic-crumbs": crumbsCSS,
      "epic-collapse-all": collapseAllCSS,
      "epic-state-chips": chipsCSS
    },
    cssStates: ["future"],
    // a container:  a click on any text in the doc must not jump to the header's first link
    // (focusing it scrolled the page to its top, and the click then missed what it was on:  I7 of `airplane`)
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its tag:  what its blocks look for around them. */
  static readonly TAG = epicPageVocabulary.tag

  /** The signals of each page's DOM element (`signalsOf()`). */
  private static readonly pageSignals = new WeakMap<Element, PageSignals>()

  ////////////////
  // ## State
  ////////////////

  /** Light-DOM slot occupancy:  the guide's link. */
  readonly slots = new E.SlotContent(this.domElement)

  /** The page-wide signals. */
  readonly signals = EpicPage.signalsOf(this.domElement)

  /**
   * The page's view of the review inbox:  only `reviewing()` and the client are read here
   * (it's keyed by the epic's name, never an item's:  no mark is ever the page's).
   */
  readonly review = new ReviewState(() => this.epic ?? this.saga)

  /** The review line, just copied:  it flashes and says so. */
  @E.state accessor isCopied = false

  /** Bumped when a section's filter changes (`epic-filter-changed`) or the sections first draw:  the toolbar's chips follow. */
  @E.state accessor filterTick = 0

  /** The sticky header's measured height, px:  where the toolbar's bar sticks, below it (`measure()`). */
  @E.state accessor headHeight = 0

  /** The meta lines', the header buttons' and the review line's icons. */
  readonly icons = {
    branch: new E.IconGlyph({ owner: this, name: () => "code branch" }),
    folder: new E.IconGlyph({ owner: this, name: () => "folder" }),
    calendar: new E.IconGlyph({ owner: this, name: () => "calendar" }),
    book: new E.IconGlyph({ owner: this, name: () => "book" }),
    saga: new E.IconGlyph({ owner: this, name: () => "bullseye" }),
    gear: new E.IconGlyph({ owner: this, name: () => "gear" }),
    chevron: new E.IconGlyph({ owner: this, name: () => "chevron right" }),
    copy: new E.IconGlyph({ owner: this, name: () => "copy" })
  }

  /** The review line's flash timer. */
  private flashTimer?: E.CancelablePromise<unknown>

  /** The sticky header, as drawn. */
  private header?: HTMLElement

  /** The toolbar's sticky bar under it, as drawn. */
  private bar?: HTMLElement

  ////////////////
  // ## Derived state
  ////////////////

  /** The phases below, read again on every layout change:  each numbered by its place (P15:  never by its id). */
  readonly phases = createMemo((): PhaseLine[] => {
    this.signals.layout.get()
    return Array.from(this.domElement.querySelectorAll("epic-phase"), (phase) => ({
      id: phase.id,
      label: PhaseIds.labelOf(phase),
      status: phase.getAttribute("status") ?? TODO,
      title: phase.getAttribute("title") ?? phase.querySelector(":scope > [slot=title]")?.textContent?.trim() ?? ""
    }))
  })

  /** The step label by the phases alone:  the active one (every one, when several are), else the next, DONE (STANDING) or FUTURE;  `undefined` for none. */
  private readonly phaseStep = createMemo((): StepLabel | undefined => {
    if (this.isSaga) return undefined
    const phases = this.phases()
    if (!phases.length) {
      return this.future ? { color: "grey", icon: "seedling", words: this.translationForKey("future") } : undefined
    }
    // every phase under way, two at once too (Owen, 2026-10-24:  P26 and P28 side by side, the header said only P26)
    const active = phases.filter((phase) => phase.status === ACTIVE)
    if (active.length > 1) {
      const words = active.map((phase) => phase.label).join(" · ")
      const tip = active.map((phase) => `${phase.label} · ${phase.title}`).join(";  ")
      return { color: "blue", icon: "circle half stroke", words, tip, href: `#${active[0]!.id}` }
    }
    if (active.length) return this.phaseLabel(active[0]!, "blue", "circle half stroke", "")
    const next = phases.find((phase) => phase.status !== DONE)
    // a standing epic is never done:  it waits for the next request (epic `epic-workflow`)
    if (!next && this.standing)
      return { color: "blue", icon: "arrows rotate", words: this.translationForKey("standing") }
    if (!next) return { color: "green", icon: "check", words: this.translationForKey("done") }
    // the row's to-do circle (`EpicPhase`'s `todo` icon):  the same icon as the phase it names
    return this.phaseLabel(next, "grey", "circle outline", this.translationForKey("next"))
  })

  /** Does the doc still hold its old crumbs before the page (`OLD_CRUMBS`)?  Then it draws none of its own. */
  readonly hasOldCrumbs = createMemo(
    () => this.isConnected && !!this.domElement.parentElement?.querySelector(OLD_CRUMBS)
  )

  /** Still planning:  no phases yet, and not a future epic.  The `Plan hung?` aside shows. */
  readonly planning = createMemo(() => !this.future && !this.isSaga && this.phases().length === 0)

  /**
   * The kickoff prompt as typed, for the `Plan hung?` aside to copy:  the Overview's `slot="prompt"`;
   * "" without one.
   * - a paragraph per blank line, `<br>`s as line breaks
   */
  readonly prompt = createMemo(() => {
    this.signals.layout.get()
    const quote = this.domElement.querySelector(PROMPT)
    if (!quote) return ""
    const paragraphs = quote.querySelectorAll("p")
    const blocks = paragraphs.length ? Array.from(paragraphs) : [quote]
    return blocks
      .map((block) =>
        EpicPage.textOf(block)
          .replace(/ *\n */g, "\n")
          .trim()
      )
      .join("\n\n")
  })

  /**
   * The epic's state, for the step label's icon and colour (`epicStateFor()`):  in progress, errors or paused;
   * `undefined` for a future epic or a done one, whose step label says so.
   * - running:  a session listening to the page's review (`ReviewClient.listening`);  else the `updated` date decides
   */
  readonly state = createMemo((): EpicState | undefined => {
    this.signals.layout.get()
    // a saga has no phases;  a page still being agreed says its stage instead (P29)
    if (this.isSaga || PageStages.isPlanning(this.pageStage)) return undefined
    const phases = this.phases()
    const active = phases.find((phase) => phase.status === ACTIVE)
    const client = this.review.client
    const state = epicStateFor({
      phases: phases.map((phase) => phase.status),
      updated: this.updated,
      future: this.future,
      standing: this.standing,
      urgent: Array.from(this.domElement.querySelectorAll(URGENT_SELECTOR), (item) => item.id),
      running: this.review.reviewing() && !!client?.listening,
      active: active && `${active.label} · ${active.title}`
    })
    return state.name === "future" || state.name === "done" ? undefined : state
  })

  /**
   * The header's STAGE BUTTON while the page is in a stage (epic `epic-engine` P29, Q14):
   * its words, its tooltip, and whether it was pressed (its mark, `stage`, in the inbox).
   * - `undefined` once building, or not reviewed
   * - the tooltip says what's still open:  the open questions ("2 questions open"), a reminder, never a lock
   */
  readonly stageButton = createMemo((): StageButton | undefined => {
    this.signals.layout.get()
    const stage = this.pageStage
    const client = this.review.client
    if (!this.review.reviewing() || !client) return undefined
    if (!PageStages.isPlanning(stage)) return undefined
    const mark = client.inbox.marks[STAGE_ID]
    const accepted = mark?.action === "accept" && mark.stage === stage
    const texts = STAGE_TEXTS[stage]
    const open = this.domElement.querySelectorAll(OPEN_QUESTIONS).length
    const unsent = client.unsentMarkCount + client.unsentCommentCount - (accepted && !client.isSent(mark) ? 1 : 0)
    const still = open
      ? this.translationForKey(open === 1 ? "openQuestionsOne" : "openQuestionsMany", { count: open })
      : this.translationForKey("nothingOpen")
    const tip = accepted
      ? this.translationForKey(texts.accepted)
      : [
          this.translationForKey(texts.tip),
          still,
          unsent ? this.translationForKey("acceptSends", { count: unsent }) : ""
        ]
          .filter(Boolean)
          .join(" · ")
    return { label: this.translationForKey(texts.label), tip, accepted }
  })

  /**
   * While building, Claude's build plans that wait for Owen's Accept, as the header's Send shows them
   * (epic `epic-engine` I119;  Owen, 2026-10-25:  "Accept plan needs to be in the top bar, otherwise I won't see it if
   * it's scrolled off", then "This just needs to be `send|wand` and not green -- I may not be accepting the phases"):
   * - `asks`:  `waiting` (Send ringed:  its border 2px #666) until every one has his mark, then `taken` (dotted)
   * - `tip`:  "2 build plans wait for your Accept:  P43, P44"
   * - `undefined` while none waits, or the page isn't reviewed;  accepting is per phase, on its row
   */
  readonly plansWaiting = createMemo((): { asks: "waiting" | "taken"; tip: string } | undefined => {
    this.signals.layout.get()
    const client = this.review.client
    if (!this.review.reviewing() || !client || PageStages.isPlanning(this.pageStage)) return undefined
    const waiting = Array.from(this.domElement.querySelectorAll(PLANS_WAITING))
    if (!waiting.length) return undefined
    const marked = waiting.every((phase) => !!client.markOf(phase.id))
    const phases = waiting.map((phase) => PhaseIds.labelOf(phase)).join(", ")
    const tip = this.translationForKey(waiting.length === 1 ? "plansWaitOne" : "plansWaitMany", {
      count: waiting.length,
      phases
    })
    return { asks: marked ? "taken" : "waiting", tip }
  })

  /**
   * The step label;  `undefined` for none.
   * - while the epic has a state (`state()`), its icon and colour are the state's, the state's why under its tooltip
   *   (Owen, 2026-10-10:  the state's own mark beside it only repeated it)
   */
  readonly step = createMemo((): StepLabel | undefined => {
    this.signals.layout.get()
    // still being agreed (epic `epic-engine` P29):  the stage, not a phase that may not show yet
    const stage = this.pageStage
    if (PageStages.isPlanning(stage)) {
      // the stage button says it already, in its words:  no second label beside it (and room for the name on a phone)
      if (this.stageButton()) return undefined
      const texts = STAGE_TEXTS[stage]
      return {
        color: "grey",
        icon: "route",
        words: this.translationForKey(texts.step),
        tip: this.translationForKey(texts.stepTip)
      }
    }
    const label = this.phaseStep()
    const state = this.state()
    if (!label || !state) return label
    // the phase's OWN icon, as its row draws it (Owen, 2026-10-24:  "phase icon + top 'P26' are inconsistent");
    // the epic's state colours it and says itself in the tooltip
    return {
      ...label,
      color: state.color as StepLabel["color"],
      tip: `${label.tip ?? label.words}\n${state.tip}`
    }
  })

  /** The page's stage (`stage`):  `building` for none (`PageStages.read()`);  a saga page is always building. */
  get pageStage(): PageStage {
    return this.isSaga ? "building" : PageStages.read(this.stage)
  }

  /** Where the page's marks stand, for Send and the pill;  `undefined` while the page isn't reviewed. */
  readonly marks = createMemo((): HeaderMarks | undefined => {
    const client = this.review.client
    // tracks the client's changes:  every read below follows them
    if (!this.review.reviewing() || !client) return undefined
    const all = Object.values(client.inbox.marks)
    const unsent = client.unsentMarkCount
    const comments = client.unsentCommentCount
    return {
      send: unsent || comments ? "unsent" : all.length ? "sent" : "idle",
      unsent,
      comments,
      waiting: all.filter((mark) => !isImmediate(mark)).length,
      asked: client.inbox.now.length,
      listening: client.listening,
      woken: client.inbox.woken?.message ?? ""
    }
  })

  /**
   * Does the pill show?  Reviewed, nobody can take the work, and something waits:
   * marks SENT and not worked through, a request for now not taken, or a wake to tell of (P16).
   * - NOT for marks and comments not sent yet (epic `epic-engine` I123):  the pill appeared above the page the moment
   *   Owen pressed a button, and everything under it jumped down (Owen, 2026-10-25:  "Screen seems to be jumping a
   *   lot when I click Accept Phase");  Send itself wakes the epic when nobody listens
   * - in airplane mode, unsent ones too:  the pill says how they're taken after the flight
   */
  readonly hasPill = createMemo((): boolean => {
    const marks = this.marks()
    if (!marks) return false
    if (isAirplane()) return !!(marks.unsent || marks.comments || marks.waiting || marks.asked || marks.woken)
    if (marks.listening) return false
    return marks.waiting - marks.unsent > 0 || !!(marks.asked || marks.woken)
  })

  /**
   * The toolbar's state chips:  every section's filter (`DOMEpicSectionElement.stateFilter`) added up.
   * - a state is on while every section having it shows it
   * - read again on every layout change and section filter change, and after every mark (`followMarks`):
   *   a marked item leaves its state's count
   */
  readonly filterChips = createMemo((): StateFilterEntry[] => {
    this.signals.layout.get()
    void this.filterTick
    if (isServer) return []
    const totals = new Map<string, StateFilterEntry>()
    for (const section of this.filterHosts()) {
      for (const entry of section.stateFilter ?? []) {
        const total = totals.get(entry.state)
        if (total) totals.set(entry.state, { ...total, count: total.count + entry.count, on: total.on && entry.on })
        else totals.set(entry.state, { ...entry })
      }
    }
    return FILTER_STATES.flatMap((it) => totals.get(it.state) ?? [])
  })

  /**
   * Each section's `markedCount` and chip counts, as one string (`"2/open:3 0/ 1/attention:1"`):  what
   * `followMarks()` follows.
   * - read again on every layout change and section filter change too:  a section drawn later counts from then
   * - a string, so an unchanged one stops there (the memo's `===`), and the bump it causes ends
   */
  readonly markedCounts = createMemo((): string => {
    this.signals.layout.get()
    void this.filterTick
    if (isServer) return ""
    // each section's chip counts too:  an item being worked on moves from red to blue (I147)
    return this.filterHosts()
      .map((section) => `${section.markedCount ?? 0}/${section.chipCounts ?? ""}`)
      .join(" ")
  })

  /**
   * The items marked in this pass, every section's added up (epic `epic-engine` P43):  the toolbar's blue badge.
   * - tracked:  each section's `markedCount` follows the review inbox
   */
  readonly markedTotal = createMemo((): number =>
    this.markedCounts()
      .split(" ")
      .reduce((total, entry) => total + (Number.parseInt(entry, 10) || 0), 0)
  )

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * While connected and drawn, watch the subtree (numbers, step label) and the headers' heights (`top`).
   * - `isReady` too:  the header must be drawn to be measured.
   * - Its own `MutationObserver`, not `@watches`:
   *   it bumps `layout`, a page-wide signal the page's blocks read too (`signalsOf()`), not a member of its own.
   * - Its own `ResizeObserver` (no decorator watches sizes), and the window's `resize`.
   */
  @E.onChange("isConnected", "isReady")
  protected watchLayout(connected: boolean, ready: boolean) {
    if (!connected || !ready) return undefined
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- only while connected and drawn;  bumps a page signal
    const mutations = new MutationObserver(this.bumpLayout)
    mutations.observe(this.domElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: LAYOUT_ATTRIBUTES
    })
    const resizes = new ResizeObserver(() => this.measure())
    for (const box of [this.header, this.bar]) if (box) resizes.observe(box)
    const site = document.querySelector("spell-site-header")
    if (site) resizes.observe(site)
    const listeners = new AbortController()
    window.addEventListener("resize", this.measure, { signal: listeners.signal })
    this.measure()
    // the toolbar's chips, once the sections have drawn (`onFilter()` follows their changes after that)
    void E.DOMElement.whenAttached(SECTIONS)
      .then(() => Promise.all(this.filterHosts().map((section) => section.ready)))
      .then(this.bumpFilters)
    return () => {
      mutations.disconnect()
      resizes.disconnect()
      listeners.abort()
    }
  }

  /** A layout bump queued:  one per batch of mutations. */
  private isLayoutQueued = false

  /** The subtree changed:  `layout` bumped once Solid's current update is done (one bump per batch). */
  private readonly bumpLayout = () => {
    if (this.isLayoutQueued) return
    this.isLayoutQueued = true
    E.afterSolidUpdate(() => {
      this.isLayoutQueued = false
      this.signals.layout.set(this.signals.layout.get() + 1)
    })
  }

  /** A section's filter changed:  the toolbar's chips follow (`bumpFilters()`). */
  @E.on("epic-filter-changed")
  protected onFilter() {
    this.bumpFilters()
  }

  /**
   * The toolbar's chips read again:
   * after Solid's update, so the sections' own memos (what shows) have taken the change.
   */
  private readonly bumpFilters = () =>
    E.afterSolidUpdate(() => {
      this.filterTick++
    })

  /** Each section's `markedCount`, as one string (`markedCounts`):  what `followMarks()` follows. */
  get sectionMarks(): string {
    return this.markedCounts()
  }

  /**
   * A mark came or went in any section (its `markedCount`, P43):  the toolbar's chips read again, once the sections'
   * own counts have taken it (`bumpFilters()`).
   * - not read in `filterChips` itself:  there the sections' counts could still be the old ones
   */
  @E.onChange("sectionMarks")
  protected followMarks() {
    this.bumpFilters()
  }

  /** Follow the review inbox while connected (kept alive:  a removed page stops). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  ////////////////
  // ## See Also
  ////////////////

  /** The pages the epic made or leans on (`GET /api/epics/pages`), in the server's order;  none until asked. */
  @E.state accessor seeAlso: SeeAlsoLink[] = []

  /** The saga the epic serves, as the page server says it (`GET /api/epics/pages`'s `saga`);  none until asked. */
  @E.state accessor sagaLink: SagaLink | undefined = undefined

  /**
   * Ask for them while connected, and again when a page in the epic's folder changes:  a details page made, a part
   * linking a guide (never its inbox files, which change with every mark).
   */
  @E.whileConnected
  protected followSeeAlso() {
    if (isServer || !ServerLink.canRead() || !this.epic || this.isSaga) return undefined
    const folder = `/epics/${this.epic}/`
    void this.loadSeeAlso()
    const isEpicPage = (path: string) => path.includes(folder) && path.endsWith(".html")
    return ServerLink.watch(window, isEpicPage, () => void this.loadSeeAlso(), { every: 0 })
  }

  /** Ask the page server for the epic's pages;  a server without the route, or none at all:  none. */
  @E.untracked
  private async loadSeeAlso() {
    try {
      const answer = await ServerLink.forPage().get<{ pages?: SeeAlsoLink[]; saga?: SagaLink | null }>(
        "/api/epics/pages",
        { query: { epic: this.epic ?? "" } }
      )
      if (!answer) return
      const { pages, saga } = answer
      this.seeAlso = Array.isArray(pages) ? pages : []
      this.sagaLink = saga ?? undefined
    } catch {
      // no page server:  no box
    }
  }

  /** The See Also box:  a folding card, each page a link with its kind and the day it last changed. */
  private seeAlsoBox(): JSX.Element {
    return (
      <details class={SEE_ALSO} part={this.partForName("see-also")} open>
        <summary>
          {this.translationForKey("seeAlso")}
          <span class="see-also-count">{this.seeAlso.length}</span>
        </summary>
        <ul>
          <For each={this.seeAlso}>
            {(page) => (
              <li data-kind={page.kind}>
                <ui-icon name={SEE_ALSO_KINDS[page.kind]?.icon ?? "circle question"} />
                <a href={page.href} target={`${this.epic}-${page.href}`}>
                  {page.title}
                </a>
                <span class="see-also-kind">
                  {this.translationForKey(SEE_ALSO_KINDS[page.kind]?.key ?? "seeAlsoDetails")}
                </span>
                <time datetime={page.updated} title={new Date(page.updated).toLocaleString()}>
                  {PlanDates.formatDate(new Date(page.updated), false)}
                </time>
              </li>
            )}
          </For>
        </ul>
      </details>
    )
  }

  render(): JSX.Element {
    return (
      // an EMPTY title:  the DOM element's `title` would otherwise be a tooltip over the whole page (T8)
      <div class={this.rootClass} part={this.partForName("base")} title="" style={this.pageStyle()}>
        <header ref={(element) => (this.header = element)} class={HEAD} part={this.partForName("header")}>
          <h1 class={HEADING} part={this.partForName("heading")}>
            <Show when={!this.hasOldCrumbs()}>{this.crumbs()}</Show>
            <button
              type="button"
              class={HEADING_COPY}
              title={this.translationForKey("copyHeading", {
                name: this.isSaga ? (this.saga ?? "") : (this.epic ?? ""),
                command: this.headingCommand()
              })}
              onClick={() => this.copyHeading()}
            >
              {this.isSaga ? this.saga : this.epic}
            </button>
          </h1>
          {/* the header's middle (Owen's comment C7):  Send, then what the session is doing, a bare spinner (T53) */}
          <span class={CENTRE} part={this.partForName("centre")}>
            <Show when={this.marks()}>{(marks) => this.sendButtons(marks)}</Show>
            {this.isSaga ? undefined : <epic-agents draws="spinner" part={this.partForName("spinner")} />}
          </span>
          <span class={STATUS} part={this.partForName("status")}>
            <Show when={this.bedtime}>
              {(phases) => (
                <ui-label
                  class="bedtime-label"
                  appearance="basic"
                  color="violet"
                  icon="bed"
                  title={this.translationForKey("bedtimeTip", { phases: phases() })}
                >
                  <span class="bedtime">{this.translationForKey("bedtime", { phases: phases() })}</span>
                </ui-label>
              )}
            </Show>
            {/* ONE pill (Owen, 2026-10-25):  the step label, then the agents running;  one rim, the label's colour */}
            <span
              class={STEP_PILL}
              part={this.partForName("step-pill")}
              style={{
                "--epic-pill-color": `var(--ui-${pillColorOf(this.step()?.color)})`,
                "--epic-pill-ink": `var(--ui-${pillColorOf(this.step()?.color)}-text)`
              }}
            >
              <Show when={this.step()}>
                {(step) => (
                  <ui-label
                    part={this.state() ? this.partForName("state") : undefined}
                    data-state={this.state()?.name}
                    appearance={step().color === "green" ? undefined : "basic"}
                    color={pillColorOf(step().color)}
                    icon={step().icon}
                    link={step().href}
                    title={step().tip}
                  >
                    {step().words}
                  </ui-label>
                )}
              </Show>
              {/* the agents running, its third part (Owen, 2026-10-25:  "belongs in the top bar with pencil | P36") */}
              {this.isSaga ? undefined : <epic-agents draws="agents" part={this.partForName("agents-pill")} />}
            </span>
            {this.gear()}
          </span>
        </header>
        <div ref={(element) => (this.bar = element)} class={BAR} part={this.partForName("bar")}>
          {this.toolbar()}
        </div>
        {this.reviewLine()}
        <Show when={this.hasPill()}>{this.pill()}</Show>
        {this.isSaga ? this.sagaMetaLines() : this.metaLines()}
        <Show when={this.future}>{this.futureNotice()}</Show>
        <Show when={this.planning()}>{this.hungNotice()}</Show>
        <Show when={this.seeAlso.length}>{this.seeAlsoBox()}</Show>
        <slot />
      </div>
    )
  }

  /**
   * The crumbs before the epic's name, in the h1:  `Docs / Epics /`, the docs' eyebrow;  the name after them is the
   * h1's own button (Owen, 2026-10-13:  "Just go with a single set of breadcrumbs").
   */
  private crumbs(): JSX.Element {
    return (
      <span class={CRUMBS} part={this.partForName("crumbs")}>
        <ui-breadcrumbs
          class={CRUMBS}
          part={this.partForName("crumbs")}
          size="small"
          aria-label={this.translationForKey("crumbs")}
        >
          <ui-breadcrumb link={CRUMB_LINKS.docs.href} target={CRUMB_LINKS.docs.target}>
            {this.translationForKey("crumbDocs")}
          </ui-breadcrumb>
          <ui-breadcrumb
            link={CRUMB_LINKS[this.isSaga ? "sagas" : "epics"].href}
            target={CRUMB_LINKS[this.isSaga ? "sagas" : "epics"].target}
          >
            {this.translationForKey(this.isSaga ? "crumbSagas" : "crumbEpics")}
          </ui-breadcrumb>
        </ui-breadcrumbs>
        <span class="crumb-divider" aria-hidden="true">
          /
        </span>
      </span>
    )
  }

  /** The meta lines:  branch, worktree, dates, saga, guide. */
  private metaLines(): JSX.Element {
    return (
      <ul class={META} part={this.partForName("meta")} onClick={(event) => this.copyMeta(event)}>
        <li>
          {this.icon(this.icons.branch)}
          <span>
            <Show
              when={this.branch}
              fallback={
                <>
                  {this.translationForKey("futureEpic")} <code>/epic future {this.epic}</code>,{" "}
                  {this.translationForKey("noBranch")}
                </>
              }
            >
              {this.translationForKey("planDoc")} <code>/epic {this.epic}</code>, {this.translationForKey("branch")}{" "}
              <code>{this.branch}</code>
            </Show>
          </span>
        </li>
        <li>
          {this.icon(this.icons.folder)}
          <span>
            {this.translationForKey("worktree")}{" "}
            <Show when={this.worktree} fallback={this.translationForKey("noWorktree")}>
              <code class="path">{this.worktree}</code>
            </Show>
          </span>
        </li>
        <Show when={this.started || this.updated}>
          <li>
            {this.icon(this.icons.calendar)}
            <span>
              <Show when={this.started}>
                {this.translationForKey("started")}{" "}
                <time datetime={this.started}>{PlanDates.format(this.started)}</time>
              </Show>
              <Show when={this.started && this.updated}>, </Show>
              <Show when={this.updated}>
                {this.translationForKey("updated")}{" "}
                <time datetime={this.updated}>{PlanDates.format(this.updated)}</time>
              </Show>
            </span>
          </li>
        </Show>
        <Show when={this.saga}>{(saga) => this.sagaLine(saga())}</Show>
        <li class="durable" hidden={!this.slots.hasContent(this.slotForName("durable"))}>
          {this.icon(this.icons.book)}
          <span>
            <b>{this.translationForKey("durable")}</b> <slot name={this.slotForName("durable")} />
          </span>
        </li>
      </ul>
    )
  }

  /** A saga page's meta lines:  its short address (copied on click, as every meta line's code), then its dates. */
  private sagaMetaLines(): JSX.Element {
    return (
      <ul class={META} part={this.partForName("meta")} onClick={(event) => this.copyMeta(event)}>
        <li>
          {this.icon(this.icons.book)}
          <span>
            {this.translationForKey("sagaPage")} <code>{this.sagaAddress()}</code>
          </span>
        </li>
        <Show when={this.started || this.updated}>
          <li>
            {this.icon(this.icons.calendar)}
            <span>
              <Show when={this.started}>
                {this.translationForKey("started")}{" "}
                <time datetime={this.started}>{PlanDates.format(this.started)}</time>
              </Show>
              <Show when={this.started && this.updated}>, </Show>
              <Show when={this.updated}>
                {this.translationForKey("updated")}{" "}
                <time datetime={this.updated}>{PlanDates.format(this.updated)}</time>
              </Show>
            </span>
          </li>
        </Show>
      </ul>
    )
  }

  /**
   * The saga's meta line:  `Saga:` and a link to its saga page, by title once the page server says it (`sagaLink`),
   * else by its id (`id`).
   */
  private sagaLine(id: string): JSX.Element {
    const known = () => (this.sagaLink?.id === id ? this.sagaLink : undefined)
    return (
      <li class="saga">
        {this.icon(this.icons.saga)}
        <span>
          <b>{this.translationForKey("saga")}</b>{" "}
          <a
            href={known()?.href ?? sagaHref(id)}
            target={`saga-${id}`}
            title={known() ? this.translationForKey("sagaTip", { purpose: known()!.purpose }) : undefined}
          >
            {known()?.title ?? id}
          </a>
        </span>
      </li>
    )
  }

  /**
   * The sticky bar's last row, the TOOLBAR (epic `airplane` P8), in its order:
   * - the docs runtime's section buttons (`slot="toolbar"`)
   * - at the right:  the page's state filter (`pageFilter()`), then expand-all and collapse-all
   *   - what Claude is doing went up to the header, a spinner beside Send (epic `epic-engine` P53, T53)
   * - no new item button:  each item section has its own, on its title
   *   (Owen, 2026-10-13:  "Remove "comment" icon from top header -- add it to question/todo/issue/test headers")
   */
  private toolbar(): JSX.Element {
    return (
      <div class={TOOLBAR} part={this.partForName("toolbar")}>
        <slot name={this.slotForName("toolbar")} />
        <span class={TOOLBAR_TOOLS}>
          {this.pageFilter()}
          {/* ONE toggle (Owen, 2026-10-25):  open everything, then fold everything */}
          {Fold.toggleAllButton({
            expandLabel: this.translationForKey("expandAll"),
            collapseLabel: this.translationForKey("collapseAll"),
            part: this.partForName("toggle-all"),
            expanded: () => this.allOpen,
            onToggle: () => {
              this.allOpen = !this.allOpen
              if (this.allOpen) this.expandAll()
              else this.collapseAll()
            }
          })}
        </span>
      </div>
    )
  }

  /**
   * The page's state filter, in the toolbar:  a chip per state the page's items are in, with how many
   * (`<epic-state-filter>`, the one chip element:  epic `epic-engine` P3).
   * - solid while EVERY section showing that state shows it
   * - a click (`epic-state-changed`) filters every section at once, by the sections' own rule
   *   (`StateFilter.nextShown()`);  an ⌥-click, only its state (I166)
   * - the items marked in this pass in its blue badge, left of the chips, whatever the filter (P43)
   */
  private pageFilter(): JSX.Element {
    const chips = () => this.filterChips()
    return (
      <Show when={chips().length || this.markedTotal()}>
        <span class={FILTER} part={this.partForName("filter")}>
          <epic-state-filter
            counts={chips()
              .map((chip) => `${chip.state}:${chip.count}`)
              .join(" ")}
            shown={
              chips().every((chip) => chip.on)
                ? undefined
                : chips()
                    .filter((chip) => chip.on)
                    .map((chip) => chip.state)
                    .join(" ")
            }
            marked={this.markedTotal() || undefined}
          />
        </span>
      </Show>
    )
  }

  /** A toolbar chip, clicked (`<epic-state-filter>`'s `epic-state-changed`):  every section filtered at once. */
  @E.on(STATE_PICK, { target: "renderRoot" })
  protected onStatePick(event: CustomEvent<StatePickDetail>) {
    event.stopPropagation()
    this.pickState(event.detail.state, event.detail.how)
  }

  /**
   * Send (`<epic-send-buttons countdown>`), at the header's middle, with Auto Send's ring.
   * - the plane by the fill rule (Q20), its tooltip what a press sends, or why it sends nothing
   * - a press, or the countdown running out:  `onSendAsked()`
   */
  private sendButtons(marks: () => HeaderMarks): JSX.Element {
    const stage = () => this.stageButton()
    const plans = () => this.plansWaiting()
    const sendTip = () => {
      const words = this.sendWords(marks())
      return plans() ? `${plans()!.tip} · ${words}` : words
    }
    return (
      <epic-send-buttons
        class={SEND}
        part={this.partForName("send")}
        state={marks().send}
        countdown=""
        accept={stage()?.label}
        accepted={stage()?.accepted ? "" : undefined}
        asks={plans()?.asks}
        send-tip={
          stage()
            ? this.withNobody(stage()!.tip, marks(), true)
            : this.withNobody(sendTip(), marks(), marks().send !== "idle")
        }
      />
    )
  }

  /**
   * Send asked for (`<epic-send-buttons>`'s `epic-send-saving`):  the plane sends what's unsent (`ReviewClient.send()`);
   * the countdown sends as Review Now did, every revisit asked now (decision Q7).
   * - a press with nothing to send says so on the notice line
   */
  @E.on(SEND_ASKED, { target: "renderRoot" })
  protected onSendAsked(event: CustomEvent<SendAskedDetail>) {
    event.stopPropagation()
    if (!event.detail.auto && this.stageButton()) void this.accept()
    else void this.review.client?.send({ now: event.detail.auto })
  }

  /**
   * The STAGE BUTTON pressed (Accept Overview, Accept Phases;  epic `epic-engine` P29):
   * the page's accept mark (`{ action: "accept", stage }`, keyed `stage`), then Send,
   * so it goes at once with whatever else is unsent, and wakes the epic when nobody listens.
   * - pressed again once accepted:  sent again, nothing more (the mark stands until the session applies it)
   */
  @E.untracked
  private async accept() {
    const client = this.review.client
    if (!client) return
    const stage = this.pageStage
    if (!PageStages.isPlanning(stage)) return
    const mark = client.markOf(STAGE_ID)
    if (mark?.action !== "accept" || mark.stage !== stage) {
      if (!(await client.save(STAGE_ID, { action: "accept", stage }))) return
    }
    await client.send()
  }

  /**
   * The pill under the review line, while work waits and nobody can take it (`hasPill()`):
   * no Claude session listening (orange), or airplane mode.
   * - what the page server's wake did, once a Send woke the epic (epic `epic-workflow` P16):
   *   `Typed /epic review <name> into 🚧 <name>:  press Enter there`, until a session listens
   * - a click copies the review line's command (`/epic review <name>`, `/airplane land`), and, out of airplane
   *   mode, starts the review in the epic's own session (`copyCommand()`), woken or not
   */
  private pill(): JSX.Element {
    const woken = () => (isAirplane() ? "" : (this.marks()?.woken ?? ""))
    return (
      <button
        type="button"
        class={[PILL, { airplane: isAirplane(), flash: this.isCopied }]}
        part={this.partForName("pill")}
        title={this.translationForKey(isAirplane() ? "copyCommand" : "startReview")}
        onClick={() => void this.copyCommand()}
      >
        <Show
          when={woken()}
          fallback={
            <>
              {this.translationForKey(isAirplane() ? "airplanePill" : "nobodyPill")} <code>{this.command()}</code>
            </>
          }
        >
          {woken()}
        </Show>
      </button>
    )
  }

  /** Send's words:  what a click sends (`2 marks, 1 comment`), or why it sends nothing. */
  private sendWords(marks: HeaderMarks): string {
    if (marks.send === "unsent")
      return this.translationForKey("send", { what: this.countWords(marks.unsent, marks.comments) })
    return this.translationForKey(marks.send === "sent" ? "sent" : "sendIdle")
  }

  /** `marks` marks and `comments` comments, in words:  `2 marks, 1 comment`;  either left out at 0. */
  private countWords(marks: number, comments: number): string {
    const counted = [
      marks ? this.translationForKey(marks === 1 ? "marksOne" : "marksMany", { count: marks }) : "",
      comments ? this.translationForKey(comments === 1 ? "commentsOne" : "commentsMany", { count: comments }) : ""
    ]
    return counted.filter(Boolean).join(", ")
  }

  /** A button's tooltip:  `words`, then that nobody is reviewing when nobody listens and there's something waiting. */
  private withNobody(words: string, marks: HeaderMarks, waiting: boolean): string {
    return marks.listening || !waiting ? words : `${words}.  ${NOBODY_LISTENING}`
  }

  /**
   * The review line:  `To review this doc, type /epic review <name>` (in airplane mode `/airplane land`).
   * - a click copies the command
   * - nobody listening:  the pill under it says so (`pill()`), and copies it too
   */
  private reviewLine(): JSX.Element {
    return (
      <button
        type="button"
        class={[REVIEW_LINE, { flash: this.isCopied }]}
        part={this.partForName("review-line")}
        title={this.translationForKey("copyCommand")}
        onClick={() => void this.copyCommand()}
      >
        {this.icon(this.icons.copy)}
        <span>
          {this.translationForKey(isAirplane() ? "reviewLineAirplane" : "reviewLine")} <code>{this.command()}</code>
        </span>
        <span class="done" aria-live="polite">
          {this.isCopied ? this.translationForKey("copied") : ""}
        </span>
      </button>
    )
  }

  /** `/epic resume <name>`:  what a click on the heading's name copies;  a saga page's, its review command. */
  private headingCommand(): string {
    return this.isSaga ? `/epic review ${this.sagaAddress()}` : `/epic resume ${this.epic ?? ""}`
  }

  /**
   * What the review line copies:  `/epic review <name>` (a saga page's `/epic review SAGA:/<id>`), or
   * `/airplane land` in airplane mode.
   */
  private command(): string {
    if (isAirplane()) return AIRPLANE_LAND
    return `/epic review ${this.isSaga ? this.sagaAddress() : (this.epic ?? "")}`
  }

  /** A saga page's short address, as `/epic review` and the `epic` tool take it:  `SAGA:/drawable-spell`. */
  private sagaAddress(): string {
    return `${SAGA_PREFIX}${this.saga ?? ""}`
  }

  /** A saga page (`kind="saga"`):  a saga's page, not an epic's. */
  get isSaga(): boolean {
    return this.kind === SAGA_KIND
  }

  ////////////////
  // ## The gear (epic `epic-engine` P53)
  ////////////////

  /**
   * The header's GEAR, where the git toggle was (Owen, 2026-10-29:  "Turning it off could be from a gear menu in the
   * epic page header which replaces this"):  a round icon button opening a small menu of SETTINGS, two rows, each
   * opening a sub-menu beside it
   * - Auto Send · 2 minutes (Owen's comment C8, J160):  Immediately, 2 minutes, 5 minutes, then Off under a divider;
   *   the chosen one ticked (`SendCountdown.choose()`, remembered in this browser for every page)
   * - Theme · Paper (Owen's comment C9, J162):  Spell UI's own theme menu in its menu mode (`<ui-theme-menu
   *   show="menu" bench="none">`):  Light / Dark / Auto and the themes, no Theme bench, no Edit theme;  the site
   *   header's palette keeps the same choice
   * - a sub-menu opens on a click, Enter, Space or the right arrow;  the left arrow or Escape closes it, back to its
   *   row;  up and down move between rows
   * - beside the rows, to their left;  where the window is too narrow for both, under them
   * - no "Show commits":  every commit is in the Log (P52), and each phase and item has its own git button (J163)
   */
  private gear(): JSX.Element {
    return (
      <>
        <button
          type="button"
          id={GEAR_ID}
          class={GEAR}
          part={this.partForName("gear")}
          aria-label={this.translationForKey("gearTip")}
          title={this.translationForKey("gearTip")}
        >
          {this.icon(this.icons.gear)}
        </button>
        <ui-popup
          for={GEAR_ID}
          class={GEAR_MENU}
          part={this.partForName("gear-menu")}
          open-on="click"
          appearance="basic"
          position="bottom right"
          aria-label={this.translationForKey("gearTip")}
          ref={(popup: HTMLElement) => this.wireGear(popup)}
        >
          <div class="gear-panel">
            <div class={GEAR_ROWS} role="menu" aria-label={this.translationForKey("gearTip")} onKeyDown={this.onRowKey}>
              {this.gearRow("autoSend", this.translationForKey("autoSend"), this.autoSendWords(this.autoSend))}
              {this.gearRow("theme", this.translationForKey("theme"), this.themeTitle)}
            </div>
            <div
              class={[GEAR_SUB, "auto-send"]}
              part={this.partForName("auto-send")}
              role="menu"
              aria-label={this.translationForKey("autoSend")}
              hidden={this.subMenu !== "autoSend"}
              onKeyDown={this.onSubKey}
            >
              <For each={AUTO_SEND_CHOICES}>
                {(choice) => (
                  <>
                    <Show when={choice === "off"}>
                      <div class="divider" role="separator" />
                    </Show>
                    <button
                      type="button"
                      class={["choice", { checked: this.autoSend === choice }]}
                      role="menuitemradio"
                      value={choice}
                      aria-checked={this.autoSend === choice ? "true" : "false"}
                      tabindex="-1"
                      onClick={() => this.chooseAutoSend(choice)}
                    >
                      <ui-icon name="check" class="tick" aria-hidden="true" padding="none" />
                      <span>{this.autoSendWords(choice)}</span>
                    </button>
                  </>
                )}
              </For>
            </div>
            {/* always drawn (hidden while closed):  the Theme row reads its choice */}
            <div
              class={[GEAR_SUB, "theme"]}
              part={this.partForName("theme-menu")}
              role="group"
              aria-label={this.translationForKey("theme")}
              hidden={this.subMenu !== "theme"}
              onKeyDown={this.onSubKey}
            >
              <ui-theme-menu show="menu" bench="none" ref={(menu: HTMLElement) => this.adoptThemeMenu(menu)} />
            </div>
          </div>
        </ui-popup>
      </>
    )
  }

  /** One of the gear's rows:  `Auto Send · 2 minutes`, a chevron;  opens its sub-menu. */
  private gearRow(sub: GearSub, name: string, value: string): JSX.Element {
    return (
      <button
        type="button"
        class={[GEAR_ROW, { open: this.subMenu === sub }]}
        part={this.partForName("gear-row")}
        role="menuitem"
        value={sub}
        aria-haspopup="menu"
        aria-expanded={this.subMenu === sub ? "true" : "false"}
        tabindex="-1"
        onClick={() => this.openSub(sub)}
      >
        <span class="name">{name}</span>
        <Show when={value}>
          <span class={GEAR_VALUE}>
            {" · "}
            {value}
          </span>
        </Show>
        <ui-icon name="chevron right" class="chevron" aria-hidden="true" padding="none" />
      </button>
    )
  }

  /** Auto Send's choice in words:  `Immediately`, `2 minutes` ... */
  private autoSendWords(choice: AutoSend): string {
    return this.translationForKey(AUTO_SEND_TEXTS[choice])
  }

  /** The page's countdown:  the gear chooses its Auto Send;  none in a server render. */
  readonly countdown = isServer ? undefined : SendCountdown.forPage()

  /** Auto Send as chosen, a copy of the countdown's (`followCountdown()`):  the gear's row and ticks read it. */
  @E.state accessor autoSend: AutoSend = this.countdown?.choice ?? "2m"

  /** The gear's sub-menu open:  `autoSend`, `theme`, or none. */
  @E.state accessor subMenu: GearSub | undefined = undefined

  /** The theme sub-menu's element, once drawn;  its component ready (`themeMenuReady`):  the Theme row reads it. */
  private themeMenu: ThemeMenuElement | undefined

  /** The theme sub-menu's component is ready:  `themeTitle` reads its choice from then on. */
  @E.state accessor themeMenuReady = false

  /** The page's theme, its title (`Paper`), from the theme menu (which follows every menu on the page). */
  get themeTitle(): string {
    void this.themeMenuReady
    const theme = this.themeMenu?.component?.chosenTheme ?? (isServer ? undefined : UI.themes?.current)
    return theme ? UIT.ThemeNames.titleOf(theme) : ""
  }

  /** While connected:  follow the countdown's choice (another page, or this page's gear);  returns the undo. */
  @E.whileConnected
  protected followCountdown() {
    const countdown = this.countdown
    if (!countdown) return undefined
    this.autoSend = countdown.choice
    return countdown.subscribe(() => (this.autoSend = countdown.choice))
  }

  /** The theme sub-menu drawn:  keep it, and hear when its component is ready. */
  private adoptThemeMenu(menu: HTMLElement) {
    this.themeMenu = menu as ThemeMenuElement
    void customElements
      .whenDefined(menu.localName)
      .then(() => this.themeMenu?.ready)
      .then(() => (this.themeMenuReady = true))
      .catch((failure: unknown) => console.error("EpicPage:  the gear's theme menu didn't load", failure))
  }

  /** The gear's menu:  on opening, every sub-menu closed and the first row focused;  on closing, the sub-menus too. */
  private wireGear(popup: HTMLElement) {
    popup.addEventListener("toggle", (event) => {
      this.subMenu = undefined
      if ((event as ToggleEvent).newState === "open") this.rows(popup)[0]?.focus()
    })
  }

  /** The gear's rows, in order. */
  private rows(root: ParentNode): HTMLButtonElement[] {
    return [...root.querySelectorAll<HTMLButtonElement>(`.${GEAR_ROW}`)]
  }

  /** Open sub-menu `sub` beside its row, and focus its choice. */
  @E.untracked
  private openSub(sub: GearSub) {
    this.subMenu = sub
    E.afterSolidUpdate(() => {
      if (sub === "theme") return this.themeMenu?.component?.focusChosen()
      const box = this.domElement.shadowRoot?.querySelector<HTMLElement>(`.${GEAR_SUB}.auto-send`)
      box?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    })
  }

  /** Close the sub-menu open, back to its row. */
  @E.untracked
  private closeSub() {
    const sub = this.subMenu
    if (!sub) return
    this.subMenu = undefined
    this.domElement.shadowRoot?.querySelector<HTMLElement>(`.${GEAR_ROW}[value="${sub}"]`)?.focus()
  }

  /** Auto Send `choice` picked:  the countdown takes it (and remembers it);  back to its row. */
  @E.untracked
  private chooseAutoSend(choice: AutoSend) {
    this.countdown?.choose(choice)
    this.closeSub()
  }

  /** A key on the gear's rows:  up and down move;  the right arrow opens a row's sub-menu (Enter and Space click). */
  private readonly onRowKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    const row = (event.target as Element).closest?.(`.${GEAR_ROW}`) as HTMLButtonElement | null
    if (!row) return
    if (event.key === "ArrowRight") {
      event.preventDefault()
      return this.openSub(row.value as GearSub)
    }
    if (moveFocus(event, this.rows(row.parentElement!))) event.preventDefault()
  }

  /**
   * A key in a sub-menu:  the left arrow or Escape closes it (Escape never reaches the menu's own, which would close
   * it all);  up and down move between Auto Send's choices.
   * - a key the theme menu took (its Light / Dark / Auto arrows) is left alone
   */
  private readonly onSubKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (event.key === "ArrowLeft" || event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      return this.closeSub()
    }
    const box = event.currentTarget as HTMLElement
    if (!box.classList.contains("auto-send")) return
    if (moveFocus(event, [...box.querySelectorAll<HTMLButtonElement>("button")])) event.preventDefault()
  }

  /** A doc still planning:  the folded `Plan hung?` aside -- how to restart the session, and the prompt to copy. */
  private hungNotice(): JSX.Element {
    return (
      <details class={HUNG} part={this.partForName("hung")}>
        <summary title={this.translationForKey("hungTip")}>
          <span class="chevron" aria-hidden="true">
            {this.icons.chevron.svg}
          </span>
          {this.translationForKey("hung")}
        </summary>
        <div class="aside">
          <p>
            {this.translationForKey("hungBefore")} <code>/epic {this.epic}</code> {this.translationForKey("hungAfter")}
          </p>
          <Show when={this.prompt()}>
            <ui-code language="text" wrap="" copy="">
              {this.prompt()}
            </ui-code>
          </Show>
        </div>
      </details>
    )
  }

  /** A future epic's notice:  not planned yet, and where its open questions are. */
  private futureNotice(): JSX.Element {
    return (
      <ui-message
        class={NOTICE}
        part={this.partForName("notice")}
        state="info"
        size="small"
        heading={this.translationForKey("futureHeader")}
      >
        <p>
          {this.translationForKey("futureBody")}{" "}
          <a href="details/analysis.html">{this.translationForKey("analysisPage")}</a>. <code>/epic {this.epic}</code>{" "}
          {this.translationForKey("futurePlan")}
        </p>
      </ui-message>
    )
  }

  /** An icon's box:  its glyph centred on the first line of what follows. */
  private icon(glyph: E.IconGlyph): JSX.Element {
    return (
      <span class={ICON} aria-hidden="true">
        {glyph.svg}
      </span>
    )
  }

  /**
   * The wrapper's inline style, for everything below:
   * - the sticky stack below this header and its bar (`--epic-stack`)
   * - where the bar sticks (`--epic-head-h`)
   */
  private pageStyle(): Record<string, string> {
    const style: Record<string, string> = {
      [STACK_PROPERTY]: `${this.signals.top.get()}px`,
      [HEAD_PROPERTY]: `${this.headHeight}px`
    }
    return style
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /**
   * A toolbar chip, clicked:  every section filtered at once, by the sections' own rule (`StateFilter.nextShown()`);
   * ⌥-clicked (`how`, I166), only its state.
   * - everything again:  each section's choice forgotten, so a state that comes later shows too
   */
  @E.untracked
  private pickState(state: string, how: ChipPick = "click") {
    const chips = this.filterChips()
    const present = chips.map((it) => it.state as string)
    const next = StateFilter.nextShown(
      present,
      chips.filter((it) => it.on).map((it) => it.state),
      state,
      how
    )
    const states = next.length === present.length ? undefined : next
    for (const section of this.filterHosts()) if (section.stateFilter) section.showStates?.(states)
  }

  /**
   * The toolbar's collapse-all:  every block, item, card and panel on the page folded (`foldAllUnder()`),
   * then the page back at its top, where the folded blocks now all show (Owen, 2026-10-10).
   */
  @E.untracked
  private collapseAll() {
    foldAllUnder(this.domElement)
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  /** The toolbar's toggle-all, its last use:  everything opened. */
  @E.state accessor allOpen = false

  /**
   * The toolbar's expand-all:  every section, phase and item on the page opened (`expandAllUnder()`),
   * but the Log, which stays folded (`EpicSection.staysFolded`).
   */
  @E.untracked
  private expandAll() {
    expandAllUnder(this.domElement)
  }

  /** The sections below that have a state filter (`DOMEpicSectionElement`):  the item sections. */
  private filterHosts(): FilterHost[] {
    // not the sections the page's stage hides (P29):  their chips would count what doesn't show
    return Array.from(this.domElement.querySelectorAll<FilterHost>(SECTIONS)).filter(
      (section) => !PageStages.hides(section)
    )
  }

  /**
   * The review line or the pill, clicked:  copy the command, then flash and say so.
   * - nobody listening, not in airplane mode:  start the review too (epic `airplane` P12)
   *   - the page server types `/epic review <name>` into the session titled for the epic,
   *     or says why it didn't (`ReviewClient.startReview()`)
   *   - its notice is the ONE toast, and says it's copied too:
   *     a "Copied" toast beside it stacked two over the test run's bar (epic `epic-engine` I78)
   */
  @E.untracked
  private async copyCommand() {
    const client = this.review.client
    const isStarting = Boolean(client && !client.listening && !isAirplane())
    if (isStarting) void client!.startReview()
    if (!(await (isStarting ? E.copyText(this.command()) : this.copyAndSay(this.command())))) return
    // off first, so a second click flashes again
    this.isCopied = false
    this.flashTimer?.cancel()
    E.beforeNextPaint(() => (this.isCopied = true))
    this.flashTimer = E.after((FLASH_MS + 600) / 1000, () => (this.isCopied = false))
  }

  /** The heading's name, clicked:  copy `/epic resume <name>`. */
  @E.untracked
  private copyHeading() {
    void this.copyAndSay(this.headingCommand())
  }

  /** A meta line's command or path (its `<code>`), clicked:  copy its text. */
  @E.untracked
  private copyMeta(event: MouseEvent) {
    const code = (event.target as Element).closest("code")
    if (code?.textContent) void this.copyAndSay(code.textContent)
  }

  /**
   * Copy `text`, and a quiet blue toast says so.  True when it was copied.
   * - Owen, 2026-10-13:  "copied toast in blue.  All file links and commands should be clickable to copy the text"
   * - the docs bundle defines `<ui-toast>`;  a page without it just copies
   */
  @E.untracked
  private async copyAndSay(text: string): Promise<boolean> {
    if (!(await E.copyText(text))) return false
    if (E.DOMElement.isAttached("ui-toast")) {
      UI.toast({
        id: COPIED_TOAST_ID,
        class: "blue",
        message: this.translationForKey("copiedText", { text }),
        displayTime: COPIED_TOAST_MS
      })
    }
    return true
  }

  /**
   * Measure where the toolbar's bar sticks (below this header) and where top-level titles stick:
   * the site header's height plus this header's and the bar's.
   */
  @E.untracked
  private readonly measure = () => {
    const site = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spell-site-header-height"))
    const head = Math.round(this.header?.getBoundingClientRect().height ?? 0)
    const bar = this.bar?.getBoundingClientRect().height ?? 0
    const top = Math.round((Number.isNaN(site) ? 0 : site) + head + bar)
    if (this.headHeight !== head) this.headHeight = head
    if (this.signals.top.get() !== top) this.signals.top.set(top)
  }

  /** A phase's step label:  `P4`, its name in the tooltip, a link to it. */
  private phaseLabel(phase: PhaseLine, color: StepLabel["color"], icon: string, prefix: string): StepLabel {
    const words = phase.label
    return { color, icon, words, tip: `${prefix}${words} · ${phase.title}`, href: `#${phase.id}` }
  }

  ////////////////
  // ## Page signals
  ////////////////

  /**
   * The page-wide signals of page element `page`, made the first time anyone asks:
   * its blocks may connect before its component exists.
   */
  static signalsOf(page: Element): PageSignals {
    let signals = EpicPage.pageSignals.get(page)
    if (!signals) {
      signals = { top: new E.Cell(0), layout: new E.Cell(0) }
      EpicPage.pageSignals.set(page, signals)
    }
    return signals
  }

  /** `element`'s text as typed:  white space as one space, a `<br>` as a line break. */
  private static textOf(element: Element): string {
    let text = ""
    for (const node of element.childNodes) {
      // the source's own line breaks and indents are layout, not text:  one space
      if (node.nodeType === Node.TEXT_NODE) text += (node.textContent ?? "").replace(/\s+/g, " ")
      else if ((node as Element).localName === "br") text += "\n"
      else if (node.nodeType === Node.ELEMENT_NODE) text += EpicPage.textOf(node as Element)
    }
    return text
  }
}

/** The gear's sub-menus. */
type GearSub = "autoSend" | "theme"

/** The theme sub-menu's DOM element, as the gear reads it:  its component, once ready. */
type ThemeMenuElement = HTMLElement & {
  /** resolves once its component has drawn */
  ready?: Promise<void>
  /** `UIThemeMenu`:  its choice (reactive), and focusing it */
  component?: { readonly chosenTheme: string; focusChosen(): void }
}

/** The gear button's id:  its menu's `for`. */
const GEAR_ID = "gear"

/** Each Auto Send choice's text key. */
const AUTO_SEND_TEXTS = {
  now: "autoSendNow",
  "2m": "autoSend2",
  "5m": "autoSend5",
  off: "autoSendOff"
} as const satisfies Record<AutoSend, string>

/**
 * Up / Down / Home / End among `items`, wrapping:  focus moves to the next;  true when it was such a key.
 * - the gear's rows and Auto Send's choices:  a short fixed list, each `tabindex=-1`, so no roving tab stop
 */
function moveFocus(event: KeyboardEvent, items: readonly HTMLElement[]): boolean {
  const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }
  const at = items.findIndex((it) => it === (event.target as Element).closest?.("button"))
  let next: number
  if (event.key in steps) next = (at + steps[event.key]! + items.length) % items.length
  else if (event.key === "Home") next = 0
  else if (event.key === "End") next = items.length - 1
  else return false
  items[next]?.focus()
  return true
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicPage extends E.AttributeValues<EpicPageVocabulary> {}

/**
 * A section's DOM element, as the toolbar's filter reads it (`DOMEpicSectionElement`):
 * by its shape, not its class (importing `<epic-section>`'s files here would loop:  they import this one).
 */
type FilterHost = E.DOMElement & {
  readonly stateFilter?: readonly StateFilterEntry[]
  readonly markedCount?: number
  readonly chipCounts?: string
  showStates?(states: readonly string[] | undefined): void
}

/** The sections, which filter their items. */
const SECTIONS = "epic-section"

/** The stage button's texts, by the stage it ends. */
/** The phases whose build plan waits for Owen's Accept, not done (`plansWaiting()`). */
const PLANS_WAITING =
  ':scope > epic-section[kind="phases"] > epic-phase[plan="waiting"]:not([status="done"], [title="Doc Review" i])'

const STAGE_TEXTS = {
  overview: {
    label: "acceptOverview",
    tip: "acceptOverviewTip",
    accepted: "acceptedOverview",
    step: "stageOverview",
    stepTip: "stageOverviewTip"
  },
  phases: {
    label: "acceptPhases",
    tip: "acceptPhasesTip",
    accepted: "acceptedPhases",
    step: "stagePhases",
    stepTip: "stagePhasesTip"
  }
} as const

/** The open questions:  what the stage button's tooltip counts (epic `epic-engine` P29). */
/** The pill holding the changes to accept and the step label, joined (`EpicPage.css`). */
const STEP_PILL = "step-pill"

const OPEN_QUESTIONS = ':scope > epic-section[kind="questions"] > epic-item[status="open"]'

/** What takes Owen's marks after a flight (epic `airplane`):  the review line's command in airplane mode. */
const AIRPLANE_LAND = "/airplane land"

/**
 * The header pill's colour for a step's:  blue drawn grey, the rest as they are.
 * - the pill is quiet, a grey rim and ink (Owen, 2026-10-25:  "Make the P1/agent pill non-blue");
 *   green (done) and red (the epic's state:  errors) still say something there
 * - none:  grey
 */
function pillColorOf(color: StepLabel["color"] | undefined): StepLabel["color"] {
  return !color || color === "blue" ? "grey" : color
}
