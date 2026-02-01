import pytest
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.test_generator import TestGenerator
from services.test_runner import TestRunner
from services.coverage_reporter import CoverageReporter
from services.pr_creator import PRCreator
from models import RunOptions, EdgeCaseCategory


class TestTestGenerator:
    """Tests for TestGenerator service"""
    
    @pytest.fixture
    def test_generator(self):
        """Create a TestGenerator instance"""
        return TestGenerator()
    
    @pytest.fixture
    def sample_code(self):
        return """def calculate_discount(price, discount_percent):
    if discount_percent < 0 or discount_percent > 100:
        raise ValueError("Discount must be between 0 and 100")
    return price * (1 - discount_percent / 100)
"""
    
    @pytest.fixture
    def sample_options(self):
        return RunOptions(
            max_iterations=3,
            test_style="unit",
            coverage_threshold=80,
            edge_case_categories=EdgeCaseCategory(
                none=False,
                empty=True,
                large=True,
                unicode=False,
                floats=True,
                timezones=False,
            ),
            create_pr=False,
            branch="main",
        )
    
    @pytest.mark.asyncio
    async def test_infer_behavior_success(self, test_generator, sample_code):
        """Test successful behavior inference"""
        with patch.object(test_generator, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message = Mock()
            mock_response.choices[0].message.content = (
                "BEHAVIOR: Calculates discount on price\n"
                "EDGE_CASES: negative discount, discount over 100, zero price"
            )
            mock_client.chat.completions.create.return_value = mock_response
            
            behavior, edge_cases = await test_generator.infer_behavior(
                sample_code, "calculate_discount"
            )
            
            assert "discount" in behavior.lower()
            assert len(edge_cases) > 0
            mock_client.chat.completions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_infer_behavior_api_error(self, test_generator, sample_code):
        """Test behavior inference with API error"""
        with patch.object(test_generator, 'client') as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("API Error")
            
            behavior, edge_cases = await test_generator.infer_behavior(
                sample_code, "calculate_discount"
            )
            
            # Should return fallback values
            assert behavior == "Could not infer behavior"
            assert edge_cases == ["basic cases"]
    
    @pytest.mark.asyncio
    async def test_infer_behavior_malformed_response(self, test_generator, sample_code):
        """Test behavior inference with malformed LLM response"""
        with patch.object(test_generator, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message = Mock()
            mock_response.choices[0].message.content = "Invalid format response"
            mock_client.chat.completions.create.return_value = mock_response
            
            behavior, edge_cases = await test_generator.infer_behavior(
                sample_code, "calculate_discount"
            )
            
            # Should handle gracefully
            assert behavior is not None
            assert isinstance(edge_cases, list)
    
    @pytest.mark.asyncio
    async def test_generate_tests_success(self, test_generator, sample_code, sample_options):
        """Test successful test generation"""
        with patch.object(test_generator, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message = Mock()
            mock_response.choices[0].message.content = """import pytest
from your_module import calculate_discount

def test_calculate_discount_basic():
    assert calculate_discount(100, 10) == 90.0

def test_calculate_discount_edge_cases():
    with pytest.raises(ValueError):
        calculate_discount(100, -1)
"""
            mock_client.chat.completions.create.return_value = mock_response
            
            tests = await test_generator.generate_tests(
                sample_code,
                "calculate_discount",
                sample_options,
                "Calculates discount",
                ["negative discount"],
            )
            
            assert "import pytest" in tests
            assert "test_calculate_discount" in tests
            mock_client.chat.completions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_tests_api_error(self, test_generator, sample_code, sample_options):
        """Test test generation with API error"""
        with patch.object(test_generator, 'client') as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("API Error")
            
            tests = await test_generator.generate_tests(
                sample_code,
                "calculate_discount",
                sample_options,
                "Calculates discount",
                ["negative discount"],
            )
            
            # Should return fallback tests
            assert "import pytest" in tests
            assert "test_calculate_discount" in tests
    
    @pytest.mark.asyncio
    async def test_generate_tests_markdown_stripping(self, test_generator, sample_code, sample_options):
        """Test that markdown code blocks are stripped from response"""
        with patch.object(test_generator, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message = Mock()
            mock_response.choices[0].message.content = """```python
import pytest
from your_module import calculate_discount

def test_basic():
    assert True
```
"""
            mock_client.chat.completions.create.return_value = mock_response
            
            tests = await test_generator.generate_tests(
                sample_code,
                "calculate_discount",
                sample_options,
                "Calculates discount",
                [],
            )
            
            assert not tests.startswith("```")
            assert "import pytest" in tests
    
    @pytest.mark.asyncio
    async def test_fix_tests_success(self, test_generator, sample_code):
        """Test successful test fixing"""
        broken_tests = """import pytest
from your_module import calculate_discount

def test_basic():
    assert calculate_discount(100, 10) == 100  # Wrong expected value
"""
        error_output = "AssertionError: assert 90.0 == 100"
        
        with patch.object(test_generator, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message = Mock()
            mock_response.choices[0].message.content = """import pytest
from your_module import calculate_discount

def test_basic():
    assert calculate_discount(100, 10) == 90.0  # Fixed
"""
            mock_client.chat.completions.create.return_value = mock_response
            
            fixed_tests = await test_generator.fix_tests(
                broken_tests, error_output, sample_code, "calculate_discount"
            )
            
            assert "90.0" in fixed_tests
            mock_client.chat.completions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_fix_tests_api_error(self, test_generator, sample_code):
        """Test test fixing with API error"""
        broken_tests = "def test_basic(): assert False"
        error_output = "AssertionError"
        
        with patch.object(test_generator, 'client') as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("API Error")
            
            fixed_tests = await test_generator.fix_tests(
                broken_tests, error_output, sample_code, "calculate_discount"
            )
            
            # Should return original tests on error
            assert fixed_tests == broken_tests
    
    def test_client_initialization_no_key(self):
        """Test that client initialization fails without API key"""
        with patch.dict(os.environ, {}, clear=True):
            generator = TestGenerator()
            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                _ = generator.client


class TestTestRunner:
    """Tests for TestRunner service"""
    
    @pytest.fixture
    def test_runner(self):
        return TestRunner()
    
    @pytest.mark.asyncio
    async def test_run_tests_success(self, test_runner):
        """Test successful test execution"""
        test_code = """import pytest
def test_pass():
    assert True
"""
        original_code = "def add(a, b): return a + b"
        
        # This will actually run pytest, so it should pass
        result = await test_runner.run_tests(
            test_code, original_code, "add", "test_run_123"
        )
        
        assert "exit_code" in result
        assert "stdout" in result
        assert "stderr" in result
    
    @pytest.mark.asyncio
    async def test_run_tests_failure(self, test_runner):
        """Test test execution with failures"""
        test_code = """import pytest
def test_fail():
    assert False
"""
        original_code = "def add(a, b): return a + b"
        
        result = await test_runner.run_tests(
            test_code, original_code, "add", "test_run_456"
        )
        
        assert result["exit_code"] != 0
        assert "stderr" in result or "stdout" in result


class TestCoverageReporter:
    """Tests for CoverageReporter service"""
    
    @pytest.fixture
    def coverage_reporter(self):
        return CoverageReporter()
    
    @pytest.mark.asyncio
    async def test_generate_report_no_tests(self, coverage_reporter):
        """Test coverage report when no tests exist"""
        result = await coverage_reporter.generate_report("nonexistent_run", "test_func")
        
        assert result.lines == 0
        assert result.branches == 0
        assert result.functions == 0
        assert len(result.files) == 0


class TestPRCreator:
    """Tests for PRCreator service"""
    
    @pytest.fixture
    def pr_creator(self):
        return PRCreator()
    
    @pytest.mark.asyncio
    async def test_create_pr_no_repo_url(self, pr_creator):
        """Test PR creation without repo URL"""
        from models import CoverageSummary
        
        result = await pr_creator.create_pr(
            None,
            "main",
            "test_func",
            CoverageSummary(lines=80, branches=75, functions=90, files=[]),
            "run_123",
            "diff content",
            "test code",
        )
        
        assert result.url is None
        assert "test_func" in result.title
    
    @pytest.mark.asyncio
    async def test_create_pr_no_token(self, pr_creator):
        """Test PR creation without GitHub token"""
        with patch.dict(os.environ, {"GITHUB_TOKEN": ""}):
            creator = PRCreator()
            from models import CoverageSummary
            
            result = await creator.create_pr(
                "https://github.com/test/repo",
                "main",
                "test_func",
                CoverageSummary(lines=80, branches=75, functions=90, files=[]),
                "run_123",
                "diff content",
                "test code",
            )
            
            assert result.url is None
            assert "not configured" in result.body.lower()
    
    def test_parse_repo_url(self, pr_creator):
        """Test repository URL parsing"""
        # Test various URL formats
        test_cases = [
            ("https://github.com/owner/repo", ("owner", "repo")),
            ("https://github.com/owner/repo.git", ("owner", "repo")),
            ("git@github.com:owner/repo.git", ("owner", "repo")),
            ("owner/repo", ("owner", "repo")),
        ]
        
        for url, expected in test_cases:
            result = pr_creator._parse_repo_url(url)
            assert result == expected
    
    def test_parse_repo_url_invalid(self, pr_creator):
        """Test repository URL parsing with invalid URL"""
        with pytest.raises(ValueError):
            pr_creator._parse_repo_url("invalid-url")
