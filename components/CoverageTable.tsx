'use client'

import { CoverageSummary } from '@/lib/types'

interface CoverageTableProps {
  coverage: CoverageSummary
}

export default function CoverageTable({ coverage }: CoverageTableProps) {
  const getCoverageColor = (percent: number) => {
    if (percent >= 80) return 'text-sage-700 bg-sage-50'
    if (percent >= 60) return 'text-yellow-700 bg-yellow-50'
    return 'text-red-700 bg-red-50'
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-sm text-neutral-600">Lines</div>
          <div className={`mt-1 text-2xl font-semibold ${getCoverageColor(coverage.lines)}`}>
            {coverage.lines}%
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-sm text-neutral-600">Branches</div>
          <div className={`mt-1 text-2xl font-semibold ${getCoverageColor(coverage.branches)}`}>
            {coverage.branches}%
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-sm text-neutral-600">Functions</div>
          <div className={`mt-1 text-2xl font-semibold ${getCoverageColor(coverage.functions)}`}>
            {coverage.functions}%
          </div>
        </div>
      </div>

      {coverage.files.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-neutral-900">File Coverage</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {coverage.files.map((file, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1">
                  <div className="font-mono text-sm text-neutral-900">{file.filename}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {file.lines} lines, {file.branches} branches
                  </div>
                </div>
                <div className={`rounded px-3 py-1 text-sm font-medium ${getCoverageColor(file.percent)}`}>
                  {file.percent}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
