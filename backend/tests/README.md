# Backend Tests

Test suite for the veritas-pytest backend API.

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_api.py

# Run specific test
pytest tests/test_api.py::TestStartRun::test_start_run_success

# Run with verbose output
pytest -v
```

## Test Structure

- `test_api.py` - API endpoint tests
  - Tests for POST /api/runs
  - Tests for GET /api/runs/{run_id}
  - Tests for POST /api/runs/{run_id}/cancel
  - Tests for GET /api/runs/{run_id}/stream
  - Tests for run options validation

- `test_services.py` - Service layer tests
  - TestGenerator: LLM integration and error handling
  - TestRunner: Test execution
  - CoverageReporter: Coverage report generation
  - PRCreator: GitHub PR creation

- `conftest.py` - Pytest fixtures and shared test utilities

## Test Coverage

The tests cover:
- ✅ API endpoints work correctly
- ✅ LLM integration handles errors properly
- ✅ Test generation logic works
- ✅ Error handling and edge cases
- ✅ Input validation

## Mocking

Tests use mocks to avoid:
- Making real OpenAI API calls (saves costs)
- Creating real GitHub PRs
- Running actual pytest commands in some cases

## Environment Variables

Tests don't require real API keys - they use mocks. However, if you want to run integration tests with real APIs, set:
- `OPENAI_API_KEY` (optional, for integration tests)
- `GITHUB_TOKEN` (optional, for integration tests)
