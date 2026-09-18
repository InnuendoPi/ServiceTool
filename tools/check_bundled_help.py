"""Check local help in a PyInstaller executable or macOS app without launching it."""
import argparse
from pathlib import Path


def expected_help_files(static_root: Path) -> dict[str, bytes]:
    for name in ("help.js", "help/de.md", "help/en.md", "help/README.md"):
        if not (static_root / name).is_file():
            raise ValueError(f"Required help source missing: {name}")
    paths = [static_root / "help.js"]
    paths.extend(path for path in (static_root / "help").rglob("*") if path.is_file())
    return {"static/" + path.relative_to(static_root).as_posix(): path.read_bytes() for path in paths}


def verify_help(expected: dict[str, bytes], read_file) -> None:
    for name, content in expected.items():
        try:
            packaged = read_file(name)
        except (KeyError, FileNotFoundError) as exc:
            raise ValueError(f"Packaged help missing: {name}") from exc
        if packaged != content:
            raise ValueError(f"Packaged help differs from source: {name}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--binary", type=Path)
    target.add_argument("--app", type=Path)
    args = parser.parse_args()
    expected = expected_help_files(Path(__file__).resolve().parents[1] / "static")
    if args.binary:
        from PyInstaller.archive.readers import CArchiveReader
        archive = CArchiveReader(str(args.binary))
        names = {name.replace("\\", "/"): name for name in archive.toc}
        verify_help(expected, lambda name: archive.extract(names[name]))
    else:
        resources = args.app / "Contents" / "Resources"
        verify_help(expected, lambda name: (resources / name).read_bytes())
    print(f"Bundled help verified: {len(expected)} files match the source (including help assets)")


if __name__ == "__main__":
    main()
