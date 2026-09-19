import fnmatch
import os
import sys

# ============================ SETTINGS ============================
ROOT_DIR = "."

OUTPUT_FILE = "config/manifest"

SUFFIX = "~"

PRINT_TO_CONSOLE = True

SKIP_HIDDEN = False

BLACKLIST_FILES = [
    "jsconfig.json",
    "generate_manifest.py"
]

BLACKLIST_EXTENSIONS = [
]

BLACKLIST_FOLDERS = [
    ".git",
    ".github",
    ".vscode",
]
# ===================================================================


def _matches(rel_path: str, name: str, patterns) -> bool:
    for pattern in patterns:
        if fnmatch.fnmatch(name, pattern) or fnmatch.fnmatch(rel_path, pattern):
            return True
    return False


def is_blacklisted_file(rel_path: str) -> bool:
    name = os.path.basename(rel_path)
    if SKIP_HIDDEN and name.startswith("."):
        return True
    if _matches(rel_path, name, BLACKLIST_FILES):
        return True
    ext = os.path.splitext(name)[1].lower()
    return ext in {e.lower() for e in BLACKLIST_EXTENSIONS}


def is_blacklisted_folder(name: str, rel_path: str) -> bool:
    if SKIP_HIDDEN and name.startswith("."):
        return True
    return _matches(rel_path, name, BLACKLIST_FOLDERS)


def build_file_list():
    lines = []
    output_abs = os.path.abspath(OUTPUT_FILE) if OUTPUT_FILE else None

    for dirpath, dirnames, filenames in os.walk(ROOT_DIR, topdown=True):
        rel_dir = os.path.relpath(dirpath, ROOT_DIR).replace(os.sep, "/")
        rel_dir = "" if rel_dir == "." else rel_dir

        dirnames[:] = [
            d for d in dirnames
            if not is_blacklisted_folder(d, f"{rel_dir}/{d}" if rel_dir else d)
        ]

        for filename in filenames:
            rel_file = f"{rel_dir}/{filename}" if rel_dir else filename
            if is_blacklisted_file(rel_file):
                continue
            if output_abs and os.path.abspath(os.path.join(dirpath, filename)) == output_abs:
                continue
            lines.append(rel_file + SUFFIX)

    lines.sort()
    return lines


def main():
    try:
        sys.stdout.reconfigure(errors="replace")
    except Exception:
        pass

    lines = build_file_list()
    output = "\n".join(lines) + "\n"

    if PRINT_TO_CONSOLE:
        print(output, end="")

    if OUTPUT_FILE:
        with open(OUTPUT_FILE, "w", encoding="utf-8", newline="\n") as f:
            f.write(output)


if __name__ == "__main__":
    main()