import { core, Thing, List, App, Place, h, position } from "@spell/core"

core.heading("Star Wars")
///////////////
// ## Star Wars
///////////////
// A guide to the galaxy, from two servers other people run, in one program:
//   swapi.info knows the films, people, planets and ships, and links them to each other by address
//   Wikipedia has the pictures, one page at a time
// Say what a field links to, and reading it follows the link:  `the name of its homeworld`.
// `star wars` and its types' fields are what this wrote, from looking at the server, cut down to what's used here:
//   spell place ingest https://swapi.info/api --into StarWars.spell --name "star wars"
//
// Star Wars and its pictures belong to Lucasfilm and Disney, the words to Wikipedia's writers.
// They're asked for as it runs, never kept here, and the page says where they come from.

core.heading("Where it all lives")
/** Show more:  only for a list with more to show, so it isn't all asked of Wikipedia at once */
export class MoreButton extends Thing {
  static { this.declareProp("full", { declaredAt: { path: "/StarWars.spell", start: 6779, end: 6870 }, readsFrom: ["star_wars"] }) }
  get full() {
    return core.itemCountOf(guide.listed) === guide.howMany
  }

  draw() {
    return core.drawRead(() => h("div", { class: () => this.full ? "wide" : "hidden" },
      h("ui-button", {
        class: "more",
        onClick: core.pressed(this, () => guide.showMore()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Show more")
    ), undefined, { waiting: () => h("div", { class: "hidden" }), failed: () => h("div", { class: "hidden" }) })
  }
}

/** A page of Wikipedia:  not every name has one, and a name may be someone else's (Zolan is a medicine) */
export class WikiPage extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/StarWars.spell", start: 7285, end: 7304 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "about" is text
  static { this.declareProp("about", { type: "text", declaredAt: { path: "/StarWars.spell", start: 7308, end: 7327 } }) }
  get about() { return this.getProp("about") }
  set about(value) { this.setProp("about", value) }

  // - its "summary" is text
  static { this.declareProp("summary", { type: "text", declaredAt: { path: "/StarWars.spell", start: 7331, end: 7352 } }) }
  get summary() { return this.getProp("summary") }
  set summary(value) { this.setProp("summary", value) }

  // - its "picture" is text
  static { this.declareProp("picture", { type: "text", declaredAt: { path: "/StarWars.spell", start: 7356, end: 7377 } }) }
  get picture() { return this.getProp("picture") }
  set picture(value) { this.setProp("picture", value) }

  // - its "address" is text
  static { this.declareProp("address", { type: "text", declaredAt: { path: "/StarWars.spell", start: 7381, end: 7402 } }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }

  static { this.declareProp("fits", { declaredAt: { path: "/StarWars.spell", start: 7406, end: 7572 }, readsFrom: ["wikipedia"] }) }
  get fits() {
    if (core.includes(this.title, "List of")) return false
    return core.includes(this.about, "star wars") || core.includes(this.about, "fictional") || core.includes(this.about, " film ")
  }

  static savedIn = { place: "wikipedia", collection: "wiki_pages" }
}

/** A picture:  its own page on Wikipedia, if it has one, else an initial on a colour */
export class Portrait extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "hue" is a number
  static { this.declareProp("hue", { type: "number" }) }
  get hue() { return this.getProp("hue") }
  set hue(value) { this.setProp("hue", value) }

  // - its "shape" is text
  static { this.declareProp("shape", { type: "text" }) }
  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spell", start: 7758, end: 7806 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  get initial() {
    return core.getItemAt(this.name, 0)
  }

  static { this.declareProp("picture", { declaredAt: { path: "/StarWars.spell", start: 7859, end: 7961 }, readsFrom: ["wikipedia"] }) }
  get picture() {
    if (this.page && this.page.fits) return this.page.picture
    return ""
  }

  draw() {
    return h("span", { class: () => `portrait ${this.shape}`, style: () => `--hue: ${this.hue}` },
      h("span", { class: "initial" }, () => this.initial),
      h("slot", { name: "photo" }, () => this.drawPhoto())
    )
  }

  // Waiting for it, or if Wikipedia can't be reached, the initial stays
  drawPhoto() {
    return core.drawRead(() => h("img", { class: () => this.picture === "" ? "hidden" : "", src: () => this.picture, alt: "", part: "photo" }), undefined, { waiting: () => h("span", { class: "hidden", part: "photo" }), failed: () => h("span", { class: "hidden", part: "photo" }) })
  }
}

/** What Wikipedia says of it, and where to read the rest */
export class WikiNote extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spell", start: 8509, end: 8557 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  draw() {
    return core.drawRead(() => h("p", { class: () => this.page && this.page.fits ? "note" : "hidden" },
      () => this.page.summary,
      h("a", { href: () => this.page.address, target: "_blank", rel: "noopener" },
        "Read the rest on Wikipedia"
      )
    ), undefined, { waiting: () => h("p", { class: "note waiting" }, "Asking Wikipedia"), failed: () => h("p", { class: "note waiting" }, "Wikipedia can't be reached just now.") })
  }
}

/** What they all have:  a card to click, a picture, a page */
export class Record extends Thing {
  // - its "label" is text
  static { this.declareProp("label", { type: "text" }) }
  get label() { return this.getProp("label") }
  set label(value) { this.setProp("label", value) }

