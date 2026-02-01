# veritas-pytest

A production-quality web UI for AI-powered test generation. veritas-pytest allows users to generate Python code from descriptions, paste or upload Python code, select a function, and run an agentic pipeline that generates comprehensive pytest tests with coverage reports and PR-ready outputs.

## Features

- **Code Input Methods**:
  - **Paste Code**: Directly paste Python code
  - **Upload File**: Upload `.py` files
  - **Experiment**: Generate Python code from natural language descriptions using AI
- **Function Selection**: Automatically parses and lists functions for selection
- **Agentic Pipeline**: 8-step process that:
  1. Reads Python code
  2. Infers behavior and edge cases using LLM
  3. Generates pytest tests using LLM
  4. Runs tests with pytest
  5. Fixes broken tests iteratively using LLM
  6. Generates coverage reports
  7. Creates PR-ready output in `experiments/` folder
  8. Optionally opens a GitHub pull request
- **Run History**: View all past runs with status, coverage, and details
- **Real-time Progress**: Streaming updates with step-by-step progress
- **Coverage Reports**: Detailed line, branch, and function coverage
- **Diff View**: See the patch that will be applied
- **PR Preview**: Preview and copy PR details before creation

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **Tailwind CSS** with sage green and neutral color scheme
- **Python FastAPI** backend with LLM integration
- **OpenAI API** for code generation and test generation
- **localStorage** for run history persistence
- **Mock API** mode available for demo/testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Python 3.9+ (for backend)
- OpenAI API key (for LLM features)
- GitHub token (optional, for PR creation)

### Frontend Setup

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create `.env.local` in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Create virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create `.env` file in `backend/` directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
GITHUB_TOKEN=your_github_token_here  # Optional
```

5. Run the backend server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Building for Production

**Frontend:**
```bash
npm run build
npm start
```

**Backend:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Project Structure

```
veritas/
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Home/New Run page
│   ├── icon.svg            # Favicon (fern emoji)
│   ├── globals.css         # Global styles
│   ├── api/
│   │   └── generate-code/
│   │       └── route.ts    # API route for code generation
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
│   ├── api.ts              # API client (mock or real)
│   └── storage.ts          # localStorage utilities
├── backend/
│   ├── main.py             # FastAPI application
│   ├── models.py           # Pydantic models
│   ├── services/
│   │   ├── test_generator.py  # LLM test generation
│   │   ├── test_runner.py     # Pytest execution
│   │   ├── coverage_reporter.py # Coverage reports
│   │   └── pr_creator.py      # GitHub PR creation
│   ├── tests/              # Backend test suite
│   └── requirements.txt    # Python dependencies
└── package.json
```

## Code Input Methods

### 1. Paste Code
Directly paste your Python code into the text area. Functions will be automatically detected.

### 2. Upload File
Upload a `.py` file containing your Python code.

### 3. Experiment (AI Code Generation)
Generate Python code from natural language descriptions:
- Enter a description of the code you want (e.g., "a function that calculates factorial")
- Select code type: Function, Class, or Module
- Customize the generation prompt (editable)
- Generate code using OpenAI
- Review and accept or regenerate

This feature uses OpenAI's API to generate Python code based on your description, making it easy to quickly create code for testing.

## Backend API

A **real LLM-powered backend** is available in the `backend/` directory. See [backend/README.md](backend/README.md) for detailed setup instructions.

### Quick Start with Backend

1. **Set up the backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Create `.env` file in `backend/` directory:**
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   GITHUB_TOKEN=your_github_token_here  # Optional
   ```

3. **Run the backend:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Configure the frontend:**
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_USE_MOCK_API=false
   ```

5. **Run the frontend:**
   ```bash
   npm run dev
   ```

The frontend will now use the real backend with LLM-powered test generation!

### Mock Mode

By default, the frontend uses **mock mode** for demo purposes (no real API calls). To use mock mode:
- Don't set `NEXT_PUBLIC_USE_MOCK_API=false`, or
- Set `NEXT_PUBLIC_USE_MOCK_API=true`

**Note:** The Experiment tab always uses real OpenAI API calls (when configured), regardless of mock mode settings.

## Testing

### Frontend Tests
Currently no frontend tests (can be added with Jest/React Testing Library).

### Backend Tests
Comprehensive test suite available in `backend/tests/`:

```bash
cd backend
pytest                    # Run all tests
pytest --cov=.            # Run with coverage
pytest tests/test_api.py  # Run specific test file
```

See [backend/tests/README.md](backend/tests/README.md) for details.

## API Integration Guide

The frontend can work with either:
1. **Mock API** (default) - Simulated test generation for demos
2. **Real Backend** - LLM-powered test generation (see backend/README.md)

The Experiment tab always uses the Next.js API route (`/api/generate-code`) which directly calls OpenAI, independent of the backend mock mode setting.

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

## Understanding Your Test Generations

### Coverage Metrics Explained

When you view your test generation results, you'll see coverage metrics like:
- **Coverage: 87% lines, 82% branches**

Here's what these numbers mean:

#### Line Coverage

**Line coverage** measures how many executable lines of code were executed during your tests.

**Example:**
```python
def calculate_discount(price, discount_percent):
    if discount_percent < 0:           # Line 1 - executed
        raise ValueError("Invalid")   # Line 2 - NOT executed
    return price * (1 - discount_percent / 100)  # Line 3 - executed
```

If your tests only call `calculate_discount(100, 10)`:
- Line 1: ✅ Executed (condition checked)
- Line 2: ❌ Not executed (condition was False)
- Line 3: ✅ Executed (return statement)

**Line coverage: 2 out of 3 lines = 67%**

#### Branch Coverage

**Branch coverage** measures how many code branches (decision points) were taken during your tests.

The same function has a branch point:
```python
def calculate_discount(price, discount_percent):
    if discount_percent < 0:           # Branch point
        raise ValueError("Invalid")   # Branch 1: True path
    return price * (1 - discount_percent / 100)  # Branch 2: False path
```

This `if` statement has 2 branches:
- **True branch**: when `discount_percent < 0` (raises error)
- **False branch**: when `discount_percent >= 0` (returns result)

If your tests only cover the False branch:
- True branch: ❌ Not taken
- False branch: ✅ Taken

**Branch coverage: 1 out of 2 branches = 50%**

#### Why They're Different

- **Line coverage** counts lines that ran
- **Branch coverage** counts decision paths taken

Branch coverage is often lower because it requires testing both sides of conditions (True AND False paths).

#### Example: 87% Lines, 82% Branches

- **87% line coverage**: 87 out of 100 executable lines were executed
- **82% branch coverage**: 82 out of 100 branches were taken

The 5% difference means some branches weren't fully covered. For example:
- An `if/else` where only the `if` path was tested
- A `try/except` where only the `try` path was tested
- A `for` loop that was only tested with non-empty inputs

#### How to Improve Branch Coverage

To increase branch coverage, add tests that cover missing branches:
- Test both `if` True and False paths
- Test `except` blocks (error cases)
- Test `for` loops with empty and non-empty inputs
- Test `while` loops that exit early vs. run fully
- Test edge cases (None, empty strings, zero, negative numbers)

#### Why Both Metrics Matter

- **Line coverage** tells you: "Did this code run?"
- **Branch coverage** tells you: "Were all decision paths tested?"

Higher branch coverage usually means more thorough testing of edge cases and error handling. Aim for both metrics to be as high as possible, with branch coverage being the more challenging metric to achieve.

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
