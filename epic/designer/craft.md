# Craft

Rules a reviewer can check from screenshots:  desktop and phone, light and dark, plus hover / open / pressed states when they're shot.
Each rule says what to look for, the fix, and where it came from.

Where they came from, all read 2026-10-23:
- [CS] the Interface Cheat Sheet, https://interfaces.dev/cheat-sheet (Jakub Krehel), its markdown copy `https://interfaces.dev/cheat-sheet.md`
- [DT] "Details that make interfaces feel better", https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better
  - the same article as https://jakub.kr/writing/details-that-make-interfaces-feel-better
- [GR] "Understanding gradients", https://interfaces.dev/magazine/issues/understanding-gradients
- [SL] "How I use shared layout animations", https://interfaces.dev/magazine/issues/how-i-use-shared-layout-animations
- [J12] epic `debut`'s J12, "interfaces.dev's cheat sheet, applied to fruity":  the earlier distillation, and the values the fruity theme chose
- Jakub Krehel's agent skills, listed at https://jakub.kr/skills, their text in https://github.com/jakubkrehel/skills (branch `main`):
  - [ui] better-ui, https://github.com/jakubkrehel/skills/blob/main/skills/better-ui/SKILL.md, and its `surfaces.md`, `animations.md`, `enter-exit.md`, `icon-transitions.md`, `icons.md`, `performance.md`
  - [type] better-typography, https://github.com/jakubkrehel/skills/blob/main/skills/better-typography/SKILL.md, and its `spacing-and-sizing.md`, `wrapping-and-punctuation.md`, `details-and-accessibility.md`
  - [color] better-colors, https://github.com/jakubkrehel/skills/blob/main/skills/better-colors/SKILL.md, and its `contrast.md`, `color-usage.md`, `palette-structure.md`
  - [a11y] better-accessibility, https://github.com/jakubkrehel/skills/blob/main/skills/better-accessibility/SKILL.md, and its `hit-areas.md`, `motion-and-zoom.md`, `focus-and-keyboard.md`
  - [layout] better-layout, https://github.com/jakubkrehel/skills/blob/main/skills/better-layout/SKILL.md, and its `grouping-and-alignment.md`, `spacing-and-adaptivity.md`
  - [write] better-writing, https://github.com/jakubkrehel/skills/blob/main/skills/better-writing/SKILL.md, and its `patterns.md`
  - [mifb] make-interfaces-feel-better, https://github.com/jakubkrehel/make-interfaces-feel-better/blob/main/skills/make-interfaces-feel-better/SKILL.md
  - Skills that are procedures, not rules (better-interface, interface-review, break, explain-interface, state-machine, variant, build-design, technical-drawing):
    [procedures.md](procedures.md), beside this file.
- The other 16 issues on interfaces.dev are for subscribers only, and weren't read.

Notes on reading them:
- Where sources differ, every number is given, the skill's first:  it's the newest, and says its values are exact.
  - Press scale:  0.96 over 150ms [ui], 0.95-0.98 over 200ms [CS], 0.97 in fruity [J12].
  - Image outline:  10% [ui] [DT], 8% [CS] and fruity [J12].
  - Staged entrance:  300ms, 12px, 4px blur [ui];  800ms, 8px, 8px blur [DT].
- The skills' numbers are starting points where the project has no scale of its own [layout]:
  a deliberate, consistent project choice (no shadows, a dense layout) is not a finding;  the same thing done two ways is [ui].
- "Live look" marks what a still can't show:  the reviewer flags it for a person to check in the running page.
- Short source names below:  `G` = https://github.com/jakubkrehel/skills/blob/main/skills

## Layout and spacing

- **C1  Group with space:  twice as much between groups as inside one**
  - Never by padding things out:  T1 ("DO NOT go too crazy and add tons of padding") WINS;  tighten inside the group instead.
  - Look for:  items in a group as far apart as the groups are, so the groups don't read as groups;
    lines added to make up for even spacing.
  - Fix:  at least 2x the gap between groups, e.g. 8px between items, 16px or more between groups.
    Space first, a background shape second, separator lines last (dense tables, long settings lists), as low-contrast hairlines.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Layout");  [layout] G/better-layout/SKILL.md, G/better-layout/grouping-and-alignment.md
- **C2  Keep reading lines 60-75 characters**
  - Look for:  paragraphs of an article, guide or long description running the full width of a wide window.
  - Fix:  a cap of 60-75 characters:  `65ch`, or about 560-680px at a 16px body size.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography");  [type] G/better-typography/wrapping-and-punctuation.md
- **C3  Nothing lands under sticky chrome**
  - Look for:  a shot taken after following a `#heading` link, or tabbing, where the heading or focused control sits under a sticky header.
  - Fix:  `scroll-margin-top` on headings, `scroll-padding-top` on the scroller, each the sticky header's height (WCAG 2.4.11).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Layout");  [J12];  [layout] G/better-layout/SKILL.md;  [a11y] G/better-accessibility/focus-and-keyboard.md
