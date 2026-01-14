'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RunResult, RunEvent } from '@/lib/types'
import { getRun, streamRunEvents, cancelRun } from '@/lib/api'
import { saveRun } from '@/lib/storage'
import Stepper from '@/components/Stepper'
import CodeViewer from '@/components/CodeViewer'
import CoverageTable from '@/components/CoverageTable'
import DiffViewer from '@/components/DiffViewer'

type Tab = 'progress' | 'tests' | 'coverage' | 'diff' | 'pr'

export default function RunDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const runId = params.id as string
  
  const [run, setRun] = useState<RunResult | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('progress')
  const [logs, setLogs] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [cancelStream, setCancelStream] = useState<(() => void) | null>(null)

  useEffect(() => {
    loadRun()
  }, [runId])

  const loadRun = async () => {
    const loaded = await getRun(runId)
    if (loaded) {
      setRun(loaded)
      if (loaded.status === 'running' || loaded.status === 'queued') {
        startStreaming(loaded)
      }
    }
  }

  const startStreaming = (initialRun: RunResult) => {
    if (isStreaming) return
    
    setIsStreaming(true)
    const payload = {
      code: initialRun.code,
      functionName: initialRun.functionName,
      options: initialRun.options,
    }
    
    const cancel = streamRunEvents(runId, handleEvent, payload)
    setCancelStream(() => cancel)
  }

  const handleEvent = (event: RunEvent) => {
    if (event.type === 'log' && event.message) {
      setLogs((prev) => [...prev, `[${new Date(event.timestamp).toLocaleTimeString()}] ${event.message}`])
    }
    
    if (event.type === 'step_complete' || event.type === 'run_complete') {
      if (event.data) {
        const updated = { ...run!, ...event.data }
        setRun(updated)
        saveRun(updated)
      }
    }
    
    if (event.type === 'run_complete') {
      setIsStreaming(false)
      setCancelStream(null)
    }
  }

  const handleCancel = async () => {
    if (cancelStream) {
      cancelStream()
      setCancelStream(null)
    }
    await cancelRun(runId)
    await loadRun()
  }

  const handleDownloadPatch = () => {
    if (!run?.patchDiff) return
    const blob = new Blob([run.patchDiff], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `veritas-pytest-${runId}.diff`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyPRBody = async () => {
    if (!run?.pr?.body) return
    await navigator.clipboard.writeText(run.pr.body)
    alert('PR body copied to clipboard')
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-neutral-600">Loading run details...</div>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'progress', label: 'Progress Log' },
    { id: 'tests', label: 'Generated Tests' },
    { id: 'coverage', label: 'Coverage' },
    { id: 'diff', label: 'Diff' },
  ]

  if (run.pr) {
    tabs.push({ id: 'pr', label: 'PR Preview' })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Run Details</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Function: <span className="font-mono">{run.functionName}</span> • Run ID: <span className="font-mono">{runId}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {(run.status === 'running' || run.status === 'queued') && (
            <button
              onClick={handleCancel}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Stop Run
            </button>
          )}
          {run.patchDiff && (
            <button
              onClick={handleDownloadPatch}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Download Patch
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Stepper */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Pipeline Steps</h2>
            <Stepper steps={run.steps} />
            <div className="mt-6 rounded-md bg-neutral-50 p-4">
              <div className="text-sm text-neutral-600">Output Location</div>
              <div className="mt-1 font-mono text-sm text-neutral-900">{run.artifactsPath}</div>
            </div>
          </div>
        </div>

        {/* Right: Main Content */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-neutral-200 bg-white">
            {/* Tabs */}
            <div className="flex border-b border-neutral-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-sage-600 text-sage-700'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'progress' && (
                <div className="space-y-4">
                  <div className="rounded-md bg-neutral-900 p-4 font-mono text-sm text-green-400">
                    <div className="space-y-1">
                      {logs.length === 0 ? (
                        <div className="text-neutral-500">Waiting for logs...</div>
                      ) : (
                        logs.map((log, index) => (
                          <div key={index}>{log}</div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tests' && (
                <div>
                  {run.generatedTests ? (
                    <CodeViewer code={run.generatedTests} language="python" filename={`test_${run.functionName}.py`} />
                  ) : (
                    <div className="text-center py-12 text-neutral-500">Tests not generated yet</div>
                  )}
                </div>
              )}

              {activeTab === 'coverage' && (
                <div>
                  {run.coverageSummary.lines > 0 ? (
                    <CoverageTable coverage={run.coverageSummary} />
                  ) : (
                    <div className="text-center py-12 text-neutral-500">Coverage report not available yet</div>
                  )}
                </div>
              )}

              {activeTab === 'diff' && (
                <div>
                  {run.patchDiff ? (
                    <DiffViewer diff={run.patchDiff} />
                  ) : (
                    <div className="text-center py-12 text-neutral-500">Diff not available yet</div>
                  )}
                </div>
              )}

              {activeTab === 'pr' && run.pr && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">PR Title</label>
                    <div className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
                      {run.pr.title}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-neutral-700">PR Body</label>
                      <button
                        onClick={handleCopyPRBody}
                        className="text-sm text-sage-600 hover:text-sage-700"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm whitespace-pre-wrap">
                      {run.pr.body}
                    </div>
                  </div>
                  {run.pr.url && (
                    <div>
                      <a
                        href={run.pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sage-600 hover:text-sage-700 text-sm"
                      >
                        View PR on GitHub →
                      </a>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Changed Files</label>
                    <div className="space-y-1">
                      {run.pr.changedFiles.map((file, index) => (
                        <div key={index} className="font-mono text-sm text-neutral-700 bg-neutral-50 p-2 rounded">
                          {file}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
