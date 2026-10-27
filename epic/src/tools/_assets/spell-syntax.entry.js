/*
 * Entry of `spell-syntax.js`:  the spell syntax guide (`guides/spell-syntax/spell-syntax.html`):
 * draws every rule of the base spell language, one table per module, from the syntax table generated from the code;
 * keeps what Owen types over its boxes;
 * and turns each wand into a comment asking Claude for more details.  Then boots the docs bundle.
 * - Loaded INSTEAD of `spell-ui.js`, as `core-reference.js` is:  it fetches, draws, then adds `spell-ui.js` (same
 *   folder), whatever happened (`drawThenBoot()`).
 * - The data:  the JSON `<body data-choices-rows>` names, from the page:
 *   `parser/src/spell/spellSyntax.json`, written by `yarn spell:gen:syntax` in spell-parser
 *   (spell-parser's `src/spell/node/spellSyntax.ts` has its shape, `SpellSyntaxData`).
 *   - Fetched from the checkout SERVING the page, so each branch shows its own rules.
 *   - From `file://` it says so where the tables go:  the page needs the page server.
 * - Built from elements (`el()`), never from markup in strings.
 *   - its buttons Spell UI's `<ui-button>`s (epic `epic-engine` P3):  the pencils, the resets, the wands, Expand all
 *     and Collapse all;  their icons centred by the component, each one's `title` on the button the pointer lands on too
 *     (`titleInside()`)
 *   - the boxes stay native `<textarea>`s:  750 of them, read and written as plain values;  a reset button is made
 *     only once its box first differs (`resetButton()`)
 * - Each module:  a nested `<ui-section>` where `[data-syntax-modules]` is,
 *   holding a table Rule name | Syntax | Purpose, a row per rule class (its internal classes first).
 *   - OPEN, as every section of this page, unlike other docs pages
 *     (Owen, 2026-10-12:  "Start out with all everything expanded")
 * - EXPAND ALL and COLLAPSE ALL:  the page header's, every docs page's (the runtime's `addFoldAll()`;  its own pair
 *   at the toolbar's right went 2026-10-24).
 * - Rule name:
 *   - the class's name, a link to its source (its rule names its tooltip), with a pencil to suggest another name
 *   - then each syntax it's registered with, a bullet each
 *   - then its aliases, "aka:  `expression`"
 * - Syntax:  each syntax's example, from its tests, and what each writer makes of it.
 * - BOXES, pre-filled with what the code has:
 *   the class's name (behind its pencil), and each example's output from each writer.
 *   - Owen types over one to suggest another;  a changed box is marked, its round button puts the code's back.
 *   - Keyed `<Class>.<field>`:  `IsGtLt.name`, `IsGtLt.js`, `IsGtLt.ts`, `IsGtLt.py`;
 *     the second example's `AssignmentStatement.js.2`, and so on.
 *   - Saved through the syntax-choices routes (`choicesRoutes.ts`), never into the code:
 *     - 5s after typing stops, and as the page goes away:
 *       `POST /api/docs/choices/draft`, `spell-syntax.draft.json5` beside the page
 *     - by a `DraftSaver`, as every form's (epic `coherence` C10):  a failed save tried again every 3s, one wording
 *       of where it stands;  a copy in this browser at once (`DRAFT_KEY_PREFIX`), put back when newer than the
 *       server's
 *     - Send:
 *       `POST /api/docs/choices/answer`, `spell-syntax.answer.json5`, which `epic choices wait <page>` exits with
 *   - Kept apart from the generated data, so regenerating it keeps them:
 *     - a box whose code now says what Owen typed is no longer a change
 *     - one for a rule that's gone is kept as is
 * - The WAND beside each purpose asks Claude for more details there:
 *   - it adds a COMMENT (`POST /api/docs/comments`, `commentsRoutes.ts`) on the module's table, quoting the purpose,
 *     "Provide more details here:  `IsGtLt`."
 *   - the runtime draws its thread in that cell;  Claude answers on it (`epic comments answer`)
 *   - `epic comments wait <page>`, run in the background, wakes a session with it
 *   - while its comment waits for Claude, the wand is blue, and a click does nothing more
 * - BUNDLED (epic `coherence` C12):  `node src/tools/bundle-spell-ui.js --data-pages` builds it into `spell-syntax.js`,
 *   a classic script with NO Spell UI in it;  edit THIS, never the bundle.  It imports what exists:  the docs helpers'
 *   `el()`, `titleInside()` and start, `ChoicesForm`'s file links, `ServerLink`, `DraftSaver`, the kit's `slug()`, and
 *   `clockOf()`, the review's one time of day.
 */
