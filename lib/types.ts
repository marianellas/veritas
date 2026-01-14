export type PipelineStepName =
  | 'read_code'
  | 'infer_behavior'
  | 'generate_tests'
  | 'run_tests'
  | 'fix_tests'
  | 'coverage_report'
  | 'pr_ready_output'
  | 'open_pr'

export type StepStatus = 'queued' | 'running' | 'success' | 'fail' | 'skipped'

export type RunStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled'

export interface PipelineStep {
  name: PipelineStepName
  status: StepStatus
  startedAt?: string
  completedAt?: string
  error?: string
}

export interface EdgeCaseCategory {
  none: boolean
  empty: boolean
  large: boolean
  unicode: boolean
  floats: boolean
  timezones: boolean
}

export interface RunOptions {
  maxIterations: number
  testStyle: 'unit' | 'property-based'
  coverageThreshold: number
  edgeCaseCategories: EdgeCaseCategory
  createPR: boolean
  repoUrl?: string
  branch?: string
}

export interface CoverageFile {
  filename: string
  percent: number
  lines: number
  branches: number
}

export interface CoverageSummary {
  lines: number
  branches: number
  functions: number
  files: CoverageFile[]
}

export interface PRInfo {
  title: string
  body: string
  url?: string
  changedFiles: string[]
}

export interface RunResult {
  runId: string
  status: RunStatus
  functionName: string
  code: string
  options: RunOptions
  inferredSpec: string
  edgeCases: string[]
  generatedTests: string
  testRunOutput: {
    stdout: string
    stderr: string
    exitCode: number
  }
  coverageSummary: CoverageSummary
  patchDiff: string
  pr?: PRInfo
  artifactsPath: string
  iterationsUsed: number
  steps: PipelineStep[]
  createdAt: string
  updatedAt: string
}

export interface RunEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 'log' | 'run_complete'
  step?: PipelineStepName
  message?: string
  data?: Partial<RunResult>
  timestamp: string
}

export interface StartRunPayload {
  code: string
  functionName: string
  options: RunOptions
}