  // - its "kind" is text
  static { this.declareProp("kind", { type: "text" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "shape" is text
  static { this.declareProp("shape", { type: "text" }) }
  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  static { this.declareProp("hue", { declaredAt: { path: "/StarWars.spell", start: 9080, end: 9121 }, readsFrom: ["star_wars"] }) }
  get hue() {
    return this.label.length * 47
  }

  /** A number for people to read, or that nobody knows */
  measureAmountInUnit(amount, unit) {
    if (amount === undefined) return "unknown"
    return `${core.withCommas(amount)} ${unit}`
  }

  open() {
    if (guide.showing) core.append(guide.trail, guide.showing)
    guide.search = ""
    guide.showing = this
    core.scrollToTop()
  }

  draw() {
    return h("ui-card", { class: "card", appearance: "link" },
      () => core.drawThing(new Portrait({
        name: this.label,
        hue: this.hue,
        shape: this.shape
      })),
      h("div", { class: "words" },
        h("ui-button", {
          class: "open",
          appearance: "transparent",
          onClick: core.pressed(this, () => this.open()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, () => this.label),
        h("small", () => this.kind)
      )
    )
  }

  drawPage() {
    return h("div", { part: "page" })
  }

  // What a page can do besides read:  nothing, unless it says
  drawActions() {
    return h("span", { part: "actions" })
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
      h("div", { class: "hero" },
        () => core.drawThing(new Portrait({
          name: this.label,
          hue: this.hue,
          shape: this.shape
        })),
        h("div", { class: "about" },
          h("h2", () => this.label),
          h("p", { class: "kind" }, () => this.kind),
          h("slot", { name: "actions" }, () => this.drawActions()),
          () => core.drawThing(new WikiNote({ name: this.label }))
        )
      )
    ]
  }
}

/** A film */
export class Film extends Record {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/StarWars.spell", start: 10431, end: 10450 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "episode id" is a number
  static { this.declareProp("episodeId", { type: "number", declaredAt: { path: "/StarWars.spell", start: 10454, end: 10482 } }) }
  get episodeId() { return this.getProp("episodeId") }
  set episodeId(value) { this.setProp("episodeId", value) }

  // - its "opening crawl" is text
  static { this.declareProp("openingCrawl", { type: "text", declaredAt: { path: "/StarWars.spell", start: 10486, end: 10513 } }) }
  get openingCrawl() { return this.getProp("openingCrawl") }
  set openingCrawl(value) { this.setProp("openingCrawl", value) }

  // - its "director" is text
  static { this.declareProp("director", { type: "text", declaredAt: { path: "/StarWars.spell", start: 10517, end: 10539 } }) }
  get director() { return this.getProp("director") }
  set director(value) { this.setProp("director", value) }

  // - its "producer" is text
  static { this.declareProp("producer", { type: "text", declaredAt: { path: "/StarWars.spell", start: 10543, end: 10565 } }) }
  get producer() { return this.getProp("producer") }
  set producer(value) { this.setProp("producer", value) }

  // - its "release date" is a date
  static { this.declareProp("releaseDate", { type: "date", declaredAt: { path: "/StarWars.spell", start: 10569, end: 10597 } }) }
  get releaseDate() { return this.getProp("releaseDate") }
  set releaseDate(value) { this.setProp("releaseDate", value) }

  // - its "characters" is a list of people
  static { this.declareProp("characters", { itemType: "Person", init: () => new List({ instanceType: "Person" }), declaredAt: { path: "/StarWars.spell", start: 10601, end: 10637 } }) }
  get characters() { return core.linked(this, "characters", Person) }
  set characters(value) { this.setProp("characters", value) }

  // - its "planets" is a list of planets
  static { this.declareProp("planets", { itemType: "Planet", init: () => new List({ instanceType: "Planet" }), declaredAt: { path: "/StarWars.spell", start: 10641, end: 10675 } }) }
  get planets() { return core.linked(this, "planets", Planet) }
  set planets(value) { this.setProp("planets", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.spell", start: 10679, end: 10717 } }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 10721, end: 10745 }, readsFrom: ["star_wars"] }) }
  get label() {
    return this.title
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 10749, end: 10790 }, readsFrom: ["star_wars"] }) }
  get kind() {
    return `Episode ${this.episodeId}`
  }

  play() {
    guide.playing = this
  }

  end() {
    guide.playing = undefined
  }

  drawActions() {
    return h("ui-button", {
      class: "play",
      onClick: core.pressed(this, () => this.play()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
      part: "actions"
    }, "Play the opening")
  }

  drawPage() {
    return [
      h("slot", { name: "top" }, () => this.drawTop()),
      h("ui-table", { class: "facts", appearance: "very-basic", unstackable: true },
        h("table",
          h("tbody",
            h("tr",
              h("th", "Directed by"),
              h("td", () => this.director)
            ),
            h("tr",
              h("th", "Produced by"),
              h("td", () => this.producer)
            ),
            h("tr",
              h("th", "Released"),
              h("td", () => core.dateShown(this.releaseDate))
            )
          )
        )
      ),
      h("h3", "Who's in it"),
      core.drawRead(() => this.characters, (person) => core.drawThing(person), { waiting: () => h("ui-loader", { class: "waiting", visible: true, inline: true, text: true, part: "page" },
        "Following the links"
      ) }),
      h("h3", { part: "page" }, "Where it happens"),
      core.drawRead(() => this.planets, (planet) => core.drawThing(planet)),
      h("h3", { part: "page" }, "What they fly"),
      core.drawRead(() => this.starships, (starship) => core.drawThing(starship))
    ]
  }

  // The opening:  yellow, receding, and it stops when you say
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
      h("div", { class: "cinema" },
        h("div", { class: "stars", "aria-hidden": "true" }),
        h("p", { class: "long-ago" }, "A long time ago in a galaxy far, far away...."),
        h("div", { class: "stage" },
          h("div", { class: "words" },
            h("p", { class: "episode" }, "Episode ", () => this.episodeId),
            h("h2", () => this.title),
            h("p", { class: "text" }, () => this.openingCrawl)
          )
        ),
        h("ui-button", {
          class: "stop",
          onClick: core.pressed(this, () => this.end()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Stop")
      )
    )
  }

  static savedIn = { place: "star_wars", collection: "films" }
}

/** A person */
export class Person extends Record {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.spell", start: 12336, end: 12354 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "height" is a number
  static { this.declareProp("height", { type: "number", declaredAt: { path: "/StarWars.spell", start: 12358, end: 12382 } }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  // - its "mass" is a number
  static { this.declareProp("mass", { type: "number", declaredAt: { path: "/StarWars.spell", start: 12386, end: 12408 } }) }
  get mass() { return this.getProp("mass") }
  set mass(value) { this.setProp("mass", value) }

  // - its "hair color" is text
  static { this.declareProp("hairColor", { type: "text", declaredAt: { path: "/StarWars.spell", start: 12412, end: 12436 } }) }
  get hairColor() { return this.getProp("hairColor") }
  set hairColor(value) { this.setProp("hairColor", value) }

  // - its "eye color" is text
  static { this.declareProp("eyeColor", { type: "text", declaredAt: { path: "/StarWars.spell", start: 12440, end: 12463 } }) }
  get eyeColor() { return this.getProp("eyeColor") }
  set eyeColor(value) { this.setProp("eyeColor", value) }

  // - its "birth year" is text
  static { this.declareProp("birthYear", { type: "text", declaredAt: { path: "/StarWars.spell", start: 12467, end: 12491 } }) }
  get birthYear() { return this.getProp("birthYear") }
  set birthYear(value) { this.setProp("birthYear", value) }

  // - its "gender" is text
  static { this.declareProp("gender", { type: "text", declaredAt: { path: "/StarWars.spell", start: 12495, end: 12515 } }) }
  get gender() { return this.getProp("gender") }
  set gender(value) { this.setProp("gender", value) }

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.spell", start: 12519, end: 12546 } }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.spell", start: 12550, end: 12580 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List({ instanceType: "Species" }), declaredAt: { path: "/StarWars.spell", start: 12584, end: 12618 } }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.spell", start: 12622, end: 12658 } }) }
  get vehicles() { return core.linked(this, "vehicles", Vehicle) }
  set vehicles(value) { this.setProp("vehicles", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.spell", start: 12662, end: 12700 } }) }
  get starships() { return core.linked(this, "starships", Starship) }
  set starships(value) { this.setProp("starships", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 12704, end: 12727 }, readsFrom: ["star_wars"] }) }
  get label() {
    return this.name
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 12731, end: 12769 }, readsFrom: ["star_wars"] }) }
  get kind() {
    return `Born ${this.birthYear}`
  }

  static drawsWaiting = true
  drawPage() {
    return [
      h("slot", { name: "top" }, () => this.drawTop()),
      h("ui-table", { class: "facts", appearance: "very-basic", unstackable: true },
        h("table",
          h("tbody",
            h("tr",
              h("th", "Height"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.height, "cm"))
            ),
            h("tr",
              h("th", "Mass"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.mass, "kg"))
            ),
            h("tr",
              h("th", "Born"),
              h("td", () => this.birthYear)
            ),
            h("tr",
              h("th", "Hair"),
              h("td", () => this.hairColor)
            ),
            h("tr",
              h("th", "Eyes"),
              h("td", () => this.eyeColor)
            )
          )
        )
      ),
      h("h3", "Home"),
      core.drawThing(this.homeworld),
      h("h3", { part: "page" }, "Films"),
      core.drawRead(() => this.films, (film) => core.drawThing(film), { waiting: () => h("ui-loader", { class: "waiting", visible: true, inline: true, text: true, part: "page" },
        "Following the links"
      ) }),
      h("h3", { part: "page" }, "What they are"),
      core.drawRead(() => this.species, (one) => core.drawThing(one), { none: () => h("p", { class: "none", part: "page" }, "Human, as far as anyone says.") }),
      h("h3", { part: "page" }, "What they fly"),
      core.drawRead(() => this.starships, (starship) => core.drawThing(starship)),
      core.drawRead(() => this.vehicles, (vehicle) => core.drawThing(vehicle))
    ]
  }

  static savedIn = { place: "star_wars", collection: "people", select: ["name", "height", "mass", "hairColor", "eyeColor", "birthYear", "homeworld", "films", "species", "vehicles", "starships", "label", "kind", "shape"] }
}

/** A planet */
export class Planet extends Record {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.spell", start: 13770, end: 13788 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "rotation period" is a number
  static { this.declareProp("rotationPeriod", { type: "number", declaredAt: { path: "/StarWars.spell", start: 13792, end: 13825 } }) }
  get rotationPeriod() { return this.getProp("rotationPeriod") }
  set rotationPeriod(value) { this.setProp("rotationPeriod", value) }

