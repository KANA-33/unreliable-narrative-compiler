export interface StoryEvent {
  id: string
  label: string
  text: string
  requires: string[]
  provides: string[]
}

export interface CompileError {
  event_id: string
  missing_tags: string[]
  message: string
}

export interface GameState {
  story_id: string
  story_title: string
  events: StoryEvent[]
  errors: CompileError[]
  is_complete: boolean
  patches_applied: number
}

export interface StoryMeta {
  id: string
  title: string
  chapter: number
  description?: string
  bug_type?: string
}

export interface DialogueMessage {
  id: number
  role: 'operator' | 'compiler' | 'system'
  text: string
  loading?: boolean
}
