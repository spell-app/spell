# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/page/` of the kit's parser folder (`spell/parser/page`).

**READ the parser folder's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
- the folder's:  its layout
- WWOD:  the house style every folder shares
- Only what's local is below.
  A section named like a WWOD rule extends it.

## Overview

- A PAGE's chunk tree (epic `language` P47):  what a page file SAYS, for the notebook editor and agents.
  - A page file holds a page's head, `"button api" is a notebook page`, its body indented under it:
    prose, `##` headings, markup, examples, and the tags it draws with (`<if>`, `<for>`, `<html>`, `<spell>`).
  - Spell's own parser reads and compiles it:  `spell/parser/spell`'s `PageTokenizer` reads its tokens, and
    `PageTwin` reads each tag line as its code-spell twin.  See "Pages" in [PARSING.md](../spell/PARSING.md).
- This folder is its CHUNK TREE (epic `elemental-spell` J30, P12;  epic `notebook`):
  - [page.types.ts](page.types.ts):  the tree's nodes, spans and diagnostics
  - [PageView.ts](PageView.ts):  a file's tree, built from the tokens spell's parser reads it as
  - [PageFile.ts](PageFile.ts):  a file's tree:  its nodes, diagnostics, `walk()`, `toOutline()`
- It stands on `spell/parser/spell`:  the page tokenizer and its tokens, the language's page words (`SP.PageWords`,
  in each language's `words.ts`) and its messages (the `page-*` keys of `parserMessages.ts`).
  - NEVER imported by `spell/parser/spell`, nor by anything below it.
- It compiles nothing and runs no rules:  a hole stays raw spell text, with its span.
  Its diagnostics are the tokenizer's;  what the rules say is the compiled file's errors.
- Never an HTML or JSX parser (Q5, Q8):  a body's `<`, `&` and indentation stay exactly as written.
- Its tests live in the parser folder's `tests/page/`, at the same paths as the code.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `PG` ~== `spell/parser/page`
