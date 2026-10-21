# Coming to Spell UI from Semantic UI, Fomantic UI or Semantic UI React

If you have a page or an app on Semantic UI, Fomantic UI or Semantic UI React, most of what you know carries over.

- The vocabulary is the same:  the component names, the words, the way they combine.
- What changes is where you write it:
  as attributes on `ui-*` tags, instead of classes on `div`s or props on React components.

This page shows the mapping, what's different, and the migration tool as it's planned.

- Spell UI's families are Fomantic UI 2.9.4's, every one of them ported, plus a few of its own
  ([README-components.md](README-components.md)).
- Their CSS is a port of Fomantic's, so a ported page looks the same out of the box with the `classic` theme.

## The same card, three ways

Fomantic UI's classes:

```html
<div class="ui card">
  <div class="image"><img src="kristy.png" alt="Kristy" /></div>
  <div class="content">
    <a class="header" href="#kristy">Kristy</a>
    <div class="meta"><span>Joined in 2013</span></div>
    <div class="description">Kristy is an art director living in New York.</div>
  </div>
  <div class="extra content">
    <a href="#kristy-friends"><i class="user icon"></i> 22 Friends</a>
  </div>
</div>
```

Semantic UI React's components:

```jsx
<Card>
  <Image src="kristy.png" alt="Kristy" wrapped ui={false} />
  <Card.Content>
    <Card.Header as="a" href="#kristy">Kristy</Card.Header>
    <Card.Meta><span>Joined in 2013</span></Card.Meta>
    <Card.Description>Kristy is an art director living in New York.</Card.Description>
  </Card.Content>
  <Card.Content extra>
    <a href="#kristy-friends"><Icon name="user" /> 22 Friends</a>
  </Card.Content>
</Card>
```

Spell UI's elements:

```html
<ui-card>
  <img src="kristy.png" alt="Kristy" />
  <ui-content>
    <ui-header href="#kristy">Kristy</ui-header>
    <ui-meta><span>Joined in 2013</span></ui-meta>
    <ui-description>Kristy is an art director living in New York.</ui-description>
  </ui-content>
  <ui-extra><a href="#kristy-friends"><ui-icon name="user"></ui-icon> 22 Friends</a></ui-extra>
</ui-card>
```

- The parts keep their names, as tags of their own:  `header`, `meta`, `description`, `extra`.
  The card styles them, since they're in a card.
- A simple card can also take its parts as attributes:
  `<ui-card header="Kristy" meta="Joined in 2013" description="..." image="kristy.png">`.

## What carries over

The class grammar becomes attributes, word for word:
`class="ui small primary basic button"` becomes `<ui-button size="small" primary basic>`.

- A bare word becomes a bare attribute:  `basic`, `raised`, `fluid`, `circular`, `inverted`.
- A word with a side or a direction takes it as a value:
  `left floated` → `floated="left"`, `left pointing` → `pointing="left"`.
- Size and colour take a value:  `size="small"`, `color="red"`.
- Attributes go in any order.
  Fomantic needs some words in a strict order (`ui left labeled right floated button`);
  Spell UI writes them in the right order itself.
- The taxonomy is the same:  each family's docs page has Fomantic's Types, Content, States and Variations sections,
  with Fomantic's own examples, live.
- The themes:  24 of Fomantic's 25 themes are ported ([README-themes.md](README-themes.md)).

| Fomantic UI | Spell UI |
| --- | --- |
| `<button class="ui button">` | `<ui-button>` |
| `class="ui primary button"` | `<ui-button primary>` |
| `class="ui small basic button"` | `<ui-button size="small" basic>` |
| `class="ui red button"` | `<ui-button color="red">` |
| `class="ui labeled icon button"` + `<i class="save icon">` | `<ui-button labeled icon="save">` |
| `class="ui left floated segment"` | `<ui-segment floated="left">` |
| `class="ui raised segment"` | `<ui-segment raised>` |
| `class="ui top attached segment"` | `<ui-segment attached="top">` |
| `class="ui center aligned segment"` | `<ui-segment text-align="center">` |
| `class="ui warning message"` | `<ui-message state="warning">` |
| `<h2 class="ui dividing header">` | `<ui-header level="2" dividing>` |
| `class="ui left pointing label"` | `<ui-label pointing="left">` |
| `class="ui vertical menu"` | `<ui-menu vertical>` |
| `class="active item"` | `<ui-item selected>` |
| `class="ui three column grid"` | `<ui-grid columns="3">` |
| `class="four wide column"` | `<ui-column width="4">`, or `width="1/4"`, or `width="25%"` |
| `class="ui toggle checkbox"` | `<ui-checkbox type="toggle">` |
| `class="ui disabled button"` | `<ui-button disabled>` |
| `class="ui loading form"` | `<ui-form loading>` |
| `<i class="user icon">` | `<ui-icon name="user">` |

