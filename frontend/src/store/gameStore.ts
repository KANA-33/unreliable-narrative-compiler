import { create } from 'zustand'
import type { GameState, StoryMeta, DialogueMessage } from '../types'
import { api } from '../api/client'

export interface PatchingPath {
  sourceId: string
  targetId: string
}

interface GameStore {
  // Screen
  screen: 'start' | 'game'
  setScreen: (s: 'start' | 'game') => void

  // Game state
  gameState: GameState | null
  stories: StoryMeta[]
  loading: boolean
  error: string | null

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
  addSysMsg: (text: string) => void
}

let _id = 0
const nextId = () => ++_id

const COMPLETED_LS_KEY = 'unc.completedChapters'

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
    set({ isPatching: true, patchError: null })
    get().addSysMsg(`Committing choice ${choiceId} on ${eventId}…`)
    try {
      const { result, state } = await api.submitChoice(eventId, choiceId)
      set({ gameState: state, isPatching: false })
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
      const { state } = await api.loadStory(storyId)
      set({
        gameState: state,
        loading: false,
        selectedEventId: null,
        messages: [{ id: nextId(), role: 'system', text: `Loaded: ${state.story_title}` }],
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
}))
