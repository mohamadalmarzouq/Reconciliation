'use client'

import { useState, useEffect } from 'react'

export default function SyncPage() {
  const [step, setStep] = useState(1)
  const [hasUploadedFile, setHasUploadedFile] = useState(false)

  useEffect(() => {
    // Check if user has already uploaded a bank statement
    const bankStatementId = sessionStorage.getItem('currentBankStatementId')
    if (bankStatementId) {
      setHasUploadedFile(true)
      setStep(2)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔗 Sync Mode Reconciliation
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect to your accounting software and reconcile your bank statement with live data
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <span className="text-sm text-gray-600">
            {step === 1 && "Step 1: Upload Bank Statement"}
            {step === 2 && "Step 2: Connect to Accounting Software"}
            {step === 3 && "Step 3: Review & Reconcile"}
          </span>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                📄 Upload Your Bank Statement
              </h2>
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Upload your bank statement in PDF, CSV, or XLSX format
                </p>
                <a 
                  href="/upload" 
                  className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  📤 Upload Bank Statement
                </a>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                🔗 Connect to Your Accounting Software
              </h2>
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Connect to Xero or Zoho Books to sync your financial data
                </p>
                <a 
                  href="/review" 
                  className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  🔗 Connect & Reconcile
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <a href="/" className="text-green-600 hover:text-green-800 underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
