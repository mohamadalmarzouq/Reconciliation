import fs from 'fs'
import csv from 'csv-parser'
import * as XLSX from 'xlsx'
import { Transaction } from '@/types'

export async function parsePDF(filePath: string): Promise<Transaction[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    
    // Use pdf-parse with a workaround for the test file issue
    const pdfParse = await import('pdf-parse')
    
    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath)
    
    // Parse the PDF
    const data = await pdfParse.default(dataBuffer)
    
    // Extract text and parse transactions
    const lines = data.text.split('\n').filter(line => line.trim())
    const transactions: Transaction[] = []
    let id = 1
    
    for (const line of lines) {
      // Look for transaction patterns - this is a simplified parser
      // You might need to customize this based on your bank's PDF format
      const amountMatch = line.match(/([+-]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/)
      if (amountMatch) {
        const amountStr = amountMatch[1].replace(/[$,]/g, '')
        const amount = parseFloat(amountStr)
        
        if (Math.abs(amount) > 0.01) { // Filter out very small amounts
          // Try to extract date (common formats)
          const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/)
          const date = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0]
          
          // Clean up description
          const description = line
            .replace(amountMatch[0], '')
            .replace(dateMatch ? dateMatch[0] : '', '')
            .trim()
            .replace(/\s+/g, ' ')
          
          if (description.length > 0) {
            transactions.push({
              id: `pdf-${id++}`,
              date: date,
              description: description,
              amount: amount,
              type: amount > 0 ? 'credit' : 'debit',
              isMatched: false
            })
          }
        }
      }
    }
    
    return transactions
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to parse PDF file. Please ensure it\'s a valid PDF bank statement.')
  }
}

export async function parseCSV(filePath: string): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`))
      return
    }
    
    const transactions: Transaction[] = []
    let id = 1
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Try to extract transaction data from common CSV formats
        const amount = parseFloat(row.amount || row.Amount || row['Amount'] || '0')
        const date = row.date || row.Date || row['Date'] || new Date().toISOString().split('T')[0]
        const description = row.description || row.Description || row['Description'] || row.memo || row.Memo || row['Memo'] || ''
        
        if (Math.abs(amount) > 0.01) {
          transactions.push({
            id: `csv-${id++}`,
            date: date,
            description: description,
            amount: amount,
            type: amount > 0 ? 'credit' : 'debit',
            isMatched: false
          })
        }
      })
      .on('end', () => {
        resolve(transactions)
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error)
        reject(new Error('Failed to parse CSV file'))
      })
  })
}

export async function parseXLSX(filePath: string): Promise<Transaction[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)
    
    const transactions: Transaction[] = []
    let id = 1
    
    for (const row of data as any[]) {
      // Try to extract transaction data from common Excel formats
      const amount = parseFloat(row.amount || row.Amount || row['Amount'] || '0')
      const date = row.date || row.Date || row['Date'] || new Date().toISOString().split('T')[0]
      const description = row.description || row.Description || row['Description'] || row.memo || row.Memo || row['Memo'] || ''
      
      if (Math.abs(amount) > 0.01) {
        transactions.push({
          id: `xlsx-${id++}`,
          date: date,
          description: description,
          amount: amount,
          type: amount > 0 ? 'credit' : 'debit',
          isMatched: false
        })
      }
    }
    
    return transactions
  } catch (error) {
    console.error('Error parsing XLSX:', error)
    throw new Error('Failed to parse XLSX file')
  }
}

export async function parseFile(filePath: string, fileType: string): Promise<Transaction[]> {
  switch (fileType) {
    case 'application/pdf':
      return await parsePDF(filePath)
    case 'text/csv':
      return await parseCSV(filePath)
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return await parseXLSX(filePath)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}
