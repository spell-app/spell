import { core, Thing, List, App, Place, prop, derived, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1381, end: 1402 } })
  accessor name!: string

  // - its "height" is a length in cm or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1419, end: 1462 } })
  accessor height!: number

  // - its "mass" is a weight in kg or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 1467, end: 1508 } })
  accessor mass!: number

  // - its "hair color" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1520, end: 1547 } })
  accessor hairColor!: string

  // - its "skin color" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1552, end: 1579 } })
  accessor skinColor!: string

  // - its "eye color" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1584, end: 1610 } })
  accessor eyeColor!: string

  // - its "birth year" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1615, end: 1642 } })
  accessor birthYear!: string

  // - its "gender" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 1647, end: 1670 } })
  accessor gender!: string

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.api.spell", start: 1675, end: 1709 } }) }
  get homeworld(): Planet { return core.linked(this, "homeworld", Planet) as Planet }
  set homeworld(value: Planet) { this.setProp("homeworld", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 1715, end: 1748 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List<Species>({ instanceType: "Species" }), declaredAt: { path: "/StarWars.api.spell", start: 1753, end: 1790 } }) }
  get species(): List<Species> { return core.linked(this, "species", Species) as List<Species> }
  set species(value: List<Species>) { this.setProp("species", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List<Vehicle>({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.api.spell", start: 1795, end: 1834 } }) }
  get vehicles(): List<Vehicle> { return core.linked(this, "vehicles", Vehicle) as List<Vehicle> }
  set vehicles(value: List<Vehicle>) { this.setProp("vehicles", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List<Starship>({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.api.spell", start: 1839, end: 1880 } }) }
  get starships(): List<Starship> { return core.linked(this, "starships", Starship) as List<Starship> }
  set starships(value: List<Starship>) { this.setProp("starships", value) }

  // - its "created" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1885, end: 1915 } })
  accessor created!: Date

  // - its "edited" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1921, end: 1950 } })
  accessor edited!: Date

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

  @drawn draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 11221, end: 11648 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
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
      core.drawRead(() => <slot name="links">{this.drawLinks()}</slot>, undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

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
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 1348, end: 1369 } })
  accessor modified!: any /* spell: type unknown */
}

export class Planet extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2040, end: 2061 } })
  accessor name!: string

  // - its "rotation period" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2078, end: 2124 } })
  accessor rotationPeriod!: number

  // - its "orbital period" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2129, end: 2174 } })
  accessor orbitalPeriod!: number

  // - its "diameter" is a length in km
  @prop({ type: "number", declaredAt: { path: "/StarWars.api.spell", start: 2179, end: 2211 } })
  accessor diameter!: number

  // - its "climate" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2223, end: 2247 } })
  accessor climate!: string

  // - its "gravity" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2252, end: 2276 } })
  accessor gravity!: string

  // - its "terrain" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2281, end: 2305 } })
  accessor terrain!: string

  // - its "surface water" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2322, end: 2366 } })
  accessor surfaceWater!: number

  // - its "population" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 2371, end: 2412 } })
  accessor population!: number

  // - its "residents" is a list of characters
  static { this.declareProp("residents", { itemType: "Character", init: () => new List<Character>({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 2424, end: 2466 } }) }
  get residents(): List<Character> { return core.linked(this, "residents", Character) as List<Character> }
  set residents(value: List<Character>) { this.setProp("residents", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 2471, end: 2504 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  // - its "created" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2509, end: 2539 } })
  accessor created!: Date

  // - its "edited" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2545, end: 2574 } })
  accessor edited!: Date

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

  @drawn draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 12866, end: 13447 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
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
      core.drawRead(() => <slot name="links">{this.drawLinks()}</slot>, undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

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
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2007, end: 2028 } })
  accessor modified!: any /* spell: type unknown */
}

export class Film extends Thing {
  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2662, end: 2684 } })
  accessor title!: string

  // - its "episode id" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.api.spell", start: 2689, end: 2724 } })
  accessor episodeId!: number

  // - its "opening crawl" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2730, end: 2760 } })
  accessor openingCrawl!: string

  // - its "director" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2765, end: 2790 } })
  accessor director!: string

  // - its "producer" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 2795, end: 2820 } })
  accessor producer!: string

  // - its "release date" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2825, end: 2860 } })
  accessor releaseDate!: Date

  // - its "characters" is a list of characters
  static { this.declareProp("characters", { itemType: "Character", init: () => new List<Character>({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 2866, end: 2909 } }) }
  get characters(): List<Character> { return core.linked(this, "characters", Character) as List<Character> }
  set characters(value: List<Character>) { this.setProp("characters", value) }

  // - its "planets" is a list of planets
  static { this.declareProp("planets", { itemType: "Planet", init: () => new List<Planet>({ instanceType: "Planet" }), declaredAt: { path: "/StarWars.api.spell", start: 2914, end: 2951 } }) }
  get planets(): List<Planet> { return core.linked(this, "planets", Planet) as List<Planet> }
  set planets(value: List<Planet>) { this.setProp("planets", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List<Starship>({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.api.spell", start: 2956, end: 2997 } }) }
  get starships(): List<Starship> { return core.linked(this, "starships", Starship) as List<Starship> }
  set starships(value: List<Starship>) { this.setProp("starships", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List<Vehicle>({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.api.spell", start: 3002, end: 3041 } }) }
  get vehicles(): List<Vehicle> { return core.linked(this, "vehicles", Vehicle) as List<Vehicle> }
  set vehicles(value: List<Vehicle>) { this.setProp("vehicles", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List<Species>({ instanceType: "Species" }), declaredAt: { path: "/StarWars.api.spell", start: 3046, end: 3083 } }) }
  get species(): List<Species> { return core.linked(this, "species", Species) as List<Species> }
  set species(value: List<Species>) { this.setProp("species", value) }

  // - its "created" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3088, end: 3118 } })
  accessor created!: Date

  // - its "edited" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3124, end: 3153 } })
  accessor edited!: Date

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

  @drawn draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 9887, end: 10186 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
    known.append(new Fact({ label: "Directed by", value: this.director }))
    known.append(new Fact({ label: "Produced by", value: this.producer }))
    known.append(new Fact({ label: "Released", date: this.releaseDate }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      <ui-button class="play-opening" font="all-caps" onClick={core.pressed(this, async () => await this.play())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" part="page">
        Play the opening
      </ui-button>,
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawRead(() => <slot name="links">{this.drawLinks()}</slot>, undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

  drawLinks() {
    return [
      core.drawThing(new Section({ heading: "Who's in it", things: this.characters })),
      core.drawThing(new Section({ heading: "Where it happens", things: this.planets })),
      core.drawThing(new Section({ heading: "What they fly", things: this.starships }))
    ]
  }

  drawCrawl() {
    return (
      <ui-modal class="crawl" visible={true} overlay={true} fullscreen={true} on-ui-closed={async () => await this.end()} aria-label={`The opening of ${this.title}`} part="crawl">
        <ui-text class="long-ago" size="big">A long time ago in a galaxy far, far away....</ui-text>
        <ui-segment class="stage" appearance="basic">
          <ui-segment class="words" appearance="basic">
            <ui-header class="episode" font="all-caps">Episode {this.episodeId}</ui-header>
            <ui-header class="crawl-title" font="all-caps">{this.title}</ui-header>
            <ui-text class="crawl-text" paragraph={true}>{this.openingCrawl}</ui-text>
          </ui-segment>
        </ui-segment>
        <ui-button class="stop" onClick={core.pressed(this, async () => await this.end())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Stop
        </ui-button>
      </ui-modal>
    )
  }

  static savedIn = {
    place: "star_wars",
    collection: "films",
    times: ["modified"], select: ["title", "episodeId", "openingCrawl", "director", "producer", "releaseDate", "characters", "planets", "starships", "vehicles", "species"] }

  // - it lives in star wars
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 2629, end: 2650 } })
  accessor modified!: any /* spell: type unknown */
}

export class Species extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3244, end: 3265 } })
  accessor name!: string

  // - its "classification" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3270, end: 3301 } })
  accessor classification!: string

  // - its "designation" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3306, end: 3334 } })
  accessor designation!: string

  // - its "average height" is a number or "n/a" or "unknown"
  @prop({ type: "number", nothingAs: ["n/a", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3351, end: 3405 } })
  accessor averageHeight!: number

  // - its "skin colors" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3417, end: 3445 } })
  accessor skinColors!: string

  // - its "hair colors" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3450, end: 3478 } })
  accessor hairColors!: string

  // - its "eye colors" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3483, end: 3510 } })
  accessor eyeColors!: string

  // - its "average lifespan" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3515, end: 3548 } })
  accessor averageLifespan!: string

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.api.spell", start: 3553, end: 3587 } }) }
  get homeworld(): Planet { return core.linked(this, "homeworld", Planet) as Planet }
  set homeworld(value: Planet) { this.setProp("homeworld", value) }

  // - its "language" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3593, end: 3618 } })
  accessor language!: string

  // - its "people" is a list of characters
  static { this.declareProp("people", { itemType: "Character", init: () => new List<Character>({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 3623, end: 3662 } }) }
  get people(): List<Character> { return core.linked(this, "people", Character) as List<Character> }
  set people(value: List<Character>) { this.setProp("people", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 3667, end: 3700 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  // - its "created" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3705, end: 3735 } })
  accessor created!: Date

  // - its "edited" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3741, end: 3770 } })
  accessor edited!: Date

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
    let found: string = ""
    await core.forEachSequential(await core.answerOf(this, "people"), async (character: Character) => {
      if (found === "") found = await core.answerOf(character, "picture")
    })
    return found
  }) }

  @drawn draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { declaredAt: { path: "/StarWars.spell", start: 16992, end: 17217 }, readsFrom: ["star_wars"] }) }
  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
    known.append(new Fact({ label: "Language", value: this.language }))
    known.append(new Fact({ label: "Lives for", value: this.averageLifespan }))
    return known
  }

  drawPage() {
    return [
      this.card.drawTop(),
      core.drawThing(new FactTable({ facts: this.facts })),
      core.drawRead(() => <slot name="links">{this.drawLinks()}</slot>, undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

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
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3211, end: 3232 } })
  accessor modified!: any /* spell: type unknown */
}

export class Vehicle extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3861, end: 3882 } })
  accessor name!: string

  // - its "model" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3887, end: 3909 } })
  accessor model!: string

  // - its "manufacturer" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 3914, end: 3943 } })
  accessor manufacturer!: string

  // - its "cost in credits" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 3960, end: 4006 } })
  accessor costInCredits!: number

  // - its "length" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4018, end: 4049 } })
  accessor length!: number

  // - its "max atmosphering speed" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4055, end: 4102 } })
  accessor maxAtmospheringSpeed!: number

  // - its "crew" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4108, end: 4137 } })
  accessor crew!: number

  // - its "passengers" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4143, end: 4178 } })
  accessor passengers!: number

  // - its "cargo capacity" is a number or "none" or "unknown"
  @prop({ type: "number", nothingAs: ["none", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4196, end: 4251 } })
  accessor cargoCapacity!: number

  // - its "consumables" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4263, end: 4291 } })
  accessor consumables!: string

  // - its "vehicle class" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4296, end: 4326 } })
  accessor vehicleClass!: string

  // - its "pilots" is a list of characters
  static { this.declareProp("pilots", { itemType: "Character", init: () => new List<Character>({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 4331, end: 4370 } }) }
  get pilots(): List<Character> { return core.linked(this, "pilots", Character) as List<Character> }
  set pilots(value: List<Character>) { this.setProp("pilots", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 4375, end: 4408 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  // - its "created" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4413, end: 4443 } })
  accessor created!: Date

  // - its "edited" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4449, end: 4478 } })
  accessor edited!: Date

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 15785, end: 15874 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.vehicleClass,
      subject: this
    })
  }

  @drawn draw() {
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
      core.drawRead(() => <slot name="links">{this.drawLinks()}</slot>, undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

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
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 3828, end: 3849 } })
  accessor modified!: any /* spell: type unknown */
}

