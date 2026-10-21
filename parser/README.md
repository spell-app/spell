# spell-lang

The spell language:  the rule-based parser, markdown, the core runtime, Python's writers and spell itself.

| Folder | Package | What it is |
| --- | --- | --- |
| [parser/](parser/) | `@spell-app/parser` | the generic rule-based parser;  Rulex is an opt-in side-effect import, `$/parser/rulex` |
| [markdown/](markdown/) | `@spell-app/markdown` | GitHub-flavoured markdown on the parser, drawing `ui-*` markup |
| [core/](core/) | `@spell-app/core` | the runtime compiled spell runs on |
| [py/](py/) | `@spell-app/py` | Python's writers (`ts/`) and `spell_core` (`core/`, a uv project) |
| [spell/](spell/) | `@spell-app/spell` | the spell LANGUAGE on the parser, `PARSING.md` and `readme.md` |

- Cut from [spell-app](https://github.com/spell-app/spell-app) with its history (epic `repo-split` P8).
- It may use:  the kit:  util's helpers (by package name, `spell-kit/util`) and the toolchain.
- Rules for humans and agents:  [AGENTS.md](AGENTS.md).

## Working on it

It's a child repo of the kit `spell-kit` (`~/www/spell`), cloned inside it, which holds the ONE install for every
repo:

```sh
cd ~/www/spell && yarn install     # once:  every repo's packages
cd spell-lang && yarn review          # ts + lint + format + tests, every package here
```

- No `yarn.lock` here, for now:  the kit's covers this one.
  Standalone (cloned on its own) isn't supported yet:  it needs the repos below it beside it.
