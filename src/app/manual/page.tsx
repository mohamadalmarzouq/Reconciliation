'use client'

import { useState } from 'react'

export default function ManualPage() {
  const [bankFile, setBankFile] = useState<File | null>(null)
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)


  const handleFileUpload = (file: File, type: 'bank' | 'secondary') => {
    if (type === 'bank') {
      setBankFile(file)
    } else {
      setSecondaryFile(file)
    }
  }

  const processReconciliation = async () => {
    if (!bankFile || !secondaryFile) {
      alert('Please upload both bank statement and secondary document')
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('bankFile', bankFile)
      formData.append('secondaryFile', secondaryFile)
      formData.append('scope', 'complete')

      const response = await fetch('/api/manual-reconcile', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // Store results and redirect to review
        sessionStorage.setItem('manualReconciliationResult', JSON.stringify(result))
        sessionStorage.setItem('reconciliationMode', 'manual')
        
        alert(`${result.message}\nFound ${result.summary.matchesFound} matches out of ${result.summary.totalBankTransactions} bank transactions.`)
        
        // Redirect to a manual review page
        window.location.href = '/manual-review'
      } else {
        alert(`Reconciliation failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing reconciliation:', error)
      alert('Error processing reconciliation. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📄 Manual Mode Reconciliation
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload bank statement and secondary document for complete transaction extraction and reconciliation
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* File Upload */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              📤 Upload Documents
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Bank Statement Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🏦 Bank Statement
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.csv,.xlsx"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bank')}
                    className="hidden"
                    id="bank-file"
                  />
                  <label htmlFor="bank-file" className="cursor-pointer">
                    <div className="text-gray-600 mb-2">
                      {bankFile ? (
                        <div>
                          <div className="text-green-600 font-medium">✅ {bankFile.name}</div>
                          <div className="text-sm">Click to change</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-4xl mb-2">📄</div>
                          <div>Click to upload bank statement</div>
                          <div className="text-sm">(PDF, CSV, XLSX)</div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Secondary Document Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📊 Secondary Document
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.csv,.xlsx"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'secondary')}
                    className="hidden"
                    id="secondary-file"
                  />
                  <label htmlFor="secondary-file" className="cursor-pointer">
                    <div className="text-gray-600 mb-2">
                      {secondaryFile ? (
                        <div>
                          <div className="text-purple-600 font-medium">✅ {secondaryFile.name}</div>
                          <div className="text-sm">Click to change</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-4xl mb-2">📊</div>
                          <div>Click to upload {scope === 'complete' ? 'secondary document' : categoryOptions.find(c => c.value === category)?.description}</div>
                          <div className="text-sm">(PDF, CSV, XLSX)</div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Process Button */}
            <div className="text-center mt-8">
              <button
                onClick={processReconciliation}
                disabled={!bankFile || !secondaryFile || isProcessing}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  (!bankFile || !secondaryFile || isProcessing)
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isProcessing ? '🔄 Processing...' : '⚡ Start Reconciliation'}
              </button>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              💡 How Manual Mode Works
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Complete Mode</h4>
                <p className="text-gray-600 text-sm">
                  General AI analysis that extracts all transaction-like entries from both documents 
                  and attempts to match them using pattern recognition.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Specific Mode</h4>
                <p className="text-gray-600 text-sm">
                  Uses category-specific AI prompts tailored to the document type you select, 
                  providing more accurate extraction and matching logic.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <a href="/" className="text-purple-600 hover:text-purple-800 underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
