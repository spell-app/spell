# The designer's rules

What the `/designer` review and the `designer` agent hold every screenshot up against
(epic `epic-engine` P24, request r19;  [the designer skill](../skills/designer/SKILL.md)).
Three files here, read in this order (each fits one read):
- **Owen's taste** (`T1` ...), below in this file:  his own design asks, word for word, each with where he said it.
  They come first, and they WIN where a craft rule says otherwise.
  - `Theme: fruity` on a rule:  it's about the fruity theme's glass and pills, not every theme.
- **Craft** (`C1` ...), [craft.md](craft.md):  interfaces.dev's cheat sheet and articles, and jakub.kr's writing and
  skills, each with its source.
- **Procedures**, [procedures.md](procedures.md):  how jakub.kr's skills go about a review or a fix:  the severity scale,
  reading a screenshot (sizes are ratios, never px from an image alone), reviewing a change against its intent.
- [designer-agent.md](designer-agent.md):  the `designer` agent type, which reads all three.

## How this file learns

Every session that loads it follows these, in the same turn:
- Owen gives design feedback (any epic, any page):  add it to "Owen's taste", his words quoted, typos kept, with the
  epic, phase or item, and date.
  - It repeats a rule:  add the quote to that rule.
  - It's new:  a new `T<n>` under its group, the next free number;  never renumber.
- Owen rejects a finding:  note it under its rule ("Rejected 2026-10-24, epic x:  '...'").
  Rejected twice:  reword the rule to what he meant, or drop it (its id stays retired).
- A craft rule Owen's taste contradicts:  leave both;  the taste rule's text says it wins.
- A craft rule that pulls against one of his:  say so AT the craft rule ("Owen's ... are tighter:  T2 wins").
- It's code:  committed with the turn's other spell-epic changes, versioned per branch.

## Where his asks pull two ways

Ask, with pictures, rather than pick:  he moved on each of these.
- Section headers' glass:  he asked for 30% at rest and 95% stuck, then the reverse, then 50% at rest and 90% stuck
  (built in debut;  T14).
- Bars' colour:  white toolbars, but the sticky page header in the page's own background, not white (T11).
- Tooltips:  his standing rule is the browser's own (`title`), but in debut he asked for a styled dark-glass one (T44
  against T45):  the browser's unless the page is one he asked a styled one for.


## Owen's taste

Rules the `/designer` review checks a screenshot against.
Each rule has an id (`T<n>`), what to look for, Owen's exact words (typos kept), and where he said it.

