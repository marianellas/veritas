'use client'

import { RunOptions } from '@/lib/types'

interface RepoConnectCardProps {
  options: RunOptions
  onOptionsChange: (options: Partial<RunOptions>) => void
}

export default function RepoConnectCard({ options, onOptionsChange }: RepoConnectCardProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900">GitHub Repository (Optional)</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Repository URL
          </label>
          <input
            type="text"
            placeholder="https://github.com/username/repo"
            value={options.repoUrl || ''}
            onChange={(e) => onOptionsChange({ repoUrl: e.target.value })}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Branch
          </label>
          <input
            type="text"
            placeholder="main"
            value={options.branch || 'main'}
            onChange={(e) => onOptionsChange({ branch: e.target.value })}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="create-pr"
            checked={options.createPR}
            onChange={(e) => onOptionsChange({ createPR: e.target.checked })}
            className="h-4 w-4 rounded border-neutral-300 text-sage-600 focus:ring-sage-500"
          />
          <label htmlFor="create-pr" className="ml-2 text-sm text-neutral-700">
            Create PR when finished
          </label>
        </div>
        {options.createPR && (
          <div className="rounded-md bg-sage-50 p-3 text-sm text-sage-800">
            When enabled, veritas-pytest will open a pull request with the generated tests after the run completes.
            Outputs will be written to <code className="font-mono">experiments/</code> in the target repository.
          </div>
        )}
      </div>
    </div>
  )
}
