/**
 * Learning-space open state shared between the turn-tail cards and the
 * full-screen overlay. A tiny module-level store (no framework deps).
 */

export type LearningFocusKind = 'chapter' | 'quiz' | 'baseline' | 'plan'

export interface LearningFocus {
  readonly path: string
  readonly kind: LearningFocusKind
}

export interface LearningSpaceState {
  readonly open: boolean
  readonly focus: LearningFocus | null
}

type Listener = (state: LearningSpaceState) => void

let state: LearningSpaceState = { open: false, focus: null }
const listeners = new Set<Listener>()

export function learningSpaceState(): LearningSpaceState {
  return state
}

export function subscribeLearningSpace(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function openLearningSpace(focus: LearningFocus): void {
  state = { open: true, focus }
  for (const listener of [...listeners]) listener(state)
}

export function closeLearningSpace(): void {
  state = { open: false, focus: null }
  for (const listener of [...listeners]) listener(state)
}
