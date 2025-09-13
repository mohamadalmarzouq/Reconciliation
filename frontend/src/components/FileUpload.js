import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Upload, FileText, X, CheckCircle, Brain } from 'lucide-react';
import axios from 'axios';

const FileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: ''
  });
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, CSV, or XLSX file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadedFiles([{ file, status: 'uploading' }]);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('bank_name', formData.bankName);
      uploadFormData.append('account_number', formData.accountNumber);

      const response = await axios.post('/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadedFiles([{ file, status: 'success', data: response.data }]);
      toast.success('File uploaded successfully!');
      
      // Redirect to reconciliation page after a short delay
      setTimeout(() => {
        navigate(`/reconciliation/${response.data.id}`);
      }, 2000);

    } catch (error) {
      setUploadedFiles([{ file, status: 'error' }]);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [formData, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false,
    disabled: uploading
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'error':
        return <X className="h-5 w-5 text-danger-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Upload successful';
      case 'error':
        return 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <Brain className="h-12 w-12 text-primary-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900">Upload Bank Statement</h1>
        <p className="text-gray-600">Let AI analyze and reconcile your transactions</p>
        <p className="text-sm text-gray-500">التسوية البنكية الذكية</p>
      </div>

      {/* Bank Information Form */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Information (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Kuwait Finance House"
              value={formData.bankName}
              onChange={(e) => setFormData({...formData, bankName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., 1234567890"
              value={formData.accountNumber}
              onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors duration-200 ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop the file here' : 'Drag & drop your bank statement here'}
              </h3>
              <p className="text-gray-600">
                or click to browse files
              </p>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Supported formats: PDF, CSV, XLSX</p>
              <p>Maximum file size: 10MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Status</h3>
          
          {uploadedFiles.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(item.status)}
                <span className={`text-sm font-medium ${
                  item.status === 'success' ? 'text-success-600' :
                  item.status === 'error' ? 'text-danger-600' :
                  'text-gray-600'
                }`}>
                  {getStatusText(item.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How it Works</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
            <p>Upload your bank statement in any supported format</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
            <p>AI analyzes and extracts transaction data automatically</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
            <p>Intelligent matching with your accounting system</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
            <p>Review matches and export reconciliation reports</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
