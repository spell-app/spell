from __future__ import annotations

from typing import Any, Literal

from spell_core import core, Thing, List, App, View, ViewableList, Place, prop, h, Element, SentEvent


###########
# ## A task
###########
# Something to do:  its title, its priority, and whether it's done.
# Each task is its own element on the page, `<task-list-task>`.
# A click selects it, shift and command (ctrl) more, for the property editor (`selectable`);
# a drag moves it, the selected ones with it (`draggable`).


Priority = Literal["low", "normal", "high"]


class Task(View):
    element_tag = "test-project-task"

    # What to do
    # - its "title" is text
    title = prop(type="text")

    # Anything else about it
    # - its "notes" is text
    notes = prop(type="text")

    # - its "priority" is one of low, normal or high
    PRIORITIES = ("low", "normal", "high")
    priority = prop(one_of=PRIORITIES)

    # - its "done" is yes or no
    done = prop(type="choice")

    # Where it sits in its checklist, from 1:  kept with it, so the order people drag the tasks into comes back
    # - its "order" is number
    order = prop(type="number")

    @property
    def is_done(self) -> bool:
        return self.done

    @property
    def is_active(self) -> bool:
        return not self.is_done

    def throw_away(self) -> None:
        """Gone from where it's kept:  a task kept nowhere has nothing to do;  each kind of kept task says how, in its keeper's file"""
        return

    def draw(self) -> Element:
        """A form of its own, bound to it:  checking the box, or typing a title, changes the task;  its priority shows only when it isn't normal"""
        return h(
            "ui-form",
            {"value": self},
            h(
                "ui-stack",
                {"direction": "horizontal", "spacing": "sm"},
                h("ui-icon", {"name": "grip vertical", "color": "grey", "aria-label": "Drag"}),
                h("ui-checkbox", {"name": "done", "aria-label": "Done"}),
                h(
                    "ui-input",
                    {
                        "part": "title",
                        "name": "title",
                        "aria-label": "Task",
                        "appearance": "transparent",
                        "fluid": True,
                    },
                ),
                h(
                    "ui-label",
                    {
                        "size": "tiny",
                        "color": "red" if self.priority == "high" else "grey",
                        "hidden": None if self.priority != "normal" else True,
                    },
                    self.priority,
                ),
            ),
        )

    draggable = True

    selectable = True

    @property
    def checklist(self) -> Checklist | None:
        return Checklist.owner_of(self)


def test_checking_one_off() -> None:
    with core.test("test checking one off"):
        it = Task()
        core.echo_test_action("set the task to a new task with title = \"Write the tests\"")
        task = Task(title="Write the tests")
        core.expect(task.is_active, "the task is active", True, "yes")
        core.echo_test_action("set the task's done to yes")
        task.done = True
        core.expect(task.is_done, "the task is done", True, "yes")


# -----------


#########################################
# ## Task List:  where the tasks are kept
#########################################
# The app asks a KEEPER for its tasks, and never says where they are:
# each kind of keeper is in a file of its own, and says it in its own way.
#   TaskList.browser.api.spell:  in this browser, the one it starts with
#   TaskList.server.api.spell:  in a JSON file on the server
#   TaskList.csv.api.spell:  in a CSV file on the server
#   TaskList.atmosphere.api.spell:  in your own atmosphere account, Bluesky's AT Protocol
# Every keeper does the same three things:
# - its kept tasks:  the tasks it has, read when the app picks it
# - keep a new task titled ...:  a new task, kept from now on
# - throw away a task:  a task's own action, which its kind of task says
# A task kept anywhere saves itself as it changes:  ticking it, or typing its title, is kept, with no save step.
# Its place in the list is kept the same way, as its order:  so the tasks come back in the order people dragged them into.


class TaskKeeper(Thing):
    # the tasks it has, in any order:  the app puts them in their own order
    # - its "kept tasks" is a list of tasks
    kept_tasks = prop(item_type="Task", init=lambda: List(item_type="Task"))

    def keep_a_new_task_titled_title(self, title: str) -> Task:
        """a new task, kept from now on, which it hands back"""
        return Task(title=title)


# -----------


#########################
# ## Kept in this browser
#########################


