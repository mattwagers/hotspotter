# Hotspotter

A psycholinguistic stimulus design tool for annotating **verbatim recall hotspots** in naturalistic story transcripts and exploring GPT-2 surprisal-based swap conditions.

---

## What it does

You load a story transcript as plain text. Words become individually clickable spans. You select a word range (click + shift-click) and create a **hotspot** — a labeled region with an original phrase, a low-surprisal swap, and a high-surprisal swap. The tool calls a local GPT-2 server to compute per-word surprisals for each swap condition, then reports the mean surprisal delta (bits/word) relative to the original span. A full-story surprisal ribbon and inline sparklines give you a visual read on where the surprisal landscape peaks.

**Typical workflow:**
1. Load a transcript `.txt` file → words appear as clickable spans
2. Click ⚡ to compute baseline surprisals for the full transcript via the server
3. Click a word, then shift-click another to select a span → click **+ Create hotspot**
4. In the Hotspot Table, fill in Lo Swap and Hi Swap text, then click ↺ to compute Δ values
5. Export hotspots as a clean 9-column CSV for your stimulus list

---

## Architecture

```
hotspot/
├── frontend/          React + Vite + TypeScript + Tailwind CSS v4
│   └── src/
│       ├── types/     Shared types: TranscriptWord, Hotspot, AppState
│       ├── store/     Zustand central state store
│       ├── components/
│       │   ├── Toolbar/          File loaders, export, display toggles, server status
│       │   ├── SurprisalRibbon/  Full-story SVG surprisal curve + hotspot overlays
│       │   ├── TranscriptView/   Clickable word spans with hotspot highlighting
│       │   │   └── WordSpan/     Individual word with inline sparkline
│       │   ├── HotspotTable/     Editable rows, delta display, expandable sparklines
│       │   └── ColumnMapper/     CSV import modal with column remapping
│       ├── hooks/
│       │   ├── useSelection.ts   Click + shift-click span selection
│       │   ├── useSurprisals.ts  CSV surprisal loading + alignment
│       │   └── useRecompute.ts   Server calls, delta computation, health check
│       └── utils/
│           ├── alignment.ts      Transcript → TranscriptWord[]; GPT-2 → display alignment
│           ├── surprisalMath.ts  computeDelta, gaussianSmooth, kernel functions
│           └── csvIO.ts          Tolerant CSV parse, column detection, clean export
│
└── server/            Python FastAPI surprisal server
    ├── surprisal.py   GPT-2 word-level surprisals: sliding window (1024 tok, stride 512),
    │                  subword aggregation via " " prefix strategy, SHA-256 file cache
    └── server.py      FastAPI: GET /health, POST /surprisals
```

**State flow:** All UI state lives in a single Zustand store (`words`, `hotspots`, `selection`, `serverStatus`, `displayMode`). Components read from and write to the store directly — no prop drilling.

**Surprisal delta:** `Δ = mean(swap surprisals) − mean(baseline surprisals)` over span words, in bits/word. Swap word count can differ from the original span; means are computed independently.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.9+ |
| pip | any recent |

The Python server downloads the GPT-2 model (~500 MB) from Hugging Face on first run.

---

## Setup & running

### 1. Server

```bash
cd server

# Create and activate a virtual environment (recommended)
python -m venv ../.venv
source ../.venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

uvicorn server:app --reload
# → http://localhost:8000
# → First /surprisals call will download GPT-2 (~500 MB, one time only)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open `localhost:5173` in your browser. The status dot in the top-right turns green when the server is reachable.

---

## Data formats

### Surprisals CSV (Load Surprisals / Export Surprisals)

```
index,word,surprisal
0,The,
1,quick,8.14
2,brown,7.43
...
```

Column names are flexible — the importer accepts: `word` / `token` / `gpt2word` / `w` for the word column and `surprisal` / `surp` / `bits` / `logprob` for the surprisal column. The first word's surprisal is typically empty/null (no prior context for GPT-2).

### Hotspots CSV (Load Hotspots / Export Hotspots)

```
hid,start_word,end_word,no_change,lo_swap,hi_swap,delta_lo,delta_hi,notes
H001,59,70,"So I whip out my notebook","So I grab my notebook","so out comes my notebook",-0.412,1.203,""
```

`no_change` is derived from the transcript and is not editable. `delta_lo` and `delta_hi` are filled in by the server; you can leave them blank when importing.

---

## Display controls

| Control | Effect |
|---------|--------|
| **Sparklines** checkbox | Shows a per-word surprisal bar above each word in the transcript |
| **Ribbon** checkbox | Toggles the full-story surprisal ribbon |
| **Kernel** slider | Gaussian smoothing window width (1–20 words) for the ribbon curve |
| Click word | Start a new selection at that word |
| Shift-click word | Extend selection to that word |
| HID link in table | Jumps the transcript view to that hotspot's span |
| ↺ per row | Recomputes surprisals + delta for one hotspot |
| ↺ Recompute All | Recomputes all hotspots in sequence |
| ▼ expand row | Shows per-word surprisal sparklines for baseline, lo swap, and hi swap |

---

## Hotspot color coding

| Color | Meaning |
|-------|---------|
| Gray | Hotspot with no swap conditions set |
| Blue | Lo swap condition set |
| Red | Hi swap condition set (or both set) |

---

## Server cache

Surprisal results are cached in `server/.cache/` as SHA-256-keyed JSON files. Identical text inputs return instantly without re-running the model. The cache directory is gitignored.
