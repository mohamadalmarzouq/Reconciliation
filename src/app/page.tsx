export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
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
            <a href="/upload" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Get Started
            </a>
            <a href="/review" className="bg-gray-200 text-gray-900 px-8 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              View Demo
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
