# element

The kit's `element/`, `spell-kit/element`:  what makes a custom element on Solid 2, for every set's elements
(Spell UI's, the epics', the app's, the brand's).

- The component and DOM element bases, the reactive members' decorators, shadow events, hot reloading.
- What every set shares around them (epic `repo-split` P10, from Spell UI):
  - `test-helpers/`:  the test helpers every set's tests use, `spell-kit/test-helpers/<Name>`
    (`Fixture`, `ElementFixture`, `A11y`, `Viewport`)
  - `tools/`:  the node tools every set's builds share, `spell-kit/element/tools/<Name>`:
    the component pack build, the root catalog, the elements' Vite settings, the HMR plugin, the dev server ...
  - `bin/spell-pack.mjs`:  `spell-pack build | check [<folder>]`, a component pack's build or its check
  - `src/SkeletonText.ts`:  a vocabulary's skeleton text, parsed (`spell-kit/element/SkeletonText`)
- Inside the kit, its alias is `$/spell-element`;  another repo imports it as `spell-kit/element`.
- It may use:  util's generic files (`$/util/class` ...) and the toolchain, both the kit's.
- Cut from [spell-app](https://github.com/spell-app/spell-app) with its history as the repo spell-element
  (epic `repo-split` P8), then merged into the kit (P9).
- Its tests:  the kit's `tests/element/`, in a real browser.
  `yarn kit:test` at the kit's root runs them, among the rest;  `yarn vp test run` here, alone.

Rules for humans and agents:  [AGENTS.md](AGENTS.md).
