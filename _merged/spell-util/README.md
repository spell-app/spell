# spell-util

Spell's bottom layer:  util, the helpers every package shares, and toolchain, the lint, tsconfig, decorators and global types every repo's configs use.

| Folder | Package | What it is |
| --- | --- | --- |
| [util/](util/) | `@spell-app/util` | helpers `ui` and spell share:  small generic ones (`@proto` ...), spell's own in `src/spell/`, and `node/json5` (node only) |
| [toolchain/](toolchain/) | `@spell-app/toolchain` | the lint and format settings and their rules, the decorator pre-pass, the version stamp, the base tsconfig and the global types |

- Cut from [spell-app](https://github.com/spell-app/spell-app) with its history (epic `repo-split` P8).
- It may use:  nothing:  it's the bottom repo.  `util` uses `toolchain` inside it, by package name.
- Rules for humans and agents:  [AGENTS.md](AGENTS.md).

## Working on it

It's a child repo of the top repo `spell` (`~/www/spell`), cloned inside it, which holds the ONE install for every
repo:

```sh
cd ~/www/spell && yarn install     # once:  every repo's packages
cd spell-util && yarn review          # ts + lint + format + tests, every package here
```

- No `yarn.lock` here, for now:  the top repo's covers this one.
  Standalone (cloned on its own) isn't supported yet:  it needs the repos below it beside it.
