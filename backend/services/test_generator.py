import os
import openai
from typing import List, Tuple, Optional
from models import RunOptions


class TestGenerator:
    """Service for generating tests using LLM"""
    
    def __init__(self):
        self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
        self._client: Optional[openai.OpenAI] = None
    
    @property
    def client(self) -> openai.OpenAI:
        """Lazy initialization of OpenAI client"""
        if self._client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError(
                    "OPENAI_API_KEY environment variable is not set. "
                    "Please set it in your .env file or environment."
                )
            self._client = openai.OpenAI(api_key=api_key)
        return self._client
    
    async def infer_behavior(self, code: str, function_name: str) -> Tuple[str, List[str]]:
        """Infer function behavior and edge cases using LLM"""
        prompt = f"""Analyze this Python function and infer its behavior:

```python
{code}
```

Function name: {function_name}

Provide:
1. A clear description of what this function does
2. A list of potential edge cases to test

Respond in this format:
BEHAVIOR: [description]
EDGE_CASES: [comma-separated list]
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert Python code analyzer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )
            
            content = response.choices[0].message.content
            
            # Parse response
            behavior = ""
            edge_cases = []
            
            for line in content.split("\n"):
                if line.startswith("BEHAVIOR:"):
                    behavior = line.replace("BEHAVIOR:", "").strip()
                elif line.startswith("EDGE_CASES:"):
                    edge_cases_str = line.replace("EDGE_CASES:", "").strip()
                    edge_cases = [ec.strip() for ec in edge_cases_str.split(",")]
            
            return behavior or "Function behavior inferred", edge_cases or ["basic cases"]
            
        except Exception as e:
            print(f"Error in infer_behavior: {e}")
            return "Could not infer behavior", ["basic cases"]
    
    async def generate_tests(
        self,
        code: str,
        function_name: str,
        options: RunOptions,
        inferred_spec: str,
        edge_cases: List[str],
    ) -> str:
        """Generate pytest tests using LLM"""
        
        # Build edge case requirements
        edge_case_reqs = []
        if options.edge_case_categories.empty:
            edge_case_reqs.append("empty inputs")
        if options.edge_case_categories.none:
            edge_case_reqs.append("None values")
        if options.edge_case_categories.large:
            edge_case_reqs.append("large numbers/inputs")
        if options.edge_case_categories.unicode:
            edge_case_reqs.append("unicode strings")
        if options.edge_case_categories.floats:
            edge_case_reqs.append("floating point precision")
        if options.edge_case_categories.timezones:
            edge_case_reqs.append("timezone handling")
        
        test_style_instruction = (
            "Use property-based testing with Hypothesis"
            if options.test_style == "property-based"
            else "Use standard unit tests with pytest"
        )
        
        prompt = f"""Generate comprehensive pytest tests for this Python function:

```python
{code}
```

Function name: {function_name}
Inferred behavior: {inferred_spec}
Edge cases to cover: {', '.join(edge_cases)}
Additional edge case categories: {', '.join(edge_case_reqs) if edge_case_reqs else 'None'}
Test style: {test_style_instruction}

Requirements:
- Generate complete, runnable pytest test code
- Import the function correctly (assume it's in a module called 'your_module')
- Cover the inferred behavior
- Include edge cases: {', '.join(edge_cases)}
- Target coverage threshold: {options.coverage_threshold}%
- Make tests specific and meaningful, not generic
- Include docstrings for each test function
- Ensure all tests are valid Python code

Return ONLY the test code, no explanations or markdown formatting.
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Python test developer. Generate high-quality pytest tests.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
            )
            
            generated_tests = response.choices[0].message.content.strip()
            
            # Clean up markdown code blocks if present
            if generated_tests.startswith("```python"):
                generated_tests = generated_tests.replace("```python", "").replace("```", "").strip()
            elif generated_tests.startswith("```"):
                generated_tests = generated_tests.replace("```", "").strip()
            
            return generated_tests
            
        except Exception as e:
            print(f"Error in generate_tests: {e}")
            # Fallback to basic template
            return self._generate_fallback_tests(function_name, options.test_style)
    
    async def fix_tests(
        self, test_code: str, error_output: str, original_code: str, function_name: str
    ) -> str:
        """Fix broken tests using LLM"""
        prompt = f"""The following pytest tests are failing. Fix them:

Original function code:
```python
{original_code}
```

Test code (with errors):
```python
{test_code}
```

Error output:
```
{error_output}
```

Generate the corrected test code that will pass. Return ONLY the fixed test code, no explanations.
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at debugging and fixing Python tests.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            
            fixed_tests = response.choices[0].message.content.strip()
            
            # Clean up markdown code blocks if present
            if fixed_tests.startswith("```python"):
                fixed_tests = fixed_tests.replace("```python", "").replace("```", "").strip()
            elif fixed_tests.startswith("```"):
                fixed_tests = fixed_tests.replace("```", "").strip()
            
            return fixed_tests
            
        except Exception as e:
            print(f"Error in fix_tests: {e}")
            return test_code  # Return original if fix fails
    
    def _generate_fallback_tests(self, function_name: str, test_style: str) -> str:
        """Fallback test generation if LLM fails"""
        if test_style == "property-based":
            return f"""import pytest
from hypothesis import given, strategies as st
from your_module import {function_name}

@given(st.integers(), st.integers())
def test_{function_name}_property_based(a, b):
    result = {function_name}(a, b)
    assert result is not None
"""
        else:
            return f"""import pytest
from your_module import {function_name}

def test_{function_name}_basic():
    result = {function_name}(1, 2)
    assert result is not None
"""
