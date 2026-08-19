/**
 * Turn-tail learning cards: after a turn produces learning files, render an
 * 'open' card per produced kind (chapter / quiz / baseline / plan). No
 * learning artifact in the turn, no card.
 */

import type { CSSProperties } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { openLearningSpace } from './store.ts'
import { selectProducedLearning, type LearningCardItem, type LearningCardKind, type LearningCardsSelection } from './classify.ts'
import type { NS } from './locales.ts'

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationTurnDataMap {
    deliverables: { readonly produced: readonly { readonly seq: number; readonly path: string }[] }
  }
}

/**
 * Turn-tail claim: classify the closing turn's produced files into
 * per-kind open cards. Returns null when no learning artifact exists.
 */
export function selectLearningCards(owner: TurnTailOwnerProps): LearningCardsSelection | null {
  const data = owner.turn.data.get('deliverables')
  if (data === undefined) return null
  const paths: string[] = []
  const seen = new Set<string>()
  for (const produced of data.produced) {
    if (produced.seq > owner.seq || seen.has(produced.path)) continue
    seen.add(produced.path)
    paths.push(produced.path)
  }
  return selectProducedLearning(paths)
}

const rootStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 6,
}

const cardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.14))',
  borderRadius: 8,
  padding: '6px 10px',
  background: 'var(--dsw-alias-bg-card, rgba(255,255,255,0.04))',
  fontSize: 12,
}

const openButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 12,
  background: 'var(--dsw-alias-brand-primary, #4d7cfe)',
  color: '#fff',
}

const externalStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  color: 'var(--dsw-alias-label-secondary, #9aa4b2)',
  cursor: 'pointer',
  fontSize: 11,
  textDecoration: 'underline',
  padding: 0,
}

type CardLabelKey = 'cardChapter' | 'cardQuiz' | 'cardBaseline' | 'cardPlan'

const KIND_LABEL: Record<LearningCardKind, CardLabelKey> = {
  chapter: 'cardChapter',
  quiz: 'cardQuiz',
  baseline: 'cardBaseline',
  plan: 'cardPlan',
}

export function LearningCards(
  props: PropsLocale<typeof NS>
    & { matched: LearningCardsSelection }
    & { openFile: (path: string) => void },
) {
  const { matched, t, openFile } = props
  const items: LearningCardItem[] = []
  for (const key of ['chapter', 'quiz', 'baseline', 'plan'] as const) {
    const item = matched[key]
    if (item !== null) items.push(item)
  }
  if (items.length === 0) return null
  return (
    <div style={rootStyle}>
      {items.map(item => (
        <div key={item.kind} style={cardStyle}>
          <span>{t(KIND_LABEL[item.kind])}</span>
          <span title={item.path}>{item.title}</span>
          <button
            type='button'
            style={openButtonStyle}
            onClick={() => { openLearningSpace({ path: item.path, kind: item.kind }) }}
          >
            {t('cardOpen')}
          </button>
          <button
            type='button'
            style={externalStyle}
            onClick={() => { openFile(item.path) }}
          >
            {t('cardExternal')}
          </button>
        </div>
      ))}
    </div>
  )
}
