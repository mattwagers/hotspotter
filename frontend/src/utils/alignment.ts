import type { TranscriptWord } from '../types'

export function transcriptToWords(text: string): TranscriptWord[] {
  return text.split(/\s+/).filter(Boolean).map((text, index) => ({
    index,
    text,
    surprisal: null,
  }))
}

export function alignSurprisals(
  words: TranscriptWord[],
  csvRows: { word: string; surprisal: number }[]
): TranscriptWord[] {
  const result = words.map((w) => ({ ...w }))
  let csvIdx = 0

  for (let i = 0; i < result.length && csvIdx < csvRows.length; i++) {
    const displayWord = result[i].text.toLowerCase().replace(/[^a-z0-9']/g, '')
    const csvWord = csvRows[csvIdx].word.toLowerCase().replace(/[^a-z0-9']/g, '')

    if (displayWord === csvWord) {
      result[i].surprisal = csvRows[csvIdx].surprisal
      csvIdx++
    }
    // mismatch: skip CSV token (subword) or display word
  }

  return result
}
