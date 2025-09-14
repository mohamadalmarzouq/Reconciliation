'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  balance?: number
  type: 'debit' | 'credit'
  isMatched: boolean
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
    }
  }
}

export default function ReviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isMatching, setIsMatching] = useState(false)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Get bank statement ID from session storage (set during upload)
        const bankStatementId = sessionStorage.getItem('currentBankStatementId')
        
        const url = bankStatementId 
          ? `/api/transactions?bankStatementId=${bankStatementId}`
          : '/api/transactions'
          
        const response = await fetch(url)
        const result = await response.json()
        
        if (result.success) {
          setTransactions(result.transactions)
        } else {
          console.error('Failed to fetch transactions:', result.error)
          // Fallback to empty array if no data
          setTransactions([])
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const getStatusIcon = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
    } else if (transaction.match?.suggestedAction === 'flag') {
      return <div className="w-5 h-5 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm">!</div>
    } else {
      return <div className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">✗</div>
    }
  }

  const getStatusColor = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return 'bg-green-50 border-green-200'
    } else if (transaction.match?.suggestedAction === 'flag') {
      return 'bg-yellow-50 border-yellow-200'
    } else {
      return 'bg-red-50 border-red-200'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const runAIMatching = async () => {
    setIsMatching(true)
    try {
      const bankStatementId = sessionStorage.getItem('currentBankStatementId')
      
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankStatementId: bankStatementId,
          transactions: transactions
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update transactions with AI matching results
        setTransactions(result.transactions)
        alert(`AI Matching completed! Found ${result.matchesFound} potential matches.`)
      } else {
        console.error('AI Matching failed:', result.error)
        alert('AI Matching failed. Please try again.')
      }
    } catch (error) {
      console.error('Error running AI matching:', error)
      alert('Error running AI matching. Please try again.')
    } finally {
      setIsMatching(false)
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reconciliation Review</h1>
          <div className="flex gap-4">
            <button className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              📊 Export Report
            </button>
            <button 
              onClick={runAIMatching}
              disabled={isMatching}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isMatching 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isMatching ? '🔄 Processing...' : '🧠 Run AI Matching'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-gray-900">{transactions.length}</h3>
            <p className="text-gray-600">Total Transactions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-green-600">
              {transactions.filter(t => t.isMatched).length}
            </h3>
            <p className="text-gray-600">Matched</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-yellow-600">
              {transactions.filter(t => !t.isMatched && t.match?.suggestedAction === 'flag').length}
            </h3>
            <p className="text-gray-600">Flagged</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-red-600">
              {transactions.filter(t => !t.isMatched && t.match?.suggestedAction !== 'flag').length}
            </h3>
            <p className="text-gray-600">Unmatched</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Confidence</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${getStatusColor(transaction)}`}
                  >
                    <td className="py-3 px-4 text-gray-900">{transaction.date}</td>
                    <td className="py-3 px-4 text-gray-900">{transaction.description}</td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction)}
                        <span className="text-sm font-medium">
                          {transaction.isMatched ? 'Matched' : 
                           transaction.match?.suggestedAction === 'flag' ? 'Flagged' : 'Unmatched'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {transaction.match && (
                        <span className={`text-sm font-medium ${getConfidenceColor(transaction.match.confidence)}`}>
                          {(transaction.match.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
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
                      <p className="text-gray-900">{selectedTransaction.date}</p>
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
                      <h4 className="font-semibold text-gray-900 mb-3">AI Analysis</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Confidence Score</label>
                          <p className={`font-medium ${getConfidenceColor(selectedTransaction.match.confidence)}`}>
                            {(selectedTransaction.match.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Explanation</label>
                          <p className="text-gray-900">{selectedTransaction.match.explanation}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Suggested Action</label>
                          <p className="text-gray-900 capitalize">{selectedTransaction.match.suggestedAction}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">Accept Match</button>
                  <button className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors">Reject Match</button>
                  <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors">Flag for Review</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}