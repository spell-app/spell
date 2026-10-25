import { epicAgentsVocabulary } from "spell-epic/components/epic-agents/EpicAgents.en"
import { epicAnswerVocabulary } from "spell-epic/components/epic-answer/EpicAnswer.en"
import { epicMoreVocabulary } from "spell-epic/components/epic-answer/EpicMore.en"
import { epicReplyVocabulary } from "spell-epic/components/epic-answer/EpicReply.en"
import { epicAsideVocabulary } from "spell-epic/components/epic-aside/EpicAside.en"
import { epicAskVocabulary } from "spell-epic/components/epic-ask/EpicAsk.en"
import { epicCardsVocabulary } from "spell-epic/components/epic-cards/EpicCards.en"
import { epicChangeVocabulary } from "spell-epic/components/epic-change/EpicChange.en"
import { epicChoiceRowVocabulary } from "spell-epic/components/epic-choice-rows/EpicChoiceRow.en"
import { epicChoiceRowsVocabulary } from "spell-epic/components/epic-choice-rows/EpicChoiceRows.en"
import { epicChoicesBarVocabulary } from "spell-epic/components/epic-choices-bar/EpicChoicesBar.en"
import { epicChoicesVocabulary } from "spell-epic/components/epic-choices/EpicChoices.en"
import { epicOptionVocabulary } from "spell-epic/components/epic-choices/EpicOption.en"
import { epicCodeVocabulary } from "spell-epic/components/epic-code/EpicCode.en"
import { epicCommentPaneVocabulary } from "spell-epic/components/epic-comment-pane/EpicCommentPane.en"
import { epicCommitVocabulary } from "spell-epic/components/epic-commit/EpicCommit.en"
import { epicEventVocabulary } from "spell-epic/components/epic-event/EpicEvent.en"
import { epicItemVocabulary } from "spell-epic/components/epic-item/EpicItem.en"
import { epicLinkVocabulary } from "spell-epic/components/epic-link/EpicLink.en"
import { epicCardVocabulary } from "spell-epic/components/epic-list/EpicCard.en"
import { epicListVocabulary } from "spell-epic/components/epic-list/EpicList.en"
import { epicSortVocabulary } from "spell-epic/components/epic-list/EpicSort.en"
import { epicNetEffectVocabulary } from "spell-epic/components/epic-net-effect/EpicNetEffect.en"
import { epicNewItemVocabulary } from "spell-epic/components/epic-new-item/EpicNewItem.en"
import { epicNoteVocabulary } from "spell-epic/components/epic-note/EpicNote.en"
import { epicOriginalVocabulary } from "spell-epic/components/epic-original/EpicOriginal.en"
import { epicVersionVocabulary } from "spell-epic/components/epic-original/EpicVersion.en"
import { epicOverviewVocabulary } from "spell-epic/components/epic-overview/EpicOverview.en"
import { epicPageNoteHeadVocabulary } from "spell-epic/components/epic-page-note-head/EpicPageNoteHead.en"
import { epicPageVocabulary } from "spell-epic/components/epic-page/EpicPage.en"
import { epicFieldVocabulary } from "spell-epic/components/epic-phase/EpicField.en"
import { epicPhaseVocabulary } from "spell-epic/components/epic-phase/EpicPhase.en"
import { epicUpdatedVocabulary } from "spell-epic/components/epic-phase/EpicUpdated.en"
import { epicPromptVocabulary } from "spell-epic/components/epic-prompt/EpicPrompt.en"
import { epicQuestionVocabulary } from "spell-epic/components/epic-question/EpicQuestion.en"
import { epicReviewVocabulary } from "spell-epic/components/epic-review/EpicReview.en"
import { epicSectionVocabulary } from "spell-epic/components/epic-section/EpicSection.en"
import { epicSendVocabulary } from "spell-epic/components/epic-send/EpicSend.en"
import { epicSendButtonsVocabulary } from "spell-epic/components/epic-send-buttons/EpicSendButtons.en"
import { epicHiddenNoteVocabulary } from "spell-epic/components/epic-state-filter/EpicHiddenNote.en"
import { epicRunVocabulary } from "spell-epic/components/epic-run/EpicRun.en"
import { epicRunRowVocabulary } from "spell-epic/components/epic-run-row/EpicRunRow.en"
import { epicStateFilterVocabulary } from "spell-epic/components/epic-state-filter/EpicStateFilter.en"
import { epicStatusVocabulary } from "spell-epic/components/epic-status/EpicStatus.en"
import { epicSummaryVocabulary } from "spell-epic/components/epic-summary/EpicSummary.en"
import { epicTestRunVocabulary } from "spell-epic/components/epic-test-run/EpicTestRun.en"
import { epicTextBoxVocabulary } from "spell-epic/components/epic-text-box/EpicTextBox.en"
import { epicThreadVocabulary } from "spell-epic/components/epic-thread/EpicThread.en"
import { epicThreadMessageVocabulary } from "spell-epic/components/epic-thread/EpicThreadMessage.en"
import { epicThreadsVocabulary } from "spell-epic/components/epic-thread/EpicThreads.en"
import { epicUpdateVocabulary } from "spell-epic/components/epic-update/EpicUpdate.en"

