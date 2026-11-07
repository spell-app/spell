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
      throwAway: "throw it away",
      draw: "draw it",
      checklist: "checklist"
    },
    TaskKeeper: {
      keptTasks: "kept tasks",
      keepANewTaskTitledTitle: "keep a new task titled (title as text)"
    },
    BrowserTask: {
      throwAway: "throw it away"
    },
    BrowserKeeper: {
      keptTasks: "kept tasks",
      keepANewTaskTitledTitle: "keep a new task titled (title as text)"
    },
    ServerTask: {
      throwAway: "throw it away"
    },
    ServerKeeper: {
      keptTasks: "kept tasks",
      keepANewTaskTitledTitle: "keep a new task titled (title as text)"
    },
    SheetTask: {
      throwAway: "throw it away"
    },
    SheetKeeper: {
      keptTasks: "kept tasks",
      keepANewTaskTitledTitle: "keep a new task titled (title as text)"
    },
    SkyTask: {
      throwAway: "throw it away",
      owner: "owner"
    },
    SkyKeeper: {
      keptTasks: "kept tasks",
      keepANewTaskTitledTitle: "keep a new task titled (title as text)"
    },
    Checklist: {
      showing: "showing",
      isShowingShowing: "is showing (showing)",
      draw: "draw it"
    },
    TaskList: {
      checklist: "checklist",
      draft: "draft",
      activeCount: "active count",
      storage: "storage",
      keeper: "keeper",
      fillTheChecklist: "fill the checklist",
      create: "create it",
      addTheStartingTaskTitleWithPriorityLevel: "add the starting task (title as text) with priority (level as text)",
      addTheDraft: "add the draft",
      draw: "draw it",
      showAll: "show all",
      showToDo: "show to do",
      showDone: "show done",
      removeTheDoneTasks: "remove the done tasks"
    }
  },
  groups: {
    SkyTask: [
      { name: "Kept in your atmosphere account", members: ["owner"] }
    ],
    Task: [
      { name: "The checklist", members: ["checklist"] }
    ],
    TaskList: [
      { name: "keeping", description: "Where the tasks are kept:  the person picks, and the app asks that keeper", members: ["storage", "keeper", "fillTheChecklist", "create", "addTheStartingTaskTitleWithPriorityLevel", "addTheDraft"] },
      { name: "menus", description: "The toolbar's buttons, and the list's right click:  the same actions", members: ["draw"] },
      { name: "filter", description: "Which tasks the list shows:  the toolbar ticks the one it's showing", members: ["showAll", "showToDo", "showDone", "removeTheDoneTasks"] }
    ]
  }
}
