'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  isMatched: boolean
  status: 'pending' | 'accepted' | 'rejected' | 'flagged'
  match?: {
    confidence: number
    explanation: string
    suggestedAction: string
    accountingEntry?: {
      id: string
      description: string
      amount: number
      date: string
      account: string
      type: string
    }
  }
}

export default function ManualReviewPage() {
  const [bankTransactions, setBankTransactions] = useState<Transaction[]>([])
  const [secondaryTransactions, setSecondaryTransactions] = useState<Transaction[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    // Load manual reconciliation results from session storage
    const resultsData = sessionStorage.getItem('manualReconciliationResult')
    const mode = sessionStorage.getItem('reconciliationMode')

    if (!resultsData || mode !== 'manual') {
      alert('No manual reconciliation data found. Please start a new manual reconciliation.')
      window.location.href = '/manual'
      return
    }

    try {
      const results = JSON.parse(resultsData)
      setBankTransactions(results.bankTransactions || [])
      setSecondaryTransactions(results.secondaryTransactions || [])
      setMatches(results.matches || [])
      setSummary(results.summary || {})
    } catch (error) {
      console.error('Error loading manual reconciliation results:', error)
      alert('Error loading reconciliation results. Please try again.')
      window.location.href = '/manual'
    } finally {
      setLoading(false)
    }
  }, [])

  const getStatusIcon = (transaction: Transaction) => {
    switch (transaction.status) {
      case 'accepted':
        return <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
      case 'rejected':
        return <div className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">✗</div>
      case 'flagged':
        return <div className="w-5 h-5 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm">⚠</div>
      default:
        if (transaction.isMatched) {
          return <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
        } else {
          return <div className="w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm">?</div>
        }
    }
  }

  const getStatusColor = (transaction: Transaction) => {
    switch (transaction.status) {
      case 'accepted':
        return 'bg-green-50 border-green-200'
      case 'rejected':
        return 'bg-red-50 border-red-200'
      case 'flagged':
        return 'bg-yellow-50 border-yellow-200'
      default:
        if (transaction.isMatched) {
          return 'bg-green-50 border-green-200'
        } else {
          return 'bg-gray-50 border-gray-200'
        }
    }
  }

  const getStatusText = (transaction: Transaction) => {
    switch (transaction.status) {
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
      case 'flagged':
        return 'Flagged'
      default:
        return transaction.isMatched ? 'Matched' : 'Unmatched'
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manual Reconciliation Review</h1>
          <div className="flex gap-2">
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
              📄 Export Report
            </button>
            <a href="/manual" className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              🔄 New Reconciliation
            </a>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-gray-900">{summary.totalBankTransactions || 0}</h3>
            <p className="text-gray-600">Bank Transactions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-purple-600">{summary.totalSecondaryTransactions || 0}</h3>
            <p className="text-gray-600">Secondary Document</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-green-600">{summary.matchesFound || 0}</h3>
            <p className="text-gray-600">Matches Found</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-blue-600">
              {summary.confidenceScore ? (summary.confidenceScore * 100).toFixed(0) : 0}%
            </h3>
            <p className="text-gray-600">Avg Confidence</p>
          </div>
        </div>

        {/* Bank Transactions Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🏦 Bank Statement Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Confidence</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bankTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${getStatusColor(transaction)}`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction)}
                        <span className="text-sm font-medium">
                          {getStatusText(transaction)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {transaction.match && (
                        <span className={`text-sm font-medium ${
                          transaction.match.confidence >= 0.8 ? 'text-green-600' :
                          transaction.match.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(transaction.match.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm hover:bg-purple-200 transition-colors"
                      >
                        👁️ Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secondary Document Transactions Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Secondary Document Transactions</h2>
          {secondaryTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {secondaryTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className={`py-3 px-4 text-sm font-medium ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 capitalize">
                        {transaction.type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Secondary Document Transactions Found</h3>
              <p className="text-gray-600">
                The secondary document parsing failed or returned no transactions. 
                This could be due to:
              </p>
              <ul className="text-sm text-gray-500 mt-2 space-y-1">
                <li>• Document format not supported</li>
                <li>• Text extraction failed</li>
                <li>• No recognizable transaction patterns</li>
                <li>• AI parsing encountered an error</li>
              </ul>
              <div className="mt-4">
                <a href="/manual" className="text-purple-600 hover:text-purple-800 underline">
                  Try uploading a different document format
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Transaction Details</h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✗
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Date</label>
                      <p className="text-gray-900">{new Date(selectedTransaction.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Amount</label>
                      <p className={`font-medium ${
                        selectedTransaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedTransaction.amount > 0 ? '+' : ''}${Math.abs(selectedTransaction.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-900">{selectedTransaction.description}</p>
                  </div>

                  {selectedTransaction.match && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Match Analysis</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Confidence Score</label>
                          <p className={`font-medium ${
                            selectedTransaction.match.confidence >= 0.8 ? 'text-green-600' :
                            selectedTransaction.match.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {(selectedTransaction.match.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Explanation</label>
                          <p className="text-gray-900">{selectedTransaction.match.explanation}</p>
                        </div>
                        {selectedTransaction.match.accountingEntry && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Matched Entry</label>
                            <p className="text-gray-900">
                              {selectedTransaction.match.accountingEntry.description} - 
                              ${selectedTransaction.match.accountingEntry.amount.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Manual Mode */}
        <div className="text-center mt-8">
          <a href="/manual" className="text-purple-600 hover:text-purple-800 underline">
            ← Start New Manual Reconciliation
          </a>
        </div>
      </div>
    </div>
  )
}
