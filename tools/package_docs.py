"""Copy release documentation and its referenced images, without runtime data."""
import argparse
from pathlib import Path
import re
import shutil


DOCUMENTS = (
    "README.md", "MIGRATION.md", "CHANGELOG.md", "LICENSE",
    "static/help/de.md", "static/help/en.md",
)


def package_docs(destination: Path, source: Path | None = None) -> list[Path]:
    source = (source or Path(__file__).resolve().parents[1]).resolve()
    destination = destination.resolve()
    paths = {Path(name) for name in DOCUMENTS}
    for name in DOCUMENTS:
        document = source / name
        content = document.read_text(encoding="utf-8-sig")
        for target in re.findall(r"!\[[^\]]*\]\(([^)]+)\)", content):
            image = (document.parent / target).resolve()
            relative = image.relative_to(source)
            if relative.parts[0] != "img" and relative.parts[:3] != ("static", "help", "img"):
                raise ValueError(f"Image outside documentation directories: {target}")
            if image.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
                raise ValueError(f"Unsupported documentation image: {target}")
            paths.add(relative)
    # Validate everything before copying; never silently ship missing images.
    for relative in paths:
        if not (source / relative).is_file():
            raise FileNotFoundError(source / relative)
    for relative in sorted(paths):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / relative, target)
    return sorted(paths)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    files = package_docs(args.destination)
    print(f"Packaged {len(files)} documentation files.")
