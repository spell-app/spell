import { core, Thing, List, App, Place, h, position } from "@spell/core"

core.heading("Star Wars:  where it all lives")
////////////////////////////////////
// ## Star Wars:  where it all lives
////////////////////////////////////
// A server other people run, and what it holds.  What's drawn and done with it is in StarWars.spellml;
// the pictures and what they're of come from Wikipedia, in Wikipedia.api.spell.
// `star wars` is what this wrote, from looking at the server:
//   spell place ingest https://swapi.py4e.com/api --into StarWars.api.spell --name "star wars"
// `spell place update StarWars.api.spell` looks again, and changes only this file and StarWars.api.json5.
//
// Star Wars belongs to Lucasfilm and Disney.
// It's asked for as it runs, never kept here, and the page says where it comes from.

export class Character extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1070, end: 1088 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "height" is a number or "unknown"
  static { this.declareProp("height", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1092, end: 1129 } }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  // - its "mass" is a number or "unknown"
  static { this.declareProp("mass", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1133, end: 1168 } }) }
  get mass() { return this.getProp("mass") }
  set mass(value) { this.setProp("mass", value) }

  // - its "hair color" is text
  static { this.declareProp("hairColor", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1172, end: 1196 } }) }
  get hairColor() { return this.getProp("hairColor") }
  set hairColor(value) { this.setProp("hairColor", value) }

  // - its "skin color" is text
  static { this.declareProp("skinColor", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1200, end: 1224 } }) }
  get skinColor() { return this.getProp("skinColor") }
  set skinColor(value) { this.setProp("skinColor", value) }

  // - its "eye color" is text
  static { this.declareProp("eyeColor", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1228, end: 1251 } }) }
  get eyeColor() { return this.getProp("eyeColor") }
  set eyeColor(value) { this.setProp("eyeColor", value) }

  // - its "birth year" is text
  static { this.declareProp("birthYear", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1255, end: 1279 } }) }
  get birthYear() { return this.getProp("birthYear") }
  set birthYear(value) { this.setProp("birthYear", value) }

  // - its "gender" is text
  static { this.declareProp("gender", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1283, end: 1303 } }) }
  get gender() { return this.getProp("gender") }
  set gender(value) { this.setProp("gender", value) }

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.api.spell", start: 1307, end: 1334 } }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 1338, end: 1368 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List({ instanceType: "Species" }), declaredAt: { path: "/StarWars.api.spell", start: 1372, end: 1406 } }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.api.spell", start: 1410, end: 1446 } }) }
  get vehicles() { return core.linked(this, "vehicles", Vehicle) }
  set vehicles(value) { this.setProp("vehicles", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.api.spell", start: 1450, end: 1488 } }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1492, end: 1515 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1519, end: 1541 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spellml", start: 10851, end: 10947 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: `Born ${this.birthYear}`,
      subject: this
    })
  }

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spellml", start: 10960, end: 11011 }, readsFrom: ["wikipedia", "star_wars"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  /** Their own picture on Wikipedia, or nothing */
  static { this.declareProp("picture", { declaredAt: { path: "/StarWars.spellml", start: 11024, end: 11232 }, readsFrom: ["wikipedia", "star_wars"] }) }
  get picture() { return core.waitedValue(this, "picture", async () => {
    if ((await core.answerOf(this, "page")) && (await core.answerOf(this, "page")).fits && (await core.answerOf(this, "page")).thumbnail) return (await core.answerOf(this, "page")).thumbnail.source
    return ""
  }) }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spellml", start: 11282, end: 11733 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Height", value: measureAmountInUnit(this.height, "cm") }))
    known.append(new Fact({ label: "Mass", value: measureAmountInUnit(this.mass, "kg") }))
    known.append(new Fact({ label: "Born", value: this.birthYear }))
    known.append(new Fact({ label: "Hair", value: this.hairColor }))
    known.append(new Fact({ label: "Eyes", value: this.eyeColor }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawRead(() => h("slot", { name: "links" }, () => this.drawLinks()), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }

  static drawsWaiting = true
  drawLinks() {
    return [
      core.drawThing(new Section({ heading: "Home", single: this.homeworld })),
      core.drawThing(new Section({ heading: "Films", things: this.films })),
      core.drawThing(new Section({ heading: "What they are", things: this.species })),
      core.drawThing(new Section({ heading: "What they fly", things: this.starships })),
      core.drawThing(new Section({ heading: "What they drive", things: this.vehicles }))
    ]
  }

  static savedIn = { place: "star_wars", collection: "characters", select: ["name", "height", "mass", "hairColor", "eyeColor", "birthYear", "homeworld", "films", "species", "vehicles", "starships"] }
}

export class Planet extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1594, end: 1612 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "rotation period" is a number or "unknown"
  static { this.declareProp("rotationPeriod", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1616, end: 1662 } }) }
  get rotationPeriod() { return this.getProp("rotationPeriod") }
  set rotationPeriod(value) { this.setProp("rotationPeriod", value) }

  // - its "orbital period" is a number or "unknown"
  static { this.declareProp("orbitalPeriod", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1666, end: 1711 } }) }
  get orbitalPeriod() { return this.getProp("orbitalPeriod") }
  set orbitalPeriod(value) { this.setProp("orbitalPeriod", value) }

  // - its "diameter" is a number
  static { this.declareProp("diameter", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 1715, end: 1741 } }) }
  get diameter() { return this.getProp("diameter") }
  set diameter(value) { this.setProp("diameter", value) }

  // - its "climate" is text
  static { this.declareProp("climate", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1745, end: 1766 } }) }
  get climate() { return this.getProp("climate") }
  set climate(value) { this.setProp("climate", value) }

  // - its "gravity" is text
  static { this.declareProp("gravity", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1770, end: 1791 } }) }
  get gravity() { return this.getProp("gravity") }
  set gravity(value) { this.setProp("gravity", value) }

  // - its "terrain" is text
  static { this.declareProp("terrain", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1795, end: 1816 } }) }
  get terrain() { return this.getProp("terrain") }
  set terrain(value) { this.setProp("terrain", value) }

  // - its "surface water" is a number or "unknown"
  static { this.declareProp("surfaceWater", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1820, end: 1864 } }) }
  get surfaceWater() { return this.getProp("surfaceWater") }
  set surfaceWater(value) { this.setProp("surfaceWater", value) }

  // - its "population" is a number or "unknown"
  static { this.declareProp("population", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1868, end: 1909 } }) }
  get population() { return this.getProp("population") }
  set population(value) { this.setProp("population", value) }

  // - its "residents" is a list of characters
  static { this.declareProp("residents", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 1913, end: 1952 } }) }
  get residents() { return core.linked(this, "residents", Character) }
  set residents(value) { this.setProp("residents", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 1956, end: 1986 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1990, end: 2013 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2017, end: 2039 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spellml", start: 12393, end: 12511 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.climate,
      shape: "world",
      colour: this.hue,
      subject: this
    })
  }

  /** What colour a world is, from its weather */
  static { this.declareProp("hue", { declaredAt: { path: "/StarWars.spellml", start: 12524, end: 12901 }, readsFrom: ["star_wars"] }) }
  get hue() {
    if (core.includes(this.climate, "frozen")) return 200
    if (core.includes(this.climate, "arid")) return 38
    if (core.includes(this.climate, "murky") || core.includes(this.climate, "polluted")) return 95
    if (core.includes(this.climate, "tropical") || core.includes(this.climate, "temperate")) return 130 + this.name.length * 9
    return 280
  }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spellml", start: 12951, end: 13544 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Climate", value: this.climate }))
    known.append(new Fact({ label: "Terrain", value: this.terrain }))
    known.append(new Fact({ label: "Diameter", value: measureAmountInUnit(this.diameter, "km") }))
    known.append(new Fact({ label: "Population", value: measureAmountInUnit(this.population, "people") }))
    known.append(new Fact({ label: "A day", value: measureAmountInUnit(this.rotationPeriod, "hours") }))
    known.append(new Fact({ label: "A year", value: measureAmountInUnit(this.orbitalPeriod, "days") }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawRead(() => h("slot", { name: "links" }, () => this.drawLinks()), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }

  static drawsWaiting = true
  drawLinks() {
    return [
      core.drawThing(new Section({ heading: "Who's from here", things: this.residents })),
      core.drawThing(new Section({ heading: "Seen in", things: this.films }))
    ]
  }

  static savedIn = { place: "star_wars", collection: "planets", select: ["name", "rotationPeriod", "orbitalPeriod", "diameter", "climate", "terrain", "population", "residents", "films"] }
}

export class Film extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2090, end: 2109 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "episode id" is a number
  static { this.declareProp("episodeId", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 2113, end: 2141 } }) }
  get episodeId() { return this.getProp("episodeId") }
  set episodeId(value) { this.setProp("episodeId", value) }

  // - its "opening crawl" is text
  static { this.declareProp("openingCrawl", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2145, end: 2172 } }) }
  get openingCrawl() { return this.getProp("openingCrawl") }
  set openingCrawl(value) { this.setProp("openingCrawl", value) }

  // - its "director" is text
  static { this.declareProp("director", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2176, end: 2198 } }) }
  get director() { return this.getProp("director") }
  set director(value) { this.setProp("director", value) }

  // - its "producer" is text
  static { this.declareProp("producer", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2202, end: 2224 } }) }
  get producer() { return this.getProp("producer") }
  set producer(value) { this.setProp("producer", value) }

  // - its "release date" is a date
  static { this.declareProp("releaseDate", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2228, end: 2256 } }) }
  get releaseDate() { return this.getProp("releaseDate") }
  set releaseDate(value) { this.setProp("releaseDate", value) }

  // - its "characters" is a list of characters
  static { this.declareProp("characters", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 2260, end: 2300 } }) }
  get characters() { return core.linked(this, "characters", Character) }
  set characters(value) { this.setProp("characters", value) }

  // - its "planets" is a list of planets
  static { this.declareProp("planets", { itemType: "Planet", init: () => new List({ instanceType: "Planet" }), declaredAt: { path: "/StarWars.api.spell", start: 2304, end: 2338 } }) }
  get planets() { return core.linked(this, "planets", Planet) }
  set planets(value) { this.setProp("planets", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.api.spell", start: 2342, end: 2380 } }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.api.spell", start: 2384, end: 2420 } }) }
  get vehicles() { return core.linked(this, "vehicles", Vehicle) }
  set vehicles(value) { this.setProp("vehicles", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List({ instanceType: "Species" }), declaredAt: { path: "/StarWars.api.spell", start: 2424, end: 2458 } }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2462, end: 2485 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2489, end: 2511 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spellml", start: 9656, end: 9756 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.title,
      kind: `Episode ${this.episodeId}`,
      subject: this
    })
  }

  play() {
    guide.playing = this
  }

  end() {
    guide.playing = undefined
  }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spellml", start: 9944, end: 10243 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Directed by", value: this.director }))
    known.append(new Fact({ label: "Produced by", value: this.producer }))
    known.append(new Fact({ label: "Released", date: this.releaseDate }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      h("ui-button", {
        class: "play-opening",
        onClick: core.pressed(this, () => this.play()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
        part: "page"
      }, "Play the opening"),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawRead(() => h("slot", { name: "links" }, () => this.drawLinks()), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }

  static drawsWaiting = true
  drawLinks() {
    return [
      core.drawThing(new Section({ heading: "Who's in it", things: this.characters })),
      core.drawThing(new Section({ heading: "Where it happens", things: this.planets })),
      core.drawThing(new Section({ heading: "What they fly", things: this.starships }))
    ]
  }

  drawCrawl() {
    return h("ui-modal", {
      class: "crawl",
      visible: true,
      overlay: true,
      fullscreen: true,
      "on-ui-closed": () => () => this.end(),
      "aria-label": () => `The opening of ${this.title}`,
      part: "crawl"
    },
      h("ui-text", { class: "long-ago", size: "big" }, "A long time ago in a galaxy far, far away...."),
      h("ui-segment", { class: "stage", appearance: "basic" },
        h("ui-segment", { class: "words", appearance: "basic" },
          h("ui-header", { class: "episode" }, "Episode ", () => this.episodeId),
          h("ui-header", { class: "crawl-title" }, () => this.title),
          h("ui-text", { class: "crawl-text", paragraph: true }, () => this.openingCrawl)
        )
      ),
      h("ui-button", {
        class: "stop",
        onClick: core.pressed(this, () => this.end()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Stop")
    )
  }

  static savedIn = { place: "star_wars", collection: "films", select: ["title", "episodeId", "openingCrawl", "director", "producer", "releaseDate", "characters", "planets", "starships", "vehicles", "species"] }
}

export class Species extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2565, end: 2583 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "classification" is text
  static { this.declareProp("classification", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2587, end: 2615 } }) }
  get classification() { return this.getProp("classification") }
  set classification(value) { this.setProp("classification", value) }

  // - its "designation" is text
  static { this.declareProp("designation", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2619, end: 2644 } }) }
  get designation() { return this.getProp("designation") }
  set designation(value) { this.setProp("designation", value) }

  // - its "average height" is a number or "n/a" or "unknown"
  static { this.declareProp("averageHeight", { type: "number", nothingAs: ["n/a", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2648, end: 2702 } }) }
  get averageHeight() { return this.getProp("averageHeight") }
  set averageHeight(value) { this.setProp("averageHeight", value) }

  // - its "skin colors" is text
  static { this.declareProp("skinColors", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2706, end: 2731 } }) }
  get skinColors() { return this.getProp("skinColors") }
  set skinColors(value) { this.setProp("skinColors", value) }

  // - its "hair colors" is text
  static { this.declareProp("hairColors", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2735, end: 2760 } }) }
  get hairColors() { return this.getProp("hairColors") }
  set hairColors(value) { this.setProp("hairColors", value) }

  // - its "eye colors" is text
  static { this.declareProp("eyeColors", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2764, end: 2788 } }) }
  get eyeColors() { return this.getProp("eyeColors") }
  set eyeColors(value) { this.setProp("eyeColors", value) }

  // - its "average lifespan" is text
  static { this.declareProp("averageLifespan", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2792, end: 2822 } }) }
  get averageLifespan() { return this.getProp("averageLifespan") }
  set averageLifespan(value) { this.setProp("averageLifespan", value) }

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.api.spell", start: 2826, end: 2853 } }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  // - its "language" is text
  static { this.declareProp("language", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2857, end: 2879 } }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "people" is a list of characters
  static { this.declareProp("people", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 2883, end: 2919 } }) }
  get people() { return core.linked(this, "people", Character) }
  set people(value) { this.setProp("people", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 2923, end: 2953 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2957, end: 2980 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2984, end: 3006 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spellml", start: 16606, end: 16710 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.classification,
      subject: this,
      species: this
    })
  }

  /** Its first character's picture:  asking for everyone at once costs one read, and each link then asks nothing */
  static { this.declareProp("picture", { declaredAt: { path: "/StarWars.spellml", start: 16723, end: 17021 }, readsFrom: ["star_wars", "wikipedia"] }) }
  get picture() { return core.waitedValue(this, "picture", async () => {
    const everyone = await core.savedThings(Character)
    let found = ""
    await core.forEachSequential(await core.answerOf(this, "people"), async (character) => {
      if (found === "") found = await core.answerOf(character, "picture")
    })
    return found
  }) }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spellml", start: 17070, end: 17295 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Language", value: this.language }))
    known.append(new Fact({ label: "Lives for", value: this.averageLifespan }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawRead(() => h("slot", { name: "links" }, () => this.drawLinks()), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }

  static drawsWaiting = true
  drawLinks() {
    return [
      core.drawThing(new Section({ heading: "Home", single: this.homeworld })),
      core.drawThing(new Section({ heading: "Who's one", things: this.people }))
    ]
  }

  static savedIn = { place: "star_wars", collection: "species", select: ["name", "classification", "averageLifespan", "homeworld", "language", "people", "films"] }
}

export class Vehicle extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3060, end: 3078 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "model" is text
  static { this.declareProp("model", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3082, end: 3101 } }) }
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  // - its "manufacturer" is text
  static { this.declareProp("manufacturer", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3105, end: 3131 } }) }
  get manufacturer() { return this.getProp("manufacturer") }
  set manufacturer(value) { this.setProp("manufacturer", value) }

  // - its "cost in credits" is a number or "unknown"
  static { this.declareProp("costInCredits", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3135, end: 3181 } }) }
  get costInCredits() { return this.getProp("costInCredits") }
  set costInCredits(value) { this.setProp("costInCredits", value) }

  // - its "length" is a number
  static { this.declareProp("length", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 3185, end: 3209 } }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  // - its "max atmosphering speed" is a number
  static { this.declareProp("maxAtmospheringSpeed", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 3213, end: 3253 } }) }
  get maxAtmospheringSpeed() { return this.getProp("maxAtmospheringSpeed") }
  set maxAtmospheringSpeed(value) { this.setProp("maxAtmospheringSpeed", value) }

  // - its "crew" is a number
  static { this.declareProp("crew", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 3257, end: 3279 } }) }
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  // - its "passengers" is a number
  static { this.declareProp("passengers", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 3283, end: 3311 } }) }
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  // - its "cargo capacity" is a number or "none" or "unknown"
  static { this.declareProp("cargoCapacity", { type: "number", nothingAs: ["none", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3315, end: 3370 } }) }
  get cargoCapacity() { return this.getProp("cargoCapacity") }
  set cargoCapacity(value) { this.setProp("cargoCapacity", value) }

  // - its "consumables" is text
  static { this.declareProp("consumables", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3374, end: 3399 } }) }
  get consumables() { return this.getProp("consumables") }
  set consumables(value) { this.setProp("consumables", value) }

  // - its "vehicle class" is text
  static { this.declareProp("vehicleClass", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3403, end: 3430 } }) }
  get vehicleClass() { return this.getProp("vehicleClass") }
  set vehicleClass(value) { this.setProp("vehicleClass", value) }

  // - its "pilots" is a list of characters
  static { this.declareProp("pilots", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 3434, end: 3470 } }) }
  get pilots() { return core.linked(this, "pilots", Character) }
  set pilots(value) { this.setProp("pilots", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 3474, end: 3504 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3508, end: 3531 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3535, end: 3557 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spellml", start: 15863, end: 15952 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.vehicleClass,
      subject: this
    })
  }

  draw() {
    return core.drawThing(this.card)
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new CraftPage({
        model: this.model,
        maker: this.manufacturer,
        length: this.length,
        crew: this.crew,
        passengers: this.passengers,
        cost: this.costInCredits
      })),
      core.drawRead(() => h("slot", { name: "links" }, () => this.drawLinks()), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }

  static drawsWaiting = true
  drawLinks() {
    return [
      core.drawThing(new Section({ heading: "Who flew it", things: this.pilots })),
      core.drawThing(new Section({ heading: "Seen in", things: this.films }))
    ]
  }

  static savedIn = { place: "star_wars", collection: "vehicles", select: ["name", "model", "manufacturer", "costInCredits", "length", "crew", "passengers", "vehicleClass", "pilots", "films"] }
}