import { slug } from "spell/util/string"
import { ServerLink, clockOf } from "spell/epic/review"
import { CHOICES_API, ChoicesForm, DraftSaver } from "spell/epic/answers"

import { dataNotice, drawThenBoot, el, fetchFile, sectionNumber, titleInside, withCode } from "./spell-doc-helpers.js"

/** Where comments go (`commentsRoutes.ts`). */
const COMMENTS_API = "/api/docs/comments"
/** How long after the last change the draft is saved, in ms. */
const SAVE_DELAY = 5000
/** The browser's copy of the page's draft:  this, then the page's path. */
const DRAFT_KEY_PREFIX = "spell-syntax-draft:"
/** The writers, in the Syntax column's order. */
const WRITERS = ["js", "ts", "py"]
/** A wand's words, as its comment starts and as its tooltip. */
const WAND_WORDS = "Provide more details here"
/** A purpose the class's docstring doesn't give. */
const NO_PURPOSE = "(no docstring yet)"
/** How much of a table's text a comment's excerpt keeps:  `BlockAnchors.js` `EXCERPT_LENGTH`. */
const EXCERPT_LENGTH = 80

/** Every box, by key (`IsGtLt.py`):  `{ key, input, reset, holder, generated }`. */
const boxes = new Map()
/** Every wand, by class name. */
const wands = new Map()
/** What Owen typed for rules no longer on the page (renamed, removed):  kept, and saved again as is. */
let orphans = {}
/** The toolbar's parts, once drawn. */
let bar
/** The answer last sent, if any. */
let sent
/** The draft's saves (`POST /api/docs/choices/draft`), its browser copy, and where it stands. */
const drafts = new DraftSaver({
  save: async ({ keepalive }) => (await post(CHOICES_API, "draft", { keepalive })).draft.saved,
  wait: SAVE_DELAY,
  key: `${DRAFT_KEY_PREFIX}${location.pathname}`,
  onChange: () => setSaved(drafts.text, { isError: drafts.isError })
})

// drawn, the bundle booted:  then what was typed and asked comes back
void drawThenBoot(load, draw, (error) => notice(`Couldn't draw the rules:  ${error.message}`)).then(
  (data) => data && restore()
)

////////////////
// ## Start
////////////////

/** The syntax table, or `undefined` after showing why not. */
async function load() {
  const path = document.body.dataset.choicesRows
  if (!path) throw new Error("the page's `<body>` has no `data-choices-rows`")
  if (location.protocol === "file:") {
    notice(
      "This page draws its rules from the checkout serving it, and saves what you type, through the page server:  open it with `epic pages open guides/spell-syntax/spell-syntax.html`."
    )
    return undefined
  }
  const data = await fetchFile(path, { format: "json" })
  if (data === undefined) throw new Error(`${path.split("/").pop()}:  not found`)
  return data
}

////////////////
// ## Drawing
////////////////

/** The stats, a section per module where `[data-syntax-modules]` is, then the toolbar at `main`'s end. */
function draw(data) {
  const modules = data.modules ?? []
  const rows = modules.flatMap((module) => module.rules)
  const stats = document.querySelector("[data-syntax-stats]")
  stats?.replaceChildren(
    el("ui-statistic", { value: String(modules.length), label: "modules" }),
    el("ui-statistic", { value: String(rows.filter((rule) => !rule.internal).length), label: "rule classes" }),
    el("ui-statistic", { value: String(rows.filter((rule) => rule.internal).length), label: "internal" })
  )
  const holder = document.querySelector("[data-syntax-modules]")
  const number = sectionNumber(holder.closest("ui-section"))
  holder.replaceWith(...modules.map((module, i) => moduleSection(module, number ? `${number}.${i + 1} ` : "")))
  bar = drawBar()
  wire()
  count()
}

