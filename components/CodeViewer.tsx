'use client'

import { useState } from 'react'

interface CodeViewerProps {
  code: string
  language?: string
  filename?: string
}

export default function CodeViewer({ code, language = 'python', filename }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between rounded-t-lg border border-neutral-200 bg-neutral-50 px-4 py-2">
        {filename && (
          <span className="text-sm font-mono text-neutral-600">{filename}</span>
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded px-3 py-1 text-sm text-neutral-600 transition-colors hover:bg-neutral-200"
        >
          {copied ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-b-lg border border-t-0 border-neutral-200 bg-white p-4 text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  )
}