export class Starship extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3612, end: 3630 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "model" is text
  static { this.declareProp("model", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3634, end: 3653 } }) }
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  // - its "manufacturer" is text
  static { this.declareProp("manufacturer", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3657, end: 3683 } }) }
  get manufacturer() { return this.getProp("manufacturer") }
  set manufacturer(value) { this.setProp("manufacturer", value) }

  // - its "cost in credits" is a number or "unknown"
  static { this.declareProp("costInCredits", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3687, end: 3733 } }) }
  get costInCredits() { return this.getProp("costInCredits") }
  set costInCredits(value) { this.setProp("costInCredits", value) }

  // - its "length" is a number
  static { this.declareProp("length", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 3737, end: 3761 } }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  // - its "max atmosphering speed" is text
  static { this.declareProp("maxAtmospheringSpeed", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3765, end: 3801 } }) }
  get maxAtmospheringSpeed() { return this.getProp("maxAtmospheringSpeed") }
  set maxAtmospheringSpeed(value) { this.setProp("maxAtmospheringSpeed", value) }

  // - its "crew" is text
  static { this.declareProp("crew", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3805, end: 3823 } }) }
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  // - its "passengers" is a number or "n/a" or "unknown"
  static { this.declareProp("passengers", { type: "number", nothingAs: ["n/a", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3827, end: 3877 } }) }
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  // - its "cargo capacity" is a number or "unknown"
  static { this.declareProp("cargoCapacity", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3881, end: 3926 } }) }
  get cargoCapacity() { return this.getProp("cargoCapacity") }
  set cargoCapacity(value) { this.setProp("cargoCapacity", value) }

  // - its "consumables" is text
  static { this.declareProp("consumables", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3930, end: 3955 } }) }
  get consumables() { return this.getProp("consumables") }
  set consumables(value) { this.setProp("consumables", value) }

  // - its "hyperdrive rating" is a number or "unknown"
  static { this.declareProp("hyperdriveRating", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3959, end: 4007 } }) }
  get hyperdriveRating() { return this.getProp("hyperdriveRating") }
  set hyperdriveRating(value) { this.setProp("hyperdriveRating", value) }

  // - its "mglt" is a number or "unknown"
  static { this.declareProp("mglt", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4011, end: 4046 } }) }
  get mglt() { return this.getProp("mglt") }
  set mglt(value) { this.setProp("mglt", value) }

  // - its "starship class" is text
  static { this.declareProp("starshipClass", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4050, end: 4078 } }) }
  get starshipClass() { return this.getProp("starshipClass") }
  set starshipClass(value) { this.setProp("starshipClass", value) }

  // - its "pilots" is a list of characters
  static { this.declareProp("pilots", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 4082, end: 4118 } }) }
  get pilots() { return core.linked(this, "pilots", Character) }
  set pilots(value) { this.setProp("pilots", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 4122, end: 4152 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4156, end: 4179 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4183, end: 4205 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spellml", start: 15202, end: 15292 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.starshipClass,
      subject: this
    })
  }

  draw() {
    return core.drawThing(this.card)
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new CraftPage({
        model: this.model,
        maker: this.manufacturer,
        length: this.length,
        crew: this.crew,
        passengers: this.passengers,
        cost: this.costInCredits
      })),
      core.drawRead(() => h("slot", { name: "links" }, () => this.drawLinks()), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Following the links") })
    ]
  }

  static drawsWaiting = true
  drawLinks() {
    return [
      core.drawThing(new Section({ heading: "Who flew it", things: this.pilots })),
      core.drawThing(new Section({ heading: "Seen in", things: this.films }))
    ]
  }

  static savedIn = { place: "star_wars", collection: "starships", select: ["name", "model", "manufacturer", "costInCredits", "length", "crew", "passengers", "starshipClass", "pilots", "films"] }
}

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
  collections: {
    characters: { at: "/people" },
    planets: { at: "/planets" },
    films: { at: "/films" },
    species: { at: "/species" },
    vehicles: { at: "/vehicles" },
    starships: { at: "/starships" }
  }, firstReads: () => [[Film], [Character], [Planet], [Vehicle], [Species], [Starship]] })