/** One module:  an open `<ui-section>`, its count, its table. */
function moduleSection({ module, rules }, prefix) {
  const internal = rules.filter((rule) => rule.internal).length
  const registered = rules.length - internal
  const badge = [
    registered ? `${registered} ${registered === 1 ? "rule" : "rules"}` : "",
    internal ? `${internal} internal` : ""
  ].filter(Boolean)
  const table = el(
    "table",
    {},
    el("thead", {}, el("tr", {}, el("th", {}, "Rule name"), el("th", {}, "Syntax"), el("th", {}, "Purpose"))),
    el("tbody", {}, ...rules.map(ruleRow))
  )
  return el(
    "ui-section",
    {
      id: `module-${slug(module)}`,
      label: `${prefix}${module}`,
      badge: badge.join(" · "),
      sticky: "",
      collapsible: "",
      dividing: ""
    },
    el(
      "ui-table",
      { id: `rules-${slug(module)}`, class: "spell-syntax-table", celled: "", padding: "compact", unstackable: "" },
      table
    )
  )
}

/** One rule class's row:  its name, syntaxes and aliases;  each example in each writer;  its purpose and wand. */
function ruleRow(rule) {
  return el(
    "tr",
    { id: `rule-${rule.className}`, "data-rule": rule.className },
    nameCell(rule),
    syntaxCell(rule),
    purposeCell(rule)
  )
}

/**
 * Rule name:
 * - the class's name, opening its source, its rule names as its tooltip
 * - its pencil, showing the box to suggest another name
 * - each syntax, a bullet;  then its aliases, "aka:  `expression`"
 */
function nameCell(rule) {
  const tip = rule.ruleNames.length ? rule.ruleNames.join(", ") : "no rule name of its own"
  const name = el(rule.file ? "a" : "span", { class: "spell-syntax-source", title: tip }, rule.className)
  if (rule.file) name.href = ChoicesForm.fileUrlHere(rule.file, rule.line)
  const rename = iconButton(
    "spell-syntax-rename",
    "pen to square",
    `Suggest another name for ${rule.className}`,
    `Suggest another name for ${rule.className}`
  )
  const nameBox = box(rule, "name", rule.className, `Class name of ${rule.className}`)
  nameBox.hidden = true
  const syntaxes = rule.syntaxes.filter((form) => form.syntax)
  const syntaxList = syntaxes.length
    ? el("ul", { class: "spell-syntax-syntaxes" }, ...syntaxes.map((form) => el("li", {}, el("code", {}, form.syntax))))
    : rule.internal
      ? ""
      : el("p", { class: "spell-syntax-none" }, "matched by its code:  no syntax of its own")
  const aka = rule.aliases.length
    ? el(
        "p",
        { class: "spell-syntax-aka" },
        el("em", {}, "aka"),
        ":  ",
        ...rule.aliases.flatMap((alias, i) => [i ? ", " : "", el("code", {}, alias)])
      )
    : ""
  return el(
    "td",
    { class: "spell-syntax-name" },
    el("div", { class: "spell-syntax-class" }, name, rename),
    nameBox,
    syntaxList,
    aka
  )
}

/** Syntax:  each syntax's example, and each writer's output for it;  why there's none, where there's none. */
function syntaxCell(rule) {
  const examples = rule.syntaxes.filter((form) => form.example)
  if (!examples.length)
    return el(
      "td",
      { class: "spell-syntax-outputs" },
      el("em", { class: "spell-syntax-none" }, rule.internal ? "no syntax of its own" : "no test to show it with yet")
    )
  return el("td", { class: "spell-syntax-outputs" }, ...examples.map((form, i) => example(rule, form, i)))
}

/**
 * One example:  the spell, the syntax it matches its tooltip;  then each writer's output, in a box.
 * - its boxes keyed `<Class>.js` for the first example, `<Class>.js.2` for the second ...
 */
function example(rule, form, i) {
  const suffix = i ? `.${i + 1}` : ""
  const lines = WRITERS.map((writer) => {
    const output = form.outputs[writer]
    const value =
      "code" in output
        ? box(rule, `${writer}${suffix}`, output.code, `${writer} for ${form.example}`)
        : el("em", { class: "spell-syntax-none" }, `(${output.error})`)
    return el("li", {}, el("b", {}, writer), value)
  })
  const tip = form.syntax ? `Matches:  ${form.syntax}` : "Matched by the rule's own code"
  return el(
    "ul",
    { class: "spell-syntax-writers" },
    el("li", { class: "spell-syntax-input" }, el("b", {}, "e.g."), el("code", { title: tip }, form.example)),
    ...lines
  )
}