class BrowserTask(Task):
    element_tag = "test-project-browser-task"

    def throw_away(self) -> None:
        core.remove_saved(self)

    saved_in = {
        "place": "browser_storage",
        "collection": "browser_tasks",
        "times": ["created", "modified"],
    }

    # - it lives in browser storage
    created = prop(type="date")

    # - it lives in browser storage
    modified = prop(type="date")


class BrowserKeeper(TaskKeeper):
    @property
    async def kept_tasks(self) -> Any:
        return await core.saved_things(BrowserTask)

    def keep_a_new_task_titled_title(self, title: str) -> BrowserTask:
        task = BrowserTask(title=title)
        core.save_thing(task)
        return task


class BrowserStorage(Place):
    """
    The tasks stay on this device, in this browser's own storage:  nobody else sees them, and no server is asked.
    The app starts here, so it runs with no server and no sign-in.
    """


browser_storage = core.place(
    BrowserStorage(),
    {"name": "browser_storage", "kind": "database on this device"},
)


# -----------


######################################
# ## Kept in a JSON file on the server
######################################


class ServerTask(Task):
    element_tag = "test-project-server-task"

    def throw_away(self) -> None:
        core.remove_saved(self)

    saved_in = {"place": "task_files", "collection": "server_tasks", "times": ["created", "modified"]}

    # - it lives in task files
    created = prop(type="date")

    # - it lives in task files
    modified = prop(type="date")


class ServerKeeper(TaskKeeper):
    @property
    async def kept_tasks(self) -> Any:
        return await core.saved_things(ServerTask)

    def keep_a_new_task_titled_title(self, title: str) -> ServerTask:
        task = ServerTask(title=title)
        core.save_thing(task)
        return task


class TaskFile(Place):
    """
    The tasks are a project data folder on Spell's server:  each task a JSON file, in this project's `__data/tasks`.
    Everyone who runs the app shares them, and each person changes only the tasks they made.
    Open one in an editor and change it:  the app shows it at its next check.
    """


task_files = core.place(
    TaskFile(),
    {
        "name": "task_files",
        "kind": "data folder",
        "at": "/api/places/spaces/@spell/examples/TaskList/__data/tasks",
        "checked_every": 30,
    },
)


# -----------


#####################################
# ## Kept in a CSV file on the server
#####################################


class SheetTask(Task):
    element_tag = "test-project-sheet-task"

    def throw_away(self) -> None:
        core.remove_saved(self)

    saved_in = {"place": "task_sheet", "collection": "sheet_tasks", "times": ["created", "modified"]}

    # - it lives in task sheet
    created = prop(type="date")

    # - it lives in task sheet
    modified = prop(type="date")


class SheetKeeper(TaskKeeper):
    @property
    async def kept_tasks(self) -> Any:
        return await core.saved_things(SheetTask)

    def keep_a_new_task_titled_title(self, title: str) -> SheetTask:
        task = SheetTask(title=title)
        core.save_thing(task)
        return task


class TaskSheet(Place):
    """
    The tasks are one CSV file on Spell's server, this project's `__data/tasks.csv`:  a row each, under the columns its first line names.
    Everyone who runs the app shares it, and anyone changes any row:  a CSV file has no column saying whose a row is.
    Each change rewrites only its own line, so the file reads well in a diff;  open it in a sheet or an editor and change it,
    and the app shows it at its next check.
    """


task_sheet = core.place(
    TaskSheet(),
    {
        "name": "task_sheet",
        "kind": "sheet",
        "at": "/api/places/spaces/@spell/examples/TaskList/__data/tasks.csv",
        "id_column": "id",
        "checked_every": 30,
    },
)


# -----------


####################################
# ## Kept in your atmosphere account
####################################


class SkyTask(Task):
    element_tag = "test-project-sky-task"

    def throw_away(self) -> None:
        core.remove_saved(self)

    # whose it is:  the account it's in, which a record can't claim
    # a sky task has an owner as text
    owner = prop(type="text")

    saved_in = {"place": "task_sky", "collection": "sky_tasks", "times": ["created", "modified"]}

    # - it lives in task sky
    created = prop(type="date")

    # - it lives in task sky
    modified = prop(type="date")


