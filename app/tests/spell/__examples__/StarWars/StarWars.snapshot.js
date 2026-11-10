import { core, Thing, List, App, Place, h } from "@spell/core"

core.heading("Star Wars:  where it all lives")
////////////////////////////////////
// ## Star Wars:  where it all lives
////////////////////////////////////
// A server other people run, and what it holds.  What's drawn and done with it is in StarWars.spell;
// the pictures and what they're of come from Wikipedia, in Wikipedia.api.spell.
// `star wars` is what this wrote, from looking at the server:
//   spell place ingest https://swapi.py4e.com/api --into StarWars.api.spell --name "star wars"
// `spell place update StarWars.api.spell` looks again, and changes only this file and StarWars.api.json5.
// A height, a mass and a diameter say their units, cm, kg and km, as swapi's docs give them:
// so each shows in the reader's own, 5 ft 8 in in the US.
//
// Star Wars belongs to Lucasfilm and Disney.
// It's asked for as it runs, and kept only on the device of whoever's looking, until 5am;
// the page says where it comes from.

export class Character extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1381, end: 1402 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "height" is a length in cm or "unknown"
  static { this.declareProp("height", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1419, end: 1462 } }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  // - its "mass" is a weight in kg or "unknown"
  static { this.declareProp("mass", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1467, end: 1508 } }) }
  get mass() { return this.getProp("mass") }
  set mass(value) { this.setProp("mass", value) }

  // - its "hair color" is text
  static { this.declareProp("hairColor", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1520, end: 1547 } }) }
  get hairColor() { return this.getProp("hairColor") }
  set hairColor(value) { this.setProp("hairColor", value) }

  // - its "skin color" is text
  static { this.declareProp("skinColor", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1552, end: 1579 } }) }
  get skinColor() { return this.getProp("skinColor") }
  set skinColor(value) { this.setProp("skinColor", value) }

  // - its "eye color" is text
  static { this.declareProp("eyeColor", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1584, end: 1610 } }) }
  get eyeColor() { return this.getProp("eyeColor") }
  set eyeColor(value) { this.setProp("eyeColor", value) }

  // - its "birth year" is text
  static { this.declareProp("birthYear", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1615, end: 1642 } }) }
  get birthYear() { return this.getProp("birthYear") }
  set birthYear(value) { this.setProp("birthYear", value) }

  // - its "gender" is text
  static { this.declareProp("gender", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1647, end: 1670 } }) }
  get gender() { return this.getProp("gender") }
  set gender(value) { this.setProp("gender", value) }

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.api.spell", start: 1675, end: 1709 } }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 1715, end: 1748 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List({ instanceType: "Species" }), declaredAt: { path: "/StarWars.api.spell", start: 1753, end: 1790 } }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.api.spell", start: 1795, end: 1834 } }) }
  get vehicles() { return core.linked(this, "vehicles", Vehicle) }
  set vehicles(value) { this.setProp("vehicles", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.api.spell", start: 1839, end: 1880 } }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1885, end: 1915 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1921, end: 1950 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 10810, end: 10906 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: `Born ${this.birthYear}`,
      subject: this
    })
  }

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spell", start: 10919, end: 10970 }, readsFrom: ["wikipedia", "star_wars"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  /** Their own picture on Wikipedia, or nothing */
  static { this.declareProp("picture", { declaredAt: { path: "/StarWars.spell", start: 10983, end: 11171 }, readsFrom: ["wikipedia", "star_wars"] }) }
  get picture() { return core.waitedValue(this, "picture", async () => {
    if ((await core.answerOf(this, "page")) && (await core.answerOf(this, "page"))?.fits && (await core.answerOf(this, "page"))?.thumbnail) return (await core.answerOf(this, "page"))?.thumbnail?.source
    return ""
  }) }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 11221, end: 11648 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Height", value: `${core.measureShown(this.height, "Length", "centimeter")}` }))
    known.append(new Fact({ label: "Mass", value: `${core.measureShown(this.mass, "Weight", "kilogram")}` }))
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

  static savedIn = {
    place: "star_wars",
    collection: "characters",
    times: ["modified"], select: ["name", "height", "mass", "hairColor", "eyeColor", "birthYear", "homeworld", "films", "species", "vehicles", "starships"] }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1348, end: 1369 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Planet extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2040, end: 2061 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "rotation period" is a number or "unknown"
  static { this.declareProp("rotationPeriod", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2078, end: 2124 } }) }
  get rotationPeriod() { return this.getProp("rotationPeriod") }
  set rotationPeriod(value) { this.setProp("rotationPeriod", value) }

  // - its "orbital period" is a number or "unknown"
  static { this.declareProp("orbitalPeriod", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2129, end: 2174 } }) }
  get orbitalPeriod() { return this.getProp("orbitalPeriod") }
  set orbitalPeriod(value) { this.setProp("orbitalPeriod", value) }

  // - its "diameter" is a length in km
  static { this.declareProp("diameter", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 2179, end: 2211 } }) }
  get diameter() { return this.getProp("diameter") }
  set diameter(value) { this.setProp("diameter", value) }

  // - its "climate" is text
  static { this.declareProp("climate", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2223, end: 2247 } }) }
  get climate() { return this.getProp("climate") }
  set climate(value) { this.setProp("climate", value) }

  // - its "gravity" is text
  static { this.declareProp("gravity", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2252, end: 2276 } }) }
  get gravity() { return this.getProp("gravity") }
  set gravity(value) { this.setProp("gravity", value) }

  // - its "terrain" is text
  static { this.declareProp("terrain", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2281, end: 2305 } }) }
  get terrain() { return this.getProp("terrain") }
  set terrain(value) { this.setProp("terrain", value) }

  // - its "surface water" is a number or "unknown"
  static { this.declareProp("surfaceWater", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2322, end: 2366 } }) }
  get surfaceWater() { return this.getProp("surfaceWater") }
  set surfaceWater(value) { this.setProp("surfaceWater", value) }

  // - its "population" is a number or "unknown"
  static { this.declareProp("population", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2371, end: 2412 } }) }
  get population() { return this.getProp("population") }
  set population(value) { this.setProp("population", value) }

  // - its "residents" is a list of characters
  static { this.declareProp("residents", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 2424, end: 2466 } }) }
  get residents() { return core.linked(this, "residents", Character) }
  set residents(value) { this.setProp("residents", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 2471, end: 2504 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2509, end: 2539 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2545, end: 2574 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 12308, end: 12426 }, readsFrom: ["star_wars"] }) }
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
  static { this.declareProp("hue", { declaredAt: { path: "/StarWars.spell", start: 12439, end: 12816 }, readsFrom: ["star_wars"] }) }
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

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 12866, end: 13447 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List({ instanceType: "Fact" })
    known.append(new Fact({ label: "Climate", value: this.climate }))
    known.append(new Fact({ label: "Terrain", value: this.terrain }))
    known.append(new Fact({ label: "Diameter", value: `${core.measureShown(this.diameter, "Length", "kilometer")}` }))
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

  static savedIn = {
    place: "star_wars",
    collection: "planets",
    times: ["modified"], select: ["name", "rotationPeriod", "orbitalPeriod", "diameter", "climate", "terrain", "population", "residents", "films"] }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2007, end: 2028 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Film extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2662, end: 2684 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "episode id" is a number
  static { this.declareProp("episodeId", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 2689, end: 2724 } }) }
  get episodeId() { return this.getProp("episodeId") }
  set episodeId(value) { this.setProp("episodeId", value) }

  // - its "opening crawl" is text
  static { this.declareProp("openingCrawl", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2730, end: 2760 } }) }
  get openingCrawl() { return this.getProp("openingCrawl") }
  set openingCrawl(value) { this.setProp("openingCrawl", value) }

  // - its "director" is text
  static { this.declareProp("director", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2765, end: 2790 } }) }
  get director() { return this.getProp("director") }
  set director(value) { this.setProp("director", value) }

  // - its "producer" is text
  static { this.declareProp("producer", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2795, end: 2820 } }) }
  get producer() { return this.getProp("producer") }
  set producer(value) { this.setProp("producer", value) }

  // - its "release date" is a date
  static { this.declareProp("releaseDate", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2825, end: 2860 } }) }
  get releaseDate() { return this.getProp("releaseDate") }
  set releaseDate(value) { this.setProp("releaseDate", value) }

  // - its "characters" is a list of characters
  static { this.declareProp("characters", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 2866, end: 2909 } }) }
  get characters() { return core.linked(this, "characters", Character) }
  set characters(value) { this.setProp("characters", value) }

  // - its "planets" is a list of planets
  static { this.declareProp("planets", { itemType: "Planet", init: () => new List({ instanceType: "Planet" }), declaredAt: { path: "/StarWars.api.spell", start: 2914, end: 2951 } }) }
  get planets() { return core.linked(this, "planets", Planet) }
  set planets(value) { this.setProp("planets", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.api.spell", start: 2956, end: 2997 } }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.api.spell", start: 3002, end: 3041 } }) }
  get vehicles() { return core.linked(this, "vehicles", Vehicle) }
  set vehicles(value) { this.setProp("vehicles", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List({ instanceType: "Species" }), declaredAt: { path: "/StarWars.api.spell", start: 3046, end: 3083 } }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3088, end: 3118 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3124, end: 3153 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 9609, end: 9709 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.title,
      kind: `Episode ${this.episodeId}`,
      subject: this
    })
  }

  async play() {
    guide.playing = this
  }

  async end() {
    guide.playing = undefined
  }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 9887, end: 10186 }, readsFrom: ["star_wars"] }) }
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
        font: "all-caps",
        onClick: core.pressed(this, async () => await this.play()),
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
      "on-ui-closed": () => async () => await this.end(),
      "aria-label": () => `The opening of ${this.title}`,
      part: "crawl"
    },
      h("ui-text", { class: "long-ago", size: "big" }, "A long time ago in a galaxy far, far away...."),
      h("ui-segment", { class: "stage", appearance: "basic" },
        h("ui-segment", { class: "words", appearance: "basic" },
          h("ui-header", { class: "episode", font: "all-caps" }, "Episode ", () => this.episodeId),
          h("ui-header", { class: "crawl-title", font: "all-caps" }, () => this.title),
          h("ui-text", { class: "crawl-text", paragraph: true }, () => this.openingCrawl)
        )
      ),
      h("ui-button", {
        class: "stop",
        onClick: core.pressed(this, async () => await this.end()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Stop")
    )
  }

  static savedIn = {
    place: "star_wars",
    collection: "films",
    times: ["modified"], select: ["title", "episodeId", "openingCrawl", "director", "producer", "releaseDate", "characters", "planets", "starships", "vehicles", "species"] }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2629, end: 2650 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Species extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3244, end: 3265 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "classification" is text
  static { this.declareProp("classification", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3270, end: 3301 } }) }
  get classification() { return this.getProp("classification") }
  set classification(value) { this.setProp("classification", value) }

  // - its "designation" is text
  static { this.declareProp("designation", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3306, end: 3334 } }) }
  get designation() { return this.getProp("designation") }
  set designation(value) { this.setProp("designation", value) }

  // - its "average height" is a number or "n/a" or "unknown"
  static { this.declareProp("averageHeight", { type: "number", nothingAs: ["n/a", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3351, end: 3405 } }) }
  get averageHeight() { return this.getProp("averageHeight") }
  set averageHeight(value) { this.setProp("averageHeight", value) }

  // - its "skin colors" is text
  static { this.declareProp("skinColors", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3417, end: 3445 } }) }
  get skinColors() { return this.getProp("skinColors") }
  set skinColors(value) { this.setProp("skinColors", value) }

  // - its "hair colors" is text
  static { this.declareProp("hairColors", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3450, end: 3478 } }) }
  get hairColors() { return this.getProp("hairColors") }
  set hairColors(value) { this.setProp("hairColors", value) }

  // - its "eye colors" is text
  static { this.declareProp("eyeColors", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3483, end: 3510 } }) }
  get eyeColors() { return this.getProp("eyeColors") }
  set eyeColors(value) { this.setProp("eyeColors", value) }

  // - its "average lifespan" is text
  static { this.declareProp("averageLifespan", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3515, end: 3548 } }) }
  get averageLifespan() { return this.getProp("averageLifespan") }
  set averageLifespan(value) { this.setProp("averageLifespan", value) }

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.api.spell", start: 3553, end: 3587 } }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  // - its "language" is text
  static { this.declareProp("language", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3593, end: 3618 } }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "people" is a list of characters
  static { this.declareProp("people", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 3623, end: 3662 } }) }
  get people() { return core.linked(this, "people", Character) }
  set people(value) { this.setProp("people", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 3667, end: 3700 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3705, end: 3735 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3741, end: 3770 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 16528, end: 16632 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.classification,
      subject: this,
      species: this
    })
  }

  /** Its first character's picture:  asking for everyone at once costs one read, and each link then asks nothing */
  static { this.declareProp("picture", { declaredAt: { path: "/StarWars.spell", start: 16645, end: 16943 }, readsFrom: ["star_wars", "wikipedia"] }) }
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

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 16992, end: 17217 }, readsFrom: ["star_wars"] }) }
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

  static savedIn = {
    place: "star_wars",
    collection: "species",
    times: ["modified"], select: ["name", "classification", "averageLifespan", "homeworld", "language", "people", "films"] }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3211, end: 3232 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Vehicle extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3861, end: 3882 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "model" is text
  static { this.declareProp("model", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3887, end: 3909 } }) }
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  // - its "manufacturer" is text
  static { this.declareProp("manufacturer", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3914, end: 3943 } }) }
  get manufacturer() { return this.getProp("manufacturer") }
  set manufacturer(value) { this.setProp("manufacturer", value) }

  // - its "cost in credits" is a number or "unknown"
  static { this.declareProp("costInCredits", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3960, end: 4006 } }) }
  get costInCredits() { return this.getProp("costInCredits") }
  set costInCredits(value) { this.setProp("costInCredits", value) }

  // - its "length" is a number
  static { this.declareProp("length", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4018, end: 4049 } }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  // - its "max atmosphering speed" is a number
  static { this.declareProp("maxAtmospheringSpeed", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4055, end: 4102 } }) }
  get maxAtmospheringSpeed() { return this.getProp("maxAtmospheringSpeed") }
  set maxAtmospheringSpeed(value) { this.setProp("maxAtmospheringSpeed", value) }

  // - its "crew" is a number
  static { this.declareProp("crew", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4108, end: 4137 } }) }
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  // - its "passengers" is a number
  static { this.declareProp("passengers", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4143, end: 4178 } }) }
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  // - its "cargo capacity" is a number or "none" or "unknown"
  static { this.declareProp("cargoCapacity", { type: "number", nothingAs: ["none", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4196, end: 4251 } }) }
  get cargoCapacity() { return this.getProp("cargoCapacity") }
  set cargoCapacity(value) { this.setProp("cargoCapacity", value) }

  // - its "consumables" is text
  static { this.declareProp("consumables", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4263, end: 4291 } }) }
  get consumables() { return this.getProp("consumables") }
  set consumables(value) { this.setProp("consumables", value) }

  // - its "vehicle class" is text
  static { this.declareProp("vehicleClass", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4296, end: 4326 } }) }
  get vehicleClass() { return this.getProp("vehicleClass") }
  set vehicleClass(value) { this.setProp("vehicleClass", value) }

  // - its "pilots" is a list of characters
  static { this.declareProp("pilots", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 4331, end: 4370 } }) }
  get pilots() { return core.linked(this, "pilots", Character) }
  set pilots(value) { this.setProp("pilots", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 4375, end: 4408 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4413, end: 4443 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4449, end: 4478 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 15785, end: 15874 }, readsFrom: ["star_wars"] }) }
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

  static savedIn = {
    place: "star_wars",
    collection: "vehicles",
    times: ["modified"], select: ["name", "model", "manufacturer", "costInCredits", "length", "crew", "passengers", "vehicleClass", "pilots", "films"] }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3828, end: 3849 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Starship extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4570, end: 4591 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "model" is text
  static { this.declareProp("model", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4596, end: 4618 } }) }
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  // - its "manufacturer" is text
  static { this.declareProp("manufacturer", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4623, end: 4652 } }) }
  get manufacturer() { return this.getProp("manufacturer") }
  set manufacturer(value) { this.setProp("manufacturer", value) }

  // - its "cost in credits" is a number or "unknown"
  static { this.declareProp("costInCredits", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4669, end: 4715 } }) }
  get costInCredits() { return this.getProp("costInCredits") }
  set costInCredits(value) { this.setProp("costInCredits", value) }

  // - its "length" is a number
  static { this.declareProp("length", { type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4727, end: 4758 } }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  // - its "max atmosphering speed" is text
  static { this.declareProp("maxAtmospheringSpeed", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4764, end: 4803 } }) }
  get maxAtmospheringSpeed() { return this.getProp("maxAtmospheringSpeed") }
  set maxAtmospheringSpeed(value) { this.setProp("maxAtmospheringSpeed", value) }

  // - its "crew" is text
  static { this.declareProp("crew", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4808, end: 4829 } }) }
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  // - its "passengers" is a number or "n/a" or "unknown"
  static { this.declareProp("passengers", { type: "number", nothingAs: ["n/a", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4846, end: 4896 } }) }
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  // - its "cargo capacity" is a number or "unknown"
  static { this.declareProp("cargoCapacity", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4901, end: 4946 } }) }
  get cargoCapacity() { return this.getProp("cargoCapacity") }
  set cargoCapacity(value) { this.setProp("cargoCapacity", value) }

  // - its "consumables" is text
  static { this.declareProp("consumables", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4958, end: 4986 } }) }
  get consumables() { return this.getProp("consumables") }
  set consumables(value) { this.setProp("consumables", value) }

  // - its "hyperdrive rating" is a number or "unknown"
  static { this.declareProp("hyperdriveRating", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 5003, end: 5051 } }) }
  get hyperdriveRating() { return this.getProp("hyperdriveRating") }
  set hyperdriveRating(value) { this.setProp("hyperdriveRating", value) }

  // - its "mglt" is a number or "unknown"
  static { this.declareProp("mglt", { type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 5056, end: 5091 } }) }
  get mglt() { return this.getProp("mglt") }
  set mglt(value) { this.setProp("mglt", value) }

  // - its "starship class" is text
  static { this.declareProp("starshipClass", { type: "text", declaredAt: { path: "/StarWars.api.spell", start: 5103, end: 5134 } }) }
  get starshipClass() { return this.getProp("starshipClass") }
  set starshipClass(value) { this.setProp("starshipClass", value) }

  // - its "pilots" is a list of characters
  static { this.declareProp("pilots", { itemType: "Character", init: () => new List({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 5139, end: 5178 } }) }
  get pilots() { return core.linked(this, "pilots", Character) }
  set pilots(value) { this.setProp("pilots", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 5183, end: 5216 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "created" is a date
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 5221, end: 5251 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "edited" is a date
  static { this.declareProp("edited", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 5257, end: 5286 } }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 15124, end: 15214 }, readsFrom: ["star_wars"] }) }
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

  static savedIn = {
    place: "star_wars",
    collection: "starships",
    times: ["modified"], select: ["name", "model", "manufacturer", "costInCredits", "length", "crew", "passengers", "starshipClass", "pilots", "films"] }

  // - it lives in star wars
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4537, end: 4558 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
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
  searches: { param: "search", fields: ["names", "titles"] },
  checkedEvery: 86400,
  checkedAt: { hour: 5, minute: 0 },
  keptOnDevice: true,
  collections: {
    characters: { at: "/people/" },
    planets: { at: "/planets/" },
    films: { at: "/films/" },
    species: { at: "/species/" },
    vehicles: { at: "/vehicles/" },
    starships: { at: "/starships/" }
  }, firstReads: () => [[Film], [Character], [Planet], [Vehicle], [Species], [Starship]] })

