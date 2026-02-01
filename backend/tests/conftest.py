import pytest
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from main import app
from models import RunOptions, EdgeCaseCategory, StartRunPayload


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture
def sample_code():
    """Sample Python code for testing"""
    return """def add(a, b):
    return a + b
"""


@pytest.fixture
def sample_function_name():
    """Sample function name"""
    return "add"


@pytest.fixture
def sample_run_options():
    """Sample run options"""
    return RunOptions(
        max_iterations=3,
        test_style="unit",
        coverage_threshold=80,
        edge_case_categories=EdgeCaseCategory(
            none=False,
            empty=True,
            large=True,
            unicode=False,
            floats=False,
            timezones=False,
        ),
        create_pr=False,
        branch="main",
    )


@pytest.fixture
def sample_payload(sample_code, sample_function_name, sample_run_options):
    """Sample start run payload"""
    return StartRunPayload(
        code=sample_code,
        function_name=sample_function_name,
        options=sample_run_options,
    )


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response"""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message = Mock()
    mock_response.choices[0].message.content = "BEHAVIOR: Adds two numbers\nEDGE_CASES: zero, negative, large"
    return mock_response


@pytest.fixture
def mock_openai_test_response():
    """Mock OpenAI test generation response"""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message = Mock()
    mock_response.choices[0].message.content = """import pytest
from your_module import add

def test_add_basic():
    assert add(1, 2) == 3

def test_add_zero():
    assert add(0, 0) == 0
"""
    return mock_response