// -----------
core.heading("Wikipedia:  a page each, by its name.  Not every name has one")
///////////////////////////////////////////////////////////////////
// ## Wikipedia:  a page each, by its name.  Not every name has one
///////////////////////////////////////////////////////////////////
// A server other people run:  what Star Wars shows of a character, a planet or a ship, and its picture.
// Written by hand:  Wikipedia's page summaries are found by a name, so there's no list to look at.
// Its words belong to Wikipedia's writers.  They're asked for as it runs, never kept here, and the page says so.

export class WikiPage extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 606, end: 625 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "about" is text, stored as "description"
  static { this.declareProp("about", { type: "text", storedAs: "description", declaredAt: { path: "/Wikipedia.api.spell", start: 629, end: 673 } }) }
  get about() { return this.getProp("about") }
  set about(value) { this.setProp("about", value) }

  // - its "summary" is text, stored as "extract"
  static { this.declareProp("summary", { type: "text", storedAs: "extract", declaredAt: { path: "/Wikipedia.api.spell", start: 677, end: 719 } }) }
  get summary() { return this.getProp("summary") }
  set summary(value) { this.setProp("summary", value) }

  // - its "thumbnail" is a thumbnail
  static { this.declareProp("thumbnail", { type: "Thumbnail", declaredAt: { path: "/Wikipedia.api.spell", start: 723, end: 753 } }) }
  get thumbnail() { return this.getProp("thumbnail") }
  set thumbnail(value) { this.setProp("thumbnail", value) }

  // - its "content urls" is a page address book
  static { this.declareProp("contentUrls", { type: "PageAddressBook", declaredAt: { path: "/Wikipedia.api.spell", start: 757, end: 798 } }) }
  get contentUrls() { return this.getProp("contentUrls") }
  set contentUrls(value) { this.setProp("contentUrls", value) }

  static { this.declareProp("fits", { declaredAt: { path: "/StarWars.spellml", start: 7487, end: 7656 }, readsFrom: ["wikipedia"] }) }
  get fits() {
    if (core.includes(this.title, "List of")) return false
    return core.includes(this.about, "star wars") || core.includes(this.about, "fictional") || core.includes(this.about, " film ")
  }

  static savedIn = { place: "wikipedia", collection: "wiki_pages" }
}

