import { useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { useSelection } from '../../hooks/useSelection'
import WordSpan from './WordSpan'
import type { Hotspot } from '../../types'

function nextHid(hotspots: Hotspot[]): string {
  const nums = hotspots
    .map((h) => parseInt(h.hid.replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `H${String(next).padStart(3, '0')}`
}

export default function TranscriptView() {
  const words = useStore((s) => s.words)
  const hotspots = useStore((s) => s.hotspots)
  const addHotspot = useStore((s) => s.addHotspot)
  const setSelection = useStore((s) => s.setSelection)
  const { selection, handleWordClick } = useSelection()
  const paragraphRef = useRef<HTMLParagraphElement>(null)

  // Scroll to the start word when selection is set from outside (e.g., HID click in table)
  useEffect(() => {
    if (!selection || !paragraphRef.current) return
    const el = paragraphRef.current.querySelector<HTMLElement>(
      `[data-word-index="${selection.start}"]`
    )
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selection?.start])  // eslint-disable-line react-hooks/exhaustive-deps

  if (words.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-16 text-center">
        Load a transcript to begin.
      </div>
    )
  }

  function handleCreateHotspot() {
    if (!selection) return
    const spanWords = words.slice(selection.start, selection.end + 1)
    const noChange = spanWords.map((w) => w.text).join(' ')
    const hid = nextHid(hotspots)
    addHotspot({
      hid,
      startWord: selection.start,
      endWord: selection.end,
      noChange,
      loSwap: '',
      hiSwap: '',
      deltaLo: null,
      deltaHi: null,
      sumDeltaLo: null,
      sumDeltaHi: null,
      peakLo: null,
      peakHi: null,
      notes: '',
      _cache: { loSwapSurp: null, hiSwapSurp: null },
    })
    setSelection(null)
  }

  // Check if the current selection is already a hotspot
  const selectionIsHotspot =
    selection !== null &&
    hotspots.some(
      (h) => h.startWord === selection.start && h.endWord === selection.end
    )

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Create hotspot button */}
      {selection !== null && !selectionIsHotspot && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleCreateHotspot}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm"
          >
            + Create hotspot ({selection.end - selection.start + 1} word{selection.end !== selection.start ? 's' : ''})
          </button>
          <button
            onClick={() => setSelection(null)}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-500"
          >
            Clear
          </button>
        </div>
      )}

      <p ref={paragraphRef} className="leading-9 text-base select-none">
        {words.map((w) => {
          const isSelected =
            selection !== null &&
            w.index >= selection.start &&
            w.index <= selection.end

          return (
            <span key={w.index} data-word-index={w.index}>
              <WordSpan
                word={w}
                hotspots={hotspots}
                isSelected={isSelected}
                onWordClick={handleWordClick}
              />{' '}
            </span>
          )
        })}
      </p>
    </div>
  )
}