class SkyKeeper(TaskKeeper):
    @property
    async def kept_tasks(self) -> Any:
        """only your own:  everyone's tasks are in their own accounts"""
        return await core.saved_things(SkyTask, {"filter": {"owner": core.current_person().id}})

    def keep_a_new_task_titled_title(self, title: str) -> SkyTask:
        task = SkyTask(title=title)
        core.save_thing(task)
        return task


class TaskSky(Place):
    """
    The tasks are records in your own atmosphere account, Bluesky's AT Protocol, as Statusphere's statuses are:
    sign in, and they go with you to any app that reads them.
    Records there are public:  anyone can read them, so keep nothing private in a task.
    """


task_sky = core.place(
    TaskSky(),
    {
        "name": "task_sky",
        "kind": "personal atmosphere account",
        "collections": {"sky_tasks": {"at": "spaces.spell.examples.tasklist.task"}},
    },
)


# -----------


##############
# ## Task List
##############
# A to-do list:  add a task, check it off, filter the list, and edit the selected tasks together.
# Its tasks are this project's own `<view "task">`;  this file holds their list, and the app.
# Where they're kept is the person's pick, "Keep them in":  each place is a keeper in an API file of its own,
# TaskList.browser.api.spell, TaskList.server.api.spell, TaskList.csv.api.spell and TaskList.atmosphere.api.spell, all doing what TaskList.api.spell says.

##################
# ## The checklist
##################
# The tasks, each its own element inside it:  `<task-list-checklist>`, around its `<task-list-task>`s.


Showing = Literal["all", "active", "done"]


class Checklist(ViewableList):
    item_type = Task
    element_tag = "test-project-checklist"

    # What it shows:  every task, the ones still to do, or the ones done
    # - its "showing" is one of all, active or done
    #   - it "is showing (showing)"
    SHOWINGS = ("all", "active", "done")
    showing = prop(one_of=SHOWINGS)

    def is_showing_showing(self, showing: Showing) -> bool:
        return self.showing == showing

    def when_task_dropped_on(self, task: Task) -> None:
        """a drop has moved its tasks:  each keeps its new place"""
        self.keep_the_order()

    # each task, unless the filter hides it

    def draw_each_item(self, item: Task) -> Any:
        if self.is_showing_showing("active") and item.is_done:
            return None
        if self.is_showing_showing("done") and item.is_active:
            return None
        return core.draw_thing(item)

    def draw(self) -> Element:
        """Its tasks one under the other;  while it's empty, a line saying so"""
        return h(
            "ui-stack",
            {"spacing": "xs"},
            h("ui-text", {"color": "grey", "hidden": None if not self else True}, "Nothing to do"),
            h("slot"),
        )

    def keep_the_order(self) -> None:
        """Each task keeps its place in the list, from 1, where it's kept:  so the order people drag them into comes back next time"""
        for place, task in enumerate(self, 1):
            task.order = place

    reorder_items_after = 0

    exclusive = True


# on the page, its tasks can be dragged to another place:  they move as the pointer does, gliding there


def test_the_filter() -> None:
    with core.test("test the filter"):
        it = Checklist()
        core.echo_test_action("set the tasks to a new checklist")
        tasks = Checklist()
        core.echo_test_action("add (a new task with title = \"a\", done = yes) to the tasks")
        tasks.append(Task(title="a", done=True))
        core.echo_test_action("add (a new task with title = \"b\") to the tasks")
        tasks.append(Task(title="b"))
        core.expect(
            len(tasks.filter(lambda task: task.is_active)),
            "the length of (tasks in the tasks where it is active)",
            1,
            "1",
        )


def test_a_dragged_order_is_kept() -> None:
    with core.test("test a dragged order is kept"):
        it = Checklist()
        core.echo_test_action("set the tasks to a new checklist")
        tasks = Checklist()
        core.echo_test_action("set the first to a new task with title = \"first\"")
        first = Task(title="first")
        core.echo_test_action("set the second to a new task with title = \"second\"")
        second = Task(title="second")
        core.echo_test_action("add the second to the tasks")
        tasks.append(second)
        core.echo_test_action("add the first to the tasks")
        tasks.append(first)
        core.echo_test_action("keep the order of the tasks")
        tasks.keep_the_order()
        core.expect(second.order, "the order of the second", 1, "1")
        core.expect(first.order, "the order of the first", 2, "2")
        core.expect(
            getattr(core.get_item_at(core.sorted_by(tasks, lambda item: item.order), 0), "title", None),
            "the title of the first task in (the tasks sorted by its order)",
            "second",
            "\"second\"",
        )


