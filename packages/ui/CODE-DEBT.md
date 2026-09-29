# Code debt

Long-term structural debt -- things we know are wrong, have decided NOT to fix right now,
and do not want to rediscover from scratch every few months.

This is durable project documentation.  Unlike `SUSPECTED-BUGS.md` (a disposable scratch list
of possible bugs), entries here are verified and stay until the underlying work is actually done.

## What goes here

Add an entry when ALL of these are true:

- it is **structural** -- spans several files, or is a shape/convention problem rather than a
  local mistake
- it is **too big to fix in passing** -- fixing it is its own task, not a detour inside another one
- it is **known and tolerated** -- we understand the cause and have chosen to live with it,
  so the next person needs the reasoning, not a rediscovery

Typical triggers:

- a refactor exposes a fragility we decide not to chase
- a test or lint rule gets **pinned, skipped or widened** to accommodate a known problem --
  pinning records the damage, this file records the intent to undo it
- a convention in `AGENTS.md` is knowingly violated, and the violation is too wide to fix now

## What does NOT go here

- **local** cleanups -- use an inline `REFACTOR:` marker at the code, where it will be seen
- **suspected bugs** -- `SUSPECTED-BUGS.md`
- **tooling papercuts** -- `PAPERCUTS.md`
- anything you are about to fix anyway

## Entry format

One `##` heading per item, `---` between items, then:

- **Cost** -- what we pay for leaving it
- **Cause** -- the actual mechanism, not a guess
- **Fix** -- the shape of the real solution
- **Pinned at** -- where the problem is currently recorded or worked around


---

## Foundation CSS lands twice on pages that link `ui.css` AND load the runtime

- **Cost** -- every foundation rule exists twice in the document (the linked `ui.css` plus
  `document.adoptedStyleSheets` from `UI.styles.register(..., { page: true })`).  Harmless for the cascade
  (same layers, same rules), but doubles the page-level CSS and confuses devtools.
- **Cause** -- `UIRuntime.registerFoundation()` adopts the foundation into the document unconditionally,
  because a page that only uses components must still get the tokens;  it cannot tell `ui.css` is linked.
- **Fix** -- a marker the linked sheet sets (`:root { --ui-sheet-foundation: loaded }`, the convention
  `tokens.css` already uses for its `:host` fallback), read by `Styles.register()` to skip the document push
  while still adopting into shadow roots.
- **Pinned at** -- `src/runtime/UIRuntime.ts` `registerFoundation()`;  noticed by the docs-site layout.