/** Purpose:  **internal** first for a class nobody registers, its one sentence, the wand. */
function purposeCell(rule) {
  const text = el(
    "span",
    { class: "spell-syntax-purpose-text" },
    ...(rule.internal ? [el("b", {}, "internal"), " "] : []),
    ...withCode(rule.purpose || NO_PURPOSE)
  )
  const tip = `${WAND_WORDS}:  ask Claude, in a comment here`
  const wand = el("ui-button", {
    class: "spell-syntax-wand",
    appearance: "circular basic",
    size: "mini",
    icon: "wand magic sparkles",
    title: tip,
    "aria-label": `${WAND_WORDS}:  ${rule.className}`
  })
  titleInside(wand)
  wand.addEventListener("click", () => void askForDetails(rule, wand, text))
  wands.set(rule.className, wand)
  return el("td", { class: "spell-syntax-purpose" }, el("p", {}, text, " ", wand))
}

/**
 * A box holding `value`, keyed `<Class>.<field>`;  its round reset button comes once it differs (`mark()`).
 * - one line for the class's name (Enter adds none);  as many as the code has for a writer's output
 */
function box(rule, field, value, label) {
  const key = `${rule.className}.${field}`
  const input = el("textarea", {
    class: "spell-choice-input",
    rows: "1",
    spellcheck: "false",
    autocomplete: "off",
    "aria-label": label,
    ...(field === "name" && { "data-one-line": "" })
  })
  input.value = value
  const holder = el("div", { class: "spell-choice-field spell-syntax-box", "data-box": key }, input)
  boxes.set(key, { key, input, reset: undefined, holder, generated: value })
  return holder
}

/**
 * `one` box's round reset button, after its text:  "back to what the code has".
 * - made the first time the box differs, not for every box up front:  most are never changed, and each
 *   `<ui-button>` draws a shadow root
 */
function resetButton(one) {
  const { generated } = one
  const reset = iconButton(
    "spell-choice-reset",
    "clock rotate left",
    `Back to ${generated.split("\n")[0]}${generated.includes("\n") ? " ..." : ""}`,
    "Back to what the code has"
  )
  one.holder.append(reset)
  return reset
}

/**
 * A round, icon-only `<ui-button>` of the page's own, plain (no ring:  `syntax-choices.css`, `spell-syntax.css`):
 * `tip` its tooltip, on the inner button too (`titleInside()`);  `label` what a screen reader hears.
 * - `tiny`:  its icon 11px, near the 13px glyph the raw buttons drew before (`mini`'s is 9px), the button a one-line
 *   box's height
 */
function iconButton(className, icon, tip, label) {
  const button = el("ui-button", {
    class: className,
    appearance: "circular basic",
    size: "tiny",
    icon,
    title: tip,
    "aria-label": label
  })
  titleInside(button)
  return button
}

/**
 * The toolbar after the last section, pinned to the window's bottom
 * (`syntax-choices.css`, as a syntax-choices page's):
 * - feedback with Send to its right
 * - under them the count and the save status
 * - then an error or "Sent"
 */
function drawBar() {
  const feedback = el("ui-textarea", {
    class: "spell-choices-feedback",
    name: "feedback",
    rows: "1",
    placeholder: "Feedback for Claude:  anything the boxes don't say",
    fluid: ""
  })
  const send = el(
    "ui-button",
    {
      class: "spell-choices-send",
      color: "primary",
      appearance: "circular",
      icon: "paper plane",
      title: "Send every changed box, and the feedback, to Claude"
    },
    "Send"
  )
  const saved = el("span", { class: "spell-choices-saved" })
  const error = el("ui-message", { class: "spell-choices-error", state: "negative", size: "small", hidden: "" })
  const done = el("ui-message", { class: "spell-choices-sent", state: "positive", size: "small", hidden: "" })
  document
    .querySelector("main")
    .append(
      el(
        "div",
        { id: "choices-bar", class: "spell-choices-bar" },
        el("div", { class: "spell-choices-row" }, feedback, send),
        el("div", { class: "spell-choices-meta" }, saved),
        error,
        done
      )
    )
  return { feedback, send, saved, error, done }
}

/** Show `message` where the tables go. */
function notice(message) {
  dataNotice(document.querySelector("[data-syntax-modules]"), "Rules not drawn", message)
}

////////////////
// ## Editing
////////////////

/** Typing, resets, pencils, source links, feedback, Send, and saving as the page goes away. */
function wire() {
  const main = document.querySelector("main")
  main.addEventListener("input", (event) => {
    const holder = event.target.closest?.(".spell-syntax-box")
    if (!holder) return
    // the class's name is one line:  a pasted line break goes
    if (event.target.hasAttribute("data-one-line") && /\n/.test(event.target.value))
      event.target.value = event.target.value.replace(/\s*\n\s*/g, " ")
    mark(boxes.get(holder.dataset.box))
    changed()
  })
  main.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.hasAttribute?.("data-one-line")) event.preventDefault()
  })
  main.addEventListener("click", (event) => {
    const rename = event.target.closest?.(".spell-syntax-rename")
    if (rename) {
      showNameBox(boxes.get(`${rename.closest("tr").dataset.rule}.name`), "toggle")
      return
    }
    const reset = event.target.closest?.(".spell-choice-reset")
    const holder = reset?.closest(".spell-syntax-box")
    if (holder) {
      const one = boxes.get(holder.dataset.box)
      one.input.value = one.generated
      mark(one)
      changed()
      one.input.focus()
      return
    }
    const link = event.target.closest?.("a.spell-syntax-source")
    if (link) ChoicesForm.openFile(event, link.href)
  })
  bar.feedback.addEventListener("ui-typed", changed)
  bar.send.addEventListener("click", () => void send())
  // as the page goes away (or hides):  saved at once
  drafts.watch(window)
}

/**
 * Mark `one` box changed (it differs from what the code has) or not:  the box, its reset button, its row.
 * - a changed name's box stays in view
 */
function mark(one) {
  const isChanged = isBoxChanged(one)
  one.holder.toggleAttribute("data-changed", isChanged)
  if (isChanged) one.reset ??= resetButton(one)
  if (one.reset) one.reset.hidden = !isChanged
  if (isChanged && one.key.endsWith(".name")) showNameBox(one, "show")
  const row = one.holder.closest("tr")
  row.toggleAttribute("data-edited", !!row.querySelector(".spell-syntax-box[data-changed]"))
}

/**
 * Show the class name's box, `one`, under the name (and focus it), or hide it:
 * its pencil's click (`toggle`), or a changed name (`show`).
 * - a changed name's box never hides:  the pencil focuses it instead
 */
function showNameBox(one, how) {
  const isShown = how === "show" || one.holder.hidden || isBoxChanged(one)
  one.holder.hidden = !isShown
  one.holder.closest("td").querySelector(".spell-syntax-rename").toggleAttribute("data-open", isShown)
  if (isShown && how === "toggle") one.input.focus()
}

/** Does `one` box differ from what the code has? */
function isBoxChanged(one) {
  return one.input.value.trim() !== one.generated.trim()
}

/** Something changed:  recount, kept in this browser at once, and saved once typing stops. */
function changed() {
  count()
  drafts.keep({ values: collect(), feedback: feedbackNow(), saved: new Date().toISOString() })
  drafts.changed()
  if (sent) showSent(sent, { isStale: true })
}

/**
 * The count, on Send's tooltip:  no line of its own under the bar
 * (Owen, 2026-10-13:  "Lose the `0 boxes saved` bit").
 */
function count() {
  const changes = [...boxes.values()].filter(isBoxChanged).length
  const kept = Object.keys(orphans).length
  const rules = new Set([...boxes.values()].filter(isBoxChanged).map((one) => one.key.split(".")[0])).size
  bar.send.title =
    `Send ${changes} changed ${changes === 1 ? "box" : "boxes"}, in ${rules} ${rules === 1 ? "rule" : "rules"}` +
    (kept ? ` (and ${kept} kept for rules no longer here)` : "") +
    `, and the feedback, to Claude`
}

