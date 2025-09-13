import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Download, FileText, BarChart3, TrendingUp, Brain } from 'lucide-react';
import axios from 'axios';

const Reports = () => {
  const { statementId } = useParams();
  const [statement, setStatement] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [statementId]);

  const fetchData = async () => {
    try {
      // Fetch statement info
      const statementsResponse = await axios.get('/statements');
      const stmt = statementsResponse.data.find(s => s.id === parseInt(statementId));
      setStatement(stmt);
      
      // Fetch transactions
      const transactionsResponse = await axios.get(`/statements/${statementId}/transactions`);
      setTransactions(transactionsResponse.data);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      // This would call your PDF generation endpoint
      toast.info('PDF generation not yet implemented');
    } catch (error) {
      toast.error('Failed to download PDF report');
    }
  };

  const downloadCSV = async () => {
    try {
      // Generate CSV data
      const csvData = transactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Description: t.description,
        Amount: t.amount,
        Type: t.transaction_type,
        Reference: t.reference || '',
        Balance: t.balance || '',
        Matched: t.is_matched ? 'Yes' : 'No',
        Confidence: Math.round(t.match_confidence * 100) + '%',
        'Matched With': t.matched_with || '',
        'AI Explanation': t.ai_explanation || ''
      }));

      // Convert to CSV
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reconciliation_report_${statementId}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download CSV report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const matchedCount = transactions.filter(t => t.is_matched).length;
  const unmatchedCount = transactions.filter(t => !t.is_matched).length;
  const matchPercentage = transactions.length > 0 ? (matchedCount / transactions.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reconciliation Reports</h1>
          <p className="text-gray-600">{statement?.filename}</p>
          {statement?.bank_name && (
            <p className="text-sm text-gray-500">{statement.bank_name} - {statement.account_number}</p>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={downloadPDF}
            className="btn-primary flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={downloadCSV}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Match Rate</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(matchPercentage)}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <FileText className="h-6 w-6 text-success-600" />
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
              <FileText className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unmatched</p>
              <p className="text-2xl font-bold text-gray-900">{unmatchedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Report */}
        <div className="card">
          <div className="flex items-center mb-4">
            <FileText className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">PDF Report</h3>
              <p className="text-sm text-gray-600">Comprehensive reconciliation report</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <p>Complete transaction details with AI matching status</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <p>Summary statistics and reconciliation overview</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <p>Professional formatting for audit purposes</p>
            </div>
          </div>
          <button
            onClick={downloadPDF}
            className="w-full mt-4 btn-primary"
          >
            Download PDF Report
          </button>
        </div>

        {/* CSV Report */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Download className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">CSV Report</h3>
              <p className="text-sm text-gray-600">Data export for further analysis</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <p>Raw transaction data with AI explanations</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <p>Compatible with Excel and Google Sheets</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
              <p>Ideal for custom analysis and reporting</p>
            </div>
          </div>
          <button
            onClick={downloadCSV}
            className="w-full mt-4 btn-secondary"
          >
            Download CSV Report
          </button>
        </div>
      </div>

      {/* Transaction Summary Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Description</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">AI Confidence</th>
                <th className="table-header">AI Explanation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.slice(0, 10).map((transaction) => (
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.is_matched 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-warning-100 text-warning-800'
                    }`}>
                      {transaction.is_matched ? 'Matched' : 'Unmatched'}
                    </span>
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
                    <span className="text-sm text-gray-600">
                      {transaction.ai_explanation ? 
                        transaction.ai_explanation.substring(0, 50) + '...' : 
                        'No explanation'
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length > 10 && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            Showing 10 of {transactions.length} transactions
          </p>
        )}
      </div>
    </div>
  );
};

export default Reports;