/** What's inside a page's answer, read in words:  `the source of its thumbnail` */
export class Thumbnail extends Thing {
  // - its "source" is text
  static { this.declareProp("source", { type: "text" }) }
  get source() { return this.getProp("source") }
  set source(value) { this.setProp("source", value) }
}

export class PageAddressBook extends Thing {
  // - its "desktop" is a page address
  static { this.declareProp("desktop", { type: "PageAddress" }) }
  get desktop() { return this.getProp("desktop") }
  set desktop(value) { this.setProp("desktop", value) }
}

export class PageAddress extends Thing {
  // - its "page" is text
  static { this.declareProp("page", { type: "text" }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }
}

export class Wikipedia extends Place {}
export const wikipedia = core.place(new Wikipedia(), {
  name: "wikipedia",
  kind: "web server",
  at: "https://en.wikipedia.org/api/rest_v1",
  checkedEvery: 86400,
  collections: { wikiPages: { at: "/page/summary", fields: { id: "pageid" } } }
})

// -----------
core.heading("Star Wars")
///////////////
// ## Star Wars
///////////////
// A guide to the galaxy, what it draws and does.  Every thing it shows is in StarWars.api.spell, as `spell place ingest` wrote it:
// say what a field links to, and reading it follows the link, `the name of its homeworld`.
// Each type below adds to its type there, with `<spell-more-of>`:  so looking again at the server never touches a line of this.

export class Card extends Thing {
  // - it has a label
  get label() { return this.getProp("label") }
  set label(value) { this.setProp("label", value) }

  // - it has a kind
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - it has a shape
  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  /** What colour a picture's background is:  from its name, unless it says */
  // - it has a colour
  get colour() { return this.getProp("colour") }
  set colour(value) { this.setProp("colour", value) }

  get hue() {
    if (this.colour !== undefined) return this.colour
    return this.label.length * 47
  }

  // - its "subject" is a thing
  static { this.declareProp("subject", { type: "Thing" }) }
  get subject() { return this.getProp("subject") }
  set subject(value) { this.setProp("subject", value) }

  // - its "species" is a species
  static { this.declareProp("species", { type: "Species" }) }
  get species() { return this.getProp("species") }
  set species(value) { this.setProp("species", value) }

