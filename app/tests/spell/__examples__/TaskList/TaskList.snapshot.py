from __future__ import annotations

from typing import Any

from spell_core import core, List, App, View, ViewableList, Place, prop, h, Element


############################################
# ## A task, and the checklist that holds it
############################################
# Something to do:  its title, and whether it's done.
# Each task is its own element on the page, `<task-list-task>`:
# a handle to drag it by, a box to tick, its title, and a button to delete it.
# Its checklist is one too, `<task-list-checklist>`, the tasks one under the other.


class Task(View):
    element_tag = "test-project-task"

    # What to do
    # - its "title" is text
    title = prop(type="text")

    # - its "done" is yes or no
    done = prop(type="choice")

    # Where it sits in its checklist, from 1:  kept with it, so the order you drag the tasks into comes back
    # - its "order" is number
    order = prop(type="number")

    @property
    def is_done(self) -> bool:
        return self.done

    @property
    def is_active(self) -> bool:
        return not self.is_done

    def delete(self) -> None:
        """Gone from its checklist, and from this device"""
        assert self.checklist is not None
        self.checklist.remove(self)
        core.remove_saved(self)

    def draw(self) -> Element:
        """A form of its own, bound to it:  ticking the box, or typing a title, changes the task"""
        return h(
            "ui-form",
            {"prop:value": self},
            h(
                "ui-stack",
                {"direction": "horizontal", "spacing": "sm"},
                h("ui-icon", {"name": "grip vertical", "color": "grey", "aria-label": "Drag"}),
                h("ui-checkbox", {"name": "done", "aria-label": "Done"}),
                h(
                    "ui-input",
                    {"name": "title", "aria-label": "Task", "appearance": "transparent", "fluid": True},
                ),
                core.draw_action(self, "delete", {"icon-only": True, "appearance": "tertiary"}),
            ),
        )

    draggable = True

    @property
    def checklist(self) -> Checklist | None:
        """a task is in one checklist at a time"""
        return Checklist.owner_of(self)

    @property
    def last_checklist(self) -> Any:
        return Checklist.last_owner_of(self)

    saved_in = {"place": "my_tasks", "collection": "tasks", "times": ["created", "modified"]}

    # a task lives in my tasks
    created = prop(type="date")

    # a task lives in my tasks
    modified = prop(type="date")


class Checklist(ViewableList):
    item_type = Task
    element_tag = "test-project-checklist"

    def when_task_dropped_on(self, task: Task) -> None:
        """a drop has moved its tasks:  each keeps its new place"""
        self.keep_the_order()

    def draw(self) -> Element:
        """Its tasks one under the other;  while it's empty, a line saying so"""
        return h(
            "ui-stack",
            {"spacing": "xs"},
            h("ui-text", {"color": "grey", "hidden": None if not self else True}, "Nothing to do"),
            h("slot"),
        )

    def keep_the_order(self) -> None:
        """Each task keeps its place in the list, from 1:  so the order you drag them into comes back next time"""
        for place, task in enumerate(self, 1):
            task.order = place

    reorder_items_after = 0

    exclusive = True


core.describe_action(Task, "delete", {"title": "Delete", "icon": "trash alternate outline", "undone_as": "Delete"})

# The checklist

core.describe_action(Checklist, "keep_the_order", {"title": "Keep the Order", "undone_as": "Keep the Order"})
# on the page, its tasks can be dragged to another place:  they move as the pointer does, gliding there


def test_a_dragged_order_is_kept() -> None:
    with core.test("test a dragged order is kept"):
        it = Checklist()
        core.echo_test_action("set the list to a new checklist")
        list_ = Checklist()
        core.echo_test_action("set the first to a new task with title \"first\"")
        first = Task(title="first")
        core.echo_test_action("set the second to a new task with title \"second\"")
        second = Task(title="second")
        core.echo_test_action("add the second to the list")
        list_.append(second)
        core.echo_test_action("add the first to the list")
        list_.append(first)
        core.echo_test_action("keep the order of the list")
        list_.keep_the_order()
        core.expect(second.order, "the order of the second", 1, "1")
        core.expect(first.order, "the order of the first", 2, "2")
        core.expect(
            getattr(core.get_item_at(core.sorted_by(list_, lambda item: item.order), 0), "title", None),
            "the title of the first task in (the list sorted by its order)",
            "second",
            "\"second\"",
        )


# How a task draws


def test_checking_one_off() -> None:
    with core.test("test checking one off"):
        it = Task()
        core.echo_test_action("set the task to a new task with title \"Write the tests\"")
        task = Task(title="Write the tests")
        core.expect(task.is_active, "the task is active", True, "yes")
        core.echo_test_action("set the task's done to yes")
        task.done = True
        core.expect(task.is_done, "the task is done", True, "yes")


# -----------


#########################################
# ## Task List:  where the tasks are kept
#########################################


class MyTask(Place):
    """
    On this device, in this browser's own storage:  nobody else sees them, no server is asked, and there's no sign-in.
    A task saves itself as it changes:  ticking it, typing its title, or dragging it into place is kept, with no save step.
    Change the first line to keep them somewhere else, and nothing else changes.
    """


