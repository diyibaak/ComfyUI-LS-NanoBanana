from pathlib import Path
import shutil
import sys

if sys.implementation.name != "cpython" or sys.version_info[:2] != (3, 13):
    raise RuntimeError("LS NanoBanana bytecode edition requires CPython 3.13; see README.md.")

config = Path(__file__).with_name("config.ini")
if not config.exists():
    shutil.copyfile(Path(__file__).with_name("config.example.ini"), config)

from ._loader import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS, WEB_DIRECTORY, __version__