Sources, short names used below:
- **debut R1-R7**:  epic `debut`, P2 · fruity theme, Owen's seven rounds of notes on Spell UI's docs in fruity,
  2026-10-23 (the epic page's `<epic-update>` blocks, and his messages in the debut session).
  Screenshots in `spell.epics/epics/debut/tests/`:
  R1 `v1-owen-1.png` · R2 `v1-owen-2.png`, `-3` · R3 `-6` · R4 `-7`, `-8` · R5 `-9`, `-10` · R6 `-14`, `-15`, `-16` ·
  R7 `-21` to `-26`.
- **debut late**:  his shorter notes after R7, the same evening (pasted screenshots, no file kept);
  each is a row on the details page `epics/debut/details/fruity-requests.html`.
- **spell-epic AGENTS**:  `spell-epic/src/AGENTS.md`, where his rulings on the epic and docs pages are quoted.
- **memory**:  `~/.claude/projects/-Users-owen-www-spell/memory/feedback_*.md`, his standing rules.

### Spacing & density

#### T1 · Don't pad things out
- Look for:  generous padding added "to make it breathe";  controls swimming in space;  a header much taller than
  its content.
- Owen:
  - "DO NOT go too crazy and add tons of padding around elements.  Use the buttons page as an example."
  - "Page header:  too much whitspace."
  - "Docs header could be shorter"
- Source:  debut R2 (`v1-owen-2.png`, `-3`);  R7 (`v1-owen-21`-`26`);  debut late.

#### T2 · Related things sit close together
- Look for:  gaps between items in one group as wide as gaps between groups;  a wordmark far from the links after
  it;  keyboard keys spread apart.
- Owen:
  - "Less space between SpellUI and breadcrumb."  "Less space between search and theme."
  - "Make search / theme buttons closer together."
  - "less space between bug / palette / new window -- match icon spacing in top bar"
  - "Too much space to right of bullhorn"
  - "Less space between example blocks."
  - "cmd+k closer together -- reads as \"press separately\" when spread out."
- Source:  debut R7;  debut late (top bar, page header, nav flyout rows).

#### T3 · Equal space on both sides
- Look for:  more space above than below (or left than right) of a divider, a breadcrumb, a button in its frame.
- Owen:
  - "Spacing on either side of the divider should be the same.  1/2 way between left and right"
  - "Uneven amount of space above and below the breadcrumbs here, bottom looks good"
  - "Inconsistent spacing on the \"show code\" button"
  - "on top, same amount on top as is currently on the bottom"
- Source:  debut R7;  debut late.

#### T4 · No gap where nothing is
- Look for:  an empty band between a folded section and the next title;  space between a header and its first
  section;  stray margins.
- Owen:
  - "No space between types and content when types is collapsed."
  - "No space betwen types/breadcrumb when non-sticky."
  - "No space between header and first section when expanded"
  - "Remove this margin"
- Source:  debut R6, R7;  debut late.
- NOTE:  he first wrote "No space betwen", and an agent read it as "add space";  he meant NONE.

#### T5 · Tabs get room inside, groups get room outside
- Look for:  tab labels cramped against their pill's ends;  a tab group jammed against the page edge.
- Owen:
  - "Add more horizontal padding for tabs, including `types/groups/etc`."
  - "I meant more margin around tab groups"
  - "Add 40px margin on left/right of this section"
- Source:  debut R4 (`v1-owen-7`, `-8`), R5 (`v1-owen-9`, `-10`);  debut late.

### Surfaces & bars

#### T6 · Header bars run edge to edge;  floating panels don't
- Look for:  a bar's background stopping short of the column's edges;  rounded corners on a full-width toolbar;
  a rule above a toolbar.
- Owen:
  - "Header bars backgrounds should go all the way to the edges."
  - "The beige toolbars ... should be full-page-width, no rounding like plan doc.  They all (including plan doc)
    should have a rule below, but none above."
  - "When sticky, should have vertical margin as well (unlike full-bleed headers)."
- Source:  debut R1 (`v1-owen-1.png`), R5;  epic `airplane` J40, 2026-10-10.

#### T7 · One surface, not a stack of shapes
- Look for:  two bars that belong together drawn as two boxes;  notches where shapes meet;  a second row stretched
  full width when its buttons don't need it.
- Owen:
  - "would look cool if these to tab bars were shown in a single glass surround, with a little bit of padding between
    them."
  - "This looks like crap -- doesn't look like one bar (notches), second tab group doesn't need to be full width."
  - "What about the border around the second line of tabs like the image."
- Source:  debut R5, R7.

#### T8 · No double outlines, no doubled rings
- Look for:  an outline inside an outline;  a badge or round button with a second circle round it.
- Owen:
  - "white double outline looks terriible."
  - "Badges and bullhorn circles are being doubled"
- Source:  debut R5 (`v1-owen-9.png`);  epic `epic-engine` T17, 2026-10-21.

#### T9 · Lose stray lines and colour shifts
- Look for:  a hairline nobody asked for;  the background changing tone at a box's edge, behind code, behind text.
- Owen:
  - "lose whatever is maaking this line in the background, visible on the right"
  - "lose whatever is making that background shift at top of subhead"
  - "Lose whatever is causing background color shift under code"
  - "Ditch background color underneath example text when open."
- Source:  debut R7;  debut late.

#### T10 · Everything matches the theme
- Look for:  one bar, button or tooltip in another theme's colours (an ivory bar on a fruity page, a stock-looking
  button).
