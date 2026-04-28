import { create } from 'zustand'
import type { GameState, StoryMeta, DialogueMessage } from '../types'
import { api } from '../api/client'

export interface PatchingPath {
  sourceId: string
  targetId: string
}

interface GameStore {
  // Screen
  screen: 'start' | 'game' | 'ending'
  setScreen: (s: 'start' | 'game' | 'ending') => void

  // Game state
  gameState: GameState | null
  stories: StoryMeta[]
  loading: boolean
  error: string | null

  // Per-chapter snapshots so revisiting a previously-played chapter via
  // turnToChapter() restores the choices the player already made.
  chapterStates: Record<string, GameState>

  // Cross-chapter score that drives the ending: each committed choice adds
  // its delta.score (typically +1 / -1). Determines positive/zero/negative
  // ending image selection on EndingScreen.
  totalScore: number

  // Selection
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void

  // Patch-in-flight state
  isPatching: boolean
  patchingPath: PatchingPath | null
  patchError: string | null

  // Dialogue
  messages: DialogueMessage[]
  _msgCounter: number

  // Chapter progression
  completedChapters: string[]
  markChapterCompleted: (storyId: string) => void

  // Page-turn transition
  isPageTurning: boolean
  turnToChapter: (storyId: string) => Promise<void>

  // Actions
  initGame: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  submitPatch: (patchText: string) => Promise<void>
  submitChoice: (eventId: string, choiceId: string) => Promise<void>
  clearPatchError: () => void
  loadStory: (storyId: string) => Promise<void>
  resetGame: () => Promise<void>
  restoreFromCache: () => Promise<boolean>
  clearAndRestart: () => Promise<void>
  addSysMsg: (text: string) => void
}

let _id = 0
const nextId = () => ++_id

const COMPLETED_LS_KEY = 'unc.completedChapters'
const GAME_CACHE_KEY = 'unc.gameCache'
const GAME_CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes — sliding window
const GAME_CACHE_VERSION = 1

interface CachedGame {
  v: number
  ts: number
  screen: 'start' | 'game' | 'ending'
  gameState: GameState | null
  completedChapters: string[]
  selectedEventId: string | null
  messages: DialogueMessage[]
  msgCounter: number
  chapterStates: Record<string, GameState>
  totalScore: number
}

