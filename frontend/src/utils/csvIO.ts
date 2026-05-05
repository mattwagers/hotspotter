import type { Hotspot, TranscriptWord } from '../types'

export const EXPORT_COLUMNS = [
  'hid', 'start_word', 'end_word', 'no_change',
  'lo_swap', 'hi_swap', 'delta_lo', 'delta_hi', 'notes',
] as const

// ── parsing ────────────────────────────────────────────────────────────────

export function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitLine(lines[0])
  return lines.slice(1).filter(Boolean).map((line) => {
    const vals = splitLine(line)
    return Object.fromEntries(
      headers.map((h, i) => [h.trim().toLowerCase().replace(/\s+/g, '_'), (vals[i] ?? '').trim()])
    )
  })
}

function splitLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ── surprisal CSV column detection ────────────────────────────────────────

const WORD_CANDIDATES = ['word', 'token', 'gpt2word', 'gpt2token', 'w']
const SURP_CANDIDATES = ['surprisal', 'surp', 'surprise', 'bits', 'neglogprob', 'logprob', 's']

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function detectSurprisalColumns(headers: string[]): {
  wordCol: string | null
  surprisalCol: string | null
} {
  const wordCol = headers.find((h) => WORD_CANDIDATES.includes(norm(h))) ?? null
  const surprisalCol = headers.find((h) => SURP_CANDIDATES.includes(norm(h))) ?? null
  return { wordCol, surprisalCol }
}

// ── hotspot CSV parsing ────────────────────────────────────────────────────

function getField(row: Record<string, string>, candidates: string[]): string {
  const key = Object.keys(row).find((k) => candidates.includes(norm(k)))
  return key ? row[key] : ''
}

function parseFloatOrNull(s: string): number | null {
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export function parseHotspotsCSV(
  rows: Record<string, string>[],
  words: TranscriptWord[]
): Hotspot[] {
  return rows.map((row, i) => {
    const startWord = parseInt(getField(row, ['startword', 'start', 'startindex', 'start_word'])) || 0
    const endWord = parseInt(getField(row, ['endword', 'end', 'endindex', 'end_word'])) || 0
    const noChangeFromCSV = getField(row, ['nochange', 'no_change', 'noswap', 'original', 'span'])
    const noChange =
      noChangeFromCSV ||
      words
        .slice(startWord, endWord + 1)
        .map((w) => w.text)
        .join(' ')

    return {
      hid: getField(row, ['hid', 'id']) || `H${String(i + 1).padStart(3, '0')}`,
      startWord,
      endWord,
      noChange,
      loSwap: getField(row, ['loswap', 'lo_swap', 'lo', 'lowswap']),
      hiSwap: getField(row, ['hiswap', 'hi_swap', 'hi', 'highswap']),
      deltaLo: parseFloatOrNull(getField(row, ['deltalo', 'delta_lo', 'dlo'])),
      deltaHi: parseFloatOrNull(getField(row, ['deltahi', 'delta_hi', 'dhi'])),
      notes: getField(row, ['notes', 'note', 'comment']),
      _cache: { loSwapSurp: null, hiSwapSurp: null },
    }
  })
}

// ── export ─────────────────────────────────────────────────────────────────

export function exportHotspotsCSV(hotspots: Hotspot[]): string {
  const header = EXPORT_COLUMNS.join(',')
  const rows = hotspots.map((h) =>
    [
      csvCell(h.hid),
      h.startWord,
      h.endWord,
      csvCell(h.noChange),
      csvCell(h.loSwap),
      csvCell(h.hiSwap),
      h.deltaLo ?? '',
      h.deltaHi ?? '',
      csvCell(h.notes),
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

// Exports word-level surprisals as a flat table: index,word,surprisal
// This is also the format accepted by "Load Surprisals CSV".
export function exportSurprisalsCSV(words: TranscriptWord[]): string {
  const header = 'index,word,surprisal'
  const rows = words.map((w) =>
    [w.index, csvCell(w.text), w.surprisal ?? ''].join(',')
  )
  return [header, ...rows].join('\n')
}

function csvCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}