- **C4  Long words, links and ids stay inside their box**
  - Look for:  a URL, path or id running past a card's edge, or making the page scroll sideways;
    a grid or flex child pushed wide by a long word or a table.
  - Fix:  `overflow-wrap: break-word` on the text's container;  `minmax(0, 1fr)` tracks, `min-width: 0` on flex children.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography");  [J12];  [type] G/better-typography/SKILL.md;  [layout] G/better-layout/spacing-and-adaptivity.md
- **C5  Labels and badges don't wrap**
  - Look for:  a badge, tag, button label or column label broken onto two lines.
  - Fix:  `white-space: nowrap` on the label, and room for it (or a shorter label).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography");  [type] G/better-typography/SKILL.md
- **C6  Truncated text can be read in full**
  - Look for:  text cut with an ellipsis (a title, a file name, a table cell).
  - Fix:  the whole text in a tooltip or an expanded view;  a hover shot should show it.
    The skill adds:  a hover-only `title` doesn't reach keyboard or touch people;  an expand control or detail view does.
    (House rule:  tooltips are `title`.  So a truncated value people NEED also gets another way to it.)
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography");  [layout] G/better-layout/spacing-and-adaptivity.md
- **C7  An empty view says what belongs there**
  - Look for:  a blank list, table or panel with nothing in it, or only "No items".
  - Fix:  one line on what goes there, and one action to get started.
    A filtered empty view names the query and a way out:  "No results for 'quarterly'.  Clear filters".
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Writing");  [write] G/better-writing/SKILL.md

## Alignment and centring

- **C8  Align by eye, not by the box**
  - Look for:  content that's centred by its bounding box but looks off:  a play triangle that sits left, a star or caret that looks low.
  - Fix:  nudge it optically, e.g. shift a play triangle 2px toward its point;
    the best fix is inside the SVG itself, so no margin or padding is needed.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("User Interface");  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Align optically, not geometrically");  [ui] G/better-ui/surfaces.md
- **C9  2px less padding on a button's icon side**
  - Look for:  a button with an icon and text whose icon side looks wider than its text side.
  - Fix:  the icon side 2px less than the text side (16px against 14px), then judge by eye.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better;  [ui] G/better-ui/surfaces.md

## Typography

- **C10  Headings balanced, descriptions pretty**
  - Look for:  a heading with one long line and one short one;  a lede or description ending in a lone word (an orphan).
  - Fix:  `text-wrap: balance` on headings and short descriptions (Chromium ignores it past 6 lines), `text-wrap: pretty` on paragraphs.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Text wrapping");  [J12];  [type] G/better-typography/SKILL.md
- **C11  Tabular numbers where numbers line up or change**
  - Look for:  columns of numbers in a table whose digits don't line up;  timers, counters, prices, stats.
  - Fix:  `font-variant-numeric: tabular-nums` (not needed in a monospace font);  figures in prose stay proportional.
    Some fonts, Inter among them, change the look of their numerals with it:  check the shot after.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Use tabular numbers");  [type] G/better-typography/SKILL.md
- **C12  Crisp text on macOS**
  - Look for:  text on a Mac shot that looks heavy, bolder than its weight.
  - Fix:  `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` once on the root, never per component.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Make text crispy");  [J12];  [type] G/better-typography/SKILL.md;  [mifb]
- **C13  Underlines skip the descenders**
  - Look for:  a link's underline crossing the tails of g, y, p, or sitting too heavy or too close.
  - Fix:  `text-underline-position: from-font` and `text-decoration-thickness: from-font`, with `text-decoration-skip-ink: auto`.
    A dotted underline means "this word has more to it" (an abbreviation, a defined term).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography");  [J12];  [type] G/better-typography/SKILL.md
