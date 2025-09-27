'use client'

import { useState } from 'react'

interface UploadedFile {
  file: File
  accountName: string
}

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const newUploadedFiles = files.map(file => ({
      file,
      accountName: `Account ${uploadedFiles.length + 1}`
    }))

    setUploadedFiles(prev => [...prev, ...newUploadedFiles])
  }

  const updateAccountName = (index: number, accountName: string) => {
    setUploadedFiles(prev => prev.map((item, i) => 
      i === index ? { ...item, accountName } : item
    ))
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return

    setUploading(true)
    setUploadStatus('idle')

    try {
      const formData = new FormData()
      
      uploadedFiles.forEach(({ file, accountName }) => {
        formData.append('files', file)
        formData.append('accountNames', accountName)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadStatus('success')
        setUploadSessionId(result.uploadSessionId)
        // Store the upload session ID for navigation
        sessionStorage.setItem('currentUploadSessionId', result.uploadSessionId)
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Bank Statements</h1>
        
        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4 text-2xl">
              📄
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Upload multiple bank statements
            </h3>
            <p className="text-gray-500 mb-4">
              Supports PDF, CSV, and XLSX files up to 10MB each. Upload multiple accounts at once.
            </p>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.csv,.xlsx"
              multiple
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer inline-block"
            >
              Choose Files
            </label>
          </div>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Files ({uploadedFiles.length})
            </h3>
            <div className="space-y-4">
              {uploadedFiles.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-8 h-8 bg-gray-600 text-white rounded-lg flex items-center justify-center text-lg">
                    📄
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.file.name}</h4>
                    <p className="text-sm text-gray-500">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.accountName}
                      onChange={(e) => updateAccountName(index, e.target.value)}
                      placeholder="Account name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    ✗
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleUpload}
                disabled={uploading || uploadedFiles.length === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : `Upload ${uploadedFiles.length} File${uploadedFiles.length > 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => setUploadedFiles([])}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
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
                {uploadedFiles.length} file(s) uploaded successfully! Processing your bank statements...
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
                <span className="text-gray-700">Review parsed transactions from all accounts</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-gray-500">AI-powered matching with accounting entries</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-gray-500">Sync to Xero and/or Zoho</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
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