/*! SPELL: WORDS TaskList en */
export const words = {
  lang: "en",
  types: {
    Task: {
      title: "title",
      done: "done",
      order: "order",
      isDone: "is done",
      isActive: "is active",
      delete: "delete",
      draw: "draw it",
      checklist: "checklist"
    },
    Checklist: {
      draw: "draw it",
      keepTheOrder: "keep the order"
    },
    TaskList: {
      checklist: "checklist",
      draft: "draft",
      activeCount: "active count",
      fillTheChecklist: "fill the checklist",
      addTheTaskTitle: "add the task (title as text)",
      addTheDraft: "add the draft",
      draw: "draw it"
    }
  },
  groups: {
    Task: [
      { name: "The checklist", members: ["checklist"] }
    ]
  }
}
