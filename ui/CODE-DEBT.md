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

## Hue backgrounds fail WCAG 4.5:1 with white text

- **Cost** -- axe `color-contrast` fails on coloured buttons and labels (the Lit spike had to disable that rule
  in its element tests):  red 4.38:1, orange 2.85, green / positive 2.87, teal 2.7, blue / primary 4.28,
  pink 3.93, basic green 4.18, inverted secondary 2.17 (measured on the class-grammar fragments, so it is the
  palette, not the elements).  Fomantic's own palette fails the same way, so this is inherited, not new.
- **Cause** -- `src/styles/styles.vocabulary.en.ts` picks OKLCH lightness for hue recognisability (~.6-.84),
  and every hue assumes white foreground text (`--ui-<hue>-inverted` etc.).
- **Fix** -- per hue, an `--ui-<hue>-on` foreground token (white or near-black) chosen at generation time by
  contrast against the hue, consumed by button / label / segment text rules;  optionally lower L on the
  saturated hues (blue, red, pink) so white still works there.  `contrast-color()` is Chromium-only, so it
  must be data.  Re-enable `color-contrast` in the element a11y tests afterwards.
- **Pinned at** -- `src/components/*/*.test.tsx` disable axe `color-contrast` (and did in `spike/lit/`, tag
  `archive/lit-spike`;  its `REPORT.md` (j) 2).

---

## `@spell/ui`'s `E` / `V` namespaces cost every page a Rolldown runtime chunk

- **Cost** -- `dist/rolldown-runtime-<hash>.js` (0.29 kB gzip):  one extra request on EVERY page, a button-only
  one included, since `core.js` and each family import it.
- **Cause** -- `src/index.ts`'s `export * as E from "$/elements"` / `export * as V from "$/vocabulary"` need
  Rolldown's `__exportAll`;  with a second user of its runtime module besides `__name` (keepNames), Rolldown
  emits that module as its own shared chunk instead of leaving it in `core.js`.  Without the two namespaces it
  stays in `core.js` (checked).
- **Fix** -- drop the namespaces from the `index` entry (flat named exports, or a separate `@spell/ui/api` entry
  that only apps import), or find a Rolldown option that pins its runtime into `core`.
- **Pinned at** -- not measured:  `yarn measure` builds without the `index` entry;  `docs/report.md` Bundle /
  Method notes it.
