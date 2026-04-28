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
  pageTurnDirection: 'forward' | 'backward'
  pageTurnFromStoryId: string | null
  pageTurnToStoryId: string | null
  turnToChapter: (storyId: string) => Promise<void>

  // Actions
  initGame: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  submitPatch: (patchText: string) => Promise<void>
  submitChoice: (eventId: string, choiceId: string) => Promise<void>
  clearPatchError: () => void
  loadStory: (storyId: string) => Promise<void>
  resetGame: () => Promise<void>
  clearAndRestart: () => Promise<void>
  addSysMsg: (text: string) => void
}

let _id = 0
const nextId = () => ++_id

const COMPLETED_LS_KEY = 'unc.completedChapters'

// Legacy cross-session cache key — we no longer write or read it, but old
// installs may still have an entry sitting in localStorage from before. Wipe
// it once on module load so a stale dump can't influence future behavior.
const LEGACY_GAME_CACHE_KEY = 'unc.gameCache'
try {
  localStorage.removeItem(LEGACY_GAME_CACHE_KEY)
} catch {
  // storage unavailable — nothing to clean up
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
  pageTurnDirection: 'forward',
  pageTurnFromStoryId: null,
  pageTurnToStoryId: null,
  turnToChapter: async (storyId) => {
    if (get().isPageTurning) return

    // Snapshot the chapter we're leaving so a later return brings the player
    // back to whatever choices they had already committed.
    const cur = get().gameState
    const stories = get().stories
    const curMeta = cur ? stories.find((s) => s.id === cur.story_id) : null
    const tgtMeta = stories.find((s) => s.id === storyId)
    const direction: 'forward' | 'backward' =
      curMeta && tgtMeta && tgtMeta.chapter < curMeta.chapter ? 'backward' : 'forward'

    set({
      isPageTurning: true,
      pageTurnDirection: direction,
      pageTurnFromStoryId: cur?.story_id ?? null,
      pageTurnToStoryId: storyId,
    })

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
    set({
      isPageTurning: false,
      pageTurnFromStoryId: null,
      pageTurnToStoryId: null,
    })
  },

  addSysMsg: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: nextId(), role: 'system', text }],
    })),

  initGame: async () => {
    try {
      const [{ state }, stories] = await Promise.all([api.reset(), api.getStories()])
      // A fresh playthrough must zero the cross-chapter score and per-chapter
      // snapshots — otherwise an ending viewed at score=+3 leaks into the next
      // run and the ch3 → ending router resolves against stale state.
      set({
        gameState: state,
        stories,
        messages: [],
        selectedEventId: null,
        totalScore: 0,
        chapterStates: {},
      })
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
    const chapterScoreBefore = gameState.chapter_score ?? 0
    const patchesAppliedBefore = gameState.patches_applied

    set({ isPatching: true, patchingPath, patchError: null })
    get().addSysMsg(`Submitting patch for ${selectedEventId}…`)

    const directive = `[TARGET: ${selectedEventId}] ${patchText}`

    try {
      const { reply, state } = await api.chat(directive)

      // The chat round is treated as one patch attempt for UI purposes, even
      // though Claude may invoke apply_patch multiple times internally.
      // chapter_score only changes inside chat via failed-but-committed
      // patches (choices go through submitChoice), so the diff exactly counts
      // how many content_lost commits Claude made this round.
      const failedPatchDelta = (state.chapter_score ?? 0) - chapterScoreBefore
      const errorsReduced = state.errors.length < errorCountBefore
      const contentLostCommitted = failedPatchDelta > 0
      const accepted = errorsReduced && !contentLostCommitted
      // If Claude declined to call apply_patch at all (it just sent text back
      // — usually a clarifying question), patches_applied won't have moved.
      // Surface that reply in the chat panel rather than as a red error toast,
      // since it's prose, not an engine rejection.
      const toolWasInvoked = state.patches_applied > patchesAppliedBefore

      set((s) => ({
        isPatching: false,
        patchingPath: null,
        // Only surface patchError when the engine actually rejected something
        // (a real protocol/structural failure). A content_lost commit and a
        // no-tool-call reply both leave the toast empty.
        patchError: !toolWasInvoked || accepted || contentLostCommitted
          ? null
          : reply.trim() || 'Patch rejected — causal reasoning insufficient.',
        gameState: state,
        totalScore: s.totalScore + failedPatchDelta,
        // No-tool-call reply: thread it into the dialogue messages so the
        // player can read what Claude actually asked.
        messages: !toolWasInvoked && reply.trim()
          ? [...s.messages, { id: nextId(), role: 'compiler', text: reply }]
          : s.messages,
      }))

      get().addSysMsg(
        !toolWasInvoked
          ? `Compiler returned a question instead of a patch.`
          : accepted
            ? `Patch accepted. Causal link restored at ${selectedEventId}.`
            : contentLostCommitted
              ? `Patch committed at ${selectedEventId}.`
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

  clearAndRestart: async () => {
    saveCompletedChapters([])
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
  },
}))

// Mirror the live gameState into chapterStates so on-chapter activity (new
// choices, patches) keeps the per-chapter snapshot fresh even without a
// subsequent turnToChapter(). The map itself is in-memory only — closing
// the tab or refreshing intentionally drops it so the player always reopens
// at chapter 1, not their last position.
useGameStore.subscribe((state, prev) => {
  if (
    state.gameState &&
    state.gameState !== prev.gameState &&
    state.chapterStates[state.gameState.story_id] !== state.gameState
  ) {
    const sid = state.gameState.story_id
    useGameStore.setState({
      chapterStates: { ...state.chapterStates, [sid]: state.gameState },
    })
  }
})
