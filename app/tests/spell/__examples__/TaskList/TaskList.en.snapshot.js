/*! SPELL: WORDS TaskList en */
export const words = {
  lang: "en",
  types: {
    Task: {
      title: "title",
      notes: "notes",
      priority: "priority",
      done: "done",
      isDone: "is done",
      isActive: "is active",
      draw: "draw it",
      checklist: "checklist"
    },
    Checklist: {
      showing: "showing",
      isShowingShowing: "is showing (showing)"
    },
    TaskList: {
      checklist: "checklist",
      draft: "draft",
      activeCount: "active count",
      create: "create it",
      addTheDraft: "add the draft",
      draw: "draw it",
      showAll: "show all",
      showToDo: "show to do",
      showDone: "show done",
      removeTheDoneTasks: "remove the done tasks"
    }
  },
  groups: {
    Task: [
      { name: "The checklist", members: ["checklist"] }
    ],
    TaskList: [
      { name: "filter", description: "Which tasks the list shows:  the toolbar ticks the one it's showing", members: ["draw", "showAll", "showToDo", "showDone", "removeTheDoneTasks"] }
    ]
  }
}
