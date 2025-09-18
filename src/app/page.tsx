export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            ReconcileAI
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            AI-Powered Bank Reconciliation Platform. Choose your reconciliation method 
            and let AI handle the complex matching with intelligent suggestions.
          </p>
        </div>

        {/* Method Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {/* Sync Mode Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                🔗
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Sync Mode</h2>
              <p className="text-gray-600 mb-6">
                Connect to your accounting software for real-time reconciliation
              </p>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Real-time data sync</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Xero & Zoho Books integration</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Live invoice & contact matching</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Automated workflows</span>
              </div>
            </div>
            
            <a href="/sync" className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors block text-center">
              🚀 Start Sync Mode
            </a>
          </div>

          {/* Manual Mode Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                📄
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Manual Mode</h2>
              <p className="text-gray-600 mb-6">
                Upload documents and reconcile with category-specific intelligence
              </p>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Document-to-document matching</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Sales, Expense, POS reports</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Category-specific AI prompts</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">✓</div>
                <span className="text-gray-700">Offline reconciliation</span>
              </div>
            </div>
            
            <a href="/manual" className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors block text-center">
              📋 Start Manual Mode
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4">
              📄
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Upload</h3>
            <p className="text-gray-600">
              Upload PDF, CSV, or XLSX bank statements with drag-and-drop interface
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4">
              🧠
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Matching</h3>
            <p className="text-gray-600">
              GPT-4 powered transaction matching with confidence scores and explanations
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4">
              📊
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Dashboard</h3>
            <p className="text-gray-600">
              Track reconciliation progress with detailed analytics and insights
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4">
              📈
            </div>
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
          <a href="/upload" className="bg-blue-600 text-white px-12 py-4 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors inline-block">
            Start Your First Reconciliation
          </a>
        </div>
      </div>
    </div>
  )
}
