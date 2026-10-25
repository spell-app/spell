# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/spellx/` of the `spell-parser` package (`spell-parser/spellx`).

**READ the repo root's `AGENTS.md` and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
- the root's:  the repo's layout
- WWOD:  the house style every package shares
- Only what's local is below.
  A section named like a WWOD rule extends it.

## Overview

- SPELLX:  spell's tag-shaped form, a `.spellx` file (epic `elemental-spell`).
  - A template in a prefixed tag (`<spell-view "playing card">`), its members in short tags inside it
    (`<property>`, `<alias>`, `<action>`, `<on mouse down>`, `<draw "front">` ...), prose between them.
  - The plan, and every decision its shape follows:
    [its epic page](../../../spell.epics/epics/elemental-spell/elemental-spell.plan.html).
  - Its page for people:  [README-spellx.md](../../README-spellx.md).
- A `.spellx` file is read by spell's OWN parser (P6, Q69 A):  `spell-parser/spell`'s `SpellxTokenizer` reads its tags as
  tokens, and each tag line parses as its code-spell twin (`SpellxTwin`, J44).  It compiles there, with the rest of spell.
- This folder is its CHUNK TREE, for the editor, the notebook (P12) and agents (J30):
  - [spellx.types.ts](spellx.types.ts):  the tree's nodes, spans and diagnostics
  - [SpellxView.ts](SpellxView.ts):  a file's tree, built from the spellx tokens spell's parser reads it as
  - [SpellxFile.ts](SpellxFile.ts):  a file's tree:  its nodes, diagnostics, `walk()`, `toOutline()`
- It stands on `spell-parser/spell`:  the spellx tokenizer and its tokens, the language's spellx words (`SP.SpellxWords`,
  in each language's `words.ts`) and its messages (the `spellx-*` keys of `parserMessages.ts`).
  - NEVER imported by `spell-parser/spell`, nor by anything below it.
- It compiles nothing and runs no rules:  a body stays raw spell text, with its spans.
  Its diagnostics are the tokenizer's (spellx's own mistakes);  what the rules say is the compiled file's errors.
- Never an HTML or JSX parser (Q5, Q8):  a body's `<`, `&` and indentation stay exactly as written.
- The tests live in the repo's `tests/spellx/`, at the same paths as the code.
  - `fixtures/`:  the epic page's example files (its Overview's o1), English and Spanish;
    their outlines are snapshots (P3's hand-written reader's, which the view still gives).
  - The compile-equality pairs (`X.spellx` beside `X.spell`) are spell's:  the repo's `tests/spell/spellx/`.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `SX` ~== `spell-parser/spellx`
