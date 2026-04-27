# Ending images

Drop ending images here. The frontend fetches `/api/ending/<story_id>` after
the player clicks the red ending arrow on a completed chapter.

## File-naming convention

Name each image `<story_id>.<ext>` — the story id is the `id` field of the
matching story JSON in `backend/stories/`. Supported extensions (probed in
order): `png`, `jpg`, `jpeg`, `webp`, `gif`.

Examples:
- `ch01_observer_initialization.png`
- `ch02_blind_spot_protocol.jpg`
- `ch03_observer_finale.webp`

## Default fallback

If no per-story image is found, the server falls back to `default.png` in
this folder (if present). Otherwise the API returns 404 and the frontend
shows a black screen with the END text only.

## Replacing an ending

Just overwrite the file — no server restart required, the route reads from
disk on every request.
