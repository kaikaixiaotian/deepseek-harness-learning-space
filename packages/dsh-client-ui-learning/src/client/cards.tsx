/**
 * Turn-tail learning cards: after a turn produces chapter/quiz files,
 * render an 'open chapter' and/or 'open quiz' card. No match, no card.
 */

import type { CSSProperties } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { openLearningSpace } from './store.ts'
import { selectProducedLearning, type LearningCardsSelection } from './classify.ts'
import type { NS } from './locales.ts'

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationTurnDataMap {
    deliverables: { readonly produced: readonly { readonly seq: number; readonly path: string }[] }
  }
}

/**
 * Turn-tail claim: classify the closing turn's produced files into
 * chapter/quiz cards. Returns null when neither kind exists (no card).
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
  background: 'var(--dsw-alias-accent, #4d7cfe)',
  color: '#fff',
}

const externalStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  color: 'var(--dsw-alias-text-secondary, #9aa4b2)',
  cursor: 'pointer',
  fontSize: 11,
  textDecoration: 'underline',
  padding: 0,
}

export function LearningCards(
  props: PropsLocale<typeof NS>
    & { matched: LearningCardsSelection }
    & { openFile: (path: string) => void },
) {
  const { matched, t, openFile } = props
  const rows = [
    ...(matched.chapter === null ? [] : [{ label: t('cardChapter'), item: matched.chapter }]),
    ...(matched.quiz === null ? [] : [{ label: t('cardQuiz'), item: matched.quiz }]),
  ]
  if (rows.length === 0) return null
  return (
    <div style={rootStyle}>
      {rows.map(row => (
        <div key={row.item.kind} style={cardStyle}>
          <span>{row.label}</span>
          <span title={row.item.path}>{row.item.title}</span>
          <button
            type='button'
            style={openButtonStyle}
            onClick={() => { openLearningSpace({ path: row.item.path, kind: row.item.kind }) }}
          >
            {t('cardOpen')}
          </button>
          <button
            type='button'
            style={externalStyle}
            onClick={() => { openFile(row.item.path) }}
          >
            {t('cardExternal')}
          </button>
        </div>
      ))}
    </div>
  )
}
