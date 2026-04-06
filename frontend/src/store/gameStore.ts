import { create } from 'zustand'
import type { GameState, StoryMeta, DialogueMessage } from '../types'
import { api } from '../api/client'

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

  // Dialogue
  messages: DialogueMessage[]
  _msgCounter: number

  // Actions
  initGame: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  loadStory: (storyId: string) => Promise<void>
  resetGame: () => Promise<void>
  addSysMsg: (text: string) => void
}

let _id = 0
const nextId = () => ++_id

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'start',
  setScreen: (screen) => set({ screen }),

  gameState: null,
  stories: [],
  loading: false,
  error: null,

  selectedEventId: null,
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),

  messages: [],
  _msgCounter: 0,

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
