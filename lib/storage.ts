import { RunResult } from './types'

const STORAGE_KEY = 'veritas_pytest_runs'

export function saveRun(run: RunResult): void {
  const runs = getAllRuns()
  const existingIndex = runs.findIndex((r) => r.runId === run.runId)
  
  if (existingIndex >= 0) {
    runs[existingIndex] = run
  } else {
    runs.unshift(run)
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs))
}

export function getRun(runId: string): RunResult | null {
  const runs = getAllRuns()
  return runs.find((r) => r.runId === runId) || null
}

export function getAllRuns(): RunResult[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function deleteRun(runId: string): void {
  const runs = getAllRuns()
  const filtered = runs.filter((r) => r.runId !== runId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