  draw() {
    return h("ui-card", {
      class: "card",
      onClick: core.pressed(this, () => this.subject.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("slot", { name: "portrait" }, () => this.drawPortrait()),
      h("ui-content",
        h("ui-header", () => this.label),
        h("ui-meta", () => this.kind)
      )
    )
  }

  static drawsWaiting = true
  drawPortrait() {
    return core.drawThing(new Portrait({
      name: this.label,
      hue: this.hue,
      shape: this.shape,
      species: this.species
    }))
  }

  drawTop() {
    return [
      h("ui-button", {
        class: "back",
        appearance: "transparent",
        icon: "arrow left",
        onClick: core.pressed(this, () => guide.goBack()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Back"),
      h("ui-stack", { class: "hero", direction: "horizontal", wrap: "wrap" },
        h("slot", { name: "portrait" }, () => this.drawPortrait()),
        h("ui-stack", { class: "about" },
          h("ui-header", { class: "title" }, () => this.label),
          h("ui-text", { class: "kind" }, () => this.kind),
          () => core.drawThing(new WikiNote({ name: this.label }))
        )
      )
    ]
  }
}

export class WikiNote extends Thing {
  // - it has a name
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spellml", start: 7736, end: 7787 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  draw() {
    return core.drawRead(() => h("slot", { name: "words" }, () => this.drawWords()), undefined, { waiting: () => h("ui-text", { class: "kind" }, "Asking Wikipedia"), failed: () => h("ui-text", { class: "kind" }, "Wikipedia can't be reached just now.") })
  }

  static drawsWaiting = true
  drawWords() {
    if (this.page && this.page.fits) {
      return h("ui-text", { paragraph: true, part: "words" },
        () => core.whileWaiting(() => this.page.summary),
        h("ui-link", { link: () => this.page.contentUrls.desktop.page, target: "_blank" },
          "Read the rest on Wikipedia"
        )
      )
    }
  }
}

export class Fact extends Thing {
  // - it has a label
  get label() { return this.getProp("label") }
  set label(value) { this.setProp("label", value) }

  // - it has a value
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }

  // - its "date" is a date
  static { this.declareProp("date", { type: "date" }) }
  get date() { return this.getProp("date") }
  set date(value) { this.setProp("date", value) }

  /** What a server writes when nothing's known isn't worth a row */
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

  static { this.declareProp("shown", { declaredAt: { path: "/StarWars.spellml", start: 8956, end: 9014 }, readsFrom: ["star_wars"] }) }
  get shown() {
    return core.filter(this.facts, (fact) => fact.isKnown)
  }

  draw() {
    if (!core.isEmpty(this.shown)) {
      return h("ui-table", { class: "facts", appearance: "very-basic", inverted: true, unstackable: true },
        () => core.drawItems(this.shown)
      )
    }
  }
}

export class Section extends Thing {
  // - it has a heading
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
        h("ui-header", { class: "section", size: "small" }, () => this.heading),
        h("ui-cards", { columns: "4", doubling: true }, () => core.drawThing(this.single))
      ]
    } else return core.drawRead(() => this.things, (thing) => core.drawThing(thing), { whole: () => h("ui-section", { label: () => this.heading, "hide-empty": "" }), items: () => h("ui-cards", { columns: "4", doubling: true }) })
  }
}

export class CraftPage extends Thing {
  // - it has a model
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  // - it has a maker
  get maker() { return this.getProp("maker") }
  set maker(value) { this.setProp("maker", value) }

  // - it has a length
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  // - it has a crew
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  // - it has a passengers
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  // - it has a cost
  get cost() { return this.getProp("cost") }
  set cost(value) { this.setProp("cost", value) }

  /** How long it is, in something you can picture:  an X-wing is 12.5 metres */
  get xWingsLong() {
    if (this.length === undefined) return undefined
    return Math.round(this.length / 12.5)
  }

  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Model", value: this.model }))
    known.append(new Fact({ label: "Made by", value: this.maker }))
    known.append(new Fact({ label: "Length", value: measureAmountInUnit(this.length, "m") }))
    known.append(new Fact({ label: "As long as", value: measureAmountInUnit(this.xWingsLong, "X-wings") }))
    known.append(new Fact({ label: "Crew", value: this.crew }))
    known.append(new Fact({ label: "Passengers", value: measureAmountInUnit(this.passengers, "people") }))
    known.append(new Fact({ label: "Costs", value: measureAmountInUnit(this.cost, "credits") }))
    return known
  }

  draw() {
    return core.drawThing(new FactTable({ facts: this.facts }))
  }
}

