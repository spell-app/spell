# Class grammar

How a component's attributes become Fomantic's class string inside its shadow root.
Implemented by `ClassBuilder` (`src/elements/ClassBuilder.ts`), driven by the component's vocabulary
(`<name>.vocabulary.en.ts`, schema in `src/vocabulary/vocabulary.types.ts`).

## Why keep the grammar

- Shadow markup keeps Fomantic's classes on semantic elements: `<button class="ui small primary button">`.
- The CSS is then a mechanical port of the `.less`, and the app stylesheet / `::part` override language
  is the vocabulary people already know.
- Fomantic matches multi-word phrases with substring selectors (`[class*="four wide"]`,
  `[class*="left floated"]`), so words must come out in a fixed order.  Attributes are therefore
  enumerated per kind, never free text.
- Class words are ALWAYS canonical English.  Translated attribute names and values are mapped back to
  canonical before they reach `ClassBuilder` (see `translation.md`).

## Shape

```
ui  <size>  <color>  <keyOnly...>  <valueAndKey / keyOrValueAndKey...>  <multiple...>  <width...>  <textAlign>  <verticalAlign>  <noun>  <extra>
```

- `ui` -- always, unless the vocabulary says `ui: false` (context-only parts such as `column`).
- size, then color -- value only.
- keyOnly -- ALPHABETICAL by canonical attribute name, so output doesn't depend on vocabulary order.
- valueAndKey and keyOrValueAndKey -- in VOCABULARY order (interleaved, as declared).
- multiple, width, textAlign, verticalAlign -- in vocabulary order within each kind.
- noun -- the vocabulary's `noun` (`button`, `card`, `column`).
- `extra` -- caller-supplied classes, e.g. a state like `active`.

Example, all at once:

```html
<ui-widget size="large" color="blue" basic fluid pointing="left" floated="right"
           only="mobile" width="8" text-align="center" vertical-align="top">
```

=> `ui large blue basic fluid left pointing right floated mobile only eight wide center aligned top aligned widget`

## Attribute kinds

Semantics are copied from SUI React's `classNameBuilders.js`.  The CSS word ("key") defaults to the attribute
name with `-` replaced by a space (`very-basic` => `very basic`);  a vocabulary can set `key` explicitly.

| Kind | SUI React | Attribute | Class |
|---|---|---|---|
| `size` | value only | `size="small"` | `small` |
| | | `size="medium"` | _(nothing -- default size)_ |
| `color` | value only | `color="red"` | `red` |
| `keyOnly` | `useKeyOnly` -- `val && key` | `basic` | `basic` |
| | | `very-basic` | `very basic` |
| `valueAndKey` | `useValueAndKey` -- `val && val !== true && "val key"` | `floated="left"` | `left floated` |
| | | `floated` (bare) | _(nothing)_ |
| `keyOrValueAndKey` | `useKeyOrValueAndKey` -- `val === true ? key : "val key"` | `pointing` | `pointing` |
| | | `pointing="left"` | `left pointing` |
| `multiple` | `useMultipleProp` | `only="mobile tablet"` | `mobile only tablet only` |
| | | `only="large screen"` | `large screen only` |
| | | `reversed="computer vertically"` | `computer vertically reversed` |
| `width` | `useWidthProp` (+ fractions, percentages) | `width="4"` | `four wide` |
| | | `columns="equal"` (`canEqual`) | `equal width` |
| `textAlign` | `useTextAlignProp` | `text-align="left"` | `left aligned` |
| | | `text-align="justified"` | `justified` |
| `verticalAlign` | `useVerticalAlignProp` | `vertical-align="middle"` | `middle aligned` |
| `boolean`, `enum`, `string`, `number`, `json` | -- | | _(no class; typed property only)_ |

`ClassBuilder.build()` takes PROPERTY values (after conversion), keyed by canonical attribute name:
`true` means "bare" for keyOnly / keyOrValueAndKey, a string / number is the value, falsy emits nothing.

## Widths

