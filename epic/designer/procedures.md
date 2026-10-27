# Procedures:  Jakub Krehel's skills

What each skill at https://jakub.kr/skills does, and how a `/designer` review could use it.

- The skills themselves are installed in the kit, tracked:  `.agents/skills/<name>/SKILL.md` and its reference pages
  (`skills-lock.json` beside them says which version).  Read one there when a procedure below needs its full text.
- Read 2026-10-23, from https://github.com/jakubkrehel/skills (branch `main`) and https://github.com/jakubkrehel/make-interfaces-feel-better.
  - Short name below:  `G` = https://github.com/jakubkrehel/skills/blob/main/skills
- Install:  `npx skills add jakubkrehel/skills`, or as a Claude Code plugin (`/plugin marketplace add jakubkrehel/skills`, `/plugin install interfaces@interfaces`).
- Their screenshot-checkable rules are already in [craft.md](craft.md) (C1-C93, sources `[ui] [type] [color] [a11y] [layout] [write] [mifb]`).
  This file keeps what ISN'T a rule:  procedures, checklists, report shapes.

## What they share, worth copying

- **Evidence, not taste.**  A finding needs something you can show;  a deliberate, consistent project choice (no shadows, its own density, its voice) is not one.
  The same detail done two ways in one project IS one.
- **One severity scale** (better-interface):
  - `HIGH`:  blocks a task, misleads, hides content or controls, risks data loss, or repeats across the product
  - `MEDIUM`:  meaningfully harms comprehension, efficiency or consistency
  - `LOW`:  isolated polish
  - Within a severity, rank by reach:  a token or shared-component fix outranks the same symptom in one leaf.