# a task is in one checklist at a time

############
# ## The app
############
# Its toolbar, the new task's field, then the list beside the property editor.


Storage = Literal["browser", "server", "csv", "atmosphere"]


class TaskList(App):
    element_tag = "test-project-app"

    # - its "checklist" is a new checklist
    checklist = prop(init=lambda: Checklist(), early=True)

    # The next task's title, as the new task's field holds it
    # - its "draft" is text
    draft = prop(type="text")

    @property
    def active_count(self) -> float:
        return len(self.checklist.filter(lambda task: task.is_active))

    # Where the tasks are kept:  this browser, a JSON file on the server, a CSV file on the server, or your atmosphere account
    # - its "storage" is one of browser, server, csv or atmosphere
    STORAGES = ("browser", "server", "csv", "atmosphere")
    storage = prop(one_of=STORAGES)

    # Who keeps them, for where they're kept:  one of the keepers in the API files
    # - its "keeper" is a task keeper
    keeper = prop(type="TaskKeeper")

    async def on_storage_change(self, event: StorageChangeEvent) -> None:
        if self.storage == "server":
            self.keeper = ServerKeeper()
        elif self.storage == "csv":
            self.keeper = SheetKeeper()
        elif self.storage == "atmosphere":
            self.keeper = SkyKeeper()
        else:
            self.keeper = BrowserKeeper()
        await self.fill_the_checklist()

    async def fill_the_checklist(self) -> None:
        """The keeper's tasks, in the list;  a keeper with none starts with a few"""
        core.clear(self.checklist)
        for task in core.sorted_by(await core.answer_of(self.keeper, "kept_tasks"), lambda item: item.order):
            self.checklist.append(task)
        if self.checklist:
            return
        self.add_the_starting_task_title_with_priority_level(
            "Write the Task List example",
            "high",
        )
        self.add_the_starting_task_title_with_priority_level("Teach it to draw", "normal")
        self.add_the_starting_task_title_with_priority_level(
            "Select some tasks, then edit them together",
            "normal",
        )
        self.add_the_starting_task_title_with_priority_level(
            "Drag tasks to reorder them",
            "low",
        )
        self.checklist.first_item.done = True

    async def create(self) -> None:
        """A new task list keeps its tasks in this browser, and shows every one"""
        self.checklist.showing = "all"
        self.storage = "browser"
        self.keeper = BrowserKeeper()
        await self.fill_the_checklist()

    def add_the_starting_task_title_with_priority_level(self, title: str, level: str) -> None:
        task = self.keeper.keep_a_new_task_titled_title(title)
        task.priority = level
        self.checklist.append(task)
        task.order = len(self.checklist)

    def add_the_draft(self) -> None:
        """The draft, as a new task at the end of the list;  the field empties"""
        if self.draft == "":
            return
        title = self.draft
        task = self.keeper.keep_a_new_task_titled_title(title)
        task.priority = "normal"
        self.checklist.append(task)
        task.order = len(self.checklist)
        self.draft = ""

    def draw(self) -> Element:
        """The property editor edits every selected task at once:  a property they disagree on shows Mixed"""
        return h(
            "ui-container",
            h(
                "ui-stack",
                h(
                    "ui-toolbar",
                    {"menu": "tasks menu", "aria-label": "Tasks"},
                    h("ui-text", {"slot": "title", "size": "large"}, "Task List"),
                    h(
                        "ui-text",
                        {"slot": "right"},
                        h("span", {"hidden": None if self.active_count == 0 else "until-found"}, "All done"),
                        h(
                            "span",
                            {"hidden": None if not self.active_count == 0 else "until-found"},
                            self.active_count,
                            " to do",
                        ),
                    ),
                ),
                h(
                    "ui-form",
                    {"value": self},
                    h(
                        "ui-stack",
                        h(
                            "ui-field",
                            {"label": "Keep them in", "inline": True},
                            h(
                                "ui-select",
                                {"name": "storage"},
                                h("ui-item", {"value": "browser", "icon": "desktop"}, "This browser"),
                                h("ui-item", {"value": "server", "icon": "server"}, "A JSON file on the server"),
                                h("ui-item", {"value": "csv", "icon": "table"}, "A CSV file on the server"),
                                h("ui-item", {"value": "atmosphere", "icon": "cloud"}, "Your atmosphere account"),
                            ),
                        ),
                        h(
                            "ui-input",
                            {
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
                ),
                h(
                    "ui-grid",
                    {"columns": "2", "stackable": True, "context-menu": "list menu"},
                    core.draw_thing(self.checklist),
                    h(
                        "ui-property-editor",
                        {
                            "label": "Selected tasks",
                            "schema": "task-list-task",
                            "prop:value": self.checklist.selection,
                        },
                        h("ui-property", {"name": "title"}),
                        h("ui-property", {"name": "priority"}),
                        h("ui-property", {"name": "done"}),
                        h("ui-property", {"name": "notes"}),
                    ),
                ),
            ),
        )

    def show_all(self) -> None:
        self.checklist.showing = "all"

    @property
    def show_all_is_selected(self) -> bool:
        return self.checklist.is_showing_showing("all")

    def show_to_do(self) -> None:
        self.checklist.showing = "active"

    @property
    def show_to_do_is_selected(self) -> bool:
        return self.checklist.is_showing_showing("active")

    def show_done(self) -> None:
        self.checklist.showing = "done"

    @property
    def show_done_is_selected(self) -> bool:
        return self.checklist.is_showing_showing("done")

    def remove_the_done_tasks(self) -> None:
        for task in self.checklist.filter(lambda task: task.is_done):
            task.throw_away()
            self.checklist.remove(task)


task_list = TaskList()

# Where the tasks are kept:  the person picks, and the app asks that keeper

# Which tasks the list shows:  the toolbar ticks the one it's showing
core.describe_action(TaskList, "show_all", {"title": "All", "icon": "list", "selected_when": "show_all_is_selected"})
core.describe_action(TaskList, "show_to_do", {"title": "To do", "icon": "square outline", "selected_when": "show_to_do_is_selected"})
core.describe_action(TaskList, "show_done", {"title": "Done", "icon": "check square outline", "selected_when": "show_done_is_selected"})
core.describe_action(TaskList, "remove_the_done_tasks", {"title": "Remove the done tasks", "icon": "trash alternate outline"})

# The toolbar's buttons, and the list's right click:  the same actions
# - its "tasks menu" is a menu of "show all" , "show to do" , "show done" , "-" and "remove the done tasks"
core.describe_menu(TaskList, "tasks_menu", {"items": ["show_all", "show_to_do", "show_done", "-", "remove_the_done_tasks"]})

# - its "show menu" is a menu of "show all" , "show to do" and "show done" titled "Show"
core.describe_menu(TaskList, "show_menu", {"items": ["show_all", "show_to_do", "show_done"], "title": "Show"})

# A right click on the list:  which tasks it shows, as a menu of its own, then tidying up
# - its "list menu" is a menu of "show menu" , "-" and "remove the done tasks"
core.describe_menu(TaskList, "list_menu", {"items": ["show_menu", "-", "remove_the_done_tasks"]})


# -----------


core.install_styles(None, """/* File styles.css:  what Spell UI's tags can't say yet.
   - Each task is an element of its own inside the list, <task-list-checklist>:
     <task-list-browser-task>, <task-list-server-task> or <task-list-sky-task>, for where it's kept.
   - Its title's field fills the row by itself:  it's \\`fluid\\`, in a row of a \\`<stack>\\`. */

/* done:  it fades */
task-list-checklist > [done] {
  opacity: 0.6;
}
""")


# -----------


task_list.start()


# -----------


test_checking_one_off()
test_the_filter()
test_a_dragged_order_is_kept()


# what each event this program hears holds
class StorageChangeEvent(SentEvent):
    value: Storage
    was: Storage