- **C14  Smart punctuation**
  - Look for:  straight quotes ("), a hyphen in a range (1-5), three dots (...) in UI text;  "10 km" broken across lines.
  - Fix:  curly quotes, an en dash for ranges (1–5), an em dash for asides, an ellipsis character (…), a non-breaking space inside a value.
    Code keeps straight quotes.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography");  [type] G/better-typography/wrapping-and-punctuation.md
- **C15  Capitalisation the same everywhere**
  - Look for:  "Save Changes" beside "Discard changes";  headings in Title Case beside ones in sentence case.
  - Fix:  one style per kind of element (buttons, headings, labels):  sentence case is the safer default.
    Uppercase is `text-transform`, never typed in capitals.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography", "Writing");  [write] G/better-writing/SKILL.md;  [type] G/better-typography/SKILL.md

## Colour and contrast

- **C16  Contrast against what's directly behind**
  - Look for:  text or an icon on a tinted card, an image, a gradient or glass:  it can pass against the page and fail against its own backdrop.
    White text on a mid-tone fill (a Tailwind `500`) usually fails.
  - Fix:  measure the rendered pair, in light AND dark.  WCAG AA:  text 4.5:1;  large text (24px, or 18.67px bold) 3:1;  control edges, states and meaningful graphics 3:1.
    - Glass or a translucent bar:  check over the lightest and the darkest content that scrolls under it.
    - Text over an image:  the worst region, or a scrim.
    - The fix changes lightness, not hue.  Disabled controls and logos are exempt.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Colors");  [color] G/better-colors/contrast.md, G/better-colors/SKILL.md;  [a11y] G/better-accessibility/SKILL.md
- **C17  Never colour (or motion) alone for a state**
  - Look for:  an error, a success, a selected or changed row shown only by a colour change;
    a state change shown only by an animation, with nothing left behind when it ends.
  - Fix:  add an icon, a label or an underline too.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md (WCAG 1.4.1);  [ui] G/better-ui/SKILL.md
- **C18  The accent is the brand, and only the brand**
  - Look for:  the brand colour used for body text or plain controls, or several unrelated "accent" colours on one screen.
  - Fix:  one accent, for the brand's own fills;  `primary` never means both brand and body text.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Colors");  [J12];  [color] G/better-colors/SKILL.md
- **C19  Every palette step has a job**
  - Look for:  near-duplicate greys (two borders, two backgrounds that differ by a hair) on one screen;
    tints that jump from nearly white to quite dark with no step between.
  - Fix:  steps that each have a purpose:  page background, component hover, border, solid fill, body text;  drop the rest.
    A ramp keeps one hue end to end, and steps finer at the light end (about 0.04-0.05 of OKLCH lightness apart, 0.07-0.10 mid-ramp).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Colors");  [color] G/better-colors/SKILL.md, G/better-colors/palette-structure.md
- **C20  Gradients blend in the right colour space**
  - Look for:  a gradient with a muddy grey or dark band in its middle (sRGB between far-apart hues);  or surprise colours never defined (OKLCH swinging round the hue wheel).
  - Fix:  `in oklab` for even brightness (the default to reach for), `in oklch` for vivid middles, `in srgb` for muted midtones;
    or a third stop in the middle.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [GR] https://interfaces.dev/magazine/issues/understanding-gradients ("Gradients and color spaces");  [color] G/better-colors/color-usage.md
- **C21  Hard stops are deliberate**
  - Look for:  a sharp edge in a gradient that should be smooth, or the reverse (a soft blur where stripes or segments were meant).
  - Fix:  two stops at the same position make a hard edge;  a colour hint (`red, 40%, blue`) moves the midpoint without adding a colour.
  - Source:  [GR] https://interfaces.dev/magazine/issues/understanding-gradients ("Color stops", "Color hints")

## Surfaces, borders, shadows and radius

- **C22  Nested corners are concentric**
  - Look for:  a rounded box inside a rounded box (a segment in a track, a button in a card, an image in a frame) whose corners don't run parallel:  the gap is thicker at the corner.
    Most often:  the same radius on both.
  - Fix:  outer radius = inner radius + padding (+ border width).  E.g. a 12px inner in 8px of padding:  a 20px outer.
    Past 24px of padding, or uneven padding, they're separate surfaces:  each keeps its own radius.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Concentric border radius");  [J12] (fruity:  the segmented item is the track's 10px less its 2px padding);  [ui] G/better-ui/surfaces.md;  [mifb]
- **C23  Depth from a layered shadow;  borders for structure**
  - Look for:  raised surfaces (cards, menus, popovers, buttons) edged by a solid grey border that looks pasted on, above all over an image or a tint.
  - Fix:  a layered `box-shadow`, light mode:  `0 0 0 1px` at 6%, `0 1px 2px -1px` at 6%, `0 2px 4px 0` at 4% black.
    Transparent, so it suits any background.  Keep a `1px solid transparent` border under it:  forced-colours mode drops shadows.
    Borders stay on dividers, table cells, inputs (they need 3:1) and selected states.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Use shadows instead of borders");  [J12];  [ui] G/better-ui/SKILL.md, G/better-ui/surfaces.md
- **C24  Hover darkens the same shadow a little**
  - Look for (hover shot):  the hovered card's edge jumping to a different look, or not changing at all.
  - Fix:  the same layers a little darker:  8%, 8%, 6% in light;  in dark, the ring 8% -> 13% [ui] (12% [DT]), over 150ms.
  - Source:  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better;  [ui] G/better-ui/surfaces.md
