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
    
    // For now, we'll implement a basic PDF parser that doesn't rely on problematic libraries
    // This creates a placeholder for manual review since PDF parsing is complex
    
    const path = require('path')
    const transactions: Transaction[] = []
    let id = 1
    
    // Create a placeholder transaction that indicates the PDF was uploaded but needs manual processing
    const placeholderTransaction = {
      id: `pdf-${id++}`,
      date: new Date().toISOString().split('T')[0],
      description: `PDF Bank Statement Uploaded - ${path.basename(filePath)}`,
      amount: 0,
      type: 'credit' as const,
      isMatched: false
    }
    
    transactions.push(placeholderTransaction)
    
    // Add a note that manual processing is required
    const manualNote = {
      id: `pdf-${id++}`,
      date: new Date().toISOString().split('T')[0],
      description: 'NOTE: PDF parsing requires manual review. Please use CSV or XLSX for automatic processing.',
      amount: 0,
      type: 'credit' as const,
      isMatched: false
    }
    
    transactions.push(manualNote)
    
    return transactions
    
  } catch (error) {
    console.error('Error processing PDF:', error)
    throw new Error('PDF processing failed. Please use CSV or XLSX format for automatic processing.')
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
