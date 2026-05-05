import { useRef, useEffect, useState } from 'react'
import { useStore } from '../../store'
import { useRecompute } from '../../hooks/useRecompute'
import { transcriptToWords, alignSurprisals } from '../../utils/alignment'
import {
  parseCSV,
  detectSurprisalColumns,
  exportHotspotsCSV,
  exportSurprisalsCSV,
} from '../../utils/csvIO'
import type { Hotspot } from '../../types'
import ColumnMapper from '../ColumnMapper'

const BTN =
  'px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
const BTN_PRIMARY =
  'px-2.5 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

// Format hint shown in the Load Surprisals tooltip
const SURPRISAL_CSV_HINT = `Expected CSV format:
  word,surprisal
  the,3.21
  quick,8.14
  …

Column names accepted:
  word / token / gpt2word / w
  surprisal / surp / bits / logprob`

export default function Toolbar() {
  const transcriptInputRef = useRef<HTMLInputElement>(null)
  const surprisalsInputRef = useRef<HTMLInputElement>(null)
  const hotspotsInputRef = useRef<HTMLInputElement>(null)

  const [showMapper, setShowMapper] = useState(false)
  const [pendingRows, setPendingRows] = useState<Record<string, string>[]>([])
  const [computingSurprisals, setComputingSurprisals] = useState(false)

  const words = useStore((s) => s.words)
  const hotspots = useStore((s) => s.hotspots)
  const serverStatus = useStore((s) => s.serverStatus)
  const displayMode = useStore((s) => s.displayMode)
  const setWords = useStore((s) => s.setWords)
  const setHotspots = useStore((s) => s.setHotspots)
  const setDisplayMode = useStore((s) => s.setDisplayMode)
  const { checkHealth, computeTranscriptSurprisals } = useRecompute()

  useEffect(() => { checkHealth() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  function readFile(file: File): Promise<string> {
    return new Promise((res) => {
      const reader = new FileReader()
      reader.onload = (e) => res(e.target!.result as string)
      reader.readAsText(file)
    })
  }

  async function handleTranscript(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFile(file)
    setWords(transcriptToWords(text))
    e.target.value = ''
  }

  async function handleSurprisalsCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFile(file)
    const rows = parseCSV(text)
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const { wordCol, surprisalCol } = detectSurprisalColumns(headers)
    if (!wordCol || !surprisalCol) {
      alert(`Could not auto-detect word/surprisal columns.\nFound: ${headers.join(', ')}\n\n${SURPRISAL_CSV_HINT}`)
      e.target.value = ''
      return
    }
    const mapped = rows
      .map((r) => ({ word: r[wordCol], surprisal: parseFloat(r[surprisalCol]) }))
      .filter((r) => !isNaN(r.surprisal))
    setWords(alignSurprisals(words, mapped))
    e.target.value = ''
  }

  async function handleHotspotsCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFile(file)
    setPendingRows(parseCSV(text))
    setShowMapper(true)
    e.target.value = ''
  }

  async function handleComputeSurprisals() {
    setComputingSurprisals(true)
    const ok = await computeTranscriptSurprisals()
    setComputingSurprisals(false)
    if (!ok) alert('Server error computing surprisals. Check that the server is running.')
  }

  function handleImport(imported: Hotspot[]) {
    setHotspots(imported)
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportHotspots() {
    if (hotspots.length === 0) return
    downloadCSV(exportHotspotsCSV(hotspots), 'hotspots.csv')
  }

  function handleExportSurprisals() {
    downloadCSV(exportSurprisalsCSV(words), 'surprisals.csv')
  }

  const hasSurprisals = words.some((w) => w.surprisal !== null)

  const statusDot: Record<typeof serverStatus, string> = {
    unknown: 'bg-gray-400',
    online: 'bg-green-500',
    offline: 'bg-red-500',
  }

  return (
    <>
      <header className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0 flex-wrap">
        <img src="/hotspotter_logo.svg" style={{ height: 32, width: 'auto' }} alt="Hotspotter" />
        <span className="font-bold text-sm tracking-tight text-gray-800 mr-2">Hotspotter</span>

        {/* Hidden file inputs */}
        <input ref={transcriptInputRef} type="file" accept=".txt" className="hidden" onChange={handleTranscript} />
        <input ref={surprisalsInputRef} type="file" accept=".csv" className="hidden" onChange={handleSurprisalsCSV} />
        <input ref={hotspotsInputRef} type="file" accept=".csv" className="hidden" onChange={handleHotspotsCSV} />

        <button className={BTN} onClick={() => transcriptInputRef.current?.click()}>
          Load Transcript
        </button>

        {/* Surprisals: load from file or compute from server */}
        <div className="flex items-center">
          <button
            className={`${BTN} rounded-r-none border-r-0`}
            onClick={() => surprisalsInputRef.current?.click()}
            disabled={words.length === 0}
            title={SURPRISAL_CSV_HINT}
          >
            Load Surprisals
          </button>
          <button
            className={`${BTN} rounded-l-none px-2 border-l-gray-200`}
            onClick={handleComputeSurprisals}
            disabled={words.length === 0 || serverStatus !== 'online' || computingSurprisals}
            title="Compute surprisals for the full transcript via the GPT-2 server"
          >
            {computingSurprisals ? '…' : '⚡'}
          </button>
        </div>

        <button
          className={BTN}
          onClick={() => hotspotsInputRef.current?.click()}
          disabled={words.length === 0}
        >
          Load Hotspots
        </button>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        <button className={BTN_PRIMARY} onClick={handleExportHotspots} disabled={hotspots.length === 0}>
          Export Hotspots
        </button>
        <button className={BTN} onClick={handleExportSurprisals} disabled={!hasSurprisals}>
          Export Surprisals
        </button>

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={displayMode.sparklines}
              onChange={(e) => setDisplayMode({ sparklines: e.target.checked })}
            />
            Sparklines
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={displayMode.ribbon}
              onChange={(e) => setDisplayMode({ ribbon: e.target.checked })}
            />
            Ribbon
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            Kernel
            <input
              type="range"
              min={1}
              max={20}
              value={displayMode.kernelSize}
              onChange={(e) => setDisplayMode({ kernelSize: Number(e.target.value) })}
              className="w-20 accent-indigo-600"
            />
            <span className="w-6 text-gray-500">{displayMode.kernelSize}w</span>
          </label>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot[serverStatus]}`} />
            <span className="text-xs text-gray-500">{serverStatus}</span>
          </div>
        </div>
      </header>

      {showMapper && (
        <ColumnMapper
          rows={pendingRows}
          words={words}
          onImport={handleImport}
          onClose={() => setShowMapper(false)}
        />
      )}
    </>
  )
}