  // - its "orbital period" is a number
  static { this.declareProp("orbitalPeriod", { type: "number", declaredAt: { path: "/StarWars.spell", start: 13829, end: 13861 } }) }
  get orbitalPeriod() { return this.getProp("orbitalPeriod") }
  set orbitalPeriod(value) { this.setProp("orbitalPeriod", value) }

  // - its "diameter" is a number
  static { this.declareProp("diameter", { type: "number", declaredAt: { path: "/StarWars.spell", start: 13865, end: 13891 } }) }
  get diameter() { return this.getProp("diameter") }
  set diameter(value) { this.setProp("diameter", value) }

  // - its "climate" is text
  static { this.declareProp("climate", { type: "text", declaredAt: { path: "/StarWars.spell", start: 13895, end: 13916 } }) }
  get climate() { return this.getProp("climate") }
  set climate(value) { this.setProp("climate", value) }

  // - its "gravity" is text
  static { this.declareProp("gravity", { type: "text", declaredAt: { path: "/StarWars.spell", start: 13920, end: 13941 } }) }
  get gravity() { return this.getProp("gravity") }
  set gravity(value) { this.setProp("gravity", value) }

  // - its "terrain" is text
  static { this.declareProp("terrain", { type: "text", declaredAt: { path: "/StarWars.spell", start: 13945, end: 13966 } }) }
  get terrain() { return this.getProp("terrain") }
  set terrain(value) { this.setProp("terrain", value) }

