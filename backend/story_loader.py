# story_loader.py
# Discovers and loads story JSON files from the stories/ directory.
#
# Story JSON format:
#   {
#     "id":           str   -- unique identifier, e.g. "ch01_data_heist"
#     "chapter":      int   -- sort order
#     "title":        str   -- display title
#     "description":  str   -- one-line summary shown in the selector
#     "bug_type":     str   -- e.g. "causal_absence", "identity_reference"
#     "initial_tags": [str] -- tags present at story start
#     "events": [
#       {
#         "id":       str   -- unique event id, e.g. "evt_000"
#         "label":    str   -- short name shown in the node graph
#         "text":     str   -- narrative text shown to the player
#         "requires": [str] -- tags that must exist before this event runs
#         "provides": [str] -- tags added to the pool when this event runs
#       },
#       ...
#     ]
#   }
#
# Optional fields (ignored by the engine, useful for authors):
#   "_bug_note"  -- explains the intentional bug in an event

import json
from pathlib import Path

STORIES_DIR = Path(__file__).parent / "stories"


def list_stories() -> list[dict]:
    """
    Return metadata for all story JSON files found in stories/.
    Sorted by chapter number, then by filename.
    """
    results = []
    for path in sorted(STORIES_DIR.glob("*.json")):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            results.append({
                "id":          data["id"],
                "chapter":     data.get("chapter", 0),
                "title":       data.get("title", path.stem),
                "description": data.get("description", ""),
                "bug_type":    data.get("bug_type", "unknown"),
                "filename":    path.name,
            })
        except Exception as e:
            # Skip malformed files but don't crash the server
            print(f"[story_loader] Warning: could not load {path.name}: {e}")

    return sorted(results, key=lambda s: (s["chapter"], s["filename"]))


def load_story(story_id: str) -> dict:
    """
    Load and return a full story dict by its id field.
    Raises FileNotFoundError if no matching story is found.
    """
    for path in STORIES_DIR.glob("*.json"):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            if data.get("id") == story_id:
                return data
        except Exception:
            continue

    raise FileNotFoundError(f"Story '{story_id}' not found in {STORIES_DIR}")


def load_default_story() -> dict:
    """Load the first story (lowest chapter number) as the default."""
    stories = list_stories()
    if not stories:
        raise RuntimeError(f"No story JSON files found in {STORIES_DIR}")
    return load_story(stories[0]["id"])
