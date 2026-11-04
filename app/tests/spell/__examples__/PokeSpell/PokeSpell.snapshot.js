import { core, Thing, List, App, Place, h, position, withSpellPositions } from "@spell/core"

core.heading("PokéAPI:  every pokemon, and all about it")
///////////////////////////////////////////////
// ## PokéAPI:  every pokemon, and all about it
///////////////////////////////////////////////
// A server other people run, and what it holds.  No game yet:  its lists give only names, each one's page the rest.
// `poke api` is what this wrote, from looking at the server:
//   spell place ingest https://pokeapi.co/api/v2 --into PokeSpell.api.spell --name "poke api" --no-ai
//     --collections pokemon,pokemon-species,type,ability,move,evolution-chain,generation
// `spell place update PokeSpell.api.spell` looks again, and changes only this file and PokeSpell.api.json5.
// A height is in tenths of a metre, a weight in tenths of a kilogram, as PokéAPI keeps them.
//
// Pokémon belongs to Nintendo, Game Freak and Creatures.

export class Pokemon extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 1256, end: 1296 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 1300, end: 1318 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "base experience" is a number
  static { this.declareProp("baseExperience", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1322, end: 1355 } }) }
  get baseExperience() { return this.getProp("baseExperience") }
  set baseExperience(value) { this.setProp("baseExperience", value) }

  // - its "height" is a number
  static { this.declareProp("height", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1359, end: 1383 } }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  // - its "default" is yes or no, stored as "is_default"
  static { this.declareProp("default", { type: "choice", storedAs: "is_default", declaredAt: { path: "/PokeSpell.api.spell", start: 1387, end: 1437 } }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  // - its "order" is a number
  static { this.declareProp("order", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1441, end: 1464 } }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }

  // - its "weight" is a number
  static { this.declareProp("weight", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1468, end: 1492 } }) }
  get weight() { return this.getProp("weight") }
  set weight(value) { this.setProp("weight", value) }

  // - its "abilities" is a list of pokemon abilities
  static { this.declareProp("abilities", { itemType: "PokemonAbility", init: () => new List({ instanceType: "PokemonAbility" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1496, end: 1542 } }) }
  get abilities() { return this.getProp("abilities") }
  set abilities(value) { this.setProp("abilities", value) }

  // - its "past abilities" is a list of past abilities
  static { this.declareProp("pastAbilities", { itemType: "PastAbility", init: () => new List({ instanceType: "PastAbility" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1546, end: 1594 } }) }
  get pastAbilities() { return this.getProp("pastAbilities") }
  set pastAbilities(value) { this.setProp("pastAbilities", value) }

  // - its "forms" is a list of poke api names
  static { this.declareProp("forms", { itemType: "PokeApiName", init: () => new List({ instanceType: "PokeApiName" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1598, end: 1637 } }) }
  get forms() { return this.getProp("forms") }
  set forms(value) { this.setProp("forms", value) }

  // - its "game indices" is a list of game indices
  static { this.declareProp("gameIndices", { itemType: "GameIndex", init: () => new List({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1641, end: 1685 } }) }
  get gameIndices() { return this.getProp("gameIndices") }
  set gameIndices(value) { this.setProp("gameIndices", value) }

  // - its "held items" is a list of text
  static { this.declareProp("heldItems", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1689, end: 1723 } }) }
  get heldItems() { return this.getProp("heldItems") }
  set heldItems(value) { this.setProp("heldItems", value) }

  /** an address */
  // - its "location area encounters" is text
  static { this.declareProp("locationAreaEncounters", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 1727, end: 1765 } }) }
  get locationAreaEncounters() { return this.getProp("locationAreaEncounters") }
  set locationAreaEncounters(value) { this.setProp("locationAreaEncounters", value) }

  // - its "moves" is a list of pokemon moves
  static { this.declareProp("moves", { itemType: "PokemonMove", init: () => new List({ instanceType: "PokemonMove" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1784, end: 1822 } }) }
  get moves() { return this.getProp("moves") }
  set moves(value) { this.setProp("moves", value) }

  // - its "species" is a pokemon species
  static { this.declareProp("species", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 1826, end: 1860 } }) }
  get species() { return core.linked(this, "species", PokemonSpecies) }
  set species(value) { this.setProp("species", value) }

  // - its "sprites" is a sprite
  static { this.declareProp("sprites", { type: "Sprite", declaredAt: { path: "/PokeSpell.api.spell", start: 1864, end: 1889 } }) }
  get sprites() { return this.getProp("sprites") }
  set sprites(value) { this.setProp("sprites", value) }

  // - its "cries" is a cry
  static { this.declareProp("cries", { type: "Cry", declaredAt: { path: "/PokeSpell.api.spell", start: 1893, end: 1913 } }) }
  get cries() { return this.getProp("cries") }
  set cries(value) { this.setProp("cries", value) }

  // - its "stats" is a list of stats
  static { this.declareProp("stats", { itemType: "Stat", init: () => new List({ instanceType: "Stat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1917, end: 1947 } }) }
  get stats() { return this.getProp("stats") }
  set stats(value) { this.setProp("stats", value) }

  // - its "past stats" is a list of past stats
  static { this.declareProp("pastStats", { itemType: "PastStat", init: () => new List({ instanceType: "PastStat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1951, end: 1991 } }) }
  get pastStats() { return this.getProp("pastStats") }
  set pastStats(value) { this.setProp("pastStats", value) }

  // - its "types" is a list of pokemon types
  static { this.declareProp("types", { itemType: "PokemonType", init: () => new List({ instanceType: "PokemonType" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1995, end: 2033 } }) }
  get types() { return this.getProp("types") }
  set types(value) { this.setProp("types", value) }

  // - its "past types" is a list of text
  static { this.declareProp("pastTypes", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2037, end: 2071 } }) }
  get pastTypes() { return this.getProp("pastTypes") }
  set pastTypes(value) { this.setProp("pastTypes", value) }

  /** Its big picture, the official artwork */
  static { this.declareProp("picture", { declaredAt: { path: "/Pokemon.spellml", start: 422, end: 603 }, readsFrom: ["poke_api"] }) }
  get picture() {
    if (this.sprites) return this.sprites.other.officialArtwork.frontDefault
    return ""
  }

  /** What it says:  its cry, a sound file */
  static { this.declareProp("sound", { declaredAt: { path: "/Pokemon.spellml", start: 618, end: 748 }, readsFrom: ["poke_api"] }) }
  get sound() {
    if (this.cries) return this.cries.latest
    return ""
  }

  /** Is it one of your favourites? */
  static { this.declareProp("loved", { declaredAt: { path: "/Pokemon.spellml", start: 763, end: 908 }, readsFrom: ["my_favourites"] }) }
  get loved() { return core.waitedValue(this, "loved", async () => {
    const address = this.id
    return core.itemCountOf(await core.savedThings(Favourite, { filter: { address: address } })) > 0
  }, () => [this.id]) }

  /** Its heart:  keep it as a favourite, or let it go */
  async love() {
    const address = this.id
    if (core.itemCountOf(await core.savedThings(Favourite, { filter: { address: address } })) > 0) await core.inOneGo(async () => core.map(core.filter(await core.savedThings(Favourite, { filter: { address: address } }), (favourite) => favourite.address === address), (favourite) => core.removeSaved(favourite)))
    else core.saveThing(new Favourite({ name: this.name, address: address }))
  }

  /** Its card:  a click anywhere on it opens its page */
  draw() {
    return h("ui-card", {
      class: "pokemon",
      onClick: core.pressed(this, async () => await this.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-image", { class: "art", src: () => this.picture, alt: "" }),
      h("ui-content",
        h("ui-header", { class: "name", size: "large" }, () => this.name),
        h("ui-meta", "Number ", () => this.number)
      )
    )
  }

  drawPage() {
    return [
      h("ui-stack", { class: "hero", direction: "horizontal", wrap: true, align: "center" },
        h("ui-image", { class: "big art", src: () => this.picture, alt: () => this.name }),
        h("ui-stack", { class: "about", align: "start" },
          h("ui-header", { class: "title" }, () => this.name),
          h("ui-text", { class: "number", size: "huge" }, "Number ", () => this.number),
          h("ui-stack", { direction: "horizontal", wrap: true },
            h("slot", { name: "kinds" }, () => this.drawKinds())
          ),
          h("ui-text", { size: "large" },
            () => this.height / 10,
            " metres tall, and ",
            () => this.weight / 10,
            " kilograms heavy"
          ),
          h("ui-stack", { direction: "horizontal", align: "center" },
            h("slot", { name: "heart" }, () => this.drawHeart()),
            h("ui-button", {
              class: "hear",
              color: "blue",
              appearance: "circular",
              size: "massive",
              icon: "volume up",
              onClick: core.pressed(this, async () => await this.hear()),
              title: "Hear it",
              "aria-label": "Hear it",
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            })
          )
        )
      ),
      h("ui-header", { class: "section", size: "large" }, "How strong is it?"),
      h("slot", { name: "strengths" }, () => this.drawStrengths())
    ]
  }

  // Full and red when it's a favourite;  press it to change
  static drawsWaiting = true
  drawHeart() {
    if (this.loved) {
      return h("ui-button", {
        class: "heart",
        color: "red",
        appearance: "circular",
        size: "massive",
        icon: "heart",
        onClick: core.pressed(this, async () => await this.love()),
        title: "One of my favourites",
        "aria-label": "One of my favourites",
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
        part: "heart"
      })
    } else {
      return h("ui-button", {
        class: "heart",
        appearance: "circular",
        size: "massive",
        icon: "heart outline",
        onClick: core.pressed(this, async () => await this.love()),
        title: "Keep it as a favourite",
        "aria-label": "Keep it as a favourite",
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
        part: "heart"
      })
    }
  }

  static drawsWaiting = true
  drawKinds() {
    return core.drawEach(this.types, (type) => core.drawThing(type))
  }

  // A bar for each of its six numbers:  255 is as strong as any Pokémon gets
  drawStrengths() {
    return core.drawEach(this.stats, withSpellPositions((stat, place) => h("ui-progress", {
      class: "strength",
      value: () => stat.baseStat,
      total: "255",
      color: "green",
      size: "large",
      label: () => `${core.getItemAt(strengthWords, position(place))}:  {value}`,
      part: "strengths"
    })))
  }

  async hear() {
    pokedex.hearing = undefined
    await core.pauseFor(50, "msec")
    pokedex.hearing = this
  }

  async guess() {
    pokedex.game.guessed = this
  }

  async open() {
    if (await core.answerOf(pokedex, "showing")) core.append(await core.answerOf(pokedex, "trail"), await core.answerOf(pokedex, "showing"))
    pokedex.search = ""
    pokedex.showing = this
    core.scrollToTop()
  }

  static savedIn = { place: "poke_api", collection: "pokemon", select: ["number", "name", "height", "weight", "sprites", "cries", "stats", "types"] }
}

export class PokemonSpecies extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 2132, end: 2172 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2176, end: 2194 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "order" is a number
  static { this.declareProp("order", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2198, end: 2221 } }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }

  // - its "gender rate" is a number
  static { this.declareProp("genderRate", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2225, end: 2254 } }) }
  get genderRate() { return this.getProp("genderRate") }
  set genderRate(value) { this.setProp("genderRate", value) }

  // - its "capture rate" is a number
  static { this.declareProp("captureRate", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2258, end: 2288 } }) }
  get captureRate() { return this.getProp("captureRate") }
  set captureRate(value) { this.setProp("captureRate", value) }

  // - its "base happiness" is a number
  static { this.declareProp("baseHappiness", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2292, end: 2324 } }) }
  get baseHappiness() { return this.getProp("baseHappiness") }
  set baseHappiness(value) { this.setProp("baseHappiness", value) }

  // - its "baby" is yes or no, stored as "is_baby"
  static { this.declareProp("baby", { type: "choice", storedAs: "is_baby", declaredAt: { path: "/PokeSpell.api.spell", start: 2328, end: 2372 } }) }
  get baby() { return this.getProp("baby") }
  set baby(value) { this.setProp("baby", value) }

  // - its "legendary" is yes or no, stored as "is_legendary"
  static { this.declareProp("legendary", { type: "choice", storedAs: "is_legendary", declaredAt: { path: "/PokeSpell.api.spell", start: 2376, end: 2430 } }) }
  get legendary() { return this.getProp("legendary") }
  set legendary(value) { this.setProp("legendary", value) }

  // - its "mythical" is yes or no, stored as "is_mythical"
  static { this.declareProp("mythical", { type: "choice", storedAs: "is_mythical", declaredAt: { path: "/PokeSpell.api.spell", start: 2434, end: 2486 } }) }
  get mythical() { return this.getProp("mythical") }
  set mythical(value) { this.setProp("mythical", value) }

  // - its "hatch counter" is a number
  static { this.declareProp("hatchCounter", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2490, end: 2521 } }) }
  get hatchCounter() { return this.getProp("hatchCounter") }
  set hatchCounter(value) { this.setProp("hatchCounter", value) }

  // - its "gender differences" is yes or no, stored as "has_gender_differences"
  static { this.declareProp("genderDifferences", { type: "choice", storedAs: "has_gender_differences", declaredAt: { path: "/PokeSpell.api.spell", start: 2525, end: 2598 } }) }
  get genderDifferences() { return this.getProp("genderDifferences") }
  set genderDifferences(value) { this.setProp("genderDifferences", value) }

  // - its "forms switchable" is yes or no
  static { this.declareProp("formsSwitchable", { type: "choice", declaredAt: { path: "/PokeSpell.api.spell", start: 2602, end: 2637 } }) }
  get formsSwitchable() { return this.getProp("formsSwitchable") }
  set formsSwitchable(value) { this.setProp("formsSwitchable", value) }

  // - its "growth rate" is a poke api name
  static { this.declareProp("growthRate", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2641, end: 2677 } }) }
  get growthRate() { return this.getProp("growthRate") }
  set growthRate(value) { this.setProp("growthRate", value) }

  // - its "pokedex numbers" is a list of pokedex numbers
  static { this.declareProp("pokedexNumbers", { itemType: "PokedexNumber", init: () => new List({ instanceType: "PokedexNumber" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2681, end: 2731 } }) }
  get pokedexNumbers() { return this.getProp("pokedexNumbers") }
  set pokedexNumbers(value) { this.setProp("pokedexNumbers", value) }

  // - its "egg groups" is a list of poke api names
  static { this.declareProp("eggGroups", { itemType: "PokeApiName", init: () => new List({ instanceType: "PokeApiName" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2735, end: 2779 } }) }
  get eggGroups() { return this.getProp("eggGroups") }
  set eggGroups(value) { this.setProp("eggGroups", value) }

  // - its "color" is a poke api name
  static { this.declareProp("color", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2783, end: 2813 } }) }
  get color() { return this.getProp("color") }
  set color(value) { this.setProp("color", value) }

  // - its "shape" is a poke api name
  static { this.declareProp("shape", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2817, end: 2847 } }) }
  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  // - its "evolves from species" is a pokemon species
  static { this.declareProp("evolvesFromSpecies", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2851, end: 2898 } }) }
  get evolvesFromSpecies() { return core.linked(this, "evolvesFromSpecies", PokemonSpecies) }
  set evolvesFromSpecies(value) { this.setProp("evolvesFromSpecies", value) }

  // - its "evolution chain" is an evolution chain
  static { this.declareProp("evolutionChain", { type: "EvolutionChain", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2902, end: 2945 } }) }
  get evolutionChain() { return core.linked(this, "evolutionChain", EvolutionChain) }
  set evolutionChain(value) { this.setProp("evolutionChain", value) }

  // - its "habitat" is a poke api name
  static { this.declareProp("habitat", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2949, end: 2981 } }) }
  get habitat() { return this.getProp("habitat") }
  set habitat(value) { this.setProp("habitat", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2985, end: 3017 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3021, end: 3051 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "pal park encounters" is a list of pal park encounters
  static { this.declareProp("palParkEncounters", { itemType: "PalParkEncounter", init: () => new List({ instanceType: "PalParkEncounter" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3055, end: 3113 } }) }
  get palParkEncounters() { return this.getProp("palParkEncounters") }
  set palParkEncounters(value) { this.setProp("palParkEncounters", value) }

  // - its "form descriptions" is a list of text
  static { this.declareProp("formDescriptions", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3117, end: 3158 } }) }
  get formDescriptions() { return this.getProp("formDescriptions") }
  set formDescriptions(value) { this.setProp("formDescriptions", value) }

  // - its "flavor text entries" is a list of flavor text entries
  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3162, end: 3220 } }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  // - its "genera" is a list of genera
  static { this.declareProp("genera", { itemType: "Genus", init: () => new List({ instanceType: "Genus" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3224, end: 3256 } }) }
  get genera() { return this.getProp("genera") }
  set genera(value) { this.setProp("genera", value) }

  // - its "varieties" is a list of varieties
  static { this.declareProp("varieties", { itemType: "Variety", init: () => new List({ instanceType: "Variety" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3260, end: 3298 } }) }
  get varieties() { return this.getProp("varieties") }
  set varieties(value) { this.setProp("varieties", value) }

  static savedIn = { place: "poke_api", collection: "pokemon_species", select: ["number", "name"] }
}

export class Type extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3348, end: 3388 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3392, end: 3410 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "damage relations" is a damage relation
  static { this.declareProp("damageRelations", { type: "DamageRelation", declaredAt: { path: "/PokeSpell.api.spell", start: 3414, end: 3457 } }) }
  get damageRelations() { return this.getProp("damageRelations") }
  set damageRelations(value) { this.setProp("damageRelations", value) }

  // - its "past damage relations" is a list of text
  static { this.declareProp("pastDamageRelations", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3461, end: 3506 } }) }
  get pastDamageRelations() { return this.getProp("pastDamageRelations") }
  set pastDamageRelations(value) { this.setProp("pastDamageRelations", value) }

  // - its "game indices" is a list of game indices
  static { this.declareProp("gameIndices", { itemType: "GameIndex", init: () => new List({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3510, end: 3554 } }) }
  get gameIndices() { return this.getProp("gameIndices") }
  set gameIndices(value) { this.setProp("gameIndices", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3558, end: 3590 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "move damage class" is a poke api name
  static { this.declareProp("moveDamageClass", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 3594, end: 3636 } }) }
  get moveDamageClass() { return this.getProp("moveDamageClass") }
  set moveDamageClass(value) { this.setProp("moveDamageClass", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3640, end: 3670 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "pokemon" is a list of type pokemon
  static { this.declareProp("pokemon", { itemType: "TypePokemon", init: () => new List({ instanceType: "TypePokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3674, end: 3713 } }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3717, end: 3747 } }) }
  get moves() { return core.linked(this, "moves", Move) }
  set moves(value) { this.setProp("moves", value) }

  /** Two kinds no Pokémon is:  only in the games' code */
  static { this.declareProp("isReal", { declaredAt: { path: "/Pokemon.spellml", start: 3311, end: 3486 }, readsFrom: ["poke_api"] }) }
  get isReal() {
    return this.name !== "unknown" && this.name !== "shadow" && this.name !== "stellar"
  }

  /** Each kind's colour, as the games paint it */
  static { this.declareProp("colour", { declaredAt: { path: "/Pokemon.spellml", start: 3499, end: 4205 }, readsFrom: ["poke_api"] }) }
  get colour() {
    if (this.name === "fire") return "red"
    if (this.name === "water" || this.name === "ice") return "blue"
    if (this.name === "grass" || this.name === "bug") return "green"
    if (this.name === "electric") return "yellow"
    if (this.name === "psychic" || this.name === "fairy") return "pink"
    if (this.name === "poison" || this.name === "ghost") return "purple"
    if (this.name === "dragon") return "violet"
    if (this.name === "ground" || this.name === "rock" || this.name === "fighting") return "brown"
    if (this.name === "flying") return "teal"
    if (this.name === "dark") return "black"
    if (this.name === "steel") return "grey"
    return "orange"
  }

  /** A big button:  press it to see every Pokémon of this kind */
  draw() {
    return h("ui-button", {
      class: "kind",
      color: () => this.colour,
      size: "large",
      onClick: core.pressed(this, async () => await this.pick()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    }, () => this.name)
  }

  ////////////////////////////////////////////////////
  // ## What a Pokémon or a kind can do, from anywhere
  ////////////////////////////////////////////////////
  // Only this file can name the pokedex:  so its other files ask these.

  async pick() {
    pokedex.pickedKind = this
    pokedex.showing = undefined
  }

  static savedIn = { place: "poke_api", collection: "types", select: ["number", "name", "pokemon"] }
}

export class Ability extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3801, end: 3841 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3845, end: 3863 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "main series" is yes or no, stored as "is_main_series"
  static { this.declareProp("mainSeries", { type: "choice", storedAs: "is_main_series", declaredAt: { path: "/PokeSpell.api.spell", start: 3867, end: 3925 } }) }
  get mainSeries() { return this.getProp("mainSeries") }
  set mainSeries(value) { this.setProp("mainSeries", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3929, end: 3961 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3965, end: 3995 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "effect entries" is a list of effect entries
  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3999, end: 4047 } }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  // - its "effect changes" is a list of effect changes
  static { this.declareProp("effectChanges", { itemType: "EffectChange", init: () => new List({ instanceType: "EffectChange" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4051, end: 4099 } }) }
  get effectChanges() { return this.getProp("effectChanges") }
  set effectChanges(value) { this.setProp("effectChanges", value) }

  // - its "flavor text entries" is a list of flavor text entries
  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4103, end: 4161 } }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  // - its "pokemon" is a list of ability pokemon
  static { this.declareProp("pokemon", { itemType: "AbilityPokemon", init: () => new List({ instanceType: "AbilityPokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4165, end: 4207 } }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }

  static savedIn = { place: "poke_api", collection: "abilities", select: ["number", "name", "pokemon"] }
}

export class Move extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 4257, end: 4297 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4301, end: 4319 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "accuracy" is a number
  static { this.declareProp("accuracy", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4323, end: 4349 } }) }
  get accuracy() { return this.getProp("accuracy") }
  set accuracy(value) { this.setProp("accuracy", value) }

  // - its "pp" is a number
  static { this.declareProp("pp", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4353, end: 4373 } }) }
  get pp() { return this.getProp("pp") }
  set pp(value) { this.setProp("pp", value) }

  // - its "priority" is a number
  static { this.declareProp("priority", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4377, end: 4403 } }) }
  get priority() { return this.getProp("priority") }
  set priority(value) { this.setProp("priority", value) }

  // - its "power" is a number
  static { this.declareProp("power", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4407, end: 4430 } }) }
  get power() { return this.getProp("power") }
  set power(value) { this.setProp("power", value) }

  // - its "contest combos" is a contest combo
  static { this.declareProp("contestCombos", { type: "ContestCombo", declaredAt: { path: "/PokeSpell.api.spell", start: 4434, end: 4473 } }) }
  get contestCombos() { return this.getProp("contestCombos") }
  set contestCombos(value) { this.setProp("contestCombos", value) }

  // - its "contest type" is a poke api name
  static { this.declareProp("contestType", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4477, end: 4514 } }) }
  get contestType() { return this.getProp("contestType") }
  set contestType(value) { this.setProp("contestType", value) }

  // - its "contest effect" is a poke api name
  static { this.declareProp("contestEffect", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4518, end: 4557 } }) }
  get contestEffect() { return this.getProp("contestEffect") }
  set contestEffect(value) { this.setProp("contestEffect", value) }

  // - its "damage class" is a poke api name
  static { this.declareProp("damageClass", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4561, end: 4598 } }) }
  get damageClass() { return this.getProp("damageClass") }
  set damageClass(value) { this.setProp("damageClass", value) }

  // - its "effect entries" is a list of effect entries
  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4602, end: 4650 } }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  // - its "effect changes" is a list of text
  static { this.declareProp("effectChanges", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4654, end: 4692 } }) }
  get effectChanges() { return this.getProp("effectChanges") }
  set effectChanges(value) { this.setProp("effectChanges", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 4696, end: 4728 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "meta" is a meta
  static { this.declareProp("meta", { type: "Meta", declaredAt: { path: "/PokeSpell.api.spell", start: 4732, end: 4752 } }) }
  get meta() { return this.getProp("meta") }
  set meta(value) { this.setProp("meta", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4756, end: 4786 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "past values" is a list of past values
  static { this.declareProp("pastValues", { itemType: "PastValue", init: () => new List({ instanceType: "PastValue" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4790, end: 4832 } }) }
  get pastValues() { return this.getProp("pastValues") }
  set pastValues(value) { this.setProp("pastValues", value) }

  // - its "stat changes" is a list of text
  static { this.declareProp("statChanges", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4836, end: 4872 } }) }
  get statChanges() { return this.getProp("statChanges") }
  set statChanges(value) { this.setProp("statChanges", value) }

  // - its "super contest effect" is a poke api name
  static { this.declareProp("superContestEffect", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4876, end: 4921 } }) }
  get superContestEffect() { return this.getProp("superContestEffect") }
  set superContestEffect(value) { this.setProp("superContestEffect", value) }

  // - its "target" is a poke api name
  static { this.declareProp("target", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4925, end: 4956 } }) }
  get target() { return this.getProp("target") }
  set target(value) { this.setProp("target", value) }

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 4960, end: 4998 } }) }
  get kind() { return core.linked(this, "kind", Type) }
  set kind(value) { this.setProp("kind", value) }

  // - its "machines" is a list of text
  static { this.declareProp("machines", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5002, end: 5034 } }) }
  get machines() { return this.getProp("machines") }
  set machines(value) { this.setProp("machines", value) }

  // - its "flavor text entries" is a list of flavor text entries
  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5038, end: 5096 } }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  // - its "learned by pokemon" is a list of pokemon
  static { this.declareProp("learnedByPokemon", { itemType: "Pokemon", init: () => new List({ instanceType: "Pokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5100, end: 5145 } }) }
  get learnedByPokemon() { return core.linked(this, "learnedByPokemon", Pokemon) }
  set learnedByPokemon(value) { this.setProp("learnedByPokemon", value) }

  static savedIn = { place: "poke_api", collection: "moves", select: ["number", "name", "kind"] }
}

export class EvolutionChain extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5207, end: 5247 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "chain" is a chain
  static { this.declareProp("chain", { type: "Chain", declaredAt: { path: "/PokeSpell.api.spell", start: 5251, end: 5273 } }) }
  get chain() { return this.getProp("chain") }
  set chain(value) { this.setProp("chain", value) }

  static savedIn = { place: "poke_api", collection: "evolution_chains", select: ["number"] }
}

export class Generation extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5329, end: 5369 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 5373, end: 5391 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "abilities" is a list of text
  static { this.declareProp("abilities", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5395, end: 5428 } }) }
  get abilities() { return this.getProp("abilities") }
  set abilities(value) { this.setProp("abilities", value) }

  // - its "main region" is a poke api name
  static { this.declareProp("mainRegion", { type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 5432, end: 5468 } }) }
  get mainRegion() { return this.getProp("mainRegion") }
  set mainRegion(value) { this.setProp("mainRegion", value) }

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5472, end: 5502 } }) }
  get moves() { return core.linked(this, "moves", Move) }
  set moves(value) { this.setProp("moves", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5506, end: 5536 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "pokemon species" is a list of pokemon species
  static { this.declareProp("pokemonSpecies", { itemType: "PokemonSpecies", init: () => new List({ instanceType: "PokemonSpecies" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5540, end: 5590 } }) }
  get pokemonSpecies() { return this.getProp("pokemonSpecies") }
  set pokemonSpecies(value) { this.setProp("pokemonSpecies", value) }

  // - its "types" is a list of types
  static { this.declareProp("types", { itemType: "Type", init: () => new List({ instanceType: "Type" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5594, end: 5624 } }) }
  get types() { return core.linked(this, "types", Type) }
  set types(value) { this.setProp("types", value) }

  // - its "version groups" is a list of poke api names
  static { this.declareProp("versionGroups", { itemType: "PokeApiName", init: () => new List({ instanceType: "PokeApiName" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5628, end: 5676 } }) }
  get versionGroups() { return this.getProp("versionGroups") }
  set versionGroups(value) { this.setProp("versionGroups", value) }

  static savedIn = { place: "poke_api", collection: "generations", select: ["number", "name", "types"] }
}

export class PokemonAbility extends Thing {
  // - its "hidden" is yes or no, stored as "is_hidden"
  static { this.declareProp("hidden", { type: "choice", storedAs: "is_hidden" }) }
  get hidden() { return this.getProp("hidden") }
  set hidden(value) { this.setProp("hidden", value) }

  // - its "slot" is a number
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  // - its "ability" is an ability
  static { this.declareProp("ability", { type: "Ability", link: true }) }
  get ability() { return core.linked(this, "ability", Ability) }
  set ability(value) { this.setProp("ability", value) }
}

export class PastAbility extends Thing {
  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "abilities" is a list of past ability abilities
  static { this.declareProp("abilities", { itemType: "PastAbilityAbility", init: () => new List({ instanceType: "PastAbilityAbility" }) }) }
  get abilities() { return this.getProp("abilities") }
  set abilities(value) { this.setProp("abilities", value) }
}

export class PastAbilityAbility extends Thing {
  // - its "hidden" is yes or no, stored as "is_hidden"
  static { this.declareProp("hidden", { type: "choice", storedAs: "is_hidden" }) }
  get hidden() { return this.getProp("hidden") }
  set hidden(value) { this.setProp("hidden", value) }

  // - its "slot" is a number
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }
}

export class GameIndex extends Thing {
  // - its "game index" is a number
  static { this.declareProp("gameIndex", { type: "number" }) }
  get gameIndex() { return this.getProp("gameIndex") }
  set gameIndex(value) { this.setProp("gameIndex", value) }

  // - its "version" is a poke api name
  static { this.declareProp("version", { type: "PokeApiName" }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }
}

export class PokemonMove extends Thing {
  // - its "move" is a move
  static { this.declareProp("move", { type: "Move", link: true }) }
  get move() { return core.linked(this, "move", Move) }
  set move(value) { this.setProp("move", value) }

  // - its "version group details" is a list of version group details
  static { this.declareProp("versionGroupDetails", { itemType: "VersionGroupDetail", init: () => new List({ instanceType: "VersionGroupDetail" }) }) }
  get versionGroupDetails() { return this.getProp("versionGroupDetails") }
  set versionGroupDetails(value) { this.setProp("versionGroupDetails", value) }
}

export class VersionGroupDetail extends Thing {
  // - its "level learned at" is a number
  static { this.declareProp("levelLearnedAt", { type: "number" }) }
  get levelLearnedAt() { return this.getProp("levelLearnedAt") }
  set levelLearnedAt(value) { this.setProp("levelLearnedAt", value) }

  // - its "version group" is a poke api name
  static { this.declareProp("versionGroup", { type: "PokeApiName" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }

  // - its "move learn method" is a poke api name
  static { this.declareProp("moveLearnMethod", { type: "PokeApiName" }) }
  get moveLearnMethod() { return this.getProp("moveLearnMethod") }
  set moveLearnMethod(value) { this.setProp("moveLearnMethod", value) }

  // - its "order" is a number
  static { this.declareProp("order", { type: "number" }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }
}

export class Sprite extends Thing {
  // - its "other" is an other
  static { this.declareProp("other", { type: "Other" }) }
  get other() { return this.getProp("other") }
  set other(value) { this.setProp("other", value) }

  /** an address */
  // - its "back shiny" is text
  static { this.declareProp("backShiny", { type: "text" }) }
  get backShiny() { return this.getProp("backShiny") }
  set backShiny(value) { this.setProp("backShiny", value) }

  /** an address */
  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  /** an address */
  // - its "back default" is text
  static { this.declareProp("backDefault", { type: "text" }) }
  get backDefault() { return this.getProp("backDefault") }
  set backDefault(value) { this.setProp("backDefault", value) }

  /** an address */
  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Other extends Thing {
  // - its "home" is a home
  static { this.declareProp("home", { type: "Home" }) }
  get home() { return this.getProp("home") }
  set home(value) { this.setProp("home", value) }

  // - its "showdown" is a showdown
  static { this.declareProp("showdown", { type: "Showdown" }) }
  get showdown() { return this.getProp("showdown") }
  set showdown(value) { this.setProp("showdown", value) }

  // - its "dream world" is a dream world
  static { this.declareProp("dreamWorld", { type: "DreamWorld" }) }
  get dreamWorld() { return this.getProp("dreamWorld") }
  set dreamWorld(value) { this.setProp("dreamWorld", value) }

  // - its "official artwork" is an official artwork
  static { this.declareProp("officialArtwork", { type: "OfficialArtwork" }) }
  get officialArtwork() { return this.getProp("officialArtwork") }
  set officialArtwork(value) { this.setProp("officialArtwork", value) }
}

export class Home extends Thing {
  /** an address */
  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  /** an address */
  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Showdown extends Thing {
  /** an address */
  // - its "back shiny" is text
  static { this.declareProp("backShiny", { type: "text" }) }
  get backShiny() { return this.getProp("backShiny") }
  set backShiny(value) { this.setProp("backShiny", value) }

  /** an address */
  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  /** an address */
  // - its "back default" is text
  static { this.declareProp("backDefault", { type: "text" }) }
  get backDefault() { return this.getProp("backDefault") }
  set backDefault(value) { this.setProp("backDefault", value) }

  /** an address */
  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class DreamWorld extends Thing {
  /** an address */
  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class OfficialArtwork extends Thing {
  /** an address */
  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  /** an address */
  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Cry extends Thing {
  /** an address */
  // - its "latest" is text
  static { this.declareProp("latest", { type: "text" }) }
  get latest() { return this.getProp("latest") }
  set latest(value) { this.setProp("latest", value) }

  /** an address */
  // - its "legacy" is text
  static { this.declareProp("legacy", { type: "text" }) }
  get legacy() { return this.getProp("legacy") }
  set legacy(value) { this.setProp("legacy", value) }
}

export class Stat extends Thing {
  // - its "base stat" is a number
  static { this.declareProp("baseStat", { type: "number" }) }
  get baseStat() { return this.getProp("baseStat") }
  set baseStat(value) { this.setProp("baseStat", value) }

  // - its "effort" is a number
  static { this.declareProp("effort", { type: "number" }) }
  get effort() { return this.getProp("effort") }
  set effort(value) { this.setProp("effort", value) }

  // - its "stat" is a poke api name
  static { this.declareProp("stat", { type: "PokeApiName" }) }
  get stat() { return this.getProp("stat") }
  set stat(value) { this.setProp("stat", value) }
}

export class PastStat extends Thing {
  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "stats" is a list of stats
  static { this.declareProp("stats", { itemType: "Stat", init: () => new List({ instanceType: "Stat" }) }) }
  get stats() { return this.getProp("stats") }
  set stats(value) { this.setProp("stats", value) }
}

export class PokemonType extends Thing {
  // - its "slot" is a number
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true }) }
  get kind() { return core.linked(this, "kind", Type) }
  set kind(value) { this.setProp("kind", value) }

  static drawsWaiting = true
  draw() {
    return h("ui-label", { class: "kind", color: () => this.kind.colour, size: "huge" },
      () => core.whileWaiting(() => this.kind.name)
    )
  }
}

export class PokedexNumber extends Thing {
  // - its "entry number" is a number
  static { this.declareProp("entryNumber", { type: "number" }) }
  get entryNumber() { return this.getProp("entryNumber") }
  set entryNumber(value) { this.setProp("entryNumber", value) }

  // - its "pokedex" is a poke api name
  static { this.declareProp("pokedex", { type: "PokeApiName" }) }
  get pokedex() { return this.getProp("pokedex") }
  set pokedex(value) { this.setProp("pokedex", value) }
}

export class Name extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "language" is a poke api name
  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class PalParkEncounter extends Thing {
  // - its "base score" is a number
  static { this.declareProp("baseScore", { type: "number" }) }
  get baseScore() { return this.getProp("baseScore") }
  set baseScore(value) { this.setProp("baseScore", value) }

  // - its "rate" is a number
  static { this.declareProp("rate", { type: "number" }) }
  get rate() { return this.getProp("rate") }
  set rate(value) { this.setProp("rate", value) }

  // - its "area" is a poke api name
  static { this.declareProp("area", { type: "PokeApiName" }) }
  get area() { return this.getProp("area") }
  set area(value) { this.setProp("area", value) }
}

export class FlavorTextEntry extends Thing {
  // - its "flavor text" is text
  static { this.declareProp("flavorText", { type: "text" }) }
  get flavorText() { return this.getProp("flavorText") }
  set flavorText(value) { this.setProp("flavorText", value) }

  // - its "language" is a poke api name
  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "version" is a poke api name
  static { this.declareProp("version", { type: "PokeApiName" }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }
}

export class Genus extends Thing {
  // - its "genus" is text
  static { this.declareProp("genus", { type: "text" }) }
  get genus() { return this.getProp("genus") }
  set genus(value) { this.setProp("genus", value) }

  // - its "language" is a poke api name
  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class Variety extends Thing {
  // - its "default" is yes or no, stored as "is_default"
  static { this.declareProp("default", { type: "choice", storedAs: "is_default" }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon() { return core.linked(this, "pokemon", Pokemon) }
  set pokemon(value) { this.setProp("pokemon", value) }
}

export class DamageRelation extends Thing {
  // - its "no damage to" is a list of types
  static { this.declareProp("noDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get noDamageTo() { return core.linked(this, "noDamageTo", Type) }
  set noDamageTo(value) { this.setProp("noDamageTo", value) }

  // - its "half damage to" is a list of types
  static { this.declareProp("halfDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get halfDamageTo() { return core.linked(this, "halfDamageTo", Type) }
  set halfDamageTo(value) { this.setProp("halfDamageTo", value) }

  // - its "double damage to" is a list of types
  static { this.declareProp("doubleDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get doubleDamageTo() { return core.linked(this, "doubleDamageTo", Type) }
  set doubleDamageTo(value) { this.setProp("doubleDamageTo", value) }

  // - its "no damage from" is a list of types
  static { this.declareProp("noDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get noDamageFrom() { return core.linked(this, "noDamageFrom", Type) }
  set noDamageFrom(value) { this.setProp("noDamageFrom", value) }

  // - its "half damage from" is a list of types
  static { this.declareProp("halfDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get halfDamageFrom() { return core.linked(this, "halfDamageFrom", Type) }
  set halfDamageFrom(value) { this.setProp("halfDamageFrom", value) }

  // - its "double damage from" is a list of types
  static { this.declareProp("doubleDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get doubleDamageFrom() { return core.linked(this, "doubleDamageFrom", Type) }
  set doubleDamageFrom(value) { this.setProp("doubleDamageFrom", value) }
}

export class TypePokemon extends Thing {
  // - its "slot" is a number
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon() { return core.linked(this, "pokemon", Pokemon) }
  set pokemon(value) { this.setProp("pokemon", value) }

  static drawsWaiting = true
  draw() {
    return core.drawThing(this.pokemon)
  }
}

export class EffectEntry extends Thing {
  // - its "effect" is text
  static { this.declareProp("effect", { type: "text" }) }
  get effect() { return this.getProp("effect") }
  set effect(value) { this.setProp("effect", value) }

  // - its "short effect" is text
  static { this.declareProp("shortEffect", { type: "text" }) }
  get shortEffect() { return this.getProp("shortEffect") }
  set shortEffect(value) { this.setProp("shortEffect", value) }

  // - its "language" is a poke api name
  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class EffectChange extends Thing {
  // - its "version group" is a poke api name
  static { this.declareProp("versionGroup", { type: "PokeApiName" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }

  // - its "effect entries" is a list of effect entries
  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }) }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }
}

export class AbilityPokemon extends Thing {
  // - its "hidden" is yes or no, stored as "is_hidden"
  static { this.declareProp("hidden", { type: "choice", storedAs: "is_hidden" }) }
  get hidden() { return this.getProp("hidden") }
  set hidden(value) { this.setProp("hidden", value) }

  // - its "slot" is a number
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon() { return core.linked(this, "pokemon", Pokemon) }
  set pokemon(value) { this.setProp("pokemon", value) }
}

export class ContestCombo extends Thing {
  // - its "normal" is a normal
  static { this.declareProp("normal", { type: "Normal" }) }
  get normal() { return this.getProp("normal") }
  set normal(value) { this.setProp("normal", value) }

  // - its "super" is a super
  static { this.declareProp("super", { type: "Super" }) }
  get super() { return this.getProp("super") }
  set super(value) { this.setProp("super", value) }
}

export class Normal extends Thing {
  // - its "use before" is a list of moves
  static { this.declareProp("useBefore", { itemType: "Move", init: () => new List({ instanceType: "Move" }) }) }
  get useBefore() { return core.linked(this, "useBefore", Move) }
  set useBefore(value) { this.setProp("useBefore", value) }

  // - its "use after" is a list of moves
  static { this.declareProp("useAfter", { itemType: "Move", init: () => new List({ instanceType: "Move" }) }) }
  get useAfter() { return core.linked(this, "useAfter", Move) }
  set useAfter(value) { this.setProp("useAfter", value) }
}

export class Super extends Thing {}

export class Meta extends Thing {
  // - its "ailment" is a poke api name
  static { this.declareProp("ailment", { type: "PokeApiName" }) }
  get ailment() { return this.getProp("ailment") }
  set ailment(value) { this.setProp("ailment", value) }

  // - its "category" is a poke api name
  static { this.declareProp("category", { type: "PokeApiName" }) }
  get category() { return this.getProp("category") }
  set category(value) { this.setProp("category", value) }

  // - its "drain" is a number
  static { this.declareProp("drain", { type: "number" }) }
  get drain() { return this.getProp("drain") }
  set drain(value) { this.setProp("drain", value) }

  // - its "healing" is a number
  static { this.declareProp("healing", { type: "number" }) }
  get healing() { return this.getProp("healing") }
  set healing(value) { this.setProp("healing", value) }

  // - its "crit rate" is a number
  static { this.declareProp("critRate", { type: "number" }) }
  get critRate() { return this.getProp("critRate") }
  set critRate(value) { this.setProp("critRate", value) }

  // - its "ailment chance" is a number
  static { this.declareProp("ailmentChance", { type: "number" }) }
  get ailmentChance() { return this.getProp("ailmentChance") }
  set ailmentChance(value) { this.setProp("ailmentChance", value) }

  // - its "flinch chance" is a number
  static { this.declareProp("flinchChance", { type: "number" }) }
  get flinchChance() { return this.getProp("flinchChance") }
  set flinchChance(value) { this.setProp("flinchChance", value) }

  // - its "stat chance" is a number
  static { this.declareProp("statChance", { type: "number" }) }
  get statChance() { return this.getProp("statChance") }
  set statChance(value) { this.setProp("statChance", value) }
}

export class PastValue extends Thing {
  // - its "effect entries" is a list of text
  static { this.declareProp("effectEntries", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true }) }
  get kind() { return core.linked(this, "kind", Type) }
  set kind(value) { this.setProp("kind", value) }

  // - its "version group" is a poke api name
  static { this.declareProp("versionGroup", { type: "PokeApiName" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }
}

export class Chain extends Thing {
  // - its "baby" is yes or no, stored as "is_baby"
  static { this.declareProp("baby", { type: "choice", storedAs: "is_baby" }) }
  get baby() { return this.getProp("baby") }
  set baby(value) { this.setProp("baby", value) }

  // - its "species" is a pokemon species
  static { this.declareProp("species", { type: "PokemonSpecies", link: true }) }
  get species() { return core.linked(this, "species", PokemonSpecies) }
  set species(value) { this.setProp("species", value) }

  // - its "evolution details" is a list of text
  static { this.declareProp("evolutionDetails", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get evolutionDetails() { return this.getProp("evolutionDetails") }
  set evolutionDetails(value) { this.setProp("evolutionDetails", value) }

  // - its "evolves to" is a list of chains
  static { this.declareProp("evolvesTo", { itemType: "Chain", init: () => new List({ instanceType: "Chain" }) }) }
  get evolvesTo() { return this.getProp("evolvesTo") }
  set evolvesTo(value) { this.setProp("evolvesTo", value) }
}

export class PokeApiName extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** never read:  its collection wasn't asked for */
  // - its "address" is text, stored as "url"
  static { this.declareProp("address", { type: "text", storedAs: "url" }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }
}

export class PokeApi extends Place {}
export const pokeApi = core.place(new PokeApi(), {
  name: "poke_api",
  kind: "web server",
  at: "https://pokeapi.co/api/v2",
  idColumn: "url",
  rowsIn: "results",
  nextPageIn: "next",
  pageSize: 2000,
  listsGive: ["name"],
  checkedEvery: 86400,
  namesLike: "base_experience",
  collections: {
    pokemon: { at: "/pokemon" },
    pokemonSpecies: { at: "/pokemon-species" },
    types: { at: "/type" },
    abilities: { at: "/ability" },
    moves: { at: "/move" },
    evolutionChains: { at: "/evolution-chain" },
    generations: { at: "/generation" }
  }, firstReads: () => [[Pokemon], [Type]] })

// -----------
core.heading("Your favourites:  kept on this device")
///////////////////////////////////////////
// ## Your favourites:  kept on this device
///////////////////////////////////////////

export class Favourite extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/Favourites.api.spell", start: 316, end: 334 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** the pokemon's own, at PokéAPI */
  // - its "address" is text
  static { this.declareProp("address", { type: "text", declaredAt: { path: "/Favourites.api.spell", start: 338, end: 359 } }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }

  static { this.declareProp("pokemon", { declaredAt: { path: "/Pokemon.spellml", start: 4863, end: 4918 }, readsFrom: ["poke_api", "my_favourites"] }) }
  get pokemon() { return core.waitedValue(this, "pokemon", async () => {
    return await core.savedThingWithId(Pokemon, this.address)
  }, () => [this.address]) }

  static drawsWaiting = true
  draw() {
    return core.drawThing(this.pokemon)
  }

  static savedIn = { place: "my_favourites", collection: "favourites" }
}

/**
 * The Pokémon you love, kept in this browser, beside PokéAPI's own:  one program shows both.
 * Change the next line to keep them somewhere else, and nothing else changes.
 */
export class MyFavourite extends Place {}
export const myFavourites = core.place(new MyFavourite(), { name: "my_favourites", kind: "database on this device" })

// -----------
core.heading("A Pokémon:  its card, and its own page")
////////////////////////////////////////////
// ## A Pokémon:  its card, and its own page
////////////////////////////////////////////
// Each adds to its type in PokeSpell.api.spell, with `<spell-more-of>`:  so looking at PokéAPI again never touches a line of this.

/** What each of a Pokémon's six numbers means, in plain words:  PokéAPI always lists them in this order */
export const strengthWords = ["Health", "Attack", "Defence", "Special attack", "Special defence", "Speed"]

core.heading("A kind of Pokémon:  fire, water, grass ...")
//# A kind of Pokémon:  fire, water, grass ...

// One of a Pokémon's kinds:  a label of its colour

// One Pokémon of a kind

core.heading("A favourite:  kept on this device, it draws the Pokémon it's of")
//# A favourite:  kept on this device, it draws the Pokémon it's of

// -----------
core.heading("Who's that Pokémon?")
/////////////////////////
// ## Who's that Pokémon?
/////////////////////////
// A Pokémon hides in its shadow:  pick its name from four, and it steps into the light.
// Only the first 151, from the very first games:  their names are the ones most kids know.

export class Guess extends Thing {
  // - its "hiding" is a pokemon
  static { this.declareProp("hiding", { type: "Pokemon", link: true }) }
  get hiding() { return core.linked(this, "hiding", Pokemon) }
  set hiding(value) { this.setProp("hiding", value) }

  // - its "choices" is a new list of pokemon
  static { this.declareProp("choices", { itemType: "Pokemon", init: () => new List({ instanceType: "Pokemon" }) }) }
  get choices() { return core.linked(this, "choices", Pokemon) }
  set choices(value) { this.setProp("choices", value) }

  // - its "guessed" is a pokemon
  static { this.declareProp("guessed", { type: "Pokemon", link: true }) }
  get guessed() { return core.linked(this, "guessed", Pokemon) }
  set guessed(value) { this.setProp("guessed", value) }

  get foundOut() {
    return this.guessed !== undefined
  }

  get right() {
    return this.guessed === this.hiding
  }

  /** In the shadow, until you've guessed */
  get look() {
    if (this.foundOut) return "shadow found"
    return "shadow"
  }

  /** Four from the first 151, and one of them hides */
  async playAgain() {
    const firstOnes = core.rangeStartingAt(await core.savedThings(Pokemon), 0, 151)
    this.choices = core.randomItemsOf(firstOnes, 4)
    this.hiding = core.randomItemOf(await core.answerOf(this, "choices"))
    this.guessed = undefined
  }

  static drawsWaiting = true
  draw() {
    if (this.hiding) {
      return [
        h("ui-segment", { class: () => this.look, align: "center" },
          h("ui-image", { class: "art", src: () => this.hiding.picture, alt: "A Pokémon, hiding" })
        ),
        h("slot", { name: "answer" }, () => this.drawAnswer())
      ]
    } else {
      return h("ui-segment", { class: "shadow", align: "center" },
        h("ui-header", { size: "huge" }, "Who's that Pokémon?"),
        h("ui-button", {
          color: "yellow",
          size: "massive",
          onClick: core.pressed(this, async () => await this.playAgain()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Let's play!")
      )
    }
  }

  static drawsWaiting = true
  drawAnswer() {
    if (this.foundOut) {
      return [
        this.right ? h("ui-header", { class: "said", size: "huge", align: "center", part: "answer" },
          "Yes!  It's ",
          () => core.whileWaiting(() => this.hiding.name),
          "!"
        ) : h("ui-header", { class: "said", size: "huge", align: "center", part: "answer" },
          "It's ",
          () => core.whileWaiting(() => this.hiding.name),
          "!"
        ),
        h("ui-stack", { direction: "horizontal", justify: "center", part: "answer" },
          h("ui-button", {
            color: "yellow",
            size: "massive",
            onClick: core.pressed(this, async () => await this.playAgain()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Play again")
        )
      ]
    } else {
      return h("ui-stack", { class: "choices", direction: "horizontal", wrap: true, justify: "center", part: "answer" },
        h("slot", { name: "choice_buttons" }, () => this.drawChoiceButtons())
      )
    }
  }

  drawChoiceButtons() {
    return core.drawRead(() => this.choices, (choice) => h("ui-button", {
      class: "choice",
      color: "yellow",
      size: "huge",
      onClick: core.pressed(this, async () => await choice.guess()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
      part: "choice_buttons"
    }, () => choice.name))
  }
}
// -----------
core.heading("PokéSpell")
///////////////
// ## PokéSpell
///////////////
// A Pokédex for kids:  look through every Pokémon, find one by name, keep your favourites, and guess who's hiding.
// Every Pokémon is in PokeSpell.api.spell, as `spell place ingest` wrote it;  your favourites are in Favourites.api.spell.
// How a Pokémon looks is in Pokemon.spellml, and the guessing game in WhosThat.spellml.

export class Pokedex extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  // - its "showing" is a pokemon
  static { this.declareProp("showing", { type: "Pokemon", link: true }) }
  get showing() { return core.linked(this, "showing", Pokemon) }
  set showing(value) { this.setProp("showing", value) }

  // - its "trail" is a new list of pokemon
  static { this.declareProp("trail", { itemType: "Pokemon", init: () => new List({ instanceType: "Pokemon" }) }) }
  get trail() { return core.linked(this, "trail", Pokemon) }
  set trail(value) { this.setProp("trail", value) }

  // - its "picked kind" is a type
  static { this.declareProp("pickedKind", { type: "Type", link: true }) }
  get pickedKind() { return core.linked(this, "pickedKind", Type) }
  set pickedKind(value) { this.setProp("pickedKind", value) }

  // - its "hearing" is a pokemon
  static { this.declareProp("hearing", { type: "Pokemon", link: true }) }
  get hearing() { return core.linked(this, "hearing", Pokemon) }
  set hearing(value) { this.setProp("hearing", value) }

  // - its "game" is a new guess
  static { this.declareProp("game", { init: () => new Guess(), early: true }) }
  get game() { return this.getProp("game") }
  set game(value) { this.setProp("game", value) }

  create() {
    this.tab = "everyone"
    this.search = ""
  }

  async goToWhere(where) {
    this.tab = where
    this.search = ""
    this.showing = undefined
    core.clear(await core.answerOf(this, "trail"))
    core.scrollToTop()
  }

  async goBack() {
    if (core.isEmpty(await core.answerOf(this, "trail"))) {
      this.showing = undefined
      return
    }
    this.showing = core.getItemAt(await core.answerOf(this, "trail"), -1)
    core.removeItemAt(await core.answerOf(this, "trail"), -1)
    core.scrollToTop()
  }

  /** Any Pokémon at all */
  async surpriseMe() {
    await core.randomItemOf(await core.savedThings(Pokemon))?.open()
  }

  static { this.declareProp("kindsToPick", { declaredAt: { path: "/PokeSpell.spellml", start: 1132, end: 1185 }, readsFrom: ["poke_api"] }) }
  get kindsToPick() { return core.waitedValue(this, "kindsToPick", async () => {
    return core.filter(await core.savedThings(Type, {}, "looks through"), (type) => type.isReal)
  }) }

  /** Pokémon names are all small letters:  so the search is too */
  static { this.declareProp("found", { declaredAt: { path: "/PokeSpell.spellml", start: 1199, end: 1395 }, readsFrom: ["poke_api"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const lookingFor = this.search.toLocaleLowerCase()
    return core.filter(await core.savedThings(Pokemon, {}, "looks through"), (pokemon) => core.includes(pokemon.name, lookingFor))
  }, () => [this.search]) }

  draw() {
    return [
      h("ui-stack", { class: "top", direction: "horizontal", wrap: true, align: "center", justify: "between" },
        h("ui-button", {
          class: "logo",
          appearance: "transparent",
          onClick: core.pressed(this, async () => await this.goToWhere("everyone")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "PokéSpell"),
        h("ui-form", { class: "find", value: this },
          h("ui-field", { label: "Find a Pokémon" },
            h("ui-input", { name: "search", icon: "search", size: "large", placeholder: "Pikachu" })
          )
        ),
        h("ui-button", {
          class: "surprise",
          color: "yellow",
          size: "huge",
          icon: "wand magic sparkles",
          onClick: core.pressed(this, async () => await this.surpriseMe()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Surprise me!")
      ),
      h("ui-toolbar", { class: "tabs", appearance: "secondary pointing", size: "huge", "aria-label": "Look through" },
        h("ui-item", {
          selected: () => this.tab === "everyone",
          onClick: core.pressed(this, async () => await this.goToWhere("everyone")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Everyone"),
        h("ui-item", {
          selected: () => this.tab === "kinds",
          onClick: core.pressed(this, async () => await this.goToWhere("kinds")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Kinds"),
        h("ui-item", {
          selected: () => this.tab === "favourites",
          onClick: core.pressed(this, async () => await this.goToWhere("favourites")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Favourites"),
        h("ui-item", {
          selected: () => this.tab === "guess",
          onClick: core.pressed(this, async () => await this.goToWhere("guess")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Who's that Pokémon?")
      ),
      h("slot", { name: "shelf" }, () => this.drawShelf()),
      h("ui-text", { class: "credits", size: "small" },
        "Every Pokémon, its pictures and its sounds, from ",
        h("ui-link", { link: "https://pokeapi.co/" }, "PokéAPI"),
        ". Pokémon belongs to Nintendo, Game Freak and Creatures."
      )
    ]
  }

  // What shows under the tabs:  only the tab that's open reads anything
  static drawsWaiting = true
  drawShelf() {
    if (this.showing && this.search === "") {
      return [
        h("ui-button", {
          class: "back",
          appearance: "basic",
          icon: "arrow left",
          size: "large",
          onClick: core.pressed(this, async () => await this.goBack()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
          part: "shelf"
        }, "Back"),
        this.showing.drawPage(),
        h("slot", { name: "cry" }, () => this.drawCry())
      ]
    } else if (this.search !== "") {
      return core.drawRead(() => this.found, (pokemon) => core.drawThing(pokemon), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, "Looking…"),
        none: () => h("ui-text", { part: "shelf" }, "Nobody's called that.  Try another name!"),
        paging: () => "pages",
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    } else if (this.tab === "kinds") return h("slot", { name: "kinds" }, () => this.drawKinds())
    else if (this.tab === "favourites") return core.drawRead(async () => await core.savedThings(Favourite, {}, "as drawn"), (favourite) => core.drawThing(favourite), { none: () => h("ui-text", { part: "shelf" }, "No favourites yet.  Press a Pokémon's heart to keep it here!"), items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" }) })
    else if (this.tab === "guess") return core.drawThing(this.game)
    else {
      return core.drawRead(async () => await core.savedThings(Pokemon, {}, "as drawn"), (pokemon) => core.drawThing(pokemon), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, "Waking up the Pokémon…"),
        paging: () => "pages",
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    }
  }

  // A button for every kind, and the Pokémon of the one you pick
  static drawsWaiting = true
  drawKinds() {
    return [
      h("ui-stack", { class: "kinds", direction: "horizontal", wrap: true, justify: "center", part: "kinds" },
        h("slot", { name: "kind_buttons" }, () => this.drawKindButtons())
      ),
      this.pickedKind ? [
        h("ui-header", { class: "kind-heading", size: "large", part: "kinds" },
          () => core.whileWaiting(() => this.pickedKind.name),
          " Pokémon"
        ),
        core.drawRead(() => this.pickedKind.pokemon, (item) => core.drawThing(item), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "kinds" }, "Finding them…"),
          paging: () => "pages",
          items: () => h("ui-cards", { columns: "4", doubling: true, part: "kinds" })
        })
      ] : h("ui-header", { class: "hint", size: "small", align: "center", part: "kinds" },
        "Pick a kind, and see who's that kind."
      )
    ]
  }

  // A Pokémon's cry plays as soon as it's drawn:  so drawing it again plays it again
  static drawsWaiting = true
  drawCry() {
    if (this.hearing) return h("ui-audio", { src: () => this.hearing.sound, autoplay: true, part: "cry" })
  }

  drawKindButtons() {
    return core.drawRead(() => this.kindsToPick, (type) => core.drawThing(type))
  }
}
export const pokedex = new Pokedex()

core.heading("What a Pokémon or a kind can do, from anywhere")
if (!core.isCarryingOver) pokedex.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  only the look no \`ui-*\` attribute gives:  a bright sky, round friendly letters, cards that bounce,¬   and the shadow a Pokémon hides in.¬   - Each kind's colour is Spell's, in Pokemon.spellml:  a button's own \`color\`.¬   - With dark mode, the sky is a night sky;  the cards stay bright.¬   - Every bounce is under "no preference" for motion. */¬¬poke-spell-app {¬  --sky: linear-gradient(180deg, #8fd8ff 0%, #d9f4ff 45%, #fff6c9 100%);¬  --ink: #1d2b4f;¬  --red: #ef3b3b;¬  --round: ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif;¬  --ui-text-color: var(--ink);¬  --ui-card-background: #fff;¬  --ui-card-border-color: transparent;¬  --ui-card-margin-block: 0;¬¬  color-scheme: light;¬  display: block;¬  min-height: 100vh;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: var(--sky);¬  color: var(--ink);¬  font-family: var(--round);¬}¬¬@media (prefers-color-scheme: dark) {¬  poke-spell-app {¬    --sky: radial-gradient(ellipse at 50% 0%, #2c3f8f 0%, #141c45 55%, #0b1030 100%);¬    --ink: #f2f5ff;¬¬    color-scheme: dark;¬  }¬}¬¬poke-spell-app ui-text::part(text),¬poke-spell-app ui-header::part(header) {¬  color: var(--ink);¬  font-family: var(--round);¬}¬¬.logo::part(button) {¬  padding: 0;¬  background: none;¬  color: var(--red);¬  font: 900 clamp(2em, 6vw, 3.2em) / 1 var(--round);¬  text-shadow: 0.06em 0.06em 0 #ffcb05;¬}¬¬.find {¬  flex: 1 1 16em;¬  max-width: 26em;¬}¬¬.surprise::part(button) {¬  border-radius: 2em;¬  box-shadow: 0 0.25em 0 #c79a00;¬}¬¬.tabs {¬  margin-block: 0.5em 1em;¬}¬¬/****************¬ * A card:  white and round, with the Pokémon on a sunny circle;  it bounces up under the mouse.¬ ****************/¬¬.pokemon::part(card) {¬  border-radius: 1.5em;¬  box-shadow: 0 0.4em 1.2em rgb(29 43 79 / 15%);¬  cursor: pointer;¬  transition: transform 0.15s ease;¬}¬¬.pokemon .art::part(image) {¬  aspect-ratio: 1;¬  object-fit: contain;¬  padding: 0.75em;¬  background: radial-gradient(circle, #fff3b0 0 55%, transparent 56%);¬}¬¬/* a card stays white in the dark, so its words stay dark */¬poke-spell-app .name::part(header) {¬  color: #1d2b4f;¬  font-size: clamp(1.1em, 3.5vw, 1.4em);¬  overflow-wrap: anywhere;¬}¬¬/* PokéAPI's names are all small letters:  a name shows with a capital */¬.name::part(header),¬.title::part(header),¬.kind-heading::part(header),¬.said::part(header),¬.kind::part(button),¬.kind::part(label),¬.choice::part(button) {¬  text-transform: capitalize;¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .pokemon:hover::part(card) {¬    transform: translateY(-0.4em) rotate(-1deg);¬  }¬}¬¬/****************¬ * A Pokémon's page¬ ****************/¬¬.art::part(image) {¬  outline: none;¬}¬¬.big.art::part(image) {¬  width: min(22em, 80vw);¬  aspect-ratio: 1;¬  object-fit: contain;¬  background: radial-gradient(circle, #fff3b0 0 60%, transparent 61%);¬}¬¬.about {¬  flex: 1 1 18em;¬}¬¬.title::part(header) {¬  color: var(--red);¬  font: 900 clamp(2.4em, 7vw, 4em) / 1 var(--round);¬}¬¬.strength {¬  max-width: 36em;¬}¬¬/****************¬ * Who's that Pokémon?  Black as a shadow, until you've guessed.¬ ****************/¬¬.shadow::part(segment) {¬  display: grid;¬  justify-items: center;¬  gap: 1em;¬  border-radius: 1.5em;¬  background: radial-gradient(circle, #fff 0%, #ffe066 45%, #ff9f1c 100%);¬}¬¬.shadow .art::part(image) {¬  width: min(18em, 70vw);¬  filter: brightness(0);¬  transition: filter 0.6s ease;¬}¬¬.shadow.found .art::part(image) {¬  filter: none;¬}¬¬.choice::part(button) {¬  border-radius: 2em;¬  box-shadow: 0 0.25em 0 rgb(29 43 79 / 25%);¬}¬¬.credits {¬  display: block;¬  margin-block-start: 2em;¬}¬`)
