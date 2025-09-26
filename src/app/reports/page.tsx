'use client'

import { useState, useEffect } from 'react'
import { ReconciliationReport, ReportSummary, ReportSummaryItem } from '@/types'

export default function ReportsPage() {
  const [reports, setReports] = useState<ReconciliationReport[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'synced' | 'manual' | 'favorites' | 'pending'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState<ReconciliationReport | null>(null)
  const [pendingEntries, setPendingEntries] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingEntries()
    } else {
      fetchReports()
      fetchSummary()
    }
  }, [activeTab, searchTerm])

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams()
      
      if (activeTab === 'synced') {
        params.append('type', 'ai_sync,xero_sync,zoho_sync')
      } else if (activeTab === 'manual') {
        params.append('type', 'manual')
      } else if (activeTab === 'favorites') {
        params.append('favorite', 'true')
      }
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await fetch(`/api/reports?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setReports(result.reports)
      } else {
        console.error('Failed to fetch reports:', result.error)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/reports/summary')
      const result = await response.json()
      
      if (result.success) {
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchPendingEntries = async () => {
    setPendingLoading(true)
    try {
      const response = await fetch('/api/sync-queue?status=pending')
      const data = await response.json()
      if (data.success) {
        setPendingEntries(data.queue)
      }
    } catch (error) {
      console.error('Error fetching pending entries:', error)
    } finally {
      setPendingLoading(false)
    }
  }

  const addExistingAcceptedTransactions = async () => {
    setPendingLoading(true)
    try {
      // Get the current bank statement ID from session storage
      const bankStatementId = sessionStorage.getItem('currentBankStatementId')
      if (!bankStatementId) {
        alert('No bank statement found. Please go to Review page first.')
        return
      }

      const response = await fetch('/api/sync-queue/bulk-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankStatementId,
          provider: 'xero' // Default to xero, could be made dynamic
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`Added ${data.added} existing accepted transactions to sync queue!`)
        // Refresh the pending entries
        await fetchPendingEntries()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding existing transactions:', error)
      alert('Error adding existing transactions to sync queue')
    } finally {
      setPendingLoading(false)
    }
  }

  const toggleFavorite = async (reportId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFavorite: !currentStatus
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update local state
        setReports(prev => prev.map(report => 
          report.id === reportId 
            ? { ...report, isFavorite: !currentStatus }
            : report
        ))
      } else {
        alert('Failed to update favorite status')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Error updating favorite status')
    }
  }

  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Remove from local state
        setReports(prev => prev.filter(report => report.id !== reportId))
        alert('Report deleted successfully')
      } else {
        alert('Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Error deleting report')
    }
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_sync':
        return '🧠'
      case 'xero_sync':
        return '🟢'
      case 'zoho_sync':
        return '🔵'
      case 'manual':
        return '📝'
      default:
        return '📊'
    }
  }

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'ai_sync':
        return 'AI Reconciliation'
      case 'xero_sync':
        return 'Xero Reconciliation'
      case 'zoho_sync':
        return 'Zoho Reconciliation'
      case 'manual':
        return 'Manual Reconciliation'
      default:
        return 'Reconciliation'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Reconciliation Reports</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.href = '/review'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              🔄 New Reconciliation
            </button>
            <button 
              onClick={() => window.location.href = '/manual'}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              📝 Manual Reconciliation
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900">{summary.totalReports}</h3>
              <p className="text-gray-600">Total Reports</p>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-2xl font-bold text-blue-600">{summary.syncedReports}</h3>
              <p className="text-gray-600">Synced Reports</p>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-2xl font-bold text-purple-600">{summary.manualReports}</h3>
              <p className="text-gray-600">Manual Reports</p>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-2xl font-bold text-yellow-600">{summary.favoriteReports}</h3>
              <p className="text-gray-600">Favorites</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'all', label: 'All Reports', count: summary?.totalReports || 0 },
                { id: 'synced', label: 'Synced', count: summary?.syncedReports || 0 },
                { id: 'manual', label: 'Manual', count: summary?.manualReports || 0 },
                { id: 'favorites', label: 'Favorites', count: summary?.favoriteReports || 0 },
                { id: 'pending', label: 'Pending Entries', count: pendingEntries.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Entries Section */}
        {activeTab === 'pending' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pending Sync Queue</h2>
                <div className="flex gap-2">
                  <button
                    onClick={fetchPendingEntries}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    onClick={addExistingAcceptedTransactions}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors"
                  >
                    📥 Add Existing Accepted
                  </button>
                  <button
                    onClick={() => {/* TODO: Implement bulk sync */}}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    ⚡ Sync All
                  </button>
                </div>
              </div>
              
              {pendingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading pending entries...</p>
                </div>
              ) : pendingEntries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl text-gray-300 mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Entries</h3>
                  <p className="text-gray-600">All approved transactions have been synced to your accounting software.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingEntries.map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {entry.description}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              entry.action === 'accept' ? 'bg-green-100 text-green-800' : 
                              entry.action === 'reject' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {entry.action === 'accept' ? '✅ Approve' : 
                               entry.action === 'reject' ? '❌ Reject' : 
                               '⚠️ Flag'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {entry.provider ? `→ ${entry.provider.toUpperCase()}` : 'No provider'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">${Math.abs(entry.amount).toFixed(2)}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                            {entry.notes && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="italic">{entry.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {/* TODO: Implement individual sync */}}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            Sync Now
                          </button>
                          <button
                            onClick={() => {/* TODO: Implement edit */}}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Reports Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getReportTypeIcon(report.reportType)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{report.reportName}</h3>
                    <p className="text-xs text-gray-500">{getReportTypeLabel(report.reportType)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleFavorite(report.id, report.isFavorite)}
                    className={`p-1 rounded ${
                      report.isFavorite 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={report.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {report.isFavorite ? '⭐' : '☆'}
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                    title="Delete report"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transactions:</span>
                  <span className="font-medium">{report.summaryData.totalTransactions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Accepted:</span>
                  <span className="font-medium text-green-600">{report.summaryData.acceptedTransactions || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rejected:</span>
                  <span className="font-medium text-red-600">{report.summaryData.rejectedTransactions || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Flagged:</span>
                  <span className="font-medium text-yellow-600">{report.summaryData.flaggedTransactions || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Confidence:</span>
                  <span className="font-medium">
                    {(report.summaryData.averageConfidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Generated:</span>
                  <span className="font-medium">
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedReport(report)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200 transition-colors"
                >
                  👁️ View Details
                </button>
                <button className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
                  💾 Export
                </button>
              </div>
            </div>
          ))}
        </div>
        )}

        {reports.length === 0 && activeTab !== 'pending' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'favorites' 
                ? 'No favorite reports yet. Star a report to add it to favorites.'
                : 'Start by creating your first reconciliation report.'
              }
            </p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => window.location.href = '/review'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                🔄 Start Reconciliation
              </button>
              <button 
                onClick={() => window.location.href = '/manual'}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                📝 Manual Reconciliation
              </button>
            </div>
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Report Details</h3>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✗
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Report Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedReport.reportName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{getReportTypeLabel(selectedReport.reportType)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                          {selectedReport.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Generated:</span>
                        <span className="font-medium">
                          {new Date(selectedReport.generatedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Generated By:</span>
                        <span className="font-medium">{selectedReport.generatedBy}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Summary Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Transactions:</span>
                        <span className="font-medium">{selectedReport.summaryData.totalTransactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Accepted:</span>
                        <span className="font-medium text-green-600">{selectedReport.summaryData.acceptedTransactions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rejected:</span>
                        <span className="font-medium text-red-600">{selectedReport.summaryData.rejectedTransactions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Flagged:</span>
                        <span className="font-medium text-yellow-600">{selectedReport.summaryData.flaggedTransactions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending:</span>
                        <span className="font-medium text-gray-600">{selectedReport.summaryData.pendingTransactions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Confidence:</span>
                        <span className="font-medium">
                          {(selectedReport.summaryData.averageConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    💾 Export PDF
                  </button>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
                    📊 Export CSV
                  </button>
                  <button 
                    onClick={() => toggleFavorite(selectedReport.id, selectedReport.isFavorite)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedReport.isFavorite
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedReport.isFavorite ? '⭐ Remove from Favorites' : '☆ Add to Favorites'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
