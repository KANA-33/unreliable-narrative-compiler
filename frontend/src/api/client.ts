import type { GameState, StoryMeta } from '../types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  getState: () =>
    request<GameState>('/api/state'),

  getStories: () =>
    request<StoryMeta[]>('/api/stories'),

  chat: (message: string) =>
    request<{ reply: string; state: GameState }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  loadStory: (storyId: string) =>
    request<{ status: string; state: GameState }>('/api/load_story', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    }),

  reset: () =>
    request<{ status: string; state: GameState }>('/api/reset', {
      method: 'POST',
    }),
}
