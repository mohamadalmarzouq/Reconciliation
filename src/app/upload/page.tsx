'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { uploadFile } from '@/lib/fileUpload'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('idle')
    setUploadedFile(file)

    try {
      const result = await uploadFile(file)
      setUploadStatus('success')
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Bank Statement</h1>
        
        {/* Upload Area */}
        <div className="card mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your bank statement'}
            </h3>
            <p className="text-gray-500 mb-4">
              Supports PDF, CSV, and XLSX files up to 10MB
            </p>
            <button className="btn btn-primary">
              Choose File
            </button>
          </div>
        </div>

        {/* Upload Status */}
        {uploadedFile && (
          <div className="card mb-8">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-gray-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{uploadedFile.name}</h3>
                <p className="text-sm text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {uploadStatus === 'success' && (
                <CheckCircle className="w-6 h-6 text-success-600" />
              )}
              {uploadStatus === 'error' && (
                <AlertCircle className="w-6 h-6 text-danger-600" />
              )}
              {uploading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              )}
            </div>
          </div>
        )}

        {/* Upload Status Messages */}
        {uploadStatus === 'success' && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success-600" />
              <p className="text-success-800 font-medium">
                File uploaded successfully! Processing your bank statement...
              </p>
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger-600" />
              <p className="text-danger-800 font-medium">
                Upload failed. Please try again with a supported file format.
              </p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {uploadStatus === 'success' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
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
              <a href="/review" className="btn btn-primary">
                Review Transactions
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
