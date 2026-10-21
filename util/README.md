# util

The kit's `util/`, `spell-kit/util`:  small generic helpers shared by `@spell-app/ui`, `spell` and the CLI.
Part of the kit's one package, `spell-kit`, private for now.

```ts
import { proto, kebabCase, closestAcrossShadow } from "$/util"
```

- `@proto` -- standard decorator that sets a class default on the prototype, so instances carry no copies
- `@protoMerged` -- `@proto` for a settings object whose keys merge down the class chain (`ui`'s `elementSetup`)
- `@lazy` -- a getter whose value is made on first read, then kept
- `@once` -- a method that runs once, and returns the same result after (a loader's promise)
- `forget(object, "name")` -- drops either's kept value (a `static reset()`)
- `@resets("name")` on an accessor -- each write to it drops that kept value too
  (so `SiteData.url = ...` fetches again)
- `hasOwnProp` ... -- class helpers
- `kebabCase`, `camelCase`, `numberToWord`, `suggest` -- strings
- `closestAcrossShadow`, `isBrowser`, `nextFrame`, `whenDefined` -- DOM
- `Constructor`, `AbstractClass`, `Prettify` -- types
- `$/util/reactive` -- the shared reactive engine:  spell cells, `getProp` / `setProp`, `getState` / `setState`,
  `@prop` / `@state` / `@derived`, `bridgeSolid()`.  Generic, no lodash or Solid;  see `AGENTS.md`

Not published on its own:  `@spell-app/ui` bundles what it uses.
It imports no other package, and has no runtime dependencies.

The kit's `yarn kit:review`, at its root, runs `tsc`, oxlint, oxfmt and the tests (in a real browser), this folder's
among the rest.
See [AGENTS.md](AGENTS.md).
