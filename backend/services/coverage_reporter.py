import os
import subprocess
import json
from typing import Dict, List
from models import CoverageSummary, CoverageFile


class CoverageReporter:
    """Service for generating coverage reports"""
    
    def __init__(self):
        self.temp_dir = os.path.join(os.getcwd(), "temp_runs")
        os.makedirs(self.temp_dir, exist_ok=True)
    
    async def generate_report(
        self, run_id: str, function_name: str
    ) -> CoverageSummary:
        """Generate coverage report using pytest-cov"""
        
        run_dir = os.path.join(self.temp_dir, run_id)
        test_path = os.path.join(run_dir, f"test_{function_name}.py")
        
        if not os.path.exists(test_path):
            return CoverageSummary(
                lines=0, branches=0, functions=0, files=[]
            )
        
        # Run pytest with coverage
        try:
            result = subprocess.run(
                [
                    "pytest",
                    test_path,
                    "--cov=your_module",
                    "--cov-report=json",
                    "--cov-report=term",
                ],
                capture_output=True,
                text=True,
                cwd=run_dir,
                timeout=30,
            )
            
            # Parse coverage JSON
            coverage_json_path = os.path.join(run_dir, "coverage.json")
            if os.path.exists(coverage_json_path):
                with open(coverage_json_path, "r") as f:
                    coverage_data = json.load(f)
                
                totals = coverage_data.get("totals", {})
                files_data = coverage_data.get("files", {})
                
                files = []
                for filepath, file_data in files_data.items():
                    # Get relative filename
                    filename = os.path.basename(filepath)
                    summary = file_data.get("summary", {})
                    files.append(
                        CoverageFile(
                            filename=filename,
                            percent=int(summary.get("percent_covered", 0)),
                            lines=summary.get("num_statements", 0),
                            branches=summary.get("num_branches", 0),
                        )
                    )
                
                return CoverageSummary(
                    lines=int(totals.get("percent_covered", 0)),
                    branches=int(totals.get("percent_covered_branches", 0)),
                    functions=int(totals.get("percent_covered_functions", 0)),
                    files=files,
                )
            
        except Exception as e:
            print(f"Error generating coverage: {e}")
        
        return CoverageSummary(lines=0, branches=0, functions=0, files=[])
    
    async def create_patch(
        self, run_id: str, function_name: str, test_code: str
    ) -> str:
        """Create a git patch diff for the test file"""
        
        run_dir = os.path.join(self.temp_dir, run_id)
        test_path = os.path.join(run_dir, f"test_{function_name}.py")
        artifacts_path = f"experiments/{run_id}/test_{function_name}.py"
        
        if not os.path.exists(test_path):
            return ""
        
        # Create a simple diff format
        with open(test_path, "r") as f:
            test_lines = f.readlines()
        
        diff_lines = [
            f"diff --git a/{artifacts_path} b/{artifacts_path}",
            "new file mode 100644",
            "index 0000000..1234567",
            "--- /dev/null",
            f"+++ b/{artifacts_path}",
            "@@ -0,0 +1,{} @@".format(len(test_lines)),
        ]
        
        for line in test_lines:
            diff_lines.append(f"+{line.rstrip()}")
        
        return "\n".join(diff_lines)