// -----------
core.heading("Wikipedia:  a page each, by its name.  Not every name has one")
///////////////////////////////////////////////////////////////////
// ## Wikipedia:  a page each, by its name.  Not every name has one
///////////////////////////////////////////////////////////////////
// A server other people run:  what Star Wars shows of a character, a planet or a ship, and its picture.
// `wikipedia` is what this wrote, from reading a few pages by name, as there's no list of them all:
//   spell place ingest https://en.wikipedia.org/api/rest_v1 --kind "web server" --into Wikipedia.api.spell
//     --name wikipedia --collections "wiki pages=/page/summary/{name}" --samples "Luke Skywalker,Tatooine,Millennium Falcon"
// `spell place update Wikipedia.api.spell` looks again, by the same names, and changes only this file and Wikipedia.api.json5.
// A wiki page's "about" and "summary" are Star Wars' words for Wikipedia's "description" and "extract".
//
// Its words belong to Wikipedia's writers.  They're asked for as it runs, never kept here, and the page says so.

export class WikiPage extends Thing {
  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type", declaredAt: { path: "/Wikipedia.api.spell", start: 1146, end: 1182 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "displaytitle" is text
  static { this.declareProp("displaytitle", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1194, end: 1223 } }) }
  get displaytitle() { return this.getProp("displaytitle") }
  set displaytitle(value) { this.setProp("displaytitle", value) }

  // - its "namespace" is a namespace
  static { this.declareProp("namespace", { type: "Namespace", declaredAt: { path: "/Wikipedia.api.spell", start: 1228, end: 1265 } }) }
  get namespace() { return this.getProp("namespace") }
  set namespace(value) { this.setProp("namespace", value) }

  // - its "wikibase item" is text
  static { this.declareProp("wikibaseItem", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1271, end: 1301 } }) }
  get wikibaseItem() { return this.getProp("wikibaseItem") }
  set wikibaseItem(value) { this.setProp("wikibaseItem", value) }

  // - its "titles" is a title
  static { this.declareProp("titles", { type: "Title", declaredAt: { path: "/Wikipedia.api.spell", start: 1306, end: 1336 } }) }
  get titles() { return this.getProp("titles") }
  set titles(value) { this.setProp("titles", value) }

  // - its "pageid" is a number
  static { this.declareProp("pageid", { type: "number", declaredAt: { path: "/Wikipedia.api.spell", start: 1342, end: 1373 } }) }
  get pageid() { return this.getProp("pageid") }
  set pageid(value) { this.setProp("pageid", value) }

  // - its "thumbnail" is a thumbnail
  static { this.declareProp("thumbnail", { type: "Thumbnail", declaredAt: { path: "/Wikipedia.api.spell", start: 1379, end: 1416 } }) }
  get thumbnail() { return this.getProp("thumbnail") }
  set thumbnail(value) { this.setProp("thumbnail", value) }

  // - its "originalimage" is an originalimage
  static { this.declareProp("originalimage", { type: "Originalimage", declaredAt: { path: "/Wikipedia.api.spell", start: 1422, end: 1467 } }) }
  get originalimage() { return this.getProp("originalimage") }
  set originalimage(value) { this.setProp("originalimage", value) }

  // - its "lang" is text
  static { this.declareProp("lang", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1473, end: 1494 } }) }
  get lang() { return this.getProp("lang") }
  set lang(value) { this.setProp("lang", value) }

  // - its "dir" is text
  static { this.declareProp("dir", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1499, end: 1519 } }) }
  get dir() { return this.getProp("dir") }
  set dir(value) { this.setProp("dir", value) }

  // - its "revision" is a number
  static { this.declareProp("revision", { type: "number", declaredAt: { path: "/Wikipedia.api.spell", start: 1524, end: 1557 } }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  // - its "tid" is text
  static { this.declareProp("tid", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1563, end: 1583 } }) }
  get tid() { return this.getProp("tid") }
  set tid(value) { this.setProp("tid", value) }

  // - its "timestamp" is a date
  static { this.declareProp("timestamp", { type: "date", declaredAt: { path: "/Wikipedia.api.spell", start: 1588, end: 1620 } }) }
  get timestamp() { return this.getProp("timestamp") }
  set timestamp(value) { this.setProp("timestamp", value) }

  // - its "about" is text, stored as "description"
  static { this.declareProp("about", { type: "text", storedAs: "description", declaredAt: { path: "/Wikipedia.api.spell", start: 1638, end: 1682 } }) }
  get about() { return this.getProp("about") }
  set about(value) { this.setProp("about", value) }

  // - its "description source" is text
  static { this.declareProp("descriptionSource", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1694, end: 1729 } }) }
  get descriptionSource() { return this.getProp("descriptionSource") }
  set descriptionSource(value) { this.setProp("descriptionSource", value) }

  // - its "content urls" is a content url
  static { this.declareProp("contentUrls", { type: "ContentUrl", declaredAt: { path: "/Wikipedia.api.spell", start: 1734, end: 1772 } }) }
  get contentUrls() { return this.getProp("contentUrls") }
  set contentUrls(value) { this.setProp("contentUrls", value) }

  // - its "summary" is text, stored as "extract"
  static { this.declareProp("summary", { type: "text", storedAs: "extract", declaredAt: { path: "/Wikipedia.api.spell", start: 1789, end: 1831 } }) }
  get summary() { return this.getProp("summary") }
  set summary(value) { this.setProp("summary", value) }

  // - its "extract html" is text
  static { this.declareProp("extractHtml", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1843, end: 1872 } }) }
  get extractHtml() { return this.getProp("extractHtml") }
  set extractHtml(value) { this.setProp("extractHtml", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1877, end: 1899 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("fits", { declaredAt: { path: "/StarWars.spell", start: 7434, end: 7603 }, readsFrom: ["wikipedia"] }) }
  get fits() {
    if (core.includes(this.title, "List of")) return false
    return core.includes(this.about, "star wars") || core.includes(this.about, "fictional") || core.includes(this.about, " film ")
  }

  static savedIn = {
    place: "wikipedia",
    collection: "wiki_pages",
    times: ["created", "modified"], select: ["kind", "thumbnail", "about", "contentUrls", "summary", "title"] }

  // - it lives in wikipedia
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/Wikipedia.api.spell", start: 1120, end: 1141 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in wikipedia
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/Wikipedia.api.spell", start: 1120, end: 1141 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Namespace extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "text" is text
  static { this.declareProp("text", { type: "text" }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }
}

export class Title extends Thing {
  // - its "canonical" is text
  static { this.declareProp("canonical", { type: "text" }) }
  get canonical() { return this.getProp("canonical") }
  set canonical(value) { this.setProp("canonical", value) }

  // - its "normalized" is text
  static { this.declareProp("normalized", { type: "text" }) }
  get normalized() { return this.getProp("normalized") }
  set normalized(value) { this.setProp("normalized", value) }

  // - its "display" is text
  static { this.declareProp("display", { type: "text" }) }
  get display() { return this.getProp("display") }
  set display(value) { this.setProp("display", value) }
}

export class Thumbnail extends Thing {
  /** an address */
  // - its "source" is text
  static { this.declareProp("source", { type: "text" }) }
  get source() { return this.getProp("source") }
  set source(value) { this.setProp("source", value) }

  // - its "width" is a number
  static { this.declareProp("width", { type: "number" }) }
  get width() { return this.getProp("width") }
  set width(value) { this.setProp("width", value) }

  // - its "height" is a number
  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }
}

