import { RunResult, RunEvent, StartRunPayload, PipelineStepName } from './types'
import { saveRun } from './storage'

// API configuration - set NEXT_PUBLIC_USE_MOCK_API=false to use real backend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false'

// Determine API base URL - use environment variable or detect from current hostname
// This must be a function so it's called at runtime, not module load time
function getApiBase(): string {
  // Always check environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // If accessing from network IP, use that IP for backend too
  // This only works in the browser (window is undefined in SSR)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname
    console.log(`[API] Detected hostname: ${hostname}`)
    // If not localhost, use the same hostname for backend
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const apiUrl = `http://${hostname}:8000/api`
      console.log(`[API] Using network API URL: ${apiUrl}`)
      return apiUrl
    }
  }
  
  const defaultUrl = 'http://localhost:8000/api'
  console.log(`[API] Using default API URL: ${defaultUrl}`)
  return defaultUrl
}

// Simulate delay for realistic UX
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Generate mock run result
function generateMockRunResult(payload: StartRunPayload): RunResult {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  
  const steps: RunResult['steps'] = [
    { name: 'read_code', status: 'queued' },
    { name: 'infer_behavior', status: 'queued' },
    { name: 'generate_tests', status: 'queued' },
    { name: 'run_tests', status: 'queued' },
    { name: 'fix_tests', status: 'queued' },
    { name: 'coverage_report', status: 'queued' },
    { name: 'pr_ready_output', status: 'queued' },
  ]
  
  if (payload.options.createPR) {
    steps.push({ name: 'open_pr', status: 'queued' })
  }
  
  return {
    runId,
    status: 'queued',
    functionName: payload.functionName,
    code: payload.code,
    options: payload.options,
    inferredSpec: '',
    edgeCases: [],
    generatedTests: '',
    testRunOutput: { stdout: '', stderr: '', exitCode: 0 },
    coverageSummary: {
      lines: 0,
      branches: 0,
      functions: 0,
      files: [],
    },
    patchDiff: '',
    artifactsPath: `experiments/${runId}`,
    iterationsUsed: 0,
    steps,
    createdAt: now,
    updatedAt: now,
  }
}

// Mock test generation
function generateMockTests(functionName: string, code: string, style: 'unit' | 'property-based'): string {
  if (style === 'property-based') {
    return `import pytest
from hypothesis import given, strategies as st
from your_module import ${functionName}

@given(st.integers(), st.integers())
def test_${functionName}_property_based(a, b):
    """Property-based test for ${functionName}"""
    result = ${functionName}(a, b)
    assert isinstance(result, (int, float))
    assert result >= 0  # Example property

def test_${functionName}_edge_cases():
    """Edge case tests for ${functionName}"""
    # Test with zero
    assert ${functionName}(0, 0) == 0
    
    # Test with negative numbers
    result = ${functionName}(-1, -2)
    assert result is not None
    
    # Test with large numbers
    result = ${functionName}(1000000, 2000000)
    assert isinstance(result, (int, float))
`
  }
  
  return `import pytest
from your_module import ${functionName}

def test_${functionName}_basic():
    """Basic functionality test"""
    result = ${functionName}(1, 2)
    assert result is not None
    assert isinstance(result, (int, float))

def test_${functionName}_zero():
    """Test with zero values"""
    result = ${functionName}(0, 0)
    assert result == 0

def test_${functionName}_negative():
    """Test with negative values"""
    result = ${functionName}(-1, -2)
    assert isinstance(result, (int, float))

def test_${functionName}_large_numbers():
    """Test with large numbers"""
    result = ${functionName}(1000000, 2000000)
    assert isinstance(result, (int, float))

def test_${functionName}_edge_cases():
    """Edge case tests"""
    # Empty input handling
    try:
        result = ${functionName}(None, None)
    except (TypeError, ValueError):
        pass  # Expected behavior
`
}

