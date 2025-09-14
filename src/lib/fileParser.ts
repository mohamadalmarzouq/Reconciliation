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
    
    // Use AWS Textract for professional PDF parsing
    const AWS = require('aws-sdk')
    
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    })
    
    const textract = new AWS.Textract()
    
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(filePath)
    
    // Use Textract to extract text from PDF
    const params = {
      Document: {
        Bytes: pdfBuffer
      }
    }
    
    const result = await textract.detectDocumentText(params).promise()
    
    // Parse the extracted text for transactions
    const transactions: Transaction[] = []
    let id = 1
    
    // Extract text from Textract blocks
    let allText = ''
    for (const block of result.Blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        allText += block.Text + '\n'
      }
    }
    
    // Parse lines for transaction patterns - enhanced for bank statement tables
    const lines = allText.split('\n').filter(line => line.trim())
    
    // Look for table rows with date, description, and amount patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Look for date pattern at start of line (YYYY/MM/DD format)
      const dateMatch = line.match(/^(\d{4}\/\d{1,2}\/\d{1,2})/)
      if (dateMatch) {
        const date = dateMatch[1]
        
        // Look for amounts in the line (both debit and credit)
        const amounts = line.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2,3})?/g)
        
        if (amounts && amounts.length >= 2) {
          // First amount is usually debit, second is credit
          const debitAmount = parseFloat(amounts[0].replace(/,/g, ''))
          const creditAmount = parseFloat(amounts[1].replace(/,/g, ''))
          
          // Determine which amount is non-zero and create transaction
          if (debitAmount > 0) {
            // This is a debit transaction
            const description = line
              .replace(date, '')
              .replace(amounts[0], '')
              .replace(amounts[1], '')
              .trim()
              .replace(/\s+/g, ' ')
            
            if (description.length > 0) {
              transactions.push({
                id: `pdf-${id++}`,
                date: date,
                description: description,
                amount: -debitAmount, // Negative for debit
                type: 'debit' as const,
                isMatched: false
              })
            }
          } else if (creditAmount > 0) {
            // This is a credit transaction
            const description = line
              .replace(date, '')
              .replace(amounts[0], '')
              .replace(amounts[1], '')
              .trim()
              .replace(/\s+/g, ' ')
            
            if (description.length > 0) {
              transactions.push({
                id: `pdf-${id++}`,
                date: date,
                description: description,
                amount: creditAmount, // Positive for credit
                type: 'credit' as const,
                isMatched: false
              })
            }
          }
        }
      }
    }
    
    // If no transactions found, create a placeholder
    if (transactions.length === 0) {
      const path = require('path')
      transactions.push({
        id: `pdf-${id++}`,
        date: new Date().toISOString().split('T')[0],
        description: `PDF Bank Statement - ${path.basename(filePath)} (Textract processing completed)`,
        amount: 0,
        type: 'credit' as const,
        isMatched: false
      })
    }
    
    return transactions
    
  } catch (error) {
    console.error('Error processing PDF with Textract:', error)
    
    // Fallback to placeholder if Textract fails
    const path = require('path')
    const transactions: Transaction[] = []
    let id = 1
    
    transactions.push({
      id: `pdf-${id++}`,
      date: new Date().toISOString().split('T')[0],
      description: `PDF Bank Statement - ${path.basename(filePath)} (Textract processing failed)`,
      amount: 0,
      type: 'credit' as const,
      isMatched: false
    })
    
    return transactions
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
