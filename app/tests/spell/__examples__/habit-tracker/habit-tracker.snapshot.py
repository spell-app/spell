from __future__ import annotations

from spell_core import core, App, View, ViewableList, prop, h, Element


##################
# ## Habit Tracker
##################
# A week of checkboxes for each habit:  tick a day when you did it.
# Each habit counts its days, and its streak:  the most days in a row you kept it up.

############
# ## A habit
############
# Its name, a yes or no for each day of the week, and what they add up to.
# Each habit is its own element on the page, `<habit-tracker-habit>`.


class Habit(View):
    element_tag = "test-project-habit"

    # - its "name" is text
    name = prop(type="text")

    # - its "monday" is yes or no
    monday = prop(type="choice")

    # - its "tuesday" is yes or no
    tuesday = prop(type="choice")

    # - its "wednesday" is yes or no
    wednesday = prop(type="choice")

    # - its "thursday" is yes or no
    thursday = prop(type="choice")

    # - its "friday" is yes or no
    friday = prop(type="choice")

    # - its "saturday" is yes or no
    saturday = prop(type="choice")

    # - its "sunday" is yes or no
    sunday = prop(type="choice")

    @property
    def days(self) -> list:
        """Its week as one list, Monday first"""
        return [
            self.monday,
            self.tuesday,
            self.wednesday,
            self.thursday,
            self.friday,
            self.saturday,
            self.sunday,
        ]

    @property
    def count(self) -> float:
        """How many days this week it was done"""
        return len(core.filter(self.days, lambda day: day))

    @property
    def streak(self) -> float:
        """The most days in a row it was done"""
        run = 0
        best = 0
        for day in self.days:
            if day:
                run = run + 1
                if run > best:
                    best = run
            else:
                run = 0
        return best

    def draw(self) -> Element:
        """A form of its own, bound to it:  ticking a day, or typing a name, changes the habit"""
        return h(
            "ui-segment",
            h(
                "ui-form",
                {"value": self},
                h(
                    "ui-stack",
                    {"spacing": "sm"},
                    h(
                        "ui-stack",
                        {"direction": "horizontal", "justify": "between"},
                        h("ui-input", {"name": "name", "aria-label": "Habit", "appearance": "transparent"}),
                        h(
                            "ui-labels",
                            h("ui-label", self.count, " days"),
                            h("ui-label", {"color": "orange", "icon": "fire"}, self.streak, " in a row"),
                        ),
                    ),
                    h(
                        "ui-stack",
                        {"direction": "horizontal", "justify": "between", "wrap": True},
                        h("ui-checkbox", {"name": "monday", "label": "Mon"}),
                        h("ui-checkbox", {"name": "tuesday", "label": "Tue"}),
                        h("ui-checkbox", {"name": "wednesday", "label": "Wed"}),
                        h("ui-checkbox", {"name": "thursday", "label": "Thu"}),
                        h("ui-checkbox", {"name": "friday", "label": "Fri"}),
                        h("ui-checkbox", {"name": "saturday", "label": "Sat"}),
                        h("ui-checkbox", {"name": "sunday", "label": "Sun"}),
                    ),
                ),
            ),
        )

    @property
    def week(self) -> Week | None:
        return Week.owner_of(self)


# A yes or no for each day of the week

# Worked out from its days, again as each one is ticked


class Week(ViewableList):
    item_type = Habit
    element_tag = "test-project-week"

    def draw(self) -> Element:
        """Its habits one under the other;  while it's empty, a line saying so"""
        return h(
            "ui-stack",
            {"spacing": "sm"},
            h(
                "ui-text",
                {"color": "grey", "hidden": None if not self else True},
                "No habits yet:  add one above",
            ),
            h("slot"),
        )

    reorder_items_after = 0

    exclusive = True


def test_streaks() -> None:
    with core.test("test streaks"):
        it = Habit()
        core.echo_test_action(
            "set the habit to a new habit with name = \"Read\", monday = yes, tuesday = yes, thursday = yes",
        )
        habit = Habit(name="Read", monday=True, tuesday=True, thursday=True)
        core.expect(habit.count, "the habit's count", 3, "3")
        core.expect(habit.streak, "the habit's streak", 2, "2")
        core.echo_test_action("set the habit's wednesday to yes")
        habit.wednesday = True
        core.expect(habit.streak, "the habit's streak", 4, "4")


#############
# ## The week
#############
# The habits, one under the other:  `<habit-tracker-week>`, around its habits' elements.

# on the page, its habits can be dragged to another place

# a habit is in one week

################
# ## The tracker
################
# The new habit's field, then a habit a row.


class HabitTracker(App):
    element_tag = "test-project-app"

    # - its "habits" is a new week
    habits = prop(init=lambda: Week(), early=True)

    # The next habit's name, as the new habit's field holds it
    # - its "draft" is text
    draft = prop(type="text")

    def create(self) -> None:
        """A new tracker starts with three habits, a few days ticked"""
        self.habits.append(Habit(name="Read", monday=True, tuesday=True, wednesday=True, friday=True))
        self.habits.append(Habit(name="Walk", tuesday=True, wednesday=True, thursday=True, friday=True))
        self.habits.append(Habit(name="Stretch", monday=True, saturday=True))

    def add_the_draft(self) -> None:
        """The draft, as a new habit at the end;  the field empties"""
        if self.draft == "":
            return
        self.habits.append(Habit(name=self.draft))
        self.draft = ""

    def draw(self) -> Element:
        return h(
            "ui-container",
            {"text": True},
            h(
                "ui-stack",
                h("ui-header", {"level": "2"}, "This week"),
                h(
                    "ui-form",
                    {"value": self},
                    h(
                        "ui-input",
                        {
                            "name": "draft",
                            "placeholder": "A habit to keep, e.g. Read",
                            "aria-label": "New habit",
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
                core.draw_thing(self.habits),
            ),
        )


habit_tracker = HabitTracker()


# -----------


habit_tracker.start()


# -----------


test_streaks()
