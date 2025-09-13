import { Transaction } from '@/types'

export async function uploadFile(file: File): Promise<{ success: boolean; transactions?: Transaction[] }> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const result = await response.json()
    return { success: true, transactions: result.transactions }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false }
  }
}

export function parseFileContent(content: string, fileType: string): Transaction[] {
  // This is a simplified parser - in a real app, you'd use proper libraries
  const lines = content.split('\n')
  const transactions: Transaction[] = []

  if (fileType === 'text/csv') {
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const columns = line.split(',')
      if (columns.length >= 4) {
        transactions.push({
          id: `txn-${i}`,
          date: columns[0],
          description: columns[1],
          amount: parseFloat(columns[2]),
          balance: parseFloat(columns[3]),
          type: parseFloat(columns[2]) > 0 ? 'credit' : 'debit',
          isMatched: false
        })
      }
    }
  }

  return transactions
}
