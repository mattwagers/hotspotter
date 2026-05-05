import { useState } from 'react'
import type { Hotspot, TranscriptWord } from '../../types'

// Canonical target fields for hotspot CSV import
const TARGET_FIELDS = [
  { key: 'hid',       label: 'HID',        required: false },
  { key: 'startWord', label: 'Start Word',  required: true  },
  { key: 'endWord',   label: 'End Word',    required: true  },
  { key: 'noChange',  label: 'No Change',   required: false },
  { key: 'loSwap',    label: 'Lo Swap',     required: false },
  { key: 'hiSwap',    label: 'Hi Swap',     required: false },
  { key: 'deltaLo',    label: 'ΔLo',         required: false },
  { key: 'deltaHi',   label: 'ΔHi',         required: false },
  { key: 'sumDeltaLo', label: 'ΣΔLo',       required: false },
  { key: 'sumDeltaHi', label: 'ΣΔHi',       required: false },
  { key: 'peakLo',    label: 'Pk Lo',        required: false },
  { key: 'peakHi',    label: 'Pk Hi',        required: false },
  { key: 'notes',     label: 'Notes',       required: false },
] as const

type TargetKey = (typeof TARGET_FIELDS)[number]['key']

// Auto-detect initial mapping from CSV headers
const ALIASES: Record<TargetKey, string[]> = {
  hid:       ['hid', 'id'],
  startWord: ['startword', 'start', 'startindex', 'start_word'],
  endWord:   ['endword', 'end', 'endindex', 'end_word'],
  noChange:  ['nochange', 'no_change', 'noswap', 'original', 'span'],
  loSwap:    ['loswap', 'lo_swap', 'lo', 'lowswap'],
  hiSwap:    ['hiswap', 'hi_swap', 'hi', 'highswap'],
  deltaLo:    ['deltalo', 'delta_lo', 'dlo'],
  deltaHi:    ['deltahi', 'delta_hi', 'dhi'],
  sumDeltaLo: ['sumdeltalo', 'sum_delta_lo'],
  sumDeltaHi: ['sumdeltahi', 'sum_delta_hi'],
  peakLo:     ['peaklo', 'peak_lo'],
  peakHi:     ['peakhi', 'peak_hi'],
  notes:      ['notes', 'note', 'comment'],
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function autoMap(headers: string[]): Partial<Record<TargetKey, string>> {
  const map: Partial<Record<TargetKey, string>> = {}
  for (const field of TARGET_FIELDS) {
    const match = headers.find((h) => ALIASES[field.key].includes(norm(h)))
    if (match) map[field.key] = match
  }
  return map
}

function rowsToHotspots(
  rows: Record<string, string>[],
  mapping: Partial<Record<TargetKey, string>>,
  words: TranscriptWord[]
): Hotspot[] {
  return rows.map((row, i) => {
    function get(key: TargetKey): string {
      const col = mapping[key]
      return col ? (row[col] ?? '') : ''
    }
    function getNum(key: TargetKey): number {
      return parseInt(get(key)) || 0
    }
    function getFloat(key: TargetKey): number | null {
      const n = parseFloat(get(key))
      return isNaN(n) ? null : n
    }

    const startWord = getNum('startWord')
    const endWord = getNum('endWord')
    const noChangeFromCSV = get('noChange')
    const noChange =
      noChangeFromCSV ||
      words
        .slice(startWord, endWord + 1)
        .map((w) => w.text)
        .join(' ')

    return {
      hid: get('hid') || `H${String(i + 1).padStart(3, '0')}`,
      startWord,
      endWord,
      noChange,
      loSwap: get('loSwap'),
      hiSwap: get('hiSwap'),
      deltaLo: getFloat('deltaLo'),
      deltaHi: getFloat('deltaHi'),
      sumDeltaLo: getFloat('sumDeltaLo'),
      sumDeltaHi: getFloat('sumDeltaHi'),
      peakLo: getFloat('peakLo'),
      peakHi: getFloat('peakHi'),
      notes: get('notes'),
      _cache: { loSwapSurp: null, hiSwapSurp: null },
    }
  })
}

interface Props {
  rows: Record<string, string>[]
  words: TranscriptWord[]
  onImport: (hotspots: Hotspot[]) => void
  onClose: () => void
}

export default function ColumnMapper({ rows, words, onImport, onClose }: Props) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  const [mapping, setMapping] = useState<Partial<Record<TargetKey, string>>>(() =>
    autoMap(headers)
  )
  const preview = rows.slice(0, 3)

  function setCol(field: TargetKey, col: string) {
    setMapping((m) => ({ ...m, [field]: col || undefined }))
  }

  const requiredMapped = TARGET_FIELDS.filter((f) => f.required).every(
    (f) => mapping[f.key]
  )

  function handleImport() {
    onImport(rowsToHotspots(rows, mapping, words))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[640px] max-h-[85vh] flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Import Hotspots CSV</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {rows.length} rows · {headers.length} columns. Map each field to a CSV column.
          </p>
        </div>

        {/* Field → column mapping */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {TARGET_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <label className="text-xs w-24 shrink-0 text-gray-600">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <select
                value={mapping[field.key] ?? ''}
                onChange={(e) => setCol(field.key, e.target.value)}
                className="flex-1 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">— skip —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Data preview */}
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="border-b border-gray-200 px-2 py-1 bg-gray-50 text-left font-medium text-gray-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1 text-gray-700 truncate max-w-[120px]">
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 3 && (
          <p className="text-xs text-gray-400 -mt-2">…and {rows.length - 3} more rows</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!requiredMapped}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import {rows.length} rows
          </button>
        </div>
      </div>
    </div>
  )
}
