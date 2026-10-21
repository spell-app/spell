# spell-lang

The spell language:  the rule-based parser, markdown, the core runtime, Python's writers and spell itself.

ONE npm package, `spell-lang` (epic `repo-split` P11):  each folder is one of its entries.

| Folder | Entry | What it is |
| --- | --- | --- |
| [parser/](parser/) | `spell-lang/parser` | the generic rule-based parser;  Rulex is an opt-in side-effect import, `$/parser/rulex` |
| [markdown/](markdown/) | `spell-lang/markdown` | GitHub-flavoured markdown on the parser, drawing `ui-*` markup |
| [core/](core/) | `spell-lang/core` | the runtime compiled spell runs on |
| [py/](py/) | `spell-lang/py` | Python's writers (`ts/`) and `spell_core` (`core/`, a uv project) |
| [spell/](spell/) | `spell-lang/spell` | the spell LANGUAGE on the parser, `PARSING.md` and `readme.md` |

- Cut from [spell-app](https://github.com/spell-app/spell-app) with its history (epic `repo-split` P8).
- It may use:  the kit:  util's helpers (by package name, `spell-kit/util`) and the toolchain.
- Rules for humans and agents:  [AGENTS.md](AGENTS.md).

## Working on it

It's a child repo of the kit `spell-kit` (`~/www/spell`), cloned inside it, which holds the ONE install for every
repo:

```sh
cd ~/www/spell && yarn install     # once:  every repo's packages
cd spell-lang && yarn review          # ts + lint + format + tests, every folder here
```

- No `yarn.lock` here, for now:  the kit's covers this one.
  Standalone (cloned on its own) isn't supported yet:  it needs the repos below it beside it.
