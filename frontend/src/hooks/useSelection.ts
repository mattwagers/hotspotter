import { useStore } from '../store'
import type { TranscriptWord } from '../types'

export function useSelection() {
  const selection = useStore((s) => s.selection)
  const setSelection = useStore((s) => s.setSelection)

  function handleWordClick(word: TranscriptWord, shiftHeld: boolean) {
    if (!shiftHeld || selection === null) {
      setSelection({ start: word.index, end: word.index })
    } else {
      const start = Math.min(selection.start, word.index)
      const end = Math.max(selection.start, word.index)
      setSelection({ start, end })
    }
  }

  return { selection, handleWordClick }
}
