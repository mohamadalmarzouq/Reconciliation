import Link from 'next/link'
import { Upload, Brain, BarChart3, FileText } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            ReconcileAI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-Powered Bank Reconciliation Platform. Automate your financial reconciliation 
            with intelligent matching, smart suggestions, and seamless accounting integrations.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/upload" className="btn btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
            <Link href="/review" className="btn btn-secondary text-lg px-8 py-3">
              View Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="card text-center">
            <Upload className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Upload</h3>
            <p className="text-gray-600">
              Upload PDF, CSV, or XLSX bank statements with drag-and-drop interface
            </p>
          </div>
          
          <div className="card text-center">
            <Brain className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI Matching</h3>
            <p className="text-gray-600">
              GPT-4 powered transaction matching with confidence scores and explanations
            </p>
          </div>
          
          <div className="card text-center">
            <BarChart3 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Dashboard</h3>
            <p className="text-gray-600">
              Track reconciliation progress with detailed analytics and insights
            </p>
          </div>
          
          <div className="card text-center">
            <FileText className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Export Reports</h3>
            <p className="text-gray-600">
              Generate comprehensive PDF and CSV reports for your reconciliations
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Reconciliation Process?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join hundreds of businesses already using ReconcileAI to save hours every month
          </p>
          <Link href="/upload" className="btn btn-primary text-lg px-12 py-4">
            Start Your First Reconciliation
          </Link>
        </div>
      </div>
    </div>
  )
}
