import { useState } from 'react'
import { useStore } from '../../store'
import { useRecompute } from '../../hooks/useRecompute'
import type { Hotspot } from '../../types'

const CELL = 'px-2 py-1'
const INPUT =
  'w-full bg-transparent border-0 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1'

function DeltaCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-300">—</span>
  const color = value > 0 ? 'text-red-600' : value < 0 ? 'text-blue-600' : 'text-gray-500'
  return <span className={color}>{value > 0 ? '+' : ''}{value.toFixed(3)}</span>
}

// Inline mini sparkline bar chart for a single condition
function SparklineBars({
  values,
  color,
  label,
}: {
  values: number[] | null
  color: string
  label: string
}) {
  if (!values || values.length === 0) return null
  const max = Math.max(...values, 0.01)
  const W = 4
  const H = 24
  const width = values.length * (W + 1)

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400">{label}</span>
      <svg width={width} height={H}>
        {values.map((v, i) => {
          const h = Math.max(1, (v / max) * (H - 2))
          return (
            <rect
              key={i}
              x={i * (W + 1)}
              y={H - h}
              width={W}
              height={h}
              fill={color}
              opacity={0.8}
            />
          )
        })}
      </svg>
    </div>
  )
}

function SparklineExpander({ hotspot, words }: { hotspot: Hotspot; words: { surprisal: number | null }[] }) {
  const baseline = words
    .slice(hotspot.startWord, hotspot.endWord + 1)
    .map((w) => w.surprisal)
    .filter((v): v is number => v !== null)

  return (
    <tr className="bg-gray-50 border-b border-gray-100">
      <td colSpan={14} className="px-4 py-2">
        <div className="flex gap-6 items-end">
          <SparklineBars values={baseline} color="#94a3b8" label="Baseline" />
          <SparklineBars values={hotspot._cache.loSwapSurp} color="#6366f1" label="Lo Swap" />
          <SparklineBars values={hotspot._cache.hiSwapSurp} color="#ef4444" label="Hi Swap" />
          {baseline.length === 0 && !hotspot._cache.loSwapSurp && !hotspot._cache.hiSwapSurp && (
            <span className="text-xs text-gray-400 italic">
              No surprisal data — load surprisals or recompute.
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

function HotspotRow({ hotspot }: { hotspot: Hotspot }) {
  const updateHotspot = useStore((s) => s.updateHotspot)
  const removeHotspot = useStore((s) => s.removeHotspot)
  const setSelection = useStore((s) => s.setSelection)
  const words = useStore((s) => s.words)
  const { recomputeHotspot } = useRecompute()
  const [computing, setComputing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function update(field: keyof Hotspot, value: string) {
    updateHotspot(hotspot.hid, { [field]: value } as Partial<Hotspot>)
  }

  async function handleRecompute() {
    setComputing(true)
    await recomputeHotspot(hotspot.hid)
    setComputing(false)
  }

  function handleHidClick() {
    setSelection({ start: hotspot.startWord, end: hotspot.endWord })
  }

  const hasSparklines =
    (hotspot._cache.loSwapSurp || hotspot._cache.hiSwapSurp) !== null

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-indigo-50/30 group">
        <td className={`${CELL} font-mono text-indigo-700 cursor-pointer hover:underline`} onClick={handleHidClick}>
          {hotspot.hid}
        </td>
        <td className={`${CELL} text-gray-500`}>{hotspot.startWord}</td>
        <td className={`${CELL} text-gray-500`}>{hotspot.endWord}</td>
        <td className={`${CELL} text-gray-400 max-w-[120px] truncate`} title={hotspot.noChange}>
          {hotspot.noChange}
        </td>
        <td className={CELL}>
          <input
            className={INPUT}
            value={hotspot.loSwap}
            onChange={(e) => update('loSwap', e.target.value)}
            placeholder="lo swap…"
          />
        </td>
        <td className={CELL}>
          <input
            className={INPUT}
            value={hotspot.hiSwap}
            onChange={(e) => update('hiSwap', e.target.value)}
            placeholder="hi swap…"
          />
        </td>
        <td className={`${CELL} text-right tabular-nums`}>
          <DeltaCell value={hotspot.deltaLo} />
        </td>
        <td className={`${CELL} text-right tabular-nums`}>
          <DeltaCell value={hotspot.deltaHi} />
        </td>
        <td className={`${CELL} text-right tabular-nums`}>
          <DeltaCell value={hotspot.sumDeltaLo} />
        </td>
        <td className={`${CELL} text-right tabular-nums`}>
          <DeltaCell value={hotspot.sumDeltaHi} />
        </td>
        <td className={`${CELL} text-right tabular-nums text-gray-500`}>
          {hotspot.peakLo !== null ? hotspot.peakLo.toFixed(3) : <span className="text-gray-300">—</span>}
        </td>
        <td className={`${CELL} text-right tabular-nums text-gray-500`}>
          {hotspot.peakHi !== null ? hotspot.peakHi.toFixed(3) : <span className="text-gray-300">—</span>}
        </td>
        <td className={CELL}>
          <input
            className={INPUT}
            value={hotspot.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="notes…"
          />
        </td>
        <td className={CELL}>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasSparklines && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="px-1.5 py-0.5 text-xs border border-gray-300 text-gray-500 rounded hover:bg-gray-50"
                title="Show sparklines"
              >
                {expanded ? '▲' : '▼'}
              </button>
            )}
            <button
              onClick={handleRecompute}
              disabled={computing || (!hotspot.loSwap && !hotspot.hiSwap)}
              className="px-1.5 py-0.5 text-xs border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 disabled:opacity-30"
              title="Recompute surprisals"
            >
              {computing ? '…' : '↺'}
            </button>
            <button
              onClick={() => removeHotspot(hotspot.hid)}
              className="px-1.5 py-0.5 text-xs border border-red-200 text-red-400 rounded hover:bg-red-50"
              title="Remove hotspot"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
      {expanded && hasSparklines && (
        <SparklineExpander hotspot={hotspot} words={words} />
      )}
    </>
  )
}

const HEADERS = ['HID', 'Start', 'End', 'No Change', 'Lo Swap', 'Hi Swap', 'ΔLo', 'ΔHi', 'ΣΔLo', 'ΣΔHi', 'Pk Lo', 'Pk Hi', 'Notes', '']

export default function HotspotTable() {
  const hotspots = useStore((s) => s.hotspots)
  const { recomputeAll } = useRecompute()
  const [computingAll, setComputingAll] = useState(false)

  async function handleRecomputeAll() {
    setComputingAll(true)
    await recomputeAll()
    setComputingAll(false)
  }

  return (
    <div className="border-t border-gray-200 bg-white shrink-0 flex flex-col" style={{ maxHeight: '40vh' }}>
      {/* Table toolbar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-medium text-gray-600">
          Hotspots{hotspots.length > 0 ? ` (${hotspots.length})` : ''}
        </span>
        {hotspots.length > 0 && (
          <button
            onClick={handleRecomputeAll}
            disabled={computingAll}
            className="px-2 py-0.5 text-xs border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 disabled:opacity-40"
          >
            {computingAll ? 'Computing…' : '↺ Recompute All'}
          </button>
        )}
      </div>

      {hotspots.length === 0 ? (
        <div className="text-gray-400 text-xs text-center py-5">
          Select a span in the transcript to create a hotspot.
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className="px-2 py-1 text-left font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hotspots.map((h) => (
                <HotspotRow key={h.hid} hotspot={h} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
