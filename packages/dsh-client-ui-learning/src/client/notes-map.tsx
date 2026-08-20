/**
 * The P1 relation map: the notes card flipped into a section-skeleton view —
 * one row per section of the open document, with a density bar (how many
 * anchors point there) and a coverage stat line. Which sections are dense
 * and which are untouched reads at a glance; clicking a row jumps the
 * document to that section (ll-jump through the host).
 */

import css from './space.module.css'
import { anchorCounts, type NoteAnchor, type SectionInfo } from './anchors.ts'
import type { LearningSpaceKey } from './locales.ts'

export interface NotesMapProps {
  readonly sections: readonly SectionInfo[]
  readonly anchors: readonly NoteAnchor[]
  readonly chapterKey: string | null
  readonly onJump: (sectionId: string) => void
  readonly t: (key: LearningSpaceKey) => string
}

export function NotesMap(props: NotesMapProps) {
  const key = props.chapterKey ?? ''
  const counts = anchorCounts(props.anchors, key)
  const own = props.anchors.filter(anchor => anchor.chapterKey === key)
  const docLevel = own.filter(anchor => anchor.sectionId === null).length
  const covered = props.sections.filter(section => (counts[section.id] ?? 0) > 0).length
  const max = Math.max(1, ...Object.values(counts))

  if (own.length === 0 && props.sections.length === 0) {
    return <div className={css.notesMapEmpty}>{props.t('notesMapEmpty')}</div>
  }

  return (
    <div className={css.notesMap}>
      {props.sections.map(section => {
        const count = counts[section.id] ?? 0
        const density = count === 0 ? 0 : Math.max(12, Math.round((count / max) * 100))
        return (
          <button
            key={section.id}
            type='button'
            className={css.notesMapRow + (count > 0 ? ' ' + css.notesMapRowLinked : '')}
            title={section.id}
            onClick={() => { props.onJump(section.id) }}
          >
            <span className={css.notesMapTitle}>{section.title ?? section.id}</span>
            <span className={css.notesMapHeat}>
              <span className={css.notesMapHeatFill} style={{ width: density + '%' }} />
            </span>
            <span className={css.notesMapCount}>{count > 0 ? '🗒 ' + count : ''}</span>
          </button>
        )
      })}
      {docLevel > 0 && (
        <div className={css.notesMapDocRow}>🗒 {docLevel}</div>
      )}
      <div className={css.notesMapStats}>
        {own.length} {props.t('notesMapAnchorUnit')} · {props.t('notesMapCoverLabel')} {props.sections.length === 0 ? '-' : covered + '/' + props.sections.length} {props.t('notesMapSectionUnit')}
      </div>
    </div>
  )
}
