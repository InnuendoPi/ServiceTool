"""Filename rules shared by the recipe designer and device file operations."""

import os
from pathlib import PurePosixPath
import re

RECIPE_DIRS = {"/Rezepte", "/Fermenter"}
RECIPE_EXTENSION = ".json"
RECIPE_NAME_MAX_CHARS = 50 - len(RECIPE_EXTENSION)
INVALID_RECIPE_CHAR = re.compile(r'[/\\"\x00-\x1f\x7f-\x9f\ud800-\udfff]')
LEGACY_RECIPE_NAME = re.compile(r"[A-Za-z0-9_-]+\.json\Z")


def validate_recipe_name(name, *, new=True):
    if (not isinstance(name, str) or not name or name in {".", ".."}
            or INVALID_RECIPE_CHAR.search(name)
            or new and (len(name) > RECIPE_NAME_MAX_CHARS or name.startswith(" ") or name.endswith(" "))):
        raise ValueError("Invalid recipe filename (maximum 50 characters including .json).")
    return name


def validate_recipe_filename(filename, *, new=True):
    extension = filename if new else filename.lower()
    if not extension.endswith(RECIPE_EXTENSION):
        raise ValueError("Recipe filename must end with .json.")
    validate_recipe_name(filename[:-len(RECIPE_EXTENSION)], new=new)
    return filename


def validate_local_recipe_filename(filename, *, new=False):
    validate_recipe_filename(filename, new=new)
    if os.name == "nt":
        first_segment = filename.split(".")[0].upper()
        if (any(char in filename for char in ':*?"<>|')
                or re.fullmatch(r"CON|PRN|AUX|NUL|(?:COM|LPT)[1-9¹²³]", first_segment)):
            raise ValueError("Recipe filename is invalid on the local filesystem. Choose a different export name.")
    return filename


def is_device_recipe_path(path):
    return str(PurePosixPath(path).parent) in RECIPE_DIRS and path.lower().endswith(RECIPE_EXTENSION)
