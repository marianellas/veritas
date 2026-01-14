'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RunResult } from '@/lib/types'
import { getAllRuns } from '@/lib/storage'

export default function HistoryPage() {
  const router = useRouter()
  const [runs, setRuns] = useState<RunResult[]>([])

  useEffect(() => {
    setRuns(getAllRuns())
  }, [])

  const getStatusColor = (status: RunResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-sage-100 text-sage-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-neutral-100 text-neutral-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Run History</h1>
        <p className="mt-2 text-neutral-600">
          View all your test generation runs and their results.
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <div className="text-neutral-500">No runs yet. Start a new run to generate tests.</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Function
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Coverage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Iterations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Run ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {runs.map((run) => (
                <tr
                  key={run.runId}
                  onClick={() => router.push(`/run/${run.runId}`)}
                  className="cursor-pointer transition-colors hover:bg-neutral-50"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-mono text-sm text-neutral-900">{run.functionName}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                    {run.coverageSummary.lines > 0 ? (
                      <span className="font-medium">{run.coverageSummary.lines}%</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                    {run.iterationsUsed}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                    {formatDate(run.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-mono text-xs text-neutral-400">{run.runId.slice(0, 8)}...</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
