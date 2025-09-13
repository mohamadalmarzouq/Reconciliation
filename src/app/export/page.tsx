'use client'

import { useState, useEffect } from 'react'
import { Download, FileText, BarChart3, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { generatePDFReport, generateCSVReport } from '@/lib/reportGenerator'

export default function ExportPage() {
  const [reportData, setReportData] = useState({
    totalTransactions: 0,
    matchedTransactions: 0,
    flaggedTransactions: 0,
    unmatchedTransactions: 0,
    confidenceScore: 0,
    processingTime: 0,
    generatedAt: new Date().toISOString()
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for demonstration
    setTimeout(() => {
      setReportData({
        totalTransactions: 150,
        matchedTransactions: 120,
        flaggedTransactions: 15,
        unmatchedTransactions: 15,
        confidenceScore: 0.87,
        processingTime: 45.2,
        generatedAt: new Date().toISOString()
      })
      setLoading(false)
    }, 1000)
  }, [])

  const handleExportPDF = async () => {
    try {
      await generatePDFReport(reportData)
    } catch (error) {
      console.error('PDF export error:', error)
    }
  }

  const handleExportCSV = async () => {
    try {
      await generateCSVReport(reportData)
    } catch (error) {
      console.error('CSV export error:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Export Reconciliation Report</h1>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{reportData.totalTransactions}</h3>
            <p className="text-gray-600">Total Transactions</p>
          </div>

          <div className="card text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            <h3 className="text-2xl font-bold text-success-600">{reportData.matchedTransactions}</h3>
            <p className="text-gray-600">Matched</p>
          </div>

          <div className="card text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="w-8 h-8 text-warning-600" />
            </div>
            <h3 className="text-2xl font-bold text-warning-600">{reportData.flaggedTransactions}</h3>
            <p className="text-gray-600">Flagged</p>
          </div>

          <div className="card text-center">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="w-8 h-8 text-danger-600" />
            </div>
            <h3 className="text-2xl font-bold text-danger-600">{reportData.unmatchedTransactions}</h3>
            <p className="text-gray-600">Unmatched</p>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* PDF Export */}
          <div className="card">
            <div className="flex items-center gap-4 mb-4">
              <FileText className="w-8 h-8 text-primary-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">PDF Report</h3>
                <p className="text-gray-600">Comprehensive reconciliation report with charts and details</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Pages:</span>
                <span className="font-medium">8-12 pages</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File Size:</span>
                <span className="font-medium">~2.5 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">Professional PDF</span>
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              className="btn btn-primary w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </button>
          </div>

          {/* CSV Export */}
          <div className="card">
            <div className="flex items-center gap-4 mb-4">
              <BarChart3 className="w-8 h-8 text-primary-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">CSV Data</h3>
                <p className="text-gray-600">Raw transaction data for further analysis</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Records:</span>
                <span className="font-medium">{reportData.totalTransactions} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File Size:</span>
                <span className="font-medium">~150 KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">Excel Compatible</span>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              className="btn btn-secondary w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Data
            </button>
          </div>
        </div>

        {/* Report Details */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Report Summary</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Reconciliation Statistics</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Match Rate:</span>
                  <span className="font-medium">
                    {((reportData.matchedTransactions / reportData.totalTransactions) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence Score:</span>
                  <span className="font-medium">
                    {(reportData.confidenceScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="font-medium">{reportData.processingTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Generated At:</span>
                  <span className="font-medium">
                    {new Date(reportData.generatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Transaction Breakdown</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success-600" />
                  <span className="text-gray-600">Matched Transactions</span>
                  <span className="font-medium ml-auto">{reportData.matchedTransactions}</span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                  <span className="text-gray-600">Flagged for Review</span>
                  <span className="font-medium ml-auto">{reportData.flaggedTransactions}</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-danger-600" />
                  <span className="text-gray-600">Unmatched</span>
                  <span className="font-medium ml-auto">{reportData.unmatchedTransactions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Export All Reports
          </button>
          <button className="btn btn-secondary">
            Email Report
          </button>
          <button className="btn btn-secondary">
            Schedule Recurring Report
          </button>
        </div>
      </div>
    </div>
  )
}