import { Formats, type EpicAttributeSpec, type EpicTag, type EpicVocabulary } from "./definitions.types"

/****************
 * ### `Definitions`
 * Every `<epic-*>` element's description, by tag:  its vocabulary, as data.
 * - Imports each `<Name>.en.ts` straight from its family folder:  PURE DATA, never the family's barrel,
 *   so loading this defines no element and touches no DOM -- node-safe (the tool, the converter, the tests).
 * - STATIC:  one registry, nothing per instance.
 * - A new tag:  `spell pack add epics <tag>` (or a sub-tag's files by hand), then its line in `all`.
 *   `Definitions.test.ts` fails on a vocabulary file it doesn't list.
 ****************/
export class Definitions {
  /** Every tag => its vocabulary, in page order (outermost first). */
  static readonly all = {
    "epic-page": epicPageVocabulary,
    "epic-overview": epicOverviewVocabulary,
    "epic-summary": epicSummaryVocabulary,
    "epic-prompt": epicPromptVocabulary,
    "epic-section": epicSectionVocabulary,
    // a saga page's Epics (epic `epic-workflow` P15)
    "epic-cards": epicCardsVocabulary,
    "epic-phase": epicPhaseVocabulary,
    "epic-field": epicFieldVocabulary,
    "epic-updated": epicUpdatedVocabulary,
    "epic-item": epicItemVocabulary,
    "epic-question": epicQuestionVocabulary,
    "epic-choices": epicChoicesVocabulary,
    "epic-option": epicOptionVocabulary,
    "epic-answer": epicAnswerVocabulary,
    "epic-more": epicMoreVocabulary,
    "epic-reply": epicReplyVocabulary,
    "epic-status": epicStatusVocabulary,
    "epic-original": epicOriginalVocabulary,
    "epic-version": epicVersionVocabulary,
    "epic-commit": epicCommitVocabulary,
    "epic-event": epicEventVocabulary,
    "epic-update": epicUpdateVocabulary,
    "epic-net-effect": epicNetEffectVocabulary,
    "epic-note": epicNoteVocabulary,
    "epic-aside": epicAsideVocabulary,
    "epic-code": epicCodeVocabulary,
    // a link to a saga, an epic, a phase or an item (epic `epic-workflow` P15), anywhere prose goes
    "epic-link": epicLinkVocabulary,
    // a change mark (epic `epic-engine` P30):  words an answer changed, in the text itself
    "epic-change": epicChangeVocabulary,
    // the pages Claude makes for Owen to answer ON (epic `epic-workflow` P12):  details and choice pages
    "epic-ask": epicAskVocabulary,
    "epic-text-box": epicTextBoxVocabulary,
    "epic-send": epicSendVocabulary,
    "epic-send-buttons": epicSendButtonsVocabulary,
    "epic-choice-rows": epicChoiceRowsVocabulary,
    "epic-choice-row": epicChoiceRowVocabulary,
    "epic-choices-bar": epicChoicesBarVocabulary,
    // a run page, a command's review page (epic `epic-engine` P23):  `<epic-run>` once a page, from its template;
    // its rows drawn in its shadow root
    "epic-run": epicRunVocabulary,
    "epic-run-row": epicRunRowVocabulary,
    // the Epics page's list, its cards and its sort buttons (epic `epic-engine` P3)
    "epic-list": epicListVocabulary,
    "epic-card": epicCardVocabulary,
    "epic-sort": epicSortVocabulary,
    // the state filter's chips and the line under a filtered list (epic `epic-engine` P3):  drawn by `<epic-section>`,
    // `<epic-page>`'s toolbar and the docs runtime, never written in a doc
    "epic-state-filter": epicStateFilterVocabulary,
    "epic-hidden-note": epicHiddenNoteVocabulary,
    // a test run (epic `epic-engine` P4):  drawn by `<epic-page>` over its blocks, written in a doc only as an example
    "epic-test-run": epicTestRunVocabulary,
    // drawn only inside other elements' shadow roots, never written in a doc
    "epic-review": epicReviewVocabulary,
    "epic-new-item": epicNewItemVocabulary,
    "epic-agents": epicAgentsVocabulary,
    "epic-thread-message": epicThreadMessageVocabulary,
    // what the docs runtime's comments draw on every page that takes comments (epic `epic-engine` P3)
    "epic-threads": epicThreadsVocabulary,
    "epic-thread": epicThreadVocabulary,
    "epic-comment-pane": epicCommentPaneVocabulary,
    // an old page note's head line (`<spell-note>`, epic `airplane` P3)
    "epic-page-note-head": epicPageNoteHeadVocabulary
  } as const

