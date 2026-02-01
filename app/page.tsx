'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RunOptions, EdgeCaseCategory } from '@/lib/types'
import { startRun } from '@/lib/api'
import RepoConnectCard from '@/components/RepoConnectCard'

type InputMethod = 'paste' | 'upload' | 'experiment'
type CodeType = 'function' | 'class' | 'module'

export default function HomePage() {
  const router = useRouter()
  const [inputMethod, setInputMethod] = useState<InputMethod>('paste')
  const [code, setCode] = useState('')
  const [selectedFunction, setSelectedFunction] = useState('')
  const [functions, setFunctions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Experiment mode state
  const [experimentDescription, setExperimentDescription] = useState('')
  const [codeType, setCodeType] = useState<CodeType>('function')
  const [generatedCode, setGeneratedCode] = useState('')
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [codePrompt, setCodePrompt] = useState(`Generate a {codeType} based on this description:

{description}

Requirements:
- Write clean, well-documented Python code
- Include proper type hints if applicable
- Follow PEP 8 style guidelines
- Make the code functional and complete
- Return ONLY the code, no explanations or markdown formatting`)
  
  // Update prompt when codeType changes
  const handleCodeTypeChange = (newType: CodeType) => {
    setCodeType(newType)
  }
  
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
    const items: string[] = []
    const lines = code.split('\n')
    
    // Parse classes (look for 'class ClassName:')
    const classRegex = /^class\s+(\w+)/gm
    const classMatches = Array.from(code.matchAll(classRegex))
    classMatches.forEach((match) => {
      if (match.index !== undefined) {
        const lineIndex = code.substring(0, match.index).split('\n').length - 1
        const line = lines[lineIndex]
        // Only include classes that are at module level (not nested)
        const indent = line.length - line.trimStart().length
        if (indent === 0) {
          items.push(match[1])
        }
      }
    })
    
    // Parse top-level functions (not methods inside classes)
    const functionRegex = /^def\s+(\w+)\s*\(/gm
    const functionMatches = Array.from(code.matchAll(functionRegex))
    functionMatches.forEach((match) => {
      if (match.index !== undefined) {
        const lineIndex = code.substring(0, match.index).split('\n').length - 1
        const line = lines[lineIndex]
        // Only include functions at module level (no or minimal indentation)
        const indent = line.length - line.trimStart().length
        if (indent === 0) {
          items.push(match[1])
        }
      }
    })
    
    return items
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

  const handleGenerateCode = async () => {
    if (!experimentDescription.trim()) {
      alert('Please enter a description')
      return
    }

    setIsGeneratingCode(true)
    try {
      const prompt = codePrompt
        .replace('{codeType}', codeType)
        .replace('{description}', experimentDescription)
      
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, codeType }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate code'
        console.error('API Error:', errorMessage, data)
        alert(`Error: ${errorMessage}`)
        return
      }

      if (!data.code) {
        throw new Error('No code generated in response')
      }

      let generated = data.code
      
      // Clean up markdown code blocks if present
      if (generated.startsWith('```python')) {
        generated = generated.replace(/^```python\n?/, '').replace(/\n?```$/, '')
      } else if (generated.startsWith('```')) {
        generated = generated.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      
      if (!generated.trim()) {
        throw new Error('Generated code is empty')
      }
      
      setGeneratedCode(generated)
      handleCodeChange(generated)
    } catch (error: any) {
      console.error('Failed to generate code:', error)
      const errorMessage = error.message || 'Failed to generate code. Please check your OpenAI API key in .env.local'
      alert(errorMessage)
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handleUseGeneratedCode = () => {
    if (generatedCode) {
      setCode(generatedCode)
      handleCodeChange(generatedCode)
      setInputMethod('paste') // Switch to paste tab to show the code
    }
  }

  const handleGenerate = async () => {
    if (!code.trim() || !selectedFunction) {
      alert('Please provide code and select a function or class')
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to start run. Please try again.'
      alert(errorMessage)
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
            <button
              onClick={() => setInputMethod('experiment')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                inputMethod === 'experiment'
                  ? 'border-b-2 border-sage-600 text-sage-700'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Experiment
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
            ) : inputMethod === 'upload' ? (
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
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={experimentDescription}
                    onChange={(e) => setExperimentDescription(e.target.value)}
                    placeholder="Describe the Python code you want to generate, e.g., 'A function that calculates the factorial of a number'"
                    className="h-32 w-full rounded-md border border-neutral-300 p-3 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Code Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="function"
                        checked={codeType === 'function'}
                        onChange={(e) => handleCodeTypeChange(e.target.value as CodeType)}
                        className="h-4 w-4 text-sage-600 focus:ring-sage-500"
                      />
                      <span className="ml-2 text-sm text-neutral-700">Function</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="class"
                        checked={codeType === 'class'}
                        onChange={(e) => handleCodeTypeChange(e.target.value as CodeType)}
                        className="h-4 w-4 text-sage-600 focus:ring-sage-500"
                      />
                      <span className="ml-2 text-sm text-neutral-700">Class</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="module"
                        checked={codeType === 'module'}
                        onChange={(e) => handleCodeTypeChange(e.target.value as CodeType)}
                        className="h-4 w-4 text-sage-600 focus:ring-sage-500"
                      />
                      <span className="ml-2 text-sm text-neutral-700">Module</span>
                    </label>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-700">
                      Generation Prompt (Editable)
                    </label>
                    <span className="text-xs text-neutral-500">
                      Use {'{codeType}'} and {'{description}'} as placeholders
                    </span>
                  </div>
                  <textarea
                    value={codePrompt}
                    onChange={(e) => setCodePrompt(e.target.value)}
                    className="h-32 w-full rounded-md border border-neutral-300 p-3 font-mono text-xs focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
                  />
                </div>
                <button
                  onClick={handleGenerateCode}
                  disabled={!experimentDescription.trim() || isGeneratingCode}
                  className="w-full rounded-md bg-sage-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingCode ? 'Generating...' : 'Generate Code'}
                </button>
                {generatedCode && (
                  <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-neutral-900">Generated Code</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUseGeneratedCode}
                          className="rounded-md bg-sage-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-sage-700"
                        >
                          Use This Code
                        </button>
                        <button
                          onClick={handleGenerateCode}
                          disabled={isGeneratingCode}
                          className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                    <pre className="max-h-64 overflow-auto rounded-md border border-neutral-200 bg-white p-3 text-xs">
                      <code>{generatedCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Function/Class Selector */}
        {functions.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <label className="block text-sm font-medium text-neutral-700">
              Select Function or Class
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
            <p className="mt-2 text-xs text-neutral-500">
              {functions.some(f => /^[A-Z]/.test(f)) 
                ? 'Classes and functions detected. Select one to generate tests.'
                : 'Functions detected. Select one to generate tests.'}
            </p>
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
