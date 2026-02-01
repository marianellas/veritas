import pytest
import json
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from conftest import client, sample_payload


class TestStartRun:
    """Tests for POST /api/runs endpoint"""
    
    def test_start_run_success(self, client, sample_payload):
        """Test starting a run successfully"""
        response = client.post(
            "/api/runs",
            json=sample_payload.dict(),
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "runId" in data
        assert data["runId"].startswith("run_")
    
    def test_start_run_missing_code(self, client, sample_payload):
        """Test starting a run without code"""
        payload = sample_payload.dict()
        del payload["code"]
        
        response = client.post("/api/runs", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_start_run_missing_function_name(self, client, sample_payload):
        """Test starting a run without function name"""
        payload = sample_payload.dict()
        del payload["function_name"]
        
        response = client.post("/api/runs", json=payload)
        assert response.status_code == 422
    
    def test_start_run_with_pr_option(self, client, sample_payload):
        """Test starting a run with PR creation enabled"""
        payload = sample_payload.dict()
        payload["options"]["create_pr"] = True
        payload["options"]["repo_url"] = "https://github.com/test/repo"
        
        response = client.post("/api/runs", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "runId" in data


class TestGetRun:
    """Tests for GET /api/runs/{run_id} endpoint"""
    
    def test_get_run_success(self, client, sample_payload):
        """Test getting an existing run"""
        # First create a run
        create_response = client.post("/api/runs", json=sample_payload.dict())
        run_id = create_response.json()["runId"]
        
        # Then get it
        response = client.get(f"/api/runs/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == run_id
        assert data["function_name"] == sample_payload.function_name
        assert data["status"] == "queued"
    
    def test_get_run_not_found(self, client):
        """Test getting a non-existent run"""
        response = client.get("/api/runs/nonexistent_run_id")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestCancelRun:
    """Tests for POST /api/runs/{run_id}/cancel endpoint"""
    
    def test_cancel_run_success(self, client, sample_payload):
        """Test canceling a running run"""
        # Create a run
        create_response = client.post("/api/runs", json=sample_payload.dict())
        run_id = create_response.json()["runId"]
        
        # Cancel it
        response = client.post(f"/api/runs/{run_id}/cancel")
        assert response.status_code == 200
        
        # Verify it's cancelled
        get_response = client.get(f"/api/runs/{run_id}")
        assert get_response.json()["status"] == "cancelled"
    
    def test_cancel_run_not_found(self, client):
        """Test canceling a non-existent run"""
        response = client.post("/api/runs/nonexistent_run_id/cancel")
        assert response.status_code == 404


class TestStreamRunEvents:
    """Tests for GET /api/runs/{run_id}/stream endpoint"""
    
    def test_stream_run_events_success(self, client, sample_payload):
        """Test streaming events for a run"""
        # Create a run
        create_response = client.post("/api/runs", json=sample_payload.dict())
        run_id = create_response.json()["runId"]
        
        # Stream events
        response = client.get(f"/api/runs/{run_id}/stream")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream"
    
    def test_stream_run_events_not_found(self, client):
        """Test streaming events for non-existent run"""
        response = client.get("/api/runs/nonexistent_run_id/stream")
        assert response.status_code == 404


class TestRunOptions:
    """Tests for run options validation"""
    
    def test_run_options_defaults(self, client, sample_payload):
        """Test that default options are applied correctly"""
        payload = sample_payload.dict()
        # Remove some optional fields
        del payload["options"]["repo_url"]
        
        response = client.post("/api/runs", json=payload)
        assert response.status_code == 200
    
    def test_run_options_edge_cases(self, client, sample_payload):
        """Test edge case category options"""
        payload = sample_payload.dict()
        payload["options"]["edge_case_categories"] = {
            "none": True,
            "empty": True,
            "large": False,
            "unicode": True,
            "floats": True,
            "timezones": False,
        }
        
        response = client.post("/api/runs", json=payload)
        assert response.status_code == 200