- Owen:
  - "Theme picker and owners/variables bars don't match theme."
  - "bug/new window icons don't match the theme at all and can be icon only."
  - (a tooltip) "Doesn't match theme, should be dark glass pill."
- Source:  debut R2 (`v1-owen-2`, `-3`), R6;  debut late.

#### T11 · Bars stand apart from the content under them
- Look for:  a toolbar the same tone as the page beneath, so they read as one.
- Owen:
  - "I like the way that header bars in the first theme example are white, helps distinguish toolbars from content
    underneath them."
  - Later, on the sticky page header:  "Page header stickt -- should be page bg, not white"
  - And:  "Can you duplicate the site background color in under the top stuff, so it doesn't have to go to white,
    kinda like this?"
- Source:  debut R3 (`v1-owen-6.png`);  debut late.
- AMBIGUOUS:  white bars for toolbars, but the page HEADER's sticky strip in the page's own background
  (the wallpaper), not white.

#### T12 · Inverted surrounds are dark enough
- Look for:  an inverted (dark) surround that's washed out.
- Owen:  "inversion surround should be darker"
- Source:  debut late.

#### T68 · Outer rings rounder than inner bits
- Look for:  a round button, pill group or field inside a box whose corners are as round as the box's, or rounder:
  the gap swells at the corner, or the inner piece pokes past the curve.
- Fix:  the inner piece's radius = the outer radius minus the gap between them, and never more
  (a 12px box, a 1px border and 6px of padding:  a 5px field).
  - A pill at the end of a row:  square its END to that radius, its other end stays a pill.
  - Craft says it too:  C22 ("Nested corners are concentric").
- Owen:  "rounding of outer rings needs to be greater than rounding of inner bits"
- Source:  epic `debut`, its theme review (`epics/debut/details/theme-looks.html`), 2026-10-26;
  epic `epic-engine` I138.

### Glass

#### T13 · Glass is light, CSS only, not overdone
- Theme: fruity
- Look for:  heavy frosted panels;  thick opaque bubbles round button groups.
- Owen:
  - "Make a \"fruity\" theme which looks like modern MacOS, simulate glass using CSS only (don't have to go too crazy)"
  - "Lower opacity slightly in headers and bubbles around the button groups etc to simulate glass"
  - "Less opaciity around pill bar."
  - "Nested tabs:  make tab surround 50% opaque."
- Source:  debut kickoff;  R1, R4, R6.

#### T14 · Section headers:  see-through at rest, firmer when stuck, eased between
- Theme: fruity
- Look for:  a header that's MORE opaque at rest than stuck;  a jump in opacity with no transition.
- Owen:
  - "Have some white glass effect (30%) for types/content/divider headers, going to 95% when srticky."
  - "Tokens header -- more opaque when not sticky, less when sticky, transition the opcaity"
  - "opacity on types/etc headers went the wrong way, less transparent when not stickt.  Not animating color."
  - "all of those headers, 50% opaque white when non-sitcky, animated transition to 90% when sitcky.."
  - "white bg around these when sticky should be 50% white, needs to animate color transition"
- Source:  debut R5, R6;  debut late.
- AMBIGUOUS:  he asked three ways;  the settled one is the R6 line, 50% at rest, 90% stuck, animated.

#### T15 · Sticky things are opaque enough to hide what scrolls under
- Theme: fruity
- Look for:  text readable through a stuck bar;  "transparency problems".
- Owen:
  - "transparency problems."
  - "still overlapping top bar poorly, increase opacity on sticky things."
- Source:  debut R2-R3 (`v1-owen-6.png`).

#### T16 · The top bar is see-through until pinned
- Theme: fruity
- Look for:  a solid top bar sitting over the page's top before anything scrolls.
- Owen:  "Would be cool if the top Spell UI bar was transparent-ish when not pinned."
- Source:  debut R4.

#### T17 · Example panes framed as glass, very light
- Theme: fruity
- Look for:  a demo bleeding into the prose;  a pure-white top that reads as a missing border;  a frame inside a frame.
- Owen:
  - "Example panes bleed into the text, need some framing.  Something closer to glass framing when expanded."
  - "top of expanded example shouldn't be full white -- reads as a missing border rather than very very light."
  - "Don't need secondary frame around the HTML inside panel when shown this way, just visual nose."
