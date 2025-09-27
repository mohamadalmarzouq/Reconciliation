'use client'

import { useState } from 'react'

export default function MigratePage() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<string>('')

  const runMigration = async () => {
    setIsRunning(true)
    setResult('')
    
    try {
      const response = await fetch('/api/migrate-transactions', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult('✅ Migration completed successfully! Your action buttons should now work.')
      } else {
        setResult(`❌ Migration failed: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ Error running migration: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Database Migration</h1>
        
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add Action Button Support
          </h2>
          
          <p className="text-gray-600 mb-6">
            This migration will add the necessary database columns to support transaction action buttons 
            (Accept, Reject, Flag, Add Note) with full audit trail.
          </p>
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">What this migration does:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Adds <code>status</code> column (pending, accepted, rejected, flagged)</li>
              <li>Adds <code>reviewed_by</code> column (who reviewed the transaction)</li>
              <li>Adds <code>reviewed_at</code> column (when it was reviewed)</li>
              <li>Adds <code>review_notes</code> column (review comments)</li>
              <li>Sets existing transactions to 'pending' status</li>
            </ul>
          </div>
          
          <button
            onClick={runMigration}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isRunning 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? '🔄 Running Migration...' : '🚀 Run Migration'}
          </button>
          
          {result && (
            <div className="mt-6 p-4 rounded-lg bg-gray-50 border">
              <pre className="text-sm">{result}</pre>
            </div>
          )}
          
          <div className="mt-6">
            <a 
              href="/review" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Review Page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
