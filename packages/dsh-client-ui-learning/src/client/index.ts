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
  // and keeps the already-mounted namespace. The mount publishes the
  // namespace as the nested Cordis service 'remote.learning', which only an
  // inject-declaring context may read (a bare ctx.remote.learning getter
  // throws 'cannot get property without inject') — so the face is captured
  // in the inject scope below, which fires once the mount publishes it.
  void ctx.remote.$mount(learningContribution).catch((error: unknown) => {
    console.warn('[dsh-client-ui-learning] remote contribution mount failed', error)
  })

  // The mount publishes the namespace as the whole-string Cordis service
  // 'remote.learning'; reading it through the chained property (nsCtx.remote
  // then .learning) is blocked by the traceable proxy, so resolve the face
  // through the service name directly inside an inject scope for it. Hold the
  // live service object without validating its methods at scope-up: $mount
  // publishes the service BEFORE installing describe/listDir/… onto it, and
  // the scope callback can fire inside that window — the methods appear on
  // the same object (defineProperty) before any real call goes through.
  ctx.inject(['remote.learning'], (nsCtx) => {
    const service = (nsCtx as { 'remote.learning'?: unknown })['remote.learning']
    if (service !== undefined && service !== null) {
      setLearningFace(service as LearningNamespaceFace)
    }
    return () => { setLearningFace(null) }
  })

  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    select: selectLearningCards,
    locale: NS,
    // The turnTail slot is a single-choice CHAIN: lower priority tries first,
    // and the official deliverables entry (default 0) claims every turn that
    // produced ANY file. Register below it so learning artifacts render the
    // open-in-space card; other produced files fall through to the generic
    // deliverables card.
    priority: -10,
  }, LearningCards))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'learning-space',
    locale: NS,
  }, LearningSpaceOverlay))
}

