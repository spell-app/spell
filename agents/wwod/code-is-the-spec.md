# WWOD option -- the code is the spec

An OPT-IN rule:  read it only when the project's `AGENTS.md` or `CLAUDE.md` says it opts in.  Read with
`agents/wwod/WWOD.md` (the hub).
- It's the opposite of test-first (TDD), where a failing test is written before the code and the tests are the spec:
  superpowers' test-driven-development skill, for one.
- A project picks one way, and says so in its `AGENTS.md`.
  - Spell opts in:  the kit's `AGENTS.md`, "Tests".
  - A project that says nothing:  follow its tests as they are, and ask before rewriting one to match new code.
- Its own file since epic `repo-split` P31 (2026-11-18):  it was a line of WWOD §1, "Code top-down from design intent".

## 21. The code is the spec (opt-in)

- **Source is the spec;  tests follow it:**
  - The source, its types and its implementation, says what the code does.
  - A test that disagrees with the code is rewritten to match it, unless the code is obviously wrong.
  - Why:  the code is drafted top-down from what people see (WWOD §1 › "Code top-down from design intent"), and
    tests written ahead of it pin a shape that changes as it's built.
- **Say which you changed:**
  - A test rewritten to match the code is named in the report, with why the old expectation was wrong
    (WWOD §1 › "Report the gates with numbers, and name what was already broken").
