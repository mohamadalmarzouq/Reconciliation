export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  balance?: number
  type: 'debit' | 'credit'
  isMatched: boolean
  match?: ReconciliationMatch
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
  matchedTransactions: number
  unmatchedTransactions: number
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
  matchedTransactions: number
  flaggedTransactions: number
  unmatchedTransactions: number
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