The attribute is `width`, NEVER `wide`.  It accepts:

| Form | Example | Columns (of 16) | Class |
|---|---|---|---|
| number | `width="4"` / `.width = 4` | 4 | `four wide` |
| word | `width="four"` | 4 | `four wide` |
| fraction | `width="1/4"`, `"3/4"` | 4, 12 | `four wide`, `twelve wide` |
| percentage | `width="25%"`, `"100%"` | 4, 16 | `four wide`, `sixteen wide` |
| equal | `columns="equal"` | -- | `equal width` (only where `canEqual`) |

- Inexact values (`1/3`, `33%` => 5.33) snap to the nearest column with a dev-time warning.
- Out of range (`0`, `17`, `2/1`) emits nothing, with a dev-time warning.
- `widthClass` on the attribute spec picks the words after the number, like SUI React's `useWidthProp`:
  `"wide"` (default) => `four wide`, `"column"` => `four column` (grid `columns`), `"wide computer"` =>
  `four wide computer` (responsive column widths), `""` => bare `four`.
- `ValueSets.columns(value)` does the parsing, so converters and validators agree with `ClassBuilder`.

## Booleans

Attribute value => boolean, via `Converters.boolean()`:

- absent => false
- `""`, `"true"`, `"yes"`, or the attribute's own name (`disabled="disabled"`) => true
- `"false"`, `"no"`, `"0"` => false -- Vue sends `open="false"` when it can't find a property
- any other present value => true (HTML presence semantics)
- reflection: true => `""`, false => attribute removed; NEVER `"false"`

keyOrValueAndKey attributes use `Converters.keyOrValue()`: bare / `"true"` / `"yes"` => `true`,
`"false"` / `"no"` => `false`, otherwise the (validated) value.

## `medium`

`medium` is a real size meaning "default".  It is accepted, validated and reflected like any other size,
but `ClassBuilder` emits NO class for it -- so `size="medium"` and no `size` render identically, and CSS never
needs a `.medium` rule.

## Value sets

Enumerated values are validated against shared sets in `ValueSets` (or an inline list in the vocabulary):

- `hues` -- `primary secondary red orange yellow olive green teal blue violet purple pink brown grey black`
  (extensible: `ValueSets.add("hues", ...)`)
- `sizes` -- `mini tiny small medium large big huge massive`
- `positions` -- `top left`, `top center`, `top right`, `bottom left`, `bottom center`, `bottom right`,
  `left center`, `right center`
- `attachments` -- `top`, `bottom`, `left`, `right`, `top left`, `top right`, `bottom left`, `bottom right`
- `alignments` -- `left center right justified`;  `verticalAlignments` -- `top middle bottom`
- `floats` -- `left right`;  `devices` -- `mobile tablet computer`, `large screen`, `widescreen`
- `widths` -- `1`..`16` (+ words, fractions, percentages)
- `booleans` -- `true false yes no`

