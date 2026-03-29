import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { RadicalDetail, CompoundItem } from '@/types'

interface Props {
  detail: RadicalDetail
  onSelectCompound: (compound: CompoundItem) => void
  onSelectRoot: () => void
}

const CX = 220
const CY = 220
const CR = 72        // center radius
const NR = 40        // node radius
const DIST = 155     // distance from center to node

const BROWN = {
  center_fill:  '#e0cec7',
  center_stroke:'#6f4e37',
  center_text:  '#2c1f14',
  center_sub:   '#8b6453',
  node_fill:    'var(--color-bg-surface)',
  node_stroke:  '#d2bab0',
  node_hover:   '#f2e8e5',
  node_text:    'var(--color-text)',
  node_sub:     '#8b6453',
  line:         '#e0cec7',
}

export function RadialDiagram({ detail, onSelectCompound, onSelectRoot }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const n = detail.compounds.length
    if (n === 0) return

    // ── Lines ────────────────────────────────────────────
    detail.compounds.forEach((_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const x = CX + DIST * Math.cos(angle)
      const y = CY + DIST * Math.sin(angle)
      const ix = CX + (CR + 2) * Math.cos(angle)
      const iy = CY + (CR + 2) * Math.sin(angle)
      const ox = x - (NR + 2) * Math.cos(angle)
      const oy = y - (NR + 2) * Math.sin(angle)

      svg.append('line')
        .attr('x1', ix).attr('y1', iy)
        .attr('x2', ox).attr('y2', oy)
        .attr('stroke', BROWN.line)
        .attr('stroke-width', 1.5)
    })

    // ── Compound nodes ────────────────────────────────────
    detail.compounds.forEach((compound, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const x = CX + DIST * Math.cos(angle)
      const y = CY + DIST * Math.sin(angle)

      const g = svg.append('g')
        .style('cursor', 'pointer')
        .on('click', () => onSelectCompound(compound))
        .on('mouseenter', function () {
          d3.select(this).select('circle')
            .attr('fill', BROWN.node_hover)
            .attr('stroke', BROWN.center_stroke)
        })
        .on('mouseleave', function () {
          d3.select(this).select('circle')
            .attr('fill', BROWN.node_fill)
            .attr('stroke', BROWN.node_stroke)
        })

      g.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', NR)
        .attr('fill', BROWN.node_fill)
        .attr('stroke', BROWN.node_stroke)
        .attr('stroke-width', 1.5)

      // Chinese character
      g.append('text')
        .attr('x', x).attr('y', y - 6)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 22)
        .attr('font-family', "'Noto Sans SC', 'PingFang SC', system-ui")
        .attr('fill', BROWN.node_text)
        .text(compound.char)

      // Pinyin below
      g.append('text')
        .attr('x', x).attr('y', y + 16)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9.5)
        .attr('font-family', 'system-ui')
        .attr('fill', BROWN.node_sub)
        .text(compound.pinyin)
    })

    // ── Center node ───────────────────────────────────────
    const center = svg.append('g')
      .style('cursor', 'pointer')
      .on('click', onSelectRoot)

    center.append('circle')
      .attr('cx', CX).attr('cy', CY).attr('r', CR)
      .attr('fill', BROWN.center_fill)
      .attr('stroke', BROWN.center_stroke)
      .attr('stroke-width', 2)

    center.append('text')
      .attr('x', CX).attr('y', CY - 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 36)
      .attr('font-family', "'Noto Sans SC', 'PingFang SC', system-ui")
      .attr('fill', BROWN.center_text)
      .text(detail.radical)

    center.append('text')
      .attr('x', CX).attr('y', CY + 24)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-family', 'system-ui')
      .attr('fill', BROWN.center_sub)
      .text(detail.pinyin)

  }, [detail, onSelectCompound, onSelectRoot])

  const size = Math.max(440, Math.min(480, CX * 2 + NR * 2))

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CX * 2} ${CY * 2}`}
      width="100%"
      style={{ maxWidth: size, overflow: 'visible' }}
    />
  )
}
