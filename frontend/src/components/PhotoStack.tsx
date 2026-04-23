import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'

// Vite's glob import collects every image under assets/evidence/<storyId>/ at
// build-time. The immediate subfolder is the chapter's story_id (e.g.
// "ch02_blind_spot_protocol") and the filename (sans ext) is the event id
// (e.g. "evt_001.svg"). Drop files in, they show up for that chapter only.
const photoModules = import.meta.glob(
  '../assets/evidence/*/*.{jpg,jpeg,png,webp,svg}',
  { eager: true, import: 'default' },
) as Record<string, string>

interface Photo {
  id: string           // filename sans extension
  storyId: string      // chapter folder name this photo lives in
  eventId: string | null // id if it matches a current story event, else null
  src: string
}

// Parse ".../assets/evidence/<storyId>/<eventFile>.<ext>"
function parseEvidencePath(path: string): { storyId: string; id: string } | null {
  const parts = path.split('/')
  const fname = parts[parts.length - 1]
  const storyId = parts[parts.length - 2]
  if (!fname || !storyId) return null
  const id = fname.replace(/\.[^.]+$/, '')
  return { storyId, id }
}

// Stable PRNG seeded by id — each photo keeps the same jitter across renders
// within a single dev-server session, but different photos have different
// offsets. On photo-list changes (new files dropped in) we re-seed via useMemo.
function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

interface Jitter {
  rot: number   // -5 .. 5 deg
  dx: number    // -10 .. 10 px
  dy: number    // -10 .. 10 px
}

export default function PhotoStack() {
  const selectedEventId = useGameStore((s) => s.selectedEventId)
  const setSelectedEventId = useGameStore((s) => s.setSelectedEventId)
  const events = useGameStore((s) => s.gameState?.events)
  const storyId = useGameStore((s) => s.gameState?.story_id)

  // Build the photo list from the glob map, filtered to the CURRENT chapter's
  // subfolder. Swapping chapters (page turn) re-runs this memo because
  // storyId changes, so the stack rebuilds with the new chapter's evidence.
  const photos = useMemo<Photo[]>(() => {
    if (!storyId) return []
    return Object.entries(photoModules)
      .map(([path, src]) => {
        const parsed = parseEvidencePath(path)
        if (!parsed) return null
        return { path, src, ...parsed }
      })
      .filter((x): x is { path: string; src: string; storyId: string; id: string } =>
        x !== null && x.storyId === storyId,
      )
      .sort((a, b) => a.path.localeCompare(b.path))
      .map(({ id, storyId, src }) => ({
        id,
        storyId,
        src,
        eventId: events?.some((e) => e.id === id) ? id : null,
      }))
  }, [events, storyId])

  // Jitter regenerates whenever the photo set itself changes (new files in,
  // different chapter's events loaded). Stable within a session otherwise.
  const jitter = useMemo<Record<string, Jitter>>(() => {
    const ids = photos.map((p) => p.id).join('|')
    const out: Record<string, Jitter> = {}
    for (const p of photos) {
      const rng = mulberry32(hashSeed(ids + ':' + p.id))
      out[p.id] = {
        rot: (rng() * 10) - 5,
        dx: (rng() * 20) - 10,
        dy: (rng() * 20) - 10,
      }
    }
    return out
  }, [photos])

  // The active (top-of-stack) photo. Driven by selectedEventId if a linked
  // photo exists; otherwise falls back to the last-clicked id.
  const [manualActive, setManualActive] = useState<string | null>(null)

  // Resolve the selected event to a photo id. Patch events (evt_patch_XXX) are
  // created at runtime by the player's fixes and have no dedicated evidence —
  // they inherit the photo of the preceding non-patch event in the chain. If
  // several consecutive patches sit back-to-back, we keep walking until we
  // hit a real event that has a linkable photo.
  const linkedActiveId = useMemo(() => {
    if (!selectedEventId || !events) return null
    const isPatch = (id: string) => id.startsWith('evt_patch_')

    const tryMatch = (id: string) => photos.find((p) => p.eventId === id)?.id ?? null

    if (!isPatch(selectedEventId)) return tryMatch(selectedEventId)

    // Walk backwards from the patch event's index, skipping other patches.
    const idx = events.findIndex((e) => e.id === selectedEventId)
    for (let i = idx - 1; i >= 0; i--) {
      const prev = events[i]
      if (isPatch(prev.id)) continue
      return tryMatch(prev.id)
    }
    return null
  }, [selectedEventId, photos, events])

  // If a linked photo exists for the current selection, it wins — the node
  // click in the graph is the authoritative "bring this to the top" gesture.
  const activeId = linkedActiveId ?? manualActive ?? photos[photos.length - 1]?.id ?? null

  // Reset manual override once the linked one takes over, so clicking away in
  // the graph and then back works predictably.
  useEffect(() => {
    if (linkedActiveId) setManualActive(null)
  }, [linkedActiveId])

  // When the chapter changes, any manual pick from the previous chapter is
  // stale (its id isn't in the new photo set). Clear it.
  useEffect(() => {
    if (manualActive && !photos.some((p) => p.id === manualActive)) {
      setManualActive(null)
    }
  }, [photos, manualActive])

  if (photos.length === 0) return null

  // Non-active photos sit at stacking order matching array position so the
  // pile looks layered (deeper files drawn behind earlier ones visually).
  return (
    <div className="polaroid-stack">
      {photos.map((p, i) => {
        const isActive = p.id === activeId
        const j = jitter[p.id] ?? { rot: 0, dx: 0, dy: 0 }
        // Active = centred, unrotated, on top. Non-active = scattered.
        const transform = isActive
          ? 'translate(-50%, -50%) translate(0px, 0px) rotate(0deg)'
          : `translate(-50%, -50%) translate(${j.dx}px, ${j.dy}px) rotate(${j.rot}deg)`

        return (
          <div
            key={p.id}
            className={`polaroid-stack-item ${isActive ? 'is-active' : ''}`}
            style={{
              transform,
              zIndex: isActive ? photos.length + 10 : i + 1,
            }}
            onMouseDown={() => {
              // Let the event bubble to the GameScreen focus-panel wrapper
              // so the whole stack gets raised to top z-index as well.
              if (p.eventId) {
                // Syncs the narrative panel / graph highlight as well.
                setSelectedEventId(p.eventId)
              } else {
                setManualActive(p.id)
              }
            }}
          >
            <div className="polaroid">
              <div className="polaroid-image-wrap">
                <img src={p.src} alt={p.id} draggable={false} />
              </div>
              <div className="polaroid-caption">
                {p.id.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
