export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  balance?: number
  type: 'debit' | 'credit'
  isMatched: boolean
  match?: ReconciliationMatch
  status: 'pending' | 'accepted' | 'rejected' | 'flagged' | 'under_review'
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
}

export interface ReconciliationMatch {
  confidence: number
  explanation: string
  suggestedAction: 'match' | 'flag' | 'split' | 'defer'
  accountingEntry?: AccountingEntry
}

export interface AccountingEntry {
  id: string
  description: string
  amount: number
  date: string
  account: string
  reference?: string
  type?: 'invoice' | 'payment' | 'journal'
}

export interface BankStatement {
  id: string
  filename: string
  fileType: string
  uploadDate: string
  status: 'uploaded' | 'processing' | 'processed' | 'error'
  totalTransactions: number
  acceptedTransactions: number
  rejectedTransactions: number
  flaggedTransactions: number
  pendingTransactions: number
  confidenceScore: number
  bankName?: string
  accountNumber?: string
}

export interface ReconciliationSession {
  id: string
  bankStatementId: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  totalMatches: number
  totalUnmatched: number
  aiProcessingTime: number
  createdAt: string
  completedAt?: string
}

export interface ReportData {
  totalTransactions: number
  acceptedTransactions: number
  rejectedTransactions: number
  flaggedTransactions: number
  pendingTransactions: number
  confidenceScore: number
  processingTime: number
  generatedAt: string
}

export interface OpenAIResponse {
  matches: Array<{
    transactionId: string
    confidence: number
    explanation: string
    suggestedAction: string
    accountingEntryId?: string
  }>
  summary: {
    totalProcessed: number
    matchesFound: number
    confidenceScore: number
  }
}

export interface TransactionAction {
  id: string
  transactionId: string
  actionType: 'accept' | 'reject' | 'flag' | 'note' | 'undo'
  previousStatus?: string
  newStatus?: string
  reviewerName: string
  reviewerEmail?: string
  notes?: string
  confidenceBefore?: number
  confidenceAfter?: number
  createdAt: string
  ipAddress?: string
  userAgent?: string
}

export interface ReconciliationReport {
  id: string
  reportName: string
  reportType: 'ai_sync' | 'xero_sync' | 'zoho_sync' | 'manual'
  bankStatementId?: string
  reconciliationSessionId?: string
  status: 'completed' | 'in_progress' | 'failed'
  
  // Report data
  summaryData: {
    totalTransactions: number
    acceptedTransactions: number
    rejectedTransactions: number
    flaggedTransactions: number
    pendingTransactions: number
    averageConfidence: number
    processingTime: number
    provider?: string
    bankName?: string
    accountNumber?: string
  }
  transactionData: Transaction[]
  reconciliationMetadata?: {
    provider?: string
    filters?: any
    aiSettings?: any
    dateRange?: {
      from: string
      to: string
    }
  }
  
  // Metadata
  generatedBy: string
  generatedAt: string
  lastAccessed?: string
  isFavorite: boolean
  tags?: string[]
  
  // File info
  originalFilename?: string
  fileSize?: number
}

export interface ReportSummaryItem {
  id: string
  reportName: string
  reportType: 'ai_sync' | 'xero_sync' | 'zoho_sync' | 'manual'
  status: 'completed' | 'in_progress' | 'failed'
  summaryData: {
    totalTransactions: number
    acceptedTransactions: number
    rejectedTransactions: number
    flaggedTransactions: number
    pendingTransactions: number
    averageConfidence: number
    processingTime: number
    provider?: string
    bankName?: string
    accountNumber?: string
  }
  generatedBy: string
  generatedAt: string
  isFavorite: boolean
  originalFilename?: string
}

export interface ReportSummary {
  totalReports: number
  syncedReports: number
  manualReports: number
  favoriteReports: number
  recentReports: ReportSummaryItem[]
}