function loadCompletedChapters(): string[] {
  try {
    const raw = localStorage.getItem(COMPLETED_LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveCompletedChapters(ids: string[]) {
  try {
    localStorage.setItem(COMPLETED_LS_KEY, JSON.stringify(ids))
  } catch {
    // storage unavailable — progress just won't persist across reloads
  }
}

function readGameCache(): CachedGame | null {
  try {
    const raw = localStorage.getItem(GAME_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedGame
    if (!parsed || parsed.v !== GAME_CACHE_VERSION) return null
    if (typeof parsed.ts !== 'number') return null
    if (Date.now() - parsed.ts > GAME_CACHE_TTL_MS) {
      localStorage.removeItem(GAME_CACHE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeGameCache(cache: CachedGame) {
  try {
    localStorage.setItem(GAME_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // storage unavailable — silently skip
  }
}

function clearGameCache() {
  try {
    localStorage.removeItem(GAME_CACHE_KEY)
  } catch {
    // ignore
  }
}

// Suppress cache writes while we're applying restored state to avoid clobbering
// the cache with intermediate sync states.
let _suspendPersist = false

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'start',
  setScreen: (screen) => set({ screen }),

  gameState: null,
  stories: [],
  loading: false,
  error: null,

  chapterStates: {},
  totalScore: 0,

  selectedEventId: null,
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),

  isPatching: false,
  patchingPath: null,
  patchError: null,

  clearPatchError: () => set({ patchError: null }),

  messages: [],
  _msgCounter: 0,

  completedChapters: loadCompletedChapters(),
  markChapterCompleted: (storyId) => {
    const current = get().completedChapters
    if (current.includes(storyId)) return
    const next = [...current, storyId]
    saveCompletedChapters(next)
    set({ completedChapters: next })
  },

  isPageTurning: false,
  turnToChapter: async (storyId) => {
    if (get().isPageTurning) return
    set({ isPageTurning: true })

    // Snapshot the chapter we're leaving so a later return brings the player
    // back to whatever choices they had already committed.
    const cur = get().gameState
    if (cur && cur.story_id !== storyId) {
      set((s) => ({
        chapterStates: { ...s.chapterStates, [cur.story_id]: cur },
      }))
    }

    // Phase 1: the page covers the screen (animation runs 0–450ms).
    await new Promise((r) => setTimeout(r, 450))
    // Phase 2: swap the story while the paper fully covers the viewport.
    await get().loadStory(storyId)
    // Phase 3: the page rotates away, revealing the new chapter (450–900ms).
    await new Promise((r) => setTimeout(r, 450))
    set({ isPageTurning: false })
  },

  addSysMsg: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: nextId(), role: 'system', text }],
    })),

  initGame: async () => {
    try {
      const [{ state }, stories] = await Promise.all([api.reset(), api.getStories()])
      set({ gameState: state, stories, messages: [], selectedEventId: null })
      get().addSysMsg(`Story loaded: ${state.story_title}`)
      get().addSysMsg(
        state.is_complete
          ? 'Narrative integrity: VERIFIED.'
          : `Detected ${state.errors.length} causal error(s). Awaiting operator input.`,
      )
    } catch (e) {
      set({ error: String(e) })
    }
  },

  sendMessage: async (text) => {
    set((s) => ({
      loading: true,
      messages: [...s.messages, { id: nextId(), role: 'operator', text }],
    }))

    // loading placeholder
    const loadingId = nextId()
    set((s) => ({
      messages: [
        ...s.messages,
        { id: loadingId, role: 'compiler', text: 'Processing directive', loading: true },
      ],
    }))

    try {
      const { reply, state } = await api.chat(text)
      set((s) => ({
        gameState: state,
        loading: false,
        messages: s.messages
          .filter((m) => m.id !== loadingId)
          .concat({ id: nextId(), role: 'compiler', text: reply }),
      }))
    } catch (e) {
      set((s) => ({
        loading: false,
        messages: s.messages
          .filter((m) => m.id !== loadingId)
          .concat({ id: nextId(), role: 'system', text: `Error: ${String(e)}` }),
      }))
    }
  },

  submitPatch: async (patchText: string) => {
    const { selectedEventId, gameState } = get()
    if (!selectedEventId || !gameState) return

    const idx = gameState.events.findIndex((e) => e.id === selectedEventId)
    const prev = idx > 0 ? gameState.events[idx - 1] : null
    const patchingPath: PatchingPath | null = prev
      ? { sourceId: prev.id, targetId: selectedEventId }
      : null

    const errorCountBefore = gameState.errors.length

    set({ isPatching: true, patchingPath, patchError: null })
    get().addSysMsg(`Submitting patch for ${selectedEventId}…`)

    const directive = `[TARGET: ${selectedEventId}] ${patchText}`

    try {
      const { reply, state } = await api.chat(directive)
      const accepted = state.errors.length < errorCountBefore

      set({
        isPatching: false,
        patchingPath: null,
        patchError: accepted ? null : reply.trim() || 'Patch rejected — causal reasoning insufficient.',
        gameState: state,
      })

      get().addSysMsg(accepted
        ? `Patch accepted. Causal link restored at ${selectedEventId}.`
        : `Patch rejected for ${selectedEventId}.`,
      )
    } catch (e) {
      set({
        isPatching: false,
        patchingPath: null,
        patchError: `Patch failed: ${String(e)}`,
      })
    }
  },

  submitChoice: async (eventId, choiceId) => {
    // Capture the score delta BEFORE submitting — once the engine resolves
    // the choice, the choices[] array is gone from the event payload.
    const evt = get().gameState?.events.find((e) => e.id === eventId)
    const chosen = evt?.choices?.find((c) => c.id === choiceId)
    const scoreDelta = chosen?.score ?? 0

    set({ isPatching: true, patchError: null })
    get().addSysMsg(`Committing choice ${choiceId} on ${eventId}…`)
    try {
      const { result, state } = await api.submitChoice(eventId, choiceId)
      set((s) => ({
        gameState: state,
        isPatching: false,
        totalScore: s.totalScore + scoreDelta,
      }))
      get().addSysMsg(
        result.status === 'success'
          ? `Choice committed. Timeline intact.`
          : `Choice committed. ${state.errors.length} causal error(s) remain.`,
      )
    } catch (e) {
      set({ isPatching: false, patchError: `Choice failed: ${String(e)}` })
    }
  },

  loadStory: async (storyId) => {
    set({ loading: true })
    try {
      const cached = get().chapterStates[storyId]
      const { state: loaded } = await api.loadStory(storyId)
      let live: GameState = loaded

      // If we've played this chapter already, replay the recorded choices on
      // the backend so the engine ends up in the same resolved state the
      // player last saw — including the generated narrative text.
      if (cached) {
        for (const c of cached.choices_made ?? []) {
          try {
            const { state: next } = await api.submitChoice(c.event_id, c.choice_id)
            live = next
          } catch {
            // A choice that no longer applies is skipped silently — the
            // remaining UI still reflects whatever the engine accepted.
          }
        }
      }

      set({
        gameState: live,
        loading: false,
        selectedEventId: null,
        messages: [{
          id: nextId(),
          role: 'system',
          text: cached ? `Resumed: ${live.story_title}` : `Loaded: ${live.story_title}`,
        }],
      })
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  resetGame: async () => {
    set({ loading: true })
    try {
      const { state } = await api.reset()
      set({
        gameState: state,
        loading: false,
        selectedEventId: null,
        messages: [{ id: nextId(), role: 'system', text: 'Session reset. Archive cleared.' }],
      })
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  restoreFromCache: async () => {
    const cache = readGameCache()
    if (!cache) return false
    if (!cache.gameState || cache.screen === 'start') {
      // Nothing meaningful to restore — drop the stale entry.
      clearGameCache()
      return false
    }

    const storyId = cache.gameState.story_id
    const choices = cache.gameState.choices_made ?? []

    _suspendPersist = true
    try {
      // 1) Optimistically rehydrate the UI from cache so the user sees their
      //    progress without waiting on the backend round-trip.
      _id = Math.max(_id, cache.msgCounter || 0)
      set({
        screen: cache.screen,
        gameState: cache.gameState,
        completedChapters: cache.completedChapters ?? get().completedChapters,
        selectedEventId: cache.selectedEventId,
        messages: cache.messages ?? [],
        chapterStates: cache.chapterStates ?? {},
        totalScore: cache.totalScore ?? 0,
        loading: true,
      })

      // 2) Resync backend: load the same story, then replay each choice so the
      //    server-side engine ends up in the same state the cache reflects.
      try {
        const stories = await api.getStories()
        const { state: loaded } = await api.loadStory(storyId)
        let live: GameState = loaded
        for (const c of choices) {
          try {
            const { state: next } = await api.submitChoice(c.event_id, c.choice_id)
            live = next
          } catch {
            // Skip a choice that no longer applies — we still keep the cached UI.
          }
        }
        set({ stories, gameState: live, loading: false })
      } catch {
        set({ loading: false })
      }
    } finally {
      _suspendPersist = false
      // Refresh the timestamp now that we've successfully resumed.
      persistNow(get())
    }
    return true
  },

  clearAndRestart: async () => {
    clearGameCache()
    saveCompletedChapters([])
    _suspendPersist = true
    try {
      set({
        screen: 'start',
        gameState: null,
        selectedEventId: null,
        messages: [],
        completedChapters: [],
        chapterStates: {},
        totalScore: 0,
        isPatching: false,
        patchingPath: null,
        patchError: null,
        error: null,
      })
      try {
        await api.reset()
      } catch {
        // backend reset is best-effort; the next initGame() will retry.
      }
    } finally {
      _suspendPersist = false
    }
  },
}))

function persistNow(s: GameStore) {
  if (_suspendPersist) return
  // Don't bother caching the empty start screen.
  if (s.screen === 'start' && !s.gameState) return
  writeGameCache({
    v: GAME_CACHE_VERSION,
    ts: Date.now(),
    screen: s.screen,
    gameState: s.gameState,
    completedChapters: s.completedChapters,
    selectedEventId: s.selectedEventId,
    messages: s.messages,
    msgCounter: _id,
    chapterStates: s.chapterStates,
    totalScore: s.totalScore,
  })
}

// Save the relevant slices on every change. The TTL is sliding — each write
// refreshes the timestamp, so an active session never expires mid-play.
useGameStore.subscribe((state, prev) => {
  // Mirror the live gameState into chapterStates so on-chapter activity (new
  // choices, patches) keeps the per-chapter snapshot fresh even without a
  // subsequent turnToChapter().
  if (
    state.gameState &&
    state.gameState !== prev.gameState &&
    state.chapterStates[state.gameState.story_id] !== state.gameState
  ) {
    const sid = state.gameState.story_id
    useGameStore.setState({
      chapterStates: { ...state.chapterStates, [sid]: state.gameState },
    })
    return // the resulting state change will fire this subscriber again
  }

  if (
    state.screen === prev.screen &&
    state.gameState === prev.gameState &&
    state.completedChapters === prev.completedChapters &&
    state.selectedEventId === prev.selectedEventId &&
    state.messages === prev.messages &&
    state.chapterStates === prev.chapterStates &&
    state.totalScore === prev.totalScore
  ) {
    return
  }
  persistNow(state)
})
