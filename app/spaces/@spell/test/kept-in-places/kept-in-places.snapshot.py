from __future__ import annotations

import asyncio

from spell_core import core, Thing, App, Place, prop, h, Element


###################
# ## Kept in places
###################


class Note(Thing):
    # - its "text" is text
    text = prop(type="text")


class DeviceNote(Note):
    saved_in = {"place": "this_device", "collection": "device_notes", "times": ["created", "modified"]}

    # - it lives in this device
    created = prop(type="date")

    # - it lives in this device
    modified = prop(type="date")


class FolderNote(Note):
    saved_in = {"place": "note_folder", "collection": "folder_notes", "times": ["created", "modified"]}

    # - it lives in note folder
    created = prop(type="date")

    # - it lives in note folder
    modified = prop(type="date")


class SheetNote(Note):
    saved_in = {"place": "note_sheet", "collection": "sheet_notes", "times": ["created", "modified"]}

    # - it lives in note sheet
    created = prop(type="date")

    # - it lives in note sheet
    modified = prop(type="date")


class ThisDevice(Place):
    """
    A note kept in each kind of place a Python program keeps things in (epic `data` P40):
    - a database on this device:  in a browser, its own storage;  in Python, a file beside the program
    - a data folder on the server:  each note a JSON file, in this project's `__data/notes`
    - a CSV file on the server:  this project's `__data/notes.csv`, a row each
    The restart test keeps a note in each, stops the program, runs it again, and reads them back.
    """


this_device = core.place(ThisDevice(), {"name": "this_device", "kind": "database on this device"})


class NoteFolder(Place):
    pass


note_folder = core.place(
    NoteFolder(),
    {
        "name": "note_folder",
        "kind": "data folder",
        "at": "/api/places/spaces/@spell/test/kept-in-places/__data/notes",
        "checked_every": 30,
    },
)


class NoteSheet(Place):
    pass


note_sheet = core.place(
    NoteSheet(),
    {
        "name": "note_sheet",
        "kind": "sheet",
        "at": "/api/places/spaces/@spell/test/kept-in-places/__data/notes.csv",
        "id_column": "id",
        "checked_every": 30,
    },
)


class NoteKeeper(App):
    element_tag = "test-project-app"

    # - its "draft" is text
    draft = prop(type="text")

    # - its "device count" is a number
    device_count = prop(type="number")

    # - its "folder count" is a number
    folder_count = prop(type="number")

    # - its "sheet count" is a number
    sheet_count = prop(type="number")

    def keep_the_draft(self) -> None:
        """the draft, kept in each place"""
        if self.draft == "":
            return
        core.save_thing(DeviceNote(text=self.draft))
        core.save_thing(FolderNote(text=self.draft))
        core.save_thing(SheetNote(text=self.draft))
        self.draft = ""

    async def count_the_notes(self) -> None:
        """how many each place keeps now"""
        self.device_count = core.item_count_of(await core.saved_things(DeviceNote))
        self.folder_count = core.item_count_of(await core.saved_things(FolderNote))
        self.sheet_count = core.item_count_of(await core.saved_things(SheetNote))

    def draw(self) -> Element:
        return h(
            "ui-stack",
            h(
                "ui-form",
                {"value": self},
                h("ui-input", {"name": "draft", "aria-label": "Note"}),
                h(
                    "ui-button",
                    {
                        "class": "keep",
                        "onClick": lambda event: self.keep_the_draft(),
                        "style": "cursor:var(--ui-control-cursor,pointer);user-select:none",
                    },
                    "Keep",
                ),
            ),
            h(
                "ui-text",
                {"class": "counts"},
                self.device_count,
                " on this device, ",
                self.folder_count,
                " in the folder, ",
                self.sheet_count,
                " in the sheet",
            ),
        )


note_keeper = NoteKeeper()

##########
# ## Start
##########
# only this device's notes:  the server's need a page server, which a plain run has none of


async def _step_1():
    core.console.log(core.item_count_of(await core.saved_things(DeviceNote)))


asyncio.run(_step_1())


core.save_thing(DeviceNote(text="a run"))


async def _step_2():
    core.console.log(core.item_count_of(await core.saved_things(DeviceNote)))


asyncio.run(_step_2())


note_keeper.start()
