# veritas-pytest

A production-quality web UI for AI-powered test generation. veritas-pytest allows users to paste or upload Python code, select a function, and run an agentic pipeline that generates comprehensive pytest tests with coverage reports and PR-ready outputs.

## Features

- **Code Input**: Paste Python code or upload `.py` files
- **Function Selection**: Automatically parses and lists functions for selection
- **Agentic Pipeline**: 8-step process that:
  1. Reads Python code
  2. Infers behavior and edge cases
  3. Generates pytest tests
  4. Runs tests
  5. Fixes broken tests (iterates)
  6. Generates coverage reports
  7. Creates PR-ready output in `experiments/` folder
  8. Optionally opens a GitHub pull request
- **Run History**: View all past runs with status, coverage, and details
- **Real-time Progress**: Streaming updates with step-by-step progress
- **Coverage Reports**: Detailed line, branch, and function coverage
- **Diff View**: See the patch that will be applied
- **PR Preview**: Preview and copy PR details before creation

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** with sage green and neutral color scheme
- **localStorage** for run history persistence
- **Mock API** with streaming simulation for demo mode

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
veritas/
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Home/New Run page
│   ├── globals.css         # Global styles
│   ├── run/
│   │   └── [id]/
│   │       └── page.tsx    # Run Details page
│   └── history/
│       └── page.tsx        # History page
├── components/
│   ├── Stepper.tsx         # Pipeline step indicator
│   ├── CodeViewer.tsx      # Code display with copy
│   ├── CoverageTable.tsx   # Coverage summary and files
│   ├── DiffViewer.tsx      # Patch diff display
│   └── RepoConnectCard.tsx # GitHub repo connection UI
├── lib/
│   ├── types.ts            # TypeScript type definitions
│   ├── api.ts              # Mock API client
│   └── storage.ts          # localStorage utilities
└── package.json
```

## Backend API

A **real LLM-powered backend** is available in the `backend/` directory. See [backend/README.md](backend/README.md) for setup instructions.

### Quick Start with Backend

1. **Set up the backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

2. **Run the backend:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Configure the frontend:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_USE_MOCK_API=false
   ```

4. **Run the frontend:**
   ```bash
   npm run dev
   ```

The frontend will now use the real backend with LLM-powered test generation!

### Mock Mode (Default)

By default, the frontend uses **mock mode** for demo purposes. To use mock mode, either:
- Don't set `NEXT_PUBLIC_USE_MOCK_API=false`, or
- Set `NEXT_PUBLIC_USE_MOCK_API=true`

## API Integration Guide

The frontend can work with either:
1. **Mock API** (default) - Simulated test generation for demos
2. **Real Backend** - LLM-powered test generation (see backend/README.md)

### API Contract

The API client in `lib/api.ts` defines the following interface:

#### `startRun(payload: StartRunPayload): Promise<string>`

Starts a new test generation run.

**Request:**
```typescript
{
  code: string              // Python code to test
  functionName: string      // Selected function name
  options: {
    maxIterations: number
    testStyle: 'unit' | 'property-based'
    coverageThreshold: number
    edgeCaseCategories: EdgeCaseCategory
    createPR: boolean
    repoUrl?: string
    branch?: string
  }
}
```

**Response:** `runId: string`

**Implementation:**
```typescript
// Replace with:
const response = await fetch(`${API_BASE}/runs`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const { runId } = await response.json()
return runId
```

#### `getRun(runId: string): Promise<RunResult | null>`

Fetches run details by ID.

**Implementation:**
```typescript
const response = await fetch(`${API_BASE}/runs/${runId}`)
if (!response.ok) return null
return await response.json()
```

#### `streamRunEvents(runId: string, onEvent: (event: RunEvent) => void, payload: StartRunPayload): () => void`

Streams real-time events for a run. Should use Server-Sent Events (SSE) or WebSockets.

**Event Types:**
- `step_start`: A pipeline step has started
- `step_complete`: A pipeline step has completed
- `step_error`: A pipeline step has failed
- `log`: A log message
- `run_complete`: The entire run has completed

**Implementation:**
```typescript
const eventSource = new EventSource(`${API_BASE}/runs/${runId}/stream`)
eventSource.onmessage = (e) => {
  const event: RunEvent = JSON.parse(e.data)
  onEvent(event)
}
return () => eventSource.close()
```

#### `cancelRun(runId: string): Promise<void>`

Cancels a running test generation.

**Implementation:**
```typescript
await fetch(`${API_BASE}/runs/${runId}/cancel`, {
  method: 'POST',
})
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Backend Requirements

Your backend should implement:

1. **POST `/api/runs`** - Start a new run
2. **GET `/api/runs/:id`** - Get run details
3. **GET `/api/runs/:id/stream`** - Stream run events (SSE)
4. **POST `/api/runs/:id/cancel`** - Cancel a run

The backend should:
- Accept the `StartRunPayload` format
- Return `RunResult` objects matching the TypeScript types
- Stream `RunEvent` objects via SSE
- Write outputs to `experiments/<run-id>/` in the target repository
- Optionally create GitHub PRs when `createPR` is true

## Demo Mode

The current implementation includes a **demo mode** that:
- Simulates pipeline progress with realistic delays (1-3 seconds per step)
- Generates mock test code based on function name and style
- Creates sample coverage reports
- Generates patch diffs
- Optionally creates mock PR URLs

All data is stored in `localStorage` and persists across page refreshes.

## Output Structure

When a run completes, outputs are written to:

```
experiments/
└── <run-id>/
    └── test_<function-name>.py
```

The patch diff shows the changes that would be applied to the repository.

## Color Scheme

The UI uses a sage green and neutral color palette:
- **Sage Green**: Primary actions, success states, accents
- **Neutral Grays**: Backgrounds, text, borders

Colors are defined in `tailwind.config.ts` and can be customized there.

## Development

### TypeScript

All components and utilities are fully typed. Types are defined in `lib/types.ts`.

### Styling

- Uses Tailwind CSS utility classes
- Responsive design with mobile-first approach
- Consistent spacing and typography

### State Management

- React hooks (`useState`, `useEffect`) for component state
- localStorage for persistence
- No external state management library required

## License

MIT