export class Guide extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  create() {
    this.tab = "films"
    this.search = ""
  }

  // - its "showing" is a thing
  static { this.declareProp("showing", { type: "Thing" }) }
  get showing() { return this.getProp("showing") }
  set showing(value) { this.setProp("showing", value) }

  // - its "trail" is a new list of things
  static { this.declareProp("trail", { itemType: "Thing", init: () => new List({ instanceType: "Thing" }) }) }
  get trail() { return this.getProp("trail") }
  set trail(value) { this.setProp("trail", value) }

  // - its "playing" is a film
  static { this.declareProp("playing", { type: "Film" }) }
  get playing() { return this.getProp("playing") }
  set playing(value) { this.setProp("playing", value) }

  // - its "jumping" is yes or no
  static { this.declareProp("jumping", { type: "choice" }) }
  get jumping() { return this.getProp("jumping") }
  set jumping(value) { this.setProp("jumping", value) }

  /** Whatever's found:  the film, character, planet, ship or anything else with that in its name */
  static { this.declareProp("found", { declaredAt: { path: "/StarWars.spellml", start: 641, end: 1464 }, readsFrom: ["star_wars"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const matches = new List({ instanceType: "Thing" })
    core.map(core.filter(await core.savedThings(Film, {}, "looks through"), (film) => core.includes(film.title, this.search)), (film) => matches.append(film))
    core.map(core.filter(await core.savedThings(Character, {}, "looks through"), (character) => core.includes(character.name, this.search)), (character) => matches.append(character))
    core.map(core.filter(await core.savedThings(Planet, {}, "looks through"), (planet) => core.includes(planet.name, this.search)), (planet) => matches.append(planet))
    core.map(core.filter(await core.savedThings(Starship, {}, "looks through"), (starship) => core.includes(starship.name, this.search)), (starship) => matches.append(starship))
    core.map(core.filter(await core.savedThings(Vehicle, {}, "looks through"), (vehicle) => core.includes(vehicle.name, this.search)), (vehicle) => matches.append(vehicle))
    core.map(core.getItemAt(this, position(core.filter(await core.savedThings(Species, {}, "looks through"), (species) => core.includes(species.name, this.search)))), (one) => matches.append(one))
    return matches
  }, () => [this.search]) }

  goBack() {
    if (core.isEmpty(this.trail)) {
      this.showing = undefined
      return
    }
    this.showing = core.getItemAt(this.trail, -1)
    core.removeItemAt(this.trail, -1)
    core.scrollToTop()
  }

  goToWhere(where) {
    this.tab = where
    this.search = ""
    this.showing = undefined
    core.clear(this.trail)
    core.scrollToTop()
  }

  async playTheOpening() {
    this.playing = await core.savedThingAt(Film, 1)
  }

  /** A jump to light speed, and wherever it lands */
  async punch() {
    this.jumping = true
    const landing = core.randomItemOf(await core.savedThings(Character))
    await core.pauseFor(2600, "msec")
    landing?.open()
    this.jumping = false
  }

  draw() {
    return [
      this.jumping ? core.drawThing(new Jump()) : undefined,
      h("ui-stack", { class: "top", direction: "horizontal", wrap: "wrap", align: "end", justify: "between" },
        h("ui-button", {
          class: "logo",
          appearance: "transparent",
          onClick: core.pressed(this, () => this.goToWhere("films")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Star Wars"),
        h("ui-form", { class: "find", value: this },
          h("ui-field", { label: "Search the galaxy" },
            h("ui-input", { name: "search", icon: "search", placeholder: "Luke, Hoth, Falcon" })
          )
        ),
        h("ui-button", {
          class: "punch",
          color: "primary",
          onClick: core.pressed(this, async () => await this.punch()),
          title: "Jump to light speed, and land on someone",
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Punch it")
      ),
      h("ui-toolbar", { class: "tabs", appearance: "secondary pointing", "aria-label": "Browse" },
        h("ui-item", {
          active: () => this.tab === "films",
          onClick: core.pressed(this, () => this.goToWhere("films")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Films"),
        h("ui-item", {
          active: () => this.tab === "characters",
          onClick: core.pressed(this, () => this.goToWhere("characters")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Characters"),
        h("ui-item", {
          active: () => this.tab === "planets",
          onClick: core.pressed(this, () => this.goToWhere("planets")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Planets"),
        h("ui-item", {
          active: () => this.tab === "ships",
          onClick: core.pressed(this, () => this.goToWhere("ships")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Ships"),
        h("ui-item", {
          active: () => this.tab === "vehicles",
          onClick: core.pressed(this, () => this.goToWhere("vehicles")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Vehicles"),
        h("ui-item", {
          active: () => this.tab === "species",
          onClick: core.pressed(this, () => this.goToWhere("species")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Species")
      ),
      h("slot", { name: "shelf" }, () => this.drawShelf()),
      h("ui-text", { class: "credits", size: "small" },
        "Films, characters, planets and ships from ",
        h("ui-link", { link: "https://swapi.py4e.com/" }, "swapi.py4e.com"),
        ". Pictures and what they're of from ",
        h("ui-link", { link: "https://en.wikipedia.org/" }, "Wikipedia"),
        ", asked for as you look. Star Wars belongs to Lucasfilm and Disney."
      ),
      this.playing ? this.playing.drawCrawl() : undefined
    ]
  }

  // Each tab's list says nothing of how long it is:  a long one draws what fits, and more as you scroll
  drawShelf() {
    if (this.showing && this.search === "") return this.showing.drawPage()
    else if (this.search !== "") {
      return [
        h("ui-header", { size: "medium", part: "shelf" }, "Searching for “", () => this.search, "”"),
        core.drawRead(() => this.found, (thing) => core.drawThing(thing), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, () => this.signal),
          none: () => h("ui-text", { part: "shelf" }, "Nobody and nothing by that name, in this galaxy."),
          failedSay: () => this.lostSignal,
          items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
        })
      ]
    } else if (this.tab === "films") {
      return [
        h("ui-segment", { class: "opening", inverted: true, align: "center", part: "shelf" },
          h("ui-text", { class: "long-ago", size: "large" }, "A long time ago in a galaxy far, far away...."),
          h("ui-button", {
            class: "play-opening",
            size: "massive",
            onClick: core.pressed(this, async () => await this.playTheOpening()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Play the opening")
        ),
        core.drawRead(async () => await core.savedThings(Film, {}, "as drawn"), (film) => core.drawThing(film), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, () => this.signal),
          failedSay: () => this.lostSignal,
          items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
        })
      ]
    } else if (this.tab === "characters") {
      return core.drawRead(async () => await core.savedThings(Character, {}, "as drawn"), (character) => core.drawThing(character), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, () => this.signal),
        failedSay: () => this.lostSignal,
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    } else if (this.tab === "planets") {
      return core.drawRead(async () => await core.savedThings(Planet, {}, "as drawn"), (planet) => core.drawThing(planet), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, () => this.signal),
        failedSay: () => this.lostSignal,
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    } else if (this.tab === "vehicles") {
      return core.drawRead(async () => await core.savedThings(Vehicle, {}, "as drawn"), (vehicle) => core.drawThing(vehicle), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, () => this.signal),
        failedSay: () => this.lostSignal,
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    } else if (this.tab === "species") {
      return core.drawRead(async () => await core.savedThings(Species, {}, "as drawn"), (species) => core.drawThing(species), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, () => this.signal),
        failedSay: () => this.lostSignal,
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    } else {
      return core.drawRead(async () => await core.savedThings(Starship, {}, "as drawn"), (starship) => core.drawThing(starship), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, () => this.signal),
        failedSay: () => this.lostSignal,
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    }
  }

  get signal() {
    return "Waiting for a signal from the galaxy"
  }

  get lostSignal() {
    return "The signal from swapi.py4e.com is lost."
  }
}
export const guide = new Guide()

core.heading("What everything here can do")
/////////////////////////////////
// ## What everything here can do
/////////////////////////////////
// It's on `a thing`, not a base type of the program's own:  each type below is simply `a thing`.
// Spell has no mixins yet (epic `mixins`), and a thing here shares by HOLDING a card, and drawing it.

Thing.prototype.open = function () {
  if (guide.showing) core.append(guide.trail, guide.showing)
  guide.search = ""
  guide.showing = this
  core.scrollToTop()
}

/** A number for people to read:  with none, nothing, so its row doesn't show */
export function measureAmountInUnit(amount, unit) {
  if (amount === undefined) return ""
  return `${core.withCommas(amount)} ${unit}`
}

core.heading("A card:  a picture, a name, what kind, and a click anywhere on it opens the thing")
///////////////////////////////////////////////////////////////////////////////////////
// ## A card:  a picture, a name, what kind, and a click anywhere on it opens the thing
///////////////////////////////////////////////////////////////////////////////////////
// Every type holds one of these, with its own words.

core.heading("What Wikipedia says of it, and where to read the rest")
///////////////////////////////////////////////////////////
// ## What Wikipedia says of it, and where to read the rest
///////////////////////////////////////////////////////////
// Not every name has a page, and a name may be someone else's:  Zolan is a medicine.

core.heading("A page's parts")
////////////////////
// ## A page's parts
////////////////////
// A table of what's known, leaving out what isn't;  a list under its heading, or nothing if it's empty.

core.heading("A film")
//# A film

core.heading("A character")
//# A character

core.heading("A planet")
//# A planet

core.heading("A ship, and a vehicle:  much the same to look at")
//////////////////////////////////////////////////////
// ## A ship, and a vehicle:  much the same to look at
//////////////////////////////////////////////////////
// Their pages share `to draw a craft`'s words, handed what differs.

core.heading("A species")
///////////////
// ## A species
///////////////
// A species with no picture takes the first of its people who has one.

if (!core.isCarryingOver) guide.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  only the look no \`ui-*\` attribute gives:  deep space, the title's yellow, the opening and the jump.¬   - \`color-scheme: dark\` here is what turns the Spell UI elements dark too.¬   - Every animation is under "no preference" for motion:  with reduced motion the stars hold still,¬     and the opening is a page you read at your own speed. */¬¬star-wars-app {¬  --yellow: #ffe81f;¬  --space: #05060f;¬  --ui-primary: var(--yellow);¬  --ui-text-color: #eef1ff;¬  --ui-card-background: rgb(255 255 255 / 6%);¬  --ui-card-border-color: rgb(255 255 255 / 14%);¬  --ui-card-hover-border-color: var(--yellow);¬  --ui-card-margin-block: 0;¬  --title: 900 1em / 1.1 "Arial Black", Impact, sans-serif;¬¬  color-scheme: dark;¬  position: relative;¬  isolation: isolate;¬  display: block;¬  min-height: 100vh;¬  overflow: clip;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: var(--space) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='310' height='270'%3E%3Cg fill='%23dfe6ff'%3E%3Ccircle cx='20' cy='30' r='.7'/%3E%3Ccircle cx='140' cy='80' r='.6'/%3E%3Ccircle cx='240' cy='180' r='.9'/%3E%3Ccircle cx='70' cy='210' r='.6'/%3E%3Ccircle cx='290' cy='40' r='1'/%3E%3C/g%3E%3C/svg%3E");¬}¬¬star-wars-app ui-text::part(text) {¬  color: #eef1ff;¬}¬¬.logo::part(button),¬.punch::part(button),¬.play-opening::part(button) {¬  font: var(--title);¬  text-transform: uppercase;¬}¬¬.logo::part(button) {¬  padding: 0;¬  background: none;¬  color: var(--yellow);¬  font-size: 1.9em;¬}¬¬.punch::part(button),¬.play-opening::part(button) {¬  background: var(--yellow);¬  color: var(--space);¬}¬¬.opening .play-opening::part(button) {¬  padding: 0.7em 1.6em;¬  font-size: clamp(1.2em, 3.4vw, 1.9em);¬}¬¬.find {¬  flex: 1 1 14em;¬  max-width: 28em;¬}¬¬/* the opening's button, the first thing on the Films tab */¬.opening::part(segment) {¬  --ui-segment-background: radial-gradient(ellipse at 50% 120%, #1c2a6b, var(--space) 70%);¬¬  padding: clamp(1.5em, 6vw, 3.5em) 1em;¬  display: grid;¬  justify-items: center;¬  gap: 1em;¬}¬¬star-wars-app .long-ago::part(text) {¬  color: #4bd5ee;¬}¬¬.section::part(header),¬.credits::part(text) {¬  margin-block-start: 1em;¬}¬¬.section::part(header) {¬  color: var(--yellow);¬  text-transform: uppercase;¬}¬¬.title::part(header) {¬  color: var(--yellow);¬  font: var(--title);¬  font-size: clamp(1.6em, 5vw, 2.8em);¬  text-transform: uppercase;¬}¬¬.facts {¬  max-width: 30em;¬}¬¬.kind::part(text) {¬  opacity: 0.7;¬}¬¬/****************¬ * A picture:  a picture over an initial on a colour, so nothing's ever a broken image.  A world is a world.¬ ****************/¬¬.portrait::part(segment) {¬  position: relative;¬  display: grid;¬  place-items: center;¬  margin: 0;¬  padding: 0;¬  aspect-ratio: 4 / 3;¬  overflow: hidden;¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 70% 58%), hsl(var(--hue) 60% 18%));¬}¬¬.portrait.world::part(segment) {¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 75% 62%), hsl(var(--hue) 60% 14%) 60%, transparent 61%);¬}¬¬.initial::part(header) {¬  font: var(--title);¬  font-size: 3.4em;¬}¬¬.portrait ui-image::part(image) {¬  position: absolute;¬  inset: 0;¬  width: 100%;¬  height: 100%;¬  object-fit: cover;¬  object-position: 50% 20%;¬}¬¬.hero {¬  align-items: start;¬}¬¬.hero .portrait::part(segment) {¬  width: min(22em, 100%);¬}¬¬.about {¬  flex: 1 1 20em;¬}¬¬/****************¬ * The jump to light speed, as the films show it:¬ *   the stars still, a beat;  each stays where it is and stretches straight out from the middle of the view,¬ *   slowly then all at once, thin near the middle and bright at the edges;  a white flash;¬ *   the mottled blue tunnel;  a sudden stop.¬ ****************/¬¬.jump::part(segment) {¬  position: fixed;¬  inset: 0;¬  z-index: 5;¬  margin: 0;¬  overflow: hidden;¬  background: var(--space);¬  pointer-events: none;¬}¬¬.streak {¬  --angle: calc(var(--n) * 137.508deg);¬  --distance: mod(calc(var(--n) * var(--n) * 0.7549), 100);¬  --place: rotate(var(--angle)) translateX(calc(var(--distance) * 0.75vmax));¬¬  position: absolute;¬  top: 50%;¬  left: 50%;¬  inline-size: 3px;¬  block-size: calc(1px + var(--distance) * 0.03px);¬  border-radius: 50%;¬  background: linear-gradient(90deg, rgb(120 160 255 / 0%), #bcd4ff 35%, #fff);¬  opacity: calc(0.55 + var(--distance) / 200);¬  transform-origin: 0 50%;¬  transform: var(--place);¬}¬¬.jump-tunnel,¬.jump-flash {¬  position: absolute;¬  inset-block: -30%;¬  inset-inline: -30%;¬  inline-size: auto;¬  block-size: auto;¬  opacity: 0;¬}¬¬.jump-flash {¬  background: #fff;¬}¬¬/* mottled:  layers whose streaks repeat at different lengths, so they never line up;  dark at the middle, as the film's is */¬.jump-tunnel {¬  background:¬    radial-gradient(circle, #041033 0 5%, rgb(4 16 51 / 0%) 22%),¬    repeating-conic-gradient(from 11deg, rgb(205 225 255 / 0%) 0 3.7deg, rgb(205 225 255 / 55%) 4.1deg, rgb(205 225 255 / 0%) 4.6deg 11.3deg),¬    repeating-conic-gradient(from 3deg, rgb(96 150 255 / 0%) 0 1.9deg, rgb(96 150 255 / 60%) 3.1deg, rgb(96 150 255 / 0%) 4.3deg 7.9deg),¬    repeating-conic-gradient(from 29deg, #0a2470 0 6.1deg, #143a9e 8.3deg, #0c2a80 10.7deg 13.1deg, #1b49b8 15.2deg, #0a2470 17.3deg);¬  filter: blur(2.5px);¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .streak {¬    animation: stretch 1050ms cubic-bezier(0.75, 0, 1, 0.55) 300ms both;¬  }¬¬  .jump-flash {¬    animation: flash 300ms linear 1250ms forwards;¬  }¬¬  .jump-tunnel {¬    animation: tunnel 1050ms linear 1400ms forwards;¬  }¬}¬¬@keyframes stretch {¬  to {¬    transform: var(--place) scaleX(calc(var(--distance) * 8));¬  }¬}¬¬@keyframes flash {¬  40% {¬    opacity: 1;¬  }¬}¬¬@keyframes tunnel {¬  0%,¬  98% {¬    opacity: 1;¬  }¬  to {¬    scale: 1.8;¬    rotate: 14deg;¬    opacity: 0;¬  }¬}¬¬/****************¬ * The opening:  yellow words going away, over deep space.  A modal the whole window high, so it's a cinema, and Escape ends it.¬ ****************/¬¬.crawl {¬  color-scheme: dark;¬  --yellow: #ffe81f;¬}¬¬.crawl::part(modal) {¬  overflow: hidden;¬  padding: 0;¬  background: #05060f;¬}¬¬.crawl .long-ago::part(text) {¬  position: absolute;¬  inset: 38% 0 auto;¬  text-align: center;¬  opacity: 0;¬}¬¬.stop {¬  position: absolute;¬  inset: 1em 1em auto auto;¬  z-index: 1;¬}¬¬.stage::part(segment) {¬  position: absolute;¬  inset: 0;¬  margin: 0;¬  perspective: 340px;¬  perspective-origin: 50% 40%;¬}¬¬.words::part(segment) {¬  position: absolute;¬  inset: auto 0 0;¬  margin-inline: auto;¬  width: min(88%, 30em);¬  color: var(--yellow);¬  font: 700 clamp(1.3em, 3.2vw, 2.8em) / 1.45 "Arial Narrow", Arial, sans-serif;¬  transform-origin: 50% 100%;¬  transform: rotateX(24deg);¬}¬¬.episode::part(header),¬.crawl-title::part(header) {¬  color: var(--yellow);¬  font: inherit;¬  text-align: center;¬  text-transform: uppercase;¬}¬¬/* its lines are the film's own */¬star-wars-app .crawl-text::part(text) {¬  color: var(--yellow);¬  font: inherit;¬  white-space: pre-line;¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .crawl .long-ago::part(text) {¬    animation: long-ago 5s ease-in-out both;¬  }¬¬  .words::part(segment) {¬    animation: crawl 70s linear 5s both;¬  }¬}¬¬/* with reduced motion:  no tilt, no movement, the whole of it to read */¬@media (prefers-reduced-motion: reduce) {¬  .crawl .long-ago::part(text),¬  .stage::part(segment),¬  .words::part(segment) {¬    position: static;¬    opacity: 1;¬    transform: none;¬  }¬¬  .crawl::part(modal) {¬    overflow: auto;¬  }¬}¬¬@keyframes long-ago {¬  20%,¬  80% {¬    opacity: 1;¬  }¬}¬¬@keyframes crawl {¬  from {¬    transform: rotateX(24deg) translateY(100%);¬  }¬  to {¬    transform: rotateX(24deg) translateY(-160%) translateZ(-900px);¬  }¬}¬`)
// -----------
core.heading("The opening:  yellow, receding, and it stops when you say")
///////////////////////////////////////////////////////////////
// ## The opening:  yellow, receding, and it stops when you say
///////////////////////////////////////////////////////////////
// A widget of its own:  `ui-modal` is the cinema, and no `ui-*` tilts words away into the distance.

// -----------
core.heading("The jump to light speed")
/////////////////////////////
// ## The jump to light speed
/////////////////////////////
// Each star stays where it is and stretches straight out from the middle of the view, faster and faster;  a white flash;  the blue tunnel;  a sudden stop.
// A widget of its own, as no `ui-*` stretches a star:  `ui-space` is the bare box each star is drawn on, and the rest is in styles.css.

export class Jump extends Thing {
  draw() {
    return h("ui-segment", { class: "jump", appearance: "basic", "aria-hidden": "true" },
      h("ui-space", { class: "jump-tunnel" }),
      h("slot", { name: "stars" }, () => this.drawStars()),
      h("ui-space", { class: "jump-flash" })
    )
  }

  drawStars() {
    return core.drawEach(core.getRange(1, 240), (star) => h("ui-space", { class: "streak", style: () => `--n: ${star}`, part: "stars" }))
  }
}
// -----------
core.heading("A picture:  its own page on Wikipedia, if it has one, else an initial on a colour")
///////////////////////////////////////////////////////////////////////////////////////
// ## A picture:  its own page on Wikipedia, if it has one, else an initial on a colour
///////////////////////////////////////////////////////////////////////////////////////
// A widget of its own, as no `ui-image` falls back on anything:  an initial shows until a picture comes, and stays if none does.
// A species with no picture of its own takes the first of its people who has one:  Hutt, Jabba.

export class Portrait extends Thing {
  // - it has a name
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - it has a hue
  get hue() { return this.getProp("hue") }
  set hue(value) { this.setProp("hue", value) }

  // - it has a shape
  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  // - its "species" is a species
  static { this.declareProp("species", { type: "Species" }) }
  get species() { return this.getProp("species") }
  set species(value) { this.setProp("species", value) }

  static { this.declareProp("page", { declaredAt: { path: "/StarWarsPortrait.spellml", start: 445, end: 496 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  get initial() {
    return core.getItemAt(this.name, 0)
  }

  static { this.declareProp("picture", { declaredAt: { path: "/StarWarsPortrait.spellml", start: 570, end: 775 }, readsFrom: ["wikipedia", "star_wars"] }) }
  get picture() { return core.waitedValue(this, "picture", async () => {
    if ((await core.answerOf(this, "page")) && (await core.answerOf(this, "page")).fits && (await core.answerOf(this, "page")).thumbnail) return (await core.answerOf(this, "page")).thumbnail.source
    if (await core.answerOf(this, "species")) return await core.answerOf((await core.answerOf(this, "species")), "picture")
    return ""
  }) }

  draw() {
    return h("ui-segment", { class: () => `portrait ${this.shape}`, style: () => `--hue: ${this.hue}`, appearance: "basic" },
      h("ui-header", { class: "initial" }, () => this.initial),
      h("slot", { name: "photo" }, () => this.drawPhoto())
    )
  }

  // Waiting for it, or if Wikipedia can't be reached, the initial stays
  static drawsWaiting = true
  drawPhoto() {
    if (this.picture !== "") return h("ui-image", { src: () => this.picture, alt: "", part: "photo" })

    core.readRider("waiting", () => h("ui-space", { part: "photo" }))
    core.readRider("failed", () => h("ui-space", { part: "photo" }))
  }
}
