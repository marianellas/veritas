'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RunOptions, EdgeCaseCategory } from '@/lib/types'
import { startRun } from '@/lib/api'
import RepoConnectCard from '@/components/RepoConnectCard'

type InputMethod = 'paste' | 'upload'

export default function HomePage() {
  const router = useRouter()
  const [inputMethod, setInputMethod] = useState<InputMethod>('paste')
  const [code, setCode] = useState('')
  const [selectedFunction, setSelectedFunction] = useState('')
  const [functions, setFunctions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [options, setOptions] = useState<RunOptions>({
    maxIterations: 3,
    testStyle: 'unit',
    coverageThreshold: 80,
    edgeCaseCategories: {
      none: false,
      empty: true,
      large: true,
      unicode: false,
      floats: false,
      timezones: false,
    },
    createPR: false,
    branch: 'main',
  })

  const parseFunctions = (code: string): string[] => {
    const functionRegex = /^def\s+(\w+)\s*\(/gm
    const matches = Array.from(code.matchAll(functionRegex))
    return matches.map((m) => m[1])
  }

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    const parsed = parseFunctions(newCode)
    setFunctions(parsed)
    if (parsed.length > 0 && !parsed.includes(selectedFunction)) {
      setSelectedFunction(parsed[0])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/x-python' || file?.name.endsWith('.py')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        handleCodeChange(content)
      }
      reader.readAsText(file)
    }
  }

  const handleGenerate = async () => {
    if (!code.trim() || !selectedFunction) {
      alert('Please provide code and select a function')
      return
    }

    setIsGenerating(true)
    try {
      const runId = await startRun({
        code,
        functionName: selectedFunction,
        options,
      })
      router.push(`/run/${runId}`)
    } catch (error) {
      console.error('Failed to start run:', error)
      alert('Failed to start run. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">New Test Run</h1>
        <p className="mt-2 text-neutral-600">
          Paste or upload Python code, select a function, and generate comprehensive pytest tests.
        </p>
      </div>

      <div className="space-y-6">
        {/* Input Method Tabs */}
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="flex border-b border-neutral-200">
            <button
              onClick={() => setInputMethod('paste')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                inputMethod === 'paste'
                  ? 'border-b-2 border-sage-600 text-sage-700'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Paste Code
            </button>
            <button
              onClick={() => setInputMethod('upload')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                inputMethod === 'upload'
                  ? 'border-b-2 border-sage-600 text-sage-700'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Upload File
            </button>
          </div>
          <div className="p-4">
            {inputMethod === 'paste' ? (
              <textarea
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="def add(a, b):&#10;    return a + b"
                className="h-64 w-full rounded-md border border-neutral-300 p-3 font-mono text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".py,text/x-python"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-md border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-sm text-neutral-600 transition-colors hover:border-sage-400 hover:bg-sage-50"
                >
                  Click to upload .py file
                </button>
                {code && (
                  <div className="mt-4 rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                    Code loaded ({code.split('\n').length} lines)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Function Selector */}
        {functions.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <label className="block text-sm font-medium text-neutral-700">
              Select Function
            </label>
            <select
              value={selectedFunction}
              onChange={(e) => setSelectedFunction(e.target.value)}
              className="mt-2 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
            >
              {functions.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* GitHub Repo Connection */}
        <RepoConnectCard options={options} onOptionsChange={(updates) => setOptions({ ...options, ...updates })} />

        {/* Advanced Options */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Advanced Options</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Max Iterations
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={options.maxIterations}
                onChange={(e) => setOptions({ ...options, maxIterations: parseInt(e.target.value) || 3 })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Test Style
              </label>
              <select
                value={options.testStyle}
                onChange={(e) => setOptions({ ...options, testStyle: e.target.value as 'unit' | 'property-based' })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                <option value="unit">Unit Tests</option>
                <option value="property-based">Property-Based (Hypothesis)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Coverage Threshold (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={options.coverageThreshold}
                onChange={(e) => setOptions({ ...options, coverageThreshold: parseInt(e.target.value) || 80 })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Edge Case Categories
              </label>
              <div className="space-y-2">
                {Object.entries(options.edgeCaseCategories).map(([key, value]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          edgeCaseCategories: {
                            ...options.edgeCaseCategories,
                            [key]: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-neutral-300 text-sage-600 focus:ring-sage-500"
                    />
                    <span className="ml-2 text-sm text-neutral-700 capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!code.trim() || !selectedFunction || isGenerating}
            className="rounded-md bg-sage-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? 'Starting...' : 'Generate Tests'}
          </button>
        </div>
      </div>
    </div>
  )
}