  // - its "surface water" is a number
  static { this.declareProp("surfaceWater", { type: "number", declaredAt: { path: "/StarWars.spell", start: 13970, end: 14001 } }) }
  get surfaceWater() { return this.getProp("surfaceWater") }
  set surfaceWater(value) { this.setProp("surfaceWater", value) }

  // - its "population" is a number
  static { this.declareProp("population", { type: "number", declaredAt: { path: "/StarWars.spell", start: 14005, end: 14033 } }) }
  get population() { return this.getProp("population") }
  set population(value) { this.setProp("population", value) }

  // - its "residents" is a list of people
  static { this.declareProp("residents", { itemType: "Person", init: () => new List({ instanceType: "Person" }), declaredAt: { path: "/StarWars.spell", start: 14037, end: 14072 } }) }
  get residents() { return core.linked(this, "residents", Person) }
  set residents(value) { this.setProp("residents", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }), declaredAt: { path: "/StarWars.spell", start: 14076, end: 14106 } }) }
  get films() { return core.linked(this, "films", Film) }
  set films(value) { this.setProp("films", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 14110, end: 14133 }, readsFrom: ["star_wars"] }) }
  get label() {
    return this.name
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 14137, end: 14162 }, readsFrom: ["star_wars"] }) }
  get kind() {
    return this.climate
  }

  static { this.declareProp("shape", { declaredAt: { path: "/StarWars.spell", start: 14166, end: 14188 } }) }
  get shape() {
    return "world"
  }

  /** what colour a world is, from its weather */
  static { this.declareProp("hue", { declaredAt: { path: "/StarWars.spell", start: 14237, end: 14557 }, readsFrom: ["star_wars"] }) }
  get hue() {
    if (core.includes(this.climate, "frozen")) return 200
    if (core.includes(this.climate, "arid")) return 38
    if (core.includes(this.climate, "murky") || core.includes(this.climate, "polluted")) return 95
    if (core.includes(this.climate, "tropical") || core.includes(this.climate, "temperate")) return 130 + this.label.length * 9
    return 280
  }

  drawPage() {
    return [
      h("slot", { name: "top" }, () => this.drawTop()),
      h("ui-table", { class: "facts", appearance: "very-basic", unstackable: true },
        h("table",
          h("tbody",
            h("tr",
              h("th", "Climate"),
              h("td", () => this.climate)
            ),
            h("tr",
              h("th", "Terrain"),
              h("td", () => this.terrain)
            ),
            h("tr",
              h("th", "Diameter"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.diameter, "km"))
            ),
            h("tr",
              h("th", "Population"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.population, "people"))
            ),
            h("tr",
              h("th", "A day"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.rotationPeriod, "hours"))
            ),
            h("tr",
              h("th", "A year"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.orbitalPeriod, "days"))
            )
          )
        )
      ),
      h("h3", "Who's from here"),
      core.drawRead(() => this.residents, (person) => core.drawThing(person), { none: () => h("p", { class: "none", part: "page" }, "Nobody we know of.") }),
      h("h3", { part: "page" }, "Seen in"),
      core.drawRead(() => this.films, (film) => core.drawThing(film), { none: () => h("p", { class: "none", part: "page" }, "No film.") })
    ]
  }

  static savedIn = { place: "star_wars", collection: "planets", select: ["name", "rotationPeriod", "orbitalPeriod", "diameter", "climate", "terrain", "population", "residents", "films", "label", "kind", "shape"] }
}

/** A ship, or a vehicle:  much the same to look at */
export class Craft extends Record {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "model" is text
  static { this.declareProp("model", { type: "text" }) }
  get model() { return this.getProp("model") }
  set model(value) { this.setProp("model", value) }

  // - its "manufacturer" is text
  static { this.declareProp("manufacturer", { type: "text" }) }
  get manufacturer() { return this.getProp("manufacturer") }
  set manufacturer(value) { this.setProp("manufacturer", value) }

  // - its "cost in credits" is a number
  static { this.declareProp("costInCredits", { type: "number" }) }
  get costInCredits() { return this.getProp("costInCredits") }
  set costInCredits(value) { this.setProp("costInCredits", value) }

  // - its "length" is a number
  static { this.declareProp("length", { type: "number" }) }
  get length() { return this.getProp("length") }
  set length(value) { this.setProp("length", value) }

  // - its "crew" is text
  static { this.declareProp("crew", { type: "text" }) }
  get crew() { return this.getProp("crew") }
  set crew(value) { this.setProp("crew", value) }

  // - its "passengers" is a number
  static { this.declareProp("passengers", { type: "number" }) }
  get passengers() { return this.getProp("passengers") }
  set passengers(value) { this.setProp("passengers", value) }

  // - its "craft class" is text
  static { this.declareProp("craftClass", { type: "text" }) }
  get craftClass() { return this.getProp("craftClass") }
  set craftClass(value) { this.setProp("craftClass", value) }