Unknown values are dropped with a dev-time "did you mean" warning (`Converters.enumValue()`, Levenshtein via
`$/util`'s `suggest()`).

## Forms:  `<ui-form>` and the native `<form>`

Class grammar for forms is Fomantic's (`ui large error form`, `required four wide field`, `inline two fields`),
but the FORM itself has to be a real `<form>` in the light DOM:

- A form-associated control (`<ui-input>`, `<ui-checkbox>`, `<ui-dropdown>` ... and native inputs) belongs to the
  nearest `<form>` ANCESTOR in its own tree.  A `<form>` rendered in `<ui-form>`'s shadow root would own none of
  the slotted controls, and a custom element can't BE a form.
- So `<ui-form>` is the form's LOOK and its VALIDATION, around a native form it finds:  one slotted inside it
  (preferred), else the one around it.  It never creates or moves one -- frameworks own that DOM.

```html
<ui-form>
  <form action="/sign-up" method="post">
    <ui-fields widths="2">
      <ui-field required><label for="name">Name</label><ui-input id="name" name="name"></ui-input></ui-field>
      <ui-field><label for="mail">E-mail</label><ui-input id="mail" name="email" type="email"></ui-input></ui-field>
    </ui-fields>
    <ui-message state="error" header="Please fix the fields"></ui-message>
    <ui-button type="submit">Sign up</ui-button>
  </form>
</ui-form>
<script>
  document.querySelector("ui-form").rules = { name: "notEmpty", email: ["notEmpty", "email"] }
</script>
```

- Submission stays native:  `FormData`, `requestSubmit()`, `form.reset()` (controls restore their starting
  values through `formResetCallback`), `<fieldset disabled>`.  `<ui-button type="submit">` and Enter in a
  `<ui-input>` submit the form.
- `<ui-form>` sets `noValidate` on the form (restored on disconnect) and validates on `submit` itself:  its
  `rules` (Fomantic's `fields` shape) plus each control's own constraint validation.  An invalid submit is
  stopped before the page's submit handlers run;  a valid one fires the cancelable `ui-success` first.
- Without a native form, `<ui-form>` still validates (`validate()`, `on="blur|change"`), but nothing submits.
- Prompts render inside each `<ui-field>`'s shadow root (a basic pointing `prompt` label, `role="alert"`);
  `<ui-form>` finds a control's field with `closest(":state(field)")`.  A form / field in a state shows the
  `<ui-message>`s of that state (`native.css`).

## Items:  ONE generic `<ui-item>`

Fomantic's `.item` is shared by dropdown, list and menu (and the Items view).  Here it's one element too,
`<ui-item>` (`src/components/item/`, its own lib entry `@spell/ui/item`), rendered by OWNER CONTEXT like the content
parts -- never `ui-list-item` / `ui-menu-item`:

```html
<ui-dropdown selection><ui-item value="a">Apple</ui-item></ui-dropdown>          <!-- data:  renders <slot> only -->
<ui-list divided><ui-item icon="users">Friends</ui-item></ui-list>                <!-- a list item box -->
<ui-menu pointing><ui-item href="/inbox" active>Inbox</ui-item></ui-menu>         <!-- a menu item link -->
```

- Why one element:  the dropdown's `<ui-item>` contract ALLOWS it -- inside a dropdown it renders nothing but a
  `<slot>` (the dropdown reads it as data and draws its own `role=option` rows), so the same tag can render a box
  wherever an owner wants one.  One vocabulary names everything any owner reads (`value`, `href`, `icon`, `image`,
  `link`, `color`, `position`, `fitted`, `type`, `selected` ...).
- How:  list and menu vocabularies `ownsParts: ["item", ...]`.  The item finds its owner through `PartContext`
  (`:state(in-list)` / `:state(in-menu)`), asks the owner's controller for an `ItemContext` (`ItemOwner`,
  `components.types.ts`:  host role, box role, interactive or not, `aria-current` value), and adopts the owner's
  `styles`, so each owner's sheet holds its item rules (`:host(:state(in-menu)) > .item` beside the static
  `.ui.menu .item`).  A dropdown is a registered non-part component, i.e. a barrier:  its items never find an
  outer menu.
- The box:  `<a href>` with `href`;  a `<button>` for `link` or when the owner says items are interactive
  (selection list, `link` / `pagination` menu, menubar);  else a `<div>` (an item can hold inputs, buttons,
  dropdowns).  `type="header"` => `<div class="item header">`.
- Owner VARIATIONS reach the item's shadow root as inherited `--ui-<owner>-*` tokens the owner root declares
  (`menu.css`, `list.css` headers list them):  the owner root resolves every class combination (`secondary
  pointing`, `vertical tabular`), the item rules only read tokens.
- Chosen state:  `selected` (canonical, class word `active`);  `active` is accepted as an alias on `<ui-item>`,
  Fomantic's word.  Selected => `aria-current` (`page` on a link, `true` otherwise).