export class Starship extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4570, end: 4591 } })
  accessor name!: string

  // - its "model" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4596, end: 4618 } })
  accessor model!: string

  // - its "manufacturer" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4623, end: 4652 } })
  accessor manufacturer!: string

  // - its "cost in credits" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4669, end: 4715 } })
  accessor costInCredits!: number

  // - its "length" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.api.spell", start: 4727, end: 4758 } })
  accessor length!: number

  // - its "max atmosphering speed" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4764, end: 4803 } })
  accessor maxAtmospheringSpeed!: string

  // - its "crew" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4808, end: 4829 } })
  accessor crew!: string

  // - its "passengers" is a number or "n/a" or "unknown"
  @prop({ type: "number", nothingAs: ["n/a", "unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4846, end: 4896 } })
  accessor passengers!: number

  // - its "cargo capacity" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 4901, end: 4946 } })
  accessor cargoCapacity!: number

  // - its "consumables" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 4958, end: 4986 } })
  accessor consumables!: string

  // - its "hyperdrive rating" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 5003, end: 5051 } })
  accessor hyperdriveRating!: number

  // - its "mglt" is a number or "unknown"
  @prop({ type: "number", nothingAs: ["unknown"], declaredAt: { path: "/StarWars.api.spell", start: 5056, end: 5091 } })
  accessor mglt!: number

  // - its "starship class" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.api.spell", start: 5103, end: 5134 } })
  accessor starshipClass!: string

  // - its "pilots" is a list of characters
  static { this.declareProp("pilots", { itemType: "Character", init: () => new List<Character>({ instanceType: "Character" }), declaredAt: { path: "/StarWars.api.spell", start: 5139, end: 5178 } }) }
  get pilots(): List<Character> { return core.linked(this, "pilots", Character) as List<Character> }
  set pilots(value: List<Character>) { this.setProp("pilots", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/StarWars.api.spell", start: 5183, end: 5216 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  // - its "created" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 5221, end: 5251 } })
  accessor created!: Date

  // - its "edited" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 5257, end: 5286 } })
  accessor edited!: Date

  static { this.declareProp("card", { declaredAt: { path: "/StarWars.spell", start: 15124, end: 15214 }, readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.starshipClass,
      subject: this
    })
  }

  @drawn draw() {
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
      core.drawRead(() => <slot name="links">{this.drawLinks()}</slot>, undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">Following the links</ui-loader> })
    ]
  }

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
  @prop({ type: "date", declaredAt: { path: "/StarWars.api.spell", start: 4537, end: 4558 } })
  accessor modified!: any /* spell: type unknown */
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
  @prop({ type: "text", storedAs: "type", declaredAt: { path: "/Wikipedia.api.spell", start: 1146, end: 1182 } })
  accessor kind!: string

  // - its "displaytitle" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1194, end: 1223 } })
  accessor displaytitle!: string

  // - its "namespace" is a namespace
  @prop({ type: "Namespace", declaredAt: { path: "/Wikipedia.api.spell", start: 1228, end: 1265 } })
  accessor namespace!: Namespace

  // - its "wikibase item" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1271, end: 1301 } })
  accessor wikibaseItem!: string

  // - its "titles" is a title
  @prop({ type: "Title", declaredAt: { path: "/Wikipedia.api.spell", start: 1306, end: 1336 } })
  accessor titles!: Title

  // - its "pageid" is a number
  @prop({ type: "number", declaredAt: { path: "/Wikipedia.api.spell", start: 1342, end: 1373 } })
  accessor pageid!: number

  // - its "thumbnail" is a thumbnail
  @prop({ type: "Thumbnail", declaredAt: { path: "/Wikipedia.api.spell", start: 1379, end: 1416 } })
  accessor thumbnail!: Thumbnail

  // - its "originalimage" is an originalimage
  @prop({ type: "Originalimage", declaredAt: { path: "/Wikipedia.api.spell", start: 1422, end: 1467 } })
  accessor originalimage!: Originalimage

  // - its "lang" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1473, end: 1494 } })
  accessor lang!: string

  // - its "dir" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1499, end: 1519 } })
  accessor dir!: string

  // - its "revision" is a number
  @prop({ type: "number", declaredAt: { path: "/Wikipedia.api.spell", start: 1524, end: 1557 } })
  accessor revision!: number

  // - its "tid" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1563, end: 1583 } })
  accessor tid!: string

  // - its "timestamp" is a date
  @prop({ type: "date", declaredAt: { path: "/Wikipedia.api.spell", start: 1588, end: 1620 } })
  accessor timestamp!: Date

  // - its "about" is text, stored as "description"
  @prop({ type: "text", storedAs: "description", declaredAt: { path: "/Wikipedia.api.spell", start: 1638, end: 1682 } })
  accessor about!: string

  // - its "description source" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1694, end: 1729 } })
  accessor descriptionSource!: string

  // - its "content urls" is a content url
  @prop({ type: "ContentUrl", declaredAt: { path: "/Wikipedia.api.spell", start: 1734, end: 1772 } })
  accessor contentUrls!: ContentUrl

  // - its "summary" is text, stored as "extract"
  @prop({ type: "text", storedAs: "extract", declaredAt: { path: "/Wikipedia.api.spell", start: 1789, end: 1831 } })
  accessor summary!: string

  // - its "extract html" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1843, end: 1872 } })
  accessor extractHtml!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/Wikipedia.api.spell", start: 1877, end: 1899 } })
  accessor title!: string

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
  @prop({ type: "date", declaredAt: { path: "/Wikipedia.api.spell", start: 1120, end: 1141 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in wikipedia
  @prop({ type: "date", declaredAt: { path: "/Wikipedia.api.spell", start: 1120, end: 1141 } })
  accessor modified!: any /* spell: type unknown */
}

export class Namespace extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "text" is text
  @prop({ type: "text" })
  accessor text!: string
}

export class Title extends Thing {
  // - its "canonical" is text
  @prop({ type: "text" })
  accessor canonical!: string

  // - its "normalized" is text
  @prop({ type: "text" })
  accessor normalized!: string

  // - its "display" is text
  @prop({ type: "text" })
  accessor display!: string
}

export class Thumbnail extends Thing {
  /** an address */
  // - its "source" is text
  @prop({ type: "text" })
  accessor source!: string

  // - its "width" is a number
  @prop({ type: "number" })
  accessor width!: number

  // - its "height" is a number
  @prop({ type: "number" })
  accessor height!: number
}

export class Originalimage extends Thing {
  /** an address */
  // - its "source" is text
  @prop({ type: "text" })
  accessor source!: string

  // - its "width" is a number
  @prop({ type: "number" })
  accessor width!: number

  // - its "height" is a number
  @prop({ type: "number" })
  accessor height!: number
}

export class ContentUrl extends Thing {
  // - its "desktop" is a desktop
  @prop({ type: "Desktop" })
  accessor desktop!: Desktop

  // - its "mobile" is a mobile
  @prop({ type: "Mobile" })
  accessor mobile!: Mobile
}

export class Desktop extends Thing {
  /** an address */
  // - its "page" is text
  @prop({ type: "text" })
  accessor page!: string

  /** an address */
  // - its "revisions" is text
  @prop({ type: "text" })
  accessor revisions!: string

  /** an address */
  // - its "edit" is text
  @prop({ type: "text" })
  accessor edit!: string

  /** an address */
  // - its "talk" is text
  @prop({ type: "text" })
  accessor talk!: string
}

export class Mobile extends Thing {
  /** an address */
  // - its "page" is text
  @prop({ type: "text" })
  accessor page!: string

  /** an address */
  // - its "revisions" is text
  @prop({ type: "text" })
  accessor revisions!: string

  /** an address */
  // - its "edit" is text
  @prop({ type: "text" })
  accessor edit!: string

  /** an address */
  // - its "talk" is text
  @prop({ type: "text" })
  accessor talk!: string
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
  @prop() accessor label!: string

  // - it has a kind
  @prop() accessor kind!: string

  // - it has a shape
  @prop() accessor shape!: string

  /** What colour a picture's background is:  from its name, unless it says */
  // - it has a colour
  @prop() accessor colour!: number

  get hue() {
    if (this.colour !== undefined) return this.colour
    return this.label.length * 47
  }

  // - its "subject" is a thing
  @prop({ type: "Thing" })
  accessor subject!: Thing

  // - its "species" is a species
  static { this.declareProp("species", { type: "Species", link: true }) }
  get species(): Species { return core.linked(this, "species", Species) as Species }
  set species(value: Species) { this.setProp("species", value) }

  @drawn draw() {
    return (
      <ui-card onClick={core.pressed(this, () => this.subject.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <slot name="portrait">{this.drawPortrait()}</slot>
        <ui-content>
          <ui-header>{this.label}</ui-header>
          <ui-meta>{this.kind}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  drawPortrait() {
    return core.drawThing(new Portrait({
      name: this.label,
      hue: this.hue,
      shape: this.shape,
      species: this.species
    }))
  }

  drawTop() {
    return (
      <>
        <ui-button appearance="transparent" icon="arrow left" onClick={core.pressed(this, () => guide.goBack())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Back
        </ui-button>
        <ui-stack class="hero" direction="horizontal" wrap={true} align="start">
          <slot name="portrait">{this.drawPortrait()}</slot>
          <ui-stack class="about">
            <ui-header class="title" font="all-caps">{this.label}</ui-header>
            <ui-text color="grey">{this.kind}</ui-text>
            {core.drawThing(new WikiNote({ name: this.label }))}
          </ui-stack>
        </ui-stack>
      </>
    )
  }
}

export class WikiNote extends Thing {
  // - it has a name
  @prop() accessor name!: string

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spell", start: 7683, end: 7734 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  @drawn draw() {
    return core.drawRead(() => <slot name="words">{this.drawWords()}</slot>, undefined, { waiting: () => <ui-text color="grey">Asking Wikipedia</ui-text>, failed: () => <ui-text color="grey">Wikipedia can't be reached just now.</ui-text> })
  }

  drawWords() {
    if (this.page && this.page.fits) {
      return (
        <ui-text paragraph={true} part="words">
          {core.whileWaiting(() => this.page?.summary)}
          <ui-link link={this.page?.contentUrls?.desktop?.page} target="_blank">Read the rest on Wikipedia</ui-link>
        </ui-text>
      )
    }
  }
}

export class Fact extends Thing {
  // - it has a label
  @prop() accessor label!: string

  // - it has a value
  @prop() accessor value!: any /* spell: type unknown */

  // - its "date" is a date
  @prop({ type: "date" })
  accessor date!: Date

  /** What a server writes when nothing's known isn't worth a row */
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

  static { this.declareProp("shown", { declaredAt: { path: "/StarWars.spell", start: 8893, end: 8951 }, readsFrom: ["star_wars"] }) }
  @derived get shown() {
    return core.filter(this.facts, (fact: Fact) => fact.isKnown)
  }

  @drawn draw() {
    if (!core.isEmpty(this.shown)) {
      return (
        <ui-table class="facts" appearance="very-basic" inverted={true} unstackable={true}>
          {core.drawItems(this.shown)}
        </ui-table>
      )
    }
  }
}

export class Section extends Thing {
  // - it has a heading
  @prop() accessor heading!: string

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
          <ui-header class="section" size="small" font="all-caps">{this.heading}</ui-header>
          <ui-cards columns="4" doubling={true}>{core.drawThing(this.single)}</ui-cards>
        </>
      )
    } else return core.drawRead(() => this.things, (thing: Thing) => core.drawThing(thing), { whole: () => <ui-section label={this.heading} hide-empty="" />, items: () => <ui-cards columns="4" doubling={true} /> })
  }
}

export class CraftPage extends Thing {
  // - it has a model
  @prop() accessor model!: any /* spell: type unknown */

  // - it has a maker
  @prop() accessor maker!: string

  // - its "length" is a length in m
  @prop({ type: "number" })
  accessor length!: number

  // - it has a crew
  @prop() accessor crew!: any /* spell: type unknown */

  // - it has a passengers
  @prop() accessor passengers!: any /* spell: type unknown */

  // - it has a cost
  @prop() accessor cost!: number

  /** How long it is, in something you can picture:  an X-wing is 12.5 metres */
  get xWingsLong() {
    if (this.length === undefined) return undefined
    return Math.round(this.length / 12.5)
  }

  get facts() {
    const known = new List<Fact>({ instanceType: "Fact" })
    known.append(new Fact({ label: "Model", value: this.model }))
    known.append(new Fact({ label: "Made by", value: this.maker }))
    known.append(new Fact({ label: "Length", value: `${core.measureShown(this.length, "Length", "meter")}` }))
    known.append(new Fact({ label: "As long as", value: measureAmountInUnit(this.xWingsLong, "X-wings") }))
    known.append(new Fact({ label: "Crew", value: this.crew }))
    known.append(new Fact({ label: "Passengers", value: measureAmountInUnit(this.passengers, "people") }))
    known.append(new Fact({ label: "Costs", value: measureAmountInUnit(this.cost, "credits") }))
    return known
  }

  @drawn draw() {
    return core.drawThing(new FactTable({ facts: this.facts }))
  }
}

@thing
export class Guide extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  @prop({ type: "text" })
  accessor tab!: string

  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  create() {
    this.tab = "films"
    this.search = ""
  }

  // - its "showing" is a thing
  @prop({ type: "Thing" })
  accessor showing!: Thing

  // - its "trail" is a new list of things
  @prop({ itemType: "Thing", init: () => new List<Thing>({ instanceType: "Thing" }) })
  accessor trail!: List<Thing>

  // - its "playing" is a film
  static { this.declareProp("playing", { type: "Film", link: true }) }
  get playing(): Film { return core.linked(this, "playing", Film) as Film }
  set playing(value: Film) { this.setProp("playing", value) }

  // - its "jumping" is yes or no
  @prop({ type: "choice" })
  accessor jumping!: boolean

  /** Whatever's found:  the film, character, planet, ship or anything else with that in its name */
  static { this.declareProp("found", { declaredAt: { path: "/StarWars.spell", start: 641, end: 1434 }, readsFrom: ["star_wars"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const matches = new List<Thing>({ instanceType: "Thing" })
    core.map(core.filter(await core.savedThings(Film, { search: { title: this.search } }, "looks through"), (film: Film) => core.includes(film.title, this.search)), (film: Film) => matches.append(film))
    core.map(core.filter(await core.savedThings(Character, { search: { name: this.search } }, "looks through"), (character: Character) => core.includes(character.name, this.search)), (character: Character) => matches.append(character))
    core.map(core.filter(await core.savedThings(Planet, { search: { name: this.search } }, "looks through"), (planet: Planet) => core.includes(planet.name, this.search)), (planet: Planet) => matches.append(planet))
    core.map(core.filter(await core.savedThings(Starship, { search: { name: this.search } }, "looks through"), (starship: Starship) => core.includes(starship.name, this.search)), (starship: Starship) => matches.append(starship))
    core.map(core.filter(await core.savedThings(Vehicle, { search: { name: this.search } }, "looks through"), (vehicle: Vehicle) => core.includes(vehicle.name, this.search)), (vehicle: Vehicle) => matches.append(vehicle))
    core.map(core.filter(await core.savedThings(Species, { search: { name: this.search } }, "looks through"), (species: Species) => core.includes(species.name, this.search)), (one: Species) => matches.append(one))
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

  goToWhere(where: string) {
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
    const landing = core.randomItemOf<Character>(await core.savedThings(Character))
    await core.pauseFor(2600, "msec")
    landing?.open()
    this.jumping = false
  }

  static drawsWaiting = true
  @drawn draw() {
    return [
      this.jumping ? core.drawThing(new Jump()) : undefined,
      <ui-stack direction="horizontal" wrap={true} align="end" justify="between">
        <ui-button class="logo" appearance="transparent" font="all-caps" onClick={core.pressed(this, () => this.goToWhere("films"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Star Wars
        </ui-button>
        <ui-form class="find" value={this}>
          <ui-field label="Search the galaxy">
            <ui-input name="search" icon="search" placeholder="Luke, Hoth, Falcon" />
          </ui-field>
        </ui-form>
        <ui-button class="punch" color="primary" font="all-caps" onClick={core.pressed(this, async () => await this.punch())} title="Jump to light speed, and land on someone" style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Punch it
        </ui-button>
      </ui-stack>,
      <ui-toolbar appearance="secondary pointing" aria-label="Browse">
        <ui-item active={this.tab === "films"} onClick={core.pressed(this, () => this.goToWhere("films"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Films
        </ui-item>
        <ui-item active={this.tab === "characters"} onClick={core.pressed(this, () => this.goToWhere("characters"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Characters
        </ui-item>
        <ui-item active={this.tab === "planets"} onClick={core.pressed(this, () => this.goToWhere("planets"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Planets
        </ui-item>
        <ui-item active={this.tab === "ships"} onClick={core.pressed(this, () => this.goToWhere("ships"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Ships
        </ui-item>
        <ui-item active={this.tab === "vehicles"} onClick={core.pressed(this, () => this.goToWhere("vehicles"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Vehicles
        </ui-item>
        <ui-item active={this.tab === "species"} onClick={core.pressed(this, () => this.goToWhere("species"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Species
        </ui-item>
      </ui-toolbar>,
      <slot name="shelf">{this.drawShelf()}</slot>,
      <ui-text paragraph={true} size="small">
        {"Films, characters, planets and ships from "}
        <ui-link link="https://swapi.py4e.com/">swapi.py4e.com</ui-link>
        {". Pictures and what they're of from "}
        <ui-link link="https://en.wikipedia.org/">Wikipedia</ui-link>
        , asked for as you look. Star Wars belongs to Lucasfilm and Disney.
      </ui-text>,
      this.playing ? this.playing.drawCrawl() : undefined
    ]
  }

  // Each tab's list says nothing of how long it is:  a long one draws what fits, and more as you scroll
  drawShelf() {
    if (this.showing && this.search === "") return this.showing.drawPage()
    else if (this.search !== "") {
      return [
        <ui-header size="medium" part="shelf">Searching for “{this.search}”</ui-header>,
        core.drawRead(() => this.found, (thing: Thing) => core.drawThing(thing), {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{this.signal}</ui-loader>,
          none: () => <ui-text part="shelf">{"Nobody and nothing by that name, in this galaxy."}</ui-text>,
          failedSay: () => this.lostSignal,
          items: () => <ui-cards columns="4" doubling={true} part="shelf" />
        })
      ]
    } else if (this.tab === "films") {
      return [
        <ui-segment class="opening" inverted={true} align="center" part="shelf">
          <ui-text class="long-ago" size="large">A long time ago in a galaxy far, far away....</ui-text>
          <ui-button class="play-opening" size="massive" font="all-caps" onClick={core.pressed(this, async () => await this.playTheOpening())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Play the opening
          </ui-button>
        </ui-segment>,
        core.drawRead(async () => await core.savedThings(Film, {}, "as drawn"), (film: Film) => core.drawThing(film), {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{this.signal}</ui-loader>,
          failedSay: () => this.lostSignal,
          items: () => <ui-cards columns="4" doubling={true} part="shelf" />
        })
      ]
    } else if (this.tab === "characters") {
      return core.drawRead(async () => await core.savedThings(Character, {}, "as drawn"), (character: Character) => core.drawThing(character), {
        waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{this.signal}</ui-loader>,
        failedSay: () => this.lostSignal,
        items: () => <ui-cards columns="4" doubling={true} part="shelf" />
      })
    } else if (this.tab === "planets") {
      return core.drawRead(async () => await core.savedThings(Planet, {}, "as drawn"), (planet: Planet) => core.drawThing(planet), {
        waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{this.signal}</ui-loader>,
        failedSay: () => this.lostSignal,
        items: () => <ui-cards columns="4" doubling={true} part="shelf" />
      })
    } else if (this.tab === "vehicles") {
      return core.drawRead(async () => await core.savedThings(Vehicle, {}, "as drawn"), (vehicle: Vehicle) => core.drawThing(vehicle), {
        waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{this.signal}</ui-loader>,
        failedSay: () => this.lostSignal,
        items: () => <ui-cards columns="4" doubling={true} part="shelf" />
      })
    } else if (this.tab === "species") {
      return core.drawRead(async () => await core.savedThings(Species, {}, "as drawn"), (species: Species) => core.drawThing(species), {
        waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{this.signal}</ui-loader>,
        failedSay: () => this.lostSignal,
        items: () => <ui-cards columns="4" doubling={true} part="shelf" />
      })
    } else {
      return core.drawRead(async () => await core.savedThings(Starship, {}, "as drawn"), (starship: Starship) => core.drawThing(starship), {
        waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{this.signal}</ui-loader>,
        failedSay: () => this.lostSignal,
        items: () => <ui-cards columns="4" doubling={true} part="shelf" />
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

/**
 * `<test-project-app>`:  a guide, drawn in its own element, e.g. by `draw the guide`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its guide's properties;  its methods call its guide's.
 * - What every view's element does, e.g. drawing its guide, is `SpellElement`'s.
 */
export class GuideElement extends SpellElement<Guide> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "guide", [
    { name: "tab", kind: "string", description: "Its tab." },
    { name: "search", kind: "string", description: "Its search." },
    { name: "showing", kind: "string", description: "Its showing." },
    { name: "trail", kind: "json", description: "Its trail." },
    { name: "playing", kind: "string", description: "Its playing." },
    { name: "jumping", kind: "boolean", description: "Its jumping." }
  ])

  create() {
    return this.currentThing?.create()
  }

  goBack() {
    return this.currentThing?.goBack()
  }

  goToWhere(where: string) {
    return this.currentThing?.goToWhere(where)
  }

  playTheOpening() {
    return this.currentThing?.playTheOpening()
  }

  punch() {
    return this.currentThing?.punch()
  }

  drawShelf() {
    return this.currentThing?.drawShelf()
  }
}
core.useElement(Guide, GuideElement)
export const guide = new Guide()

core.heading("What everything here can do")
/////////////////////////////////
// ## What everything here can do
/////////////////////////////////
// It's on `a thing`, not a base type of the program's own:  each type below is simply `a thing`.
// Spell has no mixins yet (epic `mixins`), and a thing here shares by HOLDING a card, and drawing it.

export interface Thing { open(): any /* spell: type unknown */ }
Thing.prototype.open = function (this: Thing) {
  if (guide.showing) core.append(guide.trail, guide.showing)
  guide.search = ""
  guide.showing = this
  core.scrollToTop()
}

/** A number for people to read:  with none, nothing, so its row doesn't show */
export function measureAmountInUnit(amount: number, unit: string) {
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
  @drawn draw() {
    return (
      <ui-segment class="jump" appearance="basic" aria-hidden="true">
        <ui-space class="jump-tunnel" />
        <slot name="stars">{this.drawStars()}</slot>
        <ui-space class="jump-flash" />
      </ui-segment>
    )
  }

  drawStars() {
    return core.drawEach(core.getRange(1, 240), (star) => <ui-space class="streak" style={`--n: ${star}`} part="stars" />)
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
  @prop() accessor name!: string

  // - it has a hue
  @prop() accessor hue!: any /* spell: type unknown */

  // - it has a shape
  @prop() accessor shape!: any /* spell: type unknown */

  // - its "species" is a species
  static { this.declareProp("species", { type: "Species", link: true }) }
  get species(): Species { return core.linked(this, "species", Species) as Species }
  set species(value: Species) { this.setProp("species", value) }

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

  @drawn draw() {
    return (
      <ui-segment class={`portrait ${this.shape}`} style={`--hue: ${this.hue}`} appearance="basic">
        <ui-header class="initial">{this.initial}</ui-header>
        <slot name="photo">{this.drawPhoto()}</slot>
      </ui-segment>
    )
  }

  // Waiting for it, or if Wikipedia can't be reached, the initial stays
  drawPhoto() {
    if (this.picture !== "") return <ui-image src={this.picture} alt="" crop="top" part="photo" />

    core.readRider("waiting", () => <ui-space part="photo" />)
    core.readRider("failed", () => <ui-space part="photo" />)
  }
}

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `GuideElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
