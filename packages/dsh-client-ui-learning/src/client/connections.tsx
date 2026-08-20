/**
 * The note↔chapter connection canvas (P1): a host-layer SVG overlay spanning
 * the viewer + notes cards — bezier curves from each anchored excerpt block's
 * left edge into the middle iframe.
 *
 * Endpoint precision: the chapter side prefers the exact TEXT BLOCK the
 * excerpt was taken from (ll-blocks-watch → per-block geometry in the report
 * stream), falling back to the section heading. A line is only drawn while
 * BOTH endpoints sit inside their visible region — the note block inside the
 * notes scroller, the chapter endpoint inside the iframe viewport — so lines
 * never trail across the cards after their target scrolls off screen.
 *
 * Rendering is fully imperative (no React state): a rAF loop re-reads both
 * geometries every frame; identical frames cost one rect comparison each.
 * Interactions per path: hover → hot style + note-block highlight + section
 * highlight inside the iframe (ll-highlight); click → scroll the note block
 * into view and jump the document to the section (ll-jump).
 */

import { useEffect, useRef } from 'react'
import css from './space.module.css'
import { postSectionHighlight } from './bridge.ts'
import type { AnchorReport } from './bridge.ts'

export interface ConnectionLayerProps {
  readonly iframeRef: React.MutableRefObject<HTMLIFrameElement | null>
  readonly reportRef: React.MutableRefObject<AnchorReport>
  readonly notesScrollRef: React.MutableRefObject<HTMLDivElement | null>
  /** Only excerpts anchored to the OPEN document get a line. */
  readonly chapterKey: string | null
  /** false while the notes card is collapsed — no right endpoints. */
  readonly active: boolean
  readonly onJump: (sectionId: string) => void
}

interface PathEntry {
  readonly path: SVGPathElement
  note: HTMLElement
  sectionId: string
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Endpoint visibility margin: a few px of grace so lines don't flicker at
 * the exact scroll boundary. */
const VISIBILITY_MARGIN = 24

export function ConnectionLayer(props: ConnectionLayerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    if (!props.active || props.chapterKey === null) return
    const svg = svgRef.current
    if (svg === null) return
    const paths = new Map<string, PathEntry>()
    let hotId: string | null = null

    const clearHot = (): void => {
      if (hotId === null) return
      const entry = paths.get(hotId)
      hotId = null
      if (entry === undefined) return
      entry.path.classList.remove(css.anchorPathHot)
      entry.note.classList.remove(css.excerptHot)
      const target = propsRef.current.iframeRef.current?.contentWindow
      if (target != null) postSectionHighlight(target, entry.sectionId, false)
    }

    const bindPath = (anchorId: string, note: HTMLElement): PathEntry => {
      const path = document.createElementNS(SVG_NS, 'path')
      path.setAttribute('class', css.anchorPath)
      path.addEventListener('pointerenter', () => {
        const entry = paths.get(anchorId)
        if (entry === undefined || hotId === anchorId) return
        clearHot()
        hotId = anchorId
        entry.path.classList.add(css.anchorPathHot)
        entry.note.classList.add(css.excerptHot)
        const target = propsRef.current.iframeRef.current?.contentWindow
        if (target != null && entry.sectionId !== '') postSectionHighlight(target, entry.sectionId, true)
      })
      path.addEventListener('pointerleave', () => {
        if (hotId === anchorId) clearHot()
      })
      path.addEventListener('click', () => {
        const entry = paths.get(anchorId)
        if (entry === undefined) return
        entry.note.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (entry.sectionId !== '') propsRef.current.onJump(entry.sectionId)
      })
      svg.appendChild(path)
      const entry: PathEntry = { path, note, sectionId: '' }
      paths.set(anchorId, entry)
      return entry
    }

    const redraw = (): void => {
      const current = propsRef.current
      const container = current.notesScrollRef.current
      const iframe = current.iframeRef.current
      if (container === null || iframe === null) {
        for (const entry of paths.values()) entry.path.remove()
        paths.clear()
        return
      }
      const svgRect = svg.getBoundingClientRect()
      if (svgRect.width <= 0 || svgRect.height <= 0) return
      const iframeRect = iframe.getBoundingClientRect()
      const scrollRect = container.getBoundingClientRect()
      const report = current.reportRef.current
      const sections = new Map(report.sections.map(section => [section.id, section]))
      const blocks = new Map(report.blocks.map(block => [block.index, block]))
      const seen = new Set<string>()
      for (const note of container.querySelectorAll<HTMLElement>('[data-ll-anchor]')) {
        const anchorId = note.getAttribute('data-ll-anchor') ?? ''
        if (anchorId === '' || seen.has(anchorId)) continue
        if (note.getAttribute('data-ll-chapter') !== current.chapterKey) continue
        // note-side endpoint: the excerpt block's left edge — only while the
        // block is actually inside the notes scroller's visible region
        const noteRect = note.getBoundingClientRect()
        if (noteRect.bottom <= scrollRect.top || noteRect.top >= scrollRect.bottom) continue

        // chapter-side endpoint: the excerpted TEXT BLOCK when reported and
        // visible, else the owning section heading; nothing if both scroll
        // off screen — trailing lines across the cards read as broken UI
        const blockAttr = note.getAttribute('data-ll-block')
        const blockIndex = blockAttr !== null && /^\d+$/.test(blockAttr) ? Number(blockAttr) : null
        let x2 = 0
        let y2 = 0
        let sectionId = ''
        const block = blockIndex === null ? undefined : blocks.get(blockIndex)
        if (block !== undefined && block.top > -VISIBILITY_MARGIN && block.top < iframeRect.height + VISIBILITY_MARGIN) {
          x2 = iframeRect.left + block.right - svgRect.left + 4
          y2 = iframeRect.top + block.top + 12 - svgRect.top
        } else {
          const id = note.getAttribute('data-ll-section')
          const section = id === null ? undefined : sections.get(id)
          if (section === undefined) continue
          const visible = section.top < iframeRect.height + VISIBILITY_MARGIN && section.top + section.height > -VISIBILITY_MARGIN
          if (!visible) continue
          sectionId = section.id
          x2 = iframeRect.left + section.right - svgRect.left + 4
          y2 = iframeRect.top + section.top + Math.min(section.height, 24) / 2 - svgRect.top
        }
        if (sectionId === '') sectionId = note.getAttribute('data-ll-section') ?? ''

        seen.add(anchorId)
        let entry = paths.get(anchorId)
        if (entry === undefined) entry = bindPath(anchorId, note)
        entry.note = note
        entry.sectionId = sectionId
        const x1 = noteRect.left - svgRect.left
        const y1 = noteRect.top + noteRect.height / 2 - svgRect.top
        const midX = (x1 + x2) / 2
        entry.path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`)
      }
      for (const [anchorId, entry] of paths) {
        if (seen.has(anchorId)) continue
        if (hotId === anchorId) clearHot()
        entry.path.remove()
        paths.delete(anchorId)
      }
    }

    let frame = requestAnimationFrame(function tick() {
      redraw()
      frame = requestAnimationFrame(tick)
    })
    return () => {
      cancelAnimationFrame(frame)
      clearHot()
      for (const entry of paths.values()) entry.path.remove()
      paths.clear()
    }
  }, [props.active, props.chapterKey])

  if (!props.active || props.chapterKey === null) return null
  return <svg ref={svgRef} className={css.anchorLayer} aria-hidden='true' />
}
