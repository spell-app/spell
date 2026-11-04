import { core, Thing, List, Place } from "@spell/core"

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

  /** each an address */
  // - its "forms" is a list of text
  static { this.declareProp("forms", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1598, end: 1627 } }) }
  get forms() { return this.getProp("forms") }
  set forms(value) { this.setProp("forms", value) }

  // - its "game indices" is a list of game indices
  static { this.declareProp("gameIndices", { itemType: "GameIndex", init: () => new List({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1651, end: 1695 } }) }
  get gameIndices() { return this.getProp("gameIndices") }
  set gameIndices(value) { this.setProp("gameIndices", value) }

  // - its "held items" is a list of text
  static { this.declareProp("heldItems", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1699, end: 1733 } }) }
  get heldItems() { return this.getProp("heldItems") }
  set heldItems(value) { this.setProp("heldItems", value) }

  /** an address */
  // - its "location area encounters" is text
  static { this.declareProp("locationAreaEncounters", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 1737, end: 1775 } }) }
  get locationAreaEncounters() { return this.getProp("locationAreaEncounters") }
  set locationAreaEncounters(value) { this.setProp("locationAreaEncounters", value) }

  // - its "moves" is a list of pokemon moves
  static { this.declareProp("moves", { itemType: "PokemonMove", init: () => new List({ instanceType: "PokemonMove" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1794, end: 1832 } }) }
  get moves() { return this.getProp("moves") }
  set moves(value) { this.setProp("moves", value) }

  // - its "species" is a pokemon species
  static { this.declareProp("species", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 1836, end: 1870 } }) }
  get species() { return core.linked(this, "species", PokemonSpecies) }
  set species(value) { this.setProp("species", value) }

  // - its "sprites" is a sprite
  static { this.declareProp("sprites", { type: "Sprite", declaredAt: { path: "/PokeSpell.api.spell", start: 1874, end: 1899 } }) }
  get sprites() { return this.getProp("sprites") }
  set sprites(value) { this.setProp("sprites", value) }

  // - its "cries" is a cry
  static { this.declareProp("cries", { type: "Cry", declaredAt: { path: "/PokeSpell.api.spell", start: 1903, end: 1923 } }) }
  get cries() { return this.getProp("cries") }
  set cries(value) { this.setProp("cries", value) }

  // - its "stats" is a list of stats
  static { this.declareProp("stats", { itemType: "Stat", init: () => new List({ instanceType: "Stat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1927, end: 1957 } }) }
  get stats() { return this.getProp("stats") }
  set stats(value) { this.setProp("stats", value) }

  // - its "past stats" is a list of past stats
  static { this.declareProp("pastStats", { itemType: "PastStat", init: () => new List({ instanceType: "PastStat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1961, end: 2001 } }) }
  get pastStats() { return this.getProp("pastStats") }
  set pastStats(value) { this.setProp("pastStats", value) }

  // - its "types" is a list of pokemon types
  static { this.declareProp("types", { itemType: "PokemonType", init: () => new List({ instanceType: "PokemonType" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2005, end: 2043 } }) }
  get types() { return this.getProp("types") }
  set types(value) { this.setProp("types", value) }

  // - its "past types" is a list of text
  static { this.declareProp("pastTypes", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2047, end: 2081 } }) }
  get pastTypes() { return this.getProp("pastTypes") }
  set pastTypes(value) { this.setProp("pastTypes", value) }

  static savedIn = { place: "poke_api", collection: "pokemon", select: ["name"] }
}

export class PokemonSpecies extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 2142, end: 2182 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2186, end: 2204 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "order" is a number
  static { this.declareProp("order", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2208, end: 2231 } }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }

  // - its "gender rate" is a number
  static { this.declareProp("genderRate", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2235, end: 2264 } }) }
  get genderRate() { return this.getProp("genderRate") }
  set genderRate(value) { this.setProp("genderRate", value) }

  // - its "capture rate" is a number
  static { this.declareProp("captureRate", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2268, end: 2298 } }) }
  get captureRate() { return this.getProp("captureRate") }
  set captureRate(value) { this.setProp("captureRate", value) }

  // - its "base happiness" is a number
  static { this.declareProp("baseHappiness", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2302, end: 2334 } }) }
  get baseHappiness() { return this.getProp("baseHappiness") }
  set baseHappiness(value) { this.setProp("baseHappiness", value) }

  // - its "baby" is yes or no, stored as "is_baby"
  static { this.declareProp("baby", { type: "choice", storedAs: "is_baby", declaredAt: { path: "/PokeSpell.api.spell", start: 2338, end: 2382 } }) }
  get baby() { return this.getProp("baby") }
  set baby(value) { this.setProp("baby", value) }

  // - its "legendary" is yes or no, stored as "is_legendary"
  static { this.declareProp("legendary", { type: "choice", storedAs: "is_legendary", declaredAt: { path: "/PokeSpell.api.spell", start: 2386, end: 2440 } }) }
  get legendary() { return this.getProp("legendary") }
  set legendary(value) { this.setProp("legendary", value) }

  // - its "mythical" is yes or no, stored as "is_mythical"
  static { this.declareProp("mythical", { type: "choice", storedAs: "is_mythical", declaredAt: { path: "/PokeSpell.api.spell", start: 2444, end: 2496 } }) }
  get mythical() { return this.getProp("mythical") }
  set mythical(value) { this.setProp("mythical", value) }

  // - its "hatch counter" is a number
  static { this.declareProp("hatchCounter", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2500, end: 2531 } }) }
  get hatchCounter() { return this.getProp("hatchCounter") }
  set hatchCounter(value) { this.setProp("hatchCounter", value) }

  // - its "gender differences" is yes or no, stored as "has_gender_differences"
  static { this.declareProp("genderDifferences", { type: "choice", storedAs: "has_gender_differences", declaredAt: { path: "/PokeSpell.api.spell", start: 2535, end: 2608 } }) }
  get genderDifferences() { return this.getProp("genderDifferences") }
  set genderDifferences(value) { this.setProp("genderDifferences", value) }

  // - its "forms switchable" is yes or no
  static { this.declareProp("formsSwitchable", { type: "choice", declaredAt: { path: "/PokeSpell.api.spell", start: 2612, end: 2647 } }) }
  get formsSwitchable() { return this.getProp("formsSwitchable") }
  set formsSwitchable(value) { this.setProp("formsSwitchable", value) }

  /** an address */
  // - its "growth rate" is text
  static { this.declareProp("growthRate", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2651, end: 2676 } }) }
  get growthRate() { return this.getProp("growthRate") }
  set growthRate(value) { this.setProp("growthRate", value) }

  // - its "pokedex numbers" is a list of pokedex numbers
  static { this.declareProp("pokedexNumbers", { itemType: "PokedexNumber", init: () => new List({ instanceType: "PokedexNumber" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2695, end: 2745 } }) }
  get pokedexNumbers() { return this.getProp("pokedexNumbers") }
  set pokedexNumbers(value) { this.setProp("pokedexNumbers", value) }

  /** each an address */
  // - its "egg groups" is a list of text
  static { this.declareProp("eggGroups", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2749, end: 2783 } }) }
  get eggGroups() { return this.getProp("eggGroups") }
  set eggGroups(value) { this.setProp("eggGroups", value) }

  /** an address */
  // - its "color" is text
  static { this.declareProp("color", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2807, end: 2826 } }) }
  get color() { return this.getProp("color") }
  set color(value) { this.setProp("color", value) }

  /** an address */
  // - its "shape" is text
  static { this.declareProp("shape", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2845, end: 2864 } }) }
  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  // - its "evolves from species" is a pokemon species
  static { this.declareProp("evolvesFromSpecies", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2883, end: 2930 } }) }
  get evolvesFromSpecies() { return core.linked(this, "evolvesFromSpecies", PokemonSpecies) }
  set evolvesFromSpecies(value) { this.setProp("evolvesFromSpecies", value) }

  // - its "evolution chain" is an evolution chain
  static { this.declareProp("evolutionChain", { type: "EvolutionChain", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2934, end: 2977 } }) }
  get evolutionChain() { return core.linked(this, "evolutionChain", EvolutionChain) }
  set evolutionChain(value) { this.setProp("evolutionChain", value) }

  /** an address */
  // - its "habitat" is text
  static { this.declareProp("habitat", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2981, end: 3002 } }) }
  get habitat() { return this.getProp("habitat") }
  set habitat(value) { this.setProp("habitat", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3021, end: 3053 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3057, end: 3087 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "pal park encounters" is a list of pal park encounters
  static { this.declareProp("palParkEncounters", { itemType: "PalParkEncounter", init: () => new List({ instanceType: "PalParkEncounter" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3091, end: 3149 } }) }
  get palParkEncounters() { return this.getProp("palParkEncounters") }
  set palParkEncounters(value) { this.setProp("palParkEncounters", value) }

  // - its "form descriptions" is a list of text
  static { this.declareProp("formDescriptions", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3153, end: 3194 } }) }
  get formDescriptions() { return this.getProp("formDescriptions") }
  set formDescriptions(value) { this.setProp("formDescriptions", value) }

  // - its "flavor text entries" is a list of flavor text entries
  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3198, end: 3256 } }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  // - its "genera" is a list of genera
  static { this.declareProp("genera", { itemType: "Genus", init: () => new List({ instanceType: "Genus" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3260, end: 3292 } }) }
  get genera() { return this.getProp("genera") }
  set genera(value) { this.setProp("genera", value) }

  // - its "varieties" is a list of varieties
  static { this.declareProp("varieties", { itemType: "Variety", init: () => new List({ instanceType: "Variety" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3296, end: 3334 } }) }
  get varieties() { return this.getProp("varieties") }
  set varieties(value) { this.setProp("varieties", value) }

  static savedIn = { place: "poke_api", collection: "pokemon_species", select: ["name"] }
}

export class Type extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3384, end: 3424 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3428, end: 3446 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "damage relations" is a damage relation
  static { this.declareProp("damageRelations", { type: "DamageRelation", declaredAt: { path: "/PokeSpell.api.spell", start: 3450, end: 3493 } }) }
  get damageRelations() { return this.getProp("damageRelations") }
  set damageRelations(value) { this.setProp("damageRelations", value) }

  // - its "past damage relations" is a list of text
  static { this.declareProp("pastDamageRelations", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3497, end: 3542 } }) }
  get pastDamageRelations() { return this.getProp("pastDamageRelations") }
  set pastDamageRelations(value) { this.setProp("pastDamageRelations", value) }

  // - its "game indices" is a list of game indices
  static { this.declareProp("gameIndices", { itemType: "GameIndex", init: () => new List({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3546, end: 3590 } }) }
  get gameIndices() { return this.getProp("gameIndices") }
  set gameIndices(value) { this.setProp("gameIndices", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3594, end: 3626 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  /** an address */
  // - its "move damage class" is text
  static { this.declareProp("moveDamageClass", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3630, end: 3661 } }) }
  get moveDamageClass() { return this.getProp("moveDamageClass") }
  set moveDamageClass(value) { this.setProp("moveDamageClass", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3680, end: 3710 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "pokemon" is a list of type pokemon
  static { this.declareProp("pokemon", { itemType: "TypePokemon", init: () => new List({ instanceType: "TypePokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3714, end: 3753 } }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3757, end: 3787 } }) }
  get moves() { return core.linked(this, "moves", Move) }
  set moves(value) { this.setProp("moves", value) }

  static savedIn = { place: "poke_api", collection: "types", select: ["name"] }
}

export class Ability extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3841, end: 3881 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3885, end: 3903 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "main series" is yes or no, stored as "is_main_series"
  static { this.declareProp("mainSeries", { type: "choice", storedAs: "is_main_series", declaredAt: { path: "/PokeSpell.api.spell", start: 3907, end: 3965 } }) }
  get mainSeries() { return this.getProp("mainSeries") }
  set mainSeries(value) { this.setProp("mainSeries", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3969, end: 4001 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4005, end: 4035 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "effect entries" is a list of effect entries
  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4039, end: 4087 } }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  // - its "effect changes" is a list of effect changes
  static { this.declareProp("effectChanges", { itemType: "EffectChange", init: () => new List({ instanceType: "EffectChange" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4091, end: 4139 } }) }
  get effectChanges() { return this.getProp("effectChanges") }
  set effectChanges(value) { this.setProp("effectChanges", value) }

  // - its "flavor text entries" is a list of flavor text entries
  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4143, end: 4201 } }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  // - its "pokemon" is a list of ability pokemon
  static { this.declareProp("pokemon", { itemType: "AbilityPokemon", init: () => new List({ instanceType: "AbilityPokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4205, end: 4247 } }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }

  static savedIn = { place: "poke_api", collection: "abilities", select: ["name"] }
}

export class Move extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 4297, end: 4337 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4341, end: 4359 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "accuracy" is a number
  static { this.declareProp("accuracy", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4363, end: 4389 } }) }
  get accuracy() { return this.getProp("accuracy") }
  set accuracy(value) { this.setProp("accuracy", value) }

  // - its "pp" is a number
  static { this.declareProp("pp", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4393, end: 4413 } }) }
  get pp() { return this.getProp("pp") }
  set pp(value) { this.setProp("pp", value) }

  // - its "priority" is a number
  static { this.declareProp("priority", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4417, end: 4443 } }) }
  get priority() { return this.getProp("priority") }
  set priority(value) { this.setProp("priority", value) }

  // - its "power" is a number
  static { this.declareProp("power", { type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4447, end: 4470 } }) }
  get power() { return this.getProp("power") }
  set power(value) { this.setProp("power", value) }

  // - its "contest combos" is a contest combo
  static { this.declareProp("contestCombos", { type: "ContestCombo", declaredAt: { path: "/PokeSpell.api.spell", start: 4474, end: 4513 } }) }
  get contestCombos() { return this.getProp("contestCombos") }
  set contestCombos(value) { this.setProp("contestCombos", value) }

  /** an address */
  // - its "contest type" is text
  static { this.declareProp("contestType", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4517, end: 4543 } }) }
  get contestType() { return this.getProp("contestType") }
  set contestType(value) { this.setProp("contestType", value) }

  /** an address */
  // - its "contest effect" is text
  static { this.declareProp("contestEffect", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4562, end: 4590 } }) }
  get contestEffect() { return this.getProp("contestEffect") }
  set contestEffect(value) { this.setProp("contestEffect", value) }

  /** an address */
  // - its "damage class" is text
  static { this.declareProp("damageClass", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4609, end: 4635 } }) }
  get damageClass() { return this.getProp("damageClass") }
  set damageClass(value) { this.setProp("damageClass", value) }

  // - its "effect entries" is a list of effect entries
  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4654, end: 4702 } }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  // - its "effect changes" is a list of text
  static { this.declareProp("effectChanges", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4706, end: 4744 } }) }
  get effectChanges() { return this.getProp("effectChanges") }
  set effectChanges(value) { this.setProp("effectChanges", value) }

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 4748, end: 4780 } }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  // - its "meta" is a meta
  static { this.declareProp("meta", { type: "Meta", declaredAt: { path: "/PokeSpell.api.spell", start: 4784, end: 4804 } }) }
  get meta() { return this.getProp("meta") }
  set meta(value) { this.setProp("meta", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4808, end: 4838 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "past values" is a list of past values
  static { this.declareProp("pastValues", { itemType: "PastValue", init: () => new List({ instanceType: "PastValue" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4842, end: 4884 } }) }
  get pastValues() { return this.getProp("pastValues") }
  set pastValues(value) { this.setProp("pastValues", value) }

  // - its "stat changes" is a list of text
  static { this.declareProp("statChanges", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4888, end: 4924 } }) }
  get statChanges() { return this.getProp("statChanges") }
  set statChanges(value) { this.setProp("statChanges", value) }

  /** an address */
  // - its "super contest effect" is text
  static { this.declareProp("superContestEffect", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4928, end: 4962 } }) }
  get superContestEffect() { return this.getProp("superContestEffect") }
  set superContestEffect(value) { this.setProp("superContestEffect", value) }

  /** an address */
  // - its "target" is text
  static { this.declareProp("target", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4981, end: 5001 } }) }
  get target() { return this.getProp("target") }
  set target(value) { this.setProp("target", value) }

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 5020, end: 5058 } }) }
  get kind() { return core.linked(this, "kind", Type) }
  set kind(value) { this.setProp("kind", value) }

  // - its "machines" is a list of text
  static { this.declareProp("machines", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5062, end: 5094 } }) }
  get machines() { return this.getProp("machines") }
  set machines(value) { this.setProp("machines", value) }

  // - its "flavor text entries" is a list of flavor text entries
  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5098, end: 5156 } }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  // - its "learned by pokemon" is a list of pokemon
  static { this.declareProp("learnedByPokemon", { itemType: "Pokemon", init: () => new List({ instanceType: "Pokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5160, end: 5205 } }) }
  get learnedByPokemon() { return core.linked(this, "learnedByPokemon", Pokemon) }
  set learnedByPokemon(value) { this.setProp("learnedByPokemon", value) }

  static savedIn = { place: "poke_api", collection: "moves", select: ["name"] }
}

export class EvolutionChain extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5267, end: 5307 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "chain" is a chain
  static { this.declareProp("chain", { type: "Chain", declaredAt: { path: "/PokeSpell.api.spell", start: 5311, end: 5333 } }) }
  get chain() { return this.getProp("chain") }
  set chain(value) { this.setProp("chain", value) }

  static savedIn = { place: "poke_api", collection: "evolution_chains", select: [] }
}

export class Generation extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5389, end: 5429 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 5433, end: 5451 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "abilities" is a list of text
  static { this.declareProp("abilities", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5455, end: 5488 } }) }
  get abilities() { return this.getProp("abilities") }
  set abilities(value) { this.setProp("abilities", value) }

  /** an address */
  // - its "main region" is text
  static { this.declareProp("mainRegion", { type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 5492, end: 5517 } }) }
  get mainRegion() { return this.getProp("mainRegion") }
  set mainRegion(value) { this.setProp("mainRegion", value) }

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5536, end: 5566 } }) }
  get moves() { return core.linked(this, "moves", Move) }
  set moves(value) { this.setProp("moves", value) }

  // - its "names" is a list of names
  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5570, end: 5600 } }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  // - its "pokemon species" is a list of pokemon species
  static { this.declareProp("pokemonSpecies", { itemType: "PokemonSpecies", init: () => new List({ instanceType: "PokemonSpecies" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5604, end: 5654 } }) }
  get pokemonSpecies() { return this.getProp("pokemonSpecies") }
  set pokemonSpecies(value) { this.setProp("pokemonSpecies", value) }

  // - its "types" is a list of types
  static { this.declareProp("types", { itemType: "Type", init: () => new List({ instanceType: "Type" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5658, end: 5688 } }) }
  get types() { return core.linked(this, "types", Type) }
  set types(value) { this.setProp("types", value) }

  /** each an address */
  // - its "version groups" is a list of text
  static { this.declareProp("versionGroups", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5692, end: 5730 } }) }
  get versionGroups() { return this.getProp("versionGroups") }
  set versionGroups(value) { this.setProp("versionGroups", value) }

  static savedIn = { place: "poke_api", collection: "generations", select: ["name"] }
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
  static { this.declareProp("ability", { type: "Ability" }) }
  get ability() { return this.getProp("ability") }
  set ability(value) { this.setProp("ability", value) }
}

