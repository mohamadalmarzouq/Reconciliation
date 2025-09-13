'use client'

import { useState, useEffect } from 'react'

interface ReportData {
  totalTransactions: number
  matchedTransactions: number
  flaggedTransactions: number
  unmatchedTransactions: number
  confidenceScore: number
  processingTime: number
  generatedAt: string
}

export default function ExportPage() {
  const [reportData, setReportData] = useState<ReportData>({
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
      // Simple PDF generation simulation
      const reportContent = `
        ReconcileAI Reconciliation Report
        Generated: ${new Date(reportData.generatedAt).toLocaleString()}
        
        Summary:
        - Total Transactions: ${reportData.totalTransactions}
        - Matched: ${reportData.matchedTransactions}
        - Flagged: ${reportData.flaggedTransactions}
        - Unmatched: ${reportData.unmatchedTransactions}
        - Confidence Score: ${(reportData.confidenceScore * 100).toFixed(1)}%
        - Processing Time: ${reportData.processingTime}s
      `

      const blob = new Blob([reportContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF export error:', error)
    }
  }

  const handleExportCSV = async () => {
    try {
      const csvContent = `Date,Description,Amount,Type,Status,Confidence
2025-09-01,Sample Transaction 1,100.00,credit,matched,0.95
2025-09-02,Sample Transaction 2,-50.00,debit,flagged,0.65
2025-09-03,Sample Transaction 3,200.00,credit,unmatched,0.30`

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reconciliation-data-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV export error:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg">
                📊
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{reportData.totalTransactions}</h3>
            <p className="text-gray-600">Total Transactions</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-lg">
                ✓
              </div>
            </div>
            <h3 className="text-2xl font-bold text-green-600">{reportData.matchedTransactions}</h3>
            <p className="text-gray-600">Matched</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 bg-yellow-600 text-white rounded-lg flex items-center justify-center text-lg">
                !
              </div>
            </div>
            <h3 className="text-2xl font-bold text-yellow-600">{reportData.flaggedTransactions}</h3>
            <p className="text-gray-600">Flagged</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-lg">
                ✗
              </div>
            </div>
            <h3 className="text-2xl font-bold text-red-600">{reportData.unmatchedTransactions}</h3>
            <p className="text-gray-600">Unmatched</p>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* PDF Export */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg">
                📄
              </div>
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full"
            >
              📥 Download PDF Report
            </button>
          </div>

          {/* CSV Export */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg">
                📊
              </div>
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
              className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors w-full"
            >
              📥 Download CSV Data
            </button>
          </div>
        </div>

        {/* Report Details */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
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
                  <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
                  <span className="text-gray-600">Matched Transactions</span>
                  <span className="font-medium ml-auto">{reportData.matchedTransactions}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm">!</div>
                  <span className="text-gray-600">Flagged for Review</span>
                  <span className="font-medium ml-auto">{reportData.flaggedTransactions}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">✗</div>
                  <span className="text-gray-600">Unmatched</span>
                  <span className="font-medium ml-auto">{reportData.unmatchedTransactions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            📥 Export All Reports
          </button>
          <button className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
            📧 Email Report
          </button>
          <button className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
            ⏰ Schedule Recurring Report
          </button>
        </div>
      </div>
    </div>
  )
}