<details>
<summary>Every kind of attribute, and the class it writes</summary>

Each family's vocabulary says what kind each attribute is;  the kind decides the class word.

| Kind | Attribute | Class |
| --- | --- | --- |
| `size` | `size="small"` | `small` |
| | `size="medium"` | nothing:  the default size |
| `color` | `color="red"` | `red` |
| a value only | `state="warning"` | `warning` |
| a bare word | `basic` | `basic` |
| | `very-short` | `very short` |
| value and word | `floated="left"` | `left floated` |
| word, or value and word | `pointing` | `pointing` |
| | `pointing="left"` | `left pointing` |
| several | `only="mobile tablet"` | `mobile only tablet only` |
| width | `width="4"`, `"four"`, `"1/4"`, `"25%"` | `four wide` |
| | `columns="equal"` | `equal width` |
| text alignment | `text-align="left"` | `left aligned` |
| vertical alignment | `vertical-align="middle"` | `middle aligned` |
| a typed property | `href`, `value`, `options` ... | nothing |

- Booleans follow HTML, with one difference:  `basic="false"` and `basic="no"` mean NOT basic.
  - Except `disabled` on a form control:  the browser disables it whenever the attribute is present.
- A value that isn't allowed is dropped, with a "did you mean" warning in development:
  `color="gren"` suggests `green`.
- The live page, with every example:  the docs site's [Grammar page](docs/grammar.html).

</details>

## What changes

The vocabulary stays;  the machinery under it is today's platform.

- **Shadow DOM.**
  Your CSS can't reach inside an element with a selector like `.ui.card .header`.
  Restyle through the four doors instead:  tokens, utility classes, `::part()`, and the app stylesheet,
  which takes Fomantic's class grammar as it is ([README-themes.md](README-themes.md)).
  - Your `.overrides` rules move into the app stylesheet nearly unchanged;  your `.variables` become tokens.
- **No jQuery.**
  There's no `$('.ui.dropdown').dropdown({ ... })`:
  settings are attributes and properties, and behaviours are the elements' own.
  - Callbacks (`onChange`, `onShow`) become events:  `ui-change`, `ui-open`, `ui-close`.
    Each is a `CustomEvent`, with its state in `detail`.
  - Behaviours (`show`, `hide`, `toggle`) become properties or invoker commands:
    - a property:  `modal.visible = true`
    - an invoker command:  `<ui-button commandfor="my-modal" command="--show">`
- **Content parts are shared.**
  One `<ui-header>`, `<ui-content>`, `<ui-meta>` for every owner, never `<ui-card-header>`:
  each is styled by what it's in.
- **A few words changed:**
  - `width`, never `wide`:  `<ui-column width="4">`
  - `selected`, never `active`, for the chosen item, tab or option
    - `checked` is accepted on a checkbox or radio
  - a message's or a field's `warning`, `error`, `success` is `state="..."`
- **Forms are real forms.**
  `<ui-form>` validates over a `<form>` you write (inside it, or around it), and the controls are form-associated:
  they submit, validate and reset like native ones.
- **Loading.**
  No build, no `semantic.json`, no gulp:
  import the root, and each family loads on first use ([README.md](README.md)).

<details>
<summary>What has no counterpart yet</summary>

Every family is ported;  some of Fomantic's settings and variations aren't.
Each family's docs page names what it leaves out, in a "Not ported" note, and why.

- Fomantic's per-component `theme.config`:  one theme applies to the whole page;  mix looks with component tokens.
- The gulp build, `semantic.json`, CDN links and separate CSS / LESS / SASS distributions:
  one package holds everything, and themes are CSS files.
- Fomantic's behaviours and callbacks as JavaScript calls:  the elements' properties and `ui-*` events instead.
- Some of each module's settings, for example:
  - the modal's `allowMultiple: false` (modals always stack) and `detachable`
  - the popup's `exclusive`, `hideOnScroll`, `offset` and `boundary`
  - the transition's group animations (`interval`, `reverse`)
  - Fomantic's API settings on a module (a fetch is a few lines with `UI.api`)
  - image, template, message and card toasts;  social buttons;  HTML5 state history on tabs
