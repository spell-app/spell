# spell-server

Serving pages locally (server) and assembling them (assembler):  Spell's generic page-server library.

| Folder | Package | What it is |
| --- | --- | --- |
| [server/](server/) | `@spell-app/server` | serving pages locally:  static folders, an Express-shaped router, live reload, ports, openers, a file lock, the generic page server, the site header |
| [assembler/](assembler/) | `@spell-app/assembler` | assembling pages:  link targets (`Linker`), `formatHTML()`, bundles built on demand (`Bundle`), `DataFile`, `contentFolder` |

- Cut from [spell-app](https://github.com/spell-app/spell-app) with its history (epic `repo-split` P8).
- It may use:  spell-util:  the toolchain (every config), and util's json5 (the assembler's `DataFile`).
- Rules for humans and agents:  [AGENTS.md](AGENTS.md).

## Working on it

It's a child repo of the top repo `spell` (`~/www/spell`), cloned inside it, which holds the ONE install for every
repo:

```sh
cd ~/www/spell && yarn install     # once:  every repo's packages
cd spell-server && yarn review          # ts + lint + format + tests, every package here
```

- No `yarn.lock` here, for now:  the top repo's covers this one.
  Standalone (cloned on its own) isn't supported yet:  it needs the repos below it beside it.
