'use client'

import { PipelineStep, PipelineStepName } from '@/lib/types'

interface StepperProps {
  steps: PipelineStep[]
}

const stepLabels: Record<PipelineStepName, string> = {
  read_code: 'Read Code',
  infer_behavior: 'Infer Behavior',
  generate_tests: 'Generate Tests',
  run_tests: 'Run Tests',
  fix_tests: 'Fix Tests',
  coverage_report: 'Coverage Report',
  pr_ready_output: 'PR-Ready Output',
  open_pr: 'Open PR',
}

export default function Stepper({ steps }: StepperProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isActive = step.status === 'running'
        const isComplete = step.status === 'success'
        const isFailed = step.status === 'fail'
        const isQueued = step.status === 'queued'
        
        return (
          <div key={step.name} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  isComplete
                    ? 'border-sage-600 bg-sage-600 text-white'
                    : isActive
                    ? 'border-sage-500 bg-sage-50 text-sage-700'
                    : isFailed
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-neutral-300 bg-white text-neutral-400'
                }`}
              >
                {isComplete ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isFailed ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-12 w-0.5 ${
                    isComplete ? 'bg-sage-600' : 'bg-neutral-200'
                  }`}
                />
              )}
            </div>
            <div className="flex-1 pt-1">
              <div
                className={`text-sm font-medium ${
                  isActive || isComplete
                    ? 'text-neutral-900'
                    : isFailed
                    ? 'text-red-700'
                    : 'text-neutral-500'
                }`}
              >
                {stepLabels[step.name]}
              </div>
              {step.error && (
                <div className="mt-1 text-xs text-red-600">{step.error}</div>
              )}
              {step.completedAt && (
                <div className="mt-1 text-xs text-neutral-400">
                  Completed {new Date(step.completedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