- Source:  debut R6 (`v1-owen-14`-`16`).

### Alignment

#### T18 · Icons and text centred, always
- Look for:  a glyph off-centre in its button;  a label sitting low or right in its pill;  a bar's buttons bunched
  to one side.
- Owen:
  - "Pay particular attention to e.g. centering of icons and text, you've been getting that wrong a lot."
  - "Types line:  buttons aren't centered within bar or text within button and don't fill screen."
  - "secondary tabs don't center within their button."
  - "\"code\" button should look centered vertically here"
- Source:  epic `epic-components` Q16;  debut R5 (`v1-owen-9`, `-10`), R6;  debut late.

#### T19 · Things line up with their neighbours
- Look for:  links off the bar's line;  one icon higher than the rest;  chevrons and text edges not in one column;
  a button in one row not under its twin in the row above.
- Owen:
  - "Page links don't line up."  "Palette doesn't line up with other icons."
  - "Align new window icon with palette icon on top bar."
  - "Points of the down arrows and left of the text edge should match up vertically"
  - "Line up the copy button center with the code button center."
  - "Hamburger to left, match right padding of top palette."
- Source:  debut R7 (`v1-owen-21`-`26`);  debut late.

#### T20 · Right-side things stay on the right
- Look for:  search or actions wrapping under the title, or drifting left, at narrow widths.
- Owen:
  - "Move hamburger left a bit, move search to right side."
  - "Top bar on small screen -- search should stay to the right."
  - "When the window is thin, the actions in the page header wrap.  They should stay in place and overlap the header
    instead.  Generally, when I say 'float right' I mean 'put them on the right side'"
- Source:  debut R2, R5;  memory `feedback_float_right.md` (2026-10-10).

#### T21 · Numbers right-aligned against their unit
- Look for:  a number input centred or left-aligned, floating away from its `°` / `%` / `px`.
- Owen's ruling (no exact words kept):  number fields right-aligned, tabular figures;  centred numbers "floated away
  from their units".
- Source:  memory `feedback_numeric_fields_right_aligned.md`, epic `design-system`, 2026-10-04.

### Buttons & icons

#### T22 · Icon buttons are plain icons:  no rings, no labels, no borders
- Look for:  a circle outline round a toolbar icon;  a text button ("Copy", "1 theme") where an icon would do;
  toolbar buttons with their titles written out.