  /** Every tag, in `all`'s order. */
  static get tags(): EpicTag[] {
    return Object.keys(this.all) as EpicTag[]
  }

  /** Whether `tag` is one of ours. */
  static has(tag: string): tag is EpicTag {
    return Object.hasOwn(this.all, tag)
  }

  /** `tag`'s vocabulary;  `undefined` for a tag that isn't ours. */
  static of(tag: string): EpicVocabulary | undefined {
    return this.has(tag) ? this.all[tag] : undefined
  }

  /** `tag`'s attribute whose camelCase KEY is `key` (`reviewAs` => `review-as`);  `undefined` if it has none. */
  static attribute(tag: EpicTag, key: string): EpicAttributeSpec | undefined {
    return this.all[tag].attributes.find((spec: EpicAttributeSpec) => this.keyOf(spec) === key)
  }

  /**
   * `spec`'s key in `EpicData`:  its name in camelCase (`review-as` => `reviewAs`),
   * as its component's attribute getter (`this.reviewAs`).
   * - NOT `spec.property`, the DOM element's JS property:  `id` and `title` take `epicId` / `epicTitle` there,
   *   so they don't shadow the platform's own (`DOMElement` refuses that), but data says `id` and `title`.
   * - NOTE: a private copy of `spell/util`'s `camelCase()`:  that barrel drags spell's utilities into the pack,
   *   and `spell-ui/util` isn't node-safe through `spell-ui/core`.
   */
  static keyOf(spec: EpicAttributeSpec): string {
    return spec.name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
  }

  ////////////////
  // ## Values
  ////////////////

  /**
   * What's wrong with attribute text `text` for `spec`, in a few words;  `undefined` when it's fine.
   * - `boolean`:  Spell UI's spellings (`""`, `true`, `yes`, `false`, `no`)
   * - `number`:  a decimal number
   * - `values`:  one of them;  `format`:  matches it (`Formats`)
   */
  static valueProblem(spec: EpicAttributeSpec, text: string): string | undefined {
    if (spec.kind === "boolean") return BOOLEAN_TEXT.test(text) ? undefined : "isn't a boolean (`true`, `false`)"
    if (spec.kind === "number") return NUMBER_TEXT.test(text) ? undefined : "isn't a number"
    if (Array.isArray(spec.values) && !spec.values.includes(text)) {
      return `isn't one of its values (${spec.values.map((value) => `\`${value}\``).join(", ")})`
    }
    if (spec.format && !Formats[spec.format].test(text)) return `isn't a well-formed ${spec.format}`
    return undefined
  }

  /**
   * Attribute text `text` as `spec`'s typed value:  `boolean`, `number`, else the text.
   * - NEVER throws:  a bad value parses as best it can (`NaN`);  `valueProblem()` says what's wrong.
   */
  static parse(spec: EpicAttributeSpec, text: string): string | number | boolean {
    if (spec.kind === "boolean") return !FALSE_TEXT.test(text)
    if (spec.kind === "number") return Number(text)
    return text
  }

  /**
   * Typed value `value` as `spec`'s attribute text:  `true` => `""`, a number => its digits.
   * - `undefined` / `false` => `undefined`:  no attribute.
   * - throws `TypeError` when `value`'s type isn't `spec`'s kind (`"yes"` for a boolean),
   *   or its text has a `valueProblem()`
   */
  static text(spec: EpicAttributeSpec, value: unknown): string | undefined {
    if (value === undefined || value === false) return undefined
    const expected = spec.kind === "boolean" || spec.kind === "number" ? spec.kind : "string"
    if (typeof value !== expected) {
      throw new TypeError(`Definitions.text():  \`${spec.name}\` takes a ${expected}, not \`${JSON.stringify(value)}\``)
    }
    const text = value === true ? "" : String(value as string | number)
    const problem = this.valueProblem(spec, text)
    if (problem) throw new TypeError(`Definitions.text():  \`${spec.name}="${text}"\` ${problem}`)
    return text
  }
}

/** Spell UI's boolean spellings:  presence / `""` / `true` / `yes` ~== true;  `false` / `no` ~== false. */
const BOOLEAN_TEXT = /^(|true|yes|false|no)$/

/** The boolean spellings meaning false. */
const FALSE_TEXT = /^(false|no)$/

/** A decimal number. */
const NUMBER_TEXT = /^-?\d+(\.\d+)?$/
