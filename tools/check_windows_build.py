"""Reject Windows builds missing the Tcl/Tk data required at startup."""
import argparse
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path)
    args = parser.parse_args()
    if args.exe:
        from PyInstaller.archive.readers import CArchiveReader
        names = {name.replace("\\", "/") for name in CArchiveReader(str(args.exe)).toc}
        for name in ("_tcl_data/init.tcl", "_tk_data/tk.tcl"):
            if name not in names:
                raise SystemExit(f"Windows package is missing {name}; refusing release")
        print("Packaged Tcl/Tk startup data verified")
    else:
        from PyInstaller.utils.hooks.tcl_tk import tcltk_info
        if not tcltk_info.available or not tcltk_info.data_files:
            raise SystemExit("Tcl/Tk data cannot be packaged with this Python. Use Python 3.12 in .venv or set SERVICE_TOOL_BUILD_PYTHON.")
        for name in ("tcl_data_dir", "tk_data_dir"):
            if not Path(getattr(tcltk_info, name)).is_dir():
                raise SystemExit(f"Missing {name}; use a Python installation with Tcl/Tk data files")
        print(f"Build interpreter: {sys.executable}; Tcl/Tk data available")


if __name__ == "__main__":
    main()
