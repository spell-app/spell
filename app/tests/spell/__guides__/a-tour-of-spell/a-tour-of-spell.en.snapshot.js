/*! SPELL: WORDS a-tour-of-spell en */
export const words = {
  lang: "en",
  types: {
    Plant: {
      name: "name",
      daysBetweenWaterings: "days between waterings",
      daysSinceWatered: "days since watered",
      isThirsty: "is thirsty",
      status: "status",
      water: "water it",
      draw: "draw it",
      windowsill: "windowsill"
    },
    Garden: {
      sill: "sill",
      waitADay: "wait a day",
      draw: "draw it"
    }
  },
  groups: {
    Plant: [
      { name: "2. Properties", members: ["name", "daysBetweenWaterings", "daysSinceWatered"] },
      { name: "3. Rules", members: ["isThirsty", "status", "water"] },
      { name: "4. Drawing", members: ["draw"] },
      { name: "Many things together:  a windowsill", members: ["windowsill"] }
    ]
  }
}