  // - its "pilots" is a list of people
  static { this.declareProp("pilots", { itemType: "Person", init: () => new List({ instanceType: "Person" }) }) }
  get pilots() { return this.getProp("pilots") }
  set pilots(value) { this.setProp("pilots", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List({ instanceType: "Film" }) }) }
  get films() { return this.getProp("films") }
  set films(value) { this.setProp("films", value) }

  get label() {
    return this.name
  }

  get kind() {
    return this.craftClass
  }

  /** how long it is, in something you can picture:  an X-wing is 12.5 metres */
  get xWingsLong() {
    if (this.length === undefined) return undefined
    return Math.round(this.length / 12.5)
  }

  drawPage() {
    return [
      h("slot", { name: "top" }, () => this.drawTop()),
      h("ui-table", { class: "facts", appearance: "very-basic", unstackable: true },
        h("table",
          h("tbody",
            h("tr",
              h("th", "Model"),
              h("td", () => this.model)
            ),
            h("tr",
              h("th", "Made by"),
              h("td", () => this.manufacturer)
            ),
            h("tr",
              h("th", "Length"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.length, "m"))
            ),
            h("tr",
              h("th", "As long as"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.xWingsLong, "X-wings"))
            ),
            h("tr",
              h("th", "Crew"),
              h("td", { class: "number" }, () => this.crew)
            ),
            h("tr",
              h("th", "Passengers"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.passengers, "people"))
            ),
            h("tr",
              h("th", "Costs"),
              h("td", { class: "number" }, () => this.measureAmountInUnit(this.costInCredits, "credits"))
            )
          )
        )
      ),
      h("h3", "Who flew it"),
      core.drawRead(() => this.pilots, (person) => core.drawThing(person), { none: () => h("p", { class: "none", part: "page" }, "Nobody named.") }),
      h("h3", { part: "page" }, "Seen in"),
      core.drawRead(() => this.films, (film) => core.drawThing(film))
    ]
  }
}

export class Starship extends Craft {
  static savedIn = { place: "star_wars", collection: "starships" }
}

export class Vehicle extends Craft {
  static savedIn = { place: "star_wars", collection: "vehicles" }
}

/** A species */
export class Species extends Record {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/StarWars.spell", start: 17066, end: 17084 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "classification" is text
  static { this.declareProp("classification", { type: "text", declaredAt: { path: "/StarWars.spell", start: 17088, end: 17116 } }) }
  get classification() { return this.getProp("classification") }
  set classification(value) { this.setProp("classification", value) }

  // - its "language" is text
  static { this.declareProp("language", { type: "text", declaredAt: { path: "/StarWars.spell", start: 17120, end: 17142 } }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "average lifespan" is text
  static { this.declareProp("averageLifespan", { type: "text", declaredAt: { path: "/StarWars.spell", start: 17146, end: 17176 } }) }
  get averageLifespan() { return this.getProp("averageLifespan") }
  set averageLifespan(value) { this.setProp("averageLifespan", value) }

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.spell", start: 17180, end: 17207 } }) }
  get homeworld() { return core.linked(this, "homeworld", Planet) }
  set homeworld(value) { this.setProp("homeworld", value) }

  // - its "people" is a list of people
  static { this.declareProp("people", { itemType: "Person", init: () => new List({ instanceType: "Person" }), declaredAt: { path: "/StarWars.spell", start: 17211, end: 17243 } }) }
  get people() { return core.linked(this, "people", Person) }
  set people(value) { this.setProp("people", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 17247, end: 17270 }, readsFrom: ["star_wars"] }) }
  get label() {
    return this.name
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 17274, end: 17306 }, readsFrom: ["star_wars"] }) }
  get kind() {
    return this.classification
  }

  static drawsWaiting = true
  drawPage() {
    return [
      h("slot", { name: "top" }, () => this.drawTop()),
      h("ui-table", { class: "facts", appearance: "very-basic", unstackable: true },
        h("table",
          h("tbody",
            h("tr",
              h("th", "Language"),
              h("td", () => this.language)
            ),
            h("tr",
              h("th", "Lives for"),
              h("td", () => this.averageLifespan)
            )
          )
        )
      ),
      h("h3", "Home"),
      core.drawThing(this.homeworld),
      h("h3", { part: "page" }, "Who's one"),
      core.drawRead(() => this.people, (person) => core.drawThing(person), { none: () => h("p", { class: "none", part: "page" }, "Nobody we know of.") })
    ]
  }

  static savedIn = { place: "star_wars", collection: "species" }
}

/** Where it all lives */
export class StarWar extends Place {}
export const starWars = core.place(new StarWar(), {
  name: "star_wars",
  kind: "web server",
  at: "https://swapi.info/api",
  idColumn: "url",
  checkedEvery: 86400,
  collections: {
    films: { at: "/films", fields: {
      episodeId: "episode_id",
      openingCrawl: "opening_crawl",
      releaseDate: "release_date"
    } },
    people: { at: "/people", fields: {
      hairColor: "hair_color",
      eyeColor: "eye_color",
      birthYear: "birth_year"
    } },
    planets: { at: "/planets", fields: {
      rotationPeriod: "rotation_period",
      orbitalPeriod: "orbital_period",
      surfaceWater: "surface_water"
    } },
    species: { at: "/species", fields: { averageLifespan: "average_lifespan" } },
    vehicles: { at: "/vehicles", fields: { costInCredits: "cost_in_credits", craftClass: "vehicle_class" } },
    starships: { at: "/starships", fields: { costInCredits: "cost_in_credits", craftClass: "starship_class" } }
  }, firstReads: () => [[Film], [Person], [Planet], [Vehicle], [Species], [Starship]] })

export class Wikipedia extends Place {}
export const wikipedia = core.place(new Wikipedia(), {
  name: "wikipedia",
  kind: "web server",
  at: "https://en.wikipedia.org/api/rest_v1",
  checkedEvery: 86400,
  collections: { wikiPages: { at: "/page/summary", fields: {
    id: "pageid",
    picture: "thumbnail.source",
    about: "description",
    summary: "extract",
    address: "content_urls.desktop.page"
  } } }
})

