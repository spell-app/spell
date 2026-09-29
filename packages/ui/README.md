# @spell/ui

Fomantic UI's vocabulary reborn as `ui-*` web components on a modern CSS foundation:  shadow DOM, `@layer`s,
OKLCH tokens, anchor positioning, `<dialog>` / popover, and accessibility built in.  Usable from any framework
or plain HTML.

**Status:**  scaffold.  Tooling, conventions, `src/util` and the test harness exist;  no components yet.

```sh
yarn            # install
yarn review     # tsc + oxlint + oxfmt + tests (Vitest browser mode, chromium)
yarn build      # library build into dist/
```

Design:  see [`docs/plan.md`](docs/plan.md) (and [`docs/`](docs/README.md) for the rest).
Conventions for humans and agents:  [`AGENTS.md`](AGENTS.md).