- Owen:
  - "Docs header -- lose ring around hamburger, search, pallette icons."
  - "bug/new window icons ... can be icon only."
  - "\"1 theme\" button should be pallete icon to their right rather than a new line."
  - "Change \"Copy\" to copy icon, no border."
  - (the epic page's toolbar) "lose the titles"
- Source:  debut R2, R6;  spell-epic AGENTS ("The TOOLBAR"), epic `airplane` P8, 2026-10-10.

#### T23 · Icons grouped by what they do
- Look for:  actions of different kinds in one run;  no gap between groups.
- Owen:
  - "Icons:  send|wand|bullhorn in a single group.  then some space, then bug | theme | new window."
  - "Move send/wand to the right of the bug icon."
- Source:  debut R7, late.

#### T24 · A button looks like a button, and shows its state
- Look for:  a toolbar arrow you can't tell is clickable;  a button that blends into its frame;  a toggle that
  looks the same open and closed.
- Owen:
  - "Toolbar > button should have 20% white opacity so it's clear what it is."
  - "bg of that should be whiter so it stands out more" (the show-code button)
  - "Code button should look depressed when the panel is open."
- Source:  debut R7;  debut late.

#### T25 · Hover is subtle, and the same across rows
- Look for:  a loud or off-colour hover (violet);  one tab row darkening on hover and another not.
- Owen:
  - "Pull bar hover is bad."
  - "Top tabs should get darkening hover like second level"
- Source:  debut R4 (`v1-owen-7`, `-8`);  debut late.

#### T26 · Secondary controls quiet until wanted
- Look for:  a close × as loud as the content.
- Owen:  "\"X\" smaller, dimmed until hover"
- Source:  debut late (nav flyout).

#### T27 · The wordmark is the same everywhere
- Look for:  "Spell UI" in a different font or size in the flyout than in the top bar;  "UI" smaller than "Spell";
  the hat on the wrong side.
- Owen:
  - "UI in Spell UI is way too small"
  - "Do `Spell UI` consistently with Docs header."
  - "In last, \"Spell UI\" should be same font as in docs header"
  - "Hat to the left of SpellUI."
- Source:  debut R2;  debut late.

#### T28 · Controls big enough to see
- Look for:  tiny icons and toolbars.
- Owen:  the sidebar icon, the Play control and the toolbar are "teeeeny-tiny".
- Source:  epic `claude-design` C11, 2026-10-05 (about Claude Design's canvas).

#### T29 · Every control is a component
- Look for:  a raw-looking `<button>` among Spell UI ones (different height, focus ring, font).
- Owen:
  - "Why are we not using <ui-xxxx> or <epic-xxx> components for these pages?"
  - "make spell-ui-type web components for everything."
- Source:  spell-epic AGENTS (epic `epic-engine` I26, 2026-10-19);  memory `feedback_no_html_string_templates.md`
  (epic `epic-workflow`, 2026-10-11).

### Controls (segmented, toggles, pickers)

#### T30 · Tab bars are pill bars with Apple's sliding thumb
- Theme: fruity
- Look for:  boxy segmented tabs, square ends, a selection that jumps instead of sliding;  a second row that isn't
  pills.
- Owen:
  - "Can we do the slidey-pull bar selected thing like Apple does?"
  - "Make that a look like a pill button bar as well."
  - "Secondary tabs need to be pills like top tabs."
  - "All should be fully rounded pills."
- Source:  debut R4 (`v1-owen-7`, `-8`), R6, R7.

#### T31 · The top row reads as the top row
- Look for:  second-level tabs taller or bigger than the first.
- Owen:
  - "Second level tabs are taller than the top set, and looks bigger -- use slightly larger font on the top."
  - "top tab set is still shorter than the bottom one"
- Source:  debut R7;  debut late.

#### T32 · One picker, not a picker plus toggles
- Look for:  separate day / night buttons beside a theme menu.
- Owen:  "Merge day/night buttons into the theme picker"
- Source:  debut R1 (`v1-owen-1.png`).

#### T33 · Bars don't wrap:  they scroll, with ‹ › arrows
- Look for:  a top bar on two lines;  links vanishing at narrow widths;  overflow with no arrows.
- Owen:
  - "Tighten up top bar so it doesn't wrap."
  - "When the window is narrow, we should see some of the buttons with `<` and `>` buttons when there is more to
    scroll.  Consider `<ui-toolbar>` which has this behavior, subclass of ui-menu."
  - "Docs Header -- I asked for center buttons to scroll with < > arrows on either side when not enough space to show
    everything.  Where did that go?"
  - "Search / sort buttons on the same line."
- Source:  debut R2, R4, R6;  debut late.

#### T34 · Chips say their state by outline and fill
- Look for:  chips that all look alike whatever their state.
- Owen:  "lean into outlines in the item chips ... dashed if not sent, solid border if sent;  once you've done it, it
  goes green solid"
- Source:  epic `airplane` J17, 2026-10-10.

#### T35 · Pickers look ordinary
- Look for:  an odd-shaped control where a plain one would do.
- Owen:  "change to HSL color picker, that triangle just looks weird."
- Source:  epic `design-system` Q14 / J14, 2026-10-04.

#### T36 · Fields to write in grow with the text
- Look for:  a one-line input or fixed-height box for notes or comments.
- Owen's ruling:  long notes in fixed boxes scroll out of view while he writes;  every "tell me more" field grows.
- Source:  memory `feedback_growing_textareas.md`, 2026-10-06.

### Sticky & scrolling

#### T37 · Nothing shows through or over a stuck bar
- Look for:  content or tabs overlapping the top bar while scrolling;  text visible in a gap under the stuck tabs.
- Owen:
  - "Scrolling overlaps the Spell Docs header"
  - "Still overlap with examples/etc tabs."
  - "Don't show content underneath tabs when scrolling up (you had this working at one point)"
- Source:  debut R2 (`v1-owen-2`, `-3`), R4, R6.

#### T38 · Stuck things get room and a shadow
- Look for:  stuck bars touching each other;  no edge where content is cut off.
- Owen:
  - "Add vertical padding when sticky so things don't run together."
  - "sticky headers like this need a shadow when sticky so you can see where content is cut off cleanly"
- Source:  debut R4;  debut late (nav flyout header).

#### T39 · Titles stick, and only once they pin
- Look for:  a page or group title that scrolls away;  a sticky copy appearing before the real one reaches the top.
- Owen:
  - "Breadcrumb title isn't sticky."
  - "breadcrumb sticky showing too early"
  - "\"Get Started\", \"Components\" etc headers sticky"
- Source:  debut R5;  debut late.

#### T40 · A stuck header shrinks to its one top line
- Look for:  the whole header (subhead, extra rows) staying stuck;  a second element faking the stuck state.
- Owen:
  - "As that section scrolls off, the subhead/other content goes away and just the Breadcrumb stays + top icons
    stay, large, transparent."
  - "Page header sticky interaction is still not right, shouldn't need an extra element for this, just re-use the
    existing top bar."
  - "This is how the top \"breadcrumb\" header should look when it is sticky -- leave just the top header line,
    content goes below it."
  - "When Breadcrumb top header is sticky, reduce padding to 1/2 of what's on the top, 1/4 of what's on bottom"
- Source:  debut R6, R7;  debut late.

#### T41 · Nested stuck headers are told apart
- Look for:  a parent and child header that merge into one band when stuck;  a child header greyer than its parent.
- Owen:
  - "Types/ Button headers need some visual differentiation, break when sticky"
  - "\"Breadcrumb\" subheader should read as white rather than grey"
- Source:  debut R4;  debut late.

#### T42 · Moves glide;  nothing jumps
- Look for:  a click that jumps the page;  a panel that vanishes instead of sliding;  a fold that snaps shut.
- Owen:
  - "Clicking secondary tab jumps the entire page rather than tabs gliding up."
  - "flyout sidebar:  doesn't slide back when dismissed, just disappears."
  - "when I click a response and you auto-close the section, make it animate.  It's jarring right now."
- Source:  debut R3 (`v1-owen-6.png`), R6;  epic `airplane` J51, 2026-10-10.

#### T43 · Quick motion, quicker on the way out
- Look for:  slow slide-ins and slower dismissals.
- Owen:  "Animation should be quicker, especially on hide."
- Source:  debut R4.

### Tooltips

#### T44 · Every button has a tooltip:  the browser's own
- Look for:  an icon button with no tooltip;  a styled tooltip component where a plain one would do.
- Owen:
  - "Standing rule:  Tooltips should not be <ui-tooltip>, use the browser tooltip instead.  I'll say `add a ui-tooltip
    with...`"
  - "The buttons don't have browser tooltips -- unclear what they do."
  - "No tooltip on those same buttons"
- Source:  memory `feedback_browser_tooltips.md`, 2026-10-10;  epic `airplane` J63;  spell-epic AGENTS (thread
  buttons).

#### T45 · A styled tooltip, when he asks for one, is a slow dark-glass pill
- Theme: fruity
- Look for:  a pretty tooltip that pops at once, or in a light, off-theme style.
- Owen:
  - "have pretty tooltip which says \"Type <T> to jump to this section\""
  - "tooltip for \"Using it\" etc should wait 1 second before displaying.  Doesn't match theme, should be dark glass
    pill."
- Source:  debut R5, late.

### Folding

#### T46 · Everything folds, and starts folded
- Look for:  a titled box with no chevron;  a page that opens with everything expanded.
- Owen:
  - "Sections / subsections / code blocks should default to closed, open on demand.  Make this a standing rule for all
    created docs"
  - "Owen/Claude entries in the text should be collapsible.  EVERYTHING IN A SECTION BOX SHOULD BE COLLAPSIBLE."
  - "note item is not collapsible, need to push question box to the right"
  - "the entire comment thread should be in one collapsable/accordion pane"
- Source:  memory `feedback_docs_start_folded.md` (2026-10-03), `feedback_sections_collapsible.md` (2026-10-08);
  epic `spell-element` J67;  spell-epic AGENTS ("THREADS", 2026-10-10).

#### T47 · A folded title shows in full
- Look for:  "…" on a folded header.
- Owen:  "I don't like the ellipsis in a collapsed issue/etc header -- make it always show the full title, wrapped"
- Source:  spell-epic AGENTS, 2026-10-19 (epic `epic-engine` V30).

#### T48 · Focus rings the whole line, lightly
- Look for:  a focus ring hugging only the heading's text;  heavy rounded focus boxes.
- Owen:  "Focus on entire line, very light rounding"
- Source:  debut late (section titles).

### Text & titles

#### T49 · Prose isn't dense
- Look for:  long run-together sentences in UI or docs;  insider shorthand.
- Owen:  "Text is waaaay to dense to parse quickly ... That is gobbeldygook."
- Source:  WWOD §6 › "Plain text, plain paths", epic `airplane`, 2026-10-10.

#### T50 · Captions sit outside the frame
- Look for:  an example's description inside its ring, with a tint behind it.
- Owen:
  - "Text for the example should be OUTSIDE the ring (\"a breadcrumb can contain...\")."
  - "When no text between, overlay \"show code\" over the example, so no whitespace above the example inside the
    frame."
- Source:  debut R7 (`v1-owen-21`-`26`).

#### T51 · Old and secondary text is smaller and quieter
- Look for:  comment text the size of body text;  older messages as loud as the newest.
- Owen:
  - "Make text in comments smaller"
  - "Make font smaller for \"not current\" things -- everything other than last message"
  - "Put You in bold, same line, before me and Claude:  before yours"
  - "lighten border around your replies, make it just border-as-shadow"
- Source:  spell-epic AGENTS ("Comments"), 2026-10-10.

### Tables

#### T52 · Tables never stack, and scroll inside themselves
- Look for:  a table drawn as its header cells then each row's cells one under another at a narrow width.
- Owen:  "I hate it"
- Source:  spell-epic AGENTS, 2026-10-19 (epic `epic-engine` I36).

#### T53 · A two-column table's first column never wraps
- Look for:  a key column broken over two lines.
- Owen:  "Two column table -- left column shouldn't wrap"
- Source:  spell-epic AGENTS, 2026-10-19.

#### T54 · Table headers stick;  table tools share the actions row
- Look for:  a long table whose header scrolls away;  an expand button on a line of its own.
- Owen:
  - "make the table headers sticky"
  - "The expand button should be to the right of the bullhorn rather than in its own line"
- Source:  spell-epic AGENTS, 2026-10-19 (epic `epic-engine` r4).

#### T61 · On a phone, what you answer comes first
- Look for:  a table you answer in (a run page, a choice page) whose answer column is off-screen at phone width, so a
  sideways scroll comes before every answer.
- Owen:  "Answer first on phones" (picked from the designer's question on P23's run page)
- Source:  epic `epic-engine` P23, 2026-10-23.


### Colour

#### T55 · Colours carry one meaning each
- Look for:  orange used for something other than "changed since you looked";  a star in the wrong yellow.
- Owen:
  - "make it yellow" (the favourite star)
  - "make the background of the entire bullhorn thread + the last claude reply orange", then "I was expecting this to be
    orange, not ivory"
- Source:  spell-epic AGENTS (epic `airplane` J22, comments, 2026-10-10);  the colour table there is his ruling
  (epic `epic-components` Q20, 2026-10-08):  red needs Owen, yellow open, blue working, green done, orange changed.

#### T62 · Changed from what was proposed is orange, however it changed
- Look for:  a picked alternative drawn one colour and a typed-over value another:  both are "changed", both orange.
- Owen:  "Keep orange" (picked over green for a pick, on P23's run page)
- Source:  epic `epic-engine` P23, 2026-10-23.


### Behaviour:  nothing that does nothing

#### T56 · Remove what does nothing, or doesn't need to be there
- Look for:  dead buttons;  pills and marks with no clear purpose;  links duplicated from elsewhere;  a contents list.
- Owen:
  - "Ditch \"edit\" and \"code\" buttons in that toolbar, they don't do anything anyway."
  - "send button at top of page doesn't appear to be hooked up"
  - "wtf is this?", then "this is so amazingly ugly, ditch it" (an "edit #..." pill over sections)
  - "Don't need to duplicate Guides/etc in this sidebar."
  - "remove the Contents thing entirely ... it is useless"
- Source:  debut R6, late;  epic `airplane` J58, 2026-10-10;  spell-epic AGENTS, 2026-10-08.

#### T57 · If it looks like it does something, make it do it
- Look for:  a letter, mark or icon that suggests a shortcut or action which isn't there.
- Owen:
  - "Why does `types` have the `T`?"
  - "in general, the `T Toolbar` makes it look like I can press the `T` key to show that section.  That would be cool
    functionality if it's not hard to do, but instead of duplicating the letter, the `T` in types could be bold
    underline black."
  - Then:  "Lose underline under T"
- Source:  debut R4, R5.

#### T58 · A click always shows its result
- Look for:  a tab or section clicked but not shown as selected (a short last section, say).
- Owen:  "Not showing \"Themes\" as selected when I click it, likely because themes isn't very tall"
- Source:  debut, after R5.

#### T59 · Side panels are modeless and get out of the way
- Look for:  a scrim behind a nav flyout;  a flyout that stays open after a choice or a click on the page.
- Owen:
  - "Keep the page active when it's visible (no background scrim).  Clicking a component doesn't dismiss sidebar."
  - "Sidebar -- click on the page should make the sidebar hide."
- Source:  debut R3 (`v1-owen-6.png`), R4.

#### T60 · One notice at a time, never over the controls
- Look for:  two toasts at once, overlapping each other or a bar's buttons.
- Owen:  "crappy look and bad functionality when I press orange button at the top of the window"
- Source:  epic `epic-engine` I78, 2026-10-23.

#### T63 · Nothing sends by itself where a command is waiting
- Look for:  a countdown, an auto-send or a timer on a page a running command waits on.
- Owen:  "No countdown on run pages" (the command carries on with exactly what he sent)
- Source:  epic `epic-engine` P23, 2026-10-23.

#### T64 · A status card is the progress:  no log line repeating it
- Look for:  a progress line (or a log) under a status card saying what the card already shows.
- Owen:  "Fold them away" (the run page's progress lines, once it has a status card)
- Source:  epic `epic-engine` P25, 2026-10-23.

#### T65 · Only what's running gets a bar
- Look for:  finished steps still drawing full progress bars, making a tall card of grey.
- Owen:  "Drop it when done"
- Source:  epic `epic-engine` P25, 2026-10-23.

#### T66 · Running time ticks on its own, so slow never looks stuck
- Look for:  an elapsed time that moves only when the work reports in.
- Owen:  "Tick it on the page"
- Source:  epic `epic-engine` P25, 2026-10-23.

#### T67 · Status follows what it's about;  an orange edge says "read this"
- Look for:  "Noted" and "Done" cards trailing at the bottom, cut off from the words they answer;  an "Answer" strip
  repeating what the Choices line says;  nothing marking the newest reply.
- Owen:
  - "I don't like how your 'noted' and 'done' are disconnected from my input and at the bottom"
  - "the 'answer' block is not necessary -- you show the answer in the collapsed `choices` block"
  - "I like the orange border meaning 'pay attention to this'"
- Source:  epic `epic-engine` P27, 2026-10-24 (layout A on its answer layout page).
