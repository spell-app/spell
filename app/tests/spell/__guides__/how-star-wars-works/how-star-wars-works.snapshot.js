import { core, Thing, List, App, Place, h } from "@spell/core"

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
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2124, end: 2143 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "episode id" is a number
  static { this.declareProp("episodeId", { type: "number", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2145, end: 2173 } }) }
  get episodeId() { return this.getProp("episodeId") }
  set episodeId(value) { this.setProp("episodeId", value) }

  // - its "director" is text
  static { this.declareProp("director", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2175, end: 2197 } }) }
  get director() { return this.getProp("director") }
  set director(value) { this.setProp("director", value) }

  // - its "release date" is a date
  static { this.declareProp("releaseDate", { type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2199, end: 2227 } }) }
  get releaseDate() { return this.getProp("releaseDate") }
  set releaseDate(value) { this.setProp("releaseDate", value) }

  // - its "characters" is a list of characters
  static { this.declareProp("characters", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2229, end: 2269 } }) }
  get characters() { return core.linked(this, "characters", Character) }
  set characters(value) { this.setProp("characters", value) }

  // - its "planets" is a list of planets
  static { this.declareProp("planets", { itemType: "Planet", init: () => new List({ instanceType: "Planet" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2271, end: 2305 } }) }
  get planets() { return core.linked(this, "planets", Planet) }
  set planets(value) { this.setProp("planets", value) }

  static { this.declareProp("card", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6119, end: 6212 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.title,
      kind: `Episode ${this.episodeId}`,
      subject: this
    })
  }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6242, end: 6456 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Directed by", value: this.director }))
    known.append(new Fact({ label: "Released", date: this.releaseDate }))
    return known
  }

  drawPage() { return core.drawWaiting(() => {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawThing(new Section({ heading: "Who's in it", things: this.characters })),
      core.drawRead(() => core.drawThing(new Section({ heading: "Where it happens", things: this.planets })), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }) }

  ////////////////////////////////////////////////////
  // ## The types:  a field each, and a link is a type
  ////////////////////////////////////////////////////
  static savedIn = {
    place: "star_wars",
    collection: "films",
    times: ["created", "modified"], select: ["title", "episodeId", "director", "releaseDate", "characters", "planets"] }

  // - it lives in star wars
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2101, end: 2122 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2101, end: 2122 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Character extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2356, end: 2374 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "birth year" is text
  static { this.declareProp("birthYear", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2376, end: 2400 } }) }
  get birthYear() { return this.getProp("birthYear") }
  set birthYear(value) { this.setProp("birthYear", value) }

  // - its "hair color" is text
  static { this.declareProp("hairColor", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2402, end: 2426 } }) }
  get hairColor() { return this.getProp("hairColor") }
  set hairColor(value) { this.setProp("hairColor", value) }

  // - its "eye color" is text
  static { this.declareProp("eyeColor", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2428, end: 2451 } }) }
  get eyeColor() { return this.getProp("eyeColor") }
  set eyeColor(value) { this.setProp("eyeColor", value) }

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/HowStarWarsWorks.spell", start: 2453, end: 2480 } }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2482, end: 2512 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("card", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6793, end: 6882 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: `Born ${this.birthYear}`,
      subject: this
    })
  }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 6912, end: 7117 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Hair", value: this.hairColor }))
    known.append(new Fact({ label: "Eyes", value: this.eyeColor }))
    return known
  }

  drawPage() { return core.drawWaiting(() => {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawThing(new Section({ heading: "Home", single: this.homeworld })),
      core.drawRead(() => core.drawThing(new Section({ heading: "Films", things: this.films })), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }) }

  static savedIn = {
    place: "star_wars",
    collection: "characters",
    times: ["created", "modified"], select: ["name", "birthYear", "hairColor", "eyeColor", "homeworld", "films"] }

  // - it lives in star wars
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2333, end: 2354 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2333, end: 2354 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Planet extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2560, end: 2578 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "climate" is text
  static { this.declareProp("climate", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2580, end: 2601 } }) }
  get climate() { return this.getProp("climate") }
  set climate(value) { this.setProp("climate", value) }

  // - its "terrain" is text
  static { this.declareProp("terrain", { type: "text", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2603, end: 2624 } }) }
  get terrain() { return this.getProp("terrain") }
  set terrain(value) { this.setProp("terrain", value) }

  // - its "residents" is a list of characters
  static { this.declareProp("residents", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2626, end: 2665 } }) }
  get residents() { return core.linked(this, "residents", Character) }
  set residents(value) { this.setProp("residents", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/HowStarWarsWorks.spell", start: 2667, end: 2697 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("card", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 7430, end: 7506 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.climate,
      subject: this
    })
  }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 7536, end: 7740 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Climate", value: this.climate }))
    known.append(new Fact({ label: "Terrain", value: this.terrain }))
    return known
  }

  drawPage() { return core.drawWaiting(() => {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawThing(new Section({ heading: "Who's from here", things: this.residents })),
      core.drawRead(() => core.drawThing(new Section({ heading: "Seen in", things: this.films })), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }) }

  static savedIn = {
    place: "star_wars",
    collection: "planets",
    times: ["created", "modified"], select: ["name", "climate", "terrain", "residents", "films"] }

  // - it lives in star wars
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2537, end: 2558 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/HowStarWarsWorks.spell", start: 2537, end: 2558 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/** Every type holds a card with its own words, and draws it:  a click anywhere on it opens the thing. */
export class Card extends Thing {
  // - its "label" is text
  static { this.declareProp("label", { type: "text" }) }
  get label() { return this.getProp("label") }
  set label(value) { this.setProp("label", value) }

  // - its "kind" is text
  static { this.declareProp("kind", { type: "text" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "subject" is a thing
  static { this.declareProp("subject", { type: "Thing" }) }
  get subject() { return this.getProp("subject") }
  set subject(value) { this.setProp("subject", value) }

  draw() {
    return h("ui-card", {
      onClick: core.pressed(this, () => this.subject.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-content",
        h("ui-header", () => this.label),
        h("ui-meta", () => this.kind)
      )
    )
  }

  drawTop() {
    return [
      h("ui-button", {
        appearance: "transparent",
        icon: "arrow left",
        onClick: core.pressed(this, () => guide.goBack()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Back"),
      h("ui-header", { size: "large" }, () => this.label),
      h("ui-text", { color: "grey" }, () => this.kind)
    ]
  }
}

/** A row of what's known:  what a server writes when nothing's known isn't worth a row */
export class Fact extends Thing {
  // - its "label" is text
  static { this.declareProp("label", { type: "text" }) }
  get label() { return this.getProp("label") }
  set label(value) { this.setProp("label", value) }

  // - its "value" is text
  static { this.declareProp("value", { type: "text" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }

  // - its "date" is a date
  static { this.declareProp("date", { type: "date" }) }
  get date() { return this.getProp("date") }
  set date(value) { this.setProp("date", value) }

  get isKnown() {
    if (this.date) return true
    if (this.value === undefined || this.value === "") return false
    return this.value !== "unknown" && this.value !== "n/a" && this.value !== "none"
  }

  draw() {
    return h("ui-row",
      h("ui-cell", { header: true }, () => this.label),
      h("ui-cell", () => this.value, () => core.dateShown(this.date))
    )
  }
}

export class FactTable extends Thing {
  // - its "facts" is a list of facts
  static { this.declareProp("facts", { itemType: "Fact", init: () => new List({ instanceType: "Fact" }) }) }
  get facts() { return this.getProp("facts") }
  set facts(value) { this.setProp("facts", value) }

  static { this.declareProp("shown", { declaredAt: { path: "/HowStarWarsWorks.spell", start: 5148, end: 5203 }, readsFrom: ["star_wars"] }) }
  get shown() {
    return core.filter(this.facts, (fact) => fact.isKnown)
  }

  draw() {
    if (!core.isEmpty(this.shown)) return h("ui-table", { appearance: "very-basic", unstackable: true }, () => core.drawItems(this.shown))
  }
}

/** A list under its heading;  "for its things" follows the links, and asks for each row they name */
export class Section extends Thing {
  // - its "heading" is text
  static { this.declareProp("heading", { type: "text" }) }
  get heading() { return this.getProp("heading") }
  set heading(value) { this.setProp("heading", value) }

  // - its "things" is a list of things
  static { this.declareProp("things", { itemType: "Thing", init: () => new List({ instanceType: "Thing" }) }) }
  get things() { return this.getProp("things") }
  set things(value) { this.setProp("things", value) }

  // - its "single" is a thing
  static { this.declareProp("single", { type: "Thing" }) }
  get single() { return this.getProp("single") }
  set single(value) { this.setProp("single", value) }

  draw() {
    if (this.single) {
      return [
        h("ui-header", { size: "small", font: "all-caps" }, () => this.heading),
        h("ui-cards", { columns: "4", doubling: true }, () => core.drawThing(this.single))
      ]
    } else return core.drawRead(() => this.things, (thing) => core.drawThing(thing), { whole: () => h("ui-section", { label: () => this.heading, "hide-empty": "" }), items: () => h("ui-cards", { columns: "4", doubling: true }) })
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
  static { this.declareProp("showing", { type: "Thing" }) }
  get showing() { return this.getProp("showing") }
  set showing(value) { this.setProp("showing", value) }

  // "trail" is a new list of things
  static { this.declareProp("trail", { itemType: "Thing", init: () => new List({ instanceType: "Thing" }) }) }
  get trail() { return this.getProp("trail") }
  set trail(value) { this.setProp("trail", value) }

  goBack() {
    if (core.isEmpty(this.trail)) {
      this.showing = undefined
      return
    }
    this.showing = core.getItemAt(this.trail, -1)
    core.removeItemAt(this.trail, -1)
    core.scrollToTop()
  }

  draw() {
    return h("ui-container", h("slot", { name: "view" }, () => this.drawView()))
  }

  drawView() {
    return [
      this.showing ? this.showing.drawPage() : [
        h("ui-header", { size: "medium", part: "view" }, "The films"),
        core.drawRead(async () => await core.savedThings(Film, {}, "as drawn"), (film) => core.drawThing(film), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "view" },
            "Waiting for a signal from the galaxy"
          ),
          failedSay: () => "The signal from swapi.py4e.com is lost.",
          items: () => h("ui-cards", { columns: "4", doubling: true, part: "view" })
        })
      ],
      h("ui-text", { paragraph: true, size: "small", part: "view" },
        "Films, characters and planets from ",
        h("ui-link", { link: "https://swapi.py4e.com/" }, "swapi.py4e.com"),
        ". Star Wars belongs to Lucasfilm and Disney."
      )
    ]
  }
}
export const guide = new Guide()
core.describeAction(Guide, "goBack", { title: "Go Back", undoneAs: "Go Back" })

/** Any thing opens the same way:  the one showing goes on the trail, for Back */
Thing.prototype.open = function () {
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