core.heading("The app:  what's showing, and how you get about")
/** The app:  what's showing, and how you get about */
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

  // - its "showing" is a record
  static { this.declareProp("showing", { type: "Record" }) }
  get showing() { return this.getProp("showing") }
  set showing(value) { this.setProp("showing", value) }

  // - its "trail" is a new list of records
  static { this.declareProp("trail", { itemType: "Record", init: () => new List({ instanceType: "Record" }) }) }
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

  // - its "how many" is a number
  static { this.declareProp("howMany", { type: "number" }) }
  get howMany() { return this.getProp("howMany") }
  set howMany(value) { this.setProp("howMany", value) }

  /** What the shelf lists:  whatever's found, else its tab's, a few at a time */
  static { this.declareProp("listed", { declaredAt: { path: "/StarWars.spell", start: 2475, end: 2954 }, readsFrom: ["star_wars"] }) }
  get listed() { return core.waitedValue(this, "listed", async () => {
    if (this.search !== "") return await core.answerOf(this, "found")
    if (this.tab === "films") return await core.savedThings(Film)
    if (this.tab === "people") return core.rangeStartingAt(await core.savedThings(Person), 0, this.howMany)
    if (this.tab === "planets") return core.rangeStartingAt(await core.savedThings(Planet), 0, this.howMany)
    if (this.tab === "vehicles") return core.rangeStartingAt(await core.savedThings(Vehicle), 0, this.howMany)
    if (this.tab === "species") return core.rangeStartingAt(await core.savedThings(Species), 0, this.howMany)
    return core.rangeStartingAt(await core.savedThings(Starship), 0, this.howMany)
  }, () => [this.search, this.tab, this.howMany]) }

  static { this.declareProp("found", { declaredAt: { path: "/StarWars.spell", start: 2959, end: 3695 }, readsFrom: ["star_wars"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const matches = new List({ instanceType: "Record" })
    core.map(core.filter(await core.savedThings(Film, {}, "looks through"), (film) => core.includes(film.title, this.search)), (film) => matches.append(film))
    core.map(core.filter(await core.savedThings(Person, {}, "looks through"), (person) => core.includes(person.name, this.search)), (person) => matches.append(person))
    core.map(core.filter(await core.savedThings(Planet, {}, "looks through"), (planet) => core.includes(planet.name, this.search)), (planet) => matches.append(planet))
    core.map(core.filter(await core.savedThings(Starship, {}, "looks through"), (starship) => core.includes(starship.name, this.search)), (starship) => matches.append(starship))
    core.map(core.filter(await core.savedThings(Vehicle, {}, "looks through"), (vehicle) => core.includes(vehicle.name, this.search)), (vehicle) => matches.append(vehicle))
    core.map(core.getItemAt(this, position(core.filter(await core.savedThings(Species, {}, "looks through"), (species) => core.includes(species.name, this.search)))), (one) => matches.append(one))
    return matches
  }, () => [this.search]) }

  create() {
    this.tab = "films"
    this.howMany = 12
  }

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
    this.howMany = 12
    core.scrollToTop()
  }

  showMore() {
    this.howMany = this.howMany + 12
  }

  /** Punch it:  a jump to light speed, and wherever it lands */
  async punch() {
    this.jumping = true
    const landing = core.randomItemOf(await core.savedThings(Person))
    await core.pauseFor(900, "msec")
    landing?.open()
    this.jumping = false
  }

  draw() {
    return [
      h("div", { class: "stars", "aria-hidden": "true" }),
      this.jumping ? h("div", { class: "jump", "aria-hidden": "true" }) : undefined,
      h("header", { class: "top" },
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
          active: () => this.tab === "people",
          onClick: core.pressed(this, () => this.goToWhere("people")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "People"),
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
      h("main", { class: "shelf" }, h("slot", { name: "shelf" }, () => this.drawShelf())),
      h("footer", { class: "credits" },
        "Films, people, planets and ships from ",
        h("a", { href: "https://swapi.info/" }, "swapi.info"),
        ". Pictures and what they're of from ",
        h("a", { href: "https://en.wikipedia.org/" }, "Wikipedia"),
        ", asked for as you look. Star Wars belongs to Lucasfilm and Disney."
      ),
      this.playing ? this.playing.drawCrawl() : undefined
    ]
  }

  drawShelf() {
    if (this.showing && this.search === "") return this.showing.drawPage()
    else {
      return [
        this.search !== "" ? h("h2", { class: "heading", part: "shelf" }, "Searching for “", () => this.search, "”") : undefined,
        core.drawRead(() => this.listed, (record) => core.drawThing(record), {
          waiting: () => h("div", { class: "wide", part: "shelf" },
            h("ui-loader", { visible: true, inline: true, text: true }, "Waiting for a signal from swapi.info")
          ),
          none: () => h("p", { class: "none", part: "shelf" }, "Nobody and nothing by that name, in this galaxy."),
          failed: () => h("div", { class: "wide", part: "shelf" },
            h("ui-message", { color: "red" },
              h("p", "The signal from swapi.info is lost."),
              h("ui-button", {
                onClick: core.pressed(this, () => core.reloadSaved()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Try again")
            )
          )
        }),
        core.drawThing(new MoreButton())
      ]
    }
  }
}
export const guide = new Guide()

core.heading("A page of Wikipedia:  not every name has one, and a name may be someone else's (Zolan is a medicine)")

core.heading("A film")

core.heading("A person")

core.heading("A planet")

core.heading("A ship, or a vehicle:  much the same to look at")

core.heading("A species")

if (!core.isCarryingOver) guide.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  how the guide looks, its own look, whichever scheme the page is in:  deep space, a starfield,¬   and the yellow of the title.¬   - \`color-scheme: dark\` here is what turns the Spell UI elements dark too.¬   - Every animation is under "no preference" for motion:  with reduced motion the stars stand still,¬     and the opening is a page you read at your own speed. */¬¬star-wars-app {¬  --space: #05060f;¬  --space-low: #0d1330;¬  --ink: #eef1ff;¬  --ink-muted: #a7aecb;¬  --yellow: #ffe81f;¬  --panel: rgb(255 255 255 / 6%);¬  --panel-hover: rgb(255 255 255 / 12%);¬  --edge: rgb(255 255 255 / 14%);¬  --glow: rgb(255 232 31 / 30%);¬  --title-font: "Arial Black", "Helvetica Neue", Impact, sans-serif;¬¬  color-scheme: dark;¬  position: relative;¬  isolation: isolate;¬  display: block;¬  min-height: 100vh;¬  overflow: clip;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: linear-gradient(var(--space), var(--space-low));¬  color: var(--ink);¬  font-size: 15px;¬}¬¬/****************¬ * The stars:  a few layers of dots, which drift¬ ****************/¬¬.stars {¬  position: absolute;¬  inset: 0;¬  z-index: -1;¬  pointer-events: none;¬  background-image:¬    radial-gradient(1px 1px at 20px 30px, #fff, transparent),¬    radial-gradient(1px 1px at 140px 80px, #dfe6ff, transparent),¬    radial-gradient(1.5px 1.5px at 240px 180px, #fff, transparent),¬    radial-gradient(1px 1px at 70px 210px, #ffe9c9, transparent),¬    radial-gradient(2px 2px at 290px 40px, #cfe0ff, transparent);¬  background-size:¬    310px 270px,¬    250px 310px,¬    370px 290px,¬    230px 340px,¬    430px 390px;¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .stars {¬    animation: drift 240s linear infinite;¬  }¬}¬¬@keyframes drift {¬  to {¬    background-position:¬      -310px 135px,¬      -500px 155px,¬      -370px 145px,¬      -460px 170px,¬      -430px 195px;¬  }¬}¬¬/****************¬ * Across the top:  the name, the search, and Punch it¬ ****************/¬¬.top {¬  display: flex;¬  flex-wrap: wrap;¬  align-items: end;¬  gap: 0.75em 1.5em;¬}¬¬.logo {¬  flex: none;¬¬  &::part(button) {¬    padding: 0;¬    background: none;¬    color: var(--yellow);¬    font: 900 1.9em / 1 var(--title-font);¬    letter-spacing: 0.02em;¬    text-transform: uppercase;¬  }¬}¬¬.find {¬  --ui-form-row-distance: 0;¬¬  flex: 1 1 14em;¬  max-width: 28em;¬  margin-inline-start: auto;¬}¬¬.punch {¬  flex: none;¬¬  &::part(button) {¬    background: var(--yellow);¬    color: var(--space);¬    font-weight: 800;¬  }¬}¬¬/****************¬ * The tabs¬ ****************/¬¬.tabs {¬  --ui-primary: var(--yellow);¬¬  margin-block: 1em;¬}¬¬/****************¬ * The shelf:  cards in a grid;  anything else across the whole of it¬ ****************/¬¬.shelf {¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 13em), 1fr));¬  gap: 0.75em;¬  min-height: 20em;¬¬  .back,¬  .hero,¬  .facts,¬  .heading,¬  h3,¬  .none,¬  .wide {¬    grid-column: 1 / -1;¬  }¬¬  .back {¬    justify-self: start;¬  }¬¬  .hidden {¬    display: none;¬  }¬¬  h2,¬  h3 {¬    margin: 0;¬    color: var(--yellow);¬  }¬¬  h3 {¬    margin-block-start: 1em;¬    font-size: 1.05em;¬    letter-spacing: 0.06em;¬    text-transform: uppercase;¬  }¬¬  .none {¬    margin: 0;¬    color: var(--ink-muted);¬  }¬}¬¬/****************¬ * A card:  a picture, a name, what kind.  Its name is the button, and fills the card.¬ ****************/¬¬.card {¬  --ui-card-margin-block: 0;¬¬  position: relative;¬  overflow: hidden;¬  border-radius: 0.6em;¬  background: var(--panel);¬  box-shadow: 0 0 0 1px var(--edge);¬  transition:¬    background 120ms,¬    box-shadow 120ms,¬    translate 120ms;¬¬  &:hover,¬  &:focus-within {¬    background: var(--panel-hover);¬    box-shadow:¬      0 0 0 1px var(--yellow),¬      0 0 1.5em var(--glow);¬    translate: 0 -2px;¬  }¬¬  .words {¬    padding: 0.5em 0.75em 0.7em;¬  }¬¬  .open::part(button) {¬    padding: 0;¬    background: none;¬    color: var(--ink);¬    font-weight: 700;¬    text-align: start;¬    white-space: normal;¬  }¬¬  .open::part(button)::after {¬    content: "";¬    position: absolute;¬    inset: 0;¬  }¬¬  small {¬    display: block;¬    color: var(--ink-muted);¬  }¬}¬¬/****************¬ * A picture, over an initial on a colour, so nothing's ever a broken image.  A world is a world.¬ ****************/¬¬.portrait {¬  --hue: 200;¬¬  position: relative;¬  display: grid;¬  place-items: center;¬  aspect-ratio: 4 / 3;¬  overflow: hidden;¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 70% 58%), hsl(var(--hue) 60% 18%));¬¬  .initial {¬    color: rgb(255 255 255 / 85%);¬    font: 900 3.4em / 1 var(--title-font);¬  }¬¬  img {¬    position: absolute;¬    inset: 0;¬    width: 100%;¬    height: 100%;¬    object-fit: cover;¬    object-position: 50% 20%;¬  }¬¬  &.world {¬    background: radial-gradient(circle at 50% 50%, rgb(255 255 255 / 5%), transparent 70%);¬¬    &::before {¬      content: "";¬      position: absolute;¬      height: 78%;¬      aspect-ratio: 1;¬      border-radius: 50%;¬      background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 75% 62%), hsl(var(--hue) 60% 14%) 75%);¬      box-shadow: 0 0 2em hsl(var(--hue) 70% 50% / 35%);¬    }¬¬    .initial {¬      position: relative;¬    }¬  }¬}¬¬/****************¬ * A whole page¬ ****************/¬¬.hero {¬  display: flex;¬  flex-wrap: wrap;¬  gap: 1em 1.5em;¬  align-items: start;¬¬  star-wars-portrait,¬  > .portrait {¬    flex: 1 1 16em;¬    max-width: 22em;¬  }¬¬  .about {¬    flex: 999 1 20em;¬    min-width: 0;¬  }¬¬  h2 {¬    font: 900 clamp(1.6em, 5vw, 2.8em) / 1.05 var(--title-font);¬    text-transform: uppercase;¬  }¬¬  .kind {¬    margin: 0.25em 0 0;¬    color: var(--ink-muted);¬  }¬¬  .note {¬    margin: 0.75em 0 0;¬    max-width: 44em;¬  }¬¬  .note.waiting {¬    color: var(--ink-muted);¬  }¬¬  .note a {¬    margin-inline-start: 0.25em;¬    color: var(--yellow);¬    white-space: nowrap;¬  }¬¬  .portrait {¬    border-radius: 0.6em;¬    box-shadow: 0 0 0 1px var(--edge);¬  }¬}¬¬.play {¬  display: block;¬  margin-block-start: 0.75em;¬¬  &::part(button) {¬    background: var(--yellow);¬    color: var(--space);¬    font-weight: 800;¬  }¬}¬¬.facts {¬  display: block;¬  max-width: 30em;¬¬  td {¬    color: var(--ink);¬  }¬¬  th {¬    width: 8em;¬    color: var(--ink-muted);¬    font-weight: 500;¬    text-align: start;¬    white-space: nowrap;¬  }¬¬  td.number {¬    font-variant-numeric: tabular-nums;¬    text-align: end;¬  }¬}¬¬.credits {¬  margin-block-start: 2.5em;¬  color: var(--ink-muted);¬  font-size: 0.85em;¬¬  a {¬    color: inherit;¬    text-decoration: underline;¬  }¬}¬¬/****************¬ * The jump to light speed:  the stars stretch into lines, then you're there¬ ****************/¬¬.jump {¬  position: absolute;¬  inset: 0;¬  z-index: 5;¬  pointer-events: none;¬  background:¬    repeating-conic-gradient(from 3deg at 50% 45vh, #dfe6ff 0 0.15deg, transparent 0.15deg 3deg),¬    var(--space);¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .jump {¬    animation: jump 900ms ease-in both;¬  }¬}¬¬@keyframes jump {¬  from {¬    opacity: 0;¬    scale: 0.2;¬  }¬  40% {¬    opacity: 1;¬  }¬  to {¬    opacity: 1;¬    scale: 3;¬  }¬}¬¬/****************¬ * The opening:  yellow words going away, over deep space.  A modal the whole window high, so it's a cinema, and Escape ends it.¬ ****************/¬¬.crawl {¬  color-scheme: dark;¬}¬¬.crawl::part(modal) {¬  background: #05060f;¬  padding: 0;¬}¬¬.cinema {¬  --space: #05060f;¬  --yellow: #ffe81f;¬¬  position: relative;¬  height: 100vh;¬  overflow: hidden;¬  background: var(--space);¬  color: var(--yellow);¬¬  .stars {¬    z-index: 0;¬  }¬¬  .stop {¬    position: absolute;¬    inset: 1em 1em auto auto;¬    z-index: 1;¬  }¬¬  .long-ago {¬    position: absolute;¬    inset: 38% 0 auto;¬    margin: 0 auto;¬    max-width: 22em;¬    padding-inline: 1em;¬    color: #4bd5ee;¬    font-size: 1.4em;¬    opacity: 0;¬  }¬¬  .stage {¬    position: absolute;¬    inset: 0;¬    perspective: 340px;¬    perspective-origin: 50% 40%;¬  }¬¬  .words {¬    position: absolute;¬    inset: auto 0 0;¬    margin-inline: auto;¬    width: min(88%, 30em);¬    font: 700 clamp(1.3em, 3.2vw, 2.8em) / 1.45 "Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif;¬    text-align: justify;¬    transform-origin: 50% 100%;¬    transform: rotateX(24deg);¬  }¬¬  h2,¬  .episode {¬    margin: 0 0 0.6em;¬    color: inherit;¬    text-align: center;¬  }¬¬  h2 {¬    font: inherit;¬    font-size: 1.6em;¬    text-transform: uppercase;¬  }¬¬  /* its lines are the film's own, so it's they that are centred, not each word */¬  .text {¬    width: fit-content;¬    margin: 0 auto;¬    text-align: start;¬    white-space: pre-line;¬  }¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .cinema {¬    .long-ago {¬      animation: long-ago 5s ease-in-out both;¬    }¬¬    .words {¬      animation: crawl 70s linear 5s both;¬    }¬  }¬}¬¬/* with reduced motion:  no tilt, no movement, the whole of it to read */¬@media (prefers-reduced-motion: reduce) {¬  .cinema {¬    overflow: auto;¬¬    .long-ago,¬    .stage,¬    .words {¬      position: static;¬      opacity: 1;¬      transform: none;¬    }¬¬    .stage {¬      padding: 1em;¬    }¬  }¬}¬¬@keyframes long-ago {¬  0%,¬  100% {¬    opacity: 0;¬  }¬  20%,¬  80% {¬    opacity: 1;¬  }¬}¬¬@keyframes crawl {¬  from {¬    transform: rotateX(24deg) translateY(100%);¬  }¬  to {¬    transform: rotateX(24deg) translateY(-160%) translateZ(-900px);¬  }¬}¬¬/****************¬ * On a phone:  everything stacks, and there's room for two cards across¬ ****************/¬¬@media (max-width: 34em) {¬  .find {¬    flex-basis: 100%;¬    order: 3;¬    max-width: none;¬    margin: 0;¬  }¬¬  .logo::part(button) {¬    font-size: 1.45em;¬  }¬¬  .punch {¬    margin-inline-start: auto;¬  }¬¬  .shelf {¬    grid-template-columns: repeat(2, minmax(0, 1fr));¬  }¬}¬`)
