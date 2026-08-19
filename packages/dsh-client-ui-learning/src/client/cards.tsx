/**
 * Turn-tail learning cards: after a turn produces learning files, render an
 * 'open' card per produced kind (chapter / quiz / baseline / plan). No
 * learning artifact in the turn, no card. Visuals share space.module.css so
 * the cards and the space sit on the same dsh token system (and theme-plugin
 * seams) — the class names keep the `card` substring the glassifier matches.
 */

import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './space.module.css'
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
    <div className={css.cardsRow}>
      {items.map(item => (
        <div key={item.kind} className={css.learn_card}>
          <span className={css.learnKind}>{t(KIND_LABEL[item.kind])}</span>
          <span className={css.learnFile} title={item.path}>{item.title}</span>
          <button
            type='button'
            className={css.button + ' ' + css.buttonSm + ' ' + css.buttonPrimary}
            onClick={() => { openLearningSpace({ path: item.path, kind: item.kind }) }}
          >
            {t('cardOpen')}
          </button>
          <button
            type='button'
            className={css.learnExternal}
            onClick={() => { openFile(item.path) }}
          >
            {t('cardExternal')}
          </button>
        </div>
      ))}
    </div>
  )
}
