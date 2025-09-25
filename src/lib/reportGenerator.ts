import { ReconciliationReport, Transaction } from '@/types'

export interface SaveReportOptions {
  reportName: string
  reportType: 'ai_sync' | 'xero_sync' | 'zoho_sync' | 'manual'
  transactions: Transaction[]
  bankStatementId?: string
  reconciliationSessionId?: string
  provider?: string
  bankName?: string
  accountNumber?: string
  processingTime?: number
  filters?: any
  generatedBy?: string
  originalFilename?: string
  fileSize?: number
}

export function generateReportSummary(transactions: Transaction[], options: Partial<SaveReportOptions> = {}): any {
  const totalTransactions = transactions.length
  const matchedTransactions = transactions.filter(t => t.status === 'accepted' || t.isMatched).length
  const flaggedTransactions = transactions.filter(t => t.status === 'flagged').length
  const unmatchedTransactions = transactions.filter(t => t.status === 'pending' || (!t.isMatched && t.status !== 'accepted')).length
  
  // Calculate average confidence
  const transactionsWithConfidence = transactions.filter(t => t.match?.confidence)
  const averageConfidence = transactionsWithConfidence.length > 0
    ? transactionsWithConfidence.reduce((sum, t) => sum + (t.match?.confidence || 0), 0) / transactionsWithConfidence.length
    : 0

  return {
    totalTransactions,
    matchedTransactions,
    flaggedTransactions,
    unmatchedTransactions,
    averageConfidence,
    processingTime: options.processingTime || 0,
    provider: options.provider,
    bankName: options.bankName,
    accountNumber: options.accountNumber
  }
}

export function generateReconciliationMetadata(options: Partial<SaveReportOptions> = {}): any {
  return {
    provider: options.provider,
    filters: options.filters,
    dateRange: options.filters?.dateRange,
    aiSettings: options.reportType?.includes('sync') ? {
      model: 'gpt-5-mini',
      confidenceThreshold: 0.7
    } : undefined
  }
}

export async function saveReconciliationReport(options: SaveReportOptions): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const summaryData = generateReportSummary(options.transactions, options)
    const reconciliationMetadata = generateReconciliationMetadata(options)
    
    const reportData = {
      reportName: options.reportName,
      reportType: options.reportType,
      bankStatementId: options.bankStatementId,
      reconciliationSessionId: options.reconciliationSessionId,
      summaryData,
      transactionData: options.transactions,
      reconciliationMetadata,
      generatedBy: options.generatedBy || 'Current User',
      tags: [],
      originalFilename: options.originalFilename,
      fileSize: options.fileSize
    }
    
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      return {
        success: true,
        reportId: result.reportId
      }
    } else {
      return {
        success: false,
        error: result.error || 'Failed to save report'
      }
    }
  } catch (error) {
    console.error('Error saving reconciliation report:', error)
    return {
      success: false,
      error: 'Failed to save report'
    }
  }
}

export function generateDefaultReportName(reportType: string, bankName?: string, date?: string): string {
  const now = new Date()
  const timestamp = date || now.toISOString().split('T')[0]
  
  switch (reportType) {
    case 'ai_sync':
      return `AI Reconciliation - ${bankName || 'Bank'} - ${timestamp}`
    case 'xero_sync':
      return `Xero Reconciliation - ${bankName || 'Bank'} - ${timestamp}`
    case 'zoho_sync':
      return `Zoho Reconciliation - ${bankName || 'Bank'} - ${timestamp}`
    case 'manual':
      return `Manual Reconciliation - ${timestamp}`
    default:
      return `Reconciliation Report - ${timestamp}`
  }
}