/** The boxes that differ from the code, as typed, by key;  and what was typed for rules no longer here. */
function collect() {
  const values = { ...orphans }
  for (const one of boxes.values()) if (isBoxChanged(one)) values[one.key] = one.input.value
  return values
}

////////////////
// ## Saving and sending
////////////////

/** Send:  every changed box and the feedback;  show what was sent, or why not. */
async function send() {
  bar.error.hidden = true
  bar.send.setAttribute("loading", "")
  try {
    const { answer } = await post(CHOICES_API, "answer")
    // sent:  the draft is done with, its browser copy too
    drafts.done()
    drafts.tell(`saved ${clockOf(answer.answered)}`)
    showSent(answer)
  } catch (error) {
    showError(`Not sent:  ${error.message}`)
  } finally {
    bar.send.removeAttribute("loading")
  }
}

/**
 * POST the page's boxes to `/api/docs/choices/<what>`;  the route's answer.
 * - throws an `Error` saying, in Owen's words, what to do:  reload, restart the server, open it from the server
 */
async function post(api, what, { keepalive = false } = {}) {
  return postJSON(
    `${api}/${what}`,
    { page: location.pathname, values: collect(), feedback: feedbackNow() },
    { keepalive }
  )
}

/** The feedback box's text, trimmed. */
function feedbackNow() {
  return String(bar.feedback.value ?? "").trim()
}

/**
 * POST `body` to `url` through the page's `ServerLink`:  its token, refreshed once after a restart;  the answer, or
 * throws saying why.
 */
async function postJSON(url, body, { keepalive = false } = {}) {
  if (!ServerLink.isServed())
    throw new Error("this page isn't on the page server:  open it with `epic pages open <page>`")
  return ServerLink.forPage().post(url, body, { keepalive })
}

/** What was typed and sent before, into the boxes;  then which wands are waiting for Claude. */
async function restore() {
  if (!ServerLink.isServed()) return
  try {
    const [draft, answer] = await Promise.all([fetchJSON(`${CHOICES_API}/draft`), fetchJSON(`${CHOICES_API}/answer`)])
    // this browser's copy, newer than the server's draft:  typed while the server couldn't take it
    const local = drafts.kept()
    const isLocalNewer = local?.saved && local.saved > (draft?.draft?.saved ?? answer?.answer?.answered ?? "")
    const last = isLocalNewer ? local : (draft?.draft ?? answer?.answer)
    if (last) {
      orphans = {}
      for (const [key, value] of Object.entries(last.values ?? {})) {
        const one = boxes.get(key)
        if (!one) {
          orphans[key] = value
          continue
        }
        one.input.value = value
        mark(one)
      }
      // a property set before the element upgrades would shadow its own
      await customElements.whenDefined("ui-textarea")
      bar.feedback.value = last.feedback ?? ""
      count()
    }
    if (draft?.draft) drafts.tell(`saved ${clockOf(draft.draft.saved)}`)
    if (answer?.answer) showSent(answer.answer)
    // not on the server yet:  saved now
    if (isLocalNewer) drafts.changed()
  } catch (error) {
    drafts.tell(`can't load what you typed:  ${error.message}`, { isError: true })
  }
  await markWands()
}

/** `GET url?page=<this page>`, as JSON;  `undefined` when the route says no. */
async function fetchJSON(url) {
  const reply = await ServerLink.forPage()
    .get(url, { query: { page: location.pathname }, missing: null })
    .catch(() => undefined)
  if (reply === null) throw new Error("page server too old, restart it")
  return reply
}

/** The toolbar's quiet save status;  `isError`:  in red. */
function setSaved(message, { isError = false } = {}) {
  bar.saved.textContent = message
  bar.saved.classList.toggle("spell-choices-failed", isError)
}

/** `message` in the toolbar's error box. */
function showError(message) {
  bar.error.replaceChildren(el("p", {}, message))
  bar.error.hidden = false
}

/**
 * The "Sent" message for `answer`;  `isStale`:  changed since, so it says to press Send again.
 * - SIDE EFFECT:  remembers `answer` as the one sent
 */
