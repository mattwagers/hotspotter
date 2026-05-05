import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '../../store'
import { gaussianSmooth } from '../../utils/surprisalMath'

const HEIGHT = 64
const WORD_PX = 6  // pixels per word on the ribbon
const V_PAD = 6    // vertical padding inside ribbon

export default function SurprisalRibbon() {
  const words = useStore((s) => s.words)
  const hotspots = useStore((s) => s.hotspots)
  const displayMode = useStore((s) => s.displayMode)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewport, setViewport] = useState({ left: 0, width: 0, total: 0 })

  const n = words.length
  const svgWidth = n * WORD_PX
  const drawHeight = HEIGHT - V_PAD * 2

  const rawSurprisals = words.map((w) => w.surprisal)
  const smoothed = gaussianSmooth(rawSurprisals, displayMode.kernelSize)

  const validValues = smoothed.filter((v): v is number => v !== null)
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 1
  const minVal = validValues.length > 0 ? Math.min(...validValues) : 0
  const range = maxVal - minVal || 1

  function toY(v: number) {
    return V_PAD + drawHeight - ((v - minVal) / range) * drawHeight
  }

  // Build SVG polyline points
  const points = smoothed
    .map((v, i) => (v !== null ? `${i * WORD_PX + WORD_PX / 2},${toY(v)}` : null))
    .filter(Boolean)
    .join(' ')

  // Track main content scroll to update viewport indicator
  const updateViewport = useCallback(() => {
    const container = containerRef.current
    if (!container || svgWidth === 0) return
    const main = document.querySelector('main')
    if (!main) return
    const mainRect = main.getBoundingClientRect()
    const ribbonRect = container.getBoundingClientRect()
    const scale = svgWidth / ribbonRect.width
    const visibleLeft = (main.scrollLeft * scale) || 0
    const visibleWidth = (mainRect.width * scale) || ribbonRect.width
    setViewport({ left: visibleLeft / svgWidth, width: visibleWidth / svgWidth, total: svgWidth })
  }, [svgWidth])

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    main.addEventListener('scroll', updateViewport)
    updateViewport()
    return () => main.removeEventListener('scroll', updateViewport)
  }, [updateViewport])

  function handleRibbonClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || n === 0) return
    const rect = svg.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const wordIndex = Math.round(ratio * n)
    // Approximate scroll: words are in a <p> with leading-9, ~36px per line
    // We scroll the main element. Best effort: find the word span by data attr in future.
    // For now, scroll the main proportionally.
    const main = document.querySelector('main')
    if (!main) return
    const scrollTarget = ratio * main.scrollHeight
    main.scrollTo({ top: scrollTarget, behavior: 'smooth' })
    void wordIndex
  }

  if (!displayMode.ribbon || n === 0) return null

  return (
    <div
      ref={containerRef}
      className="shrink-0 border-b border-gray-200 bg-gray-50 overflow-hidden relative"
      style={{ height: HEIGHT }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${svgWidth || 100} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="cursor-crosshair w-full"
        onClick={handleRibbonClick}
      >
        {/* Hotspot overlays */}
        {hotspots.map((h) => {
          const x = h.startWord * WORD_PX
          const w = (h.endWord - h.startWord + 1) * WORD_PX
          const fill = h.hiSwap ? 'rgba(239,68,68,0.18)' : h.loSwap ? 'rgba(99,102,241,0.18)' : 'rgba(107,114,128,0.15)'
          return (
            <rect key={h.hid} x={x} y={0} width={w} height={HEIGHT} fill={fill} />
          )
        })}

        {/* Surprisal curve */}
        {points && (
          <polyline
            points={points}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}

        {/* Viewport indicator */}
        {svgWidth > 0 && (
          <rect
            x={viewport.left * svgWidth}
            y={0}
            width={Math.max(8, viewport.width * svgWidth)}
            height={HEIGHT}
            fill="rgba(0,0,0,0.06)"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  )
}
