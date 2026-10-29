# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/markdown/` of the kit's parser folder (`spell/parser/markdown`).

**READ the parser folder's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
- the folder's:  its layout
- WWOD:  the house style every folder shares
- Only what's local is below.
  A section named like a WWOD rule extends it.

## Overview

- GitHub-flavoured markdown on the generic parser (`spell/parser/parser`, `P`), drawing `ui-*` markup.
  - It's the second language on the parser, after spell:  the proof that the parser knows no language.
  - The plan:  [its epic page](../../../spell.epics/epics/markdown/markdown.plan.html).
- It depends only on `spell/parser/parser` and `spell/util`.
  - NEVER import `spell/parser/spell`, or anything above it.
  - `ui` NEVER imports this folder, nor ships it prebuilt:  Spell UI's `<ui-markdown>` draws with marked.
    The app's `<spell-markdown>` draws with it, from source
    ([MDEngine](../../../app/src/app/components/spell-markdown/MDEngine.ts)).
- [MarkdownTokenizer.ts](MarkdownTokenizer.ts):  how text becomes tokens.
  - words:  letters / digits
  - one symbol per other character
  - whitespace rides on the token before it (`LEADING_ONLY`):
    so rulex's spacing (`{spaces}`, touching parts) sees it
- Rules are written in rulex as much as possible ([the Rulex guide](../../../spell.epics/guides/rulex/rulex.html)).
  - What rulex can't say is hand-written:  block nesting, emphasis pairing, "any token but a backtick".
- The tests live in the parser folder's `tests/markdown/`, at the same paths as the code.
- `spec/`:  the GFM spec examples, and their test.
  - `gfm-spec.json`:  the examples, from cmark-gfm's `spec.txt`, by `yarn markdown:spec:update <spec.txt>`
  - [spec.test.ts](../../tests/markdown/spec/spec.test.ts) renders each with the PLAIN-HTML tags,
    and pins the pass count per section in a snapshot.
    - A regression fails it.
    - A gain updates it:  `vitest -u`, after reading the diff.

## Decorators

As WWOD §12, plus:

- The parser folder's [vitest.config.ts](../../vitest.config.ts) uses the toolchain's decorator pre-pass
  (`spell/toolchain/decorators`).

## Types / Exports

As WWOD §8, plus our self-namespace:

- `MD` ~== `spell/parser/markdown`
