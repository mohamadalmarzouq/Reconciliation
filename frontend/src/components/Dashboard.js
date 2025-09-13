import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText, BarChart3, CheckCircle, XCircle, Clock, Brain, TrendingUp } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStatements: 0,
    totalTransactions: 0,
    matchedTransactions: 0,
    unmatchedTransactions: 0,
    averageConfidence: 0
  });

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      const response = await axios.get('/statements');
      setStatements(response.data);
      
      // Calculate stats
      const totalTransactions = response.data.reduce((sum, stmt) => sum + stmt.total_transactions, 0);
      const matchedTransactions = response.data.reduce((sum, stmt) => sum + stmt.matched_transactions, 0);
      const unmatchedTransactions = response.data.reduce((sum, stmt) => sum + stmt.unmatched_transactions, 0);
      const totalConfidence = response.data.reduce((sum, stmt) => sum + stmt.confidence_score, 0);
      
      setStats({
        totalStatements: response.data.length,
        totalTransactions,
        matchedTransactions,
        unmatchedTransactions,
        averageConfidence: response.data.length > 0 ? totalConfidence / response.data.length : 0
      });
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-warning-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-danger-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':
        return 'text-success-600 bg-success-50';
      case 'processing':
        return 'text-warning-600 bg-warning-50';
      case 'error':
        return 'text-danger-600 bg-danger-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">AI-powered bank reconciliation at your fingertips</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload Statement</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Statements</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStatements}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-gray-900">{stats.matchedTransactions}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.unmatchedTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
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
              <p className="text-2xl font-bold text-gray-900">{Math.round(stats.averageConfidence * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Statements */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Statements</h2>
          <Link to="/upload" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Upload New
          </Link>
        </div>

        {statements.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No statements uploaded</h3>
            <p className="text-gray-600 mb-4">Get started by uploading your first bank statement</p>
            <Link to="/upload" className="btn-primary">
              Upload Statement
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Bank & Account</th>
                  <th className="table-header">Filename</th>
                  <th className="table-header">Upload Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Transactions</th>
                  <th className="table-header">Confidence</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statements.map((statement) => (
                  <tr key={statement.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {statement.bank_name || 'Unknown Bank'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {statement.account_number || 'No account number'}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">
                          {statement.filename}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {new Date(statement.upload_date).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        {getStatusIcon(statement.status)}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(statement.status)}`}>
                          {statement.status}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">
                          {statement.matched_transactions}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                          / {statement.total_transactions}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${statement.confidence_score * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round(statement.confidence_score * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        <Link
                          to={`/reconciliation/${statement.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          Reconcile
                        </Link>
                        <Link
                          to={`/reports/${statement.id}`}
                          className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                        >
                          Reports
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