export class PastAbility extends Thing {
  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation" }) }
  get generation() { return this.getProp("generation") }
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

  // - its "version" is text
  static { this.declareProp("version", { type: "text" }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }
}

export class PokemonMove extends Thing {
  // - its "move" is a move
  static { this.declareProp("move", { type: "Move" }) }
  get move() { return this.getProp("move") }
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

  // - its "version group" is text
  static { this.declareProp("versionGroup", { type: "text" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }

  // - its "move learn method" is text
  static { this.declareProp("moveLearnMethod", { type: "text" }) }
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

  // - its "back shiny" is text
  static { this.declareProp("backShiny", { type: "text" }) }
  get backShiny() { return this.getProp("backShiny") }
  set backShiny(value) { this.setProp("backShiny", value) }

  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  // - its "back default" is text
  static { this.declareProp("backDefault", { type: "text" }) }
  get backDefault() { return this.getProp("backDefault") }
  set backDefault(value) { this.setProp("backDefault", value) }

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
  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Showdown extends Thing {
  // - its "back shiny" is text
  static { this.declareProp("backShiny", { type: "text" }) }
  get backShiny() { return this.getProp("backShiny") }
  set backShiny(value) { this.setProp("backShiny", value) }

  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  // - its "back default" is text
  static { this.declareProp("backDefault", { type: "text" }) }
  get backDefault() { return this.getProp("backDefault") }
  set backDefault(value) { this.setProp("backDefault", value) }

  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class DreamWorld extends Thing {
  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class OfficialArtwork extends Thing {
  // - its "front shiny" is text
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  // - its "front default" is text
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Cry extends Thing {
  // - its "latest" is text
  static { this.declareProp("latest", { type: "text" }) }
  get latest() { return this.getProp("latest") }
  set latest(value) { this.setProp("latest", value) }

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

  // - its "stat" is text
  static { this.declareProp("stat", { type: "text" }) }
  get stat() { return this.getProp("stat") }
  set stat(value) { this.setProp("stat", value) }
}

export class PastStat extends Thing {
  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation" }) }
  get generation() { return this.getProp("generation") }
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
  static { this.declareProp("kind", { type: "Type", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }
}

export class PokedexNumber extends Thing {
  // - its "entry number" is a number
  static { this.declareProp("entryNumber", { type: "number" }) }
  get entryNumber() { return this.getProp("entryNumber") }
  set entryNumber(value) { this.setProp("entryNumber", value) }

  // - its "pokedex" is text
  static { this.declareProp("pokedex", { type: "text" }) }
  get pokedex() { return this.getProp("pokedex") }
  set pokedex(value) { this.setProp("pokedex", value) }
}

export class Name extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "language" is text
  static { this.declareProp("language", { type: "text" }) }
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

  // - its "area" is text
  static { this.declareProp("area", { type: "text" }) }
  get area() { return this.getProp("area") }
  set area(value) { this.setProp("area", value) }
}

export class FlavorTextEntry extends Thing {
  // - its "flavor text" is text
  static { this.declareProp("flavorText", { type: "text" }) }
  get flavorText() { return this.getProp("flavorText") }
  set flavorText(value) { this.setProp("flavorText", value) }

  // - its "language" is text
  static { this.declareProp("language", { type: "text" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "version" is text
  static { this.declareProp("version", { type: "text" }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }
}

export class Genus extends Thing {
  // - its "genus" is text
  static { this.declareProp("genus", { type: "text" }) }
  get genus() { return this.getProp("genus") }
  set genus(value) { this.setProp("genus", value) }

  // - its "language" is text
  static { this.declareProp("language", { type: "text" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class Variety extends Thing {
  // - its "default" is yes or no, stored as "is_default"
  static { this.declareProp("default", { type: "choice", storedAs: "is_default" }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon" }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }
}

export class DamageRelation extends Thing {
  // - its "no damage to" is a list of types
  static { this.declareProp("noDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get noDamageTo() { return this.getProp("noDamageTo") }
  set noDamageTo(value) { this.setProp("noDamageTo", value) }

  // - its "half damage to" is a list of types
  static { this.declareProp("halfDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get halfDamageTo() { return this.getProp("halfDamageTo") }
  set halfDamageTo(value) { this.setProp("halfDamageTo", value) }

  // - its "double damage to" is a list of types
  static { this.declareProp("doubleDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get doubleDamageTo() { return this.getProp("doubleDamageTo") }
  set doubleDamageTo(value) { this.setProp("doubleDamageTo", value) }

  // - its "no damage from" is a list of types
  static { this.declareProp("noDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get noDamageFrom() { return this.getProp("noDamageFrom") }
  set noDamageFrom(value) { this.setProp("noDamageFrom", value) }

  // - its "half damage from" is a list of types
  static { this.declareProp("halfDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get halfDamageFrom() { return this.getProp("halfDamageFrom") }
  set halfDamageFrom(value) { this.setProp("halfDamageFrom", value) }

  // - its "double damage from" is a list of types
  static { this.declareProp("doubleDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get doubleDamageFrom() { return this.getProp("doubleDamageFrom") }
  set doubleDamageFrom(value) { this.setProp("doubleDamageFrom", value) }
}

export class TypePokemon extends Thing {
  // - its "slot" is a number
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon" }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }
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

  // - its "language" is text
  static { this.declareProp("language", { type: "text" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class EffectChange extends Thing {
  // - its "version group" is text
  static { this.declareProp("versionGroup", { type: "text" }) }
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
  static { this.declareProp("pokemon", { type: "Pokemon" }) }
  get pokemon() { return this.getProp("pokemon") }
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
  get useBefore() { return this.getProp("useBefore") }
  set useBefore(value) { this.setProp("useBefore", value) }

  // - its "use after" is a list of moves
  static { this.declareProp("useAfter", { itemType: "Move", init: () => new List({ instanceType: "Move" }) }) }
  get useAfter() { return this.getProp("useAfter") }
  set useAfter(value) { this.setProp("useAfter", value) }
}

export class Super extends Thing {}

export class Meta extends Thing {
  // - its "ailment" is text
  static { this.declareProp("ailment", { type: "text" }) }
  get ailment() { return this.getProp("ailment") }
  set ailment(value) { this.setProp("ailment", value) }

  // - its "category" is text
  static { this.declareProp("category", { type: "text" }) }
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
  static { this.declareProp("kind", { type: "Type", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "version group" is text
  static { this.declareProp("versionGroup", { type: "text" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }
}

export class Chain extends Thing {
  // - its "baby" is yes or no, stored as "is_baby"
  static { this.declareProp("baby", { type: "choice", storedAs: "is_baby" }) }
  get baby() { return this.getProp("baby") }
  set baby(value) { this.setProp("baby", value) }

  // - its "species" is a pokemon species
  static { this.declareProp("species", { type: "PokemonSpecies" }) }
  get species() { return this.getProp("species") }
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
  }
})

