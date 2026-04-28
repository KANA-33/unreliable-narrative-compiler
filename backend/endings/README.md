# Ending images

Drop ending images here. The frontend picks one of three score-based
buckets when the player reaches the ending screen:

| Outcome    | Trigger        | Filename              |
|------------|----------------|-----------------------|
| `positive` | totalScore > 0 | `positive.<ext>`      |
| `zero`     | totalScore = 0 | `zero.<ext>`          |
| `negative` | totalScore < 0 | `negative.<ext>`      |

The score is the sum of `delta.score` from every choice the player
committed across all chapters (configured per-choice in the story JSONs
under `backend/stories/`). Typical values are `+1` and `-1`.

Supported extensions (probed in order): `png`, `jpg`, `jpeg`, `webp`, `gif`.

## Default fallback

If no bucket image is found, the server falls back to `default.<ext>`
in this folder (if present). Otherwise the API returns 404 and the
frontend shows a black screen with the END text only.

## Replacing an ending

Just overwrite the file — no server restart required, the route reads
from disk on every request.