- **C25  Images get a faint inside outline, pure black or white**
  - Look for:  an image or screenshot whose light edge melts into a light page (or dark into dark);
    an outline in a tinted grey or the accent, which shows as a coloured fringe.
  - Fix:  `outline: 1px solid` pure black in light, pure white in dark, at 10% [ui] [DT] (8% [CS]), `outline-offset: -1px`.
    Not on transparent artwork (logos, illustrations).
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Add an outline to images");  [J12] (fruity:  8%);  [ui] G/better-ui/SKILL.md, G/better-ui/surfaces.md
- **C26  Glows and decorations don't sit over controls**
  - Look for:  a glow, gradient scrim or decoration painted over a button or link (it may swallow its clicks).
  - Fix:  `pointer-events: none` on decorative layers (and `aria-hidden` when it's an element);  a live look confirms the click lands.
    A scrim that closes a modal on click is a control:  it keeps its events.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/hit-areas.md

## Icons and buttons

- **C27  Icon stroke matches the text beside it**
  - Look for:  an icon whose lines look heavier or thinner than the letters next to it;  two icon libraries on one toolbar.
  - Fix:  rendered stroke 1.5px beside regular (400) text at 14-16px, 2px beside 500-600, 2.5px beside bold (700).
    One icon library per surface.  Inline icons at 1-1.25em of the text beside them.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("User Interface");  [ui] G/better-ui/icons.md;  [mifb]
- **C28  Icon-only buttons have a name**
  - Look for:  a button that's only an icon;  a hover shot should show its tooltip, and the markup an `aria-label`.
  - Fix:  a name that says the action ("Delete project", "Close dialog"), never the glyph ("Trash icon", "X");
    a visible label is the start of the name;  never `aria-hidden` on something focusable.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md;  [write] G/better-writing/SKILL.md
- **C29  Button labels start with a verb**
  - Look for:  "OK", "Yes", "Done!", "Let's go!" on a button.
  - Fix:  "Save draft", "Delete project":  the action it takes.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Writing");  [write] G/better-writing/SKILL.md
- **C30  Confirm only what can't be undone, and say what will happen**
  - Look for:  a confirm dialog titled "Are you sure?" with "OK" / "Cancel";  a confirm before something undoable and frequent (archive, move).
  - Fix:  undoable and frequent:  do it, then a toast with Undo ("Project archived.  Undo").
    Otherwise the title names action and object ("Delete 'Q3 report'?"), the body what's lost with counts,
    the buttons "Delete report" and "Cancel".  For an account, workspace or repo:  type its name to confirm.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Writing");  [write] G/better-writing/SKILL.md, G/better-writing/patterns.md
- **C31  The same words through a flow**
  - Look for:  a multi-step flow whose shots say "Next" on one step and "Continue" on another;  "Archive" in a menu, "Move to storage" in its toast;
    "My account" beside "Your settings".
  - Fix:  one word per action and per thing, one point of view:  "Get started", then "Continue" (or "Next") every step, then "Done".
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Writing");  [write] G/better-writing/SKILL.md
- **C32  Buttons press down a little**
  - Look for (pressed shot, or live look):  no visible press, or a big squash;  a disabled button that scales.
  - Fix:  scale to 0.96 over 150ms `ease-out` [ui] (0.95-0.98 over 200ms [CS];  fruity 0.97);  never below 0.95;  never when disabled.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation");  [J12];  [ui] G/better-ui/SKILL.md, G/better-ui/animations.md;  [mifb]

## Controls and states

- **C33  Every input has a visible label**
  - Look for:  an input with only a placeholder, or a label that vanishes once you type;  a dead gap between a checkbox and its text.
  - Fix:  a visible `<label>`, sharing one hit target with its control;
    set `type`, `inputmode` and `autocomplete` so the phone shows the right keyboard (a phone shot of a focused field shows it).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md
- **C34  Submit stays enabled until it starts**
  - Look for:  a greyed-out submit button on a form that hasn't been sent.
  - Fix:  keep it enabled;  check on submit, then mark bad fields (`aria-invalid="true"`), tie each message to its field (`aria-describedby`) and focus the first one.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md
- **C35  Errors sit by their field and say how to fix it**
  - Look for (error-state shot):  one message at the top for several fields;  a red field with no words;
    "Invalid date", "Oops! Something went wrong.", an exclamation mark.
  - Fix:  each message beside its field, as an instruction:  "Enter a date as DD/MM/YYYY";  "Unable to save.  Check your connection and try again."
    Calm, no blame;  a known requirement shown as help text before typing.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [write] G/better-writing/SKILL.md
- **C36  Toggles are labelled by what "on" does**
  - Look for:  "Disable read receipts", "Don't ...", "Hide ..." with a switch, so "on" means off.
  - Fix:  "Send read receipts".
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Writing");  [write] G/better-writing/SKILL.md
- **C37  A link says where it goes**
  - Look for:  "click here", "more", "this" as link text;  two "Learn more" links on one screen.
  - Fix:  the link's text names its destination:  "Read the billing docs", "Learn more about exports".
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Writing");  [write] G/better-writing/SKILL.md
- **C38  Buttons are buttons, links are links**
  - Look for:  something that navigates styled as a button (or acts like one) when it's a link, or a clickable `div`;  hover and focus shots often show it (no focus ring, no pointer).
  - Fix:  `<button>` for actions, `<a href>` for navigation.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md
- **C39  Status messages are polite**
  - Look for:  a toast or banner for a routine update ("Saved") styled as an alarm.
  - Fix:  routine updates `role="status"`, quiet;  `role="alert"` only for urgent errors.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md
- **C40  Address the reader as "you", in plain words**
  - Look for:  "the user" in help text, empty states or settings;  "Please" in a routine instruction;  idioms and jokes that won't translate;
    "click" on a phone screen.
  - Fix:  "you";  cut "please";  "tap" on touch, "click" with a pointer, "select" when both.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Writing");  [write] G/better-writing/SKILL.md

## Motion (what stills show, and what needs a live look)

- **C41  Menus and popovers open from their trigger**
  - Look for (open shot):  a menu not attached to the button that opened it.
  - Live look:  it should grow from the trigger, not from its own centre.
  - Fix:  `transform-origin` set from the trigger's position.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation");  [J12] (the flyout and menus:  components', not the theme's)
- **C42  Menus opened often appear at once**
  - Live look:  a menu used all the time (a context menu, a command menu) that eases in.
  - Fix:  no opening animation;  animate only the close.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation")
- **C43  Exits are quieter than entrances**
  - Live look:  a closing menu or panel that moves out as far and as boldly as it came in.
  - Fix:  opacity, 4px of blur and a small fixed move (-12px) over 150ms `ease-out` [ui];
    slide fully out only when where it goes means something (a drawer closing:  [DT]'s goes to `-70%` with a 0.45s no-bounce spring);
    or just remove it, when motion adds nothing.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Make exit animations subtle");  [ui] G/better-ui/enter-exit.md
- **C44  Icons that swap cross-fade, when the swap is rare**
  - Live look (or two shots, before and after):  a copy icon turning into a check with a hard cut.
  - Fix:  the new icon from scale 0.25 to 1, opacity 0 to 1, blur 4px to 0;  the old one the reverse.
    A spring of 0.3s with bounce 0, or 300ms `cubic-bezier(0.2, 0, 0, 1)`.
    NOT for tab icons or actions revealed on row hover:  those swap at once.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Animate icons contextually");  [ui] G/better-ui/icon-transitions.md;  [mifb]
- **C45  Enter in small groups, staggered, and only for rare moments**
  - Live look:  a whole panel fading in as one block;  or a stagger on something routine.
  - Fix:  title, description and actions each in turn, 100ms apart;  words of a short headline 80ms apart.
    Each with opacity, 4px blur and 12px up, over 300ms `ease-out` [ui];
    [DT]'s:  from 8px down, 8px blur, over 800ms `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Split and stagger entering elements");  [ui] G/better-ui/enter-exit.md
- **C46  Nothing animates on page load, unless meant to**
  - Look for:  a first shot that caught elements mid-fade or half-moved (blurred, faint, offset);  or blank where an animation never ran.
  - Fix:  skip state animations on the first render;  the hidden state lives in the animation's `from`, so content shows if it never runs.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation");  [ui] G/better-ui/SKILL.md, G/better-ui/enter-exit.md
- **C47  Frequent interactions are instant or very fast**
  - Live look:  a row's hover colour lagging behind the pointer;  a keystroke or tab switch that animates.
  - Fix:  instant, or 150ms or less on opacity or background colour (fruity:  100ms).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation");  [J12];  [ui] G/better-ui/SKILL.md
- **C48  Animations can turn round halfway**
  - Live look:  open a menu and close it at once;  it should reverse from where it is, not finish opening first.
  - Fix:  CSS transitions (or springs) for interactions;  keyframes only for sequences that run once.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Make your animations interruptible");  [ui] G/better-ui/animations.md
- **C49  Transitions name their properties**
  - Look for (in the CSS, not the shot):  `transition: all`.  Its symptom live:  colours or sizes animating that shouldn't.
  - Fix:  name each property (`transition-property: scale, opacity`).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation");  [J12];  [ui] G/better-ui/performance.md
- **C50  No 1-2px jitter or first-frame stutter while moving**
  - Live look:  an element that shifts by a pixel or two while it animates, or as it settles, above all in Safari on iOS.
  - Fix:  `will-change` naming the animated property (`transform`, `scale`, `opacity`, `filter`), never `all`, and only where it stutters.
    It makes the element the frame for `position: fixed` children:  a tooltip inside can stop following the window.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation");  [ui] G/better-ui/performance.md
- **C51  A moving element that changes shape keeps its corners smooth**
  - Live look:  a highlight or card that moves between states and whose corner radius jumps instead of morphing.
  - Fix:  animate the radius with the move (one element, shared layout), not by swapping classes.
  - Source:  [SL] https://interfaces.dev/magazine/issues/how-i-use-shared-layout-animations ("Changing values between states")
- **C52  Reduced motion turns movement into a fade**
  - Look for:  a shot taken with reduced motion on that still shows mid-movement states, or parallax / autoplay.
  - Fix:  movement, scale and blur only inside `@media (prefers-reduced-motion: no-preference)`;
    under reduced motion an opacity cross-fade instead (not an instant pop);  no parallax or autoplay at all.
    Spinners, focus rings and hover colours stay.  Fruity presses (C32) only with no preference.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [J12];  [ui] G/better-ui/animations.md;  [a11y] G/better-accessibility/motion-and-zoom.md

## Touch targets and phone width

- **C53  Hit areas big enough, never overlapping**
  - Look for:  small icon buttons, close crosses, links in a dense row;  two targets whose areas touch.
  - Fix:  at least 24x24px (WCAG 2.5.8), or 20px targets with 4px clear between;  aim for 44x44px on touch and 40x40px on desktop.
    The hit area can be bigger than what's drawn.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/hit-areas.md;  [mifb]
- **C54  Hover styles only where there's hover**
  - Look for (phone shot after a tap):  an item still looking hovered, as if selected;  a grey tap flash on top of a control's own pressed look.
  - Fix:  hover styles inside `@media (hover: hover)`;  `-webkit-tap-highlight-color: transparent` where a control draws its own press.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [J12];  [ui] G/better-ui/SKILL.md
- **C55  Nothing scrolls sideways at 320px**
  - Look for:  the phone shot's page wider than the screen:  a cut-off table, code block or long word (C4).
  - Fix:  wrap long text;  scroll only the wide block itself (tables, maps, code);  `width: 100%`, never `100vw` (WCAG 1.4.10).
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Typography");  [a11y] G/better-accessibility/motion-and-zoom.md;  [layout] G/better-layout/SKILL.md

## Dark mode

- **C56  Dark mode is its own palette, not the light one inverted**
  - Look for:  pure black backgrounds with pure white text;  shadows that vanish;  brand colours too loud or muddy on dark.
  - Fix:  a separate dark palette, each semantic token with its own dark value;  the accent at lower chroma, and every pair remeasured.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Colors");  [J12];  [color] G/better-colors/SKILL.md
- **C57  Dark surfaces edge with a light ring, not a shadow**
  - Look for:  cards in dark mode that disappear into the page (a black shadow on black).
  - Fix:  one 1px white ring at 8% (13% [ui] / 12% [DT] on hover):  `0 0 0 1px rgb(255 255 255 / .08)`.  It reads like a border.
  - Source:  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better ("Use shadows instead of borders");  [ui] G/better-ui/surfaces.md
- **C58  Images in dark mode get the white outline**
  - Look for:  a dark image's edge lost on a dark page.
  - Fix:  as C25, pure white at 8-10%.
  - Source:  [CS] https://interfaces.dev/cheat-sheet;  [DT] https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better;  [ui] G/better-ui/surfaces.md
- **C59  Switching light / dark doesn't animate**
  - Live look:  colours sliding over a few hundred ms after the switch, unevenly.
  - Fix:  turn transitions off while the scheme switches, then back on after the next frame.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Animation");  [J12];  [ui] G/better-ui/animations.md
- **C60  One way to pick the theme**
  - Look for:  parts of the page in dark while others stay light (some follow the system, some a `.dark` class).
  - Fix:  one mechanism:  `prefers-color-scheme` or a class, not both.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Colors");  [color] G/better-colors/SKILL.md

## Focus and accessibility

- **C61  Focus rings show on keyboard focus**
  - Look for (focus shot):  no ring at all, a ring on a mouse click, or a ring that vanishes against the colour it crosses.
  - Fix:  style `:focus-visible`, never remove the outline without a replacement (fruity:  a 3px violet ring).
    A custom ring reaches 3:1 against every colour next to it;  2px solid all round is the AAA target.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [J12];  [a11y] G/better-accessibility/SKILL.md, G/better-accessibility/focus-and-keyboard.md
- **C62  Focus order follows the page**
  - Live look:  tabbing jumps around the page out of reading order;  the visual order differs from the source order.
  - Fix:  only `tabindex="0"` and `"-1"`;  never a positive value, never `order` / `row-reverse` to reorder content.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md;  [layout] G/better-layout/SKILL.md
- **C63  Images carry useful alt text**
  - Look for (in the markup):  `alt` that names the file or describes a button's picture, or an `alt` on a purely decorative image.
  - Fix:  say what it shows and why it's there;  an image that IS a button says its action ("Search", not "magnifying glass");  decorative images `alt=""`.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/screen-readers.md
- **C64  Fields accept paste**
  - Live look:  pasting into a password or code field does nothing.
  - Fix:  never block paste.
  - Source:  [CS] https://interfaces.dev/cheat-sheet ("Accessibility");  [a11y] G/better-accessibility/SKILL.md

## From the skills:  layout

- **C65  Controls look like controls**
  - Look for:  an action styled exactly like the text beside it ("Your trial ends soon.  Upgrade now" all grey);
    or the reverse, a badge shaped like the buttons beside it.
  - Fix:  give every control a background, border, underline or a fixed place (a toolbar);  give static things a different shape.
  - Source:  [layout] G/better-layout/SKILL.md, G/better-layout/grouping-and-alignment.md
- **C66  Everything sits on a few shared edges**
  - Look for:  an icon 2px off the text's edge;  a card padded unlike its neighbours;  three different left edges in one column.
  - Fix:  a small set of edges, one spacing step per level of nesting (16px is a good default).
    In tables, numbers align to the end, text to the start.
  - Source:  [layout] G/better-layout/grouping-and-alignment.md
- **C67  The most important thing comes first**
  - Look for:  the one number people came for (a balance, a total) below rows of metadata;  actions leading a row and the name trailing.
  - Fix:  key content near the top and the leading edge;  in a row, what identifies it first, metadata and actions after.
  - Source:  [layout] G/better-layout/SKILL.md, G/better-layout/grouping-and-alignment.md
- **C68  One primary action per view, and one filled button**
  - Look for:  several filled accent buttons competing;  more than 3 secondary actions in a row;
    accent-coloured text on a neutral button (it reads as a link).
  - Fix:  one primary, filled (colour on the background, not the label);  peers neutral;  past 3 secondaries, a menu.
    An accent on the selected tab or checked segment is state, not emphasis:  fine.
  - Source:  [layout] G/better-layout/SKILL.md;  [color] G/better-colors/SKILL.md, G/better-colors/color-usage.md
- **C69  Hidden content shows a cue**
  - Look for:  a row of cards ending exactly at the edge (it looks complete, nobody scrolls);  a collapsed section with no chevron;  "More".
  - Fix:  let the next item peek 16-32px past the edge, or a disclosure control naming what's hidden:  "Show 12 more results".
  - Source:  [layout] G/better-layout/SKILL.md, G/better-layout/spacing-and-adaptivity.md
- **C70  Room between controls, more when they have no border**
  - Owen's toolbars are tighter than this:  T2 (related things close) and T1 (no padding out) WIN.
  - Look for:  borderless icon buttons packed 4px apart;  bordered buttons touching.
  - Fix:  12px between bordered or filled controls;  24px between the visible glyphs of borderless ones;  24px or more between groups of controls.
    A project's own dense spacing stays, as long as hit areas don't overlap.
  - Source:  [layout] G/better-layout/spacing-and-adaptivity.md
- **C71  Buttons inset from the screen's edge;  content may bleed**
  - Look for (phone shot):  a full-width button glued to the screen's sides or bottom, under the home bar;
    text or controls running into a notch or rounded corner.
  - Fix:  16px inline margin on phone, plus the safe-area inset at the bottom.
    Backgrounds and media may run to the edges;  text and controls stay inside the margins.
  - Source:  [layout] G/better-layout/SKILL.md, G/better-layout/spacing-and-adaptivity.md
- **C72  Text boxes grow;  nothing clips at 200% zoom**
  - Look for:  a label cut off in a fixed-width button;  text clipped at the bottom of a fixed-height box;  a zoomed shot where something vanishes.
  - Fix:  `max-width` and `min-height`, never a fixed width or height on a box of text;  rows that wrap.
    The riskiest:  one-word labels (translations grow most there).  Text must survive 200% (WCAG 1.4.4);  zoom never disabled in the viewport meta.
  - Source:  [layout] G/better-layout/SKILL.md, G/better-layout/spacing-and-adaptivity.md;  [a11y] G/better-accessibility/SKILL.md
- **C73  Dialogs fit the screen, with their actions in view**
  - Look for (phone shot):  a modal taller than the screen whose buttons are cut off, or hidden under the browser bar or keyboard.
  - Fix:  `max-height: 100dvh`, a scrolling body, the actions outside the scroll;  full-height panes `100dvh`, not `100vh`.
  - Source:  [layout] G/better-layout/spacing-and-adaptivity.md

## From the skills:  typography

- **C74  Few fonts, few sizes, few weights**
  - Look for:  more than 3 fonts;  many near sizes doing the same job;  two similar sans-serifs side by side (it reads as a mistake).
  - Fix:  a small type scale, each size paired with its line-height and weight;  pair for contrast (a serif headline over a sans body).
    Emphasis is one weight up (400 -> 500), not a size change.
  - Source:  [type] G/better-typography/SKILL.md, G/better-typography/spacing-and-sizing.md
- **C75  No thin weights on small text**
  - Look for:  light or thin text (100-300) under 18px, or faint thin headings.
  - Fix:  400 or heavier below 18px;  100-300 only at 28px and up, and checked against the background even there.
  - Source:  [type] G/better-typography/SKILL.md
- **C76  Heading sizes step down with their level**
  - Look for:  a subheading bigger or bolder than its parent;  a heading smaller than the body text.
  - Fix:  each level a smaller step of the scale;  deep levels may share a size if weight or tracking still tells them apart.
    A starting scale:  display 36px / 1.1 / 600, title 24 / 1.2 / 600, heading 18 / 1.3 / 600, body 16 / 1.5 / 400, caption 13 / 1.4 / 400.
  - Source:  [type] G/better-typography/SKILL.md, G/better-typography/spacing-and-sizing.md
- **C77  Line-height by role**
  - Look for:  wrapped descriptions with tight, heading-like leading;  headings with loose body leading.
  - Fix:  display 1.1, headings 1.2-1.3, body 1.5-1.6;  anything that wraps to 3 or more lines at least 1.4.
  - Source:  [type] G/better-typography/SKILL.md
- **C78  Tracking by size**
  - Look for:  big headings that look loose;  small uppercase labels whose letters crowd.
  - Fix:  headings 24px and up -0.01 to -0.02em;  uppercase labels 14px or smaller +0.05em;  body 0.
  - Source:  [type] G/better-typography/SKILL.md
- **C79  Interface text starts at the start, never justified**
  - Look for:  justified text with rivers of space;  centred paragraphs in app UI.
  - Fix:  `text-align: start`;  justify only in a deliberate editorial layout.
  - Source:  [type] G/better-typography/SKILL.md
- **C80  Size floors, and 16px inputs on phones**
  - Look for:  long-form body text under 16px;  UI text under 12px;
    (phone, live look) the page zooming in when you tap a field with small text.
  - Fix:  body from 16px;  inputs and menus from 14px, captions 13px, rarely below 12px;  inputs at 16px on iOS (sized up on mobile, or scaled).
  - Source:  [type] G/better-typography/SKILL.md, G/better-typography/details-and-accessibility.md
- **C81  Text sits centred in buttons and badges**
  - Look for:  a label that sits low in its pill or button (the font's room above the capitals).
  - Fix:  `text-box: trim-both cap alphabetic` (Chromium 133+, Safari 18.2+;  others keep the old look);  or an optical nudge.
  - Source:  [type] G/better-typography/SKILL.md, G/better-typography/spacing-and-sizing.md
- **C82  No fake bold or italic**
  - Look for:  bold or italic that looks smeared or slanted-by-machine:  the browser drew a weight or style the font doesn't ship.
  - Fix:  load every face the design uses, or use a weight the family has.
  - Source:  [type] G/better-typography/SKILL.md

## From the skills:  colour

- **C83  One colour, one meaning**
  - Look for:  the accent on links AND on decorative headings;  an interactive thing left neutral where the accent means "you can click";
    the danger red on a harmless action;  a status colour close to the brand colour.
  - Fix:  each colour one job across the product;  hues within 15° (OKLCH) count as the same colour, so status hues sit at least 15° from the accent.
    If the brand is red, a destructive action gets another treatment (outlined, with an icon).
  - Source:  [color] G/better-colors/SKILL.md, G/better-colors/color-usage.md, G/better-colors/palette-structure.md
- **C84  Greys keep one temperature**
  - Look for:  a warm grey border on a cool grey background, visible even when neither is nameable alone.
  - Fix:  one neutral ramp, held end to end (pure grey, or tinted at OKLCH chroma 0.005-0.02 toward the accent).
  - Source:  [color] G/better-colors/palette-structure.md
- **C85  Big gradients don't band;  text stays off them**
  - Look for:  visible steps in a large low-contrast gradient (a hero);  text whose contrast changes across a gradient behind it.
  - Fix:  more contrast between stops, a smaller area, or a faint noise layer;  text on a scrim, measured at its worst spot.
  - Source:  [color] G/better-colors/color-usage.md
- **C86  Increased contrast is stronger in both themes**
  - Look for (a shot with "increase contrast" on):  no change;  or a dark-mode colour made darker, which LOWERS its contrast.
  - Fix:  each theme its own increased-contrast value, at least 0.15 OKLCH lightness further from its background.
  - Source:  [color] G/better-colors/color-usage.md

## From the skills:  icons

- **C87  Outline by default, filled when active;  one SVG per icon**
  - Look for:  filled icons everywhere (the active tab has no signal);  outline and filled mixed with no meaning;  an icon whose hover or disabled state is a different drawing.
  - Fix:  outline is the default, fill marks the selected or active state;  states come from colour and opacity (`currentColor`).
  - Source:  [ui] G/better-ui/SKILL.md, G/better-ui/icons.md;  [mifb]
- **C88  Icons stay crisp at the size they're shown**
  - Look for:  a soft or muddy 16px icon (a 24px drawing scaled down);  a detailed glyph you can't read small;  a raster icon.
  - Fix:  the size grid that matches (16, 20, 24), a simpler glyph for small places, always SVG.
  - Source:  [ui] G/better-ui/icons.md
- **C89  Right-to-left mirrors only what points**
  - Look for (an RTL shot):  back arrows and chevrons still pointing the old way;  or a checkmark, clock or logo flipped.
  - Fix:  mirror arrows, chevrons, text-block glyphs, "send";  never logos, checkmarks, objects or media playback.
  - Source:  [ui] G/better-ui/icons.md;  [layout] G/better-layout/grouping-and-alignment.md

## From the skills:  states, copy and timing

- **C90  Status copy is parallel and plain**
  - Look for:  "Saving..." resolving to "Successfully saved your changes!";  a disabled control with no word on why.
  - Fix:  "Saving changes…" -> "Changes saved" (no "successfully");  failed:  what didn't happen, then the next step;
    unavailable:  why and what unlocks it, beside the control ("Add a payment method to publish");  partial:  both counts ("9 of 12 files uploaded.  Retry 3 failed files").
  - Source:  [write] G/better-writing/patterns.md
- **C91  Placeholders show an example**
  - Look for:  a placeholder giving an instruction ("Enter your email address").
  - Fix:  a realistic example in the format accepted:  `name@example.com`, `DD/MM/YYYY`.
  - Source:  [write] G/better-writing/SKILL.md
- **C92  Nothing important runs on a timer**
  - Live look:  a toast with an Undo or an error that vanishes on its own;  a carousel or animation that moves for more than 5s with no pause.
  - Fix:  toasts with an action or error stay until dismissed;  others at least 5s, pausing on hover or focus;
    a visible pause on anything that moves by itself longer than 5s (WCAG 2.2.2).
  - Source:  [a11y] G/better-accessibility/motion-and-zoom.md
- **C93  Scrolling a menu or dialog doesn't scroll the page**
  - Live look:  scroll past the end of a dialog, drawer or menu, and the page behind it moves.
  - Fix:  `overscroll-behavior: contain` on scrollable overlays.
  - Source:  [ui] G/better-ui/SKILL.md
