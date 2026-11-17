import { core, Thing, List, App, Place, prop, derived, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("How Star Wars works")
/////////////////////////
// ## How Star Wars works
/////////////////////////
// The Star Wars example is a guide to the galaxy:  its films, the characters in them, the planets they're from.
// None of it is in the example:  it's asked for as it runs, from a server other people run, swapi.py4e.com.
// Three ideas do the work:
// - a PLACE:  one line says where the server is, and a line per collection says where its rows are
// - a TYPE per collection, which "lives in" the place:  each field of a row is a property,
//   and a field that links to another row is that row's type, "its homeworld is a planet"
// - "for every film" asks for the rows, and draws each one, with lines for while it waits and if it fails
//
// This guide keeps films, characters and planets, a list and a page for each.
// It leaves out search, ships, the pictures from Wikipedia, and the opening crawl.
// Open Star Wars, in the Examples, for all of it.

core.heading("The place:  a server other people run")
///////////////////////////////////////////
// ## The place:  a server other people run
///////////////////////////////////////////

/**
 * Also as `spell place ingest` wrote them, cut down:  it worked out each field's type from what came back.
 * The server sends a film's characters as a list of addresses;  "a list of characters" makes them characters,
 * so `the name of its homeworld` follows the link, and asks for the planet.
 */
export class Film extends Thing {
  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2124, end: 2143 } })
  accessor title!: string

  // - its "episode id" is a number
  @prop({ type: "number", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2145, end: 2173 } })
  accessor episodeId!: number

  // - its "director" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2175, end: 2197 } })
  accessor director!: string

  // - its "release date" is a date
  @prop({ type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2199, end: 2227 } })
  accessor releaseDate!: Date

  // - its "characters" is a list of characters
  static { this.declareProp("characters", { itemType: "Character", init: () => new List<Character>({ instanceType: "Character" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2229, end: 2269 } }) }
  get characters(): List<Character> { return core.linked(this, "characters", Character) as List<Character> }
  set characters(value: List<Character>) { this.setProp("characters", value) }

  // - its "planets" is a list of planets
  static { this.declareProp("planets", { itemType: "Planet", init: () => new List<Planet>({ instanceType: "Planet" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2271, end: 2305 } }) }
  get planets(): List<Planet> { return core.linked(this, "planets", Planet) as List<Planet> }
  set planets(value: List<Planet>) { this.setProp("planets", value) }

  static { this.declareProp("card", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6119, end: 6212 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.title,
      kind: `Episode ${this.episodeId}`,
      subject: this
    })
  }

  @drawn draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6242, end: 6456 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
    known.append(new Fact({ label: "Directed by", value: this.director }))
    known.append(new Fact({ label: "Released", date: this.releaseDate }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawThing(new Section({ heading: "Who's in it", things: this.characters })),
      core.drawRead(() => core.drawThing(new Section({ heading: "Where it happens", things: this.planets })), undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

  ////////////////////////////////////////////////////
  // ## The types:  a field each, and a link is a type
  ////////////////////////////////////////////////////
  static savedIn = {
    place: "star_wars",
    collection: "films",
    times: ["created", "modified"], select: ["title", "episodeId", "director", "releaseDate", "characters", "planets"] }

  // - it lives in star wars
  @prop({ type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2101, end: 2122 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in star wars
  @prop({ type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2101, end: 2122 } })
  accessor modified!: any /* spell: type unknown */
}

export class Character extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2356, end: 2374 } })
  accessor name!: string

  // - its "birth year" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2376, end: 2400 } })
  accessor birthYear!: string

  // - its "hair color" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2402, end: 2426 } })
  accessor hairColor!: string

  // - its "eye color" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2428, end: 2451 } })
  accessor eyeColor!: string

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/HowStarWarsWorks.spell", start: 2453, end: 2480 } }) }
  get homeworld(): Planet { return core.linked(this, "homeworld", Planet) as Planet }
  set homeworld(value: Planet) { this.setProp("homeworld", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2482, end: 2512 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  static { this.declareProp("card", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6793, end: 6882 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: `Born ${this.birthYear}`,
      subject: this
    })
  }

  @drawn draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6912, end: 7117 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
    known.append(new Fact({ label: "Hair", value: this.hairColor }))
    known.append(new Fact({ label: "Eyes", value: this.eyeColor }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawThing(new Section({ heading: "Home", single: this.homeworld })),
      core.drawRead(() => core.drawThing(new Section({ heading: "Films", things: this.films })), undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

  static savedIn = {
    place: "star_wars",
    collection: "characters",
    times: ["created", "modified"], select: ["name", "birthYear", "hairColor", "eyeColor", "homeworld", "films"] }

  // - it lives in star wars
  @prop({ type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2333, end: 2354 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in star wars
  @prop({ type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2333, end: 2354 } })
  accessor modified!: any /* spell: type unknown */
}

export class Planet extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2560, end: 2578 } })
  accessor name!: string

  // - its "climate" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2580, end: 2601 } })
  accessor climate!: string

  // - its "terrain" is text
  @prop({ type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2603, end: 2624 } })
  accessor terrain!: string

  // - its "residents" is a list of characters
  static { this.declareProp("residents", { itemType: "Character", init: () => new List<Character>({ instanceType: "Character" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2626, end: 2665 } }) }
  get residents(): List<Character> { return core.linked(this, "residents", Character) as List<Character> }
  set residents(value: List<Character>) { this.setProp("residents", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2667, end: 2697 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  static { this.declareProp("card", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 7430, end: 7506 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.climate,
      subject: this
    })
  }

  @drawn draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 7536, end: 7740 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
    known.append(new Fact({ label: "Climate", value: this.climate }))
    known.append(new Fact({ label: "Terrain", value: this.terrain }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawThing(new Section({ heading: "Who's from here", things: this.residents })),
      core.drawRead(() => core.drawThing(new Section({ heading: "Seen in", things: this.films })), undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

  static savedIn = {
    place: "star_wars",
    collection: "planets",
    times: ["created", "modified"], select: ["name", "climate", "terrain", "residents", "films"] }

  // - it lives in star wars
  @prop({ type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2537, end: 2558 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in star wars
  @prop({ type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2537, end: 2558 } })
  accessor modified!: any /* spell: type unknown */
}

/** Every type holds a card with its own words, and draws it:  a click anywhere on it opens the thing. */
export class Card extends Thing {
  // - its "label" is text
  @prop({ type: "text" })
  accessor label!: string

  // - its "kind" is text
  @prop({ type: "text" })
  accessor kind!: string

  // - its "subject" is a thing
  @prop({ type: "Thing" })
  accessor subject!: Thing

  @drawn draw() {
    return (
      <ui-card onClick={core.pressed(this, () => this.subject.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <ui-content>
          <ui-header>{this.label}</ui-header>
          <ui-meta>{this.kind}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  drawTop() {
    return (
      <>
        <ui-button appearance="transparent" icon="arrow left" onClick={core.pressed(this, () => guide.goBack())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Back
        </ui-button>
        <ui-header size="large">{this.label}</ui-header>
        <ui-text color="grey">{this.kind}</ui-text>
      </>
    )
  }
}

/** A row of what's known:  what a server writes when nothing's known isn't worth a row */
export class Fact extends Thing {
  // - its "label" is text
  @prop({ type: "text" })
  accessor label!: string

  // - its "value" is text
  @prop({ type: "text" })
  accessor value!: string

  // - its "date" is a date
  @prop({ type: "date" })
  accessor date!: Date

  get isKnown() {
    if (this.date) return true
    if (this.value === undefined || this.value === "") return false
    return this.value !== "unknown" && this.value !== "n/a" && this.value !== "none"
  }

  @drawn draw() {
    return (
      <ui-row>
        <ui-cell header={true}>{this.label}</ui-cell>
        <ui-cell>{this.value}{core.dateShown(this.date)}</ui-cell>
      </ui-row>
    )
  }
}

export class FactTable extends Thing {
  // - its "facts" is a list of facts
  @prop({ itemType: "Fact", init: () => new List<Fact>({ instanceType: "Fact" }) })
  accessor facts!: List<Fact>

  static { this.declareProp("shown", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 5148, end: 5203 }, readsFrom: ["star_wars"] }) }
  @derived get shown() {
    return core.filter(this.facts, (fact: Fact) => fact.isKnown)
  }

  @drawn draw() {
    if (!core.isEmpty(this.shown)) return <ui-table appearance="very-basic" unstackable={true}>{core.drawItems(this.shown)}</ui-table>
  }
}

/** A list under its heading;  "for its things" follows the links, and asks for each row they name */
export class Section extends Thing {
  // - its "heading" is text
  @prop({ type: "text" })
  accessor heading!: string

  // - its "things" is a list of things
  @prop({ itemType: "Thing", init: () => new List<Thing>({ instanceType: "Thing" }) })
  accessor things!: List<Thing>

  // - its "single" is a thing
  @prop({ type: "Thing" })
  accessor single!: Thing

  @drawn draw() {
    if (this.single) {
      return (
        <>
          <ui-header size="small" font="all-caps">{this.heading}</ui-header>
          <ui-cards columns="4" doubling={true}>{core.drawThing(this.single)}</ui-cards>
        </>
      )
    } else return core.drawRead(() => this.things, (thing: Thing) => core.drawThing(thing), { whole: () => <ui-section label={this.heading} hide-empty="" />, items: () => <ui-cards columns="4" doubling={true} /> })
  }
}

/**
 * Star Wars' API file, cut down to three collections.  `spell place ingest` wrote it, from looking at the server:
 * - "its id is its url":  each row's address is its id, and what another row links to it by
 * - "its rows are its results", "its next page is its next":  how its answers come, a page at a time
 * - "it writes names like hair_color":  so "birth year" here is "birth_year" there
 * - "keep a copy on this device":  a row asked for once is kept, until 5am, when it's asked for again
 */
export class StarWar extends Place {}
export const starWars = core.place(new StarWar(), {
  name: "star_wars",
  kind: "web server",
  at: "https://swapi.py4e.com/api",
  idColumn: "url",
  rowsIn: "results",
  nextPageIn: "next",
  namesLike: "hair_color",
  checkedEvery: 86400,
  checkedAt: { hour: 5, minute: 0 },
  keptOnDevice: true,
  collections: {
    characters: { at: "/people/" },
    planets: { at: "/planets/" },
    films: { at: "/films/" }
  }
})

core.heading("The types:  a field each, and a link is a type")

core.heading("The app:  a list of films, or the page of whatever's open")
///////////////////////////////////////////////////////////////
// ## The app:  a list of films, or the page of whatever's open
///////////////////////////////////////////////////////////////
/**
 * "for every film" asks the server for its films, and draws each one in the cards.
 * - "while waiting" draws until they come;  "if that fails" when the server can't be reached
 * - a long list draws what fits, and more as you scroll
 */
export class Guide extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "showing" is a thing
  @prop({ type: "Thing" })
  accessor showing!: Thing

  // "trail" is a new list of things
  @prop({ itemType: "Thing", init: () => new List<Thing>({ instanceType: "Thing" }) })
  accessor trail!: List<Thing>

  goBack() {
    if (core.isEmpty(this.trail)) {
      this.showing = undefined
      return
    }
    this.showing = core.getItemAt(this.trail, -1)
    core.removeItemAt(this.trail, -1)
    core.scrollToTop()
  }

  @drawn draw() {
    return (
      <ui-container>
        <slot name="view">{this.drawView()}</slot>
      </ui-container>
    )
  }

  drawView() {
    return [
      this.showing ? this.showing.drawPage() : [
        <ui-header size="medium" part="view">The films</ui-header>,
        core.drawRead(async () => await core.savedThings(Film, {}, "as drawn"), (film: Film) => core.drawThing(film), {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="view">Waiting for a signal from the galaxy</ui-loader>,
          failedSay: () => "The signal from swapi.py4e.com is lost.",
          items: () => <ui-cards columns="4" doubling={true} part="view" />
        })
      ],
      <ui-text paragraph={true} size="small" part="view">
        {"Films, characters and planets from "}
        <ui-link link="https://swapi.py4e.com/">swapi.py4e.com</ui-link>
        . Star Wars belongs to Lucasfilm and Disney.
      </ui-text>
    ]
  }
}

/**
 * `<test-project-app>`:  a guide, drawn in its own element, e.g. by `draw the guide`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its guide's properties;  its methods call its guide's.
 * - What every view's element does, e.g. drawing its guide, is `SpellElement`'s.
 */
export class GuideElement extends SpellElement<Guide> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "guide", [
    { name: "showing", kind: "string", description: "Its showing." },
    { name: "trail", kind: "json", description: "Its trail." }
  ])

  goBack() {
    return this.currentThing?.goBack()
  }

  drawView() {
    return this.currentThing?.drawView()
  }
}
core.useElement(Guide, GuideElement)
export const guide = new Guide()
core.describeAction(Guide, "goBack", { title: "Go Back", undoneAs: "Go Back" })

/** Any thing opens the same way:  the one showing goes on the trail, for Back */
export interface Thing { open(): any /* spell: type unknown */ }
Thing.prototype.open = function (this: Thing) {
  if (guide.showing) core.append(guide.trail, guide.showing)
  guide.showing = this
  core.scrollToTop()
}
core.describeAction(Thing, "open", { title: "Open Thing", undoneAs: "Open Thing" })

core.heading("A card, and a page's parts")
////////////////////////////////
// ## A card, and a page's parts
////////////////////////////////

core.heading("A film, a character, a planet:  a card, and a page")
////////////////////////////////////////////////////////
// ## A film, a character, a planet:  a card, and a page
////////////////////////////////////////////////////////
// "a film", with no "is", adds to the film above:  in the example, the types are in StarWars.api.spell,
// and these are in StarWars.spell, so looking at the server again never touches a line of these.

core.heading("Start")
//## Start
if (!core.isCarryingOver) guide.start()

core.heading("A check:  which facts are worth a row")
/** A check:  which facts are worth a row */
export function testWhichFactsAreKnown() {
  return core.test("test which facts are known", function testWhichFactsAreKnown() {
    core.echoTestAction(`set born to a new fact with label "Born", value = "19BBY"`)
    const born = new Fact({ label: "Born", value: "19BBY" })
    core.expect(born.isKnown, `born is known`, true, `yes`)
    core.echoTestAction(`set hair to a new fact with label "Hair", value = "n/a"`)
    const hair = new Fact({ label: "Hair", value: "n/a" })
    core.expect(hair.isKnown, `hair is known`, false, `no`)
  })
}

core.heading("Try it")
////////////
// ## Try it
////////////
// - Click A New Hope, then Luke Skywalker, then Tatooine:  each page follows the links of the one before.
//   Back takes you back the way you came.
// - Show one more fact:  add a "skin color" to the character, under "The types", the way its "eye color" is,
//   and a fact for it on the character's page.  Nothing else changes:  the server already sends it.
// - Show the films oldest first:  change "for every film" to "for every film sorted by its release date".
//
// Where next:  Star Wars, in the Examples, with search, ships, vehicles and species,
// pictures from Wikipedia, a Punch it button, and each film's opening crawl.

core.heading("Where the API file came from")
//////////////////////////////////
// ## Where the API file came from
//////////////////////////////////
// Nobody wrote the example's types by hand.  One command looked at the server, and wrote them:
//       spell place ingest https://swapi.py4e.com/api --into StarWars.api.spell --name "star wars"
// It read a few pages of each collection, worked out each field's type from what came back,
// and wrote two files:
// - StarWars.api.spell:  the place and a type per collection, what this guide's first two sections are cut from
// - StarWars.api.json5:  what it found, field by field, with an example of each, and what the server can do:
//   read only, and no reaching it from a page on another address, so the editor asks it for you
// `spell place update StarWars.api.spell` looks again, and changes only those two files.
// What the example draws and does is in StarWars.spell, which adds to each type:  so an update never touches it.
// -----------
if (!core.isCarryingOver) testWhichFactsAreKnown()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `GuideElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
