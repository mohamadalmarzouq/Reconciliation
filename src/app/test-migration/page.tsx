'use client'

import { useState, useEffect } from 'react'

export default function TestMigrationPage() {
  const [status, setStatus] = useState('Checking deployment status...')
  const [canRunMigration, setCanRunMigration] = useState(false)

  useEffect(() => {
    // Test if the migration endpoint exists
    fetch('/api/migrate-transactions', { method: 'GET' })
      .then(response => {
        if (response.status === 405) {
          // Method not allowed is expected (we need POST)
          setStatus('✅ Migration endpoint is deployed and ready!')
          setCanRunMigration(true)
        } else {
          setStatus('🔄 Migration endpoint may not be deployed yet...')
        }
      })
      .catch(error => {
        setStatus('❌ Migration endpoint not found. Still deploying...')
      })
  }, [])

  const runMigration = async () => {
    setStatus('🔄 Running migration...')
    
    try {
      const response = await fetch('/api/migrate-transactions', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStatus('✅ Migration completed successfully! Action buttons should now work.')
      } else {
        setStatus(`❌ Migration failed: ${data.error || data.details}`)
      }
    } catch (error) {
      setStatus(`❌ Error running migration: ${error}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Fix Action Buttons</h1>
        
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Database Migration Required
          </h2>
          
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Current Issue:</p>
            <p className="text-red-700">Action buttons are failing because the database is missing required columns.</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Migration Status:</h3>
            <p className="text-gray-700">{status}</p>
          </div>
          
          {canRunMigration && (
            <div className="mb-6">
              <button
                onClick={runMigration}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                🚀 Run Migration Now
              </button>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Manual Alternative:</h3>
            <p className="text-gray-600 mb-2">If the button doesn't work, you can run this SQL directly in your database:</p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

UPDATE transactions 
SET status = 'pending' 
WHERE status IS NULL;`}
            </pre>
          </div>
          
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
