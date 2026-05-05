import type { TranscriptWord, Hotspot } from '../../../types'
import { useStore } from '../../../store'

interface Props {
  word: TranscriptWord
  hotspots: Hotspot[]
  isSelected: boolean
  onWordClick: (word: TranscriptWord, shiftHeld: boolean) => void
}

// Color by hotspot type: gray = no-change only, blue = lo-swap set, red = hi-swap set
function hotspotBg(h: Hotspot): string {
  if (h.hiSwap) return 'bg-red-200/60'
  if (h.loSwap) return 'bg-blue-200/60'
  return 'bg-gray-200/60'
}

function SparklineBar({ value, max }: { value: number | null; max: number }) {
  if (value === null) return <span className="inline-block w-1 h-3 bg-gray-200 mx-px" />
  const height = Math.max(1, Math.round((value / max) * 12))
  return (
    <span
      className="inline-block w-1 bg-indigo-400 mx-px align-bottom"
      style={{ height }}
    />
  )
}

export default function WordSpan({ word, hotspots, isSelected, onWordClick }: Props) {
  const showSparklines = useStore((s) => s.displayMode.sparklines)

  const containingHotspot = hotspots.find(
    (h) => word.index >= h.startWord && word.index <= h.endWord
  )

  let classes =
    'inline cursor-pointer rounded-sm px-px transition-colors hover:ring-1 hover:ring-indigo-400'

  if (isSelected) {
    classes += ' ring-2 ring-indigo-500 bg-indigo-100'
  } else if (containingHotspot) {
    classes += ` ${hotspotBg(containingHotspot)}`
  }

  // Simple sparkline: show surprisal bar above each word in a small inline SVG
  const surprisal = word.surprisal

  return (
    <span
      className={classes}
      onClick={(e) => onWordClick(word, e.shiftKey)}
      title={surprisal !== null ? `surprisal: ${surprisal.toFixed(2)} bits` : undefined}
    >
      {showSparklines && (
        <span className="inline-flex items-end h-3 mr-0.5 align-middle">
          <SparklineBar value={surprisal} max={20} />
        </span>
      )}
      {word.text}
    </span>
  )
}
