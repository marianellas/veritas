import os
import subprocess
import tempfile
from typing import Dict, Any


class TestRunner:
    """Service for running pytest tests"""
    
    def __init__(self):
        self.temp_dir = os.path.join(os.getcwd(), "temp_runs")
        os.makedirs(self.temp_dir, exist_ok=True)
    
    async def run_tests(
        self, test_code: str, original_code: str, function_name: str, run_id: str
    ) -> Dict[str, Any]:
        """Run pytest tests and return output"""
        
        # Create temporary directory for this run
        run_dir = os.path.join(self.temp_dir, run_id)
        os.makedirs(run_dir, exist_ok=True)
        
        # Write original code to a module
        module_path = os.path.join(run_dir, "your_module.py")
        with open(module_path, "w") as f:
            f.write(original_code)
        
        # Write test file
        test_path = os.path.join(run_dir, f"test_{function_name}.py")
        with open(test_path, "w") as f:
            f.write(test_code)
        
        # Create __init__.py
        init_path = os.path.join(run_dir, "__init__.py")
        with open(init_path, "w") as f:
            f.write("")
        
        # Run pytest
        try:
            result = subprocess.run(
                ["pytest", test_path, "-v", "--tb=short"],
                capture_output=True,
                text=True,
                cwd=run_dir,
                timeout=30,
            )
            
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Test execution timed out",
                "exit_code": 1,
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": str(e),
                "exit_code": 1,
            }
