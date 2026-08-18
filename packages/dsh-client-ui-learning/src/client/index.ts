/**
 * Client plugin body: locale dictionaries, the learning Remote
 * contribution, the turn-tail learning cards, and the full-screen
 * learning-space overlay.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { en, NS, zh } from './locales.ts'
import { learningContribution, setLearningFace, type LearningNamespaceFace } from './remote.ts'
import { LearningCards, selectLearningCards } from './cards.tsx'
import { LearningSpaceOverlay } from './space.tsx'

export const inject = ['slots', 'locale', 'remote']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-client-ui-learning: dictionaries')

  // Mount the host Remote contribution; a duplicate mount (plugin HMR) warns
  // and keeps the already-mounted namespace. Publish the face once resolved.
  void ctx.remote.$mount(learningContribution).then(
    () => { setLearningFace(learningFace(ctx)) },
    (error: unknown) => { console.warn('[dsh-client-ui-learning] remote contribution mount failed', error) },
  )

  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    select: selectLearningCards,
    locale: NS,
  }, LearningCards))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'learning-space',
    locale: NS,
  }, LearningSpaceOverlay))
}

/** Resolve the mounted namespace face, or null while not connected yet. */
function learningFace(ctx: ClientContext): LearningNamespaceFace | null {
  const remote = (ctx as unknown as { remote: { learning?: LearningNamespaceFace } }).remote
  const face = remote?.learning
  return face !== undefined && typeof face.describe === 'function' ? face : null
}
