'use client'

import { useState } from 'react'

type ReconciliationScope = 'complete' | 'specific'
type DocumentCategory = 'sales' | 'expense' | 'delivery' | 'pos' | 'accounting' | 'general'

export default function ManualPage() {
  const [scope, setScope] = useState<ReconciliationScope>('complete')
  const [category, setCategory] = useState<DocumentCategory>('sales')
  const [bankFile, setBankFile] = useState<File | null>(null)
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const categoryOptions = [
    { value: 'sales', label: '📊 Sales Report', description: 'Daily/monthly sales data' },
    { value: 'expense', label: '💰 Expense Report', description: 'Business expense records' },
    { value: 'delivery', label: '🚚 Delivery Platform Report', description: 'Talabat, Jahez, etc. payouts' },
    { value: 'pos', label: '🏪 POS Report', description: 'Point of sale daily totals' },
    { value: 'accounting', label: '📋 Accounting Software Export', description: 'General ledger export' },
    { value: 'general', label: '📄 General/Other', description: 'Other transaction documents' }
  ]

  const handleFileUpload = (file: File, type: 'bank' | 'secondary') => {
    if (type === 'bank') {
      setBankFile(file)
    } else {
      setSecondaryFile(file)
    }
  }

  const processReconciliation = async () => {
    if (!bankFile || (scope === 'specific' && !secondaryFile)) {
      alert('Please upload all required files')
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('bankFile', bankFile)
      if (secondaryFile) {
        formData.append('secondaryFile', secondaryFile)
      }
      formData.append('scope', scope)
      if (scope === 'specific') {
        formData.append('category', category)
      }

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
            Upload documents and reconcile with category-specific AI intelligence
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Reconciliation Scope */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🧭 Step 1: Reconciliation Scope
            </h2>
            <p className="text-gray-600 mb-6">
              What type of reconciliation would you like to perform?
            </p>
            
            <div className="space-y-4">
              <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="complete"
                  checked={scope === 'complete'}
                  onChange={(e) => setScope(e.target.value as ReconciliationScope)}
                  className="mr-4"
                />
                <div>
                  <div className="font-semibold text-gray-900">⭘ Complete</div>
                  <div className="text-gray-600">General reconciliation across all data types</div>
                </div>
              </label>
              
              <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="specific"
                  checked={scope === 'specific'}
                  onChange={(e) => setScope(e.target.value as ReconciliationScope)}
                  className="mr-4"
                />
                <div>
                  <div className="font-semibold text-gray-900">⭘ Specific</div>
                  <div className="text-gray-600">Category-specific logic based on document type</div>
                </div>
              </label>
            </div>
          </div>

          {/* Step 2: Category Selection (if Specific) */}
          {scope === 'specific' && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                🔁 Step 2: Select Document Category
              </h2>
              <p className="text-gray-600 mb-6">
                Choose the type of document you'll be uploading:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {categoryOptions.map((option) => (
                  <label 
                    key={option.value}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="category"
                      value={option.value}
                      checked={category === option.value}
                      onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                      className="mr-4"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{option.label}</div>
                      <div className="text-gray-600 text-sm">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: File Upload */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              📤 Step 3: Upload Documents
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
                  📊 {scope === 'specific' ? 
                    categoryOptions.find(c => c.value === category)?.label || 'Secondary Document' : 
                    'Secondary Document'
                  }
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
                disabled={!bankFile || (scope === 'specific' && !secondaryFile) || isProcessing}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  (!bankFile || (scope === 'specific' && !secondaryFile) || isProcessing)
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
