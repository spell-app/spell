import { core, Thing, List, App, Place, h } from "@spell/core"

export class Character extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("height", { type: "number", nothingAs: ["unknown"] }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  static { this.declareProp("mass", { type: "number", nothingAs: ["unknown"] }) }
  get mass() { return this.getProp("mass") }
  set mass(value) { this.setProp("mass", value) }

  static { this.declareProp("hairColor", { type: "text" }) }
  get hairColor() { return this.getProp("hairColor") }
  set hairColor(value) { this.setProp("hairColor", value) }

  static { this.declareProp("skinColor", { type: "text" }) }
  get skinColor() { return this.getProp("skinColor") }
  set skinColor(value) { this.setProp("skinColor", value) }

  static { this.declareProp("eyeColor", { type: "text" }) }
  get eyeColor() { return this.getProp("eyeColor") }
  set eyeColor(value) { this.setProp("eyeColor", value) }

  static { this.declareProp("birthYear", { type: "text" }) }
  get birthYear() { return this.getProp("birthYear") }
  set birthYear(value) { this.setProp("birthYear", value) }

  static { this.declareProp("gender", { type: "text" }) }
  get gender() { return this.getProp("gender") }
  set gender(value) { this.setProp("gender", value) }

  static { this.declareProp("homeworld", { type: "Planet", link: true }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }) }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("species", { itemType: "Species", init: () => new List({ instanceType: "Species" }) }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List({ instanceType: "Vehicle" }) }) }
  get vehicles() { return core.linked(this, "vehicles", Vehicle) }
  set vehicles(value) { this.setProp("vehicles", value) }

  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }) }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("edited", { type: "date" }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: `Born ${this.birthYear}`,
      subject: this
    })
  }

  static { this.declareProp("page", { readsFrom: ["wikipedia", "star_wars"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  static { this.declareProp("picture", { readsFrom: ["wikipedia", "star_wars"] }) }
  get picture() { return core.waitedValue(this, "picture", async () => {
    if ((await core.answerOf(this, "page")) && (await core.answerOf(this, "page"))?.fits && (await core.answerOf(this, "page"))?.thumbnail) return (await core.answerOf(this, "page"))?.thumbnail?.source
    return ""
  }) }

  draw() {
    return core.drawThing(this.card)
  }

  static { this.declareProp("facts", { readsFrom: ["star_wars"] }) }
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

  drawLinks() { return core.drawWaiting(() => {
    return [
      core.drawThing(new Section({ heading: "Home", single: this.homeworld })),
      core.drawThing(new Section({ heading: "Films", things: this.films })),
      core.drawThing(new Section({ heading: "What they are", things: this.species })),
      core.drawThing(new Section({ heading: "What they fly", things: this.starships })),
      core.drawThing(new Section({ heading: "What they drive", things: this.vehicles }))
    ]
  }) }

  static savedIn = {
    place: "star_wars",
    collection: "characters",
    times: ["modified"], select: ["name", "height", "mass", "hairColor", "eyeColor", "birthYear", "homeworld", "films", "species", "vehicles", "starships"] }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Planet extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("rotationPeriod", { type: "number", nothingAs: ["unknown"] }) }
  get rotationPeriod() { return this.getProp("rotationPeriod") }
  set rotationPeriod(value) { this.setProp("rotationPeriod", value) }

  static { this.declareProp("orbitalPeriod", { type: "number", nothingAs: ["unknown"] }) }
  get orbitalPeriod() { return this.getProp("orbitalPeriod") }
  set orbitalPeriod(value) { this.setProp("orbitalPeriod", value) }

  static { this.declareProp("diameter", { type: "number" }) }
  get diameter() { return this.getProp("diameter") }
  set diameter(value) { this.setProp("diameter", value) }

  static { this.declareProp("climate", { type: "text" }) }
  get climate() { return this.getProp("climate") }
  set climate(value) { this.setProp("climate", value) }

  static { this.declareProp("gravity", { type: "text" }) }
  get gravity() { return this.getProp("gravity") }
  set gravity(value) { this.setProp("gravity", value) }

  static { this.declareProp("terrain", { type: "text" }) }
  get terrain() { return this.getProp("terrain") }
  set terrain(value) { this.setProp("terrain", value) }

  static { this.declareProp("surfaceWater", { type: "number", nothingAs: ["unknown"] }) }
  get surfaceWater() { return this.getProp("surfaceWater") }
  set surfaceWater(value) { this.setProp("surfaceWater", value) }

  static { this.declareProp("population", { type: "number", nothingAs: ["unknown"] }) }
  get population() { return this.getProp("population") }
  set population(value) { this.setProp("population", value) }

  static { this.declareProp("residents", { itemType: "Character", init: () => new List({ instanceType: "Character" }) }) }
  get residents() { return core.linked(this, "residents", Character) }
  set residents(value) { this.setProp("residents", value) }

  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }) }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("edited", { type: "date" }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.climate,
      shape: "world",
      colour: this.hue,
      subject: this
    })
  }

  static { this.declareProp("hue", { readsFrom: ["star_wars"] }) }
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

  static { this.declareProp("facts", { readsFrom: ["star_wars"] }) }
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

  drawLinks() { return core.drawWaiting(() => {
    return [
      core.drawThing(new Section({ heading: "Who's from here", things: this.residents })),
      core.drawThing(new Section({ heading: "Seen in", things: this.films }))
    ]
  }) }

  static savedIn = {
    place: "star_wars",
    collection: "planets",
    times: ["modified"], select: ["name", "rotationPeriod", "orbitalPeriod", "diameter", "climate", "terrain", "population", "residents", "films"] }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Film extends Thing {
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("episodeId", { type: "number" }) }
  get episodeId() { return this.getProp("episodeId") }
  set episodeId(value) { this.setProp("episodeId", value) }

  static { this.declareProp("openingCrawl", { type: "text" }) }
  get openingCrawl() { return this.getProp("openingCrawl") }
  set openingCrawl(value) { this.setProp("openingCrawl", value) }

  static { this.declareProp("director", { type: "text" }) }
  get director() { return this.getProp("director") }
  set director(value) { this.setProp("director", value) }

  static { this.declareProp("producer", { type: "text" }) }
  get producer() { return this.getProp("producer") }
  set producer(value) { this.setProp("producer", value) }

  static { this.declareProp("releaseDate", { type: "date" }) }
  get releaseDate() { return this.getProp("releaseDate") }
  set releaseDate(value) { this.setProp("releaseDate", value) }

  static { this.declareProp("characters", { itemType: "Character", init: () => new List({ instanceType: "Character" }) }) }
  get characters() { return core.linked(this, "characters", Character) }
  set characters(value) { this.setProp("characters", value) }

  static { this.declareProp("planets", { itemType: "Planet", init: () => new List({ instanceType: "Planet" }) }) }
  get planets() { return core.linked(this, "planets", Planet) }
  set planets(value) { this.setProp("planets", value) }

  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }) }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List({ instanceType: "Vehicle" }) }) }
  get vehicles() { return core.linked(this, "vehicles", Vehicle) }
  set vehicles(value) { this.setProp("vehicles", value) }

  static { this.declareProp("species", { itemType: "Species", init: () => new List({ instanceType: "Species" }) }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("edited", { type: "date" }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { readsFrom: ["star_wars"] }) }
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

  static { this.declareProp("facts", { readsFrom: ["star_wars"] }) }
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

  drawLinks() { return core.drawWaiting(() => {
    return [
      core.drawThing(new Section({ heading: "Who's in it", things: this.characters })),
      core.drawThing(new Section({ heading: "Where it happens", things: this.planets })),
      core.drawThing(new Section({ heading: "What they fly", things: this.starships }))
    ]
  }) }

  drawCrawl() {
    return h("ui-modal", {
      class: "crawl",
      transparent: true,
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

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Film, "play", { title: "Play It", undoneAs: "Play It" })
core.describeAction(Film, "end", { title: "End It", undoneAs: "End It" })

export class Species extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("classification", { type: "text" }) }
  get classification() { return this.getProp("classification") }
  set classification(value) { this.setProp("classification", value) }

  static { this.declareProp("designation", { type: "text" }) }
  get designation() { return this.getProp("designation") }
  set designation(value) { this.setProp("designation", value) }

  static { this.declareProp("averageHeight", { type: "number", nothingAs: ["n/a", "unknown"] }) }
  get averageHeight() { return this.getProp("averageHeight") }
  set averageHeight(value) { this.setProp("averageHeight", value) }

  static { this.declareProp("skinColors", { type: "text" }) }
  get skinColors() { return this.getProp("skinColors") }
  set skinColors(value) { this.setProp("skinColors", value) }

  static { this.declareProp("hairColors", { type: "text" }) }
  get hairColors() { return this.getProp("hairColors") }
  set hairColors(value) { this.setProp("hairColors", value) }

  static { this.declareProp("eyeColors", { type: "text" }) }
  get eyeColors() { return this.getProp("eyeColors") }
  set eyeColors(value) { this.setProp("eyeColors", value) }

  static { this.declareProp("averageLifespan", { type: "text" }) }
  get averageLifespan() { return this.getProp("averageLifespan") }
  set averageLifespan(value) { this.setProp("averageLifespan", value) }

  static { this.declareProp("homeworld", { type: "Planet", link: true }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  static { this.declareProp("language", { type: "text" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  static { this.declareProp("people", { itemType: "Character", init: () => new List({ instanceType: "Character" }) }) }
  get people() { return core.linked(this, "people", Character) }
  set people(value) { this.setProp("people", value) }

  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }) }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("edited", { type: "date" }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { readsFrom: ["star_wars"] }) }
  get card() {
    return new Card({
      label: this.name,
      kind: this.classification,
      subject: this,
      species: this
    })
  }

  static { this.declareProp("picture", { readsFrom: ["star_wars", "wikipedia"] }) }
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

  static { this.declareProp("facts", { readsFrom: ["star_wars"] }) }
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

  drawLinks() { return core.drawWaiting(() => {
    return [
      core.drawThing(new Section({ heading: "Home", single: this.homeworld })),
      core.drawThing(new Section({ heading: "Who's one", things: this.people }))
    ]
  }) }

  static savedIn = {
    place: "star_wars",
    collection: "species",
    times: ["modified"], select: ["name", "classification", "averageLifespan", "homeworld", "language", "people", "films"] }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Vehicle extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("model", { type: "text" }) }
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  static { this.declareProp("manufacturer", { type: "text" }) }
  get manufacturer() { return this.getProp("manufacturer") }
  set manufacturer(value) { this.setProp("manufacturer", value) }

  static { this.declareProp("costInCredits", { type: "number", nothingAs: ["unknown"] }) }
  get costInCredits() { return this.getProp("costInCredits") }
  set costInCredits(value) { this.setProp("costInCredits", value) }

  static { this.declareProp("length", { type: "number" }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  static { this.declareProp("maxAtmospheringSpeed", { type: "number" }) }
  get maxAtmospheringSpeed() { return this.getProp("maxAtmospheringSpeed") }
  set maxAtmospheringSpeed(value) { this.setProp("maxAtmospheringSpeed", value) }

  static { this.declareProp("crew", { type: "number" }) }
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  static { this.declareProp("passengers", { type: "number" }) }
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  static { this.declareProp("cargoCapacity", { type: "number", nothingAs: ["none", "unknown"] }) }
  get cargoCapacity() { return this.getProp("cargoCapacity") }
  set cargoCapacity(value) { this.setProp("cargoCapacity", value) }

  static { this.declareProp("consumables", { type: "text" }) }
  get consumables() { return this.getProp("consumables") }
  set consumables(value) { this.setProp("consumables", value) }

  static { this.declareProp("vehicleClass", { type: "text" }) }
  get vehicleClass() { return this.getProp("vehicleClass") }
  set vehicleClass(value) { this.setProp("vehicleClass", value) }

  static { this.declareProp("pilots", { itemType: "Character", init: () => new List({ instanceType: "Character" }) }) }
  get pilots() { return core.linked(this, "pilots", Character) }
  set pilots(value) { this.setProp("pilots", value) }

  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }) }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("edited", { type: "date" }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { readsFrom: ["star_wars"] }) }
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

  drawLinks() { return core.drawWaiting(() => {
    return [
      core.drawThing(new Section({ heading: "Who flew it", things: this.pilots })),
      core.drawThing(new Section({ heading: "Seen in", things: this.films }))
    ]
  }) }

  static savedIn = {
    place: "star_wars",
    collection: "vehicles",
    times: ["modified"], select: ["name", "model", "manufacturer", "costInCredits", "length", "crew", "passengers", "vehicleClass", "pilots", "films"] }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Starship extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("model", { type: "text" }) }
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  static { this.declareProp("manufacturer", { type: "text" }) }
  get manufacturer() { return this.getProp("manufacturer") }
  set manufacturer(value) { this.setProp("manufacturer", value) }

  static { this.declareProp("costInCredits", { type: "number", nothingAs: ["unknown"] }) }
  get costInCredits() { return this.getProp("costInCredits") }
  set costInCredits(value) { this.setProp("costInCredits", value) }

  static { this.declareProp("length", { type: "number" }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  static { this.declareProp("maxAtmospheringSpeed", { type: "text" }) }
  get maxAtmospheringSpeed() { return this.getProp("maxAtmospheringSpeed") }
  set maxAtmospheringSpeed(value) { this.setProp("maxAtmospheringSpeed", value) }

  static { this.declareProp("crew", { type: "text" }) }
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  static { this.declareProp("passengers", { type: "number", nothingAs: ["n/a", "unknown"] }) }
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  static { this.declareProp("cargoCapacity", { type: "number", nothingAs: ["unknown"] }) }
  get cargoCapacity() { return this.getProp("cargoCapacity") }
  set cargoCapacity(value) { this.setProp("cargoCapacity", value) }

  static { this.declareProp("consumables", { type: "text" }) }
  get consumables() { return this.getProp("consumables") }
  set consumables(value) { this.setProp("consumables", value) }

  static { this.declareProp("hyperdriveRating", { type: "number", nothingAs: ["unknown"] }) }
  get hyperdriveRating() { return this.getProp("hyperdriveRating") }
  set hyperdriveRating(value) { this.setProp("hyperdriveRating", value) }

  static { this.declareProp("mglt", { type: "number", nothingAs: ["unknown"] }) }
  get mglt() { return this.getProp("mglt") }
  set mglt(value) { this.setProp("mglt", value) }

  static { this.declareProp("starshipClass", { type: "text" }) }
  get starshipClass() { return this.getProp("starshipClass") }
  set starshipClass(value) { this.setProp("starshipClass", value) }

  static { this.declareProp("pilots", { itemType: "Character", init: () => new List({ instanceType: "Character" }) }) }
  get pilots() { return core.linked(this, "pilots", Character) }
  set pilots(value) { this.setProp("pilots", value) }

  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }) }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("edited", { type: "date" }) }
  get edited() { return this.getProp("edited") }
  set edited(value) { this.setProp("edited", value) }

  static { this.declareProp("card", { readsFrom: ["star_wars"] }) }
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

  drawLinks() { return core.drawWaiting(() => {
    return [
      core.drawThing(new Section({ heading: "Who flew it", things: this.pilots })),
      core.drawThing(new Section({ heading: "Seen in", things: this.films }))
    ]
  }) }

  static savedIn = {
    place: "star_wars",
    collection: "starships",
    times: ["modified"], select: ["name", "model", "manufacturer", "costInCredits", "length", "crew", "passengers", "starshipClass", "pilots", "films"] }

  static { this.declareProp("modified", { type: "date" }) }
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
export class WikiPage extends Thing {
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("displaytitle", { type: "text" }) }
  get displaytitle() { return this.getProp("displaytitle") }
  set displaytitle(value) { this.setProp("displaytitle", value) }

  static { this.declareProp("namespace", { type: "Namespace" }) }
  get namespace() { return this.getProp("namespace") }
  set namespace(value) { this.setProp("namespace", value) }

  static { this.declareProp("wikibaseItem", { type: "text" }) }
  get wikibaseItem() { return this.getProp("wikibaseItem") }
  set wikibaseItem(value) { this.setProp("wikibaseItem", value) }

  static { this.declareProp("titles", { type: "Title" }) }
  get titles() { return this.getProp("titles") }
  set titles(value) { this.setProp("titles", value) }

  static { this.declareProp("pageid", { type: "number" }) }
  get pageid() { return this.getProp("pageid") }
  set pageid(value) { this.setProp("pageid", value) }

  static { this.declareProp("thumbnail", { type: "Thumbnail" }) }
  get thumbnail() { return this.getProp("thumbnail") }
  set thumbnail(value) { this.setProp("thumbnail", value) }

  static { this.declareProp("originalimage", { type: "Originalimage" }) }
  get originalimage() { return this.getProp("originalimage") }
  set originalimage(value) { this.setProp("originalimage", value) }

  static { this.declareProp("lang", { type: "text" }) }
  get lang() { return this.getProp("lang") }
  set lang(value) { this.setProp("lang", value) }

  static { this.declareProp("dir", { type: "text" }) }
  get dir() { return this.getProp("dir") }
  set dir(value) { this.setProp("dir", value) }

  static { this.declareProp("revision", { type: "number" }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  static { this.declareProp("tid", { type: "text" }) }
  get tid() { return this.getProp("tid") }
  set tid(value) { this.setProp("tid", value) }

  static { this.declareProp("timestamp", { type: "date" }) }
  get timestamp() { return this.getProp("timestamp") }
  set timestamp(value) { this.setProp("timestamp", value) }

  static { this.declareProp("about", { type: "text", storedAs: "description" }) }
  get about() { return this.getProp("about") }
  set about(value) { this.setProp("about", value) }

  static { this.declareProp("descriptionSource", { type: "text" }) }
  get descriptionSource() { return this.getProp("descriptionSource") }
  set descriptionSource(value) { this.setProp("descriptionSource", value) }

  static { this.declareProp("contentUrls", { type: "ContentUrl" }) }
  get contentUrls() { return this.getProp("contentUrls") }
  set contentUrls(value) { this.setProp("contentUrls", value) }

  static { this.declareProp("summary", { type: "text", storedAs: "extract" }) }
  get summary() { return this.getProp("summary") }
  set summary(value) { this.setProp("summary", value) }

  static { this.declareProp("extractHtml", { type: "text" }) }
  get extractHtml() { return this.getProp("extractHtml") }
  set extractHtml(value) { this.setProp("extractHtml", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("fits", { readsFrom: ["wikipedia"] }) }
  get fits() {
    if (core.includes(this.title, "List of")) return false
    return core.includes(this.about, "star wars") || core.includes(this.about, "fictional") || core.includes(this.about, " film ")
  }

  static savedIn = {
    place: "wikipedia",
    collection: "wiki_pages",
    times: ["created", "modified"], select: ["kind", "thumbnail", "about", "contentUrls", "summary", "title"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Namespace extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("text", { type: "text" }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }
}

export class Title extends Thing {
  static { this.declareProp("canonical", { type: "text" }) }
  get canonical() { return this.getProp("canonical") }
  set canonical(value) { this.setProp("canonical", value) }

  static { this.declareProp("normalized", { type: "text" }) }
  get normalized() { return this.getProp("normalized") }
  set normalized(value) { this.setProp("normalized", value) }

  static { this.declareProp("display", { type: "text" }) }
  get display() { return this.getProp("display") }
  set display(value) { this.setProp("display", value) }
}

export class Thumbnail extends Thing {
  static { this.declareProp("source", { type: "text" }) }
  get source() { return this.getProp("source") }
  set source(value) { this.setProp("source", value) }

  static { this.declareProp("width", { type: "number" }) }
  get width() { return this.getProp("width") }
  set width(value) { this.setProp("width", value) }

  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }
}

export class Originalimage extends Thing {
  static { this.declareProp("source", { type: "text" }) }
  get source() { return this.getProp("source") }
  set source(value) { this.setProp("source", value) }

  static { this.declareProp("width", { type: "number" }) }
  get width() { return this.getProp("width") }
  set width(value) { this.setProp("width", value) }

  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }
}

export class ContentUrl extends Thing {
  static { this.declareProp("desktop", { type: "Desktop" }) }
  get desktop() { return this.getProp("desktop") }
  set desktop(value) { this.setProp("desktop", value) }

  static { this.declareProp("mobile", { type: "Mobile" }) }
  get mobile() { return this.getProp("mobile") }
  set mobile(value) { this.setProp("mobile", value) }
}

export class Desktop extends Thing {
  static { this.declareProp("page", { type: "text" }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  static { this.declareProp("revisions", { type: "text" }) }
  get revisions() { return this.getProp("revisions") }
  set revisions(value) { this.setProp("revisions", value) }

  static { this.declareProp("edit", { type: "text" }) }
  get edit() { return this.getProp("edit") }
  set edit(value) { this.setProp("edit", value) }

  static { this.declareProp("talk", { type: "text" }) }
  get talk() { return this.getProp("talk") }
  set talk(value) { this.setProp("talk", value) }
}

export class Mobile extends Thing {
  static { this.declareProp("page", { type: "text" }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  static { this.declareProp("revisions", { type: "text" }) }
  get revisions() { return this.getProp("revisions") }
  set revisions(value) { this.setProp("revisions", value) }

  static { this.declareProp("edit", { type: "text" }) }
  get edit() { return this.getProp("edit") }
  set edit(value) { this.setProp("edit", value) }

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
export class Card extends Thing {
  get label() { return this.getProp("label") }
  set label(value) { this.setProp("label", value) }

  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  get colour() { return this.getProp("colour") }
  set colour(value) { this.setProp("colour", value) }

  get hue() {
    if (this.colour !== undefined) return this.colour
    return this.label.length * 47
  }

  static { this.declareProp("subject", { type: "Thing" }) }
  get subject() { return this.getProp("subject") }
  set subject(value) { this.setProp("subject", value) }

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

  drawPortrait() { return core.drawWaiting(() => {
    return core.drawThing(new Portrait({
      name: this.label,
      hue: this.hue,
      shape: this.shape,
      species: this.species
    }))
  }) }

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
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("page", { readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  draw() {
    return core.drawRead(() => h("slot", { name: "words" }, () => this.drawWords()), undefined, { waiting: () => h("ui-text", { color: "grey" }, "Asking Wikipedia"), failed: () => h("ui-text", { color: "grey" }, "Wikipedia can't be reached just now.") })
  }

  drawWords() { return core.drawWaiting(() => {
    if (this.page && this.page.fits) {
      return h("ui-text", { paragraph: true, part: "words" },
        () => core.whileWaiting(() => this.page?.summary),
        () => core.drawWaiting(() => h("ui-link", { link: () => this.page?.contentUrls?.desktop?.page, target: "_blank" },
          "Read the rest on Wikipedia"
        ))
      )
    }
  }) }
}

export class Fact extends Thing {
  get label() { return this.getProp("label") }
  set label(value) { this.setProp("label", value) }

  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }

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
  static { this.declareProp("facts", { itemType: "Fact", init: () => new List({ instanceType: "Fact" }) }) }
  get facts() { return this.getProp("facts") }
  set facts(value) { this.setProp("facts", value) }

  static { this.declareProp("shown", { readsFrom: ["star_wars"] }) }
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
  get heading() { return this.getProp("heading") }
  set heading(value) { this.setProp("heading", value) }

  static { this.declareProp("things", { itemType: "Thing", init: () => new List({ instanceType: "Thing" }) }) }
  get things() { return this.getProp("things") }
  set things(value) { this.setProp("things", value) }

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
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  get maker() { return this.getProp("maker") }
  set maker(value) { this.setProp("maker", value) }

  static { this.declareProp("length", { type: "number" }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  get cost() { return this.getProp("cost") }
  set cost(value) { this.setProp("cost", value) }

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

  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  create() {
    this.tab = "films"
    this.search = ""
  }

  static { this.declareProp("showing", { type: "Thing" }) }
  get showing() { return this.getProp("showing") }
  set showing(value) { this.setProp("showing", value) }

  static { this.declareProp("trail", { itemType: "Thing", init: () => new List({ instanceType: "Thing" }) }) }
  get trail() { return this.getProp("trail") }
  set trail(value) { this.setProp("trail", value) }

  static { this.declareProp("playing", { type: "Film", link: true }) }
  get playing() { return core.linked(this, "playing", Film) }
  set playing(value) { this.setProp("playing", value) }

  static { this.declareProp("jumping", { type: "choice" }) }
  get jumping() { return this.getProp("jumping") }
  set jumping(value) { this.setProp("jumping", value) }

  static { this.declareProp("found", { readsFrom: ["star_wars"] }) }
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
        h("ui-form", { class: "find", "prop:value": this },
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
core.describeAction(Guide, "goBack", { title: "Go Back", undoneAs: "Go Back" })
core.describeAction(Guide, "goToWhere", { title: "Go to Where", undoneAs: "Go to Where" })
core.describeAction(Guide, "playTheOpening", { title: "Play the Opening", undoneAs: "Play the Opening" })
core.describeAction(Guide, "punch", { title: "Punch It", undoneAs: "Punch It" })

Thing.prototype.open = function () {
  if (guide.showing) core.append(guide.trail, guide.showing)
  guide.search = ""
  guide.showing = this
  core.scrollToTop()
}
core.describeAction(Thing, "open", { title: "Open Thing", undoneAs: "Open Thing" })

export function measureAmountInUnit(amount, unit) {
  return core.asAction({ undoneAs: "Measure Amount in Unit" }, () => {
    if (amount === undefined) return ""
    return `${core.withCommas(amount)} ${unit}`
  })
}

// -----------
core.installStyles(undefined, `/* File styles.css:  only the look no \`ui-*\` attribute gives:  deep space, the title's yellow, the opening and the jump.¬   - \`color-scheme: dark\` here is what turns the Spell UI elements dark too.¬   - Every animation is under "no preference" for motion:  with reduced motion the stars hold still,¬     and the opening is a page you read at your own speed. */¬¬star-wars-app {¬  --yellow: #ffe81f;¬  --space: #05060f;¬  --ui-primary: var(--yellow);¬  --ui-text-color: #eef1ff;¬  --ui-card-background: rgb(255 255 255 / 6%);¬  --ui-card-border-color: rgb(255 255 255 / 14%);¬  --ui-card-hover-border-color: var(--yellow);¬  --ui-card-margin-block: 0;¬  --title: 900 1em / 1.1 "Arial Black", Impact, sans-serif;¬¬  color-scheme: dark;¬  position: relative;¬  isolation: isolate;¬  display: block;¬  min-height: 100vh;¬  overflow: clip;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: var(--space) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='310' height='270'%3E%3Cg fill='%23dfe6ff'%3E%3Ccircle cx='20' cy='30' r='.7'/%3E%3Ccircle cx='140' cy='80' r='.6'/%3E%3Ccircle cx='240' cy='180' r='.9'/%3E%3Ccircle cx='70' cy='210' r='.6'/%3E%3Ccircle cx='290' cy='40' r='1'/%3E%3C/g%3E%3C/svg%3E");¬}¬¬star-wars-app ui-text::part(text) {¬  color: #eef1ff;¬}¬¬.logo::part(button),¬.punch::part(button),¬.play-opening::part(button) {¬  font: var(--title);¬}¬¬.logo::part(button) {¬  padding: 0;¬  background: none;¬  color: var(--yellow);¬  font-size: 1.9em;¬}¬¬.punch::part(button),¬.play-opening::part(button) {¬  background: var(--yellow);¬  color: var(--space);¬}¬¬.opening .play-opening::part(button) {¬  padding: 0.7em 1.6em;¬  font-size: clamp(1.2em, 3.4vw, 1.9em);¬}¬¬.find {¬  flex: 1 1 14em;¬  max-width: 28em;¬}¬¬/* the opening's button, the first thing on the Films tab */¬.opening::part(segment) {¬  --ui-segment-background: radial-gradient(ellipse at 50% 120%, #1c2a6b, var(--space) 70%);¬¬  padding: clamp(1.5em, 6vw, 3.5em) 1em;¬  display: grid;¬  justify-items: center;¬  gap: 1em;¬}¬¬star-wars-app .long-ago::part(text) {¬  color: #4bd5ee;¬}¬¬.section::part(header) {¬  margin-block-start: 1em;¬  color: var(--yellow);¬}¬¬.title::part(header) {¬  color: var(--yellow);¬  font: var(--title);¬  font-size: clamp(1.6em, 5vw, 2.8em);¬}¬¬.facts {¬  max-width: 30em;¬}¬¬/****************¬ * A picture:  a picture over an initial on a colour, so nothing's ever a broken image.  A world is a world.¬ ****************/¬¬.portrait::part(segment) {¬  position: relative;¬  display: grid;¬  place-items: center;¬  margin: 0;¬  padding: 0;¬  aspect-ratio: 4 / 3;¬  overflow: hidden;¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 70% 58%), hsl(var(--hue) 60% 18%));¬}¬¬.portrait.world::part(segment) {¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 75% 62%), hsl(var(--hue) 60% 14%) 60%, transparent 61%);¬}¬¬.initial::part(header) {¬  font: var(--title);¬  font-size: 3.4em;¬}¬¬.portrait ui-image::part(image) {¬  position: absolute;¬  inset: 0;¬  width: 100%;¬  height: 100%;¬}¬¬.hero .portrait::part(segment) {¬  width: min(22em, 100%);¬}¬¬.about {¬  flex: 1 1 20em;¬}¬¬/****************¬ * The jump to light speed, as the films show it:¬ *   the stars still, a beat;  each stays where it is and stretches straight out from the middle of the view,¬ *   slowly then all at once, thin near the middle and bright at the edges;  a white flash;¬ *   the mottled blue tunnel;  a sudden stop.¬ ****************/¬¬.jump::part(segment) {¬  position: fixed;¬  inset: 0;¬  z-index: 5;¬  margin: 0;¬  overflow: hidden;¬  background: var(--space);¬  pointer-events: none;¬}¬¬.streak {¬  --angle: calc(var(--n) * 137.508deg);¬  --distance: mod(calc(var(--n) * var(--n) * 0.7549), 100);¬  --place: rotate(var(--angle)) translateX(calc(var(--distance) * 0.75vmax));¬¬  position: absolute;¬  top: 50%;¬  left: 50%;¬  inline-size: 3px;¬  block-size: calc(1px + var(--distance) * 0.03px);¬  border-radius: 50%;¬  background: linear-gradient(90deg, rgb(120 160 255 / 0%), #bcd4ff 35%, #fff);¬  opacity: calc(0.55 + var(--distance) / 200);¬  transform-origin: 0 50%;¬  transform: var(--place);¬}¬¬.jump-tunnel,¬.jump-flash {¬  position: absolute;¬  inset-block: -30%;¬  inset-inline: -30%;¬  inline-size: auto;¬  block-size: auto;¬  opacity: 0;¬}¬¬.jump-flash {¬  background: #fff;¬}¬¬/* mottled:  layers whose streaks repeat at different lengths, so they never line up;  dark at the middle, as the film's is */¬.jump-tunnel {¬  background:¬    radial-gradient(circle, #041033 0 5%, rgb(4 16 51 / 0%) 22%),¬    repeating-conic-gradient(from 11deg, rgb(205 225 255 / 0%) 0 3.7deg, rgb(205 225 255 / 55%) 4.1deg, rgb(205 225 255 / 0%) 4.6deg 11.3deg),¬    repeating-conic-gradient(from 3deg, rgb(96 150 255 / 0%) 0 1.9deg, rgb(96 150 255 / 60%) 3.1deg, rgb(96 150 255 / 0%) 4.3deg 7.9deg),¬    repeating-conic-gradient(from 29deg, #0a2470 0 6.1deg, #143a9e 8.3deg, #0c2a80 10.7deg 13.1deg, #1b49b8 15.2deg, #0a2470 17.3deg);¬  filter: blur(2.5px);¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .streak {¬    animation: stretch 1050ms cubic-bezier(0.75, 0, 1, 0.55) 300ms both;¬  }¬¬  .jump-flash {¬    animation: flash 300ms linear 1250ms forwards;¬  }¬¬  .jump-tunnel {¬    animation: tunnel 1050ms linear 1400ms forwards;¬  }¬}¬¬@keyframes stretch {¬  to {¬    transform: var(--place) scaleX(calc(var(--distance) * 8));¬  }¬}¬¬@keyframes flash {¬  40% {¬    opacity: 1;¬  }¬}¬¬@keyframes tunnel {¬  0%,¬  98% {¬    opacity: 1;¬  }¬  to {¬    scale: 1.8;¬    rotate: 14deg;¬    opacity: 0;¬  }¬}¬¬/****************¬ * The opening:  yellow words going away, over deep space.  A modal the whole window high, so it's a cinema, and Escape ends it.¬ ****************/¬¬.crawl {¬  color-scheme: dark;¬  --yellow: #ffe81f;¬}¬¬.crawl::part(modal) {¬  overflow: hidden;¬  padding: 0;¬  background: #05060f;¬}¬¬.crawl .long-ago::part(text) {¬  position: absolute;¬  inset: 38% 0 auto;¬  text-align: center;¬  opacity: 0;¬}¬¬.stop {¬  position: absolute;¬  inset: 1em 1em auto auto;¬  z-index: 1;¬}¬¬.stage::part(segment) {¬  position: absolute;¬  inset: 0;¬  margin: 0;¬  perspective: 340px;¬  perspective-origin: 50% 40%;¬}¬¬.words::part(segment) {¬  position: absolute;¬  inset: auto 0 0;¬  margin-inline: auto;¬  width: min(88%, 30em);¬  color: var(--yellow);¬  font: 700 clamp(1.3em, 3.2vw, 2.8em) / 1.45 "Arial Narrow", Arial, sans-serif;¬  transform-origin: 50% 100%;¬  transform: rotateX(24deg);¬}¬¬.episode::part(header),¬.crawl-title::part(header) {¬  color: var(--yellow);¬  font: inherit;¬  text-align: center;¬}¬¬/* its lines are the film's own */¬star-wars-app .crawl-text::part(text) {¬  color: var(--yellow);¬  font: inherit;¬  white-space: pre-line;¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .crawl .long-ago::part(text) {¬    animation: long-ago 5s ease-in-out both;¬  }¬¬  .words::part(segment) {¬    animation: crawl 70s linear 5s both;¬  }¬}¬¬/* with reduced motion:  no tilt, no movement, the whole of it to read */¬@media (prefers-reduced-motion: reduce) {¬  .crawl .long-ago::part(text),¬  .stage::part(segment),¬  .words::part(segment) {¬    position: static;¬    opacity: 1;¬    transform: none;¬  }¬¬  .crawl::part(modal) {¬    overflow: auto;¬  }¬}¬¬@keyframes long-ago {¬  20%,¬  80% {¬    opacity: 1;¬  }¬}¬¬@keyframes crawl {¬  from {¬    transform: rotateX(24deg) translateY(100%);¬  }¬  to {¬    transform: rotateX(24deg) translateY(-160%) translateZ(-900px);¬  }¬}¬`)
// -----------

// -----------
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
export class Portrait extends Thing {
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  get hue() { return this.getProp("hue") }
  set hue(value) { this.setProp("hue", value) }

  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  static { this.declareProp("species", { type: "Species", link: true }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  static { this.declareProp("page", { readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  get initial() {
    return core.getItemAt(this.name, 0)
  }

  static { this.declareProp("picture", { readsFrom: ["wikipedia", "star_wars"] }) }
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

  drawPhoto() { return core.drawWaiting(() => {
    if (this.picture !== "") return h("ui-image", { src: () => this.picture, alt: "", crop: "top", part: "photo" })
    core.readRider("waiting", () => h("ui-space", { part: "photo" }))
    core.readRider("failed", () => h("ui-space", { part: "photo" }))
  }) }
}
// -----------
if (!core.isCarryingOver) guide.start()