function showSent(answer, { isStale = false } = {}) {
  sent = answer
  const changes = Object.keys(answer.values ?? {}).length
  const again = answer.changes ? ` (sent ${answer.changes + 1} times)` : ""
  const words = isStale
    ? `Sent at ${clockOf(answer.answered)}${again};  changed since:  press Send again to send the new ones.`
    : `Sent to Claude at ${clockOf(answer.answered)}${again}:  ${changes} ${changes === 1 ? "box" : "boxes"}.  Change anything and press Send again to resend.`
  bar.done.setAttribute("state", isStale ? "warning" : "positive")
  bar.done.replaceChildren(el("p", {}, words))
  bar.done.hidden = false
}

////////////////
// ## The wand:  a comment asking for more details
////////////////

/**
 * Ask Claude for more details on `rule`'s purpose:
 * a comment on its module's table, quoting `text` (the purpose), so its thread shows in that cell.
 * - once per wait:  while its comment waits for Claude, a click does nothing more
 * - NEVER throws:  a failure shows in the toolbar
 */
async function askForDetails(rule, wand, text) {
  if (wand.hasAttribute("data-asked")) return
  bar.error.hidden = true
  wand.setAttribute("loading", "")
  try {
    const table = wand.closest("ui-table")
    const section = table.closest("ui-section")
    await postJSON(COMMENTS_API, {
      page: location.pathname,
      action: "add",
      anchor: table.id,
      kind: "table",
      label: section?.getAttribute("label") ?? "",
      excerpt: squash(textOf(table)).slice(0, EXCERPT_LENGTH).trim(),
      quote: squash(textOf(text)),
      offset: offsetOf(table, text),
      text: `${WAND_WORDS}:  \`${rule.className}\`.`
    })
    showAsked(rule.className, true)
  } catch (error) {
    showError(`Not asked:  ${error.message}`)
  } finally {
    wand.removeAttribute("loading")
  }
}

/** Mark the wands whose comment is waiting for Claude:  this page's comments, as the server has them. */
async function markWands() {
  try {
    const answer = await fetchJSON(COMMENTS_API)
    const asked = new Set()
    for (const comment of answer?.comments ?? []) {
      const className = new RegExp(`^${WAND_WORDS}:  \`([^\`]+)\``).exec(comment.text ?? "")?.[1]
      if (className && comment.turn === "claude") asked.add(className)
    }
    for (const className of wands.keys()) showAsked(className, asked.has(className))
  } catch {
    // the comments routes aren't there:  the wands just stay as they are
  }
}

/** Show `className`'s wand as asked (blue:  Claude has it to do) or not. */
function showAsked(className, isAsked) {
  const wand = wands.get(className)
  if (!wand) return
  wand.toggleAttribute("data-asked", isAsked)
  if (isAsked) wand.setAttribute("color", "primary")
  else wand.removeAttribute("color")
  wand.setAttribute("appearance", isAsked ? "circular" : "circular basic")
  wand.title = isAsked
    ? "Asked Claude for more details:  the thread is below"
    : `${WAND_WORDS}:  ask Claude, in a comment here`
  titleInside(wand)
}

/**
 * `block`'s text as a comment reads it (`BlockAnchors.js` `textOf()`):
 * its text nodes, a space after each element's, the runtime's own additions left out.
 */
function textOf(block) {
  return runsOf(block)
    .map((run) => run.text)
    .join("")
}

/** Where `node` starts in `block`'s squashed text, in characters (`BlockAnchors.js` `offsetIn()`). */
function offsetOf(block, node) {
  let before = ""
  for (const run of runsOf(block)) {
    if (run.node === node) return squash(`${before}x`).length - 1
    before += run.text
  }
  return 0
}

/** `block`'s text runs, in order:  `{ node, text }`;  `node` is set on each element's first run. */
function runsOf(block) {
  const runs = []
  const walk = (node) => {
    if (node.nodeType === 3) return runs.push({ node: null, text: node.textContent })
    if (node.nodeType !== 1 || (node !== block && node.matches("[data-spell-added]"))) return
    runs.push({ node, text: "" })
    for (const child of node.childNodes) walk(child)
    runs.push({ node: null, text: " " })
  }
  walk(block)
  return runs
}

////////////////
// ## Helpers
////////////////

/** `text` with runs of white space as one space, trimmed. */
function squash(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
}
