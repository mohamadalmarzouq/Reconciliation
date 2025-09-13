import { ReportData } from '@/types'

export async function generatePDFReport(data: ReportData): Promise<void> {
  try {
    // In a real app, you'd use a proper PDF library like jsPDF or Puppeteer
    const reportContent = `
      ReconcileAI Reconciliation Report
      Generated: ${new Date(data.generatedAt).toLocaleString()}
      
      Summary:
      - Total Transactions: ${data.totalTransactions}
      - Matched: ${data.matchedTransactions}
      - Flagged: ${data.flaggedTransactions}
      - Unmatched: ${data.unmatchedTransactions}
      - Confidence Score: ${(data.confidenceScore * 100).toFixed(1)}%
      - Processing Time: ${data.processingTime}s
    `

    // Create a blob and download
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('PDF generation error:', error)
    throw error
  }
}

export async function generateCSVReport(data: ReportData): Promise<void> {
  try {
    const csvContent = `Date,Description,Amount,Type,Status,Confidence
2025-09-01,Sample Transaction 1,100.00,credit,matched,0.95
2025-09-02,Sample Transaction 2,-50.00,debit,flagged,0.65
2025-09-03,Sample Transaction 3,200.00,credit,unmatched,0.30`

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation-data-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('CSV generation error:', error)
    throw error
  }
}
