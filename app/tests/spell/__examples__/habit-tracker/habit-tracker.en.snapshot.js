/*! SPELL: WORDS habit-tracker en */
export const words = {
  lang: "en",
  types: {
    Habit: {
      name: "name",
      monday: "monday",
      tuesday: "tuesday",
      wednesday: "wednesday",
      thursday: "thursday",
      friday: "friday",
      saturday: "saturday",
      sunday: "sunday",
      days: "days",
      count: "count",
      streak: "streak",
      draw: "draw it",
      week: "week"
    },
    Week: {
      draw: "draw it"
    },
    HabitTracker: {
      habits: "habits",
      draft: "draft",
      create: "create it",
      addTheDraft: "add the draft",
      draw: "draw it"
    }
  },
  groups: {
    Habit: [
      { name: "days", description: "A yes or no for each day of the week", members: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
      { name: "totals", description: "Worked out from its days, again as each one is ticked", members: ["days", "count", "streak", "draw"] },
      { name: "The week", members: ["week"] }
    ]
  }
}
