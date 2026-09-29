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
- **Pinned at** -- `spike/lit/src/**/*.test.ts` disable axe `color-contrast`;  `spike/lit/REPORT.md` (j) 2.
