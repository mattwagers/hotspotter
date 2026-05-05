import { useStore } from '../store'
import { alignSurprisals } from '../utils/alignment'

export function useSurprisals() {
  const words = useStore((s) => s.words)
  const setWords = useStore((s) => s.setWords)

  function loadFromCSV(rows: { word: string; surprisal: number }[]) {
    const aligned = alignSurprisals(words, rows)
    setWords(aligned)
  }

  return { loadFromCSV }
}
