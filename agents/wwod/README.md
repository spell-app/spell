# `agents/wwod` -- WWOD, "What Would Owen Do?"

The house style for AI coding agents working in Spell's repos (Claude Code, Codex ...):  a hub and topic spokes.
- Tracked in the kit, `spell-kit`, at `agents/wwod/` (epic `repo-split` P9):  edit it there.
  - Every child repo links its `agents` to the kit's (`yarn clone` makes the links;  not spell-epic's), so every
    repo reads this one copy.
  - The content repo's copy, `spell.epics/agents/wwod/`, stays for the checkouts from before the split, until a later
    todo deletes it.
- The three logs beside it (`agents/PAPERCUTS.md`, `SUSPECTED-BUGS.md`, `CODE-DEBT.md`) are links into the content
  repo, `../spell.epics/agents/`:  the logs live there (Q31).

| File | What |
| --- | --- |
| `WWOD.md` | the hub, §1-7, and the "Touching → Also read" table |
| `writing.md` | §6's long before / afters:  docstrings, comments, docs |
| `architecture.md` | §8 architecture & module layout |
| `types.md` | §9 functions & types |
| `server-env.md` | §10-11 server & API, environment |
| `classes-state.md` | §12-16 classes, decorators, state, `Loadable`, value objects, records |
| `solid.md` | §17 Solid component house style (mechanics:  `guides/solid/solid-2.md`) |
| `css.md` | §18 CSS |
| `logging.md` | §19 logging & debug |
| `tests.md` | §20 tests |

## How the rules fit together

- The repo root's `AGENTS.md` holds what's about THIS repo (packages, dependency direction, worktrees, changelog,
  toolchain, ledgers) and sends every agent to `agents/wwod/WWOD.md` first.  Claude Code also loads the hub through
  the root `CLAUDE.md`.
- The hub's table says which spoke to read for what you're touching;  spokes are read on demand.
- Each package's `AGENTS.md` holds only what's local to it;  a section that shares a WWOD rule's name extends it
  ("As WWOD §N, plus:").

## Adding a rule

1. Put it in the spoke for its topic (or the hub, if every task needs it), as a bullet with a **bold title**, so it
   can be cited (format:  the hub's intro).
2. A rule we chose AGAINST:  a `NOT:` line under the winning rule, with the why, so nobody re-proposes it.
3. Cite real code by repo path.
4. New section:  number it after the last (renumbering is fine;  fix the citations).
5. Then `spell dev wwod check`:  every `WWOD §N › "title"` citation and repo path, here and in every `AGENTS.md`,
   `CLAUDE.md` and skill;  exits 1 on a broken one.  A retitled rule breaks its citations.

## History

- 2026-10-04, epic `wwod`:  Owen's WWOD rules from `construct-app` (Svelte), merged with this repo's own rules and
  reviewed file by file.  The epic page, the original files and the triage:  `epics/wwod/`.