export async function startRun(payload: StartRunPayload): Promise<string> {
  if (USE_MOCK) {
    const run = generateMockRunResult(payload)
    saveRun(run)
    return run.runId
  }

  // Real API call
  const apiBase = getApiBase()
  console.log(`[API] Attempting to connect to: ${apiBase}/runs`)
  const response = await fetch(`${apiBase}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: payload.code,
      function_name: payload.functionName,
      options: {
        max_iterations: payload.options.maxIterations,
        test_style: payload.options.testStyle,
        coverage_threshold: payload.options.coverageThreshold,
        edge_case_categories: payload.options.edgeCaseCategories,
        create_pr: payload.options.createPR,
        repo_url: payload.options.repoUrl,
        branch: payload.options.branch,
      },
    }),
  }).catch((error) => {
    console.error(`[API] Fetch failed for ${apiBase}/runs:`, error)
    throw new Error(`Cannot connect to backend at ${apiBase}. Make sure the backend is running and accessible.`)
  })

  if (!response.ok) {
    let errorMessage = `Failed to start run: ${response.statusText}`
    try {
      const errorData = await response.json()
      if (errorData.detail) {
        errorMessage = `Failed to start run: ${errorData.detail}`
      } else if (errorData.message) {
        errorMessage = `Failed to start run: ${errorData.message}`
      }
    } catch (e) {
      // If response isn't JSON, use status text
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data.runId
}

export async function getRun(runId: string): Promise<RunResult | null> {
  if (USE_MOCK) {
    const { getRun: getStoredRun } = await import('./storage')
    return getStoredRun(runId)
  }

  // Real API call
  try {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/runs/${runId}`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    
    // Transform backend format to frontend format
    return {
      runId: data.run_id,
      status: data.status,
      functionName: data.function_name,
      code: data.code,
      options: {
        maxIterations: data.options.max_iterations,
        testStyle: data.options.test_style,
        coverageThreshold: data.options.coverage_threshold,
        edgeCaseCategories: data.options.edge_case_categories,
        createPR: data.options.create_pr,
        repoUrl: data.options.repo_url,
        branch: data.options.branch,
      },
      inferredSpec: data.inferred_spec,
      edgeCases: data.edge_cases,
      generatedTests: data.generated_tests,
      testRunOutput: {
        stdout: data.test_run_output.stdout,
        stderr: data.test_run_output.stderr,
        exitCode: data.test_run_output.exit_code,
      },
      coverageSummary: {
        lines: data.coverage_summary.lines,
        branches: data.coverage_summary.branches,
        functions: data.coverage_summary.functions,
        files: data.coverage_summary.files,
      },
      patchDiff: data.patch_diff,
      pr: data.pr ? {
        title: data.pr.title,
        body: data.pr.body,
        url: data.pr.url,
        changedFiles: data.pr.changed_files,
      } : undefined,
      artifactsPath: data.artifacts_path,
      iterationsUsed: data.iterations_used,
      steps: data.steps,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error('Error fetching run:', error)
    return null
  }
}

export function streamRunEvents(
  runId: string,
  onEvent: (event: RunEvent) => void,
  payload: StartRunPayload
): () => void {
  if (USE_MOCK) {
    return streamMockEvents(runId, onEvent, payload)
  }

  // Real SSE streaming
  const apiBase = getApiBase()
  const streamUrl = `${apiBase}/runs/${runId}/stream`
  console.log(`[SSE] Connecting to: ${streamUrl}`)
  
  const eventSource = new EventSource(streamUrl)
  
  eventSource.onopen = () => {
    console.log(`[SSE] Connection opened to ${streamUrl}`)
  }
  
  eventSource.onmessage = (e) => {
    try {
      const event: RunEvent = JSON.parse(e.data)
      onEvent(event)
      
      // Update localStorage when run completes
      if (event.type === 'run_complete' && event.data) {
        const { getRun: getStoredRun, saveRun: saveStoredRun } = require('./storage')
        const transformed = transformBackendRunToFrontend(event.data)
        saveStoredRun(transformed)
      }
    } catch (error) {
      console.error('Error parsing SSE event:', error, e.data)
    }
  }
  
  let errorCount = 0
  eventSource.onerror = (error) => {
    errorCount++
    console.error(`[SSE] Connection error (attempt ${errorCount}):`, error)
    console.error(`[SSE] EventSource readyState: ${eventSource.readyState}`)
    // EventSource.readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
    if (eventSource.readyState === EventSource.CLOSED) {
      console.error('[SSE] Connection closed. This might be due to:')
      console.error('  - Backend not running')
      console.error('  - CORS issue')
      console.error('  - Network connectivity issue')
      console.error(`  - URL: ${streamUrl}`)
      
      // After multiple failures, stop retrying
      if (errorCount >= 3) {
        console.error('[SSE] Too many connection errors, closing connection')
        eventSource.close()
        // Emit an error event so the UI can handle it
        onEvent({
          type: 'log',
          message: '⚠ SSE connection failed. Falling back to polling.',
          timestamp: new Date().toISOString(),
        })
      }
    }
    // EventSource will automatically retry on error
  }
  
  return () => {
    console.log(`[SSE] Closing connection to ${streamUrl}`)
    eventSource.close()
  }
}

function transformBackendRunToFrontend(data: any): RunResult {
  return {
    runId: data.run_id,
    status: data.status,
    functionName: data.function_name,
    code: data.code,
    options: {
      maxIterations: data.options.max_iterations,
      testStyle: data.options.test_style,
      coverageThreshold: data.options.coverage_threshold,
      edgeCaseCategories: data.options.edge_case_categories,
      createPR: data.options.create_pr,
      repoUrl: data.options.repo_url,
      branch: data.options.branch,
    },
    inferredSpec: data.inferred_spec,
    edgeCases: data.edge_cases,
    generatedTests: data.generated_tests,
    testRunOutput: {
      stdout: data.test_run_output.stdout,
      stderr: data.test_run_output.stderr,
      exitCode: data.test_run_output.exit_code,
    },
    coverageSummary: {
      lines: data.coverage_summary.lines,
      branches: data.coverage_summary.branches,
      functions: data.coverage_summary.functions,
      files: data.coverage_summary.files,
    },
    patchDiff: data.patch_diff,
    pr: data.pr ? {
      title: data.pr.title,
      body: data.pr.body,
      url: data.pr.url,
      changedFiles: data.pr.changed_files,
    } : undefined,
    artifactsPath: data.artifacts_path,
    iterationsUsed: data.iterations_used,
    steps: data.steps,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

function streamMockEvents(
  runId: string,
  onEvent: (event: RunEvent) => void,
  payload: StartRunPayload
): () => void {
  let cancelled = false
  
  const cancel = () => {
    cancelled = true
  }
  
  // Simulate streaming events
  ;(async () => {
    const stepNames: PipelineStepName[] = [
      'read_code',
      'infer_behavior',
      'generate_tests',
      'run_tests',
      'fix_tests',
      'coverage_report',
      'pr_ready_output',
    ]
    
    if (payload.options.createPR) {
      stepNames.push('open_pr')
    }
    
    const { getRun: getStoredRun, saveRun: saveStoredRun } = await import('./storage')
    let run = getStoredRun(runId)
    if (!run) return
    
    for (let i = 0; i < stepNames.length && !cancelled; i++) {
      const stepName = stepNames[i]
      
      // Start step
      run.status = 'running'
      run.steps[i].status = 'running'
      run.steps[i].startedAt = new Date().toISOString()
      saveStoredRun(run)
      onEvent({
        type: 'step_start',
        step: stepName,
        timestamp: new Date().toISOString(),
      })
      
      onEvent({
        type: 'log',
        message: `Starting ${stepName.replace(/_/g, ' ')}...`,
        timestamp: new Date().toISOString(),
      })
      
      await delay(1000 + Math.random() * 2000)
      
      if (cancelled) break
      
      // Update run with step results
      switch (stepName) {
        case 'read_code':
          onEvent({
            type: 'log',
            message: '✓ Code parsed successfully',
            timestamp: new Date().toISOString(),
          })
          break
          
        case 'infer_behavior':
          run.inferredSpec = `Function ${payload.functionName} appears to perform mathematical operations.`
          run.edgeCases = ['zero values', 'negative numbers', 'large numbers']
          onEvent({
            type: 'log',
            message: '✓ Behavior inferred: mathematical operation',
            timestamp: new Date().toISOString(),
          })
          break
          
        case 'generate_tests':
          run.generatedTests = generateMockTests(
            payload.functionName,
            payload.code,
            payload.options.testStyle
          )
          onEvent({
            type: 'log',
            message: '✓ Generated test suite',
            timestamp: new Date().toISOString(),
          })
          break
          
        case 'run_tests':
          run.testRunOutput = {
            stdout: 'test_basic PASSED\ntest_zero PASSED\ntest_negative PASSED\n',
            stderr: '',
            exitCode: 0,
          }
          onEvent({
            type: 'log',
            message: '✓ All tests passed',
            timestamp: new Date().toISOString(),
          })
          break
          
        case 'fix_tests':
          run.iterationsUsed = 1
          onEvent({
            type: 'log',
            message: '✓ Tests validated, no fixes needed',
            timestamp: new Date().toISOString(),
          })
          break
          
        case 'coverage_report':
          run.coverageSummary = {
            lines: 87,
            branches: 82,
            functions: 90,
            files: [
              { filename: 'your_module.py', percent: 87, lines: 50, branches: 45 },
              { filename: 'utils.py', percent: 75, lines: 30, branches: 25 },
            ],
          }
          onEvent({
            type: 'log',
            message: `✓ Coverage: ${run.coverageSummary.lines}% lines, ${run.coverageSummary.branches}% branches`,
            timestamp: new Date().toISOString(),
          })
          break
          
        case 'pr_ready_output':
          run.patchDiff = `diff --git a/experiments/${runId}/test_${payload.functionName}.py b/experiments/${runId}/test_${payload.functionName}.py
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/experiments/${runId}/test_${payload.functionName}.py
@@ -0,0 +1,25 @@
${run.generatedTests.split('\n').map((l, i) => `+${l}`).join('\n')}
`
          onEvent({
            type: 'log',
            message: `✓ Output written to experiments/${runId}/`,
            timestamp: new Date().toISOString(),
          })
          break
          
        case 'open_pr':
          // In mock mode, only create PR if repo URL is provided
          if (payload.options.repoUrl) {
            run.pr = {
              title: `Add tests for ${payload.functionName}`,
              body: `This PR adds comprehensive test coverage for \`${payload.functionName}\`.\n\n- Coverage: ${run.coverageSummary.lines}% lines, ${run.coverageSummary.branches}% branches\n- Generated ${run.generatedTests.split('def test_').length - 1} test cases\n- Output location: \`experiments/${runId}/\`\n\nNote: This is a mock PR. In production, a real PR would be created.`,
              url: undefined, // No URL in mock mode
              changedFiles: [`experiments/${runId}/test_${payload.functionName}.py`],
            }
            onEvent({
              type: 'log',
              message: '⚠ Mock mode: PR creation simulated (no real PR created)',
              timestamp: new Date().toISOString(),
            })
          } else {
            run.pr = {
              title: `Add tests for ${payload.functionName}`,
              body: `This PR adds comprehensive test coverage for \`${payload.functionName}\`.\n\n- Coverage: ${run.coverageSummary.lines}% lines, ${run.coverageSummary.branches}% branches\n- Generated ${run.generatedTests.split('def test_').length - 1} test cases\n- Output location: \`experiments/${runId}/\`\n\nError: Repository URL not provided. Cannot create PR.`,
              url: undefined,
              changedFiles: [`experiments/${runId}/test_${payload.functionName}.py`],
            }
            onEvent({
              type: 'log',
              message: '⚠ PR creation skipped: Repository URL not provided',
              timestamp: new Date().toISOString(),
            })
          }
          break
      }
      
      // Complete step
      run.steps[i].status = 'success'
      run.steps[i].completedAt = new Date().toISOString()
      run.updatedAt = new Date().toISOString()
      saveStoredRun(run)
      
      onEvent({
        type: 'step_complete',
        step: stepName,
        data: run,
        timestamp: new Date().toISOString(),
      })
      
      await delay(500)
    }
    
    if (!cancelled) {
      run.status = 'success'
      saveStoredRun(run)
      onEvent({
        type: 'run_complete',
        data: run,
        timestamp: new Date().toISOString(),
      })
    }
  })()
  
  return cancel
}

export async function cancelRun(runId: string): Promise<void> {
  if (USE_MOCK) {
    const { getRun: getStoredRun, saveRun: saveStoredRun } = await import('./storage')
    const run = getStoredRun(runId)
    if (run) {
      run.status = 'cancelled'
      saveStoredRun(run)
    }
    return
  }

  // Real API call
  const apiBase = getApiBase()
  const response = await fetch(`${apiBase}/runs/${runId}/cancel`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to cancel run: ${response.statusText}`)
  }
}
