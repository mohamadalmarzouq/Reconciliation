'use client'

import { useState, useEffect } from 'react'
import { saveReconciliationReport, generateDefaultReportName } from '@/lib/reportGenerator'
import { Transaction } from '@/types'

export default function ReviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isReconciling, setIsReconciling] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'xero' | 'zoho'>('xero')
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['xero', 'zoho']) // Default to both
  const [xeroConnected, setXeroConnected] = useState(false)
  const [zohoConnected, setZohoConnected] = useState(false)
  const [xeroData, setXeroData] = useState<any>(null)
  const [zohoData, setZohoData] = useState<any>(null)
  const [dateFilter, setDateFilter] = useState({
    from: null as Date | null,
    to: null as Date | null
  })
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteTransaction, setNoteTransaction] = useState<Transaction | null>(null)
  const [noteText, setNoteText] = useState('')
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [isSavingReport, setIsSavingReport] = useState(false)

  // Handler for transaction actions
  const handleTransactionAction = async (transactionId: string, actionType: 'accept' | 'reject' | 'flag') => {
    setProcessingAction(transactionId)
    try {
      const response = await fetch('/api/transactions/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          actionType,
          reviewerName: 'Current User', // TODO: Get from auth context
          reviewerEmail: 'user@example.com', // TODO: Get from auth context
          userAgent: navigator.userAgent
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update both main and filtered transactions
        const updateTransaction = (transaction: Transaction) => 
          transaction.id === transactionId ? {
            ...transaction,
            status: result.transaction.status,
            reviewedBy: result.transaction.reviewed_by,
            reviewedAt: result.transaction.reviewed_at,
            reviewNotes: result.transaction.review_notes
          } : transaction

        setTransactions(prev => prev.map(updateTransaction))
        setFilteredTransactions(prev => prev.map(updateTransaction))

        // If transaction was accepted, add to sync queue for Xero/Zoho (only if it needs a new entry)
        if (actionType === 'accept') {
          const transaction = transactions.find(t => t.id === transactionId)
          if (transaction) {
            // Only add to sync queue if it needs a new entry (not already matched in accounting software)
            // Exclude high confidence matches (>= 0.9) as they already exist in Xero
            const needsNewEntry = !transaction.match?.confidence || transaction.match.confidence < 0.9
            
            if (needsNewEntry) {
              try {
                const syncResponse = await fetch('/api/sync-queue', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transactionId,
                    action: 'accept',
                    providers: selectedProviders, // Array of providers to sync to
                    notes: `Approved for sync - ${transaction.isMatched ? 'Confirmed match' : transaction.match?.suggestedAction === 'flag' ? 'Accepted anomaly' : 'Create new entry'}`
                  })
                })
                
                if (syncResponse.ok) {
                  console.log('Transaction added to sync queue')
                }
              } catch (syncError) {
                console.error('Error adding to sync queue:', syncError)
                // Don't show error to user as the main action succeeded
              }
            } else {
              console.log('Transaction already matched in accounting software - not added to sync queue')
            }
          }
        }

        alert(`Transaction ${actionType}ed successfully!`)
      } else {
        alert(`Failed to ${actionType} transaction: ${result.error}`)
      }
    } catch (error) {
      console.error(`Error ${actionType}ing transaction:`, error)
      alert(`Error ${actionType}ing transaction. Please try again.`)
    } finally {
      setProcessingAction(null)
    }
  }

  // Handler for adding notes
  const handleAddNote = (transaction: Transaction) => {
    setNoteTransaction(transaction)
    setNoteText(transaction.reviewNotes || '')
    setShowNoteModal(true)
  }

  // Save note
  const saveNote = async () => {
    if (!noteTransaction) return

    setProcessingAction(noteTransaction.id)
    try {
      const response = await fetch('/api/transactions/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: noteTransaction.id,
          actionType: 'note',
          reviewerName: 'Current User', // TODO: Get from auth context
          notes: noteText,
          userAgent: navigator.userAgent
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update both main and filtered transactions
        const updateTransaction = (transaction: Transaction) => 
          transaction.id === noteTransaction.id ? {
            ...transaction,
            reviewNotes: noteText,
            reviewedBy: result.transaction.reviewed_by,
            reviewedAt: result.transaction.reviewed_at
          } : transaction

        setTransactions(prev => prev.map(updateTransaction))
        setFilteredTransactions(prev => prev.map(updateTransaction))

        setShowNoteModal(false)
        setNoteTransaction(null)
        setNoteText('')
        alert('Note saved successfully!')
      } else {
        alert(`Failed to save note: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Error saving note. Please try again.')
    } finally {
      setProcessingAction(null)
    }
  }

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
          setFilteredTransactions(result.transactions) // Initialize filtered transactions
        } else {
          console.error('Failed to fetch transactions:', result.error)
          // Fallback to empty array if no data
          setTransactions([])
          setFilteredTransactions([])
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    // Check for connection success
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    if (success === 'xero_connected') {
      alert('✅ Xero connected successfully! You can now fetch your Xero data.')
      setXeroConnected(true)
      setSelectedProvider('xero')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (success === 'zoho_connected') {
      alert('✅ Zoho Books connected successfully! You can now fetch your Zoho data.')
      setZohoConnected(true)
      setSelectedProvider('zoho')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    fetchTransactions()
  }, [])

  // Apply date filter
  const applyDateFilter = () => {
    if (!dateFilter.from && !dateFilter.to) {
      setFilteredTransactions(transactions)
      return
    }

    const filtered = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      
      if (dateFilter.from && transactionDate < dateFilter.from) {
        return false
      }
      
      if (dateFilter.to && transactionDate > dateFilter.to) {
        return false
      }
      
      return true
    })
    
    setFilteredTransactions(filtered)
  }

  // Quick date presets
  const setDatePreset = (preset: string) => {
    const now = new Date()
    let from: Date | null = null
    let to: Date | null = null

    switch (preset) {
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1)
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        to = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last3Months':
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1)
        to = new Date(now.getFullYear(), 11, 31)
        break
      case 'clear':
        from = null
        to = null
        break
    }

    setDateFilter({ from, to })
  }

  // Apply filter when date filter changes
  useEffect(() => {
    applyDateFilter()
  }, [dateFilter, transactions])

  const getStatusIcon = (transaction: Transaction) => {
    switch (transaction.status) {
      case 'accepted':
        return <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
      case 'rejected':
        return <div className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-sm">✗</div>
      case 'flagged':
        return <div className="w-5 h-5 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm">⚠</div>
      case 'under_review':
        return <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">👁</div>
      default: // pending
        if (transaction.isMatched) {
          return <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
        } else if (transaction.match?.suggestedAction === 'flag') {
          return <div className="w-5 h-5 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm">!</div>
        } else {
          return <div className="w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm">?</div>
        }
    }
  }

  const getStatusColor = (transaction: Transaction) => {
    switch (transaction.status) {
      case 'accepted':
        return 'bg-green-50 border-green-200'
      case 'rejected':
        return 'bg-red-50 border-red-200'
      case 'flagged':
        return 'bg-yellow-50 border-yellow-200'
      case 'under_review':
        return 'bg-blue-50 border-blue-200'
      default: // pending
        if (transaction.isMatched) {
          return 'bg-green-50 border-green-200'
        } else if (transaction.match?.suggestedAction === 'flag') {
          return 'bg-yellow-50 border-yellow-200'
        } else {
          return 'bg-gray-50 border-gray-200'
        }
    }
  }

  const getStatusText = (transaction: Transaction) => {
    switch (transaction.status) {
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
      case 'flagged':
        return 'Flagged'
      case 'under_review':
        return 'Under Review'
      default: // pending
        if (transaction.isMatched) {
          return 'Matched'
        } else if (transaction.match?.suggestedAction === 'flag') {
          return 'Flagged'
        } else {
          return 'Unmatched'
        }
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Dynamic button text based on transaction status
  const getApproveButtonText = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return '✅ Confirm Match'
    } else if (transaction.match?.suggestedAction === 'flag') {
      return '✅ Accept Anomaly'
    } else {
      return '✅ Create Entry'
    }
  }

  const getRejectButtonText = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return '❌ Override Match'
    } else if (transaction.match?.suggestedAction === 'flag') {
      return '❌ Escalate'
    } else {
      return '❌ Ignore'
    }
  }

  const getApproveButtonTitle = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return 'Confirm the AI\'s match - no new entry needed'
    } else if (transaction.match?.suggestedAction === 'flag') {
      return 'Accept anomaly as valid - will create entry in Xero/Zoho'
    } else {
      return 'Create new entry in Xero/Zoho for this transaction'
    }
  }

  const getRejectButtonTitle = (transaction: Transaction) => {
    if (transaction.isMatched) {
      return 'Override AI match - keep transaction open for review'
    } else if (transaction.match?.suggestedAction === 'flag') {
      return 'Escalate for manual review - leave open'
    } else {
      return 'Ignore this transaction - don\'t create entry'
    }
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

  const connectToXero = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/xero/connect')
      const result = await response.json()
      
      if (result.authUrl) {
        // Redirect to Xero OAuth
        window.location.href = result.authUrl
      } else {
        alert('Failed to get Xero connection URL')
      }
    } catch (error) {
      console.error('Error connecting to Xero:', error)
      alert('Error connecting to Xero. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const connectToZoho = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/zoho/connect')
      const result = await response.json()
      
      if (result.authUrl) {
        // Redirect to Zoho OAuth
        window.location.href = result.authUrl
      } else {
        alert('Failed to get Zoho connection URL')
      }
    } catch (error) {
      console.error('Error connecting to Zoho:', error)
      alert('Error connecting to Zoho. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const connectToProvider = () => {
    if (selectedProvider === 'xero') {
      connectToXero()
    } else {
      connectToZoho()
    }
  }

  const fetchZohoData = async () => {
    try {
      // Build query parameters for date filtering
      const params = new URLSearchParams()
      if (dateFilter.from) {
        params.append('from', dateFilter.from.toISOString().split('T')[0])
      }
      if (dateFilter.to) {
        params.append('to', dateFilter.to.toISOString().split('T')[0])
      }

      const [contactsResponse, invoicesResponse] = await Promise.all([
        fetch(`/api/zoho/contacts?${params.toString()}`),
        fetch(`/api/zoho/invoices?${params.toString()}`)
      ])

      const contacts = await contactsResponse.json()
      const invoices = await invoicesResponse.json()

      setZohoData({ contacts, invoices })

      const dateRangeText = dateFilter.from || dateFilter.to 
        ? ` for ${dateFilter.from ? dateFilter.from.toLocaleDateString() : 'start'} to ${dateFilter.to ? dateFilter.to.toLocaleDateString() : 'end'}`
        : ''

      alert(`Connected to Zoho! Found ${contacts.contacts?.length || 0} contacts and ${invoices.invoices?.length || 0} invoices${dateRangeText}.`)
    } catch (error) {
      console.error('Error fetching Zoho data:', error)
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message && error.message.includes('401')) {
        alert('Zoho authentication failed. Please click "Connect Zoho" to reconnect.')
        setZohoConnected(false)
      } else {
        alert('Error fetching Zoho data. Please try again.')
      }
    }
  }

  const fetchXeroData = async () => {
    try {
      // Build query parameters for date filtering
      const params = new URLSearchParams()
      if (dateFilter.from) {
        params.append('from', dateFilter.from.toISOString().split('T')[0])
      }
      if (dateFilter.to) {
        params.append('to', dateFilter.to.toISOString().split('T')[0])
      }
      
      const queryString = params.toString()
      const contactsUrl = queryString ? `/api/xero/contacts?${queryString}` : '/api/xero/contacts'
      const invoicesUrl = queryString ? `/api/xero/invoices?${queryString}` : '/api/xero/invoices'
      
      console.log('Fetching Xero data with date filter:', { from: dateFilter.from, to: dateFilter.to })
      
      const [contactsResponse, invoicesResponse] = await Promise.all([
        fetch(contactsUrl),
        fetch(invoicesUrl)
      ])
      
      const contacts = await contactsResponse.json()
      const invoices = await invoicesResponse.json()
      
      setXeroData({ contacts, invoices })
      setXeroConnected(true)
      
      const dateRangeText = (dateFilter.from || dateFilter.to) 
        ? ` for ${dateFilter.from?.toLocaleDateString() || 'start'} to ${dateFilter.to?.toLocaleDateString() || 'end'}`
        : ''
      
      alert(`Connected to Xero! Found ${contacts.contacts?.length || 0} contacts and ${invoices.invoices?.length || 0} invoices${dateRangeText}.`)
    } catch (error) {
      console.error('Error fetching Xero data:', error)
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message && error.message.includes('403')) {
        alert('Xero authentication failed. Please click "Connect Xero" to reconnect.')
        setXeroConnected(false)
      } else {
        alert('Error fetching Xero data. Please try again.')
      }
    }
  }

  const runReconciliation = async (provider: 'xero' | 'zoho' = selectedProvider) => {
    const providerData = provider === 'xero' ? xeroData : zohoData
    const providerName = provider === 'xero' ? 'Xero' : 'Zoho'
    
    if (!providerData) {
      alert(`Please connect to ${providerName} first!`)
      return
    }
    
    setIsReconciling(true)
    try {
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: filteredTransactions,
          xeroData: provider === 'xero' ? xeroData : null,
          zohoData: provider === 'zoho' ? zohoData : null,
          provider: provider
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update the filtered transactions with reconciliation results
        setFilteredTransactions(result.transactions)
        // Also update the main transactions array to keep them in sync
        setTransactions(prev => {
          const updated = [...prev]
          result.transactions.forEach((reconciledTransaction: any) => {
            const index = updated.findIndex(t => t.id === reconciledTransaction.id)
            if (index !== -1) {
              updated[index] = reconciledTransaction
            }
          })
          return updated
        })
        alert(`Reconciliation completed! Matched ${result.matchesFound} transactions.`)
      } else {
        console.error('Reconciliation failed:', result.error)
        alert('Reconciliation failed. Please try again.')
      }
    } catch (error) {
      console.error('Error running reconciliation:', error)
      alert('Error running reconciliation. Please try again.')
    } finally {
      setIsReconciling(false)
    }
  }

  const saveCurrentReport = async () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to save. Please upload and process transactions first.')
      return
    }

    setIsSavingReport(true)
    try {
      const bankStatementId = sessionStorage.getItem('currentBankStatementId')
      const reportName = generateDefaultReportName(
        selectedProvider === 'xero' ? 'xero_sync' : 'zoho_sync',
        'Bank Statement', // TODO: Get actual bank name
        new Date().toISOString().split('T')[0]
      )

      const result = await saveReconciliationReport({
        reportName,
        reportType: selectedProvider === 'xero' ? 'xero_sync' : 'zoho_sync',
        transactions: filteredTransactions,
        bankStatementId: bankStatementId || undefined,
        provider: selectedProvider === 'xero' ? 'Xero' : 'Zoho',
        bankName: 'Bank Statement', // TODO: Get actual bank name
        processingTime: 0, // TODO: Calculate actual processing time
        filters: {
          dateRange: dateFilter.from && dateFilter.to ? {
            from: dateFilter.from.toISOString().split('T')[0],
            to: dateFilter.to.toISOString().split('T')[0]
          } : undefined
        }
      })

      if (result.success) {
        alert(`✅ Report saved successfully! Report ID: ${result.reportId}`)
      } else {
        alert(`❌ Failed to save report: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving report:', error)
      alert('❌ Error saving report. Please try again.')
    } finally {
      setIsSavingReport(false)
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
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={saveCurrentReport}
              disabled={isSavingReport}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isSavingReport 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isSavingReport ? '💾 Saving...' : '💾 Save Report'}
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
              {isMatching ? '🔄 Processing...' : '🧠 AI Analysis'}
            </button>
            {/* Provider Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Provider:</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as 'xero' | 'zoho')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="xero">🟢 Xero</option>
                <option value="zoho">🔵 Zoho Books</option>
              </select>
            </div>

            {/* Multi-Provider Sync Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sync to:</label>
              <select
                value={selectedProviders.length === 2 ? 'both' : selectedProviders[0] || 'xero'}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'both') {
                    setSelectedProviders(['xero', 'zoho'])
                  } else {
                    setSelectedProviders([value])
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="xero">🟢 Xero Only</option>
                <option value="zoho">🔵 Zoho Only</option>
                <option value="both">🟢🔵 Both Xero & Zoho</option>
              </select>
            </div>

            {/* Connection Buttons for Selected Providers */}
            <div className="flex gap-2">
              {selectedProviders.includes('xero') && (
                <>
                  {!xeroConnected ? (
                    <button 
                      onClick={connectToXero}
                      disabled={isConnecting}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isConnecting 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isConnecting ? '🔄 Connecting...' : '🔗 Connect Xero'}
                    </button>
                  ) : (
                    <button 
                      onClick={fetchXeroData}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      📊 Fetch Xero Data
                    </button>
                  )}
                </>
              )}
              
              {selectedProviders.includes('zoho') && (
                <>
                  {!zohoConnected ? (
                    <button 
                      onClick={connectToZoho}
                      disabled={isConnecting}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isConnecting 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isConnecting ? '🔄 Connecting...' : '🔗 Connect Zoho'}
                    </button>
                  ) : (
                    <button 
                      onClick={fetchZohoData}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      📊 Fetch Zoho Data
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Reconcile Button - Show when at least one provider is connected */}
            {(xeroConnected && selectedProviders.includes('xero')) || (zohoConnected && selectedProviders.includes('zoho')) ? (
              <button 
                onClick={() => {
                  if (selectedProviders.includes('xero') && xeroConnected) {
                    runReconciliation('xero')
                  }
                  if (selectedProviders.includes('zoho') && zohoConnected) {
                    runReconciliation('zoho')
                  }
                }}
                disabled={isReconciling}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isReconciling 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isReconciling ? '🔄 Reconciling...' : '⚡ Reconcile Now'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Date Filter</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateFilter.from ? dateFilter.from.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateFilter.to ? dateFilter.to.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDatePreset('thisMonth')}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => setDatePreset('lastMonth')}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                Last Month
              </button>
              <button
                onClick={() => setDatePreset('last3Months')}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                Last 3 Months
              </button>
              <button
                onClick={() => setDatePreset('thisYear')}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                This Year
              </button>
              <button
                onClick={() => setDatePreset('clear')}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          {(dateFilter.from || dateFilter.to) && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} transactions
              {dateFilter.from && ` from ${dateFilter.from.toLocaleDateString()}`}
              {dateFilter.to && ` to ${dateFilter.to.toLocaleDateString()}`}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</h3>
            <p className="text-gray-600">Total Transactions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-green-600">
              {filteredTransactions.filter(t => t.status === 'accepted').length}
            </h3>
            <p className="text-gray-600">Accepted</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-red-600">
              {filteredTransactions.filter(t => t.status === 'rejected').length}
            </h3>
            <p className="text-gray-600">Rejected</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-yellow-600">
              {filteredTransactions.filter(t => t.status === 'flagged').length}
            </h3>
            <p className="text-gray-600">Flagged</p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-2xl font-bold text-gray-600">
              {filteredTransactions.filter(t => t.status === 'pending' || !t.status).length}
            </h3>
            <p className="text-gray-600">Pending Review</p>
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
                {filteredTransactions.map((transaction) => (
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
                          {getStatusText(transaction)}
                        </span>
                        {transaction.reviewedBy && (
                          <span className="text-xs text-gray-500">
                            by {transaction.reviewedBy}
                          </span>
                        )}
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
                      <div className="flex gap-2">
                        {(transaction.status === 'pending' || !transaction.status) && (
                          <>
                            <button
                              onClick={() => handleTransactionAction(transaction.id, 'accept')}
                              className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200 transition-colors"
                              title={getApproveButtonTitle(transaction)}
                            >
                              {transaction.isMatched ? '✅' : transaction.match?.suggestedAction === 'flag' ? '⚠️' : '➕'}
                            </button>
                            <button
                              onClick={() => handleTransactionAction(transaction.id, 'reject')}
                              className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200 transition-colors"
                              title={getRejectButtonTitle(transaction)}
                            >
                              ❌
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleAddNote(transaction)}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200 transition-colors"
                          title="Add Note"
                        >
                          📝
                        </button>
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200 transition-colors"
                          title="View Details"
                        >
                          👁️
                        </button>
                      </div>
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
                  {(selectedTransaction.status === 'pending' || !selectedTransaction.status) && (
                    <>
                      <button 
                        onClick={() => {
                          handleTransactionAction(selectedTransaction.id, 'accept')
                          setSelectedTransaction(null)
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                        title={getApproveButtonTitle(selectedTransaction)}
                      >
                        {getApproveButtonText(selectedTransaction)}
                      </button>
                      <button 
                        onClick={() => {
                          handleTransactionAction(selectedTransaction.id, 'reject')
                          setSelectedTransaction(null)
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                        title={getRejectButtonTitle(selectedTransaction)}
                      >
                        {getRejectButtonText(selectedTransaction)}
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      handleAddNote(selectedTransaction)
                      setSelectedTransaction(null)
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    📝 Add Note
                  </button>
                  {selectedTransaction.status && selectedTransaction.status !== 'pending' && (
                    <div className="text-sm text-gray-600 flex items-center">
                      Status: <span className="font-medium ml-1">{getStatusText(selectedTransaction)}</span>
                      {selectedTransaction.reviewedBy && (
                        <span className="ml-2">by {selectedTransaction.reviewedBy}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Note Modal */}
        {showNoteModal && noteTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add Note</h3>
                  <button
                    onClick={() => {
                      setShowNoteModal(false)
                      setNoteTransaction(null)
                      setNoteText('')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✗
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Transaction: {noteTransaction.description}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Amount: ${Math.abs(noteTransaction.amount).toFixed(2)}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note
                  </label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Add your review notes here..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveNote}
                    disabled={processingAction === noteTransaction.id}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {processingAction === noteTransaction.id ? 'Saving...' : 'Save Note'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteModal(false)
                      setNoteTransaction(null)
                      setNoteText('')
                    }}
                    className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}