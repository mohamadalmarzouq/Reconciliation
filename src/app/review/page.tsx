'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Eye, Download } from 'lucide-react'
import { Transaction, ReconciliationMatch } from '@/types'

export default function ReviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    // Mock data for demonstration
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        date: '2025-09-01',
        description: 'Zain POS 345',
        amount: -12.00,
        balance: 1250.50,
        type: 'debit',
        isMatched: true,
        match: {
          confidence: 0.95,
          explanation: 'Matched with Invoice #248 due to amount and customer match',
          suggestedAction: 'match',
          accountingEntry: {
            id: 'acc-248',
            description: 'Invoice #248 - Zain Telecom',
            amount: 12.00,
            date: '2025-09-01',
            account: 'Accounts Receivable'
          }
        }
      },
      {
        id: '2',
        date: '2025-09-02',
        description: 'Office Supplies Store',
        amount: -45.30,
        balance: 1205.20,
        type: 'debit',
        isMatched: false,
        match: {
          confidence: 0.65,
          explanation: 'Possible match with Office Expenses, but amount differs by $5.30',
          suggestedAction: 'flag',
          accountingEntry: {
            id: 'acc-249',
            description: 'Office Supplies - Stationery',
            amount: 50.60,
            date: '2025-09-02',
            account: 'Office Expenses'
          }
        }
      },
      {
        id: '3',
        date: '2025-09-03',
        description: 'Client Payment - ABC Corp',
        amount: 2500.00,
        balance: 3705.20,
        type: 'credit',
        isMatched: true,
        match: {
          confidence: 0.98,
          explanation: 'Perfect match with Invoice #250 payment',
          suggestedAction: 'match',
          accountingEntry: {
            id: 'acc-250',
            description: 'Payment from ABC Corp - Invoice #250',
            amount: 2500.00,
            date: '2025-09-03',
            account: 'Accounts Receivable'
          }
        }
      }
    ]

    setTimeout(() => {
      setTransactions(mockTransactions)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusIcon = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return <CheckCircle className="w-5 h-5 text-success-600" />
    } else if (transaction.match?.suggestedAction === 'flag') {
      return <AlertTriangle className="w-5 h-5 text-warning-600" />
    } else {
      return <XCircle className="w-5 h-5 text-danger-600" />
    }
  }

  const getStatusColor = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return 'bg-success-50 border-success-200'
    } else if (transaction.match?.suggestedAction === 'flag') {
      return 'bg-warning-50 border-warning-200'
    } else {
      return 'bg-danger-50 border-danger-200'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success-600'
    if (confidence >= 0.6) return 'text-warning-600'
    return 'text-danger-600'
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reconciliation Review</h1>
          <div className="flex gap-4">
            <button className="btn btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
            <button className="btn btn-primary">
              Run AI Matching
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-gray-900">{transactions.length}</h3>
            <p className="text-gray-600">Total Transactions</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-success-600">
              {transactions.filter(t => t.isMatched).length}
            </h3>
            <p className="text-gray-600">Matched</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-warning-600">
              {transactions.filter(t => !t.isMatched && t.match?.suggestedAction === 'flag').length}
            </h3>
            <p className="text-gray-600">Flagged</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-danger-600">
              {transactions.filter(t => !t.isMatched && t.match?.suggestedAction !== 'flag').length}
            </h3>
            <p className="text-gray-600">Unmatched</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card">
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
                      transaction.amount > 0 ? 'text-success-600' : 'text-danger-600'
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
                        className="btn btn-secondary text-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
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
                    <XCircle className="w-6 h-6" />
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
                        selectedTransaction.amount > 0 ? 'text-success-600' : 'text-danger-600'
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
                  <button className="btn btn-primary">Accept Match</button>
                  <button className="btn btn-secondary">Reject Match</button>
                  <button className="btn btn-warning">Flag for Review</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
