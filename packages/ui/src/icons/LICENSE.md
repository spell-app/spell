# Icon data attribution

The icon DATA under `src/icons/data/` (icon shapes/paths, names, search terms) is derived from
[Font Awesome 7 Free](https://fontawesome.com), by Fonticons, Inc.

- Icons: [CC BY 4.0 License](https://creativecommons.org/licenses/by/4.0/)
- Fonts: [SIL OFL 1.1 License](https://scripts.sil.org/OFL) -- not applicable here: `@spell/ui` ships SVG
  path data, not font files, so no font is redistributed.
- Code: [MIT License](https://opensource.org/license/mit/) -- covers Font Awesome's own metadata format
  and tooling, which `scripts/gen-icons.ts` reads but doesn't redistribute (the ~6 MB `icons.json` source
  is downloaded at generation time into a temp cache, never committed).

Font Awesome's upstream attribution (required by CC BY 4.0):

> Font Awesome Free by @fontawesome — https://fontawesome.com
> License — https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)

## Alias vocabulary

`src/icons/data/fomantic-aliases.json` is derived from
[Fomantic-UI](https://github.com/fomantic/Fomantic-UI)'s icon class-name vocabulary
(`src/themes/default/elements/icon.variables`), MIT licensed:

> Copyright (c) Fomantic-UI (https://github.com/fomantic/Fomantic-UI)

Only the ALIAS MAPPING (Fomantic class name -> Font Awesome 7 canonical name) is derived from that file --
no Fomantic code, CSS or font is copied into this package. See `docs/icons.md` for how the mapping is built.

## Full attribution requirement

Anything in this package that renders one of these icons (directly, or by consuming `$/icons`) satisfies
Font Awesome's CC BY 4.0 attribution requirement via this file plus `docs/icons.md`. No per-icon attribution
is needed in consuming apps -- Font Awesome's own FAQ treats a single project-level notice as sufficient.