my_tasks = core.place(MyTask(), {"name": "my_tasks", "kind": "database on this device"})


# -----------


##############
# ## Task List
##############
# A to-do list:  type a task and add it, tick it off when it's done, delete it, and drag the tasks into order.
# Its tasks and their checklist are in Task.spell;  this file holds the app.
# They're kept on this device, so they're still there next time:  TaskList.api.spell says where.

############
# ## The app
############
# A header saying how many are left, the new task's field, then the list;  and a tour of them, its Tour button in the header.


class TaskList(App):
    element_tag = "test-project-app"

    # "checklist" is a new checklist
    checklist = prop(init=lambda: Checklist(id="checklist"), early=True)

    # The next task's title, as the new task's field holds it
    # - its "draft" is text
    draft = prop(type="text")

    @property
    def active_count(self) -> float:
        return len(self.checklist.filter(lambda task: task.is_active))

    async def create(self) -> None:
        """The tasks kept on this device, in their order"""
        await self.fill_the_checklist()

    async def fill_the_checklist(self) -> None:
        """The first time, with none kept yet, a few to start with"""
        core.clear(self.checklist)
        for task in core.sorted_by(await core.saved_things(Task), lambda item: item.order):
            self.checklist.append(task)
        if self.checklist:
            return
        self.add_the_task_title("Add a task above")
        self.add_the_task_title("Tick it off when it's done")
        self.add_the_task_title("Drag a task by its handle to move it")
        self.add_the_task_title("Delete one with its button")
        self.checklist.first_item.done = True

    def add_the_task_title(self, title: str) -> None:
        """A new task at the end of the list, kept on this device"""
        task = Task(title=title)
        core.save_thing(task)
        self.checklist.append(task)
        task.order = len(self.checklist)

    def add_the_draft(self) -> None:
        """The draft, as a new task;  the field empties"""
        if self.draft == "":
            return
        self.add_the_task_title(self.draft)
        self.draft = ""

    def take_the_tour(self) -> None:
        """A few steps through the app, pointing at each part"""
        core.start_tour("Task List")

    def draw(self) -> Element:
        return h(
            "ui-container",
            h(
                "ui-stack",
                h(
                    "ui-stack",
                    {"direction": "horizontal", "justify": "between"},
                    h("ui-header", {"level": "2"}, "Task List"),
                    h(
                        "ui-stack",
                        {"direction": "horizontal", "spacing": "sm"},
                        h(
                            "ui-text",
                            {"color": "grey"},
                            h("span", {"hidden": None if self.active_count == 0 else "until-found"}, "All done"),
                            h(
                                "span",
                                {"hidden": None if not self.active_count == 0 else "until-found"},
                                self.active_count,
                                " to do",
                            ),
                        ),
                        core.draw_action(self, "take_the_tour", {"appearance": "tertiary"}),
                    ),
                ),
                h(
                    "ui-form",
                    {"prop:value": self},
                    h(
                        "ui-input",
                        {
                            "id": "new task",
                            "name": "draft",
                            "placeholder": "Something to do",
                            "aria-label": "New task",
                            "fluid": True,
                            "action": True,
                        },
                        h(
                            "ui-button",
                            {
                                "slot": "action",
                                "color": "primary",
                                "disabled": self.draft == "",
                                "onClick": lambda event: self.add_the_draft(),
                                "style": "cursor:var(--ui-control-cursor,pointer);user-select:none",
                            },
                            "Add",
                        ),
                    ),
                ),
                core.draw_thing(self.checklist),
            ),
            h(
                "ui-tour",
                {"name": "Task List", "summary": "Add your tasks, tick them off and put them in order."},
                h("ui-tour-step", {"target": "new task"}, "Type something to do here, then press Add."),
                h(
                    "ui-tour-step",
                    {"target": "checklist"},
                    "Your tasks are here. Tick one off when it's done.",
                ),
                h("ui-tour-step", {"target": "checklist"}, "Drag a task by its handle to move it."),
                h("ui-tour-step", "That's it. Your tasks stay on this device for next time."),
            ),
        )


task_list = TaskList()
core.describe_action(TaskList, "fill_the_checklist", {"title": "Fill the Checklist", "undone_as": "Fill the Checklist"})
core.describe_action(TaskList, "add_the_task_title", {"title": "Add the Task Title", "undone_as": "Add the Task Title"})
core.describe_action(TaskList, "add_the_draft", {"title": "Add the Draft", "undone_as": "Add the Draft"})
core.describe_action(TaskList, "take_the_tour", {"title": "Tour", "icon": "map signs", "undone_as": "Tour"})


# -----------


core.install_styles(None, """/* File styles.css:  what Spell UI's tags can't say yet.
   - Each task is an element of its own inside the list, <task-list-checklist>:  <task-list-task>.
   - Its title's field fills the row by itself:  it's \\`fluid\\`, in a row of a \\`<stack>\\`. */

/* done:  it fades */
task-list-checklist > [done] {
  opacity: 0.6;
}
""")


# -----------


task_list.start()


# -----------


test_a_dragged_order_is_kept()
test_checking_one_off()