- Fomantic's deprecated page grids.
- Translated tag sets (`<ie-tarjeta>`):  designed, partly built ([README-runtime.md](README-runtime.md)).

</details>

## From Semantic UI React

Semantic UI React wraps each component in a React component;  Spell UI needs no wrapper.
React 19 renders `<ui-*>` tags directly ([README-frameworks.md](README-frameworks.md)).

- Props become attributes (strings, numbers, booleans) or properties (arrays and objects):
  React 19 passes a prop as a property when the element has one.
- Callbacks become listeners:  `onChange={(e, data) => ...}` becomes `onui-change={(event) => ...}`.
  The data is in `event.detail`.
- Sub-components become tags:  `<Card.Header>` → `<ui-header>`, `<Dropdown.Item>` → `<ui-item>`.
- Shorthand props (`options`, `header`, `content`) mostly keep their names, as attributes or properties.

Before, a Semantic UI React form:

```jsx
<Form onSubmit={save}>
  <Form.Input label="Name" placeholder="Your name" value={name} onChange={(e, { value }) => setName(value)} />
  <Form.Dropdown label="Fruit" selection options={OPTIONS} value={fruit} onChange={(e, { value }) => setFruit(value)} />
  <Form.Checkbox label="I agree" checked={agreed} onChange={(e, { checked }) => setAgreed(checked)} />
  <Form.Button primary>Save</Form.Button>
</Form>
```

After, with Spell UI:

```jsx
<ui-form>
  <form onSubmit={save}>
    <ui-input label="Name" placeholder="Your name" value={name} onui-change={(event) => setName(event.detail.value)} />
    <ui-field label="Fruit">
      <ui-dropdown selection options={OPTIONS} value={fruit} onui-change={(event) => setFruit(event.detail.value)} />
    </ui-field>
    <ui-checkbox label="I agree" selected={agreed} onui-change={(event) => setAgreed(event.detail.selected)} />
    <ui-button primary type="submit">Save</ui-button>
  </form>
</ui-form>
```

- The `<form>` is yours, inside `<ui-form>`:
  Spell UI never creates or moves it, since your framework owns that DOM.
- A control without a label of its own (the dropdown) takes one from the `<ui-field>` around it.
- This example is written from the contract, not run:  the field names in `detail` are each element's.
  Its docs page's API tab lists its events:  a checkbox sends `{ selected, value }`.

## 🌱 Coming:  the migration tool

A command that rewrites a Fomantic page into Spell UI, file by file:

```sh
spell migrate semantic <folder>
```

- It rewrites class-grammar markup to `ui-*` tags:
  `<div class="ui small primary button">` → `<ui-button size="small" primary>`.
- It reports the classes it couldn't map, file by file, so you know what's left.
- A codemod does the same for Semantic UI React's JSX.
- It leaves a checklist page behind:  the files changed, what's left, what to check by eye.

What it should do, for someone migrating:

- a dry run first, that changes nothing and shows the diff
- one file at a time, as well as a whole folder
- a report of every class it couldn't map, and why
- your theme carried over:  `.variables` to tokens, `.overrides` into the app stylesheet
- a side-by-side check in the browser, the old page beside the new one

Where it stands:  planned, not started.
Today the mapping above is done by hand, family by family, with each family's docs page beside you.

<details>
<summary>The themes that came over from Fomantic</summary>

`classic` is Fomantic's default look, and the base of the rest.
Ported:  amazon, basic, bookish, bootstrap3, chubby, colored, duo, fixed-width, flat, fomantic-classic, github,
gmail, instagram, material, pulsar, raised, resetcss, round, rtl, striped, systemfont, timeline, twitter.

- Not ported:  "Lead By Example" (a separate look-alike project, with its own `theme.config`):  its look is `github`.
- Apply one with `UI.themes.apply("github")`:  [README-themes.md](README-themes.md).

</details>

<details>
<summary>Until repo-split P13 lands</summary>

`spell migrate` doesn't exist yet, in any spelling:  it's planned, not renamed.
Every other command on this page runs today.

</details>

## See also

- [README.md](README.md):  Spell UI's front page
- [README-components.md](README-components.md):  every family, and its docs page
- [README-themes.md](README-themes.md):  tokens, the app stylesheet, the themes
- [README-frameworks.md](README-frameworks.md):  React 19 and the other frameworks
- [README-runtime.md](README-runtime.md):  what's under the elements
- [The kit's front page](../README.md)
- Also beside it:  [README-site.md](README-site.md)