- Colour:  an item has no `ui`, so a coloured one adds `ui-<color>` (the utility remap class) for `colors.css`.
- The item is a part (`isPart`):  transparent to other parts, so `<ui-item><ui-content><ui-header>` inside a list
  is the LIST's header (`.ui.list > .item > .content > .header`).
- NOTE: a future Items view (`<ui-items>`) will own `item` too;  its content parts are keyed `in-item` today
  (`parts.css`), which it will need to re-key or emit.

## Menus:  navigation by default, menubar opt-in

- `<ui-menu>` is a `<nav>` landmark by default (the host's `aria-label` names it:  two navs need distinct names),
  its items links;  the selected link is `aria-current="page"`.
- `interactive` makes it an application MENUBAR (APG):  `role="menubar"` (+ `aria-orientation` when `vertical`),
  items `role="menuitem"` (hosts `role="none"`), ONE Tab stop with arrows / Home / End (roving tabindex over the
  items' inner boxes -- a focusable host would hide the menuitem from axe and assistive tech).
- A `<ui-menu>` inside a menu (directly, or inside an item) is a SUB-MENU:  `<div class="[position] menu">`,
  e.g. `<ui-menu position="right">` for Fomantic's `right menu`.  It hands its items the top menu's context.
- `ui-select` (`{ value, item }`) fires when a link / button item is activated;  the menu never moves `selected`.
- `items="3"` => `three item` (evenly divided);  `items="equal"` => `equal width`.
- A dropdown item is an item holding a `<ui-dropdown>`:  `<ui-item><ui-dropdown text="More">...`.

## Tables:  `<ui-table>` and the native `<table>`

A table's semantics stay NATIVE and in the LIGHT DOM;  the element only adds the look, sorting and a scroller:

- Shadow root:  `<div class="[resizable] [attached] [scrolling] scroller" part="scroller"><slot></slot></div>`.
  While `scrolling` / `overflowing` it caps its height, scrolls, and is a focusable, named region (host
  `aria-label`, else the `<caption>`, else the translated `label`).
- Styling:  the element MIRRORS its class string (`ui celled striped red table`) onto the slotted `<table>`,
  adding and removing only its own words (author classes stay;  its phrase follows them in grammar order), and
  registers `table.css` as a PAGE sheet.  One mechanical port of `table.less` then serves element markup and
  static class grammar alike -- SSR writes `<table class="ui celled table">` and paints before any JS -- and
  translated names, `yes` / `no` and `medium` resolve through the vocabulary like everywhere else.  (Host
  attribute selectors, `ui-table[celled] > table`, can do none of those.)
- Rows and cells keep Fomantic's classes on native `tr` / `td` / `th` (`positive`, `red marked left`,
  `collapsing`, `four wide`):  no JS, no elements.
- `stackable` answers to the HOST's width (it's a size container), not the viewport;  static markup keeps
  Fomantic's viewport breakpoints.
- Sorting (`sortable`):  a header's `<button>` is its control (else the header becomes focusable);  the
  cancelable `ui-sort` (`{ column, key, direction }`) comes first, then `sort-column` / `sort-direction` and
  `aria-sort`.  `client-sort` reorders a simple table's rows by cell text;  otherwise the app sorts.
  `th[data-sortable="false"]` (or Fomantic's `th.disabled`) opts a header out.
- `columns="4"` stays Fomantic's equal-width count (`four column`);  the data mode's column list is `columnDefs`.

### Data mode

`table.rows = [...]` (and optionally `table.columnDefs = [{ key, header, textAlign, sortable, width }]`) with NO
slotted `<table>` makes the element render one -- into its LIGHT DOM, text only:  `th scope="col"` headers
(with sort buttons when `sortable`), keyed rows, shown in the current sort order.  It's removed again when
`rows` is unset or an author table appears:  the author's table always wins, and is never overwritten.
Why light DOM:  one styling path (the same page sheet and class grammar as a slotted table), native semantics
in the document (find-in-page, copy, page CSS), and a server can render the same `<table>` markup itself, so
first paint never needs the property.  No virtualization yet:  every row renders.