export class Originalimage extends Thing {
  /** an address */
  // - its "source" is text
  static { this.declareProp("source", { type: "text" }) }
  get source() { return this.getProp("source") }
  set source(value) { this.setProp("source", value) }

  // - its "width" is a number
  static { this.declareProp("width", { type: "number" }) }
  get width() { return this.getProp("width") }
  set width(value) { this.setProp("width", value) }

  // - its "height" is a number
  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }
}

export class ContentUrl extends Thing {
  // - its "desktop" is a desktop
  static { this.declareProp("desktop", { type: "Desktop" }) }
  get desktop() { return this.getProp("desktop") }
  set desktop(value) { this.setProp("desktop", value) }

  // - its "mobile" is a mobile
  static { this.declareProp("mobile", { type: "Mobile" }) }
  get mobile() { return this.getProp("mobile") }
  set mobile(value) { this.setProp("mobile", value) }
}

export class Desktop extends Thing {
  /** an address */
  // - its "page" is text
  static { this.declareProp("page", { type: "text" }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  /** an address */
  // - its "revisions" is text
  static { this.declareProp("revisions", { type: "text" }) }
  get revisions() { return this.getProp("revisions") }
  set revisions(value) { this.setProp("revisions", value) }

  /** an address */
  // - its "edit" is text
  static { this.declareProp("edit", { type: "text" }) }
  get edit() { return this.getProp("edit") }
  set edit(value) { this.setProp("edit", value) }

  /** an address */
  // - its "talk" is text
  static { this.declareProp("talk", { type: "text" }) }
  get talk() { return this.getProp("talk") }
  set talk(value) { this.setProp("talk", value) }
}

export class Mobile extends Thing {
  /** an address */
  // - its "page" is text
  static { this.declareProp("page", { type: "text" }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  /** an address */
  // - its "revisions" is text
  static { this.declareProp("revisions", { type: "text" }) }
  get revisions() { return this.getProp("revisions") }
  set revisions(value) { this.setProp("revisions", value) }

  /** an address */
  // - its "edit" is text
  static { this.declareProp("edit", { type: "text" }) }
  get edit() { return this.getProp("edit") }
  set edit(value) { this.setProp("edit", value) }

  /** an address */
  // - its "talk" is text
  static { this.declareProp("talk", { type: "text" }) }
  get talk() { return this.getProp("talk") }
  set talk(value) { this.setProp("talk", value) }
}

export class Wikipedia extends Place {}
export const wikipedia = core.place(new Wikipedia(), {
  name: "wikipedia",
  kind: "web server",
  at: "https://en.wikipedia.org/api/rest_v1",
  idColumn: "title",
  checkedEvery: 86400,
  namesLike: "wikibase_item",
  collections: { wikiPages: { at: "/page/summary/{id}" } }
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
  static { this.declareProp("species", { type: "Species", link: true }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  draw() {
    return h("ui-card", {
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
        appearance: "transparent",
        icon: "arrow left",
        onClick: core.pressed(this, () => guide.goBack()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Back"),
      h("ui-stack", { class: "hero", direction: "horizontal", wrap: true, align: "start" },
        h("slot", { name: "portrait" }, () => this.drawPortrait()),
        h("ui-stack", { class: "about" },
          h("ui-header", { class: "title", font: "all-caps" }, () => this.label),
          h("ui-text", { color: "grey" }, () => this.kind),
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

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spell", start: 7683, end: 7734 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  draw() {
    return core.drawRead(() => h("slot", { name: "words" }, () => this.drawWords()), undefined, { waiting: () => h("ui-text", { color: "grey" }, "Asking Wikipedia"), failed: () => h("ui-text", { color: "grey" }, "Wikipedia can't be reached just now.") })
  }

  static drawsWaiting = true
  drawWords() {
    if (this.page && this.page.fits) {
      return h("ui-text", { paragraph: true, part: "words" },
        () => core.whileWaiting(() => this.page?.summary),
        h("ui-link", { link: () => this.page?.contentUrls?.desktop?.page, target: "_blank" },
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

  static { this.declareProp("shown", { declaredAt: { path: "/StarWars.spell", start: 8893, end: 8951 }, readsFrom: ["star_wars"] }) }
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
        h("ui-header", { class: "section", size: "small", font: "all-caps" }, () => this.heading),
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

  // - its "length" is a length in m
  static { this.declareProp("length", { type: "number" }) }
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
    known.append(new Fact({ label: "Length", value: `${core.measureShown(this.length, "Length", "meter")}` }))
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
  static { this.declareProp("playing", { type: "Film", link: true }) }
  get playing() { return core.linked(this, "playing", Film) }
  set playing(value) { this.setProp("playing", value) }

  // - its "jumping" is yes or no
  static { this.declareProp("jumping", { type: "choice" }) }
  get jumping() { return this.getProp("jumping") }
  set jumping(value) { this.setProp("jumping", value) }

  /** Whatever's found:  the film, character, planet, ship or anything else with that in its name */
  static { this.declareProp("found", { declaredAt: { path: "/StarWars.spell", start: 641, end: 1434 }, readsFrom: ["star_wars"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const matches = new List({ instanceType: "Thing" })
    core.map(core.filter(await core.savedThings(Film, { search: { title: this.search } }, "looks through"), (film) => core.includes(film.title, this.search)), (film) => matches.append(film))
    core.map(core.filter(await core.savedThings(Character, { search: { name: this.search } }, "looks through"), (character) => core.includes(character.name, this.search)), (character) => matches.append(character))
    core.map(core.filter(await core.savedThings(Planet, { search: { name: this.search } }, "looks through"), (planet) => core.includes(planet.name, this.search)), (planet) => matches.append(planet))
    core.map(core.filter(await core.savedThings(Starship, { search: { name: this.search } }, "looks through"), (starship) => core.includes(starship.name, this.search)), (starship) => matches.append(starship))
    core.map(core.filter(await core.savedThings(Vehicle, { search: { name: this.search } }, "looks through"), (vehicle) => core.includes(vehicle.name, this.search)), (vehicle) => matches.append(vehicle))
    core.map(core.filter(await core.savedThings(Species, { search: { name: this.search } }, "looks through"), (species) => core.includes(species.name, this.search)), (one) => matches.append(one))
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

  static drawsWaiting = true
  draw() {
    return [
      this.jumping ? core.drawThing(new Jump()) : undefined,
      h("ui-stack", { direction: "horizontal", wrap: true, align: "end", justify: "between" },
        h("ui-button", {
          class: "logo",
          appearance: "transparent",
          font: "all-caps",
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
          font: "all-caps",
          onClick: core.pressed(this, async () => await this.punch()),
          title: "Jump to light speed, and land on someone",
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Punch it")
      ),
      h("ui-toolbar", { appearance: "secondary pointing", "aria-label": "Browse" },
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
      h("ui-text", { paragraph: true, size: "small" },
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
            font: "all-caps",
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
core.installStyles(undefined, `/* File styles.css:  only the look no \`ui-*\` attribute gives:  deep space, the title's yellow, the opening and the jump.¬   - \`color-scheme: dark\` here is what turns the Spell UI elements dark too.¬   - Every animation is under "no preference" for motion:  with reduced motion the stars hold still,¬     and the opening is a page you read at your own speed. */¬¬star-wars-app {¬  --yellow: #ffe81f;¬  --space: #05060f;¬  --ui-primary: var(--yellow);¬  --ui-text-color: #eef1ff;¬  --ui-card-background: rgb(255 255 255 / 6%);¬  --ui-card-border-color: rgb(255 255 255 / 14%);¬  --ui-card-hover-border-color: var(--yellow);¬  --ui-card-margin-block: 0;¬  --title: 900 1em / 1.1 "Arial Black", Impact, sans-serif;¬¬  color-scheme: dark;¬  position: relative;¬  isolation: isolate;¬  display: block;¬  min-height: 100vh;¬  overflow: clip;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: var(--space) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='310' height='270'%3E%3Cg fill='%23dfe6ff'%3E%3Ccircle cx='20' cy='30' r='.7'/%3E%3Ccircle cx='140' cy='80' r='.6'/%3E%3Ccircle cx='240' cy='180' r='.9'/%3E%3Ccircle cx='70' cy='210' r='.6'/%3E%3Ccircle cx='290' cy='40' r='1'/%3E%3C/g%3E%3C/svg%3E");¬}¬¬star-wars-app ui-text::part(text) {¬  color: #eef1ff;¬}¬¬.logo::part(button),¬.punch::part(button),¬.play-opening::part(button) {¬  font: var(--title);¬}¬¬.logo::part(button) {¬  padding: 0;¬  background: none;¬  color: var(--yellow);¬  font-size: 1.9em;¬}¬¬.punch::part(button),¬.play-opening::part(button) {¬  background: var(--yellow);¬  color: var(--space);¬}¬¬.opening .play-opening::part(button) {¬  padding: 0.7em 1.6em;¬  font-size: clamp(1.2em, 3.4vw, 1.9em);¬}¬¬.find {¬  flex: 1 1 14em;¬  max-width: 28em;¬}¬¬/* the opening's button, the first thing on the Films tab */¬.opening::part(segment) {¬  --ui-segment-background: radial-gradient(ellipse at 50% 120%, #1c2a6b, var(--space) 70%);¬¬  padding: clamp(1.5em, 6vw, 3.5em) 1em;¬  display: grid;¬  justify-items: center;¬  gap: 1em;¬}¬¬star-wars-app .long-ago::part(text) {¬  color: #4bd5ee;¬}¬¬.section::part(header) {¬  margin-block-start: 1em;¬  color: var(--yellow);¬}¬¬.title::part(header) {¬  color: var(--yellow);¬  font: var(--title);¬  font-size: clamp(1.6em, 5vw, 2.8em);¬}¬¬.facts {¬  max-width: 30em;¬}¬¬/****************¬ * A picture:  a picture over an initial on a colour, so nothing's ever a broken image.  A world is a world.¬ ****************/¬¬.portrait::part(segment) {¬  position: relative;¬  display: grid;¬  place-items: center;¬  margin: 0;¬  padding: 0;¬  aspect-ratio: 4 / 3;¬  overflow: hidden;¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 70% 58%), hsl(var(--hue) 60% 18%));¬}¬¬.portrait.world::part(segment) {¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 75% 62%), hsl(var(--hue) 60% 14%) 60%, transparent 61%);¬}¬¬.initial::part(header) {¬  font: var(--title);¬  font-size: 3.4em;¬}¬¬.portrait ui-image::part(image) {¬  position: absolute;¬  inset: 0;¬  width: 100%;¬  height: 100%;¬}¬¬.hero .portrait::part(segment) {¬  width: min(22em, 100%);¬}¬¬.about {¬  flex: 1 1 20em;¬}¬¬/****************¬ * The jump to light speed, as the films show it:¬ *   the stars still, a beat;  each stays where it is and stretches straight out from the middle of the view,¬ *   slowly then all at once, thin near the middle and bright at the edges;  a white flash;¬ *   the mottled blue tunnel;  a sudden stop.¬ ****************/¬¬.jump::part(segment) {¬  position: fixed;¬  inset: 0;¬  z-index: 5;¬  margin: 0;¬  overflow: hidden;¬  background: var(--space);¬  pointer-events: none;¬}¬¬.streak {¬  --angle: calc(var(--n) * 137.508deg);¬  --distance: mod(calc(var(--n) * var(--n) * 0.7549), 100);¬  --place: rotate(var(--angle)) translateX(calc(var(--distance) * 0.75vmax));¬¬  position: absolute;¬  top: 50%;¬  left: 50%;¬  inline-size: 3px;¬  block-size: calc(1px + var(--distance) * 0.03px);¬  border-radius: 50%;¬  background: linear-gradient(90deg, rgb(120 160 255 / 0%), #bcd4ff 35%, #fff);¬  opacity: calc(0.55 + var(--distance) / 200);¬  transform-origin: 0 50%;¬  transform: var(--place);¬}¬¬.jump-tunnel,¬.jump-flash {¬  position: absolute;¬  inset-block: -30%;¬  inset-inline: -30%;¬  inline-size: auto;¬  block-size: auto;¬  opacity: 0;¬}¬¬.jump-flash {¬  background: #fff;¬}¬¬/* mottled:  layers whose streaks repeat at different lengths, so they never line up;  dark at the middle, as the film's is */¬.jump-tunnel {¬  background:¬    radial-gradient(circle, #041033 0 5%, rgb(4 16 51 / 0%) 22%),¬    repeating-conic-gradient(from 11deg, rgb(205 225 255 / 0%) 0 3.7deg, rgb(205 225 255 / 55%) 4.1deg, rgb(205 225 255 / 0%) 4.6deg 11.3deg),¬    repeating-conic-gradient(from 3deg, rgb(96 150 255 / 0%) 0 1.9deg, rgb(96 150 255 / 60%) 3.1deg, rgb(96 150 255 / 0%) 4.3deg 7.9deg),¬    repeating-conic-gradient(from 29deg, #0a2470 0 6.1deg, #143a9e 8.3deg, #0c2a80 10.7deg 13.1deg, #1b49b8 15.2deg, #0a2470 17.3deg);¬  filter: blur(2.5px);¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .streak {¬    animation: stretch 1050ms cubic-bezier(0.75, 0, 1, 0.55) 300ms both;¬  }¬¬  .jump-flash {¬    animation: flash 300ms linear 1250ms forwards;¬  }¬¬  .jump-tunnel {¬    animation: tunnel 1050ms linear 1400ms forwards;¬  }¬}¬¬@keyframes stretch {¬  to {¬    transform: var(--place) scaleX(calc(var(--distance) * 8));¬  }¬}¬¬@keyframes flash {¬  40% {¬    opacity: 1;¬  }¬}¬¬@keyframes tunnel {¬  0%,¬  98% {¬    opacity: 1;¬  }¬  to {¬    scale: 1.8;¬    rotate: 14deg;¬    opacity: 0;¬  }¬}¬¬/****************¬ * The opening:  yellow words going away, over deep space.  A modal the whole window high, so it's a cinema, and Escape ends it.¬ ****************/¬¬.crawl {¬  color-scheme: dark;¬  --yellow: #ffe81f;¬}¬¬.crawl::part(modal) {¬  overflow: hidden;¬  padding: 0;¬  background: #05060f;¬}¬¬.crawl .long-ago::part(text) {¬  position: absolute;¬  inset: 38% 0 auto;¬  text-align: center;¬  opacity: 0;¬}¬¬.stop {¬  position: absolute;¬  inset: 1em 1em auto auto;¬  z-index: 1;¬}¬¬.stage::part(segment) {¬  position: absolute;¬  inset: 0;¬  margin: 0;¬  perspective: 340px;¬  perspective-origin: 50% 40%;¬}¬¬.words::part(segment) {¬  position: absolute;¬  inset: auto 0 0;¬  margin-inline: auto;¬  width: min(88%, 30em);¬  color: var(--yellow);¬  font: 700 clamp(1.3em, 3.2vw, 2.8em) / 1.45 "Arial Narrow", Arial, sans-serif;¬  transform-origin: 50% 100%;¬  transform: rotateX(24deg);¬}¬¬.episode::part(header),¬.crawl-title::part(header) {¬  color: var(--yellow);¬  font: inherit;¬  text-align: center;¬}¬¬/* its lines are the film's own */¬star-wars-app .crawl-text::part(text) {¬  color: var(--yellow);¬  font: inherit;¬  white-space: pre-line;¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .crawl .long-ago::part(text) {¬    animation: long-ago 5s ease-in-out both;¬  }¬¬  .words::part(segment) {¬    animation: crawl 70s linear 5s both;¬  }¬}¬¬/* with reduced motion:  no tilt, no movement, the whole of it to read */¬@media (prefers-reduced-motion: reduce) {¬  .crawl .long-ago::part(text),¬  .stage::part(segment),¬  .words::part(segment) {¬    position: static;¬    opacity: 1;¬    transform: none;¬  }¬¬  .crawl::part(modal) {¬    overflow: auto;¬  }¬}¬¬@keyframes long-ago {¬  20%,¬  80% {¬    opacity: 1;¬  }¬}¬¬@keyframes crawl {¬  from {¬    transform: rotateX(24deg) translateY(100%);¬  }¬  to {¬    transform: rotateX(24deg) translateY(-160%) translateZ(-900px);¬  }¬}¬`)
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
  static { this.declareProp("species", { type: "Species", link: true }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  static { this.declareProp("page", { declaredAt: { path: "/StarWarsPortrait.spell", start: 445, end: 496 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  get initial() {
    return core.getItemAt(this.name, 0)
  }

  static { this.declareProp("picture", { declaredAt: { path: "/StarWarsPortrait.spell", start: 570, end: 749 }, readsFrom: ["wikipedia", "star_wars"] }) }
  get picture() { return core.waitedValue(this, "picture", async () => {
    if ((await core.answerOf(this, "page")) && (await core.answerOf(this, "page"))?.fits && (await core.answerOf(this, "page"))?.thumbnail) return (await core.answerOf(this, "page"))?.thumbnail?.source
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
    if (this.picture !== "") return h("ui-image", { src: () => this.picture, alt: "", crop: "top", part: "photo" })

    core.readRider("waiting", () => h("ui-space", { part: "photo" }))
    core.readRider("failed", () => h("ui-space", { part: "photo" }))
  }
}
