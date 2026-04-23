# Evidence Photos

Evidence images are organised by chapter. The **immediate subfolder** must
match the chapter's `story_id` (the `id` field inside the chapter JSON in
`backend/stories/`) — only photos inside the currently-loaded chapter's folder
show up in the photo stack. Files (`.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`)
are discovered via Vite's `import.meta.glob` at build/dev-server start.

## Folder layout

    frontend/src/assets/evidence/
      ch01_observer_initialization/
        evt_000.svg
        evt_001.svg
        ...
      ch02_blind_spot_protocol/
        evt_000.svg
        ...
      ch03_observer_finale/
        evt_000.svg
        ...

## Naming convention

Inside a chapter folder, use the event id as the filename (minus extension)
to auto-link a photo to a narrative node. Clicking that node in the
Narrative Archive will bring its photo to the top of the stack with rotation
reset to zero.

    ch01_observer_initialization/evt_000.svg   → linked to event "evt_000" in ch01
    ch02_blind_spot_protocol/evt_002.png       → linked to event "evt_002" in ch02
    ch03_observer_finale/misc_desk.webp        → displayed in ch03, not tied to any event

Any filename that doesn't match a current chapter's event id still shows up
inside that chapter — it just won't react to node selection.

## Hot reload

Vite picks up new files on restart of the dev server. The random jitter of
the stack is recomputed each time the photo list changes (including on
chapter turn).
