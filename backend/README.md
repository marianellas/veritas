# veritas-pytest Backend API

FastAPI backend for AI-powered test generation using LLM.

## Features

- **LLM-Powered Test Generation**: Uses OpenAI GPT-4 to generate comprehensive pytest tests
- **Real Test Execution**: Runs pytest and generates coverage reports
- **Iterative Fixing**: Automatically fixes broken tests using LLM
- **Coverage Reports**: Generates detailed coverage metrics
- **GitHub PR Integration**: Creates pull requests with generated tests
- **Streaming Updates**: Server-Sent Events (SSE) for real-time progress

## Setup

### Prerequisites

- Python 3.9+
- OpenAI API key
- pytest and pytest-cov installed

### Installation

1. Create a virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: Model to use (default: `gpt-4o-mini`)
- `GITHUB_TOKEN`: Optional, for PR creation

### Running the Server

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python main.py
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### POST `/api/runs`

Start a new test generation run.

**Request Body:**
```json
{
  "code": "def add(a, b):\n    return a + b",
  "function_name": "add",
  "options": {
    "max_iterations": 3,
    "test_style": "unit",
    "coverage_threshold": 80,
    "edge_case_categories": {
      "none": false,
      "empty": true,
      "large": true,
      "unicode": false,
      "floats": false,
      "timezones": false
    },
    "create_pr": false,
    "repo_url": null,
    "branch": "main"
  }
}
```

**Response:**
```json
{
  "runId": "run_1234567890_abc123"
}
```

### GET `/api/runs/{run_id}`

Get run details.

**Response:**
```json
{
  "run_id": "run_1234567890_abc123",
  "status": "running",
  "function_name": "add",
  "generated_tests": "...",
  "coverage_summary": {...},
  ...
}
```

### GET `/api/runs/{run_id}/stream`

Stream run events via Server-Sent Events (SSE).

**Event Types:**
- `step_start`: A pipeline step started
- `step_complete`: A pipeline step completed
- `run_complete`: The entire run completed

### POST `/api/runs/{run_id}/cancel`

Cancel a running test generation.

## Pipeline Steps

1. **read_code**: Parse and validate Python code
2. **infer_behavior**: Use LLM to infer function behavior and edge cases
3. **generate_tests**: Generate pytest tests using LLM
4. **run_tests**: Execute tests with pytest
5. **fix_tests**: Fix broken tests iteratively (up to max_iterations)
6. **coverage_report**: Generate coverage report using pytest-cov
7. **pr_ready_output**: Create patch diff for PR
8. **open_pr**: Create GitHub pull request (optional)

## LLM Integration

The backend uses OpenAI's API for:
- **Behavior Inference**: Analyzing code to understand what it does
- **Test Generation**: Creating comprehensive pytest tests
- **Test Fixing**: Debugging and fixing broken tests

### Customizing LLM Prompts

Edit `services/test_generator.py` to customize the prompts used for:
- `infer_behavior()`: Behavior analysis prompt
- `generate_tests()`: Test generation prompt
- `fix_tests()`: Test fixing prompt

### Using Different LLM Providers

To use a different LLM provider (Anthropic, etc.):
1. Install the provider's SDK
2. Update `services/test_generator.py` to use the new client
3. Update environment variables accordingly

## Storage

Currently uses in-memory storage (`runs` dictionary in `main.py`). For production:
- Replace with a database (PostgreSQL, MongoDB, etc.)
- Add proper persistence and retrieval
- Implement cleanup for old runs

## Error Handling

- LLM API errors fall back to template-based test generation
- Test execution errors are captured and returned
- Pipeline steps can fail individually without stopping the entire run

## Production Considerations

- Add authentication/authorization
- Implement rate limiting
- Add request validation
- Use a proper database
- Add logging and monitoring
- Implement retry logic for LLM calls
- Add caching for repeated requests
- Set up proper error tracking
