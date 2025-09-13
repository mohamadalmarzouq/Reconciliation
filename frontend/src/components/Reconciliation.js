import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, AlertCircle, Download, RefreshCw, Brain, Eye } from 'lucide-react';
import axios from 'axios';

const Reconciliation = () => {
  const { statementId } = useParams();
  const navigate = useNavigate();
  const [statement, setStatement] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [filter, setFilter] = useState('all'); // all, matched, unmatched
  const [showExplanation, setShowExplanation] = useState(null);

  useEffect(() => {
    fetchStatement();
    fetchTransactions();
  }, [statementId]);

  const fetchStatement = async () => {
    try {
      const response = await axios.get(`/statements`);
      const stmt = response.data.find(s => s.id === parseInt(statementId));
      setStatement(stmt);
    } catch (error) {
      console.error('Error fetching statement:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`/statements/${statementId}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const startReconciliation = async () => {
    setReconciling(true);
    try {
      const response = await axios.post(`/reconcile/${statementId}`);
      toast.success('Reconciliation started! AI is processing your transactions...');
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          await fetchTransactions();
          await fetchStatement();
        } catch (error) {
          console.error('Error polling:', error);
        }
      }, 2000);

      // Stop polling after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setReconciling(false);
      }, 30000);

    } catch (error) {
      toast.error('Reconciliation failed');
      setReconciling(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'matched') return transaction.is_matched;
    if (filter === 'unmatched') return !transaction.is_matched;
    return true;
  });

  const matchedCount = transactions.filter(t => t.is_matched).length;
  const unmatchedCount = transactions.filter(t => !t.is_matched).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Reconciliation</h1>
          <p className="text-gray-600">{statement?.filename}</p>
          {statement?.bank_name && (
            <p className="text-sm text-gray-500">{statement.bank_name} - {statement.account_number}</p>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={startReconciliation}
            disabled={reconciling}
            className="btn-primary flex items-center space-x-2"
          >
            <Brain className={`h-4 w-4 ${reconciling ? 'animate-pulse' : ''}`} />
            <span>{reconciling ? 'AI Processing...' : 'Start AI Reconciliation'}</span>
          </button>
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-gray-900">{matchedCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <XCircle className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unmatched</p>
              <p className="text-2xl font-bold text-gray-900">{unmatchedCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Confidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round((matchedCount / transactions.length) * 100) || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilter('matched')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'matched' ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Matched ({matchedCount})
            </button>
            <button
              onClick={() => setFilter('unmatched')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'unmatched' ? 'bg-warning-100 text-warning-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Unmatched ({unmatchedCount})
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Description</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">AI Confidence</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      {transaction.matched_with && (
                        <p className="text-xs text-gray-500">
                          Matched with: {transaction.matched_with}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`text-sm font-medium ${
                      transaction.amount > 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center">
                      {transaction.is_matched ? (
                        <CheckCircle className="h-5 w-5 text-success-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-warning-600" />
                      )}
                      <span className="ml-2 text-sm text-gray-900">
                        {transaction.is_matched ? 'Matched' : 'Unmatched'}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${transaction.match_confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round(transaction.match_confidence * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    {transaction.ai_explanation && (
                      <button
                        onClick={() => setShowExplanation(showExplanation === transaction.id ? null : transaction.id)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>AI Explanation</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Explanation Modal */}
        {showExplanation && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">AI Explanation</h4>
            <p className="text-sm text-blue-800">
              {transactions.find(t => t.id === showExplanation)?.ai_explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reconciliation;
