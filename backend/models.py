from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal

# Type aliases
PipelineStepName = Literal[
    "read_code",
    "infer_behavior",
    "generate_tests",
    "run_tests",
    "fix_tests",
    "coverage_report",
    "pr_ready_output",
    "open_pr",
]

StepStatus = Literal["queued", "running", "success", "fail", "skipped"]
RunStatus = Literal["queued", "running", "success", "failed", "cancelled"]


class EdgeCaseCategory(BaseModel):
    none: bool = False
    empty: bool = True
    large: bool = True
    unicode: bool = False
    floats: bool = False
    timezones: bool = False


class RunOptions(BaseModel):
    max_iterations: int = 3
    test_style: Literal["unit", "property-based"] = "unit"
    coverage_threshold: int = 80
    edge_case_categories: EdgeCaseCategory
    create_pr: bool = False
    repo_url: Optional[str] = None
    branch: str = "main"


class StartRunPayload(BaseModel):
    code: str
    function_name: str
    options: RunOptions


class PipelineStep(BaseModel):
    name: PipelineStepName
    status: StepStatus
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None


class CoverageFile(BaseModel):
    filename: str
    percent: int
    lines: int
    branches: int


class CoverageSummary(BaseModel):
    lines: int
    branches: int
    functions: int
    files: List[CoverageFile]


class PRInfo(BaseModel):
    title: str
    body: str
    url: Optional[str] = None
    changed_files: List[str]


class RunResult(BaseModel):
    run_id: str
    status: RunStatus
    function_name: str
    code: str
    options: RunOptions
    inferred_spec: str
    edge_cases: List[str]
    generated_tests: str
    test_run_output: Dict[str, Any]
    coverage_summary: CoverageSummary
    patch_diff: str
    pr: Optional[PRInfo] = None
    artifacts_path: str
    iterations_used: int
    steps: List[Dict[str, Any]]  # List of PipelineStep dicts
    created_at: str
    updated_at: str
