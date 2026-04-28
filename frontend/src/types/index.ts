export interface ChoiceOption {
  id: string
  label: string
  score?: number
}

export interface StoryEvent {
  id: string
  label: string
  text: string
  requires: string[]
  provides: string[]
  type?: 'choice' | 'resolved' | string
  choices?: ChoiceOption[]
  resolved_choice_id?: string
}

export interface CompileError {
  event_id: string
  missing_tags: string[]
  message: string
}

export interface ChoiceRecord {
  event_id: string
  choice_id: string
}

export interface GameState {
  story_id: string
  story_title: string
  events: StoryEvent[]
  errors: CompileError[]
  is_complete: boolean
  patches_applied: number
  violation_count?: number
  alignment_pct?: number
  choices_made?: ChoiceRecord[]
  initial_error_count?: number
  chapter_score?: number
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
