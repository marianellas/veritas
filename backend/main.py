from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import json
import uuid
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from services.test_generator import TestGenerator
from services.test_runner import TestRunner
from services.coverage_reporter import CoverageReporter
from services.pr_creator import PRCreator
from models import (
    StartRunPayload,
    RunResult,
    PipelineStepName,
    StepStatus,
    RunStatus,
)

app = FastAPI(title="veritas-pytest API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with database in production)
runs: Dict[str, RunResult] = {}
event_queues: Dict[str, List[Dict[str, Any]]] = {}

# Initialize services
test_generator = TestGenerator()
test_runner = TestRunner()
coverage_reporter = CoverageReporter()
pr_creator = PRCreator()


@app.post("/api/runs", response_model=Dict[str, str])
async def start_run(payload: StartRunPayload):
    """Start a new test generation run"""
    run_id = f"run_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:8]}"
    
    # Create initial run result
    steps = [
        {"name": "read_code", "status": "queued"},
        {"name": "infer_behavior", "status": "queued"},
        {"name": "generate_tests", "status": "queued"},
        {"name": "run_tests", "status": "queued"},
        {"name": "fix_tests", "status": "queued"},
        {"name": "coverage_report", "status": "queued"},
        {"name": "pr_ready_output", "status": "queued"},
    ]
    
    if payload.options.create_pr:
        steps.append({"name": "open_pr", "status": "queued"})
    
    run = RunResult(
        run_id=run_id,
        status="queued",
        function_name=payload.function_name,
        code=payload.code,
        options=payload.options,
        inferred_spec="",
        edge_cases=[],
        generated_tests="",
        test_run_output={"stdout": "", "stderr": "", "exit_code": 0},
        coverage_summary={
            "lines": 0,
            "branches": 0,
            "functions": 0,
            "files": [],
        },
        patch_diff="",
        artifacts_path=f"experiments/{run_id}",
        iterations_used=0,
        steps=steps,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
    )
    
    runs[run_id] = run
    
    # Start async pipeline
    asyncio.create_task(execute_pipeline(run_id, payload))
    
    return {"runId": run_id}


@app.get("/api/runs/{run_id}", response_model=RunResult)
async def get_run(run_id: str):
    """Get run details by ID"""
    if run_id not in runs:
        raise HTTPException(status_code=404, detail="Run not found")
    return runs[run_id]


def emit_event(run_id: str, event: Dict[str, Any]):
    """Emit an event to the event queue"""
    if run_id not in event_queues:
        event_queues[run_id] = []
    event_queues[run_id].append(event)

@app.get("/api/runs/{run_id}/stream")
async def stream_run_events(run_id: str):
    """Stream run events via Server-Sent Events"""
    if run_id not in runs:
        raise HTTPException(status_code=404, detail="Run not found")
    
    async def event_generator():
        processed_events = 0
        while True:
            run = runs.get(run_id)
            if not run:
                break
            
            # Process queued events
            if run_id in event_queues:
                queue = event_queues[run_id]
                while processed_events < len(queue):
                    event = queue[processed_events]
                    yield f"data: {json.dumps(event)}\n\n"
                    processed_events += 1
            
            # Check for status changes
            if run.status in ["success", "failed", "cancelled"]:
                yield f"data: {json.dumps({
                    'type': 'run_complete',
                    'data': run.dict(),
                    'timestamp': datetime.now().isoformat()
                })}\n\n"
                break
            
            await asyncio.sleep(0.5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/runs/{run_id}/cancel")
async def cancel_run(run_id: str):
    """Cancel a running test generation"""
    if run_id not in runs:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run = runs[run_id]
    if run.status in ["success", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Run is not running")
    
    run.status = "cancelled"
    run.updated_at = datetime.now().isoformat()
    return {"status": "cancelled"}


async def execute_pipeline(run_id: str, payload: StartRunPayload):
    """Execute the test generation pipeline"""
    run = runs[run_id]
    run.status = "running"
    run.updated_at = datetime.now().isoformat()
    
    try:
        # Step 1: Read Code
        await update_step(run_id, "read_code", "running")
        emit_event(run_id, {
            "type": "log",
            "message": "Reading and parsing Python code...",
            "timestamp": datetime.now().isoformat(),
        })
        await asyncio.sleep(0.5)
        await update_step(run_id, "read_code", "success")
        emit_event(run_id, {
            "type": "log",
            "message": "✓ Code parsed successfully",
            "timestamp": datetime.now().isoformat(),
        })
        
        # Step 2: Infer Behavior
        await update_step(run_id, "infer_behavior", "running")
        emit_event(run_id, {
            "type": "log",
            "message": "Analyzing function behavior with LLM...",
            "timestamp": datetime.now().isoformat(),
        })
        inferred_spec, edge_cases = await test_generator.infer_behavior(
            payload.code, payload.function_name
        )
        run = runs[run_id]
        run.inferred_spec = inferred_spec
        run.edge_cases = edge_cases
        await update_step(run_id, "infer_behavior", "success")
        emit_event(run_id, {
            "type": "log",
            "message": f"✓ Behavior inferred: {inferred_spec[:50]}...",
            "timestamp": datetime.now().isoformat(),
        })
        
        # Step 3: Generate Tests
        await update_step(run_id, "generate_tests", "running")
        emit_event(run_id, {
            "type": "log",
            "message": "Generating pytest tests with LLM...",
            "timestamp": datetime.now().isoformat(),
        })
        generated_tests = await test_generator.generate_tests(
            payload.code,
            payload.function_name,
            payload.options,
            inferred_spec,
            edge_cases,
        )
        run = runs[run_id]
        run.generated_tests = generated_tests
        await update_step(run_id, "generate_tests", "success")
        emit_event(run_id, {
            "type": "log",
            "message": "✓ Generated test suite",
            "timestamp": datetime.now().isoformat(),
        })
        
        # Step 4: Run Tests
        await update_step(run_id, "run_tests", "running")
        emit_event(run_id, {
            "type": "log",
            "message": "Running pytest tests...",
            "timestamp": datetime.now().isoformat(),
        })
        test_output = await test_runner.run_tests(
            generated_tests, payload.code, payload.function_name, run_id
        )
        run = runs[run_id]
        run.test_run_output = test_output
        iterations = 1
        if test_output["exit_code"] == 0:
            emit_event(run_id, {
                "type": "log",
                "message": "✓ All tests passed",
                "timestamp": datetime.now().isoformat(),
            })
        else:
            emit_event(run_id, {
                "type": "log",
                "message": f"⚠ Some tests failed: {test_output['stderr'][:100]}",
                "timestamp": datetime.now().isoformat(),
            })
        
        # Step 5: Fix Tests (iterate if needed)
        await update_step(run_id, "fix_tests", "running")
        max_iterations = payload.options.max_iterations
        while test_output["exit_code"] != 0 and iterations < max_iterations:
            emit_event(run_id, {
                "type": "log",
                "message": f"Fixing tests (iteration {iterations}/{max_iterations})...",
                "timestamp": datetime.now().isoformat(),
            })
            # Fix broken tests using LLM
            fixed_tests = await test_generator.fix_tests(
                generated_tests,
                test_output["stderr"],
                payload.code,
                payload.function_name,
            )
            run = runs[run_id]
            run.generated_tests = fixed_tests
            test_output = await test_runner.run_tests(
                fixed_tests, payload.code, payload.function_name, run_id
            )
            run.test_run_output = test_output
            iterations += 1
        
        run = runs[run_id]
        run.iterations_used = iterations
        await update_step(run_id, "fix_tests", "success")
        emit_event(run_id, {
            "type": "log",
            "message": f"✓ Tests validated (used {iterations} iteration(s))",
            "timestamp": datetime.now().isoformat(),
        })
        
        # Step 6: Coverage Report
        await update_step(run_id, "coverage_report", "running")
        emit_event(run_id, {
            "type": "log",
            "message": "Generating coverage report...",
            "timestamp": datetime.now().isoformat(),
        })
        coverage = await coverage_reporter.generate_report(
            run_id, payload.function_name
        )
        run = runs[run_id]
        run.coverage_summary = coverage
        await update_step(run_id, "coverage_report", "success")
        emit_event(run_id, {
            "type": "log",
            "message": f"✓ Coverage: {coverage.lines}% lines, {coverage.branches}% branches",
            "timestamp": datetime.now().isoformat(),
        })
        
        # Step 7: PR-Ready Output
        await update_step(run_id, "pr_ready_output", "running")
        emit_event(run_id, {
            "type": "log",
            "message": "Creating patch diff...",
            "timestamp": datetime.now().isoformat(),
        })
        patch_diff = await coverage_reporter.create_patch(
            run_id, payload.function_name, generated_tests
        )
        run = runs[run_id]
        run.patch_diff = patch_diff
        await update_step(run_id, "pr_ready_output", "success")
        emit_event(run_id, {
            "type": "log",
            "message": f"✓ Output written to experiments/{run_id}/",
            "timestamp": datetime.now().isoformat(),
        })
        
        # Step 8: Open PR (optional)
        if payload.options.create_pr:
            await update_step(run_id, "open_pr", "running")
            emit_event(run_id, {
                "type": "log",
                "message": "Creating GitHub pull request...",
                "timestamp": datetime.now().isoformat(),
            })
            pr_info = await pr_creator.create_pr(
                payload.options.repo_url,
                payload.options.branch,
                payload.function_name,
                coverage,
                run_id,
                patch_diff,
                generated_tests,  # Pass the actual test content
            )
            run = runs[run_id]
            run.pr = pr_info
            await update_step(run_id, "open_pr", "success")
            emit_event(run_id, {
                "type": "log",
                "message": "✓ Pull request created",
                "timestamp": datetime.now().isoformat(),
            })
        
        run.status = "success"
        run.updated_at = datetime.now().isoformat()
        
    except Exception as e:
        run = runs[run_id]
        run.status = "failed"
        run.updated_at = datetime.now().isoformat()
        # Mark current step as failed
        for step in run.steps:
            if step["status"] == "running":
                step["status"] = "fail"
                step["error"] = str(e)
                break


async def update_step(run_id: str, step_name: PipelineStepName, status: StepStatus):
    """Update a pipeline step status"""
    run = runs[run_id]
    for step in run.steps:
        if step["name"] == step_name:
            step["status"] = status
            if status == "running":
                step["started_at"] = datetime.now().isoformat()
                emit_event(run_id, {
                    "type": "step_start",
                    "step": step_name,
                    "timestamp": datetime.now().isoformat(),
                })
            elif status in ["success", "fail"]:
                step["completed_at"] = datetime.now().isoformat()
                emit_event(run_id, {
                    "type": "step_complete",
                    "step": step_name,
                    "data": run.dict(),
                    "timestamp": datetime.now().isoformat(),
                })
            break
    run.updated_at = datetime.now().isoformat()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
