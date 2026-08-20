/**
 * The note↔chapter connection canvas (P1): a host-layer SVG overlay spanning
 * the viewer + notes cards — bezier curves from each anchored excerpt block's
 * left edge to its section heading's right edge inside the middle iframe.
 *
 * Rendering is fully imperative (no React state): a rAF loop re-reads both
 * geometries every frame — the note blocks live in the host DOM, the section
 * positions arrive as viewport-relative reports from the iframe's anchor
 * layer (ll-anchor-report) and convert to host coordinates through the
 * iframe's bounding rect. Scrolls, resizes and edits are all covered by the
 * loop; identical frames cost one rect comparison each.
 *
 * Interactions per path: hover → hot style + note-block highlight + section
 * highlight inside the iframe (ll-highlight); click → scroll the note block
 * into view and jump the document to the section (ll-jump).
 */

import { useEffect, useRef } from 'react'
import css from './space.module.css'
import { postSectionHighlight } from './bridge.ts'
import type { SectionReportEntry } from './bridge.ts'

export interface ConnectionLayerProps {
  readonly iframeRef: React.MutableRefObject<HTMLIFrameElement | null>
  readonly sectionsRef: React.MutableRefObject<readonly SectionReportEntry[]>
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
        if (target != null) postSectionHighlight(target, entry.sectionId, true)
      })
      path.addEventListener('pointerleave', () => {
        if (hotId === anchorId) clearHot()
      })
      path.addEventListener('click', () => {
        const entry = paths.get(anchorId)
        if (entry === undefined) return
        entry.note.scrollIntoView({ behavior: 'smooth', block: 'center' })
        propsRef.current.onJump(entry.sectionId)
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
      const sections = new Map<string, SectionReportEntry>()
      for (const section of current.sectionsRef.current) sections.set(section.id, section)
      const seen = new Set<string>()
      for (const note of container.querySelectorAll<HTMLElement>('[data-ll-anchor]')) {
        const anchorId = note.getAttribute('data-ll-anchor') ?? ''
        if (anchorId === '' || seen.has(anchorId)) continue
        if (note.getAttribute('data-ll-chapter') !== current.chapterKey) continue
        const sectionId = note.getAttribute('data-ll-section')
        const section = sectionId === null ? undefined : sections.get(sectionId)
        if (section === undefined) continue
        seen.add(anchorId)
        let entry = paths.get(anchorId)
        if (entry === undefined) entry = bindPath(anchorId, note)
        entry.note = note
        entry.sectionId = sectionId ?? ''
        const noteRect = note.getBoundingClientRect()
        // note left edge → section right edge, both in svg-local coords
        const x1 = noteRect.left - svgRect.left
        const y1 = noteRect.top + noteRect.height / 2 - svgRect.top
        const x2 = iframeRect.left + section.right - svgRect.left + 4
        const y2 = iframeRect.top + section.top + Math.min(section.height, 24) / 2 - svgRect.top
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
