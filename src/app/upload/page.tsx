'use client'

import { useState } from 'react'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('idle')
    setUploadedFile(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadStatus('success')
        // Store the bank statement ID for navigation
        sessionStorage.setItem('currentBankStatementId', result.bankStatementId)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Bank Statement</h1>
        
        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4 text-2xl">
              📄
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Upload your bank statement
            </h3>
            <p className="text-gray-500 mb-4">
              Supports PDF, CSV, and XLSX files up to 10MB
            </p>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.csv,.xlsx"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer inline-block"
            >
              Choose File
            </label>
          </div>
        </div>

        {/* Upload Status */}
        {uploadedFile && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-600 text-white rounded-lg flex items-center justify-center text-lg">
                📄
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{uploadedFile.name}</h3>
                <p className="text-sm text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {uploadStatus === 'success' && (
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">
                  ✗
                </div>
              )}
              {uploading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>
        )}

        {/* Upload Status Messages */}
        {uploadStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                ✓
              </div>
              <p className="text-green-800 font-medium">
                File uploaded successfully! Processing your bank statement...
              </p>
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">
                ✗
              </div>
              <p className="text-red-800 font-medium">
                Upload failed. Please try again with a supported file format.
              </p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {uploadStatus === 'success' && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-gray-700">Review parsed transactions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-gray-500">AI-powered matching with accounting entries</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-gray-500">Export reconciliation report</span>
              </div>
            </div>
            <div className="mt-6">
              <a href="/review" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block">
                Review Transactions
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}