- **HIGH on sight**, however minor the surface (better-interface's "escalation triggers"):
  1. a control with no accessible name
  2. a focusable control with no visible focus
  3. something a pointer reaches and a keyboard can't
  4. motion that ignores reduced motion
  5. content clipped, overlapped or unreachable at 320px or 200% zoom
  6. body or control text failing its contrast ratio
  7. meaning carried by colour alone
  8. a destructive action with no confirm, undo or distinct look
  9. truncated content with no way to the full text
  10. content past a scroll edge or behind a disclosure with no cue
  11. an error that names no way to recover
  12. a semantic colour used against its meaning (danger red on a harmless action)
  13. a state change carried by motion alone
- **The cheaper fix first:**  delete -> use the platform -> reuse a project token -> correct the value -> add something new.
- **One root cause, one row**, every location listed;  at most 15 findings;  never pad to the cap.
- **Report table:**  `Severity | Domain | Location | Before | After | Why`;  Location is `file:line`, or the screen and component when there's no source.
- **Verdict:**  `Block` while any `HIGH` remains, else `Approve`;  name every domain `Not reviewed`;  never `Approve` what you didn't look at.
  (make-interfaces-feel-better adds `Needs changes` for MEDIUM / LOW only.)
- **Not verified** is a status, never a finding:  a check you couldn't run is listed as such.

## better-interface

- https://jakub.kr/skills#better-interface · G/better-interface/SKILL.md, G/better-interface/review-format.md
- What it does:  one review across all six domains, routed to each `better-*` skill, consolidated into one ranked verdict.
- For `/designer`:  the model for the review's shape.
  1. Resolve the scope (screen, flow, feature);  say it.  Too big:  narrow to one whole flow, the one every person passes through, and say what was left out.
  2. Recon:  the styling system, tokens, components, viewports;  then what the project wrote about its own UI (AGENTS.md, a design-system page).
     A documented convention settles taste, never a HIGH trigger.
  3. Review in this order, so polish doesn't hide failures:  accessibility, layout, writing, typography, colour, UI polish.
  4. Cover the empty, loading, error and narrow states where they exist.
  5. A coverage table first (`Domain | Evidence inspected | Result`), then the one findings table, then verification, then the verdict.
  6. Read-only unless asked to fix.

## better-ui

- https://jakub.kr/skills#better-ui · G/better-ui/SKILL.md (+ `surfaces.md`, `animations.md`, `enter-exit.md`, `icon-transitions.md`, `icons.md`, `performance.md`)
- What it does:  surfaces, icons and motion, with exact values (concentric radius, optical nudges, shadow rings, image outlines, press scale, icon cross-fades, staggers, exits).
- For `/designer`:  rules C8-C9, C22-C27, C32, C43-C50, C54, C57-C59, C87-C88, C93.
  - Its values are exact, except the optical nudges and the 24px concentric cutoff, which are judged by eye.
  - Verification:  walk every state (hover, pressed, selected, loading, empty);  replay motion at 10% speed in the browser's Animations panel.
  - Its code checklist ("Before you finish") is for a code pass, e.g. `transition: all`, `scale` below 0.96, `bounce` not 0, hard-coded `fill="#..."` in an icon.

## better-typography

- https://jakub.kr/skills#better-typography · G/better-typography/SKILL.md (+ `spacing-and-sizing.md`, `wrapping-and-punctuation.md`, `details-and-accessibility.md`, `choosing-fonts.md`, `variable-fonts-and-opentype.md`, `css-cheat-sheet.md`)
- What it does:  type scale, line-height, tracking, measure, wrapping, truncation, punctuation, font features, iOS input zoom.
- For `/designer`:  rules C2, C4-C6, C10-C15, C74-C82.
  - "Measured, not preferred":  unitless line-height, 400+ below 18px, the 60-75 measure, 16px phone inputs and tabular figures are findings;
    letter-spacing, pairing and scale ratios only when they break the project's own scale.
  - Never propose a new typeface unless asked.
  - Verification:  resize with real content to catch wrapping, lone last words and truncation.

## better-colors

- https://jakub.kr/skills#better-colors · G/better-colors/SKILL.md (+ `contrast.md`, `color-usage.md`, `palette-structure.md`, `palette-generation.md`, `token-naming.md`, `color-formats.md`)
- What it does:  builds and audits a colour system:  ramps, roles, semantic token names, contrast, gamut, OKLCH.
- For `/designer`:  rules C16, C18-C20, C56, C60, C68, C83-C86.
  - **Never report a contrast value you didn't measure.**  Sample the pixels, compute the ratio.
  - When a pair fails:  report the pair, its value and the threshold, and leave the colours alone;  they're a design call.
  - Fix recipe when asked:  change lightness, hold hue;  remeasure.  On a mid-lightness background (OKLCH L near 0.75) even black text tops out near APCA Lc 60, so the background must move.
  - APCA levels beside WCAG:  body Lc 75 (90 preferred), labels Lc 60, large text Lc 45, solid icons Lc 30, dividers Lc 15.
  - Palette audit (a procedure, for a theme review):  collect every literal, sort by lightness per hue, collapse near-duplicates (within 0.02 ΔE), give each survivor a role, count the ramps.  Report before changing anything.

## better-accessibility

- https://jakub.kr/skills#better-accessibility · G/better-accessibility/SKILL.md (+ `focus-and-keyboard.md`, `hit-areas.md`, `forms.md`, `screen-readers.md`, `semantics-and-aria.md`, `motion-and-zoom.md`)
- What it does:  keyboard and focus, ARIA, names, forms, announcements, motion and zoom, against WCAG 2.2.
- For `/designer`:  rules C3, C17, C26, C28, C33-C34, C38-C39, C52-C53, C55, C61-C64, C72, C92.
  - A finding cites a WCAG 2.2 A or AA criterion by number, or a task someone can't finish;  the 44 / 40px targets and AAA are recommendations, never HIGH.
  - Two walks, both live:  keyboard only (every flow finishes without a mouse), then a screen reader (every control says name, role, state).
    Screenshots can't do either:  the designer lists them as live checks.
  - "Take the platform default over a rebuild;  remove ARIA rather than add it."

## better-layout

- https://jakub.kr/skills#better-layout · G/better-layout/SKILL.md (+ `grouping-and-alignment.md`, `spacing-and-adaptivity.md`)
- What it does:  grouping, alignment, reading order, responsive structure, room for translations, RTL.
- For `/designer`:  rules C1, C4, C55, C62, C65-C73, C89.
  - A finding needs a failure you can show (a clip, an overlap, a broken mirror, a misread group);  a value off its starting point isn't one.
  - Shots worth asking for:  every supported width, 320px, 200% zoom, the RTL mirror, a long-string locale (German) or pseudo-localised text.
  - Breakpoints come from the content:  keep the wide layout until it stops fitting.

## better-writing

- https://jakub.kr/skills#better-writing · G/better-writing/SKILL.md (+ `patterns.md`)
- What it does:  interface copy:  labels, errors, empty states, confirmations, status, vocabulary.
- For `/designer`:  rules C7, C15, C28-C31, C35-C37, C40, C90-C91.
  - Procedure:  inventory first.  List the noun for each thing and the verb for each action across the screens, then flag the same thing named two ways.
  - Tone by stakes:  warm for success and empty states;  neutral for routine;  calm and plain for errors;  serious for data loss and security.
  - A deliberate brand voice is not a defect;  rewording to taste isn't a finding.

## make-interfaces-feel-better

- https://jakub.kr/skills#make-interfaces-feel-better · https://github.com/jakubkrehel/make-interfaces-feel-better/blob/main/skills/make-interfaces-feel-better/SKILL.md (+ `animations.md`, `icons.md`, `performance.md`, `surfaces.md`, `typography.md`)
- What it does:  the "Details" article as a review skill, 19 principles;  an older, single-skill form of better-ui plus some typography.
- For `/designer`:  its rules merged into [craft.md](craft.md) (`[mifb]`);  two procedure ideas worth keeping:
  - **Two modes:**  `quick` (main path and busiest states, HIGH and MEDIUM only, at most 5) and `full` (everything, at most 15).
  - **"Considered but rejected"**:  1-3 (quick) or 2-5 (full) real near-misses, each with why it was left alone.
    It shows the reviewer looked, and stops the same suggestion coming back.

## interface-review

- https://jakub.kr/skills#interface-review · G/interface-review/SKILL.md (+ `removed-signals.md`, `scope-resolution.md`)
- What it does:  reviews a CHANGE (branch, PR, uncommitted work) for what it introduced or regressed, then hands it to better-interface.  Run by people, not by the model.
- For `/designer`:  how to review a PR's screens rather than a whole product.
  1. Resolve the scope:  the branch's commits plus uncommitted work;  nothing ahead and clean:  ask, never pick `HEAD~1`.
  2. A changed file isn't the subject:  the screens it renders in are.  One hop to its users;  two for tokens and shared parts;  at most 5;  say how many were skipped.
  3. Read the removed lines:  a deleted `aria-label`, `:focus-visible`, `prefers-reduced-motion`, `tabular-nums`, a token swapped for a literal ... is a lead for a Regression.
  4. Status every finding:  `Introduced`, `Regression` or `Pre-existing` (at most 3 of those, as a courtesy).
  5. Hold the change to its stated intent:  a new variant missing hover / focus / disabled / loading;  a new component with no empty, error or narrow state.
  6. Never check out or stash:  fetch refs and read them in place;  render in a separate worktree.
  - Fits Owen's flow:  "bold what drifted from my last stated intent" is step 5.

## explain-interface

- https://jakub.kr/skills#explain-interface · G/explain-interface/SKILL.md (+ `from-an-image.md`, `find-the-effect.md`, `read-the-system.md`, `no-browser.md`)
- What it does:  explains how a site or one effect was built, from a live URL or a screenshot.  Explains, never judges.
- For `/designer`:  **its "Reading a screenshot" page is the method a screenshot review needs:**
  - Exact from pixels:  colours, contrast between any two sampled colours, which colours repeat.
  - Ratios only:  type sizes, spacing, radii, stroke and border weights.  A shot may be 1x, 2x or zoomed:  never report a px value from an image alone.
    If you can spot body text, assume it's 16px and state everything as multiples, saying you assumed it.
  - Unavailable:  tokens, the stack, breakpoints, motion, every state not captured.
  - Colours:  sample, convert to OKLCH, sort by lightness;  check hue drift across a ramp, tinted greys, and measure every pair.
  - Type:  name the category (geometric, grotesque, humanist ...), never the typeface;  count sizes and weights;  count characters on a body line against 60-75.
  - Spacing:  divide every gap by the smallest repeated one:  that's the rhythm;  then check groups are 2x apart.
  - Close by naming what the image hid:  hover, focus, active, disabled, loading, empty, error;  motion;  other widths;  keyboard;  the other theme.
  - Every claim tagged **measured**, **derived** or **inferred**.

## break

- https://jakub.kr/skills#break · G/break/SKILL.md (+ `scenarios.md`)
- What it does:  renders one component on a throwaway page under every scenario that can reach it, side by side, and marks what visibly broke.  Observes, never judges.
- For `/designer`:  a list of shots to ask for, and a "what broke" report.
  - Axes, each kept only when its cue matches the component:
    - content length (empty, one word, typical, several sentences, one unbreakable 60-character string)
    - content shape (emoji, RTL, mixed direction, diacritics and tall scripts, number columns)
    - quantity (0, 1, typical, 10x)
    - container (320px, squeezed by a sibling, very wide):  always
    - state (loading, error, disabled)
    - environment (dark mode, zoom, reduced motion):  for the person to toggle, never simulated
  - Report:  `Scenario | Observed | Owner`;  "Everything survived" is a full report.

## state-machine

- https://jakub.kr/skills#state-machine · G/state-machine/SKILL.md (+ `switcher.md`)
- What it does:  renders every state of one component on a throwaway page, fed mock data, with a switcher (`?__state=empty`), for working on each state.
- For `/designer`:  where the state shots come from.
  - States are the branches the code already has:  data (loading, empty, error, one, typical, long, partly pending, stale), account (plan, role, owner vs member), feature (flag, trial, limit, locked).
  - Real-shaped mock data:  "three rows of 'Test item' make every state look fine."
  - Loading states hold still until switched.

## variant

- https://jakub.kr/skills#variant · G/variant/SKILL.md (+ `picker.md`)
- What it does:  builds 3 (up to 5) versions of one piece, each a different answer on ONE axis (structure, density, emphasis, type, voice), behind a picker in the real page (`?__variant=quiet`).
- For `/designer`:  when a review suggests a direction rather than a fix.
  - Every variant clears the HIGH-on-sight list first:  that floor is never traded.
  - Named for what they are (`Quiet`, `Editorial`, `Dense`), shown one at a time, full size, with real content.

## build-design

- G/build-design/SKILL.md (+ `figma.md`);  in the repo, not on the page
- What it does:  builds UI from a Figma file or an image with the project's own tokens and components, then compares the build with the design.
- For `/designer`:  the compare step is a review recipe.
  - Render each frame's width beside the design;  walk it element by element:  "gap is 12px, design is 16px" is a finding, "feels tight" isn't.
  - Report `Element | Design | Built | Status` (`Matches`, `Rounded to token`, `Deviates, asked`).
  - Ask before rounding visibly:  more than 2px on spacing or size, or a colour on a different step.

## technical-drawing

- G/technical-drawing/SKILL.md;  in the repo, not on the page
- What it does:  precise static drawings of physical objects (views, linework, annotations), with a viewer page and SVG, PNG and PDF downloads.
- For `/designer`:  nothing;  out of scope.
