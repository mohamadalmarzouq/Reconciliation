import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, FileText, BarChart3, LogOut, User, Brain } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-800">ReconcileAI</span>
            <span className="text-sm text-gray-500">التسوية البنكية</span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                to="/dashboard" 
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link 
                to="/upload" 
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Link>
              <Link 
                to="/reports" 
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </Link>
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{user.full_name || user.email}</span>
                  {user.company_name && (
                    <span className="text-xs text-gray-500">({user.company_name